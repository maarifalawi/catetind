import { MASKED_AMOUNT } from './history'
import { formatIDR } from '../wallets'

/* ── Joint Wallet (/app/joint) — PRD Domain 2D ───────────────────────────────
   "Multiplayer mode" CatetInd: satu dompet untuk dua orang (pasangan serius /
   menikah). Modul ini SENGAJA murni data + fungsi hitung (tanpa React) supaya:

   1. Settlement (siapa bayar lebih banyak, siapa harus transfer) bisa diuji
      tanpa render — sama seperti `lib/data/history.ts`.
   2. Semua angka yang dipakai Balance Scale, stats row, dan timeline berasal
      dari SATU sumber, jadi tidak ada nominal yang berbeda antar-section.

   MODEL AKUNTANSI (audit fintech #1–#3) — baca ini dulu sebelum ubah rumus:
   • Dompet ini SHARED LEDGER, bukan rekening bersama. Uang TIDAK dikumpulkan
     di satu tempat: tiap orang mengeluarkan dari kantongnya sendiri, lalu
     dihitung impas saat settle. Karena itu `JointWallet` sengaja TIDAK punya
     field saldo — "saldo bersama" adalah angka fiktif (audit #1).
   • `paidBy()`        → uang yang benar-benar keluar dari kantong satu orang
     untuk SELURUH catatan (traktiran & transaksi privat ikut). Dipakai hero
     "Total Pengeluaran Bersama" + Card Stats, supaya angka di kartu bisa
     ditelusuri ke jumlah catatan di timeline.
   • `weighedPaidBy()` → angka yang DITIMBANG timbangan: HANYA pengeluaran
     patungan (Bagi Rata / Persentase / Nominal Custom). Traktiran
     ("Yang Ini Gue Yang Bayar" = 100% ditanggung sendiri, bukan utang ke
     pasangan) DIKELUARKAN dari timbangan (audit #2), sedangkan nominal
     transaksi 🔒 Privat TETAP dihitung walau itemnya disembunyikan dari
     pasangan (audit #3).

   Waktu: JOINT_TODAY_ISO dipakai sebagai "hari ini" (konstan) — pola yang sama
   dengan halaman Tagihan / Kekayaan — supaya render server & client identik
   (label "Hari ini"/"Kemarin" deterministik, bebas hydration mismatch). */

/* ── SAKLAR DEMO ─────────────────────────────────────────────────────────────
   Pola yang sama dengan `weekly-recap-banner.tsx` (DEMO_FORCE_SHOW): semua
   state yang conditional tetap bisa di-review desainernya. Set ke false untuk
   perilaku produksi. */
/** false → seluruh halaman berubah jadi flow "Ajak Pasangan" (Section 8) */
export const DEMO_PARTNER_JOINED = true
/** paksa banner rekap mingguan tampil (produksi: hanya hari Minggu).
 *  Kalau rekap BULANAN juga aktif, banner mingguan disembunyikan —
 *  hierarki audit #8 lewat `recapBannerVisibility()`. */
export const DEMO_FORCE_WEEKLY_RECAP = true
/** paksa banner rekap bulanan tampil (produksi: hanya tanggal 28–31).
 *  Set false kalau mau mereview banner mingguan sendirian. */
export const DEMO_FORCE_MONTHLY_RECAP = true
/** simulasi transaksi baru dari partner masuk via "Supabase Realtime" (5C) */
export const DEMO_REALTIME_MOCK = true
/** tampilkan overlay selebrasi "partner baru gabung" saat halaman dibuka (8C) */
export const DEMO_JOINED_CELEBRATION = false

/** "hari ini" versi mock — konstan supaya label tanggal tidak bergeser (SSR-safe) */
export const JOINT_TODAY_ISO = '2026-09-25'
/** "besok"-nya JOINT_TODAY_ISO — dipakai label "Kemarin" */
const JOINT_YESTERDAY_ISO = '2026-09-24'

export type JointSplitType = 'equal' | 'percentage' | 'nominal' | 'single_payer'

