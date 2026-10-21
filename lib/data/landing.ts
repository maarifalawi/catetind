/* ── LANDING PAGE PUBLIK (/) — copy, seed, & logika MURNI ────────────────────
   Halaman pemasaran di ROOT. Sama seperti `lib/data/welcome.ts`, `auth.ts`, dan
   `pricing.ts`: file ini murni (TANPA React) supaya komponen section nol string
   user-facing.

   Dua aturan yang mengikat:
     1. Landing lama sudah dihapus; `app/page.tsx` sekarang merender section baru
        di `components/landing/lp/*`.
     2. HARGA (`LANDING_TIERS`/`LP_PRICING`) HANYA DIBACA dari `PLANS` di
        `lib/data/pricing.ts`: lifetime 1/129k/299k (sekali bayar, akses
        selamanya). Paket bulanan sudah tidak dijual. Jangan menulis nominal di
        komponen.
   ────────────────────────────────────────────────────────────────────────── */

import { SITE_ORIGIN } from '../site'
import {
  LIFETIME_LABEL,
  PLANS,
  buildCheckoutHref,
  formatIDR,
  type BillingPeriod,
  type PlanId,
} from './pricing'
import { OVERVIEW_PANEL_COPY } from './home'
import { HOME_MONEY_COPY, HOME_MONEY_DAY_LABEL } from './home-money'

/** satu pintu impor untuk konsumen harga landing */
export { formatIDR }

/* ── RUTE ─────────────────────────────────────────────────────────────────── */
export const LANDING_PATH = '/'
export const REGISTERED_PATH = '/registered'

/** nama parameter paket di `/registered` — dibawa LeadSheet dari kartu harga */
export const REGISTERED_PLAN_PARAM = 'plan'

/*
 * HARGA LANDING — SATU SUMBER.
 *
 * `LANDING_TIERS[].id` memakai id yang SAMA dengan `PlanId` di
 * `lib/data/pricing.ts` ('catet-aja' | 'waras' | 'sultan'), dan harganya
 * DIBACA dari `PLANS[]` (lifetime — satu-satunya periode yang dijual). Tautan
 * checkout selalu membawa `period=lifetime`, jadi tidak ada dua daftar harga.
 */


/**
 * Tautan ke halaman "Terima kasih" setelah registrasi dari landing.

 * Paket yang dipilih user IKUT dibawa sebagai query. Sebelumnya pilihan itu
 * dibuang begitu sheet ditutup: halaman terima kasih tidak tahu paket apa yang
 * diminati, dan user harus memilih ulang dari nol kalau mau lanjut bayar.
 */
export function buildRegisteredHref(
  email: string,
  planId?: PlanId | null,
  period: BillingPeriod = 'lifetime',
): string {
  const query = new URLSearchParams({ email: email.trim(), period })
  if (planId) query.set(REGISTERED_PLAN_PARAM, planId)
  return `${REGISTERED_PATH}?${query.toString()}`
}
export const LANDING_LOGIN_HREF = '/login'

/* ── KONTAK RESMI ───────────────────────────────────────────────────────────
   Satu sumber nomor/email supaya tidak ada nomor lokal di `href` dan tidak ada
   `support@` lama yang lolos ke produk. */
export const LP_WHATSAPP = {
  display: '0817-7577-7778',
  e164: '6281775777778',
  href: 'https://wa.me/6281775777778',
  prefill: 'Halo Minca, mau tanya-tanya soal CatetInd dong!',
} as const

/** prefill di-encode sekali di sini supaya semua tautan WA konsisten */
export const LP_WHATSAPP_HREF_WITH_TEXT = `${LP_WHATSAPP.href}?text=${encodeURIComponent(LP_WHATSAPP.prefill)}`

export const LP_SUPPORT_EMAIL = 'halo@catetind.com'
export const LP_SUPPORT_MAILTO = `mailto:${LP_SUPPORT_EMAIL}`

/* ── PENANDA ANTAR-SECTION ──────────────────────────────────────────────────
   Dipakai `LandingSectionDivider` DI ANTARA section landing. Nomornya urut
   dari atas halaman dan labelnya sengaja pendek supaya garis pemisah tidak
   berubah menjadi menu kedua. Semua teks tetap di file data, bukan di JSX. */
export const LANDING_SECTION_MARKERS = {
  calculator: { index: '01', label: 'Kalkulator' },
  mission: { index: '02', label: 'Misi' },
  pricing: { index: '03', label: 'Harga' },
  faq: { index: '04', label: 'FAQ' },
} as const

export type LandingSectionMarker =
  (typeof LANDING_SECTION_MARKERS)[keyof typeof LANDING_SECTION_MARKERS]

/* ── SEO / META ─────────────────────────────────────────────────────────────
   Dipakai `app/page.tsx` (metadata) supaya judul & deskripsi tidak ditulis dua
   kali. `ogUrl` adalah domain kanon produk. */

/** rentang harga kanon dalam teks — dipakai copy landing supaya angkanya tidak ditulis tangan */
const PRICE_RANGE_LABEL = `${formatIDR(PLANS[0].lifetime)}-${formatIDR(PLANS[PLANS.length - 1].lifetime)}`
export const LANDING_META = {
  title: 'CatetInd: Catat Keuangan 4 Detik, Dibantu AI',
  description: `Catatan keuangan buat Gen-Z Indonesia: satu catatan cukup 4 detik lewat voice atau foto struk, AI Coach yang gak nge-judge, dan laporan yang gampang dibaca. Mulai ${formatIDR(PLANS[0].lifetime)} sekali bayar untuk akses selamanya, tanpa tagihan bulanan.`,
  ogTitle: 'Catet keuangan 4 detik. Sisanya biar AI yang mikir.',
  ogDescription: `CatetInd: sekali bayar untuk akses selamanya, mulai ${formatIDR(PLANS[0].lifetime)}. Tanpa tagihan bulanan dan tanpa auto-debet.`,
  ogUrl: SITE_ORIGIN,
} as const

/* ── NAVBAR ─────────────────────────────────────────────────────────────────
   Aturan: logo di kiri, tombol "Masuk" gaya ghost di kanan. Navbar transparan
   di puncak halaman lalu mendapat latar lembut saat digulir (state-nya di
   komponen `landing-navbar.tsx`). */
export const LANDING_NAV = {
  brand: 'CatetInd',
  homeLabel: 'CatetInd, ke beranda',
  homeHref: LANDING_PATH,
  loginLabel: 'Masuk',
  loginHref: LANDING_LOGIN_HREF,
} as const

/* ── SECTION 1 · HOOK (above the fold) ──────────────────────────────────────
   Murni hook emosional: NOL CTA, nol harga, nol daftar fitur. */
export const HERO_COPY = {
  headline: 'Kamu udah gajian berapa kali, tapi punya apa?',
  subheadline: 'Catet dulu. Sisanya, kita bantu bareng.',
  scrollHint: "Scroll untuk cek berapa yang kamu udah 'buang'",
  scrollAria: 'Gulir ke bawah untuk membuka kalkulator pengeluaran',
} as const

/** mockup HUD jatah harian di hero — ILUSTRASI antarmuka, bukan data nyata.
 *  Angkanya sengaja disamakan dengan persona demo di `lib/money/demo-bootstrap.ts`
 *  (anak 20-an, gaji Rp 7,3 juta, awal bulan sisa pas-pasan) supaya hero landing
 *  benar-benar "cermin" dari dashboard yang bisa dilihat di `/app`. */
export const HERO_HUD = {
  eyebrow: 'Jatah harian',
  amount: 'Rp 72.000',
  note: 'Aman 3 hari berturut-turut 🌿',
  /** 0..1 — panjang bar progres */
  progress: 0.62,
  plantLabel: 'Tahap 2 · Tunas — tanamanmu lagi happy!',
} as const

/* ── SECTION 1b · ADEGAN "PONSEL DI TANGAN" ─────────────────────────────────
   Mockup hero bukan lagi satu kartu melayang, melainkan SATU ADEGAN utuh: layar
   aplikasi di dalam bingkai iPhone yang dipegang tangan — pola "product shot"
   yang sama dengan gambar referensi pemilik produk.

   Tiga hal yang mengikat isi blok ini:

     1. LAYAR = REPLIKA home sungguhan (`/app`): strip status, header, deck
        dompet, sampai kartu "Transaksi Terakhir". Karena itu seluruh kalimat
        yang SUDAH punya rumah di `lib/data/home*.ts` DIBACA dari sana
        (`HOME_MONEY_COPY`, `HOME_MONEY_DAY_LABEL`, `OVERVIEW_PANEL_COPY`) —
        tidak ada satu pun yang ditulis ulang di sini. Kalau copy app berubah,
        hero ikut berubah; mustahil ada dua versi kalimat yang sama.

     2. ANGKA = CERMIN persona demo (`lib/money/demo-bootstrap.ts`): dompet BCA
        1.650.000 · GoPay 320.000 · ShopeePay 85.000 · Tunai 65.000, gaji
        Rp 7.300.000, pengeluaran Rp 5.180.000. Saldo agregat kartu depan TIDAK
        ditulis tangan — ia dijumlahkan dari daftar dompet di bawah, dan
        ringkasan periode menurunkan `net` dari dua angkanya sendiri, jadi angka
        yang tidak konsisten mustahil lolos (dikunci `landing.test.ts`). Inilah
        yang membuat hero ini boleh dipakai sebagai janji: angka di landing
        adalah angka yang benar-benar muncul di dalam app.

     3. LAYAR BISA DITUKAR GAMBAR. Kalau pemilik produk ingin memakai screenshot
        asli (hasil tangkapan dari HP), cukup simpan berkasnya di `public/` lalu
        isi `HERO_DEVICE_SCREENSHOT` di bawah — tidak ada komponen yang perlu
        disentuh. Selama nilainya `null`, hero memakai replika UI live yang lebih
        tajam di semua ukuran layar (tanpa aset raster, otomatis ikut token).
   ────────────────────────────────────────────────────────────────────────── */

/** Salinan layar (gambar) — `null` = pakai replika UI live di komponen. */
export const HERO_DEVICE_SCREENSHOT: string | null = null

/** jam di strip status layar hero — angka kanon mockup Apple (bukan jam user) */
export const HERO_DEVICE_STATUS_TIME = '9:41'

/**
 * Dompet di deck hero. URUTANNYA = urutan pembuatan di persona demo, dan itu
 * penting: deck app menumpuk `[Semua Dompet, ...dompet]` dengan slot 0 di depan,
 * jadi dompet TERAKHIR (Tunai) duduk paling dalam — label yang mengintip paling
 * atas di tumpukan. Urutan itu diturunkan di bawah, bukan diketik terpisah.
 */
const HERO_DEVICE_WALLETS = [
  { name: 'BCA', type: 'Bank', balance: 1_650_000 },
  { name: 'GoPay', type: 'E-Wallet', balance: 320_000 },
  { name: 'ShopeePay', type: 'E-Wallet', balance: 85_000 },
  { name: 'Tunai', type: 'Cash', balance: 65_000 },
] as const

/** saldo kartu agregat = JUMLAH dompet di atas (Rp 2.120.000) */
const HERO_DEVICE_BALANCE = HERO_DEVICE_WALLETS.reduce((sum, wallet) => sum + wallet.balance, 0)

/** dua angka bulan berjalan — dipakai strip ringkasan layar & kartu melayang */
const HERO_DEVICE_MONTHLY = { income: 7_300_000, spending: 5_180_000 } as const

