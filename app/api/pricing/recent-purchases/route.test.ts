import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'

vi.mock('@/lib/supabase/rest', () => ({ restConfigured: vi.fn(), restFetch: vi.fn() }))
vi.mock('@/lib/supabase/config', () => ({ supabaseAnonKey: () => 'anon-key-for-test' }))

import { GET } from './route'
import { restConfigured, restFetch } from '@/lib/supabase/rest'

const configured = restConfigured as unknown as Mock
const fetchRest = restFetch as unknown as Mock

afterEach(() => vi.clearAllMocks())

describe('GET /api/pricing/recent-purchases', () => {
  it('tanpa backend → daftar kosong jujur (firstHere true)', async () => {
    configured.mockReturnValue(false)
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.items).toEqual([])
    expect(body.firstHere).toBe(true)
  })

  it('tabel purchases belum ada (404) → tetap kosong, BUKAN error', async () => {
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValueOnce({ ok: false, status: 404, data: null, error: 'not found' })
    const res = await GET()
    const body = await res.json()
    expect(body.items).toEqual([])
    expect(body.firstHere).toBe(true)
  })

  it('tabel ada & berisi → item dikirim apa adanya (bukan fabrikasi)', async () => {
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: [{ display_name: 'Rina', city: 'Jakarta', amount: 119000, created_at: '2026-10-01T00:00:00Z' }],
    })
    const res = await GET()
    const body = await res.json()
    expect(body.firstHere).toBe(false)
    expect(body.items).toHaveLength(1)
    expect(body.items[0].name).toBe('Rina')
    expect(body.items[0].price).toBe(119000)
  })
})
