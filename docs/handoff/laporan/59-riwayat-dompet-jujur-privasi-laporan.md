# Laporan 59 — Riwayat & Dompet: kalibrasi nyata, hapus semua, scoping, sensor rapi

**Status:** ✅ SELESAI — diimplementasikan & divalidasi (28 Sep 2026) · **Paket:** 59
**Prompt:** `docs/handoff/prompts/59-riwayat-dompet-jujur-privasi.md`
**Konteks wajib:** `docs/handoff/CONTEXT-WAJIB.md` + `docs/handoff/AUDIT-UANG-2026-09.md`

> Ringkas: sumber "angka bohong" di Riwayat & Dompet dicabut dari akarnya.
> (a) `TOTAL_TRANSACTIONS = 24` / `HEALTH_SCORE = 72` / tiga kalimat insight
> ber-angka keras diganti hitungan atas catatan user — kalau tidak bisa dihitung,
> kartunya tidak muncul (bukan muncul dengan angka contoh). (b) Section "Catatan"
> kini punya **Hapus semua riwayat** lewat SATU pintu tulis (`removeRows`) dengan
> dialog yang menyebut jumlah + fakta bahwa **saldo tidak kembali**. (c) Halaman
> dompet hanya menampilkan catatan dompet ITU (`walletId`, bukan nama) dan
> jendela "30 hari" benar-benar 30 hari dari hari ini. (d) Konteks "Bersama"
> tidak lagi memotong saldo dompet "Tunai" — penulisannya ditolak dengan arahan.
> Validasi: **603 test / 39 file** hijau, `tsc` 0 error, `build` sukses,
> `theme:audit` "palet bersih".

## 1. Ringkas (3–5 baris)

- **59.1** — kartu hero & insight tidak lagi bicara di atas konstanta. Jumlah
  transaksi = baris sesi + baris seed yang belum dihapus tombstone (demo: 16).
  Skor kewarasan DIHITUNG dari rasio pemasukan vs pengeluaran
  (`financialHealthScore`); `null` (tidak bisa dihitung) kalau data < 30 atau
  belum ada pemasukan — dan keadaan itu dijawab kartu kalibrasi/penjelasan,
  bukan angka 72. 0 catatan ⇒ tidak ada kartu kalibrasi maupun insight: satu
  empty state jujur + CTA.
- **59.2** — `removeRows()`/`restoreRows()` di `lib/money/store.ts` (satu commit,
  tombstone yang sama, idempoten) + tombol **Hapus semua** di kepala section
  "Catatan" + `ConfirmDialog` yang menyebut jumlah catatan, cakupan, dan
  "saldo dompet TIDAK ikut berubah". Undo memakai `UNDO_WINDOW_MS` yang sudah ada.
- **59.3** — `/wallet/[id]` mengumpulkan baris lewat `walletId`/`counterWalletId`
  (`walletTransactionsOf`, `incomingTransfersFor`) — pencocokan by-NAME dihapus,
  jadi dua dompet bernama sama tidak bisa saling menampilkan catatan. Jendela
  "Ringkas 30 Hari" dihitung mundur dari hari ini (paket 57), bukan dari catatan
  terbaru; kalau jendelanya kosong, itu dikatakan.
- **59.4** — `defaultWalletNameFor('bersama')` menjawab `''` (bukan `'Tunai'`),
  `postTransaction` menolak dompet kosong, dan `useTransactionSubmit` memberi
  pesan jujur + arahan tanpa menutup panel (draft user tidak hilang).
- **59.5** — satu pola lebar terkunci: `<LockedAmount/>` (dua lapis teks di satu
  sel grid, titik sensor rata kiri tanpa tracking). Dipakai kartu dompet, chip
  likuiditas /wallet, dan tiga nominal Jatah Hari Ini yang sebelumnya
  diganti-string lewat `hide(fmt(...))`.

## 2. File yang dibuat/diubah

