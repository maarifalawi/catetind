# Laporan 62 — Hapus data di semua jalur yang belum punya pintunya

**Status:** ✅ SELESAI — diimplementasikan & divalidasi (29 Sep 2026) · **Paket:** 62
**Prompt:** `docs/handoff/prompts/62-hapus-data-semua-jalur.md`
**Konteks wajib:** `docs/handoff/CONTEXT-WAJIB.md` + `docs/handoff/AUDIT-UANG-2026-09.md`
**Baseline terukur sebelum paket ini:** 618 test / 39 file (angka dari laporan 61) → **sesudah:** 644 test / 41 file.

## 1. Ringkas (3–5 baris)

1. **Paket ini menutup satu-satunya data user yang benar-benar tidak punya pintu keluar: DOMPET.** API `DELETE /api/wallets/:id` sudah ada sejak paket 45 dan nol pemanggil; sekarang `/wallet` (popover kartu) dan `/wallet/[id]` (tombol terlihat di bar aksi) memanggilnya lewat satu pintu tulis baru `removeWalletAccount()` + Undo 5 detik + jejak analitik `wallet_deleted`.
2. Bentuk hapusnya **TOMBSTONE** (`removedWalletIds`), bukan hapus fisik — dan itu bukan pilihan gaya: `commit()` memanggil penjaga invariant yang menghitung `Σ saldo − Σ opening` dari `snapshot.wallets`, jadi membuang dompet tanpa menangani barisnya **ditolak** (AUDIT §4.3). Yang hilang cuma visibilitasnya; baris ledger & riwayat uangnya tetap, saldo dompet lain tidak bergerak (±0 rupiah), dan Total Saldo turun tepat sebesar saldo dompet itu.
3. **Kategori kustom** sekarang hapusnya lewat dialog konfirmasi + Undo (sebelumnya sekali klik langsung hilang), **kategori bawaan** tetap hanya bisa disembunyikan — dan alasannya sekarang **dijelaskan di layar** (temuan audit #10). Seluruh copy panel itu pindah dari JSX ke `lib/data/category-prefs.ts` (§4) dengan fungsi hapus/pulihkan murni yang teruji.
4. **Hapus Akun & file ekspor** ikut dibereskan: tombstone dompet di-reset `purgeMoneyStore()`, dan ekspor naik ke **schema v4** yang memuat dompet terhapus (ditandai `removed`) + `removedWalletIds`, sementara `totals.cash` tetap sama persis dengan Total Saldo di app. `isAccountEmpty()` diperbaiki (temuan audit #3) supaya notice kosong-akun dihitung dari **yang tampil**, bukan dari yang tersimpan di belakang layar.
5. **Properti & aset fisik** tetap placeholder (PRD A12) tapi kalimatnya tidak lagi menjanjikan "segera hadir": sekarang menyebut apa yang belum bisa dikelola **dan** apa yang belum ikut dihitung di Total Kekayaan.
6. Empat perintah validasi hijau: **644 test / 41 file (0 gagal, tanpa `.skip`)**, `tsc` 0 error, `build` sukses, `theme:audit` "palet bersih".

## 2. File yang dibuat/diubah

| # | File | Perubahan | Alasan |
|---|---|---|---|
| 1 | `lib/money/store.ts` *(diubah)* | `MoneySnapshot.removedWalletIds` (+`SERVER_SNAPSHOT`, `EMPTY_SNAPSHOT`, `PersistedMoney`, `mergeMoneySnapshot`, `mergeWithRemote`, `commit`, `purgeMoneyStore`); selector baru `isWalletRemoved`, `liveWalletSeeds`, `removedWalletSeeds`, `walletRecordCount`; filter tombstone di `walletAccounts`, `homeWallets`, `walletAccountOf`, `walletSeedOf`, `walletOptionsFor`, `walletIdOfName`, `walletNameOf`, `defaultWalletNameFor`, `postTransfer`; pagar dompet di `postExpense`/`postIncome`; lookup riwayat `walletNameAnyOf`; API baru `removeWalletAccount()` / `restoreWalletAccount()`; `isAccountEmpty()` diperbaiki | Satu pintu tulis untuk hapus dompet yang TIDAK merusak invariant ledger, dan tidak ada jalur yang bisa menulis uang ke dompet yang sudah dihapus |
| 2 | `lib/supabase/money-remote.ts` *(diubah)* | `deleteRemoteWallet(walletId)` → `DELETE /api/wallets/:id` (endpoint yang sudah ada); `false` di luar browser/gagal, tanpa `throw` | Temuan audit #2: endpoint ada, pemanggil nol. Store perangkat & database harus bercerita sama |
| 3 | `lib/analytics.ts` *(diubah)* | Event `wallet_deleted` + entri katalog (`payload: ['scope','had_rows']`; `never: ['nama dompet','nomor akun','nominal saldo','jumlah catatan','id dompet']`) | §3 prompt: setiap aksi hapus wajib meninggalkan jejak — dengan payload yang tetap bebas uang & identitas |
| 4 | `lib/data/wallet-detail.ts` *(diubah)* | `WALLET_DELETE_COPY`, `WALLET_DELETE_TOAST`, `walletDeleteBalanceLabel()`, +2 entri `WALLET_CARD_MENU_COPY` | Dialog wajib menyebut jumlah catatan, dampak nominal, dan apa yang TIDAK dikembalikan; copy tinggal di lapis data (§4) |
| 5 | `components/catetind/wallet-screen.tsx` *(diubah)* | Entri menu **Hapus dompet** (ikon `Trash2`, nada plum) + state/ref Undo + `ConfirmDialog` + toast Undo | Pintu hapus di `/wallet`; popover yang sama juga memuat "Pindah Dana" sebagai jalan yang lebih aman (§2.4 prompt) |
| 6 | `components/catetind/wallet-detail-screen.tsx` *(diubah)* | Tombol **Hapus dompet** yang TERLIHAT di bar aksi sticky + `ConfirmDialog` + Undo + `router.push('/wallet')` setelah hapus | Pintu kedua yang diminta prompt; setelah dompetnya hilang halaman ini tidak punya bahan render, jadi user diantar ke daftar (Undo tetap hidup di toast) |
| 7 | `lib/money/wallet-delete.test.ts` *(baru, 12 kasus)* | Tombstone, invariant, Total Saldo, Undo, saldo dompet lain, Riwayat, rujukan pindah dana, pagar tulis, hidrasi/refresh, Hapus Akun, `isAccountEmpty`, analitik | Perilaku hapus dompet diuji sebagai janji, bukan sebagai "tombolnya ada" |
| 8 | `lib/data/category-prefs.ts` *(baru)* | Tipe + daftar kategori + emoji + `removeCategory()`/`restoreCategory()` (murni) + `CATEGORY_PREFS_COPY` lengkap | Copy keluar dari JSX (§4) & hapus/undo jadi logika teruji tanpa React; sekaligus mengoreksi klaim panel yang tidak benar (lihat §7) |
| 9 | `lib/data/category-prefs.test.ts` *(baru, 10 kasus)* | Hapus/Undo/urutan/idempoten/bawaan-tidak-bisa-dihapus + penjaga copy | Perilaku hapus kategori tidak boleh bergantung pada klik manual |
| 10 | `components/catetind/settings-panel-preferences.tsx` *(diubah)* | Hapus kategori kustom → `ConfirmDialog` + Undo (`UNDO_WINDOW_MS`); penjelasan alasan kategori bawaan; seluruh kalimat dari `CATEGORY_PREFS_COPY`; `storageNote` tentang batas daftar | §1 prompt (samakan pola + jelaskan alasan) dan `CONTEXT-WAJIB` §8 (tidak ada copy hardcoded di JSX) |
| 11 | `lib/money/export.ts` *(diubah)* | `EXPORT_SCHEMA_VERSION` **3 → 4**; `removedWalletIds`; `wallets[].removed`; `totals.cash` = dompet hidup; +1 baris `limits` | File "Export Data Saya" tidak boleh menyembunyikan dompet yang pernah dimiliki user, sementara totalnya tetap sama dengan yang dibaca halaman |
| 12 | `lib/data/account.ts` *(diubah)* | `EXPORT_DATA_COPY.includes` + "Dompet yang sudah kamu hapus, ditandai sebagai terhapus (paket 62)" | Janji di halaman Export harus sama dengan isi filenya |
| 13 | `lib/data/wealth.ts` *(diubah)* | `PROPERTY_V1_COPY` | Kalimat placeholder Properti pindah ke lapis data & tidak lagi menjanjikan tanggal |
| 14 | `components/catetind/wealth-screen.tsx` *(diubah)* | Placeholder Properti memakai `PROPERTY_V1_COPY` (badge "Belum bisa dikelola", catatan Net Worth, arah ke tab yang bisa dipakai) | §1 prompt: tulis apa adanya, jangan janji bisa dikelola |
| 15 | `lib/money/export.test.ts` *(diubah, +2 kasus)* | Dompet terhapus ikut & ditandai; Undo membalikkan ekspor | Klaim §4 tabel sebelum→sesudah harus punya testnya |
| 16 | `lib/account.test.ts` *(diubah, +2 kasus)* | Tombstone dompet dibersihkan Hapus Akun; `isAccountEmpty` setelah purge; fixture `PersistedMoney` disesuaikan | DoD §3: bukti apa yang kosong setelah Hapus Akun |
| 17 | `lib/analytics.test.ts` *(diubah)* | Katalog **6 → 7** event + penjaga `wallet_deleted` ada di daftar | Event baru wajib lewat penjaga payload yang sama; angka lama memang mengunci 6 dan harus berubah (bukan dihapus/diskip) |
| 18 | `lib/money/bills-store.test.ts` *(diubah)* | `schemaVersion` **3 → 4** | Bentuk file ekspor benar-benar berubah; test lama disesuaikan ke versi kanon yang baru, tidak dihapus |
| 19 | `lib/money/store.test.ts`, `lib/money/store-remote-merge.test.ts` *(diubah)* | Fixture `MoneySnapshot` + `removedWalletIds: []` | Field baru WAJIB di tipe; tidak ada perilaku yang diubah |
| 20 | `docs/handoff/CONTEXT-WAJIB.md` *(diubah)* | §10.2: tombstone dompet = struktur yang jangan dibuat jalur kedua. §10.3: riwayat angka test 618/39 → 644/41 | Kanon harus memuat keputusan paket ini supaya tidak "diperbaiki balik" |

## 3. MATRIKS kelola data (WAJIB lengkap)

Keterangan: ✅ = ada & bisa dipakai user · ⚠️ = ada tapi terbatas (lihat catatan) · ❌ = **belum ada** · ✗ = **sengaja tidak ada** (dengan alasan yang ditulis di UI).

| Jenis data | Buat | Baca | Ubah | Hapus | Jalur UI | Dampak ke saldo |
|---|---|---|---|---|---|---|
| Dompet | ✅ `addWalletAccount` | ✅ `/wallet`, `/wallet/[id]`, deck Home | ⚠️ **hanya saldo** (`postBalanceAdjustment` via Smart Sync). Ganti nama/nomor/konteks **belum ada UI** walau `PUT /api/wallets/:id` sudah ada | ✅ **BARU (62)**: tombstone + `ConfirmDialog` + Undo 5 dtk + `DELETE /api/wallets/:id` | popover kartu `/wallet` (Hapus dompet) & bar aksi `/wallet/[id]` | Total Saldo & Net Worth **turun sebesar saldo dompet itu**; saldo dompet LAIN **±Rp 0**; uang yang sudah keluar **tidak kembali** |
| Catatan transaksi | ✅ FAB/sheet/modal + AI capture | ✅ Riwayat, Home, `/wallet/[id]`, Insight | ✅ `editRow()` satu pintu (paket 48) | ✅ `removeRow()`/`removeRows()` + Undo (paket 36/59) | Riwayat, Home, dompet detail (swipe/menu) | Catat & edit **mengubah** saldo; **hapus TIDAK** mengembalikan uang (kanon §4.5) |
| Budget kategori | ✅ `applyBudgetSave` (create) | ✅ `/budget` Zone A | ✅ `applyBudgetSave` (edit) | ❌ **belum ada** — `lib/data/budget.ts` nol fungsi hapus | — | (belum ada jalur hapus) Target user: nol dampak ke saldo |
| Celengan | ✅ `addFund()` | ✅ `/budget`, `/budget/[id]`, Home | ✅ setor `contributeToFund()`, sapu `sweepIntoFund()` | ❌ **belum ada** — `lib/money/funds-store.ts` nol fungsi hapus | — | Setor/sapu **menggerakkan kas**; hapus (kalau ada) akan menaikkan Jatah Harian — itu yang wajib disebut copy-nya (60.2) |
| Tagihan | ✅ `addBill()` | ✅ `/bills`, strip 7 hari, Home | ✅ `editBill()`, `markBillPaid()`, `unmarkBillPaid()` | ✅ `deleteBill()` + `restoreBill()` (paket 51) | `/bills`: menu kartu → `ConfirmDialog` → Undo | Bayar = **pengeluaran kas** (baris `expense`); hapus tagihan **tidak** mengembalikan uang |
| Aset investasi | ✅ `addInvestment()` | ✅ `/wealth` tab Investasi | ✅ `editInvestment()`, `updateInvestmentPrice()` | ✅ `deleteInvestment()` + `restoreInvestment()` (paket 61) | `/wealth` kartu aset → Hapus → `ConfirmDialog` → Undo | **Nol** — halaman Kekayaan tidak menyentuh kas; yang berubah Net Worth |
| Hutang / piutang | ✅ `addDebt()` | ✅ `/wealth` tab Hutang (dua arah) | ✅ `editDebt()` (pokok + sisa) | ✅ `deleteDebt()` + `restoreDebt()` (paket 61) | `/wealth` kartu hutang (aksi Edit/Hapus terlihat) → `ConfirmDialog` → Undo | Bayar/terima = **kas bergerak** (`debt_payment`/`receivable_payment`); hapus catatan **tidak** menghapus baris kas |
| Kategori kustom | ✅ panel Pengaturan | ✅ panel Pengaturan | ✅ (emoji + nama) | ✅ **DIPERBAIKI (62)**: `ConfirmDialog` + Undo 5 dtk (sebelumnya sekali klik langsung hilang, tanpa konfirmasi & tanpa Undo) | `/settings/categories` → Hapus → dialog → Undo | **Nol** (daftar preferensi di perangkat, bukan uang) |
| Kategori bawaan | ✗ disediakan app | ✅ panel Pengaturan | ✅ **hanya tampil/sembunyi** | ✗ **sengaja**: hanya bisa disembunyikan — alasannya sekarang DITULIS di layar (62 · temuan audit #10): laporan & insight lintas bulan membandingkan per kategori | `/settings/categories` (toggle) | **Nol** |
| Transaksi /joint | ✅ `addJointTransaction()` | ✅ `/joint` (buku besar + timbangan) | ✅ `updateSplit()`, `setPaidBy()`, `renameJointWallet()` | ✅ per baris `deleteJointTransaction()` + `restoreJointTransaction()` (paket 61) | `/joint` baris → Hapus → Undo | **Nol untuk kas pribadi** (kantong bersama tidak menyentuh `lib/money/store.ts`); yang berubah saldo patungan & settlement |
| Properti & aset fisik | ❌ | ❌ | ❌ | ❌ | tab `/wealth` → kartu penjelas | **Tidak dihitung** di Total Kekayaan (rumusnya: kas + investasi + piutang − hutang). Dinyatakan apa adanya di UI (62) |

**Bukti tiap klaim (file:line):** `lib/money/store.ts` (`removeWalletAccount`, `restoreWalletAccount`, `walletRecordCount`, `liveWalletSeeds`, `isAccountEmpty`) · `lib/supabase/money-remote.ts` (`deleteRemoteWallet`) · `app/api/wallets/[id]/route.ts:56` (endpoint yang dipanggil) · `components/catetind/wallet-screen.tsx:382,387,413,1021-1027,1081-1112` · `components/catetind/wallet-detail-screen.tsx:361,386,657-666,729-753` · `components/catetind/settings-panel-preferences.tsx` (`confirmDeleteCategory`, `ConfirmDialog`) · `lib/data/category-prefs.ts` (`removeCategory`, `restoreCategory`) · `lib/money/export.ts` (`removedWalletIds`, `removed`) · `components/catetind/wealth-screen.tsx` (`PROPERTY_V1_COPY`) · `docs/handoff/laporan/60-…md` (status ⏳ — dasar baris ❌ Budget & Celengan).

## 4. SEBELUM → SESUDAH (angka)

Semua angka di bawah **bukan estimasi**: tiap baris bisa direproduksi dengan perintah di kolom terakhir (`pnpm exec vitest run lib/money/wallet-delete.test.ts` dsb), dan invariant diperiksa langsung oleh `assertLedgerInvariant` di dalam test.

| Yang diukur | Sebelum | Sesudah | Cara reproduksi |
|---|---|---|---|
| **Hapus dompet berisi riwayat → Total Saldo** (Tunai opening 50.000, satu catatan "Parkir" −20.000 → saldo Tunai 30.000) | Total Saldo **Rp 1.830.000** · dompet hidup **3** · Riwayat **1 catatan** | Total Saldo **Rp 1.800.000** (turun Rp 30.000 — tepat sebesar saldo Tunai) · dompet hidup **2** · Riwayat **tetap 1 catatan** | test "dompet BERISI catatan…" |
| **Hapus dompet berisi riwayat → saldo dompet LAIN** | BCA Rp 1.450.000 · GoPay Rp 350.000 | BCA **Rp 1.450.000** · GoPay **Rp 350.000** (selisih **Rp 0**) | idem |
| **Hapus dompet → invariant ledger** | Σ baris −20.000 = Σ saldo 1.830.000 − Σ opening 1.850.000 ✓ | Σ baris −20.000 = Σ saldo 1.830.000 − Σ opening 1.850.000 ✓ — **commit diterima, tidak ada penulisan yang ditolak**; `Σ saldo` tetap memuat dompet yang di-tombstone | idem (helper `assertStillBalanced`) |
| **Hapus dompet tanpa riwayat → Total Saldo** | Rp 1.850.000 · dompet hidup 3 | Rp 1.800.000 · dompet hidup 2 · `walletBalance('tunai')` tetap 50.000 (dibaca laporan & ekspor) | test "dompet tanpa riwayat…" |
| **Undo hapus dompet** | — | Rp 1.800.000 → **Rp 1.850.000**, dompet hidup 2 → **3**, kartunya balik di `/wallet` & deck Home; Undo kedua (setelah jendela) **ditolak** | test "Undo mengembalikan…" & "Undo yang tidak sah…" |
| **Hapus dompet → rujukan yatim?** | — | Log "Pindah Dana Terakhir" tetap berbunyi **BCA → GoPay** (dulu akan kosong: "Pindah ke "). Pemilihan dompet BARU (bayar tagihan, koreksi saldo, pindah dana, catat dari konteks) **menolak** dompet yang sudah dihapus; `postExpense`/`postIncome`/`postBalanceAdjustment`/`postTransfer` mengembalikan `null` tanpa menulis baris. Sisa yang jujur: setoran celengan lama yang dompetnya tidak ada di daftar sumber jatuh ke label **"Dompet"** (perilaku lama `walletSourceName`, tidak berubah oleh paket ini) | test "log pindah dana…" & "pagar tulis…" |
| **File ekspor** | `schemaVersion` **3** · tanpa `removedWalletIds` · `totals.cash` Rp 1.850.000 | `schemaVersion` **4** · `removedWalletIds: ['tunai']` · `wallets[tunai].removed: true` · `totals.cash` **Rp 1.800.000** (= `cashTotal()` di app) · 1 baris `limits` baru | test `lib/money/export.test.ts` |
| **Notice kosong-akun** (tema audit #3) | Tidak muncul walau semua dompet dihapus: `wallets.length` tetap 3 karena tombstone | Muncul: `isAccountEmpty()` = true (dompet hidup 0 & catatan yang tampil 0) | test `isAccountEmpty…` |
| **Kategori kustom → hapus** | Sekali klik langsung hilang — tanpa dialog, tanpa Undo | `ConfirmDialog` (menyebut nama + "Catatan yang sudah kamu simpan tidak ikut berubah") → hapus → Undo 5 dtk → kategori balik **di posisi semula**; hapus kategori bawaan **ditolak** (`isRemovableCategory` false) | test `lib/data/category-prefs.test.ts` |
| **Jumlah test repo** | **618 test / 39 file** (baseline laporan 61) | **644 test / 41 file** (+26 kasus, +2 file) | `pnpm test` |

### Setelah Hapus Akun: apa yang KOSONG & apa yang (sengaja) MASIH TAMPIL

| Bagian | Setelah `deleteAccount()` | Bukti / alasan |
|---|---|---|
| Dompet, baris ledger, **tombstone dompet & baris** | **Kosong** — `getMoneySnapshot()` = `{ wallets: [], rows: [], removedIds: [], removedWalletIds: [] }` | `lib/account.ts` → `purgeMoneyStore()`; test `lib/account.test.ts` ("BUKTI ISI PENYIMPANAN…", "Hapus Akun juga membuang tombstone DOMPET…") |
| Kekayaan (hutang/piutang/investasi/pembayaran), tagihan, celengan, kantong bersama | **Kosong** (laporan purge menyebut jumlahnya) | `purgeWealthStore()`, `purgeBillsStore()`, `purgeFundsStore()`, `purgeJointStore()` (paket 50/51/52) |
| Konfigurasi uang user (pemasukan, cicilan, gajian, periode) | **Kosong + ditandai `purged`** | `purgeUserMoneySettings()` (paket 57) |
| Penanda `catet*` (tema, kategori kustom, nudge, konteks uang, privasi, PIN, undangan) | **Kosong** — disapu berdasarkan awalan, bukan daftar nama | `purgeStorageKeys()`; test `lib/account.test.ts` |
| Pemakaian AI & antrean undangan (memory) | **Kosong** | `resetAiUsageStore()`, `resetInviteStore()` |
| **SENGAJA masih tampil: data contoh repo di halaman yang belum dipindah ke store** — yaitu `/budget` (daftar budget dari konstanta `INITIAL_BUDGETS`) & `/calendar` (entri contoh) | **Masih tampil** | Paket **60 belum dikerjakan** (laporan 60 masih ⏳). Halaman ini memakai konstanta `lib/data/*` sebagai sumber daftar, jadi setelah Hapus Akun pun mereka masih menampilkan contoh. Dinyatakan apa adanya — bukan diklaim bersih |
| **Sengaja masih tampil: kartu Properti & Aset Fisik** | **Masih tampil** sebagai kartu penjelas (tanpa data) | PRD Decision A12 (di luar V1); copy-nya sekarang menyatakan bahwa aset fisik belum bisa dikelola & belum dihitung |

## 5. Test

| File test | Jumlah kasus | Hasil |
|---|---|---|
| `lib/money/wallet-delete.test.ts` **(baru)** | 12 | ✅ semua lulus |
| `lib/data/category-prefs.test.ts` **(baru)** | 10 | ✅ semua lulus |
| `lib/money/export.test.ts` (+2 kasus dompet terhapus & Undo) | 11 (dari 9) | ✅ semua lulus |
| `lib/account.test.ts` (+2 kasus tombstone dompet & `isAccountEmpty`) | 14 (dari 12) | ✅ semua lulus |
| `lib/analytics.test.ts` (katalog 6 → 7 event) | 6 | ✅ semua lulus |
| `lib/money/bills-store.test.ts` (`schemaVersion` 4) | 34 | ✅ semua lulus |
| `lib/money/store.test.ts`, `lib/money/store-remote-merge.test.ts` (fixture `removedWalletIds`) | 60 & 6 | ✅ semua lulus |
| **Seluruh repo** | **644 test / 41 file** | ✅ **0 gagal, 0 `.skip`** |

## 6. Validasi (output apa adanya)

```bash
$ pnpm test
 Test Files  41 passed (41)
      Tests  644 passed (644)
   Duration  2.41s

$ pnpm exec tsc --noEmit
(0 error)

$ pnpm build
▲ Next.js 16.3.3 (Turbopack)
✔ Compiled successfully in 780ms
  Running TypeScript ...
  Finished TypeScript in 1686ms ...
✔ Generating static pages using 19 workers (34/34) in 587ms
(Route table 37 route dicetak; /api/wallets/[id] tetap "Dynamic")
build exit=0

$ pnpm theme:audit
> node scripts/theme/audit-palette.mjs
✔ palet bersih — 350 file diperiksa, tidak ada warna di luar palet.
```

Catatan mesin (sama dengan AUDIT §2): pnpm lokal 9.12.0 sementara `package.json` menulis
`packageManager: pnpm@12.3.4` — perintah di atas jalan apa adanya tanpa flag tambahan di sesi ini
(tidak perlu `--config.manage-package-manager-versions=false`).

## 7. Batas jujur

1. **Tidak ada uji browser / 375 px & 1440 px di laporan ini.** Lingkungan kerja ini tidak punya browser, jadi yang terverifikasi adalah test murni + `tsc` + `build`. Langkah klik yang bisa diikuti penguji: (a) buka `/wallet` → titik tiga pada kartu → **Hapus dompet** → dialog menyebut jumlah catatan & nominal saldo → **Hapus dompet** → toast dengan tombol **Undo** (5 dtk) → **Undo** mengembalikan kartunya; (b) buka `/wallet/bca` → tombol **Hapus dompet** di bar aksi bawah → dialog → Hapus dompet → user diantar ke `/wallet` (Undo tetap bekerja dari sana); (c) `/settings/categories` → **Hapus** pada kategori kustom → dialog → Undo; (d) tab **Properti** di `/wealth` → kartu penjelas baru.
2. **Perbedaan semantik server ⇄ perangkat pada hapus dompet (BUKAN bug yang disembunyikan).** `DELETE /api/wallets/:id` memanggil `removeWallet()` (`app/api/wallets/store.ts:160`) yang menghapus baris `wallets`; di database, `ledger_rows` punya FK `on delete cascade` ke `wallets` **dua kali** (`wallet_id` **dan** `counter_wallet_id` — `supabase/migrations/20260927120000_catetind_core.sql:103-104`). Artinya di sisi server baris ledger yang menyentuh dompet itu ikut terhapus, sedangkan di perangkat ini barisnya **sengaja dipertahankan** (tombstone-based, kanon §4.5: "yang dihapus dompetnya, bukan uangnya"). Konsekuensi yang tidak bisa diverifikasi di sini (tidak ada sesi Supabase dari lingkungan ini): untuk baris pindah dana yang menyebut dompet terhapus sebagai **dompet lawan**, saldo dompet lawan di sisi server bisa lebih tinggi daripada sisi klien. Ini pola divergensi yang SUDAH ada sebelumnya untuk `removeRow()` (klien menyimpan tombstone, server menghapus barisnya via `deleteRemoteRow`) dan terdeteksi oleh `assertRemoteAggreement()` di console. Usulan produksi (belum dikerjakan karena butuh keputusan pemilik repo & migrasi baru): kolom `removed_at` di `wallets` (soft delete) atau ubah FK `counter_wallet_id` jadi `on delete set null` supaya barisnya tidak ter-cascade.
3. **`PUT /api/wallets/:id` (ganti nama/nomor/konteks dompet) tetap nol pemanggil UI.** Prompt 62 hanya meminta jalur HAPUS dompet; aksi "ubah" dompet sekarang hanya koreksi saldo (Smart Sync). Dicatat di MATRIKS sebagai ⚠️, bukan diklaim selesai.
4. **Baris yang menyentuh dompet terhapus tetap tampil di Riwayat.** Itu keputusan konservatif paket ini (kanon §4.5 + audit "jangan pernah membuang baris ledger"): uang yang sudah keluar tetap terlihat, dompetnya saja yang tidak ada di daftar. Konsekuensinya jujur & disebut di dialog: *"Uang yang sudah keluar TIDAK kembali, dan catatannya tetap ada di Riwayat."*
5. **`/budget` dan `/calendar` masih memakai konstanta `lib/data/*`** (paket 60 belum dikerjakan) — jadi baris Budget kategori & Celengan di MATRIKS ❌ dan tabel "masih tampil setelah Hapus Akun" menyebutnya apa adanya.
6. **Klaim panel kategori yang dulu tidak benar, saya koreksi.** `SettingsPanel` kategori dulu berbunyi *"Atur kategori apa saja yang muncul saat kamu mencatat transaksi"* — padahal daftar `catet-category-prefs` **tidak** dibaca oleh pemilih kategori di form (form memakai `TRANSACTION_CATEGORY_OPTIONS`, dicek dengan grep: key itu hanya dipakai di `settings-panel-preferences.tsx`). Perbaikannya: kalimatnya diganti + `storageNote` menyatakan batas itu apa adanya. Ini pekerjaan kecil yang berada di jalur yang sama dengan §1 prompt ("jelaskan alasannya di UI"), bukan fitur baru.
7. **Tidak ada perintah git yang dijalankan** (sesuai larangan AUDIT §7): semua perubahan paket ini hidup di working tree, siap direview sebagai diff.

## 8. Pertanyaan terbuka

Tidak ada yang saya tebak: yang ambigu di bawah ini diambil dengan pilihan **paling konservatif** (dan asumsinya sudah ditulis di §7), tapi tetap layak diputuskan pemilik repo:

1. **Bentuk hapus dompet di sisi SERVER.** Paket ini memanggil endpoint yang sudah ada (`DELETE /api/wallets/:id`), dan di database baris ledger yang menyentuh dompet itu **ter-cascade**. Kalau produk ingin riwayat uang tetap utuh di server juga, butuh keputusan: kolom `removed_at` (soft delete) vs FK `counter_wallet_id` → `on delete set null`. Ini perubahan skema, jadi harus lewat migrasi baru + keputusan pemilik repo (AUDIT §1.12).
2. **Baris milik dompet terhapus di Riwayat**: sekarang tetap tampil (keputusan konservatif, §7.4). Alternatifnya memberi penanda kecil di barisnya, mis. "BCA (dompet dihapus)" — itu perubahan copy lintas halaman, jadi saya tidak melakukannya diam-diam.
3. **Paket 60 (Budget & Celengan) belum dikerjakan**, jadi dua baris MATRIKS masih ❌. Saya memilih **tidak** mengerjakan 60 di dalam 62 (prompt 60 punya DoD & laporan sendiri, dan AUDIT §9 melarang melompat paket) dan menyatakannya apa adanya. Kalau mau MATRIKS-nya penuh centang, urutannya: paket 60 dulu → laporan 60 → perbarui baris Budget & Celengan di laporan ini.
4. **Ganti nama/nomor/konteks dompet** (`PUT /api/wallets/:id` sudah ada, UI belum). Mau dijadikan paket kecil tersendiri? Sekarang user hanya bisa mengoreksi saldonya.
5. **"Pindahkan dulu lalu hapus"** saat dompet masih bersaldo: paket ini menawarkannya sebagai kalimat + aksi "Pindah Dana" tepat di sebelah tombol Hapus (satu klik lagi untuk user). Kalau produk ingin satu tombol yang memindahkan seluruh saldo lalu menghapus, itu alur baru + copy baru — belum dikerjakan tanpa keputusan.

