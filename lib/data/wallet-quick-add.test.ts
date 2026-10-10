import { describe, expect, it } from 'vitest'
import {
  QUICK_ADD_LIMIT,
  brandUsageFromWalletNames,
  quickAddBrands,
} from './wallet-quick-add'
import { WALLET_BRAND_OPTIONS } from '../wallets'

/* ── Test "TAMBAH DOMPET CEPAT": TOP 3 + LAINNYA (paket 77) ──────────────────
   Rail ini berhenti menggulir: yang tampil PERSIS tiga saran, lalu tombol
   "Lainnya" lebar penuh. Yang dikunci di sini adalah aturan pemilihan tiga
   saran itu — bukan tampilannya:
     • user tidak pernah ditawari dompet yang sudah ia miliki;
     • brand yang paling sering dipakai naik ke atas;
     • tanpa sinyal pakai, urutannya tetap urutan kanon (stabil, bukan acak);
     • jumlahnya tidak pernah melebihi batas. */

const names = (list: { name: string }[]) => list.map((brand) => brand.name)

describe('quickAddBrands', () => {
  it('tanpa sinyal pakai → tiga brand pertama urutan kanon (bukan acak)', () => {
    const picked = quickAddBrands({ ownedNames: [] })
    expect(picked).toHaveLength(QUICK_ADD_LIMIT)
    expect(names(picked)).toEqual(
      WALLET_BRAND_OPTIONS.slice(0, QUICK_ADD_LIMIT).map((brand) => brand.name),
    )
  })

  it('brand yang sudah dimiliki TIDAK pernah ditawarkan lagi', () => {
    const owned = WALLET_BRAND_OPTIONS.slice(0, 2).map((brand) => brand.name)
    const picked = quickAddBrands({ ownedNames: owned })
    expect(names(picked)).not.toContain(owned[0])
    expect(names(picked)).not.toContain(owned[1])
    expect(picked).toHaveLength(QUICK_ADD_LIMIT)
  })

  it('nama dompet dibandingkan tanpa peduli besar-kecil huruf & spasi', () => {
    /* user punya dompet bernama "  bca  " → BCA tetap dianggap sudah dimiliki */
    const picked = quickAddBrands({ ownedNames: ['  bca  '] })
    expect(names(picked)).not.toContain('BCA')
  })

  it('sinyal pakai menaikkan brand ke atas, seri tetap urutan kanon', () => {
    const usage = brandUsageFromWalletNames(['Mandiri', 'Mandiri', 'Dana'])
    const picked = quickAddBrands({ ownedNames: [], usage })
    expect(picked[0].name).toBe('Mandiri')
    expect(picked[1].name).toBe('Dana')
    /* sisa slot diisi menurut urutan kanon (BCA lebih dulu dari GoPay) */
    expect(picked[2].name).toBe(WALLET_BRAND_OPTIONS[0].name)
  })

  it('sinyal pakai mengalahkan urutan kanon walau brand-nya di ujung daftar', () => {
    const usage = { jago: 9 }
    const picked = quickAddBrands({ ownedNames: [], usage })
    expect(picked[0].name).toBe('Jago')
  })

  it('semua brand sudah dimiliki → daftar saran kosong (bukan brand karangan)', () => {
    const picked = quickAddBrands({
      ownedNames: WALLET_BRAND_OPTIONS.map((brand) => brand.name),
    })
    expect(picked).toEqual([])
  })

  it('batas jumlah dihormati & tidak pernah negatif', () => {
    expect(quickAddBrands({ ownedNames: [], limit: 1 })).toHaveLength(1)
    expect(quickAddBrands({ ownedNames: [], limit: 0 })).toHaveLength(0)
    expect(quickAddBrands({ ownedNames: [], limit: -3 })).toHaveLength(0)
  })

  it('daftar brand kustom dihormati (fungsi tidak membaca konstanta global)', () => {
    const picked = quickAddBrands({
      brands: [
        { name: 'Bank Satu', type: 'Bank', tile: 'bg-cream', frame: '' },
        { name: 'Bank Dua', type: 'Bank', tile: 'bg-cream', frame: '' },
      ],
      ownedNames: ['Bank Satu'],
    })
    expect(names(picked)).toEqual(['Bank Dua'])
  })
})

describe('brandUsageFromWalletNames', () => {
  it('menghitung jumlah pakai per nama & menormalkan kuncinya', () => {
    expect(brandUsageFromWalletNames(['BCA', 'bca', ' Bca '])).toEqual({ bca: 3 })
  })

  it('nama kosong diabaikan (bukan kunci string kosong)', () => {
    expect(brandUsageFromWalletNames(['', '   '])).toEqual({})
  })
})
