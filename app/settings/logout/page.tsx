import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Keluar | CatetInd',
}

/* ── `/settings/logout` — JALAN LAMA, DIALIHKAN ──────────────────────────────
   Revisi pemilik produk: tombol Keluar di sidebar & Pengaturan sekarang
   langsung membuka dialog konfirmasi, jadi tidak ada lagi halaman "Keluar"
   berisi penjelasan + tombol.

   Rute ini TETAP ada hanya sebagai penampung tautan lama / bookmark: siapa pun
   yang mendarat di sini dipulangkan ke Pengaturan, tempat tombol Keluar yang
   sebenarnya berada. */
export default function LogoutSettingsPage() {
  redirect('/settings')
}
