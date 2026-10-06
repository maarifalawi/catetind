'use client'

import { useEffect, useRef, useState } from 'react'

/* ── Angka yang "berlari" dari 0 ke nilai akhirnya ───────────────────────────
   Dipakai Pain Calculator: tiap output menghitung naik dari 0 (bukan "muncul
   jadi") supaya angkanya terasa ditemukan user, bukan ditempel. Berbeda dari
   `hooks/use-count-up.ts` (yang mulai DARI nilai lama supaya saldo dompet tidak
   melompat), versi ini sengaja mulai dari 0 karena tiap angka di sini adalah
   INSIGHT baru, bukan pembaruan nilai yang sudah tampil.

   Anti-hydration-mismatch: `display` mulai dari 0, dan HTML server juga
   merender 0, jadi render pertama klien identik dengan server.
   `prefers-reduced-motion` → langsung ke angka akhir tanpa animasi. */
export function AnimatedNumber({
  value,
  duration = 900,
  format,
  onComplete,
  className,
}: {
  value: number
  duration?: number
  /** pemformat tampilan; hanya berubah saat display berubah */
  format: (n: number) => string
  /** dipanggil sekali setiap animasi selesai (dipakai memicu efek shake) */
  onComplete?: () => void
  className?: string
}) {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)
  const rafRef = useRef(0)
  /* callback & formatter disimpan di ref supaya effect tidak ikut jalan ulang
     hanya karena parent membuat ulang closure (mis. tiap ketikan) */
  const formatRef = useRef(format)
  const doneRef = useRef(onComplete)
  formatRef.current = format
  doneRef.current = onComplete

  useEffect(() => {
    const from = fromRef.current
    if (from === value) {
      doneRef.current?.()
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      fromRef.current = value
      setDisplay(value)
      doneRef.current?.()
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      const current = Math.round(from + (value - from) * eased)
      fromRef.current = current
      setDisplay(current)
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
      else {
        fromRef.current = value
        doneRef.current?.()
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  return <span className={className}>{formatRef.current(display)}</span>
}
