'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { POST_ONBOARDING_ROUTE, WELCOME_TOAST_KEY } from '@/lib/onboarding'

/**
 * Toast "Setup selesai!" setelah onboarding (section 4C).
 *
 * Dipasang di root layout karena Toaster global ada di sana. Penandanya ditulis
 * onboarding ke sessionStorage, jadi toast ini:
 * - muncul tepat SEKALI saat dashboard pertama kali dibuka,
 * - tidak muncul lagi kalau user refresh / balik ke halaman lain,
 * - tidak pernah muncul untuk user yang onboarding-nya belum selesai.
 */
export function OnboardingWelcomeToast() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname !== POST_ONBOARDING_ROUTE) return

    let pending: string | null = null
    try {
      pending = sessionStorage.getItem(WELCOME_TOAST_KEY)
    } catch {
      /* private mode: tidak ada yang bisa dibaca — cukup diam */
    }
    if (!pending) return

    try {
      sessionStorage.removeItem(WELCOME_TOAST_KEY)
    } catch {
      /* diabaikan */
    }

    toast.success('Setup selesai! Selamat datang di CatetInd 🎉', {
      description:
        'Dompet & transaksi pertamamu sudah masuk. Yuk lanjut catat hari ini 🌿',
      duration: 4200,
    })
  }, [pathname])

  return null
}
