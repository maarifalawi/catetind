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
import { localISODate, mulberry32 } from './history'

/* ── Kalender Cashflow (/app/calendar) ───────────────────────────────────────
   Satu sumber data + logika murni (TANPA React) untuk halaman Kalender, persis
   pola `lib/data/bills.ts` & `lib/data/history.ts`:

     1. Kontrak data transaksi kalender (type + status).
     2. Matematika GRID GAJIAN — inti halaman ini (lihat `periodBounds`).
     3. Klasifikasi heatmap harian yang memisahkan belanja impulsif (boleh
        merah) dari tagihan terjadwal (WAJIB netral) — lihat `calendarTone`.
     4. Data mock DETERMINISTIK (seeded PRNG + seri tagihan tetap) supaya HTML
        server & render pertama client identik → tidak ada hydration mismatch.

   Kenapa pustaka tanggal: matematika siklus gajian gampang salah kalau diketik
   manual (bulan 28/29/30/31 hari, geser lintas tahun). `date-fns` dipakai untuk
   SEMUA aritmetika tanggal & penamaan hari/bulan berbahasa Indonesia
   (`locale` id) — bukan `Intl`, bukan `toLocaleDateString()`.

   Catatan "hari ini": dipatok KONSTAN `CALENDAR_TODAY_ISO` (25 Sep 2026) sama
   seperti halaman Tagihan. Dua manfaat: (1) server & client selalu sepakat soal
   "masa depan vs masa lalu"; (2) demo bisa dipindah tanggal dengan satu baris.
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

export type CalendarEntryStatus = 'cleared' | 'upcoming_forecast'

export interface CalendarEntry {
  id: string
  /** tanggal lokal `YYYY-MM-DD` */
  date: string
  name: string
  /** selalu angka positif — arah uang ditentukan `type` */
  amount: number
  type: CalendarEntryType
  status: CalendarEntryStatus
  category: string
  wallet: string
  /** emoji identitas — dipakai sebagai ikon kecil di sel kalender */
  emoji: string
  /** jam lokal `HH:MM` (hanya untuk entri yang sudah tercatat) */
  time?: string
}

/** mode periode grid: bulan kalender penuh vs siklus gajian */
export type PeriodMode = 'standard' | 'payday'

/**
 * Nada dasar sebuah sel (SATU latar per sel, prioritas: defisit → surplus →
 * terencana → biasa). Penanda lain (🌱 hari bersih, titik biru tagihan
 * terjadwal) MENEMPEL di atas nada ini, bukan menggantikannya.
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
  entries: CalendarEntry[]
  forecast: CalendarEntry[]
  tone: CalendarTone
  /** true = hari itu NOL belanja variabel → benih 🌱 (gamifikasi) */
  cleanDay: boolean
  /** panjang rentetan hari bersih yang berakhir di tanggal ini */
  streak: number
  /** jumlah tagihan terjadwal (penanda titik biru) */
  plannedCount: number
  /** emoji tagihan terjadwal/forecast di tanggal ini (maks 3) */
  markers: string[]
}

/* ── KONSTANTA ────────────────────────────────────────────────────────────── */

/** "hari ini" dipatok — sumber kebenaran tunggal untuk masa lalu vs masa depan */
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
  isFuture: boolean
  income: number
  /** total belanja VARIABEL saja */
  variableSpend: number
  /** total tagihan TERJADWAL saja */
  fixedSpend: number
  hasForecast: boolean
}

/**
 * Warna dasar satu sel.
 *
 * ATURAN EMAS — "THE RENT PENALTY FIX":
 * `fixedSpend` TIDAK PERNAH masuk perhitungan cabang `deficit`. Hari yang
 * pengeluarannya besar cuma karena Kos/cicilan (uang yang memang sudah
 * direncanakan) MUSTAHIL berwarna merah; ia jatuh ke `planned` (latar abu-abu
 * bergaris) atau `surplus` kalau ada gajian di hari yang sama. Yang boleh merah
 * hanya `variableSpend` yang melonjak di atas ambang — jajan/kopi/shopping.
 *
 * Prioritas: defisit → surplus → terencana → biasa.
 */
export function calendarTone(metrics: DayMetrics, deficitThreshold: number): CalendarTone {
  /* masa depan tidak dihakimi — hanya menampilkan ramalan tagihan */
  if (metrics.isFuture) return metrics.hasForecast ? 'planned' : 'none'
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
  forecast: CalendarEntry[]
  plannedCount: number
}

