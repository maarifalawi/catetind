import { describe, expect, it } from 'vitest'
import { ADD_WALLET_SHEET_COPY, EDIT_WALLET_SHEET_COPY } from './add-wallet'
import { createWalletAccount, walletBrandByName, WALLET_KIND_OPTIONS } from '../wallets'

/* ── KONTRAK SHEET DOMPET: DUA MODE, SATU FORM ───────────────────────────────
   `AddWalletSheet` dipakai untuk MENAMBAH dan MENGUBAH dompet. Yang dikunci di
   sini adalah bagian yang tidak boleh berubah diam-diam:

     1. copy mode TAMBAH tetap sama kata per kata (permintaan produk: alur tambah
        tidak boleh ikut berubah saat mode ubah ditambahkan);
     2. copy mode UBAH punya kalimatnya sendiri — termasuk alasan saldo tidak
        diubah di sana;
     3. fungsi titik berangkat kartu (`createWalletAccount`) tetap menghasilkan
        kartu yang sah untuk pratinjau di kedua mode. */

describe('copy sheet dompet', () => {
  it('mode TAMBAH tidak berubah kata per kata', () => {
    expect(ADD_WALLET_SHEET_COPY.title).toBe('Tambah Dompet')
    expect(ADD_WALLET_SHEET_COPY.submit).toBe('Simpan Dompet 🌿')
    expect(ADD_WALLET_SHEET_COPY.toastTitle).toBe('Dompet baru siap 🌿')
    expect(ADD_WALLET_SHEET_COPY.kindLabel).toBe('Jenis akun')
    expect(ADD_WALLET_SHEET_COPY.balanceLabel).toBe('Saldo sekarang')
  })

  it('mode UBAH punya judul & tombol sendiri, dan menyebut saldo tidak diubah', () => {
    expect(EDIT_WALLET_SHEET_COPY.title).toBe('Ubah Dompet')
    expect(EDIT_WALLET_SHEET_COPY.submit).toBe('Simpan Perubahan')
    expect(EDIT_WALLET_SHEET_COPY.title).not.toBe(ADD_WALLET_SHEET_COPY.title)
    /* alasan saldo tidak bisa diubah di sini HARUS dikatakan, bukan disembunyikan */
    expect(EDIT_WALLET_SHEET_COPY.balanceNote).toMatch(/saldo/i)
    expect(EDIT_WALLET_SHEET_COPY.balanceNote).toMatch(/sesuaikan saldo/i)
    /* penolakan store punya kalimatnya sendiri, dipakai di dalam sheet */
    expect(EDIT_WALLET_SHEET_COPY.rejected).toMatch(/wajib diisi/i)
  })

  it('tidak ada em-dash di copy yang baru (aturan nada app)', () => {
    for (const value of Object.values(EDIT_WALLET_SHEET_COPY)) {
      const text = typeof value === 'string' ? value : ''
      expect(text).not.toContain('—')
    }
  })
})

describe('pratinjau kartu di kedua mode', () => {
  it('mode TAMBAH: kartu baru dari resep palet, warna tidak dipilih user', () => {
    const card = createWalletAccount({ name: 'BCA Harian', type: 'Bank', balance: 250_000 }, 0)
    expect(card.name).toBe('BCA Harian')
    expect(card.type).toBe('Bank')
    expect(card.balance).toBe(250_000)
    /* resep palet: muka, halo, dan motif — bukan warna pilihan user */
    expect(card.face.length).toBeGreaterThan(0)
    expect(card.color.length).toBeGreaterThan(0)
    expect(card.art.length).toBeGreaterThan(0)
  })

  it('mode UBAH: kartu dompet yang sudah ada dipakai apa adanya (warna tidak berubah)', () => {
    const existing = createWalletAccount({ name: 'GoPay', type: 'E-Wallet', balance: 85_000 }, 3)
    /* sheet mempratinjau `{ ...wallet, name }` — jadi warna/motif harus identik */
    const preview = { ...existing, name: 'GoPay Harian' }
    expect(preview.face).toBe(existing.face)
    expect(preview.art).toBe(existing.art)
    expect(preview.color).toBe(existing.color)
    expect(preview.name).toBe('GoPay Harian')
    expect(preview.balance).toBe(existing.balance)
  })

  it('brand yang diketik di mode ubah tetap dikenali dari daftar yang sama', () => {
    expect(walletBrandByName('GoPay')?.type).toBe('E-Wallet')
    expect(WALLET_KIND_OPTIONS.map((option) => option.id)).toContain('Bank')
  })
})
