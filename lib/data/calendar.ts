import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDate,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { MONTHLY_INCOME, type BudgetScope } from './budget'
import type { MoneyContext, TransactionType } from '../types'
import { matchesContext, tagTransactionsForContext, type ContextTransaction, type RowContext } from '../money/context-filter'
import { recordedTransactions, type MoneySnapshot } from '../money/store'
import { localISODate, mulberry32 } from './history'

/* ── Kalender Cashflow (/app/calendar) ───────────────────────────────────────
   Satu sumber data + logika murni (TANPA React) untuk halaman Kalender, persis
   pola `lib/data/bills.ts` & `lib/data/history.ts`:

     1. Kontrak data transaksi kalender (hanya tipe — tidak ada status ramalan).
     2. Matematika GRID GAJIAN — inti halaman ini (lihat `periodBounds`).
     3. Klasifikasi heatmap harian yang memisahkan belanja impulsif (boleh
        merah) dari tagihan terjadwal (WAJIB netral) — lihat `calendarTone`.
     4. Data mock DETERMINISTIK (seeded PRNG + seri tagihan tetap) supaya HTML
        server & render pertama client identik → tidak ada hydration mismatch.
     5. Jembatan dari LEDGER (paket 49): baris catatan sungguhan
        (`recordedTransactions()`) diterjemahkan jadi entri grid lewat
        `calendarEntriesFromLedger()` — halaman Kalender membaca, tidak menulis.
     6. TANPA RAMALAN (paket 56): grid hanya menggambar uang yang sudah terjadi —
        entri demo dipotong di hari ini (`buildCalendarEntries()`), tidak ada
        status `upcoming_forecast`, dan tidak ada angka tagihan masa depan yang
        belum dibayar. Kewajiban yang belum dibayar rumahnya di `/bills`.

   Kenapa pustaka tanggal: matematika siklus gajian gampang salah kalau diketik
   manual (bulan 28/29/30/31 hari, geser lintas tahun). `date-fns` dipakai untuk
   SEMUA aritmetika tanggal & penamaan hari/bulan berbahasa Indonesia
   (`locale` id) — bukan `Intl`, bukan `toLocaleDateString()`.

   Catatan "hari ini": dipatok KONSTAN `CALENDAR_TODAY_ISO` (25 Sep 2026) sama
   seperti halaman Tagihan. Tiga manfaat: (1) server & client selalu sepakat soal
   "masa depan vs masa lalu"; (2) demo bisa dipindah tanggal dengan satu baris;
   (3) seluruh entri demo dipotong di tanggal ini, jadi grid tidak pernah
   menampilkan uang yang belum terjadi (paket 56).
   ────────────────────────────────────────────────────────────────────────── */

/* ── KONTRAK DATA ─────────────────────────────────────────────────────────── */

/**
 * `variable_expense` — belanja harian yang bisa dikendalikan (makan, kopi,
 *                      transport, jajan, shopping). INI satu-satunya jenis yang
 *                      boleh memicu warna defisit/merah.
 * `fixed_bill`       — tagihan terjadwal yang sudah direncanakan (kos, cicilan,
 *                      langganan). TIDAK PERNAH bikin sel merah.
 * `income`           — uang masuk.
 * `money_movement`   — pindah dana (transfer antar dompet / setor tabungan).
 *                      Net worth tidak berubah, jadi dikecualikan dari hitungan
 *                      heatmap — sama seperti chip biru "⇄ pindah dana" di
 *                      halaman Riwayat.
 */
export type CalendarEntryType =
  | 'variable_expense'
  | 'fixed_bill'
  | 'income'
  | 'money_movement'

/* PAKET 56 — status entri DIHAPUS TOTAL.
   Dulu setiap entri membawa `status: 'cleared' | 'upcoming_forecast'`, dan
   seluruh entri demo bertanggal setelah hari ini lahir sebagai ramalan
   (`statusFor()`). Sekarang satu entri hanya berarti satu hal: uang yang SUDAH
   terjadi — catatan user, transaksi store, atau riwayat demo ≤ hari ini. Field
   yang nilainya cuma bisa satu adalah janji palsu, jadi ia tidak dibiarkan. */

export interface CalendarEntry {
  id: string
  /** tanggal lokal `YYYY-MM-DD` */
  date: string
  name: string
  /** selalu angka positif — arah uang ditentukan `type` */
  amount: number
  type: CalendarEntryType
  category: string
  wallet: string
  /** emoji identitas — dipakai sebagai ikon kecil di sel kalender */
  emoji: string
  /** jam lokal `HH:MM` (hanya untuk entri yang sudah tercatat) */
  time?: string
  /**
   * Konteks uang entri ini (paket 47) — Pribadi / Keluarga / Bersama.
   *
   * Entri kalender adalah baris PAJANGAN (bukan baris ledger), jadi konteksnya
   * datang dari definisi serinya: tiap seri mock sudah ditulis sebagai milik
   * konteks tertentu (kos = pribadi, WiFi rumah = bersama, belanja sayur =
   * keluarga). Halaman Kalender menyaring entri dengan kolom ini, sementara
   * ringkasan periode tetap menghitung seluruh periode (kanon paket 47:
   * konteks menyaring daftar & arus, bukan total).
   */
  scope: BudgetScope
  /**
   * Konteks SEBENARNYA untuk entri TURUNAN dari ledger (paket 49) — dibaca dari
   * dompet barisnya, dan bisa `'unknown'` (dompet belum ada di daftar dompet →
   * tetap tampil di semua konteks, kanon #2 paket 47).
   *
   * Entri MOCK (`CALENDAR_ENTRIES`) tidak punya kolom ini: konteksnya memang
   * ditulis tangan di definisi serinya (`scope`). Penyaringan memakai
   * `calendarEntryVisible()` supaya keduanya tidak punya dua aturan saring.
   */
  context?: RowContext
}

/** mode periode grid: bulan kalender penuh vs siklus gajian */
export type PeriodMode = 'standard' | 'payday'

/**
 * Nada dasar sebuah sel (SATU latar per sel, prioritas: defisit → surplus →
 * tagihan tetap → biasa). Penanda lain (🌱 hari bersih) MENEMPEL di atas nada
 * ini, bukan menggantikannya.
 *
 * PAKET 56: 'planned' bukan lagi "hari masa depan berisi ramalan" — ia berarti
 * hari yang isinya MURNI tagihan tetap yang sudah tercatat (lihat calendarTone).
 */
export type CalendarTone = 'none' | 'surplus' | 'deficit' | 'planned'