/** identitas satu orang di dompet bersama (mock — nanti dari profil user) */
export type JointPerson = {
  id: string
  name: string
  /** emoji avatar */
  avatar: string
  /** kelas tint chip avatar */
  tint: string
  /** kelas titik penghubung timeline (menempel garis tengah) */
  dot: string
  /** kelas rel kiri saat timeline jadi satu kolom (mobile) */
  rail: string
}

export type JointTransaction = {
  id: string
  userId: string
  description: string
  amount: number
  category: string
  /** tanggal lokal `YYYY-MM-DD` */
  date: string
  /** jam lokal `HH:MM` */
  time: string
  splitType: JointSplitType
  /** mode 'percentage' → persen per user (total 100) · mode 'nominal' → rupiah per user */
  splits?: Record<string, number>
  /** mode 'single_payer' → user yang menanggung 100% */
  payerId?: string
  /** true = detail itemnya cuma kelihatan oleh pembuatnya (Domain 2D.4).
   *  NOMINALNYA tetap ikut hitungan timbangan bersama (audit fintech #3) */
  isPrivate?: boolean
  /** pemilik transaksi privat */
  privateForUser?: string
  /** baru masuk dari partner (mock Realtime) → animasi slide-in + badge "Baru" */
  justArrived?: boolean
}

/** kategori penanda transaksi privat — dipakai bersama oleh rincian kategori
 *  dan label timeline supaya nama item privat tidak pernah bocor (2D.4) */
export const PRIVATE_CATEGORY = '🔒'

export type JointWallet = {
  id: string
  name: string
  /** tanggal dompet bersama dibuat (`YYYY-MM-DD`) */
  createdAt: string
}

/** label + hint tiap mode pembagian di Split Bill Sheet (Section 6A) */
export const SPLIT_MODES: { id: JointSplitType; label: string; hint: string }[] = [
  { id: 'equal', label: 'Bagi Rata', hint: '50 / 50 — paling sering dipakai' },
  { id: 'percentage', label: 'Persentase', hint: 'Geser slider, sisi lain ikut menyesuaikan' },
  { id: 'nominal', label: 'Nominal Custom', hint: 'Isi satu sisi, sisanya dihitung otomatis' },
  { id: 'single_payer', label: 'Yang Ini Gue Yang Bayar', hint: '100% ditanggung satu orang' },
]

/** quick-pick persentase (Section 6A) */
export const PERCENT_PRESETS = [
  { me: 60, partner: 40 },
  { me: 70, partner: 30 },
  { me: 80, partner: 20 },
] as const

/* ── IDENTITAS ───────────────────────────────────────────────────────────── */
/* Tint dua orang sengaja diambil dari palet status HUD (sage #A3B18A &
   amber #DDA15E) supaya warna orang = bahasa warna CatetInd, bukan warna baru. */
export const JOINT_ME: JointPerson = {
  id: 'user_a',
  name: 'Jon',
  avatar: '🧑',
  tint: 'bg-hud-sage/25 text-[#4c5a3a] ring-hud-sage/50',
  dot: 'bg-hud-sage ring-[#FFFDF7]',
  rail: 'border-hud-sage',
}

export const JOINT_PARTNER: JointPerson = {
  id: 'user_b',
  name: 'Dany',
  avatar: '👩',
  tint: 'bg-hud-amber/25 text-[#8a5a1f] ring-hud-amber/50',
  dot: 'bg-hud-amber ring-[#FFFDF7]',
  rail: 'border-hud-amber',
}

/** dompet bersama default — nama bisa diganti (editable on tap, Section 2).
 *  TIDAK ada `balance` di sini: dompet ini BUKU BESAR bersama, bukan rekening
 *  berisi uang (audit fintech #1 — "saldo bersama" itu angka fiktif). */
export const INITIAL_JOINT_WALLET: JointWallet = {
  id: 'joint_1',
  name: 'Dompet Kita 💚',
  createdAt: '2026-07-15',
}

/* ── TRANSAKSI (mock) ────────────────────────────────────────────────────── */
/* Urutan sumber sengaja TIDAK berurut waktu: pengurutan dikerjakan
   `groupJointTransactions()` supaya satu tempat saja yang tahu aturan urut. */
