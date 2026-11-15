/**
 * scripts/tools/audit-copy.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Audit "operasi sapu bersih teks" untuk 54 butir keputusan produk.
 *
 * Menyisir app/, components/, lib/ (berkas .ts/.tsx, kecuali .test.) dan
 * mencari setiap kalimat terlarang. Keluar dengan kode 1 kalau masih ada.
 *
 * Pakai:  node scripts/tools/audit-copy.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOTS = ['app', 'components', 'lib']
const SKIP_FILES = new Set(['forbidden-copy.ts'])

/** daftar dibaca dari sumber TypeScript supaya tidak ada dua salinan daftar */
const listFile = fs.readFileSync('lib/data/forbidden-copy.ts', 'utf8')
const FORBIDDEN = [...listFile.matchAll(/^\s*'((?:[^'\\]|\\.)*)',\s*$/gm)].map((m) =>
  m[1].replace(/\\'/g, "'"),
)

if (FORBIDDEN.length < 50) {
  console.error(`✗ gagal membaca daftar teks terlarang (${FORBIDDEN.length} butir)`)
  process.exit(1)
}

const files = []
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue
      walk(full)
      continue
    }
    if (!/\.(ts|tsx)$/.test(e.name)) continue
    if (/\.test\.(ts|tsx)$/.test(e.name)) continue
    if (SKIP_FILES.has(e.name)) continue
    files.push(full)
  }
}
for (const r of ROOTS) if (fs.existsSync(r)) walk(r)

const hits = []
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8')
  const lines = text.split(/\r?\n/)
  lines.forEach((line, i) => {
    for (const phrase of FORBIDDEN) {
      if (line.includes(phrase)) hits.push({ file, line: i + 1, phrase })
    }
  })
}

if (hits.length === 0) {
  console.log(`✓ teks bersih — ${files.length} berkas diperiksa, ${FORBIDDEN.length} kalimat terlarang: 0 kemunculan.`)
  process.exit(0)
}
console.log(`✗ ${hits.length} kemunculan teks terlarang di ${files.length} berkas:\n`)
for (const h of hits) console.log(`  ${h.file.replace(/\\/g, '/')}:${h.line}  «${h.phrase}»`)
process.exit(1)
