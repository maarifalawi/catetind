# Laporan 50 — Satu Store untuk Kekayaan (Hutang, Piutang, Investasi, Aset)

**Status:** selesai diimplementasikan & divalidasi · **Paket:** temuan **D** laporan 46 · **Fase 13**
· **Depends on:** paket 47 (`scope` di model) · **Menutup:** `wealth-screen.tsx:95-98`, enam handler
`setInvestments/setDebts/setPayments`, ekspor `/settings/data` & `/help`, dan alur "Hapus Akun"
untuk domain kekayaan.

> Ringkas: `/wealth` **berhenti memegang salinan datanya sendiri**. Tiga `useState(INITIAL_*)` di
> dalam halaman diganti **`lib/money/wealth-store.ts`** (store modul + `useSyncExternalStore` +
> persist IndexedDB key **`wealth`**, resep yang sama dengan celengan di paket 46). Semua tulisan
> (tambah hutang, catat bayar/terima, update harga, edit & hapus aset) kini satu pintu, dan pembaca
> lintas halaman — bar Net Worth, **ledger kas** (`/wallet`, Riwayat), **file ekspor**
> (`/settings/data` & `/help`), sampai **Hapus Akun** — membaca keadaan yang sama.

---

## 1. Bukti gap (audit 28 Sep 2026) → status

| # | Bukti (lokasi lama) | Status | Bukti perbaikan |
|---|---|---|---|
| 1 | `wealth-screen.tsx:107-110` `useState(INITIAL_INVESTMENTS / INITIAL_DEBTS / INITIAL_DEBT_PAYMENTS)` | ✅ FIXED | diganti `useWealthStore()` — 0 sisa `useState(INITIAL_*)` di halaman |
| 2 | `:183,217,251,280,304,384` enam handler menulis `setInvestments/setDebts/setPayments` | ✅ FIXED | `addInvestment`, `updateInvestmentPrice`, `editInvestment`, `deleteInvestment`, `addDebt`, `settleDebt` |
| 3 | `lib/money/export.ts:215-218` ekspor membaca `INITIAL_DEBTS`/`INITIAL_DEBT_PAYMENTS`/`INITIAL_INVESTMENTS` | ✅ FIXED | `collectExportSources()` membaca `getWealthSnapshot()` (§2.5) |
| 4 | `lib/data/help.ts:750-752` ekspor Pusat Bantuan membaca konstanta | ✅ FIXED | `buildHelpExportPayload(now, funds, wealth)`; `help-center-screen.tsx` mengoper snapshot store |
| 5 | Perubahan hilang setelah refresh | ✅ FIXED | persist IndexedDB key `wealth` (bentuk record: §5 + `laporan/bukti/50-wealth-record-contoh.json`) |
| 6 | "Hapus Akun" tidak membersihkan kekayaan | ✅ FIXED | `purgeWealthStore()` + `debtsCleared`/`investmentsCleared`/`debtPaymentsCleared` di `PurgeReport` |
| 7 | `wealth-net-worth-bar.tsx:56` benar, tapi masukannya dari state halaman | ✅ FIXED | masukannya kini snapshot store + `cashTotal()` (kas tetap milik `lib/money/store.ts`) |

Bar yang baru lunas di Debt Snowball juga ikut diselamatkan: status `settled` sekarang berlaku
**seketika** (data tersimpan), jadi animasi "mencair" + confetti ditahan di lapis tampilan (§2.4).

---

## 2. Keputusan desain & alasannya

### 2.1 Bentuk state & ruang id sebelum hidrasi
State: `{ investments, debts, payments, hydrated }`. Nomor id memakai **satu penomoran bersama**
dengan awalan daftarnya (`inv-6`, `debt-7`, `pay-8`), dan sebelum hidrasi memakai **ruang tinggi
≥ 1.000.000** (`debt-1000000`) — persis alasan funds-store: penulisan bisa terjadi sebelum
IndexedDB selesai dibaca, dan id yang dihitung dari daftar seed (`1`…`5`) bisa menabrak id data
tersimpan user, sehingga `mergeWealthState()` harus membuang salah satunya. Dikunci test
"catatan yang lahir SEBELUM hidrasi tetap ikut & tidak terduplikasi".

