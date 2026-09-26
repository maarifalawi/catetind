import type { TransactionType } from '../types'
import { formatIDR } from '../wallets'

/* ── Riwayat & Insight (/app/history) ────────────────────────────────────────
   Satu sumber data untuk halaman Riwayat & Insight:

   1. Mock transaksi (dikelompokkan dalam 3 tanggal) + jumlah total transaksi
      milik user — dipakai untuk gate Skor Kewarasan Finansial (PRD 2A.5).
   2. Definisi filter (Waktu / Wallet / Tipe / Kategori) + fungsi filter murni,
      jadi logika penyaringan bisa dipakai ulang & diuji tanpa React.
   3. Data heatmap 30 hari yang DETERMINISTIK (seeded PRNG) supaya HTML server
      dan client identik — tidak ada hydration mismatch seperti `Math.random()`.

   Tanggal disimpan sebagai string `YYYY-MM-DD` (waktu lokal) supaya
   perbandingan hari tidak pernah bergeser karena timezone. */

export interface HistoryTransaction {
  id: number
  name: string
  /** selalu angka positif — arah uang ditentukan oleh `type` */
  amount: number
  type: TransactionType
  category: string
  wallet: string
  /** tanggal lokal `YYYY-MM-DD` */
  date: string
  /** jam lokal `HH:MM` untuk subjudul baris & detail */
  time: string
  /** true = nama transaksi hasil parsing AI (badge ✨) */
  aiGenerated: boolean
}

/** label manusiawi untuk tiap TYPE transaksi (dipakai di sheet aksi & ARIA) */
export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  income: 'Pemasukan',
  expense: 'Pengeluaran',
  transfer: 'Transfer',
  saving: 'Tabungan',
}

/* ── BAHASA WARNA UANG (satu sumber untuk SEMUA daftar transaksi) ─────────────
   Disamakan dengan kartu "Pemasukan vs Pengeluaran" di Dashboard dan heatmap
   kalender: hijau = uang MASUK, terracotta = uang KELUAR. Dua warna itu
   satu-satunya warna yang punya arti uang.

     • `rose` dipakai HANYA untuk aksi merusak (Hapus) — bukan nominal. Jadi
       pengeluaran biasa tidak lagi "diteriakkan" merah; yang menandai uang
       keluar cukup warnanya, bukan alarmnya. (Sejalan dengan kanon PRD Domain
       2B.2: warna status tidak memakai merah.)
     • pindah dana (tabungan/transfer) = NETRAL, tinta redup + glyph ⇄ —
       net worth tidak berubah, jadi tidak perlu warna sama sekali. Biru tidak
       lagi dipakai sebagai makna uang karena dulu dobel fungsi: sekaligus
       warna tombol Edit, sehingga "pindah dana" terbaca seperti aksi.

   Baris di Riwayat & sheet Detail membaca peta yang sama, jadi warnanya
   mustahil berbeda antar layar. */
export const MONEY_TONE: Record<
  TransactionType,
  {
    /** warna nominal (teks) */
    text: string
    /** swatch legenda */
    dot: string
    /** label makna untuk legenda */
    label: string
  }
> = {
  income: { text: 'text-forest', dot: 'bg-forest', label: 'Pemasukan' },
  expense: { text: 'text-hud-terracotta', dot: 'bg-hud-terracotta', label: 'Pengeluaran' },
  saving: { text: 'text-ink/55', dot: 'bg-ink/30', label: 'Pindah dana' },
  transfer: { text: 'text-ink/55', dot: 'bg-ink/30', label: 'Pindah dana' },
}

/** urutan legenda: masuk → keluar → netral */
export const MONEY_LEGEND = [MONEY_TONE.income, MONEY_TONE.expense, MONEY_TONE.saving]

/** penanda arah di depan nominal: `+` masuk, `-` keluar, `⇄` cuma pindah dana */
export function amountSign(type: TransactionType): '+' | '-' | '⇄' {
  if (type === 'income') return '+'
  if (type === 'expense') return '-'
  return '⇄'
}

