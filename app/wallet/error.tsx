'use client'

import { PhoneStage } from '@/components/catetind/phone-stage'
import { SegmentErrorScreen } from '@/components/catetind/segment-error-screen'

/**
 * Error boundary area UANG: `/wallet` (daftar dompet & koreksi saldo).
 *
 * Pakai `ScreenShell` (default `withShell`) supaya sidebar tetap hidup: user
 * yang halaman dompetnya gagal render TIDAK kehilangan akses ke catatannya —
 * ia masih bisa pindah ke Riwayat atau mengunduh data lewat tombol di layar ini.
 */
export default function WalletError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <PhoneStage>
      <SegmentErrorScreen area="wallet" error={error} reset={reset} />
    </PhoneStage>
  )
}
