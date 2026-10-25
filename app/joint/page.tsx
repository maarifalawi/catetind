import type { Metadata } from 'next'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { JointScreen } from '@/components/catetind/joint-screen'

export const metadata: Metadata = {
  title: 'Joint Wallet | CatetInd',
  description:
    'Dompet bersama untuk pasangan: buku besar bersama (bukan saldo rekening), satu kartu settlement dengan arah transfer yang jelas, porsi kontribusi tiap orang, timeline berdua, split bill 4 mode, dan privasi transaksi.',
}

export default function JointPage() {
  return (
    <PhoneStage>
      <JointScreen />
    </PhoneStage>
  )
}