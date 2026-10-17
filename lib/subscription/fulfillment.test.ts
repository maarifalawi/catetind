import { describe, expect, it } from 'vitest'
import { rankOf, PLANS } from '@/lib/data/pricing'
import { isAmountMismatch, resolvedTier, resolveSubscriptionAfterPurchase, tierRank } from './fulfillment'

/* ── ATURAN PEMENUHAN (cermin TS dari RPC SQL) — paket 85 ────────────────────
   SQL tidak punya test di repo ini, jadi aturan yang paling mahal-kalau-salah
   dikunci di sini. Tiga hal: rank tier sinkron dengan `PLANS`, upgrade tidak
   pernah menurunkan tier, dan nominal notifikasi yang salah tidak dipenuhi. */

describe('tierRank() — sinkron dengan `rank` di PLANS', () => {
  it('urutan paket: catet-aja (1) < waras (2) < sultan (3)', () => {
    expect(tierRank('catet-aja')).toBe(1)
    expect(tierRank('waras')).toBe(2)
    expect(tierRank('sultan')).toBe(3)
    /* tidak boleh bergeser dari PLANS — kalau bergeser, SQL & TS beda aturan */
    expect(tierRank('catet-aja')).toBe(rankOf('catet-aja'))
    expect(tierRank('waras')).toBe(rankOf('waras'))
    expect(tierRank('sultan')).toBe(rankOf('sultan'))
    expect(PLANS.map((plan) => plan.rank)).toEqual([1, 2, 3])
  })

  it('tier LAMA dipetakan sama seperti LEGACY_TIER_MAP', () => {
    expect(tierRank('founding_member')).toBe(3)
    expect(tierRank('lifetime')).toBe(3)
    expect(tierRank('yearly')).toBe(2)
    expect(tierRank('annual')).toBe(2)
    expect(tierRank('monthly')).toBe(1)
  })

  it('kosong / tak dikenal → 0 (tidak mengarang akses)', () => {
    expect(tierRank(null)).toBe(0)
    expect(tierRank('')).toBe(0)
    expect(tierRank('tier-misterius')).toBe(0)
  })
})

describe('resolvedTier() — upgrade naik, TIDAK PERNAH menurunkan', () => {
  it('naik tier mengikuti pembelian', () => {
    expect(resolvedTier('catet-aja', 'waras')).toBe('waras')
    expect(resolvedTier('waras', 'sultan')).toBe('sultan')
    expect(resolvedTier('catet-aja', 'sultan')).toBe('sultan')
  })

  it('target lebih rendah DIABAIKAN (tidak ada downgrade)', () => {
    expect(resolvedTier('sultan', 'waras')).toBe('sultan')
    expect(resolvedTier('sultan', 'catet-aja')).toBe('sultan')
    expect(resolvedTier('waras', 'catet-aja')).toBe('waras')
  })

  it('tier lama tetap lebih tinggi dari pembelian baru yang lebih rendah', () => {
    /* founding_member (lama) = sultan → pembelian "catet-aja" tidak menurunkannya */
    expect(resolvedTier('founding_member', 'catet-aja')).toBe('sultan')
  })

  it('pembelian pertama & pembelian ulang paket sama', () => {
    expect(resolvedTier(null, 'waras')).toBe('waras')
    expect(resolvedTier('waras', 'waras')).toBe('waras')
    expect(resolvedTier(null, null)).toBeNull()
  })
})

