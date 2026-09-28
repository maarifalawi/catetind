import { formatIDR } from '../wallets'
import { DEMO_MODE } from '../demo'
import { INITIAL_SINKING_FUNDS, monthlyNeeded, type SinkingFundItem } from './budget'
import { localISODate, type HistoryTransaction } from './history'

/**
 * lib/data/monthly-review.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Monthly Review & Target Setup (inventaris #i · PRD Domain 3A Habit Loop 3).
 *
 * Ini "ritual" bulanan: tanggal 1–3 user membuka app, melihat recap bulan lalu,
 * lalu memutuskan SATU angka untuk bulan ini. File ini memegang tiga hal
 * sekaligus supaya modalnya tinggal menggambar:
 *
 *   1. ANGKA — recap bulan lalu DITURUNKAN dari daftar transaksi, bukan angka
 *      karangan. Pemasukan, pengeluaran, dan savings rate dihitung di sini, jadi
 *      mustahil bercerita beda dari catatan user sendiri.
 *
 *   2. GERBANG — ambang data minimum PRD 574–582 (`TARGET_TRANSACTION_THRESHOLD`
 *      + 1 pemasukan + 2 minggu). Selama ambang belum lewat, `savingsRate`
 *      bernilai `null` — bukan angka yang kelihatan meyakinkan tapi menyesatkan
 *      (pelanggaran prinsip #2, PRD 572). Modal WAJIB memakai
 *      `canShowRecap()` / `recapReadiness()` lalu menampilkan kartu sabar.
 *
 *   3. COPY — tidak ada satu kalimat pun yang ditulis di JSX.
 *
 * Tidak ada React di sini (aturan CONTEXT §2): komponen hanya merender.
 */

/* ── MOCK: TRANSAKSI BULAN LALU (Agustus 2026) ───────────────────────────────
   Di produksi ini hasil query `transactions` untuk bulan sebelumnya. Bentuknya
   sengaja sama dengan `HistoryTransaction` supaya nanti cuma sumbernya yang
   diganti (tidak ada tabel baru yang perlu diciptakan).

   Isinya diatur supaya MEMENUHI ambang PRD 582 (10 transaksi + 1 pemasukan +
   2 minggu): 12 transaksi, 1 pemasukan, rentang 1–28 Agustus → state "siap"
   bisa ditinjau. Lihat `DEMO_THIN_DATA` di bawah untuk meninjau state sabar. */
export const LAST_MONTH_TRANSACTIONS: HistoryTransaction[] = [
  { id: 1, name: 'Setor Celengan Dana Darurat', amount: 1_500_000, type: 'saving', category: 'Dana Darurat', wallet: 'BCA', date: '2026-08-28', time: '10:15', aiGenerated: false },
  { id: 2, name: 'Gaji Agustus', amount: 7_500_000, type: 'income', category: 'Gaji Utama', wallet: 'BCA', date: '2026-08-25', time: '09:00', aiGenerated: false },
  { id: 3, name: 'Sepatu Lari', amount: 450_000, type: 'expense', category: 'Belanja', wallet: 'BCA', date: '2026-08-22', time: '19:40', aiGenerated: true },
  { id: 4, name: 'Makan Siang Kantor', amount: 620_000, type: 'expense', category: 'Makanan', wallet: 'OVO', date: '2026-08-20', time: '12:30', aiGenerated: true },
  { id: 5, name: 'Kopi & Boba Sebulan', amount: 246_000, type: 'expense', category: 'Makanan', wallet: 'GoPay', date: '2026-08-18', time: '16:20', aiGenerated: true },
  { id: 6, name: 'Nonton Bioskop', amount: 120_000, type: 'expense', category: 'Hiburan', wallet: 'BCA', date: '2026-08-16', time: '20:10', aiGenerated: true },
  { id: 7, name: 'Grab & Gojek Sebulan', amount: 420_000, type: 'expense', category: 'Transportasi', wallet: 'GoPay', date: '2026-08-12', time: '08:05', aiGenerated: true },
  { id: 8, name: 'Kuota & Listrik', amount: 268_000, type: 'expense', category: 'Tagihan', wallet: 'BCA', date: '2026-08-09', time: '21:00', aiGenerated: true },
  { id: 9, name: 'Netflix', amount: 54_000, type: 'expense', category: 'Hiburan', wallet: 'BCA', date: '2026-08-05', time: '20:00', aiGenerated: true },
  { id: 10, name: 'Spotify Premium', amount: 59_900, type: 'expense', category: 'Hiburan', wallet: 'OVO', date: '2026-08-05', time: '20:05', aiGenerated: true },
  { id: 11, name: 'Belanja Bulanan Superindo', amount: 850_000, type: 'expense', category: 'Makanan', wallet: 'Tunai', date: '2026-08-03', time: '17:25', aiGenerated: true },
  { id: 12, name: 'Bayar Kos Agustus', amount: 1_500_000, type: 'expense', category: 'Tagihan', wallet: 'BCA', date: '2026-08-01', time: '09:30', aiGenerated: false },
]

