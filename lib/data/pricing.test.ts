import { describe, expect, it } from 'vitest'
import {
  ALL_CAPABILITIES,
  CHECKOUT_PATH,
  HERO_PLAN,
  PAY_PATH,
  PLANS,
  applyReferralDiscount,
  buildCheckoutHref,
  buildPayHref,
  buildUpgradeHref,
  canUse,
  capabilitiesOf,
  capabilityUnlockedBy,
  isDowngradeOrSame,
  isValidOfferAmount,
  lockedCapabilitiesFor,
  planById,
  priceFor,
  upgradeDiff,
} from './pricing'

/* ── HARGA & KEMAMPUAN (paket 84) ────────────────────────────────────────────
   File ini mengunci keputusan produk yang paling mahal kalau salah:
     · harga = AKSES SELAMANYA (109k / 129k / 299k), tanpa periode;
     · upgrade = SELISIH, dihitung dari `PLANS`;
     · kunci fitur = peta kemampuan, dibaca server DAN klien. */

const [CATET_AJA, WARAS, SULTAN] = PLANS

describe('katalog paket', () => {
  it('3 tier akses selamanya dengan harga kanon', () => {
    expect(PLANS.map((plan) => plan.id)).toEqual(['catet-aja', 'waras', 'sultan'])
    expect(CATET_AJA.lifetime).toBe(109_000)
    expect(WARAS.lifetime).toBe(129_000)
    expect(SULTAN.lifetime).toBe(299_000)
  })

  it('tidak ada lagi periode/langganan di bentuk data', () => {
    expect(PLANS.every((plan) => !('annual' in plan) && !('monthly' in plan))).toBe(true)
  })

  it('paket hero = tier tengah (rekomendasi produk)', () => {
    expect(HERO_PLAN.id).toBe('waras')
  })

  it('planById menerima id asing tanpa melempar', () => {
    expect(planById('entah-apa')).toBeNull()
    expect(planById(null)).toBeNull()
    expect(planById('sultan')?.name).toBe(SULTAN.name)
  })
})

describe('priceFor() — selisih upgrade dihitung dari PLANS', () => {
  it('pembelian pertama = harga penuh paket', () => {
    expect(priceFor(CATET_AJA, null)).toBe(109_000)
    expect(priceFor(WARAS, null)).toBe(129_000)
    expect(priceFor(SULTAN, null)).toBe(299_000)
  })

  it('109 → 129 = Rp20.000', () => {
    expect(priceFor(WARAS, 'catet-aja')).toBe(20_000)
  })

  it('129 → 299 = Rp170.000', () => {
    expect(priceFor(SULTAN, 'waras')).toBe(170_000)
  })

  it('109 → 299 = Rp190.000', () => {
    expect(priceFor(SULTAN, 'catet-aja')).toBe(190_000)
  })

  it('paket yang sama atau lebih rendah → 0 (tidak menagih, bukan refund)', () => {
    expect(priceFor(WARAS, 'waras')).toBe(0)
    expect(priceFor(CATET_AJA, 'waras')).toBe(0)
    expect(priceFor(CATET_AJA, 'sultan')).toBe(0)
  })

  it('upgradeDiff() = priceFor() target dari paket asal', () => {
    expect(upgradeDiff('catet-aja', 'waras')).toBe(20_000)
    expect(upgradeDiff('waras', 'sultan')).toBe(170_000)
    expect(upgradeDiff('catet-aja', 'sultan')).toBe(190_000)
    expect(upgradeDiff(null, 'catet-aja')).toBe(109_000)
    expect(upgradeDiff('sultan', 'waras')).toBe(0)
  })

  it('isDowngradeOrSame dipakai server untuk menolak target turun', () => {
    expect(isDowngradeOrSame(WARAS, 'waras')).toBe(true)
    expect(isDowngradeOrSame(CATET_AJA, 'waras')).toBe(true)
    expect(isDowngradeOrSame(SULTAN, 'waras')).toBe(false)
    expect(isDowngradeOrSame(WARAS, null)).toBe(false)
  })
})

