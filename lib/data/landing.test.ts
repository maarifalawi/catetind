import { describe, expect, it } from 'vitest'
import { PLANS } from './pricing'
import {
  LIVE_FEED_SEED,
  LIVE_FEED_VISIBLE,
  liveFeedFromPurchases,
  relativeFeedTime,
} from './landing'

/* ── FEED PEMBELIAN NYATA (paket 85) ─────────────────────────────────────────
   Logika murni yang mengubah jawaban `/api/pricing/recent-purchases` menjadi
   baris feed. Yang dikunci: seed memakai harga KANON `PLANS`, waktu relatif
   dihitung dari waktu server, dan nilai yang tidak jelas TIDAK dikarang. */

const NOW = Date.parse('2026-10-11T12:00:00.000Z')

describe('relativeFeedTime()', () => {
  it('menerjemahkan jarak waktu ke label Indonesia', () => {
    expect(relativeFeedTime('2026-10-11T11:59:40.000Z', NOW)).toBe('baru saja')
    expect(relativeFeedTime('2026-10-11T11:55:00.000Z', NOW)).toBe('5 menit lalu')
    expect(relativeFeedTime('2026-10-11T09:00:00.000Z', NOW)).toBe('3 jam lalu')
    expect(relativeFeedTime('2026-10-09T12:00:00.000Z', NOW)).toBe('2 hari lalu')
  })

  it('tanggal tak terbaca → string kosong (bukan angka karangan)', () => {
    expect(relativeFeedTime('bukan-tanggal', NOW)).toBe('')
  })
})

describe('liveFeedFromPurchases()', () => {
  it('memetakan baris endpoint apa adanya', () => {
    const rows = liveFeedFromPurchases(
      [{ name: 'Rina', city: 'Jakarta', price: 129_000, at: '2026-10-11T11:55:00.000Z' }],
      NOW,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      name: 'Rina',
      city: 'Jakarta',
      price: 129_000,
      time: '5 menit lalu',
    })
  })

  it('nama/kota yang tidak jelas diberi nilai netral, bukan karangan', () => {
    const rows = liveFeedFromPurchases([{ price: 109_000 }], NOW)
    expect(rows[0].name).toBe('Seseorang')
    expect(rows[0].city).toBe('Indonesia')
    expect(rows[0].time).toBe('')
  })

  it('id tiap baris unik walau nama sama', () => {
    const rows = liveFeedFromPurchases(
      [{ name: 'Rina' }, { name: 'Rina' }],
      NOW,
    )
    expect(rows[0].id).not.toBe(rows[1].id)
  })

  it('daftar kosong → daftar kosong (bukan seed)', () => {
    expect(liveFeedFromPurchases([], NOW)).toEqual([])
  })
})

describe('LIVE_FEED_SEED — angka DIBACA dari PLANS', () => {
  it('setiap harga seed ada di daftar harga kanon', () => {
    const prices = PLANS.map((plan) => plan.lifetime)
    for (const entry of LIVE_FEED_SEED) {
      expect(prices).toContain(entry.price)
    }
    expect(LIVE_FEED_VISIBLE).toBeLessThanOrEqual(LIVE_FEED_SEED.length)
  })
})
