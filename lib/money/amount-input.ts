/* ── INPUT NOMINAL YANG MANUSIAWI (paket 42 · audit Stage 5 #2 · paket 53) ───
   Temuan auditnya (paket 42): engine input dulu melakukan
       `value.replace(/\D/g, '').slice(0, 9)`
   Jadi user yang mengetik "1,5jt" tersimpan sebagai **Rp 15** (koma & huruf
   dibuang, sisanya "15"), dan nominal di atas Rp 999.999.999 mentok tanpa satu
   pun pesan — user mengira sudah tercatat.

   Modul ini menutup keduanya dengan tiga janji:

     1. SINGKATAN DIHORMATI — "50rb" → 50.000, "2,5jt" → 2.500.000, "1.5jt" dan
        "2jt" juga jalan. Nilainya BULAT (rupiah tidak punya sen di app ini).
     2. TIDAK ADA YANG DIBUANG DIAM-DIAM — input yang tidak bisa dibaca
        dikembalikan sebagai `problem`, dan pemanggil WAJIB menampilkan
        kalimatnya (copy-nya ada di `lib/data/history.ts`, bukan di sini:
        lapis ini murni, tanpa teks user-facing).
     3. BATAS JELAS — 13 digit (maks Rp 9.999.999.999.999). Kelebihannya jadi
        `problem: 'tooBig'`, bukan pemotongan senyap seperti `slice(0, 9)` dulu.

   ── KEBIJAKAN BARU PAKET 53: TITIK RIBUAN DIRAPIKAN **SAAT MENGETIK** ───────
   Sampai paket 44, `display` sengaja mengembalikan teks APA ADANYA saat user
   masih mengetik; perapian ribuan hanya terjadi saat blur/submit. Alasannya
   waktu itu: merapikan di tengah ketikan bikin field terasa "melawan" (kursor
   melompat, backspace terasa menghapus karakter lain).

   Keluhan pemilik produk (uji pemakaian 28 Sep 2026) menuntut yang sebaliknya:
   user mengetik "2000000" / "2.000000" dan field menampilkan persis begitu —
   bukan "2.000.000". Jadi sekarang:

     · input digit/titik → `display` = `groupDigits()` dari SELURUH digitnya.
       Titik yang sudah ada dibuang lebih dulu lalu dikelompokkan ulang dari
       kanan: "2.000000" → "2.000.000" (dan idempoten: "2.000.000" tetap
       "2.000.000"). Tidak ada titik sebelum 4 digit ("200" tetap "200").
       Nol di depan juga dibuang karena angka tidak pernah mulai dari 0
       ("007" → "7"), supaya satu nominal tidak punya dua bentuk.
     · PENGECUALIAN jalur desimal: angka KECIL (≤ 3 digit) yang bertitik belum
       pasti "ribuan" — user bisa sedang menulis desimal gaya Inggris
       ("1.5", "1.50") atau bersiap menuliskan satuannya ("1.5jt"). Di situ teks
       dibiarkan apa adanya dan "1.5"/"1.50" tetap DITANYA (`fraction`), persis
       seperti paket 44. Konsekuensinya jujur dan tertulis: `2750` yang sudah
       tampil "2.750" lalu dihapus satu digit berhenti di "2.75" (ditanya, bukan
       ditebak) sampai user mengetik lagi. Begitu angkanya 4 digit atau kelompok
       di belakang titik 3+ digit, titik itu PASTI pemisah → dirapikan.
     · singkatan (rb/jt/k/ribu/juta) tetap dibiarkan APA ADANYA selama diketik —
       kalau "2,5jt" langsung ditulis ulang jadi "2.500.000", user tidak bisa
       menyelesaikan ketikan "jt"-nya. Perapiannya terjadi saat blur/submit
       (`formatAmountDigits()`), jadi satu angka tetap punya satu bentuk final.
     · masalah (`tooBig`/`negative`/`fraction`/`unsupported`) TIDAK berubah dan
       tetap mengembalikan teks mentah: itu ketikan yang perlu DIBETULKAN user,
       bukan ketikan yang perlu dirapikan.
     · TIGA NOL TIDAK PERNAH DIKARANG: "25." bukan 25.000. Kalau trailing dot
       diterjemahkan jadi "ribuan", satu ketikan titik melipatgandakan nominal
       1000× dan user yang mengetik pemisahnya sendiri ("1.500.000") mendapat
       angka salah tanpa sadar — itu pelanggaran janji #2 di atas.

   Kenapa merapikan saat mengetik sekarang aman (padahal dulu tidak):
     · field nominal app ini `inputMode="numeric"`, jadi tombol titik memang
       tidak ada di keypad HP. Titik yang tetap datang (keyboard fisik / tempel
       teks) diperlakukan sebagai pemisah lalu dirapikan ulang — bukan
       ditumpuk seperti dulu, sehingga dua ketikan berbeda tidak pernah
       menghasilkan angka yang sama;
     · teksnya di-center dan **kursor SELALU di ujung kanan**: user tidak
       pernah menyunting di tengah string. Menyisipkan pemisah di kiri kursor
       karena itu tidak menggeser karakter yang sedang disunting — inilah inti
       masalah "kursor melompat" yang dulu membuat perapian ditunda.

   CATATAN YANG JANGAN DIHAPUS kalau field ini berubah: dua syarat di atas
   (keypad angka + kursor selalu di ujung) adalah yang membuat aturan ini boleh
   ada. Kalau nanti field nominal bisa disunting di tengah (kursor bisa
   dipindah, atau berubah jadi textarea), aturan "rapikan saat mengetik" HARUS
   ditinjau ulang — di situlah kursor mulai melompat lagi.

   Kembaliannya juga membawa `display` (nilai yang aman dipasang kembali ke
   field) — lihat janji di atas: rapi untuk digit/titik, apa adanya untuk
   singkatan & input yang bermasalah. */

