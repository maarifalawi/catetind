'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  MILESTONE_STATE,
  bestMilestone,
  pendingMilestone,
  readSeenMilestones,
  writeSeenMilestone,
  type Milestone,
  type MilestoneState,
} from '@/lib/data/milestones'

/**
 * Trigger + penyimpanan Milestone Celebration (inventaris #k).
 *
 * Dipisah dari komponennya karena tiga hal di sini harus benar sekaligus:
 *   1. perayaan hanya muncul kalau kondisinya NYATA — `pendingMilestone()`
 *      membandingkan state dengan daftar id yang sudah dirayakan;
 *   2. "tidak muncul dua kali" dihitung dari penanda localStorage
 *      (`milestoneStorageKey()`), bukan dari state sesi;
 *   3. tetap ada SATU pintu meninjau ulang (`replay`) supaya fiturnya tidak
 *      tersembunyi — dipanggil dari Plant Detail di Home.
 *
 * Penanda dibaca SETELAH mount (efek), jadi HTML server & client identik —
 * pola yang sama dengan `use-monthly-review.ts` / `use-renewal-reminder.ts`.
 * Tidak ada store/context global baru: satu hook dipakai HomeScreen (auto) dan
 * halaman detail celengan (manual, `auto: false`).
 */
export function useMilestoneCelebration(
  /**
   * State tanaman/streak (di produksi: `user_plant`). WAJIB berupa konstanta
   * modul atau nilai yang stabil — kalau objeknya dibuat ulang tiap render,
   * `replay` ikut dibuat ulang (tidak fatal, tapi tidak perlu).
   */
  state: MilestoneState = MILESTONE_STATE,
  {
    /**
     * `true`  = periksa begitu halaman dibuka (Home: streak 7/14/21/30).
     * `false` = tunggu aksi user dulu (halaman celengan: baru setelah setoran
     *           yang melunasi target — jangan dirayakan saat halaman dibuka).
     */
    auto = true,
  }: { auto?: boolean } = {},
) {
  const [milestone, setMilestone] = useState<Milestone | null>(null)
  /** true setelah penanda dibaca — dipakai kalau nanti ada konsumen yang perlu
   *  menahan render supaya tidak berkedip (pola `monthly.ready`) */
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (auto) setMilestone(pendingMilestone(state, readSeenMilestones()))
    setReady(true)
    /* sengaja jalan sekali saat mount: penanda hanya perlu dibaca sekali per
       kunjungan halaman, dan `state` di repo ini konstanta mock */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Tutup perayaan — dipakai tombol "Lanjut", tap backdrop, dan auto-dismiss.
   * Semua jalan keluar diperlakukan sama: perayaan ditandai SUDAH dilihat, tanpa
   * dialog kedua, tanpa toast, tanpa jejak negatif.
   *
   * Penulisan penanda dilakukan DI LUAR updater state dengan sengaja: updater
   * React harus murni (bisa dipanggil dua kali untuk deteksi efek samping),
   * jadi localStorage tidak ditulis dari dalamnya.
   */
  const dismiss = useCallback(() => {
    if (milestone) writeSeenMilestone(milestone.id)
    setMilestone(null)
  }, [milestone])

  /**
   * Pintu meninjau ulang: tampilkan perayaan terbaik untuk state ini TANPA
   * mempedulikan penanda "sudah dilihat". Dipakai tombol "Lihat perayaan" di
   * Plant Detail dan oleh setoran yang melunasi target di halaman celengan.
   */
  const replay = useCallback(() => setMilestone(bestMilestone(state)), [state])

  return { milestone, open: milestone !== null, ready, dismiss, replay }
}
