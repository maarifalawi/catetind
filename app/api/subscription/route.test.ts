import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/session', () => ({ requireUser: vi.fn() }))
vi.mock('@/lib/supabase/rest', () => ({
  restConfigured: vi.fn(),
  restFetch: vi.fn(),
}))

import { GET } from './route'
import { requireUser } from '@/lib/session'
import { restConfigured, restFetch } from '@/lib/supabase/rest'

const guard = requireUser as unknown as Mock
const configured = restConfigured as unknown as Mock
const fetchRest = restFetch as unknown as Mock

const USER = { id: 'u1', email: 'a@b.c', name: 'Jon' }

function request(): NextRequest {
  return new NextRequest('http://localhost/api/subscription', { method: 'GET' })
}

afterEach(() => vi.clearAllMocks())

describe('GET /api/subscription', () => {
  it('401 tanpa sesi', async () => {
    guard.mockReturnValue({ ok: false, response: NextResponse.json({ error: 'x' }, { status: 401 }) })
    expect((await GET(request())).status).toBe(401)
  })

  it('tanpa backend: aktif false + configured false (jujur, bukan "sepertinya aktif")', async () => {
    guard.mockReturnValue({ ok: true, user: USER, token: 't' })
    configured.mockReturnValue(false)
    const res = await GET(request())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.active).toBe(false)
    expect(body.configured).toBe(false)
    expect(fetchRest).not.toHaveBeenCalled()
  })

  it('ada baris paket aktif → active:true + planId', async () => {
    guard.mockReturnValue({ ok: true, user: USER, token: 't' })
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValue({
      ok: true,
      status: 200,
      data: [
        {
          tier_name: 'waras',
          is_active: true,
          started_at: '2026-10-10T00:00:00Z',
        },
      ],
    })
    const body = await (await GET(request())).json()
    expect(body.active).toBe(true)
    expect(body.planId).toBe('waras')
    expect(body.purchasedAt).toBe('2026-10-10T00:00:00Z')
  })

  it('tier LAMA (founding_member) tetap dipetakan ke paket baru', async () => {
    guard.mockReturnValue({ ok: true, user: USER, token: 't' })
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValue({
      ok: true,
      status: 200,
      data: [{ tier_name: 'founding_member', is_active: true, started_at: '2026-01-01T00:00:00Z' }],
    })
    const body = await (await GET(request())).json()
    expect(body.active).toBe(true)
    expect(body.planId).toBe('sultan')
  })

  it('belum ada baris → active:false, planId null', async () => {
    guard.mockReturnValue({ ok: true, user: USER, token: 't' })
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValue({ ok: true, status: 200, data: [] })
    const body = await (await GET(request())).json()
    expect(body.active).toBe(false)
    expect(body.planId).toBeNull()
  })

  it('gagal membaca → 502 (tidak mengaku aman)', async () => {
    guard.mockReturnValue({ ok: true, user: USER, token: 't' })
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValue({ ok: false, status: 500, data: null, error: 'db' })
    expect((await GET(request())).status).toBe(502)
  })
})
