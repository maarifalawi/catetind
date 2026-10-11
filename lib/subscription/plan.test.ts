import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'

vi.mock('@/lib/supabase/rest', () => ({
  restConfigured: vi.fn(),
  restFetch: vi.fn(),
}))

import { normalizeTier, readCallerPlan } from './plan'
import { restConfigured, restFetch } from '@/lib/supabase/rest'

const configured = restConfigured as unknown as Mock
const fetchRest = restFetch as unknown as Mock

/* ── PAKET PEMANGGIL (server) ────────────────────────────────────────────────
   Dua hal yang dikunci: (1) baris tier LAMA tidak boleh menghilangkan akses
   pembeli lama, dan (2) kegagalan membaca DB HARUS dibedakan dari "belum beli"
   — route yang memakai guard memutuskan dua hal berbeda dari keduanya. */

afterEach(() => vi.clearAllMocks())

describe('normalizeTier() — tier lama tetap punya arti', () => {
  it('id paket baru dikenali apa adanya', () => {
    expect(normalizeTier('catet-aja')).toBe('catet-aja')
    expect(normalizeTier('waras')).toBe('waras')
    expect(normalizeTier('sultan')).toBe('sultan')
  })

  it('tier langganan lama dipetakan ke paket baru', () => {
    expect(normalizeTier('founding_member')).toBe('sultan')
    expect(normalizeTier('lifetime')).toBe('sultan')
    expect(normalizeTier('yearly')).toBe('waras')
    expect(normalizeTier('annual')).toBe('waras')
    expect(normalizeTier('monthly')).toBe('catet-aja')
  })

  it('kosong / tak dikenal → null (bukan paket karangan)', () => {
    expect(normalizeTier(null)).toBeNull()
    expect(normalizeTier('')).toBeNull()
    expect(normalizeTier('tier-misterius')).toBeNull()
  })
})

describe('readCallerPlan()', () => {
  it('tanpa backend: configured false & TIDAK membaca apa pun', async () => {
    configured.mockReturnValue(false)
    const plan = await readCallerPlan('t')
    expect(plan).toEqual({
      configured: false,
      planId: null,
      purchasedAt: null,
      active: false,
      failed: false,
    })
    expect(fetchRest).not.toHaveBeenCalled()
  })

  it('ada baris aktif → planId + purchasedAt', async () => {
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValue({
      ok: true,
      status: 200,
      data: [{ tier_name: 'waras', is_active: true, started_at: '2026-01-01T00:00:00Z' }],
    })
    const plan = await readCallerPlan('t')
    expect(plan.planId).toBe('waras')
    expect(plan.active).toBe(true)
    expect(plan.purchasedAt).toBe('2026-01-01T00:00:00Z')
    expect(plan.failed).toBe(false)
  })

  it('baris ada tapi BELUM aktif → tidak memberi akses', async () => {
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValue({
      ok: true,
      status: 200,
      data: [{ tier_name: 'waras', is_active: false, started_at: '2026-01-01T00:00:00Z' }],
    })
    expect((await readCallerPlan('t')).active).toBe(false)
  })

  it('gagal membaca ditandai `failed: true` (jangan disamakan dengan "belum beli")', async () => {
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValue({ ok: false, status: 500, data: null, error: 'db' })
    const plan = await readCallerPlan('t')
    expect(plan.failed).toBe(true)
    expect(plan.planId).toBeNull()
  })
})
