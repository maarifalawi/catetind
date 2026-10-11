import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { PaymentStartScreen } from '@/components/catetind/payment-start-screen'
import { PLANS, rankOf, type PlanId } from '@/lib/data/pricing'
import { readCallerPlan } from '@/lib/subscription/plan'
import { readSupabaseSession } from '@/lib/supabase/session-cookie'

/**
 * /checkout/bayar — mulai pembayaran.
 *
 * Halaman ini hanya membaca PAKET + kode teman dari query. Nominal TIDAK
 * dititipkan di URL dan identitas pembeli tidak pernah datang dari klien:
 * keduanya ditentukan server — paket yang sudah dimiliki dibaca dari
 * `user_subscriptions` (`readCallerPlan`), lalu nominalnya dihitung
 * `lib/data/pricing.ts` (`priceFor`).
 *
 * Sejak paket 84 tidak ada parameter `period`: satu paket = satu harga, dan
 * "upgrade" = bayar selisih dari paket yang sudah dibeli.
 *
 * Paket yang tidak dikenal → kembali ke `/checkout` (tidak ada yang bisa
 * ditagih, jadi jangan tampilkan halaman bayar kosong). Paket yang setara atau
 * lebih rendah dari yang sudah dimiliki juga dikembalikan ke `/checkout`:
 * downgrade tidak ditawarkan dan tidak ada refund.
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
  searchParams: Promise<{ plan?: string | string[]; kode?: string | string[]; upgrade?: string | string[] }>
}) {
  const params = await searchParams
  const plan = PLANS.find((item) => item.id === (first(params.plan) as PlanId))
  if (!plan) redirect('/checkout')

  /* Paket yang SUDAH dimiliki dibaca di server (cookie → PostgREST). Ini yang
     membuat halaman tidak pernah menagih angka yang berbeda dari yang diputuskan
     route `/api/payment/charge`: keduanya memanggil `priceFor()` dengan pemilik
     yang sama. */
  const session = readSupabaseSession((await headers()).get('cookie'))
  const caller = session ? await readCallerPlan(session.accessToken) : null
  const ownedPlanId = caller?.active ? caller.planId : null

  /* sudah punya paket ini (atau lebih tinggi) → tidak ada yang perlu dibayar */
  if (rankOf(ownedPlanId) >= plan.rank) redirect('/checkout')

  const code = first(params.kode).toUpperCase()
  const isUpgrade = rankOf(ownedPlanId) > 0 && plan.rank > rankOf(ownedPlanId)

  return (
    <PhoneStage plain>
      <PaymentStartScreen
        plan={plan}
        ownedPlanId={ownedPlanId}
        isUpgrade={isUpgrade}
        referralCode={code || null}
      />
    </PhoneStage>
  )
}

