'use client'

import { usePathname } from 'next/navigation'
import { MobileStickyHeader } from './mobile-sticky-header'
import { MobileNavButton } from './mobile-nav-drawer'
import { NotificationBell } from './notification-bell'
import { GlobalPrivacyToggle } from './global-privacy-toggle'
import { LogoWordmark } from './logo-wordmark'
import { showsBalanceToggle } from '@/lib/shows-amounts'

/* ── HEADER MOBILE GLOBAL (paket 75) ─────────────────────────────────────────
   SATU bar atas untuk SELURUH halaman app di mobile. Sebelum paket 75 tiap
   halaman menggambar header mobile sendiri-sendiri (Dashboard punya
   `MobileStickyHeader`, Budget/Bills/Kalender punya `<header>` dengan logo+avatar,
   halaman lain menempelkan tombol mata di baris judul), sehingga posisi kontrol
   dan isinya BEDA dari halaman ke halaman. Sekarang `ScreenShell` merender
   komponen INI sekali, jadi setiap halaman app otomatis punya header yang sama.

   Isinya (kiri → kanan):
     • LogoWordmark          — identitas, selalu ada;
     • lonceng notifikasi    — panel keadaan kosong (paket 64);
     • TOMBOL MATA (kondisional) — HANYA di route yang menampilkan nominal,
       diputuskan `showsBalanceToggle(pathname)` (satu sumber: lib/shows-amounts.ts);
     • tombol menu (hamburger) — membuka laci navigasi sekunder.

   DUA KEPUTUSAN SENGAJA:
     1. AVATAR PROFIL DICABUT dari header mobile (permintaan produk). Profil
        tetap terjangkau lewat sidebar/drawer & halaman Pengaturan; di bar atas
        yang sempit, avatar cuma memakan slot tanpa jadi aksi. (Avatar desktop
        tetap, itu di dalam `DesktopSidebar`.)
     2. Bar ini `sticky` + mengikuti gulir lewat `MobileStickyHeader`
        (paket 70) — perilaku yang dulu cuma dimiliki Dashboard, kini konsisten
        di semua halaman.

   Hanya dirender di bawah `lg` (`lg:hidden` di `MobileStickyHeader`): di desktop
   sudah ada sidebar + header halaman sendiri.
   ────────────────────────────────────────────────────────────────────────── */

export function MobileAppHeader() {
  const pathname = usePathname()

  return (
    <MobileStickyHeader>
      <LogoWordmark className="h-5" />
      <div className="flex items-center gap-2">
        <NotificationBell className="size-9" />
        {/* tombol mata hanya di halaman bernominal — lihat lib/shows-amounts.ts */}
        {showsBalanceToggle(pathname) && <GlobalPrivacyToggle className="size-9" />}
        <MobileNavButton className="size-9" />
      </div>
    </MobileStickyHeader>
  )
}
