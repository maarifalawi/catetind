import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

/* ── Bootstrap akun reviewer Midtrans ────────────────────────────────────────
   Yang dikunci:
     · reviewer selalu mendapat paket WARAS lifetime;
     · paket yang lebih tinggi TIDAK PERNAH diturunkan ke Waras;
     · onboarding hanya disemai kalau belum ada `completedAt`;
     · kegagalan baca/tulis dilaporkan jujur lewat `ok`. */

vi.mock('@/lib/supabase/rest', () => ({
  restConfigured: vi.fn(() => true),
  restFetch: vi.fn(),
}))
vi.mock('@/lib/supabase/config', () => ({
  supabaseServiceKey: vi.fn(() => 'service-key'),
}))

import {
  REVIEWER_PLAN_ID,
  ensureReviewerAccess,
  reviewerPlanNeedsWrite,
} from './reviewer-plan'
import { restFetch } from '@/lib/supabase/rest'
import { supabaseServiceKey } from '@/lib/supabase/config'

const rest = restFetch as unknown as Mock
const serviceKey = supabaseServiceKey as unknown as Mock

const OK = { ok: true, status: 200, data: null, error: undefined }
const ONBOARDED = { completedAt: '2026-01-01T00:00:00.000Z' }

beforeEach(() => {
  rest.mockReset()
  serviceKey.mockReset()
  serviceKey.mockReturnValue('service-key')
})

describe('reviewerPlanNeedsWrite()', () => {
  it('menulis saat belum ada baris sama sekali', () => {
    expect(reviewerPlanNeedsWrite(null)).toBe(true)
    expect(reviewerPlanNeedsWrite(undefined)).toBe(true)
  })

  it('tidak menulis kalau Waras lifetime sudah aktif', () => {
    expect(
      reviewerPlanNeedsWrite({ tier_name: 'waras', is_active: true, is_lifetime: true }),
    ).toBe(false)
  })

  it('tidak menurunkan paket yang lebih tinggi (Sultan)', () => {
    expect(
      reviewerPlanNeedsWrite({ tier_name: 'sultan', is_active: true, is_lifetime: true }),
    ).toBe(false)
  })

  it('menaikkan paket rendah / baris yang tidak aktif', () => {
    expect(
      reviewerPlanNeedsWrite({ tier_name: 'catet-aja', is_active: true, is_lifetime: true }),
    ).toBe(true)
    expect(
      reviewerPlanNeedsWrite({ tier_name: 'waras', is_active: false, is_lifetime: true }),
    ).toBe(true)
    expect(
      reviewerPlanNeedsWrite({ tier_name: 'waras', is_active: true, is_lifetime: false }),
    ).toBe(true)
  })

  it('memetakan tier lama (yearly) ke Waras', () => {
    expect(
      reviewerPlanNeedsWrite({ tier_name: 'yearly', is_active: true, is_lifetime: true }),
    ).toBe(false)
  })
})