/**
 * Akumulasi entri per tanggal.
 *
 * Ramalan ditentukan oleh STATUS (`upcoming_forecast`), BUKAN oleh tanggalnya.
 * Kenapa: begitu user menekan [Bayar Sekarang] pada tagihan masa depan, statusnya
 * berubah jadi `cleared` dan item itu harus langsung berhenti dihitung sebagai
 * "tagihan menunggu" — walau tanggalnya masih di depan. Sebaliknya, catatan yang
 * user ketik sendiri untuk tanggal mendatang tetap sah sebagai uang tercatat.
 * (Seed mock tetap berstatus `upcoming_forecast` untuk semua tanggal > hari ini,
 * lihat `statusFor()`.)
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
        forecast: [],
        plannedCount: 0,
      } satisfies CellTotals)

    if (entry.status === 'upcoming_forecast') {
      bucket.forecast.push(entry)
      if (entry.type === 'fixed_bill') bucket.plannedCount += 1
    } else {
      bucket.entries.push(entry)
      if (entry.type === 'income') bucket.income += entry.amount
      else if (entry.type === 'fixed_bill') {
        bucket.fixedSpend += entry.amount
        bucket.plannedCount += 1
      } else if (entry.type === 'variable_expense') bucket.variableSpend += entry.amount
      else bucket.moved += entry.amount
    }
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
  forecast: [],
  plannedCount: 0,
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
      forecast: bucket.forecast,
      /* diisi di langkah kedua — butuh rata-rata seluruh periode dulu */
      tone: 'none',
      cleanDay: false,
      streak: 0,
      plannedCount: bucket.plannedCount,
      markers: [...bucket.forecast, ...bucket.entries]
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
        isFuture: cell.isFuture,
        income: cell.income,
        variableSpend: cell.variableSpend,
        fixedSpend: cell.fixedSpend,
        hasForecast: cell.forecast.length > 0,
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

/** tagihan berulang — sumbernya sama dengan halaman Tagihan Rutin */
const FIXED_BILL_SERIES: {
  name: string
  emoji: string
  amount: number
  day: number
  category: string
  wallet: string
}[] = [
  { name: 'Kos Bulanan', emoji: '🏠', amount: 1_500_000, day: 1, category: 'Tempat Tinggal', wallet: 'BCA' },
  { name: 'Cicilan Motor', emoji: '🏍️', amount: 850_000, day: 5, category: 'Cicilan', wallet: 'BCA' },
  { name: 'IndiHome', emoji: '📶', amount: 350_000, day: 10, category: 'Tagihan', wallet: 'BCA' },
  { name: 'Netflix', emoji: '🎬', amount: 54_000, day: 15, category: 'Hiburan', wallet: 'GoPay' },
  { name: 'Spotify', emoji: '🎵', amount: 55_000, day: 15, category: 'Hiburan', wallet: 'GoPay' },
  { name: 'Asuransi Jiwa', emoji: '🛡️', amount: 250_000, day: 20, category: 'Asuransi', wallet: 'BCA' },
  { name: 'Cicilan HP', emoji: '📱', amount: 600_000, day: 22, category: 'Cicilan', wallet: 'GoPay' },
  { name: 'Kredivo', emoji: '💳', amount: 420_000, day: 28, category: 'Cicilan', wallet: 'OVO' },
]

/** uang masuk tetap: gaji tiap tgl 25 + freelance tiap tgl 12 */
const INCOME_SERIES: {
  name: string
  emoji: string
  amount: number
  day: number
  category: string
  wallet: string
}[] = [
  { name: 'Gaji Bulanan', emoji: '💰', amount: 8_500_000, day: 25, category: 'Gaji', wallet: 'BCA' },
  { name: 'Proyek Freelance', emoji: '💻', amount: 1_250_000, day: 12, category: 'Sampingan', wallet: 'BCA' },
]

/** pindah dana: setoran tabungan otomatis tgl 26 (tidak pernah bikin sel merah) */
const SAVING_SERIES = { name: 'Setor Dana Darurat', emoji: '🏦', day: 26, amount: 750_000 }

/** hari yang SENGAJA dibuat nol belanja variabel → memunculkan rentetan 🌱 */
const CLEAN_WINDOWS: [string, string][] = [
  ['2026-07-11', '2026-07-12'],
  ['2026-08-30', '2026-08-31'],
  ['2026-09-08', '2026-09-10'],
  ['2026-09-16', '2026-09-17'],
  ['2026-09-23', '2026-09-25'],
  ['2026-10-02', '2026-10-04'],
]

