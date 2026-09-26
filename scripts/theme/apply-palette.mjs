/**
 * scripts/theme/apply-palette.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * CODEMOD MIGRASI WARNA CATETIND  ·  palet lama (Forest/Lime) → "Earth Pastel"
 *
 * Tabel di bawah adalah DOKUMENTASI RESMI pemetaan warna lama → baru. Warna di
 * komponen dikumpulkan menjadi tiga jenis penggantian:
 *   1. HEX  — `#rrggbb` literal di props/className/SVG
 *   2. RGB  — `rgb()/rgba()` literal (kebanyakan bayangan & glow)
 *   3. CLS  — kelas warna bawaan Tailwind (`text-slate-500`, `bg-blue-600`, …)
 *
 * Pakai:
 *   node scripts/theme/apply-palette.mjs --dry-run   # lihat rencana saja
 *   node scripts/theme/apply-palette.mjs             # terapkan
 *
 * REVISI setelah migrasi 1 (dijalankan manual, tapi PALETTE & T di bawah sudah
 * dikoreksi supaya selalu = kondisi nyata di repo):
 *   R1 · dasar putih   : ivory `#fbf6d9` sebagai permukaan → putih `#ffffff`
 *   R2 · surface putih : seluruh permukaan ivory di komponen → putih; hairline
 *                        `ring/border/divide-soil` dinaikkan ke skala 8–16
 *   R3 · soil hitam    : `#503a3a` → `#000000`; soilDeep/soilDeepest → hitam;
 *                        soilMuted → `#767676`; rgba(80,58,58) & rgba(36,26,26)
 *                        → rgba(0, 0, 0)
 * Penjaga palet: `scripts/theme/audit-palette.mjs` → `pnpm theme:audit`.
 *
 * Untuk palet berikutnya: ubah PALETTE + tabel di bawah, lalu jalankan ulang.
 * Cara kembali ke palet lama: docs/theme/PALETTE.md §4.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import fs from 'node:fs'
import path from 'node:path'

/* ═══ LAPIS 1 · PALET KANON (10 warna) ═══════════════════════════════════════ */
const PALETTE = {
  soil: '#000000', // 15% — REVISI: hitam (awalnya #503a3a)
  evergreen: '#45594e', // 15%
  ivory: '#fbf6d9', // 15%
  oat: '#ebe4de', // 15%
  plum: '#b89191', // 7.5%
  olive: '#b5b987', // 7.5%
  thistle: '#91a0b8', // 7.5%
  leaf: '#91bb9e', // 7.5% — palet "Sage"
  cantelope: '#ffb885', // 5%
  daisy: '#ecd768', // 5%
}

/* ═══ LAPIS 3 · NILAI TURUNAN (tint & shade dari warna palet) ════════════════ */
const T = {
  evergreenSoft: '#52685c', // Evergreen dicerahkan
  evergreenLight: '#c4c7af', // Evergreen + Ivory 70%
  evergreenDeep: '#1f2823', // Evergreen ×0.45
  evergreenDeeper: '#161c19', // Evergreen ×0.32
  soilDeep: '#000000', // Soil ×0.45 — hitam sudah paling gelap
  soilDeepest: '#000000', // Soil ×0.32 — idem
  soilMuted: '#767676', // netral: hitam + putih
  leafLight: '#dbe4c7', // Sage + Ivory 70%
  oliveLight: '#e6e4c0', // Olive + Ivory 70%
  oliveDeep: '#51533d', // Olive ×0.45
  thistleLight: '#dbdccf', // Thistle + Ivory 70%
  thistleDeep: '#414853', // Thistle ×0.45
  plumLight: '#e7d8c3', // Plum + Ivory 70%
  plumDeep: '#534141', // Plum ×0.45
  cantelopeLight: '#fbe3c0', // Cantelope + Ivory 70%
  cantelopeMid: '#e8b06a', // Cantelope ↔ Cantelope-deep
  cantelopeDeep: '#73533c', // Cantelope ×0.45
  daisyLight: '#f6edb7', // Daisy + Ivory 70%
  daisyDeep: '#6a612f', // Daisy ×0.45
}

