import { describe, expect, it } from 'vitest'
import { shouldWriteDraft } from './use-transaction-submit'
import type { DraftTransactionInput } from '@/lib/transaction-bus'

/* ── Test KEPUTUSAN TULIS shell input (paket 49) ─────────────────────────────
   Yang dikunci di sini adalah penjaga yang dulu implisit di
   `useTransactionSubmit`: draft dari form EDIT tidak pernah boleh ditulis
   sebagai catatan BARU (kalau tidak, catatan lama "lahir ulang" jadi baris
   kedua), sementara form TAMBAH `/calendar` memang membawa tanggal sendiri.

   Fungsi murni dipakai apa adanya oleh hook-nya — bukan salinan aturannya. */

/** draft khas form TAMBAH FAB/web: tanpa tanggal & tanpa dompet */
const addDraft: DraftTransactionInput = { amount: 25_000, note: 'Kopi', type: 'expense' }

/** draft khas form EDIT: dompet + tanggal + kategori sekaligus */
const editDraft: DraftTransactionInput = {
  amount: 85_000,
  note: 'Starbucks',
  type: 'expense',
  category: 'Makanan',
  wallet: 'BCA',
  date: '2026-09-27',
}

/** draft khas modal catatan `/calendar`: membawa tanggal terpilih */
const calendarDraft: DraftTransactionInput = {
  amount: 85_000,
  note: 'Makan malam',
  type: 'expense',
  category: 'Makanan',
  date: '2026-09-22',
  clientTxId: 'tx-kalender-1',
}

describe('shouldWriteDraft', () => {
  it('draft form tambah biasa (tanpa tanggal) ditulis', () => {
    expect(shouldWriteDraft(addDraft)).toBe(true)
  })

  it('draft mode edit yang nyasar ke jalur "catat baru" DITOLAK', () => {
    expect(shouldWriteDraft(editDraft)).toBe(false)
    expect(shouldWriteDraft(editDraft, { backdated: false })).toBe(false)
  })

  it('draft bertanggal dari /calendar ditulis saat pemanggil menyatakan backdated', () => {
    expect(
      shouldWriteDraft({ ...calendarDraft, wallet: 'BCA' }, { backdated: true }),
    ).toBe(true)
  })

  it('dompet + tanggal TANPA pernyataan itu tetap ditolak (tanda draft mode edit)', () => {
    /* inilah bentuk draft yang dikirim halaman edit: dompet & tanggal sekaligus */
    expect(shouldWriteDraft({ ...calendarDraft, wallet: 'BCA' })).toBe(false)
    expect(shouldWriteDraft(editDraft)).toBe(false)
    expect(shouldWriteDraft(editDraft, { backdated: false })).toBe(false)
  })

  it('tanggal saja (tanpa dompet) bukan penanda draft edit — perilaku lama dipertahankan', () => {
    /* penjaganya butuh KEDUANYA, jadi draft bertanggal tanpa dompet sudah boleh
       ditulis sejak dulu; `backdated` tetap dikirim halaman kalender karena ia
       memang mengisi dompetnya sendiri (dan itu harus tetap sah) */
    expect(shouldWriteDraft(calendarDraft)).toBe(true)
  })

  it('backdated tidak mengubah draft biasa: dua pintu tetap sama hasilnya', () => {
    expect(shouldWriteDraft(addDraft, { backdated: true })).toBe(true)
  })
})
