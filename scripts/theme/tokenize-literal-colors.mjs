/**
 * scripts/theme/tokenize-literal-colors.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Membersihkan sisa HEX LITERAL & BAYANGAN WARNA yang masih ditulis langsung di
 * kode, supaya seluruh sistem konsisten memakai token palet "Earth Pastel".
 *
 * Latar belakang: penjaga palet (`audit-palette.mjs`) hanya menolak warna yang
 * TIDAK ada di palet, jadi warna yang nilainya SUDAH ADA di palet tapi ditulis
 * sebagai hex literal (`text-[#b89191]`) tetap lolos — padahal tokennya
 * (`text-hud-terracotta`) sudah dipakai di tempat lain untuk warna yang sama.
 * Itulah ketidak-konsistenan yang dirapikan di sini.
 *
 * Dua transformasi (IDEMPOTENT — aman dijalankan berulang kali):
 *   1. Kelas warna arbitrer `-\[#rrggbb\]` → `-{token}`.
 *      Hanya untuk hex yang sudah punya token (palet kanon / alias semantik /
 *      nilai turunan). Hex di luar tabel dibiarkan apa adanya.
 *   2. Bayangan berbasis evergreen `rgba(69,89,78,…)` → `rgba(0,0,0,…)`.
 *      Migrasi "Soil → hitam" dulu mengubah rgba(80,58,58,…) / rgba(36,26,26,…)
 *      jadi rgba(0,0,0,…) tapi MELEWATKAN bayangan evergreen. Baris yang
 *      disentuh HANYA yang memuat kata `shadow` (termasuk `drop-shadow(`) —
 *      warna sumbu & kursor chart TIDAK ikut berubah.
 *
 * Pakai:
 *   node scripts/theme/tokenize-literal-colors.mjs --dry-run   # lihat rencana
 *   node scripts/theme/tokenize-literal-colors.mjs             # terapkan
 * ─────────────────────────────────────────────────────────────────────────────
 */
import fs from 'node:fs'
import path from 'node:path'

/* Satu nama token per hex (dipilih = alias yang paling banyak dipakai UI,
   supaya literal yang diganti menyatu dengan tetangganya). Nilai turunan
   (Lapis 3) didefinisikan di blok `@theme inline` app/globals.css. */
const HEX_TO_TOKEN = {
  '#ffffff': 'cream',
  '#000000': 'soil',
  '#45594e': 'forest',
  '#52685c': 'forest-soft',
  '#91bb9e': 'mint',
  '#ecd768': 'brand',
  '#91a0b8': 'thistle',
  '#ebe4de': 'sage',
  '#b5b987': 'hud-sage',
  '#b89191': 'hud-terracotta',
  '#ffb885': 'hud-amber',
  '#dbe4c7': 'mint-soft',
  '#c4c7af': 'evergreen-light',
  '#1f2823': 'evergreen-deep',
  '#161c19': 'evergreen-deeper',
  '#e6e4c0': 'olive-light',
  '#51533d': 'olive-deep',
  '#dbdccf': 'thistle-light',
  '#414853': 'thistle-deep',
  '#e7d8c3': 'plum-light',
  '#534141': 'plum-deep',
  '#fbe3c0': 'cantelope-light',
  '#e8b06a': 'cantelope-mid',
  '#73533c': 'cantelope-deep',
  '#f6edb7': 'daisy-light',
  '#6a612f': 'daisy-deep',
}

const CLASS_RE = /-\[#([0-9a-fA-F]{6})\]/g
const SHADOW_OLD = 'rgba(69,89,78,'
const SHADOW_NEW = 'rgba(0,0,0,'

const ROOTS = ['app', 'components', 'lib', 'hooks']
const EXTS = new Set(['.tsx', '.ts', '.css'])
const SKIP_DIRS = new Set(['node_modules', '.next', 'docs', 'public', '.git'])

const dryRun = process.argv.includes('--dry-run')

const files = []
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue
      walk(path.join(dir, e.name))
    } else if (EXTS.has(path.extname(e.name))) {
      files.push(path.join(dir, e.name))
    }
  }
}
for (const r of ROOTS) if (fs.existsSync(r)) walk(r)

let classHits = 0
let shadowHits = 0
let changedFiles = 0
const perToken = {}
const touched = []

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8')
  let out = src

  /* 1 · kelas warna arbitrer → token */
  out = out.replace(CLASS_RE, (match, hex) => {
    /* capture group tidak memuat '#', jadi tokennya dicari dengan prefiks '#' */
    const token = HEX_TO_TOKEN['#' + hex.toLowerCase()]
    if (!token) return match
    classHits++
    perToken[token] = (perToken[token] ?? 0) + 1
    return `-${token}`
  })

  /* 2 · bayangan evergreen → netral (hanya baris ber-shadow) */
  if (out.includes(SHADOW_OLD)) {
    out = out
      .split('\n')
      .map((line) => {
        if (!line.includes('shadow') || !line.includes(SHADOW_OLD)) return line
        shadowHits += (line.match(new RegExp(SHADOW_OLD.replace(/[.(]/g, '\\$&'), 'g')) ?? []).length
        return line.split(SHADOW_OLD).join(SHADOW_NEW)
      })
      .join('\n')
  }

  if (out !== src) {
    changedFiles++
    touched.push(file.replace(/\\/g, '/'))
    if (!dryRun) fs.writeFileSync(file, out)
  }
}

const mode = dryRun ? 'RENCANA (dry-run)' : 'DITERAPKAN'
console.log(`— ${mode} —`)
console.log(`kelas hex → token : ${classHits}`)
for (const [token, n] of Object.entries(perToken).sort((a, b) => b[1] - a[1])) {
  console.log(`   ${String(n).padStart(3)}  ${token}`)
}
console.log(`bayangan evergreen → netral : ${shadowHits}`)
console.log(`file berubah : ${changedFiles}`)
if (dryRun && touched.length) {
  console.log('\nfile yang akan disentuh:')
  for (const f of touched) console.log(`   ${f}`)
}
