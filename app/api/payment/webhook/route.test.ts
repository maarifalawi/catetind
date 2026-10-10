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
}))

vi.mock('@/lib/supabase/config', () => ({
  supabaseServiceKey: () => probe.serviceKey.value,
}))

vi.mock('@/lib/supabase/rest', () => ({
  restRpc: (fn: string, args: Record<string, unknown>, token: string, apiKey?: string) =>
    probe.rpc.value
      ? probe.rpc.value(fn, args, token, apiKey)
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
})
