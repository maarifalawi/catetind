# Laporan paket 102 — Dompet bersama: hapus lintas akun & kode undangan tidak bisa diklaim

**Halaman:** `/joint` (modal kode + form gabung), `/join/[code]`
**Migrasi:** `20261111120000_catetind_joint_hapus_dan_kode.sql` **(baru, sudah diterapkan)**

## 1. Keluhan yang ditutup

> "Halaman di join wallet nggak sync ke akun lain. Akun pertama ada yang gua hapus
> transaksinya, tapi di akun kedua transaksi yang gua hapus itu masih ada."
>
> "Gua hapus dompet bersama dan mau bikin lagi. Gua generate kode di akun kedua
> (shiimaify), pas gua masukin di akun pertama (maarifalaawii) tulisannya
> **'Itu kode undanganmu sendiri'**. Apa karena gua running di browser yang sama?"
>
> "Hapus teks-teks ini … biar clean."

## 2. Temuan (dengan bukti dari database produksi)

| # | Bukti | Akibat yang dilihat user |
|---|-------|--------------------------|
| 1 | `joint_transactions`: **3 baris** milik `shiimaify@gmail.com` di dompet `83e235c9…` (tanggal `2026-09-25`) masih ada **semuanya**, padahal user merasa sudah menghapus salah satunya | Penghapusan **tidak pernah sampai ke server**; akun kedua tetap melihat baris yang sama |
| 2 | `lib/supabase/mappers.ts:331` → `toJointTransaction()` memakai `id: row.id` **tanpa** `remoteId`; `lib/money/joint-store.ts` versi lama hanya mengirim DELETE `if (target.remoteId)` | Baris hasil **bacaan server** tidak pernah punya `remoteId` → DELETE tidak pernah dikirim sama sekali |
| 3 | `lib/supabase/joint-remote.ts` versi lama: `delete()` tanpa `.select('id')`, lalu `return !error` | DELETE yang ditolak RLS = **0 baris tanpa error** → dilaporkan "berhasil" |
| 4 | `invite_codes`: `PHCKRQ` (dibuat **shiimaify**, 11:12 UTC) dan `EA43PU`/`YDVC9F` (dibuat **maarifalaawii**, 11:15–11:18 UTC); `H9FKJF` `used_by = maarifalaawii` pada 4 Nov 09:34 | Kedua akun **punya kode sendiri-sendiri**; kode yang diketik user adalah kode milik akun yang sedang login |
| 5 | `joint_wallets`: **dua** dompet bernama "Dompet Kita" (`83e235c9…` milik shiimaify, `0a2f7fd6…` milik maarifalaawii), masing-masing **1 anggota** | Tidak ada dompet bersama yang benar-benar dipakai dua orang → tidak ada data yang bisa tersinkron |
| 6 | `catetind_create_invite` versi lama: `on conflict (code) do update set created_by = excluded.created_by` | Siapa pun yang mengirim ulang 6 karakter yang sudah ada **mengambil alih kepemilikannya**; pembuat aslinya lalu dijawab `creator` |
| 7 | `joint-invite-flow.tsx` langkah 3 memakai `activeInviteFor(walletId) ?? createInvite(walletId)` | Kode sisa `localStorage` bisa dikirim ulang lewat akun lain → memperparah #6 |

**Uji langsung ke RPC (transaksi `BEGIN … ROLLBACK`, klaim JWT + `set local role authenticated`):**

- `catetind_accept_invite('PHCKRQ')` sebagai maarifalaawii → **`joined`** (bukan `creator`).
- `catetind_accept_invite('EA43PU')` sebagai maarifalaawii → **`creator`** (memang kode akun itu sendiri).

Jadi server membedakan dengan benar; yang membuat user bingung adalah **dua kode milik dua akun** + kemungkinan tab masih memakai sesi akun yang sama (satu browser = satu sesi Supabase).

## 3. Yang dikerjakan

### 3.1 Database (diterapkan)

`supabase/migrations/20261111120000_catetind_joint_hapus_dan_kode.sql`:

1. `joint_transactions_author_delete` **dijatuhkan**; satu aturan hapus tersisa:
   `joint_transactions_member_delete … using (catetind_is_joint_member(joint_wallet_id))`
   — semua anggota dompet boleh menghapus catatan di dompetnya (salah input / simpan dobel).
2. `catetind_create_invite` **menolak** (`23505`) kode yang sudah dimiliki akun lain,
   tidak lagi menimpa `created_by`; kode yang sedang dipakai ulang juga tidak ikut dicabut.

### 3.2 Aplikasi

