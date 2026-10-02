import { describe, expect, it } from 'vitest'
import {
  CATEGORY_PREFS_COPY,
  DEFAULT_CATEGORIES,
  INITIAL_CUSTOM,
  isRemovableCategory,
  removeCategory,
  restoreCategory,
  type CategoryPrefs,
} from './category-prefs'

/* ── Test preferensi kategori (paket 62) ──────────────────────────────────────
   Yang dijaga di sini bukan "ada tombol hapus", tapi janji perilakunya:

     1. kategori BAWAAN tidak bisa dihapus (hanya disembunyikan) — alasan yang
        dipakai di UI memang benar, jadi tidak boleh bocor jadi bisa dihapus;
     2. hapus yang gagal TIDAK mengubah apa pun (bukan "hapus sebagian");
     3. Undo mengembalikan kategori DI POSISI SEMULA (bukan menempel di akhir);
     4. Undo berulang tidak menggandakan kategori (idempoten);
     5. copy konfirmasinya jujur: menyebut apa yang tidak ikut berubah. */

function prefs(overrides: Partial<CategoryPrefs> = {}): CategoryPrefs {
  return { hidden: [], custom: [...INITIAL_CUSTOM], ...overrides }
}

describe('removeCategory', () => {
  it('mengeluarkan kategori kustom dari daftar tanpa menyentuh yang lain', () => {
    const result = removeCategory(prefs(), 'custom-1')

    expect(result.removed?.item.name).toBe('Top Up Game')
    expect(result.removed?.index).toBe(0)
    expect(result.prefs.custom.map((item) => item.id)).toEqual(['custom-2'])
    /* urutan yang tersisa TIDAK berubah */
    expect(result.prefs.custom[0].name).toBe('Kopi Harian')
  })

  it('menolak hapus kategori BAWAAN dan tidak mengubah apa pun', () => {
    const before = prefs()
    const result = removeCategory(before, DEFAULT_CATEGORIES[0].id)

    expect(result.removed).toBeNull()
    expect(result.prefs).toBe(before)
    expect(isRemovableCategory(DEFAULT_CATEGORIES[0].id)).toBe(false)
    expect(isRemovableCategory('custom-1')).toBe(true)
  })

  it('id yang tidak ada → tidak ada yang dihapus (prefs dikembalikan apa adanya)', () => {
    const before = prefs()
    const result = removeCategory(before, 'custom-tidak-ada')

    expect(result.removed).toBeNull()
    expect(result.prefs.custom).toHaveLength(INITIAL_CUSTOM.length)
  })

  it('kategori yang disembunyikan (bawaan) tidak ikut terpengaruh', () => {
    const result = removeCategory(prefs({ hidden: ['makanan'] }), 'custom-2')
    expect(result.prefs.hidden).toEqual(['makanan'])
  })
})

describe('restoreCategory', () => {
  it('mengembalikan kategori di POSISI SEMULA', () => {
    const removed = removeCategory(prefs(), 'custom-1').removed!
    const after = removeCategory(prefs(), 'custom-1').prefs

    const restored = restoreCategory(after, removed)

    expect(restored.custom.map((item) => item.id)).toEqual(
      INITIAL_CUSTOM.map((item) => item.id),
    )
    expect(restored.custom[0].emoji).toBe('🎮')
  })

  it('idempoten: Undo dua kali tidak menggandakan kategori', () => {
    const first = removeCategory(prefs(), 'custom-2')
    const once = restoreCategory(first.prefs, first.removed!)
    const twice = restoreCategory(once, first.removed!)

    expect(twice.custom.filter((item) => item.id === 'custom-2')).toHaveLength(1)
    expect(twice).toEqual(once)
  })

  it('index yang melebihi panjang daftar tetap aman (ditempel di akhir)', () => {
    const restored = restoreCategory(
      { hidden: [], custom: [] },
      { item: { id: 'custom-9', emoji: '🐾', name: 'Kucing' }, index: 99 },
    )
    expect(restored.custom).toEqual([{ id: 'custom-9', emoji: '🐾', name: 'Kucing' }])
  })
})

describe('copy hapus kategori', () => {
  it('menyebut apa yang TIDAK ikut berubah (catatan lama) dan jendela Undo', () => {
    const body = CATEGORY_PREFS_COPY.deleteBody('Kopi Harian')
    expect(body).toMatch(/Kopi Harian/)
    expect(body).toMatch(/Catatan yang sudah kamu simpan tidak ikut berubah/)
    expect(CATEGORY_PREFS_COPY.deleteSafety(5)).toMatch(/Undo selama 5 detik/)
    expect(CATEGORY_PREFS_COPY.deleteConfirm).toBe('Hapus')
  })

  it('menjelaskan alasan kategori bawaan tidak bisa dihapus (temuan audit #10)', () => {
    const explain = CATEGORY_PREFS_COPY.defaultExplain(DEFAULT_CATEGORIES.length)
    expect(explain).toMatch(/nggak bisa dihapus/)
    expect(explain).toMatch(/sembunyikan/)
  })

  it('tidak lagi menjanjikan hal yang tidak terjadi (kategori ikut ke form catat)', () => {
    /* kalimat lama: "Atur kategori apa saja yang muncul saat kamu mencatat transaksi" */
    expect(CATEGORY_PREFS_COPY.desc).not.toMatch(/muncul saat kamu mencatat/)
    expect(CATEGORY_PREFS_COPY.storageNote).toMatch(/masih memakai daftar baku app/)
  })
})
