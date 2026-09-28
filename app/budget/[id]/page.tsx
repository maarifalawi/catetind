import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { GoalDetailScreen } from '@/components/catetind/goal-detail-screen'
import { FUND_DETAIL_COPY, INITIAL_SINKING_FUNDS } from '@/lib/data/budget'

/* ── Celengan Detail (/budget/[id]) — inventaris #25 ──────────────────────────
   Route TIPIS: cuma menerjemahkan `id` di URL jadi angka + judul tab-nya.
   Seluruh isi halaman ada di <GoalDetailScreen/>.

   PAKET 46 — siapa pemilik datanya berubah, dan itu disengaja:
   celengan sekarang hidup di STORE perangkat (`lib/money/funds-store.ts`), bukan
   di konstanta `lib/data/budget.ts`. Jadi route ini TIDAK boleh 404 hanya karena
   id-nya tidak ada di `INITIAL_SINKING_FUNDS`: celengan yang baru ditanam user di
   /budget ada di store perangkat, dan halaman ini harus bisa membukanya.
   Karena itu:

     · `id` non-angka (`/budget/abc`) → `notFound()` — itu memang bukan celengan;
     · `id` angka tapi belum dikenal di perangkat → SCREEN yang memutuskannya
       (keadaan "belum ada" + CTA kembali, bukan 404 mentah), karena di server
       tidak ada cara mengetahui celengan lokal user;
     · metadata tetap dibaca dari konstanta seed (satu-satunya data yang dikenal
       server) — celengan buatan user tidak bisa punya judul tab server-side,
       dan itu ditulis apa adanya, bukan ditutup dengan klaim palsu.

   Di Next 16 `params` adalah Promise, makanya di-await (pola yang sama dengan
   app/wallet/[id]/page.tsx). */

type GoalDetailPageProps = { params: Promise<{ id: string }> }

/** satu-satunya jembatan `id` URL → celengan SEED, dipakai metadata saja */
function findSeedFund(id: string) {
  return INITIAL_SINKING_FUNDS.find((fund) => fund.id === Number(id))
}

export async function generateMetadata({ params }: GoalDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const fund = findSeedFund(id)
  if (!fund) return { title: `${FUND_DETAIL_COPY.notFoundTitle} — CatetInd` }

  return {
    title: `${fund.name} — CatetInd`,
    description: `Progres, riwayat setoran, dan perkiraan tanggal tercapainya celengan ${fund.name} — plus rencana nabung per bulan biar targetnya tepat waktu.`,
  }
}

export default async function GoalDetailPage({ params }: GoalDetailPageProps) {
  const { id } = await params
  const fundId = Number(id)

  /* id yang BUKAN angka tidak mungkin celengan — 404 di sini benar */
  if (!Number.isInteger(fundId) || fundId <= 0) notFound()

  return (
    <PhoneStage>
      <GoalDetailScreen fundId={fundId} />
    </PhoneStage>
  )
}