/**
 * Baris "Transaksi Terakhir" di layar hero — nama, kategori, dan jamnya PERSIS
 * baris seed persona demo untuk hari ini, jadi pengunjung yang mendaftar lalu
 * membuka `/app` melihat catatan yang sama seperti yang ia lihat di landing.
 *
 * Nominalnya angka mentah + `type`: label `-Rp …` disusun komponen lewat kanon
 * `amountSign()` + `formatIDR()` — sama seperti kartu aslinya, jadi tidak ada
 * string rupiah yang ditulis dua kali di dua tempat.
 */
const HERO_DEVICE_TXN_ROWS = [
  {
    title: 'Nongkrong (teh + gorengan)',
    category: 'Kopi & Nongkrong',
    time: '16:05',
    amount: 34_500,
    type: 'expense',
  },
  {
    title: 'Warteg Bahari',
    category: 'Makan Siang & GoFood',
    time: '12:45',
    amount: 35_000,
    type: 'expense',
  },
  {
    title: 'Mie Gacoan (makan siang bareng kantor)',
    category: 'Makan Siang & GoFood',
    time: '12:40',
    amount: 28_500,
    type: 'expense',
  },
  {
    title: 'Kopi Kenangan Oat Latte',
    category: 'Kopi & Nongkrong',
    time: '09:15',
    amount: 32_000,
    type: 'expense',
  },
  {
    title: 'Gojek ke Stasiun (hujan deras)',
    category: 'Transport (Ojol & KRL)',
    time: '07:20',
    amount: 19_000,
    type: 'expense',
  },
] as const

/** isi layar hero: deck dompet & kartu transaksi (satu paket data) */
export const HERO_DEVICE = {
  walletDeck: {
    /** "Semua Dompet" — kata yang sama dengan badge panel Ringkasan Saldo */
    label: OVERVIEW_PANEL_COPY.badgeAll,
    /** jumlah dompet aktif, dibaca dari daftar dompet (bukan diketik ulang) */
    sub: `${HERO_DEVICE_WALLETS.length} dompet aktif`,
    total: HERO_DEVICE_BALANCE,
    /** label yang mengintip di belakang kartu depan, URUT DALAM → DEPAN */
    peeking: [...HERO_DEVICE_WALLETS]
      .reverse()
      .slice(0, HERO_DEVICE_WALLETS.length - 1)
      .map((wallet) => wallet.name),
    /** titik indikator geser = kartu agregat + tiap dompet */
    dots: HERO_DEVICE_WALLETS.length + 1,
  },
  txn: {
    title: HOME_MONEY_COPY.txnTitle,
    subtitle: HOME_MONEY_COPY.txnSubtitle,
    seeAll: HOME_MONEY_COPY.seeAll,
    /** label grup hari (ditampilkan huruf besar) — satu definisi dengan app */
    dayLabel: HOME_MONEY_DAY_LABEL.today,
    rows: HERO_DEVICE_TXN_ROWS,
  },
} as const

/**
 * Ringkasan periode di strip bawah kartu transaksi layar hero. `net` DITURUNKAN
 * dari dua angkanya sendiri, jadi angka di layar tidak mungkin berbeda cerita
 * dengan pengurangannya; kata sambungnya (`masuk,` / `keluar — net`) memakai
 * string kanon `HOME_MONEY_COPY` yang sama dengan kartu Home sungguhan.
 */
export const HERO_DEVICE_MONTHLY_SUMMARY = {
  period: HOME_MONEY_COPY.period,
  income: HERO_DEVICE_MONTHLY.income,
  spending: HERO_DEVICE_MONTHLY.spending,
  net: HERO_DEVICE_MONTHLY.income - HERO_DEVICE_MONTHLY.spending,
  inflow: HOME_MONEY_COPY.txnInflow,
  outflow: HOME_MONEY_COPY.txnOutflow,
} as const

/**
 * Kartu kaca melayang di sekitar ponsel — pola "floating cards" pada gambar
 * referensi pemilik produk. Isinya SENGAJA bukan hiasan acak: kartu "Jatah
 * harian" dan "Tanaman" memakai `HERO_HUD` yang sama dengan mockup lama, dan
 * dua kartu uang memakai angka bulan yang sama dengan strip ringkasan di layar.
 * Jadi seluruh hero menceritakan SATU keadaan keuangan, bukan tiga versi.
 *
 * `progress` (0..1) menggambar bar tipis seperti kartu jatah harian di Home;
 * `null` = kartu tanpa bar. Tata letaknya TIDAK di sini — posisi tiap kartu
 * diatur komponen (`hero-device.tsx`) karena itu urusan tampilan, bukan isi.
 */
export const HERO_DEVICE_FLOAT = [
  {
    id: 'jatah',
    label: HERO_HUD.eyebrow,
    value: HERO_HUD.amount,
    hint: HERO_HUD.note,
    progress: HERO_HUD.progress,
  },
  {
    id: 'masuk',
    label: 'Uang masuk',
    value: `+${formatIDR(HERO_DEVICE_MONTHLY.income)}`,
    hint: HOME_MONEY_COPY.period,
    progress: null,
  },
  {
    id: 'keluar',
    label: 'Uang keluar',
    value: `-${formatIDR(HERO_DEVICE_MONTHLY.spending)}`,
    hint: HOME_MONEY_COPY.period,
    progress: null,
  },
  {
    id: 'tanaman',
    label: 'Tanaman',
    value: HERO_HUD.plantLabel,
    hint: '',
    progress: null,
  },
] as const

/**
 * Kalimat pengganti adegan hero untuk pembaca layar. Adegannya murni ILUSTRASI
 * (seluruh elemennya `aria-hidden`), jadi isi layarnya diringkas SEKALI di sini
 * — bukan ditulis di JSX — dan angkanya ikut data yang sama dengan yang
 * digambar, jadi deskripsinya tidak bisa melenceng dari gambarnya.
 */
export const HERO_DEVICE_ARIA = `Ilustrasi aplikasi CatetInd: layar Home di dalam ponsel yang dipegang tangan, menampilkan ${HERO_DEVICE.walletDeck.label} ${formatIDR(HERO_DEVICE.walletDeck.total)} dari ${HERO_DEVICE.walletDeck.sub} serta daftar ${HERO_DEVICE.txn.title}. Contoh antarmuka, bukan data pengunjung.`

/* ── SECTION 2 · PAIN CALCULATOR ────────────────────────────────────────────
   Semua perhitungan di klien, nol API, hitung ulang tiap input berubah. */
export const CALCULATOR_COPY = {
  eyebrow: 'Hitung sendiri',
  title: 'Berapa yang sebenarnya menguap?',
  subtitle:
    'Isi dua angka. Gak ada yang dikirim ke mana pun — hitungannya jalan di HP-mu sendiri.',
  incomeLabel: 'Gaji per bulan',
  incomeHelper: 'Gaji pokok + tunjangan yang masuk rekening',
  spendingLabel: "Estimasi pengeluaran yang 'gak jelas' per bulan",
  spendingHelper:
    'Yang kamu sendiri gak tau ke mana — jajan, impulse buy, "lah kok habis?"',
  yearlyLead: 'Dalam 1 tahun, kamu kehilangan',
  yearlyTail: 'tanpa jejak.',
  fiveYearLead: 'Dalam 5 tahun, itu jadi',
  fiveYearTail: 'yang menguap.',
  investLead: 'Kalau kamu invest angka itu?',
  investLeadNote: 'dengan return konservatif 5%/tahun',
  shareOfIncomeLead: 'Itu sekitar',
  shareOfIncomeTail: 'dari gajimu tiap bulan.',
  bridge: 'Yang hilang bukan uangnya — tapi pilihan yang bisa kamu punya.',
  softCta: 'Mulai Catat Sekarang',
  /** target gulir-halus ke Section 5 (Pricing) */
  softCtaHref: '#pricing',
} as const

/** parameter rumus — dikumpulkan supaya niat ekonominya terbaca jelas */
export const CALCULATOR_RATE = {
  /** return tahunan konservatif 5% */
  ratePct: 5,
  /** horizon investasi 5 tahun = 60 bulan */
  months: 60,
} as const

/** nilai awal kolom (pre-filled) — satu sumber angka, bukan ditulis di JSX */
export const CALCULATOR_DEFAULTS = {
  income: 5_000_000,
  spending: 1_500_000,
} as const

export interface PainResult {
  /** unknownSpending × 12 */
  yearlyLoss: number
  /** unknownSpending × 12 × 5 */
  fiveYearLoss: number
  /** Future Value of Annuity dari unknownSpending pada 5%/tahun, 60 bulan */
  investedValue: number
  /** investedValue − fiveYearLoss */
  investmentGain: number
  /** bulat(unknownSpending / monthlyIncome × 100) */
  percentageOfIncome: number
}

/**
 * Inti Pain Calculator. `PMT = unknownSpending`, `r = 0.05/12`, `n = 60`.
 * Fungsi murni — dipanggil ulang tiap ketikan, tanpa efek samping.
 */
export function computePain(monthlyIncome: number, unknownSpending: number): PainResult {
  const income = Math.max(0, monthlyIncome)
  const spending = Math.max(0, unknownSpending)
  const yearlyLoss = spending * 12
  const fiveYearLoss = spending * 12 * 5
  const r = CALCULATOR_RATE.ratePct / 100 / 12
  const n = CALCULATOR_RATE.months
  const factor = r === 0 ? n : ((1 + r) ** n - 1) / r
  const investedValue = spending * factor
  return {
    yearlyLoss: Math.round(yearlyLoss),
    fiveYearLoss: Math.round(fiveYearLoss),
    investedValue: Math.round(investedValue),
    investmentGain: Math.round(investedValue - fiveYearLoss),
    percentageOfIncome: income > 0 ? Math.round((spending / income) * 100) : 0,
  }
}

/* ── SECTION 3 · WEALTH GAP VISUALIZER ──────────────────────────────────────
   Dua orang bergaji SAMA, beda kebiasaan menabung. Satu-satunya pembeda adalah
   savings rate; return-nya sama (7% p.a. — blend deposito + RDPU). */
export const WEALTH_GAP_COPY = {
  eyebrow: 'Bukan soal gaji',
  headline: 'Di usia 30, gap-nya sudah Rp43 juta.',
  subtitle: 'Dan perbedaannya bukan dari gaji — tapi dari kebiasaan.',
  chartLabel: 'Proyeksi kekayaan dari usia 24 sampai 40 tahun',
  seriesWithout: 'Tanpa tracking',
  seriesWith: 'Dengan CatetInd',
  footnote:
    'Asumsi: Tanpa tracking = savings rate 5% (median Indonesia, BPS 2025). Dengan tracking konsisten = savings rate 15% (studi Journal of Consumer Finance 2023). Return investasi konservatif 7% p.a. Bukan jaminan, hanya proyeksi edukatif.',
} as const

/** parameter proyeksi wealth gap — angka tersimpan di satu tempat */
export const WEALTH_GAP_PARAMS = {
  defaultMonthlyIncome: 5_000_000,
  startAge: 24,
  endAge: 40,
  /** savings rate orang "tanpa tracking" (5%) */
  savingsWithout: 0.05,
  /** savings rate orang "dengan CatetInd" (15%) */
  savingsWith: 0.15,
  /** return investasi konservatif (7% p.a., majemuk bulanan) */
  annualReturn: 0.07,
} as const

