import { rankOf, type PlanId } from '@/lib/data/pricing'
import { supabaseServiceKey } from '@/lib/supabase/config'
import { restFetch } from '@/lib/supabase/rest'
import { isOnboardingComplete } from './onboarding'
import { normalizeTier } from './plan'

/* ── BOOTSTRAP AKUN REVIEWER MIDTRANS ────────────────────────────────────────
   Reviewer merchant perlu MELIHAT app yang sebenarnya, bukan paywall. Setiap
   kali reviewer berhasil login (`POST /api/auth/reviewer`), akun uji itu
   dipastikan punya:

     1. paket WARAS lifetime  → gerbang paket tidak mengalihkannya ke /checkout;
     2. penanda onboarding selesai → gerbang onboarding tidak menahannya di
        `/app/onboarding` (akun uji ini tidak melewati flow onboarding).

   Kenapa lewat kunci peran server: `user_subscriptions` & `user_settings` tidak
   punya policy tulis untuk klien (RLS read-only milik sendiri). Ini jalur yang
   SAMA dengan `scripts/supabase/grant-akses.mjs` — upsert per `user_id`, bukan
   mengarang tabel baru.

   Aturan yang dijaga:
     · TIDAK PERNAH menurunkan paket. Kalau baris yang ada sudah aktif dengan
       rank ≥ Waras (mis. Sultan), baris itu dibiarkan apa adanya — rank guard
       yang sama dengan `catetind_fulfill_purchase` di database.
     · Idempoten: login berulang tidak menulis ulang kalau semuanya sudah benar.
     · `onboarding` yang SUDAH punya `completedAt` tidak pernah ditimpa, jadi
       progres nyata (kalau reviewer sempat mengisi) tidak hilang.
     · Kegagalan bootstrap TIDAK menggagalkan login: sesi tetap diberikan, route
       hanya mencatat error di server (reviewer bisa mencoba lagi). */

export const REVIEWER_PLAN_ID: PlanId = 'waras'

interface SubscriptionRow {
  tier_name?: string | null
  is_active?: boolean | null
  is_lifetime?: boolean | null
}

/** apakah baris langganan perlu ditulis? (rank target lebih tinggi / belum aktif) */
export function reviewerPlanNeedsWrite(row: SubscriptionRow | null | undefined): boolean {
  const current = normalizeTier(row?.tier_name ?? null)
  const activeLifetime = row?.is_active === true && row?.is_lifetime === true
  if (activeLifetime && rankOf(current) >= rankOf(REVIEWER_PLAN_ID)) return false
  return true
}

export interface ReviewerBootstrapResult {
  /** true = pembacaan langganan berhasil (penulisan boleh saja tidak perlu) */
  ok: boolean
  planId: PlanId
  /** true = baris `user_subscriptions` benar-benar ditulis di panggilan ini */
  planWritten: boolean
  /** true = penanda onboarding baru saja disemai */
  onboardingSeeded: boolean
}

function serviceAuth(serviceKey: string) {
  return { accessToken: serviceKey, apiKey: serviceKey }
}

/** hasil onboarding minimal yang lolos `isOnboardingComplete` (tanpa data uang) */
function reviewerOnboardingPayload(nowIso: string) {
  return {
    situations: ['first-jobber'],
    modules: [],
    dashboardPeriod: 'calendar',
    paydayDate: null,
    monthlyIncome: 0,
    wallet: { name: 'Dompet Reviewer', balance: 0 },
    firstTransaction: { type: 'expense', amount: 0, description: 'Akun uji Midtrans' },
    reminderEnabled: false,
    completedAt: nowIso,
  }
}

/**
 * Pastikan akun reviewer punya paket Waras lifetime + onboarding selesai.
 * `userId` datang dari Supabase Admin (`createUser`/`generateLink`), bukan dari
 * body request — klien tidak pernah bisa memilih akun lain.
 */
export async function ensureReviewerAccess(userId: string): Promise<ReviewerBootstrapResult> {
  const result: ReviewerBootstrapResult = {
    ok: false,
    planId: REVIEWER_PLAN_ID,
    planWritten: false,
    onboardingSeeded: false,
  }

  const serviceKey = supabaseServiceKey()
  if (!serviceKey || !userId) return result

  const auth = serviceAuth(serviceKey)
  const userFilter = encodeURIComponent(userId)

  /* 1 — baca langganan yang ada (RLS tidak berlaku untuk service role) */
  const read = await restFetch<SubscriptionRow[]>(
    `user_subscriptions?select=tier_name,is_active,is_lifetime&user_id=eq.${userFilter}&limit=1`,
    auth,
  )
  if (!read.ok) return result

  const row = Array.isArray(read.data) ? read.data[0] : undefined

  /* 2 — tulis hanya kalau perlu; `started_at` tidak dikirim supaya tanggal
     aktivasi pertama tidak hilang (pola `grant-akses.mjs`). */
  if (reviewerPlanNeedsWrite(row)) {
    const nowIso = new Date().toISOString()
    const written = await restFetch<unknown>('user_subscriptions?on_conflict=user_id', {
      ...auth,
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: {
        user_id: userId,
        tier_name: REVIEWER_PLAN_ID,
        is_lifetime: true,
        expires_at: null,
        is_active: true,
        last_renewed_at: nowIso,
        updated_at: nowIso,
      },
    })
    if (!written.ok) return result
    result.planWritten = true
  }

  /* 3 — onboarding: cukup penanda `completedAt`; progres yang sudah ada tidak
     ditimpa. Kalau langkah ini gagal, paket tetap sah → `ok` tetap true. */
  const settings = await restFetch<{ onboarding?: unknown }[]>(
    `user_settings?select=onboarding&user_id=eq.${userFilter}&limit=1`,
    auth,
  )
  if (settings.ok) {
    const existing = Array.isArray(settings.data) ? settings.data[0]?.onboarding : null
    if (!isOnboardingComplete(existing)) {
      const nowIso = new Date().toISOString()
      const seeded = await restFetch<unknown>('user_settings?on_conflict=user_id', {
        ...auth,
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=minimal',
        body: {
          user_id: userId,
          onboarding: reviewerOnboardingPayload(nowIso),
          updated_at: nowIso,
        },
      })
      result.onboardingSeeded = seeded.ok
    }
  }

  result.ok = true
  return result
}
