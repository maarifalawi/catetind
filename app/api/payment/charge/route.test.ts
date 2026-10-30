import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/session', () => ({ requireUser: vi.fn() }))
/* `isPaymentMethodActive` di-mock `true` supaya test di bawah menguji MEKANIKA
   tagihan (nominal, urutan tulis DB, idempotensi) — bukan status aktivasi
   merchant, yang diuji terpisah di `lib/payments/methods.test.ts` dan di satu
   kasus khusus di bawah. */
vi.mock('@/lib/payments/methods', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/payments/methods')>()
  return { ...actual, isPaymentMethodActive: vi.fn(() => true) }
})
vi.mock('@/lib/payments/midtrans', () => ({
  midtransConfigured: vi.fn(),
  createSnapCharge: vi.fn(),
  fetchTransactionStatus: vi.fn(),
  cancelTransaction: vi.fn(),
}))
vi.mock('@/lib/supabase/rest', () => ({ restFetch: vi.fn(), restRpc: vi.fn() }))
vi.mock('@/lib/subscription/plan', () => ({ readCallerPlan: vi.fn() }))

import { POST } from './route'
import { requireUser } from '@/lib/session'
import {
  cancelTransaction,
  createSnapCharge,
  fetchTransactionStatus,
  midtransConfigured,
} from '@/lib/payments/midtrans'
import { restFetch, restRpc } from '@/lib/supabase/rest'
import { isPaymentMethodActive } from '@/lib/payments/methods'
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
const charge = createSnapCharge as unknown as Mock
const status = fetchTransactionStatus as unknown as Mock
const cancel = cancelTransaction as unknown as Mock
const rest = restFetch as unknown as Mock
const rpc = restRpc as unknown as Mock
/** status aktivasi kanal di merchant produksi (default di-mock aktif) */
const activeMethod = isPaymentMethodActive as unknown as Mock

const USER = { id: 'a1b2c3d4-aaaa-bbbb-cccc-dddddddddddd', email: 'a@b.c', name: 'Rina' }

