import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/session', () => ({ requireUser: vi.fn() }))
vi.mock('@/lib/payments/midtrans', () => ({
  midtransConfigured: vi.fn(),
  fetchTransactionStatus: vi.fn(),
}))
vi.mock('@/lib/supabase/rest', () => ({ restFetch: vi.fn() }))

import { GET } from './route'
import { requireUser } from '@/lib/session'
import { fetchTransactionStatus, midtransConfigured } from '@/lib/payments/midtrans'
import { restFetch } from '@/lib/supabase/rest'

/* ── GET /api/payment/status (paket 83) ──────────────────────────────────────
   Yang dikunci:
     · identitas dari sesi (401) — `order_id` di query BUKAN bukti kepemilikan;
     · kepemilikan lewat RLS: order orang lain tampak "tidak ada" (404), bukan
       403 yang membocorkan keberadaannya;
     · statusnya jujur: baris DB `settlement` = settled (langganan sudah dicatat),
       sementara `order.status` tetap dilaporkan apa adanya. */

const guard = requireUser as unknown as Mock
const configured = midtransConfigured as unknown as Mock
const status = fetchTransactionStatus as unknown as Mock
const rest = restFetch as unknown as Mock

const USER = { id: 'a1b2c3d4-aaaa-bbbb-cccc-dddddddddddd', email: 'a@b.c', name: 'Rina' }
const ORDER = 'subscribe-a1b2c3d4-1'

function request(query = `order_id=${ORDER}&method=qris`): NextRequest {
  return new NextRequest(`http://localhost/api/payment/status?${query}`, { method: 'GET' })
}

function purchaseRow(overrides: Record<string, unknown> = {}) {
  return [
    {
      order_id: ORDER,
      status: 'pending',
      tier_name: 'waras',
      billing_period: 'annual',
      price_paid: 0,
      paid_at: null,
      ...overrides,
    },
  ]
}

/** potret transaksi versi Midtrans (bentuknya sama seperti balasan sandbox) */
function providerPending(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    value: {
      orderId: ORDER,
      state: 'pending',
      transactionStatus: 'pending',
      fraudStatus: null,
      paymentType: 'qris',
      method: 'qris',
      transactionId: 'tx-1',
      amount: 109_000,
      expiresAt: '2026-10-10T21:15:45.000Z',
      instructions: { channel: 'qris', qrImageUrl: 'https://qr/contoh', qrString: '00020101' },
      ...overrides,
    },
  }
}

beforeEach(() => {
  guard.mockReturnValue({ ok: true, user: USER, token: 't' })
  configured.mockReturnValue(true)
  rest.mockResolvedValue({ ok: true, status: 200, data: purchaseRow() })
  status.mockResolvedValue(providerPending())
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/payment/status', () => {
  it('401 tanpa sesi', async () => {
    guard.mockReturnValue({ ok: false, response: NextResponse.json({ error: 'x' }, { status: 401 }) })
    expect((await GET(request())).status).toBe(401)
  })

  it('503 saat Midtrans belum aktif', async () => {
    configured.mockReturnValue(false)
    const res = await GET(request())
    expect(res.status).toBe(503)
    expect(rest).not.toHaveBeenCalled()
  })

  it('422 tanpa order_id', async () => {
    expect((await GET(request(''))).status).toBe(422)
    expect((await GET(request('method=qris'))).status).toBe(422)
  })

  it('order bukan milik pemanggil (RLS menyaring) → 404, bukan 403', async () => {
    rest.mockResolvedValue({ ok: true, status: 200, data: [] })
    const res = await GET(request())
    expect(res.status).toBe(404)
    expect(status).not.toHaveBeenCalled()
  })

  it('gagal membaca DB → 502', async () => {
    rest.mockResolvedValue({ ok: false, status: 401, data: null, error: 'token kedaluwarsa' })
    expect((await GET(request())).status).toBe(502)
  })

  it('pending: status provider + instruksi ikut dibalas', async () => {
    const res = await GET(request())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.state).toBe('pending')
    expect(body.provider.transactionStatus).toBe('pending')
    expect(body.instructions).toMatchObject({ channel: 'qris' })
    expect(body.order).toMatchObject({ status: 'pending', tierName: 'waras', billingPeriod: 'annual' })

    /* kepemilikan diperiksa dengan TOKEN PEMANGGIL, bukan kunci server */
    const [path, options] = rest.mock.calls[0] as [string, { accessToken: string }]
    expect(path).toContain('purchases?')
    expect(path).toContain(`order_id=eq.${ORDER}`)
    expect(options.accessToken).toBe('t')
  })
})

describe('GET /api/payment/status — status jujur', () => {
  it('baris DB sudah settlement → state settled, walau provider masih pending', async () => {
    rest.mockResolvedValue({
      ok: true,
      status: 200,
      data: purchaseRow({ status: 'settlement', price_paid: 109_000 }),
    })
    const body = await (await GET(request())).json()
    expect(body.state).toBe('settled')
    expect(body.order.status).toBe('settlement')
    expect(body.order.pricePaid).toBe(109_000)
  })

  it('dibayar tapi webhook belum mencatat → state settled, order.status apa adanya', async () => {
    status.mockResolvedValue(
      providerPending({
        state: 'settled',
        transactionStatus: 'settlement',
        fraudStatus: 'accept',
        instructions: null,
      }),
    )
    const body = await (await GET(request())).json()
    expect(body.state).toBe('settled')
    expect(body.order.status).toBe('pending')
    expect(body.instructions).toBeNull()
  })

  it('provider belum punya transaksi (404) → state unknown, jujur', async () => {
    status.mockResolvedValue({ ok: false, reason: 'not-found', status: 404, message: 'belum ada' })
    const body = await (await GET(request())).json()
    expect(body.state).toBe('unknown')
    expect(body.provider.transactionStatus).toBeNull()
    expect(body.instructions).toBeNull()
  })

  it('provider belum punya transaksi TAPI baris DB settlement → tetap settled', async () => {
    rest.mockResolvedValue({ ok: true, status: 200, data: purchaseRow({ status: 'settlement' }) })
    status.mockResolvedValue({ ok: false, reason: 'not-found', status: 404, message: 'belum ada' })
    const body = await (await GET(request())).json()
    expect(body.state).toBe('settled')
  })

  it('tagihan kedaluwarsa → state expired (jalan keluar jelas, bukan layar buntu)', async () => {
    status.mockResolvedValue(
      providerPending({ state: 'expired', transactionStatus: 'expire', instructions: null }),
    )
    const body = await (await GET(request())).json()
    expect(body.state).toBe('expired')
  })

  it('kegagalan provider lain (502) diteruskan, bukan disembunyikan', async () => {
    status.mockResolvedValue({ ok: false, reason: 'provider', status: 502, message: 'db down' })
    const res = await GET(request())
    expect(res.status).toBe(502)
    expect((await res.json()).error).toBe('db down')
  })

  it('tanpa `method`: status tetap terbaca, instruksi tidak diminta', async () => {
    status.mockResolvedValue(
      providerPending({ paymentType: 'gopay', method: 'gopay', instructions: null }),
    )
    const res = await GET(request(`order_id=${ORDER}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.state).toBe('pending')
    expect(body.method).toBe('gopay')
    expect(status.mock.calls[0][1]).toBeUndefined()
  })
})
