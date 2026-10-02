import { beforeEach, describe, expect, it } from 'vitest'
import {
  NUDGE_DISMISSED_KEY,
  dismissNudge,
  isNudgeDismissedToday,
  markNudgeShown,
  parseNudgeMap,
  readNudgeState,
  resetNudgeStore,
  wasNudgeShownTodayAtLoad,
  type NudgeState,
} from './nudge-store'

/* ── STATE NUDGE (paket 64) ─────────────────────────────────────────────────
   Yang dikunci di sini bukan "apakah localStorage tersambung" (itu tidak bisa
   diuji di environment node), melainkan ATURAN yang gampang rusak saat diubah:
   perbandingan per hari kalender, dan `shownAtLoad` yang sengaja dibekukan. */

const DAY = '2026-10-02'
const OTHER_DAY = '2026-10-03'

function state(patch: Partial<NudgeState>): NudgeState {
  return { dismissed: {}, shownAtLoad: {}, today: DAY, ...patch }
}

beforeEach(() => resetNudgeStore())

describe('parseNudgeMap', () => {
  it('menerima objek string dan menolak bentuk lain tanpa melempar', () => {
    expect(parseNudgeMap('{"renewal":"2026-10-02"}')).toEqual({ renewal: '2026-10-02' })
    expect(parseNudgeMap('bukan json')).toEqual({})
    expect(parseNudgeMap('["x"]')).toEqual({})
    expect(parseNudgeMap(null)).toEqual({})
    expect(parseNudgeMap('{"a":1}')).toEqual({})
  })
})

describe('isNudgeDismissedToday · kunci per HARI kalender', () => {
  it('hanya true saat tanggal dismiss sama dengan hari ini', () => {
    expect(isNudgeDismissedToday(state({ dismissed: { renewal: DAY } }), 'renewal')).toBe(true)
    expect(
      isNudgeDismissedToday(state({ dismissed: { renewal: OTHER_DAY } }), 'renewal'),
    ).toBe(false)
    expect(isNudgeDismissedToday(state({ dismissed: {} }), 'renewal')).toBe(false)
  })

  it('tanpa tanggal perangkat (server) tidak pernah dianggap ditutup', () => {
    expect(
      isNudgeDismissedToday(state({ today: '', dismissed: { renewal: DAY } }), 'renewal'),
    ).toBe(false)
  })
})

describe('wasNudgeShownTodayAtLoad · satu kali per hari', () => {
  it('true hanya kalau penanda "sudah tampil" bertanggal hari ini', () => {
    expect(
      wasNudgeShownTodayAtLoad(state({ shownAtLoad: { 'ai-gauge': DAY } }), 'ai-gauge'),
    ).toBe(true)
    expect(
      wasNudgeShownTodayAtLoad(state({ shownAtLoad: { 'ai-gauge': OTHER_DAY } }), 'ai-gauge'),
    ).toBe(false)
  })

  it('menandai "sudah tampil" TIDAK mengubah snapshot saat ini (anti-flap)', () => {
    markNudgeShown('ai-gauge', DAY)
    /* banner yang baru ditandai harus tetap tampil di sesi ini... */
    expect(wasNudgeShownTodayAtLoad(readNudgeState(), 'ai-gauge')).toBe(false)
    /* ...dan penanda "sudah tampil" tidak mengubah `shownAtLoad` live */
    expect(readNudgeState().shownAtLoad['ai-gauge']).toBeUndefined()
  })
})

describe('dismissNudge', () => {
  it('menulis tanggal hari ini dan langsung terlihat di snapshot hidup', () => {
    dismissNudge('renewal', DAY)
    expect(readNudgeState().dismissed.renewal).toBe(DAY)
  })

  it('menolak ditutup tanpa tanggal, dan idempotent untuk hari yang sama', () => {
    dismissNudge('renewal', '')
    expect(readNudgeState().dismissed.renewal).toBeUndefined()
    dismissNudge('renewal', DAY)
    dismissNudge('renewal', DAY)
    expect(Object.keys(readNudgeState().dismissed)).toEqual(['renewal'])
  })

  it('kunci penyimpanan tetap sama dengan versi lama (kompatibilitas data user)', () => {
    expect(NUDGE_DISMISSED_KEY).toBe('catet-home-banners-dismissed')
  })
})
