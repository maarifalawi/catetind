/**
 * Data mock rekap mingguan — SATU sumber angka untuk banner Home + popup
 * Rekap Mingguan, supaya angka di kedua tempat tidak pernah bertentangan.
 * `net` DITURUNKAN dari income - expense (bukan hardcode).
 */
export const WEEK_PERIOD = '22–28 Sep 2024'

const INCOME = 8_500_000
const EXPENSE = 1_240_000

export const WEEK_DATA = {
  transactions: 9,
  income: INCOME,
  expense: EXPENSE,
  net: INCOME - EXPENSE,
} as const

/** level tanaman — kanon Domain 3B (streak tersembunyi, jangan ditampilkan angkanya) */
export const WEEK_PLANT = {
  level: 8,
  maxLevel: 8,
  levelUpThisWeek: 2,
  hpGain: 10,
} as const

export type ExpenseSegment = {
  label: string
  amount: number
  pct: number
  color: string
}

/** jumlah `amount` dijumlahkan = WEEK_DATA.expense (1.240.000) */
export const WEEK_SEGMENTS: ExpenseSegment[] = [
  { label: 'Makanan', amount: 420_000, pct: 34, color: '#b89191' },
  { label: 'Transport', amount: 280_000, pct: 23, color: '#91a0b8' },
  { label: 'Tagihan', amount: 180_000, pct: 15, color: '#b5b987' },
  { label: 'Belanja', amount: 150_000, pct: 12, color: '#45594e' },
  { label: 'Lainnya', amount: 210_000, pct: 16, color: '#91bb9e' },
]

export const formatIDR = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
