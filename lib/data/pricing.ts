/* ── SATU SUMBER HARGA CatetInd · Domain 5A (monetisasi) & 5E (regulasi) ───────
   PRD 4594–4606 mengkritik kompetitor yang punya 4–5 SKU berbeda untuk produk
   yang sama ("harga gak konsisten/berpromosi terus" — baris 208). Karena itu
   seluruh angka harga app ini hidup HANYA di file ini:

     • components/catetind/checkout-screen.tsx    → pembelian pertama (/checkout)
     • components/catetind/billing-panel.tsx      → paket aktif di Pengaturan
     • components/catetind/annual-plan-modal.tsx  → perpanjangan/upgrade
     • task 14 (modal renewal) diminta membaca file yang sama

   DILARANG menulis nominal paket langsung di JSX. Butuh periode/angka baru?
   Tambahkan di sini — kalau tidak, lahir "daftar harga kedua" (larangan tegas
   di prompt halaman checkout).

   Angka bulanan DITURUNKAN dari harga tahunan lewat satu aturan (bayar tahunan
   = bayar 8 bulan), jadi klaim "hemat X%" selalu cocok dengan angkanya sendiri
   dan tidak bisa jadi janji promosi terpisah.
   ────────────────────────────────────────────────────────────────────────── */

import type { FomoRule } from '@/hooks/use-fomo-counter'
import { formatIDR } from '../weekly-recap'
import { REFERRED_FRIEND_BENEFIT } from './referral'

/** satu pintu impor untuk konsumen harga (pola sama dengan lib/data/bills.ts) */
export { formatIDR }

/* ── PAKET LANGGANAN (3 tier · periode bulanan/tahunan) ───────────────────── */

export type PlanId = 'catet-aja' | 'waras' | 'sultan'

/** periode yang bisa dibeli. `lifetime` hanya untuk paket Founding Member. */
export type BillingPeriod = 'monthly' | 'annual' | 'lifetime'

export interface PlanDefinition {
  id: PlanId
  name: string
  subtitle: string
  /** harga TAHUNAN (365 hari) — satu-satunya angka dasar paket ini */
  annual: number
  /** rincian yang didapat — dipakai kartu modal tahunan & ringkasan checkout */
  features: string[]
  /** badge di atas kartu (hero saja) */
  badge?: string
  /** kartu paling dominan — accent fill + border tebal + glow */
  hero?: boolean
  /** base count + aturan increment FOMO per 3–8 detik (khusus modal tahunan) */
  fomo: FomoRule
}

/** aturan kanon: bayar tahunan ≈ bayar 8 bulan → hemat ≥30% */
const MONTHS_CHARGED_PER_YEAR = 8

/** harga bulanan diturunkan dari harga tahunan (dibulatkan ke ribuan terdekat) */
export function monthlyPrice(plan: PlanDefinition): number {
  return Math.round(plan.annual / MONTHS_CHARGED_PER_YEAR / 1_000) * 1_000
}

/** persen penghematan periode tahunan — DITURUNKAN, bukan angka promosi manual */
export function annualSavingsPct(plan: PlanDefinition): number {
  return Math.round((1 - plan.annual / (monthlyPrice(plan) * 12)) * 100)
}

/**
 * Harga tahunan dipecah ke bulan (dibulatkan ke ribuan KE BAWAH) untuk
 * micro-copy anchoring di kartu modal tahunan. Dibulatkan ke bawah supaya
 * angkanya tidak pernah terasa "lebih murah" dari kenyataan.
 */
export function perMonthAnchor(annual: number): string {
  const perMonth = Math.floor(annual / 12 / 1_000) * 1_000
  return `(Cuma ${formatIDR(perMonth)}/bulan — lebih murah dari segelas es kopi ☕)`
}

