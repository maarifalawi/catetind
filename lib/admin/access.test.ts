import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  OWNER_EMAIL,
  adminAccessDecision,
  adminDeniedPath,
  adminEmails,
  isAdminEmail,
  normalizeAdminEmail,
  parseEmailList,
} from './access'

/* ── PENJAGA AKSES ADMIN ─────────────────────────────────────────────────────
   Test ini adalah pagar keamanan: kalau salah satu aturan dilonggarkan (mis.
   domain diterima, env kosong memakai nilai cadangan, email kosong dianggap
   admin), dashboard bisnis terbuka untuk orang yang salah.
   ────────────────────────────────────────────────────────────────────────── */

const ENV_KEYS = ['ADMIN_EMAILS', 'OWNER_EMAILS', 'OWNER_TEST_EMAIL'] as const
const saved: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = saved[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('normalizeAdminEmail / parseEmailList', () => {
  it('menormalkan spasi & huruf besar', () => {
    expect(normalizeAdminEmail('  Pemilik@Contoh.com ')).toBe('pemilik@contoh.com')
    expect(normalizeAdminEmail(null)).toBe('')
  })

  it('membaca daftar dipisah koma, membuang kosong & duplikat', () => {
    expect(parseEmailList(' A@x.com, b@y.com ,, a@X.com, bukan-email')).toEqual([
      'a@x.com',
      'b@y.com',
    ])
    expect(parseEmailList('')).toEqual([])
  })
})

describe('adminEmails', () => {
  it('SELALU memuat email pemilik walau env kosong', () => {
    expect(adminEmails()).toContain(OWNER_EMAIL)
    expect(OWNER_EMAIL).toBe('shiimaify@gmail.com')
  })

  it('menambahkan ADMIN_EMAILS, OWNER_EMAILS, dan OWNER_TEST_EMAIL', () => {
    process.env.ADMIN_EMAILS = 'satu@catet.id,dua@catet.id'
    process.env.OWNER_EMAILS = 'tiga@catet.id'
    process.env.OWNER_TEST_EMAIL = 'pemilik@uji.id'

    const list = adminEmails()
    expect(list).toContain('satu@catet.id')
    expect(list).toContain('dua@catet.id')
    expect(list).toContain('tiga@catet.id')
    expect(list).toContain('pemilik@uji.id')
  })
})

describe('isAdminEmail', () => {
  it('menerima email pemilik (trim + case-insensitive)', () => {
    expect(isAdminEmail(OWNER_EMAIL)).toBe(true)
    expect(isAdminEmail(' Shiimaify@Gmail.com ')).toBe(true)
  })

  it('menolak domain/alias/tiruan, email kosong, dan null', () => {
    const rejected = [
      `${OWNER_EMAIL}.evil.com`,
      'pemilik@shiimaify.com',
      'shiimaify+alias@gmail.com',
      'shiimaify@gmail.co',
      'admin@catetind.com',
      '',
      null,
      undefined,
    ]
    for (const email of rejected) {
      expect(isAdminEmail(email), String(email)).toBe(false)
    }
  })

  it('menerima admin tambahan dari env, bukan dari domainnya', () => {
    process.env.ADMIN_EMAILS = 'operator@catet.id'
    expect(isAdminEmail('operator@catet.id')).toBe(true)
    expect(isAdminEmail('orang-lain@catet.id')).toBe(false)
  })
})

describe('adminAccessDecision', () => {
  it('belum masuk → unauthenticated (walau email pemilik dikirim)', () => {
    expect(adminAccessDecision({ authenticated: false, email: OWNER_EMAIL })).toBe(
      'unauthenticated',
    )
  })

  it('sesi tanpa email → unauthenticated (fail-closed)', () => {
    expect(adminAccessDecision({ authenticated: true, email: '' })).toBe('unauthenticated')
    expect(adminAccessDecision({ authenticated: true, email: null })).toBe('unauthenticated')
  })

  it('user biasa → forbidden', () => {
    expect(adminAccessDecision({ authenticated: true, email: 'user@catet.id' })).toBe('forbidden')
  })

  it('pemilik → admin', () => {
    expect(adminAccessDecision({ authenticated: true, email: OWNER_EMAIL })).toBe('admin')
  })
})

describe('adminDeniedPath', () => {
  it('belum masuk diarahkan ke landing, user biasa ke Dashboard app', () => {
    expect(adminDeniedPath('unauthenticated')).toBe('/')
    expect(adminDeniedPath('forbidden')).toBe('/app')
  })
})
