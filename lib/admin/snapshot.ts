import { MONTHLY_DAYS, PLANS, planById, rankOf, type PlanId } from '@/lib/data/pricing'
import { localISODate } from '@/lib/time'
import { isSubscriptionActive } from '@/lib/subscription/app-access'
import { normalizeTier } from '@/lib/subscription/plan'
import { paymentStatusGroup } from './filters'
import {
  FREE_PLAN_STATE,
  type AdminAbandonedCheckout,
  type AdminExpiryEntry,
  type AdminExpiryRadar,
  type AdminFeatureAdoption,
  type AdminFunnelStage,
  type AdminMismatch,
  type AdminPaymentSummary,
  type AdminPaymentView,
  type AdminPlanBreakdown,
  type AdminPlanState,
  type AdminPlanTierBreakdown,
  type AdminPurchaseRecord,
  type AdminRevenueBlock,
  type AdminSnapshot,
  type AdminUserRow,
} from './types'

/* ── PERHITUNGAN DASHBOARD ADMIN (MURNI — TANPA JARINGAN) ────────────────────
   Kenapa dipisah dari pengambilan data (`lib/admin/server.ts`): inilah bagian
   yang paling mahal kalau salah — pendapatan, corong aktivasi, deteksi
   ketidakcocokan hak akses. Dengan bentuk MURNI, semuanya bisa dikunci unit
   test tanpa Supabase, dan layar admin hanya menampilkan hasil yang sudah
   dihitung server.

   PRINSIP PRIVASI (dipegang di sini, bukan cuma di teks):
     · `AdminUserRow` hanya memuat HITUNGAN (berapa dompet, berapa transaksi).
       Tidak ada deskripsi, catatan, nama dompet, atau saldo pribadi.
     · Nominal yang muncul hanya nominal PEMBELIAN ke CatetInd (`purchases`),
       karena itu uang masuk ke bisnis — bukan saldo user.
   ────────────────────────────────────────────────────────────────────────── */

const DAY_MS = 86_400_000

/** jumlah hari jendela "akan habis" & "baru habis" di radar paket 30 hari */
export const EXPIRING_SOON_DAYS = 7
export const EXPIRED_RECENTLY_DAYS = 14

/* ── 1. SUMBER DATA & PEMBENTUK BARIS USER ────────────────────────────────── */

/** identitas dari `auth.users` (dibaca server lewat Admin API) */
export interface AdminAuthUser {
  id: string
  email: string
  name: string
  createdAt: string | null
  /** `last_sign_in_at` — penanda "terakhir aktif" yang tersedia tanpa tabel tambahan */
  lastActiveAt: string | null
}

/** keadaan langganan dari `user_subscriptions` (satu baris per user) */
export interface AdminPlanRecord {
  tier: string | null
  period: string | null
  isLifetime: boolean
  isActive: boolean
  startedAt: string | null
  expiresAt: string | null
}

export interface AdminUserSources {
  onboardingUserIds: Iterable<string | null | undefined>
  walletCounts: Map<string, number>
  transactionCounts: Map<string, number>
  aiCaptureUserIds: Iterable<string | null | undefined>
  aiCallsThisMonth: Map<string, number>
  aiBonusTokens: Map<string, number>
  billUserIds: Iterable<string | null | undefined>
  goalUserIds: Iterable<string | null | undefined>
  jointUserIds: Iterable<string | null | undefined>
  wealthUserIds: Iterable<string | null | undefined>
  referralCounts: Map<string, number>
  plans: Map<string, AdminPlanRecord>
}