export const PLANS: PlanDefinition[] = [
  {
    id: 'catet-aja',
    name: 'Paket Catet Aja',
    subtitle: 'Catat manual, tanpa AI',
    annual: 49_000,
    features: ['Catat pemasukan & pengeluaran', 'Budget & kategori manual', 'Pohon Uang (basic)'],
    /* tier 1: naik stabil +2 */
    fomo: { base: 840, min: 2, max: 2 },
  },
  {
    id: 'waras',
    name: 'Paket Waras',
    subtitle: 'AI yang bantu kamu waras finansial',
    annual: 109_000,
    features: [
      'Semua fitur Paket Catet Aja',
      'AI Coach (chat & saran proaktif)',
      'Scan Struk otomatis (OCR)',
      'Auto-kategorisasi transaksi',
      'Insight & laporan mingguan AI',
      '🎁 Eksklusif: Skin Pot Emas untuk Tanamanmu',
    ],
    /* tier 2 (hero): paling ramai + boleh loncat 3–7 */
    fomo: { base: 2_450, min: 3, max: 7 },
    badge: 'Pilihan Gen-Z 🏆',
    hero: true,
  },
  {
    id: 'sultan',
    name: 'Paket Sultan',
    subtitle: 'Unlimited AI, tanpa batas',
    annual: 199_000,
    features: [
      'Semua fitur Paket Waras',
      'Kuota AI unlimited (tanpa batas)',
      'Priority response AI',
      '🎁 Eksklusif: Skin Pot Emas + Efek Partikel Spesial',
    ],
    /* tier 3: paling premium, volume paling kecil */
    fomo: { base: 420, min: 2, max: 4 },
  },
]

/** paket paling dominan (Waras) — default yang tampil di /checkout */
export const HERO_PLAN: PlanDefinition = PLANS.find((plan) => plan.hero) ?? PLANS[0]
/** tier termurah — dasar hitung selisih upgrade di modal tahunan */
export const CATET_AJA_PLAN: PlanDefinition =
  PLANS.find((plan) => plan.id === 'catet-aja') ?? PLANS[0]

/* ── KATALOG YANG DIJUAL (3 tier × bulanan/tahunan) ──────────────────────────
   `Founding Member` (seumur hidup) TIDAK dijual: satu-satunya produk yang bisa
   ditagih adalah ketiga tier di atas, masing-masing dua periode. Fungsi di bawah
   adalah SATU-SATUNYA sumber "harga sah", dipakai server saat memverifikasi
   nominal (`/api/payment/create`) dan klien saat menautkan ke halaman bayar. */

/** periode yang benar-benar dijual — `lifetime` sengaja tidak ada */
export const SELLABLE_PERIODS: BillingPeriod[] = ['monthly', 'annual']

export function isSellablePeriod(value: unknown): value is BillingPeriod {
  return value === 'monthly' || value === 'annual'
}

/** harga kanon satu penawaran (paket + periode) */
export function offerPrice(plan: PlanDefinition, period: BillingPeriod): number {
  return period === 'annual' ? plan.annual : monthlyPrice(plan)
}

/** `true` = nominal ini sah untuk penawaran itu (harga kanon ATAU versi diskon teman) */
export function isValidOfferAmount(
  plan: PlanDefinition,
  period: BillingPeriod,
  amount: number,
): boolean {
  const base = offerPrice(plan, period)
  return amount === base || amount === applyReferralDiscount(base)
}

/** tautan ke halaman bayar untuk satu penawaran (`kode` = kode teman, opsional) */
export function buildPayHref(planId: PlanId, period: BillingPeriod, code?: string | null): string {
  const query = new URLSearchParams({ plan: planId, period })
  if (code) query.set('kode', code)
  return `/checkout/bayar?${query.toString()}`
}


/* ── BENTUK UNTUK MODAL TAHUNAN (bentuk lama dipertahankan apa adanya) ────────
   Modal tahunan cuma butuh periode tahunan, jadi bentuk datanya tak berubah:
   cukup diturunkan dari PLANS supaya tidak ada dua definisi paket. */

export type AnnualPlanId = PlanId

