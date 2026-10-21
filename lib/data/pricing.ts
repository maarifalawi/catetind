/* ── SATU SUMBER HARGA & KEMAMPUAN CatetInd (Domain 5A & 5E) ─────────────────
   PRD 4594–4606 mengkritik kompetitor yang punya 4–5 SKU berbeda untuk produk
   yang sama ("harga gak konsisten/berpromosi terus"). Karena itu seluruh angka
   harga, seluruh peta kemampuan, dan seluruh tautan pembelian hidup HANYA di
   file ini:

     • components/catetind/checkout-screen.tsx      → pembelian (/checkout)
     • components/catetind/payment-start-screen.tsx → bayar (/checkout/bayar)
     • components/catetind/upgrade-modal.tsx        → ajakan upgrade dari dalam app
     • components/catetind/billing-panel.tsx        → paket aktif di Pengaturan
     • app/api/payment/charge/route.ts              → verifikasi nominal (server)
     • app/api/ai/* + lib/ai-quota.ts               → kunci kemampuan (server & UI)

   KEPUTUSAN PRODUK YANG MENGIKAT SELURUH FILE INI (akses selamanya):
     1. SATU PERIODE YANG DIJUAL: `lifetime` — sekali bayar untuk akses
        selamanya. Tidak ada paket bulanan, tidak ada auto-renew, dan tidak ada
        token kartu yang disimpan. Nilai `monthly` yang masih ada di tipe/PLANS
        hanya untuk MEMBACA pembelian lama (riwayat & pelanggan warisan).
     2. KUNCI FITUR PER TIER. Pembeli tier bawah tidak mendapat fitur tier atas
        — benar-benar terkunci: server menolak (403), klien menampilkan ajakan
        upgrade. Peta `PLAN_CAPABILITIES` adalah satu-satunya sumbernya.
     3. UPGRADE LIFETIME = bayar SELISIH dari lifetime yang sudah dimiliki.
        Pembelian dari paket lama (monthly) dihitung harga penuh lifetime.
     4. `asBillingPeriod('monthly')` mengembalikan `null`: permintaan periode
        lama ditolak 422 di server, bukan diubah diam-diam menjadi lifetime.

   DILARANG menulis nominal paket langsung di JSX. Butuh angka baru? Tambahkan
   di sini — kalau tidak, lahir "daftar harga kedua" (larangan tegas di prompt
   halaman checkout).
   ────────────────────────────────────────────────────────────────────────── */

import type { PaymentMethodId } from '../payments/methods'
import { formatIDR } from '../weekly-recap'

/** satu pintu impor untuk konsumen harga (pola sama dengan lib/data/bills.ts) */
export { formatIDR }

/* ── PAKET: AKSES SELAMANYA (LIFETIME) ──────────────────────────────────────
   `monthly` di bawah adalah harga WARISAN untuk menampilkan pembelian lama.
   Tidak ada jalur pembelian yang memakainya lagi — lihat `asBillingPeriod`. */

export type PlanId = 'catet-aja' | 'waras' | 'sultan'

/**
 * Periode pembelian.
 *
 * `monthly` HANYA dipertahankan untuk MEMBACA pembelian lama (baris
 * `user_subscriptions`/`purchases` yang sudah terlanjur tercatat). Produk yang
 * DIJUAL sekarang hanya `lifetime`: `asBillingPeriod()` menolak `monthly`, dan
 * semua tautan/checkout default ke `lifetime`. Jadi tipe ini sengaja masih
 * union supaya data warisan tidak kehilangan tipe, bukan karena masih dijual.
 */
export type BillingPeriod = 'monthly' | 'lifetime'

/**
 * validasi query/body mentah → periode yang DIJUAL.
 *
 * `monthly` mengembalikan `null` (bukan `'monthly'`): paket 30 hari sudah tidak
 * dijual, jadi permintaan dengan periode itu harus ditolak pemanggil — bukan
 * diam-diam diubah menjadi lifetime.
 */
export function asBillingPeriod(value: unknown): BillingPeriod | null {
  return value === 'lifetime' ? 'lifetime' : null
}

/** lama paket prabayar LAMA — dipakai cermin SQL & tampilan warisan, bukan dijual */
export const MONTHLY_DAYS = 30

