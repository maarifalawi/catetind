import { localISODate } from '../time'
import type { MoneyContext, TransactionType } from '../types'
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

/* ── SKOR KEWARASAN: DIHITUNG, BUKAN DIPATOK (paket 59 · temuan audit #9) ──────
   Sampai paket 58 kartu hero Riwayat membawa `HEALTH_SCORE = 72` dan
   `TOTAL_TRANSACTIONS = 24`: dua konstanta yang tidak berasal dari satu pun
   catatan user. Setelah seluruh data dikosongkan, "skor 72" dan "24 transaksi"
   itu TETAP tampil — klaim paling telanjang yang bisa dibuat app keuangan.

   Yang dipakai sekarang HANYA catatan user:
       rate = (pemasukan − pengeluaran) / pemasukan
   Definisi masuk/keluar-nya sama dengan `summarizeTransactions()` di file ini
   (pindah dana antar dompet tidak dihitung — net worth tidak berubah), jadi
   kartu ini mustahil bercerita beda dengan angka di kepala daftar.

   `null` BUKAN kegagalan; itu jawaban sah untuk dua keadaan:
     1. catatan belum mencapai `HEALTH_SCORE_THRESHOLD` (gerbang PRD 2A.5), atau
     2. belum ada satu pun pemasukan — tanpa pembagi, rasio itu tidak punya arti.
   Di keadaan itu kartu menampilkan kalibrasi/penjelasan (`HEALTH_CARD_COPY`),
   bukan angka karangan. */

/** rasio sisih (persen) yang membuat skor menyentuh 100 — menyisihkan separuh */
export const HEALTH_RATE_FOR_FULL_SCORE = 50

export interface HistoryDataCount {
  /** catatan dari sesi ini (panel input manual / AI Coach) yang belum dihapus */
  session: number
  /** catatan seed/demo yang belum dihapus tombstone */
  seedAlive: number
}

/**
 * Jumlah transaksi NYATA milik user = baris sesi + baris seed yang masih hidup.
 * Dua sumbernya disebut terpisah supaya tidak ada halaman yang lupa salah
 * satunya — dulu angka 24 di sini cuma konstanta yang tidak membaca apa pun.
 */
export function countHistoryTransactions(count: HistoryDataCount): number {
  const safe = (value: number) => (Number.isFinite(value) && value > 0 ? Math.floor(value) : 0)
  return safe(count.session) + safe(count.seedAlive)
}

/** rasio sisih dalam persen; `null` = belum ada pemasukan (tidak ada pembagi) */
export function savingsRatePct(txs: readonly HistoryTransaction[]): number | null {
  const { income, expense } = summarizeTransactions([...txs])
  if (income <= 0) return null
  return Math.round(((income - expense) / income) * 100)
}

/** skor 0–100 dari catatan user; `null` = belum bisa dihitung (lihat di atas) */
export function financialHealthScore(txs: readonly HistoryTransaction[]): number | null {
  if (txs.length < HEALTH_SCORE_THRESHOLD) return null
  const rate = savingsRatePct(txs)
  if (rate === null) return null
  const ratio = rate / HEALTH_RATE_FOR_FULL_SCORE
  return Math.max(0, Math.min(100, Math.round(ratio * 100)))
}
/** empat keadaan kartu hero — SATU definisi supaya kartu & halaman tidak beda */
export type HealthCardState = 'empty' | 'calibrating' | 'no-income' | 'ready'

export function healthCardState(input: {
  /** jumlah transaksi nyata user (`countHistoryTransactions`) */
  totalTransactions: number
  /** hasil `financialHealthScore()`; `null` = belum bisa dihitung */
  score: number | null
}): HealthCardState {
  if (input.totalTransactions <= 0) return 'empty'
  if (input.score !== null) return 'ready'
  return input.totalTransactions >= HEALTH_SCORE_THRESHOLD ? 'no-income' : 'calibrating'
}

/**
 * Band status skor. Labelnya tinggal di sini (bukan di JSX) dan warnanya memakai
 * token palet status Daily HUD — bukan merah (kanon PRD 2B.2).
 */
export const HEALTH_SCORE_BANDS: { min: number; label: string; chip: string }[] = [
  { min: 80, label: 'Sangat Sehat', chip: 'bg-mint text-forest' },
  { min: 60, label: 'Cukup Sehat', chip: 'bg-hud-sage/35 text-forest' },
  { min: 40, label: 'Perlu Perhatian', chip: 'bg-hud-amber/25 text-hud-terracotta' },
  { min: 0, label: 'Hati-hati', chip: 'bg-hud-terracotta/20 text-hud-terracotta' },
]

export function healthScoreBand(score: number): { min: number; label: string; chip: string } {
  return (
    HEALTH_SCORE_BANDS.find((band) => score >= band.min) ??
    HEALTH_SCORE_BANDS[HEALTH_SCORE_BANDS.length - 1]
  )
}

