/* ── NAVBAR PUBLIK — "di luar sistem" (bukan sidebar / bottom-nav app) ────────
   Halaman PUBLIK/pre-app (/welcome, /login, /login/verify, /checkout, /help,
   /privacy, /terms, /join, /share) sengaja TIDAK memakai navigasi app: pengun-
   jungnya belum tentu punya akun, jadi menu berisi data keuangan cuma bikin
   bingung (lihat catatan FOCUS_ROUTES di components/MobileBottomNav.tsx).

   Yang mereka butuhkan justru sebaliknya: satu navbar SITUS yang SAMA di semua
   halaman publik — logo + beberapa tujuan ringkas + pintu masuk akun — supaya
   pengunjung nggak pernah merasa "terjebak" tanpa jalan keluar.

   File ini murni data (tanpa React), sama seperti `lib/data/welcome.ts`, supaya
   komponennya (`components/catetind/public-navbar.tsx`) nol string user-facing.
   ────────────────────────────────────────────────────────────────────────── */

import { WELCOME_PATH } from './welcome'

export type PublicNavLink = { label: string; href: string }

export const PUBLIC_NAV: {
  /** logo di kiri → halaman depan publik */
  homeHref: string
  /** dipakai sebagai `aria-label` logo (teks tidak tampil) */
  homeLabel: string
  /** tujuan ringkas di tengah navbar — hanya tampil di desktop */
  links: PublicNavLink[]
  /** pintu masuk akun yang sudah ada */
  loginLabel: string
  loginHref: string
  /** CTA daftar (harga + registrasi hidup di satu halaman: /checkout) */
  ctaLabel: string
  ctaHref: string
} = {
  homeHref: WELCOME_PATH,
  homeLabel: 'Halaman depan',
  links: [
    { label: 'Harga', href: '/checkout' },
    { label: 'Bantuan', href: '/help' },
  ],
  loginLabel: 'Masuk',
  loginHref: '/login',
  ctaLabel: 'Daftar gratis',
  ctaHref: '/checkout',
}
