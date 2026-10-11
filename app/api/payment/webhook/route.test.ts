import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createHash } from 'node:crypto'

/* ── Test webhook Midtrans (paket 85) ─────────────────────────────────────────
   Yang dikunci BUKAN "route membalas 200", melainkan URUTAN keputusannya:
     · tanpa kunci → 503 (belum ada yang bisa diverifikasi);
     · tanda tangan salah → 403 (klaim pembayaran tidak dipercaya);
     · tanda tangan sah → barulah pemenuhan dicoba, dan balasannya jujur
       (`handled:false` saat pemenuhan belum bisa dicatat).

   Pemenuhan dipanggil lewat RPC `catetind_fulfill_purchase` dengan KUNCI PERAN
   SERVER — jadi ia di-stub di sini, bukan dijalankan sungguhan. */

const probe = vi.hoisted(() => ({
  serviceKey: { value: '' },
  rpc: {
    value: null as null | ((fn: string, args: Record<string, unknown>, token: string, apiKey?: string) => unknown),
  },
  fetch: {
    value: null as null | ((path: string, options?: { method?: string; body?: unknown }) => unknown),
  },
}))

vi.mock('@/lib/supabase/config', () => ({
  supabaseServiceKey: () => probe.serviceKey.value,
}))

vi.mock('@/lib/supabase/rest', () => ({
  /* reward referral memanggil restConfigured() dulu; anggap backend siap */
  restConfigured: () => true,
  restRpc: (fn: string, args: Record<string, unknown>, token: string, apiKey?: string) =>
    probe.rpc.value
      ? probe.rpc.value(fn, args, token, apiKey)
      : { ok: false, status: 0, data: null, error: 'belum di-stub' },
  restFetch: (path: string, options?: { method?: string; body?: unknown }) =>
    probe.fetch.value
      ? probe.fetch.value(path, options)
      : { ok: false, status: 0, data: null, error: 'belum di-stub' },
}))

import { POST } from './route'

const KEY = 'SB-Mid-server-uji'
const ORDER = 'subscribe-abc123-1700000000000'
const CODE = '200'
const GROSS = '129000.00'

/** sha512(order_id + status_code + gross_amount + serverKey) — sama dengan Midtrans */
function signature(orderId = ORDER, statusCode = CODE, gross = GROSS, key = KEY): string {
  return createHash('sha512').update(`${orderId}${statusCode}${gross}${key}`).digest('hex')
}

function notify(overrides: Record<string, unknown> = {}): NextRequest {
  return new NextRequest('http://localhost/api/payment/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      order_id: ORDER,
      status_code: CODE,
      gross_amount: GROSS,
      transaction_status: 'settlement',
      payment_type: 'qris',
      transaction_id: 'tx-1',
      signature_key: signature(),
      ...overrides,
    }),
  })
}

beforeEach(() => {
  process.env.MIDTRANS_SERVER_KEY = KEY
  probe.serviceKey.value = ''
  probe.rpc.value = null
  probe.fetch.value = null
})

afterEach(() => {
  vi.clearAllMocks()
  delete process.env.MIDTRANS_SERVER_KEY
})