/* ── AMBANG DATA MINIMUM (PRD 574–582 · non-negotiable) ──────────────────────
   Savings rate = 10 transaksi + minimal 1 pemasukan, periode ≥ 2 minggu.
   Dua ambang lain ikut dijaga karena: tanpa pemasukan tidak ada pembagi, dan
   tanpa rentang ≥ 2 minggu "rate"-nya cuma satu hari yang kebetulan besar. */
export const TARGET_TRANSACTION_THRESHOLD = 10
export const TARGET_INCOME_THRESHOLD = 1
export const TARGET_MIN_WEEKS = 2

/* ── ANGKA TARGET ────────────────────────────────────────────────────────────
   Target ini DIPISAH dari budget pengeluaran: isinya "mau coba hemat berapa",
   bukan limit belanja (limit-nya urusan /budget Zona A). Batas bawah & atas ada
   supaya stepper tidak menghasilkan angka yang tidak masuk akal secara tidak
   sengaja; validasi sebenarnya nanti di server. */
export const TARGET_MIN = 100_000
export const TARGET_MAX = 50_000_000
/** besar langkah tombol +/− di panel 2 (satu ketukan = satu langkah) */
export const TARGET_STEP_SMALL = 100_000
export const TARGET_STEP_LARGE = 500_000
/** angka awal untuk user yang belum punya data sama sekali (PRD 1901 contohnya
 *  Rp 500.000) — sengaja kecil supaya terasa bisa dicapai, bukan menakutkan */
export const STARTER_TARGET = 500_000

/* Target yang DIPILIH user bulan lalu (mock). `targetAchieved` dihitung dari
   perbandingan angka ini dengan yang benar-benar disisihkan — jadi status ✅/⏳
   tidak pernah ditulis tangan. Di produksi: kolom `amount` di tabel
   `monthly_targets` untuk bulan sebelumnya. */
export const LAST_MONTH_TARGET = 3_000_000

/** snapshot tanaman bulan lalu (mock habit loop Domain 3B). ANGKA level/streak
 *  tidak pernah ditampilkan — yang tampil cuma tahapnya (kanon: streak tersembunyi). */
export const MONTHLY_PLANT_STAGE: RecapPlantStage = 3

/* ── PENANDA DEMO ────────────────────────────────────────────────────────────
   1. `DEMO_THIN_DATA` memakai subset 6 transaksi pertama supaya state "aku
      masih belajar" (kartu sabar + progress) bisa ditinjau. Cara ini jujur:
      yang dipakai memang data yang lebih tipis, bukan angka yang dipalsukan.
   2. `DEMO_DAY_OVERRIDE` mematok tanggal ke-2 supaya jendela trigger 1–3 tetap
      bisa ditinjau padahal tanggal sistem sudah lewat. `null` = perilaku
      produksi (tanggal sistem apa adanya); logic trigger-nya tidak berubah. */
export const DEMO_THIN_DATA = false
/* Saklar tanggal ikut `NEXT_PUBLIC_DEMO` (paket 42): di produksi jendela
   trigger recap dibaca dari tanggal sistem apa adanya. Sebelumnya angka 2
   dipatok keras, jadi recap bisa muncul di luar jendela 1–3 di rilis nyata. */
export const DEMO_DAY_OVERRIDE: number | null = DEMO_MODE ? 2 : null

/* ── BENTUK DATA RECAP ─────────────────────────────────────────────────────── */

/** tahap tanaman versi data (1..4 sama dengan `PlantStage` di plant-illustration).
 *  Sengaja didefinisikan ulang di lapis data: `lib/` tidak boleh mengimpor
 *  `components/` supaya tetap bebas React. */
export type RecapPlantStage = 1 | 2 | 3 | 4

