import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { GoalDetailScreen } from '@/components/catetind/goal-detail-screen'
import { FUND_DETAIL_COPY, INITIAL_SINKING_FUNDS } from '@/lib/data/budget'

/* ── Celengan Detail (/budget/[id]) — inventaris #25 ──────────────────────────
   Route TIPIS: cuma menerjemahkan `id` di URL jadi data celengan, lalu menyusun
   judul tab-nya. Seluruh isi halaman ada di <GoalDetailScreen/>.

   Penerjemahannya WAJIB lewat `INITIAL_SINKING_FUNDS` (lib/data/budget.ts) —
   sumber yang sama dengan kartu Celengan Impian di /budget — jadi halaman ini
   mustahil menampilkan target/terkumpul yang berbeda dari halaman induk.

   Di Next 16 `params` adalah Promise, makanya di-await (pola yang sama dengan
   app/wallet/[id]/page.tsx). */

type GoalDetailPageProps = { params: Promise<{ id: string }> }

/** satu-satunya jembatan `id` URL → celengan, dipakai badan halaman DAN metadata */
function findFund(id: string) {
  return INITIAL_SINKING_FUNDS.find((fund) => fund.id === Number(id))
}

export async function generateMetadata({ params }: GoalDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const fund = findFund(id)
  if (!fund) return { title: `${FUND_DETAIL_COPY.notFoundTitle} — CatetInd` }

  return {
    title: `${fund.name} — CatetInd`,
    description: `Progres, riwayat setoran, dan perkiraan tanggal tercapainya celengan ${fund.name} — plus rencana nabung per bulan biar targetnya tepat waktu.`,
  }
}

export default async function GoalDetailPage({ params }: GoalDetailPageProps) {
  const { id } = await params
  const fund = findFund(id)

  /* id yang tidak ada (mis. /budget/999) tidak boleh jadi halaman kosong */
  if (!fund) notFound()

  return (
    <PhoneStage>
      <GoalDetailScreen fund={fund} />
    </PhoneStage>
  )
}
