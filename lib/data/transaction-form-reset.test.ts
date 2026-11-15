import { describe, expect, it } from 'vitest'
import {
  shouldResetTransactionForm,
  transactionFormOpenKey,
  transactionFormResume,
} from './transaction-form-reset'

/* ── Test KAPAN FORM TRANSAKSI DI-RESET ──────────────────────────────────────
   Yang dikunci: isian user TIDAK boleh hilang hanya karena komponen induk
   render ulang. Regresi nyata yang memicu file ini (11 Nov 2026): di Dompet
   Bersama, setiap digit nominal memicu `onAmountChange` → halaman Joint render
   ulang → `types={['expense','income']}` (array literal) dianggap berubah →
   effect reset engine mengosongkan nominal & catatan yang sedang diketik. */

describe('transactionFormOpenKey', () => {
  it('panel tertutup tidak punya kunci', () => {
    expect(transactionFormOpenKey(false)).toBeNull()
    expect(transactionFormOpenKey(false, 'tx-1')).toBeNull()
  })

  it('catat baru vs edit baris punya kunci berbeda', () => {
    expect(transactionFormOpenKey(true)).toBe('new')
    expect(transactionFormOpenKey(true, null)).toBe('new')
    expect(transactionFormOpenKey(true, 'tx-1')).toBe('edit:tx-1')
    expect(transactionFormOpenKey(true, 'tx-2')).toBe('edit:tx-2')
    /* id transaksi riwayat berupa ANGKA — harus tetap jadi kunci yang berbeda */
    expect(transactionFormOpenKey(true, 42)).toBe('edit:42')
    expect(transactionFormOpenKey(true, 0)).toBe('edit:0')
  })
})

describe('shouldResetTransactionForm', () => {
  it('render ulang dengan kunci SAMA tidak me-reset isian (bug yang dilaporkan)', () => {
    /* pembukaan pertama → reset */
    expect(shouldResetTransactionForm(null, 'new')).toBe(true)
    /* lalu induk render ulang berkali-kali selama user mengetik → TIDAK reset */
    expect(shouldResetTransactionForm('new', 'new')).toBe(false)
    expect(shouldResetTransactionForm('new', 'new')).toBe(false)
    /* mode edit: objek `initial` baru dari store (id sama) juga tidak reset */
    expect(shouldResetTransactionForm('edit:tx-1', 'edit:tx-1')).toBe(false)
  })

  it('panel ditutup lalu dibuka lagi → form fresh', () => {
    expect(shouldResetTransactionForm('new', null)).toBe(false)
    /* engine mengosongkan ref saat panel ditutup; pembukaan berikutnya reset */
    expect(shouldResetTransactionForm(null, 'new')).toBe(true)
  })

  it('pindah baris yang diedit → field diisi ulang dari baris baru', () => {
    expect(shouldResetTransactionForm('edit:tx-1', 'edit:tx-2')).toBe(true)
    /* dan kembali ke mode tambah dari mode edit */
    expect(shouldResetTransactionForm('edit:tx-2', 'new')).toBe(true)
  })
})

/* ── DRAFT YANG DIPULIHKAN SAAT KEMBALI DARI "ATUR PEMBAGIAN" ───────────────
   Yang dikunci: nominal, catatan, kategori, dan tipe yang sudah diisi user
   TIDAK hilang ketika sheet input ditutup sebentar untuk membuka pengaturan
   pembagian. Form yang benar-benar baru tetap kosong & langsung fokus. */
describe('transactionFormResume', () => {
  it('tanpa draft = form kosong dan fokus ke nominal (perilaku lama)', () => {
    expect(transactionFormResume(null, 'expense')).toEqual({
      type: 'expense',
      amountText: '',
      note: '',
      category: '',
      focusAmount: true,
    })
  })

  it('draft dari halaman Joint dipulihkan apa adanya, tanpa auto-focus', () => {
    const state = transactionFormResume(
      { amount: 450000, note: 'Belanja bulanan', category: 'Makanan', type: 'income' },
      'expense',
    )
    /* angka tampil dalam bentuk kanon (bergrup ribuan), bukan "450000" */
    expect(state.amountText).toBe('450.000')
    expect(state.note).toBe('Belanja bulanan')
    expect(state.category).toBe('Makanan')
    /* tipe pilihan user menang atas tipe bawaan shell */
    expect(state.type).toBe('income')
    /* keyboard tidak ditarik sendiri — tombol Catat jangan tertutup */
    expect(state.focusAmount).toBe(false)
  })

  it('nominal 0 / tidak sah dianggap kosong tapi draft tetap diingat', () => {
    const state = transactionFormResume({ amount: 0, note: 'kopi' }, 'expense')
    expect(state.amountText).toBe('')
    expect(state.note).toBe('kopi')
    expect(state.focusAmount).toBe(false)
  })

  it('draft tanpa tipe memakai tipe bawaan shell', () => {
    expect(transactionFormResume({ amount: 10000 }, 'income').type).toBe('income')
  })
})