/** array id (boleh berisi null) → Map jumlah per id, siap dipakai sumber di atas */
export function toCountMap(ids: readonly (string | null | undefined)[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const id of ids) {
    if (!id) continue
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

/** iterable id (boleh berisi null) → Set (untuk sumber yang hanya butuh "pernah/tidak") */
export function toIdSet(ids: Iterable<string | null | undefined>): Set<string> {
  const set = new Set<string>()
  for (const id of ids) if (id) set.add(id)
  return set
}

/** periode efektif: kolom `billing_period` menang, lalu `is_lifetime` */
function periodOf(record: AdminPlanRecord): AdminPlanState['period'] {
  if (record.period === 'monthly' || record.period === 'lifetime') return record.period
  if (record.isLifetime) return 'lifetime'
  return record.tier ? 'monthly' : null
}

/**
 * Keadaan paket satu akun. "Aktif" memakai aturan TUNGGAL aplikasi
 * (`isSubscriptionActive`): `is_active` saja tidak cukup — prabayar yang sudah
 * lewat tanggal tidak boleh dihitung aktif.
 */
export function planStateOf(
  record: AdminPlanRecord | undefined,
  now = Date.now(),
): AdminPlanState {
  if (!record) return FREE_PLAN_STATE
  const isLifetime = record.isLifetime || periodOf(record) === 'lifetime'
  return {
    tier: record.tier,
    planId: normalizeTier(record.tier),
    period: periodOf(record),
    isLifetime,
    isActive: record.isActive,
    active: isSubscriptionActive(
      { is_active: record.isActive, expires_at: record.expiresAt, is_lifetime: isLifetime },
      { now },
    ),
    startedAt: record.startedAt,
    expiresAt: isLifetime ? null : record.expiresAt,
  }
}

/** bangun Direktori User dari identitas + hitungan aktivitas (tanpa isi catatan) */
export function buildAdminUserRows(
  users: readonly AdminAuthUser[],
  sources: AdminUserSources,
  now = Date.now(),
): AdminUserRow[] {
  const onboarding = toIdSet(sources.onboardingUserIds)
  const aiCapture = toIdSet(sources.aiCaptureUserIds)
  const bills = toIdSet(sources.billUserIds)
  const goals = toIdSet(sources.goalUserIds)
  const joint = toIdSet(sources.jointUserIds)
  const wealth = toIdSet(sources.wealthUserIds)

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    lastActiveAt: user.lastActiveAt,
    onboardingCompleted: onboarding.has(user.id),
    walletCount: sources.walletCounts.get(user.id) ?? 0,
    transactionCount: sources.transactionCounts.get(user.id) ?? 0,
    aiCallsThisMonth: sources.aiCallsThisMonth.get(user.id) ?? 0,
    aiBonusTokens: sources.aiBonusTokens.get(user.id) ?? 0,
    hasBills: bills.has(user.id),
    hasGoals: goals.has(user.id),
    hasJointWallet: joint.has(user.id),
    hasWealth: wealth.has(user.id),
    hasAiCapture: aiCapture.has(user.id),
    referralInvites: sources.referralCounts.get(user.id) ?? 0,
    plan: planStateOf(sources.plans.get(user.id), now),
  }))
}

/* ── 2. HELPER WAKTU & UANG ───────────────────────────────────────────────── */

function timeOf(iso: string | null | undefined): number | null {
  if (!iso) return null
  const time = Date.parse(iso)
  return Number.isFinite(time) ? time : null
}

function isSameLocalDay(iso: string | null | undefined, now: Date): boolean {
  const time = timeOf(iso)
  if (time === null) return false
  return localISODate(new Date(time)) === localISODate(now)
}

function roundPercent(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 1000) / 10
}

function roundAverage(total: number, count: number): number {
  if (count <= 0) return 0
  return Math.round(total / count)
}

interface RevenuePeriod {
  today: number
  thisMonth: number
  allTime: number
}

function emptyPeriod(): RevenuePeriod {
  return { today: 0, thisMonth: 0, allTime: 0 }
}

function addToPeriod(
  block: RevenuePeriod,
  amount: number,
  paidAt: string | null | undefined,
  now: Date,
): void {
  const time = timeOf(paidAt)
  if (time === null) return
  const date = new Date(time)
  block.allTime += amount
  if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
    block.thisMonth += amount
  }
  if (localISODate(date) === localISODate(now)) block.today += amount
}

/** true = status yang berarti uang sudah diterima CatetInd */
export function isSettledStatus(status: string | null | undefined): boolean {
  return paymentStatusGroup(status) === 'paid'
}

