/**
 * scripts/theme/audit-palette.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * PENJAGA PALET — memastikan tidak ada warna "nyasar" di luar palet kanon.
 *
 * Memeriksa 3 hal di app/, components/, lib/, hooks/, scripts/:
 *   1. hex literal  `#rrggbb` yang bukan warna palet/turunan
 *   2. rgb()/rgba() literal yang bukan warna palet/turunan
 *   3. kelas warna bawaan Tailwind (`text-slate-500`, `bg-blue-600`, dst.)
 *
 * Pakai:  node scripts/theme/audit-palette.mjs
 * Keluar dengan kode 1 kalau ada pelanggaran (bisa dipakai di CI).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import fs from 'node:fs'
import path from 'node:path'

/* warna yang DIIZINKAN = 10 palet kanon + turunan (tint/shade) + netral teknis */
const ALLOWED = new Set(
  [
    /* palet kanon — Soil = HITAM (revisi dari #503a3a) */
    '#000000', '#45594e', '#fbf6d9', '#ebe4de', '#b89191',
    '#b5b987', '#91a0b8', '#91bb9e', '#ffb885', '#ecd768',
    /* turunan */
    '#52685c', '#c4c7af', '#1f2823', '#161c19', '#767676',
    '#dbe4c7', '#e6e4c0', '#51533d', '#dbdccf', '#414853', '#e7d8c3', '#534141',
    '#fbe3c0', '#e8b06a', '#73533c', '#f6edb7', '#6a612f',
    /* netral teknis — dasar permukaan putih (token `--color-canvas` / `--color-cream`) */
    '#ffffff',
  ].map((h) => h.toLowerCase()),
)

/* rgb() yang diizinkan — diturunkan OTOMATIS dari daftar hex di atas */
const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}
const ALLOWED_RGB = new Set([...ALLOWED].map(hexToRgb))

const DEFAULT_FAMILIES =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black'

const CLS_RE = new RegExp(
  `(?:bg|text|from|via|to|ring|border|fill|stroke|divide|outline|decoration|caret|accent|placeholder|shadow)-(?:${DEFAULT_FAMILIES})(?:-\\d{2,3})?`,
  'g',
)
const HEX_RE = /#([0-9a-fA-F]{6})(?![0-9a-fA-F])/g
const RGB_RE = /rgba?\(\s*(\d+)\s*[,\s]\s*(\d+)\s*[,\s]\s*(\d+)/g

const ROOTS = ['app', 'components', 'lib', 'hooks', 'scripts']
const EXTS = new Set(['.tsx', '.ts', '.css', '.mjs', '.js'])
const SKIP_DIRS = new Set(['node_modules', '.next', 'docs', 'public', '.git'])
/* file ini + codemod memang memuat warna lama sebagai tabel pemetaan */
const SKIP_FILES = new Set(['audit-palette.mjs', 'apply-palette.mjs'])

const files = []
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue
      walk(path.join(dir, e.name))
    } else if (EXTS.has(path.extname(e.name)) && !SKIP_FILES.has(e.name)) {
      files.push(path.join(dir, e.name))
    }
  }
}
for (const r of ROOTS) if (fs.existsSync(r)) walk(r)

const violations = []
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8')
  const lines = src.split(/\r?\n/)
  lines.forEach((line, i) => {
    for (const m of line.matchAll(HEX_RE)) {
      if (!ALLOWED.has(m[0].toLowerCase())) {
        violations.push({ file, line: i + 1, kind: 'hex', value: m[0] })
      }
    }
    for (const m of line.matchAll(RGB_RE)) {
      const key = `${m[1]},${m[2]},${m[3]}`
      if (!ALLOWED_RGB.has(key)) {
        violations.push({ file, line: i + 1, kind: 'rgb', value: key })
      }
    }
    for (const m of line.matchAll(CLS_RE)) {
      violations.push({ file, line: i + 1, kind: 'kelas', value: m[0] })
    }
  })
}

if (violations.length === 0) {
  console.log(`✓ palet bersih — ${files.length} file diperiksa, tidak ada warna di luar palet.`)
  process.exit(0)
}
console.log(`✗ ${violations.length} warna di luar palet di ${files.length} file:\n`)
for (const v of violations) {
  console.log(`  [${v.kind}] ${v.file.replace(/\\/g, '/')}:${v.line}  ${v.value}`)
}
process.exit(1)
