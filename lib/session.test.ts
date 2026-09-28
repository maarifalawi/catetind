import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { SESSION_COOKIE, requireUser } from './session'
import { sessionFixture } from './supabase/session-fixture'
import {
  decodeSessionCookieValue,
  encodeSessionCookieValue,
  parseCookieHeader,
  readSupabaseSession,
  sessionCookieName,
} from './supabase/session-cookie'

/* ── Test penjaga sesi (paket 45: SESI SUPABASE, BUKAN MOCK) ─────────────────
   Paket 39 mengunci dua janji: tanpa cookie → 401, dan identitas selalu dari
   sesi (tidak pernah dari body request). Dua janji itu MASIH yang diuji di sini —
   yang berubah cuma dari mana sesinya datang: cookie `catet-ind-session` yang
   bisa dipalsukan (id user apa adanya) → cookie Supabase
   (`sb-<ref>-auth-token`, `base64-` + base64url(JSON) + token).

   Yang ditambahkan paket ini:
     · bentuk cookie yang diterima PERSIS yang ditulis `@supabase/ssr`
       (uji round-trip lewat `encodeSessionCookieValue`);
     · cookie ber-chunk (`.0`, `.1`) ikut terbaca — sesi panjang memang dipecah;
     · token yang sudah kedaluwarsa ditolak SEBELUM route mengirim query;
     · token yang dibaca diteruskan ke route (`auth.token`), karena itulah yang
       membuat RLS di database bekerja atas nama user — bukan `user.id` di sini. */

function requestWith(cookie?: string) {
  return new NextRequest(
    'http://localhost/api/wallets',
    cookie ? { headers: { cookie } } : undefined,
  )
}

describe('requireUser · penjaga endpoint API', () => {
  it('tanpa cookie sesi → 401 + pesan yang menyebut jalan keluar', async () => {
    const guard = requireUser(requestWith())
    expect(guard.ok).toBe(false)
    if (guard.ok) return

    expect(guard.response.status).toBe(401)
    const body = (await guard.response.json()) as { error: string }
    expect(body.error).toContain('/login')
  })

  it('cookie kosong / token asing / JSON rusak → 401', () => {
    expect(requireUser(requestWith(`${SESSION_COOKIE}=`)).ok).toBe(false)
    expect(requireUser(requestWith(`${SESSION_COOKIE}=abc123`)).ok).toBe(false)
    expect(
      requireUser(
        requestWith(`${SESSION_COOKIE}=base64-${Buffer.from('bukan json').toString('base64url')}`),
      ).ok,
    ).toBe(false)
    /* cookie versi lama (mock paket 39) TIDAK lagi diterima — jalur itu ditutup */
    expect(requireUser(requestWith(`${SESSION_COOKIE}=v1.bmFtYQ`)).ok).toBe(false)
  })

  it('sesi Supabase yang sah → user + access token pemanggil', () => {
    const { cookieHeader, session } = sessionFixture({ name: 'Ayu' })
    const guard = requireUser(requestWith(cookieHeader))
    expect(guard.ok).toBe(true)
    if (!guard.ok) return

    expect(guard.user.id).toBe(session.userId)
    expect(guard.user.email).toBe('ayu@catetind.dev')
    expect(guard.user.name).toBe('Ayu')
    /* token diteruskan supaya query route diverifikasi PostgREST atas nama user */
    expect(guard.token).toBe(session.accessToken)
  })

  it('token kedaluwarsa → 401 (ditolak sebelum menyentuh jaringan)', () => {
    const { cookieHeader } = sessionFixture({ expiresInSeconds: -3600 })
    expect(requireUser(requestWith(cookieHeader)).ok).toBe(false)
  })

  it('dua akun punya id berbeda — bahan uji isolasi antar-user', () => {
    const a = sessionFixture({ id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa' })
    const b = sessionFixture({ id: 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb' })
    expect(a.session.userId).not.toBe(b.session.userId)
  })
})

describe('cookie sesi Supabase · bentuk & batasnya', () => {
  it('round-trip: nilai yang ditulis `encodeSessionCookieValue` terbaca kembali', () => {
    const { cookieValue, session } = sessionFixture()
    const parsed = readSupabaseSession(`${sessionCookieName()}=${cookieValue}`)
    expect(parsed?.userId).toBe(session.userId)
    expect(parsed?.accessToken).toBe(session.accessToken)
    expect(parsed?.refreshToken).toBe('refresh-token-palsu')
  })

  it('cookie ber-chunk (.0/.1) digabung sesuai urutan', () => {
    const { cookieValue, session } = sessionFixture()
    const half = Math.floor(cookieValue.length / 2)
    const header = [
      `${sessionCookieName()}.0=${cookieValue.slice(0, half)}`,
      `${sessionCookieName()}.1=${cookieValue.slice(half)}`,
    ].join('; ')
    expect(readSupabaseSession(header)?.userId).toBe(session.userId)
  })

  it('nilai JSON polos (tanpa prefix base64-) juga diterima', () => {
    const json = JSON.stringify({
      access_token: 'token-polos',
      expires_at: Math.floor(Date.now() / 1000) + 600,
      user: { id: 'cccccccc-3333-4333-8333-cccccccccccc', email: 'c@catetind.dev' },
    })
    expect(readSupabaseSession(`${sessionCookieName()}=${json}`)?.accessToken).toBe('token-polos')
  })

  it('chunk yang kacau (base64 rusak / JSON tidak sah) → dianggap tidak ada', () => {
    expect(decodeSessionCookieValue(['base64-bukan-base64!!'])).toBeNull()
    expect(decodeSessionCookieValue([`base64-${Buffer.from('{"a":').toString('base64url')}`])).toBeNull()
    expect(decodeSessionCookieValue([])).toBeNull()
  })

  it('parsing header cookie tahan spasi & nilai ber-escape', () => {
    const parsed = parseCookieHeader('a=1; b=dua%20kata; c=')
    expect(parsed).toEqual([
      { name: 'a', value: '1' },
      { name: 'b', value: 'dua kata' },
      { name: 'c', value: '' },
    ])
  })

  it('nama cookie mengikuti project ref dari URL (satu sumber, bukan dua nilai)', () => {
    /* di test env `NEXT_PUBLIC_SUPABASE_*` tidak ada → ref cadangan `local` */
    expect(sessionCookieName()).toMatch(/^sb-.+-auth-token$/)
    expect(SESSION_COOKIE).toBe(sessionCookieName())
  })

  it('encoder menulis format yang sama dengan @supabase/ssr (base64- + base64url)', () => {
    const { cookieValue } = sessionFixture()
    expect(cookieValue.startsWith('base64-')).toBe(true)
    const json = JSON.parse(
      Buffer.from(cookieValue.slice('base64-'.length), 'base64url').toString('utf8'),
    ) as { access_token: string; user: { id: string } }
    expect(typeof json.access_token).toBe('string')
    expect(json.user.id).toMatch(/^[0-9a-f-]{36}$/)
  })
})

