import { NextResponse, type NextRequest } from 'next/server'
import { isPublicRoute } from '@/lib/public-routes'

/* ── GERBANG SESI (PERBAIKAN AUDIT K4) ────────────────────────────────────────
   Sebelum berkas ini ada, TIDAK ADA satu pun proteksi route: `/app`, `/wallet`,
   `/settings`, dst. bisa dibuka siapa saja. Halaman app memang tetap merender
   (data dibaca dari store perangkat), tapi begitu backend nyata dipakai,
   membiarkan halaman uang terbuka adalah kesalahan yang mahal.

   DUA SYARAT AGAR GERBANG INI MENYALA — sengaja konservatif supaya tidak
   mematikan repo DEMO/desain ini:

     1. Supabase HARUS dikonfigurasi (`NEXT_PUBLIC_SUPABASE_URL`). Tanpa itu
        tidak ada sesi yang mungkin dibuat, jadi mengunci user = mengunci
        semuanya tanpa jalan masuk.
     2. `NEXT_PUBLIC_DEMO` BUKAN `1`. Repo ini memakai flag yang sama untuk
        seed data contoh (lihat komentar `DemoSeedGate` di `app/layout.tsx`), jadi
        build demo/review desain tetap bisa dijelajahi seluruh halamannya.

   Sesi diperiksa lewat KEBERADAAN cookie Supabase Auth (`sb-<ref>-auth-token`,
   termasuk varian terpotong `.0`/`.1`). Cookie tidak diverifikasi di sini —
   verifikasi tanda tangan terjadi di server (`/api/session`) dan di database
   (RLS). Middleware ini hanya gerbang cepat supaya halaman app tidak pernah
   dirender untuk pemanggil anonim.

   Tujuan asli dipulihkan lewat `?next=` — `app/login/page.tsx` sudah membacanya
   dan `LoginScreen` mengembalikan user ke sana setelah masuk. */

function hasSupabaseSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token'))
}

export function middleware(request: NextRequest) {
  const demoMode = process.env.NEXT_PUBLIC_DEMO === '1'
  const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
  if (demoMode || !supabaseConfigured) return NextResponse.next()

  const { pathname, search } = request.nextUrl
  if (isPublicRoute(pathname)) return NextResponse.next()
  if (hasSupabaseSessionCookie(request)) return NextResponse.next()

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = '/login'
  loginUrl.search = ''
  loginUrl.searchParams.set('next', `${pathname}${search}`)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  /* `/api` DIKECUALIKAN: webhook Midtrans, `/api/session`, dan route AI harus
     bisa dipanggil tanpa cookie halaman (dan webhook tidak membawa cookie apa
     pun). Aset statis juga dilewati supaya tidak ada permintaan sia-sia. */
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icons|.*\\..*).*)'],
}
