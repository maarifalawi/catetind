import { describe, expect, it } from 'vitest'
import {
  abandonedCheckouts,
  activationFunnel,
  activeUserCounts,
  buildAdminUserRows,
  detectMismatches,
  expectedEntitlement,
  expiryRadar,
  featureAdoption,
  growthBlock,
  paymentMethodLabel,
  paymentSummary,
  planBreakdown,
  planStateOf,
  revenueBlock,
  toCountMap,
  type AdminAuthUser,
  type AdminPlanRecord,
  type AdminUserSources,
} from './snapshot'
import type { AdminPurchaseRecord, AdminUserRow } from './types'

/* ── PERHITUNGAN DASHBOARD ADMIN ─────────────────────────────────────────────
   Yang dikunci di sini: pendapatan hanya dari transaksi lunas, corong menghitung
   berhenti di tahap yang benar, radar masa aktif memakai jendela 7/14 hari, dan
   PRIVASI: baris user tidak pernah memuat isi catatan pribadi.
   ────────────────────────────────────────────────────────────────────────── */

const NOW = new Date('2026-11-01T10:00:00.000Z')
const DAY = 86_400_000
const iso = (offsetDays: number, hoursFromNow = 0) =>
  new Date(NOW.getTime() + offsetDays * DAY + hoursFromNow * 3_600_000).toISOString()

function authUser(id: string, overrides: Partial<AdminAuthUser> = {}): AdminAuthUser {
  return {
    id,
    email: `${id}@catet.id`,
    name: `User ${id}`,
    createdAt: iso(-1),
    lastActiveAt: iso(-1),
    ...overrides,
  }
}

function planRecord(overrides: Partial<AdminPlanRecord> = {}): AdminPlanRecord {
  return {
    tier: 'waras',
    period: 'monthly',
    isLifetime: false,
    isActive: true,
    startedAt: iso(-10),
    expiresAt: iso(20),
    ...overrides,
  }
}

function sources(overrides: Partial<AdminUserSources> = {}): AdminUserSources {
  return {
    onboardingUserIds: [],
    walletCounts: new Map(),
    transactionCounts: new Map(),
    aiCaptureUserIds: [],
    aiCallsThisMonth: new Map(),
    aiBonusTokens: new Map(),
    billUserIds: [],
    goalUserIds: [],
    jointUserIds: [],
    wealthUserIds: [],
    referralCounts: new Map(),
    plans: new Map(),
    ...overrides,
  }
}

function userRow(overrides: Partial<AdminUserRow> = {}): AdminUserRow {
  return {
    id: 'u1',
    email: 'u1@catet.id',
    name: 'User 1',
    createdAt: iso(-1),
    lastActiveAt: iso(-1),
    onboardingCompleted: true,
    walletCount: 1,
    transactionCount: 1,
    aiCallsThisMonth: 0,
    aiBonusTokens: 0,
    hasBills: false,
    hasGoals: false,
    hasJointWallet: false,
    hasWealth: false,
    hasAiCapture: false,
    referralInvites: 0,
    plan: planStateOf(undefined, NOW.getTime()),
    ...overrides,
  }
}

function purchase(overrides: Partial<AdminPurchaseRecord> = {}): AdminPurchaseRecord {
  return {
    orderId: 'order-1',
    userId: 'u1',
    status: 'settlement',
    amount: 129_000,
    paymentMethod: 'qris',
    purpose: 'subscribe',
    tierName: 'waras',
    billingPeriod: 'lifetime',
    createdAt: iso(-2),
    paidAt: iso(-2),
    ...overrides,
  }
}

describe('buildAdminUserRows', () => {
  it('memetakan hitungan aktivitas & keadaan paket tanpa isi catatan', () => {
    const [row] = buildAdminUserRows(
      [authUser('u1')],
      sources({
        onboardingUserIds: ['u1'],
        walletCounts: toCountMap(['u1', 'u1', 'u2']),
        transactionCounts: toCountMap(['u1']),
        aiCallsThisMonth: new Map([['u1', 12]]),
        aiBonusTokens: new Map([['u1', 5000]]),
        plans: new Map([['u1', planRecord()]]),
      }),
      NOW.getTime(),
    )

    expect(row.walletCount).toBe(2)
    expect(row.transactionCount).toBe(1)
    expect(row.aiCallsThisMonth).toBe(12)
    expect(row.aiBonusTokens).toBe(5000)
    expect(row.plan.planId).toBe('waras')
    expect(row.plan.active).toBe(true)
    expect(row.plan.period).toBe('monthly')
  })

  it('paket prabayar yang sudah lewat tanggal TIDAK dianggap aktif', () => {
    const state = planStateOf(planRecord({ expiresAt: iso(-1) }), NOW.getTime())
    expect(state.isActive).toBe(true)
    expect(state.active).toBe(false)
  })

  it('tidak menyimpan deskripsi/nominal/saldo pribadi di baris user', () => {
    const rows = buildAdminUserRows([authUser('u1')], sources(), NOW.getTime())
    const serialized = JSON.stringify(rows[0])
    for (const forbidden of ['description', 'note', 'balance', 'walletName', 'category']) {
      expect(serialized.includes(forbidden), forbidden).toBe(false)
    }
  })
})

