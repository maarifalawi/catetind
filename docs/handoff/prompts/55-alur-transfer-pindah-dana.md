# 55 — Alur Transfer/Pindah Dana Dibuat Jelas & Tidak Ada Lagi Jalur "Ngambang"

**Paket:** temuan uji pemakaian 28 Sep 2026 · **Fase 13** · **Depends on:** 47 (badge konteks) ·
**berkaitan dengan:** 49 (kalender), 53/54 (engine input)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + `lib/money/ledger.ts` (aturan baris transfer) +
> `components/catetind/transfer-sheet.tsx` + laporan 46 §2 (contoh alur yang sudah benar).

## Keluhan yang dilaporkan

"Fitur transfer masih ngambang, flow-nya masih belum jelas."

## Bukti gap (audit 28 Sep 2026)

**Yang sudah benar (pertahankan, jangan ditulis ulang):**
`/wallet` → kartu dompet → popover "Pindah Saldo" → `TransferSheet` (`transfer-sheet.tsx`) →
`wallet-screen.tsx:268-298` → `postTransfer()` (`lib/money/store.ts:876`) — satu baris ledger
menggerakkan DUA saldo, menolak nominal > saldo sumber, dan toast menyebut kedua dompet
(`TRANSFER_SHEET_COPY.toastDescription`).

**Yang bikin "ngambang":**

| # | Bukti | Masalah |
|---|---|---|
| 1 | `components/dashboard/transaction-input-engine.tsx:140-146` (chip tipe `transfer`, `suggested: 'Transfer'`) + `:566-572` (submit `type: 'transfer'`) | chip "Transfer" di FAB menulis lewat `recordTransaction` → `postTransaction()` yang **tidak punya dompet tujuan**. Baris `transfer` lahir SATU SISI (tidak ada `counterWalletId`) |
| 2 | `lib/money/ledger.ts:17-21,81-88` | invariant mewajibkan baris `transfer`/`settlement` seimbang (`movesBetweenWallets('transfer') === true`) → penjaga store menolak/melempar, jadi user tidak mendapat apa pun setelah menekan "Catat" |
| 3 | `components/catetind/wallet-detail-screen.tsx:410` | halaman detail dompet hanya menyebut "pindah dana" di komentar — **tidak ada** tombol/jalurnya |
| 4 | `components/catetind/cashflow-calendar-screen.tsx:177-196` | tipe catatan `money_movement` ("Pindah dana") menulis CATATAN saja; uangnya tidak pindah ke mana pun |
| 5 | `components/catetind/MobileBottomNav.tsx` + `desktop-sidebar.tsx` | tidak ada pintu "Pindah Dana" — satu-satunya jalan adalah popover di kartu dompet, yang tidak terlihat sebagai aksi utama |

## Peta baca

- `lib/money/ledger.ts` → `movesBetweenWallets()`, `walletDelta()`, invariant Σ transfer = 0.
- `lib/money/store.ts` → `postTransfer()`, `postTransaction()`, `walletOptionsFor()`, `defaultWalletNameFor()`.
- `components/catetind/transfer-sheet.tsx` + `lib/data/add-wallet.ts` → `TRANSFER_SHEET_COPY`,
  `WALLET_TRANSFER_COPY` (`transferName`, `transferCategory`).
- `components/catetind/wealth-hutang.tsx:94-98` → contoh sheet "dari dompet mana" yang jelas.
- `components/catetind/sweep-sheet.tsx` / `contribute-sheet.tsx` → gaya sheet 1 tujuan yang sudah hidup.
- PRD 2A.4 (pindah dana) & 2A.6 (satu jalur navigasi per aksi).

## Aturan kanon

- **Pindah dana = SATU baris ledger dua sisi** (`postTransfer`). Tidak ada "transfer" yang hanya
  mengeluarkan uang tanpa dompet penerima.
- **Satu aksi = satu pintu.** Chip/CTA apa pun yang berlabel "Transfer"/"Pindah Dana" wajib membuka
  alur yang sama (`TransferSheet`), bukan jalur tulis kedua.

## Yang dikerjakan (urutan)

1. **Tutup lubang baris satu sisi di store** — `postTransaction()` harus MENOLAK `type: 'transfer'`
   tanpa `counterWalletId` (return `null`, tanpa menulis apa pun), dan tulis alasannya di komentar
   + test murni:
   `postTransaction({ type: 'transfer', wallet: 'BCA', amount: 100000 })` → `null`, `rows` tidak berubah.
   Ini pagar yang membuat bug "ngambang" tidak bisa kembali lewat jalur mana pun.