export const INITIAL_JOINT_TRANSACTIONS: JointTransaction[] = [
  {
    id: '1',
    userId: JOINT_ME.id,
    description: 'Groceries Superindo',
    amount: 285000,
    category: 'Makanan',
    date: JOINT_TODAY_ISO,
    time: '14:32',
    splitType: 'equal',
  },
  {
    id: '2',
    userId: JOINT_PARTNER.id,
    description: 'Listrik PLN September',
    amount: 450000,
    category: 'Tagihan',
    date: JOINT_TODAY_ISO,
    time: '10:15',
    splitType: 'equal',
  },
  {
    id: '3',
    userId: JOINT_ME.id,
    description: 'Makan malam anniversary',
    amount: 380000,
    category: 'Makanan',
    date: JOINT_YESTERDAY_ISO,
    time: '19:45',
    splitType: 'single_payer',
    payerId: JOINT_ME.id,
  },
  {
    id: '4',
    userId: JOINT_PARTNER.id,
    description: 'Pengeluaran Privat Partner',
    amount: 150000,
    category: '🔒',
    date: JOINT_YESTERDAY_ISO,
    time: '16:00',
    splitType: 'equal',
    isPrivate: true,
    privateForUser: JOINT_PARTNER.id,
  },
  {
    id: '5',
    userId: JOINT_ME.id,
    description: 'WiFi IndiHome',
    amount: 350000,
    category: 'Tagihan',
    date: '2026-09-23',
    time: '09:00',
    splitType: 'percentage',
    splits: { [JOINT_ME.id]: 60, [JOINT_PARTNER.id]: 40 },
  },
  {
    id: '6',
    userId: JOINT_PARTNER.id,
    description: 'Bensin motor',
    amount: 50000,
    category: 'Transportasi',
    date: '2026-09-23',
    time: '08:30',
    splitType: 'equal',
  },
  {
    id: '7',
    userId: JOINT_ME.id,
    description: 'Groceries Alfamart',
    amount: 120000,
    category: 'Makanan',
    date: '2026-09-22',
    time: '17:00',
    splitType: 'equal',
  },
  {
    id: '8',
    userId: JOINT_PARTNER.id,
    description: 'Sabun & shampoo',
    amount: 85000,
    category: 'Belanja',
    date: '2026-09-22',
    time: '11:20',
    splitType: 'equal',
  },
]

/* ── MOCK SUPABASE REALTIME (Section 5C) ─────────────────────────────────── */
/** jeda munculnya indikator "Dany sedang mencatat..." setelah halaman dibuka */
export const REALTIME_TYPING_DELAY = 2600
/** jeda transaksi partner benar-benar masuk (spec: ~5 detik) */
export const REALTIME_ARRIVAL_DELAY = 5000
/** transaksi yang "datang" dari partner — nominal & copy persis spec Section 5C */
export const REALTIME_ARRIVAL: JointTransaction = {
  id: 'rt-1',
  userId: JOINT_PARTNER.id,
  description: 'Listrik PLN',
  amount: 450000,
  category: 'Tagihan',
  date: JOINT_TODAY_ISO,
  time: '21:07',
  splitType: 'equal',
  justArrived: true,
}

/* ── REKAP MINGGUAN & BULANAN (Section 10) ───────────────────────────────── */
export const JOINT_WEEKLY = {
  /** total pengeluaran bersama 7 hari terakhir (mock) */
  total: 728000,
  /** dibanding minggu lalu (negatif = lebih hemat) */
  trendPct: -12,
  /** jumlah catatan per orang — dipakai copy "paling rajin catat" */
  counts: { [JOINT_ME.id]: 4, [JOINT_PARTNER.id]: 5 } as Record<string, number>,
}

/** label bulan untuk rekap (mock: September 2026) */
export const JOINT_MONTH_LABEL = 'September 2026'
/** total pengeluaran bersama bulan lalu — pembanding trend di stats row.
 *  Dianotasi `number` supaya perbandingan `=== 0` di UI tetap valid secara tipe. */
export const JOINT_PREV_MONTH_TOTAL: number = 1985000