describe('growthBlock / activeUserCounts', () => {
  const users = [
    authUser('a', { createdAt: iso(0, -1) }),
    authUser('b', { createdAt: iso(-3) }),
    authUser('c', { createdAt: iso(-10) }),
    authUser('d', { createdAt: iso(-40) }),
  ]

  it('menghitung total, hari ini, 7 hari, dan 30 hari', () => {
    const growth = growthBlock(users, NOW)
    expect(growth.total).toBe(4)
    expect(growth.today).toBe(1)
    expect(growth.last7).toBe(2)
    expect(growth.last30).toBe(3)
  })

  it('menghitung user aktif harian/mingguan/bulanan dari lastActiveAt', () => {
    const rows = [
      userRow({ id: 'a', lastActiveAt: iso(0, -2) }),
      userRow({ id: 'b', lastActiveAt: iso(-3) }),
      userRow({ id: 'c', lastActiveAt: iso(-20) }),
      userRow({ id: 'd', lastActiveAt: iso(-90) }),
    ]
    expect(activeUserCounts(rows, NOW)).toEqual({ daily: 1, weekly: 2, monthly: 3 })
  })
})

describe('revenueBlock', () => {
  it('hanya menghitung transaksi LUNAS dan memisahkan paket vs kuota AI', () => {
    const rows = [
      userRow({
        plan: planStateOf(
          planRecord({ period: 'lifetime', isLifetime: true, expiresAt: null }),
          NOW.getTime(),
        ),
      }),
    ]
    const purchases = [
      purchase({ orderId: 'a', status: 'settlement', amount: 100_000, paidAt: iso(0, -1) }),
      purchase({
        orderId: 'b',
        status: 'capture',
        amount: 50_000,
        purpose: 'topup',
        paidAt: iso(-1),
      }),
      purchase({ orderId: 'c', status: 'pending', amount: 999_000, paidAt: null }),
      purchase({ orderId: 'd', status: 'expire', amount: 999_000, paidAt: null }),
    ]

    const revenue = revenueBlock(rows, purchases, NOW)
    expect(revenue.total.allTime).toBe(150_000)
    expect(revenue.subscription.allTime).toBe(100_000)
    expect(revenue.addon.allTime).toBe(50_000)
    expect(revenue.total.today).toBe(100_000)
    expect(revenue.settledCount).toBe(2)
    expect(revenue.averageTransaction).toBe(75_000)
    expect(revenue.paidUsers).toBe(1)
    expect(revenue.totalUsers).toBe(1)
    expect(revenue.paidAccountPercent).toBe(100)
  })

  it('bulan ini hanya menghitung tanggal di bulan yang sama', () => {
    const lastMonth = new Date(NOW.getFullYear(), NOW.getMonth() - 1, 15, 10).toISOString()
    const revenue = revenueBlock(
      [],
      [
        purchase({ paidAt: lastMonth, amount: 10_000 }),
        purchase({ orderId: 'x', paidAt: iso(0, -1), amount: 5_000 }),
      ],
      NOW,
    )
    expect(revenue.total.thisMonth).toBe(5_000)
    expect(revenue.total.allTime).toBe(15_000)
  })
})

