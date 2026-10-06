import type { Metadata } from 'next'
import { WelcomeScreen } from '@/components/catetind/welcome-screen'

/**
 * Halaman depan (/welcome) — inventaris #2, halaman PUBLIK/pre-app.
 *
 * TIDAK memakai `PhoneStage`: bingkai itu berkanvas PUTIH (layar app),
 * sedangkan halaman ini sengaja gelap rata ala halaman depan editorial.
 * Bingkai, tinggi layar, dan latar diurus `WelcomeScreen` sendiri.
 *
 * TANPA ScreenShell/sidebar, dan `MobileBottomNav` + AI chat widget
 * menyembunyikan dirinya di route ini (lihat `FOCUS_ROUTES` di
 * components/MobileBottomNav.tsx) supaya pengunjung yang belum punya akun tidak
 * ditawari navigasi app yang isinya data keuangan.
 */
export const metadata: Metadata = {
  title: 'CatetInd — Track. Grow. Secure.',
  description:
    'Catat pemasukan & pengeluaran tanpa ribet. Rapi otomatis, jelas dalam sekali lihat, dan nggak perlu bikin password. Mulai gratis hari ini.',
}

export default function WelcomePage() {
  return <WelcomeScreen />
}
