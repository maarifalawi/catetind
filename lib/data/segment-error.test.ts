import { describe, expect, it } from 'vitest'
import {
  SEGMENT_ERROR_ACTIONS,
  SEGMENT_ERROR_COPY,
  STALE_ASSET_RELOAD_GUARD_KEY,
  STALE_ASSET_RELOAD_WINDOW_MS,
  isStaleAssetError,
  type SegmentErrorArea,
} from './segment-error'

/* ── LAYAR ERROR PER SEGMEN ───────────────────────────────────────────────────
   Yang dikunci di sini adalah pembeda yang paling mahal kalau salah:
   "gagal MEMUAT BERKAS" (chunk hilang setelah deploy / jaringan putus) vs
   "gagal MERENDER komponen".

   Untuk yang pertama, `reset()` tidak akan pernah berhasil — ia meminta chunk
   dengan URL lama yang sudah 404. Itulah sebabnya layar error di `/checkout`
   dulu terasa "nyangkut" walau tombol "Muat ulang" ditekan berkali-kali. */

const AREAS: SegmentErrorArea[] = ['app', 'wallet', 'wealth', 'history', 'joint', 'budget']

describe('copy layar error segmen', () => {
  it('setiap area punya copy lengkap dan tidak kosong', () => {
    for (const area of AREAS) {
      const copy = SEGMENT_ERROR_COPY[area]
      expect(copy, area).toBeTruthy()
      for (const field of ['eyebrow', 'title', 'body', 'safeSummary', 'safeBody'] as const) {
        expect(copy[field].trim(), `${area}.${field}`).not.toBe('')
      }
    }
  })

  it('tidak menyebut istilah teknis di baris yang selalu tampak', () => {
    for (const area of AREAS) {
      const copy = SEGMENT_ERROR_COPY[area]
      expect(copy.title + ' ' + copy.body + ' ' + copy.safeSummary, area).not.toMatch(
        /chunk|indexeddb|json|stack|undefined|null/i,
      )
    }
  })

  it('tombol & petunjuk aksi tetap satu sumber', () => {
    expect(SEGMENT_ERROR_ACTIONS.reloadLabel).toBe('Muat ulang')
    expect(SEGMENT_ERROR_ACTIONS.homeLabel).toBe('Ke beranda')
    expect(SEGMENT_ERROR_ACTIONS.exportLabel).toBe('Unduh data saya')
  })
})

describe('isStaleAssetError()', () => {
  it('mengenali ChunkLoadError dari Next/Turbopack', () => {
    const error = Object.assign(new Error('Failed to load chunk /_next/static/chunks/2kb7yxp5g3pbv.js from module 781997'), {
      name: 'ChunkLoadError',
    })
    expect(isStaleAssetError(error)).toBe(true)
  })

  it('mengenali pesan khas dynamic import yang gagal (webpack/browser)', () => {
    const cases = [
      new Error('Loading chunk 1234 failed.'),
      new Error('Failed to fetch dynamically imported module: https://catetind.com/_next/static/chunks/a.js'),
      new Error('error loading dynamically imported module'),
      new Error('Importing a module script failed.'),
    ]
    for (const error of cases) expect(isStaleAssetError(error), error.message).toBe(true)
  })

  it('tidak menyala untuk error render biasa — kasus itu cukup `reset()`', () => {
    const cases = [
      new Error("Cannot read properties of undefined (reading 'length')"),
      new TypeError('x is not a function'),
      new Error('Halaman ini berhenti di tengah jalan'),
    ]
    for (const error of cases) expect(isStaleAssetError(error), error.message).toBe(false)
  })

  it('aman untuk nilai yang bukan Error', () => {
    expect(isStaleAssetError(null)).toBe(false)
    expect(isStaleAssetError(undefined)).toBe(false)
    expect(isStaleAssetError('ChunkLoadError')).toBe(false)
    expect(isStaleAssetError({})).toBe(false)
  })

  it('penjaga reload otomatis punya kunci & jendela waktu yang wajar', () => {
    expect(STALE_ASSET_RELOAD_GUARD_KEY).toContain('catetind')
    expect(STALE_ASSET_RELOAD_WINDOW_MS).toBeGreaterThanOrEqual(5_000)
    expect(STALE_ASSET_RELOAD_WINDOW_MS).toBeLessThanOrEqual(60_000)
  })
})
