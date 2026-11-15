/**
 * scripts/theme/raise-text-contrast.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * CODEMOD: NAIKKAN SEMUA TEKS YANG TERLALU SAMAR KE TOKEN KANON.
 *
 * Masalah yang diselesaikan
 * ─────────────────────────
 * `app/globals.css` sudah menulis aturannya sendiri sejak lama:
 *
 *     "Opacity 40–60% di atas putih cuma menghasilkan 1,9–2,9:1 dan gagal WCAG
 *      AA. Dua token ini SATU-SATUNYA cara menurunkan hierarki teks:
 *        forest-muted 5,7:1 di canvas · 4,6:1 di sage → body, label, catatan
 *        cream-muted  5,8:1 di forest · 4,7:1 di forest-soft → teks di atas gelap
 *      Opacity hanya untuk dekorasi (ikon, garis, glow), BUKAN untuk teks."
 *
 * Tapi aturan itu tidak pernah ditegakkan: ratusan komponen masih memakai
 * `text-forest/45`, `text-forest/50`, `text-forest/55`, … Akibatnya label kecil,
 * tanggal, keterangan kartu, dan catatan di hampir semua halaman terbaca samar —
 * terutama di layar HP dengan cahaya ruangan.
 *
 * Apa yang diubah
 * ───────────────
 * HANYA utility warna TEKS (`text-*`), termasuk variannya (`hover:`,
 * `focus:`, `group-hover:`, `peer-checked:`, `placeholder:`, `sm:`, `lg:`, …).
 * `bg-*`, `ring-*`, `border-*`, `divide-*`, `fill-*`, `stroke-*` TIDAK disentuh —
 * jadi permukaan, hairline, dan dekorasi tetap persis seperti sebelumnya.
 *
 *   text-forest/25…60  → text-forest-muted   (#5a6a61 · 5,7:1 di putih)
 *   text-forest/65…75  → text-forest-soft    (#52685c · 6,4:1 di putih)
 *   text-forest/80…90  → text-forest         (#45594e · 8,2:1 di putih)
 *   text-cream/25…60   → text-cream-muted    (#dfe4e1 · 5,8:1 di forest)
 *   text-cream/65…90   → text-cream
 *   text-mint/*        → text-mint
 *   text-plum/…        → text-plum-deep      (#534141 · terbaca di permukaan terang)
 *   text-hud-terracotta/* → text-hud-terracotta
 *
 * Opacity di bawah 25% SENGAJA dibiarkan: itu pemisah dekoratif (`/`, `·`,
 * titik status) — bukan teks yang harus dibaca, dan menaikkannya justru membuat
 * garis pemisah terlihat seperti teks.
 *
 * Pakai:
 *   node scripts/theme/raise-text-contrast.mjs --dry   (hanya laporan)
 *   node scripts/theme/raise-text-contrast.mjs         (tulis perubahan)
 * ─────────────────────────────────────────────────────────────────────────────
 */
import fs from 'node:fs'
import path from 'node:path'

const DRY = process.argv.includes('--dry')

/** urutan penting: `hud-terracotta` harus dicoba sebelum pola lain */
const TEXT_COLOR_RE = /\btext-(forest|cream|mint|plum|hud-terracotta)\/(\d{2})\b/g

function replacementFor(color, pctText) {
  const pct = Number(pctText)
  if (!Number.isFinite(pct)) return null

  if (color === 'forest') {
    if (pct < 25) return null
    if (pct <= 60) return 'text-forest-muted'
    if (pct <= 75) return 'text-forest-soft'
    return 'text-forest'
  }
  if (color === 'cream') {
    if (pct < 25) return null
    if (pct <= 60) return 'text-cream-muted'
    return 'text-cream'
  }
  if (color === 'mint') return 'text-mint'
  if (color === 'plum') return 'text-plum-deep'
  if (color === 'hud-terracotta') return 'text-hud-terracotta'
  return null
}

const ROOTS = ['app', 'components', 'lib', 'hooks']
const EXTS = new Set(['.tsx', '.ts'])
const SKIP_DIRS = new Set(['node_modules', '.next', 'docs', 'public', '.git'])

const files = []
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue
      walk(path.join(dir, entry.name))
    } else if (EXTS.has(path.extname(entry.name))) {
      files.push(path.join(dir, entry.name))
    }
  }
}
for (const root of ROOTS) if (fs.existsSync(root)) walk(root)

let touchedFiles = 0
let replacements = 0
const perToken = new Map()

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  let changed = false

  const next = source.replace(TEXT_COLOR_RE, (match, color, pctText) => {
    const replacement = replacementFor(color, pctText)
    if (!replacement || replacement === match) return match
    changed = true
    replacements += 1
    const key = `${match} → ${replacement}`
    perToken.set(key, (perToken.get(key) ?? 0) + 1)
    return replacement
  })

  if (changed) {
    touchedFiles += 1
    if (!DRY) fs.writeFileSync(file, next)
  }
}

console.log(
  `${DRY ? '◇ DRY RUN' : '✓ selesai'} — ${replacements} penggantian di ${touchedFiles} berkas (${files.length} diperiksa).`,
)
for (const [token, count] of [...perToken.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(5)} × ${token}`)
}
