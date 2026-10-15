'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { DEMO_MODE } from '@/lib/demo'
import { isPublicRoute } from '@/lib/public-routes'
import { seedDemoDataOnce } from '@/lib/money/demo-bootstrap'

/* ── GERBANG SEED DEMO (paket 65 · Tugas A) ──────────────────────────────────
   DIJALANKAN dari root layout. Hanya menulis data contoh lewat store
   ketika `NEXT_PUBLIC_DEMO=1` — di produksi (tanpa env) ia no-op, jadi akun
   nyata benar-benar mulai dari nol. Tidak merender apa pun.

   Ditaruh setelah hidrasi React (useEffect) supaya HTML server tetap = render
   pertama client (keduanya kosong) — tidak ada hydration mismatch.

   HANYA DI HALAMAN APP (bukan route publik). Sejak demo punya "fresh start",
   menyiapkan demo bisa berarti MEMBUANG state perangkat lama
   (`clearMoneyState()` + kunci `catet*` — lihat `demo-bootstrap.ts`). Membuang
   data karena seseorang membuka landing page `/` atau `/privacy` tidak pantas
   dilakukan, jadi gerbangnya dibatasi di sini. `pathname` ikut jadi dependensi
   supaya navigasi client-side (mis. `/` → `/app`) tetap memicu seed. */
export function DemoSeedGate() {
  const pathname = usePathname()

  useEffect(() => {
    if (!DEMO_MODE) return
    if (isPublicRoute(pathname)) return
    seedDemoDataOnce()
  }, [pathname])

  return null
}
