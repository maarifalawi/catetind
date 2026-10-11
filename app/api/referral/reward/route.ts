import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { midtransConfigured } from '@/lib/payments/midtrans'

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

  /* Midtrans aktif: pemberian reward HANYA lewat webhook pembayaran (kunci peran
     server), yang membaca order yang benar-benar dibayar. Endpoint ini TIDAK
     dipakai klien untuk memberi reward — dipanggil manual, balasannya jujur
     menolak (409), bukan mengabulkan. */
  return NextResponse.json(
    {
      ok: false,
      reason: 'webhook-only',
      error: 'Reward referral diberikan otomatis oleh webhook pembayaran, bukan dari halaman.',
    },
    { status: 409 },
  )
}
