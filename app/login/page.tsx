import type { Metadata } from 'next'
import { LoginScreen } from '@/components/catetind/login-screen'
import { PhoneStage } from '@/components/catetind/phone-stage'

/**
 * Masuk (/login) — inventaris #8, halaman PUBLIK/pre-app.
 *
 * `PhoneStage plain` — layar fokus tanpa watermark raksasa di latar, sama seperti
 * /checkout: user datang untuk SATU hal (minta tautan masuk), bukan jalan-jalan.
 * TANPA ScreenShell/sidebar, dan `MobileBottomNav` + AI chat widget menyembunyikan
 * dirinya di prefix `/login` supaya tidak ada navigasi app di tengah alur masuk.
 *
 * Semua copy user-facing tinggal di `lib/data/auth.ts` (nol string di JSX).
 * Tautan "Daftar" di halaman ini menuju `/checkout` yang sudah ada, dan sebaliknya
 * sheet registrasi di /checkout menautkan balik ke sini — dua arah, nol tautan mati.
 */
export const metadata: Metadata = {
  title: 'Masuk — CatetInd',
  description:
    'Masuk ke CatetInd dengan satu email: kami kirim tautan masuk ke inboxmu. Tanpa password, tanpa langkah verifikasi yang menghadang.',
}

export default function LoginPage() {
  return (
    <PhoneStage plain>
      <LoginScreen />
    </PhoneStage>
  )
}
