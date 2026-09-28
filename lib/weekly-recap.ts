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

/* ── CTA SLIDE "RENCANA MINGGU DEPAN" (paket 29) ─────────────────────────────
   Dua tombol di bawah slide ini dulu MATI, padahal PRD 2141–2145 minta CTA-nya
   duduk di zona ibu jari — jadi justru tombol paling mudah dijangkau yang tidak
   bisa ditekan. Sekarang keduanya punya tujuan nyata:

     • `setTarget` → alur target nabung yang SUDAH ada di app (modal Target
       bulanan; dibuka dari kartu Target — Home maupun /history — atau dari CTA
       recap ini sendiri). Labelnya sengaja "Atur target nabung", BUKAN "target
       minggu depan": yang disimpan app adalah target bulanan, dan menulis
       minggu sementara data menyimpan bulan = janji yang tidak dipenuhi angka.
       CTA ini WAJIB membuka modalnya (paket 32) — dulu, saat prop `onSetTarget`
       tidak dikirim (/history), label ini jatuh ke tautan /budget: tujuan nyata,
       tapi bukan alur target.
     • `planLink` → `/budget`, halaman "rencana tabungan" yang sungguhan (limit
       per kategori + celengan impian). */
export const WEEKLY_RECAP_CTA_COPY = {
  setTarget: 'Atur target nabung',
  planLink: 'Lihat rencana tabungan cerdas',
} as const
