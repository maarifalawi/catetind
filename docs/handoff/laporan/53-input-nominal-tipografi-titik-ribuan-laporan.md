# Laporan 53 — Input Nominal: Tipografi Enak Dibaca + Titik Ribuan Otomatis Saat Mengetik

**Status:** selesai diimplementasikan & divalidasi · **Paket:** temuan uji pemakaian **28 Sep 2026** ·
**Fase 13** · **Depends on:** — · **Menutup:** `transaction-input-engine.tsx` `font-black
tracking-tighter` di field nominal dan `const display = amountText` (ketikan `2.000000` / `2000000`
yang tampil apa adanya).

> Ringkas: field nominal sekarang **merapikan titik ribuan saat user mengetik** (bukan lagi menunggu
> blur), dan bobot angkanya turun dari `font-black tracking-tighter` ke resep kanon angka app
> (`font-semibold` + `tracking-tight` + `tabular-nums`) lewat token baru di `lib/typography.ts`.
> Kebijakan lama ("perapian hanya saat blur/submit") **diganti dengan sadar** — alasan lamanya
> ("kursor melompat") ditulis ulang bersama syarat yang membuat aturan baru aman
> (`inputMode="numeric"` + kursor selalu di ujung), supaya tidak ada yang menghidupkannya kembali
> tanpa membaca konteksnya.
>
> Dua hal yang **tidak** saya ikuti apa adanya dari prompt, dengan alasan yang bisa diperiksa:
> (1) `25. → 25.000` — menerjemahkan satu titik jadi tiga nol melipatgandakan nominal 1000× dan
> merusak user yang mengetik pemisahnya sendiri (`1.500.000`); (2) angka kecil tetap masuk
> **jalur desimal** ("1.5"/"1.50" → `fraction`), karena kalau dipaksa dikelompokkan, user yang
> mengetik `1.5jt` berakhir sebagai `15jt`. Keduanya dijelaskan di §2 dan dikunci di test.

---

## 1. Keluhan yang dilaporkan → status

| # | Keluhan | Status | Bukti |
|---|---|---|---|
| 1 | Font nominal terlalu tebal (`font-black tracking-tighter`, ~3,25rem) padahal resep kanon angka app = semibold | ✅ FIXED | field nominal memakai `amountInputFont()` → `AMOUNT_INPUT`/`_SM`/`_XS` (`lib/typography.ts`); `font-black` + `tracking-tighter` **hilang** dari field itu |
| 2 | Pemisah ribuan cuma satu titik: field menampilkan ketikan apa adanya (`2.000000` / `2000000`) | ✅ FIXED | `parseAmountInput()` mengembalikan `display` bergrup dan engine memasangnya tiap ketikan: `2000000` → `2.000.000`, `2.000000` → `2.000.000`, idempoten |
| 3 | Nominal panjang (13 digit) meluber | ✅ FIXED | tiga tingkat ukuran (`AMOUNT_INPUT` ≤7 digit, `_SM` 8–10, `_XS` 11–13) + tinggi baris dipaku (`min-h-[2.75rem] sm:min-h-[3.25rem]`, dialog `min-h-[3.25rem]`) supaya chip bantuan di bawahnya tidak naik-turun |
| 4 | Satu angka harus punya satu bentuk di layar (termasuk singkatan) | ✅ FIXED | blur **dan** submit menormalkan ke `formatAmountDigits()`: `2jt` → `2.000.000` |
| 5 | `RupiahField`/form AI tidak boleh jadi "input rupiah versi kedua" | ✅ FIXED (satu aturan dari modul) | `budget-sheet.tsx` memakai `groupDigits()` + `cleanDigits()` dari `lib/money/amount-input.ts` + token `AMOUNT_INPUT_FIELD`; `ai-capture-bubble.tsx` sudah memakai `RupiahField` yang sama, jadi ikut otomatis (0 perubahan di file itu) |
| 6 | Nilai tersimpan tidak boleh berubah karena perapian | ✅ DIJAGA | `amount` tetap integer rupiah dari digitnya; test membuktikan `2000000`/`2.000000`/`2.000.000` → `2_000_000`, dan input bermasalah tetap `amount: null` |

