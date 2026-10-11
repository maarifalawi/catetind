import { NextRequest, NextResponse } from 'next/server'
import { midtransConfigured, verifyMidtransSignature } from '@/lib/payments/midtrans'
import { supabaseServiceKey } from '@/lib/supabase/config'
import { restFetch, restRpc } from '@/lib/supabase/rest'
import { grantReferralReward } from '@/lib/payments/referral-reward'
import { referralRewardFor } from '@/lib/data/referral'
import { isAmountMismatch } from '@/lib/subscription/fulfillment'

/* ── POST /api/payment/webhook (paket 63) — RAIL NOTIFIKASI MIDTRANS ─────────
   Fail-closed tiga lapis:
     1. tanpa `MIDTRANS_SERVER_KEY` → **503** (belum ada yang bisa diverifikasi);
     2. tanda tangan SHA512 diperiksa; tidak cocok → **403** (JANGAN percaya klaim
        pembayaran dari pemanggil anonim);
     3. setelah tanda tangan SAH, nominal notifikasi DIBANDINGKAN dengan nominal
        yang seharusnya ditagih (`purchases.expected_amount`, dihitung server dari
        `lib/data/pricing.ts` / `lib/ai-quota.ts`) — notifikasi bernominal beda
        TIDAK dipenuhi. Baru setelah itu baris `purchases` milik order itu dipenuhi
        lewat RPC `catetind_fulfill_purchase` (kunci peran server): status →
        `settlement`, langganan user diaktifkan, token add-on (top-up) dicatat.

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

/** baris purchases yang dibaca untuk memeriksa nominal yang diharapkan */
interface PurchaseProbeRow {
  expected_amount?: unknown
  status?: unknown
}

/**
 * Beri reward Token AI ke PENGUNDANG setelah pembelian paket dipenuhi
 * (paket 85 · TUGAS 6). Dijalankan dari WEBHOOK (kunci peran server), bukan
 * klien, dan idempoten: `referral_rewards` unik per `referral_id` DAN `order_id`,
 * jadi notifikasi Midtrans yang terkirim dua kali tidak memberi reward dua kali.
 *
 * Kegagalan di sini TIDAK menggagalkan pemenuhan — akses pembeli sudah benar,
 * dan reward yang gagal bisa dicoba lagi saat notifikasi diulang.
 */
async function grantReferralForOrder(orderId: string, serviceKey: string): Promise<void> {
  const purchase = await restFetch<{ user_id?: unknown; purpose?: unknown }[]>(
    `purchases?order_id=eq.${encodeURIComponent(orderId)}&select=user_id,purpose&limit=1`,
    { accessToken: serviceKey, apiKey: serviceKey },
  )
  const purchaseRow = Array.isArray(purchase.data) ? purchase.data[0] : undefined
  const buyerId = typeof purchaseRow?.user_id === 'string' ? purchaseRow.user_id : null
  if (!buyerId) return

  /* hanya pembelian PAKET yang memberi reward (top-up token tidak) */
  const reward = referralRewardFor(
    typeof purchaseRow?.purpose === 'string' ? purchaseRow.purpose : null,
  )
  if (!reward) return

  const relation = await restFetch<{ id?: unknown; referrer_user_id?: unknown }[]>(
    `referrals?referred_user_id=eq.${encodeURIComponent(buyerId)}&select=id,referrer_user_id&limit=1`,
    { accessToken: serviceKey, apiKey: serviceKey },
  )
  const rel = Array.isArray(relation.data) ? relation.data[0] : undefined
  const referralId = typeof rel?.id === 'string' ? rel.id : null
  const referrerId = typeof rel?.referrer_user_id === 'string' ? rel.referrer_user_id : null
  if (!referralId || !referrerId) return

  await grantReferralReward(
    {
      referralId,
      referrerUserId: referrerId,
      rewardKind: reward.kind,
      rewardAmount: reward.amount,
      orderId,
    },
    serviceKey,
  )
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

  /* ── Verifikasi NOMINAL (paket 85) — sebelum memenuhi apa pun ──
     Bandingkan `gross_amount` notifikasi dengan nominal yang SEHARUSNYA ditagih
     (`purchases.expected_amount`, dihitung server saat charge). Notifikasi yang
     nominalnya beda → pembelian TIDAK dipenuhi, statusnya dicatat `amount_mismatch`.

     Balasannya tetap **HTTP 200** walau mismatch: Midtrans me-retry notifikasi
     yang dijawab non-2xx, dan retry tanpa henti untuk notifikasi yang memang tidak
     akan pernah cocok hanya membanjiri webhook. Jadi 200 + `{ ok:false }` adalah
     jawaban paling tepat — jelas ke audit, tanpa banjir retry. */
  const probe = await restFetch<PurchaseProbeRow[]>(
    `purchases?order_id=eq.${encodeURIComponent(orderId)}&select=expected_amount,status&limit=1`,
    { accessToken: serviceKey, apiKey: serviceKey },
  )
  if (probe.ok && Array.isArray(probe.data) && probe.data.length > 0) {
    const expectedRaw = probe.data[0]?.expected_amount
    const expected = typeof expectedRaw === 'number' ? expectedRaw : Number(expectedRaw)
    if (isAmountMismatch(Number.isFinite(expected) ? expected : null, amount)) {
      await restFetch(`purchases?order_id=eq.${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        accessToken: serviceKey,
        apiKey: serviceKey,
        prefer: 'return=minimal',
        body: { status: 'amount_mismatch', updated_at: new Date().toISOString() },
      })
      return NextResponse.json({
        ok: false,
        handled: false,
        reason: 'amount-mismatch',
        orderId,
        note: 'Nominal notifikasi tidak sama dengan yang seharusnya ditagih — pembelian tidak dipenuhi.',
      })
    }
  }

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
  const settled = status === 'settlement' || status === 'capture'

  /* Reward referral (paket 85): hanya untuk pembelian paket yang SUDAH dibayar. */
  if (settled) await grantReferralForOrder(orderId, serviceKey)

  return NextResponse.json({
    ok: true,
    handled: true,
    orderId,
    status,
    settled,
    alreadyProcessed: row?.already_processed ?? false,
    slot: row?.claimed_slot ?? null,
  })
}
