import type { Metadata } from 'next'
import { PhoneStage } from '@/components/catetind/phone-stage'

export const metadata: Metadata = {
  title: 'Insight — CatetInd',
}

export default function InsightPage() {
  return (
    <PhoneStage>
      <main className="flex min-h-screen items-center justify-center px-5 pb-32 pt-6">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Insight</h1>
      </main>
    </PhoneStage>
  )
}
