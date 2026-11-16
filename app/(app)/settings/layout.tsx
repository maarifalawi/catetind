import type { ReactNode } from 'react'
import { SettingsShell } from '@/components/catetind/settings-shell'

/* ── Layout bersama SEMUA halaman pengaturan ───────────────────────────────────
   Kunci arsitekturnya ada di sini: rute-nya bersarang (`/settings`,
   `/settings/billing`, …) tapi layout ini TIDAK ikut unmount saat segmen
   halaman berganti. Next.js hanya menukar isi kolom kanan, jadi:

     • Sidebar global (Dashboard, Wallet, …) selalu ter-render — tidak pernah
       hilang, tidak pernah diganti halaman full-screen.
     • Menu pengaturan di kolom kiri tetap di posisinya (termasuk posisi
       scroll & status expand/collapse sidebar).
     • URL tetap berubah dan bisa di-share/deep-link per section. */

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <SettingsShell>{children}</SettingsShell>
}