/* ═══ TABEL 1 · HEX  (warna lama → warna baru, case-insensitive) ════════════ */
const HEX = {
  /* — permukaan & netral → Ivory / Oat — */
  '#fffdf7': PALETTE.ivory,
  '#fffdf9': PALETTE.ivory,
  '#ffffff': PALETTE.ivory,
  '#f4f8ef': PALETTE.ivory,
  '#e9f1e0': PALETTE.ivory,
  '#f5f5f0': PALETTE.oat,
  '#e5e7eb': PALETTE.oat,
  '#e3edd8': PALETTE.oat,
  '#e6efdd': PALETTE.oat,
  '#dfead2': PALETTE.oat,
  '#e8f1de': PALETTE.oat,
  '#efe6d6': PALETTE.oat,
  '#f4e3c2': PALETTE.oat,
  /* — hijau mint/sage → Leaf (uang & positif) — */
  '#b7e04b': PALETTE.leaf,
  '#d6ef8e': T.leafLight,
  '#e6f4ea': T.leafLight,
  '#d7efe6': T.leafLight,
  '#a7ded1': T.leafLight,
  '#b5ebe1': T.leafLight,
  '#d3f6ef': T.leafLight,
  '#a9d6bd': PALETTE.leaf,
  '#9fd0b4': PALETTE.leaf,
  '#9fe0d4': PALETTE.leaf,
  '#8fd0c0': PALETTE.leaf,
  '#5fb9a6': PALETTE.leaf,
  '#4f9e6b': PALETTE.leaf,
  '#5cb87f': PALETTE.leaf,
  '#43c08a': PALETTE.leaf,
  '#34d399': PALETTE.leaf,
  '#2dd4bf': PALETTE.leaf,
  '#22d3ee': PALETTE.leaf,
  '#4d8f6b': PALETTE.evergreen,
  '#3f8a5c': PALETTE.evergreen,
  '#2f7d5e': PALETTE.evergreen,
  '#1c6146': PALETTE.evergreen,
  '#059669': PALETTE.evergreen,
  '#0f766e': PALETTE.evergreen,
  '#0d6e63': PALETTE.evergreen,
  '#0891b2': PALETTE.evergreen,
  '#1a4a34': T.evergreenSoft,
  '#1d5238': T.evergreenSoft,
  '#083344': T.evergreenDeep,
  '#04211f': T.evergreenDeep,
  '#04211d': T.evergreenDeep,
  '#06231a': T.evergreenDeep,
  '#0a2a1f': T.evergreenDeep,
  '#08251b': T.evergreenDeep,
  '#071c12': T.evergreenDeep,
  '#03130d': T.evergreenDeeper,
  '#022c22': T.evergreenDeeper,
  '#103a2a': PALETTE.evergreen,
  '#17543c': T.evergreenSoft,
  '#12281f': PALETTE.soil,
  '#0f3d34': PALETTE.soil,
  /* — zaitun / hud-sage (status aman) — */
  '#a3b18a': PALETTE.olive,
  '#7d8b65': PALETTE.olive,
  '#6f8059': PALETTE.olive,
  '#8b9973': PALETTE.olive,
  '#8fa07a': PALETTE.olive,
  '#c2cdac': T.oliveLight,
  '#5f6b4c': PALETTE.soil,
  '#5c6b47': PALETTE.soil,
  '#4c5a3a': PALETTE.soil,
  '#4f5c3c': PALETTE.soil,
  '#3f4a30': PALETTE.soil,
  '#6b7a55': PALETTE.soil,
  '#2f3a22': PALETTE.soil,
  '#2f3d24': PALETTE.soil,
  /* — amber/terracotta → Cantelope & Plum — */
  '#dda15e': PALETTE.cantelope,
  '#a86b32': PALETTE.cantelope,
  '#c97f3e': PALETTE.cantelope,
  '#d08a45': PALETTE.cantelope,
  '#e0b183': PALETTE.cantelope,
  '#e8bd7f': PALETTE.cantelope,
  '#b06a27': PALETTE.cantelope,
  '#d97706': PALETTE.cantelope,
  '#ea580c': PALETTE.cantelope,
  '#fb923c': PALETTE.cantelope,
  '#ffc994': PALETTE.cantelope,
  '#fbbf24': PALETTE.cantelope,
  '#f6e3b6': T.cantelopeLight,
  '#f7e2c8': T.cantelopeLight,
  '#ffd9b8': T.cantelopeLight,
  '#ffe9d4': T.cantelopeLight,
  '#3a1d06': T.cantelopeDeep,
  '#431407': T.cantelopeDeep,
  '#bc6c25': PALETTE.plum,
  '#8a5a1f': PALETTE.plum,
  '#a06a2c': PALETTE.plum,
  '#8f4f18': PALETTE.plum,
  '#8a5a33': PALETTE.plum,
  '#8a5a12': PALETTE.plum,
  '#e07856': PALETTE.plum,
  '#5a3208': PALETTE.soil,
  '#4a2a08': PALETTE.soil,
  '#4a2f10': PALETTE.soil,
  /* — kuning → Daisy — */
  '#f6dd85': PALETTE.daisy,
  '#f4d47c': PALETTE.daisy,
  '#e3b752': PALETTE.daisy,
  '#d4a437': PALETTE.daisy,
  '#fff100': PALETTE.daisy,
  '#fbe9a8': T.daisyLight,
  '#fdf3c9': T.daisyLight,
  '#fef3c7': T.daisyLight,
  '#b98a2e': T.daisyDeep,
  '#451a03': T.daisyDeep,
  /* — ungu → Plum — */
  '#e4d8f8': T.plumLight,
  '#f0e9fc': T.plumLight,
  '#d5c3f3': T.plumLight,
  '#a78bfa': PALETTE.plum,
  '#7c3aed': PALETTE.plum,
  '#2e1065': T.plumDeep,
  /* — biru → Thistle — */
  '#bfe3f7': T.thistleLight,
  '#dcf0fc': T.thistleLight,
  '#a8d5f2': T.thistleLight,
  '#a9d6fb': T.thistleLight,
  '#cbe7fd': T.thistleLight,
  '#93c9f8': T.thistleLight,
  '#3b82f6': PALETTE.thistle,
  '#1d4ed8': PALETTE.thistle,
  '#38bdf8': PALETTE.thistle,
  '#0284c7': PALETTE.thistle,
  '#172554': T.thistleDeep,
  '#082f49': T.thistleDeep,
  '#7c8ba1': PALETTE.thistle,
  /* — rose/merah → Plum — */
  '#fb7185': PALETTE.plum,
  /* — hampir hitam → Soil — */
  '#0d0d0d': T.soilDeepest,
  '#1b1b1b': T.soilDeep,
}

