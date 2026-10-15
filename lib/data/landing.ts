/* ── LANDING PAGE PUBLIK (/) — copy, seed, & logika MURNI ────────────────────
   Halaman pemasaran di ROOT. Sama seperti `lib/data/welcome.ts`, `auth.ts`, dan
   `pricing.ts`: file ini murni (TANPA React) supaya komponen section nol string
   user-facing, dan seluruh perhitungan (pain calculator & wealth gap) bisa
   diuji tanpa DOM.

   Dua catatan yang mengikat isi file ini:
     1. ANGKA PAIN CALCULATOR & WEALTH GAP dihitung dari fungsi murni di sini
        (`computePain`, `buildWealthGap`) — bukan ditulis tangan di JSX, supaya
        angka yang user lihat tidak pernah "beda cerita" dengan rumusnya.
     2. HARGA TIER LANDING (`LANDING_TIERS`) DITURUNKAN dari `PLANS` di
        `lib/data/pricing.ts` — paket yang sama, angka yang sama, sekali bayar
        untuk AKSES SELAMANYA. Sebelum paket 84 halaman ini menjual 99k/119k/299k
        "seumur hidup" sementara `PLANS` menjual 49k/109k/199k tahunan: dua
        daftar harga yang berbeda. Sekarang angka paket di sini hanya boleh
        DIBACA dari satu tempat itu.
   ────────────────────────────────────────────────────────────────────────── */

import { SITE_ORIGIN } from '../site'
import { PLANS, LIFETIME_LABEL, formatIDR, type PlanId } from './pricing'
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
 * HARGA LANDING — SELESAI (paket 84).
 *
 * `LANDING_TIERS[].id` memakai id yang SAMA dengan `PlanId` di
 * `lib/data/pricing.ts` ('catet-aja' | 'waras' | 'sultan'), dan `price`-nya
 * DIBACA dari `PLANS[].lifetime`. Tidak ada lagi dua daftar harga: angka yang
 * diiklankan di halaman ini adalah angka yang benar-benar ditagih server.
 *
 * Tautan lanjut bayar tidak lagi membawa periode — satu paket, satu harga.
 */


/**
 * Tautan ke halaman "Terima kasih" setelah registrasi dari landing.

 * Paket yang dipilih user IKUT dibawa sebagai query. Sebelumnya pilihan itu
 * dibuang begitu sheet ditutup: halaman terima kasih tidak tahu paket apa yang
 * diminati, dan user harus memilih ulang dari nol kalau mau lanjut bayar.
 */
export function buildRegisteredHref(email: string, planId?: PlanId | null): string {
  const query = new URLSearchParams({ email: email.trim() })
  if (planId) query.set(REGISTERED_PLAN_PARAM, planId)
  return `${REGISTERED_PATH}?${query.toString()}`
}
export const LANDING_LOGIN_HREF = '/login'

/* ── SEO / META ─────────────────────────────────────────────────────────────
   Dipakai `app/page.tsx` (metadata) supaya judul & deskripsi tidak ditulis dua
   kali. `ogUrl` adalah domain kanon produk. */

/** rentang harga kanon dalam teks — dipakai copy landing supaya angkanya tidak ditulis tangan */
const PRICE_RANGE_LABEL = `${formatIDR(PLANS[0].lifetime)}-${formatIDR(PLANS[PLANS.length - 1].lifetime)}`
export const LANDING_META = {
  title: 'CatetInd — Temen Catat Keuangan Gen-Z Indonesia',
  description: `Aplikasi catatan keuangan untuk Gen-Z first-jobber Indonesia. 4 tap catat transaksi, AI Coach yang gak nge-judge, scan struk otomatis. Mulai ${formatIDR(PLANS[0].lifetime)} sekali bayar — akses selamanya.`,
  ogTitle: 'Kamu udah gajian berapa kali, tapi punya apa?',
  ogDescription: `CatetInd — temen catat keuangan Gen-Z. Mulai ${formatIDR(PLANS[0].lifetime)} untuk akses selamanya.`,
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
      'Midtrans itu payment gateway yang dipakai Tokopedia, Bukalapak, dan Gojek — jadi keamanannya sudah level enterprise. Data kartu/e-wallet kamu diproses langsung oleh Midtrans, bukan oleh kami. Soal refund: garansi uang kembali 100% dalam 30 hari. Tinggal email ke support@catetind.com, dan kami proses dalam 3-5 hari kerja.',
  },
  {
    id: 'data',
    question: 'Dataku bakal aman terus nggak?',
    answer:
      'Data kamu TIDAK PERNAH dihapus. Semua catatan keuangan kamu tetap tersimpan aman dan bisa kamu akses kapan aja. Karena paketnya akses selamanya, nggak ada tanggal berakhir yang bikin fitur mendadak mati. Dan ingat: CatetInd TIDAK pernah menagih diam-diam.',
  },
]

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
  contact: 'support@catetind.com',
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

