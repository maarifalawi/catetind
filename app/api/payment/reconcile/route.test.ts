import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/session', () => ({ requireUser: vi.fn() }))
vi.mock('@/lib/subscription/reconcile', () => ({ reconcileCallerPurchases: vi.fn() }))
vi.mock('@/lib/subscription/plan', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/subscription/plan')>()
  return { ...actual, readCallerPlan: vi.fn() }
})

import { GET, POST } from './route'
import { requireUser } from '@/lib/session'
import { readCallerPlan, type CallerPlan } from '@/lib/subscription/plan'
import { reconcileCallerPurchases } from '@/lib/subscription/reconcile'

/* ── /api/payment/reconcile (paket 99) ───────────────────────────────────────
   Yang dikunci:
     · identitas dari sesi (401) — body tidak pernah menentukan pemilik order;
     · `order_id` hanya mempersempit pencarian, bukan bukti kepemilikan;
     · balasannya bentuk `/api/subscription` + ringkasan rekonsiliasi, dibaca
       SETELAH pemenuhan;
     · kegagalan membaca paket = 502 jujur, bukan “sepertinya aktif”. */

const guard = requireUser as unknown as Mock
const reconcile = reconcileCallerPurchases as unknown as Mock
const readPlan = readCallerPlan as unknown as Mock

const USER = { id: 'a1b2c3d4-aaaa-bbbb-cccc-dddddddddddd', email: 'a@b.c', name: 'Rina' }

function callerPlan(overrides: Partial<CallerPlan> = {}): CallerPlan {
  return {
    configured: true,
    planId: 'catet-aja',
    purchasedAt: '2026-10-21T07:12:00.000Z',
    expiresAt: null,
    isLifetime: true,
    billingPeriod: 'lifetime',
    active: true,
    expired: false,
    failed: false,
    ...overrides,
  }
}

function request(method: 'GET' | 'POST', body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/payment/reconcile', {
    method,
    ...(body === undefined
      ? {}
      : { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  })
}

beforeEach(() => {
  guard.mockReturnValue({ ok: true, user: USER, token: 'token-user' })
  readPlan.mockResolvedValue(callerPlan())
  reconcile.mockResolvedValue({
    ok: true,
    checked: 1,
    fulfilled: ['subscribe-1a4eefd2-1'],
    outcomes: [],
  })
})

afterEach(() => vi.clearAllMocks())

describe('POST /api/payment/reconcile', () => {
  it('401 tanpa sesi', async () => {
    guard.mockReturnValue({ ok: false, response: NextResponse.json({ error: 'x' }, { status: 401 }) })

    expect((await POST(request('POST', {}))).status).toBe(401)
    expect(reconcile).not.toHaveBeenCalled()
  })

  it('mencocokkan order dari body dengan token pemanggil, lalu mengembalikan paket', async () => {
    const res = await POST(request('POST', { order_id: 'subscribe-1a4eefd2-1' }))

    expect(res.status).toBe(200)
    expect(reconcile).toHaveBeenCalledWith('token-user', { orderId: 'subscribe-1a4eefd2-1' })
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, active: true, planId: 'catet-aja' })
    expect(body.reconcile.fulfilled).toEqual(['subscribe-1a4eefd2-1'])
  })

  it('tanpa order_id → semua pembelian pending terbaru yang dicocokkan', async () => {
    await POST(request('POST', {}))

    expect(reconcile).toHaveBeenCalledWith('token-user', { orderId: null })
  })

  it('tanpa body JSON tetap aman (tidak melempar)', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/payment/reconcile', { method: 'POST' }),
    )

    expect(res.status).toBe(200)
    expect(reconcile).toHaveBeenCalledWith('token-user', { orderId: null })
  })

  it('paket gagal dibaca setelah pemenuhan → 502, bukan mengaku aktif', async () => {
    readPlan.mockResolvedValue(callerPlan({ failed: true, active: false }))

    const res = await POST(request('POST', {}))

    expect(res.status).toBe(502)
    expect((await res.json()).ok).toBe(false)
  })
})

describe('GET /api/payment/reconcile', () => {
  it('order_id dibaca dari query', async () => {
    const req = new NextRequest(
      'http://localhost/api/payment/reconcile?order_id=subscribe-1a4eefd2-1',
    )

    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(reconcile).toHaveBeenCalledWith('token-user', { orderId: 'subscribe-1a4eefd2-1' })
  })
})