export interface MonthlyRecap {
  /** `Agustus 2026` — diturunkan dari tanggal transaksi, bukan ditulis tangan */
  monthLabel: string
  totalIncome: number
  /** pengeluaran MURNI (belanja). Setoran celengan & transfer tidak dihitung —
   *  uangnya tidak hilang, cuma pindah tempat (lihat `setAside`) */
  totalExpense: number
  /** `null` = ambang PRD belum terpenuhi → JANGAN tampilkan angka apa pun.
   *  Tipe `null` ini sengaja: komponen tidak bisa "lupa" dan mencetak hasil
   *  pembagian dari data tipis. */
  savingsRate: number | null
  targetAchieved: boolean
  plantStage: RecapPlantStage
  /* — tambahan wajib untuk gerbang ambang & prefill target — */
  /** jumlah transaksi bulan itu (dipakai progress "[7/10 transaksi]") */
  transactionCount: number
  incomeCount: number
  /** rentang hari data, dibulatkan ke bawah ke satuan minggu */
  weeksCovered: number
  /** pemasukan − pengeluaran: uang yang tidak habis dipakai bulan itu */
  savedLastMonth: number
  /** setoran celengan/transfer bulan itu (dipisah supaya tetap terlihat) */
  setAside: number
  /** target bulan itu, dipakai untuk status ✅/⏳ dan prefill panel 2 */
  target: number
}

/** sumber data recap: penuh, atau subset tipis saat `DEMO_THIN_DATA` dinyalakan */
const RECAP_SOURCE = DEMO_THIN_DATA
  ? LAST_MONTH_TRANSACTIONS.slice(0, 6)
  : LAST_MONTH_TRANSACTIONS

/**
 * Ubah daftar transaksi bulan lalu + target bulan itu → bentuk yang dipakai UI.
 *
 * Catatan penting soal `totalExpense`: `summarizeTransactions()` di
 * `lib/data/history.ts` memasukkan setoran tabungan ke kolom pengeluaran (dipakai
 * halaman Riwayat untuk net harian). Di recap BULANAN artinya berbeda: setoran
 * celengan adalah uang yang justru DISISIHKAN, bukan dibelanjakan, jadi dihitung
 * terpisah di `setAside`. Kalau ikut dijumlahkan sebagai pengeluaran, user yang
 * rajin nabung justru terlihat "boros" — salah, dan menyakitkan.
 */
export function buildMonthlyRecap(
  txs: HistoryTransaction[],
  target: number,
): MonthlyRecap {
  const sumOf = (type: HistoryTransaction['type']) =>
    txs.filter((tx) => tx.type === type).reduce((sum, tx) => sum + tx.amount, 0)

  const totalIncome = sumOf('income')
  const totalExpense = sumOf('expense')
  const setAside = sumOf('saving') + sumOf('transfer')
  const savedLastMonth = totalIncome - totalExpense
  const incomeCount = txs.filter((tx) => tx.type === 'income').length
  const weeksCovered = coveredWeeks(txs)

  const enoughData =
    txs.length >= TARGET_TRANSACTION_THRESHOLD &&
    incomeCount >= TARGET_INCOME_THRESHOLD &&
    weeksCovered >= TARGET_MIN_WEEKS

  return {
    monthLabel: monthLabelOf(txs),
    totalIncome,
    totalExpense,
    savingsRate:
      enoughData && totalIncome > 0
        ? Math.round((savedLastMonth / totalIncome) * 100)
        : null,
    targetAchieved: savedLastMonth >= target,
    plantStage: MONTHLY_PLANT_STAGE,
    transactionCount: txs.length,
    incomeCount,
    weeksCovered,
    savedLastMonth,
    setAside,
    target,
  }
}

/* ── BANTUAN TANGGAL (logika murni · tanpa `Date` yang tidak deterministik) ──
   Semua perbandingan bulan memakai string `YYYY-MM` supaya tidak pernah
   bergeser karena timezone — pola yang sama dengan `lib/data/history.ts`. */

/** `2026-08-28` → `2026-08` */
export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7)
}

/** `2026-09` → `2026-08` (dipakai untuk mencari target bulan sebelumnya) */
export function previousMonthKey(key: string): string {
  const [year, month] = key.split('-').map(Number)
  const prev = new Date(Date.UTC(year, month - 2, 1))
  return `${prev.getUTCFullYear()}-${`${prev.getUTCMonth() + 1}`.padStart(2, '0')}`
}