/** hari "kalap belanja" — belanja VARIABEL besar, pemicu warna terracotta */
const SPIKE_DAYS: { date: string; items: { name: string; emoji: string; amount: number; category: string }[] }[] = [
  {
    date: '2026-08-29',
    items: [
      { name: 'Belanja online Shopee', emoji: '🛍️', amount: 620_000, category: 'Keinginan' },
    ],
  },
  {
    date: '2026-09-05',
    items: [{ name: 'Sepatu lari', emoji: '👟', amount: 390_000, category: 'Keinginan' }],
  },
  {
    date: '2026-09-19',
    items: [
      { name: 'Gadget baru', emoji: '🎧', amount: 780_000, category: 'Keinginan' },
      { name: 'Baju kerja', emoji: '👕', amount: 240_000, category: 'Keinginan' },
    ],
  },
]

/** belanja variabel rutin — dipilih bergilir oleh PRNG */
const ROUTINE_ITEMS = [
  { name: 'Makan siang warteg', emoji: '🍛', category: 'Makanan', min: 15_000, max: 28_000 },
  { name: 'Kopi Kenangan', emoji: '☕', category: 'Makanan', min: 18_000, max: 32_000 },
  { name: 'Gojek ke kantor', emoji: '🛵', category: 'Transportasi', min: 12_000, max: 26_000 },
  { name: 'Belanja sayur', emoji: '🥬', category: 'Kebutuhan', min: 22_000, max: 48_000 },
  { name: 'Jajan online', emoji: '🍔', category: 'Makanan', min: 25_000, max: 55_000 },
  { name: 'Skincare', emoji: '🧴', category: 'Keinginan', min: 35_000, max: 89_000 },
]

const ROUTINE_WALLETS = ['GoPay', 'Tunai', 'OVO']

/** pembulatan ke ratusan rupiah terdekat — biar nominalnya terlihat manusiawi */
function round500(value: number) {
  return Math.round(value / 500) * 500
}

function inCleanWindow(iso: string) {
  return CLEAN_WINDOWS.some(([from, to]) => iso >= from && iso <= to)
}

/** tanggal gajian tiap bulan dalam jendela data */
function monthlyDates(day: number) {
  const dates: string[] = []
  const start = parseISO(DATA_WINDOW_START)
  const end = parseISO(DATA_WINDOW_END)
  for (const date of eachDayOfInterval({ start, end })) {
    if (getDate(date) === day) dates.push(localISODate(date))
  }
  return dates
}

/** entri bertanggal setelah hari ini otomatis berstatus ramalan */
function statusFor(iso: string, todayIso: string): CalendarEntryStatus {
  return iso > todayIso ? 'upcoming_forecast' : 'cleared'
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
 */
export function buildCalendarEntries(todayIso: string = CALENDAR_TODAY_ISO): CalendarEntry[] {
  const rand = mulberry32(20260925)
  const entries: CalendarEntry[] = []

  /* A1. tagihan terjadwal */
  for (const bill of FIXED_BILL_SERIES) {
    for (const date of monthlyDates(bill.day)) {
      entries.push({
        id: `bill-${bill.day}-${date}`,
        date,
        name: bill.name,
        amount: bill.amount,
        type: 'fixed_bill',
        status: statusFor(date, todayIso),
        category: bill.category,
        wallet: bill.wallet,
        emoji: bill.emoji,
        time: '08:00',
      })
    }
  }

  /* A2. uang masuk */
  for (const income of INCOME_SERIES) {
    for (const date of monthlyDates(income.day)) {
      entries.push({
        id: `income-${income.day}-${date}`,
        date,
        name: income.name,
        amount: income.amount,
        type: 'income',
        status: statusFor(date, todayIso),
        category: income.category,
        wallet: income.wallet,
        emoji: income.emoji,
        time: '09:15',
      })
    }
  }

  /* A3. pindah dana (setoran tabungan) — tidak pernah dihitung "belanja" */
  for (const date of monthlyDates(SAVING_SERIES.day)) {
    entries.push({
      id: `saving-${date}`,
      date,
      name: SAVING_SERIES.name,
      amount: SAVING_SERIES.amount,
      type: 'money_movement',
      status: statusFor(date, todayIso),
      category: 'Tabungan',
      wallet: 'BCA',
      emoji: SAVING_SERIES.emoji,
      time: '07:30',
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
          status: 'cleared',
          category: item.category,
          wallet: 'GoPay',
          emoji: item.emoji,
          time: routineTime(rand),
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
        status: 'cleared',
        category: item.category,
        wallet: ROUTINE_WALLETS[Math.floor(rand() * ROUTINE_WALLETS.length)],
        emoji: item.emoji,
        time: routineTime(rand),
      })
    }
  }

  return entries.sort((a, b) => (a.date === b.date ? (a.time ?? '') < (b.time ?? '') ? -1 : 1 : a.date < b.date ? -1 : 1))
}

