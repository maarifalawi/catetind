import { describe, expect, it } from 'vitest'
import {
  claimsRecordedAction,
  detectOutOfScope,
  editDistance,
  mentionsWord,
  mentionsWordLoose,
} from './coach-guard'

/* ── Test PAGAR JAWABAN AI (paket 80) ────────────────────────────────────────
   Dua temuan uji pakai yang dijawab file ini:
     (1) user mengetik "makn gacoan 30k" → AI mengaku sudah mencatat padahal
         Riwayat kosong ⇒ klaim seperti itu harus tertangkap (`claimsRecordedAction`)
         dan typo harus tetap kebaca sebagai niat mencatat (`mentionsWordLoose`);
     (2) AI menjawab pertanyaan di luar konteks keuangan ⇒ harus DITOLAK
         (`detectOutOfScope`), tapi pertanyaan keuangan apa pun tetap dilayani.
   Ambang toleransi typo juga diuji langsung (bukan cuma lewat satu contoh). */

describe('editDistance', () => {
  it('menghitung jarak edit dasar', () => {
    expect(editDistance('makan', 'makan')).toBe(0)
    expect(editDistance('makn', 'makan')).toBe(1)
    expect(editDistance('sarapn', 'sarapan')).toBe(1)
    expect(editDistance('kapan', 'makan')).toBe(2)
  })
})

describe('mentionsWordLoose (toleran salah ketik — gerbang niat mencatat)', () => {
  it('membaca typo ringan sebagai kata kunci', () => {
    expect(mentionsWordLoose('makn gacoan 30k', ['makan'])).toBe(true)
    expect(mentionsWordLoose('minm 20k', ['minum'])).toBe(true)
    expect(mentionsWordLoose('sarapn 15k', ['sarapan'])).toBe(true)
    expect(mentionsWordLoose('belii kopi 25rb', ['beli'])).toBe(true)
  })

  it('TIDAK menelan kata lain yang berdekatan', () => {
    /* "kapan" hanya berjarak 2 dari "makan" dan panjangnya 5 → ambang 1 */
    expect(mentionsWordLoose('kapan gajian?', ['makan'])).toBe(false)
    expect(mentionsWordLoose('aku cuma nanya', ['makan'])).toBe(false)
  })

  it('kata kunci pendek harus persis', () => {
    expect(mentionsWordLoose('isi pulsa 25k', ['isi'])).toBe(true)
    expect(mentionsWordLoose('isi pulsa 25k', ['mie'])).toBe(false)
  })
})

describe('mentionsWord (persis — dipakai daftar luar konteks)', () => {
  it('mencocokkan kata dan frasa', () => {
    expect(mentionsWord('buatkan script python dong', ['python'])).toBe(true)
    expect(mentionsWord('kamu siapa sih?', ['kamu siapa'])).toBe(true)
    /* persis: typo TIDAK ditoleransi, karena salah tolak mahal harganya */
    expect(mentionsWord('buatkan script piton', ['python'])).toBe(false)
  })

  it('opsi allowSuffix membaca kata berimbuhan — hanya untuk kata ≥ 4 huruf', () => {
    expect(mentionsWord('pengeluaranku kemarin', ['pengeluaran'], { allowSuffix: true })).toBe(true)
    expect(mentionsWord('kapan aku gajian?', ['gaji'], { allowSuffix: true })).toBe(true)
    /* kata pendek tidak boleh menelan kata lain */
    expect(mentionsWord('pria itu keren', ['pr'], { allowSuffix: true })).toBe(false)
    /* tanpa opsi, imbuhan tidak dihitung */
    expect(mentionsWord('pengeluaranku kemarin', ['pengeluaran'])).toBe(false)
  })
})

describe('detectOutOfScope', () => {
  it('menolak pertanyaan yang bukan soal uang user', () => {
    expect(detectOutOfScope('buatkan script python buat scraping')).toBe(true)
    expect(detectOutOfScope('resep nasi goreng dong')).toBe(true)
    expect(detectOutOfScope('menurutmu siapa yang menang di liga?')).toBe(true)
    expect(detectOutOfScope('jelaskan sejarah kemerdekaan Indonesia')).toBe(true)
    expect(detectOutOfScope('kamu siapa dan pakai model apa?')).toBe(true)
  })

  it('TIDAK menolak pertanyaan keuangan — termasuk yang menyentuh investasi', () => {
    expect(detectOutOfScope('kok pengeluaranku boros ya bulan ini?')).toBe(false)
    expect(detectOutOfScope('catet makan gacoan 30k')).toBe(false)
    expect(detectOutOfScope('harga bitcoin hari ini berapa?')).toBe(false)
    expect(detectOutOfScope('cara atur budget per kategori')).toBe(false)
    expect(detectOutOfScope('bantu aku nabung buat dana darurat')).toBe(false)
    /* kalimat TRANSAKSI yang menyebut topik lain tetap lolos: yang dibaca app
       adalah pengeluarannya, bukan pertanyaan film/olahraganya */
    expect(detectOutOfScope('beli tiket film 100k')).toBe(false)
    expect(detectOutOfScope('bayar langganan spotify 55k')).toBe(false)
  })

  it('typo & nama warung tanpa kata baku tetap bukan pertanyaan luar konteks', () => {
    expect(detectOutOfScope('makn gacoan 30k')).toBe(false)
    expect(detectOutOfScope('gacoan 30k')).toBe(false)
  })

  it('kalimat biasa tanpa topik yang dikenali: dibiarkan ke model', () => {
    expect(detectOutOfScope('aduh capek banget hari ini')).toBe(false)
    expect(detectOutOfScope('')).toBe(false)
  })
})

describe('claimsRecordedAction (pagar klaim aksi)', () => {
  it('menangkap klaim "sudah mencatat" — temuan uji pakai', () => {
    expect(
      claimsRecordedAction(
        'Oke, "Makan Gacoan Rp 30.000" sudah tercatat sebagai pengeluaranmu ya. Semoga nikmat!',
      ),
    ).toBe(true)
    expect(claimsRecordedAction('Sip, sudah aku catat ya 🌿')).toBe(true)
    expect(claimsRecordedAction('Oke aku catat ya')).toBe(true)
    expect(claimsRecordedAction('Sudah aku simpan ke dompet Tunai.')).toBe(true)
    expect(claimsRecordedAction('Saldomu sudah aku kurangi Rp 30.000.')).toBe(true)
  })

  it('membiarkan balasan yang jujur & mengarahkan ke kartu konfirmasi', () => {
    expect(claimsRecordedAction('Sisa jatah harianmu hari ini Rp 95.000.')).toBe(false)
    expect(
      claimsRecordedAction(
        'Kalau mau dicatat, tekan tombol “Catat ✓” di kartu konfirmasi ya — semua kolomnya bisa kamu ubah.',
      ),
    ).toBe(false)
    expect(claimsRecordedAction('Bulan ini pengeluaranmu di kategori Makanan paling besar.')).toBe(false)
    expect(claimsRecordedAction('')).toBe(false)
  })
})
