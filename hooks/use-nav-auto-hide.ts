'use client'

import { useEffect, useState } from 'react'

/* ── NAVIGASI BAWAH MOBILE YANG MENYEMBUNYIKAN DIRI SAAT DIGULIR ──────────────
   Perilaku yang diminta (uji pemakaian mobile):

     • menggulir ke BAWAH  → nav menyingkir turun ke luar layar;
     • menggulir ke ATAS   → nav langsung muncul lagi;
     • di dekat PUNCAK halaman → SELALU tampil (apa pun arah gulirnya).

   Alasannya bukan estetika: di layar HP, nav bulat setinggi 64px di atas
   konten adalah 64px data yang hilang dari pandangan. Saat user sedang membaca
   ke BAWAH ia sudah tahu di mana ia berada, jadi nav boleh menyingkir; begitu
   jarinya berbalik ke ATAS, niatnya adalah berpindah tempat — dan di situ nav
   harus ada SEBELUM jarinya berhenti, bukan sesudah.

   Keputusan "tampil atau sembunyi" sengaja dipisah jadi fungsi MURNI
   (`nextNavAutoHide`) supaya bisa diuji tanpa DOM — pola yang sama dengan
   `computeSheetViewport` di hooks/use-sheet-viewport-cage.ts: aturannya hanya
   ada SATU tempat, dan test menguji aturan itu apa adanya, bukan salinannya.

   CATATAN — kenapa TIDAK membaca nilai absolut gulir?
   Ambang `NAV_ALWAYS_VISIBLE_UNTIL` sengaja ada di sini walau sudah ada
   `hidden=false` dari arah gulir, karena dua hal di mobile:
     1. iOS Safari menggeser address bar saat menggulir dan itu memicu event
        `scroll` palsu; di area puncak, gulir palsu itu tidak boleh membuat nav
        ikut menyembunyikan diri.
     2. Rubber-band / overscroll di puncak menghasilkan `scrollY` negatif —
        `scrollY <= ambang` menanganinya tanpa cabang khusus.
*/

/** Perpindahan minimum (px, per frame) sebelum arah gulir dianggap benar-benar
 *  berubah. Tanpa ambang ini, sisa inersia & jitter jari akan membuat nav
 *  berkedip naik-turun di setiap frame. */
export const NAV_AUTO_HIDE_THRESHOLD = 6

/** Di bawah ketinggian ini (px) nav SELALU tampil — termasuk saat user menggulir
 *  ke bawah, supaya puncak halaman tidak pernah "kehilangan" navigasinya. */
export const NAV_ALWAYS_VISIBLE_UNTIL = 72

export type NavAutoHideInput = {
  /** kondisi nav sekarang (hasil keputusan sebelumnya) — dipakai saat
   *  perpindahan gulir masih di bawah ambang, jadi keputusan terakhir
   *  dipertahankan apa adanya. */
  hidden: boolean
  /** posisi gulir sekarang (`window.scrollY`). */
  scrollY: number
  /** posisi gulir pada pengukuran sebelumnya. */
  lastScrollY: number
  threshold?: number
  alwaysVisibleUntil?: number
}

/**
 * Keputusan murni: apakah nav harus tersembunyi pada pengukuran ini?
 *
 * - `scrollY` masih di zona puncak → `false` (selalu tampil).
 * - bergerak turun lebih dari `threshold` → `true` (sembunyi).
 * - bergerak naik lebih dari `threshold`  → `false` (tampil).
 * - lainnya (gulir nyaris diam / jitter)  → `hidden` tidak berubah.
 */
export function nextNavAutoHide({
  hidden,
  scrollY,
  lastScrollY,
  threshold = NAV_AUTO_HIDE_THRESHOLD,
  alwaysVisibleUntil = NAV_ALWAYS_VISIBLE_UNTIL,
}: NavAutoHideInput): boolean {
  if (scrollY <= alwaysVisibleUntil) return false

  const delta = scrollY - lastScrollY
  if (delta > threshold) return true
  if (delta < -threshold) return false

  return hidden
}

/**
 * Hook auto-hide untuk navigasi bawah mobile (dipakai `MobileBottomNav`).
 *
 * @param resetKey pindah nilai (mis. `pathname`) → nav DIPAKSA tampil lagi,
 *                 sekaligus mengukur ulang dari posisi gulir halaman baru.
 *                 Tanpa ini, nav bisa tetap tersembunyi setelah pindah route.
 * @param enabled  `false` (mis. halaman fokus tanpa nav) → listener tidak
 *                 dipasang sama sekali.
 * @returns `true` kalau nav seharusnya menyingkir ke bawah layar.
 *
 * Pengukuran sengaja dibungkus `requestAnimationFrame`: event `scroll` bisa
 * menyala puluhan kali per frame (apalagi saat mengikuti inersia Lenis), padahal
 * yang dibutuhkan hanya satu pembacaan `window.scrollY` per frame — dan
 * pembacaan itulah yang memaksa style/layout recalc.
 */
export function useNavAutoHide(resetKey: string, enabled = true): boolean {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    // Halaman tanpa nav: tidak ada yang perlu diukur, dan kalau nanti halaman
    // ini punya nav lagi (route berubah), nav mulai dari kondisi TAMPIL.
    if (!enabled) {
      setHidden(false)
      return
    }

    let lastScrollY = window.scrollY
    let hiddenNow = false
    let frame = 0

    // halaman baru / nav aktif kembali → mulai dari kondisi tampil
    setHidden(false)

    const measure = () => {
      frame = 0
      const scrollY = window.scrollY
      const next = nextNavAutoHide({ hidden: hiddenNow, scrollY, lastScrollY })
      lastScrollY = scrollY
      if (next === hiddenNow) return
      hiddenNow = next
      setHidden(next)
    }

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(measure)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [enabled, resetKey])

  return hidden
}
