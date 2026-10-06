import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { createSnapTransaction, midtransConfigured } from '@/lib/payments/midtrans'
import type { PaymentPurpose } from '@/lib/payments/types'

/* ── POST /api/payment/create (paket 63) — RAIL PEMBAYARAN ───────────────────
   Baris pertama `requireUser()`. Selama `MIDTRANS_SERVER_KEY` kosong, route ini
   menjawab **503 “Pembayaran belum aktif”** apa adanya — tidak ada token palsu,
   tidak ada simulasi yang menyamar sebagai tagihan. Begitu kredensialnya ada,
   `createSnapTransaction()` yang mengurus sisanya (tidak ada perubahan kontrak).

   Nominal TIDAK dihardcode di sini: pemanggil mengirim `amount` dari satu sumber
   harga (`lib/data/pricing.ts`), sama seperti checkout. */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PURPOSES: PaymentPurpose[] = ['subscribe', 'topup', 'renew', 'upgrade']

export async function POST(req: NextRequest) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response

  if (!midtransConfigured()) {
    return NextResponse.json(
      { ok: false, reason: 'not-configured', error: 'Pembayaran belum aktif — menunggu Midtrans.' },
      { status: 503 },
    )
  }

  let body: { purpose?: unknown; amount?: unknown; planId?: unknown; period?: unknown; itemName?: unknown }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'Body permintaan harus JSON.' },
      { status: 400 },
    )
  }

  const purpose = PURPOSES.includes(body.purpose as PaymentPurpose) ? (body.purpose as PaymentPurpose) : null
  const amount = Math.round(Number(body.amount))
  if (!purpose || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'Tujuan atau nominal pembayaran tidak sah.' },
      { status: 422 },
    )
  }

  const orderId = `${purpose}-${auth.user.id.slice(0, 8)}-${Date.now()}`
  const result = await createSnapTransaction({
    purpose,
    orderId,
    amount,
    itemName: typeof body.itemName === 'string' && body.itemName ? body.itemName : 'CatetInd',
    planId: typeof body.planId === 'string' ? body.planId : undefined,
    period: typeof body.period === 'string' ? body.period : undefined,
    customerEmail: auth.user.email,
    customerName: auth.user.name,
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.reason, error: result.message },
      { status: result.status },
    )
  }

  return NextResponse.json({
    ok: true,
    orderId,
    token: result.value.token,
    redirectUrl: result.value.redirectUrl,
  })
}