---

## 2. Keputusan desain & alasannya

### 2.1 Titik ribuan dirapikan saat mengetik — tetapi nilai tidak pernah "dikarang"

`lib/money/amount-input.ts` sekarang mengembalikan `display` = `groupDigits()` untuk input
**digit/titik**: semua titik dibuang dulu, digitnya dikelompokkan ulang tiga dari kanan, dan nol di
depan dibuang (`007` → `7`) supaya satu nominal tidak punya dua bentuk. Engine memasang `display`
itu pada **setiap ketikan**:

| Ketikan | Sebelum (paket 44) | Sesudah (paket 53) |
|---|---|---|
| `2000000` | `2000000` | `2.000.000` |
| `2.000000` | `2.000000` (keluhan user) | `2.000.000` |
| `2.000.000` | `2.000.000` | `2.000.000` (idempoten) |
| `2000` / `200` | `2000` / `200` | `2.000` / `200` |
| `2jt` | `2jt` | `2jt` saat diketik → `2.000.000` saat blur/submit |

### 2.2 Kenapa itu sekarang AMAN (dan apa syaratnya)

Alasan lama menunda perapian adalah "kursor melompat" — itu nyata, tapi hanya berlaku kalau user
menyunting **di tengah** string. Field ini:

1. `inputMode="numeric"` → keypad HP tidak punya tombol titik, jadi titik cuma datang dari keyboard
   fisik atau tempelan teks;
2. teksnya di-center dan **kursor selalu di ujung kanan** → menyisipkan pemisah di kiri kursor tidak
   menggeser satu pun karakter yang sedang disunting.

Keduanya ditulis sebagai komentar di modul **beserta catatan "jangan dihapus"**: kalau nanti field
nominal bisa disunting di tengah (kursor bisa dipindah / berubah jadi textarea), aturan ini wajib
ditinjau ulang. Komentar bukan hiasan — ia yang mencegah aturan ini dihidupkan lagi di konteks yang
salah.

### 2.3 Dua batas yang sengaja TIDAK dilewati

**(a) `25.` tidak menjadi `25.000`.** Prompt menuliskan harapan itu di daftar bukti. Tidak saya
ikuti, karena menerjemahkan satu ketikan titik menjadi tiga nol berarti nominal bisa berubah 1000×
tanpa user mengetik angka: user yang menulis pemisahnya sendiri (`1.`, `1.500`, `1.500.000`) akan
mendapat angka yang tidak ia maksud — pelanggaran janji "tidak ada yang dibuang/ditambah
diam-diam". Yang dikunci di test: `25.` → `amount 25`, `problem null`, `display "25."` (titik tetap
ada sampai angka berikutnya menjelaskan maksud user) dan `25000` → `25.000`.

**(b) Angka kecil tetap masuk jalur desimal.** Titik pada teks ≤ 3 digit (`1.5`, `1.50`, `2.50`)
belum pasti pemisah ribuan: bisa desimal gaya Inggris, dan bisa juga user sedang menulis `1.5jt`.
Jadi di ukuran itu teks **dibiarkan apa adanya** dan `fraction` tetap dilaporkan (perilaku paket 44
tidak berubah). Kalau ini dipaksa dirapikan, `1.5jt` yang diketik bertahap di keyboard fisik berubah
jalan menjadi `15jt`. Konsekuensinya jujur dan sudah tertulis di test: nominal 4 digit yang sudah
tampil `2.750` lalu dihapus satu digit berhenti di `2.75` (ditanya) sampai user mengetik lagi —
begitu angkanya 4 digit atau kelompok di belakang titik 3+ digit, titik itu pasti pemisah dan
langsung dirapikan (`2.5000` → `25.000`; `250.000` dihapus → `25.000`).

### 2.4 Tipografi: satu token, bukan gaya per komponen