/** label durasi kanon — dipakai ringkasan checkout, kartu paket, dan billing */
export const LIFETIME_LABEL = 'Sekali bayar, akses selamanya'

/** label periode siap tampil di samping nominal (`monthly` = label warisan) */
export const PERIOD_LABEL: Record<BillingPeriod, string> = {
  monthly: 'per 30 hari',
  lifetime: LIFETIME_LABEL,
}

/** badge periode lifetime — satu-satunya periode yang dijual */
export const SEKALI_BAYAR_BADGE = '✅ Sekali bayar — akses selamanya.'

export interface PlanDefinition {
  id: PlanId
  /** 1 = paling dasar. URUTAN INILAH yang menghitung selisih upgrade. */
  rank: 1 | 2 | 3
  name: string
  subtitle: string
  /**
   * Harga paket 30 hari WARISAN (rupiah). Dipakai HANYA untuk menampilkan
   * pembelian lama di panel billing; tidak dijual lagi dan tidak dipakai
   * `priceFor()` untuk transaksi baru.
   */
  monthly: number
  /** harga akses selamanya (rupiah) */
  lifetime: number
  /** rincian yang didapat — dipakai kartu checkout, modal upgrade, & billing */
  features: string[]
  /** badge di atas kartu (hero saja) */
  badge?: string
  /** kartu paling dominan — accent fill + border tebal + glow */
  hero?: boolean
}

export const PLANS: PlanDefinition[] = [
  {
    id: 'catet-aja',
    rank: 1,
    name: 'Paket Catet Aja',
    subtitle: 'Catat manual, tanpa AI',
    monthly: 49_000,
    /* Harga uji coba QRIS Midtrans: sengaja Rp1 supaya checkout sandbox bisa
       diuji ujung-ke-ujung. `monthly` tetap harga WARISAN untuk pembelian lama. */
    lifetime: 1,
    features: [
      'Catat pemasukan & pengeluaran',
      'Budget & kategori manual',
      'Pohon Uang (basic)',
      'Bisa dipakai di web & home screen (PWA)',
    ],
  },
  {
    id: 'waras',
    rank: 2,
    name: 'Paket Waras',
    subtitle: 'AI yang bantu kamu waras finansial',
    monthly: 79_000,
    lifetime: 129_000,
    features: [
      'Semua fitur Paket Catet Aja',
      'AI Coach (chat & saran proaktif)',
      'Scan Struk otomatis (OCR)',
      'Voice input',
      'Auto-kategorisasi transaksi',
      'Insight & laporan mingguan AI',
      'Joint Wallet (dompet bersama)',
      '🎁 Eksklusif: Skin Pot Emas untuk Tanamanmu',
    ],
    badge: 'Pilihan Gen-Z 🏆',
    hero: true,
  },
  {
    id: 'sultan',
    rank: 3,
    name: 'Paket Sultan',
    subtitle: 'Unlimited AI, tanpa batas',
    monthly: 199_000,
    lifetime: 299_000,
    features: [
      'Semua fitur Paket Waras',
      'AI tanpa batas kuota',
      'Priority response AI',
      '🎁 Eksklusif: Skin Pot Emas + Efek Partikel Spesial',
    ],
  },
]

/** paket paling dominan (Waras) — default yang tampil di /checkout */
export const HERO_PLAN: PlanDefinition = PLANS.find((plan) => plan.hero) ?? PLANS[0]

/** paket dari id; `null` kalau id tidak dikenal atau user belum pernah beli */
export function planById(planId: PlanId | string | null | undefined): PlanDefinition | null {
  if (!planId) return null
  return PLANS.find((plan) => plan.id === planId) ?? null
}

/** peringkat paket; `0` = belum punya paket sama sekali */
export function rankOf(planId: PlanId | null | undefined): number {
  return planById(planId)?.rank ?? 0
}

/** true = `plan` setara atau lebih rendah dari paket yang sudah dimiliki */
export function isDowngradeOrSame(plan: PlanDefinition, ownedPlanId?: PlanId | null): boolean {
  return rankOf(ownedPlanId) >= plan.rank
}

/**
 * Konteks harga. Sengaja objek eksplisit (bukan parameter posisi) supaya tidak
 * mungkin tertukar antara "periode" dan "paket yang dimiliki".
 */
