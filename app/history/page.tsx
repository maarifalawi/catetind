import type { Metadata } from 'next'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { HistoryScreen } from '@/components/catetind/history-screen'

export const metadata: Metadata = {
  title: 'Riwayat & Insight — CatetInd',
  description:
    'Otak analitik CatetInd: kalibrasi profil AI & skor kewarasan finansial, insight AI dengan aksi lanjutan, heatmap keborosan dalam matriks kalender, dan riwayat transaksi yang bisa dicari & difilter.',
}

export default function HistoryPage() {
  return (
    <PhoneStage>
      <HistoryScreen />
    </PhoneStage>
  )
}
