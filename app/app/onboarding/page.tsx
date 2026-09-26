import type { Metadata } from 'next'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { OnboardingFlow } from '@/components/catetind/onboarding-flow'

export const metadata: Metadata = {
  title: 'Kenalan Dulu Yuk — CatetInd',
  description:
    'Onboarding 3 langkah: pilih situasi keuanganmu, buat dompet pertamamu (pemasukan bulanan opsional), lalu catat transaksi pertamamu. Kurang dari 1 menit.',
}

/**
 * Onboarding (/app/onboarding) — layar pertama setelah user bayar.
 *
 * SENGAJA tidak memakai ScreenShell: flow ini full-screen tanpa sidebar & tanpa
 * bottom navigation (keduanya di-hide dari komponen globalnya), dengan konten
 * yang tetap dibatasi max-w-[480px] di desktop supaya terasa seperti aplikasi.
 *
 * `PhoneStage plain` = kanvas rata (bg-cream) tanpa gradien hijau & wordmark
 * raksasa di latar, karena layar onboarding didesain minimalis.
 */
export default function OnboardingPage() {
  return (
    <PhoneStage plain>
      <OnboardingFlow />
    </PhoneStage>
  )
}
