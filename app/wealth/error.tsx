'use client'

import { PhoneStage } from '@/components/catetind/phone-stage'
import { SegmentErrorScreen } from '@/components/catetind/segment-error-screen'

/**
 * Error boundary area UANG: `/wealth` (Kekayaan, hutang/piutang, Net Worth).
 * Satu bagian gagal dihitung tidak boleh mematikan seluruh app — dan user tetap
 * bisa mengunduh angkanya sebagai berkas (paket 43 · audit Stage 6 #3).
 */
export default function WealthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <PhoneStage>
      <SegmentErrorScreen area="wealth" error={error} reset={reset} />
    </PhoneStage>
  )
}
