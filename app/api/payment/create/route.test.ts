import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/session', () => ({ requireUser: vi.fn() }))
vi.mock('@/lib/payments/midtrans', () => ({
  midtransConfigured: vi.fn(),
  createSnapTransaction: vi.fn(),
}))
vi.mock('@/lib/supabase/rest', () => ({
  restFetch: vi.fn(async () => ({ ok: true, status: 201, data: null })),
}))

import { POST } from './route'
import { requireUser } from '@/lib/session'
import { createSnapTransaction, midtransConfigured } from '@/lib/payments/midtrans'
import { restFetch } from '@/lib/supabase/rest'
import { HERO_PLAN, applyReferralDiscount } from '@/lib/data/pricing'

const guard = requireUser as unknown as Mock
const configured = midtransConfigured as unknown as Mock
const createSnap = createSnapTransaction as unknown as Mock
const insertRow = restFetch as unknown as Mock

const USER = { id: 'u1', email: 'a@b.c', name: 'Jon' }

/** penawaran SAH: Paket Waras tahunan (harga kanon `lib/data/pricing.ts`) */
const OFFER = {
  purpose: 'subscribe',
  planId: HERO_PLAN.id,
  period: 'annual',
  amount: HERO_PLAN.annual,
}

function request(body: unknown, origin?: string): NextRequest {
  return new NextRequest('http://localhost/api/payment/create', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(origin ? { origin } : {}),
    },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  guard.mockReturnValue({ ok: true, user: USER, token: 't' })
  configured.mockReturnValue(false)
  createSnap.mockReset()
  insertRow.mockClear()
})

afterEach(() => {
  vi.clearAllMocks()
  delete process.env.MIDTRANS_SERVER_KEY
})

describe('POST /api/payment/create', () => {
  it('401 tanpa sesi', async () => {
    guard.mockReturnValue({ ok: false, response: NextResponse.json({ error: 'x' }, { status: 401 }) })
    expect((await POST(request(OFFER))).status).toBe(401)
  })

  it('503 jujur saat Midtrans belum aktif (tanpa token palsu)', async () => {
    const res = await POST(request(OFFER))
    expect(res.status).toBe(503)
    expect((await res.json()).reason).toBe('not-configured')
  })

  it('nominal bukan harga kanon → 422 (harga tidak dipercaya dari klien)', async () => {
    configured.mockReturnValue(true)
    const res = await POST(request({ ...OFFER, amount: 1_000 }))
    expect(res.status).toBe(422)
    expect((await res.json()).reason).toBe('invalid')
    expect(createSnap).not.toHaveBeenCalled()
    expect(insertRow).not.toHaveBeenCalled()
  })

  it('paket / periode asing → 422', async () => {
    configured.mockReturnValue(true)
    expect((await POST(request({ ...OFFER, planId: 'entah-apa' }))).status).toBe(422)
    expect((await POST(request({ ...OFFER, period: 'lifetime' }))).status).toBe(422)
  })

  it('nominal diskon referral (10%) diterima', async () => {
    configured.mockReturnValue(true)
    createSnap.mockResolvedValue({ ok: true, value: { token: 'snap-tok', redirectUrl: 'https://snap' } })
    const res = await POST(request({ ...OFFER, amount: applyReferralDiscount(HERO_PLAN.annual) }))
    expect(res.status).toBe(200)
    expect((await res.json()).token).toBe('snap-tok')
  })

  it('membuat Snap token + menulis baris pending (paket & periode ikut) ATAS NAMA user', async () => {
    configured.mockReturnValue(true)
    createSnap.mockResolvedValue({ ok: true, value: { token: 'snap-tok', redirectUrl: 'https://snap' } })
    const res = await POST(request(OFFER))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.token).toBe('snap-tok')

    expect(insertRow).toHaveBeenCalledTimes(1)
    const [path, options] = insertRow.mock.calls[0] as [
      string,
      {
        method: string
        accessToken: string
        body: { order_id: string; status: string; tier_name: string; billing_period: string }
      },
    ]
    expect(path).toBe('purchases')
    expect(options.method).toBe('POST')
    expect(options.accessToken).toBe('t')
    expect(options.body.status).toBe('pending')
    expect(options.body.order_id).toBe(body.orderId)
    expect(options.body.tier_name).toBe(HERO_PLAN.id)
    expect(options.body.billing_period).toBe('annual')

    const intent = createSnap.mock.calls[0][0] as { planId?: string; period?: string }
    expect(intent.planId).toBe(HERO_PLAN.id)
    expect(intent.period).toBe('annual')
  })

  it('mengirim callbacks finish/error dari Origin (alur redirect)', async () => {
    configured.mockReturnValue(true)
    createSnap.mockResolvedValue({ ok: true, value: { token: 'snap-tok', redirectUrl: 'https://snap' } })
    await POST(request(OFFER, 'http://localhost:3000'))

    const intent = createSnap.mock.calls[0][0] as { finishUrl?: string; errorUrl?: string }
    expect(intent.finishUrl).toContain('http://localhost:3000/checkout/selesai?order_id=')
    expect(intent.errorUrl).toContain('status=error')
  })

  it('tanpa Origin: tidak ada callbacks (tidak mengarang domain)', async () => {
    configured.mockReturnValue(true)
    createSnap.mockResolvedValue({ ok: true, value: { token: 'snap-tok', redirectUrl: 'https://snap' } })
    await POST(request(OFFER))
    const intent = createSnap.mock.calls[0][0] as { finishUrl?: string }
    expect(intent.finishUrl).toBeUndefined()
  })
})
