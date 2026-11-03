'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { DEMO_ALLOW_SESSION, DEMO_MODE } from '@/lib/demo'
import { isPublicRoute } from '@/lib/public-routes'
import { browserSupabase } from '@/lib/supabase/client'
import { loadMoneyState } from '@/lib/money/idb'
import type { PersistedMoney } from '@/lib/money/store'
import { getMoneySnapshot } from '@/lib/money/store'
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

   PAGAR KETIGA (perbaikan "transaksi berubah setelah login ulang"):
     · seed juga TIDAK dijalankan kalau snapshot perangkat ini sudah punya
       PEMILIK (`ownerUserId`). Artinya perangkat itu pernah dipakai akun nyata;
       menulis persona demo di atasnya akan mencampur baris contoh dengan data
       akun (dan `appendRow` mengirimnya ke server). Persona demo hanya untuk
       perangkat yang benar-benar bersih.

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
          /* Sesi TIDAK terbaca ≠ belum login. Dulu kegagalan baca dianggap
             "belum login", dan karena store saat itu bisa masih kosong jalur
             "fresh start" langsung menghapus seluruh IndexedDB perangkat.
             Kalau identitas tidak pasti, jangan menyentuh data apa pun. */
          return
        }
      }

      /* Perangkat yang pernah dipakai akun nyata: snapshot-nya adalah data akun
         itu. Menyemai persona demo di atasnya = mencampur dua cerita — kecuali
         reviewer MENYALAKAN `NEXT_PUBLIC_DEMO_ALLOW_SESSION=1` (jalur dev yang
         didokumentasikan di `lib/demo.ts`, default mati). */
      const persisted = await loadMoneyState<PersistedMoney>()
      if (persisted?.ownerUserId && !DEMO_ALLOW_SESSION) return

      /* Store uang belum selesai dibaca → `getMoneySnapshot().rows` masih kosong
         BUKAN berarti perangkat bersih. Menyemai (dan terutama "fresh start")
         di titik ini bisa menghapus data yang sedang dibaca. Tunggu / lewati. */
      if (!getMoneySnapshot().hydrated && !DEMO_ALLOW_SESSION) return

      if (active) seedDemoDataOnce({ force: DEMO_ALLOW_SESSION })
    })()

    return () => {
      active = false
    }
  }, [pathname])

  return null
}
