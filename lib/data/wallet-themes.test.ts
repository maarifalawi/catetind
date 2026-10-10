import { describe, expect, it } from 'vitest'
import {
  DEFAULT_BRAND_THEME_IDS,
  WALLET_CUSTOM_THEMES,
  WALLET_THEME_COUNT,
  applyWalletDeckTheme,
  applyWalletTheme,
  brandThemeId,
  isCustomWalletTheme,
  parseWalletThemePrefs,
  serializeWalletThemePrefs,
  themeGradientStops,
  walletThemeById,
  withWalletTheme,
} from './wallet-themes'
import { WALLET_BRAND_OPTIONS, type WalletArt } from '../wallets'

/* ── Test TEMA KARTU KUSTOM (paket 77) ──────────────────────────────────────
   Permintaan pemilik produk: SEMBILAN tema kustom yang "strictly separate" dari
   tujuh tema bank bawaan. Yang dikunci di sini adalah janji itu — jumlahnya
   persis 9, id-nya unik, dan tidak satu pun id-nya bertabrakan dengan tujuh
   tema bawaan. Ditambah aturan mainnya: penerapan tema & penyimpanan preferensi
   harus tetap benar walau data di localStorage rusak. */

const ARTS: WalletArt[] = ['parang', 'mendung', 'kawung', 'rings']