### 2.2 `settleDebt()` = pembungkus, bukan salinan logika
Urutannya sengaja dan dipatok test: (1) rencana pelunasan dari `planDebtSettlement()`; (2) **baris
kas** lewat `postDebtSettlement()` (`lib/money/store.ts` — satu-satunya debit/kredit kas pelunasan,
paket 41); (3) baru catatan hutang berubah (`applySettlement`), riwayat `debt_payments` bertambah,
catatan kembalian lahir (`changeDebtFrom`), dan progres tenor platform naik. `null` = ditolak dan
**tidak ada satu pun bagian yang ditulis**.
Konsekuensi yang sengaja: Net Worth tidak pernah naik hanya karena melunasi (aturan laporan 41) —
diuji ulang dari kedua store, bukan dari konstanta.

### 2.3 Penjaga idempotensi (lubang lama yang ditutup)
Sebelum paket ini, submit kedua untuk aksi yang sama mengembalikan baris kas lama yang **idempoten**,
sementara `setDebts()` tetap mengurangi sisa hutangnya → satu pembayaran dihitung dua kali di
catatan. Sekarang `settleDebt()` membentuk kunci dari **aksinya**
(`debt-<id>-<arah>-<tanggal>-<nominal>`) dan menolak bila baris dengan kunci itu sudah ada.
Karena kuncinya memakai nominal, pembayaran berikutnya (nominal/tanggal berbeda) tetap bisa dicatat
— lebih longgar daripada kunci lama (`debt-<id>-<tanggal>` yang memblokir semua pembayaran lain di
hari yang sama).

### 2.4 Perayaan pelunasan tetap utuh
Status `settled` kini tersimpan seketika, jadi bar snowball-nya **tidak bisa** menghilang sebelum
animasinya terlihat. Jalan keluarnya bukan menahan data di halaman, tapi:
`wealth-screen` menyetel `celebrateId` selama `SETTLE_DELAY` → `snowballRows(debts, keepId)` menahan
hutang yang baru lunas tetap digambar (bar olive penuh + confetti + kolaps) → `WealthHutang`
menghitungnya sebagai "belum kosong" (`melting`) supaya kartu perayaan "Semua hutangmu LUNAS!" baru
muncul setelah animasinya selesai. Ritmenya sama seperti sebelum paket ini, tanpa satu pun salinan
data di komponen. Hutang personal tidak terpengaruh: confetti-nya memang level section.

### 2.5 Ekspor mengikuti pola paket 46
`collectExportSources()` membaca `getWealthSnapshot()` (langsung di `lib/money/export.ts`, sama
seperti celengan). `buildHelpExportPayload()` tetap **fungsi murni** — snapshot kekayaan dioper
sebagai argumen opsional dengan default seed, karena `lib/data/*` tidak menyentuh store React.
Batas jujur di dalam file ekspor ikut diperbarui (menyebut store kekayaan), dan test memastikan
ekspor memuat hutang **dan** investasi yang baru dicatat, plus baris kas + riwayat pembayaran dari
pelunasan.

### 2.6 Hapus Akun
`purgeDeviceData()` memanggil `purgeWealthStore()` **setelah** database IndexedDB dihapus (urutan
yang sama dengan uang & celengan), dan melaporkan tiga angka baru. Catatan: `clearMoneyState()`
menghapus **database** `catetind-money`, jadi key `wealth` ikut bersih tanpa kode tambahan — angka
di laporan hanya bukti, bukan syarat kebersihannya.