export interface PriceContext {
  period: BillingPeriod
  /** paket yang SUDAH dimiliki (dari `user_subscriptions`) */
  ownedPlanId?: PlanId | null
  /** true = paket yang dimiliki adalah lifetime (tidak bisa turun ke monthly) */
  ownedIsLifetime?: boolean
}

/**
 * nominal yang HARUS dibayar user untuk paket `plan` pada periode tertentu.
 *
 *   monthly
 *     · selalu harga monthly penuh — boleh renew, boleh pindah/turun tier;
 *       tidak ada refund sisa hari.
 *     · sudah lifetime → 0 (tidak dijual; server menolak dengan 403).
 *   lifetime
 *     · belum punya lifetime → harga lifetime penuh (termasuk dari monthly).
 *     · sudah lifetime di tier lebih rendah → SELISIH lifetime.
 *     · sudah lifetime di tier sama/lebih tinggi → 0.
 *
 * Angka ini dipakai SERVER sebagai dasar verifikasi nominal kiriman klien, dan
 * dipakai KLIEN sebagai teks CTA. Keduanya memanggil fungsi yang sama.
 */
export function priceFor(plan: PlanDefinition, context: PriceContext): number {
  if (context.period === 'monthly') {
    if (context.ownedIsLifetime) return 0
    return plan.monthly
  }

  const owned = planById(context.ownedPlanId)
  if (!owned || !context.ownedIsLifetime) return plan.lifetime
  if (owned.id === plan.id || owned.rank >= plan.rank) return 0
  return Math.max(0, plan.lifetime - owned.lifetime)
}

/** selisih harga upgrade lifetime antar dua tier (untuk laporan & teks) */
export function upgradeDiff(from: PlanId | null | undefined, to: PlanId | null | undefined): number {
  const target = planById(to)
  if (!target) return 0
  return priceFor(target, {
    period: 'lifetime',
    ownedPlanId: from,
    ownedIsLifetime: Boolean(from),
  })
}

/**
 * Harga kanon satu pembelian. Nama lama dipertahankan supaya route & UI yang
 * sudah memakainya tidak perlu berubah bentuk; parameternya sekarang objek
 * `PriceContext` (periode + paket yang dimiliki).
 */
export function offerPrice(plan: PlanDefinition, context: PriceContext): number {
  return priceFor(plan, context)
}

/**
 * `true` = nominal ini sah.
 *
 * Diskon teman BUKAN sekadar "nominal yang lebih kecil": ia hanya sah kalau
 * pemanggil sudah MEMBUKTIKAN kode referral ke database (`options.referral`).
 * Tanpa bukti itu, harga diskon ditolak — kalau tidak, siapa pun bisa mengirim
 * nominal 90% langsung ke `/api/payment/charge` tanpa kode.
 */
export function isValidOfferAmount(
  plan: PlanDefinition,
  amount: number,
  context: PriceContext,
  options: { referral?: boolean } = {},
): boolean {
  const base = priceFor(plan, context)
  if (amount === base) return true
  return options.referral === true && amount === applyReferralDiscount(base)
}

/* ── KEMAMPUAN (KUNCI FITUR PER TIER) ─────────────────────────────────────────
   "kalau ada orang yang subs paket bawah, fitur-fitur paket atas itu di-lock, jadi
   nanti kalau mau akses harus upgrade ke 129k."

   Kenapa peta, bukan `if` yang disebar: kunci ini harus dibaca SERVER (403 di
   /api/ai/*) DAN klien (badge + ajakan upgrade). Kalau aturannya ditulis ulang
   di dua tempat, cepat atau lambat berbeda — dan yang paling mahal adalah versi
   server yang lebih longgar daripada tampilan. */

export type Capability =
  | 'ai-chat'
  | 'ai-categorize'
  | 'ocr'
  | 'voice'
  | 'ai-report'
  | 'joint-wallet'
  | 'ai-unlimited'
  | 'priority-support'

