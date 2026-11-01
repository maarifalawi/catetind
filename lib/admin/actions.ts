import { MONTHLY_DAYS, PLANS, type PlanId } from '@/lib/data/pricing'
import type { ExpectedEntitlement } from './snapshot'
import type { AdminAction, AdminBillingPeriod, AdminPlanState } from './types'

/* ── AKSI MANUAL ADMIN: VALIDASI & PERHITUNGAN (MURNI) ──────────────────────
   Founder tools mengubah data user secara langsung (paket, masa aktif, kuota
   AI). Karena itu setiap masukan divalidasi SEBELUM menyentuh database, dan
   hasil perubahannya dihitung di fungsi murni yang bisa diuji:

     · `parseAdminAction()`     → bentuk request yang sah / pesan penolakan;
     · `planOverridePatch()`    → kolom `user_subscriptions` untuk paket manual;
     · `extendPlanPatch()`      → perpanjangan menumpuk dari sisa masa aktif;
     · `repairPatch()`          → sinkronisasi dari pembelian yang sudah lunas;
     · `aiBonusTokens()`        → batas wajar bonus token.

   Penulisan ke database TIDAK ada di sini — itu `lib/admin/server.ts`, dan
   hanya boleh dipanggil setelah `lib/admin/guard.ts` memverifikasi admin.
   ────────────────────────────────────────────────────────────────────────── */

const PLAN_IDS: PlanId[] = PLANS.map((plan) => plan.id)

/** batas perpanjangan manual sekali klik (hari) */
export const MIN_EXTEND_DAYS = 1
export const MAX_EXTEND_DAYS = 365

/** batas bonus token AI sekali beri (mencegah salah ketik angka berlebih) */
export const MAX_AI_BONUS_TOKENS = 5_000_000

export const ADMIN_ACTION_ERRORS = {
  invalid: 'Perintah admin tidak dikenali.',
  user: 'Akun tujuan tidak valid.',
  plan: 'Paket harus salah satu dari Catet Aja, Waras, atau Sultan.',
  period: 'Periode harus 30 hari (monthly) atau selamanya (lifetime).',
  days: `Perpanjangan harus ${MIN_EXTEND_DAYS}–${MAX_EXTEND_DAYS} hari.`,
  tokens: `Bonus token harus 1–${MAX_AI_BONUS_TOKENS.toLocaleString('id-ID')}.`,
  noPlan: 'Akun ini belum punya paket. Berikan paket dulu sebelum memperpanjang.',
  lifetime: 'Paket ini sudah akses selamanya — tidak ada masa aktif untuk diperpanjang.',
} as const

export type ParsedAdminAction =
  | { ok: true; action: AdminAction }
  | { ok: false; error: string }

function readUserId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const id = value.trim()
  /* UUID panjangnya 36; batas ini longgar tetapi menolak string kosong/raksasa */
  return id.length >= 8 && id.length <= 64 ? id : null
}

function readPlanId(value: unknown): PlanId | null {
  return typeof value === 'string' && (PLAN_IDS as string[]).includes(value)
    ? (value as PlanId)
    : null
}

function readPeriod(value: unknown): AdminBillingPeriod | null {
  return value === 'monthly' || value === 'lifetime' ? value : null
}

function readInteger(value: unknown, min: number, max: number): number | null {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return null
  const rounded = Math.round(parsed)
  return rounded >= min && rounded <= max && rounded === parsed ? rounded : null
}

/**
 * Validasi badan request `POST /api/admin/action`.
 *
 * Sengaja menerima `unknown`: route handler tidak boleh mempercayai bentuk apa
 * pun dari browser. Semua nilai dinormalkan di sini, jadi tidak ada route yang
 * meneruskan `req.body` mentah ke database.
 */
export function parseAdminAction(body: unknown): ParsedAdminAction {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: ADMIN_ACTION_ERRORS.invalid }
  }
  const record = body as Record<string, unknown>
  const action = typeof record.action === 'string' ? record.action : ''

  if (action === 'repair-plan') {
    const userId = readUserId(record.userId)
    return userId
      ? { ok: true, action: { action: 'repair-plan', userId } }
      : { ok: false, error: ADMIN_ACTION_ERRORS.user }
  }

  if (action === 'ai-reset') {
    const userId = readUserId(record.userId)
    return userId
      ? { ok: true, action: { action: 'ai-reset', userId } }
      : { ok: false, error: ADMIN_ACTION_ERRORS.user }
  }

  if (action === 'ai-bonus') {
    const userId = readUserId(record.userId)
    if (!userId) return { ok: false, error: ADMIN_ACTION_ERRORS.user }
    const tokens = readInteger(record.tokens, 1, MAX_AI_BONUS_TOKENS)
    if (tokens === null) return { ok: false, error: ADMIN_ACTION_ERRORS.tokens }
    return { ok: true, action: { action: 'ai-bonus', userId, tokens } }
  }

  if (action === 'extend-plan') {
    const userId = readUserId(record.userId)
    if (!userId) return { ok: false, error: ADMIN_ACTION_ERRORS.user }
    const days = readInteger(record.days, MIN_EXTEND_DAYS, MAX_EXTEND_DAYS)
    if (days === null) return { ok: false, error: ADMIN_ACTION_ERRORS.days }
    return { ok: true, action: { action: 'extend-plan', userId, days } }
  }

  if (action === 'set-plan') {
    const userId = readUserId(record.userId)
    if (!userId) return { ok: false, error: ADMIN_ACTION_ERRORS.user }
    const planId = readPlanId(record.planId)
    if (!planId) return { ok: false, error: ADMIN_ACTION_ERRORS.plan }
    const period = readPeriod(record.period)
    if (!period) return { ok: false, error: ADMIN_ACTION_ERRORS.period }
    return { ok: true, action: { action: 'set-plan', userId, planId, period } }
  }

  return { ok: false, error: ADMIN_ACTION_ERRORS.invalid }
}

