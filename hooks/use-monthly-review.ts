'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  monthKeyOf,
  readMonthlyReviewState,
  shouldShowMonthlyReview,
  todayIso,
  writeMonthlyReviewMarker,
  writeSavedTarget,
  type SavedMonthlyTarget,
} from '@/lib/data/monthly-review'

/**
 * Trigger + penyimpanan Monthly Review & Target Setup (inventaris #i).
 *
 * Dipisah dari komponennya karena tiga hal di sini harus benar sekaligus:
 *   1. modal hanya MUNCUL SENDIRI tanggal 1–3 (PRD 1880–1887);
 *   2. "sekali per bulan" dihitung per bulan (`monthlyMarkerKey`), bukan per hari
 *      dan bukan per sesi — begitu user menutupnya, bulan itu tidak menagih lagi;
 *   3. kartu Target di Home tetap jadi pintu masuk manual (`openModal`), jadi
 *      targetnya bisa ditinjau & diubah kapan saja.
 *
 * Semua penanda dibaca SETELAH mount (efek), jadi HTML server & client identik —
 * pola yang sama dengan `use-renewal-reminder.ts`. Tidak ada store/context global
 * baru untuk fitur ini: satu hook dipakai HomeScreen, dan modalnya menerima state
 * lewat props.
 */
export function useMonthlyReview() {
  const [open, setOpen] = useState(false)
  /** target terakhir yang tersimpan (bulan mana pun — pembandingnya `monthKey`) */
  const [saved, setSaved] = useState<SavedMonthlyTarget | null>(null)
  /** kunci bulan berjalan `YYYY-MM`; kosong sebelum mount */
  const [monthKey, setMonthKey] = useState('')
  /** true setelah penanda dibaca — dipakai kartu Home supaya tidak berkedip */
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const iso = todayIso()
    const key = monthKeyOf(iso)
    const state = readMonthlyReviewState(key)

    setMonthKey(key)
    setSaved(state.saved)
    setReady(true)

    /* `closed` bulan ini → jangan muncul lagi; `undefined` = belum pernah dibuka */
    if (shouldShowMonthlyReview(state.closed ? key : undefined, iso)) setOpen(true)
  }, [])

  /** pintu masuk manual: kartu Target di Home */
  const openModal = useCallback(() => setOpen(true), [])

  /**
   * Tutup modal — dipakai tombol X, backdrop, Escape, DAN "Skip, nanti aja".
   * Semua jalan keluar diperlakukan sama: bulan ini ditandai selesai, tanpa
   * dialog kedua, tanpa toast menyindir, tanpa jejak negatif.
   */
  const close = useCallback(() => {
    writeMonthlyReviewMarker(monthKeyOf(todayIso()), { closed: true })
    setOpen(false)
  }, [])

  /** simpan target bulan ini → localStorage + penanda "sudah dibuka bulan ini" */
  const saveTarget = useCallback((target: { amount: number; fundId: number | null }) => {
    const key = monthKeyOf(todayIso())
    const next: SavedMonthlyTarget = {
      month: key,
      amount: target.amount,
      fundId: target.fundId,
    }
    writeSavedTarget(next)
    writeMonthlyReviewMarker(key, { closed: true })
    setSaved(next)
    setOpen(false)
  }, [])

  /** true = target yang tersimpan memang milik bulan yang sedang berjalan */
  const savedThisMonth = saved !== null && monthKey !== '' && saved.month === monthKey

  return { open, saved, savedThisMonth, monthKey, ready, openModal, close, saveTarget }
}
