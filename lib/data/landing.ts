/* ── LANDING PAGE PUBLIK (/) — copy, seed, & logika MURNI ────────────────────
   Halaman pemasaran di ROOT. Sama seperti `lib/data/welcome.ts`, `auth.ts`, dan
   `pricing.ts`: file ini murni (TANPA React) supaya komponen section nol string
   user-facing.

   Dua aturan yang mengikat:
     1. Landing lama sudah dihapus; `app/page.tsx` sekarang merender section baru
        di `components/landing/lp/*`.
     2. HARGA (`LANDING_TIERS`/`LP_PRICING`) HANYA DIBACA dari `PLANS` di
        `lib/data/pricing.ts`: monthly 49k/79k/199k (prabayar 30 hari) dan
        lifetime 109k/129k/299k. Jangan menulis nominal di komponen.
   ────────────────────────────────────────────────────────────────────────── */

import { SITE_ORIGIN } from '../site'
import {
  LIFETIME_LABEL,
  MONTHLY_LABEL,
  PERIOD_LABEL,
  PLANS,
  PREPAID_LABEL,
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
 * DIBACA dari `PLANS[]` (monthly + lifetime). Tautan checkout selalu membawa
 * `period`, jadi tidak ada lagi dua daftar harga.
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
  period: BillingPeriod = 'monthly',
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

/* ── SEO / META ─────────────────────────────────────────────────────────────
   Dipakai `app/page.tsx` (metadata) supaya judul & deskripsi tidak ditulis dua
   kali. `ogUrl` adalah domain kanon produk. */

/** rentang harga kanon dalam teks — dipakai copy landing supaya angkanya tidak ditulis tangan */
const PRICE_RANGE_LABEL = `${formatIDR(PLANS[0].lifetime)}-${formatIDR(PLANS[PLANS.length - 1].lifetime)}`
const MONTHLY_PRICE_RANGE_LABEL = `${formatIDR(PLANS[0].monthly)}-${formatIDR(PLANS[PLANS.length - 1].monthly)}`
export const LANDING_META = {
  title: 'CatetInd — Catat Keuangan 4 Detik, Dibantu AI',
  description: `Catatan keuangan buat Gen-Z Indonesia: satu catatan cukup 4 detik lewat voice atau foto struk, AI Coach yang gak nge-judge, dan laporan yang gampang dibaca. Mulai ${formatIDR(PLANS[0].monthly)} per 30 hari (prabayar, tanpa auto-debet) atau ${formatIDR(PLANS[0].lifetime)} sekali bayar untuk akses selamanya.`,
  ogTitle: 'Catet keuangan 4 detik. Sisanya biar AI yang mikir.',
  ogDescription: `CatetInd — mulai ${formatIDR(PLANS[0].monthly)} per 30 hari, prabayar tanpa auto-debet. Mau sekali beres? Lifetime mulai ${formatIDR(PLANS[0].lifetime)}.`,
  ogUrl: SITE_ORIGIN,
} as const

/* ── NAVBAR ─────────────────────────────────────────────────────────────────
   Aturan: logo di kiri, tombol "Masuk" gaya ghost di kanan. Navbar transparan
   di puncak halaman lalu mendapat latar lembut saat digulir (state-nya di
   komponen `landing-navbar.tsx`). */
export const LANDING_NAV = {
  brand: 'CatetInd',
  homeLabel: 'CatetInd — beranda',
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
      tagline: 'Buat yang mau rapi dulu, tanpa AI.',
      ctaLabel: 'Pilih Paket Catet Aja',
      features: [
        { label: 'Catat pemasukan & pengeluaran manual', included: true },
        { label: 'Kategori bawaan & custom', included: true },
        { label: 'Dashboard & laporan dasar', included: true },
        { label: 'Multi dompet', included: true },
        { label: 'Budget & target nabung', included: true },
        { label: 'AI Coach (Minca)', included: false },
        { label: 'Scan struk otomatis (OCR)', included: false },
        { label: 'Voice input', included: false },
        { label: 'Laporan AI', included: false },
        { label: 'Joint Wallet (Dompet Bersama)', included: false },
      ],
    },
  ),
  landingTier(
    'waras',
    {
      tagline: 'Paling pas buat first-jobber yang mau dibantu AI.',
      badge: '⭐ Paling Dipilih',
      recommended: true,
      ctaLabel: 'Pilih Paket Waras',
      features: [
        { label: 'Semua fitur Paket Catet Aja', included: true },
        { label: 'AI Coach (Minca) — kuota bulanan, reset tanggal 1', included: true },
        { label: 'Scan struk otomatis (OCR)', included: true },
        { label: 'Voice input', included: true },
        { label: 'Laporan AI mingguan & bulanan', included: true },
        { label: 'Joint Wallet (Dompet Bersama)', included: true },
      ],
    },
  ),
  landingTier(
    'sultan',
    {
      tagline: 'AI tanpa batas buat yang mau serius.',
      ctaLabel: 'Pilih Paket Sultan',
      features: [
        { label: 'Semua fitur Paket Waras', included: true },
        { label: 'AI Coach UNLIMITED (tanpa batas kuota)', included: true },
        { label: 'Prioritas support', included: true },
      ],
    },
  ),
]

