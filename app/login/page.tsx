import type { Metadata } from 'next'
import { LoginScreen } from '@/components/catetind/login-screen'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { PublicNavbar } from '@/components/catetind/public-navbar'

/**
 * Masuk (/login) — inventaris #8, halaman PUBLIK/pre-app.
 *
 * `PhoneStage plain` — layar fokus tanpa watermark raksasa di latar, sama seperti
 * /checkout: user datang untuk SATU hal (masuk), bukan jalan-jalan. Sejak revisi
 * desain, jalur UTAMA = kode 6 angka yang diketik DI halaman ini (nol pindah app);
 * magic link tetap jalan lewat `/login/verify` untuk user yang memilih klik dari inbox.
 * TANPA ScreenShell/sidebar, dan `MobileBottomNav` + AI chat widget menyembunyikan
 * dirinya di prefix `/login` supaya tidak ada navigasi app di tengah alur masuk.
 * Yang dipasang sebagai gantinya adalah `PublicNavbar` — navbar SITUS (di luar
 * sistem app), konsisten dengan /login/verify.
 *
 * Semua copy user-facing tinggal di `lib/data/auth.ts` (nol string di JSX).
 * Tautan "Daftar" di halaman ini menuju `/checkout` yang sudah ada, dan sebaliknya
 * sheet registrasi di /checkout menautkan balik ke sini — dua arah, nol tautan mati.
 */
export const metadata: Metadata = {
  title: 'Masuk — CatetInd',
  description:
    'Masuk ke CatetInd dengan satu email: kami kirim kode 6 angka ke inboxmu, lalu kamu ketik kodenya di halaman ini. Tanpa password.',
}

export default function LoginPage() {
  return (
    <PhoneStage plain>
      <PublicNavbar />
      <LoginScreen />
    </PhoneStage>
  )
}
