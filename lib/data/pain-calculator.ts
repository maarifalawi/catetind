/* ── KALKULATOR UANG GAIB (PAIN CALCULATOR) — copy + logika MURNI ─────────────
   Satu sumber untuk seluruh isi Section "Kalkulator Uang Gaib" di landing:
   batas slider, daftar tab hasil, tier roast, padanan dunia nyata, dan teks
   CTA. Komponen `components/landing/pain-calculator.tsx` sengaja NOL string
   user-facing — persis pola section landing lain (`lib/data/landing.ts`).

   Semua hitungan berjalan di klien: fungsi di file ini murni (tanpa React,
   tanpa DOM, tanpa fetch), jadi bisa diuji langsung di Vitest dan hasilnya
   mustahil berbeda antara server-render pertama dan interaksi user.

   Rumus uang:
     • 1 tahun      = kebocoran bulanan × 12
     • 5 tahun      = kebocoran bulanan × 60
     • investasi    = Future Value of Annuity, 5% p.a. (r = 0.05/12, n = 60)
   Tiga angka pertama memakai `computePain()` yang sudah menjadi kanon landing
   (lihat lib/data/landing.ts), jadi tidak ada rumus kedua yang bisa melenceng.
   ────────────────────────────────────────────────────────────────────────── */

import { computePain, type PainResult } from './landing'
import { formatIDR } from './pricing'

/** satu pintu impor angka Rupiah untuk komponen kalkulator */
export { formatIDR }

/* ── BATAS & NILAI AWAL ─────────────────────────────────────────────────────
   Slider gaji 2jt–30jt. Slider kebocoran dimulai dari 1,5jt — estimasi
   konservatif yang cukup besar untuk memicu rasa "oh, iya juga", tapi tidak
   menakut-nakuti sebelum user menggesernya sendiri. */
export const PAIN_CALCULATOR_DEFAULTS = {
  salary: 5_000_000,
  salaryMin: 2_000_000,
  salaryMax: 30_000_000,
  salaryStep: 250_000,
  leakMin: 0,
  leakMax: 30_000_000,
  leakStep: 50_000,
  defaultLeak: 1_500_000,
} as const

/* ── COPY — SEMUA TEKS YANG DILIHAT USER ────────────────────────────────────
   Nada bicara: Gen-Z / first-jobber Indonesia, jujur, sedikit menyindir tapi
   tidak menghakimi. Angka rupiah di dalam copy DITURUNKAN dari konstanta di
   atas supaya tidak lahir dua versi nominal. */
export const PAIN_CALCULATOR_COPY = {
  eyebrow: 'Hitung Sendiri',
  titleLead: 'Ke mana',
  titleEmphasis: 'gaji lo',
  titleTail: 'pergi?',
  salaryLabel: 'Gaji Bulanan',
  leakLabel: 'Uang Gaib / Bulan',
  resultLabel: 'Hasil simulasi',
  tabsAria: 'Pilih rentang hasil simulasi',
  results: {
    investedNote: 'Asumsi 5% p.a. · 60 bulan',
  },
  cta: 'Mulai Catat Sekarang',
  disclaimer: 'Simulasi edukatif, bukan saran keuangan.',
} as const

/* ── TAB HASIL ──────────────────────────────────────────────────────────────
   Satu angka besar yang bisa ditukar tanpa memuat ulang: 1 tahun, 5 tahun,
   atau nilai investasinya. Urutan & label di sini adalah SATU-SATUNYA sumber
   untuk tombol tab; komponen tinggal memetakan `id` ke angka lewat
   `resultAmountForTab()`. Default 5 tahun — rentang yang paling terasa
   "besar" tanpa terdengar tidak masuk akal. */
export const PAIN_RESULT_TABS = [
  { id: 'yearly', label: '1 Tahun' },
  { id: 'fiveYear', label: '5 Tahun' },
  { id: 'invested', label: 'Diinvestasikan' },
] as const

export type PainResultTabId = (typeof PAIN_RESULT_TABS)[number]['id']

export const DEFAULT_PAIN_RESULT_TAB: PainResultTabId = 'fiveYear'

/* ── LIVE ROAST MINCA ───────────────────────────────────────────────────────
   Ambang mengikuti brief: <15% aman, 15–30% waspada, >30% darurat. Pesannya
   sengaja pendek supaya bisa dibaca sekali lirik di layar HP. */
export const PAIN_ROAST = {
  safe: {
    tone: 'safe',
    emoji: '🟢',
    message: 'Masih aman, tapi jangan lengah!',
  },
  warning: {
    tone: 'warning',
    emoji: '🟡',
    message: 'Bocor halus terdeteksi! Gaji lo mulai terancam.',
  },
  danger: {
    tone: 'danger',
    emoji: '🔴',
    message: 'DARURAT! Gaji lo cuma numpang lewat buat foya-foya gaib.',
  },
} as const

export type PainRoastTone = keyof typeof PAIN_ROAST
export type PainRoast = (typeof PAIN_ROAST)[PainRoastTone]

/* ── FUNGSI MURNI ─────────────────────────────────────────────────────────── */

