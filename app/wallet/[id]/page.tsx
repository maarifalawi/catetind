import type { Metadata } from 'next'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { WalletDetailScreen } from '@/components/catetind/wallet-detail-screen'
import { WALLET_DETAIL_COPY } from '@/lib/data/wallet-detail'

/* ── Dompet Detail (/wallet/[id]) — inventaris #13 ────────────────────────────
   Route TIPIS: cuma meneruskan `id` di URL ke <WalletDetailScreen/>.

   Sejak paket 40 halaman ini TIDAK LAGI merender dompet dari konstanta server:
   daftar dompet & saldonya hidup di satu store client (`lib/money/store.ts`),
   karena di situlah baris ledger (termasuk koreksi saldo yang ditulis user)
   berada. Akibat pemeriksaan lama: halaman ini menampilkan saldo seed sementara
   halaman Dompet sudah dikoreksi user (temuan audit #6). Sekarang keduanya
   membaca angka yang sama — `opening + Σ baris ledger`.

   Konsekuensinya judul tab tidak bisa menyebut nama dompet (nama itu ada di
   store, bukan di server), jadi judulnya generik dan jujur. Id yang tidak
   ditemukan ditangani di dalam screen (bukan `notFound()`), sebab dompet buatan
   user baru muncul setelah IndexedDB selesai dibaca.

   Di Next 16 `params` adalah Promise, makanya di-await (pola yang sama dengan
   app/api/wallets/[id]/route.ts). */

type WalletDetailPageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: WalletDetailPageProps): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Dompet ${id} — CatetInd`,
    description: `${WALLET_DETAIL_COPY.heroLabel}, arus uang 30 hari terakhir, dan catatan transaksinya — semua di satu halaman CatetInd.`,
  }
}

export default async function WalletDetailPage({ params }: WalletDetailPageProps) {
  const { id } = await params

  return (
    <PhoneStage>
      <WalletDetailScreen walletId={id} />
    </PhoneStage>
  )
}
