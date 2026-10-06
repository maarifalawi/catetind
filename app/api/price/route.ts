import { NextResponse } from 'next/server'
import { supabaseAnonKey } from '@/lib/supabase/config'
import { restConfigured, restFetch } from '@/lib/supabase/rest'
import {
  FOUNDING_MEMBER_SLOTS,
  formatIDR,
  staticPriceState,
  type PriceState,
} from '@/lib/data/pricing'

/* ── GET /api/price — HARGA FOUNDING MEMBER (inventaris #3 · PRD 4467) ────────
   Bentuk balasan = `PriceState` (`tier, priceLabel, priceNumber, slotSold,
   slotsLeft, isDynamic`). Dipakai `/checkout` (dan boleh dipakai landing) supaya
   TIDAK ada dua angka untuk satu harga.

   Sumber:
     · tabel `pricing_state` (singleton, `id = 1`) BILA ada → `isDynamic: true`;
     · kalau tabel belum ada / Supabase belum dikonfigurasi → `lib/data/pricing.ts`
       (`staticPriceState()`, `isDynamic: false`).

   Endpoint ini publik (harga bukan data user) dan TIDAK butuh sesi — karena itu
   ia memakai kunci publishable sebagai `Authorization`, bukan `requireUser()`.
   Selama pembayaran (Midtrans) belum aktif, tidak ada yang menaikkan harga, jadi
   jawaban yang benar-benar dihasilkan adalah `isDynamic: false` — dan itu
   dikatakan apa adanya ke UI, bukan dipalsukan jadi "real-time". */

export const dynamic = 'force-dynamic'

/** baris tabel `pricing_state` (PRD 4114) — hanya kolom yang dipakai */
interface PricingStateRow {
  current_slot?: number | string | null
  current_price?: number | string | null
  current_tier?: string | null
}

async function readPricingState(): Promise<PriceState> {
  const fallback = staticPriceState()
  if (!restConfigured()) return fallback

  const res = await restFetch<PricingStateRow[]>(
    'pricing_state?select=current_slot,current_price,current_tier&id=eq.1&limit=1',
    { accessToken: supabaseAnonKey() },
  )
  const row = res.ok && Array.isArray(res.data) ? res.data[0] : undefined
  if (!row) return fallback

  const priceNumber = Math.round(Number(row.current_price))
  /* harga tak masuk akal = jangan dipercaya; lebih baik snapshot statis yang jujur */
  if (!Number.isFinite(priceNumber) || priceNumber <= 0) return fallback

  const slotSold = Math.max(0, Math.round(Number(row.current_slot ?? 0)))

  return {
    tier: typeof row.current_tier === 'string' && row.current_tier.length > 0
      ? row.current_tier
      : fallback.tier,
    priceLabel: formatIDR(priceNumber),
    priceNumber,
    slotSold,
    slotsLeft: Math.max(0, FOUNDING_MEMBER_SLOTS - slotSold),
    isDynamic: true,
  }
}

export async function GET() {
  const state = await readPricingState()
  return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } })
}
