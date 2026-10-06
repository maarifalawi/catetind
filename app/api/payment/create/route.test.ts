import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/session', () => ({ requireUser: vi.fn() }))

import { POST } from './route'
import { requireUser } from '@/lib/session'

const guard = requireUser as unknown as Mock

function request(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/payment/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

afterEach(() => {
  vi.clearAllMocks()
  delete process.env.MIDTRANS_SERVER_KEY
})

describe('POST /api/payment/create', () => {
  it('401 tanpa sesi', async () => {
    guard.mockReturnValue({ ok: false, response: NextResponse.json({ error: 'x' }, { status: 401 }) })
    const res = await POST(request({ purpose: 'subscribe', amount: 1000 }))
    expect(res.status).toBe(401)
  })

  it('503 jujur saat Midtrans belum aktif (tanpa token palsu)', async () => {
    guard.mockReturnValue({ ok: true, user: { id: 'u1', email: 'a@b.c', name: 'Jon' }, token: 't' })
    const res = await POST(request({ purpose: 'subscribe', amount: 149000 }))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.reason).toBe('not-configured')
  })
})