/**
 * TYPE ≠ KATEGORI (audit mapping DB → UI).
 *
 * Dulu data mentah menyimpan `category: 'Pemasukan'` untuk gaji, sehingga slot
 * "kategori" di baris transaksi bocor menampilkan nama TYPE, bukan kategori
 * spesifik. Helper ini menjaga slot kategori TIDAK PERNAH berisi nama tipe lagi:
 * kalau datanya ternyata masih "Pemasukan"/"Pengeluaran" (DSL lama / kiriman
 * backend yang belum dinormalisasi), dia jatuh ke label kategori generik.
 */
const TYPE_WORDS = new Set(['pemasukan', 'pengeluaran', 'income', 'expense'])

const CATEGORY_FALLBACK: Record<TransactionType, string> = {
  income: 'Pemasukan Lain',
  expense: 'Lainnya',
  transfer: 'Transfer',
  saving: 'Tabungan',
}

/** kategori yang aman ditampilkan di slot ketiga baris transaksi */
export function resolveCategoryLabel(tx: HistoryTransaction): string {
  const raw = tx.category.trim()
  if (!raw || TYPE_WORDS.has(raw.toLowerCase())) return CATEGORY_FALLBACK[tx.type]
  return raw
}

/**
 * true kalau transaksi cuma MEMINDAHKAN uang (transfer antar dompet / setor
 * tabungan) sehingga net worth user tidak berubah. Dipakai untuk menandai
 * aktivitas ini dengan styling "pindah dana" yang NETRAL (lihat `MONEY_TONE`),
 * bukan warna pengeluaran.
 */
export function isMoneyMovement(tx: HistoryTransaction): boolean {
  return tx.type === 'transfer' || tx.type === 'saving'
}

/** Ambang unlock widget Skor Kewarasan Finansial — kanon PRD Domain 2A.5 */
export const HEALTH_SCORE_THRESHOLD = 30
/** Skor mock 0–100 (nanti dari backend) */
export const HEALTH_SCORE = 72

/**
 * Jumlah transaksi user sejauh ini (mock).
 * Ubah ke >= HEALTH_SCORE_THRESHOLD (30) untuk melihat varian GAUGE.
 */
export const TOTAL_TRANSACTIONS = 24

/**
 * "Hari ini" untuk DATA MOCK transaksi — DIPATOK sebagai konstanta (bukan
 * `new Date()`), seperti seluruh tanggal mock lain di repo. Dua hal memakainya:
 *
 *   1. empat catatan paling baru di `HISTORY_TRANSACTIONS` (hari berjalan), dan
 *   2. jangkar tanggal halaman /budget (`lib/data/budget.ts` → `TODAY_ISO`).
 *
 * Dua hal itu HARUS satu tanggal: panel "Review Pengeluaran Hari Ini" (prompt
 * 19) membandingkan catatan hari ini dengan jatah harian periode aktif, jadi
 * kalau jangkarnya beda, panel dan Riwayat bisa bercerita soal hari yang
 * berbeda. Belum menggantikan `localISODate()` — itu membaca jam PERANGKAT dan
 * tetap dipakai untuk label "Hari Ini"/"Kemarin" di halaman Riwayat.
 */
export const HISTORY_TODAY_ISO = '2026-09-27'


