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
   Slider gaji sudah DIHAPUS dari section ini: satu-satunya yang digeser user
   adalah "Uang Gaib / Bulan". Slider itu berhenti di Rp 5 juta karena bocor
   5 juta sebulan sudah ekstrem — angka lebih besar tidak menambah kesadaran,
   cuma bikin hasil terasa mengarang.

   Tapi slider bukan penjara: siapa pun yang kebocorannya di atas Rp 5 juta
   bisa MENGETIK nominalnya sendiri (input manual) sampai `leakManualMax`.
   Saat nilai manual lebih besar, slider cukup mentok di batas atasnya —
   lihat `clampLeakSlider()`. */
export const PAIN_CALCULATOR_DEFAULTS = {
  leakMin: 0,
  leakMax: 5_000_000,
  leakStep: 50_000,
  defaultLeak: 1_500_000,
  leakManualMax: 100_000_000,
} as const

/* ── COPY — SEMUA TEKS YANG DILIHAT USER ────────────────────────────────────
   Nada bicara: Gen-Z / first-jobber Indonesia, jujur, sedikit menyindir tapi
   tidak menghakimi. Angka rupiah di dalam copy DITURUNKAN dari konstanta di
   atas supaya tidak lahir dua versi nominal. */
export const PAIN_CALCULATOR_COPY = {
  eyebrow: 'Hitung Sendiri',
  titleLead: 'Gaji kamu',
  titleEmphasis: 'habis',
  titleTail: 'ke mana?',
  leakLabel: 'Bocor halus / bulan',
  leakInputAria: 'Bocor halus per bulan, boleh diketik manual',
  resultLabel: 'Hasil simulasi',
  tabsAria: 'Pilih rentang hasil simulasi',
  results: {
    investedNote: 'Asumsi 5% p.a. · 60 bulan',
  },
  cta: 'Mulai Catat Sekarang',
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
    message: 'Masih aman. Pelan-pelan aja.',
  },
  warning: {
    tone: 'warning',
    emoji: '🟡',
    message: 'Bocor halus terdeteksi. Gaji kamu mulai menipis.',
  },
  danger: {
    tone: 'danger',
    emoji: '🔴',
    message: 'Gaji kamu hampir habis buat jajan kecil. Masih bisa dirapikan, kok.',
  },
} as const

export type PainRoastTone = keyof typeof PAIN_ROAST
export type PainRoast = (typeof PAIN_ROAST)[PainRoastTone]

/* ── FUNGSI MURNI ─────────────────────────────────────────────────────────── */

/** jaga kebocoran (termasuk hasil ketik manual) tetap rupiah utuh di 0..batas manual */
export function clampLeak(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(
    PAIN_CALCULATOR_DEFAULTS.leakManualMax,
    Math.max(PAIN_CALCULATOR_DEFAULTS.leakMin, Math.round(value)),
  )
}

/** nilai untuk SLIDER — mentok di 5jt walau nominal manualnya lebih besar */
export function clampLeakSlider(value: number): number {
  return Math.min(PAIN_CALCULATOR_DEFAULTS.leakMax, clampLeak(value))
}

/* ── INPUT MANUAL: BACA & TAMPILKAN ─────────────────────────────────────────
   Slider mentok di 5jt, jadi user dengan kebocoran lebih besar mengetik
   sendiri. Dua fungsi di bawah menjaga bentuk angkanya tetap satu:
     • `formatLeakInput(1500000)` → "1.500.000"
     • `parseLeakInput("1.500.000")` → 1500000
   Titik diperlakukan sebagai pemisah ribuan (dibuang lalu digitnya dibaca),
   dan teks tanpa digit dianggap "belum ada angka" (`null`) supaya field yang
   sedang dikosongkan tidak memaksa hasilnya jadi Rp 0. */