/** `2026-08-28` → `Agustus 2026` (label bulan, bukan tanggal) */
export function monthLabelOf(txs: HistoryTransaction[]): string {
  const newest = txs.reduce((max, tx) => (tx.date > max ? tx.date : max), '')
  const [year, month] = newest.split('-').map(Number)
  if (!year || !month) return ''
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

/** rentang hari data → minggu (dibulatkan ke bawah, minimal 0) */
export function coveredWeeks(txs: HistoryTransaction[]): number {
  if (txs.length === 0) return 0
  const dates = txs.map((tx) => tx.date).sort()
  const first = Date.parse(`${dates[0]}T00:00:00Z`)
  const last = Date.parse(`${dates[dates.length - 1]}T00:00:00Z`)
  if (Number.isNaN(first) || Number.isNaN(last)) return 0
  return Math.floor((last - first) / (7 * 24 * 60 * 60 * 1000))
}

/**
 * "Hari ini" versi app — dipakai trigger 1–3 dan penanda per bulan.
 * `DEMO_DAY_OVERRIDE` cuma mengganti ANGKA tanggalnya (tahun & bulan tetap dari
 * sistem), jadi penanda "sudah dibuka bulan ini" tetap bekerja normal.
 */
export function todayIso(): string {
  const now = new Date()
  const iso = localISODate(now)
  if (DEMO_DAY_OVERRIDE === null) return iso
  return `${iso.slice(0, 8)}${`${DEMO_DAY_OVERRIDE}`.padStart(2, '0')}`
}

/* ── KAPAN MODAL MUNCUL SENDIRI (PRD 1880–1887) ───────────────────────────── */

/**
 * Auto-popup HANYA tanggal 1–3 dan hanya sekali per bulan.
 *
 * @param dismissedFor label bulan yang sudah ditutup user (`undefined` = belum
 *   pernah). Sekali ditutup, bulan itu tidak akan menagih lagi — baik user
 *   menekan "Let's go! 🌿" maupun "Skip, nanti aja" (PRD: "satu kali sampai
 *   di-dismiss"). Jalan buka ulang manual disediakan kartu target di Home.
 */
export function shouldShowMonthlyReview(
  dismissedFor?: string,
  day: string = todayIso(),
): boolean {
  const date = Number(day.slice(8, 10))
  if (!(date >= 1 && date <= 3)) return false
  return dismissedFor !== monthKeyOf(day)
}

/* ── GERBANG AMBANG: SIAP ATAU BELUM ──────────────────────────────────────── */

/** true = recap boleh menampilkan angka. Satu-satunya sumber kebenaran: rate ada */
export function canShowRecap(recap: MonthlyRecap): boolean {
  return recap.savingsRate !== null
}

export interface RecapReadiness {
  ready: boolean
  /** contoh: `[7/10 transaksi] untuk unlock ringkasan` (PRD 586) */
  progressLabel: string
  /** kenapa belum siap — supaya user tahu yang perlu ditambah, bukan ditebak */
  reasonLabel: string | null
}

/**
 * Kesiapan recap + kalimat jujurnya (PRD 571–586).
 * Urutan pemeriksaan sengaja: jumlah transaksi dulu (paling terasa & paling
 * mudah ditambah user), baru pemasukan, baru rentang waktu.
 */
export function recapReadiness(recap: MonthlyRecap): RecapReadiness {
  const ready = canShowRecap(recap)
  const progressLabel = MONTHLY_REVIEW_COPY.patientProgress(
    Math.min(recap.transactionCount, TARGET_TRANSACTION_THRESHOLD),
    TARGET_TRANSACTION_THRESHOLD,
  )

  if (ready) return { ready, progressLabel, reasonLabel: null }

  /* dianotasi `string` — nilai-nilainya literal `as const`, jadi tanpa anotasi
     TS mengunci tipe dari inisialisasi pertama */
  let reasonLabel: string | null = MONTHLY_REVIEW_COPY.patientReasonTransactions
  if (recap.transactionCount >= TARGET_TRANSACTION_THRESHOLD) {
    reasonLabel =
      recap.incomeCount < TARGET_INCOME_THRESHOLD
        ? MONTHLY_REVIEW_COPY.patientReasonIncome
        : MONTHLY_REVIEW_COPY.patientReasonWeeks
  }

  return { ready, progressLabel, reasonLabel }
}


/* ── SET TARGET: SARAN, PRE-FILL, DAN BATASNYA ────────────────────────────── */

/** bulatkan ke kelipatan terdekat (target yang "rapi" lebih enak dilihat) */
function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step
}

