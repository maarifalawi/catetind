import type { Metadata } from 'next'
import { PhoneStage } from '@/components/catetind/phone-stage'

export const metadata: Metadata = {
  title: 'Ajak Teman — CatetInd',
}

export default function ReferralPage() {
  return (
    <PhoneStage>
      <main className="flex min-h-screen items-center justify-center px-5 pb-32 pt-6">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Ajak Teman
        </h1>
      </main>
    </PhoneStage>
  )
}
