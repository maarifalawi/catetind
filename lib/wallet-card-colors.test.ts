import { describe, expect, it } from 'vitest'
import {
  hasUnrenderableCardColor,
  tokenizeCardClasses,
  usableCardColor,
} from './wallet-card-colors'
import { WALLET_SEED, toHomeWallet, toWalletAccount, type WalletSeed } from './wallets'

/* ── Test warna kartu dompet (paket 88) ──────────────────────────────────────
   Kenapa diuji: warna muka kartu dompet disimpan di DATABASE (`wallets.face`,
   `.color`, `.band_class`, `.face_class`), sementara Tailwind hanya meng-generate
   kelas yang literalnya muncul di source. Baris dompet yang lahir sebelum palet
   dipindah ke token karena itu tersimpan sebagai `from-[#52685c]` — kelas yang
   tidak pernah digenerate lagi, sehingga gradien muka kartunya hilang dan
   nominal putih tampil di atas kartu terang.

   Dua janji yang dikunci di sini:
     1. kelas hex lama DIPETAKAN ke token kanon (hasilnya identik dengan resep
        `WALLET_SEED`, jadi kartu lama & kartu baru tidak bisa beda warna);
     2. tidak ada satu pun jalur yang mengembalikan warna tak-terpakai — kolom
        kosong atau hex di luar tabel jatuh ke resep kanon, bukan ke kartu tanpa
        gradien.
   ────────────────────────────────────────────────────────────────────────── */

/** baris dompet seperti yang benar-benar ada di produksi (pra-tokenisasi) */
const LEGACY_ROW: WalletSeed = {
  id: 'w-1',
  name: 'BCA',
  holder: 'Jon',
  number: '•••• 0849',
  network: 'VISA',
  opening: 1_450_000,
  kind: 'bank',
  type: 'Bank',
  context: 'pribadi',
  bandClass: 'from-[#e6e4c0] via-[#ffffff] to-[#e6e4c0]',
  faceClass: 'from-[#52685c] via-[#45594e] to-[#161c19]',
  glowClass: 'bg-forest/25',
  color: 'bg-gradient-to-r from-[#c4c7af] to-[#45594e]',
  face: 'bg-gradient-to-br from-[#52685c] via-[#45594e] to-[#161c19]',
  art: 'parang',
}

/** baris yang kolom warnanya benar-benar kosong (lahir dari jalur tanpa warna) */
const BLANK_ROW: WalletSeed = {
  ...LEGACY_ROW,
  id: 'bca',
  bandClass: '',
  faceClass: '',
  color: '',
  face: '',
}

/** hasil tokenisasi baris lama — nilai yang SAMA dengan resep kanon dompetnya */
const LEGACY_TOKEN_BAND = 'from-olive-light via-cream to-olive-light'

/** dua kelas arbitrer yang tidak punya token: tetap tak bisa dirender */
const UNKNOWN_STOPS = 'from-[#767676] to-[#fbf6d9]'

/** resep kanon yang dipakai sebagai jaring terakhir */
const CANON = WALLET_SEED[0]

describe('tokenizeCardClasses · kelas hex lama → token palet', () => {
  it('muka, halo, stop, dan band lama menjadi kelas token', () => {
    expect(tokenizeCardClasses(LEGACY_ROW.face)).toBe(CANON.face)
    expect(tokenizeCardClasses(LEGACY_ROW.color)).toBe(CANON.color)
    expect(tokenizeCardClasses(LEGACY_ROW.faceClass)).toBe(CANON.faceClass)
    expect(tokenizeCardClasses(LEGACY_ROW.bandClass)).toBe(LEGACY_TOKEN_BAND)
  })

  it('hex yang tidak punya token dibiarkan, jadi tetap tak bisa dirender', () => {
    const unknown = `bg-gradient-to-br ${UNKNOWN_STOPS} to-forest`
    expect(tokenizeCardClasses(unknown)).toBe(unknown)
    expect(hasUnrenderableCardColor(unknown)).toBe(true)
    expect(usableCardColor(unknown)).toBe(false)
  })

  it('kelas token & string kosong tidak dianggap warna kartu', () => {
    expect(usableCardColor(CANON.face)).toBe(true)
    expect(usableCardColor('')).toBe(false)
    expect(tokenizeCardClasses('')).toBe('')
  })

  it('idempotent — kelas yang sudah bertoken tidak diubah lagi', () => {
    expect(tokenizeCardClasses(CANON.face)).toBe(CANON.face)
  })
})

describe('toWalletAccount · muka kartu /wallet selalu bisa dirender', () => {
  it('baris lama di-tokenkan (kartunya tidak lagi kehilangan gradien)', () => {
    const account = toWalletAccount(LEGACY_ROW, 1_450_000)
    expect(account.face).toBe(CANON.face)
    expect(account.color).toBe(CANON.color)
  })

  it('kolom kosong jatuh ke resep kanon, bukan ke kartu transparan', () => {
    const account = toWalletAccount(BLANK_ROW, 0)
    expect(account.face).toBe(CANON.face)
    expect(account.color).toBe(CANON.color)
  })

  it('`face` kosong tapi `faceClass` terisi → arah gradient ditambahkan di sini', () => {
    const account = toWalletAccount(
      { ...LEGACY_ROW, face: '', faceClass: 'from-mint via-forest-soft to-evergreen-deeper' },
      0,
    )
    expect(account.face).toBe('bg-gradient-to-br from-mint via-forest-soft to-evergreen-deeper')
  })

  it('warna yang tidak bisa digenerate tidak pernah lolos ke kartu', () => {
    const account = toWalletAccount(
      { ...LEGACY_ROW, face: `bg-gradient-to-br ${UNKNOWN_STOPS}`, color: '' },
      0,
    )
    expect(usableCardColor(account.face)).toBe(true)
    expect(account.face).toBe(CANON.face)
    expect(account.color).toBe(CANON.color)
  })
})

describe('toHomeWallet · kartu deck Home selalu bisa dirender', () => {
  it('baris lama di-tokenkan', () => {
    const wallet = toHomeWallet(LEGACY_ROW, 1_450_000)
    expect(wallet.faceClass).toBe(CANON.faceClass)
    expect(wallet.bandClass).toBe(LEGACY_TOKEN_BAND)
  })

  it('kolom kosong jatuh ke resep kanon', () => {
    const wallet = toHomeWallet(BLANK_ROW, 0)
    expect(wallet.faceClass).toBe(CANON.faceClass)
    expect(wallet.bandClass).toBe(CANON.bandClass)
  })

  it('kartu yang sudah bertoken tidak berubah (tanpa regresi)', () => {
    const wallet = toHomeWallet(WALLET_SEED[1], 350_000)
    expect(wallet.faceClass).toBe(WALLET_SEED[1].faceClass)
    expect(wallet.bandClass).toBe(WALLET_SEED[1].bandClass)
  })
})