/** jaga gaji tetap di rentang slider dan berupa rupiah utuh */
export function clampSalary(value: number): number {
  if (!Number.isFinite(value)) return PAIN_CALCULATOR_DEFAULTS.salary
  return Math.min(
    PAIN_CALCULATOR_DEFAULTS.salaryMax,
    Math.max(PAIN_CALCULATOR_DEFAULTS.salaryMin, Math.round(value)),
  )
}

/** jaga kebocoran tetap 0..batas slider dan berupa rupiah utuh */
export function clampLeak(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(
    PAIN_CALCULATOR_DEFAULTS.leakMax,
    Math.max(PAIN_CALCULATOR_DEFAULTS.leakMin, Math.round(value)),
  )
}

/** persentase kebocoran terhadap gaji (BELUM dibulatkan — ambang roast butuh presisi) */
export function painPercentage(monthlyIncome: number, monthlyLeak: number): number {
  const income = Math.max(0, monthlyIncome)
  if (income === 0) return 0
  return (Math.max(0, monthlyLeak) / income) * 100
}

/** tier roast dari persentase kebocoran; nilai aneh diperlakukan sebagai aman */
export function roastFor(percentageOfIncome: number): PainRoast {
  const percentage = Number.isFinite(percentageOfIncome)
    ? Math.max(0, percentageOfIncome)
    : 0
  if (percentage < 15) return PAIN_ROAST.safe
  if (percentage <= 30) return PAIN_ROAST.warning
  return PAIN_ROAST.danger
}

/** tiga angka utama kalkulator — satu pintu ke rumus kanon landing */
export function computeGaibResult(
  monthlyIncome: number,
  monthlyLeak: number,
): PainResult {
  return computePain(monthlyIncome, monthlyLeak)
}

/* Harga acuan padanan. Sengaja konstanta eksplisit supaya badge bisa diuji:
   iPhone 16 baru ±Rp12 jt, kopi susu kekinian ±Rp10 rb. */
const IPHONE_UNIT_PRICE = 12_000_000
const COFFEE_CUP_PRICE = 10_000

/** padanan dunia nyata untuk uang yang menguap dalam 1 tahun */
export function yearlyEquivalent(amount: number): string {
  const yearly = Math.max(0, Math.round(amount))
  if (yearly === 0) return 'Nol bocor. Pertahankan gaya hidup ini!'

  const iphoneUnits = Math.floor(yearly / IPHONE_UNIT_PRICE)
  if (iphoneUnits >= 1) return `Setara ${iphoneUnits} unit iPhone 16 baru`

  const cups = Math.max(1, Math.floor(yearly / COFFEE_CUP_PRICE))
  return `Setara ${cups.toLocaleString('id-ID')} cup kopi kekinian`
}

/** padanan dunia nyata untuk bencana 5 tahun */
export function fiveYearEquivalent(amount: number): string {
  const fiveYear = Math.max(0, Math.round(amount))
  if (fiveYear === 0) return 'Belum ada yang bocor. Jaga terus!'

  if (fiveYear >= 300_000_000) return 'Setara 1 unit rumah subsidi, cash'
  if (fiveYear >= 120_000_000) return 'Setara DP rumah pertama atau modal usaha'
  if (fiveYear >= 60_000_000) {
    return 'Setara DP rumah pertama atau modal resepsi impian'
  }
  if (fiveYear >= 30_000_000) return 'Setara DP mobil pertama'
  if (fiveYear >= 10_000_000) return 'Setara modal usaha kecil'
  return 'Setara liburan keluarga 1 minggu'
}

/** badge kecil di kartu investasi: keuntungan dari bunga majemuk */
export function investmentGainBadge(gain: number): string {
  const value = Math.max(0, Math.round(gain))
  if (value <= 0) return 'Bunga majemuk 5% p.a. · 60 bulan'
  return `+${formatIDR(value)} dari compounding`
}

/* ── PEMILIH ANGKA & CAPTION TAB ────────────────────────────────────────────
   Komponen tidak pernah menulis `result.yearlyLoss` sendiri: satu fungsi
   memetakan tab → nominal, satu lagi → kalimat padanan. Dengan begitu label
   tab dan angka yang tampil mustahil melenceng satu sama lain. */

/** nominal yang tampil untuk tab aktif */
export function resultAmountForTab(tab: PainResultTabId, result: PainResult): number {
  switch (tab) {
    case 'yearly':
      return result.yearlyLoss
    case 'invested':
      return result.investedValue
    case 'fiveYear':
    default:
      return result.fiveYearLoss
  }
}

/** kalimat di bawah angka besar — padanan dunia nyata atau catatan asumsi */
export function resultCaptionForTab(tab: PainResultTabId, result: PainResult): string {
  switch (tab) {
    case 'yearly':
      return yearlyEquivalent(result.yearlyLoss)
    case 'invested':
      return PAIN_CALCULATOR_COPY.results.investedNote
    case 'fiveYear':
    default:
      return fiveYearEquivalent(result.fiveYearLoss)
  }
}