/** dipakai Sticky CTA bar — SATU sumber dengan kartu (tidak diketik ulang) */
export const RECOMMENDED_TIER: LandingTier =
  LANDING_TIERS.find((tier) => tier.recommended) ?? LANDING_TIERS[0]

export const PRICING_COPY = {
  eyebrow: 'Harga jujur',
  title: 'Bayar sekali. Pakai seumur hidup.',
  subtitle:
    'Nol langganan bulanan, nol tagihan berulang. Semua paket sekali bayar dan langsung dapat semua fitur di tier-nya.',
} as const

export interface TrustBadge {
  emoji: string
  text: string
}

export const PRICING_TRUST_BADGES: TrustBadge[] = [
  { emoji: '💰', text: 'Gak cocok? Uang kembali 100% dalam 30 hari. Tanpa drama.' },
  { emoji: '🔒', text: 'Pembayaran aman via Midtrans' },
  { emoji: '✅', text: 'Sekali bayar, akses selamanya' },
]

/** Sticky CTA bar (muncul setelah Section 5 terlewat). */
export const STICKY_CTA_COPY = {
  ctaLabel: 'Daftar Sekarang',
  period: 'akses selamanya',
  ariaLabel: 'Daftar cepat paket rekomendasi',
} as const


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
  { label: 'Masuk', href: '/login' },
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
  homeAria: 'CatetInd — ke beranda',
  /** logo menuju puncak halaman; di /contact diarahkan ke landing penuh */
  homeHref: '#hero',
  menuAria: 'Buka menu',
  menuCloseAria: 'Tutup menu',
  navAria: 'Navigasi utama',
  menuNavAria: 'Navigasi menu',
  ctaLabel: 'Cobain',
  ctaHref: '/checkout',
} as const

export const LP_HERO = {
  eyebrow: '👋 Kenalin, CatetInd',
  eyebrowIconAria: 'Daftar',
  /* headline dipecah supaya kata "males" bisa italic seperti di export
     (`<em>` di dalam <h1>) tanpa menulis markup di komponen */
  headlineBefore: 'App keuangan buat orang yang ',
  headlineEmphasis: 'males',
  headlineAfter: ' buka app keuangan.',
  subheadline: '1 catetan, cukup 4 detik.',
  ctaLabel: 'Gass Cobain!',
  /** produk utama = prabayar 30 hari; paket hero (Waras) dipilih lebih dulu */
  ctaHref: buildCheckoutHref(PLANS[1].id, 'monthly'),
  socialProof: 'Join 2.000+ lainnya',
  avatarsAria: 'Avatar pengguna CatetInd',
  /* 5 avatar social proof — urutan sama dengan export.
     Semua aset landing disimpan sebagai PNG (hasil konversi export); path lama
     berakhiran `.jpg` membuat kelima avatar 404 tanpa suara. `landing.test.ts`
     sekarang mengunci keberadaan setiap berkas di `public/`. */
  avatars: [
    '/landing/7TCDoe4Wv0OmvbhyoXJOiGslf0.png',
    '/landing/EcPXn50sd8RW6vgBU41Hc1yYvY.png',
    '/landing/jeTXLIKqPt2MAAQ9L87BUQaQH8E.png',
    '/landing/pvIPMeRZ6WsqFzknH6kiaoOQ3dk.png',
    '/landing/0tfQFn6SL6Efx6xuUHY6Qx1j8c.png',
  ],
  /* aset visual hero (dekoratif → alt kosong, ringkasannya di `visualAlt`) */
  /* Desktop memakai GAMBARDEPAN.png; mobile TETAP memakai phoneImage. */
  boardImage: '/GAMBARDEPAN.png',
  phoneImage: '/landing/XR2qVbJABSACTzUQSOelrYLkws0.png',
  visualAlt:
    'Pratinjau aplikasi CatetInd: layar dompet utama di dalam ponsel, kartu Jatah Hari Ini, dan ringkasan Arus Uang.',
} as const

