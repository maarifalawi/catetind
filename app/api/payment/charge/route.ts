import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { paymentMethod } from '@/lib/payments/methods'
import {
  cancelTransaction,
  createCoreCharge,
  fetchTransactionStatus,
  midtransConfigured,
} from '@/lib/payments/midtrans'
import type { PaymentInstructions, PaymentPurpose, PaymentState } from '@/lib/payments/types'
import { PLANS, PERIOD_CHOICE_LABEL, isSellablePeriod, isValidOfferAmount } from '@/lib/data/pricing'
import { restFetch } from '@/lib/supabase/rest'

/* ── POST /api/payment/charge (paket 83) — TAGIHAN DI HALAMAN SENDIRI ────────
   Ganti rail Snap (`/api/payment/create`, DIHAPUS di paket ini). Sekarang server
   yang membuat tagihan Core API lalu mengembalikan INSTRUKSI BAYAR-nya ke UI
   (QRIS / nomor VA / tautan e-wallet / kode Mandiri Bill) — user tidak pernah
   pindah domain.

   Yang TIDAK berubah: baris pertama `requireUser()` (identitas dari sesi cookie),
   guard harga kanon dari `lib/data/pricing.ts` (nominal dari klien tidak
   dipercaya → 422), dan baris `purchases` `pending` yang SUDAH ditulis atas nama
   user sebelum provider dipanggil — itulah satu-satunya cara webhook (yang tidak
   membawa sesi) memetakan notifikasi ke pemiliknya.

   Idempotensi (DIUJI ke sandbox, bukan diasumsikan): `/v2/charge` dengan
   `order_id` yang sama membalas `status_code 406` — jadi order yang masih
   `pending` tidak boleh ditagih ulang. Karena itu:
     · instruksinya masih bisa dirender ulang (QRIS/VA/ShopeePay/Mandiri) →
       order yang SAMA dipakai ulang, tanpa memanggil `/v2/charge` lagi;
     · sudah dibayar tapi webhook belum mencatat → dilaporkan apa adanya
       (`state:'settled'`), TIDAK ada tagihan kedua (mencegah bayar dua kali);
     · sisanya (tagihan kedaluwarsa, ganti metode, GoPay yang instruksinya tidak
       ikut di balasan status) → tagihan lama dibatalkan, lalu dibuat baru. */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PURPOSES: PaymentPurpose[] = ['subscribe', 'topup', 'renew', 'upgrade']

interface PendingRow {
  order_id?: string
}

interface ChargeBody {
  purpose?: unknown
  amount?: unknown
  planId?: unknown
  period?: unknown
  itemName?: unknown
  method?: unknown
}

/** order `pending` terakhir milik PEMANGGIL untuk penawaran yang sama (RLS yang menyaring) */
async function findPendingOrder(token: string, planId: string, period: string): Promise<string | null> {
  const query = new URLSearchParams({
    select: 'order_id',
    status: 'eq.pending',
    tier_name: `eq.${planId}`,
    billing_period: `eq.${period}`,
    order: 'created_at.desc',
    limit: '1',
  })
  const res = await restFetch<PendingRow[]>(`purchases?${query.toString()}`, { accessToken: token })
  if (!res.ok || !Array.isArray(res.data)) return null
  return res.data[0]?.order_id ?? null
}

