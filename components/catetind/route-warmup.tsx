'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/* ── PANASKAN RUTE YANG SERING DITUJU (paket 110) ────────────────────────────
   Di ponsel, link Riwayat & Budget hidup di dalam drawer yang baru di-mount saat
   dibuka — jadi prefetch bawaan `<Link>` tidak sempat bekerja sebelum user
   menekannya. Akibatnya dua halaman itu membayar penuh middleware + RSC + chunk
   setiap kali dibuka, sementara tab bottom-nav sudah hangat.

   Komponen ini TIDAK merender apa pun dan hanya memanggil `router.prefetch()`
   setelah halaman idle (bukan di jalur kritis). Daftarnya sengaja pendek: dua
   halaman yang dikeluhkan + tidak menambah beban jaringan saat boot. */

const WARM_ROUTES = ['/history', '/budget'] as const

export function RouteWarmup() {
  const router = useRouter()

  useEffect(() => {
    const warm = () => {
      for (const href of WARM_ROUTES) router.prefetch(href)
    }
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(warm, { timeout: 3000 })
      return () => window.cancelIdleCallback?.(id)
    }
    const timer = window.setTimeout(warm, 2500)
    return () => window.clearTimeout(timer)
  }, [router])

  return null
}
