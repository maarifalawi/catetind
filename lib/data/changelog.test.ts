import { describe, expect, it } from 'vitest'
import { CHANGELOG_ENTRIES, CHANGELOG_META } from './changelog'

describe('CHANGELOG_ENTRIES', () => {
  it('memuat minimal tiga rilis dengan id & versi unik', () => {
    expect(CHANGELOG_ENTRIES.length).toBeGreaterThanOrEqual(3)
    expect(new Set(CHANGELOG_ENTRIES.map((entry) => entry.id)).size).toBe(
      CHANGELOG_ENTRIES.length,
    )
    expect(new Set(CHANGELOG_ENTRIES.map((entry) => entry.version)).size).toBe(
      CHANGELOG_ENTRIES.length,
    )
  })

  it('urut dari rilis terbaru ke terlama', () => {
    const dates = CHANGELOG_ENTRIES.map((entry) => Date.parse(entry.dateIso))
    const sorted = [...dates].sort((a, b) => b - a)
    expect(dates).toEqual(sorted)
  })

  it('setiap grup punya judul dan minimal satu item', () => {
    for (const entry of CHANGELOG_ENTRIES) {
      expect(entry.groups.length).toBeGreaterThan(0)
      for (const group of entry.groups) {
        expect(group.title.trim().length).toBeGreaterThan(0)
        expect(group.items.length).toBeGreaterThan(0)
      }
    }
  })

  it('tidak membawa sisa copy template (Makro/Stripe/QuickBooks)', () => {
    const serialized = JSON.stringify({ meta: CHANGELOG_META, entries: CHANGELOG_ENTRIES })
    for (const forbidden of ['Makro', 'Stripe', 'QuickBooks', 'Xero', 'invoice']) {
      expect(serialized.toLowerCase()).not.toContain(forbidden.toLowerCase())
    }
  })
})
