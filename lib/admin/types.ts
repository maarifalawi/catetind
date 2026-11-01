import type { PlanId } from '@/lib/data/pricing'

/* ── BENTUK DATA DASHBOARD ADMIN (satu sumber untuk server & layar) ──────────
   Semua tipe di sini adalah data YANG BOLEH DILIHAT admin. Karena itu bentuknya
   sengaja hanya berisi:

     · identitas akun (email, nama, tanggal daftar, terakhir aktif),
     · HITUNGAN aktivitas (berapa dompet, berapa transaksi) — bukan isinya,
     · keadaan paket & pemakaian kuota AI,
     · baris pembelian/pembayaran (uang yang masuk ke CatetInd, bukan nominal
       saldo pribadi user).

   ⚠️ PRINSIP PRIVASI CATETIND: TIDAK ADA tipe di file ini yang boleh memuat
   deskripsi transaksi, catatan, nama dompet, atau saldo user. Kalau nanti ada
   yang butuh, jangan tambahkan di sini — dashboard ini bukan alat mengintip
   catatan pribadi orang.
   ────────────────────────────────────────────────────────────────────────── */

/** periode langganan yang tersimpan di `user_subscriptions.billing_period` */
export type AdminBillingPeriod = 'monthly' | 'lifetime'

/** keadaan paket satu akun (hasil pembacaan `user_subscriptions`) */
export interface AdminPlanState {
  /** nilai mentah `tier_name` (bisa nilai warisan seperti `founding_member`) */
  tier: string | null
  /** paket hasil normalisasi; `null` = belum pernah punya paket dikenali */
  planId: PlanId | null
  /** periode tercatat; `null` = baris belum ada */
  period: AdminBillingPeriod | null
  /** true = akses selamanya (tanpa tanggal berakhir) */
  isLifetime: boolean
  /** nilai kolom `is_active` apa adanya */
  isActive: boolean
  /** true = benar-benar boleh dipakai sekarang (aktif + masa aktif belum lewat) */
  active: boolean
  startedAt: string | null
  expiresAt: string | null
}

/** paket kosong = belum pernah membeli */
export const FREE_PLAN_STATE: AdminPlanState = Object.freeze({
  tier: null,
  planId: null,
  period: null,
  isLifetime: false,
  isActive: false,
  active: false,
  startedAt: null,
  expiresAt: null,
})

/** satu baris Direktori User — HANYA identitas + hitungan (tanpa isi catatan) */
export interface AdminUserRow {
  id: string
  email: string
  name: string
  /** kapan akun dibuat (ISO) */
  createdAt: string | null
  /** kapan terakhir masuk (ISO); dipakai sebagai penanda "terakhir aktif" */
  lastActiveAt: string | null
  onboardingCompleted: boolean
  walletCount: number
  transactionCount: number
  /** pemakaian AI bulan berjalan (jumlah panggilan) */
  aiCallsThisMonth: number
  /** saldo token bonus/add-on yang pernah diberikan (jumlah token) */
  aiBonusTokens: number
  hasBills: boolean
  hasGoals: boolean
  hasJointWallet: boolean
  hasWealth: boolean
  /** ada catatan yang dibuat lewat AI (parse teks/struk/suara) */
  hasAiCapture: boolean
  /** jumlah teman yang diundang lewat kode referral */
  referralInvites: number
  plan: AdminPlanState
}

/** satu baris `purchases` yang sudah dinormalkan untuk dashboard */
export interface AdminPurchaseRecord {
  orderId: string
  userId: string
  /** status mentah Midtrans/DB: pending, settlement, capture, expire, cancel, deny, refund */
  status: string
  /** nominal yang benar-benar dibayar (rupiah utuh) */
  amount: number
  /** `payment_type` Midtrans (qris, gopay, bank_transfer, echannel, …) */
  paymentMethod: string | null
  /** subscribe | upgrade | renew | topup | null (baris lama) */
  purpose: string | null
  tierName: string | null
  billingPeriod: string | null
  createdAt: string | null
  paidAt: string | null
}

/** kelompok status yang dipakai filter & ringkasan pembayaran */
export type AdminPaymentStatusGroup = 'paid' | 'pending' | 'failed'

export interface AdminPaymentView extends AdminPurchaseRecord {
  email: string
  name: string
  planId: PlanId | null
  statusGroup: AdminPaymentStatusGroup
  methodLabel: string
}

/** filter Direktori User (chip di layar) */
export type AdminUserFilterId =
  | 'all'
  | 'paid'
  | 'free'
  | 'onboarding-pending'
  | 'no-transactions'
  | 'expiring-soon'

export interface AdminMetricBlock {
  total: number
  today: number
  last7: number
  last30: number
}

export interface AdminRevenueBlock {
  /** pendapatan dari pembelian paket langganan */
  subscription: { today: number; thisMonth: number; allTime: number }
  /** pendapatan dari pembelian kuota tambahan AI (purpose = 'topup') */
  addon: { today: number; thisMonth: number; allTime: number }
  /** total uang masuk (paket + kuota tambahan) */
  total: { today: number; thisMonth: number; allTime: number }
  /** rata-rata nilai satu transaksi lunas (sepanjang waktu) */
  averageTransaction: number
  /** jumlah transaksi lunas */
  settledCount: number
  /** persentase akun berbayar dari seluruh akun terdaftar (0–100, satu desimal) */
  paidAccountPercent: number
  /** jumlah user yang punya paket aktif */
  paidUsers: number
  /** jumlah akun terdaftar */
  totalUsers: number
}