`lib/typography.ts` dapat empat token baru + satu pemilih tingkat:

| Token | Isi | Dipakai di |
|---|---|---|
| `AMOUNT_INPUT` | `font-display text-[2.75rem] font-semibold leading-none tracking-tight tabular-nums sm:text-[3.25rem]` | field nominal engine (≤7 digit) |
| `AMOUNT_INPUT_SM` | `… text-[2.1rem] … sm:text-[2.6rem]` | 8–10 digit |
| `AMOUNT_INPUT_XS` | `… text-[1.6rem] … sm:text-[1.9rem]` | 11–13 digit (maksimum app) |
| `AMOUNT_INPUT_FIELD` | `font-display font-semibold tracking-tight tabular-nums` (tanpa ukuran) | `RupiahField` (sheet & form konfirmasi AI) |
| `amountInputFont(digitCount)` | memilih `AMOUNT_INPUT`/`_SM`/`_XS` | engine (satu aturan untuk semua shell) |

Sebelum → sesudah kelas field nominal (literal, biar terlihat pemindai Tailwind):

```text
SEBELUM : 'min-w-0 flex-1 bg-transparent text-center font-black leading-none'
          'tracking-tighter text-ink tabular-nums outline-none placeholder:text-ink/15'
          + amountFont = isDialog ? (<=7 ? 'text-[3.25rem]' : 'text-[2.4rem]')
                                  : (<=7 ? 'text-[2.75rem] sm:text-[3.25rem]' : 'text-[2.1rem] sm:text-[2.6rem]')
          + baris: 'flex w-full items-baseline justify-center gap-2'   (prefix Rp: font-bold)

SESUDAH : 'min-w-0 flex-1 bg-transparent text-center text-ink outline-none'
          'placeholder:text-ink/15' + amountFont
          amountFont = amountInputFont(digitCount)  ->  AMOUNT_INPUT | AMOUNT_INPUT_SM | AMOUNT_INPUT_XS
          + baris: 'flex w-full items-center justify-center gap-2' + min-h tetap
            (prefix Rp: font-semibold — bobotnya sengaja disamakan dengan nominal,
             karena prefix yang lebih tebal dari angkanya menarik mata ke "Rp")
```

Ambang tingkat dihitung dari **banyak DIGIT** (bukan panjang string), jadi `1.000.000` (7 digit + 2
titik) tetap memakai ukuran besar sementara `10.000.000` (8 digit) turun satu tingkat — perilaku lama
pada angka 6 digit ke atas, dan `13 digit` sekarang punya tempat sendiri supaya tidak terpotong.
Token di `lib/typography.ts` ditulis literal demi pemindai Tailwind (aturan yang sudah tertulis di
file itu sejak awal), dan tidak ada `font-black`/`tracking-tighter` tersisa di field yang diketik.

### 2.5 Ukuran & tinggi baris: mengecil tanpa menggeser

Tiga tingkat ukuran mengecil = tiga tinggi baris berbeda kalau `leading-none` dibiarkan sendiri.
Karena itu baris nominalnya diberi `min-h` tetap (`2.75rem` di mobile / `3.25rem` dari `sm`, dan
`3.25rem` di layout dialog) plus `items-center`: angka boleh mengecil, barisnya tidak, sehingga chip
bantuan/`role="alert"` di bawahnya tidak naik-turun tiap digit.

### 2.6 Batas 12 digit di `RupiahField` sengaja dibiarkan

Prompt meminta semua input rupiah memakai aturan yang sama. Yang saya satukan adalah **aturan
bentuknya** (`groupDigits` + `cleanDigits`, satu modul) dan **resep tipografinya**
(`AMOUNT_INPUT_FIELD`). Batas 12 digit di `RupiahField` **tidak** saya naikkan ke 13: itu batas form
sheet sejak awal dan dipakai juga `sync-balance-modal.tsx` di halaman yang sama, sehingga menaikkan
satu tempat saja justru membuat dua aturan baru. Beda ini ditulis di komentar fungsinya, bukan
disamakan diam-diam.

