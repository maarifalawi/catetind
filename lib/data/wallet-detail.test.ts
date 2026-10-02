import { beforeEach, describe, expect, it } from 'vitest'
import {
  WALLET_DETAIL_WINDOW_DAYS,
  WALLET_DETAIL_TRANSACTIONS,
  walletSparkline,
  walletSummary30d,
  walletTransactions,
  walletWindow,
} from './wallet-detail'
import { shiftISODate, type HistoryTransaction } from './history'
import {
  addWalletAccount,
  applyRowOverride,
  editRow,
  getMoneySnapshot,
  incomingTransfersFor,
  isRowRemoved,
  postExpense,
  postTransfer,
  removeRow,
  resetMoneyStore,
  rowOverrideOf,
  recordedTransactions,
  walletAccountOf,
  walletTransactionsOf,
  type MoneyRow,
} from '@/lib/money/store'
import type { TransactionType } from '../types'

/* ── Test DOMPET DETAIL: HANYA TRANSAKSI DOMPET ITU (paket 59 · item 59.3) ────
   Keluhan audit 28 Sep 2026: halaman `/wallet/[id]` menggabungkan tiga sumber
   dan baris sesi dicocokkan **lewat NAMA dompet** (`tx.wallet === wallet.name`).
   Karena user bisa punya dua dompet bernama sama, catatan dompet A bisa muncul di
   dompet B — dan karena hasil editnya diterapkan `applyRowOverride`, tampilannya
   terlihat seperti data yang sah.

   Aturan baru: identitas baris = `row.walletId` (plus `counterWalletId` untuk
   sisi masuk pindah dana). Baris tanpa `walletId` tidak dipaksa masuk ke dompet
   mana pun. Test di bawah mengunci aturan itu, plus kejujuran judul periode:
   jendela 30 hari dihitung dari HARI INI — bukan dari catatan terbaru, yang dulu
   membuat rentang "27 Sep – 28 Sep" tetap berjudul "Ringkas 30 Hari". */

const TODAY = '2026-09-30'

/** catatan uji ber-tanggal tetap (pola repo: tanggal mock = string, bukan Date) */
function tx(
  id: number,
  date: string,
  type: TransactionType = 'expense',
  amount = 10_000,
): HistoryTransaction {
  return {
    id,
    name: 'Catatan uji',
    amount,
    type,
    category: 'Lainnya',
    wallet: 'BCA',
    date,
    time: '08:00',
    aiGenerated: false,
  }
}

beforeEach(() => {
  resetMoneyStore()
})

describe('dompet yang baru dibuat tidak mewarisi catatan siapa pun (59.3)', () => {
  it('0 catatan dari KETIGA sumber yang dipakai halaman', () => {
    const created = addWalletAccount({ name: 'Dompet Baru', type: 'Bank', opening: 0 })
    const snapshot = getMoneySnapshot()

    expect(walletTransactions(created.id)).toHaveLength(0)
    expect(walletTransactionsOf(snapshot, created.id)).toHaveLength(0)
    expect(incomingTransfersFor(snapshot, created.id)).toHaveLength(0)
  })
})

describe('identitas baris = id dompet, bukan nama (59.3)', () => {
  it('dua dompet ber-NAMA SAMA tidak saling menampilkan catatan', () => {
    const first = addWalletAccount({ name: 'BCA', type: 'Bank', opening: 100_000 })
    const second = addWalletAccount({ name: 'BCA', type: 'Bank', opening: 200_000 })
    /* nama keduanya identik — pencocokan by-name mustahil membedakannya */
    expect(first.name).toBe(second.name)
    postExpense({ walletId: first.id, amount: 25_000, note: 'Kopi di BCA pertama' })

    const snapshot = getMoneySnapshot()
    expect(walletTransactionsOf(snapshot, first.id)).toHaveLength(1)
    expect(walletTransactionsOf(snapshot, second.id)).toHaveLength(0)
    /* nama dompet di barisnya tetap "BCA" — inilah yang dulu bikin bocor */
    expect(recordedTransactions(snapshot)[0]?.wallet).toBe('BCA')
  })

  it('transfer masuk hanya muncul di dompet TUJUAN', () => {
    postTransfer({ fromWalletId: 'bca', toWalletId: 'gopay', amount: 250_000, note: '' })
    const snapshot = getMoneySnapshot()

    expect(incomingTransfersFor(snapshot, 'gopay')).toHaveLength(1)
    expect(incomingTransfersFor(snapshot, 'bca')).toHaveLength(0)
    /* baris keluarnya menempel di dompet ASAL, bukan di tujuan */
    expect(walletTransactionsOf(snapshot, 'bca')).toHaveLength(1)
    expect(walletTransactionsOf(snapshot, 'gopay')).toHaveLength(0)
  })

  it('baris tanpa `walletId` tidak dipaksa masuk ke dompet mana pun', () => {
    const snapshot = getMoneySnapshot()
    /* tidak ada satu dompet kanon pun yang mengklaim baris seperti itu */
    for (const wallet of snapshot.wallets) {
      expect(walletTransactionsOf(snapshot, wallet.id)).toHaveLength(0)
    }
    expect(walletTransactionsOf(snapshot, '')).toHaveLength(0)
  })
})

