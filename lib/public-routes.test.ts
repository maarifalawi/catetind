import { describe, expect, it } from 'vitest'
import {
  PUBLIC_ROUTES,
  isProviderExemptRoute,
  isPublicRoute,
} from './public-routes'

/* ── DAFTAR RUTE PUBLIK = KONTRAK AKSES ─────────────────────────────────────
   Aturan produk: TIDAK ADA halaman app yang boleh dibuka tanpa login. Daftar
   ini satu-satunya pengecualian, jadi test ini mengunci dua hal sekaligus:
     1. halaman app (khususnya `/help` yang memakai ScreenShell) TIDAK pernah
        dianggap publik;
     2. pintu masuk yang memang pre-app (login, kontak, bantuan publik) tetap
        terbuka supaya user tidak terjebak di tautan yang memantul ke /login. */

describe('PUBLIC_ROUTES', () => {
  it('tidak memuat halaman app ber-shell', () => {
    for (const path of [
      '/app',
      '/wallet',
      '/history',
      '/budget',
      '/wealth',
      '/joint',
      '/settings',
      '/settings/data',
      '/install',
      '/help',
    ]) {
      expect(isPublicRoute(path)).toBe(false)
    }
  })

  it('memuat pintu masuk pre-app & Pusat Bantuan publik', () => {
    for (const path of [
      '/',
      '/login',
      '/login/verify',
      '/checkout',
      '/contact',
      '/bantuan',
      '/privacy',
      '/terms',
      '/security',
    ]) {
      expect(isPublicRoute(path)).toBe(true)
    }
  })

  it('pencocokan memakai batas segmen, bukan awalan string mentah', () => {
    expect(isPublicRoute('/bantuan')).toBe(true)
    expect(isPublicRoute('/bantuan/topik/ai')).toBe(true)
    expect(isPublicRoute('/bantuanku')).toBe(false)
    expect(isPublicRoute('/helping')).toBe(false)
    expect(isPublicRoute('/app')).toBe(false)
  })

  it('`/app/onboarding` dikecualikan dari gerbang provider, tapi TETAP wajib login', () => {
    expect(isProviderExemptRoute('/app/onboarding')).toBe(true)
    expect(isPublicRoute('/app/onboarding')).toBe(false)
    expect(isProviderExemptRoute('/help')).toBe(false)
  })

  it('setiap rute di PUBLIC_ROUTES cocok dengan dirinya sendiri', () => {
    for (const route of PUBLIC_ROUTES) {
      expect(isPublicRoute(route)).toBe(true)
    }
  })
})
