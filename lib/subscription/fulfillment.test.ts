import { describe, expect, it } from 'vitest'
import { rankOf, PLANS } from '@/lib/data/pricing'
import { isAmountMismatch, resolvedTier, tierRank } from './fulfillment'

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
})
