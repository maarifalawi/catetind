# 40 — Stage 4A · Satu Ledger Kas (Satu Sumber Saldo)

**Paket:** audit fintech lanjutan · **Depends on:** #39 (otorisasi ada sebelum data dipindah ke store)

> Baca `docs/handoff/CONTEXT-WAJIB.md` + `FIXPLAN-AUDIT.md` Stage 4. **Ini paket paling berbahaya:** ia menyentuh saldo yang dibaca hampir semua halaman. Kerjakan bertahap & verifikasi tiap langkah.

## Bukti gap

| # | Lokasi | Temuan |
|---|---|---|
| 1 | `lib/wallets.ts:77-112` vs `:302-345` | **dua daftar dompet yang sama dengan saldo berbeda**: `INITIAL_WALLET_ACCOUNTS` (BCA 1.450.000 + GoPay 350.000 + Tunai 50.000 = **1.850.000**) vs `INITIAL_WALLETS` (2.500.000 + 1.309.573 + 500.000 = **4.309.573**) |
| 2 | `components/catetind/home-screen.tsx:46` | Home menjumlahkan `INITIAL_WALLETS` → "Total Saldo" Rp 4.309.573 |
| 3 | `lib/data/wealth.ts:719-732` + `wealth-screen.tsx:115` | Kekayaan/Net Worth memakai `walletAccountsTotal()` dari konstanta → kas likuid Rp 1.850.000. **Beda Rp 2.459.573 di satu user** |
| 4 | `wallet-screen.tsx:241-247` | koreksi saldo hanya `setWallets` lokal + toast "Pengeluaran Tak Tercatat ditambahkan" — **tidak ada catatan yang dibuat** |
| 5 | `sync-balance-modal.tsx:189-193` | copy menjanjikan "Pengeluaran/Pemasukan Tak Tercatat akan ditambahkan otomatis ke catatanmu" → janji yang tidak ditepati |
| 6 | `app/wallet/[id]/page.tsx:14` | halaman detail dirender server dari konstanta → koreksi user tidak pernah terlihat di sana |
| 7 | `lib/transaction-bus.ts` (tanpa API remove) + `history-screen.tsx:141` + `recent-transactions-card.tsx:416` | catatan yang dihapus **hidup lagi** saat halaman Riwayat di-mount ulang; hapus di Home tidak terlihat di Riwayat |
| 8 | `app/api/wallets/route.ts:16-19` | API membaca `INITIAL_WALLETS` (sumber kedua) & memutasi array modul |

## Yang harus dibangun

1. **`lib/money/ledger.ts` — baris ledger + invariant.** `LedgerRow = { id, walletId, type: 'expense'\|'income'\|'transfer'\|'settlement'\|'balance_adjustment', amount, dateISO, note, category?, counterWalletId?, clientTxId? }`. Ekspor `balanceOf(rows, walletId)` (`opening + Σ baris`) dan `assertLedgerInvariant(rows)` (Σ transfer bersih 0; Σ baris = Σ saldo − Σ opening). Uang selalu integer rupiah.
2. **`lib/money/store.ts` — satu store.** State dompet + baris ledger + API tulis (`postExpense`, `postIncome`, `postTransfer`, `postBalanceAdjustment`, `removeRow`) + `subscribe`/`useMoneyStore()`. **Satu-satunya** sumber saldo untuk Home, `/wallet`, `/wallet/[id]`, `/wealth`, dan `app/api/wallets`.
3. **`lib/money/idb.ts` — persist tanpa dependency** (~60 baris, `indexedDB`, fallback ke memory bila diblokir/mode privat). Tulis di komentar: di produksi ini `POST /api/transactions` + Supabase.
4. **Koreksi saldo jujur:** `postBalanceAdjustment` menulis baris `balance_adjustment` **dan** baris "Pengeluaran/Pemasukan Tak Tercatat" sesuai copy modal — atau copy modal diubah. Pilih satu, jangan dua-duanya.
5. **Hapus yang benar-benar menghapus:** tombol hapus memanggil `removeRow` (tombstone agar tidak "lahir lagi"), semua halaman yang menampilkan catatan berlangganan store; `lib/transaction-bus.ts` jadi adapter tipis ke store atau dihapus (jangan tinggalkan dua jalur tulis).
6. **Hapus `INITIAL_WALLETS`** dan `walletAccountsTotal()` yang membaca konstanta; `walletAccountsTotal` menerima baris/daftar dari store.

## Acceptance criteria

- [ ] Total saldo **identik** di 4 titik (Home, `/wallet`, `/wallet/[id]`, Kekayaan) — tempel angkanya di laporan.
- [ ] Koreksi saldo di `/wallet` → ikut berubah di Net Worth/Kekayaan **dan** di halaman detail dompet; catatan tak tercatat benar-benar muncul di Riwayat (atau copy berubah — sebutkan pilihanmu).
- [ ] Hapus catatan di Home → hilang di `/history` & `/wallet/[id]`; pindah halaman lalu kembali → **tetap hilang**.
- [ ] Test unit baru: `balanceOf` (termasuk transfer & adjustment), `assertLedgerInvariant`, dan "hapus bertahan" (store-level). **23 test lama tetap hijau.**
- [ ] `grep INITIAL_WALLETS` = **0 hasil**; `grep walletAccountsTotal` menunjuk satu implementasi saja.
- [ ] `pnpm test` · `pnpm exec tsc --noEmit` · `pnpm build` hijau.

## Dilarang

- Membuat store kedua (mis. satu untuk Home, satu untuk Dompet) — itu persis penyakit yang paket ini sembuhkan.
- Menambah dependency (termasuk `idb`, Zustand, Dexie); adapter IndexedDB ditulis tangan.
- Mengubah rumus `lib/data/joint-ledger.ts` atau angka test joint yang sudah dikunci (Jon transfer Rp 25.000).
- Mengklaim sinkronisasi antar-perangkat/server.

## Validasi

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

Laporan wajib memuat: sebelum/sesudah angka saldo di 4 titik, daftar file yang diubah, bukti hapus bertahan lintas halaman, cara invariant dijaga, dan batas (mis. IndexedDB diblokir di mode privat).
