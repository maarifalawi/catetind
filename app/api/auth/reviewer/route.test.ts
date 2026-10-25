import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { NextRequest } from 'next/server'

/* ── POST /api/auth/reviewer ─────────────────────────────────────────────────
   Test ini mengunci kontrak route pembuat sesi reviewer:
     · hanya email + kode reviewer yang boleh lewat;
     · sesi dibuat lewat Admin API (tanpa email), lalu `token_hash` dikembalikan;
     · akun yang sudah ada bukan kegagalan;
     · kunci peran server / jalur yang dimatikan dijawab jujur, bukan 500. */

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/config', () => ({
  hasSupabaseConfig: vi.fn(() => true),
  hasSupabaseServiceRole: vi.fn(() => true),
  supabaseUrl: vi.fn(() => 'https://project.supabase.co'),
  supabaseServiceKey: vi.fn(() => 'service-key-test'),
}))

import { POST, resetReviewerAttemptsForTest } from './route'
import { createClient } from '@supabase/supabase-js'
import { hasSupabaseConfig, hasSupabaseServiceRole } from '@/lib/supabase/config'

const createUser = vi.fn()
const generateLink = vi.fn()
const create = createClient as unknown as Mock
const serviceConfigured = hasSupabaseServiceRole as unknown as Mock
const supabaseConfigured = hasSupabaseConfig as unknown as Mock

const EMAIL = 'reviewer@catetind.com'
const CODE = '123456'

function request(body: unknown, ip = '203.0.113.10'): NextRequest {
  return new NextRequest('http://localhost/api/auth/reviewer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

async function bodyOf(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>
}

beforeEach(() => {
  resetReviewerAttemptsForTest()
  delete process.env.REVIEWER_TEST_LOGIN_ENABLED

  create.mockReset()
  createUser.mockReset()
  generateLink.mockReset()

  createUser.mockResolvedValue({ data: { user: { id: 'user-reviewer' } }, error: null })
  generateLink.mockResolvedValue({
    data: { properties: { hashed_token: 'hashed-token-123' }, user: { id: 'user-reviewer' } },
    error: null,
  })
  create.mockReturnValue({ auth: { admin: { createUser, generateLink } } })
  serviceConfigured.mockReturnValue(true)
  supabaseConfigured.mockReturnValue(true)
})

describe('POST /api/auth/reviewer', () => {
  it('membuat token sesi untuk email + kode reviewer', async () => {
    const res = await POST(request({ email: EMAIL, code: CODE }))

    expect(res.status).toBe(200)
    expect(await bodyOf(res)).toEqual({
      ok: true,
      email: EMAIL,
      tokenHash: 'hashed-token-123',
      type: 'magiclink',
    })
    expect(createUser).toHaveBeenCalledWith({
      email: EMAIL,
      email_confirm: true,
      user_metadata: { nickname: 'Midtrans Reviewer' },
    })
    expect(generateLink).toHaveBeenCalledWith({ type: 'magiclink', email: EMAIL })
  })

  it('tetap berhasil kalau akun reviewer sudah terdaftar', async () => {
    createUser.mockResolvedValue({
      data: { user: null },
      error: { code: 'email_exists', message: 'A user with this email address has already been registered' },
    })

    const res = await POST(request({ email: EMAIL, code: CODE }))

    expect(res.status).toBe(200)
    expect(generateLink).toHaveBeenCalledTimes(1)
  })

  it('menolak email lain walau kodenya benar — tanpa menyentuh Admin API', async () => {
    const res = await POST(request({ email: 'admin@catetind.com', code: CODE }))

    expect(res.status).toBe(401)
    expect(create).not.toHaveBeenCalled()
    expect(createUser).not.toHaveBeenCalled()
  })

  it('menolak kode selain 123456', async () => {
    const res = await POST(request({ email: EMAIL, code: '000000' }))

    expect(res.status).toBe(401)
    expect(create).not.toHaveBeenCalled()
  })

  it('menolak body yang bukan JSON', async () => {
    const res = await POST(request('{bukan-json'))

    expect(res.status).toBe(401)
    expect(create).not.toHaveBeenCalled()
  })

  it('menjawab 403 saat jalur reviewer dimatikan lewat env', async () => {
    process.env.REVIEWER_TEST_LOGIN_ENABLED = '0'

    const res = await POST(request({ email: EMAIL, code: CODE }))

    expect(res.status).toBe(403)
    expect(create).not.toHaveBeenCalled()
  })

  it('menjawab 503 kalau kunci peran server belum ada', async () => {
    serviceConfigured.mockReturnValue(false)

    const res = await POST(request({ email: EMAIL, code: CODE }))

    expect(res.status).toBe(503)
    expect(create).not.toHaveBeenCalled()
  })

  it('menjawab 502 tanpa membocorkan pesan Supabase saat generateLink gagal', async () => {
    generateLink.mockResolvedValue({
      data: { properties: null, user: null },
      error: { message: 'internal detail that must not leak' },
    })

    const res = await POST(request({ email: EMAIL, code: CODE }))
    const body = await bodyOf(res)

    expect(res.status).toBe(502)
    expect(String(body.error)).not.toContain('internal detail')
  })

  it('membatasi percobaan per IP (429 setelah 20 kali)', async () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const res = await POST(request({ email: 'someone@example.com', code: CODE }, '198.51.100.7'))
      expect(res.status).toBe(401)
    }

    const limited = await POST(request({ email: EMAIL, code: CODE }, '198.51.100.7'))
    expect(limited.status).toBe(429)
  })
})
