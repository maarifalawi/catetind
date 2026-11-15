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

/* ── SUMBER DATA RECAP: TRANSAKSI NYATA BULAN LALU ───────────────────────────
   Dulu file ini memuat 12 transaksi contoh Agustus 2026 + target Rp 3.000.000,
   dan modal menampilkannya untuk SETIAP akun — pemilik produk melaporkannya
   sebagai "ngga ada gua ngisi pemasukan 7,5 jt" (temuan seed data).

   Sekarang recap DITURUNKAN dari catatan milik user sendiri: hook
   `useMonthlyReview()` menyaring `recordedTransactions()` ke bulan sebelumnya,
   lalu memanggil `buildMonthlyRecap()`. Tidak ada lagi nominal karangan: kalau
   user belum punya catatan bulan lalu, panel menampilkan kartu sabar.
   ────────────────────────────────────────────────────────────────────────── */

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

/* ── PENANDA DEMO ────────────────────────────────────────────────────────────
   `DEMO_DAY_OVERRIDE` mematok tanggal ke-2 supaya jendela trigger 1–3 tetap
   bisa ditinjau padahal tanggal sistem sudah lewat. `null` = perilaku
   produksi (tanggal sistem apa adanya); logic trigger-nya tidak berubah. */
/* Saklar tanggal ikut `NEXT_PUBLIC_DEMO` (paket 42): di produksi jendela
   trigger recap dibaca dari tanggal sistem apa adanya. Sebelumnya angka 2
   dipatok keras, jadi recap bisa muncul di luar jendela 1–3 di rilis nyata. */
export const DEMO_DAY_OVERRIDE: number | null = DEMO_MODE ? 2 : null

/* ── BENTUK DATA RECAP ─────────────────────────────────────────────────────── */

/** tahap papan puzzle versi data (1..4 sama dengan `PlantStage` di plant-illustration).
 *  Sengaja didefinisikan ulang di lapis data: `lib/` tidak boleh mengimpor
 *  `components/` supaya tetap bebas React. */
export type RecapPuzzleStage = 1 | 2 | 3 | 4

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
  puzzleStage: RecapPuzzleStage
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
  /** false = user belum pernah menyimpan target untuk bulan itu → kartu status
   *  target disembunyikan, bukan menampilkan "0% dari Rp 0" */
  targetKnown: boolean
}

/**
 * Ubah daftar transaksi bulan lalu + target bulan itu → bentuk yang dipakai UI.
 *
 * `monthKey` WAJIB diisi di jalur produksi (`YYYY-MM`): label bulannya datang
 * dari bulan yang sedang direkap, bukan dari tanggal transaksi terbaru — kalau
 * user hanya punya 2 catatan tanggal 3, labelnya tetap "Oktober 2026" dan
 * panel sabar tetap menyebut bulan yang benar. Parameter ketiga opsional supaya
 * pemanggil lama tetap jalan.
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
  monthKey?: string,
): MonthlyRecap {
  const sumOf = (type: HistoryTransaction['type']) =>
    txs.filter((tx) => tx.type === type).reduce((sum, tx) => sum + tx.amount, 0)

  const totalIncome = sumOf('income')
  const totalExpense = sumOf('expense')
  const setAside = sumOf('saving') + sumOf('transfer')
  const savedLastMonth = totalIncome - totalExpense
  const incomeCount = txs.filter((tx) => tx.type === 'income').length
  const weeksCovered = coveredWeeks(txs)
  const activeDays = new Set(txs.map((tx) => tx.date)).size
  /* target 0 = user memang belum pernah menyimpan target untuk bulan itu.
     0 bukan target "harus hemat Rp 0", jadi status ✅/⏳ tidak boleh dikarang. */
  const targetKnown = target > 0

  const enoughData =
    txs.length >= TARGET_TRANSACTION_THRESHOLD &&
    incomeCount >= TARGET_INCOME_THRESHOLD &&
    weeksCovered >= TARGET_MIN_WEEKS

  return {
    monthLabel: monthKey ? monthLabelOfKey(monthKey) : monthLabelOf(txs),
    totalIncome,
    totalExpense,
    savingsRate:
      enoughData && totalIncome > 0
        ? Math.round((savedLastMonth / totalIncome) * 100)
        : null,
    targetAchieved: targetKnown && savedLastMonth >= target,
    targetKnown,
    puzzleStage: recapPuzzleStage(activeDays),
    transactionCount: txs.length,
    incomeCount,
    weeksCovered,
    savedLastMonth,
    setAside,
    target,
  }
}

