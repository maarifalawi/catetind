import type { Metadata } from 'next'
import { WelcomeScreen } from '@/components/catetind/welcome-screen'
import { SITE_ORIGIN } from '@/lib/site'

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
  title: 'CatetInd | Track. Grow. Secure.',
  description:
    'Catat pemasukan & pengeluaran tanpa ribet. Rapi otomatis, jelas dalam sekali lihat, dan nggak perlu bikin password. Mulai gratis hari ini.',
  /* ── `canonical` SENDIRI — WAJIB ──────────────────────────────────────────
     `app/layout.tsx` memasang `alternates.canonical` = beranda. Metadata
     warisan itu berlaku untuk SEMUA rute yang tidak menimpanya, jadi halaman
     publik ini harus menyebut dirinya sendiri; kalau tidak, Google membaca
     `/welcome` sebagai duplikat `catetind.com` dan halaman ini tidak pernah
     tampil di hasil pencarian. */
  alternates: { canonical: `${SITE_ORIGIN}/welcome` },
}

export default function WelcomePage() {
  return <WelcomeScreen />
}