export const HISTORY_TRANSACTIONS: HistoryTransaction[] = [
  { id: 1, name: 'Ayam Geprek Bu Rini', amount: 25000, type: 'expense', category: 'Makanan', wallet: 'GoPay', date: '2026-09-25', time: '12:40', aiGenerated: true },
  { id: 2, name: 'Kopi Kenangan Oat Latte', amount: 32000, type: 'expense', category: 'Makanan', wallet: 'GoPay', date: '2026-09-25', time: '09:15', aiGenerated: true },
  { id: 3, name: 'Top Up GoPay dari BCA', amount: 200000, type: 'transfer', category: 'Transfer', wallet: 'BCA', date: '2026-09-25', time: '08:05', aiGenerated: false },
  { id: 4, name: 'Parkir Mall Grand Indonesia', amount: 5000, type: 'expense', category: 'Transportasi', wallet: 'Tunai', date: '2026-09-24', time: '19:20', aiGenerated: true },
  { id: 5, name: 'Grab ke Kantor', amount: 45000, type: 'expense', category: 'Transportasi', wallet: 'OVO', date: '2026-09-24', time: '07:45', aiGenerated: true },
  { id: 6, name: 'Gaji September', amount: 7500000, type: 'income', category: 'Gaji Utama', wallet: 'BCA', date: '2026-09-24', time: '09:00', aiGenerated: false },
  { id: 7, name: 'Bayar Kos Bulan Sep', amount: 1500000, type: 'expense', category: 'Tagihan', wallet: 'BCA', date: '2026-09-23', time: '21:10', aiGenerated: true },
  { id: 8, name: 'Netflix Subscription', amount: 54000, type: 'expense', category: 'Hiburan', wallet: 'BCA', date: '2026-09-23', time: '20:00', aiGenerated: true },
  { id: 9, name: 'Nasi Padang Sederhana', amount: 28000, type: 'expense', category: 'Makanan', wallet: 'Tunai', date: '2026-09-25', time: '13:25', aiGenerated: true },
  { id: 10, name: 'Setor Tabungan Darurat', amount: 500000, type: 'saving', category: 'Dana Darurat', wallet: 'BCA', date: '2026-09-24', time: '10:30', aiGenerated: false },
  { id: 11, name: 'Boba Janji Jiwa', amount: 24000, type: 'expense', category: 'Makanan', wallet: 'OVO', date: '2026-09-23', time: '16:40', aiGenerated: true },
  { id: 12, name: 'Spotify Premium', amount: 59900, type: 'expense', category: 'Hiburan', wallet: 'OVO', date: '2026-09-23', time: '20:05', aiGenerated: true },
  /* ── HARI INI (`HISTORY_TODAY_ISO`) — empat catatan berjalan ──────────────
     Ditambahkan bersama prompt 19 supaya panel "Review Pengeluaran Hari Ini"
     membaca catatan HARI INI yang benar-benar ada, bukan hari yang kosong.
     Empat catatan ini disetel supaya:
       • totalnya Rp 85.000 — angka yang sama dengan ring "terpakai" di kartu
         Jatah Hari Ini (Home) dan panel review di /budget (`SPENT_TODAY`),
       • jumlahnya 4, jadi LEBIH dari ambang 3 catatan → panel boleh menyebut
         kategori terbesar (kalau dikurangi jadi 2, panel otomatis berpindah ke
         kartu sabar "aku lagi belajar pola keuanganmu" — PRD 2A.5).
     Catatan pertama sengaja sama dengan entri 27 Sep di dompet GoPay
     (`lib/data/wallet-detail.ts` id 201) supaya dua halaman tidak beda cerita. */
  { id: 13, name: 'Kopi Kenangan Oat Latte', amount: 32000, type: 'expense', category: 'Makanan', wallet: 'GoPay', date: HISTORY_TODAY_ISO, time: '08:10', aiGenerated: true },
  { id: 14, name: 'Sarapan Nasi Uduk', amount: 15000, type: 'expense', category: 'Makanan', wallet: 'Tunai', date: HISTORY_TODAY_ISO, time: '06:50', aiGenerated: true },
  { id: 15, name: 'Nasi Padang Sederhana', amount: 25000, type: 'expense', category: 'Makanan', wallet: 'Tunai', date: HISTORY_TODAY_ISO, time: '12:35', aiGenerated: true },
  { id: 16, name: 'Parkir Motor', amount: 13000, type: 'expense', category: 'Transportasi', wallet: 'Tunai', date: HISTORY_TODAY_ISO, time: '13:15', aiGenerated: false },
]

/* ── FILTER ──────────────────────────────────────────────────────────────── */

export type TimeFilter = 'all' | 'today' | 'week' | 'month'
export type WalletFilter = 'all' | 'bca' | 'gopay' | 'tunai' | 'ovo'
export type TypeFilter = 'all' | 'expense' | 'income' | 'transfer' | 'saving'
export type CategoryFilter = 'all' | 'makanan' | 'transportasi' | 'tagihan' | 'hiburan' | 'lainnya'

export interface HistoryFilters {
  time: TimeFilter
  wallet: WalletFilter
  type: TypeFilter
  category: CategoryFilter
}

export const INITIAL_FILTERS: HistoryFilters = {
  time: 'all',
  wallet: 'all',
  type: 'all',
  category: 'all',
}

export interface FilterOption<T extends string> {
  id: T
  label: string
}

