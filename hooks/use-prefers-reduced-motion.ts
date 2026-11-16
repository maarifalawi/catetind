'use client'

import { useEffect, useState } from 'react'

/**
 * `prefers-reduced-motion` tanpa pustaka animasi.
 *
 * Sebelumnya hook ini datang dari framer-motion (`useReducedMotion`), dan
 * memakainya berarti seluruh framer-motion (±224 KB mentah / ±70 KB gzip)
 * ikut ke bundel halaman yang memanggilnya — termasuk landing. Untuk kebutuhan
 * sesederhana "matikan gerak", media query sudah cukup.
 *
 * Nilai awal SELALU `false` (sama di server & klien) lalu disinkronkan di efek,
 * jadi tidak ada hydration mismatch. Komponen yang memakainya juga sudah
 * menuliskan varian tanpa-gerak lewat kelas `motion-reduce:*` atau media query
 * di app/globals.css, sehingga kondisi `true` di sini hanya mempercepat
 * lompatan ke keadaan akhir.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  return reduced
}
