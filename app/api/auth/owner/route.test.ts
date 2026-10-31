import { beforeEach, afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { NextRequest } from 'next/server'

/* ── POST /api/auth/owner ────────────────────────────────────────────────────
   Test ini mengunci kontrak route sesi pemilik:
     · hanya email + kode pemilik yang boleh lewat;
     · sesi dibuat lewat Admin API (tanpa email), lalu ditukar DI SERVER;
     · `token_hash` TIDAK pernah ikut ke body balasan (beda dari jalur reviewer
       lama yang mengirimnya ke browser);
     · akun yang sudah ada bukan kegagalan;
     · kunci peran server / jalur yang dimatikan dijawab jujur, bukan 500. */

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/config', () => ({
  hasSupabaseConfig: vi.fn(() => true),
  hasSupabaseServiceRole: vi.fn(() => true),
  supabaseUrl: vi.fn(() => 'https://project.supabase.co'),
  supabaseServiceKey: vi.fn(() => 'service-key-test'),
}))
vi.mock('@/lib/supabase/server', () => ({ serverSupabase: vi.fn() }))

import { POST, resetOwnerAttemptsForTest } from './route'
import { createClient } from '@supabase/supabase-js'
import { hasSupabaseConfig, hasSupabaseServiceRole } from '@/lib/supabase/config'
import { serverSupabase } from '@/lib/supabase/server'

const createUser = vi.fn()
const generateLink = vi.fn()
const verifyOtp = vi.fn()
const create = createClient as unknown as Mock
const serviceConfigured = hasSupabaseServiceRole as unknown as Mock
const supabaseConfigured = hasSupabaseConfig as unknown as Mock
const serverClient = serverSupabase as unknown as Mock

/* Nilai di bawah ini HANYA untuk test: route membaca kredensial dari env, jadi
   tidak ada email/kode asli yang perlu (atau boleh) ditulis di repo. */
const EMAIL = 'pemilik@contoh.com'
const CODE = '482913'

