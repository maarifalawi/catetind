import type { Metadata } from 'next'
import { LandingNavbarLp } from '@/components/landing/lp/navbar'
import { LoginScreen } from '@/components/catetind/login-screen'
import { safeNextPath } from '@/lib/data/auth'

/**
 * Masuk (/login) — inventaris #8, halaman PUBLIK/pre-app.
 *
 * Sejak revisi desain, bingkai halaman ini memakai `LandingNavbarLp` di atas
 * dalam satu `<main id="top">` — TANPA footer landing: halaman masuk sengaja
 * berakhir di kartu formulir, bukan di menu pemasaran. Desain lama (PhoneStage +
 * PublicNavbar + panel batik dua kolom) sudah tidak dipakai lagi di sini.
 *
 * Jalur UTAMA = kode 6 angka yang diketik DI halaman ini (nol pindah app);
 * magic link tetap jalan lewat `/login/verify` untuk user yang memilih klik dari inbox.
 * TANPA ScreenShell/sidebar, dan `MobileBottomNav` + AI chat widget menyembunyikan
 * dirinya di prefix `/login` supaya tidak ada navigasi app di tengah alur masuk.
 *
 * Semua copy user-facing tinggal di `lib/data/auth.ts` (nol string di JSX).
 * Tautan "Daftar" di halaman ini menuju `/checkout` yang sudah ada, dan sebaliknya
 * sheet registrasi di /checkout menautkan balik ke sini — dua arah, nol tautan mati.
 */
export const metadata: Metadata = {
  title: 'Masuk | CatetInd',
  description:
    'Masuk ke CatetInd dengan satu email: kami kirim kode 6 angka ke inboxmu, lalu kamu ketik kodenya di halaman ini. Tanpa password.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  /* `?next=` dibaca di SERVER (pola sama dengan `/login/verify`): halaman masuk
     yang dibuka dari TENGAH alur — mau bayar, mau daftar — harus mengembalikan
     user ke tujuan aslinya, bukan menaruhnya di Dashboard. `safeNextPath`
     menyaring open-redirect sebelum nilainya dipakai. */
  const params = await searchParams
  const raw = params.next
  const next = safeNextPath(Array.isArray(raw) ? raw[0] : raw)

  return (
    <main id="top" className="w-full bg-canvas font-sans text-forest">
      <LandingNavbarLp basePath="/" />
      <LoginScreen next={next} />
    </main>
  )
}
