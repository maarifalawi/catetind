import {
  Home,
  PieChart,
  Wallet,
  Target,
  Receipt,
  CalendarDays,
  Briefcase,
  Users,
  Gift,
  CircleHelp,
  Settings,
  Download,
  type LucideIcon,
} from 'lucide-react'

/* ── NAVIGASI APP — SATU SUMBER (audit "Navigation Clunkiness") ──────────────
   Sebelum file ini ada, daftar navigasi ditulis DUA kali: `sections` di
   `desktop-sidebar.tsx` (grup "Menu Utama / Kelola Uang / Aset & Bersama /
   Ekstra & Dukungan / Sistem") dan `menuGroups` di `MobileBottomNav.tsx` (grup
   "Kelola Uang / Aset & Bersama / Ekstra & Sistem"). Keduanya sudah melenceng:
   label grup & label item berbeda ("Ekstra & Dukungan" vs "Ekstra & Sistem";
   "Budget" vs "Budget & Target Nabung"), dan "Ajak Teman" pindah-pindah grup.

   Akibatnya user melihat hierarki yang BERBEDA di desktop dan mobile untuk app
   yang sama — sumber keluhan "UX navigasi membingungkan". Sekarang keduanya
   membaca daftar di bawah; menambah halaman baru cuma menyentuh satu tempat.

   Ikon Lucide sengaja ikut di sini (bukan di `lib/data/*` yang wajib murni
   tanpa komponen): file ini HANYA diimpor dua komponen klien, jadi tidak pernah
   bocor ke Server Component. */

export type NavItem = {
  href: string
  icon: LucideIcon
  label: string
  /** keterangan singkat — dipakai menu "Lainnya" mobile supaya tiap tujuan jelas */
  hint: string
}

export type NavGroup = {
  /** judul grup yang tampil (sidebar & laci mobile memakai string yang sama) */
  label: string
  items: NavItem[]
}

/**
 * Hierarki 5 tingkat yang menaik dari "paling sering dipakai" ke "paling
 * jarang": Ringkasan → uang harian → aset/bersama → bantuan → sistem. Nama grup
 * lama yang ambigu ("Ekstra & Dukungan") diganti "Bantuan", dan "Ajak Teman"
 * (aksi sosial) dikelompokkan bersama Joint Wallet & Kekayaan di "Aset &
 * Bersama" — bukan lagi tercampur dengan dokumen bantuan.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Menu Utama',
    items: [
      { href: '/', icon: Home, label: 'Dashboard', hint: 'Ringkasan hari ini' },
      { href: '/history', icon: PieChart, label: 'Riwayat & Insight', hint: 'Semua catatan & pola' },
    ],
  },
  {
    label: 'Kelola Uang',
    items: [
      { href: '/wallet', icon: Wallet, label: 'Dompet & Akun', hint: 'Saldo semua dompet' },
      { href: '/budget', icon: Target, label: 'Budget & Target Nabung', hint: 'Jatah harian & celengan' },
      { href: '/bills', icon: Receipt, label: 'Tagihan Rutin', hint: 'Pengingat jatuh tempo' },
      { href: '/calendar', icon: CalendarDays, label: 'Kalender Cashflow', hint: 'Arus uang per hari' },
    ],
  },
  {
    label: 'Aset & Bersama',
    items: [
      { href: '/wealth', icon: Briefcase, label: 'Kekayaan & Hutang', hint: 'Net worth & kewajiban' },
      { href: '/joint', icon: Users, label: 'Joint Wallet', hint: 'Dompet bersama pasangan' },
      { href: '/referral', icon: Gift, label: 'Ajak Teman', hint: 'Undang & dapat reward' },
    ],
  },
  {
    label: 'Bantuan',
    items: [
      { href: '/help', icon: CircleHelp, label: 'Pusat Bantuan', hint: 'Tanya jawab & panduan' },
      { href: '/install', icon: Download, label: 'Panduan Install', hint: 'Pasang di HP/desktop' },
    ],
  },
  {
    label: 'Sistem',
    items: [{ href: '/settings', icon: Settings, label: 'Pengaturan', hint: 'Profil, privasi & akun' }],
  },
]

/** tab tetap di bottom bar mobile (sisanya masuk laci "Lainnya") */
export const MOBILE_PRIMARY_ITEMS: NavItem[] = [
  { href: '/', icon: Home, label: 'Home', hint: 'Ringkasan hari ini' },
  { href: '/wallet', icon: Wallet, label: 'Wallet', hint: 'Saldo semua dompet' },
  { href: '/history', icon: PieChart, label: 'Insight', hint: 'Semua catatan & pola' },
]

/**
 * Isi laci "Lainnya" mobile = seluruh grup KECUALI "Menu Utama" (dua dari tiga
 * itemnya sudah jadi tab bottom bar → menampilkannya lagi = dua jalur paralel,
 * dilarang PRD 2A.6). Satu definisi dengan sidebar desktop.
 */
export const MOBILE_MENU_GROUPS: NavGroup[] = NAV_GROUPS.filter(
  (group) => group.label !== 'Menu Utama',
)

/** semua href menu — dipakai menandai tab bottom bar yang sedang aktif */
export const NAV_HREFS: string[] = MOBILE_MENU_GROUPS.flatMap((group) =>
  group.items.map((item) => item.href),
)