/* ═══ TABEL 2 · RGB/RGBA  (bayangan, glow, scrim) ══════════════════════════ */
const RGB = {
  '16,58,42': '69,89,78', // forest → evergreen
  '16 58 42': '69 89 78', // forest → evergreen (sintaks modern)
  '18,40,31': '80,58,58', // ink → soil
  '9,30,22': '36,26,26', // ink-gelap → soil-deep
  '6,35,26': '36,26,26', // ink-gelap → soil-deep
  '0,0,0': '36,26,26', // hitam → soil-deep (bayangan tetap hangat)
  '183,224,75': '145,187,158', // mint → leaf
  '163,177,138': '181,185,135', // hud-sage → olive
  '221,161,94': '255,184,133', // hud-amber → cantelope
  '188,108,37': '184,145,145', // hud-terracotta → plum
  '217,119,6': '255,184,133', // amber-600 → cantelope
  '202,138,4': '255,184,133', // yellow-600 → cantelope
  '15,118,110': '69,89,78', // teal-700 → evergreen
  '45,110,78': '69,89,78', // hijau sedang → evergreen
  '168,107,50': '255,184,133', // coklat emas → cantelope
  '120,80,10': '115,83,60', // coklat gelap → cantelope-deep
  '37,99,235': '145,160,184', // blue-600 → thistle
  '244,63,94': '184,145,145', // rose-500 → plum
  '244,248,239': '251,246,217', // cream → ivory
  '255,255,255': '251,246,217', // putih → ivory
  '255 255 255': '251 246 217', // putih → ivory (sintaks modern)
  '255,214,231': '231,216,195', // pink → plum-light
  '216,180,254': '231,216,195', // ungu → plum-light
  '180,195,255': '219,220,207', // biru → thistle-light
}

/* ═══ TABEL 3 · KELAS WARNA BAWAAN TAILWIND → TOKEN PALET ═══════════════════
   Diterapkan pada fragmen kelas (aman terhadap prefix varian: `hover:`,
   `md:`, `group-hover:`, …) dan aman terhadap modifier opasitas `/{n}`. */
