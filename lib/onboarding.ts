import type { TransactionTypeId } from '@/components/dashboard/transaction-input-engine'

/* ── Kontrak data Onboarding (inventaris #10, PRD Domain 6 Section 5) ──────────
   Onboarding 3 langkah "max 60 detik": (1) situasi hidup + periode dashboard,
   (2) pemasukan (OPSIONAL) + dompet pertama, (3) transaksi pertama + upacara tanaman.
   Yang WAJIB langkah 1 & 3 — tujuannya supaya dashboard punya data nyata sejak hari 1.

   File ini sengaja cuma berisi DATA + KONTRAK (tanpa JSX) — pola yang sama
   dengan lib/wallets.ts & lib/data/budget.ts — supaya copy & kelas warna tidak
   tersebar di banyak komponen. */

/**
 * Modul yang di-gate dari jawaban Step 1 (PRD Domain 2B.5 / 2C.5 / 2D.7).
 * Kode modul ter-deploy utuh; komponennya cuma di-render kalau flag ini nyala.
 */
export type OnboardingModule =
  | 'freelancer_budgeting'
  | 'sandwich_generation'
  | 'joint_wallet'

/** Siklus dashboard: bulan kalender (1 s/d akhir bulan) atau gajian-ke-gajian. */
export type DashboardPeriod = 'calendar' | 'cycle'

export interface LifeSituation {
  id: string
  emoji: string
  label: string
  subtitle: string
  /** modul yang menyala saat kartu ini dipilih (kosong = tidak ada modul) */
  module?: OnboardingModule
  /** nama manusiawi modul — dipakai di chip "Modul yang nyala" */
  moduleLabel?: string
}

/** 4 kartu 2x2 di Step 1 — multi-select (bukan radio). */
export const LIFE_SITUATIONS: LifeSituation[] = [
  {
    id: 'first-jobber',
    emoji: '💼',
    label: 'First-Jobber / Karyawan',
    subtitle: 'Gaji tetap bulanan',
  },
  {
    id: 'freelancer',
    emoji: '🎨',
    label: 'Freelancer / Pekerja Lepas',
    subtitle: 'Income gak tentu',
    module: 'freelancer_budgeting',
    moduleLabel: 'Budget Harian Freelancer',
  },
  {
    id: 'sandwich',
    emoji: '👨‍👩‍👧',
    label: 'Ada Tanggungan Keluarga',
    subtitle: 'Bantu biaya ortu/adik',
    module: 'sandwich_generation',
    moduleLabel: 'Sandwich Generation',
  },
  {
    id: 'couple',
    emoji: '💑',
    label: 'Pasangan Serius / Menikah',
    subtitle: 'Kelola uang bareng',
    module: 'joint_wallet',
    moduleLabel: 'Joint Wallet Pasangan',
  },
]

/** Opsi periode dashboard (Step 1C) — default: bulan kalender. */
export const PERIOD_OPTIONS: {
  id: DashboardPeriod
  emoji: string
  label: string
  helper: string
}[] = [
  {
    id: 'calendar',
    emoji: '📅',
    label: 'Bulan Kalender',
    helper: 'Tanggal 1 s/d akhir bulan',
  },
  {
    id: 'cycle',
    emoji: '💰',
    label: 'Siklus Gajian',
    helper: 'Dari tanggal gajimu sampai gajian berikutnya',
  },
]
/**
 * Auto-suggest 50/30/20 (Step 2C). `bar` = kelas bar progres; warnanya sengaja
 * diambil dari token yang SUDAH ada (hud-sage, hud-amber, forest) — bulatan biru
 * di copy cuma penanda baris, bukan alasan menambah warna baru ke palet.
 */
export const BUDGET_SPLITS: {
  id: string
  emoji: string
  label: string
  percent: number
  note: string
  bar: string
}[] = [
  {
    id: 'needs',
    emoji: '🟢',
    label: 'Kebutuhan',
    percent: 0.5,
    note: 'Makan, transport, kos',
    bar: 'bg-hud-sage',
  },
  {
    id: 'wants',
    emoji: '🟡',
    label: 'Keinginan',
    percent: 0.3,
    note: 'Jajan, hiburan, skincare',
    bar: 'bg-hud-amber',
  },
  {
    id: 'savings',
    emoji: '🔵',
    label: 'Tabungan',
    percent: 0.2,
    note: 'Dana darurat, impian',
    bar: 'bg-forest',
  },
]

/**
 * Quick-Pick dompet (Step 2D) — ghost card 1 ketukan. `tile` memakai keluarga
 * warna yang sudah dipakai app (Evergreen, Leaf, Olive, Thistle, Plum,
 * Cantelope, Daisy — lihat docs/theme/PALETTE.md, lib/wallets.ts &
 * wallet-screen.tsx), jadi tidak ada warna baru.
 */
