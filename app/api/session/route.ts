import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { adminSupabase } from '@/lib/supabase/admin'
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

  /* Nama & foto dibaca dari `profiles`, BUKAN hanya dari metadata di cookie:
     metadata di JWT bisa basi (nama diganti di perangkat lain, atau diganti
     lewat `/api/profile` yang menulis server-side). Cookie tetap kecil karena
     foto profil TIDAK pernah disimpan di sini — lihat `app/api/profile`. */
  let name = auth.user.name
  let avatarUrl: string | null = null
  const client = adminSupabase()
  if (client) {
    try {
      const { data } = await client
        .from('profiles')
        .select('nickname,avatar_url')
        .eq('user_id', auth.user.id)
        .maybeSingle()
      if (data && typeof data.nickname === 'string' && data.nickname.trim()) {
        name = data.nickname.trim()
      }
      avatarUrl = typeof data?.avatar_url === 'string' ? data.avatar_url : null
    } catch {
      /* gagal baca profil bukan alasan menolak identitas: pakai nilai cookie */
    }
  }

  return NextResponse.json({ user: { ...auth.user, name, avatarUrl } })
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