| # | File | Perubahan | Alasan |
|---|---|---|---|
| 1 | `lib/data/history.ts` | `HEALTH_SCORE` & `TOTAL_TRANSACTIONS` **dihapus**; tambah `countHistoryTransactions`, `savingsRatePct`, `financialHealthScore`, `healthCardState`, `HEALTH_SCORE_BANDS`/`healthScoreBand`, `HEALTH_CARD_COPY`, `HISTORY_NO_DATA_COPY`, `buildHistoryInsights` + `INSIGHT_MIN_*` + `HISTORY_INSIGHT_HREF` + `INSIGHT_CARD_COPY`, `HISTORY_CLEAR_ALL_COPY`/`HISTORY_CLEAR_ALL_TOAST`, `TRANSACTION_NO_WALLET_COPY`; komentar aturan dompet default diperbarui | 59.1, 59.2, 59.4 — semua angka & copy di lapis data (aturan repo: copy user-facing tinggal di `lib/data/*`) |
| 2 | `lib/money/store.ts` | `defaultWalletNameFor()` → `''` untuk konteks tanpa dompet; pagar dompet kosong di `postTransaction()`; API **baru** `removeRows()` + `restoreRows()`; API baru `walletTransactionsOf()` | 59.4, 59.2, 59.3 — satu pintu tulis; identitas baris = `walletId` |
| 3 | `hooks/use-transaction-submit.ts` | Guard "belum ada dompet": tolak tulis + toast arahan, panel TIDAK ditutup; dompet dibaca dari draft/fallback | 59.4 |
| 4 | `components/catetind/locked-amount.tsx` **(baru)** | `<LockedAmount/>` — pola lebar terkunci (grid 2 lapis, titik rata kiri, `motion-reduce`) | 59.5 |
| 5 | `components/catetind/wallet-card-face.tsx` | `MaskedAmount` jadi delegasi ke `LockedAmount` (nama & tanda tangan dipertahankan) | 59.5 |
| 6 | `components/catetind/daily-hud-card.tsx` | Tiga `hide(fmt(...))` → `<LockedAmount/>`; formatter lokal `toLocaleString` diganti `formatIDR()` | 59.5 + aturan formatter uang |
| 7 | `components/catetind/wallet-screen.tsx` | Chip likuiditas hero: `masked ? MASKED_AMOUNT : value` → `<LockedAmount/>` | 59.5 |
| 8 | `components/catetind/history-screen.tsx` | Hitungan transaksi nyata, skor/rasio nyata, insight dari data, empty state 0-catatan, tombol + dialog **Hapus semua**, Undo massal, heatmap tidak dirender saat 0 catatan | 59.1, 59.2 |
| 9 | `components/catetind/financial-health-card.tsx` | Tiga wujud dipisah DATA (`calibrating` / `no-income` / `ready`), gauge menampilkan skor HASIL HITUNGAN + kalimat hasil dari rasio nyata; copy pindah ke `HEALTH_CARD_COPY`; blok "belum ada pemasukan" + CTA catat pemasukan | 59.1 |
| 10 | `components/catetind/insight-cards.tsx` | Komponen murni tampilan: menerima `insights` hasil `buildHistoryInsights`; angka keras, ambang, dan copy keluar dari file ini | 59.1 |
| 11 | `components/catetind/wallet-detail-screen.tsx` | Baris lewat `walletId` (+ transfer masuk), `today` dioper ke ringkasan & sparkline, kartu sabar hanya saat `0 < n < 7`, catatan "jendela kosong", CTA catat mengikat dompet halaman | 59.3 (+ 59.4) |
| 12 | `lib/data/wallet-detail.ts` | `walletWindow(txs, todayIso)`, `walletSummary30d(txs, todayIso)`, `walletSparkline(wallet, txs, todayIso)`; copy `WALLET_PERIOD_COPY.emptyWindow` | 59.3 — judul "30 hari" tidak boleh berbohong |
| 13 | `components/dashboard/transaction-bottom-sheet.tsx` | Prop `walletName` (dompet yang sudah jelas dari halaman) → sumber tulis DAN `sourceLabel` di sheet | 59.3/59.4 — CTA dompet baru tidak boleh menulis ke dompet lain |
| 14 | `components/catetind/cashflow-calendar-screen.tsx` | Label dompet di sheet kalender jujur saat konteks belum punya dompet (`TRANSACTION_NO_WALLET_COPY.sourceFallback`) | 59.4 |
| 15 | `lib/data/history.test.ts` | +18 kasus (hitungan transaksi, ambang 30, skor hanya saat bisa dihitung, 0 data, insight dari angka nyata) | 59.1 |
| 16 | `lib/money/store.test.ts` | Harapan `defaultWalletNameFor('bersama')` `'Tunai'` → `''` (dengan alasan tertulis) + 9 kasus baru (5 hapus massal, 4 konteks tanpa dompet) | 59.2, 59.4 |
| 17 | `lib/data/wallet-detail.test.ts` **(baru)** | 13 kasus: dompet baru kosong, dua dompet nama sama, transfer masuk hanya di tujuan, baris tanpa `walletId`, tombstone, `applyRowOverride`, jendela 30 hari dari hari ini, ringkasan & sparkline | 59.3 |
| 18 | `docs/handoff/laporan/59-riwayat-dompet-jujur-privasi-laporan.md` | Laporan ini (stub diisi) | DoD paket |

