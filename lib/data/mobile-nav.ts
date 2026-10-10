/* ── COPY NAVIGASI MOBILE (paket 75) ─────────────────────────────────────────
   Label a11y untuk navigasi utama bawah (bottom nav) + header mobile global.

   Repo ini menyimpan SETIAP teks user-facing di `lib/data/*` — termasuk yang
   cuma dibaca pembaca layar. Sebelum paket 75 tiga label ini ditulis langsung
   di JSX `components/MobileBottomNav.tsx` ("Navigasi utama", "Catat transaksi",
   "Menu lainnya"); karena file itu disentuh lagi untuk paket ini (nav menyusut +
   FAB brand), kalimatnya sekalian dipindah ke rumahnya supaya tidak ada copy
   kedua di komponen.
   ────────────────────────────────────────────────────────────────────────── */

export const MOBILE_NAV_COPY = {
  /** aria-label elemen <nav> navigasi utama (bottom bar mobile) */
  navAria: 'Navigasi utama',
  /** aria-label FAB (+) yang membuka mesin input transaksi */
  addAria: 'Catat transaksi',
  /** aria-label tombol menu sekunder (laci "Lainnya") */
  moreAria: 'Menu lainnya',
} as const