/** bentuk tampilan angka di dalam field: 1500000 → "1.500.000" */
export function formatLeakInput(value: number): string {
  return Math.max(0, Math.round(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/* ── TAMPILAN SAAT MENGETIK ─────────────────────────────────────────────────
   User harus melihat titik ribuan SELAMA mengetik, bukan angka polos yang
   bikin ragu ("ini 150000 atau 1.500.000?"). Aturannya:
     · hanya digit/titik  → digit dikelompokkan ulang tiap ketikan
       ("75000" → "75.000", "7500000" → "7.500.000");
     · ada huruf/koma     → biarkan apa adanya supaya singkatan ("2jt",
       "1,5jt", "50rb") masih bisa diselesaikan; blur yang merapikannya.
   Titik yang diketik manual ikut dibuang lalu dikelompokkan ulang, jadi satu
   nominal tidak pernah punya dua bentuk. */
export function formatLeakTyping(raw: string): string {
  if (/[a-zA-Z,]/.test(raw)) return raw
  const digits = raw.replace(/\D/g, '').slice(0, 12)
  if (!digits) return ''
  return formatLeakInput(Number(digits))
}

/* Satuan yang boleh diketik langsung di field (desktop / tempel teks):
   "2jt" → 2.000.000, "1,5jt" → 1.500.000, "50rb" → 50.000. Urutannya penting:
   "juta" harus dicek sebelum "jt", dan "ribu" sebelum "rb". */
const LEAK_SUFFIX_UNITS: Array<[suffix: string, factor: number]> = [
  ['juta', 1_000_000],
  ['ribu', 1_000],
  ['jt', 1_000_000],
  ['rb', 1_000],
  ['k', 1_000],
]

/** baca ketikan user (titik/teks lain diabaikan); tanpa angka → null */
export function parseLeakInput(raw: string): number | null {
  const text = raw.trim().toLowerCase().replace(/\s+/g, '')
  if (!text) return null

  const unit = LEAK_SUFFIX_UNITS.find(([suffix]) => text.endsWith(suffix))
  if (unit) {
    const [suffix, factor] = unit
    const numberText = text.slice(0, -suffix.length).replace(/\./g, '').replace(',', '.')
    const amount = Number(numberText)
    if (!numberText || !Number.isFinite(amount) || amount < 0) return null
    return Math.round(amount * factor)
  }

  const digits = text.replace(/\D/g, '')
  if (!digits) return null
  const value = Number(digits.slice(0, 12))
  return Number.isFinite(value) ? value : null
}

/** angka ringkas untuk caption slider: 5000000 → "Rp 5 jt" */
export function formatCompactIDR(value: number): string {
  const amount = Math.max(0, Math.round(value))
  if (amount === 0) return 'Rp 0'
  const trim = (ratio: number) => String(Number(ratio.toFixed(1))).replace('.', ',')
  if (amount >= 1_000_000_000) return `Rp ${trim(amount / 1_000_000_000)} M`
  if (amount >= 1_000_000) return `Rp ${trim(amount / 1_000_000)} jt`
  if (amount >= 1_000) return `Rp ${trim(amount / 1_000)} rb`
  return `Rp ${amount}`
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

/* Gaji acuan untuk kolom persentase hasil (`percentageOfIncome`). Slider gaji
   sudah tidak tampil lagi, tapi rumus kanon `computePain()` tetap butuh satu
   angka pemasukan; 5jt adalah gaji awal yang dulu dipakai section ini. */
const REFERENCE_SALARY = 5_000_000

/** tiga angka utama kalkulator — satu pintu ke rumus kanon landing */
export function computeGaibResult(monthlyLeak: number): PainResult {
  return computePain(REFERENCE_SALARY, monthlyLeak)
}

/* ── HARGA ACUAN NYATA (RISET PASAR 2024–2026) ──────────────────────────────
   Satu sumber harga untuk semua padanan (1 tahun, 5 tahun, lencana bunga).
   Nilai sengaja eksplisit & diekspor supaya bisa diuji dan supaya copy tidak
   pernah memuat nominal berbeda dari yang dipakai menghitung.

   Acuan: harga ritel resmi iBox/Digimap (iPhone 16 & 16 Pro Max), OTR Jakarta
   (Honda BeAT), harga ritel Sony Indonesia (PlayStation 5 Slim), tiket PP
   Jakarta–Tokyo, OTR LCGC (Daihatsu Ayla), Kepmen PUPR rumah subsidi
   Jabodetabek bebas PPN, dan OTR mobil keluarga (Avanza/Xpander). */
export const PAIN_REFERENCE_PRICES = {
  /** es kopi susu gula aren di kedai kopi populer */
  coffeeCup: 20_000,
  /** iPhone 16 128GB, harga rilis iBox/Digimap */
  iphone16: 15_000_000,
  /** iPhone 16 Pro Max 256GB, dibulatkan dari harga ritel resmi */
  iphone16ProMax: 25_000_000,
  /** Honda BeAT baru, OTR Jakarta */
  hondaBeat: 18_500_000,
  /** PlayStation 5 Slim, harga ritel Sony Indonesia */
  ps5Slim: 9_500_000,
  /** tiket pesawat pulang-pergi Jakarta–Tokyo */
  tokyoTicket: 9_000_000,
  /** Daihatsu Ayla baru, OTR LCGC */
  lcgcAyla: 140_000_000,
  /** rumah subsidi Jabodetabek bebas PPN (Kepmen PUPR) */
  rumahSubsidi: 185_000_000,
  /** Avanza/Xpander baru, OTR mobil keluarga */
  avanzaXpander: 270_000_000,
} as const

const { coffeeCup: COFFEE_CUP_PRICE, iphone16: IPHONE_16_PRICE } = PAIN_REFERENCE_PRICES

/** jumlah unit utuh yang "kebeli"; 0 berarti jangan disebut sama sekali */
function unitsFor(amount: number, price: number): number {
  return Math.floor(amount / price)
}

/** `${n} unit ${label}` hanya kalau n ≥ 1 — menghindari "0 unit motor" */
function unitLabel(count: number, label: string): string | null {
  return count >= 1 ? `${count} unit ${label}` : null
}

/** gabungkan padanan valid dengan "atau", tanpa koma menggantung */
function alternatives(parts: Array<string | null>): string {
  return parts.filter((part): part is string => part !== null).join(' atau ')
}

/** padanan dunia nyata untuk uang yang menguap dalam 1 tahun */
export function yearlyEquivalent(amount: number): string {
  const yearly = Math.max(0, Math.round(amount))
  if (yearly === 0) return 'Nol bocor. Pertahankan gaya hidup ini!'

  /* di bawah 3jt: masih masuk akal dihitung per cup (Rp 20 rb) */
  if (yearly < 3_000_000) {
    const cups = Math.max(1, Math.floor(yearly / COFFEE_CUP_PRICE))
    return `Setara ${cups.toLocaleString('id-ID')} cup kopi susu gula aren`
  }

  if (yearly < 8_000_000) {
    return 'Setara 1 tiket konser festival VIP atau 1 pasang sneakers idaman'
  }

  if (yearly < 15_000_000) {
    return 'Setara 1 unit PlayStation 5 Slim baru atau tiket pesawat PP Jakarta–Tokyo'
  }

  if (yearly < 30_000_000) {
    return `Setara ${alternatives([
      unitLabel(unitsFor(yearly, IPHONE_16_PRICE), 'iPhone 16 baru'),
      unitLabel(unitsFor(yearly, PAIN_REFERENCE_PRICES.hondaBeat), 'motor Honda BeAT baru cash'),
    ])}`
  }

  return `Setara ${alternatives([
    unitLabel(unitsFor(yearly, PAIN_REFERENCE_PRICES.iphone16ProMax), 'iPhone 16 Pro Max'),
    unitLabel(unitsFor(yearly, PAIN_REFERENCE_PRICES.hondaBeat), 'motor Honda BeAT baru cash'),
  ])}`
}

/** padanan dunia nyata untuk bencana 5 tahun — dari jutaan sampai miliaran */
export function fiveYearEquivalent(amount: number): string {
  const fiveYear = Math.max(0, Math.round(amount))
  if (fiveYear === 0) return 'Belum ada yang bocor. Jaga terus!'

  if (fiveYear < 10_000_000) {
    return 'Setara solo trip liburan impian ke Bali atau Labuan Bajo'
  }
  if (fiveYear < 25_000_000) {
    return 'Setara 1 unit motor Honda BeAT baru cash atau liburan seminggu ke Jepang'
  }
  if (fiveYear < 50_000_000) {
    return 'Setara uang muka (DP) mobil baru atau 1 laptop kerja spek pro impian'
  }
  if (fiveYear < 100_000_000) {
    return 'Setara uang muka (DP) dan biaya KPR rumah komersial pertama atau modal resepsi pernikahan idaman'
  }
  if (fiveYear < 180_000_000) {
    return 'Setara 1 unit mobil baru cash (Daihatsu Ayla) tanpa cicilan atau modal bisnis serius'
  }
  if (fiveYear < 300_000_000) {
    /* nominal rumah diturunkan dari konstanta, bukan diketik ulang */
    const rumahJuta = PAIN_REFERENCE_PRICES.rumahSubsidi / 1_000_000
    return `Setara 1 unit rumah subsidi Jabodetabek cash (Rp ${rumahJuta} juta) bebas utang KPR`
  }
  if (fiveYear < 500_000_000) {
    return 'Setara 1 unit mobil keluarga baru (Avanza atau Xpander) cash'
  }
  if (fiveYear < 1_000_000_000) {
    return 'Setara 1 unit SUV gagah (Pajero Sport atau Fortuner) cash atau renovasi rumah total'
  }
  if (fiveYear < 2_500_000_000) {
    return 'Setara 1 unit mobil listrik mewah (Ioniq 6 atau Mercedes-Benz) atau 1 unit apartemen di pusat kota'
  }
  if (fiveYear < 5_000_000_000) {
    return 'Setara rumah mewah di kawasan mandiri elit atau modal pensiun dini seumur hidup'
  }
  if (fiveYear < 10_000_000_000) {
    return 'Setara villa mewah pribadi di Bali atau 1 unit mobil sport idaman'
  }
  return 'Setara kebebasan finansial total sekeluarga seumur hidup'
}

/* ── LENCANA BUNGA MAJEMUK ──────────────────────────────────────────────────
   Bunga majemuk adalah "uang gratis" di atas modal pokok: setoran bulanannya
   tetap sama, tapi hasil akhirnya lebih besar. Karena itu padanannya dipilih
   dari barang yang bisa didapat TANPA menyentuh modal — dan turun satu tingkat
   kalau keuntungannya belum mencapai harga barang tersebut. */

/** padanan nyata dari keuntungan compounding (tanpa awalan "Setara") */
export function investmentGainEquivalent(gain: number): string {
  const value = Math.max(0, Math.round(gain))
  if (value <= 0) return ''

  if (value >= IPHONE_16_PRICE) {
    return `${unitsFor(value, IPHONE_16_PRICE)} unit iPhone 16 baru`
  }
  if (value >= PAIN_REFERENCE_PRICES.ps5Slim) {
    return '1 unit PlayStation 5 Slim baru'
  }
  if (value >= PAIN_REFERENCE_PRICES.tokyoTicket) {
    return '1 tiket pesawat PP Jakarta–Tokyo'
  }
  if (value >= 3_000_000) {
    return '1 tiket konser festival VIP atau 1 pasang sneakers idaman'
  }

  const cups = Math.max(1, Math.floor(value / COFFEE_CUP_PRICE))
  return `${cups.toLocaleString('id-ID')} cup kopi susu gula aren`
}

/** badge kecil di kartu investasi: keuntungan compounding + padanan nyatanya */
export function investmentGainBadge(gain: number): string {
  const value = Math.max(0, Math.round(gain))
  if (value <= 0) return 'Bunga majemuk 5% p.a. · 60 bulan'
  return `+${formatIDR(value)} dari compounding · setara ${investmentGainEquivalent(value)}, tanpa menyentuh modal tabungan pokok`
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
