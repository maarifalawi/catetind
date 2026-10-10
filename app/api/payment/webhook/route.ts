import { NextRequest, NextResponse } from 'next/server'
import { midtransConfigured, verifyMidtransSignature } from '@/lib/payments/midtrans'
import { supabaseServiceKey } from '@/lib/supabase/config'
import { restRpc } from '@/lib/supabase/rest'

/* ── POST /api/payment/webhook (paket 63) — RAIL NOTIFIKASI MIDTRANS ─────────
   Fail-closed tiga lapis:
     1. tanpa `MIDTRANS_SERVER_KEY` → **503** (belum ada yang bisa diverifikasi);
     2. tanda tangan SHA512 diperiksa; tidak cocok → **403** (JANGAN percaya klaim
        pembayaran dari pemanggil anonim);
     3. setelah tanda tangan SAH, barulah baris `purchases` milik order itu dipenuhi
        lewat RPC `catetind_fulfill_purchase` (kunci peran server): status →
        `settlement`, langganan user diaktifkan, slot bertambah.

   Semuanya idempoten by `order_id` — Midtrans memang bisa mengirim notifikasi yang
   sama lebih dari sekali, dan itu tidak boleh mengaktifkan dua kali. Kalau
   pemenuhan tidak bisa dicatat (mis. kunci peran server kosong), balasannya jujur
   `handled:false`, bukan mengaku "langganan diaktifkan". */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface MidtransNotification {
  order_id?: unknown
  status_code?: unknown
  gross_amount?: unknown
  signature_key?: unknown
  transaction_status?: unknown
  payment_type?: unknown
  transaction_id?: unknown
}

/** baris hasil RPC `catetind_fulfill_purchase` */
interface FulfillRow {
  claimed_slot: number | null
  claimed_price: number | null
  claimed_tier: string | null
  already_processed: boolean
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

  const orderId = String(body.order_id ?? '')
  const status = String(body.transaction_status ?? '')

  const verified = verifyMidtransSignature({
    orderId,
    statusCode: String(body.status_code ?? ''),
    grossAmount: String(body.gross_amount ?? ''),
    signature: String(body.signature_key ?? ''),
  })
  if (!verified) {
    return NextResponse.json({ ok: false, error: 'Tanda tangan notifikasi tidak sah.' }, { status: 403 })
  }

  const serviceKey = supabaseServiceKey()
  if (!serviceKey) {
    return NextResponse.json({
      ok: true,
      handled: false,
      note: 'Notifikasi sah; kunci peran server belum diisi, jadi pemenuhan langganan belum dicatat.',
    })
  }

  const amount = Math.round(Number(body.gross_amount))
  const result = await restRpc<FulfillRow[]>(
    'catetind_fulfill_purchase',
    {
      p_order_id: orderId,
      p_status: status,
      p_amount: Number.isFinite(amount) ? amount : 0,
      p_payment_method: typeof body.payment_type === 'string' ? body.payment_type : null,
      p_midtrans_tx_id: typeof body.transaction_id === 'string' ? body.transaction_id : null,
    },
    serviceKey,
    serviceKey,
  )

  if (!result.ok) {
    /* Order tidak dikenal = tidak ada yang bisa dipenuhi; jangan minta Midtrans
       mengulang selamanya — katakan apa adanya. Kegagalan lain (DB) → 502 supaya
       Midtrans mengulang; fungsi pemenuhan idempoten, jadi aman diulang. */
    if (result.status === 400 || result.status === 404) {
      return NextResponse.json({
        ok: true,
        handled: false,
        note: `Order ${orderId} belum tercatat — tidak ada yang dipenuhi.`,
      })
    }
    return NextResponse.json(
      { ok: false, error: result.error ?? 'Pemenuhan gagal dicatat.' },
      { status: 502 },
    )
  }

  const row = Array.isArray(result.data) ? result.data[0] : null
  return NextResponse.json({
    ok: true,
    handled: true,
    orderId,
    status,
    settled: status === 'settlement' || status === 'capture',
    alreadyProcessed: row?.already_processed ?? false,
    slot: row?.claimed_slot ?? null,
  })
}
