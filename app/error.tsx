'use client'

import { PhoneStage } from '@/components/catetind/phone-stage'
import { SegmentErrorScreen } from '@/components/catetind/segment-error-screen'

/**
 * Error boundary AKAR (paket 43 · audit Stage 6 #3).
 *
 * Menangkap error yang terjadi di semua halaman app yang TIDAK punya
 * `error.tsx` sendiri — termasuk `/` (Beranda) yang justru halaman uang paling
 * sering dibuka. Sengaja `withShell={false}`: kalau yang gagal ternyata sidebar
 * atau shell-nya, boundary ini tidak boleh ikut gagal karena hal yang sama.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <PhoneStage>
      <SegmentErrorScreen area="app" error={error} reset={reset} withShell={false} />
    </PhoneStage>
  )
}
