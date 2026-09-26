import { formatIDR } from '../wallets'
import { shiftISODate } from './history'

/** satu pintu impor untuk halaman Tagihan: komponennya cukup ambil dari sini */
export { formatIDR }
export { maskMoney } from './history'

/* ── Tagihan / Recurring Bills (/app/bills) ──────────────────────────────────
   Satu sumber data + logika murni (tanpa React) untuk halaman Tagihan Rutin:

   1. Daftar tagihan berulang (Kos, Netflix, Spotify, cicilan HP, Kredivo, …)
      beserta status bulan ini.
   2. Fungsi status/filter/pengelompokan — dipakai chip filter & daftar.
   3. Data turunan untuk dua visual khas halaman ini: Shield Protection Meter
      (bagian tertutup = tagihan lunas) dan Waterfall Salary Drain (gaji yang
      "dimakan" tiap tagihan, dari yang terbesar).

   Catatan tanggal: "hari ini" dipatok KONSTAN (TODAY_ISO / CURRENT_DAY), bukan
   `new Date()`. Sebabnya dua: (1) HTML hasil render server & render pertama
   client jadi identik — tidak ada hydration mismatch pada teks turunan seperti
   "Telat 3 hari" atau tanggal di strip 7 hari; (2) demo bisa dipindah tanggal
   dengan mengubah satu baris. Nanti saat data datang dari Supabase, dua
   konstanta ini yang diganti tanggal server.
   ────────────────────────────────────────────────────────────────────────── */

export type BillStatus = 'upcoming' | 'due_today' | 'overdue' | 'paid'
export type BillFilter = 'semua' | 'aktif' | 'telat' | 'lunas'
/** warna kanon status (PRD 2B.2) — resolusi: BUKAN merah */
export type BillTone = 'sage' | 'amber' | 'terracotta' | 'neutral'

export interface Bill {
  id: string
  /** emoji identitas tagihan (pengganti logo brand) */
  emoji: string
  name: string
  /** nominal per bulan; 0 = nominal berubah-ubah (opsional saat input) */
  amount: number
  /** jatuh tempo tiap bulan, tanggal 1–31 */
  dueDate: number
  isRecurring: boolean
  category: string
  /** id dompet sumber pembayaran ('bca' | 'gopay' | 'tunai' | …) */
  walletId: string
  isPaidThisMonth: boolean
  /** ingatkan sekian hari sebelum jatuh tempo (0 = jangan ingatkan) */
  reminderDaysBefore: number
  /** cicilan berbatas: total tenor dalam bulan (kosong = tanpa batas) */
  endAfterMonths?: number
  /** bulan ke-berapa sekarang (1..endAfterMonths) */
  currentMonth?: number
  note?: string
}

/* ── KONSTANTA WAKTU & UANG (MOCK) ─────────────────────────────────────────── */
export const TODAY_ISO = '2026-09-25'
export const CURRENT_DAY = 25
export const DAYS_IN_MONTH = 30
export const MONTHLY_INCOME = 7_500_000
/** panjang strip pratinjau di timeline (section 5) */
export const TIMELINE_DAYS = 7

/* ── MOCK TAGIHAN BULAN INI ─────────────────────────────────────────────────
   Sengaja campur: 4 sudah lunas, 1 jatuh tempo HARI INI (Cicilan HP), 1 masih
   akan datang (Kredivo tgl 28). Untuk menguji tampilan "telat", turunkan
   CURRENT_DAY atau majukan dueDate salah satu tagihan yang belum dibayar. */
export const INITIAL_BILLS: Bill[] = [
  {
    id: '1',
    emoji: '🏠',
    name: 'Kos Bulanan',
    amount: 1_500_000,
    dueDate: 1,
    isRecurring: true,
    category: 'Tagihan',
    walletId: 'bca',
    isPaidThisMonth: true,
    reminderDaysBefore: 3,
  },
  {
    id: '2',
    emoji: '🎬',
    name: 'Netflix',
    amount: 54_000,
    dueDate: 15,
    isRecurring: true,
    category: 'Hiburan',
    walletId: 'gopay',
    isPaidThisMonth: true,
    reminderDaysBefore: 1,
  },
  {
    id: '3',
    emoji: '🎵',
    name: 'Spotify',
    amount: 54_990,
    dueDate: 20,
    isRecurring: true,
    category: 'Hiburan',
    walletId: 'gopay',
    isPaidThisMonth: true,
    reminderDaysBefore: 1,
  },
  {
    id: '4',
    emoji: '📱',
    name: 'Cicilan HP',
    amount: 450_000,
    dueDate: 25,
    isRecurring: true,
    category: 'Tagihan',
    walletId: 'bca',
    isPaidThisMonth: false,
    endAfterMonths: 12,
    currentMonth: 5,
    reminderDaysBefore: 3,
  },
  {
    id: '5',
    emoji: '💳',
    name: 'Kredivo',
    amount: 350_000,
    dueDate: 28,
    isRecurring: true,
    category: 'Tagihan',
    walletId: 'bca',
    isPaidThisMonth: false,
    endAfterMonths: 6,
    currentMonth: 3,
    reminderDaysBefore: 3,
  },
  {
    id: '6',
    emoji: '📶',
    name: 'Paket Internet',
    amount: 100_000,
    dueDate: 10,
    isRecurring: true,
    category: 'Tagihan',
    walletId: 'tunai',
    isPaidThisMonth: true,
    reminderDaysBefore: 1,
  },
]

