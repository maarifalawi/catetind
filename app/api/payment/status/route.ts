import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { paymentMethod } from '@/lib/payments/methods'
import { fetchTransactionStatus, midtransConfigured } from '@/lib/payments/midtrans'
import type { PaymentInstructions, PaymentState } from '@/lib/payments/types'
import { restFetch } from '@/lib/supabase/rest'

/* ── GET /api/payment/status?order_id=…&method=… (paket 83) ──────────────────
   Yang ditanyakan UI tiap ±4 detik saat kartu pembayaran terbuka. Semua
   panggilan ke Midtrans (server key!) terjadi di sini — browser tidak pernah
   memegang kuncinya.

   Kepemilikan order diperiksa lewat DATABASE: baris `purchases` dibaca dengan
   token PEMANGGIL, jadi RLS `user_id = auth.uid()` yang menyaring. Order milik
   orang lain karena itu tampak "tidak ada" (404), bukan 403 yang membocorkan
   keberadaannya.

   Status yang dibalas tetap TAMPILAN: yang benar-benar mengaktifkan langganan
   hanya webhook + RPC pemenuhan. `order.status` (status baris DB) ikut dibalas
   supaya UI bisa membedakan "dibayar, langganan sedang diaktifkan" dari
   "langganan sudah tercatat aktif". */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface PurchaseRow {
  order_id?: string
  status?: string
  tier_name?: string | null
  billing_period?: string | null
  price_paid?: number | null
  paid_at?: string | null
}

export async function GET(req: NextRequest) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response

  if (!midtransConfigured()) {
    return NextResponse.json(
      { ok: false, reason: 'not-configured', error: 'Pembayaran belum aktif — menunggu Midtrans.' },
      { status: 503 },
    )
  }

  const params = new URL(req.url).searchParams
  const orderId = params.get('order_id')?.trim() ?? ''
  if (!orderId) {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'order_id wajib diisi.' },
      { status: 422 },
    )
  }

  /* `method` opsional: dipakai untuk merender ulang instruksi (VA/QRIS/…) dari
     status. Kalau tidak dikirim, UI tetap dapat statusnya — hanya instruksinya
     yang tidak digambar ulang. */
  const method = paymentMethod(params.get('method'))

  const query = new URLSearchParams({
    select: 'order_id,status,tier_name,billing_period,price_paid,paid_at',
    order_id: `eq.${orderId}`,
    limit: '1',
  })
  const found = await restFetch<PurchaseRow[]>(`purchases?${query.toString()}`, {
    accessToken: auth.token,
  })
  if (!found.ok) {
    return NextResponse.json(
      { ok: false, error: 'Status pembayaran tidak bisa dibaca.' },
      { status: 502 },
    )
  }

  const purchase = Array.isArray(found.data) ? found.data[0] : undefined
  if (!purchase) {
    return NextResponse.json(
      { ok: false, error: 'Order ini tidak ada di akunmu.' },
      { status: 404 },
    )
  }

  const order = {
    status: purchase.status ?? null,
    tierName: purchase.tier_name ?? null,
    billingPeriod: purchase.billing_period ?? null,
    pricePaid: purchase.price_paid ?? null,
    paidAt: purchase.paid_at ?? null,
  }

  const provider = await fetchTransactionStatus(orderId, method)

  /* Provider belum punya transaksinya (mis. `/v2/charge` gagal di tengah jalan):
     katakan apa adanya — jangan mengarang status. */
  if (!provider.ok) {
    if (provider.reason !== 'not-found') {
      return NextResponse.json(
        { ok: false, reason: provider.reason, error: provider.message },
        { status: provider.status },
      )
    }
    return NextResponse.json({
      ok: true,
      orderId,
      state: (purchase.status === 'settlement' ? 'settled' : 'unknown') satisfies PaymentState,
      provider: { state: 'unknown', transactionStatus: null, transactionId: null, expiresAt: null },
      method: method?.id ?? null,
      instructions: null,
      order,
    })
  }

  const detail = provider.value
  const state: PaymentState = purchase.status === 'settlement' ? 'settled' : detail.state

  return NextResponse.json({
    ok: true,
    orderId,
    state,
    provider: {
      state: detail.state,
      transactionStatus: detail.transactionStatus,
      fraudStatus: detail.fraudStatus,
      paymentType: detail.paymentType,
      transactionId: detail.transactionId,
      amount: detail.amount,
      expiresAt: detail.expiresAt,
    },
    method: detail.method,
    instructions: (detail.instructions ?? null) satisfies PaymentInstructions | null,
    order,
  })
}