export interface AnnualPlan {
  id: AnnualPlanId
  name: string
  subtitle: string
  /** harga tahunan (365 hari) */
  price: number
  /** micro-copy anchoring di bawah harga (hero saja) */
  anchor?: string
  features: string[]
  fomo: FomoRule
  badge?: string
  hero?: boolean
}

export const ANNUAL_PLANS: AnnualPlan[] = PLANS.map((plan) => ({
  id: plan.id,
  name: plan.name,
  subtitle: plan.subtitle,
  price: plan.annual,
  anchor: plan.hero ? perMonthAnchor(plan.annual) : undefined,
  features: plan.features,
  fomo: plan.fomo,
  badge: plan.badge,
  hero: plan.hero,
}))

/* ── PAKET SEUMUR HIDUP (Founding Member · PRD 4600) ────────────────────────
   Harga seumur hidup TIDAK dipakai sebagai umpan urgensi: angka di sini adalah
   SNAPSHOT demo. Di produksi angkanya dibaca real-time (`GET /api/price`,
   `cache: 'no-store'`) karena tiap pembelian menaikkannya — lihat catatan di
   app/checkout/page.tsx. Tidak ada countdown atau "sisa slot" palsu di sekitar
   angka ini. */

export interface LifetimePlan {
  id: 'founding-member'
  name: string
  subtitle: string
  /** snapshot harga demo (produksi: dari /api/price) */
  price: number
  /** label durasi, menggantikan sufix periode biasa */
  durationLabel: string
  features: string[]
}

export const FOUNDING_MEMBER: LifetimePlan = {
  id: 'founding-member',
  name: 'Founding Member',
  subtitle: 'Sekali bayar, seumur hidup',
  price: 129_000,
  durationLabel: 'Seumur hidup',
  features: [
    'Semua fitur Paket Sultan',
    'Akses seumur hidup — sekali bayar, tanpa perpanjangan',
    'Harga terkunci: nggak ikut naik walau harga publik berubah',
    'Suara kamu diprioritaskan di survei fitur berikutnya',
  ],
}

/* ── STATE HARGA REAL-TIME (inventaris #3 · PRD 4413–4494) ───────────────────
   Bentuk yang dilayani `GET /api/price` dan dibaca `/checkout`. SUMBER
   KEBENARAN harganya tetap `FOUNDING_MEMBER` di file ini — endpoint cuma
   membungkusnya, dan kalau nanti tabel `pricing_state` hidup, endpoint yang
   membaca tabel itu (checkout tidak pernah menghitung harga sendiri).

   `slotSold`/`slotsLeft`: tanpa pembayaran (Midtrans belum aktif) BELUM ada
   satu pun slot yang benar-benar terjual, jadi angkanya jujur 0 dari kuota.
   Mengarang "sisa slot" palsu adalah persis yang dilarang PRD A10. */

/** kuota slot Founding Member (PRD A2: slot 1–300) */
export const FOUNDING_MEMBER_SLOTS = 300

export interface PriceState {
  /** tier harga aktif; `founding_member` selama belum ada pembayaran */
  tier: string
  /** harga siap tampil (sudah diformat) */
  priceLabel: string
  /** harga sebagai angka — satu-satunya yang dipakai hitung total */
  priceNumber: number
  /** slot yang benar-benar sudah terjual */
  slotSold: number
  /** sisa kuota slot */
  slotsLeft: number
  /** true = dibaca dari tabel `pricing_state` (harga bergerak); false = snapshot statis */
  isDynamic: boolean
}

/**
 * Harga Founding Member apa adanya dari satu sumber statis. Dipakai SSR
 * (first paint tidak kosong) **dan** sebagai fallback `/api/price` saat tabel
 * `pricing_state` belum ada / Supabase belum dikonfigurasi.
 */
export function staticPriceState(): PriceState {
  return {
    tier: 'founding_member',
    priceLabel: formatIDR(FOUNDING_MEMBER.price),
    priceNumber: FOUNDING_MEMBER.price,
    slotSold: 0,
    slotsLeft: FOUNDING_MEMBER_SLOTS,
    isDynamic: false,
  }
}

