import { describe, expect, it } from 'vitest'
import { KEYBOARD_OPEN_THRESHOLD, computeSheetViewport } from './use-sheet-viewport-cage'

/* ── Test GEOMETRI KANDANG VISUAL VIEWPORT ───────────────────────────────────
   Yang dikunci di sini adalah matematika "kandang" yang menyelamatkan sheet dari
   bug keyboard iOS Safari: tinggi = visual viewport (bukan layout viewport),
   `top` = offsetTop (Safari menggeser visual viewport untuk mengejar input), dan
   deteksi keyboard yang harus benar di DUA mesin — iOS (layout viewport tetap)
   maupun Chrome Android `interactive-widget=resizes-content` (layout menyusut).
   Fungsi murni dipakai apa adanya oleh hook-nya — bukan salinan aturannya. */

describe('computeSheetViewport', () => {
  it('tanpa keyboard: kandang setinggi layar dan tanpa offset', () => {
    const view = computeSheetViewport({
      viewportHeight: 812,
      viewportTop: 0,
      layoutHeight: 812,
      baseHeight: 812,
    })
    expect(view).toEqual({ height: 812, top: 0, keyboardOpen: false })
  })

  it('iOS Safari: layout viewport TIDAK menyusut, keyboard terdeteksi dari selisih tinggi', () => {
    const view = computeSheetViewport({
      viewportHeight: 512,
      viewportTop: 0,
      layoutHeight: 812,
      baseHeight: 812,
    })
    expect(view.height).toBe(512)
    expect(view.keyboardOpen).toBe(true)
  })

  it('Chrome Android resizes-content: layout ikut menyusut, tetap terdeteksi dari acuan terbesar', () => {
    const view = computeSheetViewport({
      viewportHeight: 512,
      viewportTop: 0,
      layoutHeight: 512,
      baseHeight: 812,
    })
    expect(view.keyboardOpen).toBe(true)
  })

  it('visual viewport yang BERGESER diteruskan apa adanya sebagai `top`', () => {
    const view = computeSheetViewport({
      viewportHeight: 512,
      viewportTop: 128,
      layoutHeight: 812,
      baseHeight: 812,
    })
    expect(view.top).toBe(128)
  })

  it('penyusutan di bawah ambang bukan keyboard (mis. address bar menutup)', () => {
    const view = computeSheetViewport({
      viewportHeight: 812 - KEYBOARD_OPEN_THRESHOLD,
      viewportTop: 0,
      layoutHeight: 812,
      baseHeight: 812,
    })
    expect(view.keyboardOpen).toBe(false)
  })

  it('penyusutan TEPAT di atas ambang dianggap keyboard terbuka', () => {
    const view = computeSheetViewport({
      viewportHeight: 812 - KEYBOARD_OPEN_THRESHOLD - 1,
      viewportTop: 0,
      layoutHeight: 812,
      baseHeight: 812,
    })
    expect(view.keyboardOpen).toBe(true)
  })

  it('angka dibulatkan; tinggi minimal 1px dan offsetTop tidak pernah negatif', () => {
    const view = computeSheetViewport({
      viewportHeight: 0.4,
      viewportTop: -12.6,
      layoutHeight: 0,
      baseHeight: 0,
    })
    expect(view.height).toBe(1)
    expect(view.top).toBe(0)
    expect(view.keyboardOpen).toBe(false)
  })
})
