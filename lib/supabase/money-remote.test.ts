import { describe, expect, it } from 'vitest'
import { classifyInsertOutcome } from './money-remote'

/* ── `23505` TIDAK SELALU "SUDAH TERSIMPAN" ────────────────────────────────────
   Temuan nyata: setelah cache perangkat dibersihkan, id lokal mulai lagi dari
   `session-9001` — padahal baris LAMA dengan id itu masih ada di server (PK
   `(user_id, id)`). INSERT dijawab `23505`, dan versi lama menerjemahkannya
   sebagai sukses: catatan baru tidak pernah masuk, lalu setelah refresh baris
   LAMA dengan id tersebut yang tampil. Transaksi terlihat "berubah".

   `ledger_rows` punya DUA constraint unik:
     · `unique (user_id, client_tx_id)` → baris ini memang sudah ada (retry
       idempoten / double-tap) → `synced`;
     · `primary key (user_id, id)`      → id dipakai baris LAIN → `conflict`
       (baris baru belum tersimpan; store wajib memberi id baru & kirim ulang).
   Fungsi murni ini yang memutuskan, jadi bisa diuji tanpa jaringan. */
describe('classifyInsertOutcome', () => {
  it('tanpa error = tersimpan', () => {
    expect(classifyInsertOutcome(null, null, 'tx-1')).toBe('synced')
  })

  it('23505 dengan client_tx_id yang SAMA = idempoten, bukan kegagalan', () => {
    expect(classifyInsertOutcome({ code: '23505' }, { client_tx_id: 'tx-1' }, 'tx-1')).toBe('synced')
  })

  it('23505 dengan client_tx_id BERBEDA = id bentrok, baris ini belum tersimpan', () => {
    expect(classifyInsertOutcome({ code: '23505' }, { client_tx_id: 'tx-lama' }, 'tx-baru')).toBe(
      'conflict',
    )
  })

  it('23505 tanpa baris yang bisa dibaca = TIDAK dianggap sukses (konservatif)', () => {
    expect(classifyInsertOutcome({ code: '23505' }, null, 'tx-baru')).toBe('conflict')
  })

  it('kode error lain (mis. RLS 42501) = gagal, harus dicoba lagi', () => {
    expect(classifyInsertOutcome({ code: '42501' }, null, 'tx-1')).toBe('failed')
  })
})
