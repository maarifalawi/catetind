import { describe, expect, it } from 'vitest'
import { AMOUNT_ROUTES, showsBalanceToggle } from './shows-amounts'

/* ── Test ATURAN "ROUTE INI MENAMPILKAN NOMINAL?" (paket 75) ──────────────────
   Satu-satunya pemutus apakah tombol "mata" (sensor layar) dirender di header
   mobile GLOBAL. Yang dikunci di sini adalah niatnya apa adanya:
     • halaman uang (termasuk sub-route seperti /wallet/[id]) → true;
     • halaman non-uang & publik → false;
     • /app/onboarding → false walau prefix-nya /app. */

describe('showsBalanceToggle', () => {
  it('halaman uang utama → tombol mata tampil', () => {
    for (const route of AMOUNT_ROUTES) {
      expect(showsBalanceToggle(route)).toBe(true)
    }
  })

  it('sub-route halaman uang ikut tampil (detail dompet & celengan)', () => {
    expect(showsBalanceToggle('/wallet/bca')).toBe(true)
    expect(showsBalanceToggle('/budget/goal-1')).toBe(true)
  })

  it('halaman non-uang & publik → tombol mata tidak tampil', () => {
    for (const route of [
      '/help',
      '/settings',
      '/settings/billing',
      '/install',
      '/referral',
      '/',
      '/login',
      '/checkout',
      '/welcome',
      '/joined-code',
    ]) {
      expect(showsBalanceToggle(route)).toBe(false)
    }
  })

  it('/app/onboarding TIDAK dianggap halaman nominal walau prefix-nya /app', () => {
    expect(showsBalanceToggle('/app/onboarding')).toBe(false)
  })
})
