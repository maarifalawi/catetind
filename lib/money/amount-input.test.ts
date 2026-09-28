import { describe, expect, it } from 'vitest'
import {
  AMOUNT_MAX_DIGITS,
  AMOUNT_MAX_VALUE,
  cleanDigits,
  formatAmountDigits,
  groupDigits,
  parseAmountInput,
} from './amount-input'

/* ── Test input nominal manusiawi (paket 42 · audit Stage 5 #2 · paket 53) ───
   Angka yang dikunci di sini adalah angka yang MENYESATKAN di versi lama:

     · "1,5jt"  → dulu tersimpan Rp 15 (koma & huruf dibuang, sisanya "15")
     · "50rb"   → dulu tersimpan Rp 50
     · > 9 digit → dulu dipotong senyap oleh `.slice(0, 9)` tanpa pesan

   Sekarang ketiganya punya jawaban yang bisa dibaca user, dan input yang tidak
   terbaca TIDAK diam-diam dibuang: ia keluar sebagai `problem`.

   PAKET 53 mengubah satu kebijakan yang dulu sengaja dikunci di file ini:
   `display` untuk input DIGIT/TITIK tidak lagi "teks apa adanya" — sekarang
   hasil `groupDigits()` supaya titik ribuan rapi SAAT MENGETIK ("2000000" →
   "2.000.000"). Yang tetap mentah: singkatan (rb/jt) dan input bermasalah. */

describe('parseAmountInput · singkatan yang dihormati', () => {
  it('"1,5jt" jadi Rp 1.500.000 (bukan Rp 15 seperti versi lama)', () => {
    const parsed = parseAmountInput('1,5jt')
    expect(parsed.amount).toBe(1_500_000)
    expect(parsed.shorthand).toBe(true)
    expect(parsed.problem).toBeNull()
  })

  it('"50rb" jadi Rp 50.000, "2 juta" juga terbaca', () => {
    expect(parseAmountInput('50rb').amount).toBe(50_000)
    expect(parseAmountInput('50 rb').amount).toBe(50_000)
    expect(parseAmountInput('50k').amount).toBe(50_000)
    expect(parseAmountInput('2juta').amount).toBe(2_000_000)
    expect(parseAmountInput('2jt').amount).toBe(2_000_000)
  })

  it('desimal gaya Indonesia maupun titik dua-duanya jalan', () => {
    expect(parseAmountInput('2,5jt').amount).toBe(2_500_000)
    expect(parseAmountInput('2.5jt').amount).toBe(2_500_000)
    expect(parseAmountInput('1,25jt').amount).toBe(1_250_000)
    expect(parseAmountInput('2,5 juta').amount).toBe(2_500_000)
  })

  it('hasil singkatan selalu dibulatkan ke rupiah bulat', () => {
    expect(parseAmountInput('1,2345678jt').amount).toBe(1_234_568)
    expect(Number.isInteger(parseAmountInput('0,5rb').amount ?? 0)).toBe(true)
  })

  it('field dibiarkan apa adanya saat user masih mengetik singkatan', () => {
    /* penting untuk UX: kalau "2,5jt" ditulis ulang jadi "2.500.000" di tengah
       ketikan, user tidak bisa melanjutkan mengetik singkatannya. Kebijakan ini
       TIDAK berubah di paket 53 — hanya input digit/titik yang dirapikan. */
    expect(parseAmountInput('2,5jt').display).toBe('2,5jt')
    expect(parseAmountInput('50rb').display).toBe('50rb')
  })
})