export const TIME_FILTERS: FilterOption<TimeFilter>[] = [
  { id: 'all', label: 'Semua waktu' },
  { id: 'today', label: 'Hari ini' },
  { id: 'week', label: 'Minggu ini' },
  { id: 'month', label: 'Bulan ini' },
]

export const WALLET_FILTERS: FilterOption<WalletFilter>[] = [
  { id: 'all', label: 'Semua dompet' },
  { id: 'bca', label: 'BCA' },
  { id: 'gopay', label: 'GoPay' },
  { id: 'tunai', label: 'Tunai' },
  { id: 'ovo', label: 'OVO' },
]

export const TYPE_FILTERS: FilterOption<TypeFilter>[] = [
  { id: 'all', label: 'Semua tipe' },
  { id: 'expense', label: 'Pengeluaran' },
  { id: 'income', label: 'Pemasukan' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'saving', label: 'Tabungan' },
]

export const CATEGORY_FILTERS: FilterOption<CategoryFilter>[] = [
  { id: 'all', label: 'Semua kategori' },
  { id: 'makanan', label: 'Makanan' },
  { id: 'transportasi', label: 'Transportasi' },
  { id: 'tagihan', label: 'Tagihan' },
  { id: 'hiburan', label: 'Hiburan' },
  { id: 'lainnya', label: 'Lainnya' },
]

/** kategori dengan pill sendiri — sisanya (Pemasukan/Transfer/Tabungan) masuk
 *  bucket "Lainnya" supaya tidak ada transaksi yang mustahil difilter */
const NAMED_CATEGORIES = ['makanan', 'transportasi', 'tagihan', 'hiburan']

/* ── TANGGAL & MASKING ───────────────────────────────────────────────────── */

/** tanggal lokal (bukan UTC) dalam format `YYYY-MM-DD` */
export function localISODate(d: Date = new Date()): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** disingkat & diekspor supaya label rentang periode (lib/data/budget.ts) memakai
 *  satu sumber yang sama — tanpa Intl, jadi bebas pergeseran timezone */
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const MONTHS_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

/** `2026-09-25` → `25 Sep 2026` (tanpa Intl → bebas perbedaan data timezone) */
export function formatDayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`
}

/** `2026-09-25` → `25 September 2026` (dipakai di detail transaksi) */
export function formatDayLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${MONTHS_LONG[m - 1]} ${y}`
}

/** nilai yang tampil saat mode privasi aktif — dipakai di SEMUA nominal halaman */
export const MASKED_AMOUNT = 'Rp •••••••'

/* ── FILTER, PENGELOMPOKAN, DAN RINGKASAN ────────────────────────────────── */

/** semua kata di `query` harus muncul di nama/kategori/wallet (case-insensitive) */
export function matchesSearch(tx: HistoryTransaction, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = `${tx.name} ${tx.category} ${tx.wallet}`.toLowerCase()
  return q.split(/\s+/).every((word) => haystack.includes(word))
}

/** geser tanggal ISO sejumlah hari (aman lintas bulan/tahun) */
export function shiftISODate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, (m ?? 1) - 1, d ?? 1)
  date.setDate(date.getDate() + days)
  return localISODate(date)
}

function matchesTime(tx: HistoryTransaction, time: TimeFilter, todayIso: string): boolean {
  if (time === 'all' || !todayIso) return true
  if (time === 'today') return tx.date === todayIso
  if (time === 'week') {
    const start = shiftISODate(todayIso, -6)
    return tx.date >= start && tx.date <= todayIso
  }
  return tx.date.slice(0, 7) === todayIso.slice(0, 7)
}

/** saring transaksi berdasarkan 4 filter + kata kunci pencarian */
export function filterHistoryTransactions(
  txs: HistoryTransaction[],
  filters: HistoryFilters,
  query: string,
  todayIso: string,
): HistoryTransaction[] {
  return txs.filter((tx) => {
    if (!matchesSearch(tx, query)) return false
    if (!matchesTime(tx, filters.time, todayIso)) return false
    if (filters.wallet !== 'all' && tx.wallet.toLowerCase() !== filters.wallet) return false
    if (filters.type !== 'all' && tx.type !== filters.type) return false
    if (filters.category !== 'all') {
      const key = tx.category.toLowerCase()
      const isNamed = NAMED_CATEGORIES.includes(key)
      if (filters.category === 'lainnya' ? isNamed : key !== filters.category) return false
    }
    return true
  })
}

