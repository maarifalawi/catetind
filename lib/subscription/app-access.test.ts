import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'

vi.mock('@/lib/supabase/rest', () => ({
  restConfigured: vi.fn(),
  restFetch: vi.fn(),
}))

import {
  appAccessDecision,
  isSubscriptionActive,
  readCallerAccess,
  requiresPaidAccess,
} from './app-access'
import { restConfigured, restFetch } from '@/lib/supabase/rest'

const configured = restConfigured as unknown as Mock
const fetchRest = restFetch as unknown as Mock

/* ── GERBANG MASUK APP ──────────────────────────────────────────────────────
   Kontrak yang dikunci test ini: user yang belum membayar TIDAK boleh masuk
   app, tetapi kegagalan membaca database TIDAK boleh dianggap "belum bayar".
   Halaman publik (termasuk /checkout) tetap terbuka untuk semua orang. */

afterEach(() => vi.clearAllMocks())

describe('isSubscriptionActive() — satu aturan "paket masih memberi akses"', () => {
  const now = Date.parse('2026-10-19T12:00:00Z')

  it('lifetime aktif selama is_active true, tanpa peduli expires_at', () => {
    expect(
      isSubscriptionActive(
        { is_active: true, is_lifetime: true, expires_at: '2020-01-01T00:00:00Z' },
        { now },
      ),
    ).toBe(true)
  })

  it('prabayar aktif selama tanggal berakhir masih di depan', () => {
    expect(
      isSubscriptionActive(
        { is_active: true, is_lifetime: false, expires_at: '2026-10-20T00:00:00Z' },
        { now },
      ),
    ).toBe(true)
  })

  it('prabayar lewat tanggal → tidak aktif walau is_active masih true', () => {
    expect(
      isSubscriptionActive(
        { is_active: true, is_lifetime: false, expires_at: '2026-10-18T00:00:00Z' },
        { now },
      ),
    ).toBe(false)
  })

  it('is_active false / baris kosong / tanggal rusak → tidak aktif', () => {
    expect(
      isSubscriptionActive(
        { is_active: false, is_lifetime: true, expires_at: null },
        { now },
      ),
    ).toBe(false)
    expect(isSubscriptionActive(null, { now })).toBe(false)
    expect(
      isSubscriptionActive(
        { is_active: true, is_lifetime: false, expires_at: 'bukan-tanggal' },
        { now },
      ),
    ).toBe(false)
    expect(
      isSubscriptionActive(
        { is_active: true, is_lifetime: false, expires_at: null },
        { now },
      ),
    ).toBe(false)
  })
})

describe('appAccessDecision() — sesi sah ≠ boleh masuk app', () => {
  it('paket aktif → allow', () => {
    expect(appAccessDecision({ configured: true, active: true, failed: false })).toBe('allow')
  })

  it('belum bayar / kedaluwarsa → paywall', () => {
    expect(appAccessDecision({ configured: true, active: false, failed: false })).toBe('paywall')
  })

  it('backend tidak dikonfigurasi → allow (tidak tahu, jangan mengunci)', () => {
    expect(appAccessDecision({ configured: false, active: false, failed: false })).toBe('allow')
  })

  it('gagal baca DB → unknown, BUKAN paywall', () => {
    expect(appAccessDecision({ configured: true, active: false, failed: true })).toBe('unknown')
  })
})

describe('requiresPaidAccess() — halaman app vs halaman publik', () => {
  it('halaman app wajib paket aktif', () => {
    for (const path of [
      '/app',
      '/app/onboarding',
      '/wallet',
      '/wallet/bca',
      '/history',
      '/budget',
      '/bills',
      '/calendar',
      '/wealth',
      '/joint',
      '/referral',
      '/help',
      '/install',
      '/settings',
      '/settings/billing',
      '/settings/ai',
    ]) {
      expect(requiresPaidAccess(path), path).toBe(true)
    }
  })

  it('pintu masuk publik & halaman harga TIDAK pernah dipaywall', () => {
    for (const path of [
      '/',
      '/login',
      '/login/verify',
      '/checkout',
      '/checkout/bayar',
      '/checkout/selesai',
      '/bantuan',
      '/contact',
      '/changelog',
      '/privacy',
      '/terms',
      '/security',
      '/join/ABC123',
      '/share/123',
      '/registered',
      '/welcome',
    ]) {
      expect(requiresPaidAccess(path), path).toBe(false)
    }
  })
})

describe('readCallerAccess()', () => {
  it('tanpa backend: tidak dikonfigurasi & tidak membaca apa pun', async () => {
    configured.mockReturnValue(false)

    const access = await readCallerAccess('token')

    expect(access).toEqual({ configured: false, active: false, failed: false })
    expect(fetchRest).not.toHaveBeenCalled()
  })

  it('gagal membaca DB → failed true (bukan "belum bayar")', async () => {
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValue({ ok: false, status: 500, data: null, error: 'db' })

    expect(await readCallerAccess('token')).toEqual({
      configured: true,
      active: false,
      failed: true,
    })
  })

  it('tidak ada baris langganan → configured true, active false, failed false', async () => {
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValue({ ok: true, status: 200, data: [] })

    expect(await readCallerAccess('token')).toEqual({
      configured: true,
      active: false,
      failed: false,
    })
  })

  it('lifetime aktif → active true', async () => {
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValue({
      ok: true,
      status: 200,
      data: [{ is_active: true, is_lifetime: true, expires_at: null }],
    })

    expect(await readCallerAccess('token')).toEqual({
      configured: true,
      active: true,
      failed: false,
    })
    expect(String(fetchRest.mock.calls[0]?.[0])).toContain('user_subscriptions')
  })

  it('prabayar kedaluwarsa → active false', async () => {
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValue({
      ok: true,
      status: 200,
      data: [
        {
          is_active: true,
          is_lifetime: false,
          expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    })

    expect(await readCallerAccess('token')).toEqual({
      configured: true,
      active: false,
      failed: false,
    })
  })
})
