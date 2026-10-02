'use client'

import { useMemo } from 'react'
import { recordedTransactions, useMoneyStore } from '@/lib/money/store'
import { homeMoneyRowFrom } from '@/lib/data/home-money'
import { useTodayISO } from '@/lib/use-today-iso'
import { weeklyRecapFrom, type WeeklyRecap } from '@/lib/weekly-recap'

/* ── HOOK REKAP MINGGUAN — SATU TURUNAN DARI LEDGER NYATA ─────────────────────
   Menyatukan tiga sumber yang sudah ada supaya banner & slide tidak pernah
   menghitung sendiri-sendiri:
     · `useMoneyStore()` → baris ledger nyata (tombstone sudah dibuang), dan
       `useSyncExternalStore`-nya membuat rekap ikut berubah begitu user mencatat
       transaksi — tanpa refresh;
     · `useTodayISO()` → jendela pekan yang benar (Senin–Minggu dari tanggal
       perangkat); `''` sebelum mount (hidrasi aman, hasilnya kosong seperti server);
     · `weeklyRecapFrom()` → seluruh angka, murni & teruji (`lib/weekly-recap.ts`).

   Pipeline baris-nya SENGAJA `recordedTransactions().map(homeMoneyRowFrom())` —
   sama persis dengan kartu Arus Uang / Distribusi / Transaksi Terakhir di Home,
   jadi rekap tidak mungkin bercerita beda dari kartu-kartu itu. */
export function useWeeklyRecap(): WeeklyRecap {
  const snapshot = useMoneyStore()
  const today = useTodayISO()
  return useMemo(() => {
    const rows = recordedTransactions(snapshot).map(homeMoneyRowFrom)
    return weeklyRecapFrom(rows, today)
  }, [snapshot, today])
}