export interface CalendarCell {
  /** tanggal lokal `YYYY-MM-DD` */
  date: string
  /** tanggal 1–31 */
  day: number
  /** 0 = Senin … 6 = Minggu */
  weekday: number
  /** singkatan bulan (`Agt`) — dipakai di tepi periode saat lintas bulan */
  monthShort: string
  /** true = tanggal ini memang bagian dari periode yang sedang dibaca */
  inPeriod: boolean
  /** true = masih di bulan yang sama dengan jangkar navigator */
  inAnchorMonth: boolean
  isToday: boolean
  isPast: boolean
  isFuture: boolean
  isWeekend: boolean
  /** selisih hari terhadap hari ini: negatif = sudah lewat, 0 = hari ini */
  daysFromToday: number
  income: number
  /** belanja variabel (pemicu defisit) */
  variableSpend: number
  /** tagihan terjadwal (tidak pernah memicu defisit) */
  fixedSpend: number
  totalSpend: number
  net: number
  /** pindah dana — tidak dihitung di angka mana pun */
  moved: number
  /** semua uang tercatat di tanggal ini — tidak ada daftar kedua untuk ramalan */
  entries: CalendarEntry[]
  tone: CalendarTone
  /** true = hari itu NOL belanja variabel → benih 🌱 (gamifikasi) */
  cleanDay: boolean
  /** panjang rentetan hari bersih yang berakhir di tanggal ini */
  streak: number
  /** emoji entri tercatat di tanggal ini (maks 3) */
  markers: string[]
}

/* ── KONSTANTA ────────────────────────────────────────────────────────────── */

/** "Hari ini" versi DATA SEED — jangkar DEFAULT untuk render server & test.
 *
 *  PAKET 57: layar TIDAK lagi memakai konstanta ini. `cashflow-calendar-screen`
 *  mengirim `todayIso` hasil `useTodayISO()` ke `buildCalendarGrid()` &
 *  `buildCalendarEntries()`, dan menyusun `CALENDAR_TODAY` dari tanggal itu —
 *  supaya sel "hari ini", tombol "Hari Ini", dan `defaultAnchorFor()` memakai
 *  tanggal perangkat, bukan 25 Sep yang dipatok. Data seed-nya tetap
 *  bertanggal tetap (demo stabil, bebas hydration mismatch). */
export const CALENDAR_TODAY_ISO = '2026-09-25'
export const CALENDAR_TODAY = parseISO(CALENDAR_TODAY_ISO)

/** tanggal gajian default (dari Pengaturan; onboarding menyimpan ini) */
export const DEFAULT_PAYDAY_DATE = 25

/** kepala kolom grid — Senin lebih dulu (konsisten dengan heatmap Riwayat) */
export const CALENDAR_WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] as const

/** ambang "lonjakan": sekian kali rata-rata hari aktif (dipakai `calendarTone`) */
export const DEFICIT_SPIKE_RATIO = 1.6
/** lantai absolut — hari dengan belanja kecil tidak pernah disebut "boros" */
export const DEFICIT_MIN_AMOUNT = 150_000
/** rentetan hari bersih yang dianggap milestone (glow emas di sel) */
export const CLEAN_STREAK_MILESTONE = 3

/* ── MATEMATIKA SIKLUS GAJIAN (INTI HALAMAN) ─────────────────────────────── */

/** tanggal `day` pada bulan `anchor`, dikunci ke jumlah hari bulan itu */
function dayInMonth(anchor: Date, day: number): Date {
  const last = getDate(endOfMonth(anchor))
  const safe = Math.min(Math.max(Math.round(day), 1), last)
  return new Date(anchor.getFullYear(), anchor.getMonth(), safe)
}

export interface PeriodBounds {
  start: Date
  end: Date
}

/**
 * BATAS PERIODE — inilah "payday grid shift" yang diminta PRD.
 *
 * • `standard` → 1 s/d akhir bulan berjalan.
 * • `payday`   → MULAI dari tanggal gajian BULAN SEBELUMNYA, SELESAI di
 *                (tanggal gajian − 1) bulan berjalan.
 *                Contoh: jangkar September 2026 + gajian tgl 25 →
 *                grid 25 Agu 2026 s/d 24 Sep 2026.
 *
 * Agar "gajian tgl 25, hari ini tgl 25" tidak membuka siklus yang BARU SAJA
 * SELESAI, jangkar awalnya dihitung `cycleAnchorFor()` — aturan gridnya tetap
 * sama persis, hanya siklus mana yang ditampilkan yang bergeser.
 */
export function periodBounds(
  anchor: Date,
  mode: PeriodMode,
  paydayDate: number = DEFAULT_PAYDAY_DATE,
): PeriodBounds {
  if (mode === 'standard') {
    return { start: startOfMonth(anchor), end: endOfMonth(anchor) }
  }
  const previous = subMonths(anchor, 1)
  const start = dayInMonth(previous, paydayDate)
  /* akhir siklus = sehari sebelum gajian bulan berikutnya (aman utk tgl 28–31) */
  const end = addDays(addMonths(start, 1), -1)
  return { start, end }
}

/**
 * Siklus gajian yang MEMUAT sebuah tanggal. Siklus berlabel bulan M membentang
 * dari gajian bulan M−1 sampai (gajian−1) bulan M, jadi tanggal ≥ gajian masuk
 * siklus bulan depan — 25 Sep (gajian tgl 25) ada di siklus label Oktober
 * (25 Sep → 24 Okt).
 */
export function cycleAnchorFor(date: Date, paydayDate: number = DEFAULT_PAYDAY_DATE): Date {
  return getDate(date) >= paydayDate ? addMonths(date, 1) : date
}

/** true kalau `iso` ada di dalam `bounds` (perbandingan string = aman timezone) */
export function isWithinPeriod(iso: string, bounds: PeriodBounds): boolean {
  return iso >= localISODate(bounds.start) && iso <= localISODate(bounds.end)
}

/** jangkar awal saat halaman dibuka / saat mode periode ditukar */
export function defaultAnchorFor(
  date: Date,
  mode: PeriodMode,
  paydayDate: number = DEFAULT_PAYDAY_DATE,
): Date {
  return mode === 'payday' ? cycleAnchorFor(date, paydayDate) : date
}

/** geser jangkar satu bulan (±1) — dipakai tombol ‹ › navigator */
export function shiftAnchor(anchor: Date, months: number): Date {
  return addMonths(anchor, months)
}

/** label navigator: `September 2026` atau `Siklus 25 Sep – 24 Okt 2026` */
export function periodLabel(
  anchor: Date,
  mode: PeriodMode,
  paydayDate: number = DEFAULT_PAYDAY_DATE,
): string {
  if (mode === 'standard') return format(anchor, 'MMMM yyyy', { locale: localeId })
  const { start, end } = periodBounds(anchor, mode, paydayDate)
  return `Siklus ${format(start, 'd MMM', { locale: localeId })} – ${format(end, 'd MMM yyyy', {
    locale: localeId,
  })}`
}

