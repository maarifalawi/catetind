'use client'

import { useEffect } from 'react'
import { DEMO_MODE } from '@/lib/demo'
import { seedDemoDataOnce } from '@/lib/money/demo-bootstrap'

/* ── GERBANG SEED DEMO (paket 65 · Tugas A) ──────────────────────────────────
   DIJALANKAN SEKALI dari root layout. Hanya menulis data contoh lewat store
   ketika `NEXT_PUBLIC_DEMO=1` — di produksi (tanpa env) ia no-op, jadi akun
   nyata benar-benar mulai dari nol. Tidak merender apa pun.

   Ditaruh setelah hidrasi React (useEffect) supaya HTML server tetap = render
   pertama client (keduanya kosong) — tidak ada hydration mismatch. */
export function DemoSeedGate() {
  useEffect(() => {
    if (!DEMO_MODE) return
    seedDemoDataOnce()
  }, [])
  return null
}