export const PLAN_CAPABILITIES: Record<PlanId, Capability[]> = {
  /* tier 1 — SENGAJA kosong: catat manual tidak butuh AI sama sekali */
  'catet-aja': [],
  waras: ['ai-chat', 'ai-categorize', 'ocr', 'voice', 'ai-report', 'joint-wallet'],
  /* tier 3 = semuanya, termasuk yang tidak dimiliki tier 2 */
  sultan: [
    'ai-chat',
    'ai-categorize',
    'ocr',
    'voice',
    'ai-report',
    'joint-wallet',
    'ai-unlimited',
    'priority-support',
  ],
}

/** kemampuan yang dimiliki satu paket; belum pernah beli (`null`) = tidak ada */
export function capabilitiesOf(planId: PlanId | null | undefined): Capability[] {
  const plan = planById(planId)
  return plan ? [...PLAN_CAPABILITIES[plan.id]] : []
}

export function canUse(planId: PlanId | null | undefined, capability: Capability): boolean {
  return capabilitiesOf(planId).includes(capability)
}

/** paket TERENDAH yang membuka satu kemampuan — dasar teks "buka dengan paket X" */
export function capabilityUnlockedBy(capability: Capability): PlanDefinition {
  return (
    PLANS.find((plan) => PLAN_CAPABILITIES[plan.id].includes(capability)) ??
    PLANS[PLANS.length - 1]
  )
}

/** semua kemampuan yang dikenal (tanpa duplikat) — dipakai daftar fitur terkunci */
export const ALL_CAPABILITIES: Capability[] = [
  'ai-chat',
  'ai-categorize',
  'ocr',
  'voice',
  'ai-report',
  'joint-wallet',
  'ai-unlimited',
  'priority-support',
]

/** kemampuan yang MASIH terkunci untuk paket ini */
export function lockedCapabilitiesFor(planId: PlanId | null | undefined): Capability[] {
  const owned = capabilitiesOf(planId)
  return ALL_CAPABILITIES.filter((capability) => !owned.includes(capability))
}

/** nama kemampuan dalam bahasa manusia — untuk badge & daftar fitur terkunci */
export const CAPABILITY_LABEL: Record<Capability, string> = {
  'ai-chat': 'AI Coach (chat)',
  'ai-categorize': 'Kategorisasi otomatis',
  ocr: 'Scan struk',
  voice: 'Input suara',
  'ai-report': 'Laporan & rekap AI',
  'joint-wallet': 'Joint Wallet',
  'ai-unlimited': 'AI tanpa batas',
  'priority-support': 'Priority support',
}

/** paket terendah yang membuka kemampuan ini, dalam bentuk label siap tampil */
export function capabilityUnlockLabel(capability: Capability): string {
  return capabilityUnlockedBy(capability).name
}

/** badge `🔒` + nama paket pembuka — satu kalimat, satu sumber */
export function lockedBadgeText(capability: Capability): string {
  return `🔒 ${CAPABILITY_LABEL[capability]} · buka di ${capabilityUnlockLabel(capability)}`
}

/* ── TAUTAN ─────────────────────────────────────────────────────────────────── */

export const CHECKOUT_PATH = '/checkout'
export const PAY_PATH = '/checkout/bayar'

/**
 * Tautan ke halaman BAYAR untuk satu paket + periode (`kode` = kode teman).
 * Default `lifetime` karena itu SATU-SATUNYA periode yang dijual.
 */
export function buildPayHref(
  planId: PlanId,
  period: BillingPeriod = 'lifetime',
  code?: string | null,
): string {
  const query = new URLSearchParams({ plan: planId, period })
  if (code) query.set('kode', code)
  return `${PAY_PATH}?${query.toString()}`
}

/**
 * Tautan ke halaman PILIH PAKET dengan pilihan yang sudah terisi.
 *
 * Dipakai dua alur yang sebelumnya kehilangan konteks begitu user keluar dari
 * `/checkout`: (a) tombol "Masuk" di sheet registrasi & halaman bayar — setelah
 * masuk user harus kembali ke pilihan yang sama, bukan mulai dari paket hero;
 * (b) `/r/<kode>` (tautan referral) yang membawa kode teman.
 */
export function buildCheckoutHref(
  planId?: PlanId | null,
  period: BillingPeriod = 'lifetime',
  code?: string | null,
): string {
  const query = new URLSearchParams({ period })
  if (planId) query.set('plan', planId)
  if (code) query.set('kode', code)
  return `${CHECKOUT_PATH}?${query.toString()}`
}