**File yang DILARANG diubah & tidak disentuh:** `lib/money/ledger.ts` dan rumus
`balanceOf` — tidak ada satu baris pun yang berubah di sana. `CONTEXT-WAJIB.md`,
`AUDIT-UANG-2026-09.md`, dan seluruh prompt juga tidak diubah. Tidak ada
dependency baru (`package.json` tidak berubah).
## 3. Yang dikerjakan (per item prompt)

| # | Item | Hasil | Bukti |
|---|---|---|---|
| 59.1 | Kalibrasi & insight dari data nyata | Kartu hero memakai hitungan nyata (`countHistoryTransactions`), skor dihitung (`financialHealthScore`) dan bisa `null`; 0 catatan ⇒ kartu kalibrasi & insight **tidak dirender**, diganti empty state jujur + CTA + heatmap tidak dirender. Insight lahir dari `buildHistoryInsights()` (persen & kategori nyata), ambang tetap 5/10/7 tapi diukur dari catatan konteks aktif. `HEALTH_SCORE = 72` dan `TOTAL_TRANSACTIONS = 24` **dihapus** | `lib/data/history.test.ts` (26 kasus: hitungan, ambang 30, skor hanya saat bisa dihitung, 0 data, spike, rasio/kategori nyata, ambang bulanan) · `lib/data/history.ts` §skor & §insight · `history-screen.tsx` (blok turunan + blok hero) · `financial-health-card.tsx` · `insight-cards.tsx` |
| 59.2 | Tombol "Hapus Semua Riwayat" | `removeRows(ids)`/`restoreRows(ids)` = SATU commit untuk semua tombstone (idempoten, satu event analitik `kind: 'batch'`); tombol di kepala section "Catatan" (muncul hanya kalau ada catatan) + `ConfirmDialog` yang menyebut jumlah catatan, cakupan semua konteks, dan **saldo tidak kembali**; Undo 5 detik lewat `UNDO_WINDOW_MS` + `restoreRows` | `store.test.ts` describe "hapus massal riwayat (59.2)" (5 kasus: tombstone sesi+mock, idempoten, saldo tidak berubah, Undo memulihkan, hitungan jadi 0) · `store.ts` §hapus massal · `history-screen.tsx` (handler, tombol, dialog) |
| 59.3 | Detail dompet hanya dompet itu | `walletTransactionsOf(snapshot, walletId)` satu-satunya sumber baris ledger dompet + `incomingTransfersFor` untuk sisi masuk; **pencocokan by-name dihapus**; baris tanpa `walletId` tidak dipaksa masuk dompet mana pun. Jendela dipilih **opsi (a)**: 30 hari mundur dari hari ini (`walletWindow(txs, todayIso)`) — judul "Ringkas 30 Hari" jadi benar; jendela kosong diberi kalimat `WALLET_PERIOD_COPY.emptyWindow`. Dompet baru = 0 catatan; kartu sabar hanya saat `0 < n < 7` | `lib/data/wallet-detail.test.ts` (13 kasus) · `store.ts` §walletTransactionsOf · `wallet-detail.ts` §walletWindow · `wallet-detail-screen.tsx` (blok turunan, kolom kanan, empty state) |
| 59.4 | Bug konteks "Bersama" → "Tunai" | Dipilih **opsi (b)**: tolak menulis + pesan jujur & arahan. `defaultWalletNameFor('bersama')` = `''`; `postTransaction()` menolak `wallet` kosong (pagar di pintu tulis, berlaku untuk FAB/modal web/kalender/AI capture); `useTransactionSubmit()` menampilkan `TRANSACTION_NO_WALLET_COPY` dan **tidak** menutup panel (draft user aman). Sheet kalender menampilkan "Belum ada dompet di konteks ini" (bukan nama kosong) | `store.test.ts` describe "konteks tanpa dompet tidak memotong dompet lain (59.4)" (4 kasus) + kasus `defaultWalletNameFor` yang diperbarui · `store.ts` (postTransaction + defaultWalletNameFor) · `use-transaction-submit.ts` (guard) |
| 59.5 | Sensor nominal tanpa geser | SATU pola lebar terkunci `<LockedAmount/>` (dua lapis teks di satu sel grid → lebar = teks terpanjang; titik rata kiri tanpa tracking; angka asli tetap penentu lebar & `aria-hidden` saat tersensor). Dipasang di `MaskedAmount` (kartu dompet /wallet + hero /wallet/[id]), chip likuiditas /wallet, dan tiga nominal kartu Jatah Hari Ini yang dulu `hide(fmt(...))` | `components/catetind/locked-amount.tsx` · `wallet-card-face.tsx` (MaskedAmount) · `daily-hud-card.tsx` (3 nominal) · `wallet-screen.tsx` (LiquidityPill) |