/** label metode pembayaran dari `payment_type` Midtrans (bukan tebakan kanal) */
export function paymentMethodLabel(raw: string | null | undefined): string {
  const value = (raw ?? '').trim().toLowerCase()
  switch (value) {
    case 'qris':
    case 'other_qris':
      return 'QRIS'
    case 'gopay':
      return 'GoPay'
    case 'shopeepay':
      return 'ShopeePay'
    case 'bank_transfer':
    case 'echannel_va':
      return 'Virtual Account'
    case 'echannel':
      return 'Mandiri Bill'
    case 'cstore':
      return 'Gerai Retail'
    case 'credit_card':
      return 'Kartu Kredit'
    case 'akulaku':
      return 'Akulaku'
    case '':
      return 'Tidak tercatat'
    default:
      return raw ?? 'Tidak tercatat'
  }
}

/* ── 3. PERTUMBUHAN & PENDAPATAN BERSIH ───────────────────────────────────── */

/** akun terdaftar + pendaftar baru hari ini / 7 hari / 30 hari */
export function growthBlock(users: readonly { createdAt: string | null }[], now = new Date()) {
  const nowMs = now.getTime()
  let today = 0
  let last7 = 0
  let last30 = 0
  for (const user of users) {
    const created = timeOf(user.createdAt)
    if (created === null) continue
    if (isSameLocalDay(user.createdAt, now)) today += 1
    if (created >= nowMs - 7 * DAY_MS) last7 += 1
    if (created >= nowMs - 30 * DAY_MS) last30 += 1
  }
  return { total: users.length, today, last7, last30 }
}

/** jumlah user yang terakhir aktif dalam 1 / 7 / 30 hari terakhir */
export function activeUserCounts(users: readonly AdminUserRow[], now = new Date()) {
  const nowMs = now.getTime()
  let daily = 0
  let weekly = 0
  let monthly = 0
  for (const user of users) {
    const active = timeOf(user.lastActiveAt)
    if (active === null) continue
    if (active >= nowMs - DAY_MS) daily += 1
    if (active >= nowMs - 7 * DAY_MS) weekly += 1
    if (active >= nowMs - 30 * DAY_MS) monthly += 1
  }
  return { daily, weekly, monthly }
}

/**
 * Pendapatan BERSIH dari transaksi lunas saja. Baris `pending`, kedaluwarsa,
 * batal, ditolak, dan refund TIDAK dihitung — uangnya tidak diterima CatetInd.
 *
 * Pemisahan paket vs kuota tambahan memakai `purpose`: 'topup' = pembelian kuota
 * AI; selain itu (termasuk baris lama tanpa `purpose`) = pembelian paket.
 */
export function revenueBlock(
  users: readonly AdminUserRow[],
  purchases: readonly AdminPurchaseRecord[],
  now = new Date(),
): AdminRevenueBlock {
  const subscription = emptyPeriod()
  const addon = emptyPeriod()
  const total = emptyPeriod()
  let settledCount = 0

  for (const purchase of purchases) {
    if (!isSettledStatus(purchase.status)) continue
    const amount = Math.max(0, Math.round(purchase.amount || 0))
    const paidAt = purchase.paidAt ?? purchase.createdAt
    const bucket = purchase.purpose === 'topup' ? addon : subscription
    addToPeriod(bucket, amount, paidAt, now)
    addToPeriod(total, amount, paidAt, now)
    settledCount += 1
  }

  const paidUsers = users.filter((user) => user.plan.active && user.plan.planId !== null).length

  return {
    subscription,
    addon,
    total,
    averageTransaction: roundAverage(total.allTime, settledCount),
    settledCount,
    paidAccountPercent: roundPercent(paidUsers, users.length),
    paidUsers,
    totalUsers: users.length,
  }
}

/* ── 4. CORONG AKTIVASI 5 TAHAP ───────────────────────────────────────────── */

/** label tahap — dipakai layar & test supaya urutannya tidak bergeser */
export const FUNNEL_LABELS = {
  registered: 'Daftar Akun',
  onboarded: 'Selesai Onboarding',
  wallet: 'Punya Minimal 1 Dompet',
  transaction: 'Catat Minimal 1 Transaksi',
  paid: 'Menjadi Pelanggan Berbayar',
} as const

