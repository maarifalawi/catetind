'use client'

import { PhoneStage } from '@/components/catetind/phone-stage'
import { SegmentErrorScreen } from '@/components/catetind/segment-error-screen'

/**
 * Error boundary area UANG: `/history` (Riwayat catatan).
 *
 * Sebelum paket 43, error render di halaman ini = layar mati total: user tidak
 * punya jalan mengambil catatannya. Sekarang ia dapat tombol "Muat ulang" DAN
 * "Unduh Data Saya" (paket 43 · audit Stage 6 #3).
 */
export default function HistoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <PhoneStage>
      <SegmentErrorScreen area="history" error={error} reset={reset} />
    </PhoneStage>
  )
}
