import { describe, expect, it } from 'vitest'
import { readUpdatedAt, shouldAdoptRemote, withUpdatedAt } from './prefs-sync'
import { DEFAULT_NOTIF_PREFS, NOTIF_PREF_IDS, readNotifPrefs } from './notification-prefs'

/* ── PREFERENSI KECIL: ATURAN ADOPSI LINTAS PERANGKAT ────────────────────────
   `ai_prefs` & `notif_prefs` disimpan sebagai jsonb ber-`updatedAt` di
   `user_settings`. Yang dikunci di sini adalah aturan yang membuat dua perangkat
   tidak saling menghapus pilihan:

     · perangkat yang belum punya nilai → mengadopsi server;
     · server lebih baru → menang;
     · server lebih lama → DIABAIKAN (jangan memutar balik pilihan user);
     · payload server tanpa `updatedAt` (mis. hasil migrasi) → TIDAK PERNAH
       menimpa perangkat — lebih baik mempertahankan pilihan yang terlihat user
       daripada menggantinya dengan data yang tidak punya bukti waktu. */

describe('readUpdatedAt', () => {
  it('membaca stempel waktu yang sah, selain itu 0', () => {
    expect(readUpdatedAt({ updatedAt: 1_700_000_000_000 })).toBe(1_700_000_000_000)
    expect(readUpdatedAt({ updatedAt: 'kemarin' })).toBe(0)
    expect(readUpdatedAt({ updatedAt: -5 })).toBe(0)
    expect(readUpdatedAt(null)).toBe(0)
    expect(readUpdatedAt({})).toBe(0)
  })
})

describe('withUpdatedAt', () => {
  it('menambahkan stempel waktu tanpa mengubah nilai aslinya', () => {
    const payload = withUpdatedAt({ autoCategory: false }, 123)
    expect(payload).toEqual({ autoCategory: false, updatedAt: 123 })
  })
})

describe('shouldAdoptRemote', () => {
  const remote = (updatedAt: number) => ({ autoCategory: false, updatedAt })
  const local = JSON.stringify({ autoCategory: true, updatedAt: 1_000 })

  it('perangkat baru (belum ada nilai lokal) mengadopsi server', () => {
    expect(shouldAdoptRemote(remote(1_000), null)).toBe(true)
  })

  it('server yang lebih baru menang', () => {
    expect(shouldAdoptRemote(remote(2_000), local)).toBe(true)
  })

  it('server yang lebih lama / sama DIABAIKAN (tidak memutar balik pilihan)', () => {
    expect(shouldAdoptRemote(remote(500), local)).toBe(false)
    expect(shouldAdoptRemote(remote(1_000), local)).toBe(false)
  })

  it('payload server tanpa updatedAt tidak pernah menimpa perangkat', () => {
    expect(shouldAdoptRemote({ autoCategory: false }, local)).toBe(false)
    expect(shouldAdoptRemote({ autoCategory: false }, null)).toBe(false)
    expect(shouldAdoptRemote(null, local)).toBe(false)
  })

  it('JSON lokal rusak diperlakukan sebagai tanpa-stempel → server baru diadopsi', () => {
    expect(shouldAdoptRemote(remote(10), 'bukan json')).toBe(true)
  })
})

describe('preferensi notifikasi (default & id kanon)', () => {
  it('tanpa window (test/SSR) nilai default dipakai — semua menyala', () => {
    const prefs = readNotifPrefs()
    for (const id of NOTIF_PREF_IDS) expect(prefs[id]).toBe(true)
  })

  it('daftar id sama dengan kunci default (tidak ada saklar yatim)', () => {
    expect(Object.keys(DEFAULT_NOTIF_PREFS).sort()).toEqual([...NOTIF_PREF_IDS].sort())
    expect(NOTIF_PREF_IDS).toHaveLength(6)
  })
})
