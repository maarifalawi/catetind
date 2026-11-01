import { describe, expect, it } from 'vitest'
import {
  ADMIN_ACTION_ERRORS,
  MAX_AI_BONUS_TOKENS,
  aiBonusOrderId,
  extendPlanPatch,
  isValidAiBonusTokens,
  parseAdminAction,
  planOverridePatch,
  repairPatch,
} from './actions'
import { planStateOf } from './snapshot'
import type { AdminPlanRecord, ExpectedEntitlement } from './snapshot'

/* ── AKSI MANUAL ADMIN ───────────────────────────────────────────────────────
   Yang dikunci: hanya perintah yang dikenal yang lolos, paket/periode/durasi
   divalidasi, perpanjangan menumpuk (bukan menimpa), akses selamanya tidak
   diberi tanggal, dan perbaikan TIDAK pernah menghidupkan akses yang sudah
   lewat masa berlakunya.
   ────────────────────────────────────────────────────────────────────────── */

const NOW = new Date('2026-11-01T10:00:00.000Z')
const DAY = 86_400_000
const iso = (offsetDays: number) => new Date(NOW.getTime() + offsetDays * DAY).toISOString()
const USER = '11111111-2222-3333-4444-555555555555'

function planRecord(overrides: Partial<AdminPlanRecord> = {}): AdminPlanRecord {
  return {
    tier: 'waras',
    period: 'monthly',
    isLifetime: false,
    isActive: true,
    startedAt: iso(-10),
    expiresAt: iso(5),
    ...overrides,
  }
}

describe('parseAdminAction', () => {
  it('menerima lima perintah yang didukung', () => {
    expect(
      parseAdminAction({ action: 'set-plan', userId: USER, planId: 'sultan', period: 'lifetime' }),
    ).toEqual({
      ok: true,
      action: { action: 'set-plan', userId: USER, planId: 'sultan', period: 'lifetime' },
    })
    expect(parseAdminAction({ action: 'extend-plan', userId: USER, days: 30 })).toEqual({
      ok: true,
      action: { action: 'extend-plan', userId: USER, days: 30 },
    })
    expect(parseAdminAction({ action: 'ai-bonus', userId: USER, tokens: 5000 })).toEqual({
      ok: true,
      action: { action: 'ai-bonus', userId: USER, tokens: 5000 },
    })
    expect(parseAdminAction({ action: 'ai-reset', userId: USER })).toEqual({
      ok: true,
      action: { action: 'ai-reset', userId: USER },
    })
    expect(parseAdminAction({ action: 'repair-plan', userId: USER })).toEqual({
      ok: true,
      action: { action: 'repair-plan', userId: USER },
    })
  })

  it('menolak badan yang tidak dikenal / bukan objek', () => {
    for (const body of [null, undefined, 'x', 42, [], {}, { action: 'hapus-semua' }]) {
      const result = parseAdminAction(body)
      expect(result.ok, JSON.stringify(body)).toBe(false)
      if (!result.ok) expect(result.error).toBe(ADMIN_ACTION_ERRORS.invalid)
    }
  })

  it('menolak user id kosong/terlalu panjang', () => {
    expect(parseAdminAction({ action: 'ai-reset', userId: '' }).ok).toBe(false)
    expect(parseAdminAction({ action: 'ai-reset', userId: 'x'.repeat(100) }).ok).toBe(false)
  })

  it('menolak paket atau periode asing', () => {
    expect(
      parseAdminAction({ action: 'set-plan', userId: USER, planId: 'founding', period: 'lifetime' })
        .ok,
    ).toBe(false)
    expect(
      parseAdminAction({ action: 'set-plan', userId: USER, planId: 'waras', period: 'annual' }).ok,
    ).toBe(false)
  })

  it('menolak durasi perpanjangan & token di luar batas', () => {
    for (const days of [0, -7, 366, 1.5, '30hari']) {
      expect(parseAdminAction({ action: 'extend-plan', userId: USER, days }).ok, String(days)).toBe(
        false,
      )
    }
    for (const tokens of [0, -1, MAX_AI_BONUS_TOKENS + 1, 12.5, 'banyak']) {
      expect(
        parseAdminAction({ action: 'ai-bonus', userId: USER, tokens }).ok,
        String(tokens),
      ).toBe(false)
    }
    expect(isValidAiBonusTokens(5000)).toBe(true)
    expect(isValidAiBonusTokens(0)).toBe(false)
  })
})