describe('tombstone & hasil edit dihormati (59.3)', () => {
  it('catatan yang dihapus keluar dari daftar dompetnya', () => {
    const row = postExpense({ walletId: 'bca', amount: 25_000, note: 'Kopi' }) as MoneyRow
    removeRow(row.id)
    expect(walletTransactionsOf(getMoneySnapshot(), 'bca')).toHaveLength(0)
  })

  it('tombstone baris MOCK dompet juga dihormati (halaman menyaringnya)', () => {
    const mock = WALLET_DETAIL_TRANSACTIONS.bca?.[0] as HistoryTransaction
    expect(isRowRemoved(getMoneySnapshot(), mock.id)).toBe(false)
    removeRow(mock.id)
    expect(isRowRemoved(getMoneySnapshot(), mock.id)).toBe(true)
  })

  it('hasil edit baris mock dompet ini terbaca semua halaman (`applyRowOverride`)', () => {
    const mock = WALLET_DETAIL_TRANSACTIONS.bca?.[0] as HistoryTransaction
    expect(editRow(mock.id, { amount: 99_000 })).not.toBeNull()

    const snapshot = getMoneySnapshot()
    expect(applyRowOverride(snapshot, mock).amount).toBe(99_000)
    expect(rowOverrideOf(snapshot, mock.id)).toMatchObject({ amount: 99_000 })
  })
})

describe('jendela 30 hari: dari HARI INI, bukan dari catatan terbaru (59.3)', () => {
  it('memasukkan tepat 30 hari terakhir dan menolak yang lebih tua', () => {
    const txs = [
      tx(1, TODAY),
      tx(2, shiftISODate(TODAY, -(WALLET_DETAIL_WINDOW_DAYS - 1))),
      tx(3, shiftISODate(TODAY, -WALLET_DETAIL_WINDOW_DAYS)),
    ]
    expect(walletWindow(txs, TODAY).map((item) => item.id)).toEqual([1, 2])
  })

  it('catatan yang lebih baru dari hari ini bukan bagian dari "30 hari terakhir"', () => {
    expect(walletWindow([tx(9, '2026-12-31')], TODAY)).toEqual([])
  })

  it('tanpa hari ini yang diketahui, jendelanya kosong — bukan ditebak dari data', () => {
    const txs = [tx(1, TODAY)]
    expect(walletWindow(txs, '')).toEqual([])
    expect(walletSummary30d(txs, '')).toBeNull()
  })

  it('jendela tanpa catatan → ringkasannya null (bukan deretan angka nol)', () => {
    const old = [tx(1, '2026-05-01', 'expense', 500_000)]
    expect(walletSummary30d(old, TODAY)).toBeNull()
    const wallet = walletAccountOf(getMoneySnapshot(), 'bca')!
    expect(walletSparkline(wallet, old, TODAY)).toEqual([])
  })

  it('ringkasan menghitung masuk/keluar/net dari catatan NYATA dompet ini', () => {
    postExpense({ walletId: 'bca', amount: 100_000, note: 'Kopi', dateISO: TODAY })
    postTransfer({
      fromWalletId: 'gopay',
      toWalletId: 'bca',
      amount: 50_000,
      note: '',
      dateISO: TODAY,
    })
    const snapshot = getMoneySnapshot()
    /* komposisi yang sama dengan halaman: baris dompet ini + sisi masuk transfer */
    const txs = [
      ...walletTransactionsOf(snapshot, 'bca'),
      ...incomingTransfersFor(snapshot, 'bca'),
    ]
    const summary = walletSummary30d(txs, TODAY)

    expect(summary).not.toBeNull()
    expect(summary?.count).toBe(2)
    /* pindah dana netral: tidak dihitung sebagai pemasukan (net worth tetap) */
    expect(summary?.income).toBe(0)
    expect(summary?.expense).toBe(100_000)
    expect(summary?.net).toBe(-100_000)
  })

  it('sparkline berakhir di saldo dompet yang dibaca kartu', () => {
    const wallet = walletAccountOf(getMoneySnapshot(), 'bca')!
    postExpense({ walletId: 'bca', amount: 85_000, note: 'Kopi', dateISO: TODAY })
    const txs = walletTransactionsOf(getMoneySnapshot(), 'bca')
    const points = walletSparkline(wallet, txs, TODAY)

    expect(points).toHaveLength(1)
    expect(points[points.length - 1]!.balance).toBe(wallet.balance)
  })
})