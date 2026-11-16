'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

/* ── UMPAN PEMBELI — DIMUAT SETELAH HALAMAN TENANG ───────────────────────────
   Toast "… baru saja beli Paket …" murni dekoratif: ia tidak menambah satu pun
   kata kunci untuk mesin pencari dan tidak dibutuhkan untuk membaca halaman.
   Karena itu komponennya TIDAK dirender saat muat pertama:

     · `ssr: false`  → HTML-nya tidak ikut dikirim (memang tidak perlu);
     · `ready`       → baru true setelah interaksi pertama pengunjung ATAU
       setelah 6 detik idle.

   Efeknya: chunk komponen ini — beserta framer-motion yang dipakainya untuk
   animasi masuk/keluar — TIDAK ada di bundel awal landing. Sebelumnya widget
   ini ikut diunduh & dieksekusi sebelum pengunjung sempat menggulir, dan itu
   menaikkan Total Blocking Time di HP. */

const LandingPurchaseToasts = dynamic(
  () => import('./purchase-toasts').then((module) => module.LandingPurchaseToasts),
  { ssr: false },
)

export function LandingPurchaseToastsLazy() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (ready) return
    let started = false

    const start = () => {
      if (started) return
      started = true
      cleanup()
      setReady(true)
    }

    const timer = window.setTimeout(start, 6000)
    const cleanup = () => {
      window.clearTimeout(timer)
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
      window.removeEventListener('scroll', start)
    }

    window.addEventListener('pointerdown', start, { passive: true })
    window.addEventListener('keydown', start)
    window.addEventListener('scroll', start, { passive: true })

    return cleanup
  }, [ready])

  return ready ? <LandingPurchaseToasts /> : null
}