/* ── STATUS ────────────────────────────────────────────────────────────────── */

export function getBillStatus(bill: Bill, currentDay: number = CURRENT_DAY): BillStatus {
  if (bill.isPaidThisMonth) return 'paid'
  if (currentDay > bill.dueDate) return 'overdue'
  if (currentDay === bill.dueDate) return 'due_today'
  return 'upcoming'
}

/** jumlah hari keterlambatan (selalu >= 0) */
export function daysLate(bill: Bill, currentDay: number = CURRENT_DAY): number {
  return Math.max(0, currentDay - bill.dueDate)
}

/** jumlah hari menuju jatuh tempo (selalu >= 0) */
export function daysUntil(bill: Bill, currentDay: number = CURRENT_DAY): number {
  return Math.max(0, bill.dueDate - currentDay)
}

/** konteks jatuh tempo di kartu tagihan — teks + warna kanonnya */
export function dueContext(
  bill: Bill,
  status: BillStatus,
  currentDay: number = CURRENT_DAY,
): { text: string; className: string } {
  if (status === 'paid') return { text: 'Lunas ✓', className: 'text-hud-sage' }
  if (status === 'overdue') {
    return {
      text: `Jatuh tempo tgl ${bill.dueDate} — Telat ${daysLate(bill, currentDay)} hari`,
      className: 'text-hud-terracotta',
    }
  }
  if (status === 'due_today') return { text: 'Jatuh tempo HARI INI', className: 'text-hud-amber' }
  return {
    text: `Tgl ${bill.dueDate} · ${daysUntil(bill, currentDay)} hari lagi`,
    className: 'text-ink/45',
  }
}

/** 'Bulan 5/12' untuk cicilan berbatas, null kalau tanpa batas */
export function endAfterLabel(bill: Bill): string | null {
  if (!bill.endAfterMonths) return null
  return `Bulan ${bill.currentMonth ?? 1}/${bill.endAfterMonths}`
}

/* ── RINGKASAN UANG ────────────────────────────────────────────────────────── */

export function totalMonthlyBills(bills: Bill[]): number {
  return bills.reduce((sum, bill) => sum + bill.amount, 0)
}

export function paidBills(bills: Bill[]): Bill[] {
  return bills.filter((bill) => bill.isPaidThisMonth)
}

/** persentase gaji yang "dijanjikan" ke tagihan — dibulatkan */
export function burnPercentage(bills: Bill[], monthlyIncome: number = MONTHLY_INCOME): number {
  if (monthlyIncome <= 0) return 0
  return Math.round((totalMonthlyBills(bills) / monthlyIncome) * 100)
}

/* ── FILTER (chip Section 6) ──────────────────────────────────────────────── */

export const BILL_FILTERS: { id: BillFilter; label: string }[] = [
  { id: 'semua', label: 'Semua' },
  { id: 'aktif', label: 'Aktif' },
  { id: 'telat', label: 'Telat' },
  { id: 'lunas', label: 'Lunas' },
]

export function matchesBillFilter(
  bill: Bill,
  filter: BillFilter,
  currentDay: number = CURRENT_DAY,
): boolean {
  const status = getBillStatus(bill, currentDay)
  if (filter === 'semua') return true
  if (filter === 'aktif') return status === 'upcoming' || status === 'due_today'
  if (filter === 'telat') return status === 'overdue'
  return status === 'paid'
}

export function filterBills(
  bills: Bill[],
  filter: BillFilter,
  currentDay: number = CURRENT_DAY,
): Bill[] {
  return bills.filter((bill) => matchesBillFilter(bill, filter, currentDay))
}

/** jumlah per chip — selalu dihitung dari SEMUA tagihan, jadi angkanya tidak
 *  ikut berubah saat salah satu chip dipilih */
export function billFilterCounts(
  bills: Bill[],
  currentDay: number = CURRENT_DAY,
): Record<BillFilter, number> {
  return {
    semua: bills.length,
    aktif: bills.filter((bill) => matchesBillFilter(bill, 'aktif', currentDay)).length,
    telat: bills.filter((bill) => matchesBillFilter(bill, 'telat', currentDay)).length,
    lunas: bills.filter((bill) => matchesBillFilter(bill, 'lunas', currentDay)).length,
  }
}

