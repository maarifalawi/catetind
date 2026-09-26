'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Lenis from 'lenis'

/**
 * Deteksi halaman sedang dikunci scroll-nya oleh overlay (drawer vaul,
 * panel AI Coach, Balance Overview, Rekap Mingguan, dll. semuanya mengunci
 * `document.body`). Dipakai untuk menghentikan permintaan smooth-scroll
 * Lenis selama terkunci: kalau tidak, target scroll menumpuk di balik layar
 * lalu terasa "melompat" begitu overlay ditutup.
 */
function isPageScrollLocked() {
  const { overflowY } = getComputedStyle(document.body)
  return overflowY === 'hidden' || overflowY === 'clip'
}

/**
 * Smooth scroll global (Lenis) — dipasang sekali di root layout, jadi berlaku
 * di SEMUA halaman (dashboard, wallet, budget, settings, dst.), bukan hanya
 * dashboard.
 *
 * Yang dijaga:
 * - Roda mouse punya inersia halus (`lerp`) tapi scroll native tetap dipakai
 *   di baliknya, sehingga `position: sticky`, `window.scrollY`, dan anchor
 *   link tetap berfungsi normal.
 * - Area yang punya scroll sendiri (sidebar, area pesan AI Coach, drawer,
 *   modal rekap) tidak dirampas — lihat `data-lenis-prevent` di tiap panel
 *   plus `allowNestedScroll` sebagai jaring pengaman.
 * - `prefers-reduced-motion` dihormati otomatis oleh Lenis (smoothing mati,
 *   scroll kembali 1:1 dengan input device).
 * - Saat overlay (bottom sheet / modal / panel) terbuka, Lenis DI-PAUSE dan
 *   sisa inersianya dimatikan — lihat blok MutationObserver di dalam effect;
 *   ini yang mencegah frame drop selama animasi buka/tutup popup.
 */
export function SmoothScrollProvider() {
  const lenisRef = useRef<Lenis | null>(null)
  /** status lock terakhir. Dibaca `virtualScroll` pada tiap event wheel —
   *  sengaja disimpan di ref supaya kita tidak perlu memanggil
   *  `getComputedStyle` (yang memaksa style recalc) di tengah interaksi user. */
  const lockedRef = useRef(false)
  const pathname = usePathname()

  useEffect(() => {
    const lenis = new Lenis({
      // 0.1 = standar Lenis: inersia halus, tidak terasa "nyangkut"
      lerp: 0.1,
      autoRaf: true,
      // link dalam halaman (#anchor) ikut meluncur halus
      anchors: true,
      // panel/laci dengan scroll sendiri tetap native
      allowNestedScroll: true,
      // pindah route = sisa inersia langsung dibunuh
      stopInertiaOnNavigate: true,
      virtualScroll: ({ event }) => {
        // overlay sedang terbuka → jangan simpan target scroll baru
        if (lockedRef.current) return false
        // shift + wheel = scroll horizontal native (mis. tabel/kartu lebar)
        return !event.shiftKey
      },
    })

    lenisRef.current = lenis
    lockedRef.current = isPageScrollLocked()

    /* Semua overlay di app ini mengunci scroll dengan mengubah `document.body`
       — baik lewat hook kita (use-body-scroll-lock.ts) maupun lewat Vaul /
       react-remove-scroll yang menandai body dengan `data-scroll-locked`.
       Perubahan itu kita ikuti, lalu Lenis DI-PAUSE selama terkunci:

       - `stop()` memanggil `animate.stop()`, jadi sisa inersia dari scroll
         sebelum popup dibuka langsung mati. Tanpa ini Lenis masih menulis
         posisi scroll tiap frame di balik layar selama animasi buka panel —
         bersamaan dengan animasi overlay itu sendiri, inilah yang membuat
         frame drop terasa sebagai "patah-patah".
       - permintaan scroll baru juga tidak menumpuk untuk "melompat" begitu
         overlay ditutup (alasan yang sama seperti guard di `virtualScroll`).

       MutationObserver dipilih — bukan pemanggilan langsung dari hook — supaya
       SEMUA jalur lock ikut terjaga, termasuk Vaul yang mengunci body sendiri
       tanpa melewati hook kita. */
    const syncLockState = () => {
      const locked = isPageScrollLocked()
      if (locked === lockedRef.current) return
      lockedRef.current = locked
      if (locked) lenis.stop()
      else lenis.start()
    }

    const observer = new MutationObserver(syncLockState)
    observer.observe(document.body, {
      attributes: true,
      // `style`/`class` = jalur useBodyScrollLock; `data-scroll-locked` = Vaul
      attributeFilter: ['style', 'class', 'data-scroll-locked'],
    })
    syncLockState()

    return () => {
      observer.disconnect()
      lenisRef.current = null
      lenis.destroy()
    }
  }, [])

  /* Next.js mengembalikan posisi scroll ke atas secara native setiap pindah
     route. Di frame berikutnya nilai internal Lenis disamakan dengan posisi
     nyata itu, supaya tidak ada perebutan antara Next dan sisa inersia Lenis. */
  useEffect(() => {
    const raf = requestAnimationFrame(() => lenisRef.current?.resize())
    return () => cancelAnimationFrame(raf)
  }, [pathname])

  return null
}