/** `2026-09-25` → `Kamis, 25 Sep 2026` (judul Micro Inspector) */
export function longDateLabel(iso: string): string {
  return format(parseISO(iso), 'EEEE, d MMM yyyy', { locale: localeId })
}

/** `2026-09-25` → `25 Sep` (kepala hari di daftar transaksi) */
export function shortDateLabel(iso: string): string {
  return format(parseISO(iso), 'd MMM', { locale: localeId })
}

/**
 * Rentang tanggal yang benar-benar dirender grid — ditulis di bawah navigator
 * supaya mode siklus gajian tidak pernah ambigu:
 *   standard → `1 – 30 September 2026`
 *   payday   → `25 Agustus – 24 September 2026`
 */
export function periodRangeLabel(
  anchor: Date,
  mode: PeriodMode,
  paydayDate: number = DEFAULT_PAYDAY_DATE,
): string {
  const { start, end } = periodBounds(anchor, mode, paydayDate)
  if (mode === 'standard') {
    return `1 – ${format(end, 'd MMMM yyyy', { locale: localeId })}`
  }
  return `${format(start, 'd MMMM', { locale: localeId })} – ${format(end, 'd MMMM yyyy', {
    locale: localeId,
  })}`
}

/* ── KLASIFIKASI HEATMAP (PEMISAH IMPULSIF vs TERENCANA) ─────────────────── */

export interface DayMetrics {
  income: number
  /** total belanja VARIABEL saja */
  variableSpend: number
  /** total tagihan TERJADWAL saja */
  fixedSpend: number
}

/**
 * Warna dasar satu sel.
 *
 * ATURAN EMAS — "THE RENT PENALTY FIX":
 * `fixedSpend` TIDAK PERNAH masuk perhitungan cabang `deficit`. Hari yang
 * pengeluarannya besar cuma karena Kos/cicilan (uang yang memang sudah
 * direncanakan) MUSTAHIL berwarna merah; ia jatuh ke `planned` (latar netral
 * abu tipis) atau `surplus` kalau ada gajian di hari yang sama. Yang boleh merah
 * hanya `variableSpend` yang melonjak di atas ambang — jajan/kopi/shopping.
 *
 * Prioritas: defisit → surplus → tagihan tetap → biasa.
 *
 * PAKET 56: cabang "masa depan tidak dihakimi" DIHAPUS bersama ramalan. Grid
 * sekarang hanya berisi uang yang sudah terjadi, jadi hari mendatang yang kosong
 * jatuh ke 'none' (netral) dengan sendirinya — bukan karena aturan khusus untuk
 * masa depan. 'planned' hanya lahir dari tagihan tetap yang SUDAH tercatat.
 */
export function calendarTone(metrics: DayMetrics, deficitThreshold: number): CalendarTone {
  /* 1. belanja impulsif melonjak (tagihan terjadwal tidak ikut dihitung) */
  if (metrics.variableSpend > 0 && metrics.variableSpend >= deficitThreshold) return 'deficit'
  /* 2. uang masuk menutup seluruh pengeluaran hari itu */
  const spend = metrics.variableSpend + metrics.fixedSpend
  if (metrics.income > 0 && metrics.income >= spend) return 'surplus'
  /* 3. hari yang pengeluarannya murni tagihan terjadwal → netral, tidak dihukum */
  if (metrics.fixedSpend > 0 && metrics.variableSpend === 0) return 'planned'
  return 'none'
}

/**
 * Rata-rata belanja variabel per HARI AKTIF (hari yang memang ada belanja
 * variabel). Hari nol belanja sengaja tidak dipakai sebagai pembagi supaya
 * liburan hemat tidak menurunkan ambang "boros" dan bikin semua hari merah.
 */
export function variableDailyAverage(cells: CalendarCell[]): number {
  const active = cells.filter((cell) => cell.inPeriod && cell.isPast && cell.variableSpend > 0)
  if (active.length === 0) return 0
  return active.reduce((sum, cell) => sum + cell.variableSpend, 0) / active.length
}

/** ambang defisit = maks(rata-rata × 1,6 ; Rp 150.000) */
export function deficitThresholdFor(cells: CalendarCell[]): number {
  return Math.max(DEFICIT_MIN_AMOUNT, variableDailyAverage(cells) * DEFICIT_SPIKE_RATIO)
}

/* ── PEMBENTUKAN GRID ────────────────────────────────────────────────────── */

interface CellTotals {
  income: number
  variableSpend: number
  fixedSpend: number
  moved: number
  entries: CalendarEntry[]
}

/**
 * Akumulasi entri per tanggal.
 *
 * PAKET 56: tidak ada lagi keranjang `forecast`. Setiap entri yang tiba di sini
 * adalah uang yang SUDAH tercatat (catatan user, transaksi store, riwayat demo),
 * jadi tidak ada yang perlu dipisah antara "fakta" dan "ramalan" — pemisahan itu
 * yang dulu membuat sel bertanggal masa depan menampilkan angka yang belum
 * terjadi. Aturan lamanya (`status === 'upcoming_forecast'`) ikut dihapus.
 */
function totalsByDate(entries: CalendarEntry[]) {
  const map = new Map<string, CellTotals>()
  for (const entry of entries) {
    const bucket =
      map.get(entry.date) ??
      ({
        income: 0,
        variableSpend: 0,
        fixedSpend: 0,
        moved: 0,
        entries: [],
      } satisfies CellTotals)

    bucket.entries.push(entry)
    if (entry.type === 'income') bucket.income += entry.amount
    else if (entry.type === 'fixed_bill') bucket.fixedSpend += entry.amount
    else if (entry.type === 'variable_expense') bucket.variableSpend += entry.amount
    else bucket.moved += entry.amount
    map.set(entry.date, bucket)
  }
  return map
}

const EMPTY_TOTALS: CellTotals = {
  income: 0,
  variableSpend: 0,
  fixedSpend: 0,
  moved: 0,
  entries: [],
}

export interface CalendarGrid {
  cells: CalendarCell[]
  weeks: CalendarCell[][]
  bounds: PeriodBounds
  /** jumlah hari dalam periode (28–31) */
  periodLength: number
  /** rata-rata belanja variabel per hari aktif — dipakai di legend/kartu */
  dailyAverage: number
  /** ambang yang membuat sebuah hari disebut defisit */
  deficitThreshold: number
}

/**
 * Susun matriks kalender 7 kolom (Senin–Minggu). Rentang barisnya dibulatkan ke
 * minggu penuh, lalu sel di luar periode ditandai `inPeriod: false` supaya
 * komponen grid bisa menampilkannya kelabu tanpa ikut dihitung statistik.
 */