/* ── PENGELOMPOKAN DAFTAR (Section 7A) ────────────────────────────────────── */

export interface BillGroupMeta {
  status: BillStatus
  label: string
  icon: string
  /** warna label section + garis pemisahnya */
  labelClass: string
  barClass: string
}

/** urutan prioritas: telat → hari ini → akan datang → sudah dibayar */
export const BILL_GROUPS: BillGroupMeta[] = [
  {
    status: 'overdue',
    label: 'Terlambat',
    icon: '🔴',
    labelClass: 'text-hud-terracotta',
    barClass: 'bg-hud-terracotta',
  },
  {
    status: 'due_today',
    label: 'Hari Ini',
    icon: '🟡',
    labelClass: 'text-hud-amber',
    barClass: 'bg-hud-amber',
  },
  {
    status: 'upcoming',
    label: 'Akan Datang',
    icon: '🔵',
    labelClass: 'text-ink/45',
    barClass: 'bg-ink/20',
  },
  {
    status: 'paid',
    label: 'Sudah Dibayar',
    icon: '✅',
    labelClass: 'text-hud-sage',
    barClass: 'bg-hud-sage',
  },
]

export interface BillGroup {
  meta: BillGroupMeta
  items: Bill[]
}

/* ── WATERFALL SALARY DRAIN (Section 4) ───────────────────────────────────── */

export interface WaterfallSegment {
  id: string
  emoji: string
  name: string
  amount: number
  /** porsi terhadap pemasukan bulanan (%) */
  percent: number
  /** kelas latar Tailwind — sage dari tergelap ke termuda sesuai peringkat */
  barClass: string
}

/** gradasi sage: transparansi token `hud-sage` di atas latar terang, jadi tetap
 *  satu keluarga warna — bukan palet baru. Peringkat 1 = penyedot terbesar. */
const SAGE_RAMP = [
  'bg-hud-sage',
  'bg-hud-sage/85',
  'bg-hud-sage/70',
  'bg-hud-sage/55',
  'bg-hud-sage/42',
  'bg-hud-sage/32',
] as const

export interface Waterfall {
  /** tersortir menurun: tagihan terbesar = segmen paling kiri & paling lebar */
  segments: WaterfallSegment[]
  total: number
  burnPercentage: number
  remaining: number
}

export function buildWaterfall(
  bills: Bill[],
  monthlyIncome: number = MONTHLY_INCOME,
): Waterfall {
  const sorted = [...bills].sort((a, b) => b.amount - a.amount)
  const total = totalMonthlyBills(sorted)
  const segments = sorted.map((bill, i) => ({
    id: bill.id,
    emoji: bill.emoji,
    name: bill.name,
    amount: bill.amount,
    percent: monthlyIncome > 0 ? (bill.amount / monthlyIncome) * 100 : 0,
    barClass: SAGE_RAMP[Math.min(i, SAGE_RAMP.length - 1)],
  }))
  return {
    segments,
    total,
    burnPercentage: burnPercentage(sorted, monthlyIncome),
    remaining: Math.max(0, monthlyIncome - total),
  }
}

/** warna + copy ringkasan beban tetap (Section 4 — ambang 40% / 60%) */
export function burnTone(
  burn: number,
): { tone: BillTone; copy: string; textClass: string; panelClass: string } {
  if (burn < 40) {
    return {
      tone: 'sage',
      copy: 'Beban tetapmu ringan. Banyak ruang buat nabung! 🌿',
      textClass: 'text-[#000000]',
      panelClass: 'bg-hud-sage/15 ring-hud-sage/25',
    }
  }
  if (burn <= 60) {
    return {
      tone: 'amber',
      copy: 'Lumayan padat. Ada yang bisa dipangkas? 🌤️',
      textClass: 'text-[#b89191]',
      panelClass: 'bg-hud-amber/15 ring-hud-amber/25',
    }
  }
  return {
    tone: 'terracotta',
    copy: 'Beban tetapmu tinggi. Mau review bareng? 🫂',
    textClass: 'text-hud-terracotta',
    panelClass: 'bg-hud-terracotta/12 ring-hud-terracotta/25',
  }
}

/* ── TIMELINE 7 HARI (Section 5) ─────────────────────────────────────────── */

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

export interface TimelineDay {
  iso: string
  /** tanggal 1–31 */
  day: number
  /** singkatan bulan (mis. 'Sep'), dipakai untuk penanda siklus bulan depan */
  monthShort: string
  isToday: boolean
  /** true = sel ini milik bulan berikutnya (siklus tagihan yang baru) */
  nextMonth: boolean
}

