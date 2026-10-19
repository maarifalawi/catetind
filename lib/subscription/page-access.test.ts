import { describe, expect, it } from 'vitest'
import {
  canAccessPage,
  lockedPagesFor,
  pageAccessRule,
  pageLockCapability,
  pageLockText,
  pageUnlockPlan,
  pagesForPlan,
} from './page-access'

/* ── MATRIKS AKSES HALAMAN PER PAKET ────────────────────────────────────────
   Test ini adalah kontrak produk: halaman mana yang boleh dibuka tiap paket.
   Kalau aturan berubah, ubah `PAGE_ACCESS` DAN test ini bersama-sama — jangan
   diam-diam membuat satu paket kehilangan halaman yang dijanjikan di checkout. */

describe('pageAccessRule() — pencocokan rute', () => {
  it('rute paling spesifik menang: /settings/ai bukan /settings', () => {
    expect(pageAccessRule('/settings/ai')?.path).toBe('/settings/ai')
    expect(pageAccessRule('/settings/ai/')?.path).toBe('/settings/ai')
    expect(pageAccessRule('/settings/ai/preferensi')?.path).toBe('/settings/ai')
  })

  it('sub-halaman ikut aturan induknya', () => {
    expect(pageAccessRule('/wallet/bca')?.path).toBe('/wallet')
    expect(pageAccessRule('/history/2026-10')?.path).toBe('/history')
    expect(pageAccessRule('/settings/billing')?.path).toBe('/settings')
  })

  it('query string & trailing slash tidak mengubah aturan', () => {
    expect(pageAccessRule('/joint?tab=settle')?.path).toBe('/joint')
    expect(pageAccessRule('/app/?x=1')?.path).toBe('/app')
  })

  it('rute tak terdaftar → null (tidak mengunci halaman baru tanpa aturan)', () => {
    expect(pageAccessRule('/halaman-baru')).toBeNull()
    expect(pageLockCapability('/halaman-baru')).toBeNull()
    expect(canAccessPage('catet-aja', '/halaman-baru')).toBe(true)
  })
})

describe('canAccessPage() — matriks tiga paket', () => {
  const manualPages = [
    '/app',
    '/app/onboarding',
    '/history',
    '/wallet',
    '/budget',
    '/bills',
    '/calendar',
    '/wealth',
    '/referral',
    '/help',
    '/install',
    '/settings',
    '/settings/billing',
    '/settings/appearance',
    '/settings/categories',
    '/settings/notifications',
    '/settings/security',
    '/settings/data',
    '/settings/logout',
  ]

  it('Paket Catet Aja: semua halaman manual terbuka', () => {
    for (const path of manualPages) {
      expect(canAccessPage('catet-aja', path), path).toBe(true)
    }
  })

  it('Paket Catet Aja: Joint Wallet & AI Preferences terkunci', () => {
    expect(canAccessPage('catet-aja', '/joint')).toBe(false)
    expect(canAccessPage('catet-aja', '/settings/ai')).toBe(false)
    expect(pageLockCapability('/joint')).toBe('joint-wallet')
    expect(pageLockCapability('/settings/ai')).toBe('ai-chat')
  })

  it('Paket Waras: SEMUA halaman terbuka', () => {
    for (const path of [...manualPages, '/joint', '/settings/ai']) {
      expect(canAccessPage('waras', path), path).toBe(true)
    }
  })

  it('Paket Sultan: SEMUA halaman terbuka', () => {
    for (const path of [...manualPages, '/joint', '/settings/ai']) {
      expect(canAccessPage('sultan', path), path).toBe(true)
    }
  })

  it('belum punya paket: halaman manual tetap terbuka (mode baca + catat manual)', () => {
    expect(canAccessPage(null, '/app')).toBe(true)
    expect(canAccessPage(null, '/wallet')).toBe(true)
    expect(canAccessPage(null, '/settings')).toBe(true)
    expect(canAccessPage(null, '/joint')).toBe(false)
    expect(canAccessPage(null, '/settings/ai')).toBe(false)
  })

  it('paket kedaluwarsa (planId null) diperlakukan sama dengan belum punya paket', () => {
    expect(canAccessPage(null, '/joint')).toBe(false)
    expect(canAccessPage(null, '/history')).toBe(true)
  })
})

describe('daftar halaman terkunci / terbuka', () => {
  it('Catet Aja hanya kehilangan dua halaman', () => {
    expect(lockedPagesFor('catet-aja').map((rule) => rule.path)).toEqual([
      '/joint',
      '/settings/ai',
    ])
  })

  it('Waras & Sultan tidak kehilangan halaman', () => {
    expect(lockedPagesFor('waras')).toEqual([])
    expect(lockedPagesFor('sultan')).toEqual([])
  })

  it('jumlah halaman terbuka + terkunci = seluruh matriks', () => {
    for (const planId of ['catet-aja', 'waras', 'sultan'] as const) {
      expect(pagesForPlan(planId).length + lockedPagesFor(planId).length).toBeGreaterThan(0)
      expect(pagesForPlan(planId).length + lockedPagesFor(planId).length).toBe(
        pagesForPlan('sultan').length + lockedPagesFor('sultan').length,
      )
    }
  })
})

describe('copy lock halaman', () => {
  it('menyebut paket pembuka & kemampuan yang kurang', () => {
    expect(pageUnlockPlan('/joint')?.id).toBe('waras')
    expect(pageUnlockPlan('/settings/ai')?.id).toBe('waras')
    expect(pageLockText('/joint')).toContain('Joint Wallet')
    expect(pageLockText('/joint')).toContain('Paket Waras')
    expect(pageLockText('/settings/ai')).toContain('AI Coach')
    expect(pageLockText('/wallet')).toBeNull()
  })
})