### 2.7 Copy: satu kalimat baru, di `lib/data/*` (bukan di JSX)

`TRANSACTION_INPUT_COPY.amountHint` (`lib/data/history.ts`) ditambah satu kalimat: *"Titik ribuan
muncul sendiri kok."* Alasannya: field yang menulis ulang ketikan user harus menjelaskan dirinya,
kata paket 46 ("kalimat jujur > kesan diam-diam"). Tidak ada string baru di JSX — aturan repo tetap.

---

## 3. File yang dibuat / diubah

**Diubah (5):**
- `lib/money/amount-input.ts` — kebijakan baru (perapian saat mengetik) + komentar modul yang
  menjelaskan **kenapa** aman dan **kapan** harus ditinjau ulang; helper baru `cleanDigits()`
  (dipakai juga `RupiahField`); `THOUSAND_DOT` dihapus karena titik sekarang selalu boleh dirapikan.
- `lib/typography.ts` — `AMOUNT_INPUT`, `AMOUNT_INPUT_SM`, `AMOUNT_INPUT_XS`, `AMOUNT_INPUT_FIELD`,
  `amountInputFont()`.
- `components/dashboard/transaction-input-engine.tsx` — `display` dari parser; `handleAmountChange`
  memasang `display`; `handleAmountBlur` + `handleSubmit` menormalkan ke bentuk kanon; baris nominal
  di-center dengan tinggi dipaku; prefix `Rp` semibold; komentar paket 53 di header.
- `components/catetind/budget-sheet.tsx` — `RupiahField` memakai `groupDigits`/`cleanDigits` dari
  modul (bukan `toLocaleString('id-ID')`) + token `AMOUNT_INPUT_FIELD`; alasan batas 12 digit ditulis.
- `lib/data/history.ts` — satu kalimat di `TRANSACTION_INPUT_COPY.amountHint`.

**Diubah (test):** `lib/money/amount-input.test.ts` — kebijakan lama yang dikunci (`2.5000` →
`display '2.5000'`) **diperbarui dengan komentar alasannya**, bukan dihapus; ditambah satu blok
`parseAmountInput · titik ribuan saat mengetik (paket 53)` berisi 9 test (34 test di file ini,
sebelumnya 25).

**Baru (1):** laporan ini.

`ai-capture-bubble.tsx` **tidak disentuh**: form konfirmasi AI memang sudah memakai `RupiahField`,
jadi ia menerima aturan bentuk & tipografi yang sama tanpa salinan logika. Itu bentuk paling jujur
dari "satu aturan" — memindahkannya ke komponen lain justru akan membuat salinan kedua.

---

## 4. Bukti

### 4.1 Kasus yang diwajibkan prompt (semuanya lulus, `lib/money/amount-input.test.ts`)

| Input | Hasil yang dikunci | Catatan |
|---|---|---|
| `2000000` | `display 2.000.000` | ✅ |
| `2.000000` | `display 2.000.000` | ✅ keluhan user — titik lama dibuang, dikelompokkan ulang |
| `2.000.000` | `display 2.000.000` | ✅ idempoten |
| `2000` | `display 2.000` | ✅ |
| `200` | `display 200` | ✅ tidak ada titik sebelum 4 digit |
| `25.` | `amount 25`, `problem null`, `display 25.` | ⚠️ **sengaja beda dari prompt** (`25.000`) — lihat §2.3(a) |
| `2jt` | `amount 2.000.000`, `shorthand true`, diketik tetap `2jt` | ✅ bentuk kanon saat blur/submit = `2.000.000` |
| `1,5jt` | `amount 1.500.000` | ✅ |
| `50rb` | `amount 50.000` | ✅ |
| `1,5` | `problem fraction` | ✅ tidak berubah (ditanya, bukan ditebak) |
| `99999999999999` | `problem tooBig` | ✅ batas 13 digit tidak berubah |
| `-50000` | `problem negative` | ✅ |
| `''` | `kosong` (`amount null`, `problem null`, `display ''`) | ✅ |

