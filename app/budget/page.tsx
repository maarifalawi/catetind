import type { Metadata } from 'next'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { BudgetScreen } from '@/components/catetind/budget-screen'
import { BUDGET_ADD_PARAM, BUDGET_PLANT_PARAM, categoryOptionOf, flagParamOf } from '@/lib/data/budget'

export const metadata: Metadata = {
  title: 'Budget & Target — CatetInd',
  description:
    'Atur limit pengeluaran per kategori dan tumbuhkan celengan impian: jatah harian, pacing ideal, sapu bersih sisa budget, dan sinking fund dengan metafora tanaman.',
}

/**
 * Dua pintasan dari halaman lain (polanya sama: URL → prop awal komponen):
 *
 *   • `?add=Kopi` — jalur pintas dari kartu Insight di /history ("Atur Limit
 *     Kopi"): sheet tambah budget dibuka dengan kategori itu sudah terpilih.
 *     Kategori dari URL divalidasi di sini (label asing diabaikan), jadi
 *     komponen halaman tetap menerima nilai yang sudah pasti ada di
 *     `BUDGET_CATEGORY_OPTIONS`.
 *   • `?tanam=1` — jalur pintas dari tombol `+` di kartu "Tabungan Impian" Home
 *     (paket 29): Zona B terbuka bersama sheet "Tanam Celengan Baru", jadi satu
 *     tap dari Home langsung mendarat di formnya — bukan di daftar yang harus
 *     dicari dulu.
 *
 * Dibaca lewat prop server karena di Next 16 `searchParams` adalah Promise; cara
 * ini menghindari `useSearchParams()` + Suspense boundary di komponen klien
 * (pola yang sama dengan `app/login/verify/page.tsx`).
 */
export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{
    [BUDGET_ADD_PARAM]?: string | string[]
    [BUDGET_PLANT_PARAM]?: string | string[]
  }>
}) {
  const params = await searchParams
  const addParam = params[BUDGET_ADD_PARAM]
  const initialAddCategory = categoryOptionOf(
    Array.isArray(addParam) ? addParam[0] : addParam,
  )?.label

  return (
    <PhoneStage>
      <BudgetScreen
        initialAddCategory={initialAddCategory}
        initialPlantGoal={flagParamOf(params[BUDGET_PLANT_PARAM])}
      />
    </PhoneStage>
  )
}