### 2.7 Yang SENGAJA tidak dilakukan
- **Saldo dompet tidak disimpan di store kekayaan** — kas tetap milik `lib/money/store.ts`;
  kekayaan hanya menulis lewat `postDebtSettlement()`.
- **Rumus Net Worth tidak disentuh** (`netWorthParts`, `activeDebtRemaining`, `cashDirectionOf`,
  `activeReceivableTotal`): yang berubah cuma dari mana daftarnya datang.
- **`deleteDebt()` menghapus catatan + riwayat pembayarannya, TIDAK baris kasnya**: uang yang sudah
  berpindah tangan itu fakta, dan menghapus catatan hutang tidak mengembalikannya.
- **Tidak ada dependency, endpoint, atau tabel baru**; tidak ada data kekayaan di `localStorage`.
- **Daily HUD Home tetap memakai `TOTAL_INSTALLMENTS`** (`lib/data/budget.ts`, kanon paket 27) —
  jadi menambah hutang platform di `/wealth` belum mengubah "Jatah Hari Ini". Itu keputusan paket 27
  yang lebih besar dari paket ini dan **tidak** diubah diam-diam; dicatat sebagai batas di §7.

---

## 3. File yang dibuat & diubah

| File | Perubahan |
|---|---|
| `lib/money/wealth-store.ts` *(baru)* | store modul: `{ investments, debts, payments, hydrated }`, `commit`/`persist` (IndexedDB key `wealth`), `idOf()` + ruang tinggi pra-hidrasi, `mergeWealthState()`, API tulis (`addInvestment`, `updateInvestmentPrice`, `editInvestment`, `deleteInvestment`, `addDebt`, `editDebt`, `deleteDebt`, `settleDebt`), selector (`useWealthStore`, `investmentById`, `debtById`, `paymentsOf`), `purgeWealthStore()`, `resetWealthStore()` |
| `lib/money/wealth-store.test.ts` *(baru)* | 21 test murni: pintu tulis & selector, `settleDebt` (sebagian, piutang, lebih bayar, ditolak, idempotensi), ekspor, hidrasi, purge, bentuk record perangkat |
| `lib/money/idb.ts` *(diubah)* | `WEALTH_STATE_KEY = 'wealth'` + komentar "tiga key di satu database" |
| `lib/money/export.ts` *(diubah)* | `collectExportSources()` baca `getWealthSnapshot()`; `limits` menyebut store kekayaan |
| `lib/money/store.test.ts` *(diubah)* | describe baru: rantai bukti tambah hutang → Net Worth + `moneyExportJson()`; `settleDebt` dari BCA → saldo/riwayat/sisa/Net Worth |
| `lib/money/export.test.ts` *(diubah)* | reset store kekayaan tiap kasus + test "ekspor memuat hutang yang benar-benar dimiliki user" |
| `lib/data/wealth.ts` *(diubah)* | `snowballRows(debts, keepId?)` — menahan satu bar yang baru lunas (beserta alasan di komentar) |
| `lib/data/help.ts` *(diubah)* | `buildHelpExportPayload(now, sinkingFunds, wealth)` (default seed, tetap murni) |
| `lib/account.ts` *(diubah)* | `purgeWealthStore()` + `debtsCleared`/`investmentsCleared`/`debtPaymentsCleared` |
| `lib/account.test.ts` *(diubah)* | assert jumlah kekayaan yang ikut hilang + regresi privasi `mergeWealthState({ purged: true })` |
| `components/catetind/wealth-screen.tsx` *(diubah)* | 3 `useState(INITIAL_*)` dihapus; semua handler lewat store; perayaan menyetel/melepas `celebrateId` |
| `components/catetind/wealth-hutang.tsx` *(diubah)* | `snowballRows(debts, celebrateId)` + `melting` (kartu LUNAS menunggu animasi selesai) |
| `components/catetind/help-center-screen.tsx` *(diubah)* | Pusat Bantuan mengoper snapshot kekayaan ke payload ekspor |
| `docs/handoff/laporan/bukti/50-wealth-record-contoh.json` *(baru)* | bukti bentuk record `wealth` yang benar-benar ditulis |
| `docs/handoff/laporan/50-store-kekayaan-lintas-halaman-laporan.md` *(baru)* | laporan ini |

