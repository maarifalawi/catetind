import { planById } from '@/lib/data/pricing'
import type {
  AdminPaymentStatusGroup,
  AdminPaymentView,
  AdminUserFilterId,
  AdminUserRow,
} from './types'

/* ── SARINGAN & PENCARIAN DIREKTORI (murni, dipakai layar admin) ─────────────
   Semua keputusan "user ini masuk filter mana" hidup di sini supaya chip filter
   di layar, angka di chip, dan hasil pencarian tidak pernah berbeda pendapat.
   Tanpa React dan tanpa jaringan → gampang diuji (lihat filters.test.ts).
   ────────────────────────────────────────────────────────────────────────── */

const DAY_MS = 86_400_000

/** selisih hari dibulatkan ke atas: 0,4 hari → 1; -0,4 hari → 0 (masih hari ini) */
export function daysUntil(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null
  const time = Date.parse(iso)
  if (!Number.isFinite(time)) return null
  return Math.ceil((time - now) / DAY_MS)
}

/**
 * Nama paket siap tampil. `null` = akun belum punya langganan — disebut
 * "Tanpa paket", BUKAN "Gratis": sistem ini tidak memiliki paket gratis, dan
 * menyebutnya gratis membuat seolah-olah ada tier yang tidak pernah ada.
 */
export function planLabelOf(planId: string | null | undefined): string {
  return planById(planId)?.name ?? 'Tanpa paket'
}

/** true = paket 30 hari yang masa aktifnya berakhir ≤ 7 hari lagi */
export function isExpiringSoon(user: AdminUserRow, now = Date.now()): boolean {
  if (!user.plan.active || user.plan.period !== 'monthly' || user.plan.isLifetime) return false
  const days = daysUntil(user.plan.expiresAt, now)
  return days !== null && days >= 0 && days <= 7
}

/** true = baris langganan ada tetapi tidak memberi akses lagi */
export function isExpiredPlan(user: AdminUserRow): boolean {
  return user.plan.period !== null && !user.plan.active
}

/** satu tempat aturan chip filter Direktori User */
export function matchesUserFilter(
  user: AdminUserRow,
  filter: AdminUserFilterId,
  now = Date.now(),
): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'paid':
      return user.plan.active && user.plan.planId !== null
    case 'free':
      return !(user.plan.active && user.plan.planId !== null)
    case 'onboarding-pending':
      return !user.onboardingCompleted
    case 'no-transactions':
      return user.transactionCount === 0
    case 'expiring-soon':
      return isExpiringSoon(user, now)
    default:
      return true
  }
}

/**
 * Pencarian cepat berdasarkan nama ATAU email. Huruf besar/kecil & spasi tepi
 * diabaikan; query kosong = semua user lolos (layar menampilkan seluruh daftar).
 */
export function matchesUserQuery(user: AdminUserRow, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return (
    user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle)
  )
}

/** kelompok status pembayaran — satu aturan untuk filter, ringkasan & CSV */
export function paymentStatusGroup(status: string | null | undefined): AdminPaymentStatusGroup {
  const value = (status ?? '').toLowerCase()
  if (value === 'settlement' || value === 'capture') return 'paid'
  if (value === 'pending') return 'pending'
  /* expire / cancel / deny / refund / failure: uang TIDAK dihitung masuk */
  return 'failed'
}

export type AdminPaymentFilterId = 'all' | AdminPaymentStatusGroup

export function matchesPaymentFilter(
  payment: Pick<AdminPaymentView, 'status'>,
  filter: AdminPaymentFilterId,
): boolean {
  return filter === 'all' ? true : paymentStatusGroup(payment.status) === filter
}

/** jumlah tiap chip filter — dipakai lencana angka di layar */
export function countByFilter(
  users: readonly AdminUserRow[],
  now = Date.now(),
): Record<AdminUserFilterId, number> {
  const counts: Record<AdminUserFilterId, number> = {
    all: users.length,
    paid: 0,
    free: 0,
    'onboarding-pending': 0,
    'no-transactions': 0,
    'expiring-soon': 0,
  }
  for (const user of users) {
    if (matchesUserFilter(user, 'paid', now)) counts.paid += 1
    if (matchesUserFilter(user, 'free', now)) counts.free += 1
    if (matchesUserFilter(user, 'onboarding-pending', now)) counts['onboarding-pending'] += 1
    if (matchesUserFilter(user, 'no-transactions', now)) counts['no-transactions'] += 1
    if (matchesUserFilter(user, 'expiring-soon', now)) counts['expiring-soon'] += 1
  }
  return counts
}
