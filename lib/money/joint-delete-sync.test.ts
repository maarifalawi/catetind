import { beforeEach, describe, expect, it } from 'vitest'
import type { JointTransaction } from '@/lib/data/joint'
import { resetMoneyStore } from './store'
import {
  addJointTransaction,
  applyRemoteJointWallet,
  deleteJointTransaction,
  deleteJointTransactionEverywhere,
  getJointSnapshot,
  jointLedgerFeed,
  resetJointStore,
} from './joint-store'

/* ── HAPUS CATATAN BERSAMA HARUS SAMPAI KE SERVER (10 Nov 2026) ──────────────
   Keluhan pemilik produk: "transaksi yang gua hapus di akun pertama masih ada
   di akun kedua". Dua bug nyata yang dikunci di sini:

     1. Baris hasil BACAAN server tidak membawa `remoteId` — id-nya sendiri sudah
        uuid server. `deleteJointTransaction()` versi lama hanya mengirim DELETE
        kalau `remoteId` ada, jadi catatan yang dibuka dari server TIDAK PERNAH
        dihapus di sana: hilang di perangkat ini, tetap ada di perangkat lain.
     2. `deleteRemoteJointTransaction()` hanya memeriksa `error`. DELETE yang
        ditolak RLS menghasilkan 0 baris TANPA error, jadi dilaporkan "berhasil".

   Tanpa backend, "server" tidak bisa dihubungi — dan itulah yang diuji: baris
   ber-id server TIDAK boleh hilang dari layar kalau server belum menerima.
   Menghapus lokal saja adalah cara paling pasti membuat dua akun menampilkan
   angka yang berbeda. */

const A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const WALLET = '99999999-9999-9999-9999-999999999999'
const SERVER_ROW_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const MONTH = '2026-11'
const DAY = `${MONTH}-20`

const serverRow: JointTransaction = {
  id: SERVER_ROW_ID,
  userId: A,
  paidByUserId: A,
  description: 'Makan bareng',
  amount: 75_000,
  category: 'Makan',
  date: DAY,
  time: '12:30',
  split: { type: 'equal' },
}

beforeEach(() => {
  resetMoneyStore()
  resetJointStore()
  applyRemoteJointWallet({
    wallet: { id: WALLET, name: 'Dompet Kita', createdAt: '2026-11-01' },
    viewerId: A,
    ownerId: A,
    members: [A, B],
    memberNames: { [A]: 'Kamu', [B]: 'Pasangan' },
    rows: [serverRow],
  })
})

describe('hapus catatan bersama · sampai ke server', () => {
  it('baris hasil bacaan server membawa id server, bukan `remoteId`', () => {
    const row = getJointSnapshot().transactions.find((tx) => tx.id === SERVER_ROW_ID)
    expect(row).toBeDefined()
    expect(row?.remoteId).toBeUndefined()
    expect(jointLedgerFeed(getJointSnapshot(), MONTH).map((tx) => tx.id)).toContain(SERVER_ROW_ID)
  })

  it('server tidak bisa dihubungi → baris TIDAK dihapus (bukan hilang sepihak)', async () => {
    const outcome = await deleteJointTransactionEverywhere(SERVER_ROW_ID)
    expect(outcome).toEqual({ removed: false, serverOk: false })
    expect(getJointSnapshot().removedIds).not.toContain(SERVER_ROW_ID)
    expect(jointLedgerFeed(getJointSnapshot(), MONTH).map((tx) => tx.id)).toContain(SERVER_ROW_ID)
  })

  it('baris yang belum pernah terkirim tetap bisa dihapus lokal', async () => {
    const local = addJointTransaction({
      description: 'Kopi',
      amount: 20_000,
      paidByUserId: A,
      dateISO: DAY,
    })
    expect(local).not.toBeNull()
    expect(local?.remoteId).toBeUndefined()

    const outcome = await deleteJointTransactionEverywhere(local!.id)
    expect(outcome).toEqual({ removed: true, serverOk: true })
    expect(getJointSnapshot().removedIds).toContain(local!.id)
    expect(jointLedgerFeed(getJointSnapshot(), MONTH).map((tx) => tx.id)).not.toContain(local!.id)
  })

  it('id yang tidak ada = tidak ada yang ditulis', async () => {
    const outcome = await deleteJointTransactionEverywhere('tidak-ada')
    expect(outcome).toEqual({ removed: false, serverOk: true, reason: 'missing' })
    expect(getJointSnapshot().removedIds).toHaveLength(0)
  })

  it('jalur demo (sinkron) tetap menghapus baris server di perangkat ini', () => {
    expect(deleteJointTransaction(SERVER_ROW_ID)).not.toBeNull()
    expect(getJointSnapshot().removedIds).toContain(SERVER_ROW_ID)
  })
})