export function buildCalendarGrid({
  entries,
  anchor,
  mode,
  paydayDate = DEFAULT_PAYDAY_DATE,
  todayIso = CALENDAR_TODAY_ISO,
}: {
  entries: CalendarEntry[]
  anchor: Date
  mode: PeriodMode
  paydayDate?: number
  todayIso?: string
}): CalendarGrid {
  const bounds = periodBounds(anchor, mode, paydayDate)
  const totals = totalsByDate(entries)
  const startIso = localISODate(bounds.start)
  const endIso = localISODate(bounds.end)

  const allDays = eachDayOfInterval({
    start: startOfWeek(bounds.start, { weekStartsOn: 1 }),
    end: endOfWeek(bounds.end, { weekStartsOn: 1 }),
  })

  const anchorMonthKey = format(anchor, 'yyyy-MM')
  const cells: CalendarCell[] = allDays.map((date) => {
    const iso = localISODate(date)
    const bucket = totals.get(iso) ?? EMPTY_TOTALS
    const inPeriod = iso >= startIso && iso <= endIso
    const isFuture = iso > todayIso
    return {
      date: iso,
      day: getDate(date),
      weekday: (date.getDay() + 6) % 7,
      monthShort: format(date, 'MMM', { locale: localeId }),
      inPeriod,
      inAnchorMonth: format(date, 'yyyy-MM') === anchorMonthKey,
      isToday: iso === todayIso,
      isPast: !isFuture,
      isFuture,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      daysFromToday: differenceInCalendarDays(date, parseISO(todayIso)),
      income: bucket.income,
      variableSpend: bucket.variableSpend,
      fixedSpend: bucket.fixedSpend,
      totalSpend: bucket.variableSpend + bucket.fixedSpend,
      net: bucket.income - bucket.variableSpend - bucket.fixedSpend,
      moved: bucket.moved,
      entries: bucket.entries,
      /* diisi di langkah kedua — butuh rata-rata seluruh periode dulu */
      tone: 'none',
      cleanDay: false,
      streak: 0,
      markers: bucket.entries
        .map((entry) => entry.emoji)
        .filter(Boolean)
        .slice(0, 3),
    }
  })

  const dailyAverage = variableDailyAverage(cells)
  const deficitThreshold = deficitThresholdFor(cells)
  const days = cells.filter((cell) => cell.inPeriod)

  /* rentetan hari bersih: berapa hari beruntun tanpa belanja variabel yang
     berakhir tepat di tanggal ini (hanya dihitung sampai hari ini) */
  let streak = 0
  const streakByDate = new Map<string, number>()
  for (const cell of days) {
    if (!cell.isPast) continue
    streak = cell.variableSpend === 0 ? streak + 1 : 0
    streakByDate.set(cell.date, streak)
  }

  for (const cell of cells) {
    if (!cell.inPeriod) continue
    cell.tone = calendarTone(
      {
        income: cell.income,
        variableSpend: cell.variableSpend,
        fixedSpend: cell.fixedSpend,
      },
      deficitThreshold,
    )
    cell.cleanDay = cell.isPast && cell.variableSpend === 0
    cell.streak = streakByDate.get(cell.date) ?? 0
  }

  const weeks: CalendarCell[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return { cells, weeks, bounds, periodLength: days.length, dailyAverage, deficitThreshold }
}

/* ── DATA MOCK DETERMINISTIK ─────────────────────────────────────────────────
   Dua lapis sengaja dipisah supaya cerita finansialnya jelas terbaca:
     A. SERI TETAP (tanggal/jumlahnya ditulis tangan): gaji, freelance, kos,
        cicilan, langganan, setoran tabungan, dan 3 hari "kalap belanja".
        → inilah yang memunculkan contoh "The Rent Penalty Fix" (tgl 1 & 5
          besar tapi NETRAL) dan hari defisit yang memang impulsif.
     B. BELANJA RUTIN (seeded PRNG): kopi, warteg, ojol, sayur.
        → bikin grid terasa hidup tanpa `Math.random()` yang merusak SSR.
   ────────────────────────────────────────────────────────────────────────── */

/** jendela data: cukup untuk menutup bulan standar & siklus gajian di sekitarnya */
const DATA_WINDOW_START = '2026-07-01'
const DATA_WINDOW_END = '2026-11-30'

/** tagihan berulang — sumbernya sama dengan halaman Tagihan Rutin.
 *  `scope` (paket 47) menentukan konteks uangnya, jadi Kalender bisa disaring
 *  per Pribadi/Keluarga/Bersama sementara ringkasan periode tetap utuh. */
const FIXED_BILL_SERIES: {
  name: string
  emoji: string
  amount: number
  day: number
  category: string
  wallet: string
  scope: BudgetScope
}[] = [
  { name: 'Kos Bulanan', emoji: '🏠', amount: 1_500_000, day: 1, category: 'Tempat Tinggal', wallet: 'BCA', scope: 'pribadi' },
  { name: 'Cicilan Motor', emoji: '🏍️', amount: 850_000, day: 5, category: 'Cicilan', wallet: 'BCA', scope: 'pribadi' },
  { name: 'IndiHome', emoji: '📶', amount: 350_000, day: 10, category: 'Tagihan', wallet: 'BCA', scope: 'bersama' },
  { name: 'Netflix', emoji: '🎬', amount: 54_000, day: 15, category: 'Hiburan', wallet: 'GoPay', scope: 'keluarga' },
  { name: 'Spotify', emoji: '🎵', amount: 55_000, day: 15, category: 'Hiburan', wallet: 'GoPay', scope: 'pribadi' },
  { name: 'Asuransi Jiwa', emoji: '🛡️', amount: 250_000, day: 20, category: 'Asuransi', wallet: 'BCA', scope: 'keluarga' },
  { name: 'Cicilan HP', emoji: '📱', amount: 600_000, day: 22, category: 'Cicilan', wallet: 'GoPay', scope: 'pribadi' },
  { name: 'Kredivo', emoji: '💳', amount: 420_000, day: 28, category: 'Cicilan', wallet: 'OVO', scope: 'pribadi' },
]

/** uang masuk tetap: gaji tiap tgl 25 + freelance tiap tgl 12.
 *
 *  PAKET 57: nominal GAJI membaca kanon demo yang sama dengan Daily HUD
 *  (`MONTHLY_INCOME` di `lib/data/budget.ts`) — dulu di sini tertulis 8.500.000
 *  sementara HUD memakai 7.500.000, sehingga halaman Kalender & kartu Jatah
 *  Harian menyebut dua gaji berbeda untuk user yang sama (temuan AKAR C audit
 *  2026-09). Turunkan/naikkan `MONTHLY_INCOME`, dan keduanya bergerak bersama. */
const INCOME_SERIES: {
  name: string
  emoji: string
  amount: number
  day: number
  category: string
  wallet: string
  scope: BudgetScope
}[] = [
  { name: 'Gaji Bulanan', emoji: '💰', amount: MONTHLY_INCOME, day: 25, category: 'Gaji', wallet: 'BCA', scope: 'pribadi' },
  { name: 'Proyek Freelance', emoji: '💻', amount: 1_250_000, day: 12, category: 'Sampingan', wallet: 'BCA', scope: 'pribadi' },
]

/** pindah dana: setoran tabungan otomatis tgl 26 (tidak pernah bikin sel merah) */
const SAVING_SERIES = {
  name: 'Setor Dana Darurat',
  emoji: '🏦',
  day: 26,
  amount: 750_000,
  scope: 'pribadi' as BudgetScope,
}

/** hari yang SENGAJA dibuat nol belanja variabel → memunculkan rentetan 🌱 */
const CLEAN_WINDOWS: [string, string][] = [
  ['2026-07-11', '2026-07-12'],
  ['2026-08-30', '2026-08-31'],
  ['2026-09-08', '2026-09-10'],
  ['2026-09-16', '2026-09-17'],
  ['2026-09-23', '2026-09-25'],
  ['2026-10-02', '2026-10-04'],
]

/** hari "kalap belanja" — belanja VARIABEL besar, pemicu warna terracotta.
 *  `scope` per item (paket 47) supaya belanja impulsif pun bisa dimiliki
 *  konteksnya masing-masing — bukan semua dianggap pribadi. */
const SPIKE_DAYS: {
  date: string
  items: { name: string; emoji: string; amount: number; category: string; scope: BudgetScope }[]
}[] = [
  {
    date: '2026-08-29',
    items: [
      { name: 'Belanja online Shopee', emoji: '🛍️', amount: 620_000, category: 'Keinginan', scope: 'pribadi' },
    ],
  },
  {
    date: '2026-09-05',
    items: [{ name: 'Sepatu lari', emoji: '👟', amount: 390_000, category: 'Keinginan', scope: 'pribadi' }],
  },
  {
    date: '2026-09-19',
    items: [
      { name: 'Gadget baru', emoji: '🎧', amount: 780_000, category: 'Keinginan', scope: 'pribadi' },
      { name: 'Baju kerja', emoji: '👕', amount: 240_000, category: 'Keinginan', scope: 'keluarga' },
    ],
  },
]

/** belanja variabel rutin — dipilih bergilir oleh PRNG */
const ROUTINE_ITEMS: {
  name: string
  emoji: string
  category: string
  min: number
  max: number
  scope: BudgetScope
}[] = [
  { name: 'Makan siang warteg', emoji: '🍛', category: 'Makanan', min: 15_000, max: 28_000, scope: 'pribadi' },
  { name: 'Kopi Kenangan', emoji: '☕', category: 'Makanan', min: 18_000, max: 32_000, scope: 'pribadi' },
  { name: 'Gojek ke kantor', emoji: '🛵', category: 'Transportasi', min: 12_000, max: 26_000, scope: 'pribadi' },
  { name: 'Belanja sayur', emoji: '🥬', category: 'Kebutuhan', min: 22_000, max: 48_000, scope: 'keluarga' },
  { name: 'Jajan online', emoji: '🍔', category: 'Makanan', min: 25_000, max: 55_000, scope: 'keluarga' },
  { name: 'Skincare', emoji: '🧴', category: 'Keinginan', min: 35_000, max: 89_000, scope: 'pribadi' },
]

const ROUTINE_WALLETS = ['GoPay', 'Tunai', 'OVO']

/** pembulatan ke ratusan rupiah terdekat — biar nominalnya terlihat manusiawi */
function round500(value: number) {
  return Math.round(value / 500) * 500
}

function inCleanWindow(iso: string) {
  return CLEAN_WINDOWS.some(([from, to]) => iso >= from && iso <= to)
}

/**
 * Tanggal berulang tiap bulan dalam jendela data — DIPOTONG di hari ini.
 *
 * PAKET 56: dulu fungsi ini mengembalikan seluruh jendela (sampai Nov 2026) dan
 * setiap tanggal setelah hari ini lahir sebagai ramalan lewat `statusFor()`.
 * Setelah ramalan dihapus, entri bertanggal masa depan tidak punya arti lain
 * selain "uang yang belum terjadi" — dan kalender tidak pernah menggambar itu.
 * Jadi seri demo (tagihan/gaji/setoran tabungan) hanya sampai hari ini, sama
 * seperti aturan yang sudah dipakai belanja rutin di bagian B.
 */
function monthlyDates(day: number, todayIso: string) {
  const dates: string[] = []
  const start = parseISO(DATA_WINDOW_START)
  const end = parseISO(DATA_WINDOW_END)
  for (const date of eachDayOfInterval({ start, end })) {
    const iso = localISODate(date)
    if (getDate(date) === day && iso <= todayIso) dates.push(iso)
  }
  return dates
}

/** jam lokal deterministik untuk entri rutin (07:00–21:00) */
function routineTime(rand: () => number) {
  const hour = 7 + Math.floor(rand() * 15)
  const minute = Math.floor(rand() * 12) * 5
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/**
 * Bangun seluruh entri kalender: seri tetap (gaji/tagihan/tabungan/kalap) +
 * belanja rutin ber-seed. Semua deterministik — aman dipanggil saat SSR.
 *
 * PAKET 56: seluruh entri berhenti di hari ini. Tidak ada lagi entri yang
 * "belum terjadi" — dan karena itu tidak ada satupun yang perlu ditandai ramalan.
 */
export function buildCalendarEntries(todayIso: string = CALENDAR_TODAY_ISO): CalendarEntry[] {
  const rand = mulberry32(20260925)
  const entries: CalendarEntry[] = []

  /* A1. tagihan terjadwal */
  for (const bill of FIXED_BILL_SERIES) {
    for (const date of monthlyDates(bill.day, todayIso)) {
      entries.push({
        id: `bill-${bill.day}-${date}`,
        date,
        name: bill.name,
        amount: bill.amount,
        type: 'fixed_bill',
        category: bill.category,
        wallet: bill.wallet,
        emoji: bill.emoji,
        time: '08:00',
        scope: bill.scope,
      })
    }
  }

  /* A2. uang masuk */
  for (const income of INCOME_SERIES) {
    for (const date of monthlyDates(income.day, todayIso)) {
      entries.push({
        id: `income-${income.day}-${date}`,
        date,
        name: income.name,
        amount: income.amount,
        type: 'income',
        category: income.category,
        wallet: income.wallet,
        emoji: income.emoji,
        time: '09:15',
        scope: income.scope,
      })
    }
  }

  /* A3. pindah dana (setoran tabungan) — tidak pernah dihitung "belanja" */
  for (const date of monthlyDates(SAVING_SERIES.day, todayIso)) {
    entries.push({
      id: `saving-${date}`,
      date,
      name: SAVING_SERIES.name,
      amount: SAVING_SERIES.amount,
      type: 'money_movement',
      category: 'Tabungan',
      wallet: 'BCA',
      emoji: SAVING_SERIES.emoji,
      time: '07:30',
      scope: SAVING_SERIES.scope,
    })
  }

  /* B. hari kalap & belanja rutin — hanya untuk masa lalu (≤ hari ini) */
  const today = parseISO(todayIso)
  for (const date of eachDayOfInterval({ start: parseISO(DATA_WINDOW_START), end: today })) {
    const iso = localISODate(date)

    const spike = SPIKE_DAYS.find((item) => item.date === iso)
    if (spike) {
      spike.items.forEach((item, index) => {
        entries.push({
          id: `spike-${iso}-${index}`,
          date: iso,
          name: item.name,
          amount: item.amount,
          type: 'variable_expense',
          category: item.category,
          wallet: 'GoPay',
          emoji: item.emoji,
          time: routineTime(rand),
          scope: item.scope,
        })
      })
      continue
    }

    if (inCleanWindow(iso)) continue

    /* hari tagihan besar (kos/cicilan): belanja rutinnya diringankan supaya
       mata langsung fokus ke tagihan terjadwalnya — bukan ke jajan kecil */
    const isBillDay = FIXED_BILL_SERIES.some(
      (bill) => bill.day === getDate(date) && bill.amount >= 300_000,
    )
    const count = isBillDay ? 1 : 1 + Math.floor(rand() * 3)
    for (let index = 0; index < count; index++) {
      const item = ROUTINE_ITEMS[Math.floor(rand() * ROUTINE_ITEMS.length)]
      entries.push({
        id: `routine-${iso}-${index}`,
        date: iso,
        name: item.name,
        amount: round500(item.min + rand() * (item.max - item.min)),
        type: 'variable_expense',
        category: item.category,
        wallet: ROUTINE_WALLETS[Math.floor(rand() * ROUTINE_WALLETS.length)],
        emoji: item.emoji,
        time: routineTime(rand),
        scope: item.scope,
      })
    }
  }

  return entries.sort((a, b) => (a.date === b.date ? (a.time ?? '') < (b.time ?? '') ? -1 : 1 : a.date < b.date ? -1 : 1))
}

/** dataset kalender siap pakai (deterministik) */
export const CALENDAR_ENTRIES: CalendarEntry[] = buildCalendarEntries()

/* ── CATATAN SUNGGUHAN: JEMBATAN LEDGER → GRID (paket 49) ─────────────────────
   Masalah yang ditutup di sini: halaman Kalender dulu menyimpan daftar
   catatannya SENDIRI (`useState<CalendarEntry[]>` di screen) sambil menembak
   toast "Catatan … tersimpan". Satu tindakan jadi dua cerita — user mencatat
   pengeluaran dari kalender, lalu tidak menemukannya di Riwayat, kartu Home,
   maupun saldo dompet (PRD 244: "jujur di setiap klaim").

   Sekarang kalender adalah PEMBACA. Entri satu hari = konstanta demo
   (`CALENDAR_ENTRIES`, deterministik & sudah ada sejak awal) + baris ledger
   yang benar-benar tertulis (`lib/money/store.ts`). Fungsi di bawah adalah
   SATU-SATUNYA penerjemah baris ledger → entri grid, jadi tidak ada rumus kedua
   yang bisa menyimpang dari Riwayat.

   Yang TIDAK ada di sini: penulisan. Semua tulisan tetap lewat
   `hooks/use-transaction-submit.ts` → `recordDraftTransaction()` → store.
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Tipe catatan yang DITAWARKAN halaman Kalender (paket 49, ditegaskan paket 55).
 *
 * Sengaja tanpa `transfer` & `saving`: catatan dari kalender cuma bisa menulis
 * SATU sisi uang, sedangkan pindah dana WAJIB dua sisi (dompet asal → dompet
 * tujuan). Kalau tipe itu ditawarkan di sini, saldo dompet akan berbeda dari
 * cerita yang dibaca user — persis keluhan “fitur transfer masih ngambang”.
 *
 * PAKET 55: alur pindah dana yang benar sekarang ada (`TransferFlow` — dari
 * dompet → ke dompet → berapa), dan store MENOLAK `type: 'transfer'` dari jalur
 * catatan umum (`postTransaction` → `null`). Jadi jalur kalender ini aman di dua
 * lapis: tidak ditawarkan, dan ditolak kalau toh dicoba.
 *
 * Yang perlu diingat: entri demo `money_movement` di `CALENDAR_ENTRIES` (mis.
 * seri setoran tabungan) adalah PAJANGAN — konstanta contoh, tanpa baris ledger,
 * sama seperti seluruh baris mock lain (lihat kepala `lib/money/ledger.ts`).
 * Satu-satunya entri “pindah dana” yang benar-benar menggerakkan saldo adalah
 * baris `transfer` hasil `postTransfer()`, yang sampai ke grid lewat
 * `calendarEntriesFromLedger()` di bawah.
 */
export const CALENDAR_NOTE_TYPES: readonly TransactionType[] = ['expense', 'income']

/**
 * Emoji entri TURUNAN (baris ledger tidak menyimpan emoji sendiri) — dipakai
 * sebagai penanda kecil di sel & daftar hari, sama seperti entri mock.
 */
export const CALENDAR_LEDGER_EMOJI: Record<CalendarEntryType, string> = {
  income: '💰',
  variable_expense: '🧾',
  fixed_bill: '📋',
  money_movement: '🏦',
}

/** jenis transaksi app (`lib/types.ts`) → jenis entri kalender */
export function calendarLedgerType(type: TransactionType): CalendarEntryType {
  if (type === 'income') return 'income'
  /* catatan pengeluaran yang DIKETIK USER masuk "belanja variabel": ia bukan
     tagihan terjadwal (tagihan datang dari halaman Tagihan), jadi boleh terlihat
     sebagai lonjakan. Ini sebabnya "The Rent Penalty Fix" tetap utuh — yang
     tidak pernah dihukum merah adalah uang yang MEMANG sudah direncanakan. */
  if (type === 'expense') return 'variable_expense'
  /* 'transfer' & 'saving' = pindah dana: net worth tidak berubah dan tidak
     pernah dihitung sebagai belanja (aturan yang sama dengan chip ⇄ di Riwayat) */
  return 'money_movement'
}

/**
 * Satu baris ledger → satu entri grid.
 *
 * `fallbackScope` hanya dipakai kalau dompet barisnya belum ada di daftar
 * dompet: `CalendarEntry.scope` wajib terisi sementara penyaringan sebenarnya
 * memakai `context` (kanon #2 paket 47 — baris seperti itu tampil di SEMUA
 * konteks), jadi nilai ini tidak pernah menyembunyikan apa pun.
 */
export function calendarEntryFromTransaction(
  tx: ContextTransaction,
  fallbackScope: BudgetScope,
): CalendarEntry {
  const type = calendarLedgerType(tx.type)
  return {
    id: `ledger-${tx.id}`,
    date: tx.date,
    name: tx.name,
    amount: tx.amount,
    type,
    category: tx.category,
    wallet: tx.wallet,
    emoji: CALENDAR_LEDGER_EMOJI[type],
    time: tx.time,
    /* konteks dibaca dari DOMPET barisnya, bukan dari konteks yang sedang
       dibuka: pengeluaran dari Tunai tetap milik Keluarga walau user sedang
       membuka konteks Pribadi */
    context: tx.context,
    scope: tx.context === 'unknown' ? fallbackScope : tx.context,
  }
}

/**
 * Entri grid dari CATATAN SUNGGUHAN: baris ledger yang lolos tombstone & sudah
 * kena override edit (`recordedTransactions()`), disaring ke jendela periode
 * yang sedang dibaca (`isWithinPeriod` + `periodBounds`).
 *
 * `scope: 'all'` = seluruh konteks — dipakai ringkasan periode (kanon paket 47
 * #1: konteks menyaring daftar & arus, bukan total). Mengisi `MoneyContext`
 * berarti daftar hari/tombol mengikuti konteks aktif.
 */
export function calendarEntriesFromLedger(
  snapshot: MoneySnapshot,
  bounds: PeriodBounds,
  scope: MoneyContext | 'all' = 'all',
): CalendarEntry[] {
  const tagged = tagTransactionsForContext(recordedTransactions(snapshot), snapshot)
  /* nilai cadangan `scope` entri turunan = konteks yang sedang diminta
     ('pribadi' saat 'all'); tidak pernah dibaca penyaring karena entri turunan
     selalu punya `context` */
  const fallbackScope: BudgetScope = scope === 'all' ? 'pribadi' : scope
  return tagged
    .filter((tx) => isWithinPeriod(tx.date, bounds))
    .filter((tx) => scope === 'all' || matchesContext(tx.context, scope))
    .map((tx) => calendarEntryFromTransaction(tx, fallbackScope))
}

/**
 * Satu keputusan saring untuk SEMUA entri kalender (paket 49): entri mock lewat
 * `scope`, entri turunan lewat `context` yang dibaca lebih dulu. Halaman
 * Kalender memakai fungsi ini menggantikan `scopedItems()` supaya dua jenis
 * entri dalam satu grid tidak punya dua aturan saring yang bisa berbeda.
 */
export function calendarEntryVisible(entry: CalendarEntry, ctx: MoneyContext): boolean {
  return matchesContext(entry.context ?? entry.scope, ctx)
}

/* ── SELEKTOR & RINGKASAN PERIODE ────────────────────────────────────────── */

/** sel untuk satu tanggal (null kalau tanggal itu di luar grid) */
export function selectCell(grid: CalendarGrid, iso: string): CalendarCell | null {
  return grid.cells.find((cell) => cell.date === iso) ?? null
}

/**
 * Rekap seluruh periode yang sedang tampil (hanya hari di dalam periode).
 *
 * PAKET 56: `forecastTotal`/`forecastCount`/`plannedDays` DIHAPUS — semuanya
 * menghitung uang yang belum terjadi (atau menandai hari "berencana"). Angka
 * yang tersisa semuanya fakta: apa yang masuk, apa yang keluar, dan seberapa
 * sering user berhasil nol belanja variabel.
 */
export interface PeriodSummary {
  income: number
  variableSpend: number
  fixedSpend: number
  moved: number
  net: number
  /** hari tanpa belanja variabel sama sekali */
  cleanDays: number
  /** hari yang ditandai boros (variabel melonjak) */
  deficitDays: number
  /** rentetan hari bersih yang sedang berjalan */
  currentStreak: number
}

/** rekap seluruh periode yang sedang tampil (hanya hari di dalam periode) */
export function summarizePeriod(cells: CalendarCell[]): PeriodSummary {
  const days = cells.filter((cell) => cell.inPeriod)
  const summary: PeriodSummary = {
    income: 0,
    variableSpend: 0,
    fixedSpend: 0,
    moved: 0,
    net: 0,
    cleanDays: 0,
    deficitDays: 0,
    currentStreak: 0,
  }

  for (const cell of days) {
    summary.income += cell.income
    summary.variableSpend += cell.variableSpend
    summary.fixedSpend += cell.fixedSpend
    summary.moved += cell.moved
    if (cell.cleanDay) summary.cleanDays += 1
    if (cell.tone === 'deficit') summary.deficitDays += 1
    /* rentetan berjalan = rentetan hari terakhir yang sudah berlalu */
    if (cell.isPast) summary.currentStreak = cell.streak
  }

  summary.net = summary.income - summary.variableSpend - summary.fixedSpend
  return summary
}

/* ── LEGENDA & COPY TETAP ────────────────────────────────────────────────── */

/** pesan AI saat hari yang dipilih benar-benar kosong (bukan menghakimi) */
export const EMPTY_DAY_AI_MESSAGE = 'Hari ini aman terkendali. Tidak ada pengeluaran.'

/** penjelasan yang membedakan belanja impulsif dari tagihan tetap yang aman */
export const FIXED_BILL_SAFE_NOTE =
  'Tagihan terjadwal tampil netral — uang yang sudah direncanakan tidak dihitung boros.'

/**
 * Label tagihan tetap (paket 56).
 *
 * Dulu bernama `PLANNED_BADGE_LABEL` dan berbunyi "Terencana" — kata yang dipakai
 * halaman ini untuk menandai RAMALAN tagihan. Sekarang label yang sama hanya
 * dipakai untuk dua hal yang keduanya fakta: sel yang isinya MURNI tagihan tetap
 * yang sudah tercatat, dan baris tagihan tetap di daftar hari. Karena artinya
 * sudah berubah, namanya ikut diubah — nama `planned` yang bermakna "rencana
 * masa depan" tidak boleh diwariskan diam-diam.
 */
export const FIXED_BILL_BADGE_LABEL = 'Tagihan Tetap'

/**
 * Chip label per jenis entri di daftar hari (satu sumber untuk panel detail).
 * `className` boleh tinggal di sini: warna teks baris memang bahasa visual,
 * sama seperti `CALENDAR_LOOK_CELL` di bawah.
 */
export const CALENDAR_ENTRY_CHIP: Record<
  CalendarEntryType,
  { label: string; className: string }
> = {
  income: { label: 'Pemasukan', className: 'text-forest' },
  fixed_bill: { label: FIXED_BILL_BADGE_LABEL, className: 'text-thistle' },
  variable_expense: { label: 'Variabel', className: 'text-hud-terracotta' },
  money_movement: { label: 'Pindah dana', className: 'text-thistle' },
}

/**
 * Copy panel detail tanggal (paket 56) — semua kalimat yang dibaca user di panel
 * hari tinggal di sini, bukan di JSX. Dua kalimat yang paling penting berubah:
 *
 *   • judul daftar tidak pernah lagi menyebut "Ramalan Tagihan" — hari mendatang
 *     yang punya isi hanya berisi CATATAN yang benar-benar tercatat;
 *   • hari kosong di masa depan tidak lagi MENJANJIKAN apa pun ("Belum ada
 *     tagihan terjadwal" itu klaim tentang masa depan yang tidak kita punya).
 */
export const CALENDAR_DAY_COPY = {
  /** panel belum punya tanggal terpilih */
  pickTitle: 'Pilih tanggal dulu',
  pickBody: 'Tap salah satu tanggal di kalender untuk melihat detail harinya.',
  /** CTA zero-friction backdating — tanggalnya terkunci ke tanggal terpilih */
  addNote: (day: number) => `Tambah Catatan di Tgl ${day}`,
  /** judul daftar: hari yang belum lewat belum punya "transaksi", hanya catatan */
  listTitle: (isFuture: boolean) => (isFuture ? 'Catatan Tercatat' : 'Transaksi Hari Ini'),
  countLabel: (count: number) => `${count} catatan`,
  /** baris ringkasan saat tidak ada satu pun uang bergerak di hari itu */
  neutralSummary: 'Tidak ada uang yang bergerak',
  /** bubble di atas sel saat tanggalnya tidak punya catatan sama sekali */
  bubbleEmpty: 'Belum ada catatan',
  /** hari kosong: arahkan ke tombol catat, jangan janjikan apa pun */
  emptyFuture: {
    emoji: '🗓️',
    title: 'Belum ada catatan',
    body: 'Tidak ada uang tercatat di tanggal ini. Kalau ada yang perlu dicatat, pakai tombol di atas — tanggalnya sudah menunjuk hari ini.',
  },
  /** hari yang sudah lewat dan benar-benar kosong (pesan AI yang menenangkan) */
  emptyPast: {
    emoji: '🌿',
    title: 'Kosong & aman',
    body: EMPTY_DAY_AI_MESSAGE,
  },
} as const

/* ── TAMPILAN SEL: PALET BERSIH (satu sumber untuk grid & legenda) ────────────
   Redesign: sel kalender tidak lagi memakai corak garis diagonal, glow
   beranimasi, emoji bertumpuk, titik biru, chip nominal, atau angka bulan.
   Sekarang satu sel = SATU angka tanggal di atas satu latar polos, persis
   bahasa visual heatmap "Kapan Kamu Sering Boros?" di halaman Riwayat.

   Enam "muka" sel (`CalendarLook`) memakai palet brand yang sudah ada —
   tidak ada warna baru di sistem:
     terracotta → belanja variabel melonjak (satu-satunya yang boleh "marah")
     forest     → surplus / ada belanja biasa
     mint       → hari bersih (nol belanja variabel)
     ink        → netral: tagihan tetap yang tercatat atau belum ada catatan
   ────────────────────────────────────────────────────────────────────────── */

export type CalendarLook = 'deficit' | 'surplus' | 'clean' | 'spend' | 'planned' | 'empty'

/** latar + warna angka tiap muka sel */
export const CALENDAR_LOOK_CELL: Record<CalendarLook, string> = {
  deficit: 'bg-hud-terracotta/75 text-cream',
  surplus: 'bg-forest/80 text-cream',
  clean: 'bg-mint/40 text-forest',
  spend: 'bg-forest/15 text-ink/70',
  planned: 'bg-ink/[0.06] text-ink/55',
  empty: 'bg-cream text-ink/40',
}

/**
 * Muka sel untuk sebuah tanggal — URUTAN PRIORITASNYA yang menentukan arti:
 *   1. `deficit`  spike belanja variabel (paling butuh perhatian)
 *   2. `surplus`  uang masuk menutup seluruh pengeluaran hari itu
 *   3. `clean`    nol belanja variabel → "prestasi", bukan kotak kosong
 *   4. `planned`  hari yang isinya MURNI tagihan tetap → netral, tidak dihukum
 *   5. `spend`    belanja variabel di bawah ambang → hijau tipis
 *   6. `empty`    belum ada catatan (termasuk hari mendatang yang kosong)
 */
export function calendarCellLook(cell: CalendarCell): CalendarLook {
  if (cell.tone === 'deficit') return 'deficit'
  if (cell.tone === 'surplus') return 'surplus'
  if (cell.cleanDay) return 'clean'
  if (cell.tone === 'planned') return 'planned'
  if (cell.totalSpend > 0) return 'spend'
  return 'empty'
}

/** keterangan warna untuk pengguna — satu baris, label sependek mungkin.
 *  PAKET 56: tidak ada lagi penanda "Terencana"/ramalan di daftar ini; yang
 *  tersisa hanya penjelasan warna sel, jadi tiap muka yang masih dipakai tetap
 *  punya keterangannya sendiri. */
export const CALENDAR_LEGEND: { id: CalendarLook; label: string }[] = [
  { id: 'deficit', label: 'Boros' },
  { id: 'surplus', label: 'Surplus' },
  { id: 'clean', label: 'Nol jajan' },
  { id: 'spend', label: 'Ada belanja' },
  { id: 'planned', label: FIXED_BILL_BADGE_LABEL },
]

/* ── CATATAN SIKLUS GAJIAN (paket 60 · 60.5) ─────────────────────────────────
   `paydayDate` dibaca dari konfigurasi uang user (`lib/user-money-settings.ts`,
   paket 57). Kalau user BELUM pernah mengaturnya, siklusnya tetap bisa dibuka —
   memakai `DEFAULT_PAYDAY_DATE` (tgl 25) — dan itu HARUS dikatakan di layar,
   bukan disimpan diam-diam di kode: kalau tidak, user membaca siklus "26 Sep →
   25 Okt" lalu menyimpulkan app-nya tahu tanggal gajiannya. `calendar.ts` cuma
   menyediakan kalimatnya; halaman yang tahu apakah nilainya datang dari user
   atau dari default. */
export const CALENDAR_PAYDAY_COPY = {
  defaultNote: (day: number) =>
    `Siklus ini memakai tanggal gajian default (tgl ${day}) karena kamu belum pernah mengaturnya.`,
  cta: 'Atur tanggal gajian',
} as const

/** kalimat pembaca layar untuk tiap muka sel (dipakai aria-label tombol tanggal) */
export const CALENDAR_LOOK_WORD: Record<CalendarLook, string> = {
  deficit: 'boros',
  surplus: 'surplus',
  clean: 'nol jajan',
  spend: 'ada belanja',
  planned: 'tagihan tetap',
  empty: 'belum ada catatan',
}

