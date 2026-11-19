import { describe, expect, it, vi } from 'vitest'
import { PREVIEW_ROUTES, isPreviewRoute, previewEnabled } from './preview-routes'

/* ── KONTRAK RUTE PREVIEW DESAIN ────────────────────────────────────────────
   Rute preview adalah SATU-SATUNYA jalan melihat layar app tanpa sesi, jadi
   test ini mengunci tiga hal yang paling mudah rusak: daftarnya tidak boleh
   memuat rute app sungguhan, pencocokannya berbatas segmen, dan gerbangnya
   mati total di produksi. */

describe('rute preview desain', () => {
  it('hanya berisi rute berawalan `/preview-`, bukan rute app sungguhan', () => {
    expect(PREVIEW_ROUTES.length).toBeGreaterThan(0)
    for (const route of PREVIEW_ROUTES) {
      expect(route.startsWith('/preview-'), route).toBe(true)
    }
    expect(isPreviewRoute('/app/onboarding')).toBe(false)
    expect(isPreviewRoute('/app')).toBe(false)
  })

  it('cocok berbatas segmen (bukan awalan string mentah)', () => {
    expect(isPreviewRoute('/preview-onboarding')).toBe(true)
    expect(isPreviewRoute('/preview-onboarding/apa-saja')).toBe(true)
    expect(isPreviewRoute('/preview-onboarding-palsu')).toBe(false)
  })

  it('gerbangnya hidup di dev/test dan MATI saat NODE_ENV=production', () => {
    expect(previewEnabled()).toBe(true)

    vi.stubEnv('NODE_ENV', 'production')
    try {
      expect(previewEnabled()).toBe(false)
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
