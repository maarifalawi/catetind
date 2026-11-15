import { describe, expect, it } from 'vitest'
import { matchesAnyRoute, matchesRoute } from './route-match'

/* ── SATU ATURAN PENCOCOKAN RUTE (paket 101) ─────────────────────────────────
   Bug yang dikunci di sini benar-benar terjadi dan terlihat user:

     "/joint nav bawahnya nggak ada. Pas udah masuk cuma tombol plus doang."

   Penyebabnya `pathname.startsWith(route)` mentah: `/joint` (Dompet Bersama)
   ikut cocok dengan `/join` (halaman undangan publik) → `/joint` dianggap
   halaman fokus dan SELURUH bottom nav hilang. Test ini menjaga batas segmen
   untuk semua daftar rute (nav fokus, rute publik, rute nominal). */

describe('matchesRoute · batas segmen', () => {
  it('`/joint` TIDAK cocok dengan `/join` (regresi bottom nav hilang)', () => {
    expect(matchesRoute('/joint', '/join')).toBe(false)
    expect(matchesRoute('/joint', '/joint')).toBe(true)
  })

  it('halaman anak tetap ikut induknya', () => {
    expect(matchesRoute('/join/H9FKJF', '/join')).toBe(true)
    expect(matchesRoute('/wallet/bca', '/wallet')).toBe(true)
    expect(matchesRoute('/settings/data', '/settings')).toBe(true)
    expect(matchesRoute('/login/verify', '/login')).toBe(true)
  })

  it('kata lain yang hanya BERAWALAN sama tidak ikut', () => {
    expect(matchesRoute('/bantuanku', '/bantuan')).toBe(false)
    expect(matchesRoute('/helping', '/help')).toBe(false)
    expect(matchesRoute('/walletku', '/wallet')).toBe(false)
  })

  it('`/` dicocokkan EXACT supaya tidak menyerap semua route', () => {
    expect(matchesRoute('/', '/')).toBe(true)
    expect(matchesRoute('/app', '/')).toBe(false)
    expect(matchesRoute('/joint', '/')).toBe(false)
  })
})

describe('matchesAnyRoute · dipakai FOCUS_ROUTES bottom nav', () => {
  /* daftar nyata dari `components/MobileBottomNav.tsx` (potongan yang relevan) */
  const FOCUS = ['/', '/checkout', '/login', '/join', '/share', '/registered']

  it('halaman undangan publik tetap fokus', () => {
    expect(matchesAnyRoute('/join', FOCUS)).toBe(true)
    expect(matchesAnyRoute('/join/H9FKJF', FOCUS)).toBe(true)
  })

  it('halaman app menampilkan nav: /joint, /wallet, /app', () => {
    expect(matchesAnyRoute('/joint', FOCUS)).toBe(false)
    expect(matchesAnyRoute('/wallet', FOCUS)).toBe(false)
    expect(matchesAnyRoute('/app', FOCUS)).toBe(false)
    expect(matchesAnyRoute('/', FOCUS)).toBe(true)
  })
})