export interface AdminFunnelStage {
  id: 'registered' | 'onboarded' | 'wallet' | 'transaction' | 'paid'
  label: string
  count: number
  /** berapa orang berhenti tepat SEBELUM tahap ini (0 untuk tahap pertama) */
  droppedBefore: number
  /** persentase user yang lanjut dari tahap sebelumnya (0–100) */
  conversionFromPrevious: number
}

export interface AdminFeatureAdoption {
  id:
    | 'wallets'
    | 'transactions'
    | 'bills'
    | 'goals'
    | 'wealth'
    | 'joint'
    | 'ai-capture'
    | 'referral'
  label: string
  hint: string
  users: number
  /** persentase dari seluruh akun terdaftar (0–100, satu desimal) */
  sharePercent: number
}

export interface AdminPlanTierBreakdown {
  /** paket berbayar yang benar-benar ada di sistem (PLANS) */
  planId: PlanId
  label: string
  /** jumlah user aktif di paket ini, dipisah periode */
  monthly: number
  lifetime: number
  total: number
}

export interface AdminPlanBreakdown {
  /** HANYA tiga paket berbayar — sistem ini tidak punya paket "Gratis" */
  tiers: AdminPlanTierBreakdown[]
  /** akun tanpa baris langganan sama sekali (belum pernah membeli) */
  withoutPlan: number
  /** baris langganan ada tetapi tidak memberi akses lagi (habis / tak dikenali) */
  expired: number
  /** jumlah akun terdaftar — penyebut persentase di layar */
  totalAccounts: number
}

/** satu baris radar masa aktif (paket 30 hari) */
export interface AdminExpiryEntry {
  userId: string
  email: string
  name: string
  planId: PlanId | null
  planLabel: string
  expiresAt: string
  /** positif = sisa hari, negatif = sudah lewat berapa hari */
  daysLeft: number
}

export interface AdminExpiryRadar {
  /** masa aktif berakhir dalam 7 hari ke depan */
  expiringSoon: AdminExpiryEntry[]
  /** baru habis dalam 14 hari terakhir */
  expiredRecently: AdminExpiryEntry[]
}

/** checkout menggantung: pernah mencoba membeli, belum lunas, belum punya paket aktif */
export interface AdminAbandonedCheckout {
  userId: string
  email: string
  name: string
  orderId: string
  status: string
  amount: number
  createdAt: string | null
  lastAttemptAt: string | null
}

/** satu ketidakcocokan antara pembayaran lunas dan hak akses di akun */
export interface AdminMismatch {
  userId: string
  email: string
  name: string
  /** order pembelian yang menjadi dasar pemeriksaan */
  orderId: string
  paidAt: string | null
  purchasedTier: string | null
  purchasedPlanId: PlanId | null
  purchasedPeriod: AdminBillingPeriod | null
  actualPlanId: PlanId | null
  actualPeriod: AdminBillingPeriod | null
  actualActive: boolean
  actualExpiresAt: string | null
  reason: 'no-plan' | 'inactive' | 'expired' | 'tier' | 'period'
  /** kalimat siap tampil yang menjelaskan selisihnya */
  detail: string
}

export interface AdminPaymentSummary {
  counts: Record<AdminPaymentStatusGroup | 'all', number>
  /** metode pembayaran terbanyak dipakai (hanya transaksi lunas), urut turun */
  byMethod: { method: string; label: string; count: number; amount: number }[]
  /** transaksi lunas & nominalnya */
  settledCount: number
  settledAmount: number
}

export interface AdminSnapshot {
  /** waktu snapshot dibuat (ISO) */
  generatedAt: string
  growth: {
    users: AdminMetricBlock
    activeDaily: number
    activeWeekly: number
    activeMonthly: number
    onboardingCompleted: number
  }
  revenue: AdminRevenueBlock
  funnel: {
    stages: AdminFunnelStage[]
    /** tahap dengan kebocoran terbanyak; `null` kalau semua user lanjut */
    biggestDrop: AdminFunnelStage | null
  }
  featureAdoption: AdminFeatureAdoption[]
  plans: AdminPlanBreakdown
  expiryRadar: AdminExpiryRadar
  users: AdminUserRow[]
  payments: {
    rows: AdminPaymentView[]
    summary: AdminPaymentSummary
  }
  abandoned: AdminAbandonedCheckout[]
  mismatches: AdminMismatch[]
  /** batas baris yang dibaca server (disebut apa adanya di layar) */
  limits: {
    usersLoaded: number
    /** true = jumlah user menyentuh batas baca; angka bisa terpotong */
    usersTruncated: boolean
  }
}

/* ── AKSI MANUAL ADMIN ────────────────────────────────────────────────────── */

export type AdminAction =
  | { action: 'set-plan'; userId: string; planId: PlanId; period: AdminBillingPeriod }
  | { action: 'extend-plan'; userId: string; days: number }
  | { action: 'ai-bonus'; userId: string; tokens: number }
  | { action: 'ai-reset'; userId: string }
  | { action: 'repair-plan'; userId: string }

export interface AdminActionResult {
  ok: boolean
  message: string
  /** ringkasan perubahan yang benar-benar ditulis (untuk log & layar) */
  changes?: Record<string, unknown>
}