/**
 * Tahap papan puzzle BULANAN dari jumlah tanggal unik yang ada catatannya.
 *
 * Ambangnya sengaja lebih longgar dari `weeklyPuzzleStage()` (yang memakai
 * porsi 1/3/5 dari 7 hari): satu bulan punya ~30 hari, jadi "rajin" berarti lebih
 * banyak hari aktif. Dipakai panel recap bulan lalu supaya tahap papannya
 * benar-benar berasal dari kebiasaan mencatat user, bukan konstanta `3` seperti
 * sebelumnya.
 */
export function recapPuzzleStage(activeDays: number): RecapPuzzleStage {
  if (activeDays >= 21) return 4 // tahap 4 · puzzle lengkap
  if (activeDays >= 14) return 3 // tahap 3 · hampir lengkap
  if (activeDays >= 7) return 2 // tahap 2 · setengah jalan
  return 1 // tahap 1 · awal tersusun
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

/** `2026-10` → `Oktober 2026` — label dari KUNCI bulan (dipakai recap nyata
 *  supaya bulannya tetap benar walau catatannya kosong/tipis) */
export function monthLabelOfKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
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
 *   menekan "Let's go! 🧩" maupun "Skip, nanti aja" (PRD: "satu kali sampai
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
export interface SavedTargetEntry {
  amount: number
  /** celengan yang mau ditambah bulan itu (null = user tidak memilih celengan) */
  fundId: number | null
}

export interface SavedMonthlyTarget extends SavedTargetEntry {
  /** `YYYY-MM` bulan saat target ini disimpan */
  month: string
  /**
   * Riwayat target per bulan (`YYYY-MM` → nominal). Dipakai panel recap untuk
   * menampilkan target BULAN LALU yang sebenarnya — sebelumnya hanya satu target
   * terakhir yang disimpan, jadi begitu user menyimpan target bulan ini, target
   * bulan lalu hilang dan status ✅/⏳ tidak bisa dihitung lagi.
   */
  history?: Record<string, SavedTargetEntry>
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

/** riwayat target yang disimpan masuk akal (bulan `YYYY-MM`, nominal > 0) */
function readTargetHistory(raw: unknown): Record<string, SavedTargetEntry> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, SavedTargetEntry> = {}
  for (const [month, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}$/.test(month)) continue
    if (!value || typeof value !== 'object') continue
    const entry = value as Partial<SavedTargetEntry>
    if (typeof entry.amount !== 'number' || !Number.isFinite(entry.amount)) continue
    out[month] = {
      amount: clampTarget(entry.amount),
      fundId: typeof entry.fundId === 'number' ? entry.fundId : null,
    }
  }
  return out
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
      history: readTargetHistory(parsed.history),
    }
  } catch {
    return null
  }
}

/**
 * Target yang tersimpan untuk SATU bulan (`YYYY-MM`).
 *
 * Urutannya: riwayat per bulan → target terakhir kalau bulannya cocok. `null`
 * berarti user memang belum pernah menyimpan target untuk bulan itu; pemanggil
 * TIDAK boleh menggantinya dengan angka karangan.
 */
export function readSavedTargetFor(monthKey: string): SavedMonthlyTarget | null {
  const saved = readSavedTarget()
  if (!saved) return null
  const entry = saved.history?.[monthKey]
  if (entry) return { month: monthKey, ...entry }
  if (saved.month === monthKey) {
    return { month: saved.month, amount: saved.amount, fundId: saved.fundId }
  }
  return null
}

