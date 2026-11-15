# Laporan 105 — Settle bersama benar-benar sinkron & top-up token AI sampai ke Midtrans

Tanggal: 11 November 2026 · Mode: perbaikan produksi (bukan paket fitur baru)

## 1. Keluhan yang masuk

1. Modal "Rekap settlement" terlalu ramai — delapan baris penjelasan untuk satu
   angka yang dicari user.
2. Settle **tidak tersinkron antar akun**: akun yang menekan "Tandai Sudah
   Settle" melihat "Semua Impas", akun pasangan tetap "Belum Impas / Settle
   Sekarang". Baris timeline settle juga bertanggal **1 <bulan> · 20:30** dan
   menulis nama contoh ("Jon") padahal settle baru saja dilakukan.
3. Top-up token AI gagal dengan pesan
   **"Tagihan tidak bisa dicatat, jadi pembayaran belum dibuat."** — user
   menduga Midtrans belum tersambung.

## 2. Akar masalah (dibuktikan di kode & database)

| # | Temuan | Bukti |
|---|---|---|
| 1 | Settle 2 orang hanya ditulis ke IndexedDB perangkat penekan tombol | `recordSettlement()` tidak pernah menyentuh server; `RemoteJointWallet` tidak punya `settlements`. Laporan 52 §6 sudah mencatat batas ini |
| 2 | Tanggal & jam settle dikarang | `buildSettlementEntry()` memakai `record.month === JOINT_MONTH_KEY ? JOINT_TODAY_ISO : '<bulan>-01'` + `SETTLE_ENTRY_TIME = '20:30'` |
| 3 | Nama contoh bocor ke produksi | deskripsi memakai `jointNameOf()` (Jon/Dany) — melanggar CONTEXT-WAJIB §10.2 |
| 4 | Top-up gagal SEBELUM Midtrans dipanggil | `purchases.tier_name` = `not null`, route menulis `null` untuk `purpose:'topup'` → PostgREST 400 → route 502 dengan pesan di atas. Kolom `purpose/addon_*` sudah ada di DB (dicek lewat REST, HTTP 200) |
| 5 | Kartu pembayaran top-up tidak punya isi | `top-up-modal` tidak meneruskan `redirectUrl`/`token`/`snap`, jadi halaman Snap tidak pernah di-embed walau tagihan berhasil dibuat |

## 3. Perubahan

### 3.1 Sinkronisasi settle (inti)

- **Migrasi baru** `20261111140000_catetind_joint_settlements.sql`: tabel
  `joint_settlements` (satu baris per dompet+bulan), RLS anggota, `replica
  identity full`, masuk publication `supabase_realtime`.
- `lib/supabase/joint-remote.ts`: `settlements` dibaca bersama baris;
  `pushJointSettlement()` (upsert idempoten) + `deleteRemoteJointSettlement()`.
  `null` dibedakan dari `{}` supaya gangguan jaringan tidak menghapus status
  "sudah settle".
- `lib/money/joint-store.ts`:
  - `recordSettlement()` mengisi `settledAt`/`settledTime` SUNGGUHAN lalu
    mengirim penanda ke server (`pendingSync` kalau gagal, dikirim ulang oleh
    `retryPendingJointRows()`);
  - `undoSettlement()` menghapus penanda di server + `settleTombstones` supaya
    pembatalan offline tidak "hidup lagi";
  - `mergeJointSettlements()` (murni): server jadi dasar, penanda lokal
    `pendingSync` menang, tombstone menolak resurrect;
  - `upgradeLegacySettlements()`: penanda lama (tanpa `settledAt`, belum pernah
    terkirim) ditandai `pendingSync` + diberi waktu saat migrasi berjalan →
    diunggah sekali, TIDAK dibuang oleh bacaan server pertama;
  - langganan realtime `joint_settlements` → `refreshRemoteJoint()`.
- `lib/data/joint.ts`: `JointSettlementRecord.settledAt/settledTime/pendingSync`,
  `JointTransaction.settlementMonth`, `buildSettlementEntry()` memakai waktu
  nyata + nama roster (tanpa resolver → tanpa nama sama sekali),
  `computeSettlement()` menghitung baris settle walau tanggalnya beda bulan.
- `lib/supabase/mappers.ts`: `month_key` baris settle dipetakan ke
  `settlementMonth` (kunci anti-dobel memakai BULAN, bukan tanggal).