/** dataset kalender siap pakai (deterministik) */
export const CALENDAR_ENTRIES: CalendarEntry[] = buildCalendarEntries()

/* ── SELEKTOR & RINGKASAN PERIODE ────────────────────────────────────────── */

/** sel untuk satu tanggal (null kalau tanggal itu di luar grid) */
export function selectCell(grid: CalendarGrid, iso: string): CalendarCell | null {
  return grid.cells.find((cell) => cell.date === iso) ?? null
}

export interface PeriodSummary {
  income: number
  variableSpend: number
  fixedSpend: number
  moved: number
  net: number
  /** total tagihan yang masih jadi ramalan (belum dibayar) */
  forecastTotal: number
  forecastCount: number
  /** hari tanpa belanja variabel sama sekali */
  cleanDays: number
  /** hari yang ditandai boros (variabel melonjak) */
  deficitDays: number
  /** hari yang berisi tagihan terjadwal */
  plannedDays: number
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
    forecastTotal: 0,
    forecastCount: 0,
    cleanDays: 0,
    deficitDays: 0,
    plannedDays: 0,
    currentStreak: 0,
  }

  for (const cell of days) {
    summary.income += cell.income
    summary.variableSpend += cell.variableSpend
    summary.fixedSpend += cell.fixedSpend
    summary.moved += cell.moved
    summary.forecastCount += cell.forecast.filter((entry) => entry.type !== 'income').length
    summary.forecastTotal += cell.forecast
      .filter((entry) => entry.type !== 'income')
      .reduce((sum, entry) => sum + entry.amount, 0)
    if (cell.cleanDay) summary.cleanDays += 1
    if (cell.tone === 'deficit') summary.deficitDays += 1
    if (cell.plannedCount > 0) summary.plannedDays += 1
    /* rentetan berjalan = rentetan hari terakhir yang sudah berlalu */
    if (cell.isPast) summary.currentStreak = cell.streak
  }

  summary.net = summary.income - summary.variableSpend - summary.fixedSpend
  return summary
}

/* ── LEGENDA & COPY TETAP ────────────────────────────────────────────────── */

/** pesan AI saat hari yang dipilih benar-benar kosong (bukan menghakimi) */
export const EMPTY_DAY_AI_MESSAGE = 'Hari ini aman terkendali. Tidak ada pengeluaran.'

/** penjelasan yang membedakan belanja impulsif dari tagihan terencana */
export const FIXED_BILL_SAFE_NOTE =
  'Tagihan terjadwal tampil netral — uang yang sudah direncanakan tidak dihitung boros.'

/** label penanda tagihan terjadwal (dipakai di legenda kalender) */
export const PLANNED_BADGE_LABEL = 'Terencana'

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
     ink        → netral: tagihan terencana atau belum ada catatan
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
 *   4. `planned`  tagihan terjadwal / ramalan → netral, tidak dihukum
 *   5. `spend`    belanja variabel di bawah ambang → hijau tipis
 *   6. `empty`    hari mendatang tanpa agenda / belum ada catatan
 */
export function calendarCellLook(cell: CalendarCell): CalendarLook {
  if (cell.tone === 'deficit') return 'deficit'
  if (cell.tone === 'surplus') return 'surplus'
  if (cell.cleanDay) return 'clean'
  if (cell.tone === 'planned') return 'planned'
  if (cell.totalSpend > 0) return 'spend'
  return 'empty'
}

/** keterangan warna untuk pengguna — satu baris, label sependek mungkin */
export const CALENDAR_LEGEND: { id: CalendarLook; label: string }[] = [
  { id: 'deficit', label: 'Boros' },
  { id: 'surplus', label: 'Surplus' },
  { id: 'clean', label: 'Nol jajan' },
  { id: 'spend', label: 'Ada belanja' },
  { id: 'planned', label: PLANNED_BADGE_LABEL },
]

/** kalimat pembaca layar untuk tiap muka sel (dipakai aria-label tombol tanggal) */
export const CALENDAR_LOOK_WORD: Record<CalendarLook, string> = {
  deficit: 'boros',
  surplus: 'surplus',
  clean: 'nol jajan',
  spend: 'ada belanja',
  planned: 'tagihan terjadwal',
  empty: 'belum ada catatan',
}