Test tambahan paket 53 (bukan permintaan prompt, tapi penjaga janji di §2):
`backspace` menghapus satu digit (`2.500.000` → `250.000` → `25.000` → `2.500`), idempotensi
`display`, nol di depan (`007` → `7`, `0000` → `0`), singkatan tidak dirapikan saat diketik,
input bermasalah tetap mentah (`-50000`, `12x`, `1,5`), dan ketikan bertitik dari keyboard fisik
(`1.500.000` = `1500000`, `1.` = 1, `1.500` = 1.500 — nilainya tidak pernah berubah karena
perapian).

### 4.2 Perintah validasi (dijalankan di repo ini, tempel apa adanya)

```text
$ pnpm test
 ✓ lib/money/amount-input.test.ts (34 tests) 8ms
 ✓ lib/money/joint-store.test.ts (25 tests) 16ms
 ✓ lib/money/store.test.ts (57 tests) 28ms
 ✓ lib/account.test.ts (14 tests) 24ms
 ✓ app/api/push/push.test.ts (9 tests) 13ms
 ✓ lib/data/money-context.test.ts (11 tests) 4ms
 ✓ lib/data/calendar.test.ts (10 tests) 13ms

 Test Files  32 passed (32)
      Tests  469 passed (469)
```

```text
$ pnpm exec tsc --noEmit
( tidak ada keluaran = tidak ada error )
```

```text
$ pnpm build
 ✓ Compiled successfully in 1256ms
 (… route table 30+ rute ter-cetak, termasuk ○ / dan ○ /wallet — build sukses, tanpa error/warning )
```

```text
$ pnpm theme:audit
 ✓ palet bersih — 331 file diperiksa, tidak ada warna di luar palet.
```

Naik dari **460 → 469 test** (baseline sebelum paket ini: 32 file / 460 test, juga hijau).

### 4.3 CSS hasil build (bukti ukuran baru benar-benar dikirim browser)

Dari `.next/static/chunks/3cpvmc0av4om1.css` (CSS produksi):

```text
.min-h-\[2\.75rem\]{min-height:2.75rem}.min-h-\[3\.25rem\]{min-height:3.25rem}
… .text-\[2\.1rem\]{font-size:2.1rem} …
font-size:2.75rem  -> True    font-size:2.1rem -> True    font-size:1.6rem -> True
font-size:3.25rem  -> True    font-size:2.6rem -> True    font-size:1.9rem -> True
.tabular-nums{--tw-numeric-spacing:tabular-nums;font-variant-numeric:…}
```

Artinya tiga tingkat ukuran + tinggi baris dipaku benar-benar ter-generate (tidak ada kelas "mati"
karena pemindai Tailwind tidak melihatnya).

### 4.4 Pemeriksaan HTML saat `next start` (yang bisa dilakukan tanpa browser)

```text
$ node node_modules/next/dist/bin/next start -p 4321     (build produksi)
GET / → STATUS: 200   bytes: 202913
<title>CatetInd — Track. Grow. Secure.</title>
css: /_next/static/chunks/1xb5y2jdh85-9.css, /_next/static/chunks/3cpvmc0av4om1.css
[/_next/static/chunks/3cpvmc0av4om1.css] 2.75rem=True 1.6rem=True 1.9rem=True tabular-nums=True
```

Halaman dashboard render tanpa error, dan CSS yang benar-benar dikirim berisi kelas baru. **Yang
tidak bisa saya tunjukkan dari sisi HTML:** field nominalnya sendiri, karena engine hidup di dalam
Vaul sheet/modal yang hanya di-mount saat dibuka (komponen klien) — jadi markup field-nya tidak ada
di HTML server. Pemeriksaan visual yang sebenarnya (lihat §5) harus dilakukan di perangkat.


---

## 5. Yang belum bisa saya verifikasi (jujur) & temuan sampingan