const OFFER = {
  purpose: 'subscribe',
  planId: HERO_PLAN.id,
  period: 'lifetime',
  amount: HERO_PLAN.lifetime,
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
    amount: HERO_PLAN.lifetime,
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
  /* default test: kanal dianggap sudah aktif di merchant produksi; kasus
     "belum aktif" diuji eksplisit di bawah. */
  activeMethod.mockReturnValue(true)
  /* default: user BELUM punya paket — kondisi pembelian pertama */
  owned(null, false)
  charge.mockResolvedValue({
    ok: true,
    value: {
      state: 'pending',
      method: 'qris',
      token: 'snap-token-1',
      redirectUrl: 'https://app.sandbox.midtrans.com/snap/v1/transactions/snap-token-1',
      expiresAt: '2026-10-10T21:15:45.000Z',
    },
  })
  status.mockResolvedValue({ ok: false, reason: 'not-found', status: 404, message: 'belum ada' })
  cancel.mockResolvedValue(true)
  rpc.mockImplementation(async (fn: string) => {
    if (fn === 'validate_referral_code') return { ok: true, status: 200, data: 'referrer-uuid' }
    if (fn === 'record_referral') return { ok: true, status: 200, data: true }
    return { ok: true, status: 200, data: null }
  })
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

  /* Audit pra-rilis 30 Okt 2026: seluruh kanal produksi membalas
     `402 Payment channel is not activated`. Route menolak lebih awal supaya
     tidak ada baris `purchases` pending yang lahir untuk tagihan yang mustahil
     dibayar. */
  it('metode yang belum aktif di merchant produksi → 503 tanpa menulis DB & tanpa memanggil provider', async () => {
    activeMethod.mockReturnValue(false)
    const res = await POST(request(OFFER))
    expect(res.status).toBe(503)
    const body = (await res.json()) as { ok: boolean; reason: string }
    expect(body.ok).toBe(false)
    expect(body.reason).toBe('method-inactive')
    expect(insertCalls()).toHaveLength(0)
    expect(charge).not.toHaveBeenCalled()
  })

  it('menulis baris pending ATAS NAMA user, lalu membuat token Snap', async () => {
    const res = await POST(request({ ...OFFER, itemName: 'CatetInd Waras — Tahunan' }, 'http://localhost:3000'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.orderId).toMatch(/^subscribe-a1b2c3d4-/)
    expect(body.method).toBe('qris')
    /* Snap: yang dikembalikan adalah halaman pembayaran, bukan instruksi QR. */
    expect(body.redirectUrl).toContain('/snap/v1/transactions/')
    expect(body.token).toBe('snap-token-1')
    expect(body.instructions).toBeNull()

    expect(insertCalls()).toHaveLength(1)
    const [path, options] = insertCalls()[0] as [
      string,
      { body: { order_id: string; status: string; tier_name: string; billing_period: string } },
    ]
    expect(path).toBe('purchases')
    expect(options.body.status).toBe('pending')
    expect(options.body.order_id).toBe(body.orderId)
    expect(options.body.tier_name).toBe(HERO_PLAN.id)
    expect(options.body.billing_period).toBe('lifetime')

    expect(charge).toHaveBeenCalledTimes(1)
    const [intent, method] = charge.mock.calls[0] as [
      { orderId: string; amount: number; notificationUrl?: string; finishUrl?: string },
      { id: string },
    ]
    expect(intent.orderId).toBe(body.orderId)
    expect(intent.amount).toBe(HERO_PLAN.lifetime)
    expect(method.id).toBe('qris')
    expect(intent.notificationUrl).toBe('http://localhost:3000/api/payment/webhook')
    expect(intent.finishUrl).toContain('http://localhost:3000/checkout/selesai?order_id=')
  })

  const DISCOUNTED = applyReferralDiscount(HERO_PLAN.lifetime)
  const REFERRAL = 'RINA-X7K'

  it('nominal diskon TANPA kode → 422 (diskon tidak boleh hanya dari angka)', async () => {
    const res = await POST(request({ ...OFFER, amount: DISCOUNTED }))
    expect(res.status).toBe(422)
    expect(charge).not.toHaveBeenCalled()
  })

  it('kode yang bentuknya tidak wajar → 422 tanpa menyentuh database', async () => {
    const res = await POST(request({ ...OFFER, amount: DISCOUNTED, code: 'x' }))
    expect(res.status).toBe(422)
    expect(rpc).not.toHaveBeenCalled()
    expect(charge).not.toHaveBeenCalled()
  })

  it('kode tidak ada di database → 422 (diskon tidak dipakai)', async () => {
    rpc.mockResolvedValueOnce({ ok: true, status: 200, data: null })
    const res = await POST(request({ ...OFFER, amount: DISCOUNTED, code: REFERRAL }))
    expect(res.status).toBe(422)
    expect(charge).not.toHaveBeenCalled()
    expect(insertCalls()).toHaveLength(0)
  })

  it('kode milik akun sendiri → 422 (tidak boleh mengajak diri sendiri)', async () => {
    rpc.mockResolvedValueOnce({ ok: true, status: 200, data: USER.id })
    const res = await POST(request({ ...OFFER, amount: DISCOUNTED, code: REFERRAL }))
    expect(res.status).toBe(422)
    expect(charge).not.toHaveBeenCalled()
  })

  it('diskon dengan kode sah → expected_amount = nominal DIBayar & kode tercatat', async () => {
    const res = await POST(request({ ...OFFER, amount: DISCOUNTED, code: REFERRAL }))
    expect(res.status).toBe(200)

    const [intent] = charge.mock.calls[0] as [{ amount: number }]
    expect(intent.amount).toBe(DISCOUNTED)

    const [, options] = insertCalls()[0] as [
      string,
      { body: { expected_amount: number; referral_code: string } },
    ]
    /* yang disimpan = nominal yang benar-benar ditagih; kalau harga penuh,
       webhook akan menandainya amount_mismatch. */
    expect(options.body.expected_amount).toBe(DISCOUNTED)
    expect(options.body.referral_code).toBe(REFERRAL)

    expect(rpc).toHaveBeenNthCalledWith(1, 'validate_referral_code', { p_code: REFERRAL }, 't')
    expect(rpc).toHaveBeenNthCalledWith(
      2,
      'record_referral',
      { p_code: REFERRAL, p_referred_email: USER.email },
      't',
    )
  })

  it('relasi referral gagal dicatat → 422, tagihan tidak dibuat', async () => {
    rpc.mockImplementation(async (fn: string) =>
      fn === 'validate_referral_code'
        ? { ok: true, status: 200, data: 'referrer-uuid' }
        : { ok: true, status: 200, data: false },
    )
    const res = await POST(request({ ...OFFER, amount: DISCOUNTED, code: REFERRAL }))
    expect(res.status).toBe(422)
    expect(charge).not.toHaveBeenCalled()
    expect(insertCalls()).toHaveLength(0)
  })

  it('pending lama sudah SETTLED → tidak dibatalkan & tidak menagih ulang walau kode berubah', async () => {
    rest.mockImplementation(async (_path: string, options: { method?: string }) =>
      options?.method === 'POST'
        ? { ok: true, status: 201, data: null }
        : {
            ok: true,
            status: 200,
            data: [
              {
                order_id: 'subscribe-a1b2c3d4-1',
                expected_amount: HERO_PLAN.lifetime,
                referral_code: null,
              },
            ],
          },
    )
    status.mockResolvedValue({
      ok: true,
      value: { ...PENDING_STATUS.value, state: 'settled', instructions: null },
    })

    const res = await POST(
      request({ ...OFFER, amount: applyReferralDiscount(HERO_PLAN.lifetime), code: 'RINA-X7K' }),
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.state).toBe('settled')
    expect(body.orderId).toBe('subscribe-a1b2c3d4-1')
    /* nominal yang dilaporkan = nominal tagihan lama yang sudah dibayar */
    expect(body.amount).toBe(HERO_PLAN.lifetime)
    expect(cancel).not.toHaveBeenCalled()
    expect(charge).not.toHaveBeenCalled()
    expect(insertCalls()).toHaveLength(0)
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

  /* ── SATU PERIODE: LIFETIME ───────────────────────────────────────────────── */

  it('monthly sudah tidak dijual → 422, provider tidak dipanggil', async () => {
    owned('waras', true, false)
    const res = await POST(
      request({
        purpose: 'subscribe',
        planId: 'waras',
        period: 'monthly',
        amount: PLANS[1].monthly,
        method: 'qris',
      }),
    )
    expect(res.status).toBe(422)
    expect((await res.json()).reason).toBe('invalid')
    expect(charge).not.toHaveBeenCalled()
  })

  it('purpose renew (perpanjangan 30 hari) ditolak 422', async () => {
    owned('sultan', true, false)
    const res = await POST(
      request({
        purpose: 'renew',
        planId: 'catet-aja',
        period: 'lifetime',
        amount: PLANS[0].lifetime,
        method: 'qris',
      }),
    )
    expect(res.status).toBe(422)
    expect(charge).not.toHaveBeenCalled()
  })

  it('lifetime menulis billing_period lifetime + harga lifetime penuh dari paket lama', async () => {
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

  it('user lifetime tidak bisa membeli monthly → 422', async () => {
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
    expect(res.status).toBe(422)
    expect((await res.json()).reason).toBe('invalid')
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

  it('pakai ulang order pending yang cocok: TOKEN SNAP BARU, tanpa insert & tanpa tagihan kedua', async () => {
    rest.mockImplementation(async (_path: string, options: { method?: string }) =>
      options?.method === 'POST'
        ? { ok: true, status: 201, data: null }
        : { ok: true, status: 200, data: [{ order_id: 'subscribe-a1b2c3d4-1', expected_amount: HERO_PLAN.lifetime, referral_code: null }] },
    )
    status.mockResolvedValue(PENDING_STATUS)

    const res = await POST(request(OFFER))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.orderId).toBe('subscribe-a1b2c3d4-1')
    expect(body.reused).toBe(true)
    expect(body.redirectUrl).toContain('/snap/v1/transactions/')
    expect(insertCalls()).toHaveLength(0)
    /* Snap: `order_id` yang sama boleh di-token ulang (diuji 201 di produksi),
       jadi user mendapat halaman pembayaran baru tanpa baris purchases kedua. */
    expect(charge).toHaveBeenCalledTimes(1)
    expect(cancel).not.toHaveBeenCalled()
  })

  it('order pending yang sudah DIBAYAR → dilaporkan settled, tanpa tagihan kedua', async () => {
    rest.mockImplementation(async (_path: string, options: { method?: string }) =>
      options?.method === 'POST'
        ? { ok: true, status: 201, data: null }
        : { ok: true, status: 200, data: [{ order_id: 'subscribe-a1b2c3d4-1', expected_amount: HERO_PLAN.lifetime, referral_code: null }] },
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

  it('metode lain pada order yang masih pending → token Snap baru untuk order yang SAMA', async () => {
    rest.mockImplementation(async (_path: string, options: { method?: string }) =>
      options?.method === 'POST'
        ? { ok: true, status: 201, data: null }
        : { ok: true, status: 200, data: [{ order_id: 'subscribe-a1b2c3d4-1', expected_amount: HERO_PLAN.lifetime, referral_code: null }] },
    )
    status.mockResolvedValue({
      ok: true,
      value: { ...PENDING_STATUS.value, paymentType: 'gopay', method: 'gopay', instructions: null },
    })

    const res = await POST(request({ ...OFFER, method: 'gopay' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    /* Snap tidak perlu membatalkan order lama: token baru dibuat untuk order
       yang sama, jadi webhook tetap mengenali satu baris `purchases`. */
    expect(cancel).not.toHaveBeenCalled()
    expect(insertCalls()).toHaveLength(0)
    expect(charge).toHaveBeenCalledTimes(1)
    expect(body.orderId).toBe('subscribe-a1b2c3d4-1')
    expect(body.method).toBe('gopay')
  })

  it('pending harga PENUH tidak dipakai ulang untuk pembelian diskon → dibatalkan', async () => {
    rest.mockImplementation(async (_path: string, options: { method?: string }) =>
      options?.method === 'POST'
        ? { ok: true, status: 201, data: null }
        : {
            ok: true,
            status: 200,
            data: [
              {
                order_id: 'subscribe-a1b2c3d4-1',
                expected_amount: HERO_PLAN.lifetime,
                referral_code: null,
              },
            ],
          },
    )
    const discounted = applyReferralDiscount(HERO_PLAN.lifetime)

    const res = await POST(request({ ...OFFER, amount: discounted, code: 'RINA-X7K' }))
    expect(res.status).toBe(200)
    /* tagihan penuh lama tidak boleh hidup berdampingan dengan tagihan diskon */
    expect(cancel).toHaveBeenCalledWith('subscribe-a1b2c3d4-1')

    const [, options] = insertCalls()[0] as [
      string,
      { body: { expected_amount: number; referral_code: string } },
    ]
    expect(options.body.expected_amount).toBe(discounted)
    expect(options.body.referral_code).toBe('RINA-X7K')
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

  it('nominal diskon top-up TANPA kode → 422', async () => {
    owned('waras')
    const res = await POST(request({ ...TOPUP, amount: applyReferralDiscount(SEDANG_PKG.price) }))
    expect(res.status).toBe(422)
    expect(charge).not.toHaveBeenCalled()
  })

  it('nominal versi diskon teman + kode sah diterima & expected_amount = nominal dibayar', async () => {
    owned('waras')
    const discounted = applyReferralDiscount(SEDANG_PKG.price)
    const res = await POST(request({ ...TOPUP, amount: discounted, code: 'RINA-X7K' }))
    expect(res.status).toBe(200)

    const [, options] = insertCalls()[0] as [
      string,
      { body: { expected_amount: number; referral_code: string } },
    ]
    expect(options.body.expected_amount).toBe(discounted)
    expect(options.body.referral_code).toBe('RINA-X7K')
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
