/* ── KELAS WARNA KARTU DOMPET: BARIS LAMA (HEX) → TOKEN PALET ────────────────
   Muka kartu dompet disimpan di DATABASE (`wallets.face` / `.color` /
   `.face_class` / `.band_class`), bukan ditulis di komponen. Tailwind hanya
   meng-generate kelas yang teksnya muncul UTUH di source code — kelas yang
   datang dari data saat runtime tidak pernah ikut dipindai.

   Akibatnya nyata (temuan 13 Okt 2026): baris dompet yang dibuat SEBELUM paket
   tokenisasi palet (`scripts/theme/tokenize-literal-colors.mjs`) masih memuat
   kelas warna arbitrer seperti `from-[#52685c]`. Kelas itu dulu hidup karena
   literalnya masih ada di source; begitu source berganti jadi `from-forest-soft`,
   kelas lamanya HILANG dari CSS — dan kartu dompet kehilangan gradiennya
   sepenuhnya. Yang dilihat user: kartu jadi terang/transparan (tinggal lapisan
   kacanya) dengan nominal putih yang nyaris tak terbaca.

   File ini menambal di LAPIS DATA: kelas lama dipetakan kembali ke token kanon
   memakai tabel yang SAMA dengan codemod tokenisasi, lalu pemanggil
   (`toWalletAccount` / `toHomeWallet` di `lib/wallets.ts`) memakai resep kanon
   kalau hasilnya tetap tidak bisa dirender. Jadi satu baris lama pun tidak bisa
   lagi melahirkan kartu tanpa warna — tanpa perlu menunggu migrasi data.

   Pemetaannya sengaja TIDAK diambil dari `lib/data/palette.ts`: file itu
   permukaan review desain (dibaca manusia), bukan lookup runtime — lihat
   catatan di kepala file itu.
   ────────────────────────────────────────────────────────────────────────── */

/**
 * hex lama → nama token palet.
 *
 * CERMIN dari tabel `HEX_TO_TOKEN` di `scripts/theme/tokenize-literal-colors.mjs`
 * (sumber kebenaran untuk tokenisasi source) supaya nilai yang ditulis ulang di
 * sini identik dengan yang dihasilkan codemod — bukan pilihan token kedua.
 * Kuncinya tetap memakai `#` supaya bisa dibandingkan baris-per-baris dengan
 * tabel itu; semua hex di bawah ada di daftar izin
 * `scripts/theme/audit-palette.mjs`.
 */
const LEGACY_HEX_TO_TOKEN: Record<string, string> = {
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

/** sufiks kelas warna arbitrer: `-[#rrggbb]` (sama dengan pola codemod) */
const LEGACY_COLOR_CLASS_RE = /-\[#([0-9a-fA-F]{6})\]/g

/** kelas warna arbitrer apa pun — termasuk yang patokannya bukan 6 digit */
const ANY_ARBITRARY_COLOR_RE = /-\[#[0-9a-fA-F]{3,8}\]/

/**
 * Kelas warna arbitrer `[#rrggbb]` → token palet, bila hex-nya dikenal.
 *
 * Hex di luar tabel dibiarkan apa adanya: bukan tugas file ini mengarang token
 * baru, dan pemanggil menolaknya lewat `usableCardColor()` — lebih baik jatuh
 * ke resep kanon daripada mencetak kelas yang tak pernah digenerate Tailwind.
 */
export function tokenizeCardClasses(value: string): string {
  if (!value) return ''
  return value.replace(LEGACY_COLOR_CLASS_RE, (match, hex: string) => {
    const token = LEGACY_HEX_TO_TOKEN[`#${hex.toLowerCase()}`]
    return token ? `-${token}` : match
  })
}

/** true = kelas masih memuat warna arbitrer yang tak mungkin digenerate Tailwind */
export function hasUnrenderableCardColor(value: string): boolean {
  return ANY_ARBITRARY_COLOR_RE.test(value)
}

/**
 * true = kelas ini aman dipakai sebagai warna muka/halo kartu.
 *
 * Kosong (kolom belum pernah terisi) dan warna arbitrer yang tak digenerate
 * sama-sama "tidak bisa dipakai" — warna arbitrer menghasilkan
 * `linear-gradient()` tanpa stop, yaitu kartu transparan yang persis jadi
 * keluhan user.
 */
export function usableCardColor(value: string): boolean {
  return value !== '' && !hasUnrenderableCardColor(value)
}