### 59.1 — tiga keadaan (AC) & apa yang tampil

| Keadaan | Kartu hero | Insight AI | Heatmap |
|---|---|---|---|
| **0 transaksi** (semua catatan dihapus) | TIDAK dirender (dulu: "Kalibrasi 0/30") → diganti kartu `HISTORY_NO_DATA_COPY` + CTA "Catat Sekarang" | TIDAK dirender (dulu: 3 kartu ber-angka mock) | TIDAK dirender |
| **24 transaksi** (16 seed + 8 catatan sesi) | "Kalibrasi Profil AI" 24/30 = 80% (hitungan nyata, bukan konstanta 24) | hanya kartu yang angkanya bisa dihitung: `savings-rate` (rasio nyata) & `category-trend` (kategori nyata bulan berjalan); `spending-spike` TIDAK muncul karena belum ada jendela minggu sebelumnya | dirender |
| **≥ 30 transaksi** (16 seed + ≥14 catatan sesi) | GAUGE dengan skor HASIL HITUNGAN: `round(rate/50 × 100)`, mis. rasio 69% → 100 → "Sangat Sehat"; kalau belum ada pemasukan → blok "Skor belum bisa dihitung" + CTA | sama seperti di atas | dirender |

> Angka demo: `HISTORY_TRANSACTIONS` = 16 catatan (pemasukan Rp 7.500.000,
> pengeluaran + setoran Rp 2.357.900 → rasio sisih **69%**). Jadi pada data demo,
> begitu jumlah catatan menembus 30, gauge menampilkan **100** — angka hasil
> rumus yang bisa diperiksa, bukan `72` yang dikarang.