/* ── BENTUK BARIS `user_subscriptions` YANG DITULIS ───────────────────────── */

export interface SubscriptionPatch {
  tier_name: string
  billing_period: AdminBillingPeriod
  is_lifetime: boolean
  expires_at: string | null
  is_active: boolean
  last_renewed_at: string
  updated_at: string
}

/** paket manual: 30 hari dari sekarang, atau akses selamanya */
export function planOverridePatch({
  planId,
  period,
  now = new Date(),
}: {
  planId: PlanId
  period: AdminBillingPeriod
  now?: Date
}): SubscriptionPatch {
  const lifetime = period === 'lifetime'
  const iso = now.toISOString()
  return {
    tier_name: planId,
    billing_period: lifetime ? 'lifetime' : 'monthly',
    is_lifetime: lifetime,
    expires_at: lifetime
      ? null
      : new Date(now.getTime() + MONTHLY_DAYS * 86_400_000).toISOString(),
    is_active: true,
    last_renewed_at: iso,
    updated_at: iso,
  }
}

export type ExtendPlanOutcome =
  | { ok: true; patch: SubscriptionPatch; expiresAt: string }
  | { ok: false; error: string }

/**
 * Perpanjang masa aktif paket 30 hari. Aturannya SAMA dengan pemenuhan
 * pembayaran: masa aktif baru menumpuk dari sisa hari; yang sudah kedaluwarsa
 * mulai dari sekarang. Paket akses selamanya tidak punya masa aktif → ditolak.
 */
export function extendPlanPatch({
  plan,
  days,
  now = new Date(),
}: {
  plan: AdminPlanState
  days: number
  now?: Date
}): ExtendPlanOutcome {
  if (!Number.isInteger(days) || days < MIN_EXTEND_DAYS || days > MAX_EXTEND_DAYS) {
    return { ok: false, error: ADMIN_ACTION_ERRORS.days }
  }
  if (plan.isLifetime || plan.period === 'lifetime') {
    return { ok: false, error: ADMIN_ACTION_ERRORS.lifetime }
  }
  if (!plan.tier || !plan.period) {
    return { ok: false, error: ADMIN_ACTION_ERRORS.noPlan }
  }

  const currentExpiry = plan.expiresAt ? Date.parse(plan.expiresAt) : Number.NaN
  const base = Number.isFinite(currentExpiry)
    ? Math.max(now.getTime(), currentExpiry)
    : now.getTime()
  const expiresAt = new Date(base + days * 86_400_000).toISOString()
  const iso = now.toISOString()

  return {
    ok: true,
    expiresAt,
    patch: {
      tier_name: plan.tier,
      billing_period: 'monthly',
      is_lifetime: false,
      expires_at: expiresAt,
      is_active: true,
      last_renewed_at: iso,
      updated_at: iso,
    },
  }
}

/**
 * Kolom langganan yang menyalin hak akses dari pembelian yang SUDAH LUNAS.
 *
 * `null` = TIDAK ADA yang boleh ditulis:
 *   · hak akses dari pembelian itu sudah lewat masa berlakunya, atau
 *   · akun sudah punya akses SELAMANYA yang aktif sementara yang dihitung hanya
 *     pembelian bulanan — menulis 30 hari di sini akan MENCABUT akses selamanya.
 */
export function repairPatch(
  expected: ExpectedEntitlement,
  now = new Date(),
  existing?: Pick<AdminPlanState, 'isLifetime' | 'active'> | null,
): SubscriptionPatch | null {
  if (!expected.lifetime && existing?.isLifetime && existing.active) return null

  const iso = now.toISOString()
  if (expected.lifetime) {
    return {
      tier_name: expected.planId,
      billing_period: 'lifetime',
      is_lifetime: true,
      expires_at: null,
      is_active: true,
      last_renewed_at: iso,
      updated_at: iso,
    }
  }
  const until = expected.usableUntil
  if (until === null || until <= now.getTime()) return null
  return {
    tier_name: expected.planId,
    billing_period: 'monthly',
    is_lifetime: false,
    expires_at: new Date(until).toISOString(),
    is_active: true,
    last_renewed_at: iso,
    updated_at: iso,
  }
}

/** nominal bonus token AI yang sah (dipakai `parseAdminAction`) */
export function isValidAiBonusTokens(value: unknown): boolean {
  return readInteger(value, 1, MAX_AI_BONUS_TOKENS) !== null
}

/**
 * `order_id` untuk baris `ai_addons` bonus manual. Tabel itu memakai
 * `order_id` unik sebagai kunci idempoten, jadi bonus manual butuh id sendiri —
 * berpola `admin-bonus-…` supaya jelas bukan pembelian Midtrans.
 */
export function aiBonusOrderId(now = new Date(), random = Math.random): string {
  const suffix = Math.floor(random() * 1e9)
    .toString(36)
    .padStart(6, '0')
  return `admin-bonus-${now.getTime().toString(36)}-${suffix}`
}

