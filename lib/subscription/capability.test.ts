import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/rest', () => ({ restConfigured: vi.fn() }))
vi.mock('@/lib/supabase/session-cookie', () => ({ readSupabaseSession: vi.fn() }))
vi.mock('./plan', () => ({ readCallerPlan: vi.fn() }))

import { requireCapability } from './capability'
import { restConfigured } from '@/lib/supabase/rest'
import { readSupabaseSession } from '@/lib/supabase/session-cookie'
import { readCallerPlan } from './plan'

const configured = restConfigured as unknown as Mock
const session = readSupabaseSession as unknown as Mock
const readPlan = readCallerPlan as unknown as Mock

/* ── KUNCI FITUR DI SERVER (paket 84) ────────────────────────────────────────
   Permintaan produk: pembeli tier bawah tidak boleh memakai fitur tier atas.
   Tombol yang disembunyikan saja bukan kunci, jadi keputusan ada di sini — dan
   bentuk keputusannya sengaja dibedakan supaya tidak pernah "salah menuduh":

     · backend belum dikonfigurasi (demo/test) → DILEWATKAN (paket tak diketahui)
     · tanpa sesi & backend aktif             → 401
     · baca DB gagal                          → 503 (fail-closed, jujur)
     · paket terbaca & tidak punya kemampuan  → 403 + paket pembukanya */

function request(): NextRequest {
  return new NextRequest('http://localhost/api/ai/text', { method: 'POST' })
}

function plan(planId: string | null, active = true): void {
  readPlan.mockResolvedValue({
    configured: true,
    planId,
    purchasedAt: active ? '2026-01-01T00:00:00Z' : null,
    active,
    failed: false,
  })
}

beforeEach(() => {
  configured.mockReturnValue(true)
  session.mockReturnValue({ userId: 'u1', accessToken: 't' })
  plan(null, false)
})

afterEach(() => vi.clearAllMocks())

describe('requireCapability()', () => {
  it('backend belum dikonfigurasi → dilewatkan (paket tidak bisa diketahui)', async () => {
    configured.mockReturnValue(false)
    const gate = await requireCapability(request(), 'ai-chat')
    expect(gate.ok).toBe(true)
    expect(session).not.toHaveBeenCalled()
  })

  it('tanpa sesi & backend aktif → 401', async () => {
    session.mockReturnValue(null)
    const gate = await requireCapability(request(), 'ai-chat')
    expect(gate.ok).toBe(false)
    if (gate.ok) return
    expect(gate.response.status).toBe(401)
  })

  it('gagal membaca paket → 503, bukan 200 yang berpura-pura aman', async () => {
    readPlan.mockResolvedValue({
      configured: true,
      planId: null,
      purchasedAt: null,
      active: false,
      failed: true,
    })
    const gate = await requireCapability(request(), 'ai-chat')
    expect(gate.ok).toBe(false)
    if (gate.ok) return
    expect(gate.response.status).toBe(503)
  })

  it('paket tier 1 → 403 dengan paket pembukanya', async () => {
    plan('catet-aja')
    const gate = await requireCapability(request(), 'ai-chat')
    expect(gate.ok).toBe(false)
    if (gate.ok) return
    expect(gate.response.status).toBe(403)
    const body = await gate.response.json()
    expect(body.reason).toBe('plan-locked')
    expect(body.unlockedBy).toBe('Paket Waras')
  })

  it('belum pernah beli → 403 (semua fitur berbayar tertutup)', async () => {
    plan(null, false)
    const gate = await requireCapability(request(), 'ocr')
    expect(gate.ok).toBe(false)
    if (gate.ok) return
    expect(gate.response.status).toBe(403)
  })

  it('paket Waras → ai-chat boleh, ai-unlimited tidak', async () => {
    plan('waras')
    expect((await requireCapability(request(), 'ai-chat')).ok).toBe(true)
    const gate = await requireCapability(request(), 'ai-unlimited')
    expect(gate.ok).toBe(false)
    if (gate.ok) return
    expect((await gate.response.json()).unlockedBy).toBe('Paket Sultan')
  })

  it('paket Sultan → semuanya boleh', async () => {
    plan('sultan')
    expect((await requireCapability(request(), 'ai-unlimited')).ok).toBe(true)
    expect((await requireCapability(request(), 'joint-wallet')).ok).toBe(true)
  })
})