### 59.3 — judul periode (pilihan & alasannya)

Dipilih **(a) jendela dipaksa 30 hari mundur dari "hari ini"** (`todayISO()`,
hasil paket 57) karena: (1) itulah arti kalimat "Ringkas 30 Hari" bagi user —
jendela yang dihitung dari catatan terbaru pernah menampilkan rentang
"27 Sep – 28 Sep" dengan judul "30 Hari" (temuan audit); (2) "hari ini" sudah
punya SATU definisi di repo sejak paket 57, jadi tidak ada sumber kedua;
(3) konsekuensinya diterima dan dikatakan apa adanya: catatan seed yang lebih tua
dari 30 hari tidak ikut ringkasan, dan saat jendelanya kosong halaman menampilkan
kalimat `WALLET_PERIOD_COPY.emptyWindow` — bukan kartu angka nol.
## 4. SEBELUM → SESUDAH (angka)

| Yang diukur | Sebelum | Sesudah | Cara reproduksi |
|---|---|---|---|
| Kartu kalibrasi saat **0 transaksi** | "Kalibrasi Profil AI 0/30 transaksi · Kalibrasi 0%" + skor `HEALTH_SCORE = 72` siap dikirim + 3 kartu insight ber-angka mock | Kartu kalibrasi & insight **TIDAK ADA**; yang muncul kartu "Belum ada satu catatan pun di sini" + CTA Catat Sekarang; heatmap juga tidak dirender | Riwayat → **Hapus semua** → hero & insight kosong, CTA muncul |
| Kartu kalibrasi saat **24 transaksi** | `TOTAL_TRANSACTIONS = 24` (konstanta) → 24/30 = 80% walau user tidak punya 24 catatan | hitungan nyata `countHistoryTransactions({session, seedAlive})`; demo sekarang **16** → 16/30 = 53%; setelah user menambah 8 catatan → 24/30 = 80% | Riwayat → lihat progress kalibrasi; tambah catatan lewat FAB → persentasenya bergerak |
| Kartu/skor saat **≥ 30 transaksi** | GAUGE `score = HEALTH_SCORE` = **72** ("Cukup Sehat") — angka karangan | GAUGE `score = financialHealthScore(transactions)` → mis. demo (rasio 69%) = **100** "Sangat Sehat"; tanpa pemasukan → "Skor belum bisa dihitung" + CTA (bukan 72, bukan 0) | Tambah catatan sesi sampai total ≥ 30 → gauge muncul dari rasio nyata; kalau tidak ada pemasukan sama sekali → blok no-income |
| Jumlah catatan setelah **"Hapus semua"** | tidak ada tombolnya (harus hapus satu per satu) | **0** catatan di Riwayat (`recordedTransactions` kosong + 0 baris seed hidup) | Riwayat → Hapus semua → dialog menyebut "16 catatan akan keluar dari Riwayat…" → daftar kosong + empty state |
| Saldo dompet setelah hapus semua | (fitur belum ada) | **TIDAK berubah**: BCA Rp 1.450.000 · GoPay Rp 350.000 · Tunai Rp 50.000 · Total Rp 1.850.000 — sama sebelum & sesudah | Hapus semua → Home & /wallet menunjukkan angka yang sama; dikunci test "SALDO TIDAK BERUBAH". Undo memulihkan semuanya (test) |
| Jumlah catatan di dompet yang **BARU dibuat** | 0 dari mock, **tapi baris sesi bocor lewat pencocokan nama** (`tx.wallet === wallet.name`) | **0** dari ketiga sumber (mock per-id, `walletTransactionsOf`, `incomingTransfersFor`) | /wallet → Tambah dompet → buka detailnya → "Belum ada catatan di dompet ini" + CTA (test kasus 1) |
| Catatan dompet A bocor ke dompet B (dua **nama sama**) | BOCOR: baris A (`wallet: 'BCA'`) ikut tampil di dompet B karena namanya sama | **tidak bocor**: A 1 catatan, B 0 catatan; nama di barisnya tetap "BCA" tapi identitasnya `walletId` | /wallet → tambah dompet kedua bernama "BCA" → catat lewat halaman dompet pertama → halaman kedua tetap kosong (test kasus 2) |
| Dompet yang terpotong saat konteks **"Bersama"** | **Tunai** (dompet konteks Keluarga): Rp 50.000 → Rp 25.000 untuk catatan Rp 25.000, tanpa user memilihnya | **tidak ada dompet yang terpotong**: penulisan ditolak (`postTransaction` → `null`), Tunai tetap Rp 50.000, muncul toast "Catatan ini belum punya dompet" + arahan | Switcher konteks → "Bersama" → catat Rp 25.000 → toast arahan; /wallet tetap Rp 1.850.000 (test 59.4) |
| Posisi elemen saat **mata aktif** (per tempat) | kartu dompet: titik sensor `absolute inset-0 justify-center tracking-[0.18em]` → tidak di posisi angka; Jatah Hari Ini: `hide(fmt(...))` mengganti string → lebar teks berubah | lebar dikunci dua lapis grid; titik rata kiri persis di karakter pertama angka — **BELUM diukur di browser** (lihat §7) | tidak bisa dijalankan di lingkungan ini (tanpa browser) |
## 5. Test