/**
 * Corong 5 tahap. `droppedBefore` = berapa orang berhenti tepat SEBELUM tahap
 * itu, sehingga tahap dengan angka terbesar adalah tempat user paling banyak
 * berhenti (itulah yang ditanyakan pemilik produk).
 */
export function activationFunnel(users: readonly AdminUserRow[]): AdminFunnelStage[] {
  const counts = {
    registered: users.length,
    onboarded: users.filter((user) => user.onboardingCompleted).length,
    wallet: users.filter((user) => user.walletCount > 0).length,
    transaction: users.filter((user) => user.transactionCount > 0).length,
    paid: users.filter((user) => user.plan.active && user.plan.planId !== null).length,
  }

  const order: AdminFunnelStage['id'][] = [
    'registered',
    'onboarded',
    'wallet',
    'transaction',
    'paid',
  ]

  return order.map((id, index) => {
    const previous = index === 0 ? counts.registered : counts[order[index - 1]]
    const count = counts[id]
    return {
      id,
      label: FUNNEL_LABELS[id],
      count,
      droppedBefore: index === 0 ? 0 : Math.max(0, previous - count),
      conversionFromPrevious: index === 0 ? 100 : roundPercent(count, previous),
    }
  })
}

/** tahap dengan kebocoran terbanyak; `null` kalau tidak ada yang berhenti */
export function biggestFunnelDrop(stages: readonly AdminFunnelStage[]): AdminFunnelStage | null {
  let biggest: AdminFunnelStage | null = null
  for (const stage of stages) {
    if (stage.id === 'registered') continue
    if (stage.droppedBefore <= 0) continue
    if (!biggest || stage.droppedBefore > biggest.droppedBefore) biggest = stage
  }
  return biggest
}

/* ── 5. PETA PEMAKAIAN FITUR ──────────────────────────────────────────────── */

const FEATURE_DEFINITIONS: {
  id: AdminFeatureAdoption['id']
  label: string
  hint: string
  has: (user: AdminUserRow) => boolean
}[] = [
  { id: 'wallets', label: 'Dompet Kas', hint: 'punya minimal 1 dompet', has: (u) => u.walletCount > 0 },
  {
    id: 'transactions',
    label: 'Catatan Transaksi',
    hint: 'pernah mencatat minimal 1 transaksi',
    has: (u) => u.transactionCount > 0,
  },
  { id: 'bills', label: 'Tagihan Rutin', hint: 'punya tagihan rutin', has: (u) => u.hasBills },
  { id: 'goals', label: 'Celengan / Tabungan', hint: 'punya target nabung', has: (u) => u.hasGoals },
  { id: 'wealth', label: 'Kekayaan & Hutang', hint: 'mencatat aset atau utang', has: (u) => u.hasWealth },
  { id: 'joint', label: 'Dompet Bersama', hint: 'ikut dompet bersama', has: (u) => u.hasJointWallet },
  {
    id: 'ai-capture',
    label: 'Pencatatan AI',
    hint: 'punya catatan hasil AI (teks/struk/suara)',
    has: (u) => u.hasAiCapture || u.aiCallsThisMonth > 0,
  },
  {
    id: 'referral',
    label: 'Ajak Teman / Referral',
    hint: 'pernah mengundang teman',
    has: (u) => u.referralInvites > 0,
  },
]

/** berapa user yang benar-benar memakai tiap fitur utama */
export function featureAdoption(users: readonly AdminUserRow[]): AdminFeatureAdoption[] {
  return FEATURE_DEFINITIONS.map((definition) => {
    const count = users.filter(definition.has).length
    return {
      id: definition.id,
      label: definition.label,
      hint: definition.hint,
      users: count,
      sharePercent: roundPercent(count, users.length),
    }
  })
}

/* ── 6. RINCIAN PAKET & RADAR MASA AKTIF ──────────────────────────────────── */

