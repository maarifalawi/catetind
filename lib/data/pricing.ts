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
  price: 149_000,
  durationLabel: 'Seumur hidup',
  features: [
    'Semua fitur Paket Sultan',
    'Akses seumur hidup — sekali bayar, tanpa perpanjangan',
    'Harga terkunci: nggak ikut naik walau harga publik berubah',
    'Suara kamu diprioritaskan di survei fitur berikutnya',
  ],
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
  stepsNote: 'Cuma segini. Nggak ada langkah verifikasi yang menghadang.',
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
  cta: 'Lanjut ke Pembayaran',
  ctaHint: 'Bayar sekali. Tidak ada tagihan otomatis setelah ini.',
  escapeLabel: 'Nanti aja dulu',
  escapeHint: 'Kamu bisa balik kapan aja — nggak ada yang dikunci.',
  livePriceNote:
    'Demo: harga Founding Member masih statis. Di produksi dibaca real-time dari /api/price.',
} as const

export interface CheckoutStep {
  id: 'data' | 'bayar' | 'app'
  label: string
  hint: string
}

/** ringkasan 3 langkah (PRD 5887) — penurun kecemasan, bukan hiasan */
export const CHECKOUT_STEPS: CheckoutStep[] = [
  { id: 'data', label: 'Data kamu', hint: 'Email & nama panggilan' },
  { id: 'bayar', label: 'Bayar', hint: 'QRIS, e-wallet, atau VA' },
  { id: 'app', label: 'Langsung pakai', hint: 'Onboarding 60 detik' },
]

/* ── KODE REFERRAL DI CHECKOUT (Domain 7D) ──────────────────────────────────
   MOCK: validasi & diskon dihitung di klien. Di produksi kode diverifikasi ke
   server (`POST /api/referral/validate`) supaya diskon tidak bisa dikarang. */

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