/* ── HITUNGAN SETTLEMENT (Section 3) ─────────────────────────────────────── */
/** ambang "perlu settle" — di atas ini baru muncul ajakan transfer (kanon 2D.3) */
export const SETTLEMENT_THRESHOLD = 100000

/** ambang banner gaya push "pengeluaran besar" (Section 11: > Rp 500.000) */
export const PUSH_ALERT_THRESHOLD = 500000

/** level keputusan yang dipakai UI untuk memilih copy Balance Scale */
export type SettlementLevel = 'equal' | 'close' | 'settle'

export type SettlementState = {
  /* ── lapisan 1: seluruh catatan (hero + Card Stats + timeline) ─────────── */
  /** semua uang yang keluar dari kantong satu orang bulan ini (traktiran &
   *  privat ikut) — angka di Card Stats */
  myTotalSpent: number
  partnerTotalSpent: number
  /** Total Pengeluaran Bersama bulan ini = jumlah SELURUH catatan (hero) */
  totalSpent: number
  /** porsi tiap orang dari total catatan, persen dibulatkan */
  myPct: number
  partnerPct: number

  /* ── lapisan 2: yang benar-benar naik ke timbangan (patungan saja) ─────── */
  /** pengeluaran patungan satu orang — inilah berat panci timbangan */
  myWeighedSpent: number
  partnerWeighedSpent: number
  /** total yang ditimbang (tanpa traktiran) */
  weighedTotal: number
  /** total traktiran bulan ini — dipakai copy "tidak ikut ditimbang" */
  treatTotal: number
  /** selisih absolut dari angka yang DITIMBANG — selalu positif */
  difference: number
  /** setengah selisih = nominal transfer biar impas */
  settlementAmount: number
  whoOwes: JointPerson
  whoIsOwed: JointPerson
  /**
   * Kemiringan beam dari angka yang DITIMBANG (audit #2: traktiran tidak boleh
   * menggerakkan palang). Konvensi: positif = panci AKU lebih berat → panci
   * kiri (aku) TURUN. Pihak yang nalangin lebih banyak memang harus lebih
   * rendah — itu hukum berat dasar, bukan pilihan desain (audit #5).
   */
  tiltDeg: number
  level: SettlementLevel
  /** true = bulan ini sudah ditandai settle (scale dikunci rata) */
  settled: boolean
}

/** true = traktiran: "Yang Ini Gue Yang Bayar" → 100% ditanggung satu pihak,
 *  jadi TIDAK menimbulkan utang ke pasangan (audit fintech #2) */
export function isTreat(tx: JointTransaction): boolean {
  return tx.splitType === 'single_payer'
}

/** true = transaksi ini ikut menimbang timbangan settlement.
 *  Traktiran keluar dari timbangan; transaksi privat SELALU masuk (audit #3)
 *  supaya nominalnya tetap dihitung sebagai beban, apa pun mode split-nya. */
export function countsForSettlement(tx: JointTransaction): boolean {
  return !isTreat(tx) || Boolean(tx.isPrivate)
}

/** uang yang KELUAR DARI KANTONG satu orang untuk seluruh catatan dompet
 *  bersama bulan ini — traktiran & transaksi privat ikut dihitung supaya
 *  angka Card Stats bisa ditelusuri ke jumlah catatan di timeline (audit #3). */
export function paidBy(transactions: JointTransaction[], userId: string): number {
  return transactions
    .filter((tx) => tx.userId === userId)
    .reduce((sum, tx) => sum + tx.amount, 0)
}

/** Berat panci timbangan satu orang: pengeluaran patungan saja.
 *  Traktiran dikeluarkan (audit #2), nominal privat tetap dihitung (audit #3). */
export function weighedPaidBy(transactions: JointTransaction[], userId: string): number {
  return transactions
    .filter((tx) => tx.userId === userId && countsForSettlement(tx))
    .reduce((sum, tx) => sum + tx.amount, 0)
}