| File test | Jumlah kasus | Hasil |
|---|---|---|
| `lib/data/history.test.ts` | 26 (8 lama + **18 baru**) | ✅ hijau |
| `lib/money/store.test.ts` | 76 (67 lama, 1 harapan diperbarui, **+9 baru**) | ✅ hijau |
| `lib/data/wallet-detail.test.ts` **(baru)** | **13** | ✅ hijau |
| **Tambahan paket 59** | **+40 kasus** (18 + 9 + 13) | ✅ hijau |

## 6. Validasi (output apa adanya)

```bash
$ pnpm test

 Test Files  39 passed (39)
      Tests  603 passed (603)
   Start at  22:16:14
   Duration  3.27s (import 49%, transform 44%, tests 5%, worker 1%)
```

```bash
$ pnpm exec tsc --noEmit

( tidak ada keluaran apa pun — 0 error )
tsc exit=0
```

```bash
$ pnpm build

✓ Compiled successfully in 1939ms
Route (app) — 39 route ter-generate, termasuk:
  ○ /            ○ /wallet        ○ /wealth       ○ /bills
  ƒ /history     ƒ /wallet/[id]   ƒ /budget       ƒ /calendar
  ƒ /api/wallets ƒ /api/wallets/[id]              ○ /settings/*

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

```bash
$ pnpm theme:audit