export interface TargetSuggestion {
  amount: number
  /** true = angkanya dari hasil nyata bulan lalu, false = angka awal netral */
  fromLastMonth: boolean
}

/**
 * Saran target kalau user belum pernah menyimpan target.
 *
 * Aturannya: kalau bulan lalu datanya layak, sarannya = YANG BENAR-BENAR ia
 * sisihkan (dibulatkan ke 50rb) — bukan persentase karangan. Kalau datanya
 * tipis atau sisihannya nol, jatuh ke `STARTER_TARGET` yang kecil dan jujur
 * sebagai "angka awal".
 */
export function suggestedTarget(recap: MonthlyRecap): TargetSuggestion {
  if (canShowRecap(recap) && recap.savedLastMonth > 0) {
    return {
      amount: clampTarget(roundTo(recap.savedLastMonth, 50_000)),
      fromLastMonth: true,
    }
  }
  return { amount: STARTER_TARGET, fromLastMonth: false }
}

/** target yang tersimpan terakhir (bisa bulan lalu, bisa bulan ini) */
export interface SavedMonthlyTarget {
  /** `YYYY-MM` bulan saat target ini disimpan */
  month: string
  amount: number
  /** celengan yang mau ditambah bulan itu (null = user tidak memilih celengan) */
  fundId: number | null
}

/** asal angka yang muncul di panel 2 — dipakai untuk menjelaskan ke user */
export type PrefillSource = 'saved-this-month' | 'saved-last-month' | 'last-month-actual' | 'starter'

export interface PrefillTarget extends SavedMonthlyTarget {
  source: PrefillSource
}

/**
 * Angka yang sudah terisi saat panel 2 dibuka (PRD 1901: "pre-filled dari bulan
 * lalu (jika ada) atau AI suggestion") — plus alasan asalnya, supaya user tahu
 * angka itu datang dari mana.
 */
export function prefillTarget(
  recap: MonthlyRecap,
  saved: SavedMonthlyTarget | null,
  monthKey: string,
): PrefillTarget {
  if (saved && saved.month === monthKey) {
    return { ...saved, source: 'saved-this-month' }
  }
  if (saved && saved.month === previousMonthKey(monthKey)) {
    return { ...saved, amount: clampTarget(saved.amount), source: 'saved-last-month' }
  }
  const suggestion = suggestedTarget(recap)
  return {
    month: monthKey,
    amount: suggestion.amount,
    fundId: null,
    source: suggestion.fromLastMonth ? 'last-month-actual' : 'starter',
  }
}

/** jepit target ke rentang yang masuk akal (stepper tidak bisa keluar dari sini) */
export function clampTarget(amount: number): number {
  if (!Number.isFinite(amount)) return STARTER_TARGET
  return Math.min(TARGET_MAX, Math.max(TARGET_MIN, Math.round(amount)))
}

/** `-` / `+` satu langkah, langsung dijepit */
export function stepTarget(amount: number, delta: number): number {
  return clampTarget(amount + delta)
}

/** `Rp 500rb` / `Rp 2,9jt` — label mikro untuk chip langkah (bukan nominal user,
 *  jadi tetap terbaca walau mode privasi menyala) */
export function shortIDR(value: number): string {
  if (value >= 1_000_000) return `Rp ${Number((value / 1_000_000).toFixed(1)).toLocaleString('id-ID')}jt`
  if (value >= 1_000) return `Rp ${Number((value / 1_000).toFixed(0)).toLocaleString('id-ID')}rb`
  return formatIDR(value)
}

/* ── QUICK-PICK CELENGAN (inventaris #i panel 2) ──────────────────────────── */

export interface FundSuggestion {
  fund: SinkingFundItem
  /** setoran bulanan yang disarankan — dari `monthlyNeeded()` yang sudah ada,
   *  jadi asumsinya sama dengan yang ditampilkan di halaman /budget */
  monthly: number
  percent: number
}

/**
 * Celengan yang masih punya sisa untuk dikejar + nominal saran per bulan.
 * Celengan yang sudah 100% disaring keluar: menyodorkan "tambah Rp 0/bulan"
 * cuma jadi kebisingan di layar.
 */
