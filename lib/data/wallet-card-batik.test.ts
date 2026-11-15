import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/* ── PENJAGA CORAK BATIK & PERMUKAAN KARTU DOMPET ─────────────────────────────
   Tiga janji produk yang dikunci di sini (revisi 15 Nov 2026):

     1. CORAK BATIK HIDUP LAGI di seluruh komponen kartu dompet. Dulu (sesi 3)
        motifnya dicabut dan kartu tampil polos; sekarang setiap komponen wajib
        membawa penanda `data-catetind-batik` yang juga dipakai
        `scripts/qa/visual-audit.mjs` sebagai pengecualian resmi.
     2. BATIK TAMPIL DI SEMUA KARTU — bukan hanya kartu pertama. Karena itu
        motif per dompet harus punya fallback (`kawung`) dan definisi pattern
        harus dirender di halaman yang memakai `<WalletFace/>`.
     3. PERMUKAAN KARTU BERSIH — tidak ada kode kartu, nomor rekening masking
        (•••• 1234), atau badge jaringan yang tercetak di kartu.

   Test ini menyisir SUMBER (bukan DOM) dengan alasan yang sama seperti
   `copy-cleanliness.test.ts`: janji visual ini tidak boleh hilang diam-diam
   hanya karena tidak ada satu unit pun yang me-render React. */

function source(relative: string): string {
  return readFileSync(new URL(relative, import.meta.url), 'utf8')
}

const BATIK_CLOTH = source('../../components/catetind/batik-cloth.tsx')
const CARD_FACE = source('../../components/catetind/wallet-card-face.tsx')
const CARD_STACK = source('../../components/catetind/wallet-card-stack.tsx')
const WALLET_SCREEN = source('../../components/catetind/wallet-screen.tsx')
const WALLET_DETAIL = source('../../components/catetind/wallet-detail-screen.tsx')
const ADD_WALLET = source('../../components/catetind/add-wallet-sheet.tsx')
const WEALTH_BAR = source('../../components/catetind/wealth-net-worth-bar.tsx')
const VISUAL_AUDIT = source('../../scripts/qa/visual-audit.mjs')

describe('corak batik di kartu dompet', () => {
  it('empat komponen pemilik corak memasang penanda data-catetind-batik', () => {
    for (const [name, text] of Object.entries({
      'batik-cloth.tsx': BATIK_CLOTH,
      'wallet-card-face.tsx': CARD_FACE,
      'wallet-card-stack.tsx': CARD_STACK,
      'wealth-net-worth-bar.tsx': WEALTH_BAR,
    })) {
      expect(text, `${name} wajib punya data-catetind-batik`).toContain('data-catetind-batik')
    }
  })

  it('BatikCloth menenun kain penuh: kawung + sabuk parang + tepi kain', () => {
    /* bukan lagi komponen kosong yang mengembalikan null */
    expect(BATIK_CLOTH).not.toMatch(/return null\s*\n\}/)
    expect(BATIK_CLOTH).toContain('pattern')
    expect(BATIK_CLOTH).toContain('parang')
    expect(BATIK_CLOTH).toContain('kawung')
    expect(BATIK_CLOTH).toContain('mask')
    expect(BATIK_CLOTH).toContain('absolute inset-0')
  })

  it('WalletArtDefs mendefinisikan empat motif + tekstur dasar', () => {
    for (const motif of ['kawung', 'mendung', 'parang', 'rings']) {
      expect(CARD_FACE, `pattern wallet-art-${motif} hilang`).toContain(`id="wallet-art-${motif}"`)
    }
    expect(CARD_FACE).toContain('id="wallet-art-geo"')
  })

  it('deck Dashboard mendefinisikan motifnya sendiri (card-art-*)', () => {
    for (const motif of ['kawung', 'mendung', 'parang', 'rings']) {
      expect(CARD_STACK, `pattern card-art-${motif} hilang`).toContain(`id="card-art-${motif}"`)
    }
  })

  it('motif tak dikenal jatuh ke kawung — tidak ada kartu tanpa corak', () => {
    expect(CARD_FACE).toContain('KNOWN_ART')
    expect(CARD_FACE).toContain(": 'kawung'")
    expect(CARD_STACK).toContain('CARD_ARTS')
    expect(CARD_STACK).toContain(": 'kawung'")
  })

  it('setiap halaman yang memakai <WalletFace/> merender <WalletArtDefs/>', () => {
    for (const [name, text] of Object.entries({
      'wallet-screen.tsx': WALLET_SCREEN,
      'wallet-detail-screen.tsx': WALLET_DETAIL,
      'add-wallet-sheet.tsx': ADD_WALLET,
    })) {
      expect(text, `${name} memakai WalletFace`).toContain('<WalletFace')
      expect(text, `${name} wajib merender <WalletArtDefs />`).toContain('<WalletArtDefs />')
    }
  })

  it('audit visual mengizinkan SVG batik secara resmi', () => {
    expect(VISUAL_AUDIT).toContain('data-catetind-batik')
    expect(VISUAL_AUDIT).toContain('walletCards')
    expect(VISUAL_AUDIT).toContain('cardsWithBatik')
    expect(VISUAL_AUDIT).toContain('cardsWithMasked')
  })
})

describe('permukaan kartu dompet bersih dari kode & nomor', () => {
  it('tidak ada nomor rekening masking yang dicetak di muka kartu', () => {
    for (const [name, text] of Object.entries({
      'wallet-card-stack.tsx': CARD_STACK,
      'wallet-screen.tsx': WALLET_SCREEN,
      'wallet-detail-screen.tsx': WALLET_DETAIL,
      'add-wallet-sheet.tsx': ADD_WALLET,
    })) {
      /* yang dilarang adalah MENCETAK nilainya sebagai teks JSX */
      expect(text, `${name} masih mencetak wallet.number`).not.toMatch(/\{\s*wallet\.number\s*\}/)
      expect(text, `${name} masih mencetak preview.number`).not.toMatch(/\{\s*preview\.number\s*\}/)
    }
  })

  it('kartu deck tidak lagi mengirim badge jaringan / nomor ke muka kartu', () => {
    expect(CARD_STACK).not.toContain('networkBadge')
    expect(CARD_STACK).not.toMatch(/sub:\s*`\$\{[^`]*\.number/)
  })

  it('kartu dompet memakai penanda yang diperiksa audit', () => {
    expect(CARD_FACE).toContain('data-catetind-kartu-dompet')
    expect(CARD_STACK).toContain('data-catetind-kartu-dompet')
  })
})