describe('WALLET_CUSTOM_THEMES — janji "9 tema"', () => {
  it('jumlahnya PERSIS 9 (dan sama dengan konstanta yang dipakai UI)', () => {
    expect(WALLET_CUSTOM_THEMES).toHaveLength(WALLET_THEME_COUNT)
    expect(WALLET_THEME_COUNT).toBe(9)
  })

  it('id unik semua', () => {
    const ids = WALLET_CUSTOM_THEMES.map((theme) => theme.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('id tema kustom TIDAK bertabrakan dengan 7 tema bawaan brand', () => {
    const custom = new Set(WALLET_CUSTOM_THEMES.map((theme) => theme.id))
    for (const id of DEFAULT_BRAND_THEME_IDS) {
      expect(custom.has(id)).toBe(false)
    }
    /* dua kelompoknya juga harus benar-benar berbeda panjangnya */
    expect(DEFAULT_BRAND_THEME_IDS).toHaveLength(WALLET_BRAND_OPTIONS.length)
    expect(new Set(DEFAULT_BRAND_THEME_IDS).size).toBe(DEFAULT_BRAND_THEME_IDS.length)
  })

  it('setiap tema lengkap: nama, keterangan, gradien muka, halo, motif, swatch', () => {
    for (const theme of WALLET_CUSTOM_THEMES) {
      expect(theme.id.startsWith('custom-')).toBe(true)
      expect(theme.name.trim().length).toBeGreaterThan(0)
      expect(theme.note.trim().length).toBeGreaterThan(0)
      /* muka kartu = gradien (bukan warna datar) supaya teks cream tetap kontras */
      expect(theme.face.startsWith('bg-gradient')).toBe(true)
      expect(theme.color.startsWith('bg-gradient')).toBe(true)
      expect(theme.swatch.startsWith('bg-gradient')).toBe(true)
      expect(ARTS).toContain(theme.art)
    }
  })

  it('muka kartu tiap tema berbeda satu sama lain (bukan duplikat tersembunyi)', () => {
    const faces = WALLET_CUSTOM_THEMES.map((theme) => theme.face)
    expect(new Set(faces).size).toBe(faces.length)
  })
})

describe('walletThemeById / isCustomWalletTheme', () => {
  it('menemukan tema kustom dari id-nya', () => {
    const first = WALLET_CUSTOM_THEMES[0]
    expect(walletThemeById(first.id)).toBe(first)
    expect(isCustomWalletTheme(first.id)).toBe(true)
  })

  it('id bawaan/kosong/tidak dikenal dijawab null (bukan tema karangan)', () => {
    for (const id of [null, undefined, '', 'brand-bca', 'custom-tidak-ada']) {
      expect(walletThemeById(id)).toBeNull()
      expect(isCustomWalletTheme(id)).toBe(false)
    }
  })

  it('brandThemeId menormalkan nama brand jadi slug', () => {
    expect(brandThemeId('BCA')).toBe('brand-bca')
    expect(brandThemeId('  Go-Pay ')).toBe('brand-go-pay')
  })
})

describe('applyWalletTheme', () => {
  const wallet = {
    id: 'bca',
    face: 'bg-gradient-to-br from-[#52685c] via-[#45594e] to-[#161c19]',
    color: 'bg-gradient-to-r from-[#c4c7af] to-[#45594e]',
    art: 'parang' as WalletArt,
  }

  it('menimpa muka/halo/motif dengan tema yang dipilih', () => {
    const theme = WALLET_CUSTOM_THEMES[3]
    const themed = applyWalletTheme(wallet, theme.id)
    expect(themed.face).toBe(theme.face)
    expect(themed.color).toBe(theme.color)
    expect(themed.art).toBe(theme.art)
    /* identitas dompet tidak ikut berubah */
    expect(themed.id).toBe('bca')
  })

  it('tanpa tema / tema tidak dikenal → dompet dikembalikan apa adanya', () => {
    expect(applyWalletTheme(wallet, null)).toBe(wallet)
    expect(applyWalletTheme(wallet, 'custom-tidak-ada')).toBe(wallet)
  })
})

describe('applyWalletDeckTheme (muka kartu deck Dashboard)', () => {
  const deckWallet = {
    id: 'bca',
    faceClass: 'from-[#52685c] via-[#45594e] to-[#161c19]',
    bandClass: 'from-[#c4c7af] via-[#ffffff] to-[#c4c7af]',
    glowClass: 'bg-evergreen/25',
    art: 'parang' as WalletArt,
  }

  it('stop gradien tema dipindah tanpa arahnya (arah dipasang muka deck)', () => {
    const theme = WALLET_CUSTOM_THEMES[0]
    expect(themeGradientStops(theme.face)).toBe(
      'from-[#91bb9e] via-[#45594e] to-[#161c19]',
    )
    expect(themeGradientStops(theme.face)).not.toContain('bg-gradient')
  })

  it('deck memakai tema yang sama dengan muka kartu halaman Dompet', () => {
    const theme = WALLET_CUSTOM_THEMES[6]
    const themed = applyWalletDeckTheme(deckWallet, theme.id)
    expect(themed.faceClass).toBe(themeGradientStops(theme.face))
    expect(themed.bandClass).toBe(themeGradientStops(theme.swatch))
    expect(themed.glowClass).toBe(theme.color)
    expect(themed.art).toBe(theme.art)
    /* identitas dompet tidak ikut berubah */
    expect(themed.id).toBe('bca')
  })

  it('tanpa tema → dompet apa adanya (kartu bawaan tidak berubah sedikit pun)', () => {
    expect(applyWalletDeckTheme(deckWallet, null)).toBe(deckWallet)
    expect(applyWalletDeckTheme(deckWallet, 'custom-tidak-ada')).toBe(deckWallet)
  })
})

describe('preferensi tema (localStorage)', () => {
  it('entri tidak valid dibuang saat dibaca', () => {
    const raw = JSON.stringify({
      bca: WALLET_CUSTOM_THEMES[0].id,
      gopay: 'custom-sudah-dihapus',
      tunai: 'brand-mandiri',
      '': WALLET_CUSTOM_THEMES[1].id,
    })
    expect(parseWalletThemePrefs(raw)).toEqual({ bca: WALLET_CUSTOM_THEMES[0].id })
  })

  it('nilai rusak / bukan objek → peta kosong, tidak melempar', () => {
    for (const raw of [null, undefined, '', 'bukan-json', '[]', '"teks"', '12']) {
      expect(parseWalletThemePrefs(raw)).toEqual({})
    }
  })

  it('disimpan dengan kunci terurut (tulisan stabil antar perangkat)', () => {
    const prefs = { tunai: WALLET_CUSTOM_THEMES[2].id, bca: WALLET_CUSTOM_THEMES[0].id }
    expect(serializeWalletThemePrefs(prefs)).toBe(
      JSON.stringify({
        bca: WALLET_CUSTOM_THEMES[0].id,
        tunai: WALLET_CUSTOM_THEMES[2].id,
      }),
    )
    expect(parseWalletThemePrefs(serializeWalletThemePrefs(prefs))).toEqual(prefs)
  })

  it('withWalletTheme: menambah, mengubah, dan menghapus (kembali bawaan)', () => {
    const empty = {}
    const withOne = withWalletTheme(empty, 'bca', WALLET_CUSTOM_THEMES[0].id)
    expect(withOne).toEqual({ bca: WALLET_CUSTOM_THEMES[0].id })

    const changed = withWalletTheme(withOne, 'bca', WALLET_CUSTOM_THEMES[1].id)
    expect(changed).toEqual({ bca: WALLET_CUSTOM_THEMES[1].id })

    /* `null` = balik ke bawaan → kuncinya HILANG, bukan diisi penanda */
    expect(withWalletTheme(changed, 'bca', null)).toEqual({})
  })

  it('withWalletTheme idempoten: nilai sama / id kosong → peta lama apa adanya', () => {
    const prefs = { bca: WALLET_CUSTOM_THEMES[0].id }
    expect(withWalletTheme(prefs, 'bca', WALLET_CUSTOM_THEMES[0].id)).toBe(prefs)
    expect(withWalletTheme(prefs, '', WALLET_CUSTOM_THEMES[1].id)).toBe(prefs)
    expect(withWalletTheme(prefs, 'baru', null)).toBe(prefs)
    /* tema tidak dikenal diperlakukan seperti "bawaan" */
    expect(withWalletTheme(prefs, 'bca', 'custom-tidak-ada')).toEqual({})
  })
})