const CLS = {
  /* — netral (slate/gray/zinc) → soil & oat — */
  'text-slate-300': 'text-ink/25',
  'text-slate-400': 'text-ink/35',
  'text-slate-500': 'text-ink/45',
  'text-slate-600': 'text-ink/55',
  'text-slate-900': 'text-ink',
  'text-slate-950': 'text-ink',
  'text-gray-400': 'text-ink/35',
  'text-gray-500': 'text-ink/45',
  'text-zinc-900': 'text-ink',
  'bg-slate-100': 'bg-oat',
  'bg-slate-200': 'bg-oat',
  'bg-slate-300': 'bg-ink/15',
  'bg-slate-400': 'bg-ink/20',
  'border-slate-200': 'border-oat',
  'ring-slate-300': 'ring-ink/15',
  'ring-slate-400': 'ring-ink/20',
  'from-slate-100': 'from-oat',
  'via-slate-100': 'via-oat',
  'to-slate-200': 'to-oat',
  /* — biru / sky / cyan → Thistle — */
  'text-blue-600': 'text-thistle',
  'text-blue-900': 'text-soil',
  'bg-blue-50': 'bg-thistle/15',
  'bg-blue-100': 'bg-thistle/20',
  'bg-blue-200': 'bg-thistle/25',
  'bg-blue-500': 'bg-thistle',
  'bg-blue-600': 'bg-thistle',
  'from-blue-100': 'from-thistle/20',
  'from-blue-200': 'from-thistle/25',
  'via-blue-100': 'via-thistle/20',
  'via-blue-300': 'via-thistle/35',
  'to-blue-50': 'to-thistle/10',
  'to-blue-200': 'to-thistle/25',
  'to-blue-400': 'to-thistle/45',
  'ring-blue-300': 'ring-thistle/40',
  'ring-blue-500': 'ring-thistle',
  'from-sky-100': 'from-thistle/20',
  'to-sky-200': 'to-thistle/25',
  'bg-sky-200': 'bg-thistle/25',
  'bg-sky-300': 'bg-thistle/30',
  'from-cyan-100': 'from-thistle/20',
  'via-cyan-200': 'via-thistle/25',
  'ring-cyan-300': 'ring-thistle/40',
  'text-cyan-700': 'text-evergreen',
  'bg-cyan-300': 'bg-thistle/30',
  /* — hijau / emerald / teal / lime → Leaf & Olive — */
  'text-green-600': 'text-leaf',
  'bg-green-600': 'bg-leaf',
  'text-emerald-700': 'text-evergreen',
  'from-emerald-100': 'from-olive/25',
  'via-emerald-200': 'via-olive/30',
  'ring-emerald-300': 'ring-leaf/40',
  'bg-teal-50': 'bg-leaf/15',
  'bg-teal-200': 'bg-leaf/25',
  'bg-teal-500': 'bg-leaf',
  'to-teal-200': 'to-leaf/25',
  'text-teal-600': 'text-evergreen',
  'ring-teal-500': 'ring-leaf',
  'bg-lime-300': 'bg-olive/40',
  /* — amber / kuning / oranye → Cantelope & Daisy — */
  'text-amber-600': 'text-cantelope',
  'bg-amber-400': 'bg-cantelope',
  'bg-amber-500': 'bg-cantelope',
  'bg-amber-50': 'bg-cantelope/15',
  'from-amber-100': 'from-cantelope/25',
  'to-amber-50': 'to-cantelope/10',
  'ring-amber-500': 'ring-cantelope',
  'text-yellow-700': 'text-soil',
  'from-yellow-100': 'from-daisy/25',
  'to-yellow-50': 'to-daisy/10',
  'bg-yellow-200': 'bg-daisy/30',
  'bg-orange-200': 'bg-cantelope/25',
  /* — rose / merah / pink → Plum — */
  'bg-rose-50': 'bg-plum/15',
  'bg-rose-100': 'bg-plum/20',
  'bg-rose-400': 'bg-plum',
  'bg-rose-500': 'bg-plum',
  'bg-rose-600': 'bg-plum',
  'text-rose-500': 'text-plum',
  'text-rose-600': 'text-plum',
  'from-rose-100': 'from-plum/20',
  'from-rose-300': 'from-plum/35',
  'to-rose-50': 'to-plum/10',
  'to-rose-400': 'to-plum/45',
  'text-red-500': 'text-plum',
  'text-red-600': 'text-plum',
  'bg-red-500': 'bg-plum',
  /* — ungu / violet / fuchsia → Plum — */
  'text-violet-600': 'text-plum',
  'from-violet-100': 'from-plum/20',
  'via-purple-100': 'via-plum/20',
  'to-fuchsia-200': 'to-plum/30',
  'ring-violet-300': 'ring-plum/40',
  'bg-fuchsia-300': 'bg-plum/30',
  /* — putih & hitam → Ivory & Soil — */
  'bg-white': 'bg-cream',
  'text-white': 'text-cream',
  'ring-white': 'ring-cream',
  'border-white': 'border-cream',
  'from-white': 'from-cream',
  'via-white': 'via-cream',
  'to-white': 'to-cream',
  'fill-white': 'fill-cream',
  'stroke-white': 'stroke-cream',
  'divide-white': 'divide-cream',
  'bg-black': 'bg-soil',
  'text-black': 'text-soil',
  'ring-black': 'ring-soil',
  'border-black': 'border-soil',
  'from-black': 'from-soil',
  'via-black': 'via-soil',
  'to-black': 'to-soil',
  'divide-black': 'divide-soil',
  'fill-black': 'fill-soil',
  'stroke-black': 'stroke-soil',
}

