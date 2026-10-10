import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { createSnapTransaction, midtransConfigured } from '@/lib/payments/midtrans'
import type { PaymentPurpose } from '@/lib/payments/types'
import { PLANS, isSellablePeriod, isValidOfferAmount } from '@/lib/data/pricing'
import { restFetch } from '@/lib/supabase/rest'

/* ── POST /api/payment/create (paket 63) — RAIL PEMBAYARAN ───────────────────
   Baris pertama `requireUser()`. Selama `MIDTRANS_SERVER_KEY` kosong, route ini
   menjawab **503 “Pembayaran belum aktif”** apa adanya — tidak ada token palsu,
   tidak ada simulasi yang menyamar sebagai tagihan. Begitu kredensialnya ada,
   `createSnapTransaction()` yang mengurus sisanya (tidak ada perubahan kontrak).

   Nominal TIDAK dipercaya dari klien: untuk `subscribe`, server mencocokkan
   (paket + periode + nominal) dengan harga kanon di `lib/data/pricing.ts` —
   termasuk versi diskon kode teman. */

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

  /* Nominal TIDAK dipercaya dari klien: untuk `subscribe`, server mencocokkan
     (paket + periode + nominal) dengan harga kanon `lib/data/pricing.ts` —
     termasuk versi diskon kode teman. Kombinasi lain → 422, bukan tagihan yang
     harganya ditentukan pemanggil. */
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

  const orderId = `${purpose}-${auth.user.id.slice(0, 8)}-${Date.now()}`

  /* Baris `pending` ditulis ATAS NAMA user (RLS) SEBELUM provider dipanggil,
     supaya webhook — yang tidak membawa sesi — bisa memetakan order ke
     pemiliknya. Kalau penulisan ini gagal, notifikasi nanti tetap dijawab jujur
     `handled:false`. */
  await restFetch('purchases', {
    method: 'POST',
    accessToken: auth.token,
    prefer: 'return=minimal',
    body: {
      order_id: orderId,
      status: 'pending',
      /* paket & periode disimpan di sini supaya webhook tidak perlu tahu apa pun
         selain `order_id` — pemenuhan membaca baris ini */
      tier_name: plan?.id ?? null,
      billing_period: period ?? null,
    },
  })

  /* URL kembali (ALUR REDIRECT): user dibawa balik ke halaman kita, bukan
     berhenti di halaman Snap. Diambil dari `Origin` request — tidak ada domain
     yang di-hardcode, dan panggilan tanpa origin cukup tidak mengirim callbacks. */
  const origin = req.headers.get('origin')
  const finishUrl = origin
    ? `${origin}/checkout/selesai?order_id=${encodeURIComponent(orderId)}`
    : undefined

  const result = await createSnapTransaction({
    purpose,
    orderId,
    amount,
    itemName: typeof body.itemName === 'string' && body.itemName ? body.itemName : 'CatetInd',
    planId: plan?.id,
    period,
    customerEmail: auth.user.email,
    customerName: auth.user.name,
    finishUrl,
    errorUrl: finishUrl ? `${finishUrl}&status=error` : undefined,
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
