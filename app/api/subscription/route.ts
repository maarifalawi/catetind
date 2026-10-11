import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { readCallerPlan } from '@/lib/subscription/plan'

/* ── GET /api/subscription — PAKET YANG DIMILIKI PEMANGGIL ────────────────────
   Dipakai halaman /checkout/selesai untuk membuktikan (bukan mengarang) bahwa
   pembelian benar-benar tercatat, dan dipakai
   `components/catetind/subscription-gate-provider.tsx` sebagai sumber paket
   untuk kunci fitur per tier.

   Bentuk balasan (paket 84 — tidak ada lagi periode/masa aktif):
     { ok, configured, active, planId, purchasedAt }

   Baris dibaca dengan token PEMANGGIL; RLS `user_id = auth.uid()` yang
   menyaring, jadi route ini tidak pernah bisa membocorkan paket user lain.

   Tanpa backend Supabase (build tanpa env / test) → jawaban jujur
   `{ active:false, configured:false }`, bukan "sepertinya aktif". */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response

  const caller = await readCallerPlan(auth.token)
  if (caller.failed) {
    return NextResponse.json({ ok: false, error: 'Paket tidak bisa dibaca.' }, { status: 502 })
  }

  /* `active` sengaja hanya true kalau barisnya ADA dan ditandai aktif: baris
     yang belum dipenuhi webhook tidak boleh mengaku memberi akses. */
  return NextResponse.json({
    ok: true,
    configured: caller.configured,
    active: caller.configured && caller.active,
    planId: caller.active ? caller.planId : null,
    purchasedAt: caller.active ? caller.purchasedAt : null,
  })
}
