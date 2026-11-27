/**
 * scripts/landing/make-dialog-preview.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Menyiapkan dua tangkapan dialog landing yang teksnya BAKED-IN di dalam
 * gambar, lalu menghasilkan varian WebP yang dipakai kartu fitur:
 *
 *   1. Dialog "Catat transaksi"  → tombol simpan harus berbunyi "Catet"
 *      (dulu "Catat"), supaya konsisten dengan seluruh halaman.
 *   2. Dialog "AI Coach"         → kata ganti di bubble Minca harus "kamu/aku"
 *      (dulu "lo/gue"), sejalan dengan nada copy landing.
 *
 * Kenapa bukan sekadar diedit di komponen: kedua berkas adalah TANGKAPAN
 * antarmuka yang dirender sebagai <img>. Satu-satunya cara memperbaiki teksnya
 * tanpa menggambar ulang seluruh desain adalah menimpa area teks itu di kanvas
 * dengan font yang sama (Inter, dibundel di `app/fonts/`), lalu meng-encode
 * ulang persis seperti `make-landing-webp.mjs`.
 *
 * Hasil:
 *   public/landing/minca-chat-preview.png    (sumber PNG yang sudah dikoreksi)
 *   public/landing/catat-transaksi-preview.png
 *   public/landing/dialog-ai-coach-1280.webp
 *   public/landing/dialog-catat-transaksi-1280.webp
 *
 * Jalankan: node scripts/landing/make-dialog-preview.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { chromium } from 'playwright-core'

const PUBLIC_DIR = path.join(process.cwd(), 'public')
const WIDTH = 1280
const QUALITY = 0.82

/** @type {{ src: string, pngOut: string, webpOut: string, kind: 'minca' | 'catat' }[]} */
const JOBS = [
  {
    src: '/Dialog - AI Coach CatetInd.png',
    pngOut: 'public/landing/minca-chat-preview.png',
    webpOut: 'public/landing/dialog-ai-coach-1280.webp',
    kind: 'minca',
  },
  {
    src: '/Dialog - Catat transaksi.png',
    pngOut: 'public/landing/catat-transaksi-preview.png',
    webpOut: 'public/landing/dialog-catat-transaksi-1280.webp',
    kind: 'catat',
  },
]

const MIME = {
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.html': 'text/html; charset=utf-8',
}

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent((request.url ?? '/').split('?')[0] ?? '/')
  if (pathname === '/' || pathname === '/__paint') {
    response.writeHead(200, { 'content-type': MIME['.html'] })
    response.end('<!doctype html><meta charset="utf-8"><title>paint</title><body></body>')
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

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true })
  } catch {
    return await chromium.launch({ channel: 'chrome', headless: true })
  }
}

const browser = await launchBrowser()
const page = await browser.newPage()
await page.goto(`${origin}/__paint`, { waitUntil: 'domcontentloaded' })

/* Font Inter yang SAMA dengan app (variable, dibundel di repo) — bukan CDN. */
const inter = fs.readFileSync(path.join(process.cwd(), 'app/fonts/inter-latin-variable.woff2'))
await page.addStyleTag({
  content: `@font-face{font-family:'InterPatch';src:url(data:font/woff2;base64,${inter.toString('base64')}) format('woff2');font-weight:100 900;font-style:normal;font-display:block}`,
})

for (const job of JOBS) {
  const result = await page.evaluate(
    async ({ src, width, quality, kind }) => {
      await document.fonts.load('400 55px InterPatch')
      await document.fonts.ready

      const image = new Image()
      image.src = src
      await image.decode()

      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas 2d tidak tersedia')
      ctx.drawImage(image, 0, 0)

      const TEXT = 'rgb(69, 89, 78)'

      if (kind === 'minca') {
        /* ── Bubble Minca ────────────────────────────────────────────────────
           Tiga baris teks ditimpa utuh supaya pemenggalan barisnya ikut rapi
           setelah "lo" menjadi "kamu". Ukuran mengikuti tangkapan aslinya:
           font 55 px, jarak baris 94 px, warna #45594e. */
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(250, 358, 1200, 284)

        ctx.fillStyle = TEXT
        ctx.font = '400 55px InterPatch, "Segoe UI Emoji", sans-serif'
        ctx.textBaseline = 'alphabetic'
        const lines = [
          'Kosan & WiFi udah aman! 🎉',
          'Saldo kamu Rp 2.120.000, jatah jajan hari ini',
          'Rp 75.000. Mau cek apa hari ini?',
        ]
        const baselines = [424, 518, 610]
        lines.forEach((line, index) => ctx.fillText(line, 264, baselines[index]))

        /* ── Chip saran pertama ──────────────────────────────────────────────
           Hanya kata "Gue" yang diganti "Aku"; sisa kalimat tetap piksel asli.
           Lebar "Aku" hampir sama dengan "Gue", jadi jarak ke kata berikutnya
           tidak berubah. */
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(250, 766, 102, 74)
        ctx.fillStyle = TEXT
        ctx.font = '400 48px InterPatch, sans-serif'
        /* "Aku" sedikit lebih pendek dari "Gue"; letter-spacing 2px menjaga
           jarak ke kata berikutnya tetap terasa satu spasi, bukan dua. */
        ctx.letterSpacing = '2px'
        ctx.fillText('Aku', 258, 815)
        ctx.letterSpacing = '0px'
      } else {
        /* ── Tombol simpan "Catat" → "Catet" ─────────────────────────────────
           Area kata ditimpa warna pil (#ededed), lalu kata baru ditulis dengan
           font 67 px warna teks nonaktif #b2b9b5. Ikon centang tidak disentuh. */
        ctx.fillStyle = 'rgb(237, 237, 237)'
        ctx.fillRect(738, 1320, 174, 78)
        ctx.fillStyle = 'rgb(178, 185, 181)'
        ctx.font = '400 67px InterPatch, sans-serif'
        ctx.textBaseline = 'alphabetic'
        ctx.fillText('Catet', 741, 1383)
      }

      const png = canvas.toDataURL('image/png')

      const scaled = document.createElement('canvas')
      scaled.width = width
      scaled.height = Math.round((canvas.height / canvas.width) * width)
      const scaledContext = scaled.getContext('2d')
      if (!scaledContext) throw new Error('canvas 2d tidak tersedia')
      scaledContext.drawImage(canvas, 0, 0, scaled.width, scaled.height)
      const webp = scaled.toDataURL('image/webp', quality)

      return { png, webp }
    },
    { src: job.src, width: WIDTH, quality: QUALITY, kind: job.kind },
  )

  for (const [dataUrl, out] of [
    [result.png, job.pngOut],
    [result.webp, job.webpOut],
  ]) {
    const base64 = dataUrl.split(',')[1]
    if (!base64) throw new Error(`encode gagal: ${out}`)
    fs.mkdirSync(path.dirname(out), { recursive: true })
    fs.writeFileSync(out, Buffer.from(base64, 'base64'))
  }

  const pngKb = Math.round(fs.statSync(job.pngOut).size / 1024)
  const webpKb = Math.round(fs.statSync(job.webpOut).size / 1024)
  console.log(`${job.webpOut}  ${WIDTH}px  PNG ${pngKb} KB · WebP ${webpKb} KB`)
}

await browser.close()
await new Promise((resolve) => server.close(resolve))