export interface WealthPoint {
  age: number
  /** kekayaan menumpuk tanpa tracking */
  tanpa: number
  /** kekayaan menumpuk dengan CatetInd */
  dengan: number
}

/**
 * Future Value of Annuity untuk tiap usia dari 24 sampai 40. `months` = 0 saat
 * usia 24, jadi KEDUA garis mulai dari nol (dan baru bercabang setelahnya).
 */
export function buildWealthGap(
  monthlyIncome: number = WEALTH_GAP_PARAMS.defaultMonthlyIncome,
): WealthPoint[] {
  const { startAge, endAge, savingsWithout, savingsWith, annualReturn } = WEALTH_GAP_PARAMS
  const r = annualReturn / 12
  const income = Math.max(0, monthlyIncome)
  const points: WealthPoint[] = []
  for (let age = startAge; age <= endAge; age += 1) {
    const months = (age - startAge) * 12
    const factor = months === 0 ? 0 : r === 0 ? months : ((1 + r) ** months - 1) / r
    points.push({
      age,
      tanpa: Math.round(income * savingsWithout * factor),
      dengan: Math.round(income * savingsWith * factor),
    })
  }
  return points
}

/**
 * Ringkas sumbu Y chart ("Xjt") — cukup jutaan utuh karena proyeksinya memang
 * berjuta-juta; desimal justru bikin label sumbu berdesakan di 375 px.
 */
export function formatJuta(value: number): string {
  const juta = value / 1_000_000
  if (juta === 0) return 'Rp 0'
  if (juta >= 10) return `${Math.round(juta)}jt`
  return `${juta.toFixed(1).replace('.', ',')}jt`
}

/* ── SECTION 4 · SOCIAL PROOF ───────────────────────────────────────────────
   Part A: feed pembelian SEEDED — bentuknya sengaja siap diganti satu query
   Supabase (satu array of object, tanpa logika di komponen). */
export interface LiveFeedEntry {
  id: string
  name: string
  city: string
  /** nominal paket yang dibeli (rupiah) — DIBACA dari `PLANS`, bukan angka tulis tangan */
  price: number
  /** waktu relatif yang sudah diformat — statis supaya bebas hydration mismatch */
  time: string
}

/** harga paket untuk feed & angka lain di file ini — satu sumber dengan penagihan */
function planPrice(id: PlanId): number {
  return (PLANS.find((plan) => plan.id === id) ?? PLANS[0]).lifetime
}

export const LIVE_FEED_SEED: LiveFeedEntry[] = [
  { id: 'rina', name: 'Rina', city: 'Jakarta', price: planPrice('waras'), time: '12 menit lalu' },
  { id: 'budi', name: 'Budi', city: 'Bandung', price: planPrice('catet-aja'), time: '34 menit lalu' },
  { id: 'sari', name: 'Sari', city: 'Surabaya', price: planPrice('waras'), time: '1 jam lalu' },
  { id: 'dimas', name: 'Dimas', city: 'Jakarta', price: planPrice('sultan'), time: '2 jam lalu' },
  { id: 'amel', name: 'Amel', city: 'Yogyakarta', price: planPrice('waras'), time: '3 jam lalu' },
  { id: 'fajar', name: 'Fajar', city: 'Malang', price: planPrice('catet-aja'), time: '5 jam lalu' },
  { id: 'nadia', name: 'Nadia', city: 'Depok', price: planPrice('waras'), time: '8 jam lalu' },
  { id: 'rizky', name: 'Rizky', city: 'Semarang', price: planPrice('sultan'), time: '1 hari lalu' },
]

export const LIVE_FEED_COPY = {
  eyebrow: 'Baru saja bergabung',
  title: 'Mereka sudah mulai nyatet',
  liveBadge: 'LIVE',
  /** baris per entri: "🌿 Rina dari Jakarta · bergabung di harga Rp 119.000 · 12 menit lalu" */
  entry: (entry: LiveFeedEntry) =>
    `🌿 ${entry.name} dari ${entry.city} · bergabung di harga ${formatIDR(entry.price)} · ${entry.time}`,
  ariaLive: 'Feed pembelian terbaru',
} as const

/** berapa entri yang terlihat sekaligus di feed */
export const LIVE_FEED_VISIBLE = 5

/* ── FEED PEMBELIAN NYATA (paket 85) ────────────────────────────────────────
   Sebelum paket 85 feed ini SELALU seed: nama & kota karangan. Endpoint
   `GET /api/pricing/recent-purchases` sudah ada, jadi komponen sekarang
   membacanya; seed hanya boleh tampil di build demo (`SHOWS_SAMPLE_DATA`).
   Kalau tabel pembelian kosong, keadaan kosongnya JUJUR — bukan daftar palsu
   (PRD A10 melarang mengarang bukti sosial). */

/** keadaan kosong yang benar saat belum ada pembelian (produksi) */
export const LIVE_FEED_EMPTY_COPY = {
  title: 'Belum ada pembelian terbaru',
  body: 'Jadilah yang pertama hari ini 🌿',
} as const

/**
 * Label waktu relatif dari waktu SERVER ISO. Dihitung di klien (feed-nya sendiri
 * dimuat SETELAH mount), jadi tidak ada hydration mismatch. `nowMs` dioper
 * supaya fungsi ini murni & bisa diuji.
 */
export function relativeFeedTime(atIso: string, nowMs: number): string {
  const at = Date.parse(atIso)
  if (!Number.isFinite(at)) return ''
  const minutes = Math.max(0, Math.round((nowMs - at) / 60_000))
  if (minutes < 1) return 'baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  return `${Math.round(hours / 24)} hari lalu`
}

/** item mentah dari `/api/pricing/recent-purchases` */
export interface RecentPurchaseItem {
  name?: unknown
  city?: unknown
  price?: unknown
  at?: unknown
}

/**
 * Ubah baris endpoint → bentuk `LiveFeedEntry` yang SAMA dengan seed, supaya
 * komponen tidak perlu tahu asal datanya. Nilai yang tidak jelas diperlakukan
 * apa adanya (nama kosong → "Seseorang", kota kosong → "Indonesia") — tidak ada
 * angka atau nama karangan.
 */
export function liveFeedFromPurchases(
  items: RecentPurchaseItem[],
  nowMs: number,
): LiveFeedEntry[] {
  return items.map((item, index) => {
    const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : 'Seseorang'
    const city = typeof item.city === 'string' && item.city.trim() ? item.city.trim() : 'Indonesia'
    const price = Number(item.price) || 0
    const at = typeof item.at === 'string' ? item.at : ''
    return {
      id: `purchase-${index}-${name}`,
      name,
      city,
      price,
      time: at ? relativeFeedTime(at, nowMs) : '',
    }
  })
}


/* Part B: 5 testimoni. `quote` sengaja apa adanya (bahasa user), bukan copy
   pemasaran — karena itu kekuatan section ini. */
export interface Testimonial {
  id: string
  name: string
  age: number
  role: string
  city: string
  quote: string
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 'rina',
    name: 'Rina',
    age: 24,
    role: 'Marketing Executive',
    city: 'Jakarta',
    quote:
      "Selama ini gue cuma tau 'duit habis' tapi gak tau habis ke mana. Setelah 2 minggu pake CatetInd, ketahuan gue ngabisin Rp2.1 juta buat kopi dan jajan — PER BULAN. Shock sih, tapi AI Coach-nya gak nge-judge. Malah bantu atur jatah harian.",
  },
  {
    id: 'budi',
    name: 'Budi',
    age: 26,
    role: 'Junior Developer',
    city: 'Bandung',
    quote:
      "Gue freelancer, income naik turun. CatetInd ngerti itu — daily budget-nya adjust otomatis. Bulan pertama gue berhasil sisihkan Rp800.000 yang biasanya 'menguap'. Input transaksi-nya 4 tap doang, gak ganggu flow kerja.",
  },
  {
    id: 'sari',
    name: 'Sari',
    age: 23,
    role: 'Fresh Graduate',
    city: 'Surabaya',
    quote:
      'Niat nabung buat dana darurat tapi gak pernah kesampaian. CatetInd ada sinking fund dengan visualisasi tanaman — sekarang tanamanmu udah berbunga 🌸 artinya target Rp5jt tercapai. Gak nyangka bisa.',
  },
  {
    id: 'dimas',
    name: 'Dimas',
    age: 25,
    role: 'Startup Ops',
    city: 'Jakarta',
    quote:
      'Pacar gue juga pake. Joint Wallet-nya bener-bener ngebantu — kita tau siapa yang nombok makan bulan ini tanpa berantem. Split bill otomatis, dan ada fitur private buat beliin kado surprise.',
  },
  {
    id: 'amel',
    name: 'Amel',
    age: 24,
    role: 'Content Creator',
    city: 'Yogyakarta',
    quote:
      "Udah coba 3 app keuangan, semuanya ribet atau boring. CatetInd beda — scan struk langsung ter-catat, voice input 'beli indomaret 25rb' langsung masuk. Feels like self-care, bukan ngerjain PR.",
  },
]

export const TESTIMONIALS_COPY = {
  eyebrow: 'Kata mereka',
  title: 'Bukan janji kami — kata penggunanya',
  /** label kota+profesi, mis. "24 · Marketing Executive · Jakarta" */
  meta: (t: Testimonial) => `${t.age} · ${t.role} · ${t.city}`,
  /** inisial untuk avatar huruf */
  initial: (t: Testimonial) => t.name.charAt(0).toUpperCase(),
} as const

/* ── SECTION 5 · PRICING + CTA PRIMER ───────────────────────────────────────
   SKU landing = sekali bayar untuk AKSES SELAMANYA, dan harga tiap kartu DIBACA
   dari `PLANS[].lifetime` (lihat `landingTier()` di atas). Tiap kartu punya CTA
   yang membuka sheet pendaftaran (`LeadSheet`). */
export type LandingTierId = 'catet-aja' | 'waras' | 'sultan'

export interface LandingTierFeature {
  label: string
  included: boolean
}

export interface LandingTier {
  id: LandingTierId
  name: string
  /** harga sekali bayar (rupiah) — DIBACA dari `PLANS[].lifetime`, bukan angka tulis tangan */
  price: number
  periodLabel: string
  tagline: string
  badge?: string
  /** kartu yang ditonjolkan sebagai rekomendasi */
  recommended?: boolean
  ctaLabel: string
  features: LandingTierFeature[]
}

/** harga & nama paket DIBACA dari satu sumber (PLANS) — tidak ada angka tulis tangan di sini */
function landingTier(
  id: LandingTierId,
  extra: Omit<LandingTier, 'id' | 'name' | 'price' | 'periodLabel'>,
): LandingTier {
  const plan = PLANS.find((item) => item.id === id) ?? PLANS[0]
  return { id, name: plan.name, price: plan.lifetime, periodLabel: LIFETIME_LABEL, ...extra }
}

