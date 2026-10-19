import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { LandingNavbarLp } from '@/components/landing/lp/navbar'
import { PaymentStartScreen } from '@/components/catetind/payment-start-screen'
import { PLANS, rankOf, type PlanId } from '@/lib/data/pricing'
import { readCallerPlan } from '@/lib/subscription/plan'
import { readSupabaseSession } from '@/lib/supabase/session-cookie'

/**
 * /checkout/bayar — mulai pembayaran.
 *
 * Bingkai halaman: `LandingNavbarLp` di dalam satu `<main id="top">`, TANPA
 * footer landing — halaman ini berakhir di kartu pembayaran (termasuk saat
 * instruksi QRIS tampil), bukan di menu pemasaran. Lebar & padding konten
 * disamakan dengan header (`max-w-[1200px]` + `px-5`/`landing-tab:px-10`)
 * supaya tepi kiri/kanan halaman lurus dengan logo dan CTA.
 *
 * Halaman ini membaca PAKET + kode teman dari query. Nominal TIDAK dititipkan di
 * URL dan identitas pembeli tidak pernah datang dari klien: keduanya ditentukan
 * server — paket yang sudah dimiliki dibaca dari `user_subscriptions`
 * (`readCallerPlan`), lalu nominalnya dihitung `lib/data/pricing.ts` (`priceFor`).
 *
 * Satu-satunya periode yang dijual adalah `lifetime` (akses selamanya). Tidak
 * ada parameter `period` yang dipercaya dan tidak ada perpanjangan bulanan:
 * paket yang sudah dimiliki di tier sama/lebih tinggi dikembalikan ke `/checkout`.
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
    upgrade?: string | string[]
  }>
}) {
  const params = await searchParams
  const plan = PLANS.find((item) => item.id === (first(params.plan) as PlanId))
  if (!plan) redirect('/checkout')

  /* Paket yang SUDAH dimiliki dibaca di server (cookie → PostgREST). Ini yang
     membuat halaman tidak pernah menagih angka yang berbeda dari yang diputuskan
     route `/api/payment/charge`: keduanya memanggil `priceFor()` dengan konteks
     yang sama. */
  const session = readSupabaseSession((await headers()).get('cookie'))
  const caller = session ? await readCallerPlan(session.accessToken) : null
  const ownedPlanId = caller?.planId ?? null
  const ownedIsLifetime = caller?.isLifetime === true

  /* Satu periode: lifetime. Kalau paket lifetime yang sama/lebih tinggi sudah
     dimiliki, tidak ada yang perlu dibayar — kembalikan ke halaman paket.
     Pelanggan lama (monthly) tetap boleh membeli lifetime; nominalnya harga
     penuh lifetime, bukan perpanjangan 30 hari. */
  if (ownedIsLifetime && rankOf(ownedPlanId) >= plan.rank) {
    redirect('/checkout')
  }

  const code = first(params.kode).toUpperCase()
  const isUpgrade =
    ownedIsLifetime && rankOf(ownedPlanId) > 0 && plan.rank > rankOf(ownedPlanId)

  return (
    <main id="top" className="w-full bg-canvas font-sans text-forest">
      <LandingNavbarLp basePath="/" />
      <PaymentStartScreen
        plan={plan}
        ownedPlanId={ownedPlanId}
        ownedIsLifetime={ownedIsLifetime}
        isUpgrade={isUpgrade}
        referralCode={code || null}
      />
    </main>
  )
}

