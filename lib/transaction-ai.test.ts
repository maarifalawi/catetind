import { describe, expect, it } from 'vitest'
import {
  FALLBACK_CHAT_NAME,
  FALLBACK_VOICE_NAME,
  parseSpokenTransaction,
  parseTypedTransaction,
} from './transaction-ai'

/* ── Test PARSER TEKS: UCAPAN vs KETIKAN (paket 79) ──────────────────────────
   Temuan uji pakai 8 Okt 2026: user MENGETIK "airminum 5k" di chat, tapi kartu
   konfirmasi bicara soal suara ("Ucapanmu udah aku rapikan", "Yang aku denger")
   dan nama catatannya "Catatan dari suara".

   Yang dikunci di sini:
     1. sumber draft dibedakan (`'chat'` vs `'voice'`) — kartu memakai kalimat
        yang benar; itu satu-satunya alasan field `source` diperluas;
     2. nama catatan dari KETIKAN boleh dirangkai dari satu kata, sedangkan
        ucapan tetap butuh dua kata (STT satu kata terlalu mudah salah dengar);
     3. aturan lain (nominal, tipe, kategori, dompet, keyakinan) SAMA PERSIS —
        satu mesin, jadi dua pintu tidak bisa bercerita beda. */

const TODAY = '2026-10-08'

describe('parseTypedTransaction — ketikan user di chat', () => {
  it('"airminum 5k" jadi catatan yang bisa dibaca, bukan "Catatan dari suara"', () => {
    const result = parseTypedTransaction('airminum 5k', TODAY)

    expect(result.source).toBe('chat')
    expect(result.name).toBe('Airminum')
    expect(result.amount).toBe(5_000)
    expect(result.type).toBe('expense')
    expect(result.category).toBe('Makanan')
    expect(result.date).toBe(TODAY)
    /* tidak ada yang perlu dicek: nominal, kategori, dan nama semuanya terbaca */
    expect(result.lowFields).toEqual([])
  })

  it('kata perintah di ekor tulisan tidak ikut jadi nama catatan', () => {
    const result = parseTypedTransaction('beli kopi 25rb catet ya', TODAY)

    expect(result.name).toBe('Beli kopi')
    expect(result.amount).toBe(25_000)
    expect(result.category).toBe('Makanan')
  })

  it('teks tanpa nama yang bisa dibaca → jatuh ke nama netral versi CHAT', () => {
    const result = parseTypedTransaction('50k', TODAY)

    expect(result.name).toBe(FALLBACK_CHAT_NAME)
    expect(result.name).not.toBe(FALLBACK_VOICE_NAME)
    expect(result.amount).toBe(50_000)
    /* kategori benar-benar tidak terbaca → jujur ditandai, bukan ditebak */
    expect(result.lowFields).toContain('category')
  })

  it('nama warung yang umum tetap terbaca kategorinya (paket 80 — "makn gacoan 30k")', () => {
    /* huruf yang sama diketik salah tidak mengubah nominal, dan nama warung
       yang tercatat di daftar kategori membuat hasil bacanya tidak jatuh ke
       "Lainnya" — user tidak perlu memperbaiki manual */
    const result = parseTypedTransaction('makn gacoan 30k', TODAY)

    expect(result.amount).toBe(30_000)
    expect(result.category).toBe('Makanan')
    expect(result.name).toBe('Makn gacoan')
    expect(result.lowFields).toEqual([])
  })

  it('catatan yang jelas sebagai pemasukan/nabung mengikuti aturan yang sama', () => {
    const income = parseTypedTransaction('gaji 6.500.000', TODAY)
    expect(income.type).toBe('income')
    expect(income.category).toBe('Gaji Utama')
    expect(income.amount).toBe(6_500_000)

    const saving = parseTypedTransaction('nabung dana darurat 500rb', TODAY)
    expect(saving.type).toBe('saving')
    expect(saving.category).toBe('Dana Darurat')
    expect(saving.amount).toBe(500_000)
  })
})

describe('parseSpokenTransaction — ucapan tetap seperti semula', () => {
  it('satu kata hasil STT tidak dijadikan nama catatan', () => {
    const result = parseSpokenTransaction('airminum 5k', TODAY)

    expect(result.source).toBe('voice')
    expect(result.name).toBe(FALLBACK_VOICE_NAME)
    /* sisa aturannya sama dengan jalur ketikan — satu mesin, bukan dua */
    expect(result.amount).toBe(5_000)
    expect(result.category).toBe('Makanan')
  })

  it('ucapan lengkap tetap dirangkai jadi nama', () => {
    const result = parseSpokenTransaction('gua habis makan bakso 25 ribu', TODAY)

    expect(result.name).toBe('Gua habis makan bakso')
    expect(result.amount).toBe(25_000)
    expect(result.category).toBe('Makanan')
  })
})