/** batasi nilai ke rentang [min, max] */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Satu-satunya sumber kebenaran untuk Balance Scale, stats row, dan modal
 * settlement. Dua lapisan angka (lihat MODEL AKUNTANSI di kepala file):
 *   • `myTotalSpent`/`partnerTotalSpent`/`totalSpent`  → seluruh catatan
 *     (hero + Card Stats + timeline).
 *   • `myWeighedSpent`/`partnerWeighedSpent`/`difference` → yang benar-benar
 *     ditimbang (patungan saja; traktiran keluar, privat tetap masuk).
 * `settled: true` memaksa scale kembali rata (0°) — dipakai setelah user
 * menekan "Tandai Sudah Settle ✓" supaya animasi pegasnya jalan ke level.
 */
export function computeSettlement(
  transactions: JointTransaction[],
  { settled = false }: { settled?: boolean } = {},
): SettlementState {
  /* lapisan 1 — seluruh catatan: berapa uang yang keluar dari tiap kantong */
  const myTotalSpent = paidBy(transactions, JOINT_ME.id)
  const partnerTotalSpent = paidBy(transactions, JOINT_PARTNER.id)
  const totalSpent = myTotalSpent + partnerTotalSpent

  /* lapisan 2 — hanya pengeluaran patungan yang naik ke timbangan */
  const myWeighedSpent = weighedPaidBy(transactions, JOINT_ME.id)
  const partnerWeighedSpent = weighedPaidBy(transactions, JOINT_PARTNER.id)
  const weighedTotal = myWeighedSpent + partnerWeighedSpent
  /* selisih total vs yang ditimbang = traktiran (bukan utang pasangan) */
  const treatTotal = totalSpent - weighedTotal

  const difference = Math.abs(myWeighedSpent - partnerWeighedSpent)
  const iPaidMore = myWeighedSpent >= partnerWeighedSpent

  /* spec Section 3: tiltDeg = ((aku - partner) / total) * 24, dijepit ±12° supaya
     beda sekecil apa pun tetap terbaca dan beda besar tidak bikin beam jungkir.
     Dihitung dari angka yang DITIMBANG — traktiran tidak boleh menggerakkan
     palang (audit #2). */
  const rawTilt =
    weighedTotal === 0 ? 0 : ((myWeighedSpent - partnerWeighedSpent) / weighedTotal) * 24
  const tiltDeg = settled ? 0 : clamp(rawTilt, -12, 12)

  const myPct = totalSpent === 0 ? 0 : Math.round((myTotalSpent / totalSpent) * 100)

  return {
    myTotalSpent,
    partnerTotalSpent,
    totalSpent,
    myPct,
    partnerPct: totalSpent === 0 ? 0 : 100 - myPct,
    myWeighedSpent,
    partnerWeighedSpent,
    weighedTotal,
    treatTotal,
    difference,
    settlementAmount: Math.round(difference / 2),
    whoOwes: iPaidMore ? JOINT_PARTNER : JOINT_ME,
    whoIsOwed: iPaidMore ? JOINT_ME : JOINT_PARTNER,
    tiltDeg,
    /* settled dipaksa rata supaya animasi "kembali level" terjadi */
    level:
      settled || difference === 0
        ? 'equal'
        : difference > SETTLEMENT_THRESHOLD
          ? 'settle'
          : 'close',
    settled,
  }
}

/**
 * Kanon PRD A7 + audit #6: ajakan settle (banner cokelat + tombol transfer)
 * BARU boleh muncul kalau selisih > Rp100.000. Selama statusnya "Gak perlu
 * settle" (atau sudah ditandai settle) sistem harus diam — dua pesan yang
 * bertabrakan di satu layar bikin user kehilangan kepercayaan ke angkanya.
 */
export function shouldPromptSettlement(settlement: SettlementState): boolean {
  return !settlement.settled && settlement.level === 'settle'
}

/* ── JENDELA REKAP (Section 10) ──────────────────────────────────────────── */
/** produksi: rekap mingguan cuma hari Minggu */
export function isWeeklyRecapDay(day: Date): boolean {
  return day.getDay() === 0
}
/** produksi: rekap bulanan cuma tanggal 28–31 */
export function isMonthlyRecapDay(day: Date): boolean {
  return day.getDate() >= 28
}

