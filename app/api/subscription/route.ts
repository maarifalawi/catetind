import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { readCallerPlan, subscriptionPayload } from '@/lib/subscription/plan'

/* ── GET /api/subscription — PAKET YANG DIMILIKI PEMANGGIL ────────────────────
   Dipakai halaman /checkout/selesai untuk membuktikan (bukan mengarang) bahwa
   pembelian benar-benar tercatat, dan dipakai
   `components/catetind/subscription-gate-provider.tsx` sebagai sumber paket
   untuk kunci fitur per tier.

   Bentuk balasan (rilis prepaid):
     { ok, configured, active, planId, purchasedAt, expiresAt, isLifetime,
       billingPeriod, expired }

   `active` true hanya kalau baris ADA, `is_active`, dan masa aktifnya belum
   lewat. `planId` tetap dikembalikan saat expired supaya panel billing bisa
   menawarkan perpanjangan paket yang sama. */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response

  const caller = await readCallerPlan(auth.token)
  if (caller.failed) {
    return NextResponse.json({ ok: false, error: 'Paket tidak bisa dibaca.' }, { status: 502 })
  }

  /* `active` sengaja hanya true kalau barisnya ADA, ditandai aktif, DAN masa
     aktifnya belum lewat. Bentuk balasannya satu sumber dengan route
     rekonsiliasi pembayaran — lihat `subscriptionPayload()`. */
  return NextResponse.json(subscriptionPayload(caller))
}
