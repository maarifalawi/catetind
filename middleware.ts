import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isPublicRoute } from '@/lib/public-routes'
import {
  PAYWALL_PATH,
  appAccessDecision,
  readCallerAccess,
  requiresPaidAccess,
} from '@/lib/subscription/app-access'
import { hasSupabaseConfig, supabaseAnonKey, supabaseUrl } from '@/lib/supabase/config'
import { readSupabaseSession } from '@/lib/supabase/session-cookie'

/* ── GERBANG SESI (PERBAIKAN AUDIT K4 + ATURAN AKSES /app) ───────────────────
   ATURAN PRODUK YANG MENGIKAT: TIDAK ADA satu pun halaman app (`/app`,
   `/wallet`, `/budget`, `/settings`, dst.) yang boleh dirender untuk pemanggil
   anonim. Satu-satunya pintu masuk adalah `/login`.

   Sebelum revisi ini, middleware punya DUA jalan pintas:
     • `NEXT_PUBLIC_DEMO=1`  → seluruh gerbang dilewati;
     • Supabase belum diisi  → seluruh gerbang dilewati.
   Jalan pintas pertama membuat siapa pun yang membuka `localhost:3000/app`
   (atau menekan tautan apa pun yang mengarah ke sana) langsung masuk Dashboard
   tanpa login — persis pelanggaran yang dilaporkan. Karena itu keduanya
   DIHAPUS: gerbang sekarang hanya mengenal dua keadaan, publik atau sesi.

   Sesi TIDAK CUKUP diperiksa dari keberadaan cookie: cookie bernama
   `sb-<ref>-auth-token` bisa ditempel siapa saja lewat DevTools, dan di build
   demo app tetap merender data lokal — itu jalan masuk tanpa login. Karena itu
   middleware memanggil `supabase.auth.getUser()` (memverifikasi token ke Auth
   server). Cookie yang dipalsukan = tidak ada user = tetap ditolak.

   Tujuan asli dipulihkan lewat `?next=` — `app/login/page.tsx` sudah membacanya
   dan `LoginScreen` mengembalikan user ke sana setelah masuk. */

/* ── GERBANG PAKET (ATURAN: YANG BISA MASUK APP CUMA YANG BAYAR) ─────────────
   Sesi sah saja TIDAK cukup. Setelah user terverifikasi, middleware membaca
   `user_subscriptions` dengan token user itu sendiri:

     · paket aktif (lifetime / masa aktif belum lewat) → lanjut;
     · belum punya paket / kedaluwarsa              → REDIRECT ke `/checkout`
       (halaman harga). Halaman app tidak dirender sama sekali — jadi tidak ada
       Dashboard yang sempat berkedip lalu ditutup popup;
     · backend mati / belum dikonfigurasi           → lanjut, karena "tidak tahu"
       tidak boleh diperlakukan sebagai "belum bayar" (pelanggan sah tidak
       kehilangan akses gara-gara satu request gagal).

   Rute publik (`/`, `/login`, `/checkout`, `/bantuan`, …) tidak pernah melewati
   pemeriksaan ini: daftarnya satu, yaitu `PUBLIC_ROUTES` yang juga dipakai
   gerbang sesi di atas. */

function hasSupabaseSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token'))
}

/**
 * Verifikasi sesi ke Supabase Auth.
 *
 * `response` dikembalikan bersama hasil supaya token yang di-refresh oleh
 * `@supabase/ssr` ikut ditulis ke browser pada request yang sah (pola resmi
 * Supabase middleware). Tanpa cookie, fungsi ini tidak menghubungi jaringan.
 *
 * `accessToken` ikut dikembalikan karena pemeriksaan paket SETELAH ini harus
 * memakai token MILIK USER (RLS), bukan kunci server.
 */
async function hasVerifiedSession(
  request: NextRequest,
): Promise<{ ok: boolean; response: NextResponse; accessToken: string }> {
  const response = NextResponse.next({ request })
  if (!hasSupabaseConfig() || !hasSupabaseSessionCookie(request)) {
    return { ok: false, response, accessToken: '' }
  }

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    auth: { flowType: 'pkce' },
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  try {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return { ok: false, response, accessToken: '' }
    /* getUser() di atas sudah memverifikasi token ke Auth DAN bisa me-refresh
       sesi yang hampir habis. `getSession()` di sini hanya membaca sesi hasil
       verifikasi itu (bukan sumber izin), supaya pemeriksaan paket memakai
       token yang BARU — bukan token lama yang mungkin sudah ditolak PostgREST. */
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken =
      sessionData.session?.access_token ||
      readSupabaseSession(request.headers.get('cookie'))?.accessToken ||
      ''
    return { ok: true, response, accessToken }
  } catch {
    return { ok: false, response, accessToken: '' }
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  /* Rute legacy `/preview-landing` adalah REDIRECT 301, bukan halaman app.
     Gerbang sesi harus melewatkannya supaya pengunjung anonim menerima 301
     ke `/`, bukan 307 ke `/login?next=…`. Tidak dimasukkan ke
     `PUBLIC_ROUTES` karena ia bukan halaman — hanya redirect. */
  if (pathname === '/preview-landing') return NextResponse.next()
  if (isPublicRoute(pathname)) return NextResponse.next()

  const session = await hasVerifiedSession(request)
  if (!session.ok) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    loginUrl.searchParams.set('next', `${pathname}${search}`)
    return NextResponse.redirect(loginUrl)
  }

  /* ── GERBANG PAKET: sesi sah ≠ boleh masuk app ────────────────────────────
     `requiresPaidAccess()` memakai daftar rute publik yang SAMA dengan gerbang
     sesi, jadi semua halaman app (termasuk `/app/onboarding`) ada di balik
     gerbang ini. `unknown` (backend tidak terjangkau) sengaja diloloskan —
     lihat catatan di `lib/subscription/app-access.ts`. */
  if (requiresPaidAccess(pathname) && session.accessToken) {
    const access = await readCallerAccess(session.accessToken)
    if (appAccessDecision(access) === 'paywall') {
      const paywallUrl = request.nextUrl.clone()
      paywallUrl.pathname = PAYWALL_PATH
      /* Jangan bawa query halaman app (`?topik=…`) ke halaman harga — checkout
         punya query-nya sendiri (`plan`, `kode`). */
      paywallUrl.search = ''
      /* `lanjut` = halaman app yang tadi dituju. /checkout memakainya untuk
         MENCOCOKKAN pembayaran yang belum tercatat (paket 99): kalau webhook
         telat tetapi Midtrans sudah bilang lunas, user dikembalikan ke halaman
         ini — bukan disuruh memilih paket & membayar lagi. */
      paywallUrl.searchParams.set('lanjut', `${pathname}${search}`)
      return NextResponse.redirect(paywallUrl)
    }
  }

  return session.response
}

export const config = {
  /* `/api` DIKECUALIKAN: webhook Midtrans, `/api/session`, dan route AI harus
     bisa dipanggil tanpa cookie halaman (dan webhook tidak membawa cookie apa
     pun). Aset statis juga dilewati supaya tidak ada permintaan sia-sia. */
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icons|.*\\..*).*)'],
}
