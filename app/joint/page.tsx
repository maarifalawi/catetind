import type { Metadata } from 'next'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { JointScreen } from '@/components/catetind/joint-screen'

export const metadata: Metadata = {
  title: 'Joint Wallet — CatetInd',
  description:
    'Dompet bersama untuk pasangan: buku besar bersama (bukan saldo rekening), timbangan settlement yang miring ke sisi yang nalangin lebih banyak, timeline berdua, split bill 4 mode, dan privasi transaksi.',
}

export default function JointPage() {
  return (
    <PhoneStage>
      <JointScreen />
    </PhoneStage>
  )
}