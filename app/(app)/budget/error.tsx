'use client'

import { PhoneStage } from '@/components/catetind/phone-stage'
import { SegmentErrorScreen } from '@/components/catetind/segment-error-screen'

/**
 * Error boundary area UANG: `/budget` (jatah harian, kategori, celengan).
 *
 * PERBAIKAN AUDIT: `/budget` adalah area uang seperti `/wallet`, `/wealth`,
 * `/history`, dan `/joint` — tapi ia tidak punya boundary sendiri, sehingga
 * error di halaman ini jatuh ke `app/error.tsx` (`withShell={false}`) dan
 * menghilangkan sidebar. Sekarang empat sekawan area uang itu lengkap: user
 * yang Budget-nya gagal render tetap bisa pindah halaman atau mengunduh datanya
 * dari layar ini (memakai jalur ekspor yang sama dengan `/settings/data`).
 */
export default function BudgetError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <PhoneStage>
      <SegmentErrorScreen area="budget" error={error} reset={reset} />
    </PhoneStage>
  )
}