export function fundSuggestions(
  funds: SinkingFundItem[] = INITIAL_SINKING_FUNDS,
): FundSuggestion[] {
  return funds
    .map((fund) => ({
      fund,
      monthly: monthlyNeeded(fund.target, fund.current, fund.deadline),
      percent:
        fund.target > 0 ? Math.min(100, Math.round((fund.current / fund.target) * 100)) : 0,
    }))
    .filter((item) => item.monthly > 0)
}

/** nama celengan dari id tersimpan (null = tidak ketemu / user tidak memilih).
 *  `funds` boleh dioper dari store celengan (`lib/money/funds-store.ts`) supaya
 *  celengan yang baru ditanam user ikut dikenali — default seed hanya untuk
 *  pemanggil yang tidak punya akses store (mis. test murni). */
export function fundNameOf(
  fundId: number | null,
  funds: SinkingFundItem[] = INITIAL_SINKING_FUNDS,
): string | null {
  if (fundId === null) return null
  return funds.find((fund) => fund.id === fundId)?.name ?? null
}

/** recap bulan lalu yang dipakai modal (satu sumber, dihitung sekali di modul) */
export const MONTHLY_RECAP: MonthlyRecap = buildMonthlyRecap(
  RECAP_SOURCE,
  LAST_MONTH_TARGET,
)

/* ── PENANDA & TARGET TERSIMPAN (localStorage) ──────────────────────────────
   Dua penanda kecil, keduanya dibaca SETELAH mount (efek) supaya HTML server
   dan client identik — pola yang sama dengan `lib/data/renewal.ts`.

   1. `catet-ind-monthly-review:<YYYY-MM>` → `{ closed: true }`
      "bulan ini sudah dibuka & ditutup" → auto-popup berhenti, dan bulan depan
      kuncinya berubah sendiri sehingga ritualnya jalan lagi tanpa menghapus apa pun.
   2. `catet-ind-monthly-target` → target terakhir yang disimpan user
      Disimpan bersama bulannya, sehingga bisa dibaca ulang untuk (a) ringkasan di
      Home dan (b) pre-fill bulan berikutnya. Di produksi: tabel `monthly_targets`
      (user_id, month, amount, fund_id) — bentuk objek di bawah sudah menyerupainya.

   Catatan arsitektur: sengaja TIDAK ada store/context global baru untuk fitur ini
   (dilarang di prompt). Efeknya cukup di Home lewat hook `use-monthly-review`;
   kalau nanti /budget & /history perlu ikut menampilkan target bulanan, jalur
   termurah adalah memindahkan dua fungsi baca di bawah ke query Supabase yang
   sama — bukan menambah context. */

export interface MonthlyReviewMarker {
  /** true = user sudah menutup modal untuk bulan ini (lewat CTA atau skip) */
  closed: boolean
}

export function monthlyMarkerKey(monthKey: string): string {
  return `catet-ind-monthly-review:${monthKey}`
}

/**
 * Kunci localStorage target bulanan. Diekspor (paket 45) karena migrasi
 * lokal→server (`lib/supabase/local-migration.ts`) harus membaca nilai yang sama
 * dengan yang ditulis di sini — satu konstanta, bukan dua string yang bisa lepas.
 */
export const TARGET_STORE_KEY = 'catet-ind-monthly-target'

/** Aman untuk SSR (mengembalikan "belum ditutup"), jadi komponen boleh
 *  memanggilnya tanpa menduplikasi cek `typeof window`. */
export function readMonthlyReviewMarker(monthKey: string): MonthlyReviewMarker {
  if (typeof window === 'undefined') return { closed: false }
  try {
    const raw = window.localStorage.getItem(monthlyMarkerKey(monthKey))
    if (!raw) return { closed: false }
    return { closed: (JSON.parse(raw) as Partial<MonthlyReviewMarker>).closed === true }
  } catch {
    /* localStorage diblokir (mode privat) atau isinya rusak — anggap belum ditutup */
    return { closed: false }
  }
}

/** Dipanggil dari handler klik (BUKAN saat render) → tidak ada risiko hydration mismatch */
export function writeMonthlyReviewMarker(
  monthKey: string,
  patch: Partial<MonthlyReviewMarker>,
): MonthlyReviewMarker {
  const next: MonthlyReviewMarker = { ...readMonthlyReviewMarker(monthKey), ...patch }
  try {
    window.localStorage.setItem(monthlyMarkerKey(monthKey), JSON.stringify(next))
  } catch {
    /* storage diblokir — modal tetap tertutup untuk sesi ini, cuma tidak "ingat" antar reload */
  }
  return next
}

