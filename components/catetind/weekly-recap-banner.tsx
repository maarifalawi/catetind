'use client'

import { memo, useEffect, useState } from 'react'
import { CalendarRange, ChevronRight } from 'lucide-react'
import { WEEKLY_RECAP_COPY } from '@/lib/weekly-recap'
import { useWeeklyRecap } from '@/lib/use-weekly-recap'
import { DEMO_MODE } from '@/lib/demo'
import { usePrivacy } from './privacy-provider'

/* paksa tampil untuk kebutuhan review desain — perilaku produksi (default):
   banner HANYA muncul Jumat-Sabtu-Minggu, PRD Domain 3A Habit Loop 2.
   Saklarnya ikut `NEXT_PUBLIC_DEMO` (paket 42). */
const DEMO_FORCE_SHOW = DEMO_MODE

/** banner conditional "Recap Mingguan Siap! Lihat" - trigger modal 5 slide (inventaris g) */
/** Dibungkus `memo` — props-nya cuma `onOpen` yang di HomeScreen sudah
 *  distabilkan dengan useCallback, jadi banner ini tidak ikut re-render saat
 *  state popup di HomeScreen berubah. */
export const WeeklyRecapBanner = memo(function WeeklyRecapBanner({
  onOpen,
}: {
  onOpen: () => void
}) {
  /* hari dihitung di client - gate hydrasi supaya server render identik */
  const [ready, setReady] = useState(false)
  const { money } = usePrivacy()
  /* angka minggu ini = TURUNAN dari ledger nyata (satu sumber dengan modal
     recap: `useWeeklyRecap()`), bukan lagi konstanta demo `WEEK_DATA`. */
  const recap = useWeeklyRecap()
  useEffect(() => setReady(true), [])
  if (!ready) return null

  const day = new Date().getDay() // 0=Min ... 5=Jum 6=Sab
  if (!DEMO_FORCE_SHOW && day !== 0 && day !== 5 && day !== 6) return null

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Buka rekap mingguan"
      className="group flex w-full items-center gap-4 rounded-[1.75rem] bg-gradient-to-r from-forest to-forest-soft p-5 text-left ring-1 ring-soil/12 transition-transform duration-200 hover:scale-[1.005] active:scale-[0.99]"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-mint/20 text-mint">
        <CalendarRange className="size-5" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-cream">
          Recap Mingguan Siap! 🌿
        </span>
                <span className="mt-0.5 block text-[13px] text-cream/60 break-words">
          {recap.empty ? (
            WEEKLY_RECAP_COPY.bannerEmpty
          ) : (
            <>
              Minggu ini: {recap.transactions} transaksi tercatat, net{' '}
              <b className="font-medium text-mint">
                {recap.net < 0 ? '-' : '+'}
                {money(Math.abs(recap.net))}
              </b>
            </>
          )}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-mint py-2 pl-4 pr-2.5 text-[13px] font-medium text-forest transition-colors group-hover:bg-cream">
        Lihat
        <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.6} />
      </span>
    </button>
  )
})
