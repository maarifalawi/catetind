import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/session', () => ({ requireUser: vi.fn() }))
vi.mock('@/lib/supabase/rest', () => ({
  restConfigured: vi.fn(),
  restFetch: vi.fn(),
}))

import { GET, POST } from './route'
import { requireUser } from '@/lib/session'
import { restConfigured, restFetch } from '@/lib/supabase/rest'

const guard = requireUser as unknown as Mock
const configured = restConfigured as unknown as Mock
const fetchRest = restFetch as unknown as Mock

const USER = { id: 'u1', email: 'a@b.c', name: 'Jon' }
const PAYLOAD = {
  completedAt: '2026-10-21T10:00:00.000Z',
  situations: ['first-jobber'],
  modules: [],
  wallet: { name: 'BCA', balance: 0 },
  monthlyIncome: 0,
}

function request(method: 'GET' | 'POST', body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/onboarding', {
    method,
    ...(body === undefined
      ? {}
      : { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }),
  })
}

afterEach(() => vi.clearAllMocks())

describe('GET /api/onboarding', () => {
  it('401 tanpa sesi', async () => {
    guard.mockReturnValue({ ok: false, response: NextResponse.json({}, { status: 401 }) })
    expect((await GET(request('GET'))).status).toBe(401)
  })

  it('tanpa backend → known false (gerbang tidak mengunci)', async () => {
    guard.mockReturnValue({ ok: true, user: USER, token: 't' })
    configured.mockReturnValue(false)
    const body = await (await GET(request('GET'))).json()
    expect(body).toMatchObject({ ok: true, configured: false, known: false, onboarded: null })
  })

  it('user baru tanpa dompet → onboarded false', async () => {
    guard.mockReturnValue({ ok: true, user: USER, token: 't' })
    configured.mockReturnValue(true)
    fetchRest.mockImplementation((path: string) =>
      Promise.resolve(
        path.startsWith('user_settings')
          ? { ok: true, status: 200, data: [{ onboarding: null }] }
          : { ok: true, status: 200, data: [] },
      ),
    )
    const body = await (await GET(request('GET'))).json()
    expect(body).toMatchObject({ known: true, onboarded: false, hasWallets: false })
  })
})

describe('POST /api/onboarding', () => {
  it('401 tanpa sesi', async () => {
    guard.mockReturnValue({ ok: false, response: NextResponse.json({}, { status: 401 }) })
    expect((await POST(request('POST', PAYLOAD))).status).toBe(401)
  })

  it('payload tidak lengkap → 422', async () => {
    guard.mockReturnValue({ ok: true, user: USER, token: 't' })
    expect((await POST(request('POST', { completedAt: '' }))).status).toBe(422)
  })

  it('tanpa backend → 200 tapi persisted false', async () => {
    guard.mockReturnValue({ ok: true, user: USER, token: 't' })
    configured.mockReturnValue(false)
    const body = await (await POST(request('POST', PAYLOAD))).json()
    expect(body).toMatchObject({ ok: true, persisted: false, configured: false })
    expect(fetchRest).not.toHaveBeenCalled()
  })

  it('menulis user_settings.onboarding atas nama pemanggil', async () => {
    guard.mockReturnValue({ ok: true, user: USER, token: 't' })
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValue({ ok: true, status: 201, data: null })
    const body = await (await POST(request('POST', PAYLOAD))).json()
    expect(body).toMatchObject({ ok: true, persisted: true })
    const [path, options] = fetchRest.mock.calls[0] as [
      string,
      { method: string; body: Record<string, unknown>; accessToken: string },
    ]
    expect(path).toBe('user_settings?on_conflict=user_id')
    expect(options.method).toBe('POST')
    expect(options.accessToken).toBe('t')
    expect(options.body.user_id).toBe('u1')
    expect(options.body.onboarding).toEqual(PAYLOAD)
  })

  it('server menolak → 502, bukan pura-pura tersimpan', async () => {
    guard.mockReturnValue({ ok: true, user: USER, token: 't' })
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValue({ ok: false, status: 500, data: null })
    expect((await POST(request('POST', PAYLOAD))).status).toBe(502)
  })
})