/** target terakhir yang disimpan user (null = belum pernah / data rusak) */
export function readSavedTarget(): SavedMonthlyTarget | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(TARGET_STORE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SavedMonthlyTarget>
    if (typeof parsed.month !== 'string' || typeof parsed.amount !== 'number') return null
    return {
      month: parsed.month,
      amount: clampTarget(parsed.amount),
      fundId: typeof parsed.fundId === 'number' ? parsed.fundId : null,
    }
  } catch {
    return null
  }
}

export function writeSavedTarget(target: SavedMonthlyTarget): void {
  try {
    window.localStorage.setItem(
      TARGET_STORE_KEY,
      JSON.stringify({ ...target, amount: clampTarget(target.amount) }),
    )
  } catch {
    /* storage diblokir — target tetap terpakai di sesi ini (state hook) */
  }
}

/** satu paket baca untuk hook: penanda bulan ini + target terakhir */
export function readMonthlyReviewState(monthKey: string): {
  closed: boolean
  saved: SavedMonthlyTarget | null
} {
  return {
    closed: readMonthlyReviewMarker(monthKey).closed,
    saved: readSavedTarget(),
  }
}

/* ── COPY (PRD 1880–1918 · 542–586 · 2141–2145 · inventaris #i) ───────────────
   Nol string user-facing di JSX. Nada yang DILARANG di sini: menyalahkan hasil
   bulan lalu ("kamu boros"), over-claiming dari data tipis, dan nagging setelah
   user menekan "Skip, nanti aja". Kalau ragu, baca ulang PRD 542–594: suaranya
   adalah teman yang suportif, bukan auditor. */