function request(body: unknown, ip = '203.0.113.10'): NextRequest {
  return new NextRequest('http://localhost/api/auth/owner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

async function bodyOf(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>
}

const ENV_KEYS = [
  'OWNER_TEST_EMAIL',
  'OWNER_TEST_OTP',
  'OWNER_TEST_NICKNAME',
  'OWNER_TEST_LOGIN_ENABLED',
] as const
const savedEnv: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key]
  process.env.OWNER_TEST_EMAIL = EMAIL
  process.env.OWNER_TEST_OTP = CODE
  delete process.env.OWNER_TEST_NICKNAME
  delete process.env.OWNER_TEST_LOGIN_ENABLED

  resetOwnerAttemptsForTest()

  create.mockReset()
  createUser.mockReset()
  generateLink.mockReset()
  verifyOtp.mockReset()
  serverClient.mockReset()

  createUser.mockResolvedValue({ data: { user: { id: 'user-owner' } }, error: null })
  generateLink.mockResolvedValue({
    data: { properties: { hashed_token: 'hashed-token-123' }, user: { id: 'user-owner' } },
    error: null,
  })
  verifyOtp.mockResolvedValue({ data: { session: { access_token: 'token' } }, error: null })
  create.mockReturnValue({ auth: { admin: { createUser, generateLink } } })
  serverClient.mockResolvedValue({ auth: { verifyOtp } })
  serviceConfigured.mockReturnValue(true)
  supabaseConfigured.mockReturnValue(true)
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = savedEnv[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('POST /api/auth/owner', () => {
  it('membuat sesi untuk email + kode pemilik tanpa mengirim token ke browser', async () => {
    const res = await POST(request({ email: EMAIL, code: CODE }))
    const body = await bodyOf(res)

    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true, email: EMAIL })
    expect(body).not.toHaveProperty('tokenHash')
    expect(createUser).toHaveBeenCalledWith({
      email: EMAIL,
      email_confirm: true,
      user_metadata: { nickname: 'Pemilik' },
    })
    expect(generateLink).toHaveBeenCalledWith({ type: 'magiclink', email: EMAIL })
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'hashed-token-123', type: 'magiclink' })
  })

  it('tetap berhasil kalau akun pemilik sudah terdaftar', async () => {
    createUser.mockResolvedValue({
      data: { user: null },
      error: {
        code: 'email_exists',
        message: 'A user with this email address has already been registered',
      },
    })

    const res = await POST(request({ email: EMAIL, code: CODE }))

    expect(res.status).toBe(200)
    expect(generateLink).toHaveBeenCalledTimes(1)
  })

  /* ── TAHAP PROBE (tanpa kode) ─────────────────────────────────────────────
     `sendLoginLink` memanggil ini SEBELUM `signInWithOtp` untuk tahu apakah
     email ini harus melewati pengiriman email. Probe tidak boleh membuat sesi. */

  it('probe: email pemilik → fastLogin true tanpa menyentuh Admin API', async () => {
    const res = await POST(request({ email: EMAIL }))

    expect(res.status).toBe(200)
    expect(await bodyOf(res)).toEqual({ ok: true, fastLogin: true })
    expect(create).not.toHaveBeenCalled()
    expect(generateLink).not.toHaveBeenCalled()
  })

  it('probe: email lain → fastLogin false', async () => {
    const res = await POST(request({ email: 'someone@example.com' }))

    expect(res.status).toBe(200)
    expect(await bodyOf(res)).toEqual({ ok: true, fastLogin: false })
    expect(create).not.toHaveBeenCalled()
  })

  it('probe: env kredensial belum diisi → fastLogin false (jalur mati)', async () => {
    delete process.env.OWNER_TEST_EMAIL

    const res = await POST(request({ email: EMAIL }))

    expect(await bodyOf(res)).toEqual({ ok: true, fastLogin: false })
  })

  it('probe: jalur dimatikan → fastLogin false (bukan 403)', async () => {
    process.env.OWNER_TEST_LOGIN_ENABLED = '0'

    const res = await POST(request({ email: EMAIL }))

    expect(res.status).toBe(200)
    expect(await bodyOf(res)).toEqual({ ok: true, fastLogin: false })
  })


  it('menolak email lain walau kodenya benar — tanpa menyentuh Admin API', async () => {
    const res = await POST(request({ email: 'admin@catetind.com', code: CODE }))

    expect(res.status).toBe(401)
    expect(create).not.toHaveBeenCalled()
    expect(createUser).not.toHaveBeenCalled()
  })

  it('menolak kode selain kode dari env', async () => {
    const res = await POST(request({ email: EMAIL, code: '000000' }))

    expect(res.status).toBe(401)
    expect(create).not.toHaveBeenCalled()
  })

  it('body yang bukan JSON diperlakukan sebagai probe kosong — tanpa sesi', async () => {
    const res = await POST(request('{bukan-json'))

    expect(res.status).toBe(200)
    expect(await bodyOf(res)).toEqual({ ok: true, fastLogin: false })
    expect(create).not.toHaveBeenCalled()
  })
  it('menjawab 403 saat jalur pemilik dimatikan lewat env', async () => {
    process.env.OWNER_TEST_LOGIN_ENABLED = '0'

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

  it('menjawab 503 kalau env kredensial pemilik belum diisi', async () => {
    delete process.env.OWNER_TEST_OTP

    const res = await POST(request({ email: EMAIL, code: CODE }))

    expect(res.status).toBe(503)
    expect(create).not.toHaveBeenCalled()
  })

  it('menjawab 503 kalau klien sesi server tidak tersedia', async () => {
    serverClient.mockResolvedValue(null)

    const res = await POST(request({ email: EMAIL, code: CODE }))

    expect(res.status).toBe(503)
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
    expect(verifyOtp).not.toHaveBeenCalled()
  })

  it('menjawab 502 tanpa membocorkan pesan Supabase saat verifyOtp gagal', async () => {
    verifyOtp.mockResolvedValue({
      data: { session: null },
      error: { message: 'token has expired or is invalid' },
    })

    const res = await POST(request({ email: EMAIL, code: CODE }))
    const body = await bodyOf(res)

    expect(res.status).toBe(502)
    expect(String(body.error)).not.toContain('token has expired')
  })

  it('membatasi percobaan per IP (429 setelah 10 kali)', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const res = await POST(request({ email: 'someone@example.com', code: CODE }, '198.51.100.7'))
      expect(res.status).toBe(401)
    }

    const limited = await POST(request({ email: EMAIL, code: CODE }, '198.51.100.7'))
    expect(limited.status).toBe(429)
    expect(create).not.toHaveBeenCalled()
  })
})