/** batas digit: 13 digit = maksimum Rp 9.999.999.999.999 */
export const AMOUNT_MAX_DIGITS = 13
/** nominal terbesar yang diterima (13 digit sembilan) */
export const AMOUNT_MAX_VALUE = 9_999_999_999_999

/** kenapa input tidak bisa dibaca — pemanggil menerjemahkannya ke kalimat */
export type AmountInputProblem = 'unsupported' | 'tooBig' | 'negative' | 'fraction'

export interface ParsedAmountInput {
  /** nominal rupiah bulat; `null` = belum ada angka yang bisa dibaca */
  amount: number | null
  /** true = user menulis singkatan (rb/jt), jadi chip konfirmasi wajib tampil */
  shorthand: boolean
  /**
   * nilai untuk dipasang kembali ke field:
   * · digit/titik → bentuk RAPI hasil `groupDigits()` ("2.000.000");
   * · singkatan & input bermasalah → teks yang diketik user, apa adanya
   *   (supaya ketikannya bisa dilanjutkan/dibetulkan);
   * · kosong ('' kalau memang belum ada angka).
   */
  display: string
  /** kode masalah; `null` = input sah atau belum diisi */
  problem: AmountInputProblem | null
}

/* Satuan singkatan yang dikenal. `k` ikut karena itu yang orang ketik sehari-hari
   ("50k"), dan artinya sama dengan "rb". `ribu`/`juta` ikut supaya kalimat utuh
   ("2 juta") juga terbaca — voice parser di `lib/transaction-ai.ts` memakai
   daftar satuan yang sama, jadi kedua pintu masuk sepakat soal arti "jt". */
const UNITS: { pattern: RegExp; factor: number }[] = [
  { pattern: /(jt|juta)$/, factor: 1_000_000 },
  { pattern: /(rb|ribu|k)$/, factor: 1_000 },
]

