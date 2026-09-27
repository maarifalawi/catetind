import { formatIDR } from '../wallets'
import {
  HISTORY_TODAY_ISO,
  HISTORY_TRANSACTIONS,
  MASKED_AMOUNT,
  MONTHS_SHORT,
  formatDayLabel,
  shiftISODate,
  summarizeTransactions,
  topExpenseCategory,
  type CategorySlice,
  type HistoryTransaction,
} from './history'

/** satu pintu impor untuk halaman Budget: semua komponennya cukup ambil dari sini */
export { formatIDR }

/* ── Budget & Target Nabung (/app/budget) ────────────────────────────────────
   Satu sumber data + logika murni (tanpa React) untuk dua zona halaman:

   Zona A — Budget Kategori (batas pengeluaran per kategori)
   Zona B — Celengan Impian (sinking fund dengan metafora tanaman)

   Catatan tanggal: "hari ini" dipatok KONSTAN (TODAY_ISO / CURRENT_DAY), bukan
   `new Date()`. Alasannya dua: (1) HTML hasil render server & render pertama
   client jadi identik — tidak ada hydration mismatch pada teks turunan seperti
   pacing ideal, bulan tersisa, dan "nabung Rp X/bulan"; (2) demo bisa
   dipindah-pindah tanggal dengan mengubah satu baris. Nanti saat data datang
   dari Supabase, ganti dua konstanta ini dengan tanggal server.
   ────────────────────────────────────────────────────────────────────────── */

export type BudgetPeriod = 'weekly' | 'monthly' | 'custom'
/** Konteks keuangan halaman ini — sama dengan Scope di Context Switcher app
 *  (PRD 2C.2: Pribadi / Keluarga / Bersama). `bersama` sengaja ikut
 *  didefinisikan supaya halaman bisa membaca KONTEKS GLOBAL (sidebar) tanpa
 *  cast; item mock hari ini baru punya 'pribadi' & 'keluarga', jadi konteks
 *  'bersama' akan menampilkan empty state — bukan data milik konteks lain. */
export type BudgetScope = 'pribadi' | 'keluarga' | 'bersama'
export type GoalPriority = 'rendah' | 'sedang' | 'tinggi' | 'kritis'
export type PlantStage = 'seed' | 'sprout' | 'plant' | 'flower' | 'bloom'
/** tiga warna kanon status pacing (PRD 2B.2) — resolusi: BUKAN merah */
export type PacingTone = 'sage' | 'amber' | 'terracotta'

export interface BudgetItem {
  id: number
  category: string
  /** emoji kategori (mock icon — nanti dari icon set) */
  icon: string
  limit: number
  spent: number
  period: BudgetPeriod
  scope: BudgetScope
}

export interface SinkingFundItem {
  id: number
  name: string
  target: number
  current: number
  /** tanggal lokal `YYYY-MM-DD` */
  deadline: string
  priority: GoalPriority
  stage: PlantStage
  scope: BudgetScope
  /** false = belum setor bulan ini → memicu nudge (Domain 2C.4) */
  contributedThisMonth: boolean
}

/* ── KONSTANTA WAKTU (MOCK) ──────────────────────────────────────────────────
   CURRENT_DAY 27 = mendekati akhir bulan. Kartu "Sapu Bersih" (3G) butuh
   CURRENT_DAY >= SWEEP_TRIGGER_DAY (28) — ubah CURRENT_DAY jadi 28..30 kalau
   mau melihat kartu sweep.

   Dua konstanta di bawah adalah jangkar BULAN KALENDER. Kartu Home memakainya
   (lewat `DAILY_HUD` + `MONTHLY_WINDOW`), sedangkan halaman Budget memakai
   `periodWindow()` supaya jatah hariannya bisa dihitung untuk minggu / siklus
   gajian juga. Untuk tab Bulanan dua-duanya menghasilkan angka yang sama. */
/* Tanggalnya SATU dengan data transaksi hari ini (`HISTORY_TODAY_ISO` di
   lib/data/history.ts) — supaya "hari ini" di halaman Budget dan di Riwayat
   tidak pernah jatuh di hari yang berbeda. Literal tanggalnya tinggal di sana. */
export const TODAY_ISO = HISTORY_TODAY_ISO
export const CURRENT_DAY = 27
export const DAYS_IN_MONTH = 30
/** 3G: sapu-sapu sisa budget baru muncul di 3 hari terakhir bulan */
export const SWEEP_TRIGGER_DAY = 28

/* ── KONSTANTA UANG (MOCK) ─────────────────────────────────────────────────
   Angka disetel supaya HUD TIDAK berada di state "jatah ditahan", jadi pacing
   mingguan/bulanan bisa didemokan dengan jatah yang benar-benar bisa dibelanjakan:

     available = 7.500.000 − 800.000 (cicilan) − 3.600.000 (celengan) = 3.100.000
     sisa      = 3.100.000 − 2.300.000 (pengeluaran)                =   800.000
     jatah     = 800.000 / 4 hari (27..30 Sep)                      =   200.000
   Turunkan angka `SPENT_THIS_MONTH` (atau naikkan kewajiban celengan) kalau mau
   menguji state "jatah ditahan" (audit UX #2) di kartu Jatah Hari Ini. */
export const MONTHLY_INCOME = 7_500_000
export const TOTAL_INSTALLMENTS = 800_000
export const SPENT_THIS_MONTH = 2_300_000

/** Tanggal jatuh tempo cicilan platform (mock) — dipakai aturan prorata
 *  `periodInstallments()` (prompt 26): window yang memuat salah satu tanggal ini
 *  memotong cicilan PENUH, window lain memotong prorata harian.
 *  Dua tanggalnya diambil dari jadwal hutang mock yang memang ada di repo
 *  (`lib/data/wealth.ts`: Kredivo tgl 10, SPayLater tgl 25) supaya tidak
 *  mengarang tanggal baru — nominalnya sendiri tetap kanon HUD (Rp 800.000). */
export const INSTALLMENT_DUE_DAYS = [10, 25]

/* ── PERIODE BUDGET (Mingguan / Bulanan / Siklus Gajian) ─────────────────────
   Modul 2B dibangun untuk income TIDAK tetap — justru orang seperti itu yang
   berpikir dalam minggu & siklus gajian, bukan bulan kalender. Jadi "jatah
   harian" harus benar untuk TIGA model periode:

     • weekly  → Senin–Minggu yang memuat hari ini
     • monthly → bulan kalender (dipakai juga oleh kartu Home lewat `DAILY_HUD`)
     • custom  → siklus gajian: tanggal `PAYDAY_DATE` sampai sehari sebelum
                 tanggal itu bulan berikutnya (25 → 24)

   Rumus hariannya tetap SATU (`computeDailyHud`); yang berganti cuma panjang
   periode & posisi hari ini di dalamnya (`dayIndex`/`daysInPeriod`). Itu
   sebabnya `CURRENT_DAY`/`DAYS_IN_MONTH` SENGAJA tetap ada: keduanya jangkar
   bulan kalender, dan halaman Budget memakai `periodWindow()` di atasnya. */
export const PAYDAY_DATE = 25

/** tab periode di UI: `payday` = nama tampil untuk `BudgetPeriod` 'custom' */
export type PeriodTab = BudgetPeriod | 'payday'

export const PERIOD_TABS: { id: PeriodTab; label: string }[] = [
  { id: 'weekly', label: 'Mingguan' },
  { id: 'monthly', label: 'Bulanan' },
  { id: 'payday', label: 'Siklus Gajian' },
]

/** 'payday' hanya nama di UI — model datanya tetap `custom` (siklus gajian) */
export function periodFromTab(tab: PeriodTab): BudgetPeriod {
  return tab === 'payday' ? 'custom' : tab
}

export interface PeriodWindow {
  period: BudgetPeriod
  /** hari pertama periode, inklusif (`YYYY-MM-DD`) */
  startISO: string
  /** hari terakhir periode, inklusif */
  endISO: string
  /** hari ke berapa dari periode ini (1 = hari pertama) */
  dayIndex: number
  /** panjang periode dalam hari (selalu ≥ 1) */
  daysInPeriod: number
  /** sisa hari TERMASUK hari ini (selalu ≥ 1 — jaga pembagian nol) */
  daysLeft: number
  /** label untuk chip/judul, mis. `Minggu ini · 21–27 Sep` */
  label: string
  /** rentang ringkas, mis. `21–27 Sep` */
  rangeLabel: string
}

function pad2(value: number): string {
  return `${value}`.padStart(2, '0')
}

/** `2026-09-21` → `21 Sep` (tanpa tahun — dipakai label rentang periode) */
function dayMonth(iso: string): string {
  return formatDayLabel(iso).replace(/\s\d{4}$/, '')
}

/** `21–27 Sep` kalau sebulan, `28 Sep – 4 Okt` kalau lintas bulan/tahun */
function rangeLabelOf(startISO: string, endISO: string): string {
  const [sy, sm, sd] = startISO.split('-').map(Number)
  const [ey, em, ed] = endISO.split('-').map(Number)
  if (sy === ey && sm === em) return `${sd}–${ed} ${MONTHS_SHORT[sm - 1]}`
  if (sy === ey) return `${dayMonth(startISO)} – ${dayMonth(endISO)}`
  return `${dayMonth(startISO)} ${sy} – ${dayMonth(endISO)} ${ey}`
}

/** index hari 0=Minggu..6=Sabtu; pakai UTC supaya tidak geser karena timezone
 *  (pola yang sama dengan `daysBetween` di file ini) */
