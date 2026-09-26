import { PhoneStage } from '@/components/catetind/phone-stage'
import { TransactionList } from '@/components/catetind/transaction-list'
import { getTransactionsByContext } from '@/lib/data/transactions'
import type { Metadata } from 'next'

export const metadata: Metadata = {
 title: 'Family Wallet — CatetInd',
}

export default function FamilyPage() {
 const transactions = getTransactionsByContext('keluarga')

 return (
 <PhoneStage>
 <main className="p-4">
 <h1 className="text-xl font-bold">Family Wallet</h1>
 <p className="mt-2">Lihat semua transaksi keluarga di sini.</p>
 <TransactionList transactions={transactions} />
 </main>
 </PhoneStage>
 )
}