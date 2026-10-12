import { describe, expect, it } from 'vitest'
import {
  PALETTE_GROUPS,
  PALETTE_LAYERS,
  PALETTE_MEANINGS,
  PALETTE_PAGE_COPY,
} from './palette'

/* ── Test HALAMAN REVIEW PALET (/palette) ────────────────────────────────────
   Yang dikunci di sini bukan angka bisnis, melainkan JANJI data halaman review:
   lapisnya lengkap (10 kanon · 11 alias · 14 turunan), tiap entri punya kelas
   token yang benar-benar literal (bukan dirakit) + hex yang valid, dan arti
   warna tidak hilang. Kelas harus literal supaya scanner Tailwind melihatnya;
   hex harus `#rrggbb` 6 digit supaya cocok dengan penjaga palet. */

const HEX = /^#[0-9a-f]{6}$/

/** 10 hex palet kanon — harus ada di grup pertama, apa pun urutannya */
const CANON_HEXES = [
  '#000000',
  '#45594e',
  '#fbf6d9',
  '#ebe4de',
  '#b89191',
  '#b5b987',
  '#91a0b8',
  '#91bb9e',
  '#ffb885',
  '#ecd768',
]

describe('PALETTE_GROUPS — arsitektur tampil lengkap', () => {
  it('lima lapis dengan jumlah warna yang dikunci', () => {
    expect(PALETTE_GROUPS.map((group) => group.id)).toEqual([
      'kanon',
      'alias',
      'turunan',
      'netral',
      'grafik',
    ])
    expect(PALETTE_GROUPS.map((group) => group.entries.length)).toEqual([10, 11, 14, 1, 5])
  })

  it('grup kanon memuat PERSIS sepuluh hex palet kanon', () => {
    const canon = PALETTE_GROUPS.find((group) => group.id === 'kanon')
    expect(canon).toBeDefined()
    expect([...canon!.entries.map((entry) => entry.hex)].sort()).toEqual([...CANON_HEXES].sort())
  })

  it('palet "Sage" memakai kelas `bg-leaf` (bukan bg-sage yang kini Oat)', () => {
    const canon = PALETTE_GROUPS.find((group) => group.id === 'kanon')!
    const sage = canon.entries.find((entry) => entry.name === 'Sage')
    expect(sage?.swatchClass).toBe('bg-leaf')
    expect(sage?.hex).toBe('#91bb9e')
  })

  it('setiap entri: nama unik, kelas token literal, hex valid, ada keterangan', () => {
    const names = new Set<string>()
    for (const group of PALETTE_GROUPS) {
      for (const entry of group.entries) {
        expect(names.has(entry.name)).toBe(false)
        names.add(entry.name)
        expect(entry.hex).toMatch(HEX)
        /* kelas latar = token nyata, bukan kelas arbitrer `bg-[#…]` */
        expect(entry.swatchClass.startsWith('bg-')).toBe(true)
        expect(entry.swatchClass.includes('[')).toBe(false)
        /* aturan kontras: aksen terang = text-ink, evergreen/hitam = text-cream */
        expect(['text-ink', 'text-cream']).toContain(entry.onClass)
        expect(entry.note.trim().length).toBeGreaterThan(0)
      }
    }
  })
})

describe('PALETTE_MEANINGS & PALETTE_LAYERS — konteks tidak hilang', () => {
  it('enam arti warna, tiap titik swatch memakai token', () => {
    expect(PALETTE_MEANINGS).toHaveLength(6)
    for (const meaning of PALETTE_MEANINGS) {
      expect(meaning.dotClass.startsWith('bg-')).toBe(true)
      expect(meaning.hex).toMatch(HEX)
      expect(meaning.note.trim().length).toBeGreaterThan(0)
    }
  })

  it('tiga lapis arsitektur dengan judul & isi', () => {
    expect(PALETTE_LAYERS).toHaveLength(3)
    for (const layer of PALETTE_LAYERS) {
      expect(layer.step.trim().length).toBeGreaterThan(0)
      expect(layer.title.trim().length).toBeGreaterThan(0)
      expect(layer.body.trim().length).toBeGreaterThan(0)
    }
  })

  it('copy halaman lengkap (judul + hitungan)', () => {
    expect(PALETTE_PAGE_COPY.title.trim().length).toBeGreaterThan(0)
    expect(PALETTE_PAGE_COPY.countLabel(7)).toContain('7')
  })
})
