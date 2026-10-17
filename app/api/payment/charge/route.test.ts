import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/session', () => ({ requireUser: vi.fn() }))
vi.mock('@/lib/payments/midtrans', () => ({
  midtransConfigured: vi.fn(),
  createCoreCharge: vi.fn(),
  fetchTransactionStatus: vi.fn(),
  cancelTransaction: vi.fn(),
}))
vi.mock('@/lib/supabase/rest', () => ({ restFetch: vi.fn() }))
vi.mock('@/lib/subscription/plan', () => ({ readCallerPlan: vi.fn() }))

import { POST } from './route'
import { requireUser } from '@/lib/session'
import {
  cancelTransaction,
  createCoreCharge,
  fetchTransactionStatus,
  midtransConfigured,
} from '@/lib/payments/midtrans'
import { restFetch } from '@/lib/supabase/rest'
import { readCallerPlan } from '@/lib/subscription/plan'
import { HERO_PLAN, PLANS, applyReferralDiscount } from '@/lib/data/pricing'
import { AI_ADDON_PACKAGES } from '@/lib/ai-quota'

/* ── POST /api/payment/charge (paket 83) ─────────────────────────────────────
   Yang dikunci bukan "route membalas 200", melainkan URUTAN & BATASnya:
     · identitas dari sesi (401 tanpa sesi), nominal dari harga kanon (422);
     · baris `purchases` pending DITULIS DULU atas nama user — kalau gagal,
       provider TIDAK dipanggil (jangan menagih yang tak bisa dicatat);
     · order pending yang cocok DIPAKAI ULANG, bukan ditagih dua kali;
     · order yang sudah dibayar tidak pernah memicu tagihan kedua. */

const guard = requireUser as unknown as Mock
const configured = midtransConfigured as unknown as Mock
const charge = createCoreCharge as unknown as Mock
const status = fetchTransactionStatus as unknown as Mock
const cancel = cancelTransaction as unknown as Mock
const rest = restFetch as unknown as Mock

const USER = { id: 'a1b2c3d4-aaaa-bbbb-cccc-dddddddddddd', email: 'a@b.c', name: 'Rina' }

const OFFER = {
  purpose: 'subscribe',
  planId: HERO_PLAN.id,
  period: 'monthly',
  amount: HERO_PLAN.monthly,
  method: 'qris',
}

const PENDING_STATUS = {
  ok: true,
  value: {
    orderId: 'subscribe-a1b2c3d4-1',
    state: 'pending',
    transactionStatus: 'pending',
    fraudStatus: null,
    paymentType: 'qris',
    method: 'qris',
    transactionId: 'tx-1',
    amount: HERO_PLAN.monthly,
    expiresAt: '2026-10-10T21:15:45.000Z',
    instructions: { channel: 'qris', qrImageUrl: 'https://qr/contoh', qrString: '00020101' },
  },
}

/**
 * Paket yang SUDAH dimiliki user — dibaca server dari `user_subscriptions`
 * (`readCallerPlan`). Di test, sumbernya di-mock supaya test bisa menentukan
 * "user ini sudah di tier apa" tanpa menyalin logika pembacaan DB.
 */
const readPlan = readCallerPlan as unknown as Mock

function owned(tier: string | null, active = true, isLifetime = false): void {
  readPlan.mockResolvedValue({
    configured: true,
    planId: tier,
    purchasedAt: active ? '2026-01-01T00:00:00Z' : null,
    expiresAt: null,
    isLifetime,
    billingPeriod: isLifetime ? 'lifetime' : tier ? 'monthly' : null,
    active,
    expired: false,
    failed: false,
  })
}

function request(body: unknown, origin?: string): NextRequest {
  return new NextRequest('http://localhost/api/payment/charge', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) },
    body: JSON.stringify(body),
  })
}

/** panggilan `restFetch` yang menulis baris baru (POST), bukan kueri */
function insertCalls(): unknown[][] {
  return rest.mock.calls.filter((call) => (call[1] as { method?: string })?.method === 'POST')
}