/**
 * Jumlah user per paket AKTIF — HANYA paket yang benar-benar dijual sistem
 * (`PLANS`: Catet Aja, Waras, Sultan). TIDAK ADA tier "Gratis" yang dikarang:
 * akun tanpa baris langganan dihitung terpisah sebagai `withoutPlan`, dan baris
 * langganan yang tidak lagi memberi akses dihitung sebagai `expired`.
 */
export function planBreakdown(users: readonly AdminUserRow[]): AdminPlanBreakdown {
  const tiers: AdminPlanTierBreakdown[] = PLANS.map((plan) => ({
    planId: plan.id,
    label: plan.name,
    monthly: 0,
    lifetime: 0,
    total: 0,
  }))
  const byPlan = new Map<string, AdminPlanTierBreakdown>()
  for (const tier of tiers) byPlan.set(tier.planId, tier)

  let withoutPlan = 0
  let expired = 0

  for (const user of users) {
    if (user.plan.period === null) {
      withoutPlan += 1
      continue
    }
    if (!user.plan.active || !user.plan.planId) {
      /* Baris ada (is_active/expires_at) tetapi tidak memberi paket yang
         dikenali/berlaku — disebut "langganan tidak aktif", bukan "Gratis". */
      expired += 1
      continue
    }
    const tier = byPlan.get(user.plan.planId)
    if (!tier) {
      expired += 1
      continue
    }
    if (user.plan.period === 'lifetime') tier.lifetime += 1
    else tier.monthly += 1
    tier.total += 1
  }

  return { tiers, withoutPlan, expired, totalAccounts: users.length }
}

/** satu entri radar dari baris user (hanya paket 30 hari yang punya tanggal) */
function expiryEntryOf(user: AdminUserRow, now: number): AdminExpiryEntry | null {
  if (user.plan.isLifetime || user.plan.period !== 'monthly') return null
  const expiresAt = user.plan.expiresAt
  const time = timeOf(expiresAt)
  if (!expiresAt || time === null) return null
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    planId: user.plan.planId,
    planLabel: planById(user.plan.planId)?.name ?? 'Paket',
    expiresAt,
    daysLeft: Math.ceil((time - now) / DAY_MS),
  }
}

/**
 * Radar retensi: paket 30 hari yang akan habis ≤ 7 hari lagi dan yang baru habis
 * ≤ 14 hari lalu. Akses selamanya tidak pernah masuk radar — ia tidak punya
 * tanggal berakhir.
 */
export function expiryRadar(users: readonly AdminUserRow[], now = Date.now()): AdminExpiryRadar {
  const expiringSoon: AdminExpiryEntry[] = []
  const expiredRecently: AdminExpiryEntry[] = []

  for (const user of users) {
    const entry = expiryEntryOf(user, now)
    if (!entry) continue
    if (entry.daysLeft >= 0 && entry.daysLeft <= EXPIRING_SOON_DAYS && user.plan.active) {
      expiringSoon.push(entry)
    }
    if (entry.daysLeft < 0 && entry.daysLeft >= -EXPIRED_RECENTLY_DAYS) {
      expiredRecently.push(entry)
    }
  }

  expiringSoon.sort((a, b) => a.daysLeft - b.daysLeft)
  expiredRecently.sort((a, b) => b.daysLeft - a.daysLeft)
  return { expiringSoon, expiredRecently }
}

/* ── 7. PEMBAYARAN MIDTRANS ───────────────────────────────────────────────── */

/** baris pembayaran siap tampil, terbaru lebih dulu */
export function paymentViews(
  purchases: readonly AdminPurchaseRecord[],
  users: readonly AdminUserRow[],
): AdminPaymentView[] {
  const byId = new Map(users.map((user) => [user.id, user]))
  return purchases
    .map((purchase) => {
      const user = byId.get(purchase.userId)
      return {
        ...purchase,
        email: user?.email ?? '',
        name: user?.name ?? '',
        planId: normalizeTier(purchase.tierName),
        statusGroup: paymentStatusGroup(purchase.status),
        methodLabel: paymentMethodLabel(purchase.paymentMethod),
      }
    })
    .sort((a, b) => {
      const left = timeOf(a.createdAt) ?? 0
      const right = timeOf(b.createdAt) ?? 0
      return right - left
    })
}

