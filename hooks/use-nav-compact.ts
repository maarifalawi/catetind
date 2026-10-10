'use client'

import { useEffect, useRef, useState } from 'react'
import { useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion'

/* ── NAVIGASI UTAMA YANG MENYUSUT SAAT DIGULIR (paket 75) ─────────────────────
   Permintaan pemilik produk: navigasi utama yang DINAMIS — scroll ke BAWAH =
   nav memadat (py-2, ikon/teks lebih kecil), scroll ke ATAS = kembali ke ukuran
   normal. Nav TIDAK pernah menghilang (itu keputusan paket 70: "di-fix aja,
   selalu stay"); yang berubah cuma kerapatannya, jadi tetap satu navigasi yang
   selalu bisa dijangkau.

   Kenapa "memadat", bukan "sembunyi": di layar HP, nav setinggi 64px di atas
   konten adalah 64px data yang hilang. Saat user sedang membaca ke bawah, ia
   sudah tahu di mana ia berada — jadi nav boleh mengecil. Begitu jarinya
   berbalik ke atas, niatnya berpindah tempat, dan nav harus kembali penuh.

   Keputusan "padat atau tidak" SENGAJA dipisah jadi fungsi MURNI
   (`nextNavCompact`) supaya bisa diuji tanpa DOM — pola yang sama dengan
   `nextNavAutoHide` di `hooks/use-nav-auto-hide.ts`: aturannya cuma ada SATU
   tempat, dan test menguji aturan itu apa adanya.

   Scroll dibaca lewat `useScroll` dari framer-motion (bukan listener manual)
   supaya nilainya mengikuti `MotionValue` yang sama dengan animasi lain dan
   tidak ada dua sumber posisi gulir. Status `compact` default `false` di server
   & render pertama, baru dihitung SETELAH mount → tidak ada hydration mismatch.
   ────────────────────────────────────────────────────────────────────────── */

/** Perpindahan minimum (px) sebelum arah gulir dianggap benar-benar berubah.
 *  Tanpa ambang ini, sisa inersia & jitter jari membuat nav berkedip
 *  padat–penuh di setiap frame. */
export const NAV_COMPACT_THRESHOLD = 6

/** Di bawah ketinggian ini (px) nav SELALU penuh — puncak halaman tidak boleh
 *  terasa "menyempit" hanya karena gulir palsu dari address bar iOS. */
export const NAV_COMPACT_IGNORE_UNTIL = 96

export type NavCompactInput = {
  /** kondisi nav sekarang (hasil keputusan sebelumnya) — dipertahankan saat
   *  perpindahan gulir masih di bawah ambang. */
  compact: boolean
  /** posisi gulir sekarang (`window.scrollY` lewat `useScroll`). */
  scrollY: number
  /** posisi gulir pada pengukuran sebelumnya. */
  lastScrollY: number
  threshold?: number
  ignoreUntil?: number
}

/**
 * Keputusan murni: apakah nav harus PADAT pada pengukuran ini?
 *
 * - `scrollY` masih di zona puncak → `false` (selalu penuh).
 * - bergerak turun lebih dari `threshold` → `true` (padat).
 * - bergerak naik lebih dari `threshold`  → `false` (penuh lagi).
 * - lainnya (gulir nyaris diam / jitter)  → `compact` tidak berubah.
 */
export function nextNavCompact({
  compact,
  scrollY,
  lastScrollY,
  threshold = NAV_COMPACT_THRESHOLD,
  ignoreUntil = NAV_COMPACT_IGNORE_UNTIL,
}: NavCompactInput): boolean {
  if (scrollY <= ignoreUntil) return false

  const delta = scrollY - lastScrollY
  if (delta > threshold) return true
  if (delta < -threshold) return false

  return compact
}

/**
 * Hook penyusut navigasi utama (dipakai `MobileBottomNav`).
 *
 * @param enabled `false` (mis. halaman fokus tanpa nav) → tidak pernah padat.
 * @returns `true` kalau nav seharusnya memadat (ikon/teks lebih kecil, py-2).
 *
 * `prefers-reduced-motion` dihormati: saat user meminta gerak minimal, nav
 * TIDAK menyusut sama sekali — ukurannya tetap, jadi tidak ada gerakan yang
 * mengganggu (menyusut = perubahan ukuran yang, tanpa animasi, terasa "lompat").
 */
export function useNavCompact(enabled = true): boolean {
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const [compact, setCompact] = useState(false)
  /* `compactRef` = cermin sinkron dari state (supaya keputusan per-frame tidak
     menunggu re-render); `lastRef` = posisi gulir pengukuran sebelumnya. */
  const compactRef = useRef(false)
  const lastRef = useRef(0)

  /* nonaktif / reduced-motion → paksa penuh lagi, ukur ulang dari posisi kini */
  useEffect(() => {
    if (enabled && !reduce) return
    compactRef.current = false
    lastRef.current = typeof window === 'undefined' ? 0 : window.scrollY
    setCompact(false)
  }, [enabled, reduce])

  useMotionValueEvent(scrollY, 'change', (value) => {
    if (!enabled || reduce) return
    const next = nextNavCompact({
      compact: compactRef.current,
      scrollY: value,
      lastScrollY: lastRef.current,
    })
    lastRef.current = value
    if (next === compactRef.current) return
    compactRef.current = next
    setCompact(next)
  })

  return compact
}
