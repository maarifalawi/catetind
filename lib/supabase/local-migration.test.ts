import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'

vi.mock('./client', () => ({ browserSupabase: vi.fn() }))
vi.mock('./user-settings-remote', () => ({ patchUserSettings: vi.fn() }))

import { migrateLocalDataToServer, type LocalSettingsSnapshot } from './local-migration'
import { browserSupabase } from './client'
import { patchUserSettings } from './user-settings-remote'
import { WALLET_SEED } from '@/lib/wallets'

const client = browserSupabase as unknown as Mock
const patch = patchUserSettings as unknown as Mock

const SETTINGS: LocalSettingsSnapshot = {
  onboarding: null,
  monthlyTargets: null,
  masked: false,
}

function fakeClient({
  wallets = 0,
  rows = 0,
  upsertOk = true,
}: {
  wallets?: number
  rows?: number
  upsertOk?: boolean
} = {}) {
  const upsert = vi.fn().mockResolvedValue({ error: upsertOk ? null : { code: 'x' } })
  const insert = vi.fn().mockResolvedValue({ error: upsertOk ? null : { code: 'x' } })
  return {
    from: (table: string) => {
      if (table === 'wallets') {
        return {
          select: () => Promise.resolve({ count: wallets }),
          upsert,
        }
      }
      return {
        select: () => Promise.resolve({ count: rows }),
        insert,
      }
    },
    upsert,
    insert,
  }
}

afterEach(() => vi.clearAllMocks())

describe('migrateLocalDataToServer — gerbang kepemilikan data', () => {
  it('data tanpa pemilik TIDAK diunggah tanpa persetujuan', async () => {
    const fake = fakeClient()
    client.mockReturnValue(fake)
    const result = await migrateLocalDataToServer(
      {
        userId: 'user-baru',
        wallets: [WALLET_SEED[0]!],
        rows: [],
        ownerUserId: null,
      },
      { readSettings: () => SETTINGS },
    )
    expect(result).toMatchObject({ ran: false, needsConsent: true })
    expect(fake.upsert).not.toHaveBeenCalled()
    expect(patch).not.toHaveBeenCalled()
  })

  it('data milik akun lain juga tidak diunggah tanpa persetujuan', async () => {
    client.mockReturnValue(fakeClient())
    const result = await migrateLocalDataToServer(
      {
        userId: 'user-baru',
        wallets: [WALLET_SEED[0]!],
        rows: [],
        ownerUserId: 'user-lama',
      },
      { readSettings: () => SETTINGS },
    )
    expect(result.needsConsent).toBe(true)
  })

  it('snapshot milik user yang sama tetap dimigrasikan', async () => {
    const fake = fakeClient()
    client.mockReturnValue(fake)
    patch.mockResolvedValue(true)
    const result = await migrateLocalDataToServer(
      {
        userId: 'user-1',
        wallets: [WALLET_SEED[0]!],
        rows: [],
        ownerUserId: 'user-1',
      },
      { readSettings: () => SETTINGS },
    )
    expect(result).toMatchObject({ ran: true, needsConsent: false, wallets: 1 })
    expect(fake.upsert).toHaveBeenCalledTimes(1)
  })

  it('persetujuan eksplisit membuka jalur impor data tanpa pemilik', async () => {
    const fake = fakeClient()
    client.mockReturnValue(fake)
    patch.mockResolvedValue(true)
    const result = await migrateLocalDataToServer(
      {
        userId: 'user-1',
        wallets: [WALLET_SEED[0]!],
        rows: [],
        ownerUserId: null,
        consent: true,
      },
      { readSettings: () => SETTINGS },
    )
    expect(result).toMatchObject({ ran: true, needsConsent: false, wallets: 1 })
  })

  it('server sudah berisi data → tidak menimpa & tidak minta consent', async () => {
    client.mockReturnValue(fakeClient({ wallets: 2 }))
    const result = await migrateLocalDataToServer(
      {
        userId: 'user-1',
        wallets: [WALLET_SEED[0]!],
        rows: [],
        ownerUserId: null,
      },
      { readSettings: () => SETTINGS },
    )
    expect(result).toMatchObject({ alreadyDone: true, needsConsent: false, ran: false })
  })

  it('tanpa data lokal → selesai tanpa menyentuh server', async () => {
    const fake = fakeClient({ wallets: 0, rows: 0 })
    client.mockReturnValue(fake)
    const result = await migrateLocalDataToServer(
      { userId: 'user-1', wallets: [], rows: [], ownerUserId: 'user-1' },
      { readSettings: () => SETTINGS },
    )
    expect(result).toMatchObject({ alreadyDone: true, ran: false })
    expect(fake.upsert).not.toHaveBeenCalled()
  })
})