export async function POST(req: NextRequest) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response

  if (!midtransConfigured()) {
    return NextResponse.json(
      { ok: false, reason: 'not-configured', error: 'Pembayaran belum aktif — menunggu Midtrans.' },
      { status: 503 },
    )
  }

  let body: ChargeBody
  try {
    body = (await req.json()) as ChargeBody
  } catch {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'Body permintaan harus JSON.' },
      { status: 400 },
    )
  }

  const purpose = PURPOSES.includes(body.purpose as PaymentPurpose)
    ? (body.purpose as PaymentPurpose)
    : null
  const amount = Math.round(Number(body.amount))
  if (!purpose || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'Tujuan atau nominal pembayaran tidak sah.' },
      { status: 422 },
    )
  }

  const method = paymentMethod(body.method)
  if (!method) {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'Metode pembayaran tidak dikenal.' },
      { status: 422 },
    )
  }

  /* Nominal TIDAK dipercaya dari klien: untuk `subscribe`, server mencocokkan
     (paket + periode + nominal) dengan harga kanon `lib/data/pricing.ts` —
     termasuk versi diskon kode teman. */
  const plan = PLANS.find((item) => item.id === String(body.planId))
  const period = isSellablePeriod(body.period) ? body.period : undefined
  if (purpose === 'subscribe') {
    if (!plan || !period || !isValidOfferAmount(plan, period, amount)) {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Nominal tidak sesuai harga produk.' },
        { status: 422 },
      )
    }
  }

  /* URL webhook + halaman selesai diambil dari `Origin` request: tidak ada domain
     yang di-hardcode, jadi benar baik di localhost maupun produksi. */
  const origin = req.headers.get('origin')

  const itemName =
    typeof body.itemName === 'string' && body.itemName
      ? body.itemName
      : plan
        ? `${plan.name} (${period ? PERIOD_CHOICE_LABEL[period] : 'Langganan'})`
        : 'CatetInd'

  /* ── 1. Pakai ulang order yang masih pending (kalau memang bisa & cocok) ── */
  if (plan && period) {
    const existingOrderId = await findPendingOrder(auth.token, plan.id, period)
    if (existingOrderId) {
      const status = await fetchTransactionStatus(existingOrderId, method)
      if (status.ok) {
        const detail = status.value
        /* sudah dibayar tapi webhook belum mencatat → jangan bikin tagihan kedua */
        if (detail.state === 'settled') {
          return NextResponse.json({
            ok: true,
            orderId: existingOrderId,
            method: detail.method ?? method.id,
            amount,
            state: 'settled' satisfies PaymentState,
            expiresAt: detail.expiresAt,
            instructions: null,
            note: 'Pembayaran sudah diterima provider — langganan sedang diaktifkan.',
          })
        }
        /* masih pending, metode sama, dan instruksinya bisa dirender ulang */
        if (
          detail.state === 'pending' &&
          detail.method === method.id &&
          method.reRenderable &&
          detail.instructions
        ) {
          return NextResponse.json({
            ok: true,
            orderId: existingOrderId,
            method: method.id,
            amount,
            state: 'pending' satisfies PaymentState,
            expiresAt: detail.expiresAt,
            instructions: detail.instructions satisfies PaymentInstructions,
            reused: true,
          })
        }
      }
      /* tagihan lama tidak dipakai lagi: dibatalkan supaya tidak ada dua tagihan
         hidup untuk satu niat pembayaran (gagal membatalkan tidak fatal — tagihan
         yang tidak bisa dibatalkan akan kedaluwarsa sendiri). */
      await cancelTransaction(existingOrderId)
    }
  }

  /* ── 2. Bikin tagihan baru ─────────────────────────────────────────────── */
  const orderId = `${purpose}-${auth.user.id.slice(0, 8)}-${Date.now()}`

  /* Baris `pending` ditulis ATAS NAMA user (RLS) SEBELUM provider dipanggil.
     Kalau penulisan ini gagal, tagihan TIDAK dibuat: uang yang masuk tanpa baris
     pembelian berarti langganan tidak punya jalur untuk dipenuhi webhook. */
  const inserted = await restFetch('purchases', {
    method: 'POST',
    accessToken: auth.token,
    prefer: 'return=minimal',
    body: {
      order_id: orderId,
      status: 'pending',
      tier_name: plan?.id ?? null,
      billing_period: period ?? null,
    },
  })
  if (!inserted.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: inserted.status === 0 ? 'not-configured' : 'provider',
        error: 'Tagihan tidak bisa dicatat, jadi pembayaran belum dibuat.',
      },
      { status: inserted.status === 0 ? 503 : 502 },
    )
  }

  const charge = await createCoreCharge(
    {
      purpose,
      orderId,
      amount,
      itemName,
      planId: plan?.id,
      period,
      customerEmail: auth.user.email,
      customerName: auth.user.name,
      notificationUrl: origin ? `${origin}/api/payment/webhook` : undefined,
      finishUrl: origin
        ? `${origin}/checkout/selesai?order_id=${encodeURIComponent(orderId)}`
        : undefined,
    },
    method,
  )

  if (!charge.ok) {
    return NextResponse.json(
      { ok: false, reason: charge.reason, error: charge.message },
      { status: charge.status },
    )
  }

  return NextResponse.json({
    ok: true,
    orderId,
    method: method.id,
    amount,
    state: charge.value.state,
    expiresAt: charge.value.expiresAt,
    instructions: charge.value.instructions,
  })
}
