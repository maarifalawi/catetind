import { MONTHLY_DAYS, rankOf, type BillingPeriod, type PlanId } from '@/lib/data/pricing'
import { normalizeTier } from './plan'

/* ── ATURAN PEMENUHAN — CERMIN TYPE-SCRIPT DARI RPC SQL (paket 85) ───────────
   Sumber kebenarannya adalah `public.catetind_fulfill_purchase` di
   `supabase/migrations/20261014120000_catetind_prepaid_30_hari.sql`. Karena SQL
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

/**
 * Cermin TS dari hasil akhir `catetind_fulfill_purchase` (migrasi
 * `20261014120000_catetind_prepaid_30_hari.sql`). Dipakai test supaya aturan
 * yang paling mahal-kalau-salah (perpanjangan & downgrade) punya pengunci:
 *
 *   monthly
 *     · sudah lifetime → lifetime TIDAK diturunkan (tier & expiry lama tetap);
 *     · selain itu → tier = yang dibeli (boleh turun), expiry =
 *       max(now, expiry lama) + 30 hari.
 *   lifetime
 *     · is_lifetime = true, expires_at = NULL;
 *     · tier = yang lebih tinggi antara lifetime lama & pembelian; pembelian
 *       dari monthly memakai tier baru.
 */
export interface SubscriptionState {
  tier: PlanId | null
  isLifetime: boolean
  billingPeriod: BillingPeriod
  expiresAt: string | null
}

export function resolveSubscriptionAfterPurchase(input: {
  purchasedTier: string | null | undefined
  period: BillingPeriod
  now: Date
  existing?: {
    tier: string | null | undefined
    isLifetime: boolean
    expiresAt: string | null
  } | null
}): SubscriptionState {
  const purchased = normalizeTier(input.purchasedTier)
  const existing = input.existing ?? null
  const existingTier = normalizeTier(existing?.tier)
  const existingLifetime = existing?.isLifetime === true

  if (input.period === 'monthly') {
    if (existingLifetime) {
      return {
        tier: existingTier,
        isLifetime: true,
        billingPeriod: 'lifetime',
        expiresAt: null,
      }
    }
    const existingExpiry = existing?.expiresAt ? Date.parse(existing.expiresAt) : Number.NaN
    const base = Number.isFinite(existingExpiry)
      ? Math.max(input.now.getTime(), existingExpiry)
      : input.now.getTime()
    const expires = new Date(base + MONTHLY_DAYS * 24 * 60 * 60 * 1000)
    return {
      tier: purchased,
      isLifetime: false,
      billingPeriod: 'monthly',
      expiresAt: expires.toISOString(),
    }
  }

  const tier =
    existingLifetime && existingTier && purchased && rankOf(existingTier) >= rankOf(purchased)
      ? existingTier
      : purchased
  return { tier, isLifetime: true, billingPeriod: 'lifetime', expiresAt: null }
}
