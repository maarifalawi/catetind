/* ── DAFTAR ROUTE PUBLIK / PRE-APP (satu sumber, dua gerbang) ─────────────────
   Daftar ini dipakai DUA gerbang global yang hidup di root layout:

     • `SubscriptionGateProvider` — jangan mengunci input di halaman yang user
       belum tentu punya langganan (mis. dia sedang MEMBAYAR di /checkout);
     • `AppLockProvider` — jangan menahan user di balik layar kunci PIN di
       halaman yang memang pintu masuk (kalau ditahan, user yang lupa PIN tidak
       punya jalan masuk sama sekali).

   Sebelum paket 39 daftarnya cuma ada di dalam `subscription-gate-provider.tsx`.
   Karena sekarang dipakai dua tempat, isinya dipindah ke file murni ini dan
   yang lama tetap di-export (kompatibilitas pemanggil + nama yang sudah
   menyebar di komentar), supaya tidak pernah ada dua daftar yang beda isi.
   ────────────────────────────────────────────────────────────────────────── */

export const PUBLIC_ROUTES = [
  '/login',
  '/checkout',
  '/privacy',
  '/terms',
  '/join',
  '/share',
  '/install',
  '/app/onboarding',
] as const

/** true kalau pathname berada di (atau di bawah) halaman publik/pre-app */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}