describe('activationFunnel / featureAdoption', () => {
  const rows = [
    userRow({ id: 'a', onboardingCompleted: true, walletCount: 2, transactionCount: 5 }),
    userRow({ id: 'b', onboardingCompleted: true, walletCount: 1, transactionCount: 0, hasBills: true }),
    userRow({ id: 'c', onboardingCompleted: false, walletCount: 0, transactionCount: 0 }),
    userRow({
      id: 'd',
      onboardingCompleted: true,
      walletCount: 1,
      transactionCount: 3,
      hasGoals: true,
      hasAiCapture: true,
      referralInvites: 2,
      plan: planStateOf(
        planRecord({ period: 'lifetime', isLifetime: true, expiresAt: null }),
        NOW.getTime(),
      ),
    }),
  ]

  it('menghitung lima tahap + siapa yang berhenti di mana', () => {
    const stages = activationFunnel(rows)
    expect(stages.map((stage) => stage.id)).toEqual([
      'registered',
      'onboarded',
      'wallet',
      'transaction',
      'paid',
    ])
    expect(stages.map((stage) => stage.count)).toEqual([4, 3, 3, 2, 1])
    expect(stages[0].droppedBefore).toBe(0)
    expect(stages[3].droppedBefore).toBe(1) // 3 dompet → 2 yang mencatat transaksi
    expect(stages[4].droppedBefore).toBe(1) // 2 pencatat → 1 yang berbayar

    const biggest = biggestDrop(stages)
    expect(biggest?.droppedBefore).toBe(1)
  })

  function biggestDrop(stages: ReturnType<typeof activationFunnel>) {
    let biggest = stages[0]
    for (const stage of stages) if (stage.droppedBefore > biggest.droppedBefore) biggest = stage
    return biggest.droppedBefore > 0 ? biggest : null
  }

  it('menghitung pemakaian fitur per akun', () => {
    const adoption = featureAdoption(rows)
    const byId = Object.fromEntries(adoption.map((entry) => [entry.id, entry.users]))
    expect(byId.wallets).toBe(3)
    expect(byId.transactions).toBe(2)
    expect(byId.bills).toBe(1)
    expect(byId.goals).toBe(1)
    expect(byId['ai-capture']).toBe(1)
    expect(byId.referral).toBe(1)
    expect(adoption.find((entry) => entry.id === 'wallets')?.sharePercent).toBe(75)
  })
})

describe('planBreakdown / expiryRadar', () => {
  const rows = [
    userRow({ id: 'free' }),
    userRow({
      id: 'm1',
      plan: planStateOf(planRecord({ tier: 'catet-aja' }), NOW.getTime()),
    }),
    userRow({
      id: 'l1',
      plan: planStateOf(
        planRecord({ tier: 'sultan', period: 'lifetime', isLifetime: true, expiresAt: null }),
        NOW.getTime(),
      ),
    }),
    userRow({
      id: 'exp',
      plan: planStateOf(planRecord({ expiresAt: iso(-2) }), NOW.getTime()),
    }),
  ]

  it('hanya memuat tiga paket berbayar; akun tanpa paket dihitung terpisah', () => {
    const breakdown = planBreakdown(rows)
    expect(breakdown.tiers.map((tier) => tier.planId)).toEqual(['catet-aja', 'waras', 'sultan'])
    expect(breakdown.tiers.some((tier) => /gratis/i.test(tier.label))).toBe(false)

    const catetAja = breakdown.tiers.find((tier) => tier.planId === 'catet-aja')
    const sultan = breakdown.tiers.find((tier) => tier.planId === 'sultan')

    expect(catetAja?.monthly).toBe(1)
    expect(catetAja?.lifetime).toBe(0)
    expect(sultan?.lifetime).toBe(1)
    expect(breakdown.withoutPlan).toBe(1) // akun tanpa baris langganan
    expect(breakdown.expired).toBe(1) // baris ada, akses sudah tidak berlaku
    expect(breakdown.totalAccounts).toBe(4)
  })

  it('radar memakai jendela 7 hari ke depan & 14 hari ke belakang', () => {
    const radar = expiryRadar(
      [
        userRow({ id: 'soon', plan: planStateOf(planRecord({ expiresAt: iso(3) }), NOW.getTime()) }),
        userRow({ id: 'far', plan: planStateOf(planRecord({ expiresAt: iso(10) }), NOW.getTime()) }),
        userRow({
          id: 'recent',
          plan: planStateOf(planRecord({ expiresAt: iso(-2) }), NOW.getTime()),
        }),
        userRow({ id: 'old', plan: planStateOf(planRecord({ expiresAt: iso(-20) }), NOW.getTime()) }),
        userRow({
          id: 'lifetime',
          plan: planStateOf(
            planRecord({ period: 'lifetime', isLifetime: true, expiresAt: null }),
            NOW.getTime(),
          ),
        }),
      ],
      NOW.getTime(),
    )

    expect(radar.expiringSoon.map((entry) => entry.userId)).toEqual(['soon'])
    expect(radar.expiredRecently.map((entry) => entry.userId)).toEqual(['recent'])
  })
})

