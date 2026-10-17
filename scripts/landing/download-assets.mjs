/**
 * scripts/landing/download-assets.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Mengunduh SEMUA gambar dari export Framer ke `public/landing/` supaya
 * landing yang di-port tidak lagi bergantung pada `framerusercontent.com`.
 *
 * Yang diunduh:
 *   • `<img src>` + `srcset` (varian `?scale-down-to=512|1024|2048` disimpan
 *     sebagai file terpisah dengan suffix `-512`, `-1024`, `-2048` supaya
 *     perilaku responsifnya sama),
 *   • URL gambar di inline style `background-image`,
 *   • ikon/OG (favicon tidak dipakai — favicon situs tetap `/LOGO.png`).
 *
 * Nama file = hash asli dari Framer, jadi `docs/landing/assets.json` bisa
 * dipakai untuk menelusuri balik aset mana yang dipakai section mana.
 *
 * Pakai:
 *   node scripts/landing/download-assets.mjs [--force]
 * ─────────────────────────────────────────────────────────────────────────────
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SOURCE = path.join(ROOT, 'LP CATETIND.html')
const OUT_DIR = path.join(ROOT, 'public', 'landing')
const MANIFEST = path.join(ROOT, 'docs', 'landing', 'assets.json')
const FORCE = process.argv.includes('--force')

const html = fs.readFileSync(SOURCE, 'utf8')
fs.mkdirSync(OUT_DIR, { recursive: true })

/** @type {Map<string, string>} remote URL → nama file lokal */
const wanted = new Map()

function add(url, variant) {
  if (!url.startsWith('https://framerusercontent.com/images/')) return
  const clean = url.replace(/&amp;/g, '&')
  const [base, query = ''] = clean.split('?')
  const name = base.split('/').pop()
  if (!name) return
  const ext = path.extname(name)
  const stem = name.slice(0, -ext.length)
  const scale = /(?:scale-down-to=)(\d+)/.exec(query)?.[1] ?? variant
  const localName = scale ? `${stem}-${scale}${ext}` : name
  wanted.set(base + (scale ? `?scale-down-to=${scale}` : ''), localName)
}

for (const m of html.matchAll(/https:\/\/framerusercontent\.com\/images\/[^"'\s)+]+/g)) {
  let url = m[0]
  if (url.endsWith(')')) url = url.slice(0, -1)
  add(url)
}

/* Tambahan: `srcset` berisi `url 512w, url 1024w, …` — sudah tertangkap regex
   di atas, tapi varian dengan query `&width=`/`&height=` saja belum punya nama
   unik. Varian seperti itu memakai file dasar (kualitas penuh) — tetap sama
   secara visual, hanya lebih besar. */

console.log(`Ditemukan ${wanted.size} URL gambar.`)

let downloaded = 0
let skipped = 0
const failures = []

for (const [url, fileName] of wanted) {
  const dest = path.join(OUT_DIR, fileName)
  if (!FORCE && fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    skipped += 1
    continue
  }
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(dest, buf)
    downloaded += 1
  } catch (error) {
    failures.push({ url, error: error instanceof Error ? error.message : String(error) })
  }
}

fs.mkdirSync(path.dirname(MANIFEST), { recursive: true })
fs.writeFileSync(
  MANIFEST,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: 'LP CATETIND.html',
      files: [...wanted.entries()].map(([remote, local]) => ({ remote, local: `/landing/${local}` })),
      failures,
    },
    null,
    2,
  ),
)

console.log(`Selesai: ${downloaded} diunduh, ${skipped} dilewati, ${failures.length} gagal.`)
if (failures.length) {
  for (const f of failures) console.error(`GAGAL ${f.url} → ${f.error}`)
  process.exitCode = 1
}