/**
 * Ringkasan pembayaran: jumlah per kelompok status + metode mana yang paling
 * banyak dipakai. Metode hanya dihitung dari transaksi LUNAS — transaksi yang
 * tidak pernah dibayar tidak membuktikan preferensi metode siapa pun.
 */
export function paymentSummary(
  purchases: readonly AdminPurchaseRecord[],
): AdminPaymentSummary {
  const counts: AdminPaymentSummary['counts'] = { all: 0, paid: 0, pending: 0, failed: 0 }
  const methods = new Map<string, { method: string; label: string; count: number; amount: number }>()
  let settledCount = 0
  let settledAmount = 0

  for (const purchase of purchases) {
    const group = paymentStatusGroup(purchase.status)
    counts.all += 1
    counts[group] += 1
    if (group !== 'paid') continue

    const amount = Math.max(0, Math.round(purchase.amount || 0))
    settledCount += 1
    settledAmount += amount
    const method = (purchase.paymentMethod ?? '').trim().toLowerCase() || 'tidak-tercatat'
    const entry = methods.get(method) ?? {
      method,
      label: paymentMethodLabel(purchase.paymentMethod),
      count: 0,
      amount: 0,
    }
    entry.count += 1
    entry.amount += amount
    methods.set(method, entry)
  }

  return {
    counts,
    byMethod: [...methods.values()].sort((a, b) => b.count - a.count || b.amount - a.amount),
    settledCount,
    settledAmount,
  }
}

/**
 * Radar checkout menggantung: user yang PERNAH mencoba membeli paket tetapi
 * transaksinya belum lunas (pending) atau sudah mati (kedaluwarsa/batal/ditolak)
 * DAN belum punya paket aktif. Satu baris per user, memakai percobaan terbaru.
 *
 * Top-up token AI tidak dihitung: itu bukan percobaan membeli paket.
 */
export function abandonedCheckouts(
  users: readonly AdminUserRow[],
  purchases: readonly AdminPurchaseRecord[],
): AdminAbandonedCheckout[] {
  const byId = new Map(users.map((user) => [user.id, user]))
  const latest = new Map<string, AdminPurchaseRecord>()

  for (const purchase of purchases) {
    if (purchase.purpose === 'topup') continue
    if (paymentStatusGroup(purchase.status) === 'paid') continue
    const previous = latest.get(purchase.userId)
    const currentTime = timeOf(purchase.createdAt) ?? 0
    const previousTime = previous ? timeOf(previous.createdAt) ?? 0 : -1
    if (!previous || currentTime > previousTime) latest.set(purchase.userId, purchase)
  }

  const rows: AdminAbandonedCheckout[] = []
  for (const [userId, purchase] of latest) {
    const user = byId.get(userId)
    if (!user) continue
    if (user.plan.active && user.plan.planId) continue
    rows.push({
      userId,
      email: user.email,
      name: user.name,
      orderId: purchase.orderId,
      status: purchase.status,
      amount: Math.max(0, Math.round(purchase.amount || 0)),
      createdAt: purchase.createdAt,
      lastAttemptAt: purchase.createdAt,
    })
  }

  return rows.sort((a, b) => (timeOf(b.lastAttemptAt) ?? 0) - (timeOf(a.lastAttemptAt) ?? 0))
}

/* ── 8. DETEKTOR KETIDAKCOCOKAN HAK AKSES ─────────────────────────────────── */

/** hak akses yang SEHARUSNYA dimiliki user berdasarkan pembelian lunasnya */
export interface ExpectedEntitlement {
  planId: PlanId
  /** true = pembayaran akses selamanya */
  lifetime: boolean
  /** akhir jendela 30 hari yang masih berlaku (epoch ms); `null` untuk lifetime */
  usableUntil: number | null
  /** pembelian terakhir yang menjadi dasar (dipakai di layar perbaikan) */
  source: AdminPurchaseRecord
}

