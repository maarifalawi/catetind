import type { Metadata } from 'next'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { CashflowCalendarScreen } from '@/components/catetind/cashflow-calendar-screen'

export const metadata: Metadata = {
  title: 'Kalender Cashflow — CatetInd',
  description:
    'Peta kebiasaan belanja harian: heatmap bulan yang memisahkan belanja impulsif dari tagihan terjadwal, plus siklus gajian yang mengikuti tanggal gajimu.',
}

export default function CalendarPage() {
  return (
    <PhoneStage>
      <CashflowCalendarScreen />
    </PhoneStage>
  )
}
