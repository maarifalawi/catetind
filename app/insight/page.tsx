import { redirect } from 'next/navigation'

/**
 * Halaman lama `/insight` sudah dipindah ke `/history` (Riwayat & Insight).
 * Rute ini dipertahankan sebagai pengalih supaya tautan/bookmark lama tidak
 * berakhir di halaman kosong.
 *
 * PAKET 47 (konteks uang di seluruh halaman): rute ini TIDAK perlu switcher atau
 * penyaring sendiri — halaman tujuannya (`/history`) sudah membaca konteks uang
 * global, jadi seluruh ringkasan & insight di `/insight` (lewat pengalihan)
 * otomatis mengikuti konteks yang sedang aktif. Menambah switcher di sini justru
 * membuat dua kontrol untuk satu state di satu alur.
 */
export default function InsightRedirectPage() {
  redirect('/history')
}