/**
 * Hitung hak akses dari SELURUH pembelian lunas, bukan hanya yang terakhir:
 *
 *   · pembayaran `lifetime` → akses selamanya, tier tertinggi yang pernah dibeli;
 *   · pembayaran `monthly`  → hanya dihitung bila jendela 30 harinya MASIH
 *     berlaku. Prabayar yang memang sudah habis 30 hari bukan "salah sinkron" —
 *     itu paket yang memang berakhir, dan mendeteksinya sebagai bug akan
 *     membuat admin memperpanjang akses gratis tanpa alasan.
 *
 * `billing_period` kosong = baris lama; migrasi memperlakukannya sebagai
 * lifetime (lihat `catetind_fulfill_purchase`), jadi di sini pun begitu.
 */
export function expectedEntitlement(
  purchases: readonly AdminPurchaseRecord[],
  now = Date.now(),
): ExpectedEntitlement | null {
  let lifetimeTier: PlanId | null = null
  let lifetimeSource: AdminPurchaseRecord | null = null
  let lifetimeSourceTime = -1
  let monthlyTier: PlanId | null = null
  let monthlySource: AdminPurchaseRecord | null = null
  let monthlySourceTime = -1
  let monthlyUntil = 0

  for (const purchase of purchases) {
    if (purchase.purpose === 'topup') continue
    if (!isSettledStatus(purchase.status)) continue
    const tier = normalizeTier(purchase.tierName)
    if (!tier) continue

    const paidTime = timeOf(purchase.paidAt ?? purchase.createdAt) ?? 0
    if (purchase.billingPeriod === 'monthly') {
      const until = paidTime + MONTHLY_DAYS * DAY_MS
      if (until <= now) continue
      /* tier mengikuti pembelian TERBARU pada jendela yang masih berlaku */
      if (paidTime >= monthlySourceTime) {
        monthlyTier = tier
        monthlySource = purchase
        monthlySourceTime = paidTime
      }
      monthlyUntil = Math.max(monthlyUntil, until)
      continue
    }

    /* lifetime: tier tertinggi yang pernah dibeli; sumber = pembelian terakhir */
    if (!lifetimeTier || rankOf(tier) > rankOf(lifetimeTier)) lifetimeTier = tier
    if (paidTime >= lifetimeSourceTime) {
      lifetimeSource = purchase
      lifetimeSourceTime = paidTime
    }
  }

  if (lifetimeTier && lifetimeSource) {
    return { planId: lifetimeTier, lifetime: true, usableUntil: null, source: lifetimeSource }
  }
  if (monthlyTier && monthlySource) {
    return {
      planId: monthlyTier,
      lifetime: false,
      usableUntil: monthlyUntil,
      source: monthlySource,
    }
  }
  return null
}

function mismatchDetail(
  reason: AdminMismatch['reason'],
  expected: ExpectedEntitlement,
  actual: AdminPlanState,
): string {
  const expectedLabel = planById(expected.planId)?.name ?? 'paket berbayar'
  const actualLabel = planById(actual.planId)?.name ?? 'Tanpa paket'
  switch (reason) {
    case 'no-plan':
      return `Pembayaran lunas untuk ${expectedLabel} tercatat, tetapi akun belum punya baris langganan.`
    case 'inactive':
      return `Paket ${actualLabel} ada di akun, tetapi ditandai tidak aktif padahal pembayarannya lunas.`
    case 'expired':
      return `Masa aktif paket sudah lewat padahal pembayaran ${expectedLabel} sudah lunas.`
    case 'tier':
      return `Pembayaran untuk ${expectedLabel}, tetapi paket aktif tercatat ${actualLabel}.`
    case 'period':
      return 'Pembayaran akses selamanya, tetapi paket di akun masih tercatat 30 hari.'
    default:
      return 'Hak akses tidak cocok dengan pembayaran yang tercatat.'
  }
}

/**
 * Detektor ketidakcocokan: pembayaran SUDAH LUNAS tetapi hak akses di akun
 * belum aktif / belum sesuai. Satu baris per user supaya tombol perbaikan tidak
 * muncul berkali-kali untuk masalah yang sama.
 */
