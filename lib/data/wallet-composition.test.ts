import { describe, expect, it } from 'vitest'
import { walletShares } from './wallet-composition'

/* ── Test PORSI DOMPET (%) (paket 95) ─────────────────────────────────────────
   Yang dikunci:
     1. jumlah porsi SELALU tepat 100 saat total > 0 — walaupun angka mentahnya
        menghasilkan pecahan (78 + 19 + 3 → tidak boleh 99/101);
     2. porsi mengikuti proporsi saldo, bukan urutan;
     3. porsi besar tetap menang, sisanya dibagikan ke pecahan terbesar
        (largest remainder) — deterministik, bukan acak;
     4. total 0 / tidak wajar → semua 0 (jangan menggambar porsi dari ketiadaan).
   Rumus ini dipakai SATU untuk bar komposisi, legenda, label "% dari total", dan
   lebar bar di kaki kartu dompet, jadi angkanya mustahil berbeda antar tempat. */

describe('walletShares', () => {
  it('jumlah porsi selalu tepat 100 (saldo kanon 1.450.000 / 350.000 / 50.000)', () => {
    const shares = walletShares([1_450_000, 350_000, 50_000], 1_850_000)
    expect(shares.reduce((a, b) => a + b, 0)).toBe(100)
    /* 78.38% → 78 · 18.92% → 19 · 2.70% → 3 (pecahan terbesar dapat sisa 1) */
    expect(shares).toEqual([78, 19, 3])
  })

  it('pecahan yang tidak bulat tidak berujung 99/101', () => {
    const values = [1, 1, 1] // 33.33% masing-masing
    const shares = walletShares(values, 3)
    expect(shares.reduce((a, b) => a + b, 0)).toBe(100)
    expect(shares).toEqual([34, 33, 33])
  })

  it('porsi mengikuti proporsi saldo (bukan urutan)', () => {
    expect(walletShares([750, 250], 1000)).toEqual([75, 25])
    expect(walletShares([250, 750], 1000)).toEqual([25, 75])
  })

  it('total 0 / tak wajar → semua 0 (tidak mengarang porsi)', () => {
    expect(walletShares([0, 0], 0)).toEqual([0, 0])
    expect(walletShares([100, 200], Number.NaN)).toEqual([0, 0])
    expect(walletShares([], 0)).toEqual([])
  })

  it('satu dompet memegang semuanya → 100%', () => {
    expect(walletShares([500_000, 0], 500_000)).toEqual([100, 0])
  })
})