- `components/catetind/joint-screen.tsx`: mengirim `settledAt`/`settledTime`
  dari tombol yang ditekan.

**Jawaban pertanyaan "apakah tiap akun harus pencet Settle Sekarang?"** Tidak.
Satu akun menekan → baris `joint_settlements` tersimpan → realtime → akun
pasangan otomatis "Semua Impas / Bulan ini sudah ditutup" + baris timeline
dengan tanggal & jam yang sama.

### 3.2 Modal rekap jadi minimalis

`components/catetind/joint-settlement-modal.tsx` kini hanya berisi: judul bulan,
nominal transfer besar, arah `Kamu → Alawi`, satu baris ringkasan "siapa bayar
berapa", chip metode, CTA, dan "Nanti aja" — tanpa paragraf penjelasan apa pun.
Dihapus: dua blok rekap, "posisi bersih", "yang ditimbang/traktiran", jargon
panci, paragraf disclaimer, dan baris "Transfer manual". Konstanta copy yang
jadi mati ikut dihapus dari `lib/data/joint.ts`.

### 3.3 Top-up token AI → Midtrans

- `app/api/payment/charge/route.ts`: `tier_name` top-up = paket yang sedang
  dimiliki pembeli (bukan `null`).
- Migrasi `20261111150000_catetind_purchases_tier_nullable.sql`: `tier_name`
  boleh `NULL` (top-up bukan pembelian tier) + komentar kolom.
- `components/catetind/top-up-modal.tsx`: `redirectUrl`/`token`/`snap`
  diteruskan ke `PaymentInstructionCard` → halaman Snap benar-benar di-embed.

## 4. Validasi

```
pnpm test          → 143 file / 1974 test lulus
pnpm exec tsc --noEmit → bersih
pnpm build         → sukses
pnpm theme:audit   → palet bersih
GET /joint (next start) → 200
```

Test baru: `lib/data/joint-settlement.test.ts` (4 kasus: waktu nyata, cadangan
data lama, nama roster, settle lintas bulan) dan `lib/money/joint-store.test.ts`
(4 kasus: `settledAt` tersimpan, fallback tanggal perangkat, penanda server
langsung berlaku, aturan merge). Regresi top-up dikunci di
`app/api/payment/charge/route.test.ts` (`tier_name` **bukan** null).

## 5. Migrasi database — SUDAH DITERAPKAN (11 Nov 2026)

Kedua migrasi dijalankan ke project `wmswtoyikvgzcvbgdceo` lewat Management API
(token akses Supabase), lalu `notify pgrst, 'reload schema'`. Bukti dari database:

| Pemeriksaan | Hasil |
|---|---|
| `to_regclass('public.joint_settlements')` | `joint_settlements` (tabel ada) |
| Policy RLS | **4** (`select`, `insert`, `update`, `delete`) |
| `relrowsecurity` | `true` |
| Publication realtime | **1** baris di `supabase_realtime` |
| Unique `(joint_wallet_id, month_key)` | ada |
| `purchases.tier_name` | `is_nullable = YES` |
| Riwayat migrasi | 31 baris, termasuk `20261111140000` & `20261111150000` |

Uji RLS nyata (dijalankan sebagai role `authenticated` dengan klaim user asli,
semua di dalam transaksi yang di-**ROLLBACK**, jadi tidak ada data yang berubah):

- Anggota dompet bersama `83e235c9-…` (user `1a4eefd2-…`) → **bisa**
  SELECT, INSERT, UPDATE (jalur upsert), DELETE.
- Anggota kedua (`8e4e189d-…`) → **bisa** INSERT + membaca barisnya
  (inilah yang membuat akun pasangan menerima penanda settle).
- Bukan anggota → **ditolak** `42501 new row violates row-level security policy`.
- `select count(*) from joint_settlements` setelah semua uji = **0** (bersih).

Sisa langkah: **deploy ulang aplikasi** agar route `charge` & store settle
memakai kode baru.

## 6. TEMUAN SUSULAN (11 Nov 2026, setelah settle dipakai): "Semua Impas" padahal selisih puluhan juta

Setelah settle berjalan, pemilik produk menambah catatan di bulan yang SAMA
(Rp 100 jt + Rp 5 jt + Rp 120 rb) dan layar tetap menulis **"Semua Impas /
Bulan ini sudah ditutup."** padahal posisinya 18% vs 82%.

