# 59 — Riwayat & Dompet: kalibrasi dari data nyata, hapus semua catatan, dompet hanya dompetnya, sensor tanpa geser

**Baca dulu:** `docs/handoff/AUDIT-UANG-2026-09.md` (AKAR A & B, §4 aturan hapus, §5, §6) +
`docs/handoff/CONTEXT-WAJIB.md` §2–§10 (khusus §5.7 privasi).
**Ketergantungan:** paket 57 (satu `todayISO()` + konfigurasi uang user). Boleh dikerjakan
berdampingan dengan 58, tapi 57 wajib lebih dulu.

## 1. Ruang lingkup

`components/catetind/history-screen.tsx`, `financial-health-card.tsx`, `insight-cards.tsx`,
`wallet-detail-screen.tsx`, `wallet-card-face.tsx` (khusus `MaskedAmount`),
`lib/data/{history,wallet-detail}.ts`, `lib/money/store.ts` (hanya menambah API hapus massal).
DILARANG mengubah `lib/money/ledger.ts` dan rumus `balanceOf`.

## 2. Item kerja

### 59.1 Kalibrasi Profil AI & Insight tidak boleh jalan di atas angka keras

- `history-screen.tsx:123` → `const totalTransactions = TOTAL_TRANSACTIONS` (= 24,
  `lib/data/history.ts:128`) dan `:560` → `score={HEALTH_SCORE}` (= 72, `history.ts:122`).
- Ganti dengan hitungan transaksi NYATA user (baris sesi + mock yang belum dihapus tombstone).
- Kalau jumlah transaksi = 0 → kartu kalibrasi & insight **TIDAK dirender** (bukan "0/30"),
  diganti empty state jujur.
- Skor kewarasan: kalau belum benar-benar dihitung dari data (rasio pemasukan vs
  pengeluaran/hutang), **JANGAN tampilkan 72**. Tampilkan varian kalibrasi saja.
- `insight-cards.tsx:97` ("Kategori terbesar bulan ini: Makanan (45% …)") dan komentar `:28`
  (angka 40% / 22% / 45% "menyusul dari backend") → turunkan dari data user, atau jangan tampilkan
  angkanya sampai nyata. Ambang `threshold` (`:90`, `:99`) memakai hitungan nyata — perhatikan
  `:567` mengirim `contextCount` yang bisa berasal dari mock.
- AC: buktikan TIGA keadaan — 0 transaksi, 24 transaksi, ≥ 30 transaksi — dan apa yang
  tampil/tidak tampil di masing-masing.
- Test: tambahan di `lib/data/history.test.ts` (≥ 6 kasus: hitung transaksi, ambang 30, skor hanya
  saat data cukup, 0 data → tidak bisa dihitung).

### 59.2 Tombol "Hapus Semua Riwayat" di section Catatan

- Section "Catatan" ada di `history-screen.tsx:584-688`; sekarang hanya filter + daftar + hapus
  satu-satu (swipe kiri / menu titik tiga).
- Implementasi:
  - API baru di `lib/money/store.ts`: hapus MASSAL lewat SATU pintu tulis (mis. `removeRows(ids)`)
    memakai tombstone yang sama. **DILARANG** loop `removeRow()` dari komponen.
  - UI: aksi di kepala section "Catatan" + `ConfirmDeleteDialog` (pola `transaction-actions.tsx`)
    yang menyebut **jumlah catatan** yang akan hilang.
  - **Copy konfirmasi WAJIB jujur**: menghapus catatan **TIDAK mengembalikan saldo** (kanon §4.5,
    terkunci test di `docs/handoff/laporan/49-...:211-215`). Sebut juga dampaknya ke laporan/insight.
  - Undo memakai `UNDO_WINDOW_MS` yang sudah ada. Jangan bikin mekanisme undo baru.
- AC: tekan hapus semua → Riwayat / Home / kalender kosong, dan **saldo TIDAK berubah**
  (sebut angka sebelum & sesudah). Tombol Undo memulihkan semuanya.
- Test: tambahan di `lib/money/store.test.ts` (≥ 5 kasus: hapus massal; idempoten (dua kali tidak
  dobel tombstone); saldo tidak berubah; undo memulihkan; baris mock + baris sesi sama-sama hilang).

### 59.3 Detail dompet: hanya transaksi dompet ITU

- `wallet-detail-screen.tsx:168-185` menggabung TIGA sumber:
  baris sesi di-match **by NAME** (`tx.wallet === wallet.name`, baris 173),
  mock by ID (`walletTransactions(wallet.id)`, baris 179),
  transfer masuk via `incomingTransfersFor(snapshot, wallet.id)` (`lib/money/store.ts:1867`).