/* ── LABEL PERIODE ────────────────────────────────────────────────────────── */

export const BILLING_PERIOD_LABEL: Record<BillingPeriod, string> = {
  monthly: '/ bulan',
  annual: '/ tahun',
  lifetime: 'sekali bayar',
}

/** nama pilihan periode di tombol pilih-satu halaman checkout */
export const PERIOD_CHOICE_LABEL: Record<BillingPeriod, string> = {
  monthly: 'Bulanan',
  annual: 'Tahunan',
  lifetime: 'Seumur hidup',
}

/** note kecil di bawah nama periode — `{pct}` diisi kalkulasi penghematan */
export const PERIOD_NOTE: Record<BillingPeriod, string> = {
  monthly: 'Berhenti kapan aja, tanpa ditagih lagi',
  annual: 'Hemat {pct}% dibanding bulanan',
  lifetime: 'Sekali bayar, nggak pernah ditagih lagi',
}

/**
 * Note siap tampil untuk satu periode. Penghematan tidak ditulis manual di
 * copy: dihitung dari harga paketnya, jadi kalau harga berubah klaimnya ikut
 * berubah sendiri (bukan janji promosi terpisah).
 */
export function periodNote(period: BillingPeriod, plan?: PlanDefinition): string {
  if (period === 'annual' && plan) {
    return PERIOD_NOTE.annual.replace('{pct}', String(annualSavingsPct(plan)))
  }
  return PERIOD_NOTE[period]
}

/* ── TRUST BADGE (PRD 4509 & 4585–4587) ─────────────────────────────────────
   Badge ini BUKAN disclaimer — ia selling point. Kalimat utama ditulis persis
   seperti PRD supaya klaimnya tidak melunak di halaman mana pun. */

export const NO_AUTO_RENEW_BADGE = '✅ Tanpa auto-renew paksa — kamu yang pegang kendali.'

export interface TrustBadge {
  id: 'no-auto-renew' | 'data-aman' | 'satu-harga'
  /** judul tebal */
  label: string
  /** penjelasan satu baris — hangat, bukan bahasa legal */
  note: string
}

export const PRICING_TRUST_BADGES: TrustBadge[] = [
  {
    id: 'no-auto-renew',
    label: 'Tanpa auto-renew paksa',
    note: 'Kamu yang pegang kendali kapan mau perpanjang.',
  },
  {
    id: 'data-aman',
    label: 'Data aman selamanya',
    note: 'Meski tidak perpanjang, catatanmu tetap tersimpan.',
  },
  {
    id: 'satu-harga',
    label: '1 harga transparan',
    note: 'Tidak ada hidden fee atau promo yang bikin bingung.',
  },
]

/* ── COPY CHECKOUT (inventaris #3 · PRD 5887–5935) ─────────────────────────
   Semua teks user-facing halaman /checkout tinggal di sini — nol string copy
   di JSX. */

export const CHECKOUT_COPY = {
  eyebrow: 'Checkout',
  title: 'Pembayaran',
  subtitle:
    'Tiga langkah, dua field. Nggak ada password, nggak ada data pribadi lain, dan nggak ada tagihan otomatis yang nyangkut.',
  planSectionTitle: 'Paket yang kamu pilih',
  planSectionNote: 'Harganya sama persis dengan yang ada di Pengaturan → Langganan.',
  periodLegend: 'Pilih periode',
  founderNote: 'Paket seumur hidup dipilih dari periode di atas — sekali bayar, nggak ada perpanjangan.',
  featuresTitle: 'Yang kamu dapat',
  stepsTitle: 'Sisa prosesmu',
  stepsBadge: '3 langkah',
  referralTitle: REFERRED_FRIEND_BENEFIT,
  referralLabel: 'Kode dari teman (opsional)',
  referralPlaceholder: 'Contoh: RINA-X7K',
  referralApply: 'Pakai',
  referralApplied: 'Kode dipakai ✓',
  referralClear: 'Hapus',
  referralInvalid: 'Kode ini nggak ketemu. Cek lagi ya, atau lanjut tanpa kode.',
  referralAppliedNote: 'Diskon sudah masuk ke total di bawah.',
  summaryTitle: 'Ringkasan',
  summaryPlan: 'Paket',
  summaryPeriod: 'Periode',
  summaryDiscount: 'Diskon teman',
  summaryTotal: 'Total bayar',
  cta: 'Daftar & mulai',
  /** PAKET 64: Midtrans di-bypass sprint ini, jadi tidak ada klaim "bayar sekali
   *  di sini" — yang benar-benar terjadi adalah pendaftaran akun tanpa password,
   *  lalu tautan konfirmasi ke email. */
  ctaHint: 'Kami kirim tautan konfirmasi ke emailmu. Tanpa password, tanpa tagihan otomatis.',
  escapeLabel: 'Nanti aja dulu',
  escapeHint: 'Kamu bisa balik kapan aja — nggak ada yang dikunci.',
} as const

