'use client'

import { PhoneStage } from '@/components/catetind/phone-stage'
import { SegmentErrorScreen } from '@/components/catetind/segment-error-screen'

/**
 * Error boundary area DASHBOARD (`/app`) — PERBAIKAN AUDIT.
 *
 * Dashboard sebelumnya bergantung pada `app/error.tsx` (boundary akar) yang
 * sengaja `withShell={false}`. Akibatnya, begitu Dashboard gagal render, sidebar
 * ikut hilang dan user kehilangan semua jalan ke halaman lain — padahal justru
 * itu alasan `withShell` dibuat (`components/catetind/segment-error-screen.tsx`).
 *
 * Boundary ini memakai default `withShell` (true) supaya sidebar tetap hidup.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <PhoneStage>
      <SegmentErrorScreen area="app" error={error} reset={reset} />
    </PhoneStage>
  )
}
