import type { Metadata } from 'next'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { BillsScreen } from '@/components/catetind/bills-screen'

export const metadata: Metadata = {
  title: 'Tagihan Rutin — CatetInd',
  description:
    'Catat tagihan rutin bulanan — kos, langganan, cicilan — supaya jatah harian kamu lebih akurat. Tiap tagihan yang lunas menutup satu lajur tameng proteksi.',
}

export default function BillsPage() {
  return (
    <PhoneStage>
      <BillsScreen />
    </PhoneStage>
  )
}
