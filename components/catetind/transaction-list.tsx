import type { Transaction } from '@/lib/types'
import { cn } from '@/lib/utils'

interface TransactionListProps {
 transactions: Transaction[]
}

export function TransactionList({ transactions }: TransactionListProps) {
 if (transactions.length === 0) {
 return <p className="text-center text-ink/45 py-8">Belum ada transaksi</p>
 }

 return (
 <ul className="mt-4 space-y-2">
 {transactions.map((tx) => (
 <li key={tx.id} className="rounded-lg border p-3 shadow-sm">
 <div className="flex justify-between">
 <span>{tx.description}</span>
 <span className={cn("font-medium", tx.amount > 0 ? "text-leaf" : "text-plum")}>
 {tx.amount > 0 ? '+' : '-'}Rp{tx.amount.toLocaleString()}
 </span>
 </div>
 <div className="mt-1">
 <span className="text-xs text-ink/45">{tx.category}</span>
 <span className="text-xs text-ink/35"> • </span>
 <span className="text-xs text-ink/45">{tx.date.toLocaleDateString()}</span>
 </div>
 </li>
 ))}
 </ul>
 )
}