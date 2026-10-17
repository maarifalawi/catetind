import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isPublicRoute } from '@/lib/public-routes'
import { hasSupabaseConfig, supabaseAnonKey, supabaseUrl } from '@/lib/supabase/config'

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
 */
async function hasVerifiedSession(
  request: NextRequest,
): Promise<{ ok: boolean; response: NextResponse }> {
  const response = NextResponse.next({ request })
  if (!hasSupabaseConfig() || !hasSupabaseSessionCookie(request)) {
    return { ok: false, response }
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
    return { ok: !error && Boolean(data.user), response }
  } catch {
    return { ok: false, response }
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
  if (session.ok) return session.response

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
