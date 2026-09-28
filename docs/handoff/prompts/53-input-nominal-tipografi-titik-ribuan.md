# 53 — Input Nominal: Tipografi Enak Dibaca + Titik Ribuan Otomatis Saat Mengetik

**Paket:** temuan uji pemakaian 28 Sep 2026 · **Fase 13** · **Depends on:** —

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis (khususnya §2 konvensi & §6 tipografi) +
> `lib/money/amount-input.ts` (kebijakan lama) + laporan 44 §3 (sejarah perbaikan input nominal).

## Keluhan yang dilaporkan

1. **Font nominal terlalu tebal.** Yang tampil sekarang: `font-black tracking-tighter` di ukuran
   ~3,25rem (`components/dashboard/transaction-input-engine.tsx:697-702` + `:317-323`). Terasa berat,
   padahal resep kanon app ini untuk angka adalah **semibold** (`lib/typography.ts:20-23`,
   `app/globals.css:34-52`: "Plus Jakarta Sans mentok di 800, dan `font-black` bikin nominal terasa
   bulky").
2. **Pemisah ribuan cuma satu titik.** Saat user mengetik angka, field menampilkan apa adanya
   (`transaction-input-engine.tsx:309` → `const display = amountText`), sehingga `2.000000` /
   `2000000` tetap tampil begitu — bukan `2.000.000`.

## Kebijakan lama yang HARUS diubah dengan sadar

`lib/money/amount-input.ts:122-125` sengaja mengembalikan teks apa adanya saat mengetik ("Perapian
hanya boleh terjadi saat blur/submit"), dengan alasan dulu kursor melompat. Permintaan sekarang
berbeda: **titik ribuan dirapikan SAAT mengetik**. Karena itu:
- perubahan ini harus ditulis di komentar modul (kebijakan baru + alasan kenapa aman: field ini
  `inputMode="numeric"`, center, dan kursor SELALU di ujung — user tidak pernah menyunting di tengah);
- test yang mengunci kebijakan lama wajib diperbarui, bukan dihapus diam-diam.

## Peta baca

- `lib/money/amount-input.ts` → `groupDigits()` (`:66`), `AMOUNT_MAX_DIGITS` (`:24`), `parseAmountInput()`
  (`:88-156`), `formatAmountDigits()` (`:162`), tipe `AmountInputProblem` (`:29`).
- `lib/money/amount-input.test.ts` — 8+ kasus yang sudah ada (`25.000`, `2.5000`, `1,5jt`, `50rb`, `-50000`, `25.`).
- `components/dashboard/transaction-input-engine.tsx` → `amountText`/`parseAmountInput` (`:244,289`),
  `display` (`:309`), `handleAmountChange`/`handleAmountBlur` (`:388-420`), `amountFont` (`:317-323`),
  field nominal (`:670-703`), chip konfirmasi + pesan masalah (`:707-750`).
- `components/catetind/budget-sheet.tsx` → `RupiahField` (dipakai Setor celengan, Tanam celengan,
  Pindah Saldo) — WAJIB ikut aturan yang sama, jangan bikin input rupiah versi kedua.
- `components/catetind/ai-capture-bubble.tsx` → form konfirmasi hasil AI (memakai primitif yang sama).
- `lib/typography.ts` + `app/globals.css:34-52` — resep bobot/ukuran yang sah untuk angka.

## Yang dikerjakan

### A. Titik ribuan otomatis (satu aturan di `lib/money/amount-input.ts`)

1. **`display` untuk input digit/titik = SELALU hasil `groupDigits()`**, dikelompokkan tiga dari
   kanan, tanpa titik di depan:
   - `2000000` → `2.000.000`;
   - `2.000000` → `2.000.000` (titik lama dibuang lalu dikelompokkan ulang — inilah keluhan user);
   - `2.000.000` → `2.000.000` (idempoten);
   - `2000` → `2.000`; `200` → `200` (tidak ada titik sebelum 4 digit).
2. **Kursor selalu di ujung kanan** (state-driven, `inputMode="numeric"`, teks ter-center). Tulis di
   komentar bahwa ini syarat yang membuat perapian saat mengetik aman; kalau nanti field-nya bisa
   disunting di tengah, aturan ini harus ditinjau ulang (dan itu ditulis, bukan disembunyikan).
3. **Singkatan tetap boleh & tetap mentah saat diketik** — `2jt`, `1,5jt`, `50rb`, `50k`: teksnya
   dibiarkan apa adanya selama user mengetik (kalau dirapikan di tengah ketikan, user tidak bisa
   melanjutkan mengetik "2jt"), chip konfirmasi `= Rp 2.000.000` tetap muncul, dan **saat
   blur/submit** field dinormalkan menjadi digit bergrup (`2.000.000`) supaya satu angka hanya punya
   satu bentuk di layar.
4. **Semantik masalah tidak berubah**: `1,5` tanpa satuan tetap `fraction` (ditanya, bukan ditebak),
   `tooBig`/`negative`/`unsupported` tetap; batas 13 digit tetap.
5. **`RupiahField` & form AI memakai aturan yang sama** — jangan menyalin logika pengelompokan ke
   komponen; kalau ada yang perlu beda, tulis alasannya.

### B. Tipografi nominal input

6. **Bobot turun, ukuran tetap jelas.** Ganti `font-black tracking-tighter` di field nominal engine
   menjadi resep kanon angka app ini (mengikuti `lib/typography.ts`): `font-display`
   `font-semibold` `tracking-tight` `tabular-nums` — ukuran tetap besar (mis. `text-[2.75rem]`
   dialog / `text-[2.4rem]` sheet) dan perilaku "mengecil saat angka panjang" dipertahankan.
   `font-black` hanya boleh dipakai untuk judul kecil/metrik kartu, bukan untuk input yang sedang
   diketik user.
7. **Satu token, bukan gaya per komponen** — tambahkan token baru di `lib/typography.ts`
   (mis. `AMOUNT_INPUT` untuk field nominal yang diketik, dan/atau `AMOUNT_INPUT_SM`) lalu pakai di
   engine + `RupiahField` + form AI. Tujuannya: tidak ada lagi "font-weight karangan per halaman"
   (alasan token itu dibuat sejak awal).
8. **Cek visual & kontras**: angka panjang (13 digit) tetap muat tanpa memotong, tidak ada
   horizontal scroll di 375px, tinggi baris tidak melompat saat angka mengecil, dan warna placeholder
   tetap terbaca.

## Larangan

- Mengubah NILAI yang tersimpan: nominal tetap integer rupiah; yang berubah hanya tampilan.
- Menambah dependency input masking (repo ini tidak punya, dan tidak butuh).
- Menyentuh `formatIDR`/`maskNominal`/`MASKED_AMOUNT` (itu untuk menampilkan angka, bukan mengedit).
- Menghapus/menonaktifkan pesan masalah nominal (user harus tetap tahu kenapa catatannya tertahan).
- Memakai `toLocaleString()` di jalur yang dirender server (harus deterministik, pakai `groupDigits`).

## Bukti yang harus ditunjukkan

- `lib/money/amount-input.test.ts` — daftar kasus yang wajib lulus (dan dipakai sebagai bukti):
  `2000000→2.000.000`, `2.000000→2.000.000`, `2.000.000→2.000.000`, `2000→2.000`, `200→200`,
  `25.→25.000`, `2jt→2.000.000`, `1,5jt→1.500.000`, `50rb→50.000`, `1,5→fraction`,
  `99999999999999→tooBig`, `-50000→negative`, `''→kosong`.
- `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`, `pnpm theme:audit`.
- Bukti tipografi: sebutkan kelas akhir yang dipakai (sebelum → sesudah) dan token baru di
  `lib/typography.ts`; kalau bisa, lampirkan hasil pemeriksaan HTML saat `next start`.
- Laporan: file dibuat/diubah + keputusan (termasuk kenapa kursor-di-ujung aman) + hal yang belum
  bisa diverifikasi (uji ketik di perangkat sungguhan / keyboard Android).
