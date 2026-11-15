/**
 * scripts/landing/make-landing-webp.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Menghasilkan varian WebP untuk aset landing yang tampil KECIL di layar:
 *
 *   • lima avatar bukti sosial hero (dirender 28–36 px, sumber PNG 255–483 KB);
 *   • empat gambar kartu fitur (dirender ~600 px, sumber PNG 78–348 KB).
 *
 * Kenapa begini: `next.config.mjs` memakai `images.unoptimized`, `sharp` tidak
 * terpasang, dan tidak ada ImageMagick di mesin ini. Chromium (lewat
 * `playwright-core`) sudah tersedia untuk QA, jadi canvas-nya dipakai untuk
 * resize + encode WebP — pola yang sama dengan `make-hero-webp.mjs`, hanya saja
 * skrip ini TIDAK butuh dev server: ia menyalakan server statis kecil sendiri
 * untuk folder `public/` supaya gambar bisa digambar ke canvas tanpa
 * mengotori (taint) canvas.
 *
 * Pakai:
 *   pnpm landing:webp
 *
 * File sumber PNG sengaja TIDAK dihapus/ditimpa — ia yang jadi bahan regenerasi
 * (sama seperti `logoAI.png` untuk ikon PWA).
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { chromium } from 'playwright-core'

const PUBLIC_DIR = path.join(process.cwd(), 'public')

/** @type {{ src: string, out: string, width: number, quality: number }[]} */
const JOBS = [
  /* avatar hero — 96 px cukup untuk layar 3× (avatar terbesar 36 px) */
  { src: '/AVA 1.png', out: 'public/avatars/ava-1.webp', width: 96, quality: 0.86 },
  { src: '/AVA 2.png', out: 'public/avatars/ava-2.webp', width: 96, quality: 0.86 },
  { src: '/AVA 3.png', out: 'public/avatars/ava-3.webp', width: 96, quality: 0.86 },
  { src: '/AVA 4.png', out: 'public/avatars/ava-4.webp', width: 96, quality: 0.86 },
  { src: '/AVA 5.png', out: 'public/avatars/ava-5.webp', width: 96, quality: 0.86 },
  /* kartu fitur landing — 1280 px = ±2× lebar kartu desktop */
  {
    src: '/Dialog - Catat transaksi.png',
    out: 'public/landing/dialog-catat-transaksi-1280.webp',
    width: 1280,
    quality: 0.82,
  },
  {
    src: '/Section.png',
    out: 'public/landing/section-jatah-harian-1280.webp',
    width: 1280,
    quality: 0.82,
  },
  {
    src: '/Dialog - AI Coach CatetInd.png',
    out: 'public/landing/dialog-ai-coach-1280.webp',
    width: 1280,
    quality: 0.82,
  },
  {
    src: '/Pengeluaran Bulan ini.png',
    out: 'public/landing/pengeluaran-bulan-ini-1280.webp',
    width: 1280,
    quality: 0.82,
  },
]

const MIME = {
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.html': 'text/html; charset=utf-8',
}

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent((request.url ?? '/').split('?')[0] ?? '/')

  /* halaman kosong: tempat canvas hidup. Tidak ada berkas yang perlu ditulis. */
  if (pathname === '/' || pathname === '/__optimize') {
    response.writeHead(200, { 'content-type': MIME['.html'] })
    response.end('<!doctype html><meta charset="utf-8"><title>optimize</title><body></body>')
    return
  }

  const file = path.resolve(PUBLIC_DIR, `.${pathname}`)
  if (!file.startsWith(PUBLIC_DIR + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404)
    response.end('not found')
    return
  }

  response.writeHead(200, {
    'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
  })
  fs.createReadStream(file).pipe(response)
})

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const { port } = server.address()
const origin = `http://127.0.0.1:${port}`

/** Chromium bawaan playwright dulu; Chrome terpasang di mesin dipakai sebagai cadangan. */
async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true })
  } catch {
    return await chromium.launch({ channel: 'chrome', headless: true })
  }
}

const browser = await launchBrowser()
const page = await browser.newPage()
await page.goto(`${origin}/__optimize`, { waitUntil: 'domcontentloaded' })

let before = 0
let after = 0

for (const job of JOBS) {
  const dataUrl = await page.evaluate(async ({ src, width, quality }) => {
    const image = new Image()
    image.src = src
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = Math.round((image.naturalHeight / image.naturalWidth) * width)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvas 2d tidak tersedia')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/webp', quality)
  }, job)

  const base64 = dataUrl.split(',')[1]
  if (!base64) throw new Error(`encode gagal: ${job.src}`)

  fs.mkdirSync(path.dirname(job.out), { recursive: true })
  fs.writeFileSync(job.out, Buffer.from(base64, 'base64'))

  const srcFile = path.join(PUBLIC_DIR, decodeURIComponent(job.src.replace(/^\//, '')))
  const srcKb = Math.round(fs.statSync(srcFile).size / 1024)
  const outKb = Math.round(fs.statSync(job.out).size / 1024)
  before += srcKb
  after += outKb
  console.log(`${job.out}  ${job.width}px  ${srcKb} KB → ${outKb} KB`)
}

await browser.close()
await new Promise((resolve) => server.close(resolve))

console.log(`\nTOTAL ${before} KB → ${after} KB (hemat ${before - after} KB)`)
