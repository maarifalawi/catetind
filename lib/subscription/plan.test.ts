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
  const EMPTY = {
    planId: null,
    purchasedAt: null,
    expiresAt: null,
    isLifetime: false,
    billingPeriod: null,
    active: false,
    expired: false,
  }

  it('tanpa backend: configured false & TIDAK membaca apa pun', async () => {
    configured.mockReturnValue(false)
    const plan = await readCallerPlan('t')
    expect(plan).toEqual({ configured: false, failed: false, ...EMPTY })
    expect(fetchRest).not.toHaveBeenCalled()
  })

  it('monthly aktif dengan expiry di masa depan → active, bukan expired', async () => {
    configured.mockReturnValue(true)
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    fetchRest.mockResolvedValue({
      ok: true,
      status: 200,
      data: [
        {
          tier_name: 'waras',
          is_active: true,
          started_at: '2026-01-01T00:00:00Z',
          expires_at: future,
          is_lifetime: false,
          billing_period: 'monthly',
        },
      ],
    })
    const plan = await readCallerPlan('t')
    expect(plan.planId).toBe('waras')
    expect(plan.active).toBe(true)
    expect(plan.expired).toBe(false)
    expect(plan.isLifetime).toBe(false)
    expect(plan.billingPeriod).toBe('monthly')
    expect(plan.expiresAt).toBe(future)
    expect(plan.failed).toBe(false)
  })

  it('monthly lewat expiry → expired & TIDAK aktif (walau is_active true)', async () => {
    configured.mockReturnValue(true)
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    fetchRest.mockResolvedValue({
      ok: true,
      status: 200,
      data: [
        {
          tier_name: 'waras',
          is_active: true,
          started_at: '2026-01-01T00:00:00Z',
          expires_at: past,
          is_lifetime: false,
          billing_period: 'monthly',
        },
      ],
    })
    const plan = await readCallerPlan('t')
    expect(plan.active).toBe(false)
    expect(plan.expired).toBe(true)
    expect(plan.planId).toBe('waras')
  })

  it('lifetime dengan expires_at NULL → aktif selamanya', async () => {
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValue({
      ok: true,
      status: 200,
      data: [
        {
          tier_name: 'sultan',
          is_active: true,
          started_at: '2026-01-01T00:00:00Z',
          expires_at: null,
          is_lifetime: true,
          billing_period: 'lifetime',
        },
      ],
    })
    const plan = await readCallerPlan('t')
    expect(plan.active).toBe(true)
    expect(plan.expired).toBe(false)
    expect(plan.isLifetime).toBe(true)
    expect(plan.billingPeriod).toBe('lifetime')
    expect(plan.expiresAt).toBeNull()
  })

  it('baris ada tapi is_active=false → tidak memberi akses', async () => {
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValue({
      ok: true,
      status: 200,
      data: [
        {
          tier_name: 'waras',
          is_active: false,
          started_at: '2026-01-01T00:00:00Z',
          expires_at: null,
          is_lifetime: true,
        },
      ],
    })
    expect((await readCallerPlan('t')).active).toBe(false)
  })

  it('tier LAMA tetap dipetakan walau expired', async () => {
    configured.mockReturnValue(true)
    const past = new Date(Date.now() - 1000).toISOString()
    fetchRest.mockResolvedValue({
      ok: true,
      status: 200,
      data: [
        {
          tier_name: 'founding_member',
          is_active: true,
          started_at: '2025-01-01T00:00:00Z',
          expires_at: past,
          is_lifetime: false,
        },
      ],
    })
    const plan = await readCallerPlan('t')
    expect(plan.planId).toBe('sultan')
    expect(plan.expired).toBe(true)
  })

  it('gagal membaca ditandai `failed: true` (jangan disamakan dengan "belum beli")', async () => {
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValue({ ok: false, status: 500, data: null, error: 'db' })
    const plan = await readCallerPlan('t')
    expect(plan.failed).toBe(true)
    expect(plan.planId).toBeNull()
  })
})
