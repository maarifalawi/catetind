/* ── Generator favicon & ikon tab ────────────────────────────────────────────
   Google menampilkan logo situs di hasil pencarian hanya kalau menemukan
   favicon yang sah: persegi, minimal 48×48, dan (paling aman) tersedia di
   `/favicon.ico`. Sebelum skrip ini ada, app hanya mendeklarasikan
   `/LOGO.png` (wordmark 1080×1080 dengan latar putih), sehingga hasil
   pencarian menampilkan ikon globe tanpa logo.

   Sumber artwork: `public/faviconn.png` — wordmark "catet" hijau tua di kanvas
   putih 1080×1080 (artwork dari pemilik produk). Skrip ini menulis:
     • app/favicon.ico       → disajikan Next.js di `/favicon.ico` (16/32/48 px)
     • app/icon.png          → disajikan Next.js di `/icon.png` (512×512)
     • public/favicon-192.png → dipakai `<link rel="icon" sizes="192x192">`

   `public/icons/icon-*.png` (Home Screen / ikon notifikasi PWA) sengaja TIDAK
   ditulis di sini: itu milik `scripts/generate-icons.mjs` yang membuat ikon
   kotak penuh berlatar gelap supaya tetap terbaca sebagai ikon maskable dan
   sebagai ikon notifikasi Android (ikon putih akan hilang di latar putih).

   Pakai: node scripts/generate-favicon.mjs
   Kalau artwork favicon berubah: ganti `public/faviconn.png`, lalu jalankan
   skrip ini (`pnpm favicon`). */

import { createRequire } from 'node:module'
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)

function loadSharp() {
  try {
    return require('sharp')
  } catch {
    /* jatuh ke store pnpm: node_modules/.pnpm/sharp@x.y.z/node_modules/sharp */
  }
  const store = path.join(root, 'node_modules', '.pnpm')
  const dir = readdirSync(store).find((name) => name.startsWith('sharp@'))
  if (!dir) throw new Error('sharp tidak ditemukan di node_modules, jalankan pnpm install dulu.')
  return require(path.join(store, dir, 'node_modules', 'sharp'))
}

const sharp = loadSharp()

const SOURCE = path.join(root, 'public', 'faviconn.png')
const APP_DIR = path.join(root, 'app')
const PUBLIC_DIR = path.join(root, 'public')

/** bungkus beberapa PNG menjadi satu berkas .ico (format PNG-in-ICO) */
function buildIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4) // jumlah gambar

  const entries = []
  let offset = 6 + images.length * 16
  for (const { size, png } of images) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0) // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1) // height
    entry.writeUInt8(0, 2) // palette
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // color planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    entries.push(entry)
    offset += png.length
  }

  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)])
}

mkdirSync(APP_DIR, { recursive: true })

const sizes = [16, 32, 48]
const images = []
for (const size of sizes) {
  const png = await sharp(SOURCE)
    .ensureAlpha()
    .resize(size, size, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toBuffer()
  images.push({ size, png })
}

await sharp(SOURCE).resize(512, 512, { fit: 'cover' }).png({ compressionLevel: 9 }).toFile(
  path.join(APP_DIR, 'icon.png'),
)
await sharp(SOURCE).resize(192, 192, { fit: 'cover' }).png({ compressionLevel: 9 }).toFile(
  path.join(PUBLIC_DIR, 'favicon-192.png'),
)
writeFileSync(path.join(APP_DIR, 'favicon.ico'), buildIco(images))

console.log('✓ app/favicon.ico (16/32/48)')
console.log('✓ app/icon.png (512×512)')
console.log('✓ public/favicon-192.png (192×192)')