/**
 * Banner rekap mana yang boleh tampil (audit #8). Di produksi `forceMonthly` &
 * `forceWeekly` false → keputusan murni dari tanggal; dua-duanya true = saklar
 * demo. HIERARKI: rekap bulanan menang, rekap mingguan disembunyikan — dua
 * banner raksasa bertumpuk bikin layar penuh notifikasi dan justru bikin
 * keduanya diabaikan user.
 */
export function recapBannerVisibility(
  day: Date,
  { forceMonthly = false, forceWeekly = false }: { forceMonthly?: boolean; forceWeekly?: boolean } = {},
): { monthly: boolean; weekly: boolean } {
  const monthly = forceMonthly || isMonthlyRecapDay(day)
  const weekly = forceWeekly || isWeeklyRecapDay(day)
  return { monthly, weekly: weekly && !monthly }
}

/* ── PENGELOMPOKAN & LABEL ───────────────────────────────────────────────── */

/** singkatan bulan Indonesia — ditulis manual supaya label tanggal deterministik
 *  (tidak bergantung ICU/locale mesin yang merender) */
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const MONTHS_LONG = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

/** "2026-09-25" → angka-angka tanggalnya tanpa bikin objek Date (bebas timezone) */
function parseIso(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split('-').map(Number)
  return { year, month, day }
}

/** "Hari ini" · "Kemarin" · "22 Sep" (＋ tahun kalau beda tahun) */
export function jointDateLabel(iso: string): string {
  if (iso === JOINT_TODAY_ISO) return 'Hari ini'
  if (iso === JOINT_YESTERDAY_ISO) return 'Kemarin'
  const { year, month, day } = parseIso(iso)
  const base = `${day} ${MONTHS_SHORT[month - 1]}`
  return year === parseIso(JOINT_TODAY_ISO).year ? base : `${base} ${year}`
}

/** "2026-07-15" → "15 Juli 2026" (dipakai "Bersama sejak ...") */
export function jointDateLong(iso: string): string {
  const { year, month, day } = parseIso(iso)
  return `${day} ${MONTHS_LONG[month - 1]} ${year}`
}

export type JointDayGroup = {
  date: string
  /** label separator yang menyeberangi garis tengah timeline */
  label: string
  items: JointTransaction[]
}

/** urut terbaru dulu (tanggal lalu jam), dikelompokkan per hari */
export function groupJointTransactions(transactions: JointTransaction[]): JointDayGroup[] {
  const sorted = [...transactions].sort((a, b) =>
    a.date === b.date ? b.time.localeCompare(a.time) : b.date.localeCompare(a.date),
  )

  const groups: JointDayGroup[] = []
  for (const tx of sorted) {
    const last = groups[groups.length - 1]
    if (last && last.date === tx.date) {
      last.items.push(tx)
      continue
    }
    groups.push({ date: tx.date, label: jointDateLabel(tx.date), items: [tx] })
  }
  return groups
}

/** nominal ikut toggle privasi halaman */
export function moneyLabel(value: number, masked: boolean): string {
  return masked ? MASKED_AMOUNT : formatIDR(value)
}

/** label pembagian kecil di tiap kartu timeline: "Bagi rata" · "60/40" · "Jon yang bayar" */
export function splitLabel(tx: JointTransaction, masked = false): string {
  switch (tx.splitType) {
    case 'percentage': {
      const mine = tx.splits?.[JOINT_ME.id] ?? 50
      return `${mine}/${100 - mine}`
    }
    case 'nominal': {
      const mine = tx.splits?.[JOINT_ME.id] ?? Math.round(tx.amount / 2)
      return `${moneyLabel(mine, masked)} · ${moneyLabel(tx.amount - mine, masked)}`
    }
    case 'single_payer': {
      const payer = tx.payerId === JOINT_PARTNER.id ? JOINT_PARTNER : JOINT_ME
      return `${payer.name} yang bayar`
    }
    default:
      return 'Bagi rata'
  }
}

export type JointCategorySlice = { category: string; amount: number; pct: number }

/**
 * Rincian per kategori untuk kartu stats yang di-tap (Section 4).
 * `userId` kosong = seluruh dompet.
 * Audit fintech #3: nominal transaksi privat IKUT dijumlahkan (dulu dibuang,
 * jadi Σ rincian ≠ angka di kartunya) — tapi identitas itemnya tetap rahasia,
 * jadi privat masuk sebagai satu irisan "🔒 Privat" tanpa nama item.
 */