beforeEach(() => {
  guard.mockReturnValue({ ok: true, user: USER, token: 't' })
  configured.mockReturnValue(true)
  /* default: user BELUM punya paket — kondisi pembelian pertama */
  owned(null, false)
  charge.mockResolvedValue({
    ok: true,
    value: {
      state: 'pending',
      method: 'qris',
      transactionStatus: 'pending',
      fraudStatus: null,
      transactionId: 'tx-1',
      amount: HERO_PLAN.monthly,
      expiresAt: '2026-10-10T21:15:45.000Z',
      instructions: { channel: 'qris', qrImageUrl: 'https://qr/contoh', qrString: '00020101' },
    },
  })
  status.mockResolvedValue({ ok: false, reason: 'not-found', status: 404, message: 'belum ada' })
  cancel.mockResolvedValue(true)
  rest.mockImplementation(async (_path: string, options: { method?: string }) =>
    options?.method === 'POST'
      ? { ok: true, status: 201, data: null }
      : { ok: true, status: 200, data: [] },
  )
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/payment/charge', () => {
  it('401 tanpa sesi', async () => {
    guard.mockReturnValue({ ok: false, response: NextResponse.json({ error: 'x' }, { status: 401 }) })
    expect((await POST(request(OFFER))).status).toBe(401)
  })

  it('503 jujur saat Midtrans belum aktif — tanpa menyentuh DB', async () => {
    configured.mockReturnValue(false)
    const res = await POST(request(OFFER))
    expect(res.status).toBe(503)
    expect((await res.json()).reason).toBe('not-configured')
    expect(rest).not.toHaveBeenCalled()
    expect(charge).not.toHaveBeenCalled()
  })

  it('body bukan JSON → 400', async () => {
    const req = new NextRequest('http://localhost/api/payment/charge', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'bukan-json',
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('nominal bukan harga kanon → 422 (harga tidak dipercaya dari klien)', async () => {
    const res = await POST(request({ ...OFFER, amount: 1_000 }))
    expect(res.status).toBe(422)
    expect(charge).not.toHaveBeenCalled()
  })

  it('paket asing → 422', async () => {
    expect((await POST(request({ ...OFFER, planId: 'entah-apa' }))).status).toBe(422)
  })

  it('metode di luar katalog (mis. OVO/DANA/karangan) → 422 tanpa memanggil provider', async () => {
    expect((await POST(request({ ...OFFER, method: 'ovo' }))).status).toBe(422)
    expect((await POST(request({ ...OFFER, method: 'dana' }))).status).toBe(422)
    expect((await POST(request({ ...OFFER, method: 'qris-palsu' }))).status).toBe(422)
    expect(charge).not.toHaveBeenCalled()
  })

  it('menulis baris pending ATAS NAMA user, lalu menagih provider dengan instruksi server', async () => {
    const res = await POST(request({ ...OFFER, itemName: 'CatetInd Waras — Tahunan' }, 'http://localhost:3000'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.orderId).toMatch(/^subscribe-a1b2c3d4-/)
    expect(body.method).toBe('qris')
    expect(body.state).toBe('pending')
    expect(body.instructions).toMatchObject({ channel: 'qris' })

    expect(insertCalls()).toHaveLength(1)
    const [path, options] = insertCalls()[0] as [
      string,
      { body: { order_id: string; status: string; tier_name: string; billing_period: string } },
    ]
    expect(path).toBe('purchases')
    expect(options.body.status).toBe('pending')
    expect(options.body.order_id).toBe(body.orderId)
    expect(options.body.tier_name).toBe(HERO_PLAN.id)
    expect(options.body.billing_period).toBe('monthly')

    expect(charge).toHaveBeenCalledTimes(1)
    const [intent, method] = charge.mock.calls[0] as [
      { orderId: string; amount: number; notificationUrl?: string; finishUrl?: string },
      { id: string },
    ]
    expect(intent.orderId).toBe(body.orderId)
    expect(intent.amount).toBe(HERO_PLAN.monthly)
    expect(method.id).toBe('qris')
    expect(intent.notificationUrl).toBe('http://localhost:3000/api/payment/webhook')
    expect(intent.finishUrl).toContain('http://localhost:3000/checkout/selesai?order_id=')
  })

  it('nominal diskon referral (10%) diterima', async () => {
    const res = await POST(request({ ...OFFER, amount: applyReferralDiscount(HERO_PLAN.monthly) }))
    expect(res.status).toBe(200)
    expect(charge).toHaveBeenCalledTimes(1)
  })

  /* ── UPGRADE LIFETIME = SELISIH, DIHITUNG SERVER ───────────────────────────
     Aturan yang dikunci di sini: klien hanya mengirim TUJUAN. Nominalnya
     diturunkan server dari paket lifetime yang tersimpan, dan naik tier tidak
     boleh ditagih seharga penuh. */

  it('upgrade lifetime: nominal = SELISIH dari lifetime yang sudah dimiliki', async () => {
    owned('catet-aja', true, true)
    const target = PLANS[1]
    const res = await POST(
      request({
        purpose: 'upgrade',
        planId: target.id,
        period: 'lifetime',
        amount: target.lifetime - PLANS[0].lifetime,
        method: 'qris',
      }),
    )
    expect(res.status).toBe(200)
    const [intent] = charge.mock.calls[0] as [{ amount: number; ownedPlanId?: string }]
    expect(intent.amount).toBe(target.lifetime - PLANS[0].lifetime)
    expect(intent.ownedPlanId).toBe('catet-aja')
  })

  it('upgrade ke lifetime yang sudah dimiliki (atau lebih tinggi) → 403', async () => {
    owned('sultan', true, true)
    const res = await POST(
      request({
        purpose: 'upgrade',
        planId: PLANS[0].id,
        period: 'lifetime',
        amount: PLANS[0].lifetime,
        method: 'qris',
      }),
    )
    expect(res.status).toBe(403)
    expect((await res.json()).reason).toBe('not-needed')
    expect(charge).not.toHaveBeenCalled()
  })

  it('upgrade tanpa paket sama sekali → 403 (belum ada yang bisa ditambah)', async () => {
    owned(null, false)
    const res = await POST(
      request({
        purpose: 'upgrade',
        planId: PLANS[1].id,
        period: 'lifetime',
        amount: 20_000,
        method: 'qris',
      }),
    )
    expect(res.status).toBe(403)
    expect((await res.json()).reason).toBe('not-owned')
    expect(charge).not.toHaveBeenCalled()
  })

  it('upgrade lifetime dengan nominal harga PENUH → 422 (nominal tidak dipercaya)', async () => {
    owned('catet-aja', true, true)
    const target = PLANS[1]
    const res = await POST(
      request({
        purpose: 'upgrade',
        planId: target.id,
        period: 'lifetime',
        amount: target.lifetime,
        method: 'qris',
      }),
    )
    expect(res.status).toBe(422)
    expect(charge).not.toHaveBeenCalled()
  })

  /* ── PRABAYAR 30 HARI (rilis landing) ─────────────────────────────────────── */

  it('monthly menulis billing_period monthly + harga monthly penuh', async () => {
    owned('waras', true, false)
    const res = await POST(
      request({
        purpose: 'renew',
        planId: 'waras',
        period: 'monthly',
        amount: PLANS[1].monthly,
        method: 'qris',
      }),
    )
    expect(res.status).toBe(200)
    const [, options] = insertCalls()[0] as [string, { body: { billing_period: string } }]
    expect(options.body.billing_period).toBe('monthly')
    const [intent] = charge.mock.calls[0] as [{ amount: number }]
    expect(intent.amount).toBe(PLANS[1].monthly)
  })

  it('renew paket yang sama / turun tier monthly TIDAK ditolak guard upgrade', async () => {
    owned('sultan', true, false)
    const res = await POST(
      request({
        purpose: 'renew',
        planId: 'catet-aja',
        period: 'monthly',
        amount: PLANS[0].monthly,
        method: 'qris',
      }),
    )
    expect(res.status).toBe(200)
  })

  it('lifetime menulis billing_period lifetime + harga lifetime penuh dari monthly', async () => {
    owned('waras', true, false)
    const res = await POST(
      request({
        purpose: 'subscribe',
        planId: 'waras',
        period: 'lifetime',
        amount: PLANS[1].lifetime,
        method: 'qris',
      }),
    )
    expect(res.status).toBe(200)
    const [, options] = insertCalls()[0] as [string, { body: { billing_period: string } }]
    expect(options.body.billing_period).toBe('lifetime')
  })

  it('user lifetime tidak bisa membeli monthly → 403', async () => {
    owned('waras', true, true)
    const res = await POST(
      request({
        purpose: 'subscribe',
        planId: 'waras',
        period: 'monthly',
        amount: PLANS[1].monthly,
        method: 'qris',
      }),
    )
    expect(res.status).toBe(403)
    expect((await res.json()).reason).toBe('lifetime-active')
    expect(charge).not.toHaveBeenCalled()
  })

  it('periode tidak dikenal → 422, provider tidak dipanggil', async () => {
    owned(null, false)
    const res = await POST(request({ ...OFFER, period: 'annual' }))
    expect(res.status).toBe(422)
    expect(charge).not.toHaveBeenCalled()
  })

  it('gagal mencatat baris → TIDAK menagih provider (jangan ambil uang tanpa catatan)', async () => {
    rest.mockImplementation(async (_path: string, options: { method?: string }) =>
      options?.method === 'POST'
        ? { ok: false, status: 403, data: null, error: 'ditolak RLS' }
        : { ok: true, status: 200, data: [] },
    )
    const res = await POST(request(OFFER))
    expect(res.status).toBe(502)
    expect(charge).not.toHaveBeenCalled()
  })

  it('Supabase belum dikonfigurasi → 503, bukan tagihan tanpa catatan', async () => {
    rest.mockImplementation(async () => ({ ok: false, status: 0, data: null, error: 'belum dikonfigurasi' }))
    const res = await POST(request(OFFER))
    expect(res.status).toBe(503)
    expect(charge).not.toHaveBeenCalled()
  })

  it('pakai ulang order pending yang cocok: tanpa insert & tanpa tagih ulang', async () => {
    rest.mockImplementation(async (_path: string, options: { method?: string }) =>
      options?.method === 'POST'
        ? { ok: true, status: 201, data: null }
        : { ok: true, status: 200, data: [{ order_id: 'subscribe-a1b2c3d4-1' }] },
    )
    status.mockResolvedValue(PENDING_STATUS)

    const res = await POST(request(OFFER))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.orderId).toBe('subscribe-a1b2c3d4-1')
    expect(body.reused).toBe(true)
    expect(body.instructions).toMatchObject({ channel: 'qris' })
    expect(insertCalls()).toHaveLength(0)
    expect(charge).not.toHaveBeenCalled()
    expect(cancel).not.toHaveBeenCalled()
  })

  it('order pending yang sudah DIBAYAR → dilaporkan settled, tanpa tagihan kedua', async () => {
    rest.mockImplementation(async (_path: string, options: { method?: string }) =>
      options?.method === 'POST'
        ? { ok: true, status: 201, data: null }
        : { ok: true, status: 200, data: [{ order_id: 'subscribe-a1b2c3d4-1' }] },
    )
    status.mockResolvedValue({
      ok: true,
      value: { ...PENDING_STATUS.value, state: 'settled', instructions: null },
    })

    const res = await POST(request(OFFER))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.state).toBe('settled')
    expect(body.instructions).toBeNull()
    expect(body.orderId).toBe('subscribe-a1b2c3d4-1')
    expect(insertCalls()).toHaveLength(0)
    expect(charge).not.toHaveBeenCalled()
    expect(cancel).not.toHaveBeenCalled()
  })

  it('instruksi tidak bisa dirender ulang (GoPay) → order lama dibatalkan lalu dibuat baru', async () => {
    rest.mockImplementation(async (_path: string, options: { method?: string }) =>
      options?.method === 'POST'
        ? { ok: true, status: 201, data: null }
        : { ok: true, status: 200, data: [{ order_id: 'subscribe-a1b2c3d4-1' }] },
    )
    status.mockResolvedValue({
      ok: true,
      value: { ...PENDING_STATUS.value, paymentType: 'gopay', method: 'gopay', instructions: null },
    })

    const res = await POST(request({ ...OFFER, method: 'gopay' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(cancel).toHaveBeenCalledWith('subscribe-a1b2c3d4-1')
    expect(insertCalls()).toHaveLength(1)
    expect(charge).toHaveBeenCalledTimes(1)
    expect(body.orderId).not.toBe('subscribe-a1b2c3d4-1')
  })

  it('provider menolak → status & pesannya diteruskan apa adanya', async () => {
    charge.mockResolvedValue({ ok: false, reason: 'provider', status: 502, message: 'conflict' })
    const res = await POST(request(OFFER))
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toBe('conflict')
  })
})

/* ── TOP UP TOKEN AI (paket 85 · TUGAS 3) ───────────────────────────────────
   Harga add-on hidup di lib/ai-quota.ts; server MEMBACA dari sana. Yang
   dikunci di sini: nominal salah → 422, nominal kanon → 200 dengan
   expected_amount/token yang benar, dan token tidak dijual ke paket tanpa
   kuota (Catet Aja) atau tanpa batas (Sultan). */
describe('POST /api/payment/charge · purpose topup', () => {
  const SEDANG_PKG = AI_ADDON_PACKAGES.find((pkg) => pkg.id === 'sedang')!
  const TOPUP = {
    purpose: 'topup',
    packageId: SEDANG_PKG.id,
    amount: SEDANG_PKG.price,
    method: 'qris',
  }

  it('nominal salah → 422, provider tidak dipanggil', async () => {
    owned('waras')
    const res = await POST(request({ ...TOPUP, amount: 1_000 }))
    expect(res.status).toBe(422)
    expect(charge).not.toHaveBeenCalled()
  })

  it('paket token asing → 422', async () => {
    owned('waras')
    expect((await POST(request({ ...TOPUP, packageId: 'entah-apa' }))).status).toBe(422)
  })

  it('topup tidak boleh menitipkan planId → 422', async () => {
    owned('waras')
    expect((await POST(request({ ...TOPUP, planId: HERO_PLAN.id }))).status).toBe(422)
  })

  it('nominal kanon → 200 + baris purchases menyimpan expected_amount & token', async () => {
    owned('waras')
    const res = await POST(request(TOPUP))
    expect(res.status).toBe(200)
    expect(charge).toHaveBeenCalledTimes(1)

    const [path, options] = insertCalls()[0] as [
      string,
      { body: { purpose: string; expected_amount: number; addon_tokens: number; addon_package_id: string; tier_name: unknown } },
    ]
    expect(path).toBe('purchases')
    expect(options.body.purpose).toBe('topup')
    expect(options.body.expected_amount).toBe(SEDANG_PKG.price)
    expect(options.body.addon_package_id).toBe(SEDANG_PKG.id)
    expect(options.body.addon_tokens).toBe(SEDANG_PKG.tokens)
    expect(options.body.tier_name).toBeNull()
  })

  it('nominal versi diskon teman diterima', async () => {
    owned('waras')
    const res = await POST(request({ ...TOPUP, amount: applyReferralDiscount(SEDANG_PKG.price) }))
    expect(res.status).toBe(200)
  })

  it('paket tanpa kuota (Catet Aja) & tanpa batas (Sultan) tidak boleh top up → 403', async () => {
    owned('catet-aja')
    expect((await POST(request(TOPUP))).status).toBe(403)
    owned('sultan')
    expect((await POST(request(TOPUP))).status).toBe(403)
    expect(charge).not.toHaveBeenCalled()
  })

  it('tanpa backend (demo) paket tidak bisa diperiksa → dilewatkan', async () => {
    readPlan.mockResolvedValue({ configured: false, planId: null, purchasedAt: null, active: false, failed: false })
    expect((await POST(request(TOPUP))).status).toBe(200)
  })
})