describe('paymentSummary / paymentMethodLabel', () => {
  it('menghitung kelompok status dan metode hanya dari transaksi lunas', () => {
    const summary = paymentSummary([
      purchase({ orderId: 'a', status: 'settlement', paymentMethod: 'qris', amount: 10_000 }),
      purchase({ orderId: 'b', status: 'capture', paymentMethod: 'qris', amount: 20_000 }),
      purchase({
        orderId: 'c',
        status: 'settlement',
        paymentMethod: 'bank_transfer',
        amount: 30_000,
      }),
      purchase({ orderId: 'd', status: 'pending', paymentMethod: 'gopay', amount: 40_000 }),
      purchase({ orderId: 'e', status: 'expire', paymentMethod: 'gopay', amount: 50_000 }),
    ])

    expect(summary.counts).toEqual({ all: 5, paid: 3, pending: 1, failed: 1 })
    expect(summary.settledCount).toBe(3)
    expect(summary.settledAmount).toBe(60_000)
    expect(summary.byMethod[0]).toMatchObject({ method: 'qris', label: 'QRIS', count: 2 })
    expect(summary.byMethod[1]).toMatchObject({ label: 'Virtual Account', count: 1 })
    expect(summary.byMethod.some((entry) => entry.label === 'GoPay')).toBe(false)
  })

  it('menerjemahkan payment_type Midtrans ke label yang dibaca manusia', () => {
    expect(paymentMethodLabel('qris')).toBe('QRIS')
    expect(paymentMethodLabel('gopay')).toBe('GoPay')
    expect(paymentMethodLabel('shopeepay')).toBe('ShopeePay')
    expect(paymentMethodLabel('bank_transfer')).toBe('Virtual Account')
    expect(paymentMethodLabel('echannel')).toBe('Mandiri Bill')
    expect(paymentMethodLabel(null)).toBe('Tidak tercatat')
    expect(paymentMethodLabel('kartu_khusus')).toBe('kartu_khusus')
  })
})

describe('abandonedCheckouts', () => {
  const rows = [
    userRow({
      id: 'u1',
      plan: planStateOf(
        planRecord({ period: 'lifetime', isLifetime: true, expiresAt: null }),
        NOW.getTime(),
      ),
    }), // sudah berbayar → tidak masuk radar
    userRow({ id: 'u2' }),
    userRow({ id: 'u3' }),
    userRow({ id: 'u4' }),
    userRow({ id: 'u5' }),
  ]

  it('hanya user tanpa paket aktif, bukan top-up, dan memakai percobaan terbaru', () => {
    const list = abandonedCheckouts(rows, [
      purchase({ orderId: 'paid-u1', userId: 'u1', status: 'settlement', paidAt: iso(-1) }),
      purchase({ orderId: 'pending-u1', userId: 'u1', status: 'pending', paidAt: null }),
      purchase({ orderId: 'old-u2', userId: 'u2', status: 'expire', createdAt: iso(-5), paidAt: null }),
      purchase({
        orderId: 'new-u2',
        userId: 'u2',
        status: 'pending',
        createdAt: iso(-1),
        paidAt: null,
        amount: 109_000,
      }),
      purchase({ orderId: 'u3', userId: 'u3', status: 'expire', paidAt: null }),
      purchase({ orderId: 'u4', userId: 'u4', status: 'pending', purpose: 'topup', paidAt: null }),
      purchase({ orderId: 'u5', userId: 'u5', status: 'deny', paidAt: null }),
    ])

    const byUser = Object.fromEntries(list.map((entry) => [entry.userId, entry]))
    expect(Object.keys(byUser).sort()).toEqual(['u2', 'u3', 'u5'])
    expect(byUser.u2.orderId).toBe('new-u2')
    expect(byUser.u2.amount).toBe(109_000)
  })
})

