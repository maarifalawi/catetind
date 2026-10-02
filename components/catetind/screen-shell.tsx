import type { ReactNode } from 'react'
import { DesktopSidebar } from './desktop-sidebar'
import { MobileNavDrawer, MobileNavProvider } from './mobile-nav-drawer'
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
  return (
    <MobileNavProvider>
      <section className={cn('relative flex min-h-[100dvh] w-full', className)}>
        <DesktopSidebar />
        {/* Kolom konten digeser sebesar lebar sidebar (`--catet-sidebar-w`, di-set
            DesktopSidebar di <html>). Sidebar-nya sendiri `fixed` supaya kebal
            terhadap scroll-lock overlay (lihat catatan di desktop-sidebar.tsx),
            jadi offset-nya dikerjakan di sini. Transisinya disamakan dengan
            animasi buka/tutup sidebar supaya terasa satu gerakan. */}
        <div
          className={cn(
            'relative flex min-h-[100dvh] w-full min-w-0 flex-1 flex-col',
            'transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
            'lg:pl-[var(--catet-sidebar-w,280px)]',
          )}
        >
          {/* Audit UX #8: padding bawah desktop dinaikkan (pb-10 → pb-28 ≈ 112px)
              supaya konten bisa digulir lewat FAB AI Coach yang mengambang di
              pojok kanan bawah (bottom-8 + tinggi 56px ≈ 88px). Sebelumnya teks
              terakhir di kolom kanan tertindih FAB. */}
          <div className="relative flex min-h-[100dvh] w-full flex-1 flex-col px-5 pb-32 pt-6 sm:px-8 lg:px-10 lg:pb-28 lg:pt-8 xl:px-14 xl:pt-10">
            {children}
          </div>
        </div>
      </section>
      {/* drawer konten sidebar untuk mobile — di luar <section> supaya overlay-nya
          menutupi seluruh layar, bukan hanya kolom konten */}
      <MobileNavDrawer />
    </MobileNavProvider>
  )
}
