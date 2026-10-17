import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { PaymentStartScreen } from '@/components/catetind/payment-start-screen'
import { PLANS, asBillingPeriod, rankOf, type PlanId } from '@/lib/data/pricing'
import { readCallerPlan } from '@/lib/subscription/plan'
import { readSupabaseSession } from '@/lib/supabase/session-cookie'

/**
 * /checkout/bayar — mulai pembayaran.
 *
 * Halaman ini membaca PAKET + PERIODE + kode teman dari query. Nominal TIDAK
 * dititipkan di URL dan identitas pembeli tidak pernah datang dari klien:
 * keduanya ditentukan server — paket yang sudah dimiliki dibaca dari
 * `user_subscriptions` (`readCallerPlan`), lalu nominalnya dihitung
 * `lib/data/pricing.ts` (`priceFor`).
 *
 * `monthly` = prabayar 30 hari; `lifetime` = akses selamanya. Renewal monthly
 * dan pindah tier tetap boleh; lifetime tidak bisa diturunkan. Paket yang tidak
 * dikenal / kombinasi yang tidak dijual dikembalikan ke `/checkout`.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Bayar — CatetInd',
  robots: { index: false, follow: false },
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
}

export default async function CheckoutPayPage({
  searchParams,
}: {
  searchParams: Promise<{
    plan?: string | string[]
    kode?: string | string[]
    period?: string | string[]
    upgrade?: string | string[]
  }>
}) {
  const params = await searchParams
  const plan = PLANS.find((item) => item.id === (first(params.plan) as PlanId))
  if (!plan) redirect('/checkout')

  const period = asBillingPeriod(first(params.period)) ?? 'monthly'

  /* Paket yang SUDAH dimiliki dibaca di server (cookie → PostgREST). Ini yang
     membuat halaman tidak pernah menagih angka yang berbeda dari yang diputuskan
     route `/api/payment/charge`: keduanya memanggil `priceFor()` dengan konteks
     yang sama. */
  const session = readSupabaseSession((await headers()).get('cookie'))
  const caller = session ? await readCallerPlan(session.accessToken) : null
  const ownedPlanId = caller?.planId ?? null
  const ownedIsLifetime = caller?.isLifetime === true

  /* Guard periode:
       · monthly saat sudah lifetime → tidak dijual (lifetime tidak diturunkan);
       · lifetime saat sudah lifetime di tier sama/lebih tinggi → tidak ada yang
         perlu dibayar;
       · monthly tier sama/lebih rendah TETAP boleh — itu renew / pindah tier.
     Expired monthly tetap boleh memperpanjang (planId dibaca, active=false). */
  if (period === 'monthly' && ownedIsLifetime) redirect('/checkout')
  if (period === 'lifetime' && ownedIsLifetime && rankOf(ownedPlanId) >= plan.rank) {
    redirect('/checkout')
  }

  const code = first(params.kode).toUpperCase()
  const isUpgrade =
    period === 'lifetime' && ownedIsLifetime && rankOf(ownedPlanId) > 0 && plan.rank > rankOf(ownedPlanId)
  const isRenewal = period === 'monthly' && Boolean(ownedPlanId)

  return (
    <PhoneStage plain>
      <PaymentStartScreen
        plan={plan}
        period={period}
        ownedPlanId={ownedPlanId}
        ownedIsLifetime={ownedIsLifetime}
        isUpgrade={isUpgrade}
        isRenewal={isRenewal}
        referralCode={code || null}
      />
    </PhoneStage>
  )
}

