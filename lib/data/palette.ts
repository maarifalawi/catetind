/* ── HALAMAN REVIEW DESAIN: PALET KANON "EARTH PASTEL" (/palette) ─────────────
   Satu permukaan untuk MELIHAT seluruh sistem warna — bukan untuk dipakai app.
   Tujuannya: reviewer desain bisa membandingkan hue, porsi, alias, dan makna
   warna tanpa harus membuka `app/globals.css` atau `docs/theme/PALETTE.md`.

   ATURAN YANG SENGAJA DIPATUHI DI FILE INI:

     1. Nilai `hex` di sini adalah STRING UNTUK DITAMPILKAN (label), bukan warna
        yang dipakai komponen. Komponen tetap memakai KELAS token
        (`swatchClass`/`onClass`), jadi tidak ada hex baru yang bocor ke desain.
     2. Semua nilai di bawah PERSIS sama dengan blok `@theme inline` di
        `app/globals.css` dan ada di daftar izin
        `scripts/theme/audit-palette.mjs` — makanya `pnpm theme:audit` tetap
        hijau walau file ini banyak memuat string hex.
     3. Kelas ditulis LITERAL (bukan `bg-${token}`) supaya terbaca scanner
        Tailwind — pola yang sama dengan `lib/typography.ts` & `MONEY_TONE`.

   Sumber kebenaran tetap `app/globals.css` + `docs/theme/PALETTE.md`; file ini
   hanyalah cermin yang bisa dibaca manusia (dan diuji di `palette.test.ts`). */

/** satu warna di grid — kelas token ditulis literal supaya dibaca Tailwind */
export interface PaletteEntry {
  /** nama yang tampil (kanon: "Soil"; token: "ink", "forest-soft", dst.) */
  name: string
  /** hex untuk DITAMPILKAN (label), bukan untuk dipakai di komponen */
  hex: string
  /** peran singkat / cara menurunkannya */
  note: string
  /** kelas latar swatch — literal `bg-<token>` agar Tailwind meng-generate-nya */
  swatchClass: string
  /** kelas teks di ATAS swatch — aturan kontras: aksen terang = `text-ink`,
   *  evergreen/hitam = `text-cream` (lihat docs/theme/AGENT-PROMPT.md) */
  onClass: string
  /** opsional: warna kanon yang diwakili (mis. `ink` → `soil`) */
  alias?: string
}

/** satu kelompok warna (satu lapis arsitektur token) */
export interface PaletteGroup {
  id: string
  title: string
  description: string
  entries: PaletteEntry[]
}

/** satu baris "makna warna" — swatch titik + artinya di sistem */
export interface PaletteMeaning {
  label: string
  hex: string
  /** kelas titik swatch — literal `bg-<token>` */
  dotClass: string
  note: string
}

/** copy halaman (user-facing, TIDAK ditulis di JSX) */
export const PALETTE_PAGE_COPY = {
  eyebrow: 'Review Desain',
  title: 'Palet Warna, Earth Pastel',
  lede: 'Satu sumber kebenaran warna untuk seluruh CatetInd. Sepuluh warna kanon dipakai lewat token, komponen tidak pernah menulis hex sendiri.',
  sourceNote:
    'Sumber: blok @theme inline di app/globals.css · dokumen lengkap di docs/theme/PALETTE.md',
  hint: 'Klik kartu untuk menyalin kodenya',
  countLabel: (count: number) => `${count} warna`,
  copiedToast: (hex: string) => `Kode ${hex} tersalin`,
  copyFailedToast: 'Gagal menyalin, salin manual dulu ya',
  a11yCopy: (name: string, hex: string) => `Salin kode warna ${hex} dari ${name}`,
  meaningTitle: 'Makna warna',
  meaningDesc:
    'Warna punya arti yang mengikat: status jatah harian, arah uang, dan alert. Arti ini tidak boleh ditukar antar-halaman.',
} as const

/* ── ARSITEKTUR 3 LAPIS ──────────────────────────────────────────────────────
   Diringkas dari docs/theme/PALETTE.md §2 supaya pengunjung paham kenapa ada
   tiga grid di bawah, bukan satu daftar panjang. */
export const PALETTE_LAYERS: { step: string; title: string; body: string }[] = [
  {
    step: 'Lapis 1',
    title: 'Palet kanon',
    body: 'Sepuluh warna dasar "Earth Pastel", sumber hue seluruh sistem.',
  },
  {
    step: 'Lapis 2',
    title: 'Alias semantik',
    body: 'Nama yang dipakai komponen (ink, forest, mint, hud-…). Semuanya menunjuk balik ke Lapis 1.',
  },
  {
    step: 'Lapis 3',
    title: 'Nilai turunan',
    body: 'Tint & shade yang dihitung dari palet, hanya untuk gradien, bayangan, dan shade kartu.',
  },
]

