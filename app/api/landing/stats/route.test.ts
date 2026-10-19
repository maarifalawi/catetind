import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'

vi.mock('@/lib/supabase/rest', () => ({ restConfigured: vi.fn(), restFetch: vi.fn() }))
vi.mock('@/lib/supabase/config', () => ({ supabaseAnonKey: () => 'anon-key-for-test' }))

import { GET } from './route'
import { restConfigured, restFetch } from '@/lib/supabase/rest'

/* ── GET /api/landing/stats ──────────────────────────────────────────────────
   Endpoint angka pengguna publik (hero kini memakai label statis 1.000+).
   Yang dikunci:
     · tanpa backend / tabel kosong → titik awal 234 (bukan 0, bukan error);
     · baris hidup → angka & waktu apa adanya;
     · nilai rusak (0/NaN) tidak pernah sampai ke layar sebagai "0 orang". */

const configured = restConfigured as unknown as Mock
const fetchRest = restFetch as unknown as Mock

afterEach(() => vi.clearAllMocks())

describe('GET /api/landing/stats', () => {
  it('tanpa backend → 234 (seed) dan tidak di-cache', async () => {
    configured.mockReturnValue(false)
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toEqual({ count: 234, updatedAt: null, live: false })
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('tabel kosong → tetap 234, bukan angka kosong', async () => {
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValueOnce({ ok: true, status: 200, data: [] })
    const body = await (await GET()).json()
    expect(body).toEqual({ count: 234, updatedAt: null, live: false })
  })

  it('baris hidup → angka & waktu apa adanya', async () => {
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: [{ subscriber_count: 251, updated_at: '2026-10-19T00:00:00Z' }],
    })
    const body = await (await GET()).json()
    expect(body).toEqual({
      count: 251,
      updatedAt: '2026-10-19T00:00:00Z',
      live: true,
    })
  })

  it('nilai tidak masuk akal (0/NaN) → jatuh ke 234', async () => {
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: [{ subscriber_count: 0, updated_at: null }],
    })
    expect(await (await GET()).json()).toMatchObject({ count: 234, live: true })

    fetchRest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: [{ subscriber_count: 'banyak', updated_at: null }],
    })
    expect(await (await GET()).json()).toMatchObject({ count: 234, live: true })
  })
})
