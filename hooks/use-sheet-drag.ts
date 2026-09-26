'use client'

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

/* ── Shell modal penuh: swipe-down + deteksi bottom sheet ─────────────────────
   Dua hook ini lahir di `weekly-recap-modal.tsx` dan sekarang dipakai bersama
   Rekap Mingguan (inventaris #g) + Monthly Review & Target Setup (inventaris #i).
   Dipisah ke `hooks/` supaya kedua modal itu MUSTAHIL berbeda perilaku: satu
   sumber untuk ambang drag, resistensi tarikan ke atas, dan fling keluar.

   Sengaja tidak menyentuh `vaul`: kedua modal ini bukan bottom sheet biasa,
   melainkan panel penuh setinggi layar (mobile) / panel kanan 440px (desktop),
   jadi gestur ditulis sendiri. */

/** true kalau viewport < lg → panel tampil sebagai bottom sheet (swipe-down aktif) */
export function useIsBottomSheet() {
  const [isBottomSheet, setIsBottomSheet] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => setIsBottomSheet(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return isBottomSheet
}

/**
 * Swipe-down-untuk-menutup — khusus bottom sheet mobile.
 * - ditarik ke ATAS di-resist (dragY × 0.18) supaya panel tidak terasa "lepas"
 * - dilepas > 96px ATAU velocity > 0.5px/ms → fling keluar dulu, baru onClose()
 * - hanya aktif di < lg (di desktop panelnya panel kanan, bukan bottom sheet)
 */
export function useSheetDrag({
  enabled,
  onClose,
}: {
  enabled: boolean
  onClose: () => void
}) {
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [flinging, setFlinging] = useState(false)
  const startRef = useRef<{ y: number; t: number } | null>(null)
  const lastRef = useRef({ y: 0, t: 0 })
  const dragYRef = useRef(0)

  const setY = useCallback((v: number) => {
    dragYRef.current = v
    setDragY(v)
  }, [])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || flinging) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      const t = performance.now()
      startRef.current = { y: e.clientY, t }
      lastRef.current = { y: e.clientY, t }
      setDragging(true)
      setY(0)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [enabled, flinging, setY],
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const start = startRef.current
      if (!start) return
      const dy = e.clientY - start.y
      setY(dy > 0 ? dy : dy * 0.18)
      lastRef.current = { y: e.clientY, t: performance.now() }
    },
    [setY],
  )

  const finish = useCallback(() => {
    const start = startRef.current
    if (!start) return
    const dy = dragYRef.current
    const duration = Math.max(performance.now() - start.t, 1)
    const velocity = (lastRef.current.y - start.y) / duration // px/ms, positif = ke bawah
    startRef.current = null
    setDragging(false)

    if (dy > 96 || velocity > 0.5) {
      /* biarkan panel menyelesaikan gerak turunnya dulu, baru benar-benar ditutup
         supaya tidak ada "lompatan" posisi */
      setFlinging(true)
      window.setTimeout(() => {
        onClose()
        setFlinging(false)
        setY(0)
      }, 240)
      return
    }

    setY(0)
  }, [onClose, setY])

  return {
    dragY,
    dragging,
    flinging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
      onLostPointerCapture: finish,
    },
  }
}
