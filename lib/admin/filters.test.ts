import { describe, expect, it } from 'vitest'
import {
  countByFilter,
  daysUntil,
  matchesPaymentFilter,
  matchesUserFilter,
  matchesUserQuery,
  paymentStatusGroup,
  planLabelOf,
} from './filters'
import type { AdminUserRow } from './types'

/* ── SARINGAN DIREKTORI USER & PEMBAYARAN ────────────────────────────────────
   Chip filter, pencarian, dan pengelompokan status dipakai layar DAN laporan.
   Test ini menjaga artinya tidak bergeser (mis. "Berbayar" tidak boleh
   menghitung paket kedaluwarsa).
   ────────────────────────────────────────────────────────────────────────── */

const NOW = new Date('2026-11-01T10:00:00.000Z')
const DAY = 86_400_000
const iso = (offsetDays: number) => new Date(NOW.getTime() + offsetDays * DAY).toISOString()

function user(overrides: Partial<AdminUserRow> = {}): AdminUserRow {
  return {
    id: 'u1',
    email: 'rina@catet.id',
    name: 'Rina Putri',
    createdAt: iso(-30),
    lastActiveAt: iso(-1),
    onboardingCompleted: true,
    walletCount: 2,
    transactionCount: 10,
    aiCallsThisMonth: 3,
    aiBonusTokens: 0,
    hasBills: false,
    hasGoals: false,
    hasJointWallet: false,
    hasWealth: false,
    hasAiCapture: false,
    referralInvites: 0,
    plan: {
      tier: null,
      planId: null,
      period: null,
      isLifetime: false,
      isActive: false,
      active: false,
      startedAt: null,
      expiresAt: null,
    },
    ...overrides,
  }
}

describe('daysUntil / planLabelOf', () => {
  it('membulatkan sisa hari ke atas dan aman untuk nilai rusak', () => {
    expect(daysUntil(iso(3), NOW.getTime())).toBe(3)
    expect(daysUntil(iso(-2), NOW.getTime())).toBe(-2)
    expect(daysUntil(null, NOW.getTime())).toBeNull()
    expect(daysUntil('bukan-tanggal', NOW.getTime())).toBeNull()
  })

  it('memakai nama paket resmi; tanpa paket → "Tanpa paket" (bukan "Gratis")', () => {
    expect(planLabelOf('waras')).toBe('Paket Waras')
    expect(planLabelOf(null)).toBe('Tanpa paket')
    expect(planLabelOf('founding_member')).toBe('Tanpa paket')
  })
})

describe('matchesUserFilter', () => {
  const paying = user({
    plan: {
      tier: 'waras',
      planId: 'waras',
      period: 'lifetime',
      isLifetime: true,
      isActive: true,
      active: true,
      startedAt: iso(-2),
      expiresAt: null,
    },
  })
  const expiring = user({
    id: 'u2',
    plan: {
      tier: 'waras',
      planId: 'waras',
      period: 'monthly',
      isLifetime: false,
      isActive: true,
      active: true,
      startedAt: iso(-25),
      expiresAt: iso(3),
    },
  })
  const expired = user({
    id: 'u3',
    plan: {
      tier: 'waras',
      planId: 'waras',
      period: 'monthly',
      isLifetime: false,
      isActive: true,
      active: false,
      startedAt: iso(-40),
      expiresAt: iso(-5),
    },
  })

  it('Berbayar hanya untuk paket yang masih berlaku', () => {
    expect(matchesUserFilter(paying, 'paid', NOW.getTime())).toBe(true)
    expect(matchesUserFilter(expiring, 'paid', NOW.getTime())).toBe(true)
    expect(matchesUserFilter(expired, 'paid', NOW.getTime())).toBe(false)
    expect(matchesUserFilter(expired, 'free', NOW.getTime())).toBe(true)
  })

  it('Paket mau habis = bulanan aktif dengan sisa ≤ 7 hari', () => {
    expect(matchesUserFilter(expiring, 'expiring-soon', NOW.getTime())).toBe(true)
    expect(matchesUserFilter(paying, 'expiring-soon', NOW.getTime())).toBe(false)
    expect(matchesUserFilter(expired, 'expiring-soon', NOW.getTime())).toBe(false)
  })

  it('filter onboarding & transaksi memakai keadaan sebenarnya', () => {
    const fresh = user({ onboardingCompleted: false, transactionCount: 0 })
    expect(matchesUserFilter(fresh, 'onboarding-pending', NOW.getTime())).toBe(true)
    expect(matchesUserFilter(fresh, 'no-transactions', NOW.getTime())).toBe(true)
    expect(matchesUserFilter(paying, 'no-transactions', NOW.getTime())).toBe(false)
  })
})

describe('matchesUserQuery', () => {
  it('mencari nama/email tanpa peduli huruf besar-kecil & spasi tepi', () => {
    expect(matchesUserQuery(user(), 'rina')).toBe(true)
    expect(matchesUserQuery(user(), '  CATET.ID ')).toBe(true)
    expect(matchesUserQuery(user(), 'budi')).toBe(false)
    expect(matchesUserQuery(user(), '   ')).toBe(true)
  })
})

describe('countByFilter', () => {
  it('menghitung semua chip dari daftar yang sama', () => {
    const counts = countByFilter([user(), user({ id: 'u2', onboardingCompleted: false, transactionCount: 0 })], NOW.getTime())
    expect(counts.all).toBe(2)
    expect(counts.free).toBe(2)
    expect(counts.paid).toBe(0)
    expect(counts['onboarding-pending']).toBe(1)
    expect(counts['no-transactions']).toBe(1)
  })
})

describe('paymentStatusGroup / matchesPaymentFilter', () => {
  it('mengelompokkan status Midtrans menjadi tiga kelompok', () => {
    expect(paymentStatusGroup('settlement')).toBe('paid')
    expect(paymentStatusGroup('capture')).toBe('paid')
    expect(paymentStatusGroup('pending')).toBe('pending')
    for (const status of ['expire', 'cancel', 'deny', 'refund', 'failure', null]) {
      expect(paymentStatusGroup(status), String(status)).toBe('failed')
    }
  })

  it('filter pembayaran memakai kelompok yang sama', () => {
    expect(matchesPaymentFilter({ status: 'settlement' }, 'paid')).toBe(true)
    expect(matchesPaymentFilter({ status: 'pending' }, 'paid')).toBe(false)
    expect(matchesPaymentFilter({ status: 'expire' }, 'failed')).toBe(true)
    expect(matchesPaymentFilter({ status: 'expire' }, 'all')).toBe(true)
  })
})
