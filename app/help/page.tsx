import type { Metadata } from 'next'
import { HelpCenterScreen } from '@/components/catetind/help-center-screen'
import { PhoneStage } from '@/components/catetind/phone-stage'

export const metadata: Metadata = {
  title: 'Pusat Bantuan — CatetInd',
  description:
    'Cari jawaban pakai bahasa sehari-hari, ikuti langkah singkatnya, atau hubungi founder langsung lewat pintu di kaki artikel. Data keuanganmu tetap hanya milikmu.',
}

export default function HelpPage() {
  return (
    <PhoneStage>
      <HelpCenterScreen />
    </PhoneStage>
  )
}
