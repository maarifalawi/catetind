import { beforeEach, describe, expect, it } from 'vitest'
import {
  getMoneySnapshot,
  postExpense,
  postTransaction,
  recordedTransactions,
  resetMoneyStore,
  walletBalance,
  walletFundsCheck,
} from './store'

/* ── PENJAGA SALDO SUB-NOL (paket 74 · temuan audit Phase 1) ─────────────────
   Dulu pintu pengeluaran (`postExpense` & `postTransaction`) tidak memeriksa
   saldo sama sekali, jadi dompet bisa jadi minus: user mencatat pengeluaran
   melebihi saldonya, toast sukses tetap berbunyi, dan angka saldo jadi negatif.
   Sekarang pengeluaran > saldo dompet HIDUP ditolak TANPA menulis satu baris pun
   (`null`), dan `walletFundsCheck()` memberi UI alasannya lebih dulu.

   Dompet seed: BCA Rp 1.450.000 · GoPay Rp 350.000 · Tunai Rp 50.000. */

beforeEach(() => resetMoneyStore())

describe('penjaga saldo tidak boleh sub-nol (paket 74)', () => {
  it('postExpense > saldo ditolak; tidak ada baris & saldo tidak bergerak', () => {
    const before = getMoneySnapshot()
    const balance = walletBalance(before, 'bca')

    expect(postExpense({ walletId: 'bca', amount: balance + 1, note: 'Kebesaran' })).toBeNull()

    const after = getMoneySnapshot()
    expect(walletBalance(after, 'bca')).toBe(balance)
    expect(recordedTransactions(after)).toEqual(recordedTransactions(before))
  })

  it('postExpense tepat sama dengan saldo DIBOLEHKAN (saldo jadi 0, bukan minus)', () => {
    const balance = walletBalance(getMoneySnapshot(), 'bca')

    const row = postExpense({ walletId: 'bca', amount: balance, note: 'Habis pas' })

    expect(row).not.toBeNull()
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(0)
  })

  it('postTransaction pengeluaran > saldo ditolak (jalur manual/AI)', () => {
    const balance = walletBalance(getMoneySnapshot(), 'gopay')

    const row = postTransaction({
      name: 'Nembak',
      amount: balance + 100_000,
      type: 'expense',
      category: 'Makanan',
      wallet: 'GoPay',
      dateISO: '2026-10-07',
    })

    expect(row).toBeNull()
    expect(walletBalance(getMoneySnapshot(), 'gopay')).toBe(balance)
  })

  it('postTransaction pemasukan TIDAK dijepit saldo (uang masuk selalu boleh)', () => {
    const before = walletBalance(getMoneySnapshot(), 'gopay')

    const row = postTransaction({
      name: 'Bonus',
      amount: 10_000_000,
      type: 'income',
      category: 'Gaji Utama',
      wallet: 'GoPay',
      dateISO: '2026-10-07',
    })

    expect(row).not.toBeNull()
    expect(walletBalance(getMoneySnapshot(), 'gopay')).toBe(before + 10_000_000)
  })

  it('dompet yang belum ada di ledger tidak dijepit (baris tetap tercatat)', () => {
    /* 'OVO' belum jadi dompet ledger → menulis `walletId: ''` dan tidak memotong
       saldo mana pun, jadi tidak ada yang perlu dijaga. */
    const row = postTransaction({
      name: 'Pakai OVO',
      amount: 5_000_000,
      type: 'expense',
      category: 'Makanan',
      wallet: 'OVO',
      dateISO: '2026-10-07',
    })

    expect(row).not.toBeNull()
    const check = walletFundsCheck(getMoneySnapshot(), 'OVO', 5_000_000)
    expect(check.known).toBe(false)
    expect(check.sufficient).toBe(true)
  })

  it('walletFundsCheck: dompet dikenal, cukup vs tidak cukup, tanpa membalik fakta', () => {
    const snapshot = getMoneySnapshot()
    expect(walletFundsCheck(snapshot, 'BCA', 100_000)).toEqual({
      known: true,
      sufficient: true,
      balance: 1_450_000,
    })
    expect(walletFundsCheck(snapshot, 'BCA', 1_450_001).sufficient).toBe(false)
    expect(walletFundsCheck(snapshot, 'Dompet Hantu', 1).known).toBe(false)
  })
})
