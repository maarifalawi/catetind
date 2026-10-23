'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { DEMO_ALLOW_SESSION, DEMO_MODE } from '@/lib/demo'
import { isPublicRoute } from '@/lib/public-routes'
import { browserSupabase } from '@/lib/supabase/client'
import { seedDemoDataOnce } from '@/lib/money/demo-bootstrap'

/* ── GERBANG SEED DEMO (paket 65 · Tugas A) ──────────────────────────────────
   DIJALANKAN dari root layout. Hanya menulis data contoh lewat store
   ketika `NEXT_PUBLIC_DEMO=1` — di produksi (tanpa env) ia no-op, jadi akun
   nyata benar-benar mulai dari nol. Tidak merender apa pun.

   PAKET 100 menambahkan dua pagar:
     · `DEMO_MODE` sendiri sudah mati di `NODE_ENV=production` (lib/demo.ts);
     · seed TIDAK dijalankan kalau ada sesi Supabase. Dulu persona demo ditulis
       lewat `addWalletAccount()` yang langsung mengirim baris ke server — jadi
       siapa pun yang login di build demo bisa mendapat dompet & transaksi contoh
       sebagai data akunnya. Sekarang demo hanya untuk perangkat tanpa sesi.

   Ditaruh setelah hidrasi React (useEffect) supaya HTML server tetap = render
   pertama client (keduanya kosong) — tidak ada hydration mismatch.

   HANYA DI HALAMAN APP (bukan route publik), karena demo punya "fresh start"
   yang bisa membuang state perangkat lama (`clearMoneyState()` + kunci `catet*`).
   Membuang data karena seseorang membuka landing page tidak pantas dilakukan. */
export function DemoSeedGate() {
  const pathname = usePathname()

  useEffect(() => {
    if (!DEMO_MODE) return
    if (isPublicRoute(pathname)) return

    let active = true
    void (async () => {
      const client = browserSupabase()
      if (client) {
        try {
          const { data } = await client.auth.getSession()
          /* Ada sesi = data ini akan menjadi milik akun nyata. Jangan disemai,
             kecuali reviewer secara eksplisit menyalakan
             `NEXT_PUBLIC_DEMO_ALLOW_SESSION=1` di perangkat dev. */
          if (data.session && !DEMO_ALLOW_SESSION) return
        } catch {
          /* sesi tidak terbaca → anggap belum login; seed lokal tetap aman */
        }
      }
      if (active) seedDemoDataOnce()
    })()

    return () => {
      active = false
    }
  }, [pathname])

  return null
}