Tidak ada komponen baru, endpoint baru, dependency baru, maupun tabel Supabase baru.

---

## 4. Rantai bukti (dijalankan sebagai test, bukan klaim)

| Skenario | Hasil yang diukur |
|---|---|
| Tambah hutang **Rp 1.000.000** di `/wealth` | `activeDebtRemaining` +1.000.000; Net Worth (dihitung dari **kedua** store) turun tepat 1.000.000; `moneyExportJson()` memuat catatan itu dan `counts.debts` bertambah 1 |
| Tambah aset (10 × Rp 500.000, fee Rp 1.000) | `totalInvested` 5.001.000, `currentValue` 5.000.000, Net Worth +5.000.000 |
| `updateInvestmentPrice` | `totalPortfolioValue()` berubah sebesar Δ harga × jumlah unit; `isStale` → false |
| `settleDebt` **Rp 500.000 dari BCA** | saldo BCA 1.450.000 → 950.000; `cashTotal` turun 500.000; baris pertama Riwayat "Bayar Kredivo / Tagihan / 27 Sep"; `payment` baru (`kind: 'debt'`); sisa hutang turun 500.000; **Net Worth tetap** |
| Terima piutang Rp 150.000 ke BCA | kas +150.000, piutang aktif → 0, baris "Terima dari Rina", Net Worth tetap |
| Lebih bayar Rp 250.000 untuk hutang Rp 200.000 (GoPay) | kembalian Rp 50.000 jadi catatan `owed_to_me` dengan `scope` warisan (`bersama`); Net Worth tetap |
| Submit ulang aksi yang sama | ditolak (`null`): kas **dan** catatan tidak bergerak; pembayaran dengan nominal berbeda tetap lolos |
| Ditolak: saldo kurang / dompet asing / catatan tidak ada / nominal 0 | tidak ada baris ledger, sisa hutang & saldo tidak berubah |
| Hapus akun | `debtsCleared=5`, `investmentsCleared=4`, `debtPaymentsCleared=3`; store kosong; `mergeWealthState({ purged: true })` tetap kosong |
| Ekspor | hutang + investasi baru ikut; pelunasan menghasilkan baris kas **dan** riwayat bayar di file |

---

## 5. Bentuk state di IndexedDB (key `wealth`)

- **Database** `catetind-money` · **object store** `state` · **key** `wealth`
  (`WEALTH_STATE_KEY` di `lib/money/idb.ts`) — database yang SAMA dengan uang (`snapshot`) &
  celengan (`funds`), supaya satu "Hapus Akun" membersihkan semuanya.
- Record ditulis utuh setiap perubahan (`persist()`): `{ version, investments, debts, payments,
  purged }` — JSON polos tanpa class/Map, siap dikirim HTTP di produksi.
- `version` naik kalau bentuknya berubah; bentuk asing/lama diperlakukan sebagai "belum ada"
  sehingga data seed tetap dipakai, dan `purged: true` membuat data contoh **tidak** pernah kembali.

Contoh record nyata (skenario: tambah hutang Dita Rp 1.000.000 → lunasi Kredivo Rp 500.000 dari BCA)
tersimpan di `docs/handoff/laporan/bukti/50-wealth-record-contoh.json` — diambil dengan menjalankan
probe di lingkungan test (jalur memory yang sama dengan app saat IndexedDB diblokir). Isinya:
`version: 1`, `purged: false`, `investments: 4`, `debts: 6` (5 seed + 1 baru), `payments: 4`
(3 seed + 1 baru), plus catatan hutang baru (`debt-1000000`), hutang Kredivo yang tersisa
Rp 2.000.000 dengan `currentMonth: 3`, dan baris pembayaran `pay-1000001`.