/* ── CATATAN HARGA (BUKAN klaim palsu) ──────────────────────────────────────
   Dipilih dari `isDynamic` yang dikembalikan `GET /api/price`. Selama
   pembayaran (Midtrans) belum aktif, tidak ada satu pun pembelian yang
   menggerakkan harga — jadi yang jujur adalah mengatakannya apa adanya
   (PRD A10), bukan menampilkan "harga naik" yang tidak pernah terjadi. */
export const LIVE_PRICE_NOTE = {
  dynamic:
    'Harga Founding Member dibaca real-time — angka terbaru dari pembelian yang sudah masuk.',
  static:
    'Pembayaran (Midtrans) belum aktif, jadi harga Founding Member masih statis. Begitu aktif, angka ini naik sendiri mengikuti pembelian terakhir.',
} as const

export interface CheckoutStep {
  id: 'data' | 'email' | 'app'
  label: string
  hint: string
}

/** ringkasan 3 langkah (PRD 5887) — penurun kecemasan, bukan hiasan */
export const CHECKOUT_STEPS: CheckoutStep[] = [
  { id: 'data', label: 'Data kamu', hint: 'Email & nama panggilan' },
  /* PAKET 64: pembayaran Midtrans di-bypass sprint ini, jadi langkahnya adalah
     konfirmasi email (produksi `mailer_autoconfirm: false`) — bukan "Bayar".
     Mengganti langkahnya, bukan membiarkan klaim lama, adalah bagian dari
     Larangan menampilkan proses yang tidak benar-benar terjadi. */
  { id: 'email', label: 'Konfirmasi email', hint: 'Buka tautan di inboxmu' },
  { id: 'app', label: 'Langsung pakai', hint: 'Onboarding 60 detik' },
]

/* ── KODE REFERRAL DI CHECKOUT (Domain 7D) ──────────────────────────────────
   Bentuk kode diperiksa di klien supaya salah ketik ketahuan cepat; KEBERADAAN
   kodenya diperiksa server ke DATABASE (`POST /api/referral/validate`, paket 64)
   sebelum registrasi difinalkan — jadi diskon tidak bisa dikarang di klien. */

export const REFERRAL_DISCOUNT_PCT = 10

/** kode dianggap valid kalau bentuknya wajar (huruf/angka, maks satu tanda hubung) */
export function isValidReferralCode(code: string): boolean {
  const trimmed = code.trim()
  return trimmed.length >= 4 && /^[A-Za-z0-9]{3,6}-?[A-Za-z0-9]{0,6}$/.test(trimmed)
}

/** potong harga sebesar persen diskon — dibulatkan ke rupiah utuh */
export function applyReferralDiscount(
  amount: number,
  pct: number = REFERRAL_DISCOUNT_PCT,
): number {
  return Math.round(amount * (1 - pct / 100))
}

/* ── SIMULASI PEMBAYARAN (MIDTRANS SNAP) ───────────────────────────────────
   Di produksi: POST /api/payment/subscribe → server bikin `snap_token` →
   `window.snap.pay(snap_token)` membuka popup Snap → webhook Midtrans yang
   menandai akun aktif. Demo ini belum punya billing server, jadi sheet-nya
   menyimulasikan langkah itu APA ADANYA (dan mengatakannya di UI, bukan
   dipura-pura seperti jaringan sungguhan). */