/* ── GRID 1 · PALET KANON (10 warna) ──────────────────────────────────────── */
const CANON: PaletteEntry[] = [
  {
    name: 'Soil',
    hex: '#000000',
    note: 'Garis, scrim, & permukaan (bg-ink). Bukan teks di latar terang.',
    swatchClass: 'bg-soil',
    onClass: 'text-cream',
  },
  {
    name: 'Evergreen',
    hex: '#45594e',
    note: 'Permukaan brand gelap + warna teks di latar terang (forest).',
    swatchClass: 'bg-evergreen',
    onClass: 'text-cream',
  },
  {
    name: 'Ivory',
    hex: '#fbf6d9',
    note: 'Aksen hangat opsional, sudah pensiun sebagai permukaan.',
    swatchClass: 'bg-ivory',
    onClass: 'text-ink',
  },
  {
    name: 'Oat',
    hex: '#ebe4de',
    note: 'Elemen kecil: chip/pill, lingkaran ikon, hover, kotak info (sage).',
    swatchClass: 'bg-oat',
    onClass: 'text-ink',
  },
  {
    name: 'Plum',
    hex: '#b89191',
    note: 'Alert & "lewat batas" (hud-terracotta).',
    swatchClass: 'bg-plum',
    onClass: 'text-ink',
  },
  {
    name: 'Olive',
    hex: '#b5b987',
    note: 'Status "aman / on-track" (hud-sage).',
    swatchClass: 'bg-olive',
    onClass: 'text-ink',
  },
  {
    name: 'Thistle',
    hex: '#91a0b8',
    note: 'Info & kategori netral (mis. transport).',
    swatchClass: 'bg-thistle',
    onClass: 'text-ink',
  },
  {
    /* `leaf` = palet "Sage" (#91bb9e). Dinamai leaf karena token `--color-sage`
       sudah dipakai sebagai PERMUKAAN PUCAT (kini = Oat). Jadi `sage` ≠ Sage. */
    name: 'Sage',
    hex: '#91bb9e',
    note: 'Uang masuk, positif, progres (token leaf / mint).',
    swatchClass: 'bg-leaf',
    onClass: 'text-ink',
  },
  {
    name: 'Cantelope',
    hex: '#ffb885',
    note: 'Pengeluaran & "mendekati batas" (hud-amber).',
    swatchClass: 'bg-cantelope',
    onClass: 'text-ink',
  },
  {
    name: 'Daisy',
    hex: '#ecd768',
    note: 'Pop terang: brand, highlight, badge (brand).',
    swatchClass: 'bg-daisy',
    onClass: 'text-ink',
  },
]

/* ── GRID 2 · ALIAS SEMANTIK (nama yang dipakai komponen) ─────────────────── */
const ALIASES: PaletteEntry[] = [
  {
    name: 'ink',
    hex: '#000000',
    alias: 'soil',
    note: 'Garis, ring, & scrim overlay, BUKAN teks di latar terang.',
    swatchClass: 'bg-ink',
    onClass: 'text-cream',
  },
  {
    name: 'forest',
    hex: '#45594e',
    alias: 'evergreen',
    note: 'Permukaan gelap & TEKS utama di latar terang.',
    swatchClass: 'bg-forest',
    onClass: 'text-cream',
  },
  {
    name: 'forest-soft',
    hex: '#52685c',
    alias: 'evergreen (dicerahkan)',
    note: 'Stop gradien hero & muka kartu dompet.',
    swatchClass: 'bg-forest-soft',
    onClass: 'text-cream',
  },
  {
    name: 'brand',
    hex: '#ecd768',
    alias: 'daisy',
    note: 'Pop brand & highlight.',
    swatchClass: 'bg-brand',
    onClass: 'text-ink',
  },
  {
    name: 'mint',
    hex: '#91bb9e',
    alias: 'leaf',
    note: 'Uang masuk & progres.',
    swatchClass: 'bg-mint',
    onClass: 'text-ink',
  },
  {
    name: 'mint-soft',
    hex: '#dbe4c7',
    alias: 'leaf (tint)',
    note: 'Latar lembut bernuansa mint.',
    swatchClass: 'bg-mint-soft',
    onClass: 'text-ink',
  },
  {
    name: 'sage',
    hex: '#ebe4de',
    alias: 'oat',
    note: 'Permukaan pucat untuk elemen kecil.',
    swatchClass: 'bg-sage',
    onClass: 'text-ink',
  },
  {
    name: 'cream',
    hex: '#ffffff',
    alias: 'canvas',
    note: 'Dasar putih: latar halaman & permukaan kartu.',
    swatchClass: 'bg-cream',
    onClass: 'text-ink',
  },
  {
    name: 'hud-sage',
    hex: '#b5b987',
    alias: 'olive',
    note: 'Status aman / on-track (Daily HUD).',
    swatchClass: 'bg-hud-sage',
    onClass: 'text-ink',
  },
  {
    name: 'hud-amber',
    hex: '#ffb885',
    alias: 'cantelope',
    note: 'Mendekati batas / hati-hati.',
    swatchClass: 'bg-hud-amber',
    onClass: 'text-ink',
  },
  {
    name: 'hud-terracotta',
    hex: '#b89191',
    alias: 'plum',
    note: 'Lewat batas / alert (sengaja bukan merah).',
    swatchClass: 'bg-hud-terracotta',
    onClass: 'text-ink',
  },
]

