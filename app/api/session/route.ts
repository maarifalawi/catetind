import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { signOutServer } from '@/lib/supabase/server'

/**
 * /api/session — identitas pemanggil & pintu keluar. SATU-SATUNYA endpoint yang
 * boleh dijawab tanpa sesi.
 *
 *   GET    → `{ user }` kalau cookie sesi Supabase sah, `401 { error }` kalau tidak.
 *   DELETE → akhiri sesi: token Supabase dicabut (`signOut`) + cookie dihapus.
 *   POST   → **405**. Dulu endpoint ini membuat sesi demo (cookie tanpa tanda
 *            tangan); sejak paket 45 sesi hanya lahir dari Supabase Auth, dan
 *            menutup jalur lama itu adalah inti perbaikannya — bukan lupa.
 *
 * ⚠️ `requireUser()` membaca cookie TANPA memverifikasi tanda tangan JWT (kunci
 * rahasia project tidak boleh ada di klien). Verifikasi terjadi di PostgREST/Auth
 * pada setiap query yang memakai token itu; lihat catatan panjang di
 * `lib/supabase/session-cookie.ts`. Efeknya di sini: GET boleh menjawab identitas,
 * tapi tidak ada data chat/dana yang bisa dibaca dari endpoint ini.
 */
export async function GET(req: NextRequest) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response
  return NextResponse.json({ user: auth.user })
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  /* `signOutServer()` mencabut token di Auth DAN menghapus cookie sesinya.
     Kalau backendnya belum dikonfigurasi, cookie tetap dibersihkan supaya app
     tidak terjebak "kelihatan masih masuk" tanpa sesi apa pun. */
  await signOutServer()
  return res
}

export async function POST() {
  return NextResponse.json(
    {
      error:
        'Sesi dibuat lewat tautan masuk di /login (magic link/OTP Supabase). Endpoint demo ini sudah ditutup.',
    },
    { status: 405 },
  )
}