export interface HistoryDayGroup {
  date: string
  /** `Hari Ini — 25 Sep 2026` / `Kemarin — 24 Sep 2026` / `23 Sep 2026` */
  label: string
  /** income − (expense + saving); transfer tidak dihitung (uang pindah dompet) */
  net: number
  /** total uang yang cuma DIPINDAH (setoran tabungan + transfer) — net worth tetap,
   *  jadi pill harian perlu menjelaskan angkanya secara terpisah */
  moved: number
  items: HistoryTransaction[]
}

/** label relatif hari (butuh `todayIso`; tanpa itu jatuh ke tanggal polos) */
export function resolveDayLabel(iso: string, todayIso: string): string {
  if (!todayIso) return formatDayLabel(iso)
  if (iso === todayIso) return `Hari Ini — ${formatDayLabel(iso)}`
  if (iso === shiftISODate(todayIso, -1)) return `Kemarin — ${formatDayLabel(iso)}`
  return formatDayLabel(iso)
}

/** net satu hari: pemasukan dikurangi pengeluaran + setoran tabungan */
export function dayNet(txs: HistoryTransaction[]): number {
  return txs.reduce((sum, tx) => {
    if (tx.type === 'income') return sum + tx.amount
    if (tx.type === 'transfer') return sum
    return sum - tx.amount
  }, 0)
}

/** kelompokkan per tanggal, urut dari hari terbaru; tiap hari urut jam terbaru */
export function groupTransactionsByDate(
  txs: HistoryTransaction[],
  todayIso: string,
): HistoryDayGroup[] {
  const map = new Map<string, HistoryTransaction[]>()
  for (const tx of txs) {
    const bucket = map.get(tx.date)
    if (bucket) bucket.push(tx)
    else map.set(tx.date, [tx])
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, items]) => ({
      date,
      label: resolveDayLabel(date, todayIso),
      net: dayNet(items),
      moved: items.reduce((sum, tx) => (isMoneyMovement(tx) ? sum + tx.amount : sum), 0),
      items: [...items].sort((a, b) => (a.time < b.time ? 1 : -1)),
    }))
}

export interface HistorySummary {
  count: number
  income: number
  expense: number
  net: number
}

/** ringkasan baris yang sedang tampil (dipakai di kepala daftar) */
export function summarizeTransactions(txs: HistoryTransaction[]): HistorySummary {
  let income = 0
  let expense = 0
  for (const tx of txs) {
    if (tx.type === 'income') income += tx.amount
    else if (tx.type !== 'transfer') expense += tx.amount
  }
  return { count: txs.length, income, expense, net: income - expense }
}

export interface CategorySlice {
  category: string
  total: number
  pct: number
}

/** kategori pengeluaran terbesar (persen terhadap total pengeluaran) */
export function topExpenseCategory(txs: HistoryTransaction[]): CategorySlice | null {
  const totals = new Map<string, number>()
  let grand = 0
  for (const tx of txs) {
    if (tx.type === 'transfer' || tx.type === 'income') continue
    totals.set(tx.category, (totals.get(tx.category) ?? 0) + tx.amount)
    grand += tx.amount
  }
  if (!grand) return null
  const [entry] = [...totals.entries()].sort((a, b) => b[1] - a[1])
  return { category: entry[0], total: entry[1], pct: Math.round((entry[1] / grand) * 100) }
}

/** nominal rupiah dengan privasi: `Rp 25.000` atau `Rp •••••••` */
export function maskMoney(value: number, masked: boolean): string {
  return masked ? MASKED_AMOUNT : formatIDR(value)
}

/** label net (pill total harian & ringkasan): `- Rp 85.000` — ikut privasi */
export function netLabel(net: number, masked: boolean): string {
  if (masked) return MASKED_AMOUNT
  if (net === 0) return formatIDR(0)
  return `${net < 0 ? '-' : '+'} ${formatIDR(Math.abs(net))}`
}

/* ── HEATMAP 30 HARI ("Kapan Kamu Sering Boros?") ────────────────────────── */

export interface HeatmapDay {
  date: string
  total: number
  /** 0 = tanpa pengeluaran … 3 = paling boros (4 tingkat warna) */
  level: 0 | 1 | 2 | 3
}

