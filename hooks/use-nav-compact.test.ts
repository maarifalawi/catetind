import { describe, expect, it } from 'vitest'
import {
  NAV_COMPACT_IGNORE_UNTIL,
  NAV_COMPACT_THRESHOLD,
  nextNavCompact,
} from './use-nav-compact'

/* ── Test ATURAN NAV UTAMA MEMADAT SAAT DIGULIR (paket 75) ────────────────────
   Yang dikunci apa adanya: menggulir ke bawah → nav memadat; menggulir ke atas
   → nav penuh lagi; di dekat puncak nav tidak pernah memadat (jitter iOS /
   overscroll). Fungsi murni ini dipakai langsung oleh hook — bukan salinannya. */

/** helper: menjalankan urutan posisi gulir lewat aturan yang sama dengan hook. */
function runScroll(steps: number[], compact = false) {
  let lastScrollY = steps[0]
  let result = compact
  for (const scrollY of steps.slice(1)) {
    result = nextNavCompact({ compact: result, scrollY, lastScrollY })
    lastScrollY = scrollY
  }
  return result
}

describe('nextNavCompact', () => {
  it('menggulir ke bawah melewati ambang → nav memadat', () => {
    expect(nextNavCompact({ compact: false, scrollY: 320, lastScrollY: 120 })).toBe(true)
  })

  it('menggulir ke atas melewati ambang → nav penuh lagi', () => {
    expect(nextNavCompact({ compact: true, scrollY: 120, lastScrollY: 320 })).toBe(false)
  })

  it('perpindahan di bawah ambang mempertahankan kondisi terakhir (anti-kedip)', () => {
    expect(
      nextNavCompact({ compact: true, scrollY: 400 + NAV_COMPACT_THRESHOLD, lastScrollY: 400 }),
    ).toBe(true)
    expect(
      nextNavCompact({ compact: false, scrollY: 400 - NAV_COMPACT_THRESHOLD, lastScrollY: 400 }),
    ).toBe(false)
  })

  it('bergerak satu piksel di atas ambang sudah dianggap berubah arah', () => {
    expect(
      nextNavCompact({
        compact: false,
        scrollY: 400 + NAV_COMPACT_THRESHOLD + 1,
        lastScrollY: 400,
      }),
    ).toBe(true)
  })

  it('di zona puncak nav SELALU penuh walau digulir ke bawah', () => {
    expect(
      nextNavCompact({ compact: true, scrollY: NAV_COMPACT_IGNORE_UNTIL, lastScrollY: 0 }),
    ).toBe(false)
  })

  it('urutan nyata: turun → padat, naik sedikit → tetap padat, naik jauh → penuh', () => {
    expect(runScroll([0, 240, 480, 900], false)).toBe(true)
    expect(nextNavCompact({ compact: true, scrollY: 900 - 4, lastScrollY: 900 })).toBe(true)
    expect(nextNavCompact({ compact: true, scrollY: 700, lastScrollY: 900 })).toBe(false)
  })

  it('kembali ke puncak selalu berakhir penuh', () => {
    expect(runScroll([1200, 40], true)).toBe(false)
  })

  it('ambang & zona puncak bisa diganti lewat parameter', () => {
    expect(
      nextNavCompact({
        compact: false,
        scrollY: 60,
        lastScrollY: 0,
        ignoreUntil: 0,
        threshold: 10,
      }),
    ).toBe(true)
  })
})
