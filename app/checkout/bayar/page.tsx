import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { PaymentStartScreen } from '@/components/catetind/payment-start-screen'
import { PLANS, isSellablePeriod, type PlanId } from '@/lib/data/pricing'

/**
 * /checkout/bayar — mulai pembayaran (ALUR REDIRECT).
 *
 * Halaman ini hanya membaca PAKET + PERIODE + kode teman dari query. Nominal TIDAK
 * dititipkan di URL dan identitas pembeli tidak pernah datang dari klien: keduanya
 * ditentukan server (`/api/payment/create`) dari sesi + `lib/data/pricing.ts`.
 *
 * Paket/periode yang tidak dikenal → kembali ke `/checkout` (tidak ada yang bisa
 * ditagih, jadi jangan tampilkan halaman bayar kosong).
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
  searchParams: Promise<{ plan?: string | string[]; period?: string | string[]; kode?: string | string[] }>
}) {
  const params = await searchParams
  const plan = PLANS.find((item) => item.id === (first(params.plan) as PlanId))
  const period = first(params.period)

  if (!plan || !isSellablePeriod(period)) redirect('/checkout')

  const code = first(params.kode).toUpperCase()

  return (
    <PhoneStage plain>
      <PaymentStartScreen plan={plan} period={period} referralCode={code || null} />
    </PhoneStage>
  )
}