---

## 6. Validasi (dijalankan, hasil apa adanya)

```bash
pnpm theme:audit          # ✔ palet bersih — 325 file diperiksa, tidak ada warna di luar palet
pnpm exec tsc --noEmit    # 0 error
pnpm test                 # 30 file · 411 test hijau (23 test baru paket ini)
pnpm build                # ✓ Compiled successfully (exit 0), semua route ter-render
```

Smoke test produksi (`next start -p 3012`, hasil apa adanya dari SSR HTML):

| Route | Status | Bukti di HTML |
|---|---|---|
| `/wealth` | 200 | judul `Kekayaan & Hutang`, bar Net Worth **`Rp 14.699.330`**, total aset **`18.149.330`**, tab Investasi terisi (`Bibit Reksadana Pasar Uang`, `BBCA`, `Bitcoin`, `Emas Antam`) |
| `/settings/data` | 200 | halaman ekspor terbuka (file-nya baru dibuat saat tombol diklik) |
| `/help` | 200 | Pusat Bantuan terbuka |
| `/wallet` | 200 | halaman dompet terbuka |

Catatan: isi tab yang **tidak** aktif tidak ada di HTML awal — nama provider hutang (`Kredivo`) dan
kartu `Debt Snowball Tracker` baru dirender setelah tab "Hutang" dibuka (perilaku lama yang tidak
diubah, bukan tanda data hilang).

---

## 7. Hal yang belum bisa diverifikasi (batas jujur)

1. **Perilaku IndexedDB di browser sungguhan** (mode privat, kuota penuh, dua tab) belum diuji di
   perangkat — yang diuji adalah jalur logikanya (persist + `mergeWealthState` + purge) dan jalur
   memory yang sama yang dipakai app saat IndexedDB diblokir.
2. **Tidak ada sinkronisasi antar-perangkat** — sama seperti dua store lain; di produksi barulah
   `insert/update` ke tabel `investments`/`debts`/`debt_payments`.
3. **Daily HUD Home belum ikut hutang platform** (kanon `TOTAL_INSTALLMENTS`, paket 27) — menambah
   hutang platform di `/wealth` belum mengubah "Jatah Hari Ini". Keputusan itu milik paket 27, bukan
   paket ini.
4. **Belum ada UI untuk `editDebt()`/`deleteDebt()`** — dua pintu itu diminta paket ini dan sudah
   diuji di lapis data, tapi halaman Kekayaan belum punya tombol edit/hapus hutang (catatan hutang
   baru bisa dibetulkan lewat sheet berikutnya). Yang **sudah** ada di UI: tambah, catat
   bayar/terima, dan semua jalur aset (tambah/edit/update harga/hapus).
5. **Pesan sheet saat store menolak** masih satu kalimat ("Saldo … gak cukup untuk ini") untuk semua
   alasan penolakan — pada kasus langka submit-ulang, kalimat itu menyebut saldo, bukan duplikasi.
   Tidak diubah di paket ini supaya kontrak `onConfirm: boolean` di `wealth-hutang.tsx` tidak
   melebar; dicatat sebagai calon perbaikan.
6. **Belum diuji di browser dengan klik sungguhan** (animasi "mencair" + confetti selama
   `SETTLE_DELAY`) — yang diperiksa: kode jalur `celebrateId`/`melting` + `keepId` di
   `snowballRows()` dan build produksi yang memuat kelas/animasinya.
7. **Angka demo tidak bergeser**: Net Worth 14.699.330 & total aset 18.149.330 tetap sama seperti
   sebelum paket ini (diverifikasi ulang di HTML `/wealth`), `INITIAL_DEBTS`/`INITIAL_INVESTMENTS`/
   `INITIAL_DEBT_PAYMENTS` tidak disunting.

