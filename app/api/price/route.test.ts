import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'

/* Route harga diuji dengan MEM-BLOKIR modul REST-nya: yang diperiksa adalah
   ATURAN endpoint-nya — bahwa ia jujur berkata "statis" saat tabel
   `pricing_state` belum ada, dan membaca tabel saat tersedia. */

vi.mock('@/lib/supabase/rest', () => ({
  restConfigured: vi.fn(),
  restFetch: vi.fn(),
}))
vi.mock('@/lib/supabase/config', () => ({
  supabaseAnonKey: () => 'anon-key-for-test',
  supabaseUrl: () => 'https://example.supabase.co',
}))

import { GET } from './route'
import { restConfigured, restFetch } from '@/lib/supabase/rest'
import { FOUNDING_MEMBER, FOUNDING_MEMBER_SLOTS } from '@/lib/data/pricing'

const configured = restConfigured as unknown as Mock
const fetchRest = restFetch as unknown as Mock

afterEach(() => vi.clearAllMocks())

describe('GET /api/price', () => {
  it('tanpa tabel pricing_state: snapshot statis yang jujur (isDynamic false)', async () => {
    configured.mockReturnValue(false)
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.isDynamic).toBe(false)
    expect(body.priceNumber).toBe(FOUNDING_MEMBER.price)
    expect(body.slotSold).toBe(0)
    expect(body.slotsLeft).toBe(FOUNDING_MEMBER_SLOTS)
    expect(fetchRest).not.toHaveBeenCalled()
  })

  it('tabel belum ada (404): tetap snapshot statis, bukan error', async () => {
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValueOnce({ ok: false, status: 404, data: null, error: 'not found' })
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.isDynamic).toBe(false)
    expect(body.priceNumber).toBe(FOUNDING_MEMBER.price)
  })

  it('tabel ada: harga & sisa slot dibaca dari pricing_state (isDynamic true)', async () => {
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: [{ current_slot: 42, current_price: 231_000, current_tier: 'founding_member' }],
    })
    const res = await GET()
    const body = await res.json()
    expect(body.isDynamic).toBe(true)
    expect(body.priceNumber).toBe(231_000)
    expect(body.slotSold).toBe(42)
    expect(body.slotsLeft).toBe(FOUNDING_MEMBER_SLOTS - 42)
  })

  it('harga tak masuk akal di tabel: jatuh ke snapshot statis', async () => {
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: [{ current_slot: 5, current_price: 0, current_tier: 'founding_member' }],
    })
    const res = await GET()
    const body = await res.json()
    expect(body.isDynamic).toBe(false)
    expect(body.priceNumber).toBe(FOUNDING_MEMBER.price)
  })
})
