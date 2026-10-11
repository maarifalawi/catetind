import { describe, expect, it } from 'vitest'
import { formatIDR, PLANS } from './pricing'
import {
  capabilityUpgradeOffer,
  nextTier,
  upgradeAmount,
  upgradeBannerCopy,
  upgradeTargets,
} from './upgrade'

/* ── AJAKAN UPGRADE (paket 84) ───────────────────────────────────────────────
   Yang dikunci di sini: naik tier selalu membawa SELISIH yang benar, dan user
   yang belum/tidak bisa diupgrade tidak diberi janji palsu. */

const [CATET_AJA, WARAS, SULTAN] = PLANS

describe('nextTier() / upgradeTargets()', () => {
  it('naik satu tingkat dari paket yang dimiliki', () => {
    expect(nextTier('catet-aja')?.id).toBe('waras')
    expect(nextTier('waras')?.id).toBe('sultan')
    expect(nextTier('sultan')).toBeNull()
  })

  it('belum punya paket → target termurah', () => {
    expect(nextTier(null)?.id).toBe('catet-aja')
    expect(upgradeTargets(null).map((plan) => plan.id)).toEqual(['catet-aja', 'waras', 'sultan'])
  })

  it('target selalu lebih tinggi dari paket yang dimiliki (downgrade tidak ada)', () => {
    expect(upgradeTargets('catet-aja').map((plan) => plan.id)).toEqual(['waras', 'sultan'])
    expect(upgradeTargets('waras').map((plan) => plan.id)).toEqual(['sultan'])
    expect(upgradeTargets('sultan')).toEqual([])
  })

  it('target diurutkan dari yang termurah', () => {
    const prices = upgradeTargets('catet-aja').map((plan) => plan.lifetime)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })
})

describe('upgradeAmount()', () => {
  it('selisih, bukan harga penuh', () => {
    expect(upgradeAmount(WARAS, 'catet-aja')).toBe(20_000)
    expect(upgradeAmount(SULTAN, 'waras')).toBe(170_000)
    expect(upgradeAmount(SULTAN, 'catet-aja')).toBe(190_000)
  })
})

describe('capabilityUpgradeOffer() — teks CTA & tautan dari satu sumber', () => {
  it('paket pembuka + selisih + tautan', () => {
    const offer = capabilityUpgradeOffer('ai-chat', 'catet-aja')
    expect(offer.target.id).toBe('waras')
    expect(offer.amount).toBe(20_000)
    expect(offer.href).toBe('/checkout/bayar?plan=waras&upgrade=1&dari=catet-aja')
  })

  it('kemampuan yang hanya ada di Sultan menunjuk selisih yang benar', () => {
    expect(capabilityUpgradeOffer('ai-unlimited', 'waras').amount).toBe(170_000)
    expect(capabilityUpgradeOffer('priority-support', 'catet-aja').amount).toBe(190_000)
  })

  it('belum punya paket → harga penuh paket pembukanya', () => {
    expect(capabilityUpgradeOffer('ai-chat', null).amount).toBe(129_000)
  })
})

describe('upgradeBannerCopy()', () => {
  it('belum pernah beli → ajakan memilih paket', () => {
    const copy = upgradeBannerCopy(null, formatIDR)
    expect(copy?.title).toBe('Pilih paket buat mulai catat')
    expect(copy?.cta).toBe('Pilih paket')
  })

  it('sudah beli tapi belum di puncak → menyebut paket berikutnya + selisihnya', () => {
    const copy = upgradeBannerCopy('catet-aja', formatIDR)
    expect(copy?.title).toContain('Paket Waras')
    expect(copy?.body).toContain(formatIDR(20_000))
  })

  it('di tier tertinggi → tidak ada yang ditampilkan', () => {
    expect(upgradeBannerCopy('sultan', formatIDR)).toBeNull()
  })

  it('memakai format nominal dari pemanggil (satu gaya di seluruh app)', () => {
    const copy = upgradeBannerCopy('waras', (value) => `Rp${value}`)
    expect(copy?.body).toContain('Rp170000')
  })
})
