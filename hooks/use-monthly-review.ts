'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buildMonthlyRecap,
  monthKeyOf,
  previousMonthKey,
  readMonthlyReviewState,
  readSavedTargetFor,
  shouldShowMonthlyReview,
  todayIso,
  writeMonthlyReviewMarker,
  writeSavedTarget,
  type MonthlyRecap,
  type SavedMonthlyTarget,
} from '@/lib/data/monthly-review'
import { recordedTransactions, useMoneyStore } from '@/lib/money/store'

/**
 * Trigger + penyimpanan Monthly Review & Target Setup (inventaris #i).
 *
 * Dipisah dari komponennya karena tiga hal di sini harus benar sekaligus:
 *   1. modal hanya MUNCUL SENDIRI tanggal 1–3 (PRD 1880–1887);
 *   2. "sekali per bulan" dihitung per bulan (`monthlyMarkerKey`), bukan per hari
 *      dan bukan per sesi — begitu user menutupnya, bulan itu tidak menagih lagi;
 *   3. kartu Target (Home & /history) tetap jadi pintu masuk manual (`openModal`),
 *      jadi targetnya bisa ditinjau & diubah kapan saja — termasuk setelah ritual
 *      auto-popup bulan itu lewat.
 *
 * Semua penanda dibaca SETELAH mount (efek), jadi HTML server & client identik —
 * pola yang sama dengan `use-renewal-reminder.ts`. Tidak ada store/context global
 * baru untuk fitur ini: SATU hook dipakai Home (`auto`) dan /history (`auto: false`),
 * dan modalnya (`MonthlyReviewModal`) menerima state lewat props di kedua tempat.
 */
export function useMonthlyReview({
  /**
   * `true`  = periksa begitu halaman dibuka (Home: ritual tanggal 1–3).
   * `false` = jangan pernah muncul sendiri; hanya pintu manual (kartu Target &
   *           CTA recap). Dipakai /history (paket 32): popup penuh saat user
   *           sedang membaca riwayat itu menghalangi, sedangkan jalan ke alur
   *           targetnya tetap ada — jadi ritual bulanannya tetap milik Home.
   */
  auto = true,
  /**
   * `true` = recap bulan lalu hanya dihitung saat modalnya memang dibuka.
   *
   * /history memakai ini (paket 110): halamannya TIDAK menampilkan recap kecuali
   * user membuka modal, tetapi hook ini dulu menghitung ulang seluruh transaksi
   * bulan lalu setiap store berubah — kerja yang tidak pernah dilihat user.
   * Home tetap `false` karena modalnya bisa terbuka sendiri tanggal 1–3 dan
   * frame pertamanya harus sudah berisi angka.
   */
  recapOnDemand = false,
}: { auto?: boolean; recapOnDemand?: boolean } = {}) {
  /* Catatan NYATA dari store uang — sumber recap bulan lalu. Dulu recap memakai
     12 transaksi contoh Agustus 2026 yang tampil untuk semua akun; sekarang
     angkanya hanya bisa berasal dari catatan user sendiri. */
  const snapshot = useMoneyStore()
  const recorded = useMemo(() => recordedTransactions(snapshot), [snapshot])

  const [open, setOpen] = useState(false)
  /** target terakhir yang tersimpan (bulan mana pun — pembandingnya `monthKey`) */
  const [saved, setSaved] = useState<SavedMonthlyTarget | null>(null)
  /** kunci bulan berjalan `YYYY-MM`; kosong sebelum mount */
  const [monthKey, setMonthKey] = useState('')
  /** true setelah penanda dibaca — dipakai kartu Target (Home & /history) supaya
   *  nominalnya tidak berkedip dari "belum ada" ke angka tersimpan */
  const [ready, setReady] = useState(false)
  /** recap bulan LALU dari catatan nyata; label kosong hanya di render pertama
   *  (modal belum terbuka), lalu diisi efek di bawah */
  const [recap, setRecap] = useState<MonthlyRecap>(() => buildMonthlyRecap([], 0, ''))

  useEffect(() => {
    const iso = todayIso()
    const key = monthKeyOf(iso)
    const state = readMonthlyReviewState(key)
    const prevKey = previousMonthKey(key)
    setMonthKey(key)
    setSaved(state.saved)
    setReady(true)
    /* Hitung recap SEKALI di sini supaya frame pertama saat modal auto-terbuka
       (tanggal 1–3) sudah menyebut bulan yang benar. Efek di bawah menjaganya
       tetap segar saat store uang selesai hidrasi / catatan berubah.
       Pemakai `recapOnDemand` (mis. /history) melewati langkah ini: recap baru
       dihitung ketika modalnya benar-benar dibuka. */
    if (!recapOnDemand || auto) {
      setRecap(
        buildMonthlyRecap(
          recorded.filter((tx) => tx.date.startsWith(prevKey)),
          readSavedTargetFor(prevKey)?.amount ?? 0,
          prevKey,
        ),
      )
    }

    /* `closed` bulan ini → jangan muncul lagi; `undefined` = belum pernah dibuka.
       `auto: false` (mis. /history) melewati pemeriksaan ini sepenuhnya: modalnya
       hanya boleh dibuka oleh aksi user di halaman itu. */
    if (auto && shouldShowMonthlyReview(state.closed ? key : undefined, iso)) setOpen(true)
    /* sengaja jalan sekali saat mount: penanda hanya perlu dibaca sekali per
       kunjungan halaman, dan `auto` milik konsumen tidak berubah saat runtime */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Recap dihitung ulang setiap store uang berubah (hidrasi awal, catatan baru,
     edit, hapus) — KECUALI pemakai `recapOnDemand` yang modalnya masih tertutup:
     tidak ada yang membacanya, jadi jangan menyapu seluruh transaksi. Bulan yang
     direkap = bulan SEBELUM bulan berjalan; targetnya dibaca dari riwayat target
     (`readSavedTargetFor`), bukan dari satu nilai terakhir — supaya target bulan
     lalu tetap benar setelah user menyimpan target bulan ini. */
  useEffect(() => {
    if (!monthKey) return
    if (recapOnDemand && !open) return
    const prevKey = previousMonthKey(monthKey)
    const prevTxs = recorded.filter((tx) => tx.date.startsWith(prevKey))
    const prevTarget = readSavedTargetFor(prevKey)?.amount ?? 0
    setRecap(buildMonthlyRecap(prevTxs, prevTarget, prevKey))
  }, [monthKey, recorded, open, recapOnDemand])

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

  return { open, saved, savedThisMonth, monthKey, ready, recap, openModal, close, saveTarget }
}
