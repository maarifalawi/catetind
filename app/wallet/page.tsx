import type { Metadata } from 'next'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { WalletScreen } from '@/components/catetind/wallet-screen'

export const metadata: Metadata = {
  title: 'Dompet & Akun — CatetInd',
  description:
    'Kelola semua dompet, rekening bank, dan e-wallet kamu dalam satu tempat: total saldo kas, porsi tiap akun, dan koreksi saldo manual.',
}

export default function WalletPage() {
  return (
    <PhoneStage>
      <WalletScreen />
    </PhoneStage>
  )
}