Akar masalah: `computeSettlement()` memaksa `level: 'equal'` + palang 0° begitu
penanda settle ada (`settled || difference < EPS`). Penanda settle adalah fakta
masa lalu, bukan pernyataan "sekarang tidak ada utang".

Perbaikan:

1. `computeSettlement()`: `level`/`tiltDeg` HANYA dari `difference` (net yang
   sudah memperhitungkan transfer settle). `settled` tinggal metadata.
2. Kartu & modal: `needsTransfer = level === 'settle'`; badge "Belum Impas",
   nominal berlabel **"Sisa transfer"**, catatan "Sudah settle bulan ini —
   selisih ini dari catatan setelahnya", CTA **"Settle sisa"**.
3. `handleSettle` (2 orang): kalau bulan itu SUDAH punya penanda, sisa dicatat
   sebagai BARIS pelunasan tersendiri (`settleJointTransfer`) — bukan menimpa
   penanda. Menimpa penanda akan menghapus efek transfer pertama dari hitungan
   sehingga net tidak pernah kembali nol. Kedua transfer tetap terlihat di
   timeline.
4. `settleJointTransfer()` menyimpan `settlementMonth` (dan `month_key` di server
   memakainya), jadi pelunasan sisa untuk bulan lama tetap menutup bulan itu.

Bukti uji (baru, `pnpm test` 1980 lulus):

- `computeSettlement` dengan penanda settle + sisa 75rb → `level: 'close'`,
  palang TIDAK 0°; sisa 2,5 jt → `level: 'settle'`.
- Store: settle penuh → tambah belanja Rp 300rb → `level` kembali `'settle'`
  (sisa Rp 150rb) → `settleJointTransfer(150rb)` → `difference` 0, `level`
  `'equal'`, dan feed berisi **2** baris settle (awal + sisa).

Batas yang disengaja: catatan di bulan yang sudah settle tetap tidak bisa
DIHAPUS (aturan paket 61.3). Untuk mengoreksi, batalkan settle dulu — tombolnya
ada di modal bulan itu.

### 6.1 Susulan: modal menampilkan angka TANPA tombol

Screenshot berikutnya menunjukkan modal "Rp 52.560.000 · Kamu → Shimaify" tanpa
chip metode dan tanpa CTA — hanya "Nanti aja". Penyebabnya `shouldPromptSettlement()`:

```ts
// SEBELUM: penanda settle ikut mematikan tombol
return !settlement.settled && settlement.level === 'settle'
```

Karena bulan itu sudah punya penanda, fungsi mengembalikan `false` → chip & CTA
tidak dirender. Sekarang fungsi itu HANYA membaca angka:

```ts
return settlement.level === 'settle'
```

Test regresi: `shouldPromptSettlement` = `true` untuk bulan yang punya penanda
settle + sisa 2,5 jt, dan `false` saat selisihnya nol. `pnpm test` 1981 lulus.

### 6.2 Permintaan akhir: buang dua baris teks & label bar persentase

- Modal: baris **"Sudah settle bulan ini — selisih ini dari catatan setelahnya
  (sudah settle Rp …)"** dan **"Transfer manual, CatetInd cuma mencatat."**
  DIHAPUS (konstanta `JOINT_SETTLE_REMAINDER_HINT` & `SETTLEMENT_MANUAL_NOTE`
  ikut dibuang supaya tidak ada copy hantu). Angka sisa + tombol "Settle sisa"
  sudah cukup menjelaskan.
- Bar kontribusi di header `/joint` tetap menampilkan **porsi pembayaran**
  (siapa menalangi), karena settle tidak mengubah fakta siapa yang sudah
  mengeluarkan uang. Labelnya diubah dari `Kamu (82%)` menjadi
  `Kamu bayar 82%` supaya tidak disalahartikan sebagai status impas.

## 7. Batas yang jujur

- Uji dua akun dilakukan pada level store + unit test; verifikasi
  realtime end-to-end butuh sesi Supabase nyata di dua perangkat.
- `carry_over` selalu 0 pada alur sekarang (selalu transfer penuh), tapi kolom
  & pembawaannya tetap disimpan supaya sisa bulan lalu tidak hilang.
