import { describe, expect, it } from 'vitest'
import { formatIDR, PLANS } from './pricing'
import {
  capabilityUpgradeOffer,
  nextTier,
  upgradeAmount,
  upgradeBannerCopy,
  upgradeHighlights,
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
  it('selisih lifetime, bukan harga penuh', () => {
    expect(upgradeAmount(WARAS, 'catet-aja', true)).toBe(20_000)
    expect(upgradeAmount(SULTAN, 'waras', true)).toBe(170_000)
    expect(upgradeAmount(SULTAN, 'catet-aja', true)).toBe(190_000)
  })

  it('dari paket monthly → harga lifetime penuh', () => {
    expect(upgradeAmount(WARAS, 'catet-aja', false)).toBe(129_000)
  })
})

describe('capabilityUpgradeOffer() — teks CTA & tautan dari satu sumber', () => {
  it('paket pembuka + selisih + tautan lifetime', () => {
    const offer = capabilityUpgradeOffer('ai-chat', 'catet-aja', true)
    expect(offer.target.id).toBe('waras')
    expect(offer.amount).toBe(20_000)
    expect(offer.href).toBe('/checkout/bayar?plan=waras&period=lifetime&upgrade=1&dari=catet-aja')
  })

  it('kemampuan yang hanya ada di Sultan menunjuk selisih yang benar', () => {
    expect(capabilityUpgradeOffer('ai-unlimited', 'waras', true).amount).toBe(170_000)
    expect(capabilityUpgradeOffer('priority-support', 'catet-aja', true).amount).toBe(190_000)
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

  it('lifetime lebih rendah → menyebut paket berikutnya + selisihnya', () => {
    const copy = upgradeBannerCopy('catet-aja', formatIDR, true)
    expect(copy?.title).toContain('Paket Waras')
    expect(copy?.body).toContain(formatIDR(20_000))
    expect(copy?.body).toContain('AI Coach')
    expect(copy?.body).not.toContain('{')
  })

  it('dari monthly → menyebut harga lifetime penuh', () => {
    const copy = upgradeBannerCopy('catet-aja', formatIDR, false)
    expect(copy?.body).toContain(formatIDR(129_000))
  })

  it('di tier tertinggi → tidak ada yang ditampilkan', () => {
    expect(upgradeBannerCopy('sultan', formatIDR, true)).toBeNull()
  })

  it('memakai format nominal dari pemanggil (satu gaya di seluruh app)', () => {
    const copy = upgradeBannerCopy('waras', (value) => `Rp${value}`, true)
    expect(copy?.body).toContain('Rp170000')
    expect(copy?.body).not.toContain('{')
  })
})

describe('upgradeHighlights()', () => {
  it('hanya menyebut kemampuan yang BELUM dimiliki paket sekarang', () => {
    const waras = PLANS.find((plan) => plan.id === 'waras')!
    const highlights = upgradeHighlights('catet-aja', waras, 10)
    expect(highlights).toContain('AI Coach (chat)')
    expect(highlights).toContain('Scan struk')
    expect(highlights).toContain('Kalender Cashflow')
    expect(highlights).toContain('Kekayaan & Hutang')
    expect(highlights).not.toContain('AI tanpa batas')
  })

  it('membatasi daftar dengan penanda sisa', () => {
    const waras = PLANS.find((plan) => plan.id === 'waras')!
    const highlights = upgradeHighlights('catet-aja', waras, 3)
    expect(highlights).toHaveLength(4)
    expect(highlights.at(-1)).toMatch(/^\+\d+ lainnya$/)
  })

  it('paket yang lebih tinggi tidak mengklaim fitur yang sudah dimiliki', () => {
    const sultan = PLANS.find((plan) => plan.id === 'sultan')!
    expect(upgradeHighlights('waras', sultan, 10)).toEqual([
      'AI tanpa batas',
      'Priority support',
    ])
  })
})
