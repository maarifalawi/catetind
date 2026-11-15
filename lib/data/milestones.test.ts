import { describe, expect, it } from 'vitest'
import {
  EMPTY_MILESTONE_STATE,
  milestoneStateFromRecords,
  pendingMilestone,
} from './milestones'

/* ── PERAYAAN HANYA UNTUK PENCAPAIAN NYATA ───────────────────────────────────
   Dulu Home memakai state contoh (streak 7 hari), jadi akun yang baru dibuat —
   nol catatan — langsung disambut perayaan "Minggu pertama!". Test ini mengunci
   aturan penggantinya: angka perayaan dihitung dari tanggal catatan user, dan
   tanpa catatan tidak ada yang dirayakan. */

/** tanggal ISO yang berurutan mundur dari `end` sebanyak `count` hari */
function consecutiveDays(end: string, count: number): string[] {
  const days: string[] = []
  const cursor = new Date(`${end}T12:00:00`)
  for (let index = 0; index < count; index += 1) {
    days.push(cursor.toISOString().slice(0, 10))
    cursor.setDate(cursor.getDate() - 1)
  }
  return days
}

describe('milestoneStateFromRecords()', () => {
  it('belum ada catatan → nol, dan tidak ada perayaan yang diusulkan', () => {
    const state = milestoneStateFromRecords([], '2026-11-10')
    expect(state).toEqual(EMPTY_MILESTONE_STATE)
    expect(pendingMilestone(state, [])).toBeNull()
  })

  it('streak & hari aktif dihitung dari tanggal catatan yang berurutan', () => {
    const days = consecutiveDays('2026-11-10', 7)
    const state = milestoneStateFromRecords(
      days.map((date) => ({ date })),
      '2026-11-10',
    )
    expect(state.streakDays).toBe(7)
    expect(state.activeDays).toBe(7)
    expect(state.plantStage).toBe(2)
    /* streak 7 layak dirayakan — dan HANYA karena catatannya memang 7 hari */
    expect(pendingMilestone(state, [])?.id).toBe('streak-7')
  })

  it('hari ini belum mencatat tidak memutus streak (dihitung dari kemarin)', () => {
    const days = consecutiveDays('2026-11-09', 3)
    const state = milestoneStateFromRecords(
      days.map((dateISO) => ({ dateISO })),
      '2026-11-10',
    )
    expect(state.streakDays).toBe(3)
    expect(state.activeDays).toBe(3)
  })

  it('tahap papan puzzle memakai ambang yang sama dengan rekap bulanan', () => {
    const days = consecutiveDays('2026-11-10', 21)
    const state = milestoneStateFromRecords(
      days.map((date) => ({ date })),
      '2026-11-10',
    )
    expect(state.plantStage).toBe(4)
  })

  it('tanpa `todayISO` (belum mount) tidak menebak streak', () => {
    const state = milestoneStateFromRecords(
      consecutiveDays('2026-11-10', 5).map((date) => ({ date })),
      '',
    )
    expect(state.streakDays).toBe(0)
    expect(state.activeDays).toBe(5)
  })
})
