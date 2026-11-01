import { describe, expect, it } from 'vitest'
import {
  AVATAR_MAX_BYTES,
  AVATAR_SIZE,
  estimateDataUrlBytes,
  isAvatarDataUrl,
} from './avatar'
import { encodeSessionCookieValue, type SupabaseSession } from './supabase/session-cookie'

/* ── FOTO PROFIL: UKURAN & KESELAMATAN COOKIE ────────────────────────────────
   Dua batas yang tidak boleh dilanggar:

     1. avatar ≤ 20 KB (hasil kompres klien) — kalau lebih, database penuh
        gambar besar dan setiap render memuatnya;
     2. avatar TIDAK PERNAH masuk cookie sesi. Cookie yang membengkak membuat
        request ditolak `431 Request Header Fields Too Large`, dan gejalanya
        akan terlihat seperti "kehilangan sesi" di perangkat tertentu saja. */

/** data URL gambar tiruan dengan ukuran biner tertentu (base64 4/3) */
function fakeImage(bytes: number): string {
  const base64 = 'A'.repeat(Math.ceil((bytes * 4) / 3))
  return `data:image/webp;base64,${base64}`
}

describe('estimateDataUrlBytes', () => {
  it('menghitung ukuran biner dari base64 (bukan panjang string)', () => {
    const dataUrl = fakeImage(3000)
    const bytes = estimateDataUrlBytes(dataUrl)
    expect(bytes).toBeGreaterThan(2900)
    expect(bytes).toBeLessThanOrEqual(3000 + 4)
  })

  it('data URL kosong dihitung 0', () => {
    expect(estimateDataUrlBytes('')).toBe(0)
    expect(estimateDataUrlBytes('data:image/webp;base64,')).toBe(0)
  })
})

describe('isAvatarDataUrl', () => {
  it('menerima gambar kecil di bawah batas 20 KB', () => {
    expect(isAvatarDataUrl(fakeImage(10 * 1024))).toBe(true)
  })

  it('menolak gambar yang lebih besar dari 20 KB', () => {
    expect(isAvatarDataUrl(fakeImage(AVATAR_MAX_BYTES + 2048))).toBe(false)
  })

  it('menolak bentuk yang bukan data URL gambar', () => {
    expect(isAvatarDataUrl('https://contoh.test/foto.png')).toBe(false)
    expect(isAvatarDataUrl('data:text/html;base64,PHNjcmlwdD4=')).toBe(false)
    expect(isAvatarDataUrl(null)).toBe(false)
  })

  it('avatar 160×160 adalah ukuran bingkai yang dipakai kompresi', () => {
    expect(AVATAR_SIZE).toBe(160)
  })
})

describe('cookie sesi tetap kecil (avatar tidak pernah ikut)', () => {
  it('nilai cookie untuk sesi nyata < 4096 byte dan tidak memuat gambar', () => {
    const session: SupabaseSession = {
      userId: '1a4eefd2-d364-4196-9831-ddfeed588f88',
      email: 'shiimaify@gmail.com',
      name: 'Rina Putri',
      accessToken: 'x'.repeat(900),
      refreshToken: 'y'.repeat(120),
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    }
    const cookie = encodeSessionCookieValue(session)
    expect(cookie.length).toBeLessThan(4096)
    expect(cookie).not.toContain('data:image')
    /* bahkan avatar 20 KB (base64 ± 27 KB) tidak bisa masuk cookie */
    expect(cookie.length).toBeLessThan(estimateDataUrlBytes(fakeImage(AVATAR_MAX_BYTES)))
  })
})
