import type { Metadata } from 'next'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { ReferralScreen } from '@/components/catetind/referral-screen'

export const metadata: Metadata = {
  title: 'Ajak Teman — CatetInd',
  description:
    'Bagikan link unikmu ke teman: mereka dapat diskon 10% saat checkout, dan kamu langsung dapat reward AI Token atau tambahan masa aktif — otomatis, tanpa klaim.',
}

export default function ReferralPage() {
  return (
    <PhoneStage>
      <ReferralScreen />
    </PhoneStage>
  )
}

