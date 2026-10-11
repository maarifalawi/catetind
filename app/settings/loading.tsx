import { ScreenSkeleton } from '@/components/catetind/screen-skeleton'

/*
 * `app/settings/loading.tsx` — paket 84.
 *
 * Ini SATU-SATUNYA `loading.tsx` di repo, dan itu disengaja: sidebar halaman
 * pengaturan berasal dari `app/settings/layout.tsx`, jadi layout itu TIDAK ikut
 * unmount saat segmen berganti — hanya kolom kanan yang memuat. Karena itu
 * `loading.tsx` di sini tidak menghilangkan navigasi.
 *
 * Di halaman app lain, `loading.tsx` setingkat `app/` justru akan mengganti
 * seluruh isi root layout (termasuk sidebar & bottom nav, karena keduanya hidup
 * di dalam screen, bukan di layout) — lihat catatan panjang di
 * `components/catetind/screen-skeleton.tsx` sebelum menambahkannya.
 */
export default function SettingsLoading() {
  return (
    <div className="px-5 py-6 lg:px-8 lg:py-8">
      <ScreenSkeleton />
    </div>
  )
}
