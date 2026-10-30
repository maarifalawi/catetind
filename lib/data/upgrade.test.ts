import { describe, expect, it } from 'vitest'
import { formatIDR, PLANS } from './pricing'
import {
  capabilityUpgradeOffer,
  expiredBannerCopy,
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

  it('lifetime lebih rendah → judul paket berikutnya + baris kedua berisi selisih', () => {
    const copy = upgradeBannerCopy('catet-aja', formatIDR, true)
    expect(copy?.title).toBe('Buka Semua Fitur Paket Waras')
    /* judul & keterangan adalah DUA blok terpisah, bukan satu kalimat inline */
    expect(copy?.title).not.toContain(formatIDR(20_000))
    expect(copy?.body).toContain('AI Coach')
    expect(copy?.body).toContain(formatIDR(20_000))
    /* sudah lifetime → nominalnya SELISIH, jadi "cukup tambah" itu benar */
    expect(copy?.body).toContain('Cukup tambah')
    expect(copy?.body).not.toContain('{')
  })

  it('tidak ada eyebrow di varian upgrade (dan di varian lain)', () => {
    const upgrade = upgradeBannerCopy('catet-aja', formatIDR, true)
    expect(upgrade).not.toBeNull()
    expect(Object.keys(upgrade ?? {})).not.toContain('eyebrow')
    expect(upgradeBannerCopy(null, formatIDR)).not.toHaveProperty('eyebrow')
  })

  it('dari paket 30 hari lama → yang ditulis HARGA PENUH, bukan "cukup tambah"', () => {
    const copy = upgradeBannerCopy('catet-aja', formatIDR, false)
    expect(copy?.body).toContain(formatIDR(129_000))
    expect(copy?.body).toContain('Harga akses selamanya')
    expect(copy?.body).not.toContain('Cukup tambah')
  })

  it('di tier tertinggi → tidak ada yang ditampilkan', () => {
    expect(upgradeBannerCopy('sultan', formatIDR, true)).toBeNull()
  })

  it('memakai format nominal dari pemanggil (satu gaya di seluruh app)', () => {
    const copy = upgradeBannerCopy('waras', (value) => `Rp${value}`, true)
    expect(copy?.title).toBe('Buka Semua Fitur Paket Sultan')
    expect(copy?.body).toContain('Rp170000')
    expect(copy?.body).toContain('AI tanpa batas')
    expect(copy?.body).not.toContain('{')
  })
})

describe('expiredBannerCopy()', () => {
  it('tidak menggandakan kata "Paket" dari nama paket', () => {
    const copy = expiredBannerCopy('Paket Waras')
    expect(copy.title).toBe('Paket Waras sudah berakhir, lanjut ke Lifetime')
    expect(copy.title).not.toContain('Paket Paket')
  })

  it('nama kosong tidak pernah tampil sebagai "undefined"', () => {
    expect(expiredBannerCopy('').title).toBe('Paket kamu sudah berakhir, lanjut ke Lifetime')
  })

  it('tidak punya eyebrow (judul + body saja)', () => {
    expect(expiredBannerCopy('Paket Waras')).not.toHaveProperty('eyebrow')
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
