import { beforeEach, describe, expect, it } from 'vitest'
import { computeSettlement, splitSpecOf } from '@/lib/data/joint'
import { getMoneySnapshot, recordedTransactions, resetMoneyStore, walletBalance } from './store'
import {
  addJointTransaction,
  applyRemoteJointDelete,
  applyRemoteJointUpdate,
  applyRemoteJointWallet,
  clearJointAfterLoss,
  consumeJointPocketRemoved,
  deleteJointPocket,
  deleteJointTransaction,
  getJointSnapshot,
  jointLedgerFeed,
  jointMemberList,
  jointNotes,
  leaveJointPocket,
  resetJointStore,
  settleJointTransfer,
} from './joint-store'

/* ── DOMPET BERSAMA 3–4 ORANG: PELUNASAN PER PASANGAN & SINKRONISASI ─────────
   Tiga janji yang dikunci di lapis store (bukan komponen):

     1. Melunasi B→A di grup 4 orang HANYA menutup utang B; utang C & D utuh.
        Catatan pelunasannya menyebut pembayar B dan penerima manfaat 100% A.
     2. Menghapus satu baris transaksi langsung mengubah posisi impas.
     3. Pemasukan bersama yang ditautkan ke dompet pribadi MENAMBAH saldo
        (bukan memotongnya), dan dompet yang dihapus pemilik dibersihkan dari
        perangkat anggota lain tanpa menyisakan dompet hantu. */

const A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const C = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const D = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
const WALLET = '99999999-9999-9999-9999-999999999999'
const MONTH = '2026-11'
const DAY = `${MONTH}-20`

beforeEach(() => {
  resetMoneyStore()
  resetJointStore()
  /* kantong server 4 orang, pemilik sesi = A, tanpa baris awal */
  applyRemoteJointWallet({
    wallet: { id: WALLET, name: 'Kantong Berempat', createdAt: '2026-11-01' },
    viewerId: A,
    ownerId: A,
    members: [A, B, C, D],
    memberNames: { [A]: 'Kamu', [B]: 'Bayu', [C]: 'Citra', [D]: 'Dewi' },
    rows: [],
  })
})

function settlementOf() {
  return computeSettlement(jointLedgerFeed(getJointSnapshot(), MONTH), {
    month: MONTH,
    members: getJointSnapshot().members,
    people: jointMemberList(getJointSnapshot()),
    viewerId: A,
  })
}

function transfers() {
  return settlementOf().transfers.map((row) => ({
    from: row.from.id,
    to: row.to.id,
    amount: row.amount,
  }))
}

function netOfAll() {
  return settlementOf().members.reduce<Record<string, number>>((acc, row) => {
    acc[row.person.id] = row.net
    return acc
  }, {})
}

describe('pelunasan per pasangan di grup 4 orang', () => {
  it('B→A hanya menutup utang B; C & D tetap harus transfer ke A', () => {
    const expense = addJointTransaction({
      description: 'Makan malam berempat',
      amount: 400_000,
      paidByUserId: A,
      dateISO: DAY,
      split: { type: 'equal' },
    })!
    expect(expense).not.toBeNull()

    /* sebelum dilunasi: tiga orang masing-masing 100rb ke Ani */
    expect(transfers()).toEqual([
      { from: B, to: A, amount: 100_000 },
      { from: C, to: A, amount: 100_000 },
      { from: D, to: A, amount: 100_000 },
    ])

    const settle = settleJointTransfer({
      month: MONTH,
      from: B,
      to: A,
      amount: 100_000,
      dateISO: `${MONTH}-25`,
      method: 'BCA',
    })!
    expect(settle).not.toBeNull()
    /* catatan pelunasan: pembayar B, penerima manfaat 100% A */
    expect(settle.paidByUserId).toBe(B)
    expect(settle.isSettlement).toBe(true)
    expect(splitSpecOf(settle)).toEqual({ type: 'single_payer', payerId: A })

    /* B menjadi nol; C & D TIDAK berubah sedikit pun */
    expect(netOfAll()).toEqual({
      [A]: 200_000,
      [B]: 0,
      [C]: -100_000,
      [D]: -100_000,
    })
    expect(transfers()).toEqual([
      { from: C, to: A, amount: 100_000 },
      { from: D, to: A, amount: 100_000 },
    ])
    /* pelunasan bukan pengeluaran: total belanja tetap 400rb */
    expect(settlementOf().totalSpent).toBe(400_000)
  })

  it('pelunasan kedua (C→A) tidak menyentuh sisa utang D', () => {
    addJointTransaction({
      description: 'Belanja patungan',
      amount: 400_000,
      paidByUserId: A,
      dateISO: DAY,
      split: { type: 'equal' },
    })
    settleJointTransfer({ month: MONTH, from: B, to: A, amount: 100_000, dateISO: `${MONTH}-25` })
    settleJointTransfer({ month: MONTH, from: C, to: A, amount: 100_000, dateISO: `${MONTH}-26` })

    expect(netOfAll()).toEqual({ [A]: 100_000, [B]: 0, [C]: 0, [D]: -100_000 })
    expect(transfers()).toEqual([{ from: D, to: A, amount: 100_000 }])
  })
})

