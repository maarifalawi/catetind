/**
 * Gerbang paket — kontrak yang tidak boleh regresi:
 *   · user login TANPA paket aktif → 307 ke /checkout (halaman harga);
 *   · user login DENGAN paket aktif → halaman app dirender;
 *   · backend gagal dibaca → lolos (jangan menuduh pelanggan belum bayar);
 *   · rute publik tidak pernah diperiksa paketnya.
 *
 * Test ini memanggil `middleware()` yang sebenarnya. Hanya dua hal yang
 * diganti: verifikasi Supabase Auth (tidak ada jaringan di test) dan pembacaan
 * paket (supaya tiap skenario bisa ditentukan). Logika keputusan dan pencocokan
 * rutenya tetap kode produksi.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  /* `config.ts` membaca env saat modul dimuat → harus diisi SEBELUM import. */
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-untuk-test-1234567890'
  return { readCallerAccess: vi.fn() }
})

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }),
      getSession: async () => ({
        data: { session: { access_token: 'access-token-1' } },
        error: null,
      }),
    },
  }),
}))

vi.mock('@/lib/subscription/app-access', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/subscription/app-access')>()
  return { ...actual, readCallerAccess: mocks.readCallerAccess }
})

import { middleware } from '../middleware'
import { encodeSessionCookieValue, sessionCookieName } from './supabase/session-cookie'

/** request dengan sesi Supabase yang bentuknya sama seperti tulisan @supabase/ssr */
function signedInRequest(path: string): NextRequest {
  const value = encodeSessionCookieValue({
    userId: 'user-1',
    email: 'user@example.com',
    name: 'User',
    accessToken: 'access-token-1',
    refreshToken: 'refresh-token-1',
    expiresAt: Math.floor(Date.now() / 1000) + 60 * 60,
  })
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: { cookie: `${sessionCookieName()}=${value}` },
  })
}

/** `NextResponse.next()` menandai dirinya dengan header ini */
function passesThrough(response: Response): boolean {
  return response.headers.get('x-middleware-next') === '1'
}

function paywallLocation(response: Response): string | null {
  return response.headers.get('location')
}

beforeEach(() => {
  mocks.readCallerAccess.mockReset()
  /* default: sesi sah tetapi BELUM punya paket (kasus yang dilaporkan) */
  mocks.readCallerAccess.mockResolvedValue({
    configured: true,
    active: false,
    failed: false,
  })
})

describe('middleware — gerbang paket', () => {
  it('login tanpa paket → /checkout, bukan Dashboard', async () => {
    const response = await middleware(signedInRequest('/app'))

    expect(response.status).toBe(307)
    const url = new URL(paywallLocation(response) ?? '')
    expect(url.pathname).toBe('/checkout')
    /* paket 99: halaman app yang dituju dibawa sebagai `lanjut` supaya
       /checkout bisa mencocokkan pembayaran & mengembalikan user ke sana. */
    expect(url.searchParams.get('lanjut')).toBe('/app')
    expect(mocks.readCallerAccess).toHaveBeenCalledWith('access-token-1')
  })

  it('semua halaman app ikut ditolak, termasuk onboarding & sub-halaman', async () => {
    for (const path of ['/wallet', '/wallet/bca', '/settings/data', '/app/onboarding', '/help']) {
      const response = await middleware(signedInRequest(path))
      expect(response.status, path).toBe(307)
      const url = new URL(paywallLocation(response) ?? '')
      expect(url.pathname, path).toBe('/checkout')
      expect(url.searchParams.get('lanjut'), path).toBe(path)
    }
  })

  it('query halaman app TIDAK menjadi query checkout — hanya disimpan di `lanjut`', async () => {
    const response = await middleware(signedInRequest('/wallet?tab=akun'))

    const url = new URL(paywallLocation(response) ?? '')
    expect(url.pathname).toBe('/checkout')
    expect(url.searchParams.has('tab')).toBe(false)
    expect(url.searchParams.get('lanjut')).toBe('/wallet?tab=akun')
  })

  it('paket aktif → halaman app dirender', async () => {
    mocks.readCallerAccess.mockResolvedValue({
      configured: true,
      active: true,
      failed: false,
    })

    const response = await middleware(signedInRequest('/app'))

    expect(response.status).toBe(200)
    expect(passesThrough(response)).toBe(true)
  })

  it('gagal membaca paket → lolos (unknown ≠ belum bayar)', async () => {
    mocks.readCallerAccess.mockResolvedValue({
      configured: true,
      active: false,
      failed: true,
    })

    const response = await middleware(signedInRequest('/wallet'))

    expect(passesThrough(response)).toBe(true)
  })

  it('backend belum dikonfigurasi → lolos', async () => {
    mocks.readCallerAccess.mockResolvedValue({
      configured: false,
      active: false,
      failed: false,
    })

    const response = await middleware(signedInRequest('/app'))

    expect(passesThrough(response)).toBe(true)
  })

  it('rute publik tidak pernah memeriksa paket', async () => {
    for (const path of ['/checkout', '/checkout/bayar?plan=waras', '/', '/bantuan']) {
      const response = await middleware(signedInRequest(path))
      expect(passesThrough(response), path).toBe(true)
    }
    expect(mocks.readCallerAccess).not.toHaveBeenCalled()
  })

  it('tanpa sesi tetap ke /login (gerbang sesi tidak berubah)', async () => {
    const response = await middleware(new NextRequest('http://localhost:3000/app'))

    expect(response.status).toBe(307)
    expect(paywallLocation(response)).toBe('http://localhost:3000/login?next=%2Fapp')
  })
})
