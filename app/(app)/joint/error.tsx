'use client'

import { PhoneStage } from '@/components/catetind/phone-stage'
import { SegmentErrorScreen } from '@/components/catetind/segment-error-screen'

/**
 * Error boundary area UANG: `/joint` (dompet bersama).
 *
 * Buku besar bersama dibaca dua orang; kalau satu bagian gagal render, yang
 * tidak boleh hilang adalah akses user ke datanya sendiri — itu alasan tombol
 * "Unduh Data Saya" ada di layar ini juga (paket 43 · audit Stage 6 #3).
 */
export default function JointError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <PhoneStage>
      <SegmentErrorScreen area="joint" error={error} reset={reset} />
    </PhoneStage>
  )
}
