import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { restConfigured, restFetch } from '@/lib/supabase/rest'

/* ── GET /api/subscription — STATUS LANGGANAN PEMANGGIL ───────────────────────
   Dipakai halaman /checkout/selesai untuk membuktikan (bukan mengarang) bahwa
   langganan benar-benar aktif setelah pembayaran. Baris dibaca dengan token
   PEMANGGIL; RLS `user_id = auth.uid()` yang menyaring, jadi route ini tidak
   pernah bisa membocorkan langganan user lain.

   Tanpa backend Supabase (build tanpa env / test) → jawaban jujur
   `{ active:false, configured:false }`, bukan "sepertinya aktif". */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface SubscriptionRow {
  tier_name?: string | null
  is_lifetime?: boolean | null
  is_active?: boolean | null
  started_at?: string | null
  expires_at?: string | null
}

export async function GET(req: NextRequest) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response

  if (!restConfigured()) {
    return NextResponse.json({ active: false, subscription: null, configured: false })
  }

  const res = await restFetch<SubscriptionRow[]>(
    'user_subscriptions?select=tier_name,is_lifetime,is_active,started_at,expires_at&limit=1',
    { accessToken: auth.token },
  )
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: 'Langganan tidak bisa dibaca.' }, { status: 502 })
  }

  const row = Array.isArray(res.data) ? res.data[0] : undefined
  return NextResponse.json({
    ok: true,
    configured: true,
    active: Boolean(row?.is_active),
    subscription: row
      ? {
          tier: row.tier_name ?? null,
          lifetime: Boolean(row.is_lifetime),
          active: Boolean(row.is_active),
          startedAt: row.started_at ?? null,
          expiresAt: row.expires_at ?? null,
        }
      : null,
  })
}
