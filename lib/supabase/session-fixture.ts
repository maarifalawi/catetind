import { SESSION_COOKIE } from '@/lib/session'
import { encodeSessionCookieValue, type SupabaseSession } from './session-cookie'

/* ── FIXTURE SESI UNTUK TEST (paket 45) ─────────────────────────────────────
   Test route handler butuh cookie sesi yang SAH BENTUKNYA — dan bentuknya bukan
   karangan test: `encodeSessionCookieValue()` menulis persis format
   `@supabase/ssr` (`base64-` + base64url(JSON)). Jadi test ini sekaligus
   mengunci kontrak "cookie yang ditulis perpustakaan itu memang bisa dibaca
   penjaga kita".

   ⚠️ File ini HANYA dipakai test. Tidak ada kode produksi yang mengimpornya —
   di produksi cookie ditulis Supabase (browser & server client), bukan di sini.
   Tanpa `NEXT_PUBLIC_SUPABASE_*` (kondisi test), jalur data route memakai store
   memory seperti paket 39, jadi test tetap tidak menyentuh jaringan. */

export interface TestSessionFixture {
  session: SupabaseSession
  /** nilai cookie siap pakai (satu chunk) */
  cookieValue: string
  /** header cookie siap tempel: `<nama cookie>=<nilai>` */
  cookieHeader: string
}

export function sessionFixture(
  {
    id = '11111111-1111-4111-8111-111111111111',
    email = 'ayu@catetind.dev',
    name = 'Ayu',
    accessToken = 'access-token-palsu-untuk-test',
    expiresInSeconds = 3600,
  }: {
    id?: string
    email?: string
    name?: string
    accessToken?: string
    expiresInSeconds?: number
  } = {},
): TestSessionFixture {
  const session: SupabaseSession = {
    userId: id,
    email,
    name,
    accessToken,
    refreshToken: 'refresh-token-palsu',
    expiresAt: Math.floor(Date.now() / 1000) + expiresInSeconds,
  }
  const cookieValue = encodeSessionCookieValue(session)
  return { session, cookieValue, cookieHeader: `${SESSION_COOKIE}=${cookieValue}` }
}

/** dua akun berbeda — bahan uji isolasi antar-user */
export const SESSION_A = sessionFixture({ id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', email: 'ayu@catetind.dev', name: 'Ayu' })
export const SESSION_B = sessionFixture({ id: 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb', email: 'bima@catetind.dev', name: 'Bima' })