describe('isValidOfferAmount() — nominal kiriman klien tidak dipercaya', () => {
  it('harga kanon & versi diskon teman diterima', () => {
    expect(isValidOfferAmount(WARAS, 129_000, null)).toBe(true)
    expect(isValidOfferAmount(WARAS, applyReferralDiscount(129_000), null)).toBe(true)
  })

  it('selisih upgrade diterima, harga penuh tidak', () => {
    expect(isValidOfferAmount(WARAS, 20_000, 'catet-aja')).toBe(true)
    expect(isValidOfferAmount(WARAS, 129_000, 'catet-aja')).toBe(false)
  })

  it('nominal karangan ditolak', () => {
    expect(isValidOfferAmount(WARAS, 1_000, null)).toBe(false)
  })
})

describe('capabilitiesOf() / canUse() — kunci fitur per tier', () => {
  it('tier 1 tidak punya AI sama sekali', () => {
    expect(capabilitiesOf('catet-aja')).toEqual([])
    expect(canUse('catet-aja', 'ai-chat')).toBe(false)
    expect(canUse('catet-aja', 'ocr')).toBe(false)
    expect(canUse('catet-aja', 'joint-wallet')).toBe(false)
  })

  it('tier 2 punya AI tapi BUKAN tanpa batas', () => {
    expect(canUse('waras', 'ai-chat')).toBe(true)
    expect(canUse('waras', 'ocr')).toBe(true)
    expect(canUse('waras', 'ai-report')).toBe(true)
    expect(canUse('waras', 'joint-wallet')).toBe(true)
    expect(canUse('waras', 'ai-unlimited')).toBe(false)
    expect(canUse('waras', 'priority-support')).toBe(false)
  })

  it('tier 3 punya semuanya', () => {
    for (const capability of ALL_CAPABILITIES) {
      expect(canUse('sultan', capability)).toBe(true)
    }
  })

  it('belum pernah beli = tidak ada kemampuan', () => {
    expect(capabilitiesOf(null)).toEqual([])
    expect(canUse(null, 'ai-chat')).toBe(false)
  })

  it('daftar kemampuan adalah salinan — mengubahnya tidak merusak peta kanon', () => {
    const list = capabilitiesOf('waras')
    list.push('ai-unlimited')
    expect(canUse('waras', 'ai-unlimited')).toBe(false)
  })

  it('paket pembuka tiap kemampuan ditentukan sekali di sini', () => {
    expect(capabilityUnlockedBy('ai-chat').id).toBe('waras')
    expect(capabilityUnlockedBy('ocr').id).toBe('waras')
    expect(capabilityUnlockedBy('ai-unlimited').id).toBe('sultan')
    expect(capabilityUnlockedBy('priority-support').id).toBe('sultan')
  })

  it('lockedCapabilitiesFor() = yang belum terbuka di paket itu', () => {
    expect(lockedCapabilitiesFor('catet-aja')).toHaveLength(ALL_CAPABILITIES.length)
    expect(lockedCapabilitiesFor('waras')).toEqual(['ai-unlimited', 'priority-support'])
    expect(lockedCapabilitiesFor('sultan')).toEqual([])
  })
})

describe('bentuk tautan (tanpa parameter periode lagi)', () => {
  it('buildPayHref()', () => {
    expect(buildPayHref('waras')).toBe(`${PAY_PATH}?plan=waras`)
    expect(buildPayHref('waras', 'RINA-X7K')).toBe(`${PAY_PATH}?plan=waras&kode=RINA-X7K`)
  })

  it('buildCheckoutHref()', () => {
    expect(buildCheckoutHref()).toBe(CHECKOUT_PATH)
    expect(buildCheckoutHref('sultan')).toBe(`${CHECKOUT_PATH}?plan=sultan`)
    expect(buildCheckoutHref('sultan', 'RINA-X7K')).toBe(
      `${CHECKOUT_PATH}?plan=sultan&kode=RINA-X7K`,
    )
  })

  it('buildUpgradeHref() menandai niat upgrade + asal paketnya', () => {
    expect(buildUpgradeHref('waras')).toBe(`${PAY_PATH}?plan=waras&upgrade=1`)
    expect(buildUpgradeHref('waras', 'catet-aja')).toBe(
      `${PAY_PATH}?plan=waras&upgrade=1&dari=catet-aja`,
    )
  })

  it('tidak ada satu pun tautan yang membawa `period`', () => {
    const hrefs = [buildPayHref('waras'), buildCheckoutHref('waras'), buildUpgradeHref('waras')]
    for (const href of hrefs) expect(href).not.toContain('period')
  })
})
