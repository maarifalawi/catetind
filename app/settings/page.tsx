import type { Metadata } from 'next'
import { ProfileSettingsPanel } from '@/components/catetind/settings-panel-account'

/* `/settings` = halaman INDEKS pengaturan (inventaris #15).
   • Desktop: panel Profil & Akun tampil di kolom kanan sebagai section default.
   • Mobile : kolom kanan disembunyikan oleh SettingsShell, jadi yang tampil
     hanya daftar menu — memilih menu membuka sub-section-nya (tanpa sidebar
     global yang hilang, karena layout-nya sama). */

export const metadata: Metadata = {
  title: 'Pengaturan — CatetInd',
}

export default function SettingsPage() {
  return <ProfileSettingsPanel />
}
