# 54 — Kategori Transaksi Dipilih USER, Bukan Ditebak Sistem

**Paket:** temuan uji pemakaian 28 Sep 2026 · **Fase 13** · **Depends on:** 47 (`scope` & copy konteks)
· **berkaitan dengan:** 53 (field nominal di engine yang sama)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + `components/dashboard/transaction-input-engine.tsx`
> (satu engine, banyak shell) + `lib/data/history.ts` (`TRANSACTION_CATEGORY_OPTIONS`).

## Keluhan yang dilaporkan

"Kategori di form tambah transaksi jangan otomatis — diinput manual saja oleh user."

## Bukti gap (audit 28 Sep 2026)

| Bukti | Isi |
|---|---|
| `components/dashboard/transaction-input-engine.tsx:120-146` | tiap tipe punya `suggested`: Pengeluaran → `'Makanan'`, Pemasukan → `'Gaji Utama'`, Tabungan → `'Dana Darurat'`, Transfer → `'Transfer'` |
| `transaction-input-engine.tsx:566-572` | saat submit mode TAMBAH dikirim `category: type.suggested` — kategori **tidak pernah dipilih user**, tapi tersimpan sebagai fakta |
| `transaction-input-engine.tsx:1040` (+ `:587`) | badge "AI Suggested" menampilkan kategori tebakan itu seolah-olah keputusan AI atas catatan user |
| `transaction-input-engine.tsx:314,788-800` | pemilih kategori (`<select>`) HANYA ada di mode EDIT — di form tambah tidak ada satu pun kontrol kategori |
| `components/catetind/settings-panel-preferences.tsx:483-550` | saklar "Kategorisasi Otomatis oleh AI" (`catet-ai-prefs`) ada di Pengaturan, tapi **tidak dibaca siapa pun** (grep: berhenti di berkas itu) |

Dua cacat sekaligus: (1) kategori disimpan tanpa persetujuan user — Riwayat jadi penuh kategori
karangan, dan filter kategori ikut salah; (2) saklar yang menjanjikan kontrol itu tidak berfungsi.

## Peta baca

- `lib/data/history.ts:596` → `TRANSACTION_CATEGORY_OPTIONS` (label kanon; satu-satunya daftar sah).
- `components/catetind/budget-sheet.tsx` → `ChoicePills`, `EditField` (primitif pilihan yang sudah ada).
- `components/catetind/add-goal-sheet.tsx` / `add-bill-sheet.tsx` → contoh pemilihan kategori/tipe
  yang sudah hidup di sheet lain (tiru gayanya, jangan bikin komponen baru).
- `lib/data/history.ts` → `TRANSACTION_FALLBACK_CATEGORY`, `TRANSACTION_INPUT_COPY` (tempat copy baru).
- `components/catetind/ai-capture-bubble.tsx` → jalur AI capture (di sana kategori memang hasil AI —
  lihat poin 4 di bawah).

## Yang dikerjakan (urutan)

1. **Form tambah punya pemilih kategori.** Tambahkan kontrol kategori di `transaction-input-engine.tsx`
   mode tambah (chips `ChoicePills` atau select — pilih yang paling ringkas untuk satu baris form),
   sumber pilihan **hanya** `TRANSACTION_CATEGORY_OPTIONS`. Tampilkan hanya saat `type` = pengeluaran
   atau pemasukan; untuk Tabungan/Transfer pakai kategori tetap yang memang bukan tebakan
   (`'Tabungan'`/`'Transfer'`) **dan** sebutkan di UI kenapa (baris kecil, copy dari `lib/data/*`).
2. **Tanpa pilihan = form belum siap.** Hapus `suggested` sebagai nilai yang disimpan
   (`category: type.suggested` di `:570`): submit mengirim kategori yang benar-benar dipilih user.
   Tombol "Catat" nonaktif sampai kategori dipilih, dengan petunjuk singkat "Pilih kategori dulu"
   (copy di `lib/data/history.ts`, bukan di JSX). Jangan mengirim `'Lainnya'` diam-diam sebagai
   default — kalau user memilih "Lainnya", itu pilihan sadar; kalau tidak memilih, formnya tertahan.
3. **Hapus badge/saran palsu.** Buang badge "AI Suggested" & `suggested` dari jalur manual. Kalau
   nanti produk ingin saran AI, saran itu harus **terlihat sebagai saran** (chip "Saran: Makanan"
   yang bisa ditekan) dan tetap butuh satu ketukan user — bukan nilai yang langsung dipakai.
4. **Jalur AI tetap boleh menebak — di sana tebakannya transparan.** `ai-capture-bubble.tsx` /
   `lib/transaction-ai.ts` tetap menghasilkan `category` (itu hasil ekstraksi struk/ucapan), TAPI:
   field-nya bisa dikoreksi user di form konfirmasi (sudah ada) dan badge "AI" jujur
   (`LOW_CONFIDENCE_THRESHOLD` tetap dipakai). Tidak ada perubahan pada `parseSpokenTransaction`.
5. **Saklar Pengaturan ditertibkan** (`settings-panel-preferences.tsx:483-550`): pilih SATU jalan dan
   tulis di laporan —
   (a) **hapus** saklar "Kategorisasi Otomatis oleh AI" karena setelah paket ini tidak ada lagi
   kategorisasi otomatis di jalur manual, atau
   (b) **fungsikan**: baca `catet-ai-prefs` di jalur AI capture saja (struk/ucapan) dan jelaskan di
   helper-nya. Saklar mati yang menjanjikan kontrol adalah pelanggaran "jangan ada tombol mati".
6. **Mode edit tidak berubah perilakunya.** `withCurrentValue(...)` + select kategori tetap seperti
   sekarang (nilai lama yang tidak ada di daftar tetap disertakan supaya data user tidak berubah
   diam-diam).
7. **Test**: kategori yang tersimpan = pilihan user (bukan `suggested`) untuk keempat tipe;
   form tertahan tanpa kategori; mode edit tetap mengirim koreksi user; tidak ada nilai kategori di
   luar `TRANSACTION_CATEGORY_OPTIONS` yang bisa tersimpan dari jalur manual.

## Larangan

- Menyimpan kategori hasil tebakan di jalur manual (itu isi paket ini).
- Mengarang daftar kategori baru / menambah opsi di luar `TRANSACTION_CATEGORY_OPTIONS`.
- Menghapus pemilih kategori di mode edit.
- Menaruh kalimat baru langsung di JSX (semua copy ke `lib/data/*`).
- Mengubah `lib/transaction-ai.ts` (mesin OCR/voice) — kecuali poin 5(b) yang hanya membaca preferensi.

## Bukti yang harus ditunjukkan

- `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`, `pnpm theme:audit`.
- Alur bukti: catat "beli kopi 25rb" tanpa memilih kategori → tombol Catat nonaktif + petunjuknya
  muncul; pilih "Makanan" → tersimpan sebagai "Makanan"; buka Riwayat → filternya menemukan baris
  itu; cek juga baris yang lahir dari jalur AI capture tetap punya kategori hasil ekstraksi.
- Laporan: file dibuat/diubah, keputusan poin 5 (hapus vs fungsikan) beserta alasan, dan hal yang
  belum bisa diverifikasi.
