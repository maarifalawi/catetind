import { afterEach, describe, expect, it } from 'vitest'
import {
  addPhysicalAsset,
  deletePhysicalAsset,
  editPhysicalAsset,
  getPhysicalSnapshot,
  livePhysicalAssets,
  purgePhysicalStore,
  resetPhysicalStore,
  restorePhysicalAsset,
} from './physical-store'

/* Store aset fisik diuji tanpa IndexedDB (jsdom/env test tidak menyediakannya →
   jalur memory). Yang diperiksa: validasi, tombstone, Undo, dan purge akun. */

afterEach(() => resetPhysicalStore())

describe('lib/money/physical-store', () => {
  it('menolak aset tanpa nama atau nilai sekarang 0', () => {
    expect(addPhysicalAsset({ name: '  ', category: 'rumah', purchasePrice: 0, currentValue: 100 })).toBeNull()
    expect(addPhysicalAsset({ name: 'Rumah', category: 'rumah', purchasePrice: 0, currentValue: 0 })).toBeNull()
  })

  it('menambah aset dan menyaringnya lewat livePhysicalAssets', () => {
    const created = addPhysicalAsset({
      name: 'Rumah Depok',
      category: 'rumah',
      purchasePrice: 650_000_000,
      currentValue: 720_000_000,
    })
    expect(created).not.toBeNull()
    expect(livePhysicalAssets(getPhysicalSnapshot()).some((a) => a.name === 'Rumah Depok')).toBe(true)
  })

  it('edit mengubah nilai; hapus memakai tombstone; Undo memulihkan', () => {
    const created = addPhysicalAsset({
      name: 'Motor',
      category: 'kendaraan',
      purchasePrice: 24_000_000,
      currentValue: 15_000_000,
    })!
    editPhysicalAsset(created.id, { currentValue: 16_500_000 })
    expect(getPhysicalSnapshot().assets.find((a) => a.id === created.id)?.currentValue).toBe(16_500_000)

    expect(deletePhysicalAsset(created.id)).not.toBeNull()
    expect(livePhysicalAssets(getPhysicalSnapshot()).some((a) => a.id === created.id)).toBe(false)

    expect(restorePhysicalAsset(created.id)).not.toBeNull()
    expect(livePhysicalAssets(getPhysicalSnapshot()).some((a) => a.id === created.id)).toBe(true)
  })

  it('purge akun mengosongkan daftar (data contoh tidak kembali)', () => {
    purgePhysicalStore()
    expect(getPhysicalSnapshot().assets).toHaveLength(0)
  })
})
