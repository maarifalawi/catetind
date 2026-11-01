import { beforeEach, describe, expect, it } from 'vitest'
import {
  addWalletAccount,
  editFundsProblem,
  editRow,
  getMoneySnapshot,
  postExpense,
  postIncome,
  postTransaction,
  recordedTransactions,
  resetMoneyStore,
  walletBalance,
  type MoneyRow,
} from './store'
import { contributeToFund, getFundsSnapshot, resetFundsStore } from './funds-store'

/* ── SALDO DOMPET TIDAK BOLEH MINUS ──────────────────────────────────────────
   Temuan: saldo dompet bisa tampil MINUS walau `postExpense`/`postTransfer`
   sudah dijaga, karena ada TIGA pintu yang tidak memeriksa saldo:

     1. `postTransaction` hanya memeriksa tipe `expense` — padahal `saving`
        (setoran celengan) ditulis sebagai `transfer` satu sisi dan ikut
        memotong saldo;
     2. `editRow` tidak memeriksa saldo sama sekali — menaikkan nominal,
        mengubah pemasukan jadi pengeluaran, atau memindah dompet bisa
        melewati nol;
     3. `contributeToFund` menulis progres celengan lebih dulu, baru menulis
        baris kas — dan tidak pernah menanyakan saldo dompet sumbernya.

   Angka kanon seed dipakai supaya bukti bisa dibaca: BCA Rp 1.450.000,
   GoPay Rp 350.000, Tunai Rp 50.000. */

const BCA = 1_450_000

beforeEach(() => {
  resetMoneyStore()
  resetFundsStore()
})

describe('pagar saldo sub-nol — mencatat (`postTransaction`)', () => {
  it('setoran "Tabungan" di atas saldo DITOLAK tanpa menulis baris', () => {
    const row = postTransaction({
      name: 'Setor Dana Darurat',
      amount: BCA + 1,
      type: 'saving',
      category: 'Tabungan',
      wallet: 'BCA',
      dateISO: '2026-10-31',
    })

    expect(row).toBeNull()
    expect(getMoneySnapshot().rows).toHaveLength(0)
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(BCA)
  })

  it('setoran "Tabungan" yang masih tertutup saldo tetap boleh', () => {
    const row = postTransaction({
      name: 'Setor Dana Darurat',
      amount: 400_000,
      type: 'saving',
      category: 'Tabungan',
      wallet: 'BCA',
      dateISO: '2026-10-31',
    })

    expect(row).not.toBeNull()
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(BCA - 400_000)
  })

  it('pengeluaran di atas saldo tetap ditolak (regresi paket 74)', () => {
    expect(
      postTransaction({
        name: 'Belanja',
        amount: BCA + 1,
        type: 'expense',
        category: 'Belanja',
        wallet: 'BCA',
        dateISO: '2026-10-31',
      }),
    ).toBeNull()
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(BCA)
  })
})

describe('pagar saldo sub-nol — `walletId` eksplisit', () => {
  it('dompet kedua diperiksa & ditulis menurut ID-nya (bukan dompet pertama)', () => {
    const second = addWalletAccount({ name: 'BCA Cadangan', type: 'Bank', opening: 100_000 })!

    expect(
      postTransaction({
        name: 'Setor',
        amount: 200_000,
        type: 'saving',
        category: 'Tabungan',
        wallet: 'BCA',
        walletId: second.id,
        dateISO: '2026-10-31',
      }),
    ).toBeNull()

    const row = postTransaction({
      name: 'Setor',
      amount: 60_000,
      type: 'saving',
      category: 'Tabungan',
      wallet: 'BCA',
      walletId: second.id,
      dateISO: '2026-10-31',
    })

    expect(row?.walletId).toBe(second.id)
    expect(walletBalance(getMoneySnapshot(), second.id)).toBe(40_000)
    /* dompet pertama TIDAK ikut terpotong */
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(BCA)
  })
})

describe('pagar saldo sub-nol — mengedit (`editRow`)', () => {
  it('menaikkan nominal pengeluaran melewati saldo DITOLAK & saldo utuh', () => {
    const row = postExpense({ walletId: 'bca', amount: 25_000, note: 'Kopi' }) as MoneyRow

    expect(editRow(row.id, { amount: 9_000_000 })).toBeNull()
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(BCA - 25_000)
    /* alasannya bisa dibaca UI — bukan tombol Simpan yang diam saja */
    expect(editFundsProblem(row.id, { amount: 9_000_000 })).toEqual({ walletName: 'BCA' })
  })

  it('mengubah pemasukan menjadi pengeluaran melewati saldo DITOLAK', () => {
    const income = postIncome({ walletId: 'bca', amount: 100_000, note: 'Bonus' }) as MoneyRow

    expect(editRow(income.id, { type: 'expense', amount: 2_000_000 })).toBeNull()
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(BCA + 100_000)
  })

  it('memindahkan pengeluaran ke dompet yang lebih tipis DITOLAK', () => {
    const row = postExpense({ walletId: 'bca', amount: 200_000, note: 'Belanja' }) as MoneyRow

    /* Tunai hanya Rp 50.000 → 200.000 tidak mungkin dibayar dari sana */
    expect(editRow(row.id, { wallet: 'Tunai' })).toBeNull()
    expect(recordedTransactions(getMoneySnapshot())[0]?.wallet).toBe('BCA')
    expect(walletBalance(getMoneySnapshot(), 'tunai')).toBe(50_000)
  })

  it('edit yang masih tertutup saldo tetap tersimpan', () => {
    const row = postExpense({ walletId: 'bca', amount: 25_000, note: 'Kopi' }) as MoneyRow

    expect(editRow(row.id, { amount: 500_000 })).not.toBeNull()
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(BCA - 500_000)
    expect(editFundsProblem(row.id, { amount: 600_000 })).toBeNull()
  })
})

describe('pagar saldo sub-nol — setor celengan (`contributeToFund`)', () => {
  it('setoran di atas saldo dompet DITOLAK sebelum progres celengan ditulis', () => {
    const before = getFundsSnapshot()
    const fund = before.funds[0]!

    expect(contributeToFund(fund.id, BCA + 1, 'bca', '2026-10-31')).toBeNull()

    /* dua-duanya utuh: celengan TIDAK bertambah dan tidak ada baris kas */
    expect(getFundsSnapshot().funds).toEqual(before.funds)
    expect(getFundsSnapshot().contributions).toEqual(before.contributions)
    expect(getMoneySnapshot().rows).toHaveLength(0)
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(BCA)
  })

  it('setoran yang tertutup saldo tetap tercatat di dompet yang dipilih', () => {
    const fund = getFundsSnapshot().funds[0]!

    expect(contributeToFund(fund.id, 250_000, 'bca', '2026-10-31')).not.toBeNull()
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(BCA - 250_000)
    expect(getMoneySnapshot().rows).toHaveLength(1)
  })
})

