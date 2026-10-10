'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* ── MobileAppHeader bar — ikut dokumen, TIDAK menempel (revisi) ─────────────
   Permintaan pemilik produk: header JANGAN mengikuti scroll. Kalau user menggulir
   ke bawah, posisinya tinggal di atas (ikut hilang bersama konten) — jadi untuk
   melihat header lagi, user menggulir balik ke atas. Sebelumnya bar ini `sticky`
   sehingga selalu menempel; perilaku itu DICABUT di sini.

   SATU HAL YANG SENGAJA DIPAKU:
   margin negatif. Header ini anak dari kolom konten `ScreenShell` yang punya
   `px-5 pt-6 sm:px-8`; margin negatif (`-mx-5 -mt-6 sm:-mx-8`) membuatnya rata
   PENUH ke tepi kolom, tanpa celah padding di kiri/atas. Paddingnya dikembalikan
   di kelas yang sama supaya isi header tetap rapi.

   Hanya dirender di bawah `lg` (`lg:hidden`): di desktop sudah ada sidebar tetap. */

export function MobileStickyHeader({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        '-mx-5 -mt-6 flex items-center justify-between gap-3 px-5 py-3 sm:-mx-8 sm:px-8',
        'bg-canvas/90 lg:hidden',
        className,
      )}
    >
      {children}
    </header>
  )
}
