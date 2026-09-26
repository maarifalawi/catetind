import { redirect } from 'next/navigation'

/**
 * Halaman lama `/insight` sudah dipindah ke `/history` (Riwayat & Insight).
 * Rute ini dipertahankan sebagai pengalih supaya tautan/bookmark lama tidak
 * berakhir di halaman kosong.
 */
export default function InsightRedirectPage() {
  redirect('/history')
}