/** angka tanpa satuan: digit polos saja */
const PLAIN_INTEGER = /^\d+$/
/**
 * desimal pendek tanpa satuan (`1,5` / `1.5` / `1.50`) — artinya ambigu
 * (1,5 juta? 1,5 ribu?), jadi user DITANYA, bukan ditebak.
 */
const BARE_DECIMAL = /^\d+[.,]\d{1,3}$/
/**
 * digit & titik saja (`2000000`, `2.000000`, `25.`) — SATU-SATUNYA bentuk yang
 * dirapikan saat mengetik (paket 53). Titik diperlakukan sebagai pemisah ribuan
 * apa pun panjang kelompoknya, jadi tidak ada lagi aturan "kelompok harus tepat
 * tiga digit" yang dulu menolak `2.5000` sebagai input rusak.
 */
const DIGITS_AND_DOTS = /^[\d.]+$/
/** satu titik diikuti 1–2 digit (`1.5`, `1.50`) — masih terlihat seperti desimal */
const SHORT_DECIMAL_DOT = /^\d+\.\d{1,2}$/
/** desimal dengan satuan (`2,5jt`, `1.5rb`) */
const UNIT_DECIMAL = /^\d+(?:[.,]\d+)?$/

/** banyak digit dalam sebuah ketikan, tanpa pemisah apa pun */
function digitCount(value: string): number {
  return value.replace(/\D/g, '').length
}

