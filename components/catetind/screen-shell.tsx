'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { AI_COACH_ROUTES } from '@/lib/ai-chat'
import { pageLockCapability } from '@/lib/subscription/page-access'
import { DesktopSidebar } from './desktop-sidebar'
import { MobileNavDrawer, MobileNavProvider } from './mobile-nav-drawer'
import { MobileAppHeader } from './app-mobile-header'
import { useUpgradeGate } from './upgrade-gate-provider'
import { useSubscriptionGate } from './subscription-gate-provider'
import { cn } from '@/lib/utils'

/**
 * Shell halaman app: sidebar desktop (fixed) + kolom konten.
 *
 * PAKET 64 — DRAWER NAVIGASI MOBILE: tombol hamburger di header Dashboard butuh
 * jalan membuka konten sidebar yang SAMA. `MobileNavProvider` mengangkat state
 * "drawer terbuka" ke atas supaya header (anak di dalam shell) dan drawer (milik
 * shell) membaca satu nilai. Drawer-nya sendiri adalah `MobileNavDrawer`.
 */
export function ScreenShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  /* ── GERBANG HALAMAN (akses per paket) ──────────────────────────────────────
     Halaman terkunci TIDAK PERNAH dirender:

       · `waitingForPlan` — halaman ini berbayar dan paket belum diperiksa →
         isi halaman ditahan (null), jadi HTML awal tidak membocorkan halaman;
       · `lockedCapability` — paket terbaca & tidak berhak → popup upgrade
         dibuka, lalu user dipindahkan ke halaman aman (Dashboard / Pengaturan).

     `lockedPageCapability()` mengembalikan `null` saat paket belum terbaca ATAU
     backend tidak bisa diperiksa; dalam kedua kasus halaman akhirnya terbuka —
     aturan lama "jangan menuduh karena ketidaktahuan" tetap dipegang. */
  const { lockedPageCapability, planReady } = useSubscriptionGate()
  const { openUpgradeForPage } = useUpgradeGate()
  const requiredCapability = pageLockCapability(pathname)
  const lockedCapability = lockedPageCapability(pathname)
  const waitingForPlan = requiredCapability !== null && !planReady

  useEffect(() => {
    if (!lockedCapability) return
    openUpgradeForPage(pathname)
    /* Halaman terkunci tidak boleh jadi tujuan akhir: pindahkan ke halaman
       aman terdekat. Popup tetap hidup karena provider-nya ada di root layout. */
    const fallback =
      pathname === '/settings' || pathname.startsWith('/settings/') ? '/settings' : '/app'
    router.replace(fallback)
  }, [lockedCapability, pathname, openUpgradeForPage, router])

  const hasCoachFab =
    !lockedCapability && !waitingForPlan && AI_COACH_ROUTES.includes(pathname)

  return (
    <MobileNavProvider>
      {/* CATATAN TINGGI: shell SENGAJA tidak memaksa `min-h-[100dvh]`. Dulu
          <section>, kolom konten, DAN pembungkus isi semuanya memakai
          `min-h-[100dvh]`, sehingga di jendela/preview yang tinggi setiap
          halaman pendek (mis. detail dompet, empty state) ditarik setinggi
          layar penuh dan menyisakan ruang kosong panjang di bawah. Sekarang
          tinggi halaman mengikuti ISI-nya; latar tetap putih (`bg-canvas` di
          PhoneStage) dan navigasi/sidebar tetap `fixed`, jadi tidak ada yang
          bergeser — hanya ruang kosong di bawah yang hilang. */}
      <section className={cn('relative flex w-full', className)}>
        <DesktopSidebar />
        {/* Kolom konten digeser sebesar lebar sidebar (`--catet-sidebar-w`, di-set
            DesktopSidebar di <html>). Sidebar-nya sendiri `fixed` supaya kebal
            terhadap scroll-lock overlay (lihat catatan di desktop-sidebar.tsx),
            jadi offset-nya dikerjakan di sini. Transisinya disamakan dengan
            animasi buka/tutup sidebar supaya terasa satu gerakan. */}
        <div
          className={cn(
            'relative flex w-full min-w-0 flex-1 flex-col',
            'transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
            'lg:pl-[var(--catet-sidebar-w,280px)]',
          )}
        >
          {/* Audit UX #8: padding bawah desktop dinaikkan (pb-10 → pb-28 ≈ 112px)
              supaya konten bisa digulir lewat FAB AI Coach yang mengambang di
              pojok kanan bawah (bottom-8 + tinggi 56px ≈ 88px). Sebelumnya teks
              terakhir di kolom kanan tertindih FAB. */}
          <div
            className={cn(
              'relative flex w-full flex-1 flex-col px-5 pb-32 pt-6 sm:px-8 lg:px-10 lg:pt-8 xl:px-14 xl:pt-10',
              hasCoachFab ? 'lg:pb-28' : 'lg:pb-12',
            )}
          >
            {/* HEADER MOBILE GLOBAL (paket 75): satu bar atas untuk semua
                halaman app di mobile — lihat `app-mobile-header.tsx` untuk
                isinya (logo, lonceng, tombol mata KONDISIONAL, hamburger).
                Dulu tiap halaman menggambar header mobile sendiri sehingga
                posisi & isinya beda-beda; sekarang lewat shell ini seragam.
                Di desktop header ini `lg:hidden` — sidebar + header halaman
                sendiri yang berlaku. */}
            <MobileAppHeader />
            {waitingForPlan || lockedCapability ? null : children}
          </div>
        </div>
      </section>
      {/* drawer konten sidebar untuk mobile — di luar <section> supaya overlay-nya
          menutupi seluruh layar, bukan hanya kolom konten */}
      <MobileNavDrawer />
    </MobileNavProvider>
  )
}
