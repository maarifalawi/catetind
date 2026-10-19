/**
 * Gerbang sesi — kontrak yang tidak boleh regresi:
 *   · halaman app (di luar `PUBLIC_ROUTES`) tanpa sesi → 307 ke /login?next=…
 *   · halaman publik/pre-app → lolos apa adanya
 *
 * Test ini sengaja memanggil `middleware()` yang sebenarnya (bukan menyalin
 * logikanya), supaya kalau suatu saat ada jalan pintas demo/env yang
 * ditambahkan lagi, test ini gagal sebelum user menemukannya.
 */
import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from '../middleware'

function request(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`)
}

/** `NextResponse.next()` menandai dirinya dengan header ini */
function passesThrough(response: Response): boolean {
  return response.headers.get('x-middleware-next') === '1'
}

describe('middleware — gerbang sesi', () => {
  it('/help (Pusat Bantuan DI DALAM app) tanpa sesi → /login?next=/help', async () => {
    const response = await middleware(request('/help'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/login?next=%2Fhelp')
  })

  it('/app, /wallet, /settings/data tanpa sesi juga ditolak', async () => {
    for (const path of ['/app', '/wallet', '/settings/data']) {
      const response = await middleware(request(path))
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain(`next=${encodeURIComponent(path)}`)
    }
  })

  it('query tujuan ikut dibawa ke halaman masuk', async () => {
    const response = await middleware(request('/help?topik=ai'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?next=%2Fhelp%3Ftopik%3Dai',
    )
  })

  it('/bantuan (Pusat Bantuan publik) lolos tanpa sesi', async () => {
    const response = await middleware(request('/bantuan'))

    expect(response.status).toBe(200)
    expect(passesThrough(response)).toBe(true)
  })

  it('pintu masuk publik lain tetap terbuka', async () => {
    for (const path of ['/', '/login', '/checkout', '/contact', '/privacy', '/terms']) {
      const response = await middleware(request(path))
      expect(passesThrough(response)).toBe(true)
    }
  })

  it('rute legacy /preview-landing tidak dibelokkan ke login', async () => {
    const response = await middleware(request('/preview-landing'))

    expect(response.status).toBe(200)
    expect(passesThrough(response)).toBe(true)
  })
})
