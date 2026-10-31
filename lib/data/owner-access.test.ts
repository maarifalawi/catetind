import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  isOwnerTestCode,
  isOwnerTestEmail,
  normalizeOwnerEmail,
  ownerFastLoginConfigured,
  ownerLoginEnabled,
  ownerTestEmail,
  ownerTestNickname,
  ownerTestOtp,
} from './owner-access'

/* ── Akses pemilik (kode tetap, tanpa email) ─────────────────────────────────
   Yang dikunci di sini adalah aturan "HANYA email + kode dari env" dan
   "env kosong = jalur MATI". Kalau salah satu assertion ini dilonggarkan, jalur
   bypass OTP bisa hidup dengan nilai cadangan yang tidak disengaja — jadi test
   ini adalah pagar keamanan, bukan sekadar dokumentasi. */

/* Nilai di bawah ini HANYA untuk test: nilainya datang dari env, jadi tidak ada
   email/kode asli yang perlu (atau boleh) ditulis di repo publik ini. */
const EMAIL = 'pemilik@contoh.com'
const OTP = '482913'

const ENV_KEYS = ['OWNER_TEST_EMAIL', 'OWNER_TEST_OTP', 'OWNER_TEST_NICKNAME'] as const
const savedEnv: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key]
  process.env.OWNER_TEST_EMAIL = EMAIL
  process.env.OWNER_TEST_OTP = OTP
  delete process.env.OWNER_TEST_NICKNAME
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = savedEnv[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('normalizeOwnerEmail', () => {
  it('memangkas spasi dan menurunkan huruf', () => {
    expect(normalizeOwnerEmail('  Pemilik@Contoh.com ')).toBe(EMAIL)
  })

  it('aman untuk nilai kosong / null', () => {
    expect(normalizeOwnerEmail(null)).toBe('')
    expect(normalizeOwnerEmail(undefined)).toBe('')
    expect(normalizeOwnerEmail('')).toBe('')
  })
})

describe('ownerTestEmail / ownerTestOtp', () => {
  it('membaca env dan menormalkannya', () => {
    process.env.OWNER_TEST_EMAIL = '  Pemilik@Contoh.com '
    expect(ownerTestEmail()).toBe(EMAIL)
    expect(ownerTestOtp()).toBe(OTP)
  })

  it('env kosong / tidak ada → string kosong (bukan nilai cadangan)', () => {
    delete process.env.OWNER_TEST_EMAIL
    delete process.env.OWNER_TEST_OTP
    expect(ownerTestEmail()).toBe('')
    expect(ownerTestOtp()).toBe('')
  })
})

describe('ownerFastLoginConfigured', () => {
  it('true hanya kalau email masuk akal DAN kode 6 angka', () => {
    expect(ownerFastLoginConfigured()).toBe(true)
  })

  it('false kalau salah satu env kosong', () => {
    delete process.env.OWNER_TEST_EMAIL
    expect(ownerFastLoginConfigured()).toBe(false)

    process.env.OWNER_TEST_EMAIL = EMAIL
    delete process.env.OWNER_TEST_OTP
    expect(ownerFastLoginConfigured()).toBe(false)
  })

  it('false kalau kode bukan 6 angka', () => {
    for (const bad of ['12345', '1234567', 'abcdef', '12 34 56', '']) {
      process.env.OWNER_TEST_OTP = bad
      expect(ownerFastLoginConfigured(), bad).toBe(false)
    }
  })

  it('false kalau email tidak berbentuk email', () => {
    process.env.OWNER_TEST_EMAIL = 'bukan-email'
    expect(ownerFastLoginConfigured()).toBe(false)
  })
})

describe('isOwnerTestEmail', () => {
  it('menerima email pemilik (trim + case-insensitive)', () => {
    expect(isOwnerTestEmail(EMAIL)).toBe(true)
    expect(isOwnerTestEmail(' Pemilik@Contoh.com ')).toBe(true)
  })

  it('menolak domain lain, subdomain, alias, dan tiruan', () => {
    const rejected = [
      `${EMAIL}.evil.com`,
      'pemilik@sub.contoh.com',
      'pemilik@contoh.co',
      'pemilik@contoh.comm',
      'pemilik+alias@contoh.com',
      'xpemilik@contoh.com',
      'pemilik@yahoo.com',
      'admin@catetind.com',
      '',
      null,
      undefined,
    ]
    for (const email of rejected) {
      expect(isOwnerTestEmail(email), String(email)).toBe(false)
    }
  })

  it('SELALU false kalau env belum diisi (tidak ada email cadangan)', () => {
    delete process.env.OWNER_TEST_EMAIL
    expect(isOwnerTestEmail(EMAIL)).toBe(false)
    expect(isOwnerTestEmail('')).toBe(false)
  })
})

describe('isOwnerTestCode', () => {
  it('menerima kode dari env hanya untuk email pemilik', () => {
    expect(isOwnerTestCode(EMAIL, OTP)).toBe(true)
    expect(isOwnerTestCode('Pemilik@Contoh.com', ` ${OTP} `)).toBe(true)
  })

  it('menolak kode lain', () => {
    const rejected = ['123457', '12345', '1234567', '12345a', '', 'abcdef', null, undefined]
    for (const code of rejected) {
      expect(isOwnerTestCode(EMAIL, code), String(code)).toBe(false)
    }
  })

  it('menolak kode pemilik kalau email bukan pemilik', () => {
    expect(isOwnerTestCode('admin@catetind.com', OTP)).toBe(false)
    expect(isOwnerTestCode(`${EMAIL}.evil.com`, OTP)).toBe(false)
  })

  it('SELALU false kalau env kode belum diisi', () => {
    delete process.env.OWNER_TEST_OTP
    expect(isOwnerTestCode(EMAIL, OTP)).toBe(false)
  })
})

describe('ownerTestNickname', () => {
  it('punya nilai netral kalau env kosong', () => {
    expect(ownerTestNickname()).toBe('Pemilik')
  })

  it('menghormati OWNER_TEST_NICKNAME', () => {
    process.env.OWNER_TEST_NICKNAME = '  Alawi  '
    expect(ownerTestNickname()).toBe('Alawi')
  })
})

describe('ownerLoginEnabled', () => {
  it('aktif secara default (env kosong / tidak diisi)', () => {
    expect(ownerLoginEnabled(undefined)).toBe(true)
    expect(ownerLoginEnabled(null)).toBe(true)
    expect(ownerLoginEnabled('')).toBe(true)
    expect(ownerLoginEnabled('1')).toBe(true)
    expect(ownerLoginEnabled('true')).toBe(true)
  })

  it('mati untuk 0 / false / off (case-insensitive)', () => {
    for (const flag of ['0', 'false', 'FALSE', 'off', ' Off ']) {
      expect(ownerLoginEnabled(flag), flag).toBe(false)
    }
  })
})
