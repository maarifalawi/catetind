import type { Metadata } from 'next'
import { ProfileSettingsPanel } from '@/components/catetind/settings-panel-account'

/* `/settings/profile` = PANEL Profil & Akun (inventaris #15).

   Sebelum rute ini ada, "Profil & Akun" hanya punya href `/settings` — dan di
   mobile `/settings` adalah HALAMAN INDEKS (daftar menu), sementara panel profil
   disembunyikan (`hidden lg:block`). Akibatnya di mobile menu itu terasa "tidak
   berfungsi": menekannya membawa kembali ke daftar menu yang sama, dan panel
   profil tidak pernah bisa dibuka. Rute ini memberi panel itu alamat sendiri,
   sehingga pola indeks → detail yang sama dengan section lain berlaku. */

export const metadata: Metadata = {
  title: 'Profil & Akun — CatetInd',
}

export default function SettingsProfilePage() {
  return <ProfileSettingsPanel />
}