export const PAYMENT_SHEET_COPY = {
  title: 'Bayar paketmu',
  description: 'Semua metode diproses lewat Midtrans. Kami nggak menyimpan nomor kartu apa pun.',
  methodLegend: 'Cara bayar',
  vaHint: 'Nomor Virtual Account muncul setelah kamu tekan Bayar.',
  totalLabel: 'Total bayar',
  payLabel: 'Bayar',
  payingLabel: 'Memproses…',
  successTitle: 'Pembayaran berhasil 🎉',
  successBody:
    'Akun kamu udah aktif. Lanjut kenalan sebentar — 60 detik doang, habis itu langsung bisa catat.',
  successCta: 'Mulai Onboarding',
  successRedirecting: 'Sebentar lagi kamu diarahkan otomatis…',
  mockNote: 'Demo: pembayaran disimulasikan, belum ada transaksi nyata.',
  trustNote: NO_AUTO_RENEW_BADGE,
} as const

/* ── MULAI PEMBAYARAN (ALUR REDIRECT) ─────────────────────────────────────────
   Halaman `/checkout/bayar` menagih SATU produk (Founding Member) lalu
   mengarahkan user ke halaman Snap Midtrans. Teksnya dikumpulkan di sini supaya
   tidak ada kalimat di JSX, sama seperti `PAYMENT_SHEET_COPY`. */

export const PAY_START_COPY = {
  eyebrow: 'Langkah terakhir',
  title: 'Bayar paketmu',
  subtitle:
    'Kamu diarahkan ke halaman pembayaran Midtrans (QRIS, e-wallet, atau Virtual Account). Setelah selesai, kamu dibawa balik ke sini otomatis.',
  planLabel: 'Yang kamu beli',
  totalLabel: 'Total bayar',
  discountLabel: 'Diskon kode teman',
  payLabel: 'Bayar sekarang',
  payingLabel: 'Menyiapkan pembayaran…',
  loginTitle: 'Masuk dulu ya',
  loginBody:
    'Pembayaran butuh akun supaya langganannya tercatat atas namamu. Masuk pakai kode 6 angka dari email.',
  loginCta: 'Buka halaman masuk',
  notConfigured: 'Pembayaran belum bisa dimulai. Coba lagi sebentar ya.',
  failedTitle: 'Pembayaran tidak bisa dimulai',
  retryLabel: 'Coba lagi',
} as const

/* ── SELESAI BAYAR (halaman kembali dari Snap) ───────────────────────────────
   Statusnya DIBACA dari database (`GET /api/subscription`), bukan disimpulkan
   dari query string — user tidak pernah diberi tahu "aktif" sebelum webhook
   Midtrans benar-benar mencatatnya. */

export const PAY_DONE_COPY = {
  eyebrow: 'Pembayaran',
  checkingTitle: 'Lagi cek pembayaranmu…',
  checkingBody: 'Kalau kamu baru selesai bayar, statusnya biasanya masuk dalam beberapa detik.',
  activeTitle: 'Langgananmu aktif 🎉',
  activeBody: 'Semua fitur sudah terbuka. Terima kasih sudah jadi Founding Member.',
  pendingTitle: 'Pembayaran belum tercatat',
  pendingBody:
    'Kalau kamu memilih QRIS/VA, selesaikan dulu pembayarannya. Halaman ini bisa dibuka lagi kapan saja — statusnya masuk otomatis setelah Midtrans mengonfirmasi.',
  failedTitle: 'Pembayarannya belum berhasil',
  failedBody: 'Kamu bisa mencoba lagi — tidak ada yang berkurang, dan catatanmu tetap aman.',
  retryLabel: 'Cek lagi',
  appCta: 'Masuk ke dashboard',
  homeCta: 'Kembali ke checkout',
} as const