/** 25000 → "25.000" (pemisah ribuan gaya Indonesia) */
export function groupDigits(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * Buang nol di depan — "007" → "7", "000" → "0" (nol tetap nol).
 *
 * Paket 53: nol di depan tidak punya arti di nominal dan bikin satu angka
 * punya dua bentuk di layar ("07" vs "7", "0.000" untuk ketikan "0000"), jadi
 * dibuang. Dipakai saat merapikan `display` (engine) **dan** oleh `RupiahField`
 * di `components/catetind/budget-sheet.tsx`, supaya semua input rupiah app ini
 * memakai satu aturan bentuk — bukan cuma satu aturan pemisah ribuan.
 *
 * Yang dibuang HANYA bentuk tampilan/teks: `amount` selalu dihitung dari angka
 * yang sama ("007" dan "7" dua-duanya 7).
 */
export function cleanDigits(value: string): string {
  return value.replace(/^0+(?=\d)/, '')
}

/** 9.999.999.999.999 = 13 digit; dipakai untuk menolak sebelum pembulatan */
function tooManyDigits(value: number): boolean {
  return String(Math.trunc(Math.abs(value))).replace(/^0+/, '').length > AMOUNT_MAX_DIGITS
}

function result(amount: number | null, shorthand: boolean, display: string): ParsedAmountInput {
  return { amount, shorthand, display, problem: null }
}

function problem(kind: AmountInputProblem, display: string): ParsedAmountInput {
  return { amount: null, shorthand: false, display, problem: kind }
}

/**
 * Baca nominal yang diketik user. Fungsi murni: tidak menyentuh DOM, tidak
 * berformat locale mesin (deterministik, aman diuji & di-SSR).
 */
export function parseAmountInput(raw: string): ParsedAmountInput {
  const trimmed = raw.trim()
  if (!trimmed) return result(null, false, '')

  /* semua spasi dibuang: "2,5 jt" = "2,5jt" */
  const text = trimmed.toLowerCase().replace(/\s+/g, '')

  if (text.includes('-')) return problem('negative', trimmed)

  const unit = UNITS.find((candidate) => candidate.pattern.test(text))
  if (unit) {
    const numberText = text.replace(unit.pattern, '')
    if (!UNIT_DECIMAL.test(numberText)) return problem('unsupported', trimmed)
    const value = Number(numberText.replace(',', '.')) * unit.factor
    if (!Number.isFinite(value)) return problem('unsupported', trimmed)
    const amount = Math.round(value)
    if (amount <= 0) return result(0, false, trimmed)
    if (amount > AMOUNT_MAX_VALUE || tooManyDigits(amount)) return problem('tooBig', trimmed)
    return result(amount, true, trimmed)
  }

  /* ── tanpa satuan: TITIK = pemisah ribuan, KOMA = desimal ────────────────────
     Aturan lama (`^\d{1,3}(?:\.\d{3})+$`) menuntut kelompok TEPAT tiga digit,
     sehingga "2.5000" — yang jelas-jelas 25.000 — ditolak sebagai 'unsupported'
     dan user melihat "Nominalnya belum kebaca". Sekarang titik diperlakukan
     sebagai pemisah ribuan apa pun panjang kelompoknya, dan yang menentukan
     nilainya adalah DIGITNYA — titik cuma tampilan.

     `display` = digit tersebut dikelompokkan ulang dari kanan (paket 53), jadi
     ketikan "2000000" / "2.000000" langsung terbaca "2.000.000" dan tidak
     pernah ada dua bentuk untuk satu nominal. */
  if (text.includes(',')) {
    /* koma = desimal gaya Indonesia → "1,5" ambigu, ditanya */
    const normalized = text.replace(/,+$/, '')
    if (!normalized) return result(null, false, text)
    if (PLAIN_INTEGER.test(normalized)) return result(Number(normalized), false, text)
    if (BARE_DECIMAL.test(normalized)) return problem('fraction', trimmed)
    return problem('unsupported', trimmed)
  }

  /* "1.5"/"1.50" — angka KECIL yang titiknya belum pasti pemisah ribuan: user
     bisa sedang menulis desimal gaya Inggris. Tetap DITANYA, bukan ditebak jadi
     15/150 (paket 44 tidak berubah di sini). Batasnya 3 digit karena rupiah app
     ini tidak punya desimal 4 digit: lewat dari itu titiknya PASTI pemisah. */
  if (SHORT_DECIMAL_DOT.test(text) && digitCount(text) <= 3) return problem('fraction', trimmed)

  if (DIGITS_AND_DOTS.test(text)) {
    /* digit polos atau kelompok bertitik apa pun bentuknya. Titik yang diketik
       user dibuang lalu digitnya dikelompokkan ulang — itulah keluhan paket 53
       ("2.000000" harus terbaca "2.000.000"), dan artinya nilainya TIDAK pernah
       berubah karena perapian: "1.500.000" yang diketik tangan = "1500000". */
    const digits = cleanDigits(text.replace(/\./g, ''))
    if (!digits) return result(null, false, '') // cuma titik, belum ada angka
    const amount = Number(digits)
    if (!Number.isFinite(amount)) return problem('unsupported', trimmed)
    if (tooManyDigits(amount) || amount > AMOUNT_MAX_VALUE) return problem('tooBig', trimmed)
    /* PENGECUALIAN jalur desimal: titik di ujung angka kecil ("1." / "25.")
       dibiarkan apa adanya. Titik itu belum bisa jadi pemisah ribuan (tidak ada
       apa pun di belakangnya), dan user yang sedang mengetik "1.5jt" atau
       "25.000" di keyboard fisik harus bisa melanjutkan ketikannya — kalau
       dipaksa dikelompokkan, "1.5jt" jadi "15jt". Jangan "mengarang" tiga nol
       juga: tiga nol yang tidak diketik user bukan angka yang boleh disimpan. */
    if (text.endsWith('.') && digitCount(text) <= 3) return result(amount, false, text)
    return result(amount <= 0 ? 0 : amount, false, groupDigits(digits))
  }

  return problem('unsupported', trimmed)
}

/**
 * Bentuk KANON sebuah nominal: `1500000` → `"1.500.000"`.
 *
 * Dipakai saat blur/submit (paket 53) supaya satu angka hanya punya satu bentuk
 * di layar — termasuk input singkatan ("2jt") dan tempelan teks.
 * Sengaja tidak memakai `toLocaleString` supaya hasilnya sama di server & klien.
 */
export function formatAmountDigits(amount: number): string {
  return groupDigits(String(Math.round(amount)))
}
