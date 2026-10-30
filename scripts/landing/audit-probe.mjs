/**
 * scripts/landing/audit-probe.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Probe QA audit landing: mengukur yang TIDAK kelihatan di screenshot —
 * overflow horizontal, tap target < 44px, kontras teks (WCAG AA), font < 12px,
 * jumlah baris h1, dan pelanggaran tone copy (em-dash / "lu" / "kamu").
 *
 * Pakai: node scripts/landing/audit-probe.mjs [url] [375,414,1440]
 * (JSON ke stdout, ringkasan ke stderr). Full-page shot >10.000px ditolak
 * pembaca gambar, jadi cacat 1px & 36px harus diukur, bukan dikira-kira.
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:3000/'
const widths = (process.argv[3] ?? '375,414,1440')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value > 0)

const channel = fs.existsSync('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe')
  ? 'msedge'
  : 'chrome'

const browser = await chromium.launch({ channel, headless: true })
const results = []

for (const width of widths) {
  const height = width < 500 ? 812 : 900
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    locale: 'id-ID',
  })
  const page = await context.newPage()
  const consoleErrors = []
  const failedRequests = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('response', (res) => {
    if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.url()}`)
  })

  await page.goto(url, { waitUntil: 'load', timeout: 90_000 })
  await page.waitForTimeout(3500)
  /* susuri halaman supaya reveal + lazy image aktif */
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.75)
    const max = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
    for (let y = 0; y < max; y += step) {
      window.scrollTo(0, y)
      await new Promise((resolve) => setTimeout(resolve, 110))
    }
    window.scrollTo(0, 0)
    await new Promise((resolve) => setTimeout(resolve, 500))
  })
  await page.waitForTimeout(900)

  const data = await page.evaluate(() => {
    /* ── util warna & kontras ────────────────────────────────────────────── */
    /* Tailwind v4 mengeluarkan `oklab(...)`/`color-mix(...)`, bukan cuma
       `rgb()`. Regex lama melewatkan semua warna itu sehingga probe melaporkan
       "0 kontras gagal" (false negative). Canvas menormalkan SEMUA warna CSS
       jadi piksel RGBA nyata. */
    const probeCanvas = document.createElement('canvas')
    probeCanvas.width = probeCanvas.height = 1
    const probeCtx = probeCanvas.getContext('2d', { willReadFrequently: true })
    const parse = (value) => {
      if (!value || value === 'transparent' || value === 'none') return null
      probeCtx.clearRect(0, 0, 1, 1)
      /* Reset ke TRANSPARAN (bukan warna sentinel): kalau `value` tidak sah,
         assignment `fillStyle` gagal dan kanvas tetap transparan → `a === 0` di
         bawah mengembalikan `null`. Sentinel berwarna justru membuat warna tidak
         sah terbaca sebagai warna nyata, dan itu warna di luar palet. */
      probeCtx.fillStyle = 'rgba(0, 0, 0, 0)'
      probeCtx.fillStyle = value
      probeCtx.fillRect(0, 0, 1, 1)
      const [r, g, b, a] = probeCtx.getImageData(0, 0, 1, 1).data
      if (a === 0) return null
      return { r, g, b, a: a / 255 }
    }
    const over = (f, b) => ({
      r: f.r * f.a + b.r * (1 - f.a),
      g: f.g * f.a + b.g * (1 - f.a),
      b: f.b * f.a + b.b * (1 - f.a),
      a: 1,
    })
    const lum = ({ r, g, b }) => {
      const c = (v) => {
        const x = v / 255
        return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b)
    }
    const ratioOf = (f, b) => {
      const a = lum(f)
      const c = lum(b)
      return (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05)
    }
    const bgOf = (el) => {
      let node = el
      const stack = []
      while (node && node !== document.documentElement) {
        const bg = parse(getComputedStyle(node).backgroundColor)
        if (bg && bg.a > 0) {
          stack.push(bg)
          if (bg.a === 1) break
        }
        node = node.parentElement
      }
      let out = { r: 255, g: 255, b: 255, a: 1 }
      for (let i = stack.length - 1; i >= 0; i--) out = over(stack[i], out)
      return out
    }
    const desc = (el) => {
      const cls = typeof el.className === 'string' ? el.className : ''
      return {
        tag: el.tagName.toLowerCase(),
        text: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
        class: cls.replace(/\s+/g, ' ').slice(0, 150),
        section: el.closest('section')?.id || (el.closest('footer') ? 'footer' : ''),
      }
    }

    const vw = document.documentElement.clientWidth
    const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)


    /* ── overflow horizontal (abaikan isi wadah overflow-hidden) ─────────── */
    const overflow = []
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) continue
      if (r.right <= vw + 1 && r.left >= -1) continue
      let node = el.parentElement
      let clipped = false
      while (node) {
        if (['hidden', 'clip'].includes(getComputedStyle(node).overflowX)) {
          clipped = true
          break
        }
        node = node.parentElement
      }
      if (clipped) continue
      overflow.push({ ...desc(el), left: Math.round(r.left), right: Math.round(r.right) })
    }

    /* ── tap target ──────────────────────────────────────────────────────── */
    const tapTargets = [
      ...document.querySelectorAll(
        'a[href], button, input, select, textarea, [role="button"], [role="slider"]',
      ),
    ]
      .map((el) => {
        const r = el.getBoundingClientRect()
        return {
          ...desc(el),
          w: Math.round(r.width),
          h: Math.round(r.height),
          aria: el.getAttribute('aria-label'),
          type: el.getAttribute('type'),
        }
      })
      .filter((item) => item.w > 0 && item.h > 0 && (item.w < 44 || item.h < 44))

    /* ── kontras teks + font kecil ───────────────────────────────────────── */
    const contrastIssues = []
    const smallText = []
    const seen = new Set()
    for (const el of document.querySelectorAll('body *')) {
      const own = [...el.childNodes]
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (!own) continue
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) continue
      const style = getComputedStyle(el)
      if (style.visibility === 'hidden' || Number(style.opacity) === 0) continue
      const fgRaw = parse(style.color)
      if (!fgRaw) continue
      const bg = bgOf(el)
      const fg = over(fgRaw, bg)
      const ratio = ratioOf(fg, bg)
      const size = Number.parseFloat(style.fontSize)
      const bold = Number(style.fontWeight) >= 700
      const required = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5
      const key = `${desc(el).class}|${Math.round(ratio * 10)}|${size}`
      if (seen.has(key)) continue
      seen.add(key)
      if (ratio < required) {
        contrastIssues.push({
          ...desc(el),
          ratio: Number(ratio.toFixed(2)),
          required,
          fontSize: size,
          color: style.color,
        })
      }
      if (size < 12) smallText.push({ ...desc(el), fontSize: size, color: style.color })
    }

    /* ── judul & tipografi ───────────────────────────────────────────────── */
    const h1 = document.querySelector('h1')
    const h1Style = h1 ? getComputedStyle(h1) : null
    /* Baris H1 dihitung per WORD (Range rect), bukan sekadar tinggi/line-height.
       Ini satu-satunya cara membuktikan "tidak ada kata yatim" di 375/414/1440. */
    let headlineLines = []
    if (h1) {
      const words = []
      const walker = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT)
      while (walker.nextNode()) {
        const node = walker.currentNode
        const text = node.textContent ?? ''
        let offset = 0
        for (const part of text.split(/(\s+)/)) {
          if (part.trim()) {
            const range = document.createRange()
            range.setStart(node, offset)
            range.setEnd(node, offset + part.length)
            const rect = range.getBoundingClientRect()
            words.push({ word: part, top: Math.round(rect.top) })
          }
          offset += part.length
        }
      }
      const byLine = new Map()
      for (const item of words) {
        if (!byLine.has(item.top)) byLine.set(item.top, [])
        byLine.get(item.top).push(item.word)
      }
      headlineLines = [...byLine.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, list]) => list.join(' '))
    }
    const headline = h1
      ? {
          text: h1.textContent.replace(/\s+/g, ' ').trim(),
          fontSize: h1Style.fontSize,
          lineHeight: h1Style.lineHeight,
          width: Math.round(h1.getBoundingClientRect().width),
          height: Math.round(h1.getBoundingClientRect().height),
          lines: Math.round(
            h1.getBoundingClientRect().height / Number.parseFloat(h1Style.lineHeight),
          ),
          linesText: headlineLines,
        }
      : null

    /* ── tone copy ───────────────────────────────────────────────────────── */
    const text = document.body.innerText
    const tone = {
      emDash: (text.match(/—/g) ?? []).length,
      lu: (text.match(/\blu\b/gi) ?? []).length,
      kamu: (text.match(/\bkamu\b/gi) ?? []).length,
      lo: (text.match(/\blo\b/gi) ?? []).length,
      anda: (text.match(/\bAnda\b/g) ?? []).length,
    }

    /* ── struktur & kontrol harga ────────────────────────────────────────── */
    const sections = [...document.querySelectorAll('main > section, main > footer')].map((el) => {
      const r = el.getBoundingClientRect()
      return {
        id: el.id || null,
        tag: el.tagName.toLowerCase(),
        top: Math.round(r.top + window.scrollY),
        height: Math.round(r.height),
      }
    })
    const pricingModes = [...document.querySelectorAll('[data-landing-mode]')].map((el) => {
      const r = el.getBoundingClientRect()
      return {
        mode: el.getAttribute('data-landing-mode'),
        pressed: el.getAttribute('aria-pressed'),
        w: Math.round(r.width),
        h: Math.round(r.height),
      }
    })
    const priceNodes = [...document.querySelectorAll('[data-landing-price]')].map((el) => ({
      id: el.getAttribute('data-landing-price'),
      text: (el.textContent ?? '').trim(),
    }))

    /* ── ukuran CTA utama (bukti standar 48–52px + panah di kanan) ────────── */
    const ctas = [
      ['hero', '#hero a[href*="checkout"]'],
      ['nav', 'header a[href="#pricing"].select-none'],
      ['pain', '#pain-calculator a[href="#pricing"]'],
      ['pricing-card', '#pricing article a[href*="checkout"]'],
      ['faq-whatsapp', '#faq a[href^="https://wa.me"]'],
    ]
      .map(([name, selector]) => {
        const el = document.querySelector(selector)
        if (!el) return null
        const rect = el.getBoundingClientRect()
        const kids = [...el.children]
        const last = kids[kids.length - 1]
        return {
          name,
          w: Math.round(rect.width),
          h: Math.round(rect.height),
          lastChild: last?.tagName.toLowerCase() ?? null,
          arrowAtRight: last ? last.getBoundingClientRect().left > rect.left + rect.width / 2 : false,
        }
      })
      .filter(Boolean)

    /* ── garis tepi kontainer (bukti misalignment antar-section) ─────────── */
    const boxes = [
      ['nav-pill', 'header > div'],
      ['nav-logo', 'header a[aria-label]'],
      ['nav-inner', 'header nav'],
      ['hero-text', '#hero > div.relative.z-10'],
      ['pain-inner', '#pain-calculator > div'],
      ['pain-panel', '#pain-calculator .rounded-\\[24px\\]'],
      ['mission-inner', '#mission > div'],
      ['mission-card', '#mission article'],
      ['pricing-inner', '#pricing > div'],
      ['pricing-card', '#pricing article'],
      ['faq-inner', '#faq > div'],
      ['footer-inner', 'footer > div'],
    ]
      .map(([name, selector]) => {
        const el = document.querySelector(selector)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return {
          name,
          left: Math.round(r.left),
          right: Math.round(r.right),
          width: Math.round(r.width),
        }
      })
      .filter(Boolean)

    return {
      docHeight,
      horizontalOverflow: document.documentElement.scrollWidth - vw,
      overflow,
      tapTargets,
      contrastIssues: contrastIssues.sort((a, b) => a.ratio - b.ratio).slice(0, 30),
      smallText: smallText.slice(0, 25),
      headline,
      tone,
      sections,
      pricingModes,
      priceNodes,
      ctas,
      boxes,
    }
  })

  console.error(
    `\n=== ${width}×${height} === doc ${data.docHeight}px · overflowX ${data.horizontalOverflow}px · ` +
      `tap<44 ${data.tapTargets.length} · kontras gagal ${data.contrastIssues.length} · ` +
      `font<12 ${data.smallText.length} · em-dash ${data.tone.emDash} · lu ${data.tone.lu} · kamu ${data.tone.kamu} · ` +
      `h1 ${data.headline?.lines ?? '?'} baris`,
  )
  results.push({ width, height, ...data, consoleErrors, failedRequests })
  await context.close()
}

fs.mkdirSync('docs/landing/shots', { recursive: true })
const outJson = process.env.PROBE_OUT ?? path.join('docs/landing/shots', 'audit-probe.json')
fs.writeFileSync(outJson, JSON.stringify(results, null, 2), 'utf8')
console.error(`\nJSON: ${outJson}`)
