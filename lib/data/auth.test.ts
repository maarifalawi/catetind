import { describe, expect, it } from 'vitest'
import { OTP_LENGTH, isValidEmail, isValidNickname, isValidOtpCode } from './auth'

/* ── Validator alur akun (murni, tanpa React) ────────────────────────────────
   Menguji batas: yang harus DITERIMA jangan sampai ditolak (user asli jadi
   korban), dan yang jelas salah jangan lolos. Verifikasi sungguhan tetap
   dilakukan Supabase; ini cuma penjaga tombol supaya tidak bisa diberhentikan
   dengan input setengah jadi. */

describe('isValidEmail', () => {
  it('menerima bentuk email wajar (termasuk spasi tepi)', () => {
    expect(isValidEmail('rina@email.com')).toBe(true)
    expect(isValidEmail('  rina@email.com ')).toBe(true)
    expect(isValidEmail('a.b+c@sub.domain.co.id')).toBe(true)
  })

  it('menolak yang jelas salah', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('   ')).toBe(false)
    expect(isValidEmail('rina')).toBe(false)
    expect(isValidEmail('rina@email')).toBe(false)
    expect(isValidEmail('rina@@email.com')).toBe(false)
    expect(isValidEmail('rina @email.com')).toBe(false)
  })
})

describe('isValidNickname', () => {
  it('butuh minimal 2 huruf', () => {
    expect(isValidNickname('Ri')).toBe(true)
    expect(isValidNickname('Rina Putri')).toBe(true)
  })

  it('menolak nama kosong / satu huruf', () => {
    expect(isValidNickname('R')).toBe(false)
    expect(isValidNickname('')).toBe(false)
    expect(isValidNickname('   ')).toBe(false)
  })
})

describe('isValidOtpCode', () => {
  it('menerima tepat 6 angka (spasi tepi dimaafkan)', () => {
    expect(OTP_LENGTH).toBe(6)
    expect(isValidOtpCode('123456')).toBe(true)
    expect(isValidOtpCode(' 123456 ')).toBe(true)
  })

  it('menolak selain 6 angka murni', () => {
    expect(isValidOtpCode('')).toBe(false)
    expect(isValidOtpCode('12345')).toBe(false)
    expect(isValidOtpCode('1234567')).toBe(false)
    expect(isValidOtpCode('12345a')).toBe(false)
    expect(isValidOtpCode('12 345')).toBe(false)
    expect(isValidOtpCode('abcdef')).toBe(false)
  })
})