describe('isAmountMismatch() — nominal notifikasi yang salah TIDAK dipenuhi', () => {
  it('nominal pas → bukan mismatch', () => {
    expect(isAmountMismatch(129_000, 129_000)).toBe(false)
    /* provider mengirim desimal ("129000.00") → dibulatkan dulu */
    expect(isAmountMismatch(129_000, 129_000.0)).toBe(false)
  })

  it('nominal beda → mismatch', () => {
    expect(isAmountMismatch(129_000, 1_000)).toBe(true)
    expect(isAmountMismatch(129_000, 200_000)).toBe(true)
  })

  it('baris lama tanpa expected_amount → tidak menuduh salah', () => {
    expect(isAmountMismatch(null, 1_000)).toBe(false)
    expect(isAmountMismatch(undefined, 1_000)).toBe(false)
  })

describe('resolveSubscriptionAfterPurchase() — cermin SQL prabayar 30 hari', () => {
  const NOW = new Date('2026-10-14T12:00:00.000Z')
  const DAY = 24 * 60 * 60 * 1000

  it('monthly pertama: expiry = now + 30 hari', () => {
    const state = resolveSubscriptionAfterPurchase({
      purchasedTier: 'waras',
      period: 'monthly',
      now: NOW,
    })
    expect(state.tier).toBe('waras')
    expect(state.isLifetime).toBe(false)
    expect(state.billingPeriod).toBe('monthly')
    expect(state.expiresAt).toBe(new Date(NOW.getTime() + 30 * DAY).toISOString())
  })

  it('monthly renewal menumpuk dari expiry lama: max(now, expiry) + 30 hari', () => {
    const future = new Date(NOW.getTime() + 10 * DAY).toISOString()
    const state = resolveSubscriptionAfterPurchase({
      purchasedTier: 'waras',
      period: 'monthly',
      now: NOW,
      existing: { tier: 'waras', isLifetime: false, expiresAt: future },
    })
    expect(state.expiresAt).toBe(new Date(NOW.getTime() + 40 * DAY).toISOString())
  })

  it('monthly setelah expired mulai dari sekarang (bukan menumpuk tanggal lampau)', () => {
    const past = new Date(NOW.getTime() - 10 * DAY).toISOString()
    const state = resolveSubscriptionAfterPurchase({
      purchasedTier: 'catet-aja',
      period: 'monthly',
      now: NOW,
      existing: { tier: 'sultan', isLifetime: false, expiresAt: past },
    })
    expect(state.tier).toBe('catet-aja')
    expect(state.expiresAt).toBe(new Date(NOW.getTime() + 30 * DAY).toISOString())
  })

  it('monthly boleh turun tier (tanpa refund sisa hari)', () => {
    const state = resolveSubscriptionAfterPurchase({
      purchasedTier: 'catet-aja',
      period: 'monthly',
      now: NOW,
      existing: {
        tier: 'sultan',
        isLifetime: false,
        expiresAt: new Date(NOW.getTime() + 5 * DAY).toISOString(),
      },
    })
    expect(state.tier).toBe('catet-aja')
    expect(state.isLifetime).toBe(false)
  })

  it('pembelian monthly saat lifetime TIDAK menurunkan akses', () => {
    const state = resolveSubscriptionAfterPurchase({
      purchasedTier: 'catet-aja',
      period: 'monthly',
      now: NOW,
      existing: { tier: 'sultan', isLifetime: true, expiresAt: null },
    })
    expect(state.tier).toBe('sultan')
    expect(state.isLifetime).toBe(true)
    expect(state.expiresAt).toBeNull()
    expect(state.billingPeriod).toBe('lifetime')
  })

  it('lifetime: is_lifetime true & expires_at null', () => {
    const state = resolveSubscriptionAfterPurchase({
      purchasedTier: 'waras',
      period: 'lifetime',
      now: NOW,
    })
    expect(state).toEqual({
      tier: 'waras',
      isLifetime: true,
      billingPeriod: 'lifetime',
      expiresAt: null,
    })
  })

  it('lifetime dari lifetime lebih rendah menaikkan tier; dari lebih tinggi tidak menurunkan', () => {
    expect(
      resolveSubscriptionAfterPurchase({
        purchasedTier: 'sultan',
        period: 'lifetime',
        now: NOW,
        existing: { tier: 'catet-aja', isLifetime: true, expiresAt: null },
      }).tier,
    ).toBe('sultan')
    expect(
      resolveSubscriptionAfterPurchase({
        purchasedTier: 'catet-aja',
        period: 'lifetime',
        now: NOW,
        existing: { tier: 'sultan', isLifetime: true, expiresAt: null },
      }).tier,
    ).toBe('sultan')
  })

  it('lifetime dari monthly memakai tier yang dibeli (boleh turun tier monthly)', () => {
    const state = resolveSubscriptionAfterPurchase({
      purchasedTier: 'catet-aja',
      period: 'lifetime',
      now: NOW,
      existing: { tier: 'sultan', isLifetime: false, expiresAt: null },
    })
    expect(state.tier).toBe('catet-aja')
    expect(state.isLifetime).toBe(true)
    expect(state.expiresAt).toBeNull()
  })
})

})