/* ── GRID 3 · NILAI TURUNAN (tint & shade dari palet) ─────────────────────── */
const DERIVED: PaletteEntry[] = [
  {
    name: 'evergreen-light',
    hex: '#c4c7af',
    note: 'Evergreen + Ivory 70%',
    swatchClass: 'bg-evergreen-light',
    onClass: 'text-ink',
  },
  {
    name: 'evergreen-deep',
    hex: '#1f2823',
    note: 'Evergreen ×0.45',
    swatchClass: 'bg-evergreen-deep',
    onClass: 'text-cream',
  },
  {
    name: 'evergreen-deeper',
    hex: '#161c19',
    note: 'Evergreen ×0.32, shade tergelap kartu',
    swatchClass: 'bg-evergreen-deeper',
    onClass: 'text-cream',
  },
  {
    name: 'olive-light',
    hex: '#e6e4c0',
    note: 'Olive + Ivory 70%',
    swatchClass: 'bg-olive-light',
    onClass: 'text-ink',
  },
  {
    name: 'olive-deep',
    hex: '#51533d',
    note: 'Olive ×0.45',
    swatchClass: 'bg-olive-deep',
    onClass: 'text-cream',
  },
  {
    name: 'thistle-light',
    hex: '#dbdccf',
    note: 'Thistle + Ivory 70%',
    swatchClass: 'bg-thistle-light',
    onClass: 'text-ink',
  },
  {
    name: 'thistle-deep',
    hex: '#414853',
    note: 'Thistle ×0.45',
    swatchClass: 'bg-thistle-deep',
    onClass: 'text-cream',
  },
  {
    name: 'plum-light',
    hex: '#e7d8c3',
    note: 'Plum + Ivory 70%',
    swatchClass: 'bg-plum-light',
    onClass: 'text-ink',
  },
  {
    name: 'plum-deep',
    hex: '#534141',
    note: 'Plum ×0.45',
    swatchClass: 'bg-plum-deep',
    onClass: 'text-cream',
  },
  {
    name: 'cantelope-light',
    hex: '#fbe3c0',
    note: 'Cantelope + Ivory 70%',
    swatchClass: 'bg-cantelope-light',
    onClass: 'text-ink',
  },
  {
    name: 'cantelope-mid',
    hex: '#e8b06a',
    note: 'Cantelope ↔ cantelope-deep',
    swatchClass: 'bg-cantelope-mid',
    onClass: 'text-ink',
  },
  {
    name: 'cantelope-deep',
    hex: '#73533c',
    note: 'Cantelope ×0.45',
    swatchClass: 'bg-cantelope-deep',
    onClass: 'text-cream',
  },
  {
    name: 'daisy-light',
    hex: '#f6edb7',
    note: 'Daisy + Ivory 70%',
    swatchClass: 'bg-daisy-light',
    onClass: 'text-ink',
  },
  {
    name: 'daisy-deep',
    hex: '#6a612f',
    note: 'Daisy ×0.45',
    swatchClass: 'bg-daisy-deep',
    onClass: 'text-cream',
  },
]


/* ── GRID 4 · NETRAL TEKNIS ────────────────────────────────────────────────
   Satu-satunya warna di luar 10 warna palet: dasar putih. Karena kartu juga
   putih, batas antar-permukaan dibawa hairline `ring-soil` + shadow lembut. */