describe('hapus satu baris transaksi bersama', () => {
  it('mengubah posisi impas & total tanpa menyisakan baris di layar', () => {
    const tx = addJointTransaction({
      description: 'Salah input',
      amount: 200_000,
      paidByUserId: A,
      dateISO: DAY,
      split: { type: 'equal' },
    })!
    expect(settlementOf().totalSpent).toBe(200_000)
    expect(transfers()).toHaveLength(3)

    expect(deleteJointTransaction(tx.id)).not.toBeNull()

    expect(settlementOf().totalSpent).toBe(0)
    expect(transfers()).toEqual([])
    expect(jointNotes(getJointSnapshot()).some((row) => row.id === tx.id)).toBe(false)

    /* barisnya ditandai tombstone (bukan dibuang) supaya Undo tetap mungkin */
    expect(getJointSnapshot().removedIds).toContain(tx.id)
  })
})

describe('pemasukan bersama → dompet kas pribadi', () => {
  it('menambah saldo dompet sebagai pemasukan, bukan memotongnya', () => {
    const before = walletBalance(getMoneySnapshot(), 'bca')

    const tx = addJointTransaction({
      description: 'Setoran kas bersama',
      amount: 75_000,
      kind: 'income',
      paidByUserId: A,
      cashWalletId: 'bca',
      dateISO: DAY,
    })!

    expect(tx).not.toBeNull()
    expect(tx.kind).toBe('income')
    expect(tx.cashRowId).toBeTruthy()
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(before + 75_000)

    const row = recordedTransactions(getMoneySnapshot()).find(
      (item) => item.name === 'Setoran kas bersama',
    )
    expect(row).toBeDefined()
    expect(row!.type).toBe('income')
    expect(row!.amount).toBe(75_000)
    /* pemasukan bersama BUKAN pengeluaran bersama */
    expect(settlementOf().totalSpent).toBe(0)
    expect(settlementOf().totalIncome).toBe(75_000)
  })
})

describe('sinkronisasi realtime antar-perangkat', () => {
  it('baris yang dihapus perangkat lain langsung hilang & impas berubah', () => {
    const tx = addJointTransaction({
      description: 'Dobel simpan',
      amount: 200_000,
      paidByUserId: A,
      dateISO: DAY,
      split: { type: 'equal' },
    })!
    expect(settlementOf().totalSpent).toBe(200_000)

    expect(applyRemoteJointDelete(tx.id)).toBe(true)
    expect(settlementOf().totalSpent).toBe(0)
    expect(getJointSnapshot().removedIds).toContain(tx.id)
    /* sinyal yang sama tidak diproses dua kali */
    expect(applyRemoteJointDelete(tx.id)).toBe(false)
  })

  it('pembagian yang diubah perangkat lain mengganti baris yang sama (tidak dobel)', () => {
    const tx = addJointTransaction({
      description: 'Belanja',
      amount: 400_000,
      paidByUserId: A,
      dateISO: DAY,
      split: { type: 'equal' },
    })!
    expect(transfers()).toHaveLength(3)

    const updated = applyRemoteJointUpdate({
      id: tx.id,
      joint_wallet_id: WALLET,
      user_id: A,
      paid_by_user_id: A,
      description: 'Belanja',
      amount: 400_000,
      category: 'Lainnya',
      date: DAY,
      time_label: '19:30',
      split_type: 'percentage',
      split_percents: { [A]: 0, [B]: 100, [C]: 0, [D]: 0 },
      split_amounts: null,
      split_members: null,
      is_settlement: false,
      kind: 'expense',
    })

    expect(updated).not.toBeNull()
    expect(updated!.id).toBe(tx.id)
    expect(getJointSnapshot().transactions.filter((row) => row.id === tx.id)).toHaveLength(1)
    /* B menanggung seluruh 400rb → hanya B yang harus transfer ke A */
    expect(transfers()).toEqual([{ from: B, to: A, amount: 400_000 }])
  })
})

describe('hapus dompet / keluar → bersih di semua perangkat', () => {
  it('clearJointAfterLoss membersihkan dompet & menandai baris terhapus', () => {
    const tx = addJointTransaction({
      description: 'Kopi',
      amount: 40_000,
      paidByUserId: A,
      dateISO: DAY,
    })!

    clearJointAfterLoss()

    const snapshot = getJointSnapshot()
    expect(snapshot.wallet.name).toBe('')
    expect(snapshot.members).toEqual([])
    expect(snapshot.ownerId).toBeNull()
    expect(snapshot.removedIds).toContain(tx.id)
    expect(jointNotes(snapshot)).toHaveLength(0)
    /* sinyal untuk halaman: sekali saja */
    expect(consumeJointPocketRemoved()).toBe(true)
    expect(consumeJointPocketRemoved()).toBe(false)
  })

  it('deleteJointPocket mengosongkan state perangkat', async () => {
    addJointTransaction({ description: 'Bensin', amount: 90_000, paidByUserId: A, dateISO: DAY })

    const result = await deleteJointPocket()
    expect(result.deleted).toBe(true)
    const snapshot = getJointSnapshot()
    expect(snapshot.members).toHaveLength(0)
    expect(snapshot.wallet.name).toBe('')
    expect(jointNotes(snapshot)).toHaveLength(0)
  })

  it('leaveJointPocket melepas anggota tanpa menghapus catatan orang lain', async () => {
    addJointTransaction({ description: 'Listrik', amount: 120_000, paidByUserId: A, dateISO: DAY })

    const result = await leaveJointPocket()
    expect(result.left).toBe(true)
    const snapshot = getJointSnapshot()
    expect(snapshot.members).toHaveLength(0)
    expect(snapshot.wallet.name).toBe('')
    /* catatan yang tadinya ada ditandai terhapus (tombstone) supaya tidak
       "lahir lagi" saat state perangkat dibaca ulang */
    expect(snapshot.removedIds.length).toBeGreaterThan(0)
    expect(jointNotes(snapshot)).toHaveLength(0)
  })
})