describe('expectedEntitlement / detectMismatches', () => {
  it('akses selamanya menang dan memakai tier tertinggi yang pernah dibeli', () => {
    const expected = expectedEntitlement(
      [
        purchase({ orderId: 'lifetime-waras', tierName: 'waras', billingPeriod: 'lifetime' }),
        purchase({ orderId: 'lifetime-sultan', tierName: 'sultan', billingPeriod: 'lifetime' }),
        purchase({ orderId: 'monthly', tierName: 'catet-aja', billingPeriod: 'monthly' }),
      ],
      NOW.getTime(),
    )
    expect(expected?.lifetime).toBe(true)
    expect(expected?.planId).toBe('sultan')
    expect(expected?.usableUntil).toBeNull()
  })

  it('prabayar 30 hari hanya dihitung bila jendelanya masih berlaku', () => {
    const fresh = expectedEntitlement(
      [purchase({ tierName: 'catet-aja', billingPeriod: 'monthly', paidAt: iso(-5) })],
      NOW.getTime(),
    )
    expect(fresh?.lifetime).toBe(false)
    expect(fresh?.planId).toBe('catet-aja')
    expect(fresh?.usableUntil).toBe(NOW.getTime() - 5 * DAY + 30 * DAY)

    const stale = expectedEntitlement(
      [purchase({ tierName: 'waras', billingPeriod: 'monthly', paidAt: iso(-40) })],
      NOW.getTime(),
    )
    expect(stale).toBeNull()
  })

  it('mendeteksi lima bentuk salah sinkron dan TIDAK menuduh yang wajar', () => {
    const rows = [
      userRow({ id: 'no-plan' }),
      userRow({
        id: 'inactive',
        plan: planStateOf(planRecord({ isActive: false }), NOW.getTime()),
      }),
      userRow({
        id: 'expired',
        plan: planStateOf(planRecord({ expiresAt: iso(-1) }), NOW.getTime()),
      }),
      userRow({
        id: 'tier',
        plan: planStateOf(
          planRecord({ tier: 'catet-aja', period: 'lifetime', isLifetime: true, expiresAt: null }),
          NOW.getTime(),
        ),
      }),
      userRow({
        id: 'period',
        plan: planStateOf(planRecord({ tier: 'sultan' }), NOW.getTime()),
      }),
      userRow({
        id: 'ok',
        plan: planStateOf(
          planRecord({ tier: 'waras', period: 'lifetime', isLifetime: true, expiresAt: null }),
          NOW.getTime(),
        ),
      }),
      userRow({
        id: 'naturally-expired',
        plan: planStateOf(planRecord({ expiresAt: iso(-5) }), NOW.getTime()),
      }),
      userRow({
        id: 'lifetime-protected',
        plan: planStateOf(
          planRecord({ tier: 'catet-aja', period: 'lifetime', isLifetime: true, expiresAt: null }),
          NOW.getTime(),
        ),
      }),
      userRow({ id: 'topup-only' }),
    ]

    const purchases = [
      purchase({ orderId: 'o-no-plan', userId: 'no-plan', tierName: 'waras' }),
      purchase({ orderId: 'o-inactive', userId: 'inactive', tierName: 'waras' }),
      purchase({
        orderId: 'o-expired',
        userId: 'expired',
        tierName: 'waras',
        billingPeriod: 'monthly',
        paidAt: iso(-3),
      }),
      purchase({ orderId: 'o-tier', userId: 'tier', tierName: 'sultan' }),
      purchase({ orderId: 'o-period', userId: 'period', tierName: 'waras' }),
      purchase({ orderId: 'o-ok', userId: 'ok', tierName: 'waras' }),
      purchase({
        orderId: 'o-natural',
        userId: 'naturally-expired',
        tierName: 'waras',
        billingPeriod: 'monthly',
        paidAt: iso(-40),
      }),
      purchase({
        orderId: 'o-topup',
        userId: 'topup-only',
        purpose: 'topup',
        tierName: null,
      }),
      purchase({
        orderId: 'o-protected',
        userId: 'lifetime-protected',
        tierName: 'sultan',
        billingPeriod: 'monthly',
        paidAt: iso(-3),
      }),
    ]

    const mismatches = detectMismatches(rows, purchases, NOW.getTime())
    const byUser = Object.fromEntries(mismatches.map((entry) => [entry.userId, entry.reason]))

    expect(byUser['no-plan']).toBe('no-plan')
    expect(byUser.inactive).toBe('inactive')
    expect(byUser.expired).toBe('expired')
    expect(byUser.tier).toBe('tier')
    expect(byUser.period).toBe('period')
    expect(byUser.ok).toBeUndefined()
    expect(byUser['naturally-expired']).toBeUndefined()
    expect(byUser['lifetime-protected']).toBeUndefined()
    expect(byUser['topup-only']).toBeUndefined()
    expect(mismatches).toHaveLength(5)
  })
})



