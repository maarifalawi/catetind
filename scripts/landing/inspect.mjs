/**
 * scripts/landing/inspect.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Membaca COMPUTED STYLE elemen penting di halaman asli (atau hasil port),
 * supaya angka di komponen diambil dari browser — bukan ditebak dari CSS
 * generated yang penuh variant & media query.
 *
 * Pakai:
 *   node scripts/landing/inspect.mjs <url> "[selector]=[label]" ...
 *
 * Contoh:
 *   node scripts/landing/inspect.mjs https://reserved-calls-942581.framer.app \
 *     "#hero h1=hero-h1" "#hero a[data-reset=button]=hero-cta"
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'

const url = process.argv[2]
const specs = process.argv
  .slice(3)
  .filter((s) => s.includes('|'))
  .map((s) => {
    const [selector, label] = s.split('|')
    return { selector, label: label ?? selector }
  })

if (!url) {
  console.error('URL wajib diisi')
  process.exit(1)
}

const channel = fs.existsSync('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe')
  ? 'msedge'
  : 'chrome'

/* `--viewport=390` → ukur varian mobile tanpa mengubah skrip. Tanpa opsi ini
   tetap 1440 (desktop), jadi pemakaian lama tidak berubah. */
const viewportArg = process.argv.find((a) => a.startsWith('--viewport='))
const viewportWidth = viewportArg ? Number(viewportArg.slice('--viewport='.length)) : 1440

const browser = await chromium.launch({ channel, headless: true })
const context = await browser.newContext({
  viewport: { width: viewportWidth, height: viewportWidth < 810 ? 844 : 1000 },
  locale: 'id-ID',
})
const page = await context.newPage()
await page.goto(url, { waitUntil: 'load', timeout: 90_000 })
await page.waitForTimeout(3500)

const scrollArg = process.argv.find((a) => a.startsWith('--scroll='))
if (scrollArg) {
  await page.evaluate((y) => window.scrollTo(0, y), Number(scrollArg.slice('--scroll='.length)))
  await page.waitForTimeout(1200)
}

const measureArg = process.argv.find((a) => a.startsWith('--measure='))
if (measureArg) {
  const text = measureArg.slice('--measure='.length)
  const widths = await page.evaluate(async (value) => {
    await document.fonts.ready
    const canvas = document.createElement('canvas').getContext('2d')
    const results = {}
    for (const size of [48, 72, 88]) {
      for (const family of ['Inter', '"Inter Display"']) {
        canvas.font = `${size}px ${family}`
        results[`${family} ${size}`] = Math.round(canvas.measureText(value).width)
      }
    }
    return results
  }, text)
  console.log(JSON.stringify({ url, text, widths }, null, 2))
  await browser.close()
  process.exit(0)
}

const domMeasureArg = process.argv.find((a) => a.startsWith('--dom='))
if (domMeasureArg) {
  const text = domMeasureArg.slice('--dom='.length)
  const data = await page.evaluate(async (value) => {
    await document.fonts.ready
    const host = document.createElement('div')
    host.style.cssText = 'position:fixed;left:-9999px;top:0;white-space:nowrap'
    document.body.appendChild(host)
    const variants = {
      default: {
        family: 'Inter',
        extra: '',
      },
      'var(--font-inter)': {
        family: 'var(--font-inter)',
        extra: '',
      },
      'Inter Fallback': {
        family: '"Inter Fallback"',
        extra: '',
      },
      'Inter Tight': {
        family: '"Inter Tight"',
        extra: '',
      },
    }
    const out = {}
    for (const [label, cfg] of Object.entries(variants)) {
      const span = document.createElement('span')
      span.textContent = value
      span.style.cssText = `font-family:${cfg.family},sans-serif;font-size:88px;letter-spacing:-3.52px;line-height:110px;${cfg.extra}`
      host.appendChild(span)
      out[label] = Math.round(span.getBoundingClientRect().width * 100) / 100
      span.remove()
    }
    host.remove()
    return out
  }, text)
  console.log(JSON.stringify({ url, text, data }, null, 2))
  await browser.close()
  process.exit(0)
}

const linesArg = process.argv.find((a) => a.startsWith('--lines='))
if (linesArg) {
  const selector = linesArg.slice('--lines='.length)
  const data = await page.evaluate(async (sel) => {
    await document.fonts.ready
    const el = document.querySelector(sel)
    if (!el) return { error: 'tidak ditemukan' }
    const range = document.createRange()
    range.selectNodeContents(el)
    const rects = [...range.getClientRects()].map((r) => ({
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
    }))
    const cs = getComputedStyle(el)
    return {
      rect: {
        x: Math.round(el.getBoundingClientRect().x),
        y: Math.round(el.getBoundingClientRect().y),
        w: Math.round(el.getBoundingClientRect().width),
        h: Math.round(el.getBoundingClientRect().height),
      },
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      letterSpacing: cs.letterSpacing,
      lineHeight: cs.lineHeight,
      fontOpticalSizing: cs.fontOpticalSizing,
      fontVariationSettings: cs.fontVariationSettings,
      fontsReady: document.fonts.check(`${cs.fontSize} ${cs.fontFamily.split(',')[0]}`),
      rects,
    }
  }, selector)
  console.log(JSON.stringify({ url, selector, data }, null, 2))
  await browser.close()
  process.exit(0)
}

const result = await page.evaluate((list) => {
  const props = [
    'fontFamily',
    'fontSize',
    'fontWeight',
    'lineHeight',
    'letterSpacing',
    'color',
    'backgroundColor',
    'backgroundImage',
    'borderRadius',
    'padding',
    'margin',
    'gap',
    'width',
    'height',
    'boxShadow',
    'display',
    'alignItems',
    'justifyContent',
    'textAlign',
  ]
  const out = {}
  for (const { selector, label } of list) {
    const el = document.querySelector(selector)
    if (!el) {
      out[label] = 'TIDAK DITEMUKAN'
      continue
    }
    const cs = getComputedStyle(el)
    const style = {}
    for (const prop of props) {
      const value = cs[prop]
      if (value && value !== 'normal' && value !== 'none' && value !== 'auto' && value !== '0px') {
        style[prop] = value
      }
    }
    out[label] = {
      rect: {
        x: Math.round(el.getBoundingClientRect().x),
        y: Math.round(el.getBoundingClientRect().y),
        w: Math.round(el.getBoundingClientRect().width),
        h: Math.round(el.getBoundingClientRect().height),
      },
      style,
    }
  }
  return out
}, specs)

console.log(JSON.stringify(result, null, 2))
await browser.close()