describe('POST /api/payment/webhook', () => {
  it('503 tanpa MIDTRANS_SERVER_KEY — belum ada yang bisa diverifikasi', async () => {
    delete process.env.MIDTRANS_SERVER_KEY
    const res = await POST(notify())
    expect(res.status).toBe(503)
  })

  it('403 saat tanda tangan tidak cocok — klaim pembayaran tidak dipercaya', async () => {
    const res = await POST(notify({ signature_key: 'tanda-tangan-palsu' }))
    expect(res.status).toBe(403)
  })

  it('tanda tangan sah tapi kunci peran server kosong → handled:false (jujur)', async () => {
    const res = await POST(notify())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.handled).toBe(false)
  })

  it('tanda tangan sah + kunci server ada → pemenuhan dicatat (handled:true)', async () => {
    probe.serviceKey.value = 'service-key-palsu'
    const calls: unknown[] = []
    probe.rpc.value = (fn, args, token, apiKey) => {
      calls.push([fn, args, token, apiKey])
      return {
        ok: true,
        status: 200,
        data: [
          {
            claimed_slot: 1,
            claimed_price: 129000,
            claimed_tier: 'founding_member',
            already_processed: false,
          },
        ],
      }
    }

    const res = await POST(notify())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.handled).toBe(true)
    expect(body.settled).toBe(true)
    expect(body.slot).toBe(1)

    const [fn, args, token, apiKey] = calls[0] as [string, Record<string, unknown>, string, string]
    expect(fn).toBe('catetind_fulfill_purchase')
    expect(token).toBe('service-key-palsu')
    expect(apiKey).toBe('service-key-palsu')
    expect(args.p_order_id).toBe(ORDER)
    expect(args.p_amount).toBe(129000)
    expect(args.p_status).toBe('settlement')
  })

  it('notifikasi ulang (already_processed) tetap sah dan tidak menambah slot', async () => {
    probe.serviceKey.value = 'service-key-palsu'
    probe.rpc.value = () => ({
      ok: true,
      status: 200,
      data: [
        {
          claimed_slot: 1,
          claimed_price: 129000,
          claimed_tier: 'founding_member',
          already_processed: true,
        },
      ],
    })
    const res = await POST(notify())
    const body = await res.json()
    expect(body.handled).toBe(true)
    expect(body.alreadyProcessed).toBe(true)
  })

  it('order tidak dikenal → handled:false (tidak minta Midtrans mengulang selamanya)', async () => {
    probe.serviceKey.value = 'service-key-palsu'
    probe.rpc.value = () => ({ ok: false, status: 400, data: null, error: 'order tidak ditemukan' })
    const res = await POST(notify())
    expect(res.status).toBe(200)
    expect((await res.json()).handled).toBe(false)
  })

  it('kegagalan DB → 502 supaya Midtrans mengulang (fungsi idempoten)', async () => {
    probe.serviceKey.value = 'service-key-palsu'
    probe.rpc.value = () => ({ ok: false, status: 500, data: null, error: 'db down' })
    const res = await POST(notify())
    expect(res.status).toBe(502)
  })

  it('nominal notifikasi BEDA dari expected_amount → TIDAK dipenuhi, 200 ok:false', async () => {
    probe.serviceKey.value = 'service-key-palsu'
    let fulfilled = false
    probe.rpc.value = () => {
      fulfilled = true
      return { ok: true, status: 200, data: [{ claimed_slot: null, claimed_price: 1000, claimed_tier: 'waras', already_processed: false }] }
    }
    const patches: { path: string; body?: unknown }[] = []
    probe.fetch.value = (path, options) => {
      if (options?.method === 'PATCH') {
        patches.push({ path, body: options.body })
        return { ok: true, status: 204, data: null }
      }
      return { ok: true, status: 200, data: [{ expected_amount: 129000, status: 'pending' }] }
    }

    /* notifikasi mengaku membayar Rp1.000 padahal seharusnya Rp129.000 */
    const res = await POST(notify({ gross_amount: '1000.00', signature_key: signature(ORDER, CODE, '1000.00') }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.reason).toBe('amount-mismatch')
    /* pembelian TIDAK dipenuhi & statusnya dicatat */
    expect(fulfilled).toBe(false)
    expect(patches).toHaveLength(1)
    expect((patches[0].body as { status?: string }).status).toBe('amount_mismatch')
  })

  it('nominal notifikasi PAS → tetap dipenuhi', async () => {
    probe.serviceKey.value = 'service-key-palsu'
    let fulfilled = false
    probe.rpc.value = () => {
      fulfilled = true
      return { ok: true, status: 200, data: [{ claimed_slot: null, claimed_price: 129000, claimed_tier: 'waras', already_processed: false }] }
    }
    probe.fetch.value = () => ({ ok: true, status: 200, data: [{ expected_amount: 129000, status: 'pending' }] })

    const res = await POST(notify())
    expect(res.status).toBe(200)
    expect((await res.json()).handled).toBe(true)
    expect(fulfilled).toBe(true)
  })

  /* ── REWARD REFERRAL (paket 85 · TUGAS 6) ────────────────────────────────
     Reward diberikan dari WEBHOOK setelah pembelian paket dipenuhi, ke
     PENGUNDANG (bukan pembeli), idempoten per order_id. Top-up token TIDAK
     memberi reward karena bukan pembelian paket. */
  function rewardFetch(purpose: string, captured: { path: string; body?: unknown }[]) {
    probe.fetch.value = (path, options) => {
      if (path.startsWith('referral_rewards')) {
        captured.push({ path, body: options?.body })
        return { ok: true, status: 201, data: [{ id: 'reward-1' }] }
      }
      if (path.startsWith('referrals?')) {
        return { ok: true, status: 200, data: [{ id: 'rel-1', referrer_user_id: 'referrer-1' }] }
      }
      /* purchases: dipakai untuk probe nominal + pembacaan user_id/purpose */
      return {
        ok: true,
        status: 200,
        data: [{ expected_amount: 129000, status: 'pending', user_id: 'buyer-1', purpose }],
      }
    }
  }

  it('pembelian paket dibayar → reward Token AI dicatat untuk PENGUNDANG', async () => {
    probe.serviceKey.value = 'service-key-palsu'
    probe.rpc.value = () => ({
      ok: true,
      status: 200,
      data: [{ claimed_slot: null, claimed_price: 129000, claimed_tier: 'waras', already_processed: false }],
    })
    const inserts: { path: string; body?: unknown }[] = []
    rewardFetch('subscribe', inserts)

    const res = await POST(notify())
    expect(res.status).toBe(200)
    expect((await res.json()).settled).toBe(true)

    expect(inserts).toHaveLength(1)
    const body = inserts[0].body as {
      referrer_user_id?: string
      reward_kind?: string
      reward_amount?: number
      order_id?: string
    }
    expect(body.referrer_user_id).toBe('referrer-1')
    expect(body.reward_kind).toBe('tokens')
    expect(body.reward_amount).toBeGreaterThan(0)
    expect(body.order_id).toBe(ORDER)
  })

  it('top-up token TIDAK memberi reward referral', async () => {
    probe.serviceKey.value = 'service-key-palsu'
    probe.rpc.value = () => ({
      ok: true,
      status: 200,
      data: [{ claimed_slot: null, claimed_price: 29000, claimed_tier: null, already_processed: false }],
    })
    const inserts: { path: string; body?: unknown }[] = []
    rewardFetch('topup', inserts)

    const res = await POST(notify({ gross_amount: '129000.00' }))
    expect(res.status).toBe(200)
    expect(inserts).toHaveLength(0)
  })
})