export const LANDING_TIERS: LandingTier[] = [
  landingTier(
    'catet-aja',
    {
      tagline: 'Buat yang mau catat rapi dulu, tanpa fitur AI.',
      ctaLabel: 'Pilih Paket Catet Aja',
      features: [
        { label: 'Catat pemasukan & pengeluaran manual', included: true },
        { label: 'Kategori bawaan & custom', included: true },
        { label: 'Dashboard & laporan keuangan dasar', included: true },
        { label: 'Multi dompet & kantong', included: true },
        { label: 'Budgeting & target nabung', included: true },
        { label: 'AI Coach (Minca) & Laporan AI', included: false },
        { label: 'Scan struk & Voice input', included: false },
      ],
    },
  ),
  landingTier(
    'waras',
    {
      tagline: 'Nambah 20rb dari paket biasa, dapet AI Minca & semua fitur lengkap.',
      badge: 'Paling Dipilih (98% User)',
      recommended: true,
      ctaLabel: 'Amankan Paket Waras',
      features: [
        { label: 'Semua fitur Paket Catet Aja', included: true },
        { label: 'AI Coach Minca (Kuota melimpah tiap bulan)', included: true },
        { label: 'Scan struk belanja otomatis (OCR AI)', included: true },
        { label: 'Input kilat lewat Suara (Voice Note)', included: true },
        { label: 'Jatah jajan harian & radar bocor halus', included: true },
        { label: 'Laporan analisis AI mingguan & bulanan', included: true },
        { label: 'Joint Wallet (Dompet Bersama Pasangan)', included: true },
      ],
    },
  ),
  landingTier(
    'sultan',
    {
      tagline: 'AI tanpa batas buat yang mau paling maksimal.',
      ctaLabel: 'Pilih Paket Sultan',
      features: [
        { label: 'Semua fitur Paket Waras', included: true },
        { label: 'AI Coach Minca UNLIMITED (Tanpa batas kuota)', included: true },
        { label: 'Akses lebih awal ke fitur baru (VIP Beta)', included: true },
        { label: 'Prioritas Support langsung via WhatsApp', included: true },
        { label: 'Badge eksklusif "Sultan" di profil', included: true },
      ],
    },
  ),
]

/* ── SECTION 6 · FAQ ──────────────────────────────────────────────────────── */
export interface FaqItem {
  id: string
  question: string
  answer: string
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'no-trial',
    question: 'Kenapa gak ada trial / versi gratis dulu?',
    answer:
      'Kekhawatiranmu masuk akal. Kebanyakan app keuangan kasih trial karena mereka gak yakin kamu akan stay. Kami yakin — makanya kami kasih yang lebih baik: garansi uang kembali 100% dalam 30 hari. Kalau dalam 30 hari CatetInd gak bantu kamu, uangmu balik tanpa drama. Jadi kamu tetap bisa coba tanpa risiko — bedanya, kamu langsung dapet semua fitur dari hari pertama.',
  },
  {
    id: 'no-bank-sync',
    question: 'Kenapa gak auto-sync rekening bank?',
    answer:
      "Bank-sync berarti kamu harus kasih akses kredensial perbankanmu ke pihak ketiga. Di Indonesia, belum ada regulasi open banking yang matang. Kami pilih jalur yang lebih aman: 100% input manual + AI yang membantu. Scan struk 5 detik, voice input 'beli indomaret 25rb' langsung tercatat. Privasi kamu lebih penting dari kenyamanan 10 detik.",
  },
  {
    id: 'harga',
    question: 'Kok mahal buat app catatan keuangan?',
    answer:
      `Dari Pain Calculator tadi, rata-rata first-jobber 'kehilangan' Rp1.5 juta per bulan tanpa tracking. ${PRICE_RANGE_LABEL} itu kurang dari 20% uang yang biasa kamu buang dalam 1 bulan. Dan itu sekali bayar — bukan langganan bulanan. Kalau CatetInd bantu kamu hemat Rp200.000 saja di bulan pertama, kamu sudah balik modal.`,
  },
  {
    id: 'beda-paket',
    question: 'Bedanya Paket Catet Aja, Waras, dan Sultan apa?',
    answer:
      `Simpel: Paket Catet Aja (${formatIDR(PLANS[0].lifetime)}) = catat manual tanpa AI. Paket Waras (${formatIDR(PLANS[1].lifetime)}) = semua fitur termasuk AI Coach, scan struk, dan voice input dengan kuota bulanan. Paket Sultan (${formatIDR(PLANS[2].lifetime)}) = sama seperti Waras tapi AI-nya unlimited tanpa batas kuota. Semua sekali bayar untuk akses selamanya — dan naik paket cukup bayar selisihnya.`,
  },
  {
    id: 'kuota-ai',
    question: 'Gimana kalau kuota AI habis?',
    answer:
      'Kuota AI bulananmu cukup besar — 80% user gak akan pernah menyentuh batas. Tapi kalau kamu power user, kamu bisa upgrade ke Paket Sultan untuk AI unlimited. Kamu bisa cek sisa kuota kapan aja di Settings, dan kami kasih notifikasi saat tinggal 30%.',
  },
  {
    id: 'midtrans-refund',
    question: 'Aman gak bayar lewat Midtrans? Gimana kebijakan refund?',
    answer:
      'Midtrans itu payment gateway yang dipakai Tokopedia, Bukalapak, dan Gojek — jadi keamanannya sudah level enterprise. Data kartu/e-wallet kamu diproses langsung oleh Midtrans, bukan oleh kami. Soal refund: garansi uang kembali 100% dalam 30 hari. Tinggal email ke halo@catetind.com, dan kami proses dalam 3-5 hari kerja.',
  },
  {
    id: 'data',
    question: 'Dataku bakal aman terus nggak?',
    answer:
      'Data kamu TIDAK PERNAH dihapus. Semua catatan keuangan kamu tetap tersimpan aman dan bisa kamu akses kapan aja. Karena paketnya akses selamanya, nggak ada tanggal berakhir yang bikin fitur mendadak mati. Dan ingat: CatetInd TIDAK pernah menagih diam-diam.',
  },
]

/* ══════════════════════════════════════════════════════════════════════════════
   LANDING LP — hasil port export Framer (`components/landing/lp/*`)
   ══════════════════════════════════════════════════════════════════════════════
   Blok ini SENGAJA terpisah dari data landing lama yang sudah tidak dipakai.
   Semua string user-facing untuk landing di `/` tinggal di sini (aturan repo:
   nol string di JSX), jadi mengubah copy/harga/link = edit satu berkas.

   Catatan pemetaan tautan:
     • nav lama  → anchor section
     • CTA       → `/checkout` (selalu membawa `period`)
     • legal     → `/terms`, `/privacy`
   Footer menautkan Kontak ke `/contact`, WhatsApp, dan email halo@catetind.com.
   ───────────────────────────────────────────────────────────────────────────── */

