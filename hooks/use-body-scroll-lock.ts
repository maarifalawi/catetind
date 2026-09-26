'use client'

import { useEffect } from 'react'

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

    return () => {
      body.style.overflow = prevOverflow
      body.style.paddingRight = prevPaddingRight
    }
  }, [locked, mobileOnly])
}