export function detectMismatches(
  users: readonly AdminUserRow[],
  purchases: readonly AdminPurchaseRecord[],
  now = Date.now(),
): AdminMismatch[] {
  const packagesByUser = new Map<string, AdminPurchaseRecord[]>()
  for (const purchase of purchases) {
    if (purchase.purpose === 'topup') continue
    const list = packagesByUser.get(purchase.userId) ?? []
    list.push(purchase)
    packagesByUser.set(purchase.userId, list)
  }

  const mismatches: AdminMismatch[] = []
  for (const user of users) {
    const expected = expectedEntitlement(packagesByUser.get(user.id) ?? [], now)
    if (!expected) continue

    const actual = user.plan
    let reason: AdminMismatch['reason'] | null = null

    if (actual.period === null || actual.planId === null) {
      reason = 'no-plan'
    } else if (!actual.active) {
      const expires = timeOf(actual.expiresAt)
      reason = expires !== null && expires <= now ? 'expired' : 'inactive'
    } else if (expected.lifetime && !actual.isLifetime) {
      reason = 'period'
    } else if (!expected.lifetime && actual.isLifetime) {
      /* Akses selamanya yang aktif TIDAK pernah dianggap "salah" hanya karena
         ada pembelian bulanan yang masih berjalan: yang penting user tidak
         kehilangan hak. (Sebaliknya, menurunkannya ke 30 hari justru merugikan.) */
      reason = null
    } else if (rankOf(actual.planId) < rankOf(expected.planId)) {
      reason = 'tier'
    }

    if (!reason) continue

    mismatches.push({
      userId: user.id,
      email: user.email,
      name: user.name,
      orderId: expected.source.orderId,
      paidAt: expected.source.paidAt ?? expected.source.createdAt,
      purchasedTier: expected.source.tierName,
      purchasedPlanId: expected.planId,
      purchasedPeriod: expected.lifetime ? 'lifetime' : 'monthly',
      actualPlanId: actual.planId,
      actualPeriod: actual.period,
      actualActive: actual.active,
      actualExpiresAt: actual.expiresAt,
      reason,
      detail: mismatchDetail(reason, expected, actual),
    })
  }

  return mismatches.sort((a, b) => (timeOf(b.paidAt) ?? 0) - (timeOf(a.paidAt) ?? 0))
}

/* ── 9. SNAPSHOT LENGKAP ──────────────────────────────────────────────────── */

export interface BuildAdminSnapshotInput {
  users: AdminUserRow[]
  purchases: AdminPurchaseRecord[]
  now?: Date
  /** true = jumlah user menyentuh batas baca server (angka bisa terpotong) */
  usersTruncated?: boolean
}

/** pendaftar baru dihitung dari baris user yang sudah dibentuk (tanpa auth ulang) */
function growthFromRows(users: readonly AdminUserRow[], now: Date) {
  return growthBlock(users, now)
}

/** rakit seluruh angka dashboard dari baris yang sudah dibaca server */
export function buildAdminSnapshot({
  users,
  purchases,
  now = new Date(),
  usersTruncated = false,
}: BuildAdminSnapshotInput): AdminSnapshot {
  const nowMs = now.getTime()
  const stages = activationFunnel(users)
  const active = activeUserCounts(users, now)

  return {
    generatedAt: now.toISOString(),
    growth: {
      users: growthFromRows(users, now),
      activeDaily: active.daily,
      activeWeekly: active.weekly,
      activeMonthly: active.monthly,
      onboardingCompleted: users.filter((user) => user.onboardingCompleted).length,
    },
    revenue: revenueBlock(users, purchases, now),
    funnel: { stages, biggestDrop: biggestFunnelDrop(stages) },
    featureAdoption: featureAdoption(users),
    plans: planBreakdown(users),
    expiryRadar: expiryRadar(users, nowMs),
    users,
    payments: { rows: paymentViews(purchases, users), summary: paymentSummary(purchases) },
    abandoned: abandonedCheckouts(users, purchases),
    mismatches: detectMismatches(users, purchases, nowMs),
    limits: { usersLoaded: users.length, usersTruncated },
  }
}








