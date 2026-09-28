import type { Metadata } from 'next'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { HistoryScreen } from '@/components/catetind/history-screen'
import { HISTORY_SEARCH_PARAM } from '@/lib/data/history'

export const metadata: Metadata = {
  title: 'Riwayat & Insight — CatetInd',
  description:
    'Otak analitik CatetInd: kalibrasi profil AI & skor kewarasan finansial, insight AI dengan aksi lanjutan, heatmap keborosan dalam matriks kalender, dan riwayat transaksi yang bisa dicari & difilter.',
}

/**
 * `?q=<kata>` — jalur pintas dari kolom "Cari transaksi..." di header Home
 * (paket 29): halaman ini yang MEMILIKI pencariannya, jadi kata kuncinya
 * diteruskan ke sana sebagai nilai awal kolom cari. Hasilnya user mendarat di
 * daftar yang sudah tersaring, bukan di kolom kosong.
 *
 * Dibaca lewat prop server karena di Next 16 `searchParams` adalah Promise; cara
 * ini menghindari `useSearchParams()` + Suspense boundary di komponen klien
 * (pola yang sama dengan `app/budget/page.tsx` & `app/login/verify/page.tsx`).
 */
export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [HISTORY_SEARCH_PARAM]?: string | string[] }>
}) {
  const params = await searchParams
  const q = params[HISTORY_SEARCH_PARAM]

  return (
    <PhoneStage>
      <HistoryScreen initialQuery={Array.isArray(q) ? (q[0] ?? '') : (q ?? '')} />
    </PhoneStage>
  )
}