2. **Chip "Transfer" di engine diarahkan ke alur yang benar.** Pilih satu (tulis keputusan di laporan):
   (a) menekan chip `Transfer` **menutup** engine lalu membuka `TransferSheet` (dompet asal = dompet
   konteks aktif, atau sheet pemilih asal kalau dompetnya > 2), **atau**
   (b) chip `Transfer` DIHAPUS dari engine (engine = catatan pemasukan/pengeluaran/tabungan saja) dan
   pintu pindah dana diletakkan di tempat yang wajar: tombol "Pindah Dana" di kartu dompet
   (sudah ada sebagai popover "Pindah Saldo"), di halaman detail dompet, dan di menu "Lainnya".
   Yang **wajib**: tidak ada lagi jalur yang bisa menulis baris transfer tanpa tujuan.
3. **Satu alur 3 langkah yang bisa dijelaskan dalam satu kalimat:**
   *dari dompet mana → ke dompet mana → berapa* (+ tanggal hari ini, catatan opsional) →
   ringkasan `Rp 250.000 · BCA → GoPay` → tombol "Pindah Rp 250.000".
   Semua pintu masuk memakai alur ini; jangan bikin modal transfer kedua.
4. **Pintu masuk dilengkapi** — minimal: (i) kartu dompet di `/wallet` (ada), (ii) tombol "Pindah Dana"
   dari-dompet-ini di `/wallet/<id>` (`wallet-detail-screen.tsx`), (iii) satu entri di menu
   "Lainnya" (bottom-nav) / sidebar desktop dengan label jelas. Setiap pintu menyebutkan dompet asal
   bila sudah diketahui (user tidak perlu memilih dua kali).
5. **Keadaan tepi yang harus ada & benar** (copy ke `lib/data/*`):
   - dompet < 2 → empty state jujur + CTA "Tambah dompet" (bukan sheet kosong);
   - dompet tujuan ≠ asal (sudah dijaga; pastikan tetap);
   - nominal > saldo asal → tombol mati + kalimat ramah yang menyebut sisa saldo (sudah ada);
   - saldo asal 0 → chip "Semua" nonaktif + kalimat yang menjelaskan;
   - tujuan berada di konteks lain → badge konteks (paket 47) supaya user sadar ini pindah antar konteks;
   - sukses → toast 2 sisi + baris `Pindah ke <dompet>` (kategori `'Transfer'`) muncul di Riwayat,
     kartu Home, dan di kedua halaman dompet.
6. **Membatalkan transfer yang salah** — jalurnya hapus baris di Riwayat (tombstone). Pastikan &
   buktikan: menghapus baris `transfer` mengembalikan KEDUA saldo (bukan cuma satu) dan
   `netEffect`/kas total kembali seperti sebelum transfer. Kalau sekarang tidak begitu, perbaiki di
   `lib/money/store.ts` + test.
7. **Kalender & catatan** — "Pindah dana" di sheet catatan kalender (`money_movement`) dihapus atau
   diarahkan ke alur ini (koordinasi dengan paket 49 poin 4). Tidak boleh ada catatan yang mengaku
   "pindah dana" tanpa perpindahan dana.
8. **Test** (`lib/money/store.test.ts`): transfer normal (dua saldo ±, kas total tetap), transfer >
   saldo ditolak, transfer ke dompet sama ditolak, transfer satu sisi ditolak, hapus baris transfer
   mengembalikan dua saldo, invariant Σ transfer = 0 tetap lulus setelah semua kasus di atas.

## Larangan

- Menulis baris `transfer` dari komponen (semua lewat `postTransfer`).
- Membuat modal/flow transfer kedua (satu alur untuk semua pintu masuk).
- Mengubah mesin ledger (`walletDelta`, invariant) selain menambah penjagaan di `postTransaction`.
- Menambah dependency baru (mis. state machine) — cukup state lokal sheet yang ada.
- Menghapus popover "Pindah Saldo" di kartu dompet tanpa menggantinya dengan pintu yang sama jelasnya.

## Bukti yang harus ditunjukkan

- `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`, `pnpm theme:audit`.
- Rantai bukti angka: sebelum transfer (BCA Rp 1.450.000 · GoPay Rp 350.000) → transfer Rp 250.000 →
  sesudah (BCA Rp 1.200.000 · GoPay Rp 600.000) + Total Saldo **tidak berubah** + satu baris di Riwayat;
  lalu hapus baris itu → kedua saldo kembali seperti semula.
- Bukti jalur mati: percobaan menulis `type: 'transfer'` lewat `postTransaction` mengembalikan `null`
  dan tidak mengubah `rows` (tempel hasilnya).
- Laporan: keputusan poin 2 (arahkan vs hapus chip), daftar pintu masuk akhir, dan hal yang belum bisa
  diverifikasi (uji tap di perangkat / keyboard).
