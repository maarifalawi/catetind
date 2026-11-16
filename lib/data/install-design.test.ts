import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { InstallRewardBanner } from '@/components/catetind/install-reward-banner'

/* ── SPANDUK AJAKAN PASANG DI LAYAR UTAMA (halaman /install) ─────────────────
   Dulu blok ini menjanjikan "+100 Nyawa AI" & "Skin Papan Emas" yang otomatis
   masuk begitu app dibuka dari Homescreen. Janji itu tidak pernah bisa
   ditepati — repo ini tidak punya backend reward — jadi teksnya diganti
   ajakan jujur bergaya bestie: pasang di layar utama = buka app & catat
   pengeluaran secepat kilat.

   Test ini mengunci dua hal:

     1. janji bonus lama TIDAK boleh muncul lagi di teks yang tampil;
     2. ajakannya tetap menyebut manfaat nyata (layar utama + kecepatan
        membuka app/mencatat).

   Render memakai `react-dom/server` (environment node) — pola yang sama
   dengan `referral-design.test.ts` & `bills-design.test.ts`. */

const HTML = renderToStaticMarkup(createElement(InstallRewardBanner))
const LOWER = HTML.toLowerCase()

describe('Install — spanduk ajakan pasang di layar utama', () => {
  it('tidak lagi menjanjikan bonus Nyawa AI / Skin Papan Emas', () => {
    for (const banned of [
      'nyawa ai',
      'skin',
      '+100',
      'bonus',
      'otomatis masuk',
      'homescreen',
    ]) {
      expect(LOWER).not.toContain(banned)
    }
  })

  it('mengajak pasang di layar utama dengan manfaat yang nyata', () => {
    expect(HTML).toContain('layar utama')
    expect(HTML).toContain('secepat kilat')
    expect(HTML).toContain('catat pengeluaran')
  })

  it('metadatanya ikut jujur — tanpa tawaran bonus', () => {
    const page = readFileSync(
      new URL('../../app/(app)/install/page.tsx', import.meta.url),
      'utf8',
    )

    expect(page).not.toMatch(/bonus/i)
    expect(page).toMatch(/layar utama/i)
  })
})
