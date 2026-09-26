'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Count-up halus untuk angka besar (Total Saldo / saldo dompet).
 *
 * Nilai awal SELALU sama dengan `value`, jadi HTML hasil render server dan
 * render pertama client identik (tidak ada hydration mismatch) — animasi hanya
 * dipicu saat `value` benar-benar berubah, mis. setelah Smart Sync mengoreksi
 * saldo. `fromRef` diperbarui tiap frame supaya animasi baru tetap menyambung
 * mulus dari angka yang sedang tampil kalau nilainya berubah di tengah jalan.
 *
 * Dipakai dua halaman (Dompet & Akun + Dompet Detail) — dulu tinggal di dalam
 * wallet-screen.tsx, diangkat ke sini supaya angka saldo di kedua halaman
 * dianimasikan dengan aturan yang sama.
 */
export function useCountUp(value: number, duration = 620) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    if (from === value) return
    // hormati preferensi aksesibilitas: lompat langsung ke angka akhir
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      fromRef.current = value
      setDisplay(value)
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
      else fromRef.current = value
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  return display
}
