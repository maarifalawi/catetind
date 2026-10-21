import { describe, expect, it } from 'vitest'
import {
  budgetCategoryOfTransaction,
  periodWindow,
  spentForBudget,
  suggestedBudgetCategory,
  transactionMatchesBudget,
  type BudgetItem,
} from './budget'
import type { HistoryTransaction } from './history'

/* ── PENGELUARAN MASUK KE BUDGET KATEGORI (temuan pemilik produk) ───────────
   Kasus yang dilaporkan: budget "Makanan" Rp 500.000 + pengeluaran
   "Delivery Makanan" Rp 150.000, tetapi kartunya tetap 0%.

   Penyebabnya perbandingan `tx.category === budget.category`: kategori budget
   KASAR, kategori transaksi RINCI. Test ini mengunci pemetaan barunya supaya
   bug itu tidak pernah kembali. */

function budget(over: Partial<BudgetItem>): BudgetItem {
  return {
    id: 1,
    category: 'Makanan',
    icon: '🍜',
    limit: 500_000,
    spent: 0,
    period: 'monthly',
    scope: 'pribadi',
    ...over,
  }
}

function tx(over: Partial<HistoryTransaction>): HistoryTransaction {
  return {
    id: 1,
    name: 'Delivery',
    amount: 150_000,
    type: 'expense',
    category: 'Delivery Makanan',
    wallet: 'BCA',
    date: '2026-10-10',
    time: '12:00',
    aiGenerated: false,
    ...over,
  }
}

const OCTOBER = periodWindow('monthly', '2026-10-20')

describe('budgetCategoryOfTransaction', () => {
  it('memetakan subkategori ke kategori budget yang kasar', () => {
    expect(budgetCategoryOfTransaction('Delivery Makanan')).toBe('Makanan')
    expect(budgetCategoryOfTransaction('Makan di Luar')).toBe('Makanan')
    expect(budgetCategoryOfTransaction('Belanja Dapur')).toBe('Makanan')
    expect(budgetCategoryOfTransaction('Ojek Online')).toBe('Transportasi')
    expect(budgetCategoryOfTransaction('Streaming')).toBe('Hiburan')
    expect(budgetCategoryOfTransaction('Listrik')).toBe('Tagihan')
  })

  it('Kopi & Minuman punya budget sendiri, bukan ikut Makanan', () => {
    expect(budgetCategoryOfTransaction('Kopi & Minuman')).toBe('Kopi')
    expect(transactionMatchesBudget('Makanan', 'Kopi & Minuman')).toBe(false)
    expect(transactionMatchesBudget('Kopi', 'Kopi & Minuman')).toBe(true)
  })

  it('kategori di luar daftar dikenal masuk ke Lainnya (tidak hilang diam-diam)', () => {
    expect(budgetCategoryOfTransaction('Pendidikan')).toBe('Lainnya')
    expect(budgetCategoryOfTransaction('Kursus & Les')).toBe('Lainnya')
    expect(budgetCategoryOfTransaction('')).toBe('Lainnya')
  })

  it('label KASAR data lama / hasil AI tetap terbaca', () => {
    expect(budgetCategoryOfTransaction('Makanan')).toBe('Makanan')
    expect(budgetCategoryOfTransaction('Transportasi')).toBe('Transportasi')
    expect(budgetCategoryOfTransaction('Kopi')).toBe('Kopi')
    expect(budgetCategoryOfTransaction('Lainnya')).toBe('Lainnya')
  })
})

describe('spentForBudget', () => {
  it('budget Makanan Rp 500.000 + Delivery Makanan Rp 150.000 = 30%', () => {
    const spent = spentForBudget(budget({}), [tx({})], OCTOBER)
    expect(spent).toBe(150_000)
    expect(Math.round((spent / 500_000) * 100)).toBe(30)
  })

  it('menjumlah beberapa subkategori dalam periode yang sama', () => {
    const spent = spentForBudget(
      budget({}),
      [
        tx({ id: 1, amount: 150_000, category: 'Delivery Makanan', date: '2026-10-10' }),
        tx({ id: 2, amount: 50_000, category: 'Makan di Luar', date: '2026-10-12' }),
        tx({ id: 3, amount: 100_000, category: 'Belanja Dapur', date: '2026-10-31' }),
      ],
      OCTOBER,
    )
    expect(spent).toBe(300_000)
  })

  it('baris di luar periode, pemasukan, transfer, & setoran tabungan tidak dihitung', () => {
    const spent = spentForBudget(
      budget({}),
      [
        tx({ id: 1, date: '2026-09-30', amount: 999_000 }), // bulan lalu
        tx({ id: 2, type: 'income', amount: 999_000 }),
        tx({ id: 3, type: 'transfer', amount: 999_000 }),
        tx({ id: 4, type: 'saving', amount: 999_000, category: 'Tabungan' }),
        tx({ id: 5, amount: 150_000 }),
      ],
      OCTOBER,
    )
    expect(spent).toBe(150_000)
  })

  it('pengeluaran Kopi tidak ikut terhitung di budget Makanan (tidak dobel)', () => {
    const spent = spentForBudget(
      budget({}),
      [tx({ category: 'Kopi & Minuman', amount: 25_000 })],
      OCTOBER,
    )
    expect(spent).toBe(0)
  })
})

describe('suggestedBudgetCategory', () => {
  it('menyarankan label budget yang benar-benar bisa dipilih di sheet', () => {
    const suggestion = suggestedBudgetCategory(
      [
        { category: 'Delivery Makanan', type: 'expense' },
        { category: 'Makan di Luar', type: 'expense' },
        { category: 'Ojek Online', type: 'expense' },
      ],
      [],
    )
    expect(suggestion).toEqual({ category: 'Makanan', count: 2 })
  })

  it('melewati kategori yang sudah punya limit', () => {
    const suggestion = suggestedBudgetCategory(
      [
        { category: 'Delivery Makanan', type: 'expense' },
        { category: 'Ojek Online', type: 'expense' },
        { category: 'Bensin', type: 'expense' },
      ],
      ['Makanan'],
    )
    expect(suggestion).toEqual({ category: 'Transportasi', count: 2 })
  })

  it('tidak menyarankan "Lainnya" atau kategori dengan satu catatan saja', () => {
    expect(
      suggestedBudgetCategory(
        [
          { category: 'Kursus & Les', type: 'expense' },
          { category: 'Pajak', type: 'expense' },
        ],
        [],
      ),
    ).toBeNull()
    expect(
      suggestedBudgetCategory([{ category: 'Makan di Luar', type: 'expense' }], []),
    ).toBeNull()
  })
})
