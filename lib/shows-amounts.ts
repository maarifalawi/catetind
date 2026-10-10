/* ── ROUTE YANG MENAMPILKAN NOMINAL (satu sumber, paket 75) ───────────────────
   Tombol "mata" (sensor layar global) cuma berguna di halaman yang MEMANG
   menampilkan angka rupiah — saldo, jatah harian, riwayat, tagihan, aset.
   Di halaman lain (Bantuan, Install, Pengaturan, referral, halaman publik)
   tombol itu cuma jadi ikon tanpa pekerjaan, dan di header mobile ia memakan
   slot yang seharusnya bersih.

   Sebelum paket 75 keputusan ini TIDAK punya satu rumah: tiap halaman menaruh
   `<GlobalPrivacyToggle/>` atau tidak, sesukanya (ada yang di cluster desktop
   saja, ada yang juga di baris mobile, ada yang sama sekali tidak). Begitu
   header mobile jadi GLOBAL (di `ScreenShell`), pertanyaannya jadi satu:
   "route ini menampilkan nominal atau tidak?" — dan jawabannya di sini.

   Aturan pencocokan mengikuti pola yang sama dengan `isPublicRoute` di
   `lib/public-routes.ts`: `pathname === route` ATAU `startsWith(route + '/')`,
   sehingga `/wallet/bca` ikut `/wallet` dan `/budget/goal-1` ikut `/budget`.
   Pengecualiannya `/app`: ia dicocokkan EXACT, karena `/app/onboarding` hidup
   di bawah prefix yang sama tapi TIDAK menampilkan satu nominal pun (layar
   setup 3 langkah, tanpa sidebar/header app).
   ────────────────────────────────────────────────────────────────────────── */

/** halaman app yang benar-benar menampilkan nominal rupiah */
export const AMOUNT_ROUTES = [
  '/app', // Dashboard — saldo, arus uang, jatah harian
  '/wallet', // Dompet & Akun (+ /wallet/[id])
  '/history', // Riwayat & Insight
  '/budget', // Budget & Target Nabung (+ /budget/[id])
  '/bills', // Tagihan Rutin
  '/calendar', // Kalender Cashflow
  '/wealth', // Kekayaan & Hutang
  '/joint', // Joint Wallet
] as const

/** true kalau pathname berada di (atau di bawah) halaman yang menampilkan nominal */
export function showsBalanceToggle(pathname: string): boolean {
  return AMOUNT_ROUTES.some((route) =>
    route === '/app'
      ? pathname === '/app'
      : pathname === route || pathname.startsWith(`${route}/`),
  )
}