const NEUTRAL: PaletteEntry[] = [
  {
    name: 'canvas',
    hex: '#ffffff',
    alias: 'putih',
    note: 'Dasar halaman & permukaan kartu (alias `cream`).',
    swatchClass: 'bg-canvas',
    onClass: 'text-ink',
  },
]

/* ── GRID 5 · SLOT GRAFIK (shadcn/ui chart-1..5) ─────────────────────────────
   Slot warna chart bawaan shadcn yang dipetakan ke palet kanon, jadi grafik
   Recharts (mis. donut Rekap Mingguan) tidak pernah memakai warna di luar palet. */
const CHART: PaletteEntry[] = [
  {
    name: 'chart-1',
    hex: '#b5b987',
    alias: 'olive',
    note: 'Slot grafik 1.',
    swatchClass: 'bg-chart-1',
    onClass: 'text-ink',
  },
  {
    name: 'chart-2',
    hex: '#91bb9e',
    alias: 'leaf',
    note: 'Slot grafik 2.',
    swatchClass: 'bg-chart-2',
    onClass: 'text-ink',
  },
  {
    name: 'chart-3',
    hex: '#91a0b8',
    alias: 'thistle',
    note: 'Slot grafik 3.',
    swatchClass: 'bg-chart-3',
    onClass: 'text-ink',
  },
  {
    name: 'chart-4',
    hex: '#b89191',
    alias: 'plum',
    note: 'Slot grafik 4.',
    swatchClass: 'bg-chart-4',
    onClass: 'text-ink',
  },
  {
    name: 'chart-5',
    hex: '#ffb885',
    alias: 'cantelope',
    note: 'Slot grafik 5.',
    swatchClass: 'bg-chart-5',
    onClass: 'text-ink',
  },
]

/** urutan grid di halaman: kanon → alias → turunan → netral → grafik */
export const PALETTE_GROUPS: PaletteGroup[] = [
  {
    id: 'kanon',
    title: 'Lapis 1 · Palet kanon',
    description:
      'Sepuluh warna dasar. Hue-nya tidak pernah berubah; komponen memakainya lewat token.',
    entries: CANON,
  },
  {
    id: 'alias',
    title: 'Lapis 2 · Alias semantik',
    description:
      'Nama yang benar-benar dipakai komponen. Semuanya menunjuk balik ke palet kanon.',
    entries: ALIASES,
  },
  {
    id: 'turunan',
    title: 'Lapis 3 · Nilai turunan',
    description:
      'Tint & shade yang dihitung dari palet, hanya untuk gradien, bayangan, dan shade kartu.',
    entries: DERIVED,
  },
  {
    id: 'netral',
    title: 'Netral teknis',
    description: 'Di luar 10 warna palet, khusus permukaan dasar putih.',
    entries: NEUTRAL,
  },
  {
    id: 'grafik',
    title: 'Slot grafik',
    description:
      'Token chart shadcn/ui yang dipetakan ke palet kanon untuk grafik Recharts.',
    entries: CHART,
  },
]

/* ── MAKNA WARNA (status & uang) ─────────────────────────────────────────────
   Kanon PRD Domain 2B.2: warna status TIDAK memakai merah. Arti warna ini
   mengikat lintas halaman — jangan ditukar antar-permukaan. */
export const PALETTE_MEANINGS: PaletteMeaning[] = [
  {
    label: 'Aman / on-track',
    hex: '#b5b987',
    dotClass: 'bg-hud-sage',
    note: 'Jatah harian masih di dalam batas (olive).',
  },
  {
    label: 'Mendekati batas',
    hex: '#ffb885',
    dotClass: 'bg-hud-amber',
    note: 'Peringatan lembut, belum melewati jatah (cantelope).',
  },
  {
    label: 'Lewat batas',
    hex: '#b89191',
    dotClass: 'bg-hud-terracotta',
    note: 'Alert, sengaja BUKAN merah (plum).',
  },
  {
    label: 'Uang masuk',
    hex: '#91bb9e',
    dotClass: 'bg-mint',
    note: 'Nominal positif & progres nabung (leaf).',
  },
  {
    label: 'Uang keluar',
    hex: '#b89191',
    dotClass: 'bg-hud-terracotta',
    note: 'Nominal pengeluaran (plum).',
  },
  {
    label: 'Pindah dana',
    hex: '#000000',
    dotClass: 'bg-ink/30',
    note: 'Netral: tinta redup + glyph ⇄, tanpa warna uang.',
  },
]