| Berkas | Perubahan |
|--------|-----------|
| `lib/money/joint-store.ts` | `jointRemoteIdOf()`: id server = `remoteId` **atau** id baris itu sendiri bila uuid → DELETE akhirnya terkirim. `deleteJointTransactionEverywhere()` **(baru)**: tanya server DULU, baru tulis tombstone; server menolak = baris **tidak** dihapus di layar |
| `lib/supabase/joint-remote.ts` | `deleteRemoteJointTransaction()` pakai `.select('id')` + cek jumlah baris (pola yang sama dengan hapus dompet/keanggotaan) |
| `components/catetind/joint-screen.tsx` | hapus catatan memakai jalur async; toast "terhapus" hanya setelah server menerima, gagal server = toast jujur (`JOINT_DELETE_COPY.toastFailedTitle/Description`) |
| `components/catetind/joint-invite-flow.tsx` | langkah 3 selalu membuat **kode baru** (tidak memakai kode sisa `localStorage`); teks yang diminta dihapus |
| `components/catetind/joint-join-flow.tsx` | saat `creator`, tampil **email akun yang sedang login**; teks "Kodenya 6 karakter…" dihapus |
| `lib/data/joint-invite.ts` | `lead`/`leadNoName`/`expiresAt`/`refreshHint`/`serverSyncedNote`/`formLead` dihapus; `ownCodeAccount()` ditambah |
| `lib/data/joint.ts` | `JOINT_DELETE_COPY.toastFailedTitle` + `toastFailedDescription` |
| `lib/money/joint-delete-sync.test.ts` **(baru)** | 5 tes: baris server tanpa `remoteId`, server tak terjangkau = tidak dihapus, baris lokal tetap terhapus, id asing, jalur demo |

### 3.3 Teks yang dihapus (permintaan pemilik produk)

- "Bagikan kodenya ke pasanganmu supaya dia bisa gabung ke Dompet Kita."
- "Kode berlaku 24 jam. Bisa dipakai beberapa orang." (modal; halaman publik `/join/[code]` tetap memakainya)
- "Berlaku sampai 11 Nov 2026, 18.12."
- "Kode ini tersimpan di server, jadi bisa dipakai dari perangkat mana pun."
- "Pasanganmu harus punya akun CatetInd… diskon referral! ----"
- "Kodenya 6 karakter. Huruf besar dan kecil sama saja."
- "Pratinjau halaman undangan" + penjelasannya (tetap ada di **Pengaturan → Dompet Bersama**)
- "Kode lama langsung tidak berlaku, satu dompet, satu kode aktif." (tombol **Buat kode baru** tetap ada)

Pesan "Menyiapkan kode di server…" dan "Kode belum tercatat di server… + coba lagi" **dipertahankan**:
tanpa itu tombol Bagikan bisa mati tanpa penjelasan.

## 4. Bukti uji

- `npx tsc --noEmit` → **bersih**.
- `npx vitest run` → **1955 tes lulus** (142 berkas), termasuk 5 tes baru `joint-delete-sync`.
- `npx next build` → **sukses**.
- SQL di project produksi:
  - Policy DELETE sekarang **hanya** `joint_transactions_member_delete`.
  - `maarifalaawii` menghapus baris milik `shiimaify` (keanggotaan disimulasikan di dalam transaksi) → **1 baris terhapus**; `ROLLBACK` mengembalikannya.
  - `maarifalaawii` memanggil `catetind_create_invite(wallet-nya, 'PHCKRQ')` → **ditolak `23505` "Kode undangan itu milik akun lain."**
  - `catetind_accept_invite('PHCKRQ')` sebagai `maarifalaawii` → **`joined`** (rollback).

## 5. Catatan jujur & langkah user

1. **Satu browser = satu akun.** Sesi Supabase disimpan di cookie/localStorage origin yang sama
   (`lib/account-scope.ts:30-32`). Dua tab di browser yang sama tidak bisa dua akun — tab yang
   "akun pertama" bisa saja masih memakai sesi akun kedua. Mulai sekarang pesan *"Kamu sedang masuk
   sebagai …"* muncul saat kode sendiri dimasukkan, jadi penyebabnya langsung terbaca.
   Untuk uji dua akun: **dua browser berbeda** (atau satu jendela privat).
2. **Masih ada dua dompet** di database:
   - `83e235c9…` — milik `shiimaify`, berisi 3 catatan (dompet yang dipakai);
   - `0a2f7fd6…` — milik `maarifalaawii`, kosong (dibuat 11:15 UTC saat percobaan tadi).
   Langkah beres-beres: login **shiimaify** → `/joint` → salin kode (atau **Buat kode baru**);
   login **maarifalaawii** di browser lain → `/joint?kode=1` → masukkan kode → **Gabung Sekarang**.
   Setelah itu dompet kosong `0a2f7fd6…` bisa dihapus dari akun maarifalaawii (tombol
   "Hapus Dompet Bersama" hanya bekerja untuk pemiliknya — akun itu pemiliknya).
3. `PHCKRQ` berlaku sampai **11 Nov 2026 18.12 WIB**. Kalau lewat, buat kode baru dari akun
   shiimaify — kode lama otomatis tidak berlaku (satu dompet satu kode aktif).
4. Token akses Supabase yang dikirim lewat chat **wajib di-rotate** (Account → Access Tokens).
   Token itu bisa menjalankan SQL apa pun di akun, bukan cuma di project ini.