/** copy kartu hero (kalibrasi & skor). Angka & persen selalu diisi pemanggil. */
export const HEALTH_CARD_COPY = {
  readyTitle: 'Skor Kewarasan Finansial',
  readySubtitle: 'Dihitung dari catatanmu sendiri',
  calibratingTitle: 'Kalibrasi Profil AI',
  calibratingSubtitle: 'AI Coach sedang menyelaraskan polamu',
  /** badge kanan atas kartu */
  badgeAi: 'AI',
  badgeCoach: 'AI Coach',
  learning: 'AI sedang mempelajari polamu...',
  progressLabel: (done: number, goal: number) => `${done}/${goal} transaksi`,
  progressPercent: (pct: number) => `Kalibrasi ${pct}%`,
  remaining: (remaining: number) => `${remaining} transaksi lagi buat kalibrasi profilmu`,
  progressA11y: (done: number, goal: number) =>
    `Kalibrasi profil AI: ${done} dari ${goal} transaksi terkumpul`,
  /** cukup catatan TAPI belum ada pemasukan — jelaskan kenapa skornya belum ada */
  noIncomeTitle: 'Skor belum bisa dihitung',
  noIncomeBody:
    'Belum ada satu pun pemasukan di catatanmu, jadi rasio pemasukan vs pengeluaran belum punya pembagi. Catat pemasukan pertamamu, skornya langsung muncul di sini.',
  /** CTA di kartu "belum ada pemasukan" — satu-satunya hal yang membuka skornya */
  noIncomeCta: 'Catat pemasukan',
  /** label di bawah angka skor */
  outOf: 'dari 100',
  /** kalimat hasil: angkanya dari data user, bukan contoh */
  verdict: (rate: number) =>
    rate >= 0
      ? `Kamu menyisihkan ${rate}% dari seluruh pemasukan yang kamu catat. Sisanya kepakai buat hidup — selama di atas nol, kamu masih jalan ke depan 💪`
      : `Pengeluaranmu ${Math.abs(rate)}% lebih besar dari pemasukan yang kamu catat. Nggak perlu panik — pelan-pelan cek kategori paling gemuk di daftar.`,
  /** satu kalimat yang menjelaskan APA yang diukur skor ini (anti metrik misterius) */
  measured: (rate: number) =>
    `Skor ini cuma satu angka: rasio pemasukan vs pengeluaran dari catatanmu (kamu menyisihkan ${rate}%).`,
} as const

/** copy blok pengganti saat BELUM ADA satu catatan pun (kartu hero & insight) */
export const HISTORY_NO_DATA_COPY = {
  title: 'Belum ada satu catatan pun di sini',
  body: 'Skor kewarasan, insight AI, dan pola pengeluaran baru bisa dihitung setelah ada catatan pertama. Skor contoh tidak kami tampilkan — angka di halaman ini selalu dari catatanmu.',
  cta: 'Catat Sekarang',
} as const

/**
 * Jangkar tanggal DATA SEED Riwayat — DIPATOK sebagai konstanta (bukan
 * `new Date()`), seperti seluruh tanggal mock lain di repo. Dua hal memakainya:
 *
 *   1. empat catatan paling baru di `HISTORY_TRANSACTIONS` (data demo), dan
 *   2. jangkar DEFAULT halaman /budget (`lib/data/budget.ts` → `TODAY_ISO`) saat
 *      modul itu dipakai di server/test.
 *
 * Sejak paket 57 konstanta ini BUKAN lagi "hari ini" milik user: seluruh jangkar
 * UI ("hari ini", "kemarin", strip 7 hari, jendela periode) datang dari
 * `todayISO()`/`useTodayISO()` di `lib/time.ts` — satu definisi, dan layar
 * mengisinya setelah mount supaya render server & client tetap identik. Data
 * seed-nya sendiri sengaja TIDAK digeser (demo harus stabil dan bebas hydration
 * mismatch).
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

/**
 * Tanggal lokal (bukan UTC) dalam format `YYYY-MM-DD`.
 *
 * PAKET 57: definisinya PINDAH ke `lib/time.ts` (satu "hari ini" untuk seluruh
 * app) dan di sini hanya diteruskan apa adanya — puluhan modul & komponen sudah
 * mengimpor `localISODate` dari file ini, dan memutus nama lama itu berarti
 * memaksa setiap pemanggil ikut berubah tanpa satu pun perubahan perilaku.
 */