/** PRNG deterministik (mulberry32) — nilai sama di server & client */
export function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Data mock pengeluaran harian `days` hari terakhir (termasuk hari ini).
 * Akhir pekan dibuat lebih boros dan ada beberapa hari tanpa pengeluaran, jadi
 * pola "kapan sering boros" terlihat hidup — bukan deret angka rata.
 */
export function buildSpendingHeatmap(days = 30, todayIso = localISODate()): HeatmapDay[] {
  const [y, m, d] = todayIso.split('-').map(Number)
  const rand = mulberry32(20260925)
  const raw: { date: string; total: number }[] = []

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(y, (m ?? 1) - 1, d ?? 1)
    date.setDate(date.getDate() - i)
    const weekend = date.getDay() === 0 || date.getDay() === 6
    const roll = rand()
    let total = 0
    if (roll > 0.12) {
      const base = 18000 + Math.round(rand() * 92000)
      total = weekend ? Math.round(base * 1.85) : base
      if (roll > 0.93) total += 180000 + Math.round(rand() * 260000)
    }
    raw.push({ date: localISODate(date), total: Math.round(total / 1000) * 1000 })
  }

  const peak = Math.max(...raw.map((r) => r.total), 1)
  return raw.map((r) => {
    const ratio = r.total / peak
    const level: HeatmapDay['level'] = r.total === 0 ? 0 : ratio < 0.3 ? 1 : ratio < 0.62 ? 2 : 3
    return { ...r, level }
  })
}

/* ── MATRIKS KALENDER HEATMAP (7 kolom × 4–5 baris) ────────────────────────
   Audit data-viz: deret 30 kotak SATU BARIS tidak punya sumbu X & Y, jadi user
   tidak bisa melihat pola "akhir pekan vs hari kerja". Di sini hari disusun
   jadi matriks kalender dengan 7 kolom (Senin–Minggu) supaya pola mingguan
   langsung terbaca, ala contribution graph GitHub. */

/** kepala kolom matriks — Senin lebih dulu supaya "grup akhir pekan" (Sab+Min)
 *  selalu berdampingan di dua kolom terakhir */
export const HEATMAP_WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] as const

/** `2026-09-25` → 0 = Senin … 6 = Minggu (fix: JS `getDay()` memulai dari Minggu) */
export function isoWeekdayIndex(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  const jsDay = new Date(y, (m ?? 1) - 1, d ?? 1).getDay() // 0 = Minggu
  return (jsDay + 6) % 7
}

/**
 * Susun daftar hari jadi matriks `weeks[baris][kolom]`.
 * Sel `null` = padding sebelum hari pertama & sesudah hari terakhir, supaya
 * tiap baris selalu tepat 7 hari dan tanggal sejajar dengan nama harinya.
 */
