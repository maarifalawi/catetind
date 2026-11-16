import type { Metadata } from 'next'

/* ── LAYOUT DASHBOARD ADMIN ──────────────────────────────────────────────────
   Satu hal yang diurus di sini: halaman ini TIDAK BOLEH diindeks mesin pencari.
   Ia memuat data bisnis & daftar akun; kalau sampai masuk hasil pencarian,
   informasi itu bocor tanpa perlu login. Aksesnya sendiri dijaga server di
   `app/admin/page.tsx`.
   ────────────────────────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: 'Dashboard Admin — CatetInd',
  description: 'Pemantauan bisnis CatetInd. Hanya untuk pemilik/admin.',
  robots: { index: false, follow: false, nocache: true },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children
}
