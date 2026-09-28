# 62 — Hapus data di semua jalur yang belum punya pintunya

**Baca dulu:** `docs/handoff/AUDIT-UANG-2026-09.md` (§4 aturan uang & hapus, §5, §8) +
`docs/handoff/CONTEXT-WAJIB.md` §2–§10.
**Ketergantungan:** paket 57–61 selesai, supaya pola hapus sudah seragam & teruji.

## 1. Tabel kerja

| Data | Keadaan sekarang | Yang diminta |
|---|---|---|
| **Dompet** | API `DELETE /api/wallets/:id` **ada** (`app/api/wallets/[id]/route.ts:56` + `removeWallet()` `app/api/wallets/store.ts:160`), tapi **UI nol pemanggil**; store utama juga tidak punya `removeWalletAccount` | UI hapus di `/wallet` + `/wallet/[id]`, dan benar-benar memanggil endpoint yang sudah ada supaya store & server satu cerita |
| **Kategori kustom** | sudah bisa dihapus (`settings-panel-preferences.tsx:344`) | samakan pola konfirmasi + Undo dengan yang lain |
| **Kategori bawaan** | hanya bisa disembunyikan (`:119, 270`) | **pertahankan** perilakunya, tapi jelaskan alasannya di UI (sekarang tidak dijelaskan) |
| **Budget kategori** | paket 60 | pastikan selesai & konsisten |
| **Celengan** | paket 60 | idem |
| **Hutang / piutang** | paket 61 | idem |
| **Semua catatan** | paket 59 | idem |
| **Transaksi /joint** | paket 61 | idem |
| **Akun (hapus akun)** | sudah ada 2 lapis (`settings-panel-privacy.tsx`) | pastikan SEMUA state baru dari paket 57–61 ikut dibersihkan `purgeDeviceData()` (`lib/account.ts:172-193`) **dan** ikut file ekspor (`lib/money/export.ts`, lihat `collectExportSources()`) |
| **Properti & Aset Fisik** | masih placeholder (`wealth-screen.tsx:452-466`) | biarkan, tapi tulis apa adanya di UI (jangan janji bisa dikelola) |

## 2. Aturan hapus dompet (paling rawan — baca dua kali)

1. `commit()` (`lib/money/store.ts:259-263`) memanggil `assertLedgerInvariant()`; penjaganya
   (`lib/money/ledger.ts:236-242`) membandingkan `Σ efek baris` dengan `Σ saldo − Σ opening`.
2. Membuang dompet dari `snapshot.wallets` tanpa menangani baris ledger-nya = **invariant gagal =
   commit DITOLAK**. Jadi **hard delete dompet tidak mungkin** tanpa merusak janji
   "saldo = opening + Σ baris".
3. Yang dipakai: **tombstone/purge** (pola yang sudah ada), + pastikan rujukan tidak jadi yatim:
   baris ledger (`walletId`), tagihan (`paidRowId`), celengan (`contributions.walletId`),
   pelunasan hutang (`postDebtSettlement`), transfer (`counterWalletId`).
4. Kalau dompet punya riwayat: tawarkan **pindahkan dulu** atau hapus catatannya — jangan biarkan
   user menghapus dompet lalu angkanya jadi tak bisa ditelusuri.

## 3. Aturan hapus yang seragam untuk SEMUA jenis data

- Dialog konfirmasi menyebut: **jumlah item**, **dampak uang (nominal)**, dan **apa yang TIDAK
  dikembalikan**.
- Undo memakai `UNDO_WINDOW_MS` yang sudah ada (jangan bikin mekanisme undo baru).
- Untuk data berdampak uang (dompet, celengan, hutang): copy menyebut dampaknya ke
  **Saldo / Net Worth / Jatah Harian** secara eksplisit.
- Setiap aksi hapus menulis jejak analitik (`trackMoneyEvent`, pola `lib/money/store.ts:1310`).
- Tombol hapus tidak boleh jadi satu-satunya jalur yang tak bisa dijangkau keyboard/screen reader:
  `aria-label` wajib, fokus terlihat (`CONTEXT-WAJIB` §8).

## 4. Definition of Done paket 62

1. Empat perintah validasi hijau + jumlah test baru.
2. Tabel MATRIKS: `jenis data × (buat / baca / ubah / hapus) × jalur UI × dampak ke saldo` —
   supaya klaim "semua data user bisa dikelola" bisa diverifikasi lewat satu tabel.
3. Tabel: setelah hapus akun, apa yang kosong & apa yang (sengaja) masih tampil + alasannya.
4. Laporan `docs/handoff/laporan/62-hapus-data-semua-jalur-laporan.md` + batas jujur.
