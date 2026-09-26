import type { Metadata } from 'next'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { BudgetScreen } from '@/components/catetind/budget-screen'

export const metadata: Metadata = {
  title: 'Budget & Target — CatetInd',
  description:
    'Atur limit pengeluaran per kategori dan tumbuhkan celengan impian: jatah harian, pacing ideal, sapu bersih sisa budget, dan sinking fund dengan metafora tanaman.',
}

export default function BudgetPage() {
  return (
    <PhoneStage>
      <BudgetScreen />
    </PhoneStage>
  )
}