**Belum terverifikasi (tidak ada browser/perangkat di lingkungan ini):**
1. **Rasa ketikan di perangkat sungguhan** — terutama keyboard Android: apakah IME numerik
   mempertahankan kursor di ujung saat `value` ditulis ulang (perilaku React sudah ditangani, tapi
   ini perilaku OS/IME). Langkah uji manual ada di §6.
2. **Apakah 13 digit benar-benar tidak terpotong di 375 px** — ukurannya dihitung, bukan dilihat:
   `9.999.999.999.999` (13 digit + 4 titik ≈ 8,8–9,1 em) pada `1.6rem` ≈ 225–235 px, sementara lebar
   yang tersedia di dalam sheet (375 px − `px-5` dua sisi − label `Rp` `w-9` − spacer `w-9` − 2×`gap-2`)
   ≈ 247 px. Sisanya 12–22 px. **Angka ini estimasi metrik font**, dan kalau ada font fallback
   (Plus Jakarta Sans gagal dimuat) hasilnya bisa berbeda.
3. **Kontras placeholder** `placeholder:text-ink/15` masih sangat redup (dibiarkan apa adanya, itu
   watermark "0" yang disengaja; teks yang benar-benar dibaca user adalah baris petunjuk di bawah
   field + `aria-label`). Kalau pemilik produk mau placeholder itu tembus lebih jelas, itu keputusan
   visual tersendiri — tidak saya ubah di paket ini karena prompt meminta "tetap terbaca", bukan
   "diubah".
4. **`prefers-reduced-motion`**: paket ini tidak menambah animasi apa pun (perubahan murni
   tipografi + logika teks), jadi tidak ada yang perlu digerbangi.

**Temuan sampingan yang TIDAK saya kerjakan (supaya tidak ada klaim berlebih):**
- `lib/onboarding.ts` (`digitsToDisplay`/`onlyDigits`) dan `components/catetind/sync-balance-modal.tsx`
  juga mengelompokkan ribuan dengan `toLocaleString('id-ID')` — jadi setelah paket ini app masih
  punya **dua** cara pengelompokan di luar modul (engine + `RupiahField` sudah satu). Keduanya
  berada di alur lain (onboarding & sesuaikan saldo) dan tidak disebut prompt; menggabungkannya
  berarti mengubah batas digit & bentuk tampilan di dua flow itu sekaligus.
- `components/catetind/onboarding-step-first-transaction.tsx` punya field nominal besar sendiri
  (`font-medium`, ukuran 2.7rem/2.15rem). Bukan `font-black`, tapi tetap varian ketiga untuk kelas
  yang sama. Prompt menyebut tiga konsumen (engine, `RupiahField`, form AI) dan onboarding tidak
  termasuk; saya tidak mengubah tampilan layar onboarding tanpa mandat itu.

---

## 6. Daftar uji manual di perangkat (untuk pemilik produk)

1. FAB `+` → ketik `2000000` digit demi digit: field harus menampilkan `2`, `20`, `200`, `2.000`,
   `20.000`, `200.000`, `2.000.000` — bukan `2000000`;
2. backspace beberapa kali: tiap backspace membuang **satu digit** (`2.000.000` → `200.000` →
   `20.000` → `2.000` → `250` …), bukan memakan titiknya;
3. ketik `2jt` (keyboard HP tidak punya huruf di mode `inputMode="numeric"`, jadi uji ini di web):
   field tetap `2jt`, chip `Rp 2.000.000?` muncul; tap di luar field → field berubah jadi
   `2.000.000`;
4. ketik `2.000000` (keyboard fisik): field harus berakhir `2.000.000`, dan chip konfirmasi tetap
   `Rp 2.000.000?`;
5. ketik 13 digit `9999999999999`: angka harus tetap muat di layar 375 px tanpa scroll horizontal;
6. buka sheet Setor Celengan / Tanam Celengan (yang memakai `RupiahField`): titik ribuan muncul saat
   mengetik, dan bobot angkanya sama dengan di engine (Plus Jakarta Sans, semibold) — hanya
   ukurannya yang lebih kecil karena kolomnya lebih kecil.