export function writeSavedTarget(target: SavedMonthlyTarget): void {
  try {
    const previous = readSavedTarget()
    const history: Record<string, SavedTargetEntry> = { ...(previous?.history ?? {}) }
    /* target TERAKHIR ikut disimpan ke riwayat sebelum ditimpa — kalau belum ada
       riwayat (data lama), target bulan lalu tetap bisa dibaca recap. */
    if (previous) {
      history[previous.month] = { amount: previous.amount, fundId: previous.fundId }
    }
    history[target.month] = {
      amount: clampTarget(target.amount),
      fundId: target.fundId,
    }
    /* simpan 24 bulan terakhir saja — cukup untuk recap & audit, tidak tumbuh
       selamanya di localStorage */
    const limited = Object.fromEntries(
      Object.entries(history)
        .sort(([a], [b]) => (a < b ? 1 : -1))
        .slice(0, 24),
    )
    window.localStorage.setItem(
      TARGET_STORE_KEY,
      JSON.stringify({
        month: target.month,
        amount: clampTarget(target.amount),
        fundId: target.fundId,
        history: limited,
      }),
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
  title: 'Bulan baru, lembaran baru 🧩',
  /** pembaca layar untuk wadah dialog */
  dialogLabel: 'Monthly Review & Target Setup',
  close: 'Tutup rutinitas bulanan',

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
  targetAchieved: (amountLabel: string) => `Tercapai ✅, target ${amountLabel} aman.`,
  targetAchievedCaption: 'Puzzle-mu ikut lengkap karena ini 🧩',
  targetMissed: (amountLabel: string, pct: number) =>
    `Belum sampai ${amountLabel}, tapi kamu udah jalan ${pct}%-nya ⏳`,
  targetMissedCaption: 'Nggak apa-apa, yang penting catatannya jalan terus.',

  /* snapshot papan puzzle (angka level/streak tidak pernah ditampilkan) */
  puzzleTitle: 'Puzzle-mu bulan lalu',
  puzzleCaption: (stageName: string) =>
    `Sampai tahap ${stageName}, tersusun karena kamu rutin nyatet.`,

  /* — kartu sabar (data < ambang, PRD 571–586) — */
  patientTitle: 'Ringkasan belum siap',
  patientBody: 'Catatan bulan lalu masih tipis. Aku rangkum nanti ya.',
  patientProgress: (count: number, threshold: number) =>
    `[${count}/${threshold} transaksi] untuk unlock ringkasan`,
  patientReasonTransactions:
    'Transaksi bulan lalu masih sedikit, jadi angkanya belum bisa mewakili apa-apa.',
  patientReasonIncome:
    'Belum ada pemasukan yang tercatat bulan lalu, jadi persentase hemat belum bisa dihitung.',
  patientReasonWeeks:
    'Catatannya baru sepanjang satu minggu, jadi belum bisa dibilang pola bulanan.',
  patientSkipHint: 'Kamu tetap bisa set target bulan ini kok 🧩',

  /* — panel 2: set target — */
  targetQuestion: 'Mau coba hemat berapa?',
  /** contoh format di field kosong — bukan copy, tapi tetap satu tempat dengan
   *  copy lain supaya tidak ada string user-facing yang tersembunyi di JSX */
  targetPlaceholder: 'Rp 1.000.000',
  targetQuestionHint: 'Ini target yang kamu kejar sendiri, bukan limit belanja.',
  targetHintSavedThisMonth: (amountLabel: string) =>
    `Ini target yang tadi kamu simpan (${amountLabel}), boleh diubah.`,
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
  submit: "Let's go! 🧩",
  skip: 'Skip, nanti aja',
  /** nama aksesibel tombol skip — menegaskan tidak ada konsekuensi buruk */
  skipA11y: 'Tutup tanpa set target. Bisa dibuka lagi kapan aja dari kartu Target di Home',

  /* — konfirmasi setelah tersimpan — */
  savedToastTitle: 'Target bulan ini tersimpan 🧩',
  savedToastBody: (amountLabel: string) =>
    `${amountLabel}, bisa diubah kapan aja dari kartu Target di Home.`,
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
  /* `emptyBody` SENGAJA tidak ada lagi: judul + tombol "Set target" sudah
     menyatakan seluruh aksi kartu dalam keadaan kosong. */
  ctaSet: 'Set target',
  ctaEdit: 'Ubah',
  savingsLabel: (amountLabel: string) => `Hemat ${amountLabel}`,
  fundLabel: (fundName: string, amountLabel: string) => `${fundName} · ${amountLabel}/bulan`,
  fundLink: 'Kelola celengan',
  openLabel: 'Buka Monthly Review & Target Setup',
} as const