export { localISODate } from '../time'

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
export function filterHistoryTransactions<T extends HistoryTransaction>(
  txs: T[],
  filters: HistoryFilters,
  query: string,
  todayIso: string,
): T[] {
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

export interface HistoryDayGroup<T extends HistoryTransaction = HistoryTransaction> {
  date: string
  /** `Hari Ini — 25 Sep 2026` / `Kemarin — 24 Sep 2026` / `23 Sep 2026` */
  label: string
  /** income − (expense + saving); transfer tidak dihitung (uang pindah dompet) */
  net: number
  /** total uang yang cuma DIPINDAH (setoran tabungan + transfer) — net worth tetap,
   *  jadi pill harian perlu menjelaskan angkanya secara terpisah */
  moved: number
  /**
   * Baris grup. Generik (paket 47) supaya pemanggil yang memakai bentuk
   * turunan — mis. `ContextTransaction` dari `lib/money/context-filter.ts`
   * (baris + penanda konteks) — tidak kehilangan field tambahannya saat
   * dikelompokkan. Default-nya tetap `HistoryTransaction`, jadi pemanggil lama
   * tidak berubah.
   */
  items: T[]
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
export function groupTransactionsByDate<T extends HistoryTransaction>(
  txs: T[],
  todayIso: string,
): HistoryDayGroup<T>[] {
  const map = new Map<string, T[]>()
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

/* ── INSIGHT AI DARI CATATAN USER (paket 59 · temuan audit #7) ────────────────
   Tiga kartu insight dulu membawa angka KERAS di dalam kalimatnya ("naik 40%",
   "22% dari pemasukan", "Makanan (45% …)") sementara komentarnya sendiri mengakui
   "menyusul dari backend". Itu tepat jenis klaim yang dilarang PRD 2A.5
   ("jangan pernah kasih false insight"): user membaca angka finansial yang tidak
   berasal dari catatannya.

   Sekarang setiap kartu LAHIR dari hitungan atas catatan user. Kalau angkanya
   belum bisa dihitung — data terlalu tipis, atau belum ada pembanding minggu
   sebelumnya — kartunya TIDAK muncul sama sekali (bukan muncul dengan angka
   contoh). Ambangnya tetap seperti semula (5 / 10 / 7 transaksi), tapi kini
   dihitung dari catatan NYATA lewat `countHistoryTransactions` di halaman. */

export const INSIGHT_MIN_SPIKE_TX = 5
export const INSIGHT_MIN_SAVINGS_TX = 10
export const INSIGHT_MIN_CATEGORY_TX = 7

/**
 * Tujuan aksi tiap insight. Href-nya tinggal di sini supaya komponen kartu tidak
 * menulis rute apa pun; keduanya halaman yang MEMILIKI data yang dirujuk —
 * `/budget` (limit & celengan) dan `/wealth` (aset).
 */
export const HISTORY_INSIGHT_HREF = {
  budget: '/budget',
  wealth: '/wealth',
} as const

export interface HistoryInsight {
  id: 'spending-spike' | 'savings-rate' | 'category-trend'
  eyebrow: string
  copy: string
  tone: 'alert' | 'good' | 'neutral'
  /** aksi keluar — SELALU ada: insight tanpa jalan keluar = dead-end (PRD 2A.5) */
  actions: { label: string; href: string }[]
}

export interface SpendingSpike {
  category: string
  /** persen kenaikan dibanding jendela 7 hari sebelumnya */
  pct: number
}

/** pengeluaran per kategori dalam rentang tanggal inklusif (pindah dana dikecualikan) */
function expenseByCategory(
  txs: readonly HistoryTransaction[],
  from: string,
  to: string,
): Map<string, number> {
  const totals = new Map<string, number>()
  for (const tx of txs) {
    if (tx.type === 'transfer' || tx.type === 'income') continue
    if (tx.date < from || tx.date > to) continue
    totals.set(tx.category, (totals.get(tx.category) ?? 0) + tx.amount)
  }
  return totals
}

/**
 * Kategori yang pengeluarannya paling naik pada 7 hari terakhir dibanding 7 hari
 * sebelumnya. `null` = tidak ada yang naik, atau jendela sebelumnya belum punya
 * data — tanpa pembanding tidak ada persen yang jujur untuk diucapkan.
 */
export function spendingSpike7d(
  txs: readonly HistoryTransaction[],
  todayIso: string,
): SpendingSpike | null {
  if (!todayIso) return null
  const thisWeek = expenseByCategory(txs, shiftISODate(todayIso, -6), todayIso)
  const lastWeek = expenseByCategory(txs, shiftISODate(todayIso, -13), shiftISODate(todayIso, -7))

  let best: SpendingSpike | null = null
  for (const [category, total] of thisWeek) {
    const before = lastWeek.get(category) ?? 0
    if (before <= 0 || total <= before) continue
    const pct = Math.round(((total - before) / before) * 100)
    if (!best || pct > best.pct) best = { category, pct }
  }
  return best
}

/** catatan bulan `todayIso` (dipakai dua insight yang bicara "bulan ini") */
function monthTransactions(
  txs: readonly HistoryTransaction[],
  todayIso: string,
): HistoryTransaction[] {
  if (!todayIso) return []
  const month = todayIso.slice(0, 7)
  return txs.filter((tx) => tx.date.slice(0, 7) === month)
}

/**
 * Deret insight untuk halaman Riwayat. `txs` yang dikirim halaman adalah catatan
 * KONTEKS AKTIF (paket 47) tanpa tombstone, jadi tiap kalimat di kartu ini selalu
 * soal konteks yang sedang dibaca — bukan soal seluruh data di belakang layar.
 */
export function buildHistoryInsights(
  txs: readonly HistoryTransaction[],
  todayIso: string,
): HistoryInsight[] {
  const insights: HistoryInsight[] = []
  const month = monthTransactions(txs, todayIso)

  /* 1. SPENDING SPIKE — butuh dua jendela seminggu (ambang 5 catatan) */
  if (txs.length >= INSIGHT_MIN_SPIKE_TX) {
    const spike = spendingSpike7d(txs, todayIso)
    if (spike) {
      insights.push({
        id: 'spending-spike',
        eyebrow: 'Spending Spike',
        copy: `Pengeluaran ${spike.category} naik ${spike.pct}% dibanding 7 hari sebelumnya ☕`,
        tone: 'alert',
        actions: [{ label: 'Atur limit bulanan', href: HISTORY_INSIGHT_HREF.budget }],
      })
    }
  }

  /* 2. SAVINGS RATE — 10 catatan bulan ini + minimal satu pemasukan. Angkanya
     rasio nyata; kalau pengeluaran lebih besar, kalimatnya berbalik jadi
     peringatan — bukan pujian yang tidak berdasar. */
  if (month.length >= INSIGHT_MIN_SAVINGS_TX) {
    const rate = savingsRatePct(month)
    if (rate !== null) {
      insights.push({
        id: 'savings-rate',
        eyebrow: 'Savings Rate',
        copy:
          rate >= 0
            ? `Kamu berhasil sisihkan ${rate}% dari pemasukan bulan ini! 🌿`
            : `Pengeluaran bulan ini ${Math.abs(rate)}% lebih besar dari pemasukanmu — belum ada yang tersisih.`,
        tone: rate >= 0 ? 'good' : 'alert',
        actions: [
          { label: 'Alokasikan ke Sinking Fund', href: HISTORY_INSIGHT_HREF.budget },
          { label: 'Simpan di Reksadana', href: HISTORY_INSIGHT_HREF.wealth },
        ],
      })
    }
  }

  /* 3. CATEGORY TREND — kategori pengeluaran terbesar bulan ini + pangsa nyata */
  if (month.length >= INSIGHT_MIN_CATEGORY_TX) {
    const top = topExpenseCategory(month)
    if (top) {
      insights.push({
        id: 'category-trend',
        eyebrow: 'Category Trend',
        copy: `Kategori terbesar bulan ini: ${top.category} (${top.pct}% dari pengeluaranmu).`,
        tone: 'neutral',
        actions: [{ label: 'Atur limit kategori', href: HISTORY_INSIGHT_HREF.budget }],
      })
    }
  }

  return insights
}

/** copy deret insight (judul panel & keadaan "belum ada temuan") */
export const INSIGHT_CARD_COPY = {
  title: 'Insight AI',
  found: (count: number) => `${count} temuan`,
  waiting: 'Menunggu data',
  /** belum ada satu pun insight yang lolos ambang — kalimat nurturing, bukan klaim */
  learning: 'Aku masih belajar polamu. Terus catat ya 📊',
} as const

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
 * Seed heatmap PER KONTEKS UANG (paket 47).
 *
 * Heatmap "Kapan Kamu Sering Boros?" adalah satu-satunya permukaan di Riwayat
 * yang angkanya dibangkitkan (bukan dibaca dari baris ledger), jadi ia tidak
 * bisa mengikuti konteks dengan cara yang sama seperti daftar. Yang dilakukan
 * paket 47: seed-nya DISUNTIKKAN dari konteks aktif, jadi tiap konteks punya
 * polanya sendiri (deterministik, aman SSR) dan labelnya menyebut konteks yang
 * sedang dibaca. Di produksi angkanya datang dari
 * `SELECT occurred_at, SUM(amount) … WHERE context = $1 GROUP BY 1` — kolom
 * `context` memang sudah ada di tabel transaksi.
 */
export const CONTEXT_HEATMAP_SEED: Record<MoneyContext, number> = {
  pribadi: 20260925,
  keluarga: 20260926,
  bersama: 20260927,
}

/**
 * Data mock pengeluaran harian `days` hari terakhir (termasuk hari ini).
 * Akhir pekan dibuat lebih boros dan ada beberapa hari tanpa pengeluaran, jadi
 * pola "kapan sering boros" terlihat hidup — bukan deret angka rata.
 *
 * `seed` opsional (paket 47) — halaman Riwayat mengirim
 * `CONTEXT_HEATMAP_SEED[konteks]` supaya pola tiap konteks berbeda & tetap
 * deterministik (server = client, tidak ada hydration mismatch).
 */
export function buildSpendingHeatmap(
  days = 30,
  todayIso = localISODate(),
  seed: number = CONTEXT_HEATMAP_SEED.pribadi,
): HeatmapDay[] {
  const [y, m, d] = todayIso.split('-').map(Number)
  const rand = mulberry32(seed)
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

/* ── HAPUS SEMUA RIWAYAT (paket 59 · item 59.2) ───────────────────────────────
   Section "Catatan" dulu hanya bisa menghapus satu catatan (swipe / menu titik
   tiga). Membersihkan riwayat berarti mengulanginya puluhan kali — dan itu jadi
   alasan orang menyerah pada catatan lama yang tidak relevan lagi.

   Aturan copy-nya satu dan tidak bisa ditawar: MENGHAPUS CATATAN TIDAK
   MENGEMBALIKAN SALDO. Uang yang sudah keluar tetap keluar (kanon paket 46/49,
   terkunci test di `lib/money/store.test.ts`) — kalau kalimat konfirmasinya
   menyiratkan "saldo kembali", user akan menyesal setelah menekannya. Karena itu
   `balanceNote` ada di dialog SEBELUM tombol Hapus ditekan, bukan cuma di toast
   setelahnya. */
export const HISTORY_CLEAR_ALL_COPY = {
  /** label aksi di kepala section "Catatan" */
  action: 'Hapus semua',
  /** aria-label tombol — menyebut jumlahnya supaya pembaca layar tahu dampaknya */
  actionA11y: (count: number) => `Hapus semua riwayat: ${count} catatan`,
  title: 'Hapus semua riwayat?',
  /** kalimat yang MENYEBUT jumlah catatan yang akan hilang + cakupannya */
  body: (count: number) =>
    `${count} catatan akan keluar dari Riwayat — seluruh catatanmu, termasuk yang ada di konteks uang lain. Ringkasan bulanan, insight AI, dan riwayat di setiap dompet ikut kosong.`,
  /** fakta paling penting, ditebalkan di dialog */
  balanceNote:
    'Saldo dompet TIDAK ikut berubah: uang yang sudah keluar tetap tercatat sebagai sudah keluar.',
  /** jaring pengaman: hak Undo 5 detik yang sama dengan hapus satu catatan */
  safety: (seconds: number) =>
    `Masih bisa dibatalkan lewat tombol Undo selama ${seconds} detik setelah kamu menekannya.`,
  cancel: 'Batal',
  confirm: 'Hapus semua',
} as const

export const HISTORY_CLEAR_ALL_TOAST = {
  title: (count: number) => `${count} catatan dihapus`,
  description: 'Riwayat, laporan, dan insight ikut kosong. Saldo dompet tidak berubah.',
  undo: 'Undo',
  undoneTitle: 'Semua catatan dikembalikan 🌿',
  undoneDescription: 'Catatan yang tadi dihapus balik ke tempatnya semula.',
} as const

/* ── COPY INPUT & EDIT TRANSAKSI (engine + sheet edit) ─────────────────────── */

/** label tombol simpan engine — beda satu kata untuk mode edit */
export const TRANSACTION_INPUT_COPY = {
  submit: 'Catat',
  submitEdit: 'Simpan',

  /* ── NOMINAL (paket 42 · audit Stage 5 #2) ──────────────────────────────────
     Dulu field ini membuang semua non-digit (`"1,5jt"` → Rp 15) dan memotong
     input panjang tanpa pesan. Sekarang: singkatan dihormati, nilai yang tidak
     terbaca DIKATAKAN, dan hasil parsing singkatan dikonfirmasi lewat chip
     sebelum disimpan — copy-nya tinggal di sini supaya engine tidak menyimpan
     satu pun string user-facing (aturan repo). */
  /** petunjuk format — singkatan yang benar-benar dipakai orang, bukan teori */
  amountHint: (maxDigits: number) =>
    `Bisa tulis singkat: 50rb, 2,5jt — atau angka penuh (maks ${maxDigits} digit). Titik ribuan muncul sendiri kok.`,
  /** chip konfirmasi untuk nilai hasil parsing, mis. "Rp 2.500.000?" */
  amountConfirm: (amount: number) => `Rp ${amount.toLocaleString('id-ID')}?`,
  amountConfirmHint: 'Nilai ini yang bakal disimpan.',
  /** pesan per jenis masalah — input tidak valid TIDAK boleh gagal diam-diam */
  amountUnsupported: 'Nominalnya belum kebaca. Coba tulis angka aja — misal 50000 atau 50rb.',
  amountTooBig: (maxDigits: number) =>
    `Nominalnya kelebihan: maksimal ${maxDigits} digit (Rp 9.999.999.999.999).`,
  amountNegative:
    'Nominal minus tidak bisa dicatat. Kalau ini uang yang kembali ke kamu, catat sebagai pemasukan ya.',
  amountFraction:
    'Angkanya masih ambigu. Kalau maksudnya 1,5 juta, tulis "1,5jt"; kalau 1.500, tulis "1500".',
  /** guard saat nominal masih kosong / nol */
  amountNeeded: 'Isi nominalnya dulu ya 🌿',

  /* ── ANTI DOUBLE-TAP (paket 42 · audit Stage 5 #1) ──────────────────────────
     Kunci submit membuat tombolnya benar-benar mati selama satu siklus simpan —
     labelnya ikut berubah supaya user tahu app sedang bekerja, bukan diam. */
  submitting: 'Menyimpan…',

  /* ── KATEGORI DIPILIH USER (paket 54 · uji pemakaian 28 Sep 2026) ────────────
     Dulu form TAMBAH tidak punya kontrol kategori sama sekali: yang tersimpan
     adalah tebakan per tipe (`suggested` → 'Makanan'/'Gaji Utama'/…), padahal
     badge di panel menampilkannya seolah-olah keputusan AI atas catatan user —
     jadi Riwayat penuh kategori yang tidak pernah dipilih siapa pun. Sekarang
     kategori di form tambah HANYA datang dari pilihan user
     (`TRANSACTION_CATEGORY_OPTIONS`), dan formnya tertahan sampai pilihan itu
     ada. Copy di bawah yang menjelaskan kenapa — bukan JSX (aturan repo). */
  /** label pemilih kategori di form TAMBAH (mode edit pakai `EDIT_TRANSACTION_COPY`) */
  categoryLabel: 'Kategori',
  /** opsi kosong di `<select>` — bukan kategori, jadi tidak boleh jadi nilai tersimpan */
  categoryPlaceholder: 'Pilih kategori…',
  /** petunjuk tetap di bawah pemilih kategori */
  categoryHint: 'Kategori ini yang dipakai filter Riwayat & rincian pengeluaranmu.',
  /** petunjuk + toast saat form selebihnya sudah siap, kecuali kategorinya */
  categoryNeeded: 'Pilih kategori dulu ya 🌿 Cuma kategori yang kamu pilih yang disimpan.',
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

/**
 * Kategori TETAP untuk tipe yang kategorinya memang ATURAN (paket 54).
 *
 * Tabungan & Transfer tidak meminta user memilih kategori — dan itu bukan
 * tebakan yang disembunyikan: uangnya pindah, bukan dibelanjakan, jadi labelnya
 * memang begitu. `reason`-nya ditampilkan apa adanya di form TAMBAH supaya user
 * tahu kenapa di tipe itu tidak ada pemilih kategori (larangan "jangan ada
 * kontrol mati / janji tanpa penjelasan").
 */
export const TRANSACTION_FIXED_CATEGORY: Partial<
  Record<TransactionType, { category: string; reason: string }>
> = {
  saving: {
    category: 'Tabungan',
    reason:
      'Setoran selalu tercatat "Tabungan" — bukan tebakan: uangnya pindah ke celengan, bukan dibelanjakan.',
  },
  transfer: {
    category: 'Transfer',
    reason:
      'Pindah dana selalu tercatat "Transfer" — bukan tebakan: uangnya cuma pindah dompet, bukan pengeluaran baru.',
  },
}

/** kategori kanon = satu-satunya nilai yang sah disimpan dari jalur manual */
function isCanonicalCategory(value: string): boolean {
  return (TRANSACTION_CATEGORY_OPTIONS as readonly string[]).includes(value)
}

export interface ManualCategoryChoice {
  /** kategori yang benar-benar dikirim ke store; `null` = form belum siap disimpan */
  category: string | null
  /** user masih harus memilih (form TAMBAH pada tipe yang memang punya pilihan) */
  needsChoice: boolean
}

/**
 * SATU-SATUNYA aturan "kategori apa yang boleh tersimpan dari jalur MANUAL"
 * (paket 54) — fungsi murni, dipakai langsung oleh engine, dikunci
 * `lib/data/history.test.ts`. Empat tipe uang melewatinya semua:
 *
 *   • TAMBAH + tipe ber-kategori-tetap (Tabungan/Transfer) → kategori tetap itu,
 *     tanpa bertanya: nilainya aturan, bukan tebakan;
 *   • TAMBAH lainnya → kategori PILIHAN USER. Belum memilih berarti
 *     `category: null` + `needsChoice: true`: formnya tertahan, dan `'Lainnya'`
 *     tidak pernah dikirim diam-diam sebagai default (kalau user memilih
 *     "Lainnya", itu pilihan sadar);
 *   • nilai di luar `TRANSACTION_CATEGORY_OPTIONS` DITOLAK (`null`) — supaya
 *     tidak ada baris yang mustahil dijaring filter kategori di Riwayat;
 *   • EDIT → koreksi user, atau nilai lama apa adanya: sekadar membuka form edit
 *     tidak pernah mengubah data user diam-diam.
 */
export function manualCategoryChoice(input: {
  /** form sedang mengedit catatan lama (= mode EDIT engine) */
  editing: boolean
  type: TransactionType
  /** kategori yang dipilih user di form ('' = belum memilih) */
  picked: string
  /** kategori catatan lama — dipakai HANYA saat `editing` */
  currentCategory?: string
}): ManualCategoryChoice {
  if (input.editing) {
    return {
      category: input.picked || input.currentCategory || '',
      needsChoice: false,
    }
  }

  const fixed = TRANSACTION_FIXED_CATEGORY[input.type]
  if (fixed) return { category: fixed.category, needsChoice: false }

  if (!isCanonicalCategory(input.picked)) return { category: null, needsChoice: true }
  return { category: input.picked, needsChoice: false }
}

/**
 * Dompet default untuk catatan baru TIDAK LAGI dihitung dari konstanta dompet di
 * sini (paket 40): daftar dompet hidup di store (`lib/money/store.ts`), karena
 * hanya store yang tahu dompet mana yang benar-benar ada — termasuk dompet yang
 * baru ditambahkan user. Fungsinya sekarang `defaultWalletNameFor(ctx)`.
 */
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

/* ── CATATAN BARU DARI PANEL INPUT (paket 33) ────────────────────────────────
   Sebelum paket 33, panel input manual (FAB `+`, modal web, tombol "+ Catat
   Transaksi" di Home, tombol di dompet, CTA Dry Spell) hanya MENUTUP panelnya:
   payload engine dibuang di shell, sementara toast "kecatat" sudah keburu
   berbunyi. Sekarang shell-nya MENULIS lebih dulu lewat
   `recordDraftTransaction()` (`lib/transaction-bus.ts`), dan tiga hal di bawah
   ini yang menentukan isi catatannya — semuanya tinggal di sini supaya tidak ada
   string tersembunyi di komponen.

   Catatan asumsi (dan arah produksinya): kategori & dompet TIDAK ditebak di
   klien. PAKET 54: form TAMBAH meminta USER memilih kategorinya
   (`manualCategoryChoice()` di atas), dan payload submit membawa pilihan itu apa
   adanya — jalur manual tidak punya tebakan lagi. Dompetnya tetap dari konteks
   uang aktif (produksi: `POST /api/transactions` menerima `category` + dompet). */

/** jaring pengaman TERAKHIR kalau pemanggil tidak membawa kategori sama sekali
 *  (bukan default form: form tambah tertahan sampai user memilih — paket 54) */
export const TRANSACTION_FALLBACK_CATEGORY = 'Lainnya'

/**
 * Dompet jaring pengaman untuk PAJANGAN baris yang dompetnya tak dikenal (mis.
 * baris lama ber-`walletId` kosong): namanya ditulis "Tunai" apa adanya, bukan
 * dikosongkan.
 *
 * Sejak paket 59 konstanta ini BUKAN lagi "dompet terakhir" untuk catatan baru:
 * konteks uang yang belum punya dompet tidak boleh menempel ke dompet lain
 * (temuan audit #1) — lihat `defaultWalletNameFor()` di `lib/money/store.ts`.
 */
export const TRANSACTION_FALLBACK_WALLET = 'Tunai'

/** nama catatan kalau user tidak mengisi catatan (netral — bukan nama merchant karangan) */
export const TRANSACTION_DEFAULT_NAME: Record<TransactionType, string> = {
  expense: 'Pengeluaran cepat',
  income: 'Pemasukan cepat',
  saving: 'Setoran tabungan',
  transfer: 'Pindah dana',
}

/**
 * ATURAN DOMPET CATATAN BARU (paket 59 · temuan audit #1) — pengganti catatan
 * lama yang berbunyi "konteks `bersama` jatuh ke Tunai".
 *
 * Dompet catatan baru = dompet PERTAMA di konteks uang aktif yang namanya memang
 * bisa dipilih user (`TRANSACTION_WALLET_OPTIONS`). Kalau konteks itu BELUM punya
 * dompet sendiri, jawabannya `''` — BUKAN "Tunai".
 *
 * Alasannya bisa dibuktikan: dompet `Tunai` itu milik konteks **Keluarga**,
 * sehingga catatan yang dibuat sambil switcher di posisi "Bersama" memotong
 * saldo Tunai — dompet yang tidak dipilih siapa pun dan tidak terlihat di konteks
 * yang sedang dibuka. Konteks tanpa dompet sekarang ditolak dengan pesan jujur +
 * arahan (`TRANSACTION_NO_WALLET_COPY`), lihat `defaultWalletNameFor()` di
 * `lib/money/store.ts` dan pagarnya di `postTransaction()`.
 */

/**
 * Copy penolakan "belum ada dompetnya" — dipakai jalur tulis (`postTransaction`)
 * DAN toast di `hooks/use-transaction-submit.ts`. Satu kalimat untuk satu
 * kebenaran, supaya form kalender, FAB, dan modal web tidak bercerita beda.
 */
export const TRANSACTION_NO_WALLET_COPY = {
  title: 'Catatan ini belum punya dompet',
  body: 'Konteks uangmu sekarang belum punya dompet sendiri, jadi catatannya tidak ditulis — biar tidak ada saldo dompet lain yang terpotong tanpa kamu pilih. Pindah ke konteks yang punya dompet (Pribadi/Keluarga), atau tambah dompetnya dulu di Dompet & Akun.',
  /** label dompet di sheet yang memang tidak punya pemilih dompet (mis. catatan kalender) */
  sourceFallback: 'Belum ada dompet di konteks ini',
} as const

/* ── TOAST SUKSES INPUT TRANSAKSI ────────────────────────────────────────────
   Toast ini dulu ditembak dari DALAM engine — pihak yang tidak tahu apakah
   catatannya benar-benar tersimpan (paket 33). Sekarang copy-nya tinggal di
   sini, dan yang menembakkannya adalah SHELL, setelah `recordDraftTransaction()`
   benar-benar menulis. Dengan begitu "kecatat" mustahil diucapkan untuk catatan
   yang tidak ada.

   `{amount}` diganti nominal terformat; cheer yang tidak memuat placeholder itu
   tetap sah (mis. apresiasi tanpa angka). Pool-nya sengaja beberapa pilihan:
   imbalan yang tidak selalu sama = variable reward (PRD 1819–1823). */
export const TRANSACTION_SUCCESS_CHEER: Record<TransactionType, readonly string[]> = {
  expense: [
    'Sip, {amount} dicatat! 🌿',
    'Mantap, pengeluaran kopi masih aman! 🎉',
    'Beres, {amount} kecatat rapi ✨',
    'Catat 1, aman 1 — {amount} tersimpan 🌱',
  ],
  income: [
    'Asik, {amount} masuk! 🌿',
    'Mantap, pemasukan {amount} nambah! 🎉',
    'Yeay, {amount} udah kecatat ✨',
  ],
  saving: [
    'Sip, nabung {amount} lagi! 🌱',
    'Tabungan nambah {amount} 🎉',
    'Mantap, {amount} disisihkan buat masa depan ✨',
  ],
  transfer: [
    'Oke, {amount} dipindahin! 🌿',
    'Transfer {amount} kecatat 🎉',
    'Sip, {amount} pindah dompet ✨',
  ],
}

/** satu kalimat apresiasi acak untuk catatan yang BARU SAJA tersimpan */
export function successCheerFor(type: TransactionType, amountLabel: string): string {
  const pool = TRANSACTION_SUCCESS_CHEER[type]
  const cheer = pool[Math.floor(Math.random() * pool.length)] ?? pool[0]
  return cheer.replace('{amount}', amountLabel)
}

/* ── PENCARIAN DARI LUAR HALAMAN (paket 29) ─────────────────────────────────
   Kolom "Cari transaksi..." di header Home dulu input MATI (tanpa value &
   onChange) — user bisa mengetik, tapi tidak ada yang terjadi. Pencarian
   sungguhan memang sudah ada di halaman Riwayat, jadi yang dibutuhkan cuma
   jembatan: Home mengirim kata kuncinya lewat URL, `/history` membacanya dan
   mengisi kolom di sana (pola yang sama dengan `?add=` → sheet budget).

   Kenapa lewat URL, bukan state global/localStorage: pencarian itu milik
   halaman Riwayat (satu sumber kebenaran). Kalau kata kuncinya dikirim di luar
   URL, halaman itu tidak akan tahu apa yang harus disaring — dan user melihat
   kolom kosong padahal ia baru saja mengetik. */
export const HISTORY_SEARCH_PARAM = 'q'

/** tautan pencarian riwayat — dipakai kolom cari di header Home */
export function historySearchHref(query: string): string {
  return `/history?${HISTORY_SEARCH_PARAM}=${encodeURIComponent(query.trim())}`
}