export function categoryBreakdown(
  transactions: JointTransaction[],
  userId?: string,
): JointCategorySlice[] {
  const scoped = transactions.filter((tx) => userId === undefined || tx.userId === userId)
  const total = scoped.reduce((sum, tx) => sum + tx.amount, 0)

  const byCategory = new Map<string, number>()
  for (const tx of scoped) {
    /* privat dinormalkan ke satu kategori anonim: nominalnya ikut dihitung,
       tapi kategorinya tidak boleh membocorkan isi transaksinya (2D.4) */
    const category = tx.isPrivate ? PRIVATE_CATEGORY : tx.category
    byCategory.set(category, (byCategory.get(category) ?? 0) + tx.amount)
  }

  return [...byCategory.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      pct: total === 0 ? 0 : Math.round((amount / total) * 100),
    }))
    .sort((a, b) => b.amount - a.amount)
}

/** emoji kecil untuk pill kategori (mock — nanti dari katalog kategori) */
export function categoryEmoji(category: string): string {
  switch (category) {
    case 'Makanan':
      return '🍜'
    case 'Tagihan':
      return '🧾'
    case 'Transportasi':
      return '🛵'
    case 'Belanja':
      return '🧺'
    case PRIVATE_CATEGORY:
      return '🔒'
    default:
      return '💚'
  }
}

/** label kategori untuk rincian: item privat tetap anonim (audit #3) */
export function categoryLabel(category: string): string {
  return category === PRIVATE_CATEGORY ? 'Privat' : category
}

/* ── INVITE PARTNER (Section 8) ──────────────────────────────────────────── */
export const INVITE_CODE = 'A7K2M9'
export const INVITE_LINK = `https://catetind.app/join/${INVITE_CODE}`
/** copy masa berlaku kode */
export const INVITE_VALIDITY_COPY = 'Kode berlaku 24 jam. Cuma bisa dipakai 1x.'

/** share text untuk navigator.share (fallback: clipboard + toast) */
export function buildInviteShareText(name: string): string {
  return `Halo! Aku (${name}) mengajakmu kelola uang bareng di CatetInd 💚 Kode: ${INVITE_CODE} — klik link ini: ${INVITE_LINK}`
}

/* ── COPY YANG DIPAKAI BERSAMA ───────────────────────────────────────────── */
/** peringatan saat toggle privasi transaksi dinyalakan (Section 9).
 *  Audit #1 + #3: dompet ini bukan rekening bersama, dan nominal privat tetap
 *  ikut hitungan — jadi copy-nya tidak boleh lagi bilang "saldo berkurang". */
export const PRIVACY_WARNING_COPY =
  'Transaksi ini cuma kamu yang lihat detail itemnya. Pasanganmu tetap lihat nominalnya ikut dihitung di total bersama, tanpa tahu item & kategorinya.'
/** penjelasan aturan timbangan (audit #2 & #3) — dipakai di halaman & modal */
export const SETTLEMENT_SCOPE_COPY =
  'Timbangan cuma menimbang pengeluaran patungan (Bagi Rata & Custom Split). Traktiran tidak ikut ditimbang; nominal transaksi 🔒 Privat tetap dihitung.'
/** versi pendek untuk ruang sempit (di dalam modal rekap) */
export const SETTLEMENT_SCOPE_SHORT =
  'Traktiran tidak ditimbang · nominal 🔒 Privat tetap dihitung.'
/** tooltip transaksi privat milik sendiri (Section 5B) */
export const PRIVATE_OWNER_HINT = 'Transaksi ini disembunyikan dari pasanganmu'
/** pengingat bahwa aplikasi ini cuma mencatat, bukan memindahkan uang */
export const SETTLEMENT_DISCLAIMER =
  'Ini cuma pencatatan, bukan transfer uang asli. Transfernya manual via BCA/GoPay/cash ya 😊'
export const SETTLED_TOAST = 'Settled! Bulan depan mulai dari nol ⚖️💚'

