# 17 — Wealth: Edit Aset + Riwayat Bayar Hutang

**Paket:** melengkapi `/wealth` (tanpa route baru) · **Fase 7** · **Depends on:** —

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Bukti gap (hasil audit setelah 16 task)

| Lokasi | Masalah |
|---|---|
| `components/catetind/wealth-screen.tsx:145-146` | `handleEditAsset` → `toast.success('Edit …', { description: 'Form edit aset segera hadir.' })` |
| `components/catetind/wealth-hutang.tsx:844-849` | **teks placeholder terlihat user**: *"Riwayat pembayaran akan tampil di sini setelah terhubung ke `debt_payments`."* |
| `components/catetind/wealth-hutang.tsx:219` | TODO: pembayaran hutang belum menyimpan tanggal & dompet sumber |
| `lib/data/wealth.ts:730` | riwayat beli/jual masih peta statis (UI-nya sudah jalan — hanya datanya mock) |

## Peta baca

**PRD:**

- **1014–1105** — 2E.1 Investment Tracker: cakupan aset, **Auto-Fetch + Fallback Protocol**
  (baris 1052–1057: `is_stale` → warning amber + tombol **"Update Manual"** untuk aset itu saja),
  lalu **1059–1105** User Stories & Acceptance Criteria
- **1105–1195** — 2E.2 Debt Manager: dua kategori (Personal vs Platform), **DTI**,
  wireframe, aksi **Bayar/Edit/Hapus** per hutang
- **1692–1735** — asumsi: A10 (due date integer 1–31), A12 (Properti di luar V1)
- **1174 (2E.2 copy)** — nada nurturing untuk piutang: *"Catat aja biar gak lupa, bukan buat ngejar-ngejar ya 😊"*

**Kode acuan:**

- `components/catetind/add-investment-sheet.tsx` — form tambah investasi (dipakai ulang untuk mode edit)
- `components/catetind/add-debt-sheet.tsx` — form hutang (dual: personal & platform)
- `components/catetind/wealth-investasi.tsx` — kartu aset + `history.map(...)` riwayat beli/jual
- `components/catetind/wealth-hutang.tsx` — kartu hutang + tombol `Catat Bayar`
- `lib/data/wealth.ts` — `Investment`, `Debt`, `INVESTMENT_HISTORY`, helper return/DTI
- `components/catetind/sync-balance-modal.tsx` — pola modal koreksi nilai (dipakai untuk "Update Manual" harga)

## Kenapa paket ini ada

Aset & hutang adalah modul yang **wajib bisa dikoreksi user** — nilainya berubah manual
(tanpa bank-sync, PRD 1016 & 1052). Selama form edit belum ada, modul ini hanya bisa
**menambah** dan tidak pernah bisa **membetulkan**, jadi angka net worth bisa salah
selamanya. Nada modul ini pun sudah ditentukan PRD: tentang **kejelasan**, bukan
menagih.

## Yang harus dibangun

1. **Mode edit aset** — ubah `add-investment-sheet.tsx` agar menerima prop opsional
   `initial?: Investment` (judul/CTA berubah jadi "Edit Aset" / "Simpan Perubahan"),
   lalu sambungkan `handleEditAsset` di `wealth-screen.tsx` ke sheet itu dan
   **hapus toast placeholder**-nya. Backward compatible untuk pemakaian tambah.
2. **"Update Manual" harga** — di kartu aset, sediakan jalur cepat mengubah **harga
   sekarang** saja (modal kecil) sesuai PRD 1056; sertakan timestamp
   **"Terakhir diperbarui"** dan, bila harga ditandai basi, warning amber
   ber-copy dari PRD 1055 (*"Harga … belum diperbarui. Update terakhir: …"*).
3. **Riwayat pembayaran hutang (ganti placeholder)** — tambah data mock pembayaran di
   `lib/data/wealth.ts` (`DebtPayment = { id, debtId, amount, paidAtISO, walletName }`)
   + render daftar riwayat di kartu detail hutang, lalu **hapus paragraf
   "Riwayat pembayaran akan tampil di sini…"**. Saat user menekan `Catat Bayar`,
   pembayaran baru **menambah** satu baris riwayat (tanggal + dompet sumber, melunasi
   TODO di `wealth-hutang.tsx:219`).
4. **Riwayat beli/jual** — pindahkan data statis di `lib/data/wealth.ts:730` menjadi
   turunan dari transaksi aset, dan pastikan aset yang baru ditambah punya riwayat
   kosong dengan **empty state jujur** (*"Belum ada transaksi beli/jual untuk aset ini."*),
   bukan baris kosong.
5. **Copy** tinggal di `lib/data/wealth.ts` (label, judul sheet, empty state, warning basi).
   Komentar arah produksi tetap ditulis untuk tabel `investment_transactions` &
   `debt_payments`.

## Acceptance criteria

- [ ] Edit aset membuka sheet **terisi nilai aset tersebut**; simpan → kartu & total portofolio berubah.
- [ ] "Update Manual" harga bisa dijalankan per aset, dan timestamp ikut berubah.
- [ ] `grep "Riwayat pembayaran akan tampil"` → **0 hasil**.
- [ ] `Catat Bayar` menambah baris riwayat (tanggal + dompet sumber) dan mengurangi sisa hutang.
- [ ] Aset tanpa riwayat menampilkan empty state, bukan daftar kosong.
- [ ] Nominal tersensor saat tombol mata privasi aktif.
- [ ] Nol `TODO`/`segera hadir` baru di `/wealth` (selain teaser Properti yang memang PRD A12).
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Membuat sheet edit baru yang menduplikasi 90% `add-investment-sheet.tsx`.
- Mengubah angka DTI/DTI badge tanpa alasan dari data.
- Menyalakan Properti/Aset Fisik (di luar V1 per PRD **A12**).
