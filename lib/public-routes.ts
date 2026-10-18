/* ── DAFTAR ROUTE PUBLIK / PRE-APP (satu sumber, tiga gerbang) ────────────────
   Daftar ini dipakai TIGA gerbang global:

     • `middleware.ts` — gerbang SESI: semua route di luar daftar ini wajib
       punya sesi Supabase yang sudah diverifikasi (`/app`, `/wallet`, dst.);
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
  /* Landing page publik di ROOT — pengunjungnya belum tentu punya akun, jadi
     kedua gerbang global (langganan & kunci PIN) harus dilewati di sini.
     Pencocokan `/` sengaja EXACT: matcher di `isPublicRoute` memakai
     `=== route || startsWith(route + '/')`, jadi `/` tidak ikut menyerap `/app`,
     `/wallet`, dst. */
  '/',
  /* Halaman "Terima kasih" setelah registrasi dari landing — user baru saja
     mendaftar, ia belum bisa login/berlangganan, jadi gerbang pun dilewati. */
  '/registered',
  /* Halaman kontak (Milestone C) — form membuka WhatsApp/email, bukan alur
     bayar. Pengunjungnya belum tentu punya akun, jadi gerbang sesi/PIN
     dilewati. */
  '/contact',
  /* Changelog publik — riwayat rilis produk, dibaca sebelum orang punya akun. */
  '/changelog',
  '/welcome',
  '/login',
  '/checkout',
  '/privacy',
  '/terms',
  '/security',
  '/join',
  '/share',
] as const

/* `/install` SENGAJA TIDAK ada di daftar ini walau bisa dibuka tanpa akun.
   Panduan install adalah halaman APP: ia terdaftar di `NAV_GROUPS`
   (`lib/navigation.ts`) dan tampil di sidebar/bottom-nav — sama seperti
   `/help` yang juga tidak publik. Sebelumnya ia ada di sini SEMENTARA
   navigasi app-nya tetap tampil: dua aturan berbeda untuk satu halaman. */

/** true kalau pathname berada di (atau di bawah) halaman publik/pre-app */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

/* ── RUTE YANG DIKECUALIKAN DARI GERBANG PROVIDER (bukan dari gerbang sesi) ──
   `/app/onboarding` WAJIB login (jadi TIDAK ada di `PUBLIC_ROUTES`), tapi ia
   juga tidak boleh dikunci oleh gerbang langganan/PIN: ini langkah pertama
   setelah akun dibuat, sebelum user sempat memilih paket. Dulu pengecualian ini
   menumpang di `PUBLIC_ROUTES`; sekarang dipisah supaya gerbang SESI di
   middleware bisa tegas tanpa memenjarakan user baru di layar onboarding. */
export const PROVIDER_EXEMPT_ROUTES = [...PUBLIC_ROUTES, '/app/onboarding'] as const

/** true kalau pathname bebas dari gerbang langganan & kunci PIN */
export function isProviderExemptRoute(pathname: string): boolean {
  return PROVIDER_EXEMPT_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
}
