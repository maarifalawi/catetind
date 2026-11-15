/**
 * scripts/tools/remove-decorative-icons.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * SAPU BERSIH IKON HIASAN (keputusan produk, sesi 3).
 *
 * Yang dicabut: ikon lucide yang murni hiasan — kilau AI (`Sparkles`,
 * `Sparkle`), `Crown`, `Trophy`, `Flame`, `Wand2`, `Gem`. Ikon FUNGSIONAL
 * (tutup X, panah, tambah +, tempat sampah, lonceng, ikon menu, cari, salin,
 * bagikan, unduh, pensil, kunci, centang, chevron) TIDAK disentuh.
 *
 * Idempotent: aman dijalankan berkali-kali. Setelah dijalankan, wajib:
 *   npx tsc --noEmit
 * karena pemakaian non-JSX (mis. peta ikon) perlu diperbaiki manual.
 *
 * Pakai: node scripts/tools/remove-decorative-icons.mjs [--dry]
 * ─────────────────────────────────────────────────────────────────────────────
 */
import fs from 'node:fs'
import path from 'node:path'

const DECORATIVE = new Set(['Sparkles', 'Sparkle', 'Crown', 'Trophy', 'Flame', 'Wand2', 'Gem'])
const ROOTS = ['app', 'components']
const DRY = process.argv.includes('--dry')

const files = []
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      walk(full)
      continue
    }
    if (!/\.tsx?$/.test(entry.name)) continue
    if (/\.test\.tsx?$/.test(entry.name)) continue
    files.push(full)
  }
}
for (const root of ROOTS) if (fs.existsSync(root)) walk(root)

const IMPORT_RE = /import\s*\{([\s\S]*?)\}\s*from\s*(['"])lucide-react\2\s*\n?/g
const JSX_RE = new RegExp(`<(${[...DECORATIVE].join('|')})\\b[\\s\\S]*?/>\\s*\\n?`, 'g')

let touched = 0
let removedImports = 0
let removedJsx = 0

for (const file of files) {
  const before = fs.readFileSync(file, 'utf8')
  let after = before

  after = after.replace(IMPORT_RE, (whole, inner, quote) => {
    const names = inner
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    const kept = names.filter((name) => !DECORATIVE.has(name.replace(/^type\s+/, '').split(/\s+as\s+/)[0]))
    if (kept.length === names.length) return whole
    removedImports += names.length - kept.length
    if (kept.length === 0) return ''
    return `import { ${kept.join(', ')} } from ${quote}lucide-react${quote}\n`
  })

  after = after.replace(JSX_RE, () => {
    removedJsx += 1
    return ''
  })

  if (after !== before) {
    touched += 1
    if (!DRY) fs.writeFileSync(file, after)
    console.log(`${DRY ? '·' : '✓'} ${file.replace(/\\/g, '/')}`)
  }
}

console.log(
  `\n${DRY ? 'PRATINJAU' : 'SELESAI'}: ${touched} berkas · ${removedImports} nama impor · ${removedJsx} elemen JSX dicabut.`,
)