- Aturan baru: **semua** baris yang tampil harus punya identitas dompet yang bisa ditelusuri —
  `row.walletId === wallet.id`, plus `counterWalletId === wallet.id` untuk transfer masuk.
  **DILARANG match by name untuk data apa pun.** Baris lama tanpa `walletId` ditandai apa adanya
  di komentar; jangan dipaksa masuk ke dompet mana pun.
- Judul periode harus jujur: `WALLET_PERIOD_COPY.title = 'Ringkas 30 Hari'`
  (`lib/data/wallet-detail.ts:226`) sementara jendelanya dihitung MUNDUR DARI CATATAN TERBARU
  (`:99-104`) — itu sebabnya pernah tampil rentang "27 Sep – 28 Sep" dengan judul "30 Hari".
  Pilih SATU dan sebut alasannya: (a) jendela dipaksa 30 hari mundur dari "hari ini" (hasil paket
  57), atau (b) judulnya ikut jendela nyata.
- Dompet BARU harus kosong: "Belum ada catatan di dompet ini" + CTA (bukan angka apa pun).
- AC: bikin dompet baru → halaman detailnya **0 catatan**, apa pun keadaan dompet lain.
  Bukti: sebelum (jumlah catatan salah) → sesudah (0).
- AC (paling penting): buat 2 dompet dengan NAMA SAMA → catatan dompet A **tidak bocor** ke
  dompet B. Ini bukti match-by-name sudah hilang.
- Test: `lib/data/wallet-detail.test.ts` (≥ 6 kasus: dompet baru kosong; dua dompet nama sama;
  transfer masuk hanya di dompet tujuan; jendela 30 hari dari hari ini; tombstone disaring;
  `applyRowOverride` diterapkan).

### 59.4 Bug UANG: konteks "Bersama" memotong dompet "Tunai"

- `lib/money/store.ts:1882-1888`: `defaultWalletNameFor('bersama')` tidak menemukan dompet (dompet
  bersama hidup di /joint, bukan di daftar kanon) lalu **fallback ke `TRANSACTION_FALLBACK_WALLET`
  ('Tunai')**.
- Akibatnya: catatan yang dibuat saat switcher konteks di posisi "Bersama" **memotong saldo Tunai**
  tanpa user sadari.
- Perbaikan: konteks tanpa dompet **tidak boleh diam-diam menempel** ke dompet lain. Pilih salah
  satu dan sebut alasannya: (a) form input WAJIB memilih dompet (tombol simpan mati sampai dipilih),
  atau (b) tolak menulis dengan pesan jujur + arahan.
- AC: catat 1 transaksi di konteks "Bersama" → dompet mana yang berubah (sebelum vs sesudah).
- Test: tambahan di `lib/money/store.test.ts` (≥ 4 kasus).

### 59.5 Sensor nominal tidak boleh menggeser tata letak

- `wallet-card-face.tsx:248-279` (`MaskedAmount`): lapisan titik `absolute inset-0` +
  `justify-center` + `tracking-[0.18em]`, sementara angka asli rapat kiri tanpa tracking → titik
  tidak berada di posisi angka tadi.
- `daily-hud-card.tsx:166, 194, 204` memakai `hide(fmt(...))` yang MENGGANTI string menjadi
  `MASKED_AMOUNT` (panjang beda) → teks setelahnya reflow.
- Perbaikan: SATU pola **lebar terkunci** (angka asli tetap penentu lebar, `aria-hidden` bila perlu,
  overlay sejajar kiri tanpa tracking tambahan). Dilarang menghapus penyensoran: `CONTEXT-WAJIB`
  §5.7 tetap berlaku (yang dibaca disensor, yang disunting tidak).
- Wajib diverifikasi di: Home (kartu dompet, Jatah Harian, ringkasan), `/wallet`, `/wallet/[id]`,
  `/history`, `/budget`, `/wealth`, sumbu-Y chart, dan toast.
- AC per tempat: posisi elemen **SEBELUM == SESUDAH** toggle mata. Bukti boleh berupa nilai
  `getBoundingClientRect()` sebelum/sesudah atau perbandingan HTML hasil build (pola laporan 56).
  Kalau tidak ada browser: tulis bahwa uji visual belum dilakukan — jangan diklaim.

## 3. Definition of Done paket 59

1. Empat perintah validasi hijau + jumlah test baru.
2. Tabel sebelum → sesudah untuk: kalibrasi (0 / 24 / ≥ 30 transaksi), jumlah catatan setelah
   "hapus semua" **beserta saldo yang tidak berubah**, jumlah catatan dompet baru (harus 0),
   dompet mana yang terpotong saat konteks "Bersama", dan posisi elemen saat mata aktif.
3. Laporan `docs/handoff/laporan/59-riwayat-dompet-jujur-privasi-laporan.md` + batas jujur.

