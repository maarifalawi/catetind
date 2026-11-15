/**
 * scripts/theme/audit-text-contrast.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * PENJAGA KONTRAS TEKS — memastikan teks tidak kembali "samar-samar".
 *
 * Latar belakang: `app/globals.css` melarang opacity 40–60% untuk TEKS (hanya
 * 1,9–2,9:1 di atas putih, gagal WCAG AA) dan menyediakan dua token pengganti:
 * `forest-muted` / `cream-muted`. Aturan itu sempat tidak ditegakkan, dan
 * akibatnya ~1.145 tempat memakai `text-forest/45`, `text-forest/50`, dst.
 * Semuanya sudah dinaikkan oleh `raise-text-contrast.mjs`.
 *
 * Skrip ini adalah pagarnya: kalau ada yang menulis `text-forest/{25..60}` atau
 * `text-cream/{25..60}` BARU, pemeriksaan gagal. Opacity di bawah 25% tetap
 * diizinkan karena itu pemisah dekoratif, bukan teks.
 *
 * Pakai:  node scripts/theme/audit-text-contrast.mjs
 * Keluar dengan kode 1 kalau ada pelanggaran (aman dipakai di CI).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import fs from 'node:fs'
import path from 'node:path'

/** opasitas teks yang dianggap gagal kontras (25–60%) */
const FAIL_RE = /\btext-(forest|cream)\/(\d{2})\b/g
const MIN_FAIL = 25
const MAX_FAIL = 60

const ROOTS = ['app', 'components', 'lib', 'hooks']
const EXTS = new Set(['.tsx', '.ts'])
const SKIP_DIRS = new Set(['node_modules', '.next', 'docs', 'public', '.git'])
/** file ini sendiri memuat pola sebagai dokumentasi */
const SKIP_FILES = new Set(['audit-text-contrast.mjs', 'raise-text-contrast.mjs'])

const files = []
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue
      walk(path.join(dir, entry.name))
    } else if (EXTS.has(path.extname(entry.name)) && !SKIP_FILES.has(entry.name)) {
      files.push(path.join(dir, entry.name))
    }
  }
}
for (const root of ROOTS) if (fs.existsSync(root)) walk(root)

const violations = []
for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
  lines.forEach((line, index) => {
    for (const match of line.matchAll(FAIL_RE)) {
      const pct = Number(match[2])
      if (pct >= MIN_FAIL && pct <= MAX_FAIL) {
        violations.push({ file, line: index + 1, value: match[0] })
      }
    }
  })
}

if (violations.length === 0) {
  console.log(`✓ kontras teks bersih — ${files.length} berkas diperiksa, tidak ada teks di bawah 60% opacity.`)
  process.exit(0)
}

console.log(`✗ ${violations.length} teks terlalu samar di ${files.length} berkas:\n`)
for (const violation of violations) {
  console.log(`  ${violation.file.replace(/\\/g, '/')}:${violation.line}  ${violation.value}`)
}
console.log(
  '\nGanti dengan token kanon: `text-forest-muted` (di atas terang) atau `text-cream-muted` (di atas gelap).\n' +
    'Jalankan `node scripts/theme/raise-text-contrast.mjs` untuk memperbaiki semuanya sekaligus.',
)
process.exit(1)