describe('parseAmountInput · digit & batas', () => {
  it('angka biasa tetap diformat ribuan dan bukan shorthand', () => {
    const parsed = parseAmountInput('25000')
    expect(parsed.amount).toBe(25_000)
    expect(parsed.shorthand).toBe(false)
    expect(parsed.display).toBe('25.000')
  })

  it('menerima 13 digit (batas baru) dan menolak digit ke-14 dengan pesan', () => {
    const max = '9999999999999' // 13 digit
    expect(max).toHaveLength(AMOUNT_MAX_DIGITS)
    expect(parseAmountInput(max).amount).toBe(AMOUNT_MAX_VALUE)
    expect(parseAmountInput(max).problem).toBeNull()

    const over = `${max}9` // 14 digit
    const parsed = parseAmountInput(over)
    expect(parsed.amount).toBeNull()
    expect(parsed.problem).toBe('tooBig')
  })

  it('nominal raksasa dari singkatan pun ditolak dengan alasan "tooBig"', () => {
    expect(parseAmountInput('99999999jt').problem).toBe('tooBig')
  })

  it('kelompok ribuan bertitik dibaca sebagai bilangan bulat', () => {
    expect(parseAmountInput('1.500.000').amount).toBe(1_500_000)
    expect(parseAmountInput('50.000').amount).toBe(50_000)
    expect(parseAmountInput('1.500.000').display).toBe('1.500.000')
  })

  it('titik tetap dibaca walau kelompoknya BUKAN tiga digit ("2.5000" = Rp 25.000)', () => {
    /* Laporan pemilik produk (27 Sep): "2.5000" ditolak sebagai 'unsupported'
       karena aturan lama menuntut kelompok TEPAT tiga digit. Yang benar: 25.000. */
    const parsed = parseAmountInput('2.5000')
    expect(parsed.amount).toBe(25_000)
    expect(parsed.problem).toBeNull()
    /* display = bentuk RAPI-nya (paket 53). Dulu di sini tertulis '2.5000'
       "supaya user bisa melanjutkan mengetik" — kebijakan itu sudah diganti:
       user tidak perlu mengetik titik sama sekali, field yang memasangnya. */
    expect(parsed.display).toBe('25.000')
  })

  it('dua digit sebelum titik juga jalan ("25.000")', () => {
    expect(parseAmountInput('25.000').amount).toBe(25_000)
    expect(parseAmountInput('12.345.678').amount).toBe(12_345_678)
  })

  it('"1.5" / "1,5" TETAP ditanya (tidak boleh berubah jadi Rp 15 / Rp 1.500)', () => {
    expect(parseAmountInput('1.5').problem).toBe('fraction')
    expect(parseAmountInput('1,5').problem).toBe('fraction')
    expect(parseAmountInput('1.50').problem).toBe('fraction')
  })

  it('pemisah yang menggantung saat mengetik BUKAN error', () => {
    /* jangan menampilkan "belum kebaca" di tengah ketikan "25.000" / "1,5jt" */
    expect(parseAmountInput('25.').problem).toBeNull()
    expect(parseAmountInput('25.').amount).toBe(25)
    expect(parseAmountInput('2.500.000.').amount).toBe(2_500_000)
    expect(parseAmountInput('25,').problem).toBeNull()
    expect(parseAmountInput('.').problem).toBeNull()
    expect(parseAmountInput('.').amount).toBeNull()
  })
})

describe('parseAmountInput · yang tidak terbaca TIDAK dibuang diam-diam', () => {
  it('"1,5" tanpa satuan ditanya, bukan ditebak jadi Rp 15', () => {
    expect(parseAmountInput('1,5')).toMatchObject({ amount: null, problem: 'fraction' })
    expect(parseAmountInput('1.5')).toMatchObject({ amount: null, problem: 'fraction' })
  })

  it('huruf & simbol asing jadi "unsupported"', () => {
    expect(parseAmountInput('dua ribu').problem).toBe('unsupported')
    expect(parseAmountInput('12x').problem).toBe('unsupported')
    expect(parseAmountInput('Rp 50.000').problem).toBe('unsupported')
    expect(parseAmountInput('1,5rbx').problem).toBe('unsupported')
  })

  it('nominal minus ditolak eksplisit', () => {
    expect(parseAmountInput('-25000').problem).toBe('negative')
    expect(parseAmountInput('-2jt').problem).toBe('negative')
  })

  it('kosong = belum diisi, bukan error', () => {
    expect(parseAmountInput('')).toEqual({
      amount: null,
      shorthand: false,
      display: '',
      problem: null,
    })
    expect(parseAmountInput('   ').problem).toBeNull()
  })

  it('nol tetap nol (guard "isi nominalnya dulu" yang bicara, bukan parser)', () => {
    expect(parseAmountInput('0')).toMatchObject({ amount: 0, problem: null })
    expect(parseAmountInput('0jt')).toMatchObject({ amount: 0, shorthand: false })
  })
})

describe('helper tampilan', () => {
  it('groupDigits & formatAmountDigits memakai pemisah ribuan Indonesia', () => {
    expect(groupDigits('25000')).toBe('25.000')
    expect(groupDigits('1234567890')).toBe('1.234.567.890')
    expect(formatAmountDigits(1_500_000)).toBe('1.500.000')
    expect(formatAmountDigits(999)).toBe('999')
  })
})