export function buildHeatmapMatrix(days: HeatmapDay[]): (HeatmapDay | null)[][] {
  if (days.length === 0) return []
  const lead = isoWeekdayIndex(days[0].date)
  const cells: (HeatmapDay | null)[] = [...Array<HeatmapDay | null>(lead).fill(null), ...days]
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (HeatmapDay | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}


/* ── JENDELA UNDO HAPUS ──────────────────────────────────────────────────────
   PRD 2251: hapus transaksi WAJIB punya jaring pengaman "5 detik undo window".
   Angkanya tinggal di lapis data supaya toast, dialog konfirmasi, dan timer
   halaman tidak pernah menyebut durasi yang berbeda. */
export const UNDO_WINDOW_MS = 5000

/* ── COPY AKSI BARIS TRANSAKSI (Riwayat & Insight + Dompet Detail) ────────────
   Sheet aksi (ikon titik tiga) dan dialog konfirmasi hapus lahir di halaman
   Riwayat, lalu dipakai juga oleh halaman Dompet Detail. Copy-nya tinggal di
   lapis data supaya tidak ada kalimat yang ditulis ulang di JSX (kontrak repo)
   dan supaya dua halaman yang menampilkan baris yang sama tidak pernah
   memberi kalimat berbeda untuk aksi yang sama. */

export const TRANSACTION_ACTIONS_COPY = {
  /** judul & keterangan saat tidak ada baris yang dipilih */
  sheetTitleFallback: 'Aksi transaksi',
  sheetHintFallback: 'Pilih tindakan untuk catatan ini',
  detail: 'Lihat detail',
  edit: 'Edit transaksi',
  delete: 'Hapus catatan',
} as const

export const CONFIRM_DELETE_COPY = {
  /** overlay = tombol "batal" tak terlihat di belakang dialog */
  overlay: 'Batal hapus',
  /** netral — tidak ada "kok mau kamu hapus?", cuma pertanyaan biasa */
  title: 'Hapus catatan ini?',
  /** dipotong dua supaya nominalnya bisa ditebalkan di tengah kalimat */
  bodyLead: (name: string) => `\u201C${name}\u201D sebesar `,
  bodyTail: 'bakal keluar dari riwayat.',
  /** pengaman psikologis: user tahu ADA jalan balik sebelum menekan Hapus.
   *  Ini juga yang bikin bodyTail tidak lagi bilang "nggak bisa dibatalin" —
   *  kalimat itu sudah tidak benar sejak Undo ada. */
  safety: `Tenang — masih bisa kamu balikin lewat tombol Undo selama ${
    UNDO_WINDOW_MS / 1000
  } detik.`,
  cancel: 'Batal',
  confirm: 'Hapus',
} as const

export const DELETE_TRANSACTION_TOAST = {
  title: 'Catatan dihapus',
  description: 'Transaksi sudah keluar dari riwayat.',
  /** label aksi di toast (Sonner) — jaring pengaman 5 detik (PRD 2251) */
  undo: 'Undo',
  undoneTitle: 'Catatan dikembalikan 🌿',
  undoneDescription: 'Catatan itu balik ke tempatnya semula.',
  /** jaring pengaman tetap jujur kalau tombol Undo ditekan setelah jendelanya tutup */
  expired: 'Jendela Undo-nya sudah lewat — catatannya bisa dicatat ulang kapan aja 🌿',
} as const

/* ── COPY INPUT & EDIT TRANSAKSI (engine + sheet edit) ─────────────────────── */

/** label tombol simpan engine — beda satu kata untuk mode edit */
export const TRANSACTION_INPUT_COPY = {
  submit: 'Catat',
  submitEdit: 'Simpan',
} as const

/* ── OPSI FIELD DI MODE EDIT ─────────────────────────────────────────────────
   Isinya LABEL yang benar-benar tampil & tersimpan di transaksi ("Makanan",
   "GoPay") — BUKAN id filter (`makanan`, `gopay`). Dua daftar terpisah itu
   disengaja: filter mengelompokkan, edit harus menulis nilai aslinya. */
export const TRANSACTION_CATEGORY_OPTIONS = [
  'Makanan',
  'Transportasi',
  'Belanja',
  'Tagihan',
  'Hiburan',
  'Kesehatan',
  'Pendidikan',
  'Gaji Utama',
  'Dana Darurat',
  'Transfer',
  'Tabungan',
  'Lainnya',
] as const

export const TRANSACTION_WALLET_OPTIONS = ['BCA', 'GoPay', 'OVO', 'Tunai'] as const

/* ── COPY EDIT TRANSAKSI (paket 03) ──────────────────────────────────────────
   Edit adalah jalur UTAMA perbaikan data (kasus paling umum: Minca salah nebak
   kategori), jadi kalimatnya netral & menenangkan — tidak ada "kok salah
   input?". Sheet-nya sudah terisi (pre-filled); copy-nya cukup menegaskan itu. */
export const EDIT_TRANSACTION_COPY = {
  title: (name: string) => `Edit ${name}`,
  description: 'Ubah yang keliru aja — sisanya tetap seperti semula.',
  /** label tiga field detail yang HANYA muncul di mode edit */
  categoryLabel: 'Kategori',
  walletLabel: 'Dompet',
  dateLabel: 'Tanggal',
  /** hasil edit langsung terasa di layar lain — sebut supaya tidak "sunyi" */
  hint: 'Perubahan langsung tampil di riwayat, total harian, dan dompetnya.',
} as const

export const UPDATE_TRANSACTION_TOAST = {
  title: 'Catatan diperbarui 🌿',
  description: 'Versi barunya sudah dipakai di riwayat & total harian.',
} as const

