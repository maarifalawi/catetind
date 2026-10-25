import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

/* ── signInWithReviewerCode ──────────────────────────────────────────────────
   Fungsi klien ini menyambung dua langkah nyata: route server membuat
   `token_hash`, lalu Supabase `verifyOtp` menukarnya jadi sesi cookie. Yang
   diuji: kontrak dua langkah itu, penerusan pesan error server apa adanya, dan
   kegagalan jaringan yang tidak boleh melempar ke layar login. */

vi.mock('./supabase/client', () => ({ browserSupabase: vi.fn() }))

import { signInWithReviewerCode } from './session-client'
import { browserSupabase } from './supabase/client'

const browser = browserSupabase as unknown as Mock
const verifyOtp = vi.fn()

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  verifyOtp.mockReset()
  browser.mockReset()
  browser.mockReturnValue({ auth: { verifyOtp } })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('signInWithReviewerCode', () => {
  it('menukar tokenHash dari route reviewer menjadi sesi', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, tokenHash: 'hash-1' }))
    vi.stubGlobal('fetch', fetchMock)
    verifyOtp.mockResolvedValue({ data: { session: {} }, error: null })

    await expect(signInWithReviewerCode(' reviewer@catetind.com ', ' 123456 ')).resolves.toEqual({
      ok: true,
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/reviewer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'reviewer@catetind.com', code: '123456' }),
    })
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'hash-1', type: 'magiclink' })
  })

  it('meneruskan pesan server (mis. jalur reviewer dimatikan)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({ ok: false, error: 'Login reviewer sedang dimatikan di server ini.' }, 403),
      ),
    )

    const result = await signInWithReviewerCode('reviewer@catetind.com', '123456')

    expect(result).toEqual({
      ok: false,
      error: 'Login reviewer sedang dimatikan di server ini.',
    })
    expect(verifyOtp).not.toHaveBeenCalled()
  })

  it('gagal kalau Supabase belum dikonfigurasi', async () => {
    browser.mockReturnValue(null)

    const result = await signInWithReviewerCode('reviewer@catetind.com', '123456')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('belum dikonfigurasi')
  })

  it('gagal saat Supabase menolak token sesi', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ok: true, tokenHash: 'hash-1' })))
    verifyOtp.mockResolvedValue({ data: { session: null }, error: { message: 'Token has expired' } })

    await expect(signInWithReviewerCode('reviewer@catetind.com', '123456')).resolves.toEqual({
      ok: false,
      error: 'Token has expired',
    })
  })

  it('tidak melempar saat jaringan mati', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )

    const result = await signInWithReviewerCode('reviewer@catetind.com', '123456')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('Jaringan')
  })
})