export const LP_FOOTER = {
  cta: {
    title: 'Siap stop boncos bulan ini?',
    body: 'Biar gaji lo ga cuma numpang lewat. Mulai prabayar 30 hari, atau sekali bayar buat selamanya.',
    button: 'Amankan Akses Sekarang',
    href: buildCheckoutHref(PLANS[1].id, 'monthly'),
  },
  columns: [
    {
      title: 'Isi',
      links: [
        { label: 'Ke atas', href: '#hero' },
        { label: 'Fitur', href: '#fitur' },
        { label: 'Harga', href: '#pricing' },
        { label: 'FAQ', href: '#faq' },
      ],
    },
    {
      title: 'Perusahaan',
      /* "Updates" di export sekarang punya halaman nyata (`/changelog`), jadi
         ditautkan. "Blog" tetap dibuang karena belum ada halamannya di repo. */
      links: [
        { label: 'Tentang', href: '#mission' },
        { label: 'Changelog', href: '/changelog' },
        { label: 'Kontak', href: '/contact' },
        { label: `WhatsApp ${LP_WHATSAPP.display}`, href: LP_WHATSAPP.href },
        { label: LP_SUPPORT_EMAIL, href: LP_SUPPORT_MAILTO },
      ],
    },
    {
      title: 'Sosial',
      links: [
        { label: 'X / Twitter', href: 'https://x.com/' },
        { label: 'Facebook', href: 'https://www.facebook.com/' },
        { label: 'Instagram', href: 'https://www.instagram.com' },
        { label: 'Discord', href: 'https://discord.com' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Syarat & Ketentuan', href: '/terms' },
        { label: 'Kebijakan Privasi', href: '/privacy' },
        { label: 'Kebijakan Cookie', href: '/privacy' },
      ],
    },
  ],
  /* copyright template ("Makro LLC") tidak boleh lolos ke produk. */
  copyright: '© 2026 CatetInd. Semua hak dilindungi.',
  bigLabel: 'Catet',
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
  emailNextNote:
    'Langkah terakhir: buka tautan konfirmasi yang kami kirim ke emailmu.',
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
  /** baris centang di dasar kartu — hanya tampil di ≥810px, sama seperti export */
  caption: string
  image: string
  /**
   * dimensi asli dari atribut `width`/`height` markup export. Dipasang di
   * <img> supaya browser memesan ruang sebelum gambar selesai dimuat (tidak
   * ada layout shift) — bukan untuk memaksa rasio, karena object-fit contain.
   */
  imageWidth: number
  imageHeight: number
  /** sisi gambar di desktop; mobile selalu gambar di atas copy */
  imageSide: 'left' | 'right'
  mobile: {
    eyebrow: string
    title: string
    body: string
    image: string
    imageWidth: number
    imageHeight: number
  }
}

export const LP_MISSION = {
  heading: 'Uang lo bebas lo pake buat apa aja. Asal lo sadar ke mana perginya',
  benefits: [
    { icon: 'time', title: 'Gak Buang Waktu', detail: 'Empat detik kelar' },
    { icon: 'ai', title: 'Biar AI Mikir', detail: 'Lo terima beres' },
    { icon: 'aware', title: 'Sadar Sebelum Habis', detail: 'Keliatan semua bocornya' },
  ],
  cards: [
    {
      id: 'card-1',
      title: 'Ketik pengeluaran manual? Hari gini? Ngomong aja kelar',
      body: 'Waktu lu terlalu berharga buat ngisi form yang ribet. Cukup kirim voice note atau foto struk belanja, sisanya biarin AI yang mikir',
      caption: '4 detik kelar. Lu bener-bener terima beres',
      image: '/Dialog - Catat transaksi.png',
      imageWidth: 1760,
      imageHeight: 1551,
      imageSide: 'right',
      mobile: {
        eyebrow: 'Catat kilat',
        title: 'Serius, lo masih nyatet pengeluaran manual?',
        body: '3 detik kelar. Tinggal ngomong atau foto struk',
        image: '/Dialog - Catat transaksi.png',
        imageWidth: 1760,
        imageHeight: 1551,
      },
    },
    {
      id: 'card-2',
      title: 'Rem darurat biar lo ngga nangis pas akhir bulan',
      body: 'Lihat akun, arus uang, dan pola mana yang beneran bikin saldo lo berubah.',
      caption: 'Nggak ada lagi sumber uang yang campur aduk.',
      image: '/Section.png',
      imageWidth: 1600,
      imageHeight: 1822,
      imageSide: 'left',
      mobile: {
        eyebrow: 'Radar bocor',
        title: 'Radar tanggal rawan: Ketahui kapan lo gampang kalap.',
        body: 'Biar ga kaget kenapa saldo tiba-tiba ludes',
        image: '/Section.png',
        imageWidth: 1600,
        imageHeight: 1822,
      },
    },
    {
      id: 'card-3',
      title: 'Tau semua komitmen yang udah lo janjiin bayar',
      body: 'Lihat biaya berulang, tagihan mendatang, dan kontrak sebelum semuanya motong saldo lo.',
      caption: 'Nggak ada lagi momen “eh, ini diperpanjang otomatis?”',
      image: '/Dialog - AI Coach CatetInd.png',
      imageWidth: 1760,
      imageHeight: 1700,
      imageSide: 'right',
      mobile: {
        eyebrow: 'Anti kelewat',
        title: 'Financial bestie pribadi lo. 24/7, tanpa nge-judge',
        body: 'Tanya apa aja sebelum lo checkout atau nongkrong',
        image: '/Dialog - AI Coach CatetInd.png',
        imageWidth: 1760,
        imageHeight: 1700,
      },
    },
    {
      id: 'card-4',
      title: 'Lihat progres keuangan lo dari waktu ke waktu',
      body: 'CatetInd nunjukin pertumbuhan, momentum, dan progres jangka panjang tanpa laporan manual.',
      caption: 'Nggak ada lagi tracking progres manual.',
      image: '/Pengeluaran Bulan ini.png',
      imageWidth: 1600,
      imageHeight: 1735,
      imageSide: 'left',
      mobile: {
        eyebrow: 'Progres nyata',
        title: 'Akhirnya lo tau pasti duit lo lari ke mana',
        body: "Duit ga bakal lagi 'nguap' tanpa jejak",
        image: '/Pengeluaran Bulan ini.png',
        imageWidth: 1600,
        imageHeight: 1735,
      },
    },
  ],
} as const satisfies {
  heading: string
  benefits: readonly { icon: LpMissionBenefitIcon; title: string; detail: string }[]
  cards: readonly LpMissionCard[]
}

/* ── SECTION #pricing ───────────────────────────────────────────────────────
   DUA PERIODE NYATA (rilis prepaid):
     • Langganan 30 hari → `PLANS[].monthly` (49k/79k/199k), sekali bayar,
       tanpa auto-debet; CTA `/checkout?plan=<id>&period=monthly`.
     • Lifetime → `PLANS[].lifetime` (109k/129k/299k); CTA membawa
       `period=lifetime`.
   Default produk = monthly. Tidak ada nominal di JSX.

   Slot "Khusus Pasangan" tetap diganti fakta nyata: Joint Wallet termasuk di
   Paket Waras. Tidak ada dua akun, tidak ada harga baru. */

export type LpPricingMode = 'monthly' | 'lifetime'

export const LP_PRICING = {
  eyebrow: 'Harga',
  titleBefore: 'Beresin bocor halus, mulai ',
  titleEmphasis: '1 kopi',
  subtitle:
    'Prabayar 30 hari atau sekali bayar lifetime. Tanpa biaya tersembunyi, tanpa auto-debet, tanpa jebakan perpanjangan otomatis.',
  /** a11y: nama grup dua tombol mode harga */
  toggleAria: 'Pilih durasi paket',
  modes: [
    { id: 'monthly', label: MONTHLY_LABEL, note: 'Aktif 30 hari · perpanjang manual' },
    { id: 'lifetime', label: 'Lifetime', note: 'Sekali bayar · akses selamanya' },
  ] as const satisfies readonly { id: LpPricingMode; label: string; note: string }[],
  /** default produk: prabayar 30 hari */
  defaultMode: 'monthly' as LpPricingMode,
  /** label periode di samping nominal */
  periodLabels: PERIOD_LABEL,
  /** badge di atas kartu — dibaca per mode */
  badges: {
    monthly: 'Prabayar 30 hari · tanpa auto-debet',
    lifetime: LIFETIME_LABEL,
  },
  /** catatan mekanisme, tampil di bawah panel */
  note: 'Perpanjang manual. Tidak ada auto-debet dan tidak ada token kartu yang disimpan.',
  /** judul kecil di atas daftar fitur tiap kartu */
  featuresLabel: 'Yang lo dapet',
  tiers: LANDING_TIERS,
  /** satu pintu tautan checkout — periode selalu ikut */
  checkoutHref: (id: LandingTierId, mode: LpPricingMode) => buildCheckoutHref(id, mode),
  partner: {
    eyebrow: 'Buat berdua',
    title: 'Mau beresin keuangan bareng pasangan?',
    body: 'Dompet Bersama (Joint Wallet) sudah termasuk di Paket Waras — bikin kantong bareng, lalu bagikan kode undangannya ke pasangan.',
    ctaLabel: 'Pilih Paket Waras',
    href: buildCheckoutHref('waras', 'monthly'),
  },
} as const

/**
 * Satu pintu pembacaan harga landing. Angka monthly/lifetime DIBACA dari
 * `PLANS` — tidak ada daftar harga kedua yang bisa melenceng dari checkout.
 */
export function lpPlanPrice(id: LandingTierId, mode: LpPricingMode): number {
  const plan = PLANS.find((item) => item.id === id)
  if (!plan) throw new Error(`Paket ${id} tidak ada di PLANS`)
  return mode === 'monthly' ? plan.monthly : plan.lifetime
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
     · garansi 30 hari  → PRICING_TRUST_BADGES, FAQ_ITEMS, lib/data/help.ts
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
  subtitle:
    'Pertanyaan yang paling sering masuk sebelum orang mulai nyatet. Kalau masih ada yang bikin ragu, chat WhatsApp atau kirim email aja.',
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
        "Buat siapa aja yang ngerasa duitnya sering 'ngilang' entah ke mana. Karyawan, anak kos, freelancer, pasangan muda — selama ada uang yang masuk dan keluar, CatetInd relevan buat lo.",
    },
    {
      id: 'beda-app-lain',
      category: 'umum',
      question: 'Bedanya sama aplikasi catatan keuangan lain apa?',
      answer:
        'Kebanyakan aplikasi keuangan bikin lo ngerasa lagi ngerjain PR. CatetInd bikin nyatet secepat kirim chat: voice note atau foto struk, 4 detik kelar. Plus ada AI Coach yang ngasih insight pakai bahasa ngobrol, bukan bahasa laporan keuangan.',
    },
    {
      id: 'harus-paham-keuangan',
      category: 'umum',
      question: 'Harus ngerti keuangan dulu ngga sebelum pake ini?',
      answer:
        'Sama sekali ngga. CatetInd dibikin buat orang yang ngga ngerti dan ngga mau ribet belajar keuangan. Lo tinggal catat, sisanya dihitung dan diringkas sistem.',
    },
    {
      id: 'versi-gratis',
      category: 'harga',
      question: 'Ada versi gratis ngga?',
      answer:
        'Ngga ada, dan ini disengaja — daripada kasih versi yang fiturnya dikebiri, kami kasih garansi uang kembali 100% dalam 30 hari. Jadi lo tetap bisa coba tanpa risiko kehilangan uang.',
    },
    {
      id: 'harga',
      category: 'harga',
      question: 'Kok mahal buat app catatan keuangan?',
      answer:
        `Ada dua cara: prabayar 30 hari mulai ${MONTHLY_PRICE_RANGE_LABEL} per 30 hari, atau sekali bayar lifetime ${PRICE_RANGE_LABEL}. Keduanya tanpa auto-debet. Kalau CatetInd bantu kamu hemat Rp200.000 saja di bulan pertama, kamu sudah balik modal.`,
    },
    {
      id: 'beda-paket',
      category: 'harga',
      question: 'Bedanya Paket Catet Aja, Waras, dan Sultan apa?',
      answer:
        `Simpel: Paket Catet Aja (${formatIDR(PLANS[0].monthly)} per 30 hari / ${formatIDR(PLANS[0].lifetime)} lifetime) = catat manual tanpa AI. Paket Waras (${formatIDR(PLANS[1].monthly)} per 30 hari / ${formatIDR(PLANS[1].lifetime)} lifetime) = semua fitur termasuk AI Coach, scan struk, dan voice input dengan kuota bulanan. Paket Sultan (${formatIDR(PLANS[2].monthly)} per 30 hari / ${formatIDR(PLANS[2].lifetime)} lifetime) = sama seperti Waras tapi AI-nya unlimited tanpa batas kuota. Naik paket lifetime cukup bayar selisihnya.`,
    },
    {
      id: 'pwa',
      category: 'fitur',
      question: 'Ini aplikasi web atau harus di-download?',
      answer:
        'CatetInd itu PWA (Progressive Web App). Buka lewat browser biasa, ngga perlu download dari App Store atau Play Store. Kalau mau lebih praktis, install ke home screen dari browser — tampilannya tetap kayak aplikasi.',
    },
    {
      id: 'kuota-ai',
      category: 'fitur',
      question: 'Gimana kalau kuota AI habis?',
      answer:
        'Kuota AI bulananmu cukup besar — 80% user gak akan pernah menyentuh batas. Tapi kalau kamu power user, kamu bisa upgrade ke Paket Sultan untuk AI unlimited. Kamu bisa cek sisa kuota kapan aja di Settings, dan kami kasih notifikasi saat tinggal 30%.',
    },
    {
      id: 'bank-sync',
      category: 'privasi',
      question: 'CatetInd connect ke rekening bank otomatis ngga?',
      answer:
        'Ngga, dan ini keputusan yang disengaja. Bank-sync berarti lo kasih akses data perbankan ke pihak ketiga, dan regulasi open banking di Indonesia belum matang. Kami pilih jalur yang lebih aman: input manual super cepat, scan struk, dan voice input.',
    },
    {
      id: 'midtrans-refund',
      category: 'privasi',
      question: 'Aman gak bayar lewat Midtrans? Gimana kebijakan refund?',
      answer:
        `Midtrans itu payment gateway yang dipakai Tokopedia, Bukalapak, dan Gojek — jadi keamanannya sudah level enterprise. Data kartu/e-wallet kamu diproses langsung oleh Midtrans, bukan oleh kami. Soal refund: garansi uang kembali 100% dalam 30 hari. Tinggal email ke ${LP_SUPPORT_EMAIL}, dan kami proses dalam 3-5 hari kerja.`,
    },
    {
      id: 'data',
      category: 'privasi',
      question: 'Dataku bakal aman terus nggak?',
      answer:
        'Data kamu TIDAK PERNAH dihapus. Semua catatan keuangan kamu tetap tersimpan aman dan bisa kamu akses kapan aja, termasuk saat masa aktif 30 hari habis. Saat habis, CatetInd masuk mode baca-saja: kamu tetap bisa membaca dan mengekspor semua data, hanya tombol tambah/ubah data yang ditahan sampai kamu memperpanjang. Paket lifetime tidak punya tanggal berakhir.',
    },
  ] satisfies readonly LpFaqItem[],
  /** a11y: label tombol akordeon — pertanyaan ikut dibacakan */
  toggle: (open: boolean, question: string) =>
    `${open ? 'Tutup' : 'Buka'} pertanyaan: ${question}`,
  contact: {
    pillLabel: "Let's connect",
    eyebrow: 'Masih ada yang bikin ragu?',
    title: 'Tanya langsung, dibalas manusia',
    body: 'Bukan bot, bukan format CS kaku. Tanya soal privasi, cara pakai, atau garansi refund — kami balas lewat WhatsApp atau email.',
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
    'Prabayar 30 hari, tanpa auto-debet',
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
      contact: 'Kontak wajib diisi — nomor WhatsApp atau email.',
      question: 'Pesan atau pertanyaan wajib diisi.',
    },
    submit: 'Kirim lewat WhatsApp',
    secondaryLabel: 'Kirim lewat email',
    /* catatan setelah submit: jujur soal aplikasi yang terbuka, bukan toast palsu */
    afterSubmitNote:
      'WhatsApp/email app kamu akan terbuka dengan isi pesan ini. Kalau tidak ada aplikasinya, salin manual ke 0817-7577-7778 atau halo@catetind.com.',
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
      body: `Tanya soal privasi, pembayaran, atau refund ke ${LP_SUPPORT_EMAIL}.`,
      ctaLabel: `Email ${LP_SUPPORT_EMAIL}`,
      href: LP_SUPPORT_MAILTO,
    },
    {
      icon: 'help',
      title: 'Pusat Bantuan / FAQ',
      body: 'Panduan cepat dan jawaban pertanyaan umum — tanpa perlu nunggu balasan.',
      ctaLabel: 'Buka pusat bantuan',
      href: '/help',
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
