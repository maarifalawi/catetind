import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  HISTORY_TODAY_ISO,
  HISTORY_TRANSACTIONS,
  INITIAL_FILTERS,
  TIME_FILTERS,
  filterHistoryTransactions,
  groupTransactionsByDate,
  localISODate,
} from './history'
import { JOINT_MONTH_KEY, monthLabelOf, previousMonthKey, recapBannerVisibility } from './joint'

/* ── Test "BUKA DI BULAN LAIN" (paket 44 · uji manual #3) ────────────────────
   Uji pemakaian yang belum tuntas: "majukan jam sistem ke bulan berikutnya →
   cek /joint, Riwayat, dan HUD tidak menampilkan 'bulan ini kosong' yang aneh
   (tanggal demo vs tanggal nyata)."

   Bentuk otomatisnya ada di sini: jam sistem DIREKAYASA ke Oktober 2026, lalu
   dipastikan tiga hal yang bisa dipastikan tanpa browser:

     1. Riwayat tidak mendadak kosong — filter defaultnya "Semua waktu";
     2. /joint tetap memakai bulan datanya (September 2026), bukan jam perangkat,
        dan label bulan/bulan-sebelumnya tetap benar di bulan lain;
     3. banner rekap joint tetap dihitung dari tanggal yang diberikan (tidak
        melempar / tidak bergantung data bulan berjalan).

   Yang TIDAK bisa dibuktikan di sini (dan ditulis apa adanya di laporan): HUD
   Home memakai jangkar tanggal MOCK (`HISTORY_TODAY_ISO` = 2026-09-27), jadi ia
   memang tetap menampilkan angka September walau jam perangkat sudah Oktober —
   itu keputusan demo yang sudah ada sebelum paket ini (tanggal statis = bebas
   hydration mismatch), bukan efek samping perubahan paket 44. */

const OCTOBER = new Date(2026, 9, 5, 10, 30, 0) // 5 Oktober 2026, 10:30 waktu lokal

describe('buka app di bulan lain (jam sistem dimajukan ke Oktober 2026)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(OCTOBER)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('tanggal perangkat memang sudah pindah bulan', () => {
    expect(localISODate()).toBe('2026-10-05')
    expect(HISTORY_TODAY_ISO.slice(0, 7)).toBe('2026-09') // data mock tetap September
  })

  it('Riwayat TIDAK kosong: filter default "Semua waktu" tetap menampilkan semua catatan', () => {
    const filtered = filterHistoryTransactions(
      HISTORY_TRANSACTIONS,
      INITIAL_FILTERS,
      '',
      localISODate(),
    )
    expect(filtered).toHaveLength(HISTORY_TRANSACTIONS.length)

    /* daftar tetap bisa dikelompokkan per tanggal (tidak ada grup kosong/aneh) */
    const groups = groupTransactionsByDate(filtered, localISODate())
    expect(groups.length).toBeGreaterThan(0)
    expect(groups.every((group) => group.items.length > 0)).toBe(true)
  })

  it('filter "Bulan ini" jujur kosong — bukan bug, memang belum ada catatan Oktober', () => {
    /* yang penting: yang kosong cuma filter yang MEMANG menyaring bulan, dan itu
       keadaan yang bisa dijelaskan (user sendiri yang memilih chip-nya) */
    const monthOnly = filterHistoryTransactions(
      HISTORY_TRANSACTIONS,
      { ...INITIAL_FILTERS, time: 'month' },
      '',
      localISODate(),
    )
    expect(monthOnly).toHaveLength(0)
    /* chip default-nya tetap "Semua waktu" — jadi user tidak mendarat di layar kosong */
    expect(TIME_FILTERS[0]).toEqual({ id: 'all', label: 'Semua waktu' })
  })

  it('/joint memakai bulan DATANYA, dan label bulan lain tetap benar', () => {
    expect(JOINT_MONTH_KEY).toBe('2026-09')
    expect(monthLabelOf(JOINT_MONTH_KEY)).toBe('September 2026')
    expect(previousMonthKey(JOINT_MONTH_KEY)).toBe('2026-08')
    /* lintas tahun: Januari → Desember tahun sebelumnya */
    expect(previousMonthKey('2026-01')).toBe('2025-12')
    expect(monthLabelOf('2026-10')).toBe('Oktober 2026')
  })

  it('banner rekap joint dihitung dari tanggal yang diberikan (tidak melempar)', () => {
    const visibility = recapBannerVisibility(new Date())
    expect(typeof visibility.monthly).toBe('boolean')
    expect(typeof visibility.weekly).toBe('boolean')
  })
})