/* ── VERIFIKASI UJI PEMAKAIAN 27 SEP (paket 44, #2 & #3) ─────────────────────
   Enam input yang diminta diuji apa adanya di prompt paket 44 — dikunci di sini
   supaya tidak bisa mundur lagi. Sejak paket 53 `display` untuk digit/titik
   SUDAH ber-titik saat diketik (`handleAmountChange` memasang `display` dari
   parser); yang tetap mentah di tengah ketikan hanya singkatan & input
   bermasalah, dan blur/submit menormalkannya ke bentuk kanon. */
describe('parseAmountInput · enam input dari uji pemakaian', () => {
  it('"25.000" → 25.000 (dua angka sebelum titik, bukan error)', () => {
    expect(parseAmountInput('25.000')).toMatchObject({
      amount: 25_000,
      shorthand: false,
      problem: null,
    })
  })

  it('"2.5000" → 25.000 (kelompok bukan tiga digit, dulu ditolak)', () => {
    expect(parseAmountInput('2.5000')).toMatchObject({ amount: 25_000, problem: null })
  })

  it('"1,5jt" → 1.500.000 sebagai singkatan (chip konfirmasi wajib tampil)', () => {
    expect(parseAmountInput('1,5jt')).toMatchObject({
      amount: 1_500_000,
      shorthand: true,
      problem: null,
    })
  })

  it('"50rb" → 50.000 sebagai singkatan', () => {
    expect(parseAmountInput('50rb')).toMatchObject({
      amount: 50_000,
      shorthand: true,
      problem: null,
    })
  })

  it('"-50000" ditolak HALUS: nominal null + alasan `negative` (bukan angka 50.000)', () => {
    expect(parseAmountInput('-50000')).toMatchObject({ amount: null, problem: 'negative' })
  })

  it('"25." bukan error — user masih mengetik, nominal sementara 25', () => {
    expect(parseAmountInput('25.')).toMatchObject({ amount: 25, problem: null })
  })
})

/* ── PAKET 53 — TITIK RIBUAN DIRAPIKAN SAAT MENGETIK ─────────────────────────
   Daftar kasus ini yang dipakai sebagai bukti paket 53. Semuanya lewat
   `parseAmountInput()` murni (mode mengketik), jadi bisa dijalankan tanpa
   browser — perubahan di engine tipis: `handleAmountChange` memasang `display`
   hasil parser, `handleAmountBlur`/`handleSubmit` menormalkan ke bentuk kanon.

   Yang dijaga di sini bukan cuma "titiknya muncul", tapi dua janji yang lebih
   penting: (1) satu angka punya SATU bentuk (`display` idempoten), dan
   (2) perapian TIDAK pernah mengubah nilai yang dibaca dari ketikan user. */