function weekdayIndex(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/**
 * Jendela tanggal periode aktif + posisi hari ini di dalamnya.
 *
 * Satu pintu untuk tiga model periode. `dayIndex`/`daysInPeriod` inilah yang
 * disuapkan ke `computeDailyHud()` supaya pacing memakai panjang periode milik
 * TAB yang sedang aktif, bukan selalu `DAYS_IN_MONTH`.
 */
export function periodWindow(period: BudgetPeriod, todayIso: string = TODAY_ISO): PeriodWindow {
  const [y, m, d] = todayIso.split('-').map(Number)

  if (period === 'weekly') {
    /* Senin = awal minggu → mundur sebanyak (index + 6) % 7 hari */
    const offset = (weekdayIndex(todayIso) + 6) % 7
    const startISO = shiftISODate(todayIso, -offset)
    const endISO = shiftISODate(startISO, 6)
    const daysInPeriod = 7
    const dayIndex = offset + 1
    const rangeLabel = rangeLabelOf(startISO, endISO)
    return {
      period,
      startISO,
      endISO,
      dayIndex,
      daysInPeriod,
      daysLeft: Math.max(1, daysInPeriod - dayIndex + 1),
      label: `Minggu ini · ${rangeLabel}`,
      rangeLabel,
    }
  }

  if (period === 'custom') {
    /* siklus gajian: mulai tanggal PAYDAY_DATE; kalau hari ini belum lewat
       tanggal itu berarti kita masih di siklus yang mulai bulan lalu */
    const thisMonthsPayday = `${y}-${pad2(m)}-${pad2(PAYDAY_DATE)}`
    const startISO = d >= PAYDAY_DATE ? thisMonthsPayday : addMonths(thisMonthsPayday, -1)
    const endISO = shiftISODate(addMonths(startISO, 1), -1)
    const daysInPeriod = Math.max(1, daysBetween(startISO, endISO) + 1)
    const dayIndex = Math.min(daysInPeriod, Math.max(1, daysBetween(startISO, todayIso) + 1))
    const rangeLabel = rangeLabelOf(startISO, endISO)
    return {
      period,
      startISO,
      endISO,
      dayIndex,
      daysInPeriod,
      daysLeft: Math.max(1, daysInPeriod - dayIndex + 1),
      label: `Siklus ${rangeLabel}`,
      rangeLabel,
    }
  }

  /* monthly — panjang bulan diambil dari kalender (bukan `DAYS_IN_MONTH`)
     supaya benar juga untuk Februari; untuk September nilainya sama: 30. */
  const daysInPeriod = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const startISO = `${y}-${pad2(m)}-01`
  const endISO = `${y}-${pad2(m)}-${pad2(daysInPeriod)}`
  const dayIndex = Math.min(daysInPeriod, Math.max(1, d))
  const rangeLabel = rangeLabelOf(startISO, endISO)
  return {
    period,
    startISO,
    endISO,
    dayIndex,
    daysInPeriod,
    daysLeft: Math.max(1, daysInPeriod - dayIndex + 1),
    label: `Bulan ini · ${rangeLabel}`,
    rangeLabel,
  }
}

/** jendela dari tab UI (memetakan 'payday' → 'custom') */
export function periodWindowForTab(
  tab: PeriodTab,
  todayIso: string = TODAY_ISO,
): PeriodWindow {
  return periodWindow(periodFromTab(tab), todayIso)
}

/** label panjang periode (chip/judul) */
export function periodLabel(period: BudgetPeriod, todayIso: string = TODAY_ISO): string {
  return periodWindow(period, todayIso).label
}

/** jangkar konsistensi Home ⇄ tab Bulanan /budget */

/**
 * Budget yang relevan untuk periode aktif.
 *
 * SATU daftar budget dipakai untuk semua tab (dilarang bikin daftar terpisah):
 * setiap budget punya `period` sendiri — limit mingguan tetap mingguan walau
 * tab sedang di bulanan — jadi tab hanya MENYARING daftar yang sama.
 */
export function budgetsForPeriod(budgets: BudgetItem[], window: PeriodWindow): BudgetItem[] {
  return budgets.filter((budget) => budget.period === window.period)
}

export interface PeriodIncome {
  /** true = ada pemasukan masuk di dalam jendela periode ini */
  hasIncome: boolean
  /** true = pemasukan terakhir masuk SETELAH hari pertama periode → jatah
   *  harian dihitung ulang dari sisa hari & user diberi tahu (PRD 2B.3) */
  midPeriod: boolean
  latestDateISO: string | null
  /** tanggal terakhir yang sudah diformat (`24 Sep`) untuk copy penjelasan */
  latestDateLabel: string | null
  amount: number
}

/**
 * Pemasukan di dalam jendela periode — sumber state Dry Spell (PRD 2B.3) dan
 * catatan "pemasukan masuk di tengah periode".
 *
 * Dibaca dari transaksi nyata (mock `HISTORY_TRANSACTIONS`), bukan flag manual:
 * begitu gajian dicatat, dry spell hilang sendiri. Kartu Home memakai
 * `hasIncomeInWindow(MONTHLY_WINDOW)` untuk pertanyaan yang sama.
 */
export function periodIncome(
  window: PeriodWindow,
  txs: HistoryTransaction[] = HISTORY_TRANSACTIONS,
): PeriodIncome {
  const inWindow = txs
    .filter(
      (tx) => tx.type === 'income' && tx.date >= window.startISO && tx.date <= window.endISO,
    )
    .sort((a, b) => (a.date < b.date ? 1 : -1))
  const latest = inWindow[0] ?? null
  return {
    hasIncome: latest !== null,
    midPeriod: latest !== null && latest.date > window.startISO,
    latestDateISO: latest?.date ?? null,
    latestDateLabel: latest ? dayMonth(latest.date) : null,
    amount: inWindow.reduce((sum, tx) => sum + tx.amount, 0),
  }
}

/** versi ringkas untuk kartu yang cuma perlu tahu "ada pemasukan atau tidak" */
export function hasIncomeInWindow(
  window: PeriodWindow,
  txs: HistoryTransaction[] = HISTORY_TRANSACTIONS,
): boolean {
  return periodIncome(window, txs).hasIncome
}

/* ── KOLAM UANG PER PERIODE (prompt 26) ─────────────────────────────────────
   Sebelum ini `computeDailyHud({ window })` cuma mengganti PANJANG PEMBAGI-nya,
   sementara pool uangnya tetap angka BULANAN. Akibatnya tab Mingguan membagi
   sisa sebulan dengan 1 hari (mis. Rp 800.000/hari) — padahal seluruh modul 2B
   dirancang untuk income tidak tetap yang berpikir per minggu / per siklus
   gajian (PRD 655–681). Sekarang uangnya ikut window:

     • income       = Σ transaksi pemasukan yang MASUK di dalam window,
     • spent        = uang keluar di dalam window — memakai definisi app-wide
                      `summarizeTransactions` (pengeluaran + setoran tabungan;
                      transfer netral) supaya sama dengan `SPENT_TODAY` dan
                      angka "terpakai" di panel review,
     • installments = cicilan yang relevan untuk window (aturan di bawah),
     • available    = income − installments (kanon PRD 1154: cicilan dipotong
                      DULU). Dijaga ≥ 0 supaya saat pemasukan window lebih kecil
                      dari cicilannya tidak lahir "jatah" dari angka minus.

   BULAN KALENDER tetap memakai konstanta kanon (`MONTHLY_INCOME` /
   `SPENT_THIS_MONTH` / `TOTAL_INSTALLMENTS`) — angka itulah patokan demo
   (PRD 678) dan yang dibaca Home lewat `DAILY_HUD`; mengubahnya berarti
   mengubah layar Home, di luar paket ini. Di produksi kedua jalur datang dari
   tabel yang sama (transaksi + hutang bulan berjalan), jadi percabangan ini
   bisa dicabut. */
export interface PeriodPool {
  /** pemasukan yang masuk di dalam window */
  income: number
  /** uang keluar di dalam window (definisi `summarizeTransactions`) */
  spent: number
  /** cicilan yang jatuh / menjadi bagian window ini */
  installments: number
  /** income − installments (selalu ≥ 0) — kolam yang dibagi ke sisa hari */
  available: number
  /** true = memakai konstanta kanon bulan kalender (bukan jumlah transaksi) */
  canonicalMonthly: boolean
}

/** jumlah hari satu bulan kalender — Februari ikut benar (bukan `DAYS_IN_MONTH`) */
function daysInMonthOf(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** potongan window per bulan kalender — dipakai prorata cicilan */
function monthSpansOf(startISO: string, endISO: string): { firstISO: string; lastISO: string }[] {
  const spans: { firstISO: string; lastISO: string }[] = []
  let cursor = startISO
  while (cursor <= endISO) {
    const [y, m] = cursor.split('-').map(Number)
    const lastOfMonth = `${y}-${pad2(m)}-${pad2(daysInMonthOf(y, m))}`
    const lastISO = lastOfMonth < endISO ? lastOfMonth : endISO
    spans.push({ firstISO: cursor, lastISO })
    cursor = shiftISODate(lastISO, 1)
  }
  return spans
}

/**
 * Cicilan untuk satu window — aturan SEDERHANA yang disengaja, dan ini
 * keputusan produk yang paling mungkin direvisi saat data hutang nyata masuk:
 *
 *   1. Kalau salah satu tanggal jatuh tempo (`INSTALLMENT_DUE_DAYS`) jatuh di
 *      dalam window → potong PENUH cicilan bulanan. Cicilan memang dibayar
 *      sekali di tanggal itu, jadi angkanya nyata untuk window tersebut.
 *   2. Kalau tidak ada → PRORATA: setiap hari window "membawa"
 *      1/(jumlah hari bulan itu) bagian dari cicilan bulanan (1 bulan = 4
 *      minggu ⇒ ±¼ per minggu). Window yang melintasi dua bulan dijumlahkan
 *      per bulan, jadi siklus gajian 25 Sep–24 Okt = 6/30 + 24/31 cicilan.
 *
 * Catatan asumsi: jadwal hutang mock di `lib/data/wealth.ts` punya tanggal
 * sendiri (Kredivo tgl 10, SPayLater tgl 25) dengan total berbeda
 * (Rp 1.070.000), sementara HUD memakai kanon PRD 678 (Rp 800.000). Menyatukan
 * dua mock itu akan mengubah angka Home, jadi TIDAK dikerjakan di sini —
 * `INSTALLMENT_DUE_DAYS` hanya meminjam TANGGAL-nya, nominalnya tetap kanon HUD.
 */
export function periodInstallments(window: PeriodWindow): number {
  const spans = monthSpansOf(window.startISO, window.endISO)

  /* Poin 1 — ada tanggal jatuh tempo di dalam window ⇒ potong penuh. */
  const dueInside = spans.some((span) => {
    const [y, m] = span.firstISO.split('-').map(Number)
    return INSTALLMENT_DUE_DAYS.some((day) => {
      if (day > daysInMonthOf(y, m)) return false
      const dueISO = `${y}-${pad2(m)}-${pad2(day)}`
      return dueISO >= window.startISO && dueISO <= window.endISO
    })
  })
  if (dueInside) return TOTAL_INSTALLMENTS

  /* Poin 2 — tidak ada: prorata per bulan yang disentuh window. */
  const prorated = spans.reduce((sum, span) => {
    const [y, m] = span.firstISO.split('-').map(Number)
    const daysInWindowMonth = daysBetween(span.firstISO, span.lastISO) + 1
    return sum + TOTAL_INSTALLMENTS * (daysInWindowMonth / daysInMonthOf(y, m))
  }, 0)
  return Math.round(prorated)
}

/** kolam uang untuk window aktif — satu pintu, dipakai `computeDailyHud()` */
export function periodPool(
  window: PeriodWindow,
  txs: HistoryTransaction[] = HISTORY_TRANSACTIONS,
): PeriodPool {
  if (window.period === 'monthly') {
    return {
      income: MONTHLY_INCOME,
      spent: SPENT_THIS_MONTH,
      installments: TOTAL_INSTALLMENTS,
      available: Math.max(0, MONTHLY_INCOME - TOTAL_INSTALLMENTS),
      canonicalMonthly: true,
    }
  }

  const inWindow = txs.filter((tx) => tx.date >= window.startISO && tx.date <= window.endISO)
  const { income, expense } = summarizeTransactions(inWindow)
  const installments = periodInstallments(window)

  return {
    income,
    spent: expense,
    installments,
    /* PRD 1154 — cicilan dipotong lebih dulu, dan tidak boleh negatif */
    available: Math.max(0, income - installments),
    canonicalMonthly: false,
  }
}

/** kata sifat periode untuk label kartu budget (tanpa string di JSX) */
export function periodLimitWord(period: BudgetPeriod): string {
  if (period === 'weekly') return 'mingguan'
  if (period === 'custom') return 'per siklus gajian'
  return 'bulanan'
}

/** satuan setelah nominal di form, mis. `Rp 300.000 per minggu` */
export function periodUnitWord(period: BudgetPeriod): string {
  if (period === 'weekly') return 'minggu'
  if (period === 'custom') return 'siklus gajian'
  return 'bulan'
}

export const MONTHLY_WINDOW = periodWindow('monthly')


/* ── HUD HARIAN — formula kanon PRD 2B.1 (cicilan → celengan → sisa) ────────
   Audit UX #2: jatah harian WAJIB dihitung SETELAH sinking fund. Menampilkan
   "jatah aman" padahal celengan bulan ini belum disetor = ilusi palsu.

   Sejak periode non-bulanan masuk (2B untuk freelancer), panjang periode TIDAK
   lagi selalu sebulan: pemanggil bisa menyerahkan `window` dan `dayIndex`/
   `daysInPeriod` milik periode itu yang dipakai. Tanpa `window`, fungsinya
   jatuh ke jangkar bulan kalender (`CURRENT_DAY`/`DAYS_IN_MONTH`) supaya
   pemakaian lama tetap jalan apa adanya. */
export interface BudgetHud {
  /** pemasukan − cicilan − kewajiban celengan (uang yang benar-benar bebas) */
  availablePool: number
  /** sisa bulan; BOLEH negatif = kurang sekian untuk penuhi celengan */
  remaining: number
  daysLeft: number
  /** jatah harian — 0 saat `shortfall` (jatah ditahan, bukan ditawarkan) */
  dailyBudget: number
  /** cicilan platform aktif yang dipotong lebih dulu (PRD 2B.1). Untuk window
   *  non-bulanan ini cicilan milik window itu (prorata/penuh), bukan angka bulanan */
  installments: number
  /** total kewajiban celengan bulan ini (sinking funds belum disetor) */
  sinkingObligation: number
  /** uang keluar periode aktif - `SPENT_THIS_MONTH` hanya untuk bulan kalender */
  spent: number
  /** true = `remaining` < 0: saldo tidak cukup memenuhi celengan bulan ini */
  shortfall: boolean
}

export function computeDailyHud({
  monthlyIncome = MONTHLY_INCOME,
  totalInstallments = TOTAL_INSTALLMENTS,
  sinkingObligation = 0,
  spent = SPENT_THIS_MONTH,
  currentDay,
  daysInMonth,
  window: period,
}: {
  /** dipakai kalau `window` tidak diberikan (jangkar bulan kalender) */
  monthlyIncome?: number
  totalInstallments?: number
  /** kewajiban celengan bulan ini — dipotong sebelum jatah harian dihitung */
  sinkingObligation?: number
  spent?: number
  currentDay?: number
  daysInMonth?: number
  /** periode aktif — menimpa `currentDay`/`daysInMonth` DAN KOLAM UANG-nya
   *  (prompt 26: pemasukan & pengeluaran dihitung untuk window ini, bukan selalu
   *  sebulan). Saat diisi, argumen konstanta di atas tidak dipakai. */
  window?: PeriodWindow
}): BudgetHud {
  /* Kolam window aktif (kalau ada). Untuk bulan kalender `periodPool()` memakai
     konstanta kanon — jadi angka Home = tab Bulanan tetap identik. */
  const pool = period ? periodPool(period) : null
  const income = pool ? pool.income : monthlyIncome
  const installments = pool ? pool.installments : totalInstallments
  const spentInPeriod = pool ? pool.spent : spent

  /* PRD 2B.1/1154 — cicilan dipotong dari pool income SEBELUM dibagi hari;
     `available` sudah dijaga >= 0 di `periodPool()` supaya pemasukan window yang
     lebih kecil dari cicilannya tidak berubah jadi jatah minus. */
  const availablePool =
    (pool ? pool.available : Math.max(0, income - installments)) - sinkingObligation
  const remaining = availablePool - spentInPeriod
  /* periode aktif menentukan pembaginya; guard eksplisit supaya tidak pernah
     ada pembagian nol walau periode berakhir hari ini */
  const activeDay = period?.dayIndex ?? currentDay ?? CURRENT_DAY
  const periodDays = Math.max(1, period?.daysInPeriod ?? daysInMonth ?? DAYS_IN_MONTH)
  const daysLeft = Math.max(1, periodDays - activeDay + 1) // termasuk hari ini
  const shortfall = remaining < 0
  // saat shortfall jatah DITAHAN (0) — jangan pernah tawarkan uang yang belum ada
  const dailyBudget = shortfall ? 0 : Math.max(0, Math.floor(remaining / daysLeft))
  return {
    availablePool,
    remaining,
    daysLeft,
    dailyBudget,
    installments,
    sinkingObligation,
    spent: spentInPeriod,
    shortfall,
  }
}

/** total kewajiban celengan bulan ini = jumlah "nabung Rp X/bulan" untuk
 *  celengan yang BELUM disetor bulan ini. Setelah user setor, kewajibannya
 *  lunas → jatah harian ikut pulih (uangnya memang sudah keluar). */
export function sinkingObligationOf(funds: SinkingFundItem[]): number {
  return funds
    .filter((fund) => !fund.contributedThisMonth)
    .reduce((sum, fund) => sum + monthlyNeeded(fund.target, fund.current, fund.deadline), 0)
}

/* Catatan: `DAILY_HUD` (angka kanon bulan kalender) didefinisikan SETELAH
   `INITIAL_SINKING_FUNDS` di bawah, karena kewajiban celengannya perlu data itu. */

/* ── MOCK BUDGET KATEGORI ────────────────────────────────────────────────────
   SATU daftar untuk ketiga tab periode. `period` milik tiap baris menentukan
   dia muncul di tab mana (lihat `budgetsForPeriod`) — jadi tab Mingguan /
   Bulanan / Siklus Gajian semuanya punya isi nyata tanpa daftar terpisah.

   `spent` menutup dua warna status pacing (sage & amber). Untuk melihat state
   >= 100% — terracotta, banner over-budget, DAN tombol `Review Pengeluaran →`
   yang membuka panel "Review Pengeluaran Hari Ini" (prompt 19) — naikkan mis.
   `spent` Kopi jadi 310.000. */
export const INITIAL_BUDGETS: BudgetItem[] = [
  { id: 1, category: 'Makanan', icon: '🍜', limit: 1_500_000, spent: 1_180_000, period: 'monthly', scope: 'keluarga' },
  { id: 2, category: 'Transportasi', icon: '🚗', limit: 500_000, spent: 320_000, period: 'monthly', scope: 'pribadi' },
  { id: 3, category: 'Kopi', icon: '☕', limit: 300_000, spent: 285_000, period: 'monthly', scope: 'pribadi' },
  { id: 4, category: 'Hiburan', icon: '🎮', limit: 400_000, spent: 150_000, period: 'monthly', scope: 'keluarga' },
  /* tab Mingguan — limit per minggu (Senin–Minggu) */
  { id: 5, category: 'Belanja', icon: '🛍️', limit: 250_000, spent: 180_000, period: 'weekly', scope: 'pribadi' },
  { id: 6, category: 'Transportasi', icon: '🚗', limit: 200_000, spent: 96_000, period: 'weekly', scope: 'keluarga' },
  /* tab Siklus Gajian — limit per siklus (tanggal 25 → 24) */
  { id: 7, category: 'Tagihan', icon: '🧾', limit: 1_800_000, spent: 1_500_000, period: 'custom', scope: 'pribadi' },
  { id: 8, category: 'Kesehatan', icon: '💊', limit: 600_000, spent: 180_000, period: 'custom', scope: 'keluarga' },
]

/* ── MOCK CELENGAN IMPIAN (sinking funds) ───────────────────────────────────
   Target & current disetel supaya kewajiban celengan per bulan BULAT dan
   jumlahnya 3,6jt (lihat blok KONSTANTA UANG): Rp 400rb (Coldplay) +
   Rp 1,2jt (Dana Darurat) + Rp 2jt (iPhone). Dengan begitu jatah harian di
   kartu Jatah Hari Ini jatuh di angka utuh — dan tetap bisa dibuat "ditahan"
   dengan menaikkan `SPENT_THIS_MONTH`. */
export const INITIAL_SINKING_FUNDS: SinkingFundItem[] = [
  { id: 1, name: 'Tiket Konser Coldplay', target: 3_000_000, current: 1_800_000, deadline: '2026-12-15', priority: 'tinggi', stage: 'plant', scope: 'pribadi', contributedThisMonth: false },
  { id: 2, name: 'Dana Darurat', target: 15_000_000, current: 4_200_000, deadline: '2027-06-01', priority: 'kritis', stage: 'sprout', scope: 'keluarga', contributedThisMonth: false },
  /* deadline 4 bulan (bukan 3) supaya kewajibannya Rp 2jt — angka utuh */
  { id: 3, name: 'iPhone 16', target: 18_000_000, current: 10_000_000, deadline: '2027-01-15', priority: 'sedang', stage: 'plant', scope: 'pribadi', contributedThisMonth: false },
]

/* ── HUD KANON (BULAN KALENDER) ─────────────────────────────────────────────
   Satu sumber untuk kartu Jatah Hari Ini di Home DAN tab Bulanan /budget:

     • kewajiban celengan dihitung dari SEMUA fund — HUD ini metrik GLOBAL
       (audit UX #3), jadi ia tidak berubah-ubah mengikuti konteks uang;
     • `window: MONTHLY_WINDOW` membuat dayIndex/daysInPeriod = 27/30, persis
       seperti `CURRENT_DAY`/`DAYS_IN_MONTH`. Jadi `computeDailyHud({ window:
       periodWindow('monthly') })` di halaman Budget menghasilkan angka yang
       IDENTIK dengan `DAILY_HUD` (acceptance: angka bulanan Home = /budget). */
export const SINKING_OBLIGATION_ALL = sinkingObligationOf(INITIAL_SINKING_FUNDS)

export const DAILY_HUD = computeDailyHud({
  monthlyIncome: MONTHLY_INCOME,
  totalInstallments: TOTAL_INSTALLMENTS,
  sinkingObligation: SINKING_OBLIGATION_ALL,
  spent: SPENT_THIS_MONTH,
  window: MONTHLY_WINDOW,
})

/* ── RIWAYAT SETORAN CELENGAN (mock) ─────────────────────────────────────────
   Sumber kebenaran daftar setoran di halaman detail /budget/[id].

   Arah produksi (saat Supabase aktif) — tabel `sinking_fund_contributions`:
     id uuid pk · fund_id uuid fk→sinking_funds · user_id uuid fk
     wallet_id uuid fk→wallets · amount numeric · occurred_at date · note text
   Query halaman detail:
     SELECT id, amount, occurred_at, wallet_id
     FROM sinking_fund_contributions
     WHERE fund_id = $1 AND user_id = auth.uid()
     ORDER BY occurred_at DESC;

   Dua aturan yang dipegang mock di bawah supaya halaman detail TIDAK PERNAH
   bercerita beda dari halaman induk /budget:
     1. Jumlah `amount` tiap fund == `SinkingFundItem.current` fund itu, jadi
        "terkumpul" di hero dan daftar setoran selalu sinkron.
     2. Semua setoran terakhir jatuh di BULAN SEBELUMNYA — itu penjelas jujur
        kenapa `contributedThisMonth` masih false di halaman induk (yang memicu
        nudge Zona B + kewajiban celengan di Jatah Hari Ini).
   Konsekuensinya semua celengan mock memang "telat" (≥ 2 minggu) — itu state
   yang mau didemokan; begitu user setor dari halaman detail, nudge-nya hilang
   sendiri karena setoran baru bertanggal hari ini. */
export interface FundContribution {
  id: number
  fundId: number
  /** tanggal lokal `YYYY-MM-DD` */
  date: string
  amount: number
  /** id dompet sumber — cocok dengan `WALLET_SOURCES` */
  walletId: string
}

export const FUND_CONTRIBUTIONS: FundContribution[] = [
  /* 1 · Tiket Konser Coldplay — 4 setoran, total 1.800.000 (= current) */
  { id: 1, fundId: 1, date: '2026-05-20', amount: 300_000, walletId: 'bca' },
  { id: 2, fundId: 1, date: '2026-06-18', amount: 500_000, walletId: 'bca' },
  { id: 3, fundId: 1, date: '2026-07-15', amount: 500_000, walletId: 'gopay' },
  { id: 4, fundId: 1, date: '2026-08-22', amount: 500_000, walletId: 'bca' },
  /* 2 · Dana Darurat — 3 setoran, total 4.200.000 (= current) */
  { id: 5, fundId: 2, date: '2026-04-05', amount: 1_200_000, walletId: 'bca' },
  { id: 6, fundId: 2, date: '2026-06-15', amount: 1_500_000, walletId: 'bca' },
  { id: 7, fundId: 2, date: '2026-08-30', amount: 1_500_000, walletId: 'tunai' },
  /* 3 · iPhone 16 — 4 setoran, total 10.000.000 (= current) */
  { id: 8, fundId: 3, date: '2026-03-10', amount: 2_000_000, walletId: 'bca' },
  { id: 9, fundId: 3, date: '2026-05-12', amount: 2_000_000, walletId: 'bca' },
  { id: 10, fundId: 3, date: '2026-07-20', amount: 3_000_000, walletId: 'bca' },
  { id: 11, fundId: 3, date: '2026-08-25', amount: 3_000_000, walletId: 'gopay' },
]

/* ── PILIHAN KATEGORI BUDGET (grid pill di AddBudgetSheet Step 1) ─────────── */
export const BUDGET_CATEGORY_OPTIONS: { label: string; icon: string }[] = [
  { label: 'Makanan', icon: '🍜' },
  { label: 'Transportasi', icon: '🚗' },
  { label: 'Kopi', icon: '☕' },
  { label: 'Hiburan', icon: '🎮' },
  { label: 'Belanja', icon: '🛍️' },
  { label: 'Tagihan', icon: '🧾' },
  { label: 'Kesehatan', icon: '💊' },
  { label: 'Lainnya', icon: '✨' },
]

export const BUDGET_PERIOD_OPTIONS: { id: BudgetPeriod; label: string }[] = [
  { id: 'weekly', label: 'Mingguan' },
  { id: 'monthly', label: 'Bulanan' },
  { id: 'custom', label: 'Custom' },
]

/* ── JEMBATAN INSIGHT → SHEET TAMBAH BUDGET (prompt 24) ─────────────────────
   Insight "Spending Spike: Kopi" di /history mengajak user MENGATUR LIMIT, dan
   itu harus jadi sheet tambah budget yang benar-benar terbuka — dulu aksinya
   cuma toast "segera tersedia".

   Kenapa lewat URL (`/budget?add=Kopi`) dan bukan tulis ke localStorage:
   daftar budget mock hidup di state `BudgetScreen` (/budget). Budget yang
   ditulis dari /history ke localStorage TIDAK dibaca halaman mana pun — user
   akan menyimpan sesuatu yang tidak pernah muncul lagi (janji palsu, persis
   yang dilarang aturan "jangan ada tombol mati"). Dengan membawa kategorinya
   lewat URL, budget-nya mendarat di satu-satunya tempat yang memilikinya: sheet
   terbuka sudah terisi kategori, dan begitu disimpan barisnya langsung tampil. */
export const BUDGET_ADD_PARAM = 'add'

/** tautan `+ Tambah budget` untuk satu kategori — dipakai kartu Insight di /history */
export function budgetAddHref(categoryLabel: string): string {
  return `/budget?${BUDGET_ADD_PARAM}=${encodeURIComponent(categoryLabel)}`
}

/** kategori dari URL → opsi sheet. Label asing/typo diabaikan (null) supaya
 *  URL karangan tidak bisa membuka sheet dengan kategori yang tidak ada. */
export function categoryOptionOf(label: string | undefined | null): { label: string; icon: string } | null {
  const wanted = label?.trim().toLowerCase()
  if (!wanted) return null
  return BUDGET_CATEGORY_OPTIONS.find((option) => option.label.toLowerCase() === wanted) ?? null
}

/* ── PRIORITAS CELENGAN — badge & dot, semua warna dari design system ─────── */
export const PRIORITY_OPTIONS: {
  id: GoalPriority
  label: string
  badge: string
  dot: string
}[] = [
  { id: 'rendah', label: 'Rendah', badge: 'bg-oat text-ink/55 ring-1 ring-ink/20', dot: 'bg-ink/20' },
  { id: 'sedang', label: 'Sedang', badge: 'bg-hud-sage/20 text-[#b5b987] ring-1 ring-hud-sage/30', dot: 'bg-hud-sage' },
  { id: 'tinggi', label: 'Tinggi', badge: 'bg-hud-amber/20 text-[#b89191] ring-1 ring-hud-amber/30', dot: 'bg-hud-amber' },
  { id: 'kritis', label: 'Kritis', badge: 'bg-hud-terracotta/15 text-hud-terracotta ring-1 ring-hud-terracotta/25', dot: 'bg-hud-terracotta' },
]

export function priorityStyle(priority: GoalPriority) {
  return PRIORITY_OPTIONS.find((p) => p.id === priority) ?? PRIORITY_OPTIONS[0]
}

/* ── METAFORA TANAMAN — tahap pertumbuhan celengan (PRD 2C.3) ─────────────── */
export const PLANT_STAGES: Record<PlantStage, { icon: string; label: string }> = {
  seed: { icon: '🌱', label: 'Baru ditanam' },
  sprout: { icon: '🌿', label: 'Mulai tumbuh!' },
  plant: { icon: '🌳', label: 'Tumbuh subur!' },
  flower: { icon: '🌸', label: 'Hampir mekar!' },
  bloom: { icon: '🌺', label: 'TERCAPAI! 🎉' },
}

/** budget PlantStage → tahap ilustrasi SVG (plant-illustration: 1..4).
 *  Dipakai kartu Celengan di list view supaya progres digambar sebagai
 *  TANAMAN (kanon PRD 2C.3 — SVG statis di list), bukan progress bar generik. */
export const PLANT_STAGE_INDEX: Record<PlantStage, 1 | 2 | 3 | 4> = {
  seed: 1,
  sprout: 2,
  plant: 3,
  flower: 4,
  bloom: 4,
}

/** progress → tahap tanaman: tiap setoran "menumbuhkan" tanamannya */
export function plantStageFrom(current: number, target: number): PlantStage {
  const pct = target > 0 ? (current / target) * 100 : 0
  if (pct >= 100) return 'bloom'
  if (pct >= 75) return 'flower'
  if (pct >= 50) return 'plant'
  if (pct >= 25) return 'sprout'
  return 'seed'
}

/* ── SUMBER DOMPET untuk setoran (mock — disamakan dengan halaman Dompet) ───
   Tile berwarna brand supaya pemilih dompet terasa hidup, bukan dropdown abu-abu. */
export const WALLET_SOURCES: { id: string; name: string; kind: string; tile: string; dot: string }[] = [
  { id: 'bca', name: 'BCA', kind: 'Bank', tile: 'bg-thistle/15 text-thistle ring-thistle/15', dot: 'bg-thistle' },
  { id: 'gopay', name: 'GoPay', kind: 'E-Wallet', tile: 'bg-leaf/15 text-evergreen ring-leaf/15', dot: 'bg-leaf' },
  { id: 'tunai', name: 'Tunai', kind: 'Uang cash', tile: 'bg-cantelope/15 text-cantelope ring-cantelope/15', dot: 'bg-cantelope' },
]

/* ── COPY TETAP (social proof & nudge) ───────────────────────────────────── */
export const SOCIAL_PROOF_COPY =
  '💡 78% member CatetInd yang set target bulanan berhasil hemat lebih banyak.'

export const NUDGE_COPY =
  'Celengan kamu belum nambah bulan ini. Gapapa, mulai lagi kapan aja ya — kecil-kecilan juga gak masalah 🤗'

/* ── COPY PERIODE & JATAH HARIAN (Zona A + kartu Home) ───────────────────────
   Tidak boleh ada satu kalimat pun langsung di JSX. Nada PRD 2B.3: saat tidak
   ada pemasukan, angka jatah DISEMBUNYIKAN (jangan pernah "Rp 0/hari"), dan
   saat pemasukan masuk di tengah periode, user diberi tahu kenapa angkanya
   berubah — tanpa menghakimi. */
export const HUD_COPY = {
  title: 'Jatah Hari Ini',
  pin: 'Pin ke Dashboard',
  pinned: 'Terpin ke Dashboard',
  /** netral periode: benar untuk tab mingguan / bulanan / siklus gajian */
  remainingLead: 'Sisa periode:',
  daysLeftSuffix: 'hari lagi',
  poolNote: (installmentsLabel: string, obligationLabel: string) =>
    `Setelah dipotong cicilan ${installmentsLabel} & celengan ${obligationLabel}`,
  /** PRD 2B.3: pemasukan masuk di tengah periode → jatah dihitung ulang */
  midIncome: (dateLabel: string) =>
    `Pemasukan masuk ${dateLabel} — jatah harianmu disesuaikan.`,
  /** Dry Spell — menggantikan SELURUH HUD (tanpa Rp 0/hari) */
  drySpellTitle: 'Belum ada pemasukan di periode ini.',
  drySpellBody: 'Yuk catat begitu masuk! 💪',
  drySpellCta: '+ Catat Pemasukan',
  drySpellA11y: 'Belum ada pemasukan di periode ini',
  /** state "jatah ditahan" (saldo tidak cukup memenuhi celengan bulan ini) */
  shortfallBadge: 'Jatah ditahan',
  shortfallCaption: 'jatah harian ditahan',
  shortfallBody:
    '⚠️ Saldo tidak cukup untuk penuhi target celengan bulan ini. Jatah harianmu ditahan.',
  shortfallShortBy: 'Kurang',
  shortfallObligationLead: 'Celengan bulan ini',
} as const

/* ── COPY KARTU JATAH HARI INI DI HOME ────────────────────────────────────
   Kartu Home memakai angka kanon yang SAMA (`DAILY_HUD`), tapi bentuknya
   ringkas: ring persen + nominal besar. Label status ring mengikuti kanon PRD
   2B.2 — sage / amber / terracotta, tidak pernah merah. */
export type HudStatus = 'onTrack' | 'approaching' | 'over'

export const HOME_HUD_COPY = {
  title: 'Jatah Hari Ini',
  subtitle: 'Budget harian dinamis',
  dailyCaption: 'sisa jatah hari ini',
  usedCaption: 'terpakai',
  remainingLead: 'Sisa bulan',
  daysLeftSuffix: 'hari lagi',
  installmentsLead: 'Cicilan terpotong',
  reviewCta: 'Review Pengeluaran Hari Ini',
  status: {
    onTrack: { label: 'On track', ring: '#b5b987', copy: 'Masih banyak ruang hari ini! 🌿' },
    approaching: {
      /* dulu "Hampir habis" — diganti supaya tidak ada kata "habis" (kanon 2B.2:
         nada nurturing, bukan mengancam) */
      label: 'Pelan-pelan',
      ring: '#ffb885',
      copy: 'Pelan-pelan ya, sisa jatah harianmu tinggal dikit 🌤️',
    },
    over: { label: 'Lewat jatah', ring: '#b89191', copy: 'Gapapa, besok kita atur ulang bareng! 🌱' },
  },
} as const

/* ── COPY NUDGE CELENGAN DI BERANDA (banner `home-banner.tsx`) ──────────────
   Dulu judul, badan, dan label tombol banner ini ditulis langsung di JSX —
   satu-satunya banner Home yang copy-nya tidak lewat `lib/data/*`. Sekarang ikut
   aturan repo, dan CTA-nya menunjuk halaman yang benar-benar memegang aksi setor
   (/budget → kartu Celengan Impian, satu-satunya tempat state dana hidup),
   bukan tombol yang diam (prompt 24). */
export const SINKING_NUDGE_COPY = {
  title: 'Dana Darurat belum dikasih jatah bulan ini',
  body: 'Udah lewat tanggal 5 — yuk sisihkan sedikit. Tanamanmu senang kalau kamu konsisten 🌱',
  cta: 'Setor',
  ctaHref: '/budget',
  dismissLabel: 'Tutup pengingat nabung',
} as const

/* ── COPY CTA REVIEW (Zona A) ──────────────────────────────────────────────
   Panel "Review Pengeluaran Hari Ini" (prompt 19) + seluruh teksnya.
   Dulu blok ini hanya toast "panel menyusul" yang menyuruh user mencari tombol
   ✨; sekarang panelnya benar-benar ada (`components/catetind/spending-review-sheet.tsx`)
   dan CTA di Zona A + kartu kategori membukanya. Kalimat per kondisi TIDAK
   dikarang: disalin apa adanya dari tabel PRD 2B.4 (AI Coach Responses) dan
   PRD 2B.3 (Dry Spell) — termasuk baris "tiga hari terakhir", satu-satunya
   balasan over di tabel itu. */
/** Ambang catatan sehari sebelum panel boleh menyimpulkan POLA (PRD 2A.5:
 *  "Jangan pernah berikan false insight"). Di bawah angka ini panel cuma bilang
 *  apa adanya — bukan menebak kategori paling boros dari satu-dua catatan. */
export const SPENDING_REVIEW_MIN_NOTES = 3

export const SPENDING_REVIEW_COPY = {
  title: 'Review Pengeluaran Hari Ini',
  description: 'Kita lihat bareng pelan-pelan — nggak ada yang perlu dihakimi.',
  /** label angka utama panel */
  spentLabel: 'Keluar hari ini',
  budgetLead: 'dari jatah harian',
  remainingLead: 'Sisa jatah ini',
  daysLeftSuffix: 'hari lagi',
  /** jumlah catatan hari ini (ikut angka, bukan kalimat tetap) */
  notesLead: (count: number) => (count === 1 ? '1 catatan hari ini' : `${count} catatan hari ini`),
  /** jatah harian tidak bisa di-pace (ditahan) — jangan gambar bar 0% yang bohong */
  heldPace: 'Jatah harianmu sedang ditahan, jadi pace-nya belum bisa dihitung.',
  /** kartu pola — muncul HANYA kalau catatan hari ini sudah cukup */
  topTitle: 'Paling besar hari ini',
  topShare: (pct: number) => `${pct}% dari pengeluaran hari ini`,
  /** kartu sabar (PRD 2A.5) — data masih tipis, jadi tidak ada klaim pola */
  thinTitle: 'Aku lagi belajar pola keuanganmu.',
  thinBody: 'Terus catat ya, nanti aku kasih insight yang beneran berguna! 📊',
  thinProgress: (count: number) => `${count}/${SPENDING_REVIEW_MIN_NOTES} catatan hari ini`,
  thinHint: 'Catatan baru langsung ikut kehitung di panel ini.',
  /** catatan hari ini — bukti angka di atas, bukan opini */
  notesTitle: 'Catatan hari ini',
  notesMore: (count: number) => `+${count} catatan lainnya`,
  /** CTA lanjut ke AI Coach (PRD 649: CTA sekunder "Over" ujungnya memang AI Coach) */
  coachCta: 'Lanjut ngobrol sama Minca',
  coachHint: 'Pertanyaanmu langsung terkirim ke Minca — kamu tinggal lanjut ngobrol.',
  /** pertanyaan seed yang dikirim ke AI Coach lewat lib/ai-chat-bus.ts */
  coachSeed: 'Boros nggak nih hari ini?',
  /** satu kalimat per kondisi — apa adanya dari PRD (lihat catatan di atas) */
  condition: {
    drySpell:
      'Bulan sepi itu wajar buat freelancer. Yang penting kita tetap catat pengeluaran biar nanti bisa review bareng.',
    incomeIn:
      'Alhamdulillah, jerih payahmu cair juga! Yuk kita sisihkan dulu buat pos wajib sebelum self-reward secukupnya. 🌿',
    over: 'Tiga hari terakhir emang lagi banyak pengeluaran ya? Gapapa, wajar kok. Besok kita coba rem sedikit biar napas dompet lebih panjang. 🌤️',
    normal:
      'Wah, kamu konsisten banget jaga pengeluaran! 💚 Selisihnya udah lumayan, mau kita masukin ke celengan tabungan?',
    /* jatah ditahan: memakai penjelasan HUD yang sama dengan kartu Jatah Hari
       Ini — satu narasi, bukan kalimat kedua yang artinya sama */
    shortfall: HUD_COPY.shortfallBody,
  },
} as const

/* ── COPY ZONA A (budget kategori) ───────────────────────────────────────── */
export const BUDGET_ZONE_A_COPY = {
  /** 3G Sapu Bersih — copy netral periode (dulu "Bulan ini") */
  sweepTitle: 'Sapu Bersih Sisa Budget!',
  sweepLead: 'Kamu hemat',
  sweepTail: 'dari budget! Mau disapu masuk ke celengan?',
  sweepCta: 'Sapu ke Celengan',
  addCta: 'Tambah Budget Baru',
  overLead: (count: number, category: string) =>
    count > 1 ? `Ada ${count} kategori yang overbudget.` : `Kategori ${category} overbudget.`,
  overQuestion: 'Mau review bareng AI Coach? 🤖',
  overCta: 'Review Pengeluaran Hari Ini',
  emptyBody:
    'Belum ada budget di periode ini? Santai, mulai dari yang kecil aja. Coba atur limit Kopi dulu!',
  emptyCta: 'Buat Budget Pertama',
} as const

/* ── COPY FORM TAMBAH BUDGET ───────────────────────────────────────────────
   `periodWord` = kata sifat dari `periodLimitWord()` supaya kalimatnya ikut
   periode yang sedang aktif ("limit mingguan", "limit per siklus gajian"). */
export const BUDGET_ADD_COPY = {
  title: 'Tambah Budget Baru',
  description: 'Tiga langkah singkat — kategori, limit, lalu periode.',
  categoryLabel: 'Pilih kategori budget',
  amountLabel: (category: string, periodWord: string) =>
    `Berapa limit ${periodWord} untuk ${category}?`,
  amountHint: 'Perkiraan aja dulu — limitnya bisa diubah kapan pun kok.',
  periodTitle: 'Periode limit',
  periodAria: 'Periode budget',
  footer: (amountLabel: string, unit: string) =>
    `${amountLabel} per ${unit} — bisa kamu ubah lagi kapan aja 🌿`,
  submit: 'Simpan Budget ✓',
} as const


/* ── COPY HALAMAN DETAIL CELENGAN (/budget/[id]) ─────────────────────────────
   Semua teks halaman detail tinggal di sini — tidak ada satu kalimat pun yang
   ditulis langsung di JSX — supaya bisa diaudit & diganti sekali jalan.
   Nada WAJIB (PRD 2C.4, CONTEXT §5): ringan, memotivasi, TIDAK menyalahkan.
   Keterlambatan tidak pernah disebut "gagal"; tanaman tidak pernah mati. */
export const FUND_DETAIL_COPY = {
  /** tombol kembali: aria-label penuh + label yang tampil di desktop */
  back: 'Kembali ke Budget & Target',
  backLabel: 'Kembali',
  /** judul tab + judul halaman saat id di URL tidak punya celengan */
  notFoundTitle: 'Celengan tidak ditemukan',
  heroLabel: 'Terkumpul',
  /** mengapa angka halaman ini bisa dipercaya */
  heroHint: 'Dihitung dari riwayat setoranmu sendiri.',
  planTitle: 'Rencana Nabung',
  projectionTitle: 'Perkiraan Penuh',
  /** label kolom di hero — "Target" = nominal tujuan, "Target tanggal" = deadline */
  targetLabel: 'Target',
  deadlineLabel: 'Target tanggal',
  /** pembaca layar untuk pill prioritas */
  priorityA11y: (label: string) => `Prioritas ${label}`,
  setCta: 'Setor',
  setHint: 'Setoran langsung nambah progres & riwayat di halaman ini.',
  /** toast setelah setor — pemisah `{amount}` & `{name}` diisi di handler */
  setToastTitle: (amountLabel: string, name: string) => `${amountLabel} disetor ke ${name}! 🌱`,
  setToastHint: (walletName: string) => `Dari ${walletName} — tanamannya makin subur.`,
  /** celengan yang BARU dibuat di sesi demo: halaman detail /budget/[id] membaca
   *  data dari lib/data/budget.ts, sedangkan celengan baru hanya hidup di state
   *  halaman /budget (demo tanpa backend). Jadi bukannya halaman 404, kita
   *  jelaskan apa adanya. Hilangkan copy ini begitu ada tabel `sinking_funds`. */
  demoOnlyTitle: 'Celengan barumu cuma ada di halaman ini 🌱',
  demoOnlyHint: 'Demo ini belum menyimpan celengan baru, jadi halaman detailnya belum punya data untuk dibuka.',
} as const

/** auto-kalkulasi PRD 2C.3 dipecah dua potong supaya nominalnya bisa di-tebalkan
 *  di UI, dengan versi satu kalimat untuk pembaca layar. */
export const FUND_PLAN_COPY = {
  lead: 'Kamu perlu nabung',
  tail: '/bulan biar tercapai tepat waktu.',
  full: (amountLabel: string) => `Kamu perlu nabung ${amountLabel}/bulan biar tercapai tepat waktu.`,
  /** sisa waktu — menegaskan bahwa targetnya masih masuk akal untuk dikejar */
  monthsLeft: (months: number) =>
    months === 1 ? 'Deadline bulan ini juga.' : `Masih ada ${months} bulan lagi sampai deadline.`,
  /** state 100%: `monthlyNeeded()` jadi 0 — jangan pernah tulis "nabung Rp 0/bulan" */
  done: 'Targetnya udah penuh, jadi nggak ada setoran bulanan yang ditunggu. Kalau mau nambah lagi, tetap boleh 🎉',
} as const

/** asumsi proyeksi DIKATAKAN, bukan disembunyikan (jangan pernah memberi
 *  false insight — CONTEXT §5.3). */
export const FUND_PROJECTION_COPY = {
  assumption: (count: number, avgLabel: string) =>
    `Dirata-ratakan dari ${count} setoran terakhir (${avgLabel}/bulan).`,
  ahead: (dateLabel: string, deadlineLabel: string) =>
    `Kalau ritmenya konsisten, celengan ini penuh sekitar ${dateLabel} — lebih cepat dari target ${deadlineLabel} 🎉`,
  onTime: (dateLabel: string, deadlineLabel: string) =>
    `Kalau ritmenya konsisten, celengan ini penuh sekitar ${dateLabel}, pas sebelum target ${deadlineLabel}.`,
  behind: (dateLabel: string, deadlineLabel: string) =>
    `Dengan ritme sekarang, perkiraan penuh sekitar ${dateLabel} — sedikit lewat dari target ${deadlineLabel}. Nambah dikit tiap bulan udah cukup kok.`,
  unknown: 'Belum ada setoran, jadi aku belum bisa memperkirakan kapan celengan ini penuh 🌱',
  /** state 100%: proyeksi tanggal tidak relevan lagi (tidak ada sisa untuk dikejar) */
  done: 'Celengan ini udah penuh, jadi nggak ada sisa yang perlu dikejar — waktunya bikin target baru 🌱',
} as const

export const FUND_HISTORY_COPY = {
  title: 'Riwayat Setoran',
  count: (count: number) => `${count} setoran`,
  /** label kecil di bawah tanggal setoran terakhir */
  latest: (dateLabel: string) => `Setoran terakhir ${dateLabel}`,
  never: 'Belum pernah setor',
  /** nama kolom dompet sumber di tiap baris */
  walletLead: 'dari',
  emptyTitle: 'Belum ada setoran di sini 🌱',
  emptyBody:
    'Setoran pertamamu bakal muncul di daftar ini lengkap dengan tanggal dan dompet sumbernya.',
  emptyHint: (exampleLabel: string) =>
    `Mulai dari kecil aja — ${exampleLabel} juga tetap dihitung.`,
} as const

/** PRD 2C.4 (baris 857) — dipakai saat sisa ≤ FUND_NEAR_THRESHOLD */
export const FUND_NEAR_COPY = (remainingLabel: string) =>
  `Dikit lagi! Tinggal kurang ${remainingLabel} dari target 💚 Kamu hebat udah sampai sini.`

/** PRD 2C.4 (baris 861) — copy telat yang TIDAK menghakimi. Jumlah minggu ikut
 *  data (bukan template angka), tail-nya persis nada PRD. */
export const FUND_LATE_COPY = {
  title: 'Gapapa kalau sempat jeda',
  body: (name: string, weeks: number) =>
    `${name} belum nambah ${weeks} minggu ini. Gapapa, mulai lagi kapan aja ya — kecil-kecilan juga gak masalah 🤗`,
  cta: 'Setor sedikit aja',
  dismiss: 'Tutup',
} as const

/** PRD 2C.4 (baris 859) — perayaan target tercapai, menyebut nama celengannya */
export const FUND_ACHIEVED_COPY = {
  body: (name: string) => `🎉 ${name} TERCAPAI! Kamu udah jaga impian ini dengan cara yang luar biasa.`,
  cta: 'Buat target baru',
  hint: 'Targetnya sudah penuh — waktunya menanam celengan yang baru 🌱',
} as const

/* ── HELPER MURNI (dipakai komponen Zona A & B) ──────────────────────────── */

/** nominal dengan privasi: `Rp 25.000` atau `Rp •••••••` */
export function maskNominal(value: number, masked: boolean): string {
  return masked ? MASKED_AMOUNT : formatIDR(value)
}

/** label "terpakai / limit" — saat privasi aktif cukup satu topeng (anti-berisik) */
export function ratioLabel(part: number, whole: number, masked: boolean): string {
  if (masked) return MASKED_AMOUNT
  return `${formatIDR(part)} / ${formatIDR(whole)}`
}

/** persentase terpakai (bisa > 100 kalau over budget) */
export function spentPercent(budget: BudgetItem): number {
  if (budget.limit <= 0) return 0
  return (budget.spent / budget.limit) * 100
}

/** posisi garis pacing ideal (%) — tempat pengeluaran SEHARUSNYA berada hari ini.
 *  `window` (periode aktif) menentukan pembaginya; tanpa `window` dipakai
 *  jangkar bulan kalender supaya pemakaian lama tidak berubah. */
export function pacingPercent(
  window?: PeriodWindow,
  currentDay: number = CURRENT_DAY,
  daysInMonth: number = DAYS_IN_MONTH,
): number {
  const periodDays = Math.max(1, window?.daysInPeriod ?? daysInMonth)
  const activeDay = window?.dayIndex ?? currentDay
  return Math.min(100, (activeDay / periodDays) * 100)
}

/** hex warna bar progres kategori — tiga warna kanon Daily HUD (PRD 2B.2) */
export const PACING_HEX: Record<PacingTone, string> = {
  sage: '#b5b987',
  amber: '#ffb885',
  terracotta: '#b89191',
}

/** warna + copy status pacing sebuah kategori (nominal ikut mode privasi) */
export function pacingOf(
  budget: BudgetItem,
  masked = false,
  window?: PeriodWindow,
): {
  tone: PacingTone
  percent: number
  copy: string
  /** true = pengeluaran lebih cepat dari pacing ideal hari ini */
  fasterThanPacing: boolean
} {
  const percent = spentPercent(budget)
  const tone: PacingTone = percent >= 100 ? 'terracotta' : percent >= 75 ? 'amber' : 'sage'
  const sisa = Math.max(0, budget.limit - budget.spent)
  const copy =
    tone === 'sage'
      ? 'Masih banyak ruang! 🌿'
      : tone === 'amber'
        ? `Pelan-pelan ya, sisa tinggal ${maskNominal(sisa, masked)} 🌤️`
        : 'Gapapa, besok kita atur ulang bareng! 🌱'
  return { tone, percent, copy, fasterThanPacing: percent > pacingPercent(window) }
}

/** copy mikro-UI garis pacing (dipakai kartu kategori) — tanpa string di JSX */
export const PACING_HINT_COPY = {
  base: 'Garis abu-abu = target pacing ideal',
  faster: 'Garis abu-abu = target pacing ideal. Pengeluaran kategori ini lebih cepat dari ideal.',
} as const

/* ── REVIEW PENGELUARAN HARI INI (prompt 19) ─────────────────────────────────
   Satu fungsi murni untuk menjawab satu pertanyaan: "boros nggak nih hari
   ini?". Semua masukannya data yang MEMANG sudah ada — tidak ada angka baru
   yang ditulis di JSX:

     • catatan hari ini     → HISTORY_TRANSACTIONS (tanggal TODAY_ISO)
     • uang keluar hari ini → summarizeTransactions() — definisi app-wide yang
                              sama dengan halaman Riwayat (setoran tabungan ikut
                              terhitung keluar, transfer netral)
     • kategori terbesar    → topExpenseCategory(), HANYA kalau catatannya sudah
                              cukup (pagar ambang PRD 2A.5)
     • jatah harian         → `hud` dari halaman yang sedang dibuka, jadi angka
                              panel & kartu "Jatah Hari Ini" di layar itu tidak
                              mungkin berbeda (untuk tab Bulanan = DAILY_HUD)
     • pace                 → pacingOf(), helper yang sama dengan kartu kategori

   Yang SENGAJA tidak ada: skor kesehatan finansial atau kesimpulan tren dari
   data sehari (dilarang prompt 19 & PRD 2A.5 "jangan pernah berikan false
   insight"). Panel cuma menyebut nominal, pace, dan satu kalimat. */

/** catatan pada satu tanggal — satu definisi filter tanggal, dipakai panel
 *  review & angka ring "terpakai" di kartu Jatah Hari Ini (Home) */
export function transactionsOn(
  iso: string = TODAY_ISO,
  txs: HistoryTransaction[] = HISTORY_TRANSACTIONS,
): HistoryTransaction[] {
  return txs.filter((tx) => tx.date === iso)
}

/** uang keluar HARI INI (mock) — satu sumber untuk ring "terpakai" di kartu
 *  Jatah Hari Ini (Home) dan panel review di /budget. Diambil dari catatan
 *  bertanggal TODAY_ISO supaya dua layar itu mustahil bercerita beda. */
export const SPENT_TODAY = summarizeTransactions(transactionsOn()).expense

/** kondisi yang menentukan kalimat balasan panel */
export type SpendingReviewCondition = 'drySpell' | 'incomeIn' | 'over' | 'normal' | 'shortfall'

export interface TodayPace {
  tone: PacingTone
  percent: number
  copy: string
}

/**
 * Pace HARI INI (uang keluar hari ini vs jatah harian).
 *
 * Dibungkus lewat `pacingOf()` supaya warna & nada statusnya memakai SATU
 * definisi yang sama dengan kartu kategori (sage < 75%, amber 75–99%,
 * terracotta ≥ 100%) — bukan ambang kedua yang bisa menyimpang. `null` = jatah
 * hariannya sedang ditahan, jadi tidak ada yang bisa di-pace: panel menampilkan
 * penjelasannya, bukan bar 0% yang terbaca "aman".
 */
export function todayPace(
  dailyBudget: number,
  spentToday: number,
  masked = false,
): TodayPace | null {
  if (dailyBudget <= 0) return null
  /* BudgetItem sintetis: `pacingOf` cuma membaca limit & spent, jadi bentuk yang
     sudah ada dipakai ulang daripada menulis rumus kedua. */
  const { tone, percent, copy } = pacingOf(
    {
      id: 0,
      category: 'Hari ini',
      icon: '',
      limit: dailyBudget,
      spent: spentToday,
      period: 'monthly',
      scope: 'pribadi',
    },
    masked,
  )
  return { tone, percent, copy }
}

export interface SpendingReview {
  todayISO: string
  /** catatan hari ini — panel menampilkannya sebagai bukti, bukan kesimpulan */
  notes: HistoryTransaction[]
  noteCount: number
  /** uang keluar hari ini (definisi `summarizeTransactions`) */
  spentToday: number
  dailyBudget: number
  /** 0 kalau jatahnya sudah lewat / sedang ditahan */
  remainingToday: number
  /** sisa hari periode aktif — angka yang sama dengan kartu Jatah Hari Ini */
  daysLeft: number
  /** null = catatan hari ini masih < SPENDING_REVIEW_MIN_NOTES → nol klaim pola */
  topCategory: CategorySlice | null
  pace: TodayPace | null
  condition: SpendingReviewCondition
  /** satu kalimat dari tabel PRD (2B.4 / 2B.3) sesuai kondisi */
  sentence: string
}

export function spendingReview({
  hud,
  income,
  masked = false,
  txs = HISTORY_TRANSACTIONS,
  todayISO = TODAY_ISO,
}: {
  /** HUD periode AKTIF dari halaman — biar panel & kartu Jatah Hari Ini satu angka */
  hud: BudgetHud
  /** Dry Spell & "pemasukan cair hari ini" (PRD 2B.3) */
  income: PeriodIncome
  masked?: boolean
  txs?: HistoryTransaction[]
  todayISO?: string
}): SpendingReview {
  const notes = transactionsOn(todayISO, txs)
  const { count, expense } = summarizeTransactions(notes)
  const dailyBudget = hud.dailyBudget

  /* Urutan kondisi = urutan kepentingan: belum ada pemasukan (dry spell) paling
     dulu, lalu pemasukan yang benar-benar CAIR HARI INI (bukan yang cair
     beberapa hari lalu — kartu Jatah Hari Ini sudah menjelaskan yang itu), lalu
     jatah yang sedang ditahan, baru pace hari ini. */
  const incomeJustIn = income.latestDateISO === todayISO
  const condition: SpendingReviewCondition = !income.hasIncome
    ? 'drySpell'
    : incomeJustIn
      ? 'incomeIn'
      : hud.shortfall
        ? 'shortfall'
        : dailyBudget > 0 && expense > dailyBudget
          ? 'over'
          : 'normal'

  return {
    todayISO,
    notes,
    noteCount: count,
    spentToday: expense,
    dailyBudget,
    remainingToday: Math.max(0, dailyBudget - expense),
    daysLeft: hud.daysLeft,
    topCategory: count >= SPENDING_REVIEW_MIN_NOTES ? topExpenseCategory(notes) : null,
    pace: todayPace(dailyBudget, expense, masked),
    condition,
    sentence: SPENDING_REVIEW_COPY.condition[condition],
  }
}

/** total sisa (surplus) budget yang belum terpakai habis — inti fitur Sapu Bersih */
export function totalSurplus(budgets: BudgetItem[]): number {
  return budgets.reduce((sum, b) => sum + Math.max(0, b.limit - b.spent), 0)
}

/** budget yang masih punya sisa (kandidat disapu) */
export function surplusBudgets(budgets: BudgetItem[]): BudgetItem[] {
  return budgets.filter((b) => b.limit - b.spent > 0)
}

/** index bulan dari `YYYY-MM-DD` — dipakai untuk hitung bulan tersisa */
function monthIndex(iso: string): number {
  const [year, month] = iso.split('-').map(Number)
  return year * 12 + (month - 1)
}

/** bulan tersisa sampai deadline (deadline bulan ini dihitung 1 bulan) */
export function monthsUntil(deadlineISO: string, fromISO: string = TODAY_ISO): number {
  return Math.max(1, monthIndex(deadlineISO) - monthIndex(fromISO))
}

/** auto-calculation PRD 2C.3: (target - current) / bulan tersisa */
export function monthlyNeeded(
  target: number,
  current: number,
  deadlineISO: string,
  fromISO: string = TODAY_ISO,
): number {
  const months = monthsUntil(deadlineISO, fromISO)
  return Math.max(0, Math.ceil((target - current) / months))
}

export function fundPercent(fund: SinkingFundItem): number {
  if (fund.target <= 0) return 0
  return Math.min(100, (fund.current / fund.target) * 100)
}

/** `2026-12-15` → `15 Des 2026` (UTC dipatok supaya tidak bergeser karena timezone) */
export function formatDeadline(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

/* ── RIWAYAT, PROYEKSI & KETERLAMBATAN CELENGAN (logika murni) ──────────────
   Semua hitungan halaman detail /budget/[id] ada di sini — komponennya hanya
   merender. Persentase tetap lewat `fundPercent()`; halaman detail TIDAK boleh
   menghitung ulang persen, kenaikan bulanan, atau tanggal sendiri. */

/** ambang "telat" — PRD 2C.4 memakai contoh 2 minggu tanpa setoran */
export const FUND_LATE_AFTER_DAYS = 14
/** berapa setoran terakhir yang dirata-ratakan untuk proyeksi tanggal penuh */
export const FUND_PROJECTION_SAMPLE = 3
/** PRD 2C.4 baris 857: "hampir tercapai" = sisa ≤ Rp 500.000 */
export const FUND_NEAR_THRESHOLD = 500_000
/** contoh setoran kecil di empty state (dipakai lewat maskNominal) */
export const FUND_EXAMPLE_AMOUNT = 50_000

/** jarak hari `from → to` dalam `YYYY-MM-DD` (tolak negatif = 0) */
export function daysBetween(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split('-').map(Number)
  const [ty, tm, td] = toISO.split('-').map(Number)
  const diff = Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)
  return Math.max(0, Math.round(diff / 86_400_000))
}

/** tambah `months` bulan ke tanggal ISO; hari di-clamp ke akhir bulan
 *  (31 Jan + 1 bulan → 28/29 Feb) supaya proyeksi tidak pernah "melompat" bulan */
export function addMonths(iso: string, months: number): string {
  const [year, month, day] = iso.split('-').map(Number)
  const total = month - 1 + months
  const y = year + Math.floor(total / 12)
  const m = ((total % 12) + 12) % 12
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const d = Math.min(day, lastDay)
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** sisa yang belum terkumpul (0 kalau sudah/sudah lewat target) */
export function fundRemaining(fund: SinkingFundItem): number {
  return Math.max(0, fund.target - fund.current)
}

/** setoran satu celengan, TERBARU DULU (urutan tampil di riwayat) */
export function fundContributions(
  fundId: number,
  contributions: FundContribution[] = FUND_CONTRIBUTIONS,
): FundContribution[] {
  return contributions
    .filter((item) => item.fundId === fundId)
    .sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1))
}

/** nama dompet pengganti kalau id-nya tidak dikenal (jangan pernah tampil kosong) */
export const FALLBACK_WALLET_NAME = 'Dompet'

/** entri dompet sumber (tile warna + dot) untuk baris riwayat setoran */
export function walletSourceById(walletId: string) {
  return WALLET_SOURCES.find((source) => source.id === walletId) ?? null
}

/** nama dompet sumber setoran (cocok dengan id di `WALLET_SOURCES`) */
export function walletSourceName(walletId: string): string {
  return walletSourceById(walletId)?.name ?? FALLBACK_WALLET_NAME
}

export interface FundProjection {
  /** rata-rata setoran per bulan yang diasumsikan */
  avgMonthly: number
  /** berapa bulan lagi celengan penuh dengan ritme itu */
  months: number
  /** tanggal perkiraan penuh (`YYYY-MM-DD`) */
  dateISO: string
  /** berapa setoran yang ikut dirata-ratakan (asumsi diungkapkan ke user) */
  sampleCount: number
  /** true = perkiraan penuh SEBELUM deadline */
  beforeDeadline: boolean
}

/**
 * Perkiraan tanggal celengan penuh.
 *
 * ASUMSI YANG DIPAKAI (dan sengaja dikatakan ke user lewat
 * `FUND_PROJECTION_COPY.assumption`, bukan disembunyikan): ritme menabung ke
 * depan = rata-rata `FUND_PROJECTION_SAMPLE` setoran terakhir. Ini proyeksi
 * sederhana yang bisa dihitung dari data yang benar-benar ada — bukan prediksi
 * AI, bukan janji. Di produksi perhitungan ini tetap client-side (data kecil,
 * hasilnya harus instan); `null` = belum ada setoran sama sekali / sudah penuh.
 */
export function projectedCompletion(
  fund: SinkingFundItem,
  contributions: FundContribution[] = FUND_CONTRIBUTIONS,
): FundProjection | null {
  const remaining = fundRemaining(fund)
  if (remaining === 0) return null

  const sample = fundContributions(fund.id, contributions).slice(0, FUND_PROJECTION_SAMPLE)
  if (sample.length === 0) return null

  const avgMonthly = sample.reduce((sum, item) => sum + item.amount, 0) / sample.length
  if (avgMonthly <= 0) return null

  const months = Math.max(1, Math.ceil(remaining / avgMonthly))
  const dateISO = addMonths(TODAY_ISO, months)
  return {
    avgMonthly: Math.round(avgMonthly),
    months,
    dateISO,
    sampleCount: sample.length,
    beforeDeadline: dateISO <= fund.deadline,
  }
}

export interface FundLateInfo {
  /** true = pantas dapat kartu nudge (gap ≥ 2 minggu, atau belum setor bulan ini) */
  late: boolean
  /** umur setoran terakhir dalam hari (null = belum ada setoran sama sekali) */
  days: number | null
  /** dibulatkan ke bawah, minimal 1 — dipakai copy "X minggu" */
  weeks: number
  /** tanggal setoran terakhir (null = belum pernah setor) */
  lastDateISO: string | null
  lastAmount: number | null
}

/**
 * Apakah celengan ini "terlambat"?
 *
 * Selengan baru yang belum pernah disetor TIDAK dihitung telat: yang ia butuh
 * dorongan pertama (empty state riwayat punya CTA-nya sendiri), bukan teguran.
 * Dua pemicu: `contributedThisMonth` masih false (truth bulanan di
 * `SinkingFundItem`) atau jarak setoran terakhir sudah ≥ FUND_LATE_AFTER_DAYS.
 */
export function fundLateInfo(
  fund: SinkingFundItem,
  contributions: FundContribution[] = FUND_CONTRIBUTIONS,
  todayISO: string = TODAY_ISO,
): FundLateInfo {
  const last = fundContributions(fund.id, contributions)[0] ?? null
  const days = last ? daysBetween(last.date, todayISO) : null
  const weeks = days === null ? 0 : Math.max(1, Math.floor(days / 7))
  const stale = days !== null && days >= FUND_LATE_AFTER_DAYS
  return {
    late: days !== null && (!fund.contributedThisMonth || stale),
    days,
    weeks,
    lastDateISO: last?.date ?? null,
    lastAmount: last?.amount ?? null,
  }
}

