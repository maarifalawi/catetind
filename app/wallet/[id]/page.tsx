import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { WalletDetailScreen } from '@/components/catetind/wallet-detail-screen'
import { WALLET_DETAIL_COPY } from '@/lib/data/wallet-detail'
import { INITIAL_WALLET_ACCOUNTS } from '@/lib/wallets'

/* ── Dompet Detail (/wallet/[id]) — inventaris #13 ────────────────────────────
   Route TIPIS: cuma menerjemahkan `id` di URL jadi data dompet, lalu menyusun
   judul tab-nya. Seluruh isi halaman ada di <WalletDetailScreen/>.

   Penerjemahannya WAJIB lewat `INITIAL_WALLET_ACCOUNTS` (lib/wallets.ts) —
   sumber yang sama dengan deck kartu di /wallet dan perhitungan Net Worth — jadi
   halaman ini mustahil menampilkan saldo dompet yang berbeda dari halaman lain.

   Di Next 16 `params` adalah Promise, makanya di-await (pola yang sama dengan
   app/api/wallets/[id]/route.ts). */

type WalletDetailPageProps = { params: Promise<{ id: string }> }

/** satu-satunya jembatan `id` URL → dompet, dipakai badan halaman DAN metadata */
function findWallet(id: string) {
  return INITIAL_WALLET_ACCOUNTS.find((wallet) => wallet.id === Number(id))
}

export async function generateMetadata({ params }: WalletDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const wallet = findWallet(id)
  if (!wallet) return { title: `${WALLET_DETAIL_COPY.notFoundTitle} — CatetInd` }

  return {
    title: `${wallet.name} — CatetInd`,
    description: `Saldo ${wallet.name}, arus uang 30 hari terakhir, dan catatan transaksinya — semua di satu halaman CatetInd.`,
  }
}

export default async function WalletDetailPage({ params }: WalletDetailPageProps) {
  const { id } = await params
  const wallet = findWallet(id)

  /* id yang tidak ada (mis. /wallet/999) tidak boleh jadi halaman kosong */
  if (!wallet) notFound()

  return (
    <PhoneStage>
      <WalletDetailScreen wallet={wallet} />
    </PhoneStage>
  )
}