/**
 * Tautan khusus ajakan UPGRADE dari dalam app.
 *
 * `from` hanya informasi untuk tampilan (mis. kalimat "dari Paket Catet Aja");
 * yang menentukan nominal tetap SERVER dari paket yang tersimpan. Ada penanda
 * `upgrade=1` supaya halaman bayar bisa memakai copy "upgrade" — bukan
 * "pembelian pertama" — tanpa menebak-nebak dari selisih nominal.
 */
export function buildUpgradeHref(
  planId: PlanId,
  from?: PlanId | null,
  period: BillingPeriod = 'lifetime',
): string {
  const query = new URLSearchParams({ plan: planId, period, upgrade: '1' })
  if (from) query.set('dari', from)
  return `${PAY_PATH}?${query.toString()}`
}

/* ── KODE TEMAN (Domain 7D) ────────────────────────────────────────────────── */

export const REFERRAL_DISCOUNT_PCT = 10

/** yang didapat TEMAN saat checkout — sisi lain dari program dua arah */
export const REFERRED_FRIEND_BENEFIT = 'Temanmu dapat diskon 10% saat checkout'

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

/* ── TRUST BADGE (PRD 4509 & 4585–4587) ─────────────────────────────────────
   Badge ini BUKAN disclaimer — ia selling point. Karena produk sekarang hanya
   menjual akses selamanya, badge pertama menegaskan TIDAK ADA tagihan bulanan,
   bukan menjelaskan mekanisme prabayar yang sudah dihapus. */

export interface TrustBadge {
  id: 'tanpa-bulanan' | 'sekali-bayar' | 'data-aman' | 'satu-harga'
  /** judul tebal */
  label: string
  /** penjelasan satu baris — hangat, bukan bahasa legal */
  note: string
}

export const PRICING_TRUST_BADGES: TrustBadge[] = [
  {
    id: 'tanpa-bulanan',
    label: 'Tanpa tagihan bulanan',
    note: 'Sekali bayar, akses selamanya — tidak ada auto-debet.',
  },
  {
    id: 'sekali-bayar',
    label: 'Sekali bayar',
    note: 'Tidak ada perpanjangan otomatis dan tidak ada biaya tersembunyi.',
  },
  {
    id: 'data-aman',
    label: 'Data aman',
    note: 'Catatanmu tetap tersimpan dan bisa diekspor kapan pun.',
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
  planSectionTitle: 'Pilih paketmu',
  planSectionNote: 'Sekali bayar untuk akses selamanya. Tanpa tagihan bulanan.',
  periodLifetimeLabel: 'Lifetime',
  periodLifetimeNote: LIFETIME_LABEL,
  /** label pendek di ringkasan — satu periode, tidak ada toggle lagi */
  periodShortLifetime: 'Akses selamanya',
  /** badge tipe pembayaran di tiap kartu — sama dengan kartu harga landing */
  priceBadge: 'Sekali Bayar',
  /** satuan harga di dalam kartu paket — pendek supaya kartu tidak bertele-tele */
  priceUnitLifetime: '/ selamanya',
  /** catatan pada paket yang sudah dimiliki user (dari sesi) */
  currentPlanNote: 'Ini paketmu sekarang.',
  featuresTitle: 'Yang kamu dapat',
  lockedTitle: 'Masih terkunci di paket ini',
  lockedNote: 'Buka kapan aja lewat halaman paket — harga selalu dari sumber yang sama.',
  referralTitle: REFERRED_FRIEND_BENEFIT,
  referralLabel: 'Kode dari teman (opsional)',
  referralPlaceholder: 'Contoh: RINA-X7K',
  referralApply: 'Pakai',
  referralChecking: 'Memeriksa kode…',
  referralApplied: 'Kode dipakai',
  referralClear: 'Hapus',
  referralInvalid: 'Kode ini nggak ketemu. Cek lagi ya, atau lanjut tanpa kode.',
  referralUnavailable: 'Lagi nggak bisa memeriksa kode teman. Coba lagi sebentar ya.',
  summaryTitle: 'Ringkasan',
  summaryPlan: 'Paket',
  summaryDuration: 'Durasi',
  summaryDiscount: 'Diskon teman',
  summaryTotal: 'Total bayar',
  cta: 'Daftar & mulai',
} as const

/* ── COPY UPGRADE (ajakan dari dalam app) ────────────────────────────────────
   Dipakai `upgrade-modal.tsx` + `subscription-banner.tsx`. Nominalnya SELALU
   diisi dari `priceFor()` oleh pemanggil, bukan ditulis di sini. */

export const UPGRADE_COPY = {
  eyebrow: 'Buka fitur terkunci',
  title: 'Buka fitur lebih banyak',
  diffLabel: 'Yang dibayar sekarang',
  /** `{target}` nama paket, `{full}` harga penuh, `{amount}` yang dibayar sekarang */
  diffNote:
    'Harga penuh {target} adalah {full}. Yang perlu dibayar sekarang {amount} — tanpa prorate dan tanpa biaya tersembunyi.',
  /** teks tombol: `{amount}` dari `priceFor()`, `{target}` nama paket */
  cta: 'Buka dengan upgrade — {amount}',
  topTierTitle: 'Kamu sudah di paket tertinggi 🎉',
  topTierBody: 'Semua fitur CatetInd sudah terbuka untukmu. Nggak ada yang perlu ditambah.',
  noPurchaseTitle: 'Belum ada paket aktif',
  noPurchaseBody:
    'Pilih satu paket untuk membuka fitur CatetInd. Sekali bayar, akses selamanya — tanpa tagihan bulanan.',
  ctaLabel: 'Buka halaman paket',
  closeLabel: 'Tutup panel upgrade',
  /** label tombol "nanti saja" — dipakai modal upgrade & panel terkunci lain */
  laterLabel: 'Nanti aja',
  /** keterangan kecil di bawah CTA */
  note: 'Upgrade lifetime tidak menurunkan akses yang sudah kamu bayar. Tidak ada perpanjangan otomatis.',
} as const

/* ── COPY PANEL BILLING (Pengaturan → Langganan) ─────────────────────────────
   Semua label status/periode/tombol di `billing-panel.tsx`; nominal tetap dari
   `PLANS` + `priceFor()`. */
export const BILLING_COPY = {
  /* Status `monthly` hanya muncul untuk PELANGGAN LAMA yang dulu membeli paket
     30 hari. Tidak ada tombol perpanjang lagi: jalan keluarnya adalah lifetime. */
  statusActiveMonthly: 'Aktif · paket lama 30 hari',
  statusActiveLifetime: 'Aktif · akses selamanya',
  statusExpired: 'Paket lama tidak aktif',
  statusUnknown: 'Status paket belum bisa dibaca',
  noPlan: 'Belum ada paket',
  noPlanBody: 'Pilih paket sekali bayar untuk akses selamanya. Tanpa tagihan bulanan.',
  activeMonthlyBody:
    'Paket lama 30 hari masih aktif sampai tanggal di bawah. Paket bulanan sudah tidak dijual — lifetime tetap bisa dibeli.',
  activeLifetimeBody: 'Akses selamanya. Sekali bayar, tanpa tagihan berkala 🌿',
  expiredBody:
    'Catatanmu tetap aman. Paket lama 30 hari sudah berakhir; lanjutkan dengan akses selamanya.',
  durationLabel: 'Durasi',
  priceLabel: 'Harga paket',
  expiresLabel: 'Aktif sampai',
  periodLabel: 'Periode',
  lifetimePeriod: 'Akses selamanya',
  monthlyPeriod: 'Paket lama 30 hari',
  upgradeLifetimeLabel: 'Upgrade ke Lifetime',
  legacyUpgradeLabel: 'Lanjut ke Lifetime',
  choosePlanLabel: 'Lihat paket',
  noRenewNote: 'Lifetime tidak perlu diperpanjang.',
  readOnlyNote:
    'Paket lama berakhir: data bisa dibaca & diekspor, penambahan data ditahan sampai kamu membeli akses selamanya.',
  historyTitle: 'Riwayat Pembayaran',
  historyBody: 'Semua transaksi kamu tercatat rapi di sini.',
  paidLabel: 'Lunas',
} as const

/* ── COPY UI TERKUNCI ────────────────────────────────────────────────────────
   Dipakai setiap titik yang menampilkan fitur yang belum terbuka di paket user.
   Kalimatnya menyebut SEBAB (paket) dan JALAN KELUAR (upgrade dengan selisih),
   tanpa menyembunyikan tombol atau berpura-pura fiturnya rusak. */

export const LOCKED_FEATURE_COPY = {
  /** label tombol ajakan upgrade pada kartu yang terkunci */
  ctaLabel: 'Buka dengan upgrade',
  /** keterangan saat paket user belum diketahui (mis. belum login) */
  unknownPlanNote: 'Fitur ini aktif di paket berbayar.',
} as const

/* ── COPY HALAMAN BAYAR (DI DALAM APP — CORE API, paket 83) ──────────────────
   Halaman `/checkout/bayar` menagih paket yang dipilih di `/checkout` dan
   menampilkan INSTRUKSI BAYARNYA di sini juga: QRIS, nomor Virtual Account,
   tautan e-wallet, atau kode Mandiri Bill. User tidak pindah ke domain Midtrans,
   jadi tidak ada "halaman baru yang beda". */

/** label + hint tiap metode; kuncinya SAMA dengan katalog `lib/payments/methods.ts` */
export const PAY_METHOD_COPY: Record<PaymentMethodId, { label: string; hint: string }> = {
  qris: { label: 'QRIS', hint: 'Scan dari aplikasi apa pun' },
  'bca-va': { label: 'BCA Virtual Account', hint: 'm-BCA atau ATM' },
  'bri-va': { label: 'BRI Virtual Account', hint: 'BRImo atau ATM' },
  'bni-va': { label: 'BNI Virtual Account', hint: 'BNI Mobile atau ATM' },
  'permata-va': { label: 'Permata Virtual Account', hint: 'PermataMobile atau ATM' },
  gopay: { label: 'GoPay', hint: 'Aplikasi GoPay' },
  shopeepay: { label: 'ShopeePay', hint: 'Aplikasi Shopee' },
  'mandiri-bill': { label: 'Mandiri Bill Payment', hint: 'Livin atau ATM Mandiri' },
}

export const PAY_START_COPY = {
  eyebrow: 'Langkah terakhir',
  title: 'Bayar paketmu',
  subtitle: 'Instruksi bayarnya muncul di halaman ini.',
  /** judul khusus saat user sedang UPGRADE lifetime, bukan pembelian pertama */
  upgradeTitle: 'Bayar selisih upgrade-mu',
  upgradeSubtitle:
    'Kamu cuma menambah selisihnya — akses yang sudah dibeli tetap terpakai.',
  backLabel: 'Ganti paket',
  planLabel: 'Yang kamu beli',
  totalLabel: 'Total',
  discountLabel: 'Diskon teman',
  methodLegend: 'Cara bayar',
  payLabel: 'Bayar sekarang',
  payingLabel: 'Menyiapkan tagihan…',
  loginTitle: 'Masuk dulu ya',
  loginBody: 'Pembayaran tercatat atas namamu. Masuk pakai kode 6 angka dari email.',
  loginCta: 'Buka halaman masuk',
  notConfigured: 'Pembayaran belum bisa dimulai. Coba lagi sebentar ya.',
  failedTitle: 'Pembayaran tidak bisa dimulai',
  retryLabel: 'Coba lagi',
} as const

/* ── KARTU PEMBAYARAN (instruksi yang tampil setelah "Bayar sekarang") ───────
   Semua kalimat kartu: QRIS, VA, e-wallet, Mandiri Bill, hitungan mundur, dan
   jalan keluar saat tagihan kedaluwarsa/gagal (bukan layar buntu). */

export const PAY_CARD_COPY = {
  title: 'Selesaikan pembayaran',
  methodLabel: 'Cara bayar',
  totalLabel: 'Total',
  orderLabel: 'Order',
  countdownLabel: 'Sisa waktu',
  timeUpLabel: 'Habis',
  copyLabel: 'Salin',
  copiedLabel: 'Tersalin',
  qrisScanTitle: 'Scan QR',
  qrAlt: 'Kode QRIS untuk pembayaranmu',
  qrStringLabel: 'Atau tempel kode ini:',
  vaLabel: 'Nomor Virtual Account',
  vaHint: 'Transfer tepat sesuai nominal.',
  billerLabel: 'Kode perusahaan',
  billKeyLabel: 'Kode pembayaran',
  billHint: 'Bayar → Multipayment → masukkan dua kode di atas.',
  ewalletCta: 'Buka aplikasi e-wallet',
  ewalletHint: 'Selesaikan di aplikasi itu, lalu balik ke tab ini.',
  noInstructions: 'Tagihan ini belum punya instruksi yang bisa ditampilkan. Pilih metode lain ya.',
  waitingTitle: 'Menunggu pembayaran',
  waitingBody: 'Statusnya berubah sendiri begitu pembayaran masuk.',
  checkingLabel: 'Cek status…',
  settledTitle: 'Pembayaran diterima',
  settledBody: 'Aksesmu sedang diaktifkan…',
  expiredTitle: 'Tagihan kedaluwarsa',
  expiredBody: 'Tidak ada yang terpotong. Bikin tagihan baru untuk lanjut.',
  failedTitle: 'Tagihan tidak bisa dipakai lagi',
  failedBody: 'Bikin tagihan baru atau pilih metode lain.',
  /* Tagihan dari Midtrans SANDBOX tidak bisa dibayar aplikasi asli (GoPay,
     ShopeePay, m-banking): QR/VA-nya cuma hidup di simulator. Tanpa keterangan
     ini orang wajar mengira akunnya yang bermasalah — dan Midtrans memperingatkan
     QRIS sandbox bisa menunjuk merchant ID production (uang nyata bisa nyasar). */
  sandboxTitle: 'Mode uji (sandbox)',
  sandboxBody:
    'Tagihan ini dibuat di lingkungan uji Midtrans, jadi aplikasi e-wallet atau m-banking asli akan menolaknya. Selesaikan lewat Simulator Midtrans — jangan pakai uang sungguhan.',
  sandboxCta: 'Buka Simulator Midtrans',
  newInvoiceLabel: 'Bikin tagihan baru',
  switchMethodLabel: 'Ganti metode',
  statusLabel: 'Status',
  statusPending: 'Menunggu dibayar',
  statusSettled: 'Dibayar',
  statusExpired: 'Kedaluwarsa',
  statusFailed: 'Gagal',
  statusUnknown: 'Belum tercatat',
} as const

/* ── SELESAI BAYAR ───────────────────────────────────────────────────────────
   Statusnya DIBACA dari database (`GET /api/subscription`), bukan disimpulkan
   dari query string — user tidak pernah diberi tahu "aktif" sebelum webhook
   Midtrans benar-benar mencatatnya. */

export const PAY_DONE_COPY = {
  eyebrow: 'Pembayaran',
  checkingTitle: 'Lagi cek pembayaranmu…',
  checkingBody: 'Biasanya masuk dalam beberapa detik.',
  activeTitle: 'Aksesmu aktif 🎉',
  activeBodyMonthly: 'Paket lamamu aktif kembali.',
  activeBodyLifetime: 'Semua fitur sudah terbuka. Selamanya.',
  pendingTitle: 'Pembayaran belum tercatat',
  pendingBody:
    'Kalau kamu sudah bayar, kami cocokkan otomatis ke Midtrans. Halaman ini update sendiri — tidak perlu bayar ulang.',
  failedTitle: 'Pembayarannya belum berhasil',
  failedBody: 'Coba lagi ya — catatanmu tetap aman.',
  orderLabel: 'Order',
  retryLabel: 'Cek lagi',
  /** label saat tombol “Cek lagi” sedang mencocokkan ke Midtrans */
  retryChecking: 'Mencocokkan…',
  /** keterangan setelah pemeriksaan manual yang belum menemukan pembayaran */
  stillPendingNote:
    'Midtrans belum melaporkan pembayaran untuk order ini. Kalau kamu baru saja membayar, tunggu sebentar lalu tekan Cek lagi — tidak perlu membayar ulang.',
  /** keterangan di bawah CTA saat akses sudah aktif */
  autoRedirectNote: 'Membuka dashboard…',
  appCta: 'Masuk ke dashboard',
  homeCta: 'Kembali ke checkout',
} as const
