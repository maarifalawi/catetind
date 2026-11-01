import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { adminSupabase } from '@/lib/supabase/admin'

/* ── PROFIL (NAMA + FOTO) LEWAT SESI COOKIE ──────────────────────────────────
   PATCH /api/profile — dipakai panel Profil & Akun, dan WAJIB berfungsi walau
   klien Supabase di browser tidak punya sesi (cookie sah, token di browser
   basi/terblokir).

   Kenapa lewat server, bukan langsung ke tabel `profiles` dari browser:
     · `auth.admin.updateUserById` (metadata nama) butuh kunci peran server;
     · foto profil adalah data URL base64 (± 10–20 KB). Menyimpannya di cookie
       sesi akan menembus batas 4096 byte dan membuat request ditolak 431 —
       karena itu ia hidup di `profiles.avatar_url`, dan cookie tetap kecil.

   KEAMANAN: `requireUser()` baris pertama; `user_id` dari sesi; validasi bentuk
   avatar (data URL gambar) + batas panjang. */

const NAME_MAX = 40
/** ±45 KB base64 ≈ 33 KB biner — jauh di bawah batas body route `data` */
const AVATAR_MAX_CHARS = 60_000
const AVATAR_PATTERN = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/

function normalizeName(raw: unknown): string {
  return String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

interface ProfileRow {
  nickname?: string | null
  avatar_url?: string | null
}

async function readProfile(userId: string): Promise<ProfileRow | null> {
  const client = adminSupabase()
  if (!client) return null
  try {
    const { data } = await client
      .from('profiles')
      .select('nickname,avatar_url')
      .eq('user_id', userId)
      .maybeSingle()
    return (data ?? null) as ProfileRow | null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response
  const profile = await readProfile(auth.user.id)
  return NextResponse.json({
    profile: {
      name: normalizeName(profile?.nickname ?? auth.user.name),
      avatarUrl: typeof profile?.avatar_url === 'string' ? profile.avatar_url : null,
      email: auth.user.email,
    },
  })
}

export async function PATCH(req: NextRequest) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response

  const client = adminSupabase()
  if (!client) {
    return NextResponse.json({ error: 'Jalur server belum tersedia.' }, { status: 503 })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Body harus JSON.' }, { status: 400 })
  }

  const wantsName = Object.prototype.hasOwnProperty.call(body, 'name')
  const wantsAvatar = Object.prototype.hasOwnProperty.call(body, 'avatarUrl')
  if (!wantsName && !wantsAvatar) {
    return NextResponse.json({ error: 'Tidak ada yang diubah.' }, { status: 400 })
  }

  let name: string | null = null
  if (wantsName) {
    name = normalizeName(body.name)
    if (!name) return NextResponse.json({ error: 'Nama nggak boleh kosong ya.' }, { status: 422 })
    if (name.length > NAME_MAX) {
      return NextResponse.json({ error: `Nama maksimal ${NAME_MAX} karakter.` }, { status: 422 })
    }
  }

  let avatarUrl: string | null | undefined
  if (wantsAvatar) {
    if (body.avatarUrl === null || body.avatarUrl === '') avatarUrl = null
    else {
      const raw = String(body.avatarUrl)
      if (!AVATAR_PATTERN.test(raw) || raw.length > AVATAR_MAX_CHARS) {
        return NextResponse.json(
          { error: 'Foto profil harus gambar JPG/PNG/WebP yang sudah dikecilkan.' },
          { status: 422 },
        )
      }
      avatarUrl = raw
    }
  }

  const patch: Record<string, unknown> = {
    user_id: auth.user.id,
    updated_at: new Date().toISOString(),
  }
  if (name !== null) patch.nickname = name
  if (avatarUrl !== undefined) patch.avatar_url = avatarUrl

  const { error } = await client.from('profiles').upsert(patch, { onConflict: 'user_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 502 })

  /* Metadata nama ikut diperbarui supaya jalur lain yang membaca sesi Auth
     (mis. nama pelanggan Midtrans) tidak tertinggal versi lama. Avatar TIDAK
     masuk metadata — lihat catatan di atas soal batas cookie. */
  if (name !== null) {
    try {
      await client.auth.admin.updateUserById(auth.user.id, { user_metadata: { nickname: name } })
    } catch {
      /* best-effort: baris `profiles` sudah benar dan itulah sumber tampilan */
    }
  }

  return NextResponse.json({
    ok: true,
    name: name ?? normalizeName((await readProfile(auth.user.id))?.nickname ?? auth.user.name),
    avatarUrl: avatarUrl === undefined ? null : avatarUrl,
  })
}
