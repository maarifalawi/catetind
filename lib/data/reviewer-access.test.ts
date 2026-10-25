import { describe, expect, it } from 'vitest'
import {
  REVIEWER_TEST_EMAIL,
  REVIEWER_TEST_OTP,
  isReviewerEmail,
  isReviewerTestCode,
  normalizeReviewerEmail,
  reviewerLoginEnabled,
} from './reviewer-access'

/* ── Akun reviewer Midtrans ───────────────────────────────────────────────────
   Yang dikunci di sini adalah aturan "HANYA email reviewer + HANYA kode tetap".
   Kalau salah satu assertion ini dilonggarkan, jalur bypass OTP bisa dipakai
   email lain — jadi test ini adalah pagar keamanan, bukan sekadar dokumentasi. */

describe('normalizeReviewerEmail', () => {
  it('memangkas spasi dan menurunkan huruf', () => {
    expect(normalizeReviewerEmail('  Reviewer@CatetInd.com ')).toBe(REVIEWER_TEST_EMAIL)
  })

  it('aman untuk nilai kosong / null', () => {
    expect(normalizeReviewerEmail(null)).toBe('')
    expect(normalizeReviewerEmail(undefined)).toBe('')
    expect(normalizeReviewerEmail('')).toBe('')
  })
})

describe('isReviewerEmail', () => {
  it('menerima email reviewer (trim + case-insensitive)', () => {
    expect(REVIEWER_TEST_EMAIL).toBe('reviewer@catetind.com')
    expect(isReviewerEmail('reviewer@catetind.com')).toBe(true)
    expect(isReviewerEmail(' Reviewer@CatetInd.com ')).toBe(true)
  })

  it('menolak domain lain, subdomain, alias, dan tiruan', () => {
    const rejected = [
      'reviewer@catetind.com.evil.com',
      'reviewer@sub.catetind.com',
      'reviewer@catetind.co',
      'reviewer@catetind.comm',
      'reviewer+x@catetind.com',
      'xreviewer@catetind.com',
      'reviewer@catetind.id',
      'reviewer@example.com',
      'admin@catetind.com',
      '',
      null,
      undefined,
    ]
    for (const email of rejected) {
      expect(isReviewerEmail(email), String(email)).toBe(false)
    }
  })
})

describe('isReviewerTestCode', () => {
  it('menerima kode tetap hanya untuk email reviewer', () => {
    expect(REVIEWER_TEST_OTP).toBe('123456')
    expect(isReviewerTestCode('reviewer@catetind.com', '123456')).toBe(true)
    expect(isReviewerTestCode('Reviewer@CatetInd.com', ' 123456 ')).toBe(true)
  })

  it('menolak kode lain', () => {
    const rejected = ['123457', '12345', '1234567', '12345a', '', 'abcdef', null, undefined]
    for (const code of rejected) {
      expect(isReviewerTestCode('reviewer@catetind.com', code), String(code)).toBe(false)
    }
  })

  it('menolak kode reviewer kalau email bukan reviewer', () => {
    expect(isReviewerTestCode('admin@catetind.com', '123456')).toBe(false)
    expect(isReviewerTestCode('reviewer@catetind.com.evil.com', '123456')).toBe(false)
  })
})

describe('reviewerLoginEnabled', () => {
  it('aktif secara default (env kosong / tidak diisi)', () => {
    expect(reviewerLoginEnabled(undefined)).toBe(true)
    expect(reviewerLoginEnabled(null)).toBe(true)
    expect(reviewerLoginEnabled('')).toBe(true)
    expect(reviewerLoginEnabled('1')).toBe(true)
    expect(reviewerLoginEnabled('true')).toBe(true)
  })

  it('mati untuk 0 / false / off (case-insensitive)', () => {
    for (const flag of ['0', 'false', 'FALSE', 'off', ' Off ']) {
      expect(reviewerLoginEnabled(flag), flag).toBe(false)
    }
  })
})
