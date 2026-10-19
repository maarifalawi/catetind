import { describe, expect, it } from 'vitest'
import {
  ALL_CAPABILITIES,
  CHECKOUT_PATH,
  HERO_PLAN,
  LIFETIME_LABEL,
  MONTHLY_DAYS,
  PAY_PATH,
  PERIOD_LABEL,
  PLANS,
  applyReferralDiscount,
  asBillingPeriod,
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

/* ── HARGA & KEMAMPUAN (akses selamanya) ─────────────────────────────────────
   File ini mengunci keputusan produk yang paling mahal kalau salah:
     · SATU periode yang dijual: lifetime 109k/129k/299k. Harga monthly yang
       tersisa hanya untuk membaca pembelian LAMA (bukan produk aktif);
     · `asBillingPeriod('monthly')` = null → server menolak 422;
     · lifetime dari lifetime lebih rendah = SELISIH; dari paket lama = penuh;
     · kunci fitur = peta kemampuan, dibaca server DAN klien. */

const [CATET_AJA, WARAS, SULTAN] = PLANS

describe('katalog paket', () => {
  it('3 tier dengan harga lifetime kanon', () => {
    expect(PLANS.map((plan) => plan.id)).toEqual(['catet-aja', 'waras', 'sultan'])
    expect(CATET_AJA.lifetime).toBe(109_000)
    expect(WARAS.lifetime).toBe(129_000)
    expect(SULTAN.lifetime).toBe(299_000)
    /* harga WARISAN: hanya untuk menampilkan pembelian lama, bukan dijual */
    expect(CATET_AJA.monthly).toBe(49_000)
    expect(WARAS.monthly).toBe(79_000)
    expect(SULTAN.monthly).toBe(199_000)
  })

  it('periode yang dijual hanya lifetime — monthly ditolak', () => {
    expect(MONTHLY_DAYS).toBe(30)
    expect(PERIOD_LABEL.monthly).toBe('per 30 hari')
    expect(PERIOD_LABEL.lifetime).toBe(LIFETIME_LABEL)
    expect(asBillingPeriod('lifetime')).toBe('lifetime')
    expect(asBillingPeriod('monthly')).toBeNull()
    expect(asBillingPeriod('annual')).toBeNull()
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

describe('priceFor() — harga per periode, dari PLANS', () => {
  it('monthly (WARISAN) = harga penuh monthly untuk membaca pembelian lama', () => {
    expect(priceFor(CATET_AJA, { period: 'monthly' })).toBe(49_000)
    expect(priceFor(WARAS, { period: 'monthly' })).toBe(79_000)
    expect(priceFor(SULTAN, { period: 'monthly' })).toBe(199_000)
    expect(
      priceFor(CATET_AJA, { period: 'monthly', ownedPlanId: 'sultan', ownedIsLifetime: false }),
    ).toBe(49_000)
    expect(
      priceFor(WARAS, { period: 'monthly', ownedPlanId: 'sultan', ownedIsLifetime: false }),
    ).toBe(79_000)
  })

  it('monthly (warisan) tidak dihitung saat user sudah lifetime (0)', () => {
    expect(
      priceFor(WARAS, { period: 'monthly', ownedPlanId: 'catet-aja', ownedIsLifetime: true }),
    ).toBe(0)
  })

  it('lifetime pembelian pertama = harga penuh', () => {
    expect(priceFor(CATET_AJA, { period: 'lifetime' })).toBe(109_000)
    expect(priceFor(WARAS, { period: 'lifetime' })).toBe(129_000)
    expect(priceFor(SULTAN, { period: 'lifetime' })).toBe(299_000)
  })

  it('lifetime dari monthly = harga penuh lifetime (bukan selisih)', () => {
    expect(
      priceFor(WARAS, { period: 'lifetime', ownedPlanId: 'catet-aja', ownedIsLifetime: false }),
    ).toBe(129_000)
  })

  it('lifetime dari lifetime lebih rendah = selisih', () => {
    expect(
      priceFor(WARAS, { period: 'lifetime', ownedPlanId: 'catet-aja', ownedIsLifetime: true }),
    ).toBe(20_000)
    expect(
      priceFor(SULTAN, { period: 'lifetime', ownedPlanId: 'waras', ownedIsLifetime: true }),
    ).toBe(170_000)
    expect(
      priceFor(SULTAN, { period: 'lifetime', ownedPlanId: 'catet-aja', ownedIsLifetime: true }),
    ).toBe(190_000)
  })

  it('lifetime dari lifetime sama/lebih tinggi → 0', () => {
    expect(
      priceFor(WARAS, { period: 'lifetime', ownedPlanId: 'waras', ownedIsLifetime: true }),
    ).toBe(0)
    expect(
      priceFor(CATET_AJA, { period: 'lifetime', ownedPlanId: 'waras', ownedIsLifetime: true }),
    ).toBe(0)
  })

  it('upgradeDiff() = priceFor() lifetime target dari paket asal lifetime', () => {
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
  it('harga lifetime diterima; versi diskon hanya sah bila kode terverifikasi', () => {
    expect(isValidOfferAmount(WARAS, 129_000, { period: 'lifetime' })).toBe(true)
    /* nominal 90% TANPA bukti kode = ditolak */
    expect(
      isValidOfferAmount(WARAS, applyReferralDiscount(129_000), { period: 'lifetime' }),
    ).toBe(false)
    expect(
      isValidOfferAmount(WARAS, applyReferralDiscount(129_000), { period: 'lifetime' }, {
        referral: true,
      }),
    ).toBe(true)
  })

  it('nominal asing tetap ditolak walau kode referral terverifikasi', () => {
    expect(
      isValidOfferAmount(WARAS, 1_000, { period: 'lifetime' }, { referral: true }),
    ).toBe(false)
  })

  it('harga lifetime penuh diterima; selisih lifetime hanya sah dari lifetime', () => {
    expect(isValidOfferAmount(WARAS, 129_000, { period: 'lifetime' })).toBe(true)
    expect(
      isValidOfferAmount(WARAS, 20_000, {
        period: 'lifetime',
        ownedPlanId: 'catet-aja',
        ownedIsLifetime: true,
      }),
    ).toBe(true)
    expect(
      isValidOfferAmount(WARAS, 20_000, {
        period: 'lifetime',
        ownedPlanId: 'catet-aja',
        ownedIsLifetime: false,
      }),
    ).toBe(false)
  })

  it('nominal karangan ditolak', () => {
    expect(isValidOfferAmount(WARAS, 1_000, { period: 'lifetime' })).toBe(false)
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

describe('bentuk tautan — periode selalu lifetime', () => {
  it('buildPayHref() default lifetime', () => {
    expect(buildPayHref('waras')).toBe(`${PAY_PATH}?plan=waras&period=lifetime`)
    expect(buildPayHref('waras', 'lifetime', 'RINA-X7K')).toBe(
      `${PAY_PATH}?plan=waras&period=lifetime&kode=RINA-X7K`,
    )
  })

  it('buildCheckoutHref() default lifetime', () => {
    expect(buildCheckoutHref()).toBe(`${CHECKOUT_PATH}?period=lifetime`)
    expect(buildCheckoutHref('sultan')).toBe(
      `${CHECKOUT_PATH}?period=lifetime&plan=sultan`,
    )
    expect(buildCheckoutHref('sultan', 'lifetime', 'RINA-X7K')).toBe(
      `${CHECKOUT_PATH}?period=lifetime&plan=sultan&kode=RINA-X7K`,
    )
  })

  it('buildUpgradeHref() menandai niat upgrade + periode lifetime', () => {
    expect(buildUpgradeHref('waras')).toBe(
      `${PAY_PATH}?plan=waras&period=lifetime&upgrade=1`,
    )
    expect(buildUpgradeHref('waras', 'catet-aja')).toBe(
      `${PAY_PATH}?plan=waras&period=lifetime&upgrade=1&dari=catet-aja`,
    )
  })

  it('setiap tautan pembelian hanya membawa period=lifetime', () => {
    const hrefs = [
      buildPayHref('waras'),
      buildCheckoutHref('waras'),
      buildUpgradeHref('waras', 'catet-aja', 'lifetime'),
    ]
    for (const href of hrefs) {
      expect(href).toContain('period=lifetime')
      expect(href).not.toContain('monthly')
      expect(href).not.toContain('annual')
    }
  })
})
