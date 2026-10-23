import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'

vi.mock('@/lib/supabase/rest', () => ({
  restConfigured: vi.fn(),
  restFetch: vi.fn(),
}))

import {
  isOnboardingComplete,
  isOnboardingPayload,
  onboardingDecision,
  readCallerOnboarding,
} from './onboarding'
import { restConfigured, restFetch } from '@/lib/supabase/rest'

const configured = restConfigured as unknown as Mock
const fetchRest = restFetch as unknown as Mock

afterEach(() => vi.clearAllMocks())

describe('isOnboardingComplete()', () => {
  it('hanya menerima objek dengan completedAt berisi tanggal', () => {
    expect(isOnboardingComplete({ completedAt: '2026-10-21T10:00:00.000Z' })).toBe(true)
    expect(isOnboardingComplete({ completedAt: '' })).toBe(false)
    expect(isOnboardingComplete({ completedAt: '   ' })).toBe(false)
    expect(isOnboardingComplete({})).toBe(false)
    expect(isOnboardingComplete(null)).toBe(false)
    expect(isOnboardingComplete('2026-10-21')).toBe(false)
    expect(isOnboardingComplete([])).toBe(false)
  })
})

describe('onboardingDecision()', () => {
  it('backend tidak dikenal → tidak tahu, jangan kunci', () => {
    expect(
      onboardingDecision({
        configured: false,
        settingsOk: true,
        walletsOk: true,
        onboarding: null,
        walletCount: 0,
      }),
    ).toEqual({ configured: false, known: false, onboarded: null, hasWallets: false, legacy: false })
  })

  it('salah satu query gagal → unknown, bukan "belum onboarding"', () => {
    const decision = onboardingDecision({
      configured: true,
      settingsOk: false,
      walletsOk: true,
      onboarding: null,
      walletCount: 0,
    })
    expect(decision.known).toBe(false)
    expect(decision.onboarded).toBeNull()
  })

  it('completedAt ada → selesai', () => {
    const decision = onboardingDecision({
      configured: true,
      settingsOk: true,
      walletsOk: true,
      onboarding: { completedAt: '2026-10-21T10:00:00.000Z' },
      walletCount: 1,
    })
    expect(decision).toMatchObject({ known: true, onboarded: true, legacy: false })
  })

  it('akun lama: onboarding kosong tapi sudah punya dompet → legacy selesai', () => {
    const decision = onboardingDecision({
      configured: true,
      settingsOk: true,
      walletsOk: true,
      onboarding: null,
      walletCount: 3,
    })
    expect(decision).toMatchObject({
      known: true,
      onboarded: true,
      legacy: true,
      hasWallets: true,
    })
  })

  it('baris ledger saja juga dianggap akun lama (tidak dipaksa onboarding)', () => {
    const decision = onboardingDecision({
      configured: true,
      settingsOk: true,
      walletsOk: true,
      onboarding: null,
      walletCount: 0,
      rowCount: 2,
    })
    expect(decision).toMatchObject({ known: true, onboarded: true, legacy: true })
  })

  it('akun baru: onboarding kosong & belum punya dompet → wajib onboarding', () => {
    const decision = onboardingDecision({
      configured: true,
      settingsOk: true,
      walletsOk: true,
      onboarding: null,
      walletCount: 0,
    })
    expect(decision).toMatchObject({
      known: true,
      onboarded: false,
      legacy: false,
      hasWallets: false,
    })
  })
})

describe('isOnboardingPayload()', () => {
  const valid = {
    completedAt: '2026-10-21T10:00:00.000Z',
    situations: ['first-jobber'],
    modules: [],
    wallet: { name: 'BCA', balance: 0 },
    monthlyIncome: 0,
  }

  it('menerima bentuk minimum hasil onboarding', () => {
    expect(isOnboardingPayload(valid)).toBe(true)
  })

  it('menolak bentuk yang tidak bisa dipakai gerbang', () => {
    expect(isOnboardingPayload(null)).toBe(false)
    expect(isOnboardingPayload([])).toBe(false)
    expect(isOnboardingPayload({ ...valid, completedAt: '' })).toBe(false)
    expect(isOnboardingPayload({ ...valid, situations: 'x' })).toBe(false)
    expect(isOnboardingPayload({ ...valid, wallet: null })).toBe(false)
  })
})

describe('readCallerOnboarding()', () => {
  it('tanpa backend → configured false & tidak memanggil REST', async () => {
    configured.mockReturnValue(false)
    expect(await readCallerOnboarding('t')).toEqual({
      configured: false,
      known: false,
      onboarded: null,
      hasWallets: false,
      legacy: false,
    })
    expect(fetchRest).not.toHaveBeenCalled()
  })

  it('membaca user_settings + dompet dengan token pemanggil', async () => {
    configured.mockReturnValue(true)
    fetchRest.mockImplementation((path: string) =>
      Promise.resolve(
        path.startsWith('user_settings')
          ? { ok: true, status: 200, data: [{ onboarding: null }] }
          : { ok: true, status: 200, data: [{ id: 'bca' }] },
      ),
    )
    const status = await readCallerOnboarding('token-user')
    expect(status).toMatchObject({ known: true, onboarded: true, legacy: true })
    expect(fetchRest).toHaveBeenCalledWith(
      'user_settings?select=onboarding&limit=1',
      expect.objectContaining({ accessToken: 'token-user' }),
    )
    expect(fetchRest).toHaveBeenCalledWith(
      'wallets?select=id&limit=1',
      expect.objectContaining({ accessToken: 'token-user' }),
    )
  })

  it('query gagal → known false (gerbang tidak boleh menebak)', async () => {
    configured.mockReturnValue(true)
    fetchRest.mockResolvedValue({ ok: false, status: 500, data: null })
    const status = await readCallerOnboarding('t')
    expect(status).toMatchObject({ configured: true, known: false, onboarded: null })
  })
})
