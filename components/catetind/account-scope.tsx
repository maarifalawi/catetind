'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useSessionUser } from '@/hooks/use-session-user'
import { activateAccount } from '@/lib/account-scope'
import { isPublicRoute } from '@/lib/public-routes'

/* ── GERBANG CAKUPAN AKUN (paket 109) ────────────────────────────────────────
   Satu tempat yang memastikan penyimpanan browser & ingatan app benar-benar
   milik akun yang sedang masuk SEBELUM satu pun layar app dirender.

   Kenapa harus berupa gerbang, bukan `useEffect` biasa:
     · `SettingsSync` (di dalam `app/layout.tsx`) membaca localStorage lalu
       MENDORONG nilainya ke server. Kalau ia berjalan lebih dulu sementara
       penyimpanan masih berisi data akun sebelumnya, angka akun lama naik ke
       akun baru — pencemaran yang tidak bisa dibatalkan dari layar.
     · Karena itu anak-anak gerbang ini TIDAK dirender selama cakupan belum
       ditetapkan. Kalau `activateAccount()` menyatakan penyimpanan berpindah
       tangan, halaman dimuat ulang lebih dulu (ingatan modul ikut kosong),
       baru app dirender — jadi tidak ada satu frame pun angka akun lain.

   Sesi yang TIDAK terbaca (`loaded && !user`) sengaja TIDAK dianggap "keluar":
   satu request gagal bukan alasan memarkir data user. Middleware yang mengurus
   sesi yang benar-benar berakhir; tombol Keluar memanggil `releaseAccount()`.
   ────────────────────────────────────────────────────────────────────────── */

export function AccountScope({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const publicRoute = isPublicRoute(pathname)
  const { user, loaded } = useSessionUser()
  const userId = user?.id ?? null
  /** false = app belum boleh dirender (cakupan akun belum pasti) */
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (publicRoute) {
      setReady(true)
      return
    }
    if (!loaded) return
    if (!userId) {
      /* identitas tidak terbaca ≠ keluar: jangan sentuh penyimpanan */
      setReady(true)
      return
    }
    const outcome = activateAccount(userId)
    if (outcome.needsReload) {
      /* jangan render apa pun: muat ulang supaya seluruh modul lahir dari
         penyimpanan akun yang benar */
      window.location.reload()
      return
    }
    setReady(true)
  }, [publicRoute, loaded, userId])

  if (publicRoute) return <>{children}</>
  if (!ready) {
    /* latar netral, bukan layar putih kosong: cakupan akun hanya butuh satu
       putaran `/api/session`, dan kedipan putih penuh terbaca seperti app rusak */
    return <div className="min-h-dvh w-full bg-cream" aria-busy="true" />
  }
  return <>{children}</>
}
