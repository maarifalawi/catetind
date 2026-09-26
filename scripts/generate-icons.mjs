/* ── Generator ikon app (favicon tetap /favicon.png; ini untuk HOME SCREEN) ───
   Membuat ikon kotak penuh (full-bleed) dari wordmark resmi `LOGO CATETIND.png`:
   latar gradien forest + aurora mint, wordmark cream di tengah. Karena latarnya
   penuh (bukan transparan), ikon tampil rapi baik sebagai apple-touch-icon iOS
   maupun ikon maskable Android — tidak ada lagi ikon "polos".

   Pakai: node scripts/generate-icons.mjs
   Output: public/icons/icon-192.png, public/icons/icon-512.png,
           public/icons/apple-icon.png (180×180)

   Catatan: `sharp` bukan dependency langsung project (dia ikut bawaan Next),
   jadi modulnya dicari dulu di node_modules, lalu di store pnpm (.pnpm). */

import { createRequire } from 'node:module'
import { mkdirSync, readdirSync } from 'node:fs'
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
  if (!dir) throw new Error('sharp tidak ditemukan di node_modules — jalankan pnpm install dulu.')
  return require(path.join(store, dir, 'node_modules', 'sharp'))
}

const sharp = loadSharp()

const LOGO = path.join(root, 'public', 'LOGO CATETIND.png')
const OUT_DIR = path.join(root, 'public', 'icons')

/** rasio lebar wordmark terhadap sisi ikon — aman di dalam safe zone maskable */
const LOGO_RATIO = 0.7
/** warna wordmark di atas latar gelap (krem khas brand) */
const WORDMARK_TINT = '#f4f8ef'

/** latar kotak penuh: gradien forest + aurora mint kanan atas */
function background(size) {
  return Buffer.from(`<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#17543c"/>
      <stop offset="52%" stop-color="#103a2a"/>
      <stop offset="100%" stop-color="#06231a"/>
    </linearGradient>
    <radialGradient id="mint" cx="0.82" cy="0.14" r="0.72">
      <stop offset="0%" stop-color="#b7e04b" stop-opacity="0.34"/>
      <stop offset="60%" stop-color="#b7e04b" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#b7e04b" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="shade" cx="0.12" cy="0.92" r="0.8">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#base)"/>
  <rect width="${size}" height="${size}" fill="url(#mint)"/>
  <rect width="${size}" height="${size}" fill="url(#shade)"/>
</svg>`)
}

/** wordmark hitam → putih/krem, latar transparan tetap transparan */
async function wordmark(size) {
  return sharp(LOGO)
    .ensureAlpha()
    .negate({ alpha: false })
    .tint(WORDMARK_TINT)
    .resize({ width: Math.round(size * LOGO_RATIO) })
    .png()
    .toBuffer()
}

async function build(size) {
  const logo = await wordmark(size)
  return sharp(background(size))
    .composite([{ input: logo, gravity: 'centre' }])
    .png({ compressionLevel: 9, palette: true })
    .toBuffer()
}

mkdirSync(OUT_DIR, { recursive: true })

const targets = [
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-192.png', size: 192 },
  { file: 'apple-icon.png', size: 180 },
]

for (const { file, size } of targets) {
  const png = await build(size)
  await sharp(png).toFile(path.join(OUT_DIR, file))
  console.log(`✓ public/icons/${file} (${size}×${size})`)
}

/* iOS juga mengecek /apple-icon.png di root sebagai cadangan kalau tag
   apple-touch-icon hilang — jadi file lama (ikon v0 polos) ditimpa di sini. */
await sharp(await build(180)).toFile(path.join(root, 'public', 'apple-icon.png'))
console.log('✓ public/apple-icon.png (180×180)')