describe('planOverridePatch', () => {
  it('memberi 30 hari dari sekarang untuk periode monthly', () => {
    const patch = planOverridePatch({ planId: 'waras', period: 'monthly', now: NOW })
    expect(patch.tier_name).toBe('waras')
    expect(patch.billing_period).toBe('monthly')
    expect(patch.is_lifetime).toBe(false)
    expect(patch.expires_at).toBe(new Date(NOW.getTime() + 30 * DAY).toISOString())
    expect(patch.is_active).toBe(true)
  })

  it('akses selamanya TIDAK punya tanggal berakhir', () => {
    const patch = planOverridePatch({ planId: 'sultan', period: 'lifetime', now: NOW })
    expect(patch.billing_period).toBe('lifetime')
    expect(patch.is_lifetime).toBe(true)
    expect(patch.expires_at).toBeNull()
  })
})

describe('extendPlanPatch', () => {
  it('menumpuk dari sisa masa aktif (bukan menimpa dari sekarang)', () => {
    const outcome = extendPlanPatch({
      plan: planStateOf(planRecord({ expiresAt: iso(5) }), NOW.getTime()),
      days: 30,
      now: NOW,
    })
    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.expiresAt).toBe(new Date(NOW.getTime() + 35 * DAY).toISOString())
      expect(outcome.patch.tier_name).toBe('waras')
      expect(outcome.patch.is_lifetime).toBe(false)
    }
  })

  it('paket yang sudah kedaluwarsa mulai dari sekarang', () => {
    const outcome = extendPlanPatch({
      plan: planStateOf(planRecord({ expiresAt: iso(-10) }), NOW.getTime()),
      days: 7,
      now: NOW,
    })
    expect(outcome.ok).toBe(true)
    if (outcome.ok) expect(outcome.expiresAt).toBe(new Date(NOW.getTime() + 7 * DAY).toISOString())
  })

  it('menolak akses selamanya dan akun tanpa paket', () => {
    const lifetime = extendPlanPatch({
      plan: planStateOf(
        planRecord({ period: 'lifetime', isLifetime: true, expiresAt: null }),
        NOW.getTime(),
      ),
      days: 30,
      now: NOW,
    })
    expect(lifetime).toEqual({ ok: false, error: ADMIN_ACTION_ERRORS.lifetime })

    const free = extendPlanPatch({
      plan: planStateOf(undefined, NOW.getTime()),
      days: 30,
      now: NOW,
    })
    expect(free).toEqual({ ok: false, error: ADMIN_ACTION_ERRORS.noPlan })
  })
})

describe('repairPatch', () => {
  const base = {
    source: {
      orderId: 'o-1',
      userId: USER,
      status: 'settlement',
      amount: 129_000,
      paymentMethod: 'qris',
      purpose: 'subscribe',
      tierName: 'sultan',
      billingPeriod: 'lifetime',
      createdAt: iso(-1),
      paidAt: iso(-1),
    },
  }

  it('menyalin akses selamanya dari pembelian lunas', () => {
    const patch = repairPatch(
      { ...base, planId: 'sultan', lifetime: true, usableUntil: null } as ExpectedEntitlement,
      NOW,
    )
    expect(patch?.tier_name).toBe('sultan')
    expect(patch?.billing_period).toBe('lifetime')
    expect(patch?.expires_at).toBeNull()
  })

  it('menyalin sisa jendela 30 hari', () => {
    const until = NOW.getTime() + 9 * DAY
    const patch = repairPatch(
      { ...base, planId: 'waras', lifetime: false, usableUntil: until } as ExpectedEntitlement,
      NOW,
    )
    expect(patch?.billing_period).toBe('monthly')
    expect(patch?.expires_at).toBe(new Date(until).toISOString())
  })

  it('TIDAK menghidupkan akses yang sudah lewat masa berlakunya', () => {
    const patch = repairPatch(
      {
        ...base,
        planId: 'waras',
        lifetime: false,
        usableUntil: NOW.getTime() - 1,
      } as ExpectedEntitlement,
      NOW,
    )
    expect(patch).toBeNull()
  })

  it('TIDAK menurunkan akses selamanya menjadi 30 hari', () => {
    const patch = repairPatch(
      {
        ...base,
        planId: 'sultan',
        lifetime: false,
        usableUntil: NOW.getTime() + 20 * DAY,
      } as ExpectedEntitlement,
      NOW,
      { isLifetime: true, active: true },
    )
    expect(patch).toBeNull()
  })
})

describe('aiBonusOrderId', () => {
  it('berpola admin-bonus dan unik untuk setiap pemberian', () => {
    const first = aiBonusOrderId(NOW, () => 0.1)
    const second = aiBonusOrderId(NOW, () => 0.9)
    expect(first.startsWith('admin-bonus-')).toBe(true)
    expect(first).not.toBe(second)
  })
})