/** 7 hari ke depan dimulai hari ini (offset 0..count-1) */
export function upcomingDays(count: number = TIMELINE_DAYS, fromIso: string = TODAY_ISO): TimelineDay[] {
  const [, baseMonth] = fromIso.split('-').map(Number)
  return Array.from({ length: count }, (_, i) => {
    const iso = shiftISODate(fromIso, i)
    const [y, m, d] = iso.split('-').map(Number)
    return {
      iso,
      day: d,
      monthShort: MONTHS_SHORT[(m ?? 1) - 1],
      /* offset 0 selalu hari ini — sumbernya TODAY_ISO, bukan jam mesin user */
      isToday: i === 0,
      nextMonth: m !== baseMonth || y !== (fromIso.split('-').map(Number)[0] ?? y),
    }
  })
}

/** tagihan yang jatuh tempo di tanggal `day` (1–31) */
export function billsOnDay(bills: Bill[], day: number): Bill[] {
  return bills.filter((bill) => bill.dueDate === day)
}

/**
 * Warna titik di bawah tanggal:
 * - `null`  → tidak ada titik (tagihan bulan ini sudah lunas)
 * - `amber` → belum dibayar / siklus bulan depan
 * - `terracotta` → sudah lewat jatuh tempo
 */
export function timelineDotTone(
  bill: Bill,
  nextMonth: boolean,
  currentDay: number = CURRENT_DAY,
): 'amber' | 'terracotta' | null {
  if (nextMonth) return 'amber'
  if (bill.isPaidThisMonth) return null
  return bill.dueDate < currentDay ? 'terracotta' : 'amber'
}


/** kelompokkan tagihan; grup kosong tidak dikembalikan; di dalam grup diurut
 *  naik berdasarkan tanggal jatuh tempo */
export function groupBills(bills: Bill[], currentDay: number = CURRENT_DAY): BillGroup[] {
  return BILL_GROUPS.map((meta) => ({
    meta,
    items: bills
      .filter((bill) => getBillStatus(bill, currentDay) === meta.status)
      .sort((a, b) => a.dueDate - b.dueDate),
  })).filter((group) => group.items.length > 0)
}

/* ── PILIHAN DI SHEET TAMBAH TAGIHAN (Section 9) ─────────────────────────── */

/** 12 emoji preset — dipakai sebagai baris pertama emoji picker */
export const BILL_EMOJI_PRESETS = [
  '🏠', '🎬', '🎵', '📱', '💳', '📶', '🔌', '💧', '🏋️', '📚', '🚗', '✨',
] as const

/** tombol 'Lainnya' → grid emoji tambahan (tanpa dependensi emoji-picker) */
export const BILL_EMOJI_MORE = [
  '🛒', '🧾', '🎮', '☕', '🍔', '🐶', '🐱', '💊', '🩺', '🏫', '🎓', '👶',
  '🚌', '⛽', '✈️', '🏥', '🧹', '📺', '🎧', '🎨', '🕋', '🕌', '⛪', '💻',
] as const

export const BILL_CATEGORY_OPTIONS = [
  'Tagihan',
  'Hiburan',
  'Kebutuhan Rumah',
  'Transportasi',
  'Kesehatan',
  'Pendidikan',
  'Lainnya',
] as const

/** dompet sumber pembayaran — diselaraskan dengan halaman Dompet & Akun */
export const BILL_WALLET_OPTIONS: { id: string; name: string; kind: string }[] = [
  { id: 'bca', name: 'BCA', kind: 'Bank' },
  { id: 'gopay', name: 'GoPay', kind: 'E-Wallet' },
  { id: 'tunai', name: 'Tunai', kind: 'Uang cash' },
  { id: 'ovo', name: 'OVO', kind: 'E-Wallet' },
]

export function billWalletName(walletId: string): string {
  return BILL_WALLET_OPTIONS.find((wallet) => wallet.id === walletId)?.name ?? walletId
}

/** 'Ingatkan sebelum jatuh tempo' — nilai = hari (0 = jangan ingatkan) */
export const BILL_REMINDER_OPTIONS: { days: number; label: string }[] = [
  { days: 1, label: '1 hari' },
  { days: 3, label: '3 hari' },
  { days: 7, label: '1 minggu' },
  { days: 0, label: 'Jangan ingatkan' },
]

/* ── COPY TETAP ───────────────────────────────────────────────────────────── */

export const HUD_DEDUCTION_HELPER =
  '💡 Tagihan rutin otomatis dipotong dari Jatah Harian kamu'

export const NOTIF_NUDGE_COPY =
  'Aktifkan notifikasi biar gak pernah telat bayar tagihan'
export const NOTIF_NUDGE_HELPER = 'Diingatkan 1-3 hari sebelum jatuh tempo. Gak spam.'
/** kunci localStorage penolakan permanen banner notifikasi */
export const NOTIF_NUDGE_KEY = 'catetind-bills-notif-nudge'
