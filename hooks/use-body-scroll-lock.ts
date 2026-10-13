'use client'

import { useEffect } from 'react'

/* penghitung lintas-instance: kalau dua overlay mengunci bersamaan (jarang —
   repo ini selalu menutup overlay sebelum membuka yang lain), penanda baru
   benar-benar dilepas setelah yang TERAKHIR menutup. */
let lockDepth = 0

/**
 * Mengunci scroll background (document.body) selama overlay/panel terbuka.
 * Dipakai popup mobile (AI Chat, Balance Overview, dll.) supaya konten
 * di belakang panel tidak ikut ter-scroll.
 *
 * - overflow dikembalikan ke nilai semula saat unlock/unmount, jadi posisi
 *   scroll halaman tidak hilang.
 * - scrollbar dikompensasi via padding-right supaya layout tidak bergeser
 *   saat scrollbar menghilang (relevan di layar yang punya scrollbar).
 * - mobileOnly: skip lock saat viewport >= lg (1024px) — di desktop panel
 *   mengambang kecil dan scroll halaman tetap diizinkan.
 *
 * Aman dipakai bertumpuk (chat + popup terbuka bersamaan): tiap pemanggil
 * merestore nilai yang dia simpan, sehingga unlock terjadi berantai.
 *
 * PAKET 86 — penanda `data-catetind-overlay-open`: selama terkunci, atribut ini
 * dipasang di body supaya app/globals.css bisa MENJEDA animasi hias di latar
 * (ayunan tanaman, kilau `.progress-shimmer`, denyut `animate-ping`) — biaya
 * repaint yang tidak perlu justru yang membuat animasi buka/tutup panel terasa
 * patah-patah di HP. Sengaja atribut (bukan class) supaya tidak bentrok dengan
 * kunci scroll milik `react-remove-scroll`/Vaul yang menulis inline style.
 */
export function useBodyScrollLock(locked: boolean, mobileOnly = false) {
  useEffect(() => {
    if (!locked) return
    if (mobileOnly && window.matchMedia('(min-width: 1024px)').matches) return

    const body = document.body
    const prevOverflow = body.style.overflow
    const prevPaddingRight = body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`

    lockDepth += 1
    if (lockDepth === 1) body.dataset.catetindOverlayOpen = 'true'

    return () => {
      body.style.overflow = prevOverflow
      body.style.paddingRight = prevPaddingRight
      lockDepth = Math.max(0, lockDepth - 1)
      if (lockDepth === 0) delete body.dataset.catetindOverlayOpen
    }
  }, [locked, mobileOnly])
}