export const MONTHLY_REVIEW_COPY = {
  /* — kepala modal — */
  eyebrow: 'Ritual bulanan',
  title: 'Bulan baru, lembaran baru 🌱',
  subtitle: 'Sebentar aja — kita lihat bulan lalu, lalu pilih satu angka buat bulan ini.',
  /** pembaca layar untuk wadah dialog */
  dialogLabel: 'Monthly Review & Target Setup',
  close: 'Tutup rutinitas bulanan',
  /** hint gestur di mobile (panel bisa ditarik turun seperti sheet lain) */
  swipeHint: 'Geser ke bawah untuk menutup',

  /* — tab panel — */
  tabRecap: 'Recap Bulan Lalu',
  tabTarget: 'Set Target Bulan Ini',

  /* — panel 1: recap — */
  recapTitle: (monthLabel: string) => `Recap ${monthLabel}`,
  recapCaption: 'Angka dari catatanmu sendiri, bukan tebakan.',
  metaTransactions: (count: number) => `${count} transaksi tercatat`,
  incomeLabel: 'Pemasukan',
  expenseLabel: 'Pengeluaran',
  savedLabel: 'Kamu sisihkan',
  savingsRateLabel: (rate: number) => `${rate}% dari pemasukan`,
  savingsRateCaption: 'Dihitung dari pemasukan dikurangi pengeluaranmu bulan itu.',
  setAsideNote: (amountLabel: string) => `${amountLabel}-nya langsung masuk celengan.`,

  /* status target bulan lalu — dua-duanya hangat, tidak ada yang menghakimi */
  targetTitle: 'Target bulan lalu',
  targetAchieved: (amountLabel: string) => `Tercapai ✅ — target ${amountLabel} aman.`,
  targetAchievedCaption: 'Tanamanmu ikut berbunga karena ini 🌸',
  targetMissed: (amountLabel: string, pct: number) =>
    `Belum sampai ${amountLabel}, tapi kamu udah jalan ${pct}%-nya ⏳`,
  targetMissedCaption: 'Nggak apa-apa — yang penting catatannya jalan terus.',

  /* snapshot tanaman (angka level/streak tidak pernah ditampilkan) */
  plantTitle: 'Tanamanmu bulan lalu',
  plantCaption: (stageName: string) =>
    `Sampai tahap ${stageName} — tumbuh karena kamu rutin nyatet.`,

  /* — kartu sabar (data < ambang, PRD 571–586) — */
  patientTitle: 'Aku masih belajar pola keuanganmu 📊',
  patientBody:
    'Bulan lalu catatannya masih tipis, jadi aku belum bisa kasih ringkasan angka yang bisa dipercaya. Terus catat ya — nanti ringkasannya beneran berguna.',
  patientProgress: (count: number, threshold: number) =>
    `[${count}/${threshold} transaksi] untuk unlock ringkasan`,
  patientReasonTransactions:
    'Transaksi bulan lalu masih sedikit, jadi angkanya belum bisa mewakili apa-apa.',
  patientReasonIncome:
    'Belum ada pemasukan yang tercatat bulan lalu, jadi persentase hemat belum bisa dihitung.',
  patientReasonWeeks:
    'Catatannya baru sepanjang satu minggu, jadi belum bisa dibilang pola bulanan.',
  patientSkipHint: 'Kamu tetap bisa set target bulan ini kok 🌱',

  /* — panel 2: set target — */
  targetQuestion: 'Mau coba hemat berapa?',
  /** contoh format di field kosong — bukan copy, tapi tetap satu tempat dengan
   *  copy lain supaya tidak ada string user-facing yang tersembunyi di JSX */
  targetPlaceholder: 'Rp 1.000.000',
  targetQuestionHint: 'Ini target yang kamu kejar sendiri — bukan limit belanja.',
  targetHintSavedThisMonth: (amountLabel: string) =>
    `Ini target yang tadi kamu simpan (${amountLabel}) — boleh diubah.`,
  targetHintSaved: (amountLabel: string) =>
    `Terisi dari target bulan lalu (${amountLabel}).`,
  targetHintActual: (amountLabel: string) =>
    `Terisi dari yang berhasil kamu sisihkan bulan lalu (${amountLabel}).`,
  targetHintStarter: 'Angka awal buat mulai. Kecil juga nggak masalah, yang penting jalan.',
  stepDown: 'Kurangi target',
  stepUp: 'Tambah target',
  stepReset: 'Balik ke angka awal',
  limitHint: (minLabel: string, maxLabel: string) =>
    `Target bisa antara ${minLabel} dan ${maxLabel}.`,
  targetA11y: (amountLabel: string) => `Target hemat bulan ini ${amountLabel}`,

  /* quick-pick celengan — nominal saran dibaca dari `monthlyNeeded()` */
  fundTitle: 'Ada celengan yang mau ditambah bulan ini?',
  fundCaption: 'Nominal saran = sisa target celengan dibagi sisa bulan sampai deadline-nya.',
  fundNone: 'Gak usah, fokus target aja',
  fundPerMonth: (amountLabel: string) => `${amountLabel}/bulan`,
  fundProgress: (pct: number) => `${pct}% terkumpul`,
  fundSetorHint:
    'Setornya tetap di halaman Budget & Target, biar progres dan riwayat celengannya ikut kepakai.',

  /* — CTA (zona ibu jari, PRD 2141–2145) — */
  next: 'Lanjut atur target',
  back: 'Lihat recap lagi',
  submit: "Let's go! 🌿",
  skip: 'Skip, nanti aja',
  /** nama aksesibel tombol skip — menegaskan tidak ada konsekuensi buruk */
  skipA11y: 'Tutup tanpa set target. Bisa dibuka lagi kapan aja dari kartu Target di Home',

  /* — konfirmasi setelah tersimpan — */
  savedToastTitle: 'Target bulan ini tersimpan 🌿',
  savedToastBody: (amountLabel: string) =>
    `${amountLabel} — bisa diubah kapan aja dari kartu Target di Home.`,
  savedToastFundBody: (amountLabel: string, fundName: string) =>
    `${amountLabel} · ${fundName}. Setornya di halaman Budget ya.`,
  savedToastAction: 'Setor sekarang',
} as const

/* ── COPY KARTU TARGET DI HOME ──────────────────────────────────────────────
   Kartu kecil ini yang membuat target "berefek", bukan tersimpan sunyi — dan
   sekaligus jalan buka ulang manual kalau modal auto-popup sudah lewat. */

export const MONTHLY_TARGET_CARD_COPY = {
  title: 'Target bulan ini',
  emptyTitle: 'Belum ada target bulan ini',
  emptyBody: 'Set 20 detik aja — nanti gampang dilihat kalau lagi pengin jajan besar 🌱',
  ctaSet: 'Set target 📌',
  ctaEdit: 'Ubah',
  savingsLabel: (amountLabel: string) => `Hemat ${amountLabel}`,
  fundLabel: (fundName: string, amountLabel: string) => `${fundName} · ${amountLabel}/bulan`,
  fundLink: 'Kelola celengan',
  openLabel: 'Buka Monthly Review & Target Setup',
} as const
