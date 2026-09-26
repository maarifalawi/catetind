import type { Transaction, MoneyContext } from '../types'

export const ALL_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    description: 'Bayar listrik',
    amount: -350000,
    date: new Date(Date.now() - 86400000 * 3),
    category: 'Tagihan',
    walletId: 'personal',
    userId: 'user1',
    context: 'pribadi',
    type: 'expense',
  },
  {
    id: '2',
    description: 'Beli beras & sayur',
    amount: -120000,
    date: new Date(Date.now() - 86400000 * 1),
    category: 'Kebutuhan',
    walletId: 'family',
    userId: 'user1',
    context: 'keluarga',
    type: 'expense',
  },
  {
    id: '3',
    description: 'Beli kado untuk doi',
    amount: -250000,
    date: new Date(Date.now() - 86400000 * 2),
    category: 'Perayaan',
    walletId: 'joint',
    userId: 'user1',
    context: 'bersama',
    type: 'expense',
  },
  {
    id: '4',
    description: 'Gaji Bulanan',
    amount: 8500000,
    date: new Date(Date.now() - 86400000 * 3),
    category: 'Pemasukan',
    walletId: 'personal',
    userId: 'user1',
    context: 'pribadi',
    type: 'income',
  },
  {
    id: '5',
    description: 'Cicilan motor',
    amount: -3500000,
    date: new Date(Date.now() - 86400000 * 5),
    category: 'Cicilan',
    walletId: 'personal',
    userId: 'user1',
    context: 'pribadi',
    type: 'expense',
  },
]

export function getTransactionsByContext(ctx: MoneyContext): Transaction[] {
  return ALL_TRANSACTIONS.filter((tx) => tx.context === ctx)
}

export function getTransactionById(id: string): Transaction | undefined {
  return ALL_TRANSACTIONS.find((tx) => tx.id === id)
}
