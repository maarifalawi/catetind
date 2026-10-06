import { describe, expect, it } from 'vitest'
import {
  cashTotal,
  getMoneySnapshot,
  getServerMoneySnapshot,
  mergeMoneySnapshot,
  removeWalletAccount,
  resetMoneyStore,
  walletAccounts,
} from './store'

/* ── Test AKUN BERSIH = NOL DOMPET (paket 65 · Tugas C) ──────────────────────
   Gejala yang ditutup: setelah semua dompet dihapus, halaman Dompet & Akun masih
   menampilkan "Total Saldo Rp 3.600.000 · 8 dompet" — jumlah yang BUKAN seed
   bawaan (3 dompet) sehingga jelas ada sumber pengisi lain.

   Akarnya: dompet contoh (`WALLET_SEED`) di-inject sebagai STATE AWAL + jadi
   "daftar dasar" `mergeMoneySnapshot()` untuk kunjungan pertama. Jadi begitu
   state tersimpan kosong (atau setelah hapus-akun), dompet contoh itu LAHIR LAGI.
   Paket ini membuat state awal SELALU kosong (produksi & demo) dan daftar dasar
   merge = HANYA yang tersimpan. Test di bawah mengunci hasilnya. */

describe('akun bersih = nol dompet (Tugas C)', () => {
  it('kunjungan pertama tanpa state tersimpan → 0 dompet & Rp 0 (seed TIDAK di-inject)', () => {
    const merged = mergeMoneySnapshot(null, getServerMoneySnapshot())
    expect(merged.wallets).toHaveLength(0)
    expect(walletAccounts(merged)).toHaveLength(0)
    expect(cashTotal(merged)).toBe(0)
  })

  it('state server (render pertama) juga kosong — HTML server = render pertama client', () => {
    const server = getServerMoneySnapshot()
    expect(server.wallets).toHaveLength(0)
    expect(cashTotal(server)).toBe(0)
  })

  it('setelah semua dompet dihapus, refresh (merge) tidak menghidupkan dompet contoh', () => {
    resetMoneyStore()
    const before = getMoneySnapshot()
    expect(walletAccounts(before).length).toBeGreaterThan(0)

    for (const wallet of [...before.wallets]) removeWalletAccount(wallet.id)
    const after = getMoneySnapshot()
    expect(walletAccounts(after)).toHaveLength(0)

    /* simulasi refresh: state yang tersimpan dibaca ulang — tombstone tetap
       dihormati, jadi tidak ada dompet yang "lahir lagi" */
    const reloaded = mergeMoneySnapshot(
      {
        wallets: [...after.wallets],
        rows: [...after.rows],
        removedIds: [...after.removedIds],
        removedWalletIds: [...after.removedWalletIds],
      },
      { ...after, wallets: [] },
    )
    expect(walletAccounts(reloaded)).toHaveLength(0)
  })
})