export const LP_NAV_LINKS = [
  /* Export menaruh "Review" → `#testimonials`, tapi section itu tidak pernah
     ada di export maupun di live Framer. Tidak ada ulasan nyata di repo, jadi
     tautannya DIHAPUS — lebih baik tidak ada menu daripada menu yang membawa
     user ke dasar halaman. "Cara Kerja" sekarang menunjuk section #mission,
     yang memang menjelaskan cara kerja produk. */
  { label: 'Cara Kerja', href: '#mission' },
  { label: 'Harga', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
] as const

/**
 * Anchor section dipakai landing `/` dan `/contact`.
 * Di `/` href tetap `#mission`; di halaman lain anchor dibuka dengan path
 * lengkap supaya tidak mati. Karena itu awalan hanya ditambahkan bila
 * `basePath` diberikan.
 */
export function lpHref(href: string, basePath = ''): string {
  if (!basePath || !href.startsWith('#')) return href
  return `${basePath}${href}`
}

export const LP_NAV = {
  homeAria: 'CatetInd, ke beranda',
  /** logo menuju puncak halaman; di /contact diarahkan ke landing penuh */
  homeHref: '#hero',
  menuAria: 'Buka menu',
  menuCloseAria: 'Tutup menu',
  navAria: 'Navigasi utama',
  menuNavAria: 'Navigasi menu',
  ctaLabel: 'Pilih Paket',
  ctaHref: '#pricing',
  /** tombol sekunder di header — sengaja terpisah dari daftar link */
  loginLabel: 'Masuk',
  loginHref: '/login',
} as const

/* ── SATU PINTU MASUK: PAKET + PERIODE DEFAULT ───────────────────────────────
   Hero dan section harga WAJIB menunjuk angka yang sama. Periode default
   `lifetime` karena itu satu-satunya yang dijual; konstanta ini dipakai
   LP_HERO.ctaHref DAN LP_PRICING.defaultMode. */
export const LANDING_DEFAULT_PLAN_ID: PlanId = 'waras'
export const LANDING_DEFAULT_PERIOD: BillingPeriod = 'lifetime'

/* ── BUKTI SOSIAL HERO (angka & avatar) ─────────────────────────────────────
   Angka yang tampil di hero adalah angka PUBLIK `1.000+`, bukan seed database
   (234). Seed 234 tetap dipakai `/api/landing/stats`; hero sengaja memakai
   label statis supaya tidak berubah-ubah saat angka riil masih kecil.

   Avatar memakai LIMA file lokal yang sudah disiapkan desainer
   (`public/AVA 1.png` … `public/AVA 5.png`) — bukan foto stok pihak ketiga.
   Tidak ada `tone` warna-warni lagi: bingkai avatar digambar komponen sebagai
   outline gelap tipis supaya lima foto terlihat satu keluarga. */
export const LP_LIVE_SUBSCRIBERS = {
  /** seed database untuk `/api/landing/stats` (tidak ditampilkan di hero) */
  startCount: 234,
  /** angka publik yang ditampilkan di hero */
  displayCount: 1_000,
  displaySuffix: '+',
  /** kalimat setelah angka — mis. "1.000+ orang udah pake" */
  labelTail: 'orang udah pake',
  avatarPool: [
    { src: '/AVA 1.png' },
    { src: '/AVA 2.png' },
    { src: '/AVA 3.png' },
    { src: '/AVA 4.png' },
    { src: '/AVA 5.png' },
  ],
} as const

/* ── NOTIFIKASI PEMBELIAN (landing) ─────────────────────────────────────────
   Toast kecil di pojok kiri bawah: "@rinajkt baru saja beli Paket Waras".

   ANTI-REPETISI (revisi):
     · pool 36 akun + kota + warna avatar, bukan 8 nama yang sama terus;
     · urutan diacak per SESI (seed di sessionStorage), lalu diacak ULANG tiap
       putaran selesai — pengunjung jam 1 siang dan jam 4 sore tidak melihat
       urutan yang sama;
     · posisi disimpan, jadi pindah halaman (landing → checkout) melanjutkan
       rotasi, bukan mengulang dari nama pertama;
     · satu nama tidak pernah muncul dua kali berurutan;
     · paket ikut diacak tiap notifikasi: Waras 60%, Sultan 40%
       (Paket Catet Aja sengaja tidak dipakai di notifikasi);
     · jeda TIDAK tetap: 8–16 detik, sesekali 22–34 detik (bukan metronom).

   Sumber pembelian NYATA tetap didahulukan bila feed tersedia (`freshMs`). */
/* ── POOL BUYER NOTIFIKASI — 36 SEED + GENERATOR PROSEDURAL ──────────────────
   Kenapa procedural: pool 600 nama tidak boleh ditulis manual (ribuan baris,
   gampang duplikat). Generator ini DETERMINISTIK — tidak memakai Math.random —
   jadi server, klien, dan test melihat daftar yang sama persis.

   Bahan:
     · 94 nama depan modern Indonesia;
     · 14 sufiks handle yang wajar (prtm, putra, w, .r, dst.);
     · 42 kota + singkatannya (jkt, bdg, sby, …);
     · 4 token warna avatar yang dipakai bergiliran.

   Format handle: @nama, @namaa (dobel huruf), @namajkt, @nama.jkt,
   @namaprtm, @nama.prtm, … Sufiks dirotasi per nama supaya semua sufiks
   terpakai, bukan hanya sufiks pertama. Semua masuk lewat Set → 100% unik.
   ────────────────────────────────────────────────────────────────────────── */

const NOTIF_FIRST_NAMES = [
  'rina', 'dimas', 'amelia', 'bayu', 'nadya', 'fajar', 'intan', 'yosua',
  'dewi', 'raka', 'sinta', 'arya', 'nabila', 'bagas', 'citra', 'dika',
  'eka', 'farah', 'gita', 'hana', 'ivan', 'joko', 'kiki', 'lukman',
  'maya', 'niko', 'putri', 'reza', 'sari', 'tio', 'vina', 'zaki',
  'adit', 'bima', 'clarissa', 'dion', 'gilang', 'ilham', 'kevin', 'naufal',
  'rendy', 'yoga', 'zahra', 'alya', 'arsy', 'bella', 'cindy', 'della',
  'erik', 'fauzan', 'gina', 'hafiz', 'indah', 'jihan', 'kirana', 'laila',
  'mira', 'nadia', 'oki', 'prima', 'qori', 'rafi', 'salma', 'tari',
  'umi', 'vito', 'wulan', 'yudi', 'zulfa', 'anggi', 'bram', 'cahya',
  'dinda', 'ega', 'farhan', 'galuh', 'hilda', 'iqbal', 'jasmine', 'kaisar',
  'laras', 'miko', 'nessa', 'omar', 'pasha', 'raina', 'sabrina', 'taufik',
  'ulfa', 'vania', 'wira', 'yusuf', 'zara', 'aditya',
] as const

const NOTIF_HANDLE_SUFFIXES = [
  'prtm',
  'putra',
  'putri',
  'lestari',
  'w',
  'p',
  'rm',
  's',
  'f',
  'dew',
  'a',
  'r',
  'syah',
  'hadi',
] as const

const NOTIF_CITIES = [
  { name: 'Jakarta', abbr: 'jkt' },
  { name: 'Bandung', abbr: 'bdg' },
  { name: 'Surabaya', abbr: 'sby' },
  { name: 'Yogyakarta', abbr: 'jogja' },
  { name: 'Semarang', abbr: 'smg' },
  { name: 'Malang', abbr: 'mlg' },
  { name: 'Depok', abbr: 'dpk' },
  { name: 'Bekasi', abbr: 'bks' },
  { name: 'Tangerang', abbr: 'tng' },
  { name: 'Bogor', abbr: 'bgr' },
  { name: 'Solo', abbr: 'solo' },
  { name: 'Medan', abbr: 'mdn' },
  { name: 'Palembang', abbr: 'plm' },
  { name: 'Makassar', abbr: 'mks' },
  { name: 'Denpasar', abbr: 'dps' },
  { name: 'Padang', abbr: 'pdg' },
  { name: 'Sleman', abbr: 'slm' },
  { name: 'Batam', abbr: 'btm' },
  { name: 'Pekanbaru', abbr: 'pkb' },
  { name: 'Balikpapan', abbr: 'bpp' },
  { name: 'Samarinda', abbr: 'smd' },
  { name: 'Banjarmasin', abbr: 'bjm' },
  { name: 'Pontianak', abbr: 'ptk' },
  { name: 'Manado', abbr: 'mdo' },
  { name: 'Bandar Lampung', abbr: 'bdl' },
  { name: 'Mataram', abbr: 'mtr' },
  { name: 'Cirebon', abbr: 'crb' },
  { name: 'Sukabumi', abbr: 'sbm' },
  { name: 'Jember', abbr: 'jbr' },
  { name: 'Kediri', abbr: 'kdr' },
  { name: 'Probolinggo', abbr: 'pbl' },
  { name: 'Madiun', abbr: 'mdu' },
  { name: 'Magelang', abbr: 'mgl' },
  { name: 'Salatiga', abbr: 'slg' },
  { name: 'Purwokerto', abbr: 'pwt' },
  { name: 'Tasikmalaya', abbr: 'tsk' },
  { name: 'Cimahi', abbr: 'cmh' },
  { name: 'Serang', abbr: 'srg' },
  { name: 'Banda Aceh', abbr: 'bna' },
  { name: 'Kupang', abbr: 'kpg' },
  { name: 'Ambon', abbr: 'abn' },
  { name: 'Jayapura', abbr: 'jpr' },
] as const

const NOTIF_TONES = ['bg-mint', 'bg-cantelope', 'bg-thistle', 'bg-plum'] as const

export type NotificationBuyer = {
  handle: string
  city: string
  tone: (typeof NOTIF_TONES)[number]
}

/** 36 akun asli — dipertahankan sebagai seed awal (handle, kota, tone aslinya) */
const NOTIF_SEED_BUYERS: NotificationBuyer[] = [
  { handle: '@rinajkt', city: 'Jakarta', tone: 'bg-mint' },
  { handle: '@dimasprtm', city: 'Bandung', tone: 'bg-cantelope' },
  { handle: '@ameliaa', city: 'Yogyakarta', tone: 'bg-thistle' },
  { handle: '@bayu.w', city: 'Surabaya', tone: 'bg-plum' },
  { handle: '@nadyaa', city: 'Depok', tone: 'bg-mint' },
  { handle: '@fajarrm', city: 'Malang', tone: 'bg-cantelope' },
  { handle: '@intanp', city: 'Semarang', tone: 'bg-thistle' },
  { handle: '@yosuaa', city: 'Jakarta', tone: 'bg-plum' },
  { handle: '@dewira', city: 'Bekasi', tone: 'bg-mint' },
  { handle: '@rakaputra', city: 'Tangerang', tone: 'bg-cantelope' },
  { handle: '@sintaa', city: 'Bogor', tone: 'bg-thistle' },
  { handle: '@aryaw', city: 'Solo', tone: 'bg-plum' },
  { handle: '@nabilaf', city: 'Medan', tone: 'bg-mint' },
  { handle: '@bagass', city: 'Palembang', tone: 'bg-cantelope' },
  { handle: '@citral', city: 'Makassar', tone: 'bg-thistle' },
  { handle: '@dikap', city: 'Denpasar', tone: 'bg-plum' },
  { handle: '@ekaputri', city: 'Padang', tone: 'bg-mint' },
  { handle: '@farahh', city: 'Bandung', tone: 'bg-cantelope' },
  { handle: '@gitap', city: 'Semarang', tone: 'bg-thistle' },
  { handle: '@hanaf', city: 'Jakarta', tone: 'bg-plum' },
  { handle: '@ivanr', city: 'Surabaya', tone: 'bg-mint' },
  { handle: '@jokos', city: 'Sleman', tone: 'bg-cantelope' },
  { handle: '@kikii', city: 'Malang', tone: 'bg-thistle' },
  { handle: '@lukmanh', city: 'Bogor', tone: 'bg-plum' },
  { handle: '@mayas', city: 'Depok', tone: 'bg-mint' },
  { handle: '@nikop', city: 'Bekasi', tone: 'bg-cantelope' },
  { handle: '@oktavi', city: 'Tangerang', tone: 'bg-thistle' },
  { handle: '@putria', city: 'Yogyakarta', tone: 'bg-plum' },
  { handle: '@rezaf', city: 'Bandung', tone: 'bg-mint' },
  { handle: '@saridew', city: 'Solo', tone: 'bg-cantelope' },
  { handle: '@tiow', city: 'Medan', tone: 'bg-thistle' },
  { handle: '@umik', city: 'Palembang', tone: 'bg-plum' },
  { handle: '@vinaa', city: 'Makassar', tone: 'bg-mint' },
  { handle: '@wawanp', city: 'Denpasar', tone: 'bg-cantelope' },
  { handle: '@yunia', city: 'Padang', tone: 'bg-thistle' },
  { handle: '@zakif', city: 'Jakarta', tone: 'bg-plum' },
]

/**
 * Format handle per putaran. Putaran 0–3: polos, dobel huruf, abbr kota, dan
 * titik+abbr kota. Putaran 4+: sufiks, dengan indeks sufiks dirotasi per nama
 * supaya semua 14 sufiks terpakai (bukan hanya sufiks pertama).
 */
function notifHandleFor(
  round: number,
  name: string,
  nameIndex: number,
  cityAbbr: string,
): string {
  if (round === 0) return `@${name}`
  if (round === 1) return `@${name}${name.slice(-1)}`
  if (round === 2) return `@${name}${cityAbbr}`
  if (round === 3) return `@${name}.${cityAbbr}`

  let suffix =
    NOTIF_HANDLE_SUFFIXES[(nameIndex + round) % NOTIF_HANDLE_SUFFIXES.length] ?? 'prtm'
  /* hindari handle seperti "@putriputri" — nama yang sama jadi sufiks */
  if (suffix === name) {
    suffix =
      NOTIF_HANDLE_SUFFIXES[(nameIndex + round + 1) % NOTIF_HANDLE_SUFFIXES.length] ??
      'prtm'
  }
  return round % 2 === 0 ? `@${name}${suffix}` : `@${name}.${suffix}`
}

/**
 * Bangun pool buyer: seed dulu, lalu variasi prosedural sampai `total`.
 * Kota & tone mengikuti posisi entri (tone 4 putaran, kota 42 putaran) jadi
 * distribusinya rata. Handle dicek lewat Set → nol duplikat.
 */
function buildNotifBuyers(
  seed: readonly NotificationBuyer[],
  total: number,
): NotificationBuyer[] {
  if (seed.length >= total) return [...seed]

  const entries = [...seed]
  const seen = new Set(entries.map((entry) => entry.handle))
  let round = 0

  while (entries.length < total && round < 200) {
    for (let nameIndex = 0; nameIndex < NOTIF_FIRST_NAMES.length; nameIndex += 1) {
      if (entries.length >= total) break

      const name = NOTIF_FIRST_NAMES[nameIndex]
      if (!name) continue

      const city = NOTIF_CITIES[entries.length % NOTIF_CITIES.length]
      const tone = NOTIF_TONES[entries.length % NOTIF_TONES.length]
      if (!city || !tone) continue

      const handle = notifHandleFor(round, name, nameIndex, city.abbr)
      if (seen.has(handle)) continue

      seen.add(handle)
      entries.push({ handle, city: city.name, tone })
    }
    round += 1
  }

  return entries
}

const NOTIF_BUYERS = buildNotifBuyers(NOTIF_SEED_BUYERS, 600)


export const LP_PURCHASE_NOTIF = {
  eyebrow: 'Pembelian terbaru',
  prefix: 'baru saja beli',
  dismissAria: 'Tutup notifikasi pembelian',
  /**
   * Pool buyer: 36 seed asli + hasil generator prosedural (total 600 unik).
   * Lihat `buildNotifBuyers` di atas — tidak ada baris yang ditulis ribuan kali,
   * dan semua handle dijamin unik oleh Set.
   */
  fallbackBuyers: NOTIF_BUYERS,
  /** "baru aja" lebih sering — yang dipajang memang pembelian baru */
  fallbackTimes: [
    'baru aja',
    'baru aja',
    'baru aja',
    '1 menit lalu',
    '2 menit lalu',
    '3 menit lalu',
  ],
  /** jeda acak antar notifikasi (setelah toast sebelumnya hilang) */
  minGapMs: 8_000,
  maxGapMs: 16_000,
  longGapChance: 0.12,
  longGapMinMs: 22_000,
  longGapMaxMs: 34_000,
  firstDelayMinMs: 2_000,
  firstDelayMaxMs: 4_500,
  visibleMs: 5_200,
  /** umur maksimum pembelian NYATA yang masih boleh tampil */
  freshMs: 30 * 60_000,
  /* ── JAM TAYANG (permintaan pemilik produk) ──────────────────────────────
     Notifikasi "baru saja beli" hanya masuk akal saat orang memang sedang
     online. Checkout jam 2 pagi itu kemungkinan kecil, dan notifikasi jam
     segitu justru bikin landing terasa palsu. Karena itu toast HANYA tayang
     di jendela jam rame WIB (UTC+7) di bawah; di luar jendela penjadwal
     berhenti dan memeriksa ulang tiap `offPeakCheckMs`. */
  peakWindows: [
    { start: 7 * 60, end: 10 * 60 }, // berangkat & jam kantor
    { start: 11 * 60 + 30, end: 14 * 60 }, // makan siang
    { start: 17 * 60, end: 22 * 60 }, // pulang kerja & malam
  ],
  /** jeda saat di luar jam rame — cek lagi tanpa membangunkan timer tiap detik */
  offPeakCheckMs: 5 * 60_000,
} as const

/* ── JAM rame dalam WIB ─────────────────────────────────────────────────────
   WIB tidak memakai DST, jadi UTC+7 cukup dan hasilnya deterministik di
   server maupun browser (tidak bergantung zona waktu perangkat pengunjung —
   pembeli kami di Indonesia, bukan di zona waktu server Vercel). */
export function wibMinutesOfDay(now: Date): number {
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  return (utcMinutes + 7 * 60) % (24 * 60)
}

/** true = sekarang berada di salah satu jendela jam rame WIB */
export function isPurchaseNotifPeak(now: Date = new Date()): boolean {
  const minutes = wibMinutesOfDay(now)
  return LP_PURCHASE_NOTIF.peakWindows.some(
    (window) => minutes >= window.start && minutes < window.end,
  )
}


export interface PurchaseNotification {
  id: string
  handle: string
  initial: string
  packageName: string
  /** kota pengguna; kosong untuk pembelian nyata (endpoint belum membawanya) */
  city: string
  /** kelas token latar avatar (bg-mint/bg-cantelope/bg-thistle/bg-plum) */
  tone: string
  time: string
}

/** `@rinajkt` → `R` (huruf pertama, tanpa `@` dan tanda baca) */
function notifInitial(handle: string): string {
  const clean = handle.replace(/^@/, '').replace(/[^a-zA-Z0-9]/g, '')
  return (clean.charAt(0) || 'C').toUpperCase()
}

/** nama paket dari id kanon (selalu ada di PLANS; cadangan = PLANS[0]) */
function planNameById(planId: PlanId): string {
  return PLANS.find((plan) => plan.id === planId)?.name ?? PLANS[0].name
}

/**
 * Nama paket untuk notifikasi: Waras 60%, Sultan 40%.
 * Paket Catet Aja sengaja TIDAK dipakai — notifikasi hanya menampilkan paket
 * ber-AI, jadi tidak ada kesan bahwa yang beli cuma paket paling murah.
 * Tiap notifikasi independen; dua notifikasi berurutan boleh memakai paket
 * yang sama karena hanya ada dua pilihan.
 */
export function randomPurchasePackageName(random: () => number = Math.random): string {
  const roll = random()
  return planNameById(roll < 0.6 ? 'waras' : 'sultan')
}

/**
 * Notifikasi contoh yang dirotasi saat feed pembelian masih kosong.
 * Nama paket tetap dibaca dari `PLANS`; kota & warna avatar ikut dibawa supaya
 * dua notifikasi berurutan tidak terlihat seperti salinan yang sama.
 */
export function seededPurchaseNotifications(): PurchaseNotification[] {
  return LP_PURCHASE_NOTIF.fallbackBuyers.map((buyer, index) => ({
    id: `seed-${index}`,
    handle: buyer.handle,
    initial: notifInitial(buyer.handle),
    /* 3 dari 5 = Waras (60%), 2 dari 5 = Sultan (40%). Catet Aja tidak dipakai. */
    packageName: planNameById(index % 5 < 3 ? 'waras' : 'sultan'),
    city: buyer.city,
    tone: buyer.tone,
    time: LP_PURCHASE_NOTIF.fallbackTimes[index % LP_PURCHASE_NOTIF.fallbackTimes.length],
  }))
}

/**
 * Pembelian NYATA → notifikasi. Nama kosong menjadi "@seseorang", harga yang
 * tidak cocok dengan satu tier tetap dihormati (disebut "paket CatetInd"),
 * jadi tidak ada tier yang dikarang untuk nominal asing. `id` memakai waktu
 * (bukan indeks) supaya baris yang sama tidak tampil dua kali saat polling.
 *
 * Paket Catet Aja DIBUANG dari hasil: notifikasi hanya menampilkan paket
 * ber-AI (Waras/Sultan), sesuai keputusan produk.
 */
export function purchaseNotificationsFromPurchases(
  items: RecentPurchaseItem[],
  nowMs: number,
): PurchaseNotification[] {
  return items.flatMap((item, index) => {
    const name = typeof item.name === 'string' ? item.name.trim() : ''
    const handle = name ? `@${name.toLowerCase().replace(/\s+/g, '')}` : '@seseorang'
    const price = Number(item.price) || 0
    const matched = PLANS.find((plan) => plan.lifetime === price)
    if (matched?.id === 'catet-aja') return []

    const at = typeof item.at === 'string' ? item.at : ''
    return [
      {
        id: `live-${at || index}-${handle}`,
        handle,
        initial: notifInitial(handle),
        packageName: matched?.name ?? 'paket CatetInd',
        city: '',
        tone: NOTIF_TONES[index % NOTIF_TONES.length],
        time: at ? relativeFeedTime(at, nowMs) : 'baru aja',
      },
    ]
  })
}

export const LP_HERO = {
  eyebrow: 'Kenalin, CatetInd',
  /* SATU janji di headline yang langsung menyapa kebiasaan target: males
     nyatet. Kata "males" dipisah supaya komponen bisa menebalkan + memiringkan
     HANYA kata itu (jangkar visual), tanpa memecah kalimat jadi dua baris
     paksa. Tanpa titik di akhir — headline tampil sebagai frasa, bukan kalimat
     berkala. */
  headlineBefore: 'Aplikasi keuangan buat lo yang ',
  headlineEmphasis: 'males',
  headlineAfter: ' nyatet',
  subheadline: 'Cuma butuh 4 detik. Tinggal kirim voice note atau foto struk',
  ctaLabel: 'Cobain',
  /** paket + periode SAMA dengan default section harga (satu pintu masuk) */
  ctaHref: buildCheckoutHref(LANDING_DEFAULT_PLAN_ID, LANDING_DEFAULT_PERIOD),
  /* aset visual hero (dekoratif → ringkasannya di `visualAlt`) */
  /* Desktop memakai GAMBARDEPAN; mobile memakai phoneImage. Versi WebP
     dihasilkan `scripts/landing/make-hero-webp.mjs` (canvas Chromium) supaya
     hero tidak mengunduh PNG 3,9 MB. */
  boardImage: '/GAMBARDEPAN.png',
  boardImageWebp: '/GAMBARDEPAN-1600.webp',
  boardWidth: 5255,
  boardHeight: 4104,
  phoneImage: '/landing/XR2qVbJABSACTzUQSOelrYLkws0.png',
  phoneImageWebp: '/landing/XR2qVbJABSACTzUQSOelrYLkws0-1000.webp',
  phoneWidth: 1960,
  phoneHeight: 4104,
  visualAlt:
    'Pratinjau aplikasi CatetInd: layar dompet utama di dalam ponsel, kartu Jatah Hari Ini, dan ringkasan Arus Uang.',
} as const

/* ── FOOTER ─────────────────────────────────────────────────────────────────
   Footer gelap minimalis: brand + disclaimer di kiri, tiga kolom menu (Navigasi,
   Terhubung, Legal) di kanan, lalu copyright + wordmark raksasa sebagai penutup.

   Semua tautan menuju halaman/anchor yang BENAR-BENAR ada di repo:
     · #top   → <main id="top"> di setiap halaman yang memakai footer ini
     · #fitur → kartu fitur di section #mission
     · #harga → alias anchor section #pricing
     · #faq   → section FAQ
     · /security → app/security (dokumen keamanan data)
   Instagram memakai akun brand yang diminta pemilik produk. */
export const LP_FOOTER = {
  brand: {
    name: 'CatetInd',
    tagline:
      'Asisten pencatatan keuangan pribadi anti-ribet. 100% privat tanpa akses rekening bank.',
    disclaimer:
      '*CatetInd adalah aplikasi pencatatan keuangan pribadi & budgeting harian. Minca AI bukan penasihat keuangan berlisensi atau anjuran investasi resmi.',
    homeLabel: 'CatetInd, kembali ke beranda',
  },
  columns: [
    {
      title: 'Navigasi',
      links: [
        { label: 'Ke atas', href: '#top' },
        { label: 'Fitur', href: '#fitur' },
        { label: 'Harga', href: '#harga' },
        { label: 'FAQ', href: '#faq' },
        { label: 'Changelog', href: '/changelog' },
      ],
    },
    {
      title: 'Terhubung',
      links: [
        { label: 'Instagram @catetind', href: 'https://instagram.com/catetind' },
        { label: `WhatsApp ${LP_WHATSAPP.display}`, href: LP_WHATSAPP.href },
        { label: LP_SUPPORT_EMAIL, href: LP_SUPPORT_MAILTO },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Syarat & Ketentuan', href: '/terms' },
        { label: 'Kebijakan Privasi', href: '/privacy' },
        { label: 'Keamanan Data', href: '/security' },
      ],
    },
  ],
  /** label pembaca layar untuk tautan yang membuka tab baru */
  externalHint: 'buka di tab baru',
  copyright: '© 2026 CatetInd. Semua hak dilindungi.',
  madeIn: 'Dibuat di Jakarta 🌿',
} as const

export const FAQ_COPY = {
  eyebrow: 'Masih ragu?',
  title: 'Pertanyaan yang sering muncul',
  /** a11y: label tombol akordeon */
  toggle: (open: boolean, question: string) =>
    `${open ? 'Tutup' : 'Buka'} pertanyaan: ${question}`,
} as const

/* ── FOOTER ───────────────────────────────────────────────────────────────── */
export const FOOTER_COPY = {
  tagline: 'Temen catat keuangan Gen-Z Indonesia.',
  contactLabel: 'Hubungi Kami',
  contact: 'halo@catetind.com',
  links: [
    { label: 'Syarat & Ketentuan', href: '/terms' },
    { label: 'Kebijakan Privasi', href: '/privacy' },
  ],
  legal: '© 2026 CatetInd. Semua hak dilindungi.',
  madeIn: 'Dibuat di Jakarta 🌿',
} as const

/* ── REGISTRATION FLOW (LEAD CAPTURE) ───────────────────────────────────────
   Menampilkan tier terpilih di kepala sheet + tiga field (email, nama, kode
   referral opsional). Validasi kode & pembuatan akun memakai infrastruktur yang
   SUDAH ada (`registerAccount` → `/api/referral/validate` + Supabase Auth). */
export const LEAD_SHEET_COPY = {
  title: 'Daftar CatetInd',
  description: 'Tiga field aja. Nggak ada password, nggak ada data pribadi lain.',
  selectedLabel: 'Paket pilihanmu',
  referralLabel: 'Kode referral (opsional)',
  referralPlaceholder: 'Contoh: RINA-X7K',
  referralHint: 'Punya kode dari teman? Isi biar kamu dapat diskon.',
  submit: 'Buat akun',
  submitting: 'Mendaftarkan…',
  emailNextNote: 'Tautan konfirmasi sudah dikirim ke emailmu.',
} as const

/* ── HALAMAN /registered (Terima Kasih) ───────────────────────────────────── */
export const REGISTERED_COPY = {
  title: 'Akun kamu sudah terdaftar! 🎉',
  eyebrow: 'Sampai jumpa di dalam',
  /*
   * Copy lama berbunyi "pembayaran akan dibuka segera" — janji waitlist yang
   * BERTENTANGAN dengan `/checkout`, yang sejak paket 83 benar-benar menagih
   * (Midtrans Core API). Yang ditulis sekarang hanya hal yang memang terjadi:
   * akun dibuat dan kode masuk dikirim ke email (Supabase `signInWithOtp`).
   */
  body: (email: string) =>
    `Akun dengan ${email} sudah siap. Kode masuk dikirim ke alamat itu — pakai buat masuk kapan aja.`,
  bodyFallback:
    'Akun kamu sudah siap. Kode masuk dikirim ke alamat yang kamu isi — pakai buat masuk kapan aja.',
  cta: 'Kembali ke Beranda',
  /** CTA utama begitu paket yang dipilih terbawa dari kartu harga landing */
  ctaPay: 'Lanjut bayar paket ini',
  ctaPayHint: 'Paket yang kamu pilih sudah tersimpan — tinggal selesaikan pembayarannya.',
  /**
   * Body khusus saat paket terbawa: jangan mengulang janji "pembayaran belum
   * dibuka" (itu copy waitlist) sementara `/checkout` jelas-jelas sudah menagih.
   */
  bodyWithPlan: (email: string, planName: string) =>
    `Pilihanmu — ${planName} — sudah kami simpan. Konfirmasi dikirim ke ${email}, dan kamu bisa langsung lanjut ke pembayaran sekarang.`,
  nextStepsTitle: 'Sambil menunggu, siapkan ini',
  nextSteps: [
    'Unduh aplikasi ke home screen (opsional, biar gampang dibuka)',
    'Siapkan estimasi gaji bulananmu',
    'Catat 3 pengeluaran terakhir yang paling kamu sesali',
  ],
} as const


/* ── SECTION #mission ───────────────────────────────────────────────────────
   Sumber: `<section id="mission" data-framer-name="About">` di export.

   PENTING soal empat blok teks yang di prompt terlihat seperti kartu tambahan:
   setelah dibaca markup-nya, blok "Serius, lo masih nyatet…", "Radar tanggal
   rawan…", "Financial bestie…", dan "Akhirnya lo tau pasti…" BUKAN kartu kelima
   sampai kedelapan. Keempatnya adalah varian `max-width:809.98px` dari kartu
   yang sama (#card-1…#card-4): induknya `.ssr-variant.hidden-1df6aav
   .hidden-q4xj0g`, yang disembunyikan di tablet & desktop. Sebaliknya varian
   desktop disembunyikan di mobile lewat `.hidden-1n6me0k`.

   Karena itu data di bawah menyimpan dua copy per kartu dan komponen hanya
   menampilkan SATU copy per slot di tiap breakpoint — tidak pernah dua-duanya
   sekaligus. Copy Inggris template ("Know what you've already committed to",
   "Track your company progress over time", "Makro shows growth…") sudah
   diterjemahkan ke nada CatetInd; nama "Makro" tidak dipakai. */

export type LpMissionBenefitIcon = 'time' | 'ai' | 'aware'

export interface LpMissionCard {
  id: string
  title: string
  body: string
  /** anotasi kecil di pojok judul — penanda konteks, bukan hiasan */
  annotation: string
  image: string
  /**
   * dimensi asli dari markup export. Dipasang di <img> supaya browser memesan
   * ruang sebelum gambar selesai dimuat (tidak ada layout shift) — dan gambar
   * dirender dengan rasio ini apa adanya, bukan di-crop.
   */
  imageWidth: number
  imageHeight: number
  /** sisi gambar di desktop; mobile selalu gambar di atas copy */
  imageSide: 'left' | 'right'
}

export const LP_MISSION = {
  heading: 'Bebas jajan apa aja, yang penting lo tau ke mana uang lo lari.',
  benefits: [
    { icon: 'time', title: 'Gak Buang Waktu', detail: 'Empat detik kelar' },
    { icon: 'ai', title: 'Biar AI Mikir', detail: 'Lo terima beres' },
    { icon: 'aware', title: 'Sadar Sebelum Habis', detail: 'Keliatan semua bocornya' },
  ],
  cards: [
    {
      id: 'card-1',
      title: 'Catet 4 detik, tanpa ngetik',
      body: 'Tinggal ngomong atau foto struk',
      annotation: 'Voice & scan',
      image: '/Dialog - Catat transaksi.png',
      imageWidth: 1760,
      imageHeight: 1551,
      imageSide: 'right',
    },
    {
      id: 'card-2',
      title: 'Tau batas jajan lo tiap pagi',
      body: 'Otomatis ngitung jatah aman harian biar akhir bulan ga sekarat',
      annotation: 'HUD & radar',
      image: '/Section.png',
      imageWidth: 1600,
      imageHeight: 1822,
      imageSide: 'left',
    },
    {
      id: 'card-3',
      title: 'Tanya Minca sebelum checkout',
      body: 'Konsultasi jatah jajan real-time dari data asli lo, tanpa di-judge',
      annotation: 'AI Coach',
      image: '/Dialog - AI Coach CatetInd.png',
      imageWidth: 1760,
      imageHeight: 1700,
      imageSide: 'right',
    },
    {
      id: 'card-4',
      title: 'Tau pasti duit lo lari ke mana',
      body: 'Liat pos boncos dari printilan kecil sampe gede.',
      annotation: 'Progres nyata',
      image: '/Pengeluaran Bulan ini.png',
      imageWidth: 1600,
      imageHeight: 1735,
      imageSide: 'left',
    },
  ],
} as const satisfies {
  heading: string
  benefits: readonly { icon: LpMissionBenefitIcon; title: string; detail: string }[]
  cards: readonly LpMissionCard[]
}

/* ── SECTION #pricing ───────────────────────────────────────────────────────
   SATU PERIODE: Lifetime → `PLANS[].lifetime` (1/129k/299k), sekali bayar
   untuk akses selamanya. CTA membawa `period=lifetime`. Paket 30 hari sudah
   tidak dijual. Tidak ada nominal di JSX.

   Slot "Khusus Pasangan" tetap diganti fakta nyata: Joint Wallet termasuk di
   Paket Waras. Tidak ada dua akun, tidak ada harga baru. */

/** SATU mode yang dijual. Tipe tetap ada supaya signature tidak berubah. */
export type LpPricingMode = 'lifetime'

export const LP_PRICING = {
  eyebrow: 'Harga',
  /* Satu baris saja (tanpa subjudul): angka harian di-highlight TIPIS di
     tengah kalimat, tanpa pill/latar. Hanya nominal yang ditebalkan, jadi
     teks terbaca: "Beresin bocor halus, cuma Rp 150/hari". */
  titleBefore: 'Beresin bocor halus, cuma ',
  titleEmphasis: 'Rp 150/hari',
  titleAfter: '',
  /** a11y: nama grup mode harga (kini hanya satu: lifetime) */
  toggleAria: 'Durasi paket',
  modes: [{ id: 'lifetime', label: 'Lifetime' }] as const satisfies readonly {
    id: LpPricingMode
    label: string
  }[],
  /** default = konstanta yang SAMA dengan CTA hero (satu pintu masuk) */
  defaultMode: LANDING_DEFAULT_PERIOD,
  /** pill pembeda di kartu (tanpa angka persen yang tidak dihitung) */
  savingsLabel: 'Paling hemat',
  /** satuan ringkas yang tampil DI SAMPING nominal — bukan di tempat lain */
  priceUnits: {
    lifetime: '/ selamanya',
  } as const satisfies Record<LpPricingMode, string>,
  /** badge status singkat di atas nominal tiap kartu */
  modeBadge: {
    lifetime: 'Sekali Bayar',
  } as const satisfies Record<LpPricingMode, string>,
  /** badge di atas kartu */
  badges: {
    lifetime: LIFETIME_LABEL,
  },
  /** catatan mekanisme, tampil di bawah panel */
  note: 'Sekali bayar, tanpa tagihan bulanan. Tidak ada auto-debet dan tidak ada token kartu yang disimpan.',
  /** badge tipe pembayaran di tiap kartu (desain baru: satu periode saja) */
  priceBadge: 'Sekali Bayar',
  /** satuan di samping nominal — selalu akses selamanya */
  priceUnit: '/ selamanya',
  /** judul kecil di atas daftar fitur tiap kartu */
  featuresLabel: 'Yang lo dapet',
  /** baris trust & metode pembayaran di bawah tiga kartu */
  trustNote:
    'Pembayaran resmi terverifikasi via QRIS, GoPay, ShopeePay, OVO & VA (Midtrans). 100% data privat tanpa pernah minta akses m-Banking lo.',
  tiers: LANDING_TIERS,
  /** satu pintu tautan checkout — periode selalu ikut */
  checkoutHref: (id: LandingTierId, mode: LpPricingMode = 'lifetime') =>
    buildCheckoutHref(id, mode),
} as const

/**
 * Satu pintu pembacaan harga landing. Angka lifetime DIBACA dari `PLANS` —
 * tidak ada daftar harga kedua yang bisa melenceng dari checkout. Parameter
 * mode dipertahankan demi signature lama; nilainya kini selalu lifetime.
 */
export function lpPlanPrice(id: LandingTierId, _mode: LpPricingMode = 'lifetime'): number {
  const plan = PLANS.find((item) => item.id === id)
  if (!plan) throw new Error(`Paket ${id} tidak ada di PLANS`)
  return plan.lifetime
}


/* ── SECTION #faq ───────────────────────────────────────────────────────────
   KATEGORI PERTANYAAN (Milestone C) — 4 kategori, 11 pertanyaan yang SEMUA
   berasal dari repo/export:
     Umum            3 pertanyaan export General
     Harga & paket   1 pertanyaan export + 2 dari `FAQ_ITEMS`
     Fitur & AI      1 pertanyaan export (PWA) + 1 dari `FAQ_ITEMS`
     Privasi & keamanan  1 pertanyaan export/tanpa bank-sync + 2 `FAQ_ITEMS`

   Tiga kategori live Framer (Forecasting, Setup & integrations, Security and
   privacy) masih berisi copy template Makro berbahasa Inggris, jadi TIDAK
   disalin. Label kategori juga Bahasa Indonesia. Tidak ada item yang muncul di
   dua kategori, dan tidak ada tab kosong: setiap kategori ≥2 item.

   Setiap klaim sudah dicek ke repo:
     · sekali bayar    → PLANS[].lifetime (tanpa auto-debit di halaman utama)
     · PWA              → app/manifest.ts + /install
     · tanpa bank-sync  → FAQ_ITEMS "no-bank-sync"
     · Midtrans/refund  → FAQ_ITEMS "midtrans-refund"

   Kartu "Let's connect" memakai email support yang benar-benar ada di repo
   (`FOOTER_COPY.contact`). Nomor WhatsApp tidak dikarang karena belum ada di
   repo. */

export type LpFaqCategoryId = 'umum' | 'harga' | 'fitur' | 'privasi'

export interface LpFaqCategory {
  id: LpFaqCategoryId
  label: string
}

export interface LpFaqItem {
  id: string
  category: LpFaqCategoryId
  question: string
  answer: string
}

export const LP_FAQ = {
  eyebrow: 'FAQ',
  titleBefore: 'Jawaban yang sering ',
  titleEmphasis: 'ditanya',
  /** a11y: nama rail desktop + dropdown mobile */
  categoryRailLabel: 'Kategori pertanyaan',
  categorySelectLabel: 'Pilih kategori pertanyaan',
  categories: [
    { id: 'umum', label: 'Umum' },
    { id: 'harga', label: 'Harga & paket' },
    { id: 'fitur', label: 'Fitur & AI' },
    { id: 'privasi', label: 'Privasi & keamanan' },
  ] as const satisfies readonly LpFaqCategory[],
  items: [
    {
      id: 'buat-siapa',
      category: 'umum',
      question: 'CatetInd itu sebenernya buat siapa sih?',
      answer:
        'Buat lo yang ngerasa duit sering ngilang tanpa jejak. Karyawan, anak kos, freelancer, atau pasangan muda, semua cocok.',
    },
    {
      id: 'beda-app-lain',
      category: 'umum',
      question: 'Bedanya sama aplikasi catatan keuangan lain apa?',
      answer:
        'App lain bikin nyatet kerasa kayak ngerjain PR. CatetInd cukup voice note atau foto struk, 4 detik kelar.',
    },
    {
      id: 'harus-paham-keuangan',
      category: 'umum',
      question: 'Harus ngerti keuangan dulu ngga sebelum pake ini?',
      answer:
        'Ngga perlu ngerti istilah keuangan. Lo tinggal catat, sisanya dihitung dan diringkas sistem.',
    },
    {
      id: 'versi-gratis',
      category: 'harga',
      question: 'Ada versi gratis ngga?',
      answer:
        'Ngga ada versi gratis. Paket dibeli sekali untuk akses selamanya, tanpa auto-debit dan tanpa tagihan bulanan.',
    },
    {
      id: 'harga',
      category: 'harga',
      question: 'Kok mahal buat app catatan keuangan?',
      answer:
        `Sekali bayar ${PRICE_RANGE_LABEL} untuk akses selamanya, tanpa tagihan bulanan. Kalau bantu lo hemat Rp200.000 saja, lo sudah balik modal.`,
    },
    {
      id: 'beda-paket',
      category: 'harga',
      question: 'Bedanya Paket Catet Aja, Waras, dan Sultan apa?',
      answer:
        `Catet Aja buat catat manual, Waras nambah AI Coach, scan struk, dan voice input, Sultan AI-nya unlimited. Semua bisa sekali bayar, dan upgrade lifetime cukup bayar selisih.`,
    },
    {
      id: 'pwa',
      category: 'fitur',
      question: 'Ini aplikasi web atau harus di-download?',
      answer:
        'Bisa di-install langsung di HP tanpa memenuhi memori App Store atau Play Store. Buka lewat browser, lalu pilih Add to Home Screen.',
    },
    {
      id: 'kuota-ai',
      category: 'fitur',
      question: 'Gimana kalau kuota AI habis?',
      answer:
        'Kuota AI Waras cukup buat pemakaian harian. Kalau lo power user, upgrade ke Sultan buat AI tanpa batas.',
    },
    {
      id: 'bank-sync',
      category: 'privasi',
      question: 'CatetInd connect ke rekening bank otomatis ngga?',
      answer:
        'Ngga connect ke rekening bank, dan ini disengaja. Input manual, scan struk, dan voice input lebih aman daripada kasih akses perbankan ke pihak ketiga.',
    },
    {
      id: 'midtrans-refund',
      category: 'privasi',
      question: 'Aman gak bayar lewat Midtrans?',
      answer:
        'Midtrans dipakai Tokopedia, Bukalapak, dan Gojek, jadi pembayarannya aman. Paketnya sekali bayar untuk akses selamanya, tanpa auto-debit.',
    },
    {
      id: 'data',
      category: 'privasi',
      question: 'Dataku bakal aman terus nggak?',
      answer:
        'Data lo ngga pernah dihapus, termasuk saat masa aktif habis. Lo tetap bisa baca dan ekspor semua catatan.',
    },
  ] satisfies readonly LpFaqItem[],
  /** a11y: label tombol akordeon — pertanyaan ikut dibacakan */
  toggle: (open: boolean, question: string) =>
    `${open ? 'Tutup' : 'Buka'} pertanyaan: ${question}`,
  contact: {
    pillLabel: 'Ngobrol langsung',
    eyebrow: 'Masih ada yang bikin ragu?',
    title: 'Tanya apa aja, dibalas langsung sama tim kita',
    ctaLabel: 'Chat Minca di WhatsApp',
    href: LP_WHATSAPP_HREF_WITH_TEXT,
    emailLabel: `Atau email ${LP_SUPPORT_EMAIL}`,
    emailHref: LP_SUPPORT_MAILTO,
  },
} as const


/* ── HALAMAN /contact ───────────────────────────────────────────────────────
   Struktur mengikuti live Framer (copy kiri, kartu form gelap di kanan, tiga
   kartu bantuan), tetapi isinya dibersihkan dari klaim template:
     • "100% Data Privat"/"Zero Auto-Debit Rahasia" TIDAK dipakai. Trust chip
       hanya menyebut hal yang bisa dicek di repo: tanpa akses rekening bank
       (`FAQ_ITEMS`), sekali bayar (`PLANS`), dan data bisa diekspor/dihapus
       (`/privacy`).
     • Kartu Instagram @catetind + "64.000 followers" TIDAK dibuat: tidak ada
       akun nyata di repo, jadi angka itu akan jadi karangan.
     • Repo demo tidak punya backend email. Form membuka WhatsApp (utama) atau
       aplikasi email `mailto:halo@catetind.com` (cadangan); tidak ada klaim
       "terkirim". */

export interface LpContactField {
  label: string
  placeholder: string
  required: boolean
  type: 'text' | 'textarea'
  autoComplete: string
  maxLength: number
}

/** bentuk nilai form — dipakai komponen & pengujian logika WhatsApp/mailto */
export interface LpContactValues {
  name: string
  /** nomor WhatsApp ATAU email — satu kolom, dua bentuk */
  contact: string
  question: string
}

export interface LpContactHelpCard {
  icon: 'whatsapp' | 'mail' | 'help'
  title: string
  body: string
  ctaLabel: string
  href: string
}

export const LP_CONTACT = {
  eyebrow: 'Ngobrol Santai',
  title: 'Masih ragu atau ada yang mau lo tanyain?',
  body: 'Nol trik marketing, nol jebakan perpanjangan otomatis. Kalo mau mastiin CatetInd beneran cocok buat dompet lo, tanya aja dulu. Kita jawab jujur apa adanya.',
  trustChips: [
    'Tanpa akses rekening bank',
    'Sekali bayar, akses selamanya',
    'Data tetap milik lo',
  ],
  form: {
    title: 'Tanya Langsung',
    subtitle: 'Tiga kolom aja. Balasannya lewat WhatsApp atau email.',
    fields: {
      name: {
        label: 'Nama',
        placeholder: 'Nama panggilan lo',
        required: true,
        type: 'text',
        autoComplete: 'name',
        maxLength: 60,
      },
      /**
       * Satu kolom untuk WhatsApp ATAU email, jadi `type="text"` —
       * `type="email"` akan menolak nomor WhatsApp yang valid.
       */
      contact: {
        label: 'Kontak (Nomor WhatsApp atau Email)',
        placeholder: '0812… atau nama@email.com',
        required: true,
        type: 'text',
        autoComplete: 'email',
        maxLength: 120,
      },
      question: {
        label: 'Pesan / Pertanyaan',
        placeholder:
          'Tulis aja apa adanya: soal fitur AI, privasi data, cara bayar, atau apa pun yang bikin lo ragu...',
        required: true,
        type: 'textarea',
        autoComplete: 'off',
        maxLength: 1200,
      },
    } satisfies Record<keyof LpContactValues, LpContactField>,
    errors: {
      name: 'Nama wajib diisi.',
      contact: 'Kontak wajib diisi. Isi nomor WhatsApp atau email.',
      question: 'Pesan atau pertanyaan wajib diisi.',
    },
    submit: 'Kirim lewat WhatsApp',
    secondaryLabel: 'Kirim lewat email',
    /* catatan setelah submit: jujur soal aplikasi yang terbuka, bukan toast palsu */
    afterSubmitNote:
      'WhatsApp/email app lo akan terbuka dengan isi pesan ini. Kalau tidak ada aplikasinya, salin manual ke 0817-7577-7778 atau halo@catetind.com.',
    mailtoSubject: 'Pertanyaan dari halaman kontak CatetInd',
    supportEmail: LP_SUPPORT_EMAIL,
    whatsappDisplay: LP_WHATSAPP.display,
  },
  helpCards: [
    {
      icon: 'whatsapp',
      title: 'Chat WhatsApp',
      body: 'Respon cepat di jam kerja. Tanya apa aja, dibalas manusia.',
      ctaLabel: `Chat ${LP_WHATSAPP.display}`,
      href: LP_WHATSAPP_HREF_WITH_TEXT,
    },
    {
      icon: 'mail',
      title: 'Kirim Email',
      body: `Tanya soal privasi, pembayaran, atau paket ke ${LP_SUPPORT_EMAIL}.`,
      ctaLabel: `Email ${LP_SUPPORT_EMAIL}`,
      href: LP_SUPPORT_MAILTO,
    },
    {
      icon: 'help',
      title: 'Pusat Bantuan / FAQ',
      body: 'Panduan cepat dan jawaban pertanyaan umum, tanpa perlu nunggu balasan.',
      ctaLabel: 'Buka pusat bantuan',
      /* `/bantuan` = halaman bantuan PUBLIK (tanpa sidebar app). `/help`
         khusus user yang sudah login; halaman ini dibaca sebelum punya akun. */
      href: '/bantuan',
    },
  ],
} as const

/** baris isi pesan — satu sumber untuk WhatsApp & email */
function contactMessageLines(values: LpContactValues): string[] {
  const fields = LP_CONTACT.form.fields
  return [
    LP_WHATSAPP.prefill,
    '',
    `${fields.name.label}: ${values.name.trim()}`,
    `${fields.contact.label}: ${values.contact.trim()}`,
    '',
    `${fields.question.label}:`,
    values.question.trim(),
  ]
}

/**
 * Menyusun tautan WhatsApp dari nilai form. Nomor SELALU format internasional
 * (`6281…`), tidak pernah nomor lokal.
 */
export function buildContactWhatsApp(values: LpContactValues): string {
  const text = encodeURIComponent(contactMessageLines(values).join('\n'))
  return `${LP_WHATSAPP.href}?text=${text}`
}

/**
 * Menyusun tautan mailto dari nilai form. Ditaruh di data (bukan di JSX)
 * supaya isi pesan bisa diuji tanpa DOM dan label field tidak ditulis ulang.
 */
export function buildContactMailto(values: LpContactValues): string {
  const subject = encodeURIComponent(LP_CONTACT.form.mailtoSubject)
  const body = encodeURIComponent(contactMessageLines(values).join('\n'))
  return `mailto:${LP_CONTACT.form.supportEmail}?subject=${subject}&body=${body}`
}
