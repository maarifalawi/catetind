import { describe, expect, it } from 'vitest'
import {
  NAV_ALWAYS_VISIBLE_UNTIL,
  NAV_AUTO_HIDE_THRESHOLD,
  nextNavAutoHide,
} from './use-nav-auto-hide'

/* ── Test ATURAN AUTO-HIDE NAV BAWAH MOBILE ──────────────────────────────────
   Yang dikunci di sini adalah perilaku yang diminta apa adanya:
   menggulir ke bawah → nav menyingkir, menggulir ke atas → nav muncul lagi,
   dan di dekat puncak halaman nav tidak pernah ikut menyingkir (jitter iOS,
   overscroll negatif, dan address bar yang menggeser viewport semua berhenti
   di aturan pertama). Fungsi murni dipakai langsung oleh hook-nya — bukan
   salinan aturannya. */

/** helper: menjalankan urutan posisi gulir lewat aturan yang sama dengan hook. */
function runScroll(steps: number[], hidden = false) {
  let lastScrollY = steps[0]
  let result = hidden
  for (const scrollY of steps.slice(1)) {
    result = nextNavAutoHide({ hidden: result, scrollY, lastScrollY })
    lastScrollY = scrollY
  }
  return result
}

describe('nextNavAutoHide', () => {
  it('menggulir ke bawah melewati ambang → nav tersembunyi', () => {
    expect(nextNavAutoHide({ hidden: false, scrollY: 320, lastScrollY: 120 })).toBe(true)
  })

  it('menggulir ke atas melewati ambang → nav muncul lagi', () => {
    expect(nextNavAutoHide({ hidden: true, scrollY: 120, lastScrollY: 320 })).toBe(false)
  })

  it('perpindahan di bawah ambang mempertahankan kondisi terakhir (anti-kedip)', () => {
    expect(
      nextNavAutoHide({
        hidden: true,
        scrollY: 400 + NAV_AUTO_HIDE_THRESHOLD,
        lastScrollY: 400,
      }),
    ).toBe(true)
    expect(
      nextNavAutoHide({
        hidden: false,
        scrollY: 400 - NAV_AUTO_HIDE_THRESHOLD,
        lastScrollY: 400,
      }),
    ).toBe(false)
  })

  it('TEPAT di ambang belum dianggap berubah arah', () => {
    expect(
      nextNavAutoHide({
        hidden: false,
        scrollY: 400 + NAV_AUTO_HIDE_THRESHOLD,
        lastScrollY: 400,
      }),
    ).toBe(false)
  })

  it('bergerak satu piksel di atas ambang sudah dianggap berubah arah', () => {
    expect(
      nextNavAutoHide({
        hidden: false,
        scrollY: 400 + NAV_AUTO_HIDE_THRESHOLD + 1,
        lastScrollY: 400,
      }),
    ).toBe(true)
  })

  it('di zona puncak nav SELALU tampil walau digulir ke bawah', () => {
    expect(
      nextNavAutoHide({ hidden: true, scrollY: NAV_ALWAYS_VISIBLE_UNTIL, lastScrollY: 0 }),
    ).toBe(false)
  })

  it('rubber-band / overscroll di puncak (scrollY negatif) tetap menampilkan nav', () => {
    expect(nextNavAutoHide({ hidden: true, scrollY: -48, lastScrollY: 24 })).toBe(false)
  })

  it('urutan nyata: turun → sembunyi, naik sedikit → tetap sembunyi, naik jauh → tampil', () => {
    const hidden = runScroll([0, 240, 480, 900], false)
    expect(hidden).toBe(true)

    // naik sedikit (masih di bawah ambang) — tidak boleh berkedip muncul
    expect(nextNavAutoHide({ hidden: true, scrollY: 900 - 4, lastScrollY: 900 })).toBe(true)

    // naik jauh → tampil
    expect(nextNavAutoHide({ hidden: true, scrollY: 700, lastScrollY: 900 })).toBe(false)
  })

  it('kembali ke puncak selalu berakhir tampil, dari kondisi mana pun', () => {
    expect(runScroll([1200, 40], true)).toBe(false)
  })

  it('ambang & zona puncak bisa diganti lewat parameter', () => {
    expect(
      nextNavAutoHide({
        hidden: false,
        scrollY: 60,
        lastScrollY: 0,
        alwaysVisibleUntil: 0,
        threshold: 10,
      }),
    ).toBe(true)
  })
})
