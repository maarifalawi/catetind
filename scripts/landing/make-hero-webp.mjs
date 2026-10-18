/**
 * scripts/landing/make-hero-webp.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Menghasilkan varian WebP untuk visual hero dari server dev yang sedang jalan.
 *
 * Kenapa begini: `next.config.mjs` memakai `images.unoptimized`, `sharp` tidak
 * terpasang, dan tidak ada ImageMagick di mesin ini. Chromium (lewat
 * playwright-core) sudah tersedia untuk QA, jadi canvas-nya dipakai untuk
 * resize + encode WebP. Hasilnya: hero tidak lagi mengunduh PNG 3,9 MB.
 *
 * Pakai (dev server harus hidup di :3000):
 *   node scripts/landing/make-hero-webp.mjs [origin]
 */
import fs from 'node:fs'
import { chromium } from 'playwright-core'

const origin = process.argv[2] ?? 'http://localhost:3000'

const JOBS = [
  {
    src: '/GAMBARDEPAN.png',
    out: 'public/GAMBARDEPAN-1600.webp',
    width: 1600,
    quality: 0.82,
  },
  {
    src: '/landing/XR2qVbJABSACTzUQSOelrYLkws0.png',
    out: 'public/landing/XR2qVbJABSACTzUQSOelrYLkws0-1000.webp',
    width: 1000,
    quality: 0.82,
  },
]

const channel = fs.existsSync('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe')
  ? 'msedge'
  : 'chrome'

const browser = await chromium.launch({ channel, headless: true })
const page = await browser.newPage()
await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 90_000 })

for (const job of JOBS) {
  const dataUrl = await page.evaluate(async ({ src, width, quality }) => {
    const img = new Image()
    img.src = src
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = Math.round((img.naturalHeight / img.naturalWidth) * width)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas 2d tidak tersedia')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/webp', quality)
  }, job)

  const base64 = dataUrl.split(',')[1]
  if (!base64) throw new Error(`encode gagal: ${job.src}`)
  fs.mkdirSync(job.out.slice(0, job.out.lastIndexOf('/')), { recursive: true })
  fs.writeFileSync(job.out, Buffer.from(base64, 'base64'))
  const kb = Math.round(fs.statSync(job.out).size / 1024)
  console.log(`${job.out}  ${job.width}px  ${kb} KB`)
}

await browser.close()