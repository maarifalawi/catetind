import { describe, expect, it } from 'vitest'
import {
  DEFAULT_AUTH_LANDING,
  OTP_LENGTH,
  buildVerifyHref,
  isValidEmail,
  isValidNickname,
  isValidOtpCode,
  resolveAuthLanding,
  safeNextPath,
} from './auth'

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

/* ── `?next=` setelah masuk: penjaga OPEN-REDIRECT (paket 82 / §8D) ──────────
   Query `next` bisa ditempel siapa saja. Yang diuji di sini: jalur internal
   lewat, dan apa pun yang bisa membawa user keluar situs ditolak. */

describe('safeNextPath · hanya jalur internal yang lolos', () => {
  it('menerima jalur absolut-situs (spasi tepi dimaafkan)', () => {
    expect(safeNextPath('/checkout/bayar?plan=waras&period=annual')).toBe(
      '/checkout/bayar?plan=waras&period=annual',
    )
    expect(safeNextPath('  /app  ')).toBe('/app')
  })

  it('menolak apa pun yang bisa keluar situs', () => {
    expect(safeNextPath(null)).toBeNull()
    expect(safeNextPath(undefined)).toBeNull()
    expect(safeNextPath('')).toBeNull()
    expect(safeNextPath('https://jahat.example/masuk')).toBeNull()
    expect(safeNextPath('//jahat.example')).toBeNull()
    expect(safeNextPath('javascript:alert(1)')).toBeNull()
    expect(safeNextPath('/\\jahat.example')).toBeNull()
    expect(safeNextPath('/../rahasia')).toBeNull()
    expect(safeNextPath('/app tidak-valid')).toBeNull()
  })
})

describe('resolveAuthLanding · halaman darat setelah masuk', () => {
  it('pakai next yang aman, kalau tidak jatuh ke Dashboard', () => {
    expect(resolveAuthLanding('/checkout/bayar?plan=waras&period=annual')).toBe(
      '/checkout/bayar?plan=waras&period=annual',
    )
    expect(resolveAuthLanding('https://jahat.example')).toBe(DEFAULT_AUTH_LANDING)
    expect(resolveAuthLanding(undefined)).toBe('/app')
  })

  it('halaman darat default memang Dashboard', () => {
    expect(DEFAULT_AUTH_LANDING).toBe('/app')
  })
})

describe('buildVerifyHref · membawa ?next hanya kalau aman', () => {
  it('tanpa next = cuma email', () => {
    expect(buildVerifyHref('rina@email.com')).toBe('/login/verify?email=rina%40email.com')
  })

  it('dengan next aman = ikut di-encode', () => {
    expect(buildVerifyHref('rina@email.com', '/checkout/bayar?plan=waras&period=annual')).toBe(
      '/login/verify?email=rina%40email.com&next=%2Fcheckout%2Fbayar%3Fplan%3Dwaras%26period%3Dannual',
    )
  })

  it('next tidak aman = diabaikan (bukan dipaksa masuk)', () => {
    expect(buildVerifyHref('rina@email.com', 'https://jahat.example')).toBe(
      '/login/verify?email=rina%40email.com',
    )
    expect(buildVerifyHref('rina@email.com', '//jahat.example')).toBe(
      '/login/verify?email=rina%40email.com',
    )
  })
})
