import { rankOf, type PlanId } from '@/lib/data/pricing'
import { normalizeTier } from './plan'

/* ── ATURAN PEMENUHAN — CERMIN TYPE-SCRIPT DARI RPC SQL (paket 85) ───────────
   Sumber kebenarannya adalah `public.catetind_fulfill_purchase` di
   `supabase/migrations/20261011120000_catetind_akses_selamanya.sql`. Karena SQL
   tidak punya test di repo ini, aturan yang paling mahal-kalau-salah ditulis
   ulang di sini sebagai fungsi MURNI supaya bisa dikunci test:

     1. pemenuhan selalu menghasilkan AKSES SELAMANYA — tidak ada masa aktif,
        tidak ada penambahan hari (bug "+30 hari" hanya hidup di SQL lama);
     2. upgrade NAIK tier, tapi TIDAK PERNAH menurunkan (downgrade diabaikan);
     3. cabang top-up TIDAK menyentuh langganan sama sekali;
     4. nominal notifikasi yang beda dari yang seharusnya TIDAK dipenuhi.

   ⚠️ ATURAN INI HARUS SINKRON dengan SQL. Mengubah salah satu WAJIB mengubah
   yang lain — sama seperti `LEGACY_TIER_MAP` (`lib/subscription/plan.ts`) yang
   harus sama dengan `catetind_normalize_tier` (SQL). */

/** rank tier apa pun (lama ATAU baru); `0` = tak dikenal. Cermin `catetind_plan_rank`. */
export function tierRank(tier: string | null | undefined): number {
  return rankOf(normalizeTier(tier))
}

/**
 * Tier hasil pemenuhan: yang LEBIH TINGGI antara yang sudah dimiliki & yang baru
 * dibeli. Upgrade naik, pembelian ulang paket yang sama tetap, dan target yang
 * lebih rendah DIABAIKAN (tidak ada downgrade, tidak ada refund).
 * `null` = tidak ada tier valid di kedua sisi (tidak pernah memberi akses).
 */
export function resolvedTier(
  ownedTier: string | null | undefined,
  purchasedTier: string | null | undefined,
): PlanId | null {
  const owned = normalizeTier(ownedTier)
  const purchased = normalizeTier(purchasedTier)
  if (!purchased) return owned
  if (!owned) return purchased
  return rankOf(owned) >= rankOf(purchased) ? owned : purchased
}

/**
 * `true` = nominal notifikasi Midtrans BEDA dari yang seharusnya ditagih →
 * pemenuhan DILEWATI. Kalau `expected` belum tercatat (baris lama tanpa
 * `expected_amount`), tidak ada yang bisa dibandingkan → jangan menuduh salah.
 */
export function isAmountMismatch(
  expected: number | null | undefined,
  gross: number,
): boolean {
  if (expected === null || expected === undefined) return false
  if (!Number.isFinite(expected) || !Number.isFinite(gross)) return false
  return Math.round(gross) !== Math.round(expected)
}
