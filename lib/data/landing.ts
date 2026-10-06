/* ── LANDING PAGE PUBLIK (/) — copy, seed, & logika MURNI ────────────────────
   Halaman pemasaran di ROOT. Sama seperti `lib/data/welcome.ts`, `auth.ts`, dan
   `pricing.ts`: file ini murni (TANPA React) supaya komponen section nol string
   user-facing, dan seluruh perhitungan (pain calculator & wealth gap) bisa
   diuji tanpa DOM.

   Dua catatan yang mengikat isi file ini:
     1. ANGKA PAIN CALCULATOR & WEALTH GAP dihitung dari fungsi murni di sini
        (`computePain`, `buildWealthGap`) — bukan ditulis tangan di JSX, supaya
        angka yang user lihat tidak pernah "beda cerita" dengan rumusnya.
     2. HARGA TIER LANDING (`LANDING_TIERS`) adalah SKU sekali-bayar/seumur hidup
        versi halaman pemasaran — sengaja terpisah dari `PLANS` di pricing.ts
        (SKU langganan tahunan/bulanan). Nominalnya tetap HANYA hidup di file
        data ini; tidak ada harga yang ditulis di dalam JSX.
   ────────────────────────────────────────────────────────────────────────── */

import { formatIDR } from './pricing'

/** satu pintu impor untuk konsumen harga landing */
export { formatIDR }

/* ── RUTE ─────────────────────────────────────────────────────────────────── */
export const LANDING_PATH = '/'
export const REGISTERED_PATH = '/registered'
export const LANDING_LOGIN_HREF = '/login'

/* ── SEO / META ─────────────────────────────────────────────────────────────
   Dipakai `app/page.tsx` (metadata) supaya judul & deskripsi tidak ditulis dua
   kali. `ogUrl` adalah domain kanon produk. */
export const LANDING_META = {
  title: 'CatetInd — Temen Catat Keuangan Gen-Z Indonesia',
  description:
    'Aplikasi catatan keuangan untuk Gen-Z first-jobber Indonesia. 4 tap catat transaksi, AI Coach yang gak nge-judge, scan struk otomatis. Dari Rp99.000 seumur hidup.',
  ogTitle: 'Kamu udah gajian berapa kali, tapi punya apa?',
  ogDescription: 'CatetInd — temen catat keuangan Gen-Z. Dari Rp99.000 seumur hidup.',
  ogUrl: 'https://catetind.com',
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

/** mockup HUD jatah harian di hero — ILUSTRASI antarmuka, bukan data nyata */
export const HERO_HUD = {
  eyebrow: 'Jatah harian',
  amount: 'Rp 165.000',
  note: 'Aman 3 hari berturut-turut 🌿',
  /** 0..1 — panjang bar progres */
  progress: 0.62,
  plantLabel: 'Tanamanmu lagi tumbuh',
} as const

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
  /** nominal paket yang dibeli (rupiah) */
  price: number
  /** waktu relatif yang sudah diformat — statis supaya bebas hydration mismatch */
  time: string
}

export const LIVE_FEED_SEED: LiveFeedEntry[] = [
  { id: 'rina', name: 'Rina', city: 'Jakarta', price: 119_000, time: '12 menit lalu' },
  { id: 'budi', name: 'Budi', city: 'Bandung', price: 99_000, time: '34 menit lalu' },
  { id: 'sari', name: 'Sari', city: 'Surabaya', price: 119_000, time: '1 jam lalu' },
  { id: 'dimas', name: 'Dimas', city: 'Jakarta', price: 299_000, time: '2 jam lalu' },
  { id: 'amel', name: 'Amel', city: 'Yogyakarta', price: 119_000, time: '3 jam lalu' },
  { id: 'fajar', name: 'Fajar', city: 'Malang', price: 99_000, time: '5 jam lalu' },
  { id: 'nadia', name: 'Nadia', city: 'Depok', price: 119_000, time: '8 jam lalu' },
  { id: 'rizky', name: 'Rizky', city: 'Semarang', price: 299_000, time: '1 hari lalu' },
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
   SKU landing = sekali bayar, seumur hidup. Tiap kartu punya CTA yang membuka
   sheet pendaftaran (`LeadSheet`). Nominal HANYA hidup di sini. */
export type LandingTierId = 'catet-aja' | 'waras' | 'sultan'

export interface LandingTierFeature {
  label: string
  included: boolean
}

export interface LandingTier {
  id: LandingTierId
  name: string
  /** harga sekali bayar (rupiah) */
  price: number
  periodLabel: string
  tagline: string
  badge?: string
  /** kartu yang ditonjolkan sebagai rekomendasi */
  recommended?: boolean
  ctaLabel: string
  features: LandingTierFeature[]
}

export const LANDING_TIERS: LandingTier[] = [
  {
    id: 'catet-aja',
    name: 'Paket Catet Aja',
    price: 99_000,
    periodLabel: 'Sekali bayar, seumur hidup',
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
    ],
  },
  {
    id: 'waras',
    name: 'Paket Waras',
    price: 119_000,
    periodLabel: 'Sekali bayar, seumur hidup',
    tagline: 'Paling pas buat first-jobber yang mau dibantu AI.',
    badge: '⭐ Paling Dipilih',
    recommended: true,
    ctaLabel: 'Pilih Paket Waras',
    features: [
      { label: 'Semua fitur Paket Catet Aja', included: true },
      { label: 'AI Coach (Minca) — kuota terbatas per bulan', included: true },
      { label: 'Scan struk otomatis (OCR)', included: true },
      { label: 'Voice input', included: true },
      { label: 'Laporan AI mingguan & bulanan', included: true },
      { label: 'Joint Wallet (Dompet Bersama)', included: true },
    ],
  },
  {
    id: 'sultan',
    name: 'Paket Sultan',
    price: 299_000,
    periodLabel: 'Sekali bayar, seumur hidup',
    tagline: 'AI tanpa batas buat yang mau serius.',
    ctaLabel: 'Pilih Paket Sultan',
    features: [
      { label: 'Semua fitur Paket Waras', included: true },
      { label: 'AI Coach UNLIMITED (tanpa batas kuota)', included: true },
      { label: 'Prioritas support', included: true },
    ],
  },
]