/* ═══ MESIN PENGGANTI ══════════════════════════════════════════════════════ */
const DRY = process.argv.includes('--dry-run')
const ROOTS = ['app', 'components', 'lib', 'hooks', 'scripts']
const EXTS = new Set(['.tsx', '.ts', '.css', '.mjs', '.js'])
/* docs/ dikecualikan: di sana hex LAMA memang sengaja diarsipkan apa adanya */
const SKIP_DIRS = new Set(['node_modules', '.next', 'docs', 'public', '.git'])

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

/** kelas Tailwind bawaan ber-angka: `{prefix}-{family}-{shade}` (+ opsional `/alpha`) */
const numClsRe =
  /(^|[^\w-])((?:bg|text|from|via|to|ring|border|fill|stroke|divide|outline|decoration|caret|accent|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})(\/\[?[0-9.]+\]?)?/g
/** kelas Tailwind putih/hitam: `{prefix}-{white|black}` (+ opsional `/alpha`) */
const monoClsRe =
  /(^|[^\w-])((?:bg|text|from|via|to|ring|border|fill|stroke|divide|outline|decoration|caret|accent|placeholder)-(?:white|black))(\/\[?[0-9.]+\]?)?/g
/** hex 6 digit (bukan 4/8 digit) */
const hexRe = /#([0-9a-fA-F]{6})(?![0-9a-fA-F])/g
/** rgb/rgba dengan pemisah koma: rgb(r, g, b) / rgba(r, g, b, a) */
const rgbCommaRe = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)([^)]*)\)/g
/** rgb modern dengan pemisah spasi: rgb(16 58 42 / 0.18) */
const rgbSpaceRe = /rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)([^)]*)\)/g

const stats = { hex: 0, rgb: 0, cls: 0 }
const perFile = []

for (const file of files) {
  /* jangan sentuh skrip ini sendiri — tabel pemetaannya memang memuat warna lama */
  if (path.basename(file) === 'apply-palette.mjs') continue
  const original = fs.readFileSync(file, 'utf8')
  let out = original
  let nHex = 0
  let nRgb = 0
  let nCls = 0

  out = out.replace(hexRe, (match) => {
    const next = HEX[match.toLowerCase()]
    if (!next) return match
    nHex++
    return next
  })

  out = out.replace(rgbCommaRe, (match, r, g, b, tail) => {
    const next = RGB[`${r},${g},${b}`]
    if (!next) return match
    nRgb++
    return `rgba(${next}${tail})`
  })

  out = out.replace(rgbSpaceRe, (match, r, g, b, tail) => {
    const next = RGB[`${r} ${g} ${b}`]
    if (!next) return match
    nRgb++
    return `rgb(${next}${tail})`
  })

  const applyCls = (match, lead, frag, alpha, table) => {
    const next = table[frag]
    if (!next) return match
    nCls++
    /* kalau pengganti sudah membawa opasitas sendiri, buang suffix `/n` lama */
    const suffix = next.includes('/') ? '' : alpha || ''
    return `${lead}${next}${suffix}`
  }

  out = out.replace(numClsRe, (m, lead, frag, alpha) => applyCls(m, lead, frag, alpha, CLS))
  out = out.replace(monoClsRe, (m, lead, frag, alpha) => applyCls(m, lead, frag, alpha, CLS))

  if (out !== original) {
    if (!DRY) fs.writeFileSync(file, out, 'utf8')
    stats.hex += nHex
    stats.rgb += nRgb
    stats.cls += nCls
    perFile.push({ file, nHex, nRgb, nCls })
  }
}

perFile.sort((a, b) => b.nHex + b.nRgb + b.nCls - (a.nHex + a.nRgb + a.nCls))
console.log(`${DRY ? '[DRY-RUN] ' : ''}file dipindai : ${files.length}`)
console.log(`${DRY ? '[DRY-RUN] ' : ''}file berubah : ${perFile.length}`)
console.log(`${DRY ? '[DRY-RUN] ' : ''}hex ${stats.hex} · rgb ${stats.rgb} · kelas ${stats.cls}`)
for (const p of perFile) {
  console.log(`  ${p.file.replace(/\\/g, '/')}  hex:${p.nHex} rgb:${p.nRgb} cls:${p.nCls}`)
}


