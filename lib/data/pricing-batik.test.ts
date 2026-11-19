import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/* ── PENJAGA CORAK BATIK DI KARTU HARGA ───────────────────────────────────────
   Revisi 17 Nov 2026 (pemilik produk): batik tidak boleh hanya ada di kartu
   dompet; bagian harga juga harus bercorak. Test ini menyisir SUMBER (bukan
   DOM) supaya janji visual itu tidak hilang diam-diam: motif di
   `BatikBackdrop` harus hidup, dan kartu harga landing/checkout harus
   memanggilnya untuk kartu gelap maupun terang. */

function source(relative: string): string {
  return readFileSync(new URL(relative, import.meta.url), 'utf8')
}

const BATIK = source('../../components/landing/lp/batik-backdrop.tsx')
const PRICING = source('../../components/landing/lp/pricing.tsx')
const CHECKOUT = source('../../components/catetind/checkout-screen.tsx')
const GLOBALS = source('../../app/globals.css')

describe('corak batik di kartu harga', () => {
  it('BatikBackdrop bukan komponen kosong: empat motif + penanda audit', () => {
    expect(BATIK).not.toMatch(/return null\s*\n\}/)
    for (const motif of ['kawung', 'mendung', 'parang', 'truntum']) {
      expect(BATIK, `mask ${motif} hilang`).toContain(`batik-mask-${motif}`)
      expect(BATIK, `pattern ${motif} hilang`).toContain(`id={\`\${id}-${motif}\`}`)
    }
    expect(BATIK).toContain('data-catetind-batik')
  })

  it('dua tone: cream untuk kartu gelap, forest untuk kartu terang', () => {
    expect(BATIK).toContain("tone?: 'cream' | 'forest'")
    expect(BATIK).toContain("tone === 'cream' ? 'text-cream' : 'text-forest'")
  })

  it('section harga landing memasang batik di semua kartu, bukan hanya yang direkomendasikan', () => {
    expect(PRICING).toContain('<BatikBackdrop')
    expect(PRICING).toContain('tone="cream"')
    expect(PRICING).toContain('tone="forest"')
    expect(PRICING).toContain('landing-batik-')
  })

  it('checkout memasang batik di kartu terpilih maupun kartu lain', () => {
    expect(CHECKOUT).toContain('<BatikBackdrop')
    expect(CHECKOUT).toContain('checkout-batik-')
    expect(CHECKOUT).toContain('tone="cream"')
    expect(CHECKOUT).toContain('tone="forest"')
  })

  it('mask CSS untuk keempat motif masih tersedia', () => {
    for (const motif of ['kawung', 'mendung', 'parang', 'truntum']) {
      expect(GLOBALS, `mask CSS ${motif} hilang`).toContain(`.batik-mask-${motif}`)
    }
  })
})
