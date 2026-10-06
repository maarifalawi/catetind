import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { midtransConfigured } from '@/lib/payments/midtrans'
import { grantReferralReward } from '@/lib/payments/referral-reward'

/* ── POST /api/referral/reward (paket 63) — PINTU WEBHOOK, BUKAN UI ──────────
   Reward referral diberikan OTOMATIS setelah pembayaran berhasil, bukan oleh
   aksi user. Karena itu:
     · tanpa Midtrans → **503** (belum ada pembayaran, jadi belum ada reward);
     · saat Midtrans aktif → endpoint ini menolak panggilan MANUAL (409): yang
       boleh memicunya hanya webhook pembayaran (kunci peran server).

   Badan permintaan (kelak dari webhook): `{ referralId, referrerUserId,
   rewardKind, rewardAmount }`. Fungsi `grantReferralReward()` idempoten lewat
   `unique (referral_id)` di skema. */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KINDS = ['days', 'tokens']

export async function POST(req: NextRequest) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response

  if (!midtransConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'not-configured',
        error: 'Reward referral baru aktif setelah pembayaran (Midtrans) aktif.',
      },
      { status: 503 },
    )
  }

  /* Midtrans aktif: reward hanya boleh datang dari webhook (bukan dari UI). */
  let body: { referralId?: unknown; referrerUserId?: unknown; rewardKind?: unknown; rewardAmount?: unknown }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'Body harus JSON.' }, { status: 400 })
  }

  const referralId = typeof body.referralId === 'string' ? body.referralId : ''
  const referrerUserId = typeof body.referrerUserId === 'string' ? body.referrerUserId : ''
  const rewardKind = KINDS.includes(String(body.rewardKind)) ? (body.rewardKind as 'days' | 'tokens') : null
  const rewardAmount = Math.round(Number(body.rewardAmount))

  if (!referralId || !referrerUserId || !rewardKind || !Number.isFinite(rewardAmount)) {
    return NextResponse.json({ ok: false, error: 'Data reward tidak lengkap.' }, { status: 422 })
  }

  const result = await grantReferralReward(
    { referralId, referrerUserId, rewardKind, rewardAmount },
    auth.token,
  )
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: 'Reward tidak bisa dicatat.' }, { status: 502 })
  }

  return NextResponse.json({ ok: true, granted: result.granted })
}