export const QUICK_WALLET_PICKS: {
  name: string
  type: 'Bank' | 'E-Wallet' | 'Cash'
  tile: string
}[] = [
  {
    name: 'BCA',
    type: 'Bank',
    tile: 'bg-gradient-to-br from-thistle/20 via-thistle/20 to-thistle/25 text-thistle ring-thistle/40',
  },
  {
    name: 'Mandiri',
    type: 'Bank',
    tile: 'bg-gradient-to-br from-thistle/25 via-thistle/35 to-thistle/45 text-soil ring-thistle/40',
  },
  {
    name: 'GoPay',
    type: 'E-Wallet',
    tile: 'bg-gradient-to-br from-olive/25 via-olive/30 to-leaf/25 text-evergreen ring-leaf/40',
  },
  {
    name: 'OVO',
    type: 'E-Wallet',
    tile: 'bg-gradient-to-br from-plum/20 via-plum/20 to-plum/30 text-plum ring-plum/40',
  },
  {
    name: 'Dana',
    type: 'E-Wallet',
    tile: 'bg-gradient-to-br from-thistle/20 via-thistle/25 to-thistle/25 text-evergreen ring-thistle/40',
  },
  {
    name: 'Tunai',
    type: 'Cash',
    tile: 'bg-gradient-to-br from-oat via-oat to-oat text-ink/55 ring-ink/15',
  },
]
/* ── Kunci penyimpanan ──────────────────────────────────────────────────────
   Prefiks `catet-` sama dengan preferensi lain (catet-notif-prefs,
   catet-sidebar-collapsed) supaya gampang diaudit. */
export const ONBOARDING_STORE_KEY = 'catet-onboarding'
export const WELCOME_TOAST_KEY = 'catet-welcome-toast'

/**
 * Tujuan setelah onboarding selesai.
 *
 * PRD Domain 6 menulis `/app` untuk dashboard utama, tapi di repo mockup ini
 * seluruh halaman ada di root (`/` = Home/Daily HUD, lihat app/page.tsx). Rute
 * tujuan dipusatkan di satu konstanta ini: begitu struktur `app/app/**` dipakai,
 * cukup ubah baris ini jadi '/app'.
 */
export const POST_ONBOARDING_ROUTE = '/'

/** Copy guard keluar (5D) — dipakai beforeunload & popstate. */
export const EXIT_WARNING =
  'Yakin mau keluar? Progress onboarding kamu belum selesai.'

export interface OnboardingResult {
  /** id kartu situasi hidup yang dipilih (mis. ['freelancer','couple']) */
  situations: string[]
  /** flag modul hasil gating (mis. ['freelancer_budgeting','joint_wallet']) */
  modules: OnboardingModule[]
  dashboardPeriod: DashboardPeriod
  /** tanggal gajian 1-31; hanya berarti saat dashboardPeriod === 'cycle' */
  paydayDate: number | null
  /** 0 = user memilih melewati (pemasukan opsional) */
  monthlyIncome: number
  wallet: { name: string; balance: number }
  firstTransaction: {
    type: TransactionTypeId
    amount: number
    description: string
  }
  reminderEnabled: boolean
  completedAt: string
}

/** Simpan hasil onboarding + tanda "tampilkan toast sambutan di dashboard". */
export function saveOnboardingResult(result: OnboardingResult) {
  try {
    localStorage.setItem(ONBOARDING_STORE_KEY, JSON.stringify(result))
    /* sessionStorage (bukan localStorage): toast sambutan cukup sekali per sesi,
       tidak muncul lagi tiap kali app dibuka. */
    sessionStorage.setItem(WELCOME_TOAST_KEY, '1')
  } catch {
    /* storage penuh / private mode — jangan sampai bikin onboarding gagal */
  }
}

/** Dibaca halaman lain (mis. gating modul di Beranda) — null kalau belum ada. */
export function readOnboardingResult(): OnboardingResult | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_STORE_KEY)
    return raw ? (JSON.parse(raw) as OnboardingResult) : null
  } catch {
    return null
  }
}

/* ── Helper angka ─────────────────────────────────────────────────────────────
   Satu-satunya sumber kebenaran format Rupiah input = string DIGIT mentah
   (tanpa titik), sama seperti Transaction Input Engine. */

/** buang semua non-digit + batasi panjang (maks Rp 999.999.999.999) */
export function onlyDigits(value: string, max = 12) {
  return value.replace(/\D/g, '').slice(0, max)
}

/** '5000000' → '5.000.000' (auto-format Indonesia seketika saat diketik) */
export function digitsToDisplay(digits: string) {
  return digits ? Number(digits).toLocaleString('id-ID') : ''
}

/** '5000000' → 5000000 · '' → null (biar CTA tahu field masih kosong) */
export function digitsToNumber(digits: string): number | null {
  if (!digits) return null
  const value = Number(digits)
  return Number.isFinite(value) ? value : null
}

/** jaga tanggal gajian tetap di rentang 1-31 saat user menghapus/mengetik */
export function clampPayday(value: string) {
  const digits = onlyDigits(value, 2)
  if (!digits) return 1
  return Math.min(31, Math.max(1, Number(digits)))
}
