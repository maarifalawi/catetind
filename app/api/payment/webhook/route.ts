import { NextRequest, NextResponse } from 'next/server'
import { midtransConfigured, verifyMidtransSignature } from '@/lib/payments/midtrans'

/* ── POST /api/payment/webhook (paket 63) — RAIL NOTIFIKASI MIDTRANS ─────────
   Fail-closed dua lapis:
     1. tanpa `MIDTRANS_SERVER_KEY` → **503** (belum ada yang bisa diverifikasi);
     2. tanda tangan SHA512 diperiksa; tidak cocok → **403** (JANGAN percaya klaim
        pembayaran dari pemanggil anonim).

   Notifikasi yang SAH diterima, tapi belum ada tindak lanjut (pemenuhan langganan
   menyusul saat alur pembayaran dihidupkan) — jadi balasannya jujur
   `{ ok:true, handled:false }`, bukan mengaku "langganan diaktifkan". */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface MidtransNotification {
  order_id?: unknown
  status_code?: unknown
  gross_amount?: unknown
  signature_key?: unknown
  transaction_status?: unknown
}

export async function POST(req: NextRequest) {
  if (!midtransConfigured()) {
    return NextResponse.json(
      { ok: false, reason: 'not-configured', error: 'Webhook Midtrans belum aktif.' },
      { status: 503 },
    )
  }

  let body: MidtransNotification
  try {
    body = (await req.json()) as MidtransNotification
  } catch {
    return NextResponse.json({ ok: false, error: 'Body harus JSON.' }, { status: 400 })
  }

  const verified = verifyMidtransSignature({
    orderId: String(body.order_id ?? ''),
    statusCode: String(body.status_code ?? ''),
    grossAmount: String(body.gross_amount ?? ''),
    signature: String(body.signature_key ?? ''),
  })
  if (!verified) {
    return NextResponse.json({ ok: false, error: 'Tanda tangan notifikasi tidak sah.' }, { status: 403 })
  }

  return NextResponse.json({
    ok: true,
    handled: false,
    note: 'Notifikasi sah diterima; pemenuhan langganan menyusul saat alur pembayaran dihidupkan.',
  })
}
