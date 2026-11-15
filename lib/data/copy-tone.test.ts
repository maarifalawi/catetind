import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/* ── PENJAGA NADA COPY (P1.2) ────────────────────────────────────────────────
   Tujuh area copy yang diminta pemilik produk harus:
     · menyapa pembaca dengan "kamu" — bukan "lo"/"lu"/"Anda";
     · menyebut Minca dengan "aku" — bukan "gue";
     · bebas kata menghakimi ("nge-judge"/"di-judge");
     · nol "harus/wajib" di teks yang dibaca user.

   Yang dipindai hanya TEKS, bukan komentar: komentar blok, komentar baris, dan
   komentar JSX dibuang lebih dulu. Berkas ini sengaja memuat kata terlarang di
   judul test, jadi ia tidak memindai dirinya sendiri. */

const AREA_FILES = [
  'lib/data/help.ts',
  'components/catetind/help-center-screen.tsx',
  'lib/weekly-recap.ts',
  'components/catetind/weekly-recap-modal.tsx',
  'lib/data/budget.ts',
  'components/catetind/budget-zone-a.tsx',
  'components/catetind/budget-zone-b.tsx',
  'lib/data/wallet-detail.ts',
  'components/catetind/wallet-detail-screen.tsx',
  'lib/data/referral.ts',
  'components/catetind/referral-screen.tsx',
  'lib/data/changelog.ts',
  'app/changelog/page.tsx',
  'lib/data/landing.ts',
]

function stripComments(source: string): string {
  return source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

function read(file: string): string {
  return stripComments(readFileSync(file, 'utf8'))
}

describe('nada copy tujuh area', () => {
  it.each(AREA_FILES)('%s bebas "gue/lo/lu/Anda"', (file) => {
    const code = read(file)
    expect(code).not.toMatch(/\bgue\b/i)
    expect(code).not.toMatch(/\blo\b/i)
    expect(code).not.toMatch(/\blu\b/i)
    expect(code).not.toMatch(/\bAnda\b/)
  })

  it.each(AREA_FILES)('%s bebas kata menghakimi dan "harus/wajib"', (file) => {
    const code = read(file)
    expect(code).not.toMatch(/judge/i)
    expect(code).not.toMatch(/\b(harus|wajib)\b/i)
  })

  it('landing & bantuan menyapa dengan "kamu"', () => {
    expect(read('lib/data/landing.ts')).toMatch(/\bkamu\b/i)
    expect(read('lib/data/help.ts')).toMatch(/\bkamu\b/i)
  })
})