/** dipakai Sticky CTA bar — SATU sumber dengan kartu (tidak diketik ulang) */
export const RECOMMENDED_TIER: LandingTier =
  LANDING_TIERS.find((tier) => tier.recommended) ?? LANDING_TIERS[0]

export const PRICING_COPY = {
  eyebrow: 'Harga jujur',
  title: 'Bayar sekali. Pakai seumur hidup.',
  subtitle:
    'Nol langganan bulanan, nol auto-renew paksa. Semua paket sekali bayar dan langsung dapat semua fitur di tier-nya.',
} as const

export interface TrustBadge {
  emoji: string
  text: string
}

export const PRICING_TRUST_BADGES: TrustBadge[] = [
  { emoji: '💰', text: 'Gak cocok? Uang kembali 100% dalam 30 hari. Tanpa drama.' },
  { emoji: '🔒', text: 'Pembayaran aman via Midtrans' },
  { emoji: '✅', text: 'Tanpa auto-renew paksa' },
]

/** Sticky CTA bar (muncul setelah Section 5 terlewat). */
export const STICKY_CTA_COPY = {
  ctaLabel: 'Daftar Sekarang',
  period: 'seumur hidup',
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
      "Dari Pain Calculator tadi, rata-rata first-jobber 'kehilangan' Rp1.5 juta per bulan tanpa tracking. Rp99.000-299.000 itu kurang dari 20% uang yang biasa kamu buang dalam 1 bulan. Dan itu SEUMUR HIDUP — bukan langganan bulanan. Kalau CatetInd bantu kamu hemat Rp200.000 saja di bulan pertama, kamu sudah balik modal.",
  },
  {
    id: 'beda-paket',
    question: 'Bedanya Paket Catet Aja, Waras, dan Sultan apa?',
    answer:
      'Simpel: Paket Catet Aja (Rp99.000) = catat manual tanpa AI. Paket Waras (Rp119.000) = semua fitur termasuk AI Coach, scan struk, dan voice input dengan kuota bulanan. Paket Sultan (Rp299.000) = sama seperti Waras tapi AI-nya unlimited tanpa batas kuota. Semua sekali bayar, seumur hidup.',
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
    question: 'Kalau gak perpanjang, data gue gimana?',
    answer:
      'Data kamu TIDAK PERNAH dihapus. Semua catatan keuangan kamu tetap tersimpan aman dan bisa kamu akses kapan aja. Mau balik lagi 6 bulan kemudian? Semua masih ada. Dan ingat: CatetInd TIDAK pernah auto-charge.',
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
  body: (email: string) =>
    `Pembayaran akan dibuka segera. Kami akan kirim email ke ${email} saat sudah siap.`,
  bodyFallback:
    'Pembayaran akan dibuka segera. Kami akan kirim email ke alamatmu saat sudah siap.',
  cta: 'Kembali ke Beranda',
  nextStepsTitle: 'Sambil menunggu, siapkan ini',
  nextSteps: [
    'Unduh aplikasi ke home screen (opsional, biar gampang dibuka)',
    'Siapkan estimasi gaji bulananmu',
    'Catat 3 pengeluaran terakhir yang paling kamu sesali',
  ],
} as const