describe('ensureReviewerAccess()', () => {
  it('tanpa kunci peran server → menolak tanpa memanggil REST', async () => {
    serviceKey.mockReturnValue('')

    const result = await ensureReviewerAccess('user-1')

    expect(result.ok).toBe(false)
    expect(rest).not.toHaveBeenCalled()
  })

  it('memberi Waras lifetime + menyemai onboarding untuk akun baru', async () => {
    rest
      .mockResolvedValueOnce({ ...OK, data: [] })
      .mockResolvedValueOnce(OK)
      .mockResolvedValueOnce({ ...OK, data: [{ onboarding: null }] })
      .mockResolvedValueOnce(OK)

    const result = await ensureReviewerAccess('user-1')

    expect(result).toEqual({
      ok: true,
      planId: 'waras',
      planWritten: true,
      onboardingSeeded: true,
    })
    expect(REVIEWER_PLAN_ID).toBe('waras')

    const [readUrl, readOptions] = rest.mock.calls[0]
    expect(readUrl).toBe(
      'user_subscriptions?select=tier_name,is_active,is_lifetime&user_id=eq.user-1&limit=1',
    )
    expect(readOptions).toMatchObject({ accessToken: 'service-key', apiKey: 'service-key' })

    const [writeUrl, writeOptions] = rest.mock.calls[1]
    expect(writeUrl).toBe('user_subscriptions?on_conflict=user_id')
    expect(writeOptions).toMatchObject({
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
    })
    expect(writeOptions.body).toMatchObject({
      user_id: 'user-1',
      tier_name: 'waras',
      is_lifetime: true,
      expires_at: null,
      is_active: true,
    })

    const [settingsReadUrl] = rest.mock.calls[2]
    expect(settingsReadUrl).toBe('user_settings?select=onboarding&user_id=eq.user-1&limit=1')

    const [settingsWriteUrl, settingsWriteOptions] = rest.mock.calls[3]
    expect(settingsWriteUrl).toBe('user_settings?on_conflict=user_id')
    const onboarding = (settingsWriteOptions.body as { onboarding: Record<string, unknown> })
      .onboarding
    expect(onboarding.completedAt).toEqual(expect.any(String))
    expect(Array.isArray(onboarding.situations)).toBe(true)
    expect(Array.isArray(onboarding.modules)).toBe(true)
    expect(onboarding.wallet).toEqual({ name: 'Dompet Reviewer', balance: 0 })
  })

  it('idempoten: Waras aktif + onboarding selesai → tidak menulis apa pun', async () => {
    rest
      .mockResolvedValueOnce({
        ...OK,
        data: [{ tier_name: 'waras', is_active: true, is_lifetime: true }],
      })
      .mockResolvedValueOnce({ ...OK, data: [{ onboarding: ONBOARDED }] })

    const result = await ensureReviewerAccess('user-1')

    expect(result).toEqual({
      ok: true,
      planId: 'waras',
      planWritten: false,
      onboardingSeeded: false,
    })
    expect(rest).toHaveBeenCalledTimes(2)
  })

  it('akun Sultan aktif tidak diturunkan ke Waras', async () => {
    rest
      .mockResolvedValueOnce({
        ...OK,
        data: [{ tier_name: 'sultan', is_active: true, is_lifetime: true }],
      })
      .mockResolvedValueOnce({ ...OK, data: [{ onboarding: ONBOARDED }] })

    const result = await ensureReviewerAccess('user-1')

    expect(result.planWritten).toBe(false)
    expect(rest).toHaveBeenCalledTimes(2)
    expect(rest.mock.calls.some(([url]) => String(url).includes('on_conflict'))).toBe(false)
  })

  it('gagal membaca langganan → ok:false, tanpa menulis', async () => {
    rest.mockResolvedValueOnce({ ok: false, status: 503, data: null, error: 'down' })

    const result = await ensureReviewerAccess('user-1')

    expect(result.ok).toBe(false)
    expect(rest).toHaveBeenCalledTimes(1)
  })

  it('gagal menulis langganan → ok:false, onboarding tidak disentuh', async () => {
    rest
      .mockResolvedValueOnce({ ...OK, data: [] })
      .mockResolvedValueOnce({ ok: false, status: 500, data: null, error: 'rls' })

    const result = await ensureReviewerAccess('user-1')

    expect(result).toEqual({
      ok: false,
      planId: 'waras',
      planWritten: false,
      onboardingSeeded: false,
    })
    expect(rest).toHaveBeenCalledTimes(2)
  })

  it('paket tetap sah walau status onboarding tidak bisa dibaca', async () => {
    rest
      .mockResolvedValueOnce({ ...OK, data: [] })
      .mockResolvedValueOnce(OK)
      .mockResolvedValueOnce({ ok: false, status: 503, data: null, error: 'down' })

    const result = await ensureReviewerAccess('user-1')

    expect(result).toEqual({
      ok: true,
      planId: 'waras',
      planWritten: true,
      onboardingSeeded: false,
    })
  })
})