✓ palet bersih — 345 file diperiksa, tidak ada warna di luar palet.
```

**Baseline sebelum perubahan** (diukur di awal sesi ini):
`Test Files  38 passed (38)` — log baseline hanya menangkap jumlah FILE, bukan
jumlah kasus. Sesudah: 39 file / 603 kasus. Selisih +40 kasus berasal dari
18 + 9 + 13 kasus yang ditambahkan paket ini; angka baseline kasus (563) adalah
**turunan hitungan** dari selisih itu, bukan hasil menjalankan ulang versi lama
(`git stash`/`checkout` dilarang oleh §7 audit, dan kepala repo ini adalah
snapshot sebelum paket 57–62 — jadi `git show HEAD` pun bukan pembanding yang sah).
## 7. Batas jujur

- **Uji visual TIDAK dilakukan** (lingkungan kerja ini tidak punya browser). Klaim
  59.5 `sebelum == sesudah` TIDAK saya klaim sebagai terukur: yang bisa dibuktikan
  hanya rancangannya (dua lapis teks di satu sel grid → lebar kotak = teks
  terpanjang; titik `justify-self-start` tanpa `tracking`), lalu `pnpm theme:audit`
  + `pnpm build` membuktikan tidak ada kelas warna di luar palet & tidak ada error
  build. `getBoundingClientRect()` sebelum/sesudah, uji 375 px & 1440 px, kontras,
  dan hidrasi di perangkat belum diverifikasi.
- **Toast tidak ikut pola lebar terkunci**: toast lewat jalur string (`hide()` /
  `maskMoney`) dan hidup sebagai snapshot di DOM — menekan tombol mata TIDAK
  me-render ulang toast yang sedang tampil, jadi tidak ada pergeseran tata letak
  di sana. Kalau nanti toast dibuat reaktif terhadap `masked`, `<LockedAmount/>`
  harus dipakai di dalamnya juga (catatan untuk paket 62).
- **Sumbu-Y chart tidak saya ubah**: label sumbu di `cash-flow-card.tsx`
  ber-posisi absolut (`left-0` / `right-0`) sehingga panjang label tidak menggeser
  elemen lain — pergeseran hanya terjadi di dalam kotak labelnya sendiri, dan itu
  bukan elemen yang diukur AC 59.5. Kalau pemilik repo ingin labelnya ikut
  terkunci, tempatnya di `axisLabel()`.
- **Heatmap keborosan** tetap memakai data tergenerasi (pola yang sudah disahkan
  paket 47 sebagai satu-satunya permukaan tergenerasi di Riwayat); paket 59 hanya
  mematikannya saat 0 catatan. Kalau permukaan itu harus dihitung dari ledger
  juga, itu paket tersendiri.
- **`spending-spike` tidak akan muncul pada data demo**: kartunya butuh jendela
  7 hari sebelumnya, sementara seed hanya punya catatan 23–27 Sep. Itu perilaku
  yang diinginkan (tidak mengarang pembanding), tapi artinya kartu spike baru
  terlihat setelah user punya dua minggu catatan.
- **`defaultWalletNameFor()` kini bisa `''`** — pemanggil yang belum menangani
  `''` akan menampilkan label kosong. Yang sudah ditangani: dua shell input,
  kalender (`sourceFallback`), dan `bills-screen` (jatuh ke `walletOptions[0]`
  sambil MENAMPILKAN pemilih dompet ke user, jadi bukan penempelan diam-diam).
  `transaction-web-modal` (pintu input desktop) tidak menerima prop `walletName` —
  perilakunya benar (ikut konteks) tapi belum punya pengikat dompet seperti sheet
  mobile.
- **Event `transaction_deleted` bertanda `kind: 'batch'`**: nama event analitik
  repo ini dikunci tepat 6 oleh `lib/analytics.test.ts`, jadi hapus massal
  mengirim SATU event `transaction_deleted` bertanda `batch` — bukan N event
  (satu aksi user = satu event). Kalau audit ingin angka "berapa catatan dihapus",
  nama event baru harus ditambahkan ke katalog + testnya (belum dilakukan).
- **Perubahan harapan satu test lama**: `store.test.ts` "dompet default ikut
  konteks uang yang aktif" sekarang mengharapkan `''` untuk `'bersama'` (dulu
  `'Tunai'`). Test itu TIDAK dihapus/di-skip; maksudnya sama (menjaga aturan dompet
  default) dan alasan perubahan ditulis di komentar test-nya. Harapan lain (angka
  kanon Rp 1.850.000 dan saldo per dompet) tidak disentuh.
- **Tidak ada perintah git yang dijalankan** (`stash`/`checkout`/`restore`/
  `reset`/`clean`/`commit`/`switch`), jadi working tree paket 43–58 tetap utuh.
## 8. Tiga aturan warna keras dari CONTEXT-WAJIB §3 yang dipatuhi

1. **"Warna HANYA token palet. Dilarang hex baru / kelas Tailwind bawaan
   (`text-slate-500`, `bg-blue-600`, `text-white`, `bg-black`, dst)."**
   Semua kelas warna yang saya tulis memakai token palet yang sudah ada:
   `text-forest`, `text-cream`, `bg-forest`, `hover:bg-forest-soft`, `bg-cream`,
   `bg-sage`, `bg-mint`, `text-ink/45`, `text-plum`, `ring-plum/25`,
   `bg-plum/10`, `bg-hud-amber/25`, `text-hud-terracotta`, `ring-soil/12`.
   Tidak ada hex baru, tidak ada kelas bawaan Tailwind — dibuktikan
   `pnpm theme:audit`: **345 file diperiksa, 0 pelanggaran** (naik dari 343 file
   karena 2 file baru paket ini ikut dipindai: `locked-amount.tsx` &
   `wallet-detail.test.ts`).
2. **"Satu warna = satu makna. Hijau = uang masuk, terracotta = uang keluar,
   netral = pindah dana; aksi merusak memakai `plum`."** Tombol **Hapus semua**
   memakai `text-plum` + `ring-plum/25` + `hover:bg-plum/10` (aksinya merusak),
   sementara warna uang di kartu hero/insight tetap dari sumber lama `MONEY_TONE`
   (hijau masuk, terracotta keluar, netral pindah dana) — tidak ada warna baru
   untuk "skor".
3. **"Warna status tidak memakai merah; kondisi negatif ditandai
   terracotta/amber."** Band skor memakai token status Daily HUD
   (`bg-mint` / `bg-hud-sage/35` / `bg-hud-amber/25` / `bg-hud-terracotta/20`) dan
   insight "pengeluaran naik" / "pengeluaran lebih besar dari pemasukan" memakai
   tone `alert` (`bg-hud-amber/20 text-hud-terracotta`). Kartu "Skor belum bisa
   dihitung" memakai `bg-sage/35 ring-forest/10`; tidak ada `text-red-*`,
   `bg-red-*`, maupun merah hex di seluruh diff paket ini.

## 9. Pertanyaan terbuka

1. **Skala skor 0–100** saya definisikan sebagai pemetaan linier rasio sisih
   (0% → 0, 50% → 100, dijepit 0–100) karena PRD hanya menyebut "rasio pemasukan
   vs pengeluaran/hutang" tanpa rumus. Apakah pemilik repo ingin skala lain
   (mis. bobot hutang ikut dihitung dari `/wealth`), atau tetap rasio saja?
   Yang sekarang ada: SATU fungsi murni (`financialHealthScore`) + test, jadi
   penggantian rumusnya lokal.
2. **Hapus semua = seluruh konteks.** Saya memilih cakupan global (dan dialognya
   mengatakan "seluruh catatanmu, termasuk yang ada di konteks uang lain")
   karena AC menyebut "Riwayat / Home / kalender kosong". Kalau produk ingin
   tombol ini menyaring per konteks aktif, label & copy-nya perlu berbeda.
3. **`spending-spike` tanpa pembanding** — sekarang kartunya hilang. Alternatif
   produk: tampilkan kartu "Belum ada pembanding minggu lalu" (jujur, tapi
   menambah satu permukaan). Belum dilakukan.
4. **Baris tanpa `walletId`** (dompetnya belum ada di ledger) tidak muncul di
   halaman dompet mana pun, termasuk dompet dengan NAMA yang sama. Kalau produk
   ingin baris itu ikut terkelompok setelah dompetnya ditambahkan, perlu
   mekanisme relink eksplisit — bukan pencocokan nama otomatis yang baru dicabut.
5. **`transaction-web-modal`** (pintu input desktop) belum punya pengikat dompet
   seperti sheet mobile — relevan kalau nanti halaman dompet punya CTA versi
   desktop.