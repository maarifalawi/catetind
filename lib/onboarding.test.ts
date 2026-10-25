import { describe, expect, it } from 'vitest'
import {
  ONBOARDING_RESTART_PARAM,
  ONBOARDING_ROUTE,
  isOnboardingRestart,
  onboardingRestartHref,
} from './onboarding'

/* ── "MULAI LAGI DARI ONBOARDING" ────────────────────────────────────────────
   Keluhan nyata: tombol di kartu akun kosong cuma terasa me-refresh. Sebabnya
   bukan tautannya rusak — `/app/onboarding` memang tujuan yang benar — melainkan
   gerbang onboarding memantulkan user yang SUDAH selesai kembali ke `/app`
   (`router.replace(POST_ONBOARDING_ROUTE)`).

   Perbaikannya: tautan membawa penanda eksplisit `?ulang=1`, dan gerbang
   membacanya lewat `isOnboardingRestart()`. Dua fungsi murni di bawah yang
   mengunci bentuk tautan & pembacaannya supaya tombol dan gerbang tidak bisa
   berbeda pendapat. */

describe('onboardingRestartHref', () => {
  it('menunjuk halaman onboarding dengan penanda ulang', () => {
    expect(ONBOARDING_RESTART_PARAM).toBe('ulang')
    expect(onboardingRestartHref()).toBe(`${ONBOARDING_ROUTE}?ulang=1`)
  })
})

describe('isOnboardingRestart', () => {
  it('true hanya saat URL memang meminta ulang', () => {
    expect(isOnboardingRestart('?ulang=1')).toBe(true)
    expect(isOnboardingRestart('ulang=1')).toBe(true)
    expect(isOnboardingRestart('?dari=home&ulang=1')).toBe(true)
  })

  it('false untuk kunjungan biasa atau nilai lain', () => {
    expect(isOnboardingRestart('')).toBe(false)
    expect(isOnboardingRestart('?ulang=0')).toBe(false)
    expect(isOnboardingRestart('?ulang')).toBe(false)
    expect(isOnboardingRestart('?next=/app')).toBe(false)
    expect(isOnboardingRestart('%%%')).toBe(false)
  })
})
