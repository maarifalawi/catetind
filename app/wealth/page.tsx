import type { Metadata } from 'next'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { WealthScreen } from '@/components/catetind/wealth-screen'

export const metadata: Metadata = {
  title: 'Kekayaan & Hutang — CatetInd',
  description:
    'Investasi (saham, reksadana, emas, crypto), properti, dan hutang dalam satu layar: lihat Aset vs Hutang, pantau Debt Snowball, dan tahu cicilan yang sudah dipotong dari jatah harianmu.',
}

export default function WealthPage() {
  return (
    <PhoneStage>
      <WealthScreen />
    </PhoneStage>
  )
}
