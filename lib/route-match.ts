/* ── PENCOCOKAN RUTE BERBASIS BATAS SEGMEN (satu aturan) ─────────────────────
   `pathname.startsWith(route)` MENTAH aman untuk `/wallet`, tetapi salah untuk
   rute yang berbagi awalan kata. Bug nyata yang dilaporkan pemilik produk:

     `/joint` (Joint Wallet) ikut cocok dengan `/join` (halaman undangan publik)
     → `/joint` dianggap "halaman fokus" → bottom nav + FAB-nya disembunyikan,
     sehingga halaman Dompet Bersama hanya menyisakan satu tombol `+`.

   Aturan kanon (sama dengan `isPublicRoute` di `lib/public-routes.ts`):
     · `/`     → EXACT. Kalau memakai awalan, SEMUA route ikut cocok dengan `/`;
     · lainnya → `pathname === route` ATAU `pathname.startsWith(route + '/')`,
                 jadi `/wallet/bca` ikut `/wallet`, tetapi `/joint` TIDAK ikut
                 `/join` dan `/bantuanku` tidak ikut `/bantuan`.

   Semua daftar rute (nav fokus, rute publik, rute nominal) memakai fungsi ini
   supaya tidak ada lagi dua aturan pencocokan yang berbeda cerita.
   ────────────────────────────────────────────────────────────────────────── */

/** true kalau `pathname` berada di `route` atau di bawahnya (batas segmen) */
export function matchesRoute(pathname: string, route: string): boolean {
  if (route === '/') return pathname === '/'
  return pathname === route || pathname.startsWith(`${route}/`)
}

/** true kalau `pathname` cocok dengan SALAH SATU route di daftar */
export function matchesAnyRoute(pathname: string, routes: readonly string[]): boolean {
  return routes.some((route) => matchesRoute(pathname, route))
}
