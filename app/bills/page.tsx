import type { Metadata } from 'next'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { BillsScreen } from '@/components/catetind/bills-screen'

export const metadata: Metadata = {
  title: 'Tagihan Rutin | CatetInd',
  description:
    'Catat tagihan rutin bulanan dan tandai lunas tanpa mencatat dua kali.',
}

export default function BillsPage() {
  return (
    <PhoneStage>
      <BillsScreen />
    </PhoneStage>
  )
}