describe('parseAmountInput · titik ribuan saat mengetik (paket 53)', () => {
  it('digit penuh & kelompok lama sama-sama dirapikan tiga dari kanan', () => {
    expect(parseAmountInput('2000000').display).toBe('2.000.000')
    expect(parseAmountInput('2.000000').display).toBe('2.000.000') // keluhan user
    expect(parseAmountInput('2.000.000').display).toBe('2.000.000') // idempoten
    expect(parseAmountInput('2000').display).toBe('2.000')
    expect(parseAmountInput('200').display).toBe('200') // tidak ada titik sebelum 4 digit
  })

  it('nilai nominalnya TIDAK berubah karena perapian', () => {
    expect(parseAmountInput('2000000').amount).toBe(2_000_000)
    expect(parseAmountInput('2.000000').amount).toBe(2_000_000)
    expect(parseAmountInput('2.000.000').amount).toBe(2_000_000)
    expect(parseAmountInput('2.000000').shorthand).toBe(false)
  })

  it('perapiannya idempoten: display di-parse ulang menghasilkan display yang sama', () => {
    for (const input of ['2000000', '2.000000', '2000', '200', '25000', '1234567890']) {
      const shown = parseAmountInput(input).display
      expect(parseAmountInput(shown).display).toBe(shown)
    }
  })

  it('backspace menghapus satu DIGIT, bukan satu karakter pemisah', () => {
    /* simulasi field: tiap "backspace" = buang karakter terakhir dari nilai yang
       TAMPIL, lalu parse ulang persis seperti `handleAmountChange` */
    const backspace = (shown: string) => parseAmountInput(shown.slice(0, -1)).display
    expect(backspace('2.500.000')).toBe('250.000')
    expect(backspace('250.000')).toBe('25.000')
    expect(backspace('25.000')).toBe('2.500')
    expect(backspace('2.500')).toBe('2.50')
    expect(backspace('250')).toBe('25')
    /* Satu langkah terakhir itu SENGAJA tidak dirapikan: "2.50" cuma 3 digit, dan
       di ukuran itu titik belum pasti pemisah ribuan (user bisa sedang menulis
       desimal gaya Inggris "1.50" atau bersiap menulis "1.5jt"). Jadi field
       menahan teksnya + masalah `fraction` — bukan mengarang tafsir. Mengetik
       satu digit lagi membawa user kembali ke bentuk rapi. */
    expect(parseAmountInput('2.50')).toMatchObject({
      amount: null,
      problem: 'fraction',
      display: '2.50',
    })
    expect(parseAmountInput('2.500').display).toBe('2.500')
    expect(parseAmountInput('2.500').amount).toBe(2_500)
  })

  it('nol di depan dibuang supaya satu angka tidak punya dua bentuk', () => {
    expect(parseAmountInput('007').display).toBe('7')
    expect(parseAmountInput('0050000').display).toBe('50.000')
    expect(parseAmountInput('0000').display).toBe('0')
    expect(parseAmountInput('007').amount).toBe(7)
    expect(cleanDigits('007')).toBe('7')
    expect(cleanDigits('0')).toBe('0')
  })

  it('singkatan tetap mentah saat diketik, tapi blur/submit memakai bentuk kanon', () => {
    const shorthand = parseAmountInput('2jt')
    /* utuh supaya ketikan "jt"-nya tidak dipotong di tengah jalan */
    expect(shorthand.display).toBe('2jt')
    expect(shorthand.amount).toBe(2_000_000)
    /* inilah yang dipasang engine saat blur/submit (`formatAmountDigits`) */
    expect(formatAmountDigits(shorthand.amount ?? 0)).toBe('2.000.000')
    expect(formatAmountDigits(parseAmountInput('1,5jt').amount ?? 0)).toBe('1.500.000')
    expect(formatAmountDigits(parseAmountInput('50rb').amount ?? 0)).toBe('50.000')
  })

  it('input bermasalah TIDAK dirapikan — teks mentah yang dibutuhkan user', () => {
    expect(parseAmountInput('-50000')).toMatchObject({
      amount: null,
      problem: 'negative',
      display: '-50000',
    })
    expect(parseAmountInput('12x')).toMatchObject({ problem: 'unsupported', display: '12x' })
    expect(parseAmountInput('1,5')).toMatchObject({ problem: 'fraction', display: '1,5' })
  })

  it('"25." tetap bernilai 25 — titik menggantung tidak dikarang jadi ribuan', () => {
    /* Prompt paket 53 menuliskan harapan "25. → 25.000". Itu SENGAJA tidak
       diikuti: menerjemahkan titik jadi "ribuan" berarti satu ketikan titik
       melipatgandakan nominal 1000×, dan user yang mengetik pemisahnya sendiri
       ("1.500.000") akan mendapat angka salah tanpa sadar. Yang dijaga: nilainya
       tetap 25 dan ketikan user tidak hilang (titiknya tetap ada sampai angka
       berikutnya menjelaskan maksudnya). */
    const parsed = parseAmountInput('25.')
    expect(parsed.amount).toBe(25)
    expect(parsed.problem).toBeNull()
    expect(parsed.display).toBe('25.')
    /* begitu angkanya jelas ribuan, field menampilkan bentuk rapi */
    expect(parseAmountInput('25.000').amount).toBe(25_000)
    expect(parseAmountInput('25000').display).toBe('25.000')
    expect(parseAmountInput('2.500.000.').display).toBe('2.500.000')
  })

  it('ketikan ber-titik dari keyboard fisik dihitung nilainya, bukan menumpuk', () => {
    /* user yang menulis pemisahnya sendiri tidak boleh dapat angka lain:
       "1.500.000" (sepuluh ketukan) = 1.500.000, sama dengan "1500000" */
    expect(parseAmountInput('1.500.000').amount).toBe(1_500_000)
    expect(parseAmountInput('1.500.000').display).toBe('1.500.000')
    expect(parseAmountInput('1.').amount).toBe(1)
    expect(parseAmountInput('1.500').amount).toBe(1_500)
  })
})

