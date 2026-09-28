# 61 — Kekayaan & Hutang + Joint (Uang Bersama)

**Baca dulu:** `docs/handoff/AUDIT-UANG-2026-09.md` (AKAR A & B, §4 aturan hapus, §5);
`docs/handoff/laporan/50-store-kekayaan-lintas-halaman-laporan.md` (khusus poin 4 di §7);
`docs/handoff/laporan/52-joint-satu-sumber-realtime-laporan.md` +
`docs/handoff/CONTEXT-WAJIB.md` §2–§10.
**Ketergantungan:** paket 57 (jangkar "hari ini" + konfigurasi uang user untuk DTI).

## 1. Ruang lingkup

`components/catetind/wealth-screen.tsx`, `wealth-hutang.tsx`, `wealth-investasi.tsx`,
`add-debt-sheet.tsx`, `wealth-net-worth-bar.tsx`, `joint-screen.tsx`, `joint-timeline.tsx`,
`joint-invite-flow.tsx`, `joint-add-sheet.tsx`, `lib/money/{wealth-store,joint-store}.ts`,
`lib/data/{wealth,joint}.ts`.

## 2. Item kerja

### 61.1 Hutang & Piutang: buat, edit, BAYAR yang terlihat, HAPUS

- **Store sudah siap & teruji**: `deleteDebt()` (`lib/money/wealth-store.ts:489`), `editDebt()`
  (`lib/money/wealth-store.ts`, sekitar `:470`), `settleDebt()`. Yang hilang UI-nya.
  (Diakui apa adanya di `docs/handoff/laporan/50-...:193`: "Belum ada UI untuk
  `editDebt()`/`deleteDebt()`".)
- "Catat Bayar / Terima" sekarang hanya muncul di dalam kartu yang harus di-expand
  (`wealth-hutang.tsx:990-997`). Jadikan aksi yang **LANGSUNG TERLIHAT** di kartu.
- Tambah aksi Edit + Hapus dengan `ConfirmDeleteDialog` + Undo.
- **Copy konfirmasi WAJIB jujur** (keputusan paket 50, `50-...:90`): menghapus catatan hutang
  **tidak** menghapus baris kas — uang yang sudah dibayar itu fakta. Sebut juga akibatnya ke
  Net Worth.
- Sisi "Hutangku" & "Piutangku" masing-masing harus punya empty state + cara memilih yang jelas.
- AC: skenario lengkap — buat hutang Rp X → catat bayar Rp Y → edit nominal → hapus; catat saldo
  dompet & Net Worth di SETIAP langkah (tabel).
- Test: tambahan di `lib/money/wealth-store.test.ts` (≥ 6 kasus untuk `editDebt` + kombinasi
  edit setelah ada pembayaran + delete setelah ada pembayaran).

### 61.2 Aset investasi: konsisten dengan 61.1

- `deleteInvestment()` sudah bisa dijangkau (`wealth-investasi.tsx:401`). Pastikan pola konfirmasi
  + Undo-nya SAMA dengan hutang (satu pengalaman, bukan dua).
- AC: tabel pola yang sama untuk aset & hutang (buat/edit/hapus/undo).

### 61.3 Joint: alur harus bisa ditebak dari layar

- Tuliskan & tampilkan TIGA keadaan dengan ekspektasi jelas:
  1. belum ada kantong → CTA "Buat dompet bersama" + penjelasan singkat apa yang terjadi;
  2. kantong ada, partner belum gabung → kode undangan + status "menunggu partner";
  3. partner sudah gabung → buku besar + catat bareng + settle.
- **Kantong BARU harus KOSONG.** Sekarang `INITIAL_JOINT_TRANSACTIONS` (`lib/data/joint.ts:241`)
  adalah seed, sehingga kantong yang baru dibuat bisa tampil berisi catatan.
  Ini satu-satunya cara klaim "baru dibuat" bisa dipercaya.
- Nyatakan relasinya dengan kas pribadi di UI: kantong bersama **TIDAK** menyentuh
  `lib/money/store.ts` (`joint-store.ts:69-72`) — jangan biarkan user menebak.
- Hapus transaksi joint: `joint-store.ts` **NOL** fungsi delete. Tambah hapus PER BARIS, hanya untuk
  baris yang BELUM disettle, dengan copy yang menyebut bahwa ini mengubah saldo patungan partner.
- Jelaskan apa yang terjadi pada `isEmptyJoint` (`joint-screen.tsx:495`) saat partner belum gabung.
- AC: alur 3 keadaan dibuktikan (apa yang tampil di tiap keadaan) + hasil hapus satu baris joint ke
  timbangan/settlement (angka sebelum/sesudah).
- Test: tambahan di `lib/money/joint-store.test.ts` (≥ 6 kasus hapus + invariant "kantong tidak
  menyentuh kas pribadi" tetap hijau).

## 3. Definition of Done paket 61

1. Empat perintah validasi hijau + jumlah test baru.
2. Tabel skenario hutang/aset lengkap dengan saldo & Net Worth per langkah.
3. Tabel 3 keadaan `/joint` + apa yang tampil di masing-masing.
4. Laporan `docs/handoff/laporan/61-kekayaan-hutang-joint-laporan.md` + batas jujur (termasuk:
   realtime `/joint` hanya nyata kalau ada sesi Supabase — jangan diklaim lebih).
