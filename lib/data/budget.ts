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

   Dua konstanta di bawah adalah jangkar BULAN KALENDER versi DATA SEED. Kartu
   Home & halaman Budget TIDAK lagi membacanya: keduanya menghitung jendela dari
   tanggal perangkat (`todayISO()`) dan angkanya dari konfigurasi uang user
   (`lib/user-money-settings.ts`) + baris ledger sungguhan. Konstanta ini
   tersisa untuk `DAILY_HUD` (angka kanon demo di CONTEXT-WAJIB §10.1) dan untuk
   default test. */
/* Tanggalnya SATU dengan data transaksi hari ini (`HISTORY_TODAY_ISO` di
   lib/data/history.ts) — supaya "hari ini" di halaman Budget dan di Riwayat
   tidak pernah jatuh di hari yang berbeda. Literal tanggalnya tinggal di sana. */
/* ── KONSTANTA WAKTU (jangkar DEFAULT, bukan lagi jangkar UI) ────────────────
   PAKET 57: sejak `lib/time.ts` ada, "hari ini" milik user = `todayISO()` dan
   layar mengisinya SETELAH mount lewat `useTodayISO()`. Konstanta di bawah
   tinggal di file ini sebagai jangkar DEFAULT untuk render server, test, dan
   data seed (demo harus stabil & bebas hydration mismatch) — BUKAN lagi sumber
   tanggal yang dibaca user. Layar yang memakai fungsi-fungsi di file ini wajib
   mengirim `todayIso` hasil `useTodayISO()`. */
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
   PAKET 57 - PERUBAHAN PENTING: angka ini tetap ada sebagai KANON DEMO (dipakai
   `DAILY_HUD` + test + dokumentasi CONTEXT-WAJIB §10.1), tetapi KOMPONEN tidak
   boleh lagi membacanya. Sejak paket ini layar memakai:

     - pemasukan & cicilan -> konfigurasi user (`lib/user-money-settings.ts`)
     - uang keluar         -> baris ledger NYATA (`useMoneyStore()` ->
                              `recordedTransactions()` -> `spentInWindow()`)

   dan saat pemasukan belum diatur, kartu Jatah Hari Ini menampilkan CTA ("Atur
   pemasukanmu dulu") - bukan angka contoh dari konstanta ini. Itulah temuan
   AKAR D audit 2026-09 yang ditutup paket 57.

   Turunkan angka `SPENT_THIS_MONTH` (atau naikkan kewajiban celengan) kalau mau
   menguji state "jatah ditahan" (audit UX #2) di kanon demo & test. */
export const MONTHLY_INCOME = 7_500_000

/* ── KANON CICILAN (paket 27) ────────────────────────────────────────────────
   SATU angka cicilan untuk SELURUH perhitungan Jatah Harian: `periodPool()`,
   `periodInstallments()`, dan prorata window non-bulanan semuanya membaca
   konstanta ini. Dulu ia ikut terduplikasi di beberapa mock (inventaris di
   bawah) — sejak paket ini konstanta ini yang ditunjuk sebagai kanon.

   Hasil sisir SEMUA angka cicilan yang di-hardcode di repo (`grep`):
     1. lib/data/budget.ts  → TOTAL_INSTALLMENTS = 800.000  ← KANON (dipakai hitungan)
     2. lib/data/wealth.ts  → `totalMonthInstallments(INITIAL_DEBTS)` = 1.070.000
        (Kredivo 550.000 jatuh tempo tgl 10 + SPayLater 520.000 tgl 25) — halaman /wealth
     3. lib/data/calendar.ts → jadwal tagihan: Cicilan Motor 850.000 (tgl 5),
        Cicilan HP 600.000 (tgl 22), Kredivo 420.000 (tgl 28) = 1.870.000 — Kalender
     4. lib/data/bills.ts   → tagihan 'Cicilan HP' 450.000 & 'Kredivo' 350.000 — /bills
     5. lib/data/wealth.ts  → `hudDeductionCopy()` cuma menyebut nominalnya (bukan angka baru)

   Selisih 800.000 vs 1.070.000 SENGAJA tidak disatukan di paket ini: 800.000
   adalah angka patokan demo (PRD 678) yang sudah tampil di Home & tab Bulanan,
   dan menggantinya berarti mengubah layar Home — di luar mandat paket ini
   (aturan paket: angka Home tidak boleh berubah). Jadi dilaporkan sebagai
   usulan, bukan dikerjakan.

   ARAH PRODUKSI (satu-satunya jalan yang benar): nominalnya DITURUNKAN dari tabel
   hutang, bukan ditulis tangan —
     platformDebts(debts).reduce((sum, d) => sum + (d.monthlyInstallment ?? 0), 0)
   (sudah ada sebagai `totalMonthInstallments()` di lib/data/wealth.ts), dan
   `INSTALLMENT_DUE_DAYS` di bawah diambil dari `dueDate` tiap hutang. Sesudah itu
   lima daftar mock di atas harus mengecil jadi satu sumber (tabel debts), dan
   tiga mock tampilan (wealth/calendar/bills) membaca turunan yang sama. */
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
  /**
   * true = user SUDAH mengatur pemasukan bulanannya (paket 57).
   *
   * Dibedakan dari `hasIncome` karena dua keadaan ini butuh jawaban yang
   * berbeda: "belum diatur" → CTA mengatur pemasukan di Pengaturan; "sudah
   * diatur tapi belum ada catatan masuk di jendela ini" → Dry Spell (catat
   * pemasukan). Menyamakan keduanya berarti mengirim user ke form yang salah.
   */
  configured: boolean
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
 * PAKET 57 — dua sumber, satu jawaban:
 *
 *   1. baris LEDGER sungguhan di dalam jendela (`txs`; layar mengirim
 *      `recordedTransactions()` dari store uang, bukan konstanta seed), dan
 *   2. pemasukan bulanan yang DIKONFIGURASI user (`lib/user-money-settings.ts`)
 *      — dihitung sebagai pemasukan periode bulan kalender. Sebelum paket 57
 *      angka ini tidak pernah terbaca: pemasukan yang diisi user saat onboarding
 *      dibuang, dan jatah harian dihitung dari konstanta demo.
 *
 * Pemasukan yang dikonfigurasi SENGAJA tidak "disebar" ke jendela mingguan: yang
 * user isi adalah angka BULANAN, jadi jendela mingguan tetap menuntut catatan
 * nyata (kalau tidak, satu gaji akan dihitung empat kali dalam sebulan).
 */
export function periodIncome(
  window: PeriodWindow,
  txs: HistoryTransaction[] = HISTORY_TRANSACTIONS,
  configuredMonthlyIncome = 0,
): PeriodIncome {
  const configured = configuredMonthlyIncome > 0
  const inWindow = txs
    .filter(
      (tx) => tx.type === 'income' && tx.date >= window.startISO && tx.date <= window.endISO,
    )
    .sort((a, b) => (a.date < b.date ? 1 : -1))
  const latest = inWindow[0] ?? null
  const logged = inWindow.reduce((sum, tx) => sum + tx.amount, 0)

  /* bulan kalender: konfigurasi user sudah cukup untuk menyatakan "ada
     pemasukan" — dan ia dihitung sejak hari pertama periode (midPeriod false) */
  const fromConfig = configured && window.period === 'monthly'
  return {
    hasIncome: latest !== null || fromConfig,
    configured,
    midPeriod: latest !== null && latest.date > window.startISO,
    latestDateISO: latest?.date ?? (fromConfig ? window.startISO : null),
    latestDateLabel: latest ? dayMonth(latest.date) : fromConfig ? dayMonth(window.startISO) : null,
    amount: fromConfig ? Math.max(logged, configuredMonthlyIncome) : logged,
  }
}

/** versi ringkas untuk kartu yang cuma perlu tahu "ada pemasukan atau tidak" */
export function hasIncomeInWindow(
  window: PeriodWindow,
  txs: HistoryTransaction[] = HISTORY_TRANSACTIONS,
  configuredMonthlyIncome = 0,
): boolean {
  return periodIncome(window, txs, configuredMonthlyIncome).hasIncome
}

/* ── UANG NYATA DI DALAM SATU JENDELA (paket 57) ─────────────────────────────
   Sumber tunggal untuk "uang keluar periode ini": baris ledger yang jatuh di
   dalam jendela, memakai definisi app-wide `summarizeTransactions()`
   (pengeluaran + setoran tabungan; transfer netral) supaya angkanya sama dengan
   panel Review Pengeluaran Hari Ini dan halaman Riwayat. Tidak ada rumus kedua
   yang bisa menyimpang. */

/** baris yang jatuh di dalam jendela periode (inklusif kedua ujungnya) */
export function windowTransactions<T extends HistoryTransaction>(
  txs: T[],
  window: PeriodWindow,
): T[] {
  return txs.filter((tx) => tx.date >= window.startISO && tx.date <= window.endISO)
}

/** uang keluar NYATA di dalam jendela (dipakai sebagai `spent` HUD) */
export function spentInWindow(txs: HistoryTransaction[], window: PeriodWindow): number {
  return summarizeTransactions(windowTransactions(txs, window)).expense
}

/** uang masuk NYATA di dalam jendela (dipakai sebagai pemasukan non-bulanan) */
export function earnedInWindow(txs: HistoryTransaction[], window: PeriodWindow): number {
  return summarizeTransactions(windowTransactions(txs, window)).income
}

/** uang keluar pada SATU tanggal (ring "terpakai" di kartu Jatah Hari Ini) */
export function spentOn(txs: HistoryTransaction[], iso: string): number {
  return summarizeTransactions(txs.filter((tx) => tx.date === iso)).expense
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
 * Potongan BULANAN untuk satu window — SATU rumus, dipakai bersama oleh cicilan
 * (`periodInstallments()` di bawah) dan kewajiban celengan (`sinkingObligationFor()`).
 *
 * Paket 26 menulis aturan ini khusus untuk cicilan; paket 27 mengangkatnya jadi
 * helper bersama supaya celengan memakai aturan yang SAMA PERSIS — bukan aturan
 * kedua yang mirip tapi beda di ujung pembulatan.
 *
 *   1. Kalau salah satu tanggal jatuh tempo (`dueDays`) jatuh di dalam window →
 *      potong PENUH. Cicilan memang dibayar sekali di tanggal itu, jadi angkanya
 *      nyata untuk window tersebut. (`dueDays` kosong = tidak punya jatuh tempo.)
 *   2. Kalau tidak ada → PRORATA: setiap hari window "membawa"
 *      1/(jumlah hari bulan itu) bagian dari nominal bulanan (1 bulan ≈ 4 minggu
 *      ⇒ ±¼ per minggu). Window yang melintasi dua bulan dijumlahkan per bulan,
 *      jadi siklus gajian 25 Sep–24 Okt = 6/30 + 24/31 dari nominalnya.
 *
 * Hasilnya dibulatkan ke rupiah penuh (`Math.round`) supaya tidak ada pecahan
 * sen yang bocor ke copy. Untuk window SATU BULAN PENUH faktor proratanya 1
 * (30/30, 31/31, 28/28), jadi angka kanon bulan kalender tidak bergeser —
 * itulah yang menjaga Home & tab Bulanan tetap identik setelah paket ini.
 */
export function prorateMonthly(
  amount: number,
  window: PeriodWindow,
  dueDays: number[] = [],
): number {
  const spans = monthSpansOf(window.startISO, window.endISO)

  /* Poin 1 — ada tanggal jatuh tempo di dalam window ⇒ potong penuh. */
  if (dueDays.length > 0) {
    const dueInside = spans.some((span) => {
      const [y, m] = span.firstISO.split('-').map(Number)
      return dueDays.some((day) => {
        if (day > daysInMonthOf(y, m)) return false
        const dueISO = `${y}-${pad2(m)}-${pad2(day)}`
        return dueISO >= window.startISO && dueISO <= window.endISO
      })
    })
    if (dueInside) return amount
  }

  /* Poin 2 — tidak ada: prorata per bulan yang disentuh window. */
  const prorated = spans.reduce((sum, span) => {
    const [y, m] = span.firstISO.split('-').map(Number)
    const daysInWindowMonth = daysBetween(span.firstISO, span.lastISO) + 1
    return sum + amount * (daysInWindowMonth / daysInMonthOf(y, m))
  }, 0)
  return Math.round(prorated)
}

/**
 * Cicilan untuk satu window — memakai helper di atas dengan tanggal jatuh tempo
 * platform (`INSTALLMENT_DUE_DAYS`).
 *
 * Catatan asumsi: jadwal hutang mock di `lib/data/wealth.ts` punya tanggal
 * sendiri (Kredivo tgl 10, SPayLater tgl 25) dengan total berbeda
 * (Rp 1.070.000), sementara HUD memakai kanon PRD 678 (Rp 800.000) — lihat blok
 * "KANON CICILAN". Menyatukan dua mock itu akan mengubah angka Home, jadi TIDAK
 * dikerjakan di sini: `INSTALLMENT_DUE_DAYS` hanya meminjam TANGGAL-nya,
 * nominalnya tetap kanon HUD.
 */
export function periodInstallments(window: PeriodWindow): number {
  return prorateMonthly(TOTAL_INSTALLMENTS, window, INSTALLMENT_DUE_DAYS)
}

/** kolam uang untuk window aktif — satu pintu, dipakai `computeDailyHud()` */
export function periodPool(
  window: PeriodWindow,
  txs: HistoryTransaction[] = HISTORY_TRANSACTIONS,
): PeriodPool {
  if (window.period === 'monthly') {
    /* PAKET 57: cabang ini KANON DEMO (angka contoh repo), bukan lagi jalur yang
       dipakai layar — `computeDailyHud()` hanya memakainya sebagai cadangan
       untuk jendela NON-bulanan yang tidak dikirim `earned`. Bulan kalender
       sekarang memakai pemasukan/cicilan dari konfigurasi user + uang keluar
       dari ledger, jadi pertahankan blok ini sebagai patokan angka demo & test. */
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
  /** kewajiban celengan yang dipotong untuk PERIODE INI. Window non-bulanan
   *  memakai prorata (paket 27), bukan kewajiban bulan penuh */
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
  sinkingFunds,
  spent = SPENT_THIS_MONTH,
  earned,
  currentDay,
  daysInMonth,
  window: period,
}: {
  /** dipakai kalau `window` tidak diberikan (jangkar bulan kalender) */
  monthlyIncome?: number
  totalInstallments?: number
  /* kewajiban celengan bulan ini — dipotong sebelum jatah harian dihitung.
   *  Window non-bulanan memakai PRORATA dari angka ini (paket 27). */
  sinkingObligation?: number
  /** daftar celengan sebagai sumber kewajiban — kalau diisi, `sinkingObligation`
   *  di atas DIABAIKAN dan kewajibannya dihitung dari `monthlyNeeded()` tiap
   *  celengan (`sinkingObligationOf()`). Dipakai /budget supaya celengan yang
   *  baru ditambahkan user langsung ikut terhitung. */
  sinkingFunds?: SinkingFundItem[]
  /**
   * Uang keluar periode ini — SELALU dipakai apa adanya, termasuk untuk window
   * bulan kalender (paket 57).
   *
   * Sebelum paket 57 argumen ini DIABAIKAN saat `window` diisi: cabang bulan
   * kalender mengambil `SPENT_THIS_MONTH` dari konstanta, jadi pengeluaran yang
   * baru dicatat user tidak pernah menurunkan jatah harian. Sekarang layar
   * mengirim `spentInWindow(recordedTransactions(snapshot), window)` — angka
   * NYATA dari ledger.
   */
  spent?: number
  /**
   * Pemasukan NYATA di dalam window (paket 57) — dipakai HANYA untuk window
   * non-bulanan. Window bulan kalender memakai `monthlyIncome` (konfigurasi
   * user, angka bulanan). Kalau kosong, jendela non-bulanan jatuh ke kolam mock
   * `periodPool()` supaya pemakaian lama & test tetap jalan.
   */
  earned?: number
  currentDay?: number
  daysInMonth?: number
  /** periode aktif — menimpa `currentDay`/`daysInMonth` DAN KOLAM UANG-nya
   *  (prompt 26: pemasukan & pengeluaran dihitung untuk window ini, bukan selalu
   *  sebulan). */
  window?: PeriodWindow
}): BudgetHud {
  /* Kolam uang window aktif. Cicilan & pemasukan mengikuti ATURAN window
     (bulanan = angka konfigurasi user; non-bulanan = prorata cicilan + uang yang
     benar-benar masuk di jendela itu), sementara uang keluar SELALU nilai yang
     dikirim pemanggil — itu yang membuat "catat Rp 50.000 → jatah harian turun"
     berlaku di semua tab, termasuk tab Bulanan. */
  const useMonthlyPool = !period || period.period === 'monthly'
  const income = useMonthlyPool ? monthlyIncome : (earned ?? periodPool(period).income)
  const installments = useMonthlyPool ? totalInstallments : periodInstallments(period)
  const spentInPeriod = spent

  /* Kewajiban celengan untuk periode aktif. Ada DUA bentuk sumber yang setara —
     daftar celengan (`sinkingFunds`, mis. state `funds` di /budget) atau angka
     bulanannya saja (`sinkingObligation`, mis. kanon `SINKING_OBLIGATION_ALL`) —
     dan dua-duanya lewat SATU rumus: `prorateMonthly()` (yang juga dipakai
     `sinkingObligationFor()` & cicilan). Tidak ada salinan logika di sini.

     Paket 27: sebelum ini nilainya selalu kewajiban BULAN PENUH, jadi tab
     Mingguan memotong 3,6jt dari pemasukan seminggu — "benar menurut rumus",
     tapi bukan uang minggu itu (PRD 655–681: pacing harus bisa dipercaya).
     Untuk window satu bulan penuh faktor proratanya 1, jadi `DAILY_HUD`
     (Home & tab Bulanan) tetap 3.600.000 apa adanya. */
  const monthlyObligation = sinkingFunds ? sinkingObligationOf(sinkingFunds) : sinkingObligation
  const periodSinking = period
    ? sinkingFunds
      ? sinkingObligationFor(period, sinkingFunds)
      : prorateMonthly(monthlyObligation, period, SINKING_FUND_DUE_DAYS)
    : monthlyObligation

  /* PRD 2B.1/1154 — cicilan dipotong dari pool income SEBELUM dibagi hari;
     dijaga >= 0 supaya pemasukan periode yang lebih kecil dari cicilannya tidak
     berubah jadi jatah minus (dulu penjagaan ini ada di `periodPool()`) */
  const availablePool = Math.max(0, income - installments) - periodSinking
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
    /* kewajiban yang BENAR-BENAR dipotong untuk window ini (prorata), bukan
       angka bulanan — supaya copy "Setelah dipotong … & celengan …" cocok
       dengan kolom yang dihitung */
    sinkingObligation: periodSinking,
    spent: spentInPeriod,
    shortfall,
  }
}

/**
 * Persentase kolam periode yang SUDAH terpakai (0..1) — dasar bar "terpakai" di
 * kartu Jatah Hari Ini.
 *
 * Bug yang ditutup (audit "Daily Budget Catastrophe"): kartu dulu menghitung
 * `spentToday / hud.dailyBudget`. Masalahnya `hud.dailyBudget` = `remaining /
 * daysLeft`, dan `remaining` SUDAH dikurangi `spent` (termasuk pengeluaran hari
 * ini). Pembilang ikut mengurangi penyebutnya sendiri, jadi persentasenya
 * melompat tak wajar — mis. "88% terpakai" di awal siklus padahal ruang periode
 * masih penuh.
 *
 * Yang benar-benar dibaca user adalah: "berapa bagian kolam uang periode ini
 * yang sudah terpakai". Sisanya (`availablePool − spent`) tetap tampil sebagai
 * nominal *jatah harian* (`dailyBudget`) + jumlah hari tersisa, jadi hubungan
 * "sisa uang ÷ hari tersisa" tetap terbaca di kartu.
 */
export function periodUsagePct(availablePool: number, spent: number): number {
  if (!(availablePool > 0)) return 0
  return Math.min(Math.max(spent / availablePool, 0), 1)
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

/** Tanggal "jatuh tempo" celengan — SENGAJA KOSONG, dan itu keputusan produk
 *  (paket 27), bukan kelalaian.
 *
 *  Celengan mock tidak punya tanggal setor wajib bulanan: `SinkingFundItem`
 *  cuma menyimpan `deadline` (kapan targetnya ingin dicapai), dan deadline itu
 *  TIDAK berarti "bayar penuh bulan ini". Kalau deadline dipakai sebagai pemicu
 *  "potong penuh", siklus gajian yang kebetulan memuat deadline akan memotong
 *  3,6jt sekaligus — persis jenis lompatan angka yang bikin user berhenti
 *  percaya pada pacing (PRD 655–681, PRD 809–865).
 *
 *  Jadi kewajiban celengan memakai PRORATA MURNI: window membawa 1/(jumlah hari
 *  bulan itu) bagian tiap bulan yang disentuhnya. Asumsi ini yang paling
 *  mungkin direvisi saat ada fitur "tanggal setor rutin per celengan" — ubah
 *  konstanta ini jadi daftar tanggalnya, dan rumusnya sudah siap (helper yang
 *  sama dengan cicilan). */
export const SINKING_FUND_DUE_DAYS: number[] = []

/**
 * Kewajiban celengan untuk satu WINDOW (paket 27) — satu pintu untuk pemanggil
 * yang punya daftar celengan sendiri (mis. state `funds` di /budget).
 *
 * Isinya = `sinkingObligationOf(funds)` (kewajiban bulanan) dipotong dengan
 * `prorateMonthly()` — rumus yang SAMA dengan cicilan, jadi tidak ada dua
 * perhitungan yang bisa berbeda. `computeDailyHud()` memakai jalan yang sama
 * untuk argumen `sinkingObligation`-nya, sehingga angka kartu Jatah Hari Ini dan
 * angka yang dihitung halaman selalu identik.
 */
export function sinkingObligationFor(
  window: PeriodWindow,
  funds: SinkingFundItem[] = INITIAL_SINKING_FUNDS,
): number {
  return prorateMonthly(sinkingObligationOf(funds), window, SINKING_FUND_DUE_DAYS)
}

/**
 * KANON DEMO bulan kalender (`CONTEXT-WAJIB` §10.1) — HITUNGAN CONTOH, bukan
 * angka yang dibaca layar (paket 57).
 *
 * Isinya = `computeDailyHud()` dengan seluruh argumen kanon demo:
 *
 *     available = 7.500.000 − 800.000 − 3.600.000 = 3.100.000
 *     sisa      = 3.100.000 − 2.300.000           =   800.000
 *     jatah     = 800.000 / 4 hari (27..30 Sep)   =   200.000
 *
 * Sejak paket 57 kartu Jatah Hari Ini di Home & /budget TIDAK memakai konstanta
 * ini lagi: keduanya menghitung dari konfigurasi uang user
 * (`lib/user-money-settings.ts`) + baris ledger sungguhan, dan menampilkan CTA
 * saat pemasukan belum diatur. Konstanta ini dipertahankan sebagai patokan demo
 * yang diikat §10.1, dasar test, dan bukti bahwa rumusnya tidak bergeser.
 */
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

/* ── JEMBATAN HOME → SHEET CELENGAN (paket 29) ───────────────────────────────
   Tombol `+` di kartu "Tabungan Impian" Home dulu MATI. Pilihannya dua: buka
   `AddGoalSheet` langsung dari Home (tapi celengan itu milik state `funds` di
   /budget — menyimpannya dari Home berarti menulis ke tempat yang tidak dibaca
   halaman mana pun: janji palsu), atau bawa user ke halaman yang MEMILIKI
   datanya sambil membuka sheet-nya. Yang kedua dipakai, dan caranya sama persis
   dengan `budgetAddHref()` di atas: lewat URL, divalidasi di route, lalu
   diteruskan sebagai prop awal ke komponen halaman.

   Bedanya cuma satu: parameter ini tidak butuh nilai (tidak ada kategori yang
   harus dibawa), jadi isinya `1` — "tolong buka sheet tanam celengan". */
export const BUDGET_PLANT_PARAM = 'tanam'

/** tautan `+ Tanam celengan` dari Home → /budget dengan sheet celengan terbuka */
export function budgetPlantHref(): string {
  return `/budget?${BUDGET_PLANT_PARAM}=1`
}

/**
 * Jalan keluar dari kartu Jatah Hari Ini menuju konfigurasi uang user (paket 57).
 *
 * Rutenya `/settings` — panel "Profil & Akun" adalah section DEFAULT halaman itu
 * (`app/settings/page.tsx` → `ProfileSettingsPanel`), dan di situlah field
 * PEMASUKAN BULANAN + TOTAL CICILAN BULANAN hidup. Sengaja konstanta, bukan
 * string di JSX: satu tautan yang salah ketik = CTA yang tidak menuju ke mana
 * pun, dan repo ini tidak punya halaman pengaturan kedua yang bisa menampung.
 */
export const MONEY_SETTINGS_HREF = '/settings'

/** baca parameter URL apa pun menjadi boolean — `?tanam=1` / `?tanam=true` */
export function flagParamOf(value: string | string[] | undefined): boolean {
  const raw = Array.isArray(value) ? value[0] : value
  const normalized = raw?.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'ya'
}

/* ── SATU KATEGORI = SATU LIMIT (paket 28) ───────────────────────────────────
   Insight "Spending Spike: Kopi" di /history mengajak user MENGATUR LIMIT lewat
   `/budget?add=Kopi`, tetapi sheet-nya selalu mode TAMBAH — padahal
   `INITIAL_BUDGETS` sudah punya baris Kopi. Hasilnya dua baris untuk kategori
   yang sama: limit jadi ambigu, pacing per kategori bercabang, dan user tidak
   punya cara menghapusnya dengan yakin. Menambah data yang bertentangan dengan
   data yang sudah ada adalah cara tercepat kehilangan kepercayaan user
   (kanon "jujur di setiap klaim", PRD 244) — jadi aturannya ditetapkan di sini.

   Aturannya: satu kategori = satu limit **per konteks uang** (pribadi /
   keluarga / bersama). Konteks jadi batasnya karena halaman Budget sendiri
   menyaring daftar per konteks — dan mock repo ini memang begitu: 'Transportasi'
   punya baris bulanan (pribadi) DAN baris mingguan (keluarga); kalau aturannya
   dibuat global, data mock-nya sendiri langsung melanggar. Yang benar-benar
   dilarang: kategori muncul DUA KALI di ruang yang sama-sama dilihat user.

   Konsekuensinya PERIODE tidak ikut jadi kunci: kalau Kopi cuma ada sebagai
   limit mingguan, mengatur ulang limitnya mengubah baris ITU (periodenya ikut
   tampil & bisa diganti di sheet) — bukan menambah baris bulanan kedua. */

/** cari baris budget satu kategori di dalam daftar yang diberikan.
 *  Perbandingan label tidak peduli huruf besar/kecil & spasi pinggir, karena
 *  kategorinya bisa datang dari URL (`?add=Kopi`). */
export function findBudgetByCategory(
  budgets: BudgetItem[],
  category: string | undefined | null,
): BudgetItem | undefined {
  const wanted = category?.trim().toLowerCase()
  if (!wanted) return undefined
  return budgets.find((budget) => budget.category.trim().toLowerCase() === wanted)
}

/**
 * Keputusan mode sheet untuk satu kategori — inilah yang mencegah baris ganda.
 *
 * `budgets` yang dikirim adalah daftar yang SAMA dengan yang dibaca kartu
 * kategori (sudah disaring konteks uang), jadi "sudah ada" di sini berarti
 * "sudah terlihat oleh user", bukan sekadar ada di data.
 */
export function budgetSheetMode(
  budgets: BudgetItem[],
  category: string | undefined | null,
): { mode: 'create' | 'edit'; existing?: BudgetItem } {
  const existing = findBudgetByCategory(budgets, category)
  return existing ? { mode: 'edit', existing } : { mode: 'create' }
}

/**
 * Satu-satunya jalur TULIS budget di halaman /budget.
 *
 * Kategori yang sudah ada di konteks itu → barisnya DIPERBARUI (`id` & `spent`
 * tetap, jadi riwayat pengeluaran kategori itu tidak hilang); kategori baru →
 * baris ditambahkan dengan `spent` 0. Karena keputusan ini ada di satu fungsi
 * murni, tidak ada cabang di komponen yang bisa lupa memeriksanya — dan
 * aturannya bisa diuji tanpa browser (dipakai di validasi paket 28).
 *
 * `mode` yang dikembalikan adalah mode yang BENAR-BENAR terjadi. Komponen
 * memakainya untuk memilih toast (dibuat vs diperbarui), bukan untuk menebak.
 *
 * `takenIds` (paket 60): id yang PERNAH dipakai di sesi ini walau barisnya sudah
 * dicabut user (`removeBudget()`). Tanpa daftar itu, id baris yang baru saja
 * dihapus akan dipakai ulang oleh budget berikutnya — dan tombol Undo yang
 * masih hidup bisa memulihkan baris lama ke id yang sekarang milik kategori
 * lain. Daftarnya dikirim halaman sebagai argumen supaya aturannya tetap murni
 * dan bisa diuji tanpa browser; pemanggil lama tidak berubah (`[]` = perilaku
 * lama apa adanya).
 */
export function applyBudgetSave(
  budgets: BudgetItem[],
  data: Omit<BudgetItem, 'id' | 'spent'>,
  takenIds: readonly number[] = [],
): { budgets: BudgetItem[]; mode: 'create' | 'edit'; id: number } {
  const existing = findBudgetByCategory(
    budgets.filter((item) => item.scope === data.scope),
    data.category,
  )

  if (existing) {
    return {
      budgets: budgets.map((item) => (item.id === existing.id ? { ...item, ...data } : item)),
      mode: 'edit',
      id: existing.id,
    }
  }

  /* id tertinggi dihitung dari baris yang MASIH tampil DITAMBAH id yang sudah
     dipensiunkan — inilah yang membuat id tidak pernah dipakai dua kali. */
  const id =
    Math.max(0, ...budgets.map((item) => item.id), ...takenIds) + 1
  return { budgets: [...budgets, { ...data, id, spent: 0 }], mode: 'create', id }
}

/* ── HAPUS BUDGET KATEGORI (paket 60 · 60.1 · AUDIT §4 aturan hapus) ─────────
   Temuan audit: `applyBudgetSave()` cuma punya mode `create`/`edit`, dan di
   seluruh repo tidak ada satu pun fungsi hapus budget. Artinya user bisa
   MEMBUAT target tapi tidak bisa mencabutnya — padahal kategori budget adalah
   janji yang dia pasang sendiri, dan janji yang tidak bisa dibatalkan bukan
   janji.

   Dua hal yang HARUS jujur dan karenanya ditulis di sini, bukan di komponen:

     1. Hapus budget TIDAK mengembalikan uang dan TIDAK mengubah Jatah Harian.
        `limit`/`spent` adalah batas tampilan + angka pacing; yang dihitung dari
        uang sungguhan adalah `lib/money/ledger.ts` (saldo) dan `computeDailyHud()`
        (jatah, dari pemasukan − cicilan − celengan − pengeluaran ledger). Jadi
        mencabut budget hanya mencabut target user — kalimat itu wajib terbaca di
        dialog (`BUDGET_DELETE_COPY.note`) supaya user tidak mengharapkan saldo
        naik.
     2. Undo memulihkan URUTAN aslinya. Karena itu `removed` menyimpan baris dan
        POSISINYA, bukan cuma barisnya: baris yang "dibalikin ke paling bawah"
        akan terlihat seperti budget baru, bukan budget yang sama. */

export interface BudgetRemoval {
  /** daftar tanpa baris yang dicabut (sama persis kalau tidak ada yang cocok) */
  budgets: BudgetItem[]
  /** baris + posisi aslinya; `null` = id tidak ditemukan → TIDAK ada yang berubah */
  removed: { item: BudgetItem; index: number } | null
}

/** cabut satu baris budget dari daftar berdasarkan id (logika murni, teruji). */
export function removeBudget(budgets: BudgetItem[], id: number): BudgetRemoval {
  const index = budgets.findIndex((budget) => budget.id === id)
  /* id asing (mis. baris yang sudah dicabut dari perangkat lain) TIDAK menebak:
     daftarnya dikembalikan apa adanya dan `removed: null` yang mengatakan bahwa
     tidak ada yang berubah. */
  if (index < 0) return { budgets, removed: null }
  return {
    budgets: budgets.filter((budget) => budget.id !== id),
    removed: { item: budgets[index], index },
  }
}

/** Undo hapus: kembalikan baris ke POSISI aslinya. Baris yang id-nya sudah ada
 *  lagi (mis. tombol Undo ditekan dua kali) diabaikan — tidak ada duplikat. */
export function restoreBudget(
  budgets: BudgetItem[],
  removal: { item: BudgetItem; index: number },
): BudgetItem[] {
  if (budgets.some((budget) => budget.id === removal.item.id)) return budgets
  const next = [...budgets]
  const at = Math.min(Math.max(removal.index, 0), next.length)
  next.splice(at, 0, removal.item)
  return next
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

/* ── SATU SUMBER CELENGAN UNTUK KARTU HOME (paket 30) ───────────────────────
   Kartu "Tabungan Impian" di Home dan baris "nutrisi" di widget tanaman harus
   membaca daftar yang SAMA dengan /budget & /budget/<id>. Dulu dua-duanya punya
   daftar tampilan sendiri (nama & nominal yang tidak ada di
   `INITIAL_SINKING_FUNDS`) — akibatnya tautannya cuma bisa menunjuk /budget
   generik, dan label yang tidak bisa ditemukan user di halaman tujuan itu persis
   yang dilarang kanon "jujur di setiap klaim" (PRD 244).

   Dua helper di bawah menjaga itu: SIAPA yang jadi wajah kartu, dan urutan baris
   mini-nya. Keduanya logika murni di lapis data supaya aturan pemilihannya
   terbaca sekali dan bisa dipakai lebih dari satu kartu Home. */

/** bobot "mendesak" prioritas celengan — makin besar makin mendesak. Ditulis
 *  eksplisit (bukan mengandalkan urutan array pil `PRIORITY_OPTIONS`) supaya
 *  mengubah urutan tampilan pil tidak diam-diam mengubah pilihan kartu Home. */
export const PRIORITY_RANK: Record<GoalPriority, number> = {
  rendah: 0,
  sedang: 1,
  tinggi: 2,
  kritis: 3,
}

/** progres tertinggi dalam satu daftar (null kalau daftarnya kosong) */
function highestProgress(funds: SinkingFundItem[]): SinkingFundItem | null {
  return funds.reduce<SinkingFundItem | null>(
    (best, fund) => (best === null || fundPercent(fund) > fundPercent(best) ? fund : best),
    null,
  )
}

/**
 * Celengan yang jadi WAJAH kartu Tabungan Impian di Home.
 *
 * Aturannya (PRD 178–191: kartu ringkasan = nudge, bukan pajangan): prioritas
 * `'kritis'` lebih dulu — kalau ada beberapa, progres tertinggi yang menang;
 * kalau tidak ada yang kritis, progres tertinggi dari SELURUH daftar (bukan
 * "prioritas tertinggi yang ada", karena itu bisa memilih celengan yang baru
 * 10% hanya karena labelnya 'tinggi').
 */
export function heroFundOf(
  funds: SinkingFundItem[] = INITIAL_SINKING_FUNDS,
): SinkingFundItem | null {
  const critical = funds.filter((fund) => fund.priority === 'kritis')
  return highestProgress(critical.length > 0 ? critical : funds)
}

/** urutan baris mini di kartu Home: prioritas dulu (kritis → rendah), lalu
 *  progres tertinggi. Progresnya langsung dari `fundPercent()` — tidak ada
 *  rumus kedua yang bisa berbeda dari halaman detail. */
export function sortFundsByUrgency(
  funds: SinkingFundItem[] = INITIAL_SINKING_FUNDS,
): SinkingFundItem[] {
  return [...funds].sort(
    (a, b) =>
      PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || fundPercent(b) - fundPercent(a),
  )
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
   Tile berwarna brand supaya pemilih dompet terasa hidup, bukan dropdown abu-abu.
   CATATAN (paket 46): daftar ini adalah PILIHAN yang bisa ditekan user di sheet
   "Setor" & "Tanam Celengan" — jangan tambahkan sumber yang bukan dompet di sini.
   Sumber non-dompet (mis. sisa budget dari Sapu Bersih) ada di
   `CONTRIBUTION_SOURCES` di bawah dan HANYA dipakai untuk membaca riwayat. */
export const WALLET_SOURCES: { id: string; name: string; kind: string; tile: string; dot: string }[] = [
  { id: 'bca', name: 'BCA', kind: 'Bank', tile: 'bg-thistle/15 text-thistle ring-thistle/15', dot: 'bg-thistle' },
  { id: 'gopay', name: 'GoPay', kind: 'E-Wallet', tile: 'bg-leaf/15 text-evergreen ring-leaf/15', dot: 'bg-leaf' },
  { id: 'tunai', name: 'Tunai', kind: 'Uang cash', tile: 'bg-cantelope/15 text-cantelope ring-cantelope/15', dot: 'bg-cantelope' },
]

/** id sumber setoran "Sisa budget" — dipakai `sweepIntoFund()` di funds-store */
export const SWEEP_SOURCE_ID = 'sweep'

/**
 * Sumber setoran yang BUKAN dompet — hanya untuk menampilkan riwayat setoran.
 *
 * Sapu Bersih (3G) memindahkan sisa limit kategori ke celengan; uangnya tidak
 * keluar dari satu dompet, jadi baris riwayatnya tidak boleh menyebut BCA/GoPay
 * (itu akan jadi klaim palsu). Ia punya nama sendiri di sini, dan sengaja TIDAK
 * ikut masuk `WALLET_SOURCES` supaya tidak muncul sebagai pilihan dompet di
 * sheet setor.
 */
export const CONTRIBUTION_SOURCES: { id: string; name: string; kind: string; tile: string; dot: string }[] = [
  {
    id: SWEEP_SOURCE_ID,
    name: 'Sisa budget',
    kind: 'Sapu Bersih',
    tile: 'bg-hud-sage/25 text-forest ring-forest/15',
    dot: 'bg-forest',
  },
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
  /**
   * PAKET 60.3 — `pin`/`pinned` DIHAPUS dari sini beserta tombolnya.
   *
   * Tombol "Pin ke Dashboard" dulu hanya membalik `useState` di halaman
   * /budget: `DailyHudCard` di Home tidak menerima prop `pinned` dan tidak
   * membaca penyimpanan apa pun, jadi menekannya TIDAK mengubah satu piksel pun
   * di Dashboard — pelanggaran kanon "jujur di setiap klaim" (PRD 244).
   *
   * Dua jalan keluarnya: (a) menyimpan pin ke konfigurasi uang user dan membuat
   * Home benar-benar menaikkan kartunya, atau (b) menghapus tombolnya. Yang
   * dipilih adalah (b) — lihat laporan 60 §3 untuk alasannya (paket 58 sudah
   * memutuskan urutan kartu Home dan kartu ini memang TURUN ke baris kedua
   * dengan sengaja; pin yang bisa melawan keputusan itu = dua sumber kebenaran
   * untuk satu tata letak). */
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
  /**
   * "BELUM DIATUR" — keadaan yang paling sering terjadi sekarang (paket 57).
   *
   * Dibedakan dari Dry Spell: kalau pemasukan bulanan belum pernah diisi, jatah
   * harian memang TIDAK BISA dihitung dari apa pun — dan menampilkan angka
   * contoh dari konstanta demo adalah klaim palsu yang jadi temuan audit AKAR D.
   * Jadi kartunya jujur menyebut kenapa kosong + satu jalan keluar (Pengaturan).
   */
  notConfiguredTitle: 'Jatah harianmu belum bisa dihitung',
  notConfiguredBody:
    'Atur pemasukanmu dulu biar jatah hariannya benar — angkanya kami hitung dari pemasukan & cicilanmu, bukan dari contoh.',
  notConfiguredCta: 'Atur Pemasukan & Cicilan',
  notConfiguredA11y: 'Pemasukan bulanan belum diatur',
  /** CTA kecil di kartu Jatah Hari Ini /budget (paket 57.4) */
  moneySettingsCta: 'Atur pemasukan & cicilan',
  /** state "jatah ditahan" (saldo tidak cukup memenuhi celengan bulan ini) */
  shortfallBadge: 'Jatah ditahan',
  shortfallCaption: 'jatah harian ditahan',
  shortfallBody:
    '⚠️ Saldo tidak cukup untuk penuhi target celengan bulan ini. Jatah harianmu ditahan.',
  shortfallShortBy: 'Kurang',
  /* netral periode: kewajiban celengan di window non-bulanan memang prorata
     (paket 27), jadi jangan lagi disebut "bulan ini" */
  shortfallObligationLead: 'Celengan periode ini',
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
  /* bar mengukur PEMAKAIAN KOLAM PERIODE (audit Daily Budget), bukan rasio
     harian yang pembilangnya sudah ikut mengurangi penyebutnya sendiri */
  usedCaption: 'terpakai periode ini',
  remainingLead: 'Sisa bulan',
  daysLeftSuffix: 'hari lagi',
  installmentsLead: 'Cicilan terpotong',
  /** pintu mengubah pembagi jatah (pemasukan & cicilan) — selalu tersedia,
   *  bukan cuma saat angka belum diatur (audit "Daily Budget Symptom B") */
  settingsCta: 'Atur pemasukan & cicilan',
  reviewCta: 'Review Pengeluaran Hari Ini',
  status: {
    onTrack: { label: 'On track', ring: '#b5b987', copy: 'Masih banyak ruang periode ini! 🌿' },
    approaching: {
      /* dulu "Hampir habis" — diganti supaya tidak ada kata "habis" (kanon 2B.2:
         nada nurturing, bukan mengancam) */
      label: 'Pelan-pelan',
      ring: '#ffb885',
      copy: 'Pelan-pelan ya, pengeluaranmu jalan lebih cepat dari harinya 🌤️',
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

/* ── COPY MODE ATUR ULANG LIMIT (paket 28) ───────────────────────────────────
   Satu sheet, dua mode. Kalau kategorinya SUDAH punya limit, kalimatnya harus
   berubah — bukan cuma angkanya: "Atur Ulang Limit" berarti user tidak sedang
   membuat baris kedua, dan deskripsinya menegaskan bahwa yang ia lihat memang
   limit yang sudah ada. Ini jawaban jujur untuk jalur insight "Spending Spike:
   Kopi" di /history, yang dulu selalu membuka mode tambah. */
export const BUDGET_EDIT_COPY = {
  title: 'Atur Ulang Limit',
  description: 'Kategori ini sudah punya limit — ubah angkanya ya.',
  submit: 'Simpan Limit ✓',
  /** hint kecil di atas field nominal (jangkar konteks, bukan peringatan) */
  hint: 'Angka lama sudah terisi, jadi kamu cuma perlu menyesuaikan.',
} as const

/* ── TOAST SIMPAN BUDGET — create vs edit ────────────────────────────────────
   Dua kalimat yang sengaja BEDA supaya user tahu baris barunya tidak digandakan:
   "dibuat" untuk kategori baru, "diperbarui" untuk limit yang diubah. Ditulis di
   sini (bukan di JSX) mengikuti aturan copy repo ini. */
export const BUDGET_SAVE_TOAST = {
  created: (category: string) => `Budget ${category} dibuat! 🌿`,
  createdBody: (limitLabel: string) => `${limitLabel} siap kamu jaga bersama.`,
  updated: (category: string) => `Limit ${category} diperbarui 🌿`,
  updatedBody: (limitLabel: string) => `Baris yang sama — sekarang limitnya ${limitLabel}.`,
} as const

/* ── COPY HAPUS BUDGET KATEGORI (paket 60 · 60.1) ────────────────────────────
   Pola yang sama dengan hapus tagihan (`CONFIRM_DELETE_BILL_COPY`): tolak dulu,
   baru boleh jalan, dan sesudahnya masih ada Undo.

   BAGIAN TERPENTINGNYA adalah `note` — satu kalimat yang menjawab "apa yang
   TIDAK hilang". Membaca "Hapus budget Kopi?" saja bisa membuat user menduga
   saldo/jatah hariannya berubah, padahal limit budget bukan uang. Kalimat itu
   tinggal di sini (bukan dikarang di JSX) supaya halaman mana pun yang kelak
   menambah pintu hapus budget memakai penjelasan yang sama. */
export const BUDGET_DELETE_COPY = {
  overlay: 'Batal hapus budget',
  title: 'Hapus budget ini?',
  body: (category: string, periodWord: string) =>
    `Limit ${periodWord} untuk ${category} bakal dicabut dari daftar.`,
  /** apa yang TIDAK ikut hilang — catatan asli, saldo, dan Jatah Harian */
  note:
    'Ini cuma mencabut target yang kamu pasang sendiri. Saldo dompet dan Jatah Harian TIDAK berubah — keduanya dihitung dari catatan pengeluaranmu, bukan dari limit ini.',
  safety: (seconds: number) => `Masih bisa kamu balikin lewat tombol Undo selama ${seconds} detik.`,
  cancel: 'Batal',
  confirm: 'Hapus',
} as const

export const BUDGET_DELETE_TOAST = {
  title: (category: string) => `Budget ${category} dicabut`,
  description: 'Saldo & Jatah Harian tidak berubah — limitnya saja yang dilepas.',
  undo: 'Undo',
  undoneTitle: 'Budget dikembalikan 🌱',
  undoneDescription: 'Limitnya balik ke posisi semula di daftar.',
  /** jaring pengaman kalau Undo ditekan setelah jendelanya tutup */
  expired: 'Jendela Undo-nya sudah lewat — budget ini bisa kamu buat lagi kapan aja 🌱',
} as const

/** tombol hapus di kartu kategori (dipakai `aria-label` + tooltip, jadi tidak
 *  ada tombol ikon tanpa nama) */
export const BUDGET_CARD_ACTION_COPY = {
  delete: (category: string) => `Hapus budget ${category}`,
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
  /** halaman detail dibuka dari id yang belum ada di perangkat ini — HOT di
   *  client (`useFundsStore`) karena celengan baru hidup di store perangkat,
   *  bukan di konstanta `lib/data/*`. Kopi jujur, bukan "Error 404". */
  notFoundBody:
    'Celengan ini nggak ada di perangkatmu. Kalau kamu baru menanamnya di perangkat lain, celengannya belum ikut ke sini — cek daftar di halaman Budget & Target.',
  notFoundCta: 'Lihat daftar celengan',
  /** jeda singkat saat id belum dikenal & store perangkat belum selesai dibaca.
   *  Tanpa copy ini, celengan buatan user sempat terlihat "tidak ditemukan". */
  loadingLabel: 'Menyiapkan celenganmu…',
} as const

/** toast halaman /budget setelah celengan baru disimpan (4C "Tanam Celengan") */
export const FUND_CREATE_TOAST = {
  title: 'Celengan baru ditanam! 🌱',
  body: (name: string) => `${name} siap dikejar — setor kapan aja ya.`,
} as const

/** toast 3G "Sapu Bersih" setelah sisa limit dipindahkan ke celengan */
export const FUND_SWEEP_TOAST = {
  title: (amountLabel: string, name: string) => `${amountLabel} disapu ke ${name}! 🧹🎉`,
  body: 'Sisa limit kategori periode ini dianggap terpakai, jadi bulan depan mulai dari nol lagi.',
} as const

/* ── COPY HAPUS CELENGAN (paket 60 · 60.2 · temuan audit #4) ─────────────────
   Celengan punya EFEK UANG yang tidak kelihatan: `sinkingObligationOf()` memotong
   "nabung Rp X/bulan" dari kolam SEBELUM jatah harian dibagi
   (`lib/data/budget.ts`: `computeDailyHud()`), jadi mencabut satu celengan
   MENAIKKAN Jatah Harian. Menghapus tanpa mengatakan itu = user melihat jatah
   hariannya berubah tanpa sebab yang bisa ia baca — persis jenis "angka bohong"
   yang diaudit paket 57–62.

   Tiga fakta yang harus terbaca SEBELUM user menekan Hapus:
     1. targetnya hilang dari daftar (badan dialog);
     2. uang yang sudah disetor TIDAK kembali ke dompet (`cashNote`) — riwayat
        setorannya tetap tersimpan karena uangnya memang sudah keluar;
     3. dampaknya ke Jatah Harian, dengan nominalnya (`obligationNote`), atau
        alasannya kenapa TIDAK berubah (`noObligationNote` — kewajiban bulan ini
        sudah disetor / targetnya sudah penuh). */
export const FUND_DELETE_COPY = {
  overlay: 'Batal hapus celengan',
  title: 'Hapus celengan ini?',
  body: (name: string) => `${name} bakal keluar dari daftar Celengan Impian.`,
  /** uang yang sudah keluar dari dompet tidak kembali karena catatannya dihapus */
  cashNote:
    'Uang yang sudah kamu setor TIDAK kembali ke dompet — catatan setorannya tetap tersimpan, karena uangnya memang sudah keluar.',
  /** dampak NYATA ke Jatah Hari Ini, lengkap nominalnya */
  obligationNote: (releasedLabel: string) =>
    `Kewajiban ${releasedLabel}/bulan yang tadi dipotong dari Jatah Hari Ini akan dilepas — jadi jatah harianmu naik setelah ini.`,
  /** kenapa jatah harian TIDAK berubah (kewajiban bulan ini sudah lunas / target penuh) */
  noObligationNote:
    'Celengan ini tidak punya kewajiban bulanan yang masih ditagih (sudah kamu setor bulan ini atau targetnya sudah penuh), jadi Jatah Hari Ini tidak berubah.',
  /**
   * Wajah ketiga halaman /budget/<id>: celengannya SUDAH dihapus user sementara
   * halaman ini masih terbuka (jendela Undo belum tutup). Tanpa kalimat ini,
   * halaman detail akan jatuh ke "Celengan tidak ditemukan" — padahal user baru
   * saja menghapusnya sendiri, dan jalan kembalinya masih ada di toast Undo.
   */
  removedTitle: 'Celengan ini sudah dihapus',
  removedBody:
    'Targetnya sudah dilepas dari daftar. Kalau ini salah tekan, pakai tombol Undo di notifikasi bawah untuk mengembalikannya.',
  /**
   * Setoran ditolak karena celengannya sudah tidak ada (dihapus di tempat lain
   * selagi sheet-nya terbuka). Store menolak menulis — dan penolakan itu HARUS
   * terdengar, bukan diam-diam tidak terjadi apa-apa.
   */
  goneNote: 'Celengan ini sudah tidak ada di daftarmu, jadi setorannya tidak ditulis. Muat ulang halamannya ya 🌱',
  safety: (seconds: number) => `Masih bisa kamu balikin lewat tombol Undo selama ${seconds} detik.`,
  cancel: 'Batal',
  confirm: 'Hapus',
} as const

export const FUND_DELETE_TOAST = {
  title: (name: string) => `Celengan ${name} dicabut`,
  description: 'Uang yang sudah disetor tetap tercatat — yang dilepas cuma targetnya.',
  undo: 'Undo',
  undoneTitle: 'Celengan dikembalikan 🌱',
  undoneDescription: 'Target & progresnya balik seperti semula, begitu juga jatah harianmu.',
  /** jaring pengaman kalau Undo ditekan setelah jendelanya tutup */
  expired: 'Jendela Undo-nya sudah lewat — celengan ini bisa kamu tanam lagi kapan aja 🌱',
} as const

/** aria-label tombol hapus di kartu celengan & di halaman detail (tidak ada
 *  tombol ikon tanpa nama) */
export const FUND_CARD_ACTION_COPY = {
  delete: (name: string) => `Hapus celengan ${name}`,
  /** label tombol yang terlihat di halaman detail */
  deleteLabel: 'Hapus celengan',
  deleteHint: 'Target & progresnya dilepas — uang yang sudah disetor tetap tercatat.',
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

/** uang keluar HARI INI versi KANON DEMO — satu sumber untuk ring "terpakai" di
 *  kartu Jatah Hari Ini (Home) dan panel review di /budget SEBELUM paket 57.
 *
 *  Sejak paket 57 kartu Home memakai uang keluar NYATA dari ledger
 *  (`spentOn(recordedTransactions(snapshot), todayIso)`) dan panel review menerima
 *  `txs` + `todayISO` dari halaman, jadi konstanta ini TIDAK lagi menjadi sumber
 *  angka di komponen — ia tinggal sebagai patokan angka demo (85.000/hari) dan
 *  default test. */
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

/** persen progres SIAP TAMPIL (bulat 0–100). Dibulatkan di lapis data supaya
 *  kartu yang menampilkan celengan yang sama tidak pernah beda angka karena
 *  membulatkan sendiri-sendiri (nudge hero Home, baris mini, dan bar "menuju
 *  tahap berikutnya" di widget tanaman memakai angka ini). */
export function fundPercentRounded(fund: SinkingFundItem): number {
  return Math.round(fundPercent(fund))
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

/** entri sumber setoran (tile warna + dot) untuk baris riwayat setoran.
 *  Mencakup sumber non-dompet (`CONTRIBUTION_SOURCES`, mis. "Sisa budget") supaya
 *  baris Sapu Bersih tidak pernah tampil sebagai dompet yang salah. */
export function walletSourceById(walletId: string) {
  return (
    WALLET_SOURCES.find((source) => source.id === walletId) ??
    CONTRIBUTION_SOURCES.find((source) => source.id === walletId) ??
    null
  )
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

