import { beforeEach, describe, expect, it } from 'vitest'
import { JOINT_ME, JOINT_MONTH_KEY, computeSettlement, type JointTransaction } from '@/lib/data/joint'
import {
  addJointTransaction,
  resetJointStore,
} from './joint-store'
import { resetMoneyStore } from './store'
import { resetNotificationsStore, getNotificationsSnapshot } from './notification-store'

/* ── KONTRIBUSI DOMPET BERSAMA SETELAH PELUNASAN (settle) ────────────────────
   Kasus nyata yang dilaporkan: A menalangi Rp 1.300.000 (bagi rata), lalu B
   melunasi Rp 650.000. Bar kontribusi WAJIB kembali 50%–50% (Rp 650.000 per
   orang), bukan lagi "Kamu 100% · Lawan 0%" yang hanya menghitung siapa yang
   menyerahkan uang di kasir. */

function jointTx(over: Partial<JointTransaction>): JointTransaction {
  return {
    id: 'tx',
    userId: 'a',
    paidByUserId: 'a',
    description: 'Makan bersama',
    amount: 0,
    category: 'Makanan',
    date: `${JOINT_MONTH_KEY}-05`,
    time: '12:00',
    split: { type: 'equal' },
    ...over,
  }
}

describe('kontribusi Dompet Bersama setelah settle', () => {
  it('pelunasan 50% mengubah bar kontribusi menjadi 50%–50%', () => {
    const expense = jointTx({ id: 'expense-1', amount: 1_300_000 })
    const settle = jointTx({
      id: 'settle-1',
      userId: 'b',
      paidByUserId: 'b',
      description: 'Settle bulan ini',
      amount: 650_000,
      category: 'Settle',
      isSettlement: true,
      settlementMonth: JOINT_MONTH_KEY,
      split: { type: 'single_payer', payerId: 'a' },
    })

    const state = computeSettlement([expense, settle], {
      month: JOINT_MONTH_KEY,
      members: ['a', 'b'],
      viewerId: 'a',
    })

    expect(state.members.map((row) => row.contribution)).toEqual([650_000, 650_000])
    expect(state.members.map((row) => row.contributionPct)).toEqual([50, 50])
  })

  it('tanpa settle, kontribusi tetap mengikuti siapa yang menalangi', () => {
    const expense = jointTx({ id: 'expense-2', amount: 1_300_000 })
    const state = computeSettlement([expense], {
      month: JOINT_MONTH_KEY,
      members: ['a', 'b'],
      viewerId: 'a',
    })
    expect(state.members.map((row) => row.contributionPct)).toEqual([100, 0])
  })
})

/* ── LONCENG: aktivitas Dompet Bersama menghasilkan item ───────────────────── */
describe('notifikasi aktivitas Dompet Bersama', () => {
  beforeEach(() => {
    resetNotificationsStore()
    resetMoneyStore()
    resetJointStore()
  })

  it('catatan bareng baru menambah item notifikasi "joint"', () => {
    const created = addJointTransaction({
      description: 'Belanja pasar',
      amount: 120_000,
      paidByUserId: JOINT_ME.id,
      dateISO: `${JOINT_MONTH_KEY}-06`,
    })
    expect(created).not.toBeNull()
    const items = getNotificationsSnapshot().items
    expect(items.some((item) => item.kind === 'joint' && item.body?.includes('Belanja pasar'))).toBe(
      true,
    )
  })
})
