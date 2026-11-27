/**
 * scripts/qa/landing-shots.mjs
 * ─────────────────────────────────────────────────────────────────────────
 * Screenshot QA landing per-SECTION — sengaja TIDAK pernah memotret halaman
 * utuh dalam satu gambar.
 *
 * KENAPA: landing ini tingginya ±9.000–11.000px. `page.screenshot({
 * fullPage: true })` menghasilkan PNG 390×9230 (HP) / 1280×7600 (desktop),
 * dan berkas setinggi itu DITOLAK pembaca gambar (gejalanya: "The image is
 * too large to process: its width and height must each be at most 8192
 * pixels" / "unsupported image"). Jadi di sini tiap section dipotret
 * sendiri, dan kalau satu section masih lebih tinggi dari `MAX_HEIGHT`,
 * hasilnya OTOMATIS dipecah jadi `-part1`, `-part2`, … Tidak ada lagi file
 * raksasa yang bikin QA buta.
 *
 * Jalankan (server harus hidup di :3000):
 *   node scripts/qa/landing-shots.mjs
 *   node scripts/qa/landing-shots.mjs --only=harga      satu section saja
 *   node scripts/qa/landing-shots.mjs --base=http://localhost:3001
 *
 * Hasil: qa-shots/landing/<section>-<viewport>[-partN].png
 * ─────────────────────────────────────────────────────────────────────────
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { chromiumPath } from './harness.mjs'

/** batas aman satu gambar — jauh di bawah 8192px supaya semua alat bisa buka */
const MAX_HEIGHT = 3000
const MAX_WIDTH = 2000

const baseArg = process.argv.find((a) => a.startsWith('--base='))
const BASE = baseArg ? baseArg.slice('--base='.length) : 'http://localhost:3000'
const onlyArg = process.argv.find((a) => a.startsWith('--only='))
const only = onlyArg ? onlyArg.slice('--only='.length) : null

const OUT_DIR = path.join(process.cwd(), 'qa-shots', 'landing')

/** section yang paling sering berubah copy-nya (id ada di komponen landing) */
const SECTIONS = [
  ['hero', '#hero'],
  ['kalkulator', '#pain-calculator'],
  ['fitur', '#fitur'],
  ['harga', '#pricing'],
  ['faq', '#faq'],
  ['footer', 'footer'],
]

const VIEWPORTS = [
  { label: 'hp', width: 390, height: 844 },
  { label: 'desktop', width: 1280, height: 800 },
]

fs.mkdirSync(OUT_DIR, { recursive: true })

const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true })

/** gambar `loading="lazy"` + animasi reveal belum jalan kalau halaman tidak pernah di-scroll */
async function warmLazyContent(page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8)
    const max = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
    for (let y = 0; y < max; y += step) {
      window.scrollTo(0, y)
      await new Promise((resolve) => setTimeout(resolve, 120))
    }
    window.scrollTo(0, 0)
    await new Promise((resolve) => setTimeout(resolve, 250))
  })
  await page.waitForTimeout(700)
}

let files = 0
let failed = 0

for (const viewport of VIEWPORTS) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, locale: 'id-ID' })
  await page.goto(BASE, { waitUntil: 'load', timeout: 90_000 })
  await page.waitForTimeout(1500)

  /* navbar `fixed` ikut terpotret di posisi scroll terakhir dan bisa menutupi
     bagian atas section — sembunyikan HANYA untuk QA. */
  await page.addStyleTag({ content: 'header{visibility:hidden!important}' })

  for (const [name, selector] of SECTIONS) {
    if (only && name !== only) continue
    const target = page.locator(selector).first()
    if ((await target.count()) === 0) {
      console.log(`  lewati ${name}-${viewport.label}: selector ${selector} tidak ada`)
      continue
    }
    await warmLazyContent(page)
    await target.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)

    /* rect dalam koordinat DOKUMEN (boundingBox() memberi koordinat viewport) */
    const box = await target.evaluate((el) => {
      const rect = el.getBoundingClientRect()
      return {
        x: Math.max(0, rect.left + window.scrollX),
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      }
    })
    if (!box.width || !box.height) {
      console.log(`  lewati ${name}-${viewport.label}: elemen setinggi 0`)
      continue
    }

    const parts = Math.max(1, Math.ceil(box.height / MAX_HEIGHT))
    for (let index = 0; index < parts; index += 1) {
      const y = box.y + index * MAX_HEIGHT
      const height = Math.min(MAX_HEIGHT, box.height - index * MAX_HEIGHT)
      const suffix = parts > 1 ? `-part${index + 1}` : ''
      const file = path.join(OUT_DIR, `${name}-${viewport.label}${suffix}.png`)
      await page.screenshot({ path: file, fullPage: true, clip: { ...box, y, height } })

      const width = Math.round(box.width)
      const tall = height > MAX_HEIGHT || width > MAX_WIDTH
      if (tall) failed += 1
      files += 1
      console.log(
        `  ${path.relative(process.cwd(), file)} (${width}×${Math.round(height)}, ${(fs.statSync(file).size / 1024).toFixed(0)} KB)${tall ? '  ⚠ TERLALU BESAR' : ''}`,
      )
    }
  }

  await page.close()
}

await browser.close()

console.log(
  failed === 0
    ? `Ringkasan landing-shots: ${files} gambar, semua di bawah batas ${MAX_WIDTH}×${MAX_HEIGHT}px`
    : `Ringkasan landing-shots: ${files} gambar, ${failed} MASIH TERLALU BESAR`,
)
process.exit(failed === 0 ? 0 : 1)
