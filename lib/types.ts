export type MoneyContext = 'pribadi' | 'keluarga' | 'bersama'

export type TransactionType = 'income' | 'expense' | 'transfer' | 'saving'

export interface Transaction {
  id: string
  description: string
  amount: number
  date: Date
  category: string
  walletId: string | null
  userId: string
  context: MoneyContext
  type: TransactionType
}

export interface Wallet {
  id: string
  name: string
  holder: string
  number: string
  network: string
  balance: number
  bandClass: string
  faceClass: string
  glowClass?: string
  art: string
  kind: string
  context: MoneyContext
}
