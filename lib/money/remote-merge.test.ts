import { describe, expect, it } from 'vitest'
import type { FundContribution, SinkingFundItem } from '@/lib/data/budget'
import type { Bill } from '@/lib/data/bills'
import type { Investment } from '@/lib/data/wealth'
import type { RemoteFunds } from '@/lib/supabase/funds-remote'
import type { RemoteWealth } from '@/lib/supabase/wealth-remote'
import { mergeWithRemoteBills } from './bills-store'
import { mergeWithRemoteFunds } from './funds-store'
import { mergeWithRemoteWealth } from './wealth-store'

/* ── Test gabung SERVER + perangkat (paket 64 · Paket D) ─────────────────────
   Fungsi merge murni (tanpa jaringan) yang dipakai saat hidrasi dengan sesi
   Supabase. Yang diuji: baris server jadi dasar, id domain lokal & kolom yang
   tak ada di skema dipertahankan lewat `remoteId`, dan baris lokal yang belum
   terkirim tetap ikut sebagai antrean offline. */

const bill = (over: Partial<Bill>): Bill => ({
  id: 'uuid-b1',
  name: 'Kos',
  emoji: '',
  amount: 1_500_000,
  dueDate: 5,
  isRecurring: true,
  category: 'Rumah',
  walletId: 'bca',
  isPaidThisMonth: false,
  reminderDaysBefore: 3,
  scope: 'pribadi',
  ...over,
})

describe('mergeWithRemoteBills', () => {
  it('baris server dicocokkan ke id lokal lewat remoteId & kolom lokal dipertahankan', () => {
    const remote = [bill({})]
    const local = bill({ id: '1000001', emoji: '🏠', scope: 'keluarga', remoteId: 'uuid-b1' })
    const merged = mergeWithRemoteBills(remote, {
      bills: [local],
      removedIds: [],
      hydrated: true,
    })
    expect(merged.bills).toHaveLength(1)
    expect(merged.bills[0]).toMatchObject({
      id: '1000001',
      emoji: '🏠',
      scope: 'keluarga',
      remoteId: 'uuid-b1',
      name: 'Kos',
    })
  })

  it('baris lokal yang belum terkirim tetap ikut (antrean offline)', () => {
    const merged = mergeWithRemoteBills([bill({})], {
      bills: [bill({ id: '1000002', name: 'Netflix' })],
      removedIds: [],
      hydrated: true,
    })
    expect(merged.bills.map((row) => row.id).sort()).toEqual(['1000002', 'uuid-b1'])
  })
})

describe('mergeWithRemoteFunds', () => {
  it('celengan server → id lokal & priority/scope lokal dipertahankan', () => {
    const remoteFunds: RemoteFunds = {
      funds: [
        {
          id: 998877,
          name: 'Dana Darurat',
          target: 10_000_000,
          current: 4_000_000,
          deadline: '2026-12-31',
          priority: 'sedang',
          stage: 'plant',
          scope: 'pribadi',
          contributedThisMonth: false,
          remoteId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        },
      ],
      contributions: [],
    }
    const local: SinkingFundItem = {
      ...remoteFunds.funds[0],
      id: 3,
      priority: 'tinggi',
      scope: 'keluarga',
    }
    const merged = mergeWithRemoteFunds(remoteFunds, {
      funds: [local],
      contributions: [] as FundContribution[],
      removedIds: [],
      hydrated: true,
    })
    expect(merged.funds).toHaveLength(1)
    expect(merged.funds[0]).toMatchObject({ id: 3, priority: 'tinggi', scope: 'keluarga' })
  })
})

describe('mergeWithRemoteWealth', () => {
  it('investasi server → id lokal & scope lokal dipertahankan', () => {
    const remoteInv: Investment = {
      id: 'uuid-i1',
      type: 'stock',
      name: 'BBCA',
      symbol: 'BBCA',
      quantity: 10,
      avgBuyPrice: 9_000,
      currentPrice: 9_500,
      totalInvested: 90_000,
      currentValue: 95_000,
      lastUpdate: '',
      scope: 'pribadi',
      remoteId: 'uuid-i1',
    }
    const remoteWealth: RemoteWealth = {
      investments: [remoteInv],
      debts: [],
      payments: [],
      assetTransactions: [],
    }
    const localInv: Investment = { ...remoteInv, id: 'inv-6', scope: 'bersama' }
    const merged = mergeWithRemoteWealth(remoteWealth, {
      investments: [localInv],
      debts: [],
      payments: [],
      assetTransactions: [],
      removedIds: [],
      hydrated: true,
    })
    expect(merged.investments).toHaveLength(1)
    expect(merged.investments[0]).toMatchObject({ id: 'inv-6', scope: 'bersama', remoteId: 'uuid-i1' })
  })
})
