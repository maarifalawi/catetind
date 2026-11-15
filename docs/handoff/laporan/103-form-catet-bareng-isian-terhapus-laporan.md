# Laporan 103 — “Catat Bareng: isian gue ke-delete terus”

Tanggal: 11 Nov 2026 · Laporan pemilik produk: mengetik di form transaksi Dompet
Bersama, teks yang sudah diketik hilang sendiri. Terjadi **hanya** di `/joint`.

---

## Akar masalah (dua hal bertemu)

1. **Pemanggil melanggar kontrak prop.** `components/catetind/joint-add-sheet.tsx`
   mengirim `types={['expense', 'income']}` — array **literal di dalam render**,
   jadi referensinya baru setiap kali komponennya render ulang.
   Engine sendiri sudah menulis aturannya di doc prop (`transaction-input-engine.tsx`):
   *“Dikirim sebagai array KONSTAN (bukan literal di dalam render) supaya
   identitasnya stabil — engine memakai nilai ini sebagai dependensi effect reset
   form.”*

2. **Halaman Joint render ulang di SETIAP digit.**
   `joint-screen.tsx` mengirim `onAmountChange={setPendingAmount}`; engine memanggil
   callback itu di `handleAmountChange`. Jadi: ketik 1 digit → state halaman
   berubah → halaman render ulang → `JointAddSheet` render ulang → `types` baru →
   `offeredTypes` (hasil `useMemo`) dianggap berubah → **effect reset engine jalan**
   → `setAmountText('')`, `setNote('')`, `setWallet(...)`, fokus ditarik ke nominal.

Kenapa pintu lain aman: Tambah Transaksi (Home) & Edit tidak mengirim `types`
(memakai konstanta `ALL_TYPE_IDS`), Kalender memakai konstanta modul
(`CALENDAR_NOTE_TYPES`), dan tidak satu pun memakai `onAmountChange`.

---

## Perbaikan

1. **`components/catetind/joint-add-sheet.tsx`**
   array tipe diangkat jadi konstanta modul `JOINT_ENGINE_TYPES`
   (`readonly TransactionTypeId[]`), dipakai sebagai `types={JOINT_ENGINE_TYPES}`.
   Ini saja sudah menghilangkan bug.

2. **`components/dashboard/transaction-input-engine.tsx`** — pagar anti-ulang:
   reset form dijaga **kunci pembukaan** (`'new'` / `'edit:<id>'`), bukan identitas
   prop. Render ulang biasa (array baru, callback baru, objek `initial` baru dari
   store) tidak lagi mengosongkan isian user; reset hanya terjadi saat panel
   benar-benar dibuka atau baris yang diedit berganti.

3. **Baru:** `lib/data/transaction-form-reset.ts`
   (`transactionFormOpenKey`, `shouldResetTransactionForm`) + test
   `lib/data/transaction-form-reset.test.ts`. Fungsi murni supaya keputusan
   “boleh reset atau tidak” bisa diuji tanpa DOM (environment test repo ini `node`).

---

## Verifikasi

- `npx tsc --noEmit` → 0 error.
- `npx vitest run` → **143 file / 1.962 test lulus** (5 test baru).
- `npx next build` → `Compiled successfully`.
- Pemeriksaan statis: hanya dua pemanggil yang mengirim `types`, keduanya kini
  memakai konstanta modul.

## Dampak yang diharapkan

- Di `/joint` → **Catat Bareng**: mengetik `50.000` lalu catatan tidak lagi
  menghapus isian; memilih “Siapa yang nalangin?” tidak mereset nominal.
- Form lain tidak berubah perilaku: tetap fresh setiap dibuka (kunci `'new'`),
  dan mode edit tetap terisi dari baris yang dipilih.
