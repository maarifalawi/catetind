# Laporan 55 — Alur Pindah Dana Dibuat Jelas & Jalur "Ngambang" Ditutup

**Status:** selesai diimplementasikan & divalidasi · **Paket:** temuan uji pemakaian 28 Sep 2026 · **Fase 13**
· **Depends on:** paket 47 (badge konteks) · **Berkaitan dengan:** 49 (kalender), 53/54 (engine input)

> Ringkas: pindah dana sekarang **satu alur tiga langkah** — *dari dompet mana → ke dompet mana →
> berapa* — dan alur itu dibuka dari **empat pintu** (popover kartu di `/wallet`, tombol di
> `/wallet/[id]`, menu "Lainnya" di bottom-nav, sidebar desktop). Semua pintu memakai **satu**
> komponen (`TransferFlow` → `TransferSheet`) dan **satu** jalur tulis
> (`useTransferSubmit()` → `postTransfer()`), jadi tidak ada modal transfer kedua.
> Jalur "transfer ngambang" ditutup di **tiga lapis**: chip `Transfer` hilang dari engine input,
> `postTransaction()` **menolak** `type: 'transfer'` (return `null`, tanpa satu baris pun), dan
> pindah dana yang salah bisa **dibatalkan** dengan uangnya kembali ke KEDUA dompet.

---

## 1. Bukti gap (audit 28 Sep 2026) → status

| # | Bukti | Masalah | Status | Bukti perbaikan |
|---|---|---|---|---|
| 1 | `transaction-input-engine.tsx:140-146` chip `transfer` + `:566-572` submit `type:'transfer'` | chip "Transfer" menulis lewat `postTransaction()` yang **tidak punya dompet tujuan** → baris `transfer` lahir SATU SISI | ✅ FIXED (opsi b) | `TYPES` hanya berisi Pengeluaran/Pemasukan/Tabungan; `transaction-input-engine.tsx:169-187`. Tipe yang sudah terlanjur jadi (baris lama) tetap tampil lewat `RETIRED_TYPES` di mode edit |
| 2 | `lib/money/ledger.ts:17-21,81-88` | invariant mewajibkan baris `transfer` seimbang → tulisan satu sisi ditolak/dilempar, user tidak dapat apa pun setelah "Catat" | ✅ FIXED | pagar ditambahkan di **`postTransaction()`** (`store.ts:1151`): `type: 'transfer'` → `null`, tanpa menulis apa pun. Uji: `store.test.ts` "pagar pindah dana di jalur catatan umum" |
| 3 | `wallet-detail-screen.tsx:410` | halaman detail dompet hanya menyebut "pindah dana" di komentar — tidak ada tombolnya | ✅ FIXED | tombol "Pindah Dana" di bar aksi sticky (zona ibu jari) + `<TransferFlow source={wallet}/>`; `wallet-detail-screen.tsx:494-521` |
| 4 | `cashflow-calendar-screen.tsx:177-196` tipe `money_movement` "Pindah dana" menulis CATATAN saja | catatan yang mengaku pindah dana tanpa perpindahan dana | ✅ FIXED (ditegaskan) | `CALENDAR_NOTE_TYPES = ['expense','income']` (paket 49) **+** pagar store (paket 55) menutup jalur lain; komentar jujur tentang entri demo `money_movement` ada di `lib/data/calendar.ts:805-823` |
| 5 | `MobileBottomNav.tsx` + `desktop-sidebar.tsx` | tidak ada pintu "Pindah Dana" | ✅ FIXED | entri "Pindah Dana" di menu "Lainnya" (kelompok "Aksi Cepat") & di sidebar desktop (grup "Kelola Uang") |

**Akar masalahnya satu:** satu aksi punya beberapa pintu, tapi **tidak ada satu pun pintu yang tahu
kedua ujung uangnya**. Form input manual tahu dompet asal saja, kalender tahu tanggal saja, dan
popover kartu dompet — yang justru sudah benar — tersembunyi di menu titik tiga di dalam kartu.
Akibatnya aksi terasa "ngambang": chip tersedia, tapi hasilnya tidak masuk akal (uang keluar tanpa
mendarat) atau tidak bisa ditemukan (pintunya tidak kelihatan).

---

## 2. Keputusan desain & alasannya

### 2.1 Chip "Transfer" **DIHAPUS** dari engine (prompt poin 2 — opsi b)

Dua pilihan yang ditawarkan prompt: (a) chip menutup engine lalu membuka `TransferSheet`, atau
(b) chip dihapus & pintunya diletakkan di tempat yang wajar. **Dipilih (b)**, alasannya:

1. **Opsi (a) memindahkan masalah, bukan menutupnya.** Engine tidak tahu dompet asal yang benar:
   yang ia punya cuma `sourceLabel` (string) dari shell. Untuk membuka sheet dengan asal yang benar,
   *setiap* shell (bottom sheet FAB, modal web, kalender, joint, onboarding) harus ikut tahu daftar
   dompet + memilih asal — artinya logika pindah dana bercabang ke lima tempat, dan salah satu pasti
   tertinggal.
2. **Pindah dana bukan "tipe catatan".** Form ini mencatat SATU dompet; pindah dana adalah operasi
   dua dompet. Menaruhnya sebagai salah satu chip di antara "Pengeluaran/Pemasukan/Tabungan" membuat
   user mengira ia mengisi form yang sama (padahal dua pertanyaan wajibnya tidak ada di sana).
3. **Pintu yang wajar sudah jelas dan bisa dilengkapi**: kartu dompet (dua ujungnya diketahui),
   halaman dompet detail (asal diketahui), dan menu "Lainnya"/sidebar (user memilih asalnya di
   langkah 1 sheet) — semuanya memakai sheet yang sama.

Yang **wajib** dari prompt tetap dipenuhi: tidak ada lagi jalur yang bisa menulis baris transfer
tanpa tujuan — dijaga tiga lapis (§2.6).

### 2.2 Satu alur tiga langkah, langkahnya MUNCUL berurutan

Urutan yang dipakai semua pintu: **dari dompet mana → ke dompet mana → berapa** (+ tanggal hari ini,
+ catatan opsional) → ringkasan `Rp 250.000 · BCA → GoPay` → tombol **"Pindah Rp 250.000"**.
Langkah 2 & 3 dibungkus `RevealStep`, jadi user selalu tahu ia di langkah ke berapa — itu yang
membuat alur ini bisa dijelaskan dalam satu kalimat dan berhenti terasa "ngambang".

Dua perubahan perilaku kecil di sheet, keduanya demi kejelasan:

* **Tujuan tidak pernah ditebak kalau kandidatnya lebih dari satu.** Sebelumnya sheet otomatis
  memilih dompet tujuan PERTAMA; dengan tiga dompet, saldo bisa pindah ke dompet yang tidak pernah
  dipilih user. Sekarang otomatis hanya kalau kandidatnya memang cuma satu (dompetnya cuma dua).
* **Nama aksi diseragamkan jadi "Pindah Dana"** (sebelumnya sheet berjudul "Pindah Saldo" sementara
  menu lain menyebut "pindah dana"). PRD 2A.6 melarang satu aksi punya dua nama; PRD 2A.4 sendiri
  menyebutnya pindah dana.

### 2.3 Kategori baris = `'Transfer'` (kanon, bukan karangan)

`postTransfer()` dulu menulis kategori **`'Pindah Dana'`** — label yang **tidak ada** di
`TRANSACTION_CATEGORY_OPTIONS`, jadi baris pindah dana mustahil terjaring filter kategori apa pun di
Riwayat. Sekarang store memakai `WALLET_TRANSFER_LOG_COPY.transferCategory` (`'Transfer'`) — satu
konstanta yang sudah ada dan memang salah satu nilai kanon. Konstanta kembar `'Pindah Dana'` di
`lib/data/wallet-detail.ts` **dihapus** supaya tidak ada dua "kebenaran" kategori.

### 2.4 Membatalkan pindah dana: tombstone **+ dua baris koreksi** (prompt poin 6)

Prompt meminta pembatalan lewat jalur hapus, dan meminta bukti kedua saldo kembali. Fakta repo yang
harus dihormati: **tombstone tidak mengembalikan uang** (kanon paket 46/49/51 — "yang dihapus
barisnya, bukan uangnya"; `removeRow` cuma menandai, `balancesOf` tetap menghitung barisnya).

Karena itu `cancelTransferRow(id)` (baru, `lib/money/store.ts`) melakukan **dua** hal dalam satu
panggilan:

1. menulis **tombstone** baris `transfer`-nya (hilang dari Riwayat/Home/dompet, server ikut
   menghapusnya) — persis hapus catatan biasa;
2. menulis **dua baris `balance_adjustment` bertanda**: `+nominal` ke dompet asal dan `−nominal` ke
   dompet tujuan, dengan nama yang menjelaskan dirinya sendiri ("Batal pindah ke GoPay" / "Batal
   terima dari BCA"), kategori `Koreksi Saldo`.

Mesin ledger **tidak disentuh** (`walletDelta`, `netEffect`, invariant apa adanya) — yang berubah
hanya baris yang ditulis, dan Σ pengaruhnya nol sehingga kas total tidak bergerak.

Dua keputusan tepi yang diambil sadar:

* **Ditolak kalau uangnya sudah terpakai di dompet tujuan** (`saldo tujuan < nominal` → `null`, dan
  **tidak** ada yang dihapus/ditulis). Membalikkan uang yang sudah dibelanjakan akan membuat saldo
  dompet itu MINUS — dan dompet/e-wallet Indonesia tidak bisa minus; itu klaim palsu tentang uang
  user. Yang terjadi: barisnya **tidak** dibatalkan, jadi tidak ada klaim yang bohong.
* **Undo = pembalikan ulang, bukan pencabutan tombstone.** Dialog konfirmasi hapus menjanjikan
  *"masih bisa dibalikin lewat tombol Undo selama 8 detik"*, jadi janji itu wajib benar untuk baris
  pindah dana juga. Karena tombstone tidak memindahkan uang, `undoTransferCancellation()` menghidupkan
  kembali baris pindah dananya **dan** menulis pasangan koreksi baru ("Pindah ke GoPay dipulihkan").
  Efeknya: saldo, kas total, dan catatan kembali seperti sebelum dibatalkan, sementara Riwayat
  menampilkan **cerita lengkapnya** (batal → dipulihkan), bukan jejak yang dihapus. Ini konsekuensi
  jujur dari ledger append-only, dan diuji di `store.test.ts`.

### 2.5 Badge konteks untuk tujuan lintas konteks (prompt poin 5)

`WalletAccount` sekarang membawa `context` (sebelumnya hanya hidup di `WalletSeed`/`Wallet`), jadi
sheet bisa memberi tahu saat tujuan berada di konteks uang lain: daftar "Pindah antar konteks uang —
Total Saldo tetap sama, yang pindah cuma dompet yang menampungnya". Pindah antar konteks **tidak**
dilarang (uangnya tetap milik user yang sama); yang dilarang adalah terjadi tanpa user sadar.

### 2.6 Tiga lapis pagar supaya "ngambang" tidak bisa kembali

| Lapis | Di mana | Perilaku |
|---|---|---|
| 1 | chip di engine input (`transaction-input-engine.tsx`, `ai-capture-bubble.tsx`, `onboarding-step-first-transaction.tsx`) | `transfer` tidak lagi ditawarkan |
| 2 | `hooks/use-transaction-capture.ts` (`confirmCapture`) | hasil ucapan yang terdengar "transfer" **ditahan** dengan kalimat + tautan ke alur Pindah Dana (`AI_CAPTURE_COPY.needTransferFlow`), bukan disimpan sepihak |
| 3 | `lib/money/store.ts` → `postTransaction()` | `type: 'transfer'` → `null`, **tanpa satu baris pun** — pagar yang tidak bisa dilewati jalur/shell baru mana pun |

Catatan: `saving` (setoran celengan) **tetap** satu sisi dan tetap boleh — itu memang aturannya
(celengan belum jadi dompet di ledger), dan diuji ulang sebagai pembanding.

### 2.7 Animasi & aksesibilitas

`RevealStep` (primitif langkah sheet yang dipakai alur ini) sekarang menghormati
`prefers-reduced-motion` (`useReducedMotion()`): langkahnya tetap muncul, gerak mengembangnya mati —
pola yang sama dengan `joint-balance-scale`/`shield-meter`. Perubahan ini otomatis berlaku untuk
semua sheet yang memakai `RevealStep` (tagihan, budget, hutang, goal, investasi, dompet, joint).


---

## 3. File yang dibuat & diubah

| File | Status | Isi |
|---|---|---|
| `components/catetind/transfer-flow.tsx` | **baru** | host SATU alur: baca dompet dari store (`walletAccounts`) → `useTransferSubmit()` → tutup sheet hanya kalau tulisannya benar-benar terjadi |
| `hooks/use-transfer-submit.ts` | **baru** | satu jalur tulis pindah dana: `postTransfer()` + toast 2 sisi (nominal ikut tombol mata) + penolakan yang menjelaskan |
| `components/catetind/transfer-sheet.tsx` | ditulis ulang | alur 3 langkah + pemilih asal (pintu "Lainnya") + tombol "Ganti dompet asal" + empty state dompet<2 + saldo 0 + badge konteks + ringkasan `Rp X · A → B` + tombol `Pindah Rp X` |
| `lib/data/add-wallet.ts` | diubah | `TRANSFER_SHEET_COPY` diperluas (langkah 1, empty state, saldo nol, konteks, pembatalan/undo, `submitFor`, `failed`), `TRANSFER_DOOR_COPY` (label pintu), `transferCategory` dijelaskan sebagai kategori kanon |
| `lib/data/wallet-detail.ts` | diubah | `transferCategory: 'Pindah Dana'` **dihapus** (label karangan), `WALLET_QUICK_ACTION_COPY.transferLabel/transferHint` |
| `lib/money/store.ts` | diubah | pagar di `postTransaction()`; kategori `'Transfer'`; `cancelTransferRow()` + `undoTransferCancellation()` (+ tipe `TransferCancellation`); `incomingTransfersFor()` |
| `lib/wallets.ts` | diubah | `WalletAccount.context` (dibawa `toWalletAccount`, default pratinjau di `createWalletAccount`) |
| `components/catetind/wallet-screen.tsx` | diubah | memakai `<TransferFlow/>` (jalur tulis & alur tidak lagi ditulis di halaman); label popover → "Pindah Dana" |
| `components/catetind/wallet-detail-screen.tsx` | diubah | tombol "Pindah Dana" + `<TransferFlow source={wallet}/>`; jalur hapus memakai `cancelTransferRow()` + Undo-nya; daftar catatan menyertakan sisi masuk pindah dana (`incomingTransfersFor`) |
| `components/MobileBottomNav.tsx` | diubah | entri "Pindah Dana" di menu "Lainnya" (kelompok "Aksi Cepat") + host `TransferFlow` |
| `components/catetind/desktop-sidebar.tsx` | diubah | entri "Pindah Dana" di grup "Kelola Uang" + host `TransferFlow` |
| `components/catetind/history-screen.tsx` | diubah | hapus di Riwayat memakai `cancelTransferRow()` + Undo menyeluruh |
| `components/catetind/recent-transactions-card.tsx` | diubah | hapus di kartu Home memakai `cancelTransferRow()` (baris `transfer` ikut mengembalikan uang) |
| `components/dashboard/transaction-input-engine.tsx` | diubah | chip `transfer` dihapus; `RETIRED_TYPES` untuk menampilkan tipe baris yang sudah ada di mode edit; komentar keputusan |
| `components/catetind/ai-capture-bubble.tsx` | diubah | `TYPE_ORDER` tanpa `transfer`; kartu konfirmasi mengarahkan ke alur Pindah Dana kalau parser mendengar "transfer" |
| `hooks/use-transaction-capture.ts` | diubah | `confirmCapture()` menahan draft `transfer` dengan pesan yang benar |
| `lib/ai-chat.ts` | diubah | `AI_CAPTURE_COPY.needTransferFlow` + `transferFlowCta` |
| `components/catetind/onboarding-step-first-transaction.tsx` | diubah | chip `transfer` dihapus (form 3 ketukan tidak punya tempat menanyakan dompet tujuan) |
| `lib/data/calendar.ts`, `lib/transaction-ai.ts` | diubah | komentar jujur: entri demo `money_movement` = pajangan; parser tetap mendengar "transfer" tapi jalur simpan ditahan |
| `components/catetind/budget-sheet.tsx` | diubah | `RevealStep` menghormati `prefers-reduced-motion` |
| `lib/money/store.test.ts` | diubah | +10 uji pindah dana (§7) |
| `lib/money/smoke-money-flow.test.ts` | diubah | 2 uji lamanya sekarang mengunci perilaku baru (transfer dari jalur catatan manual = ditolak) |


---

## 4. Pintu masuk akhir (satu aksi, satu alur)

| Pintu | Dompet asal | Berkas |
|---|---|---|
| **i.** Popover titik tiga di kartu dompet `/wallet` ("Pindah Dana") | sudah diketahui (kartu itu) | `wallet-screen.tsx` (`openTransfer`) → `TransferFlow` |
| **ii.** Tombol "Pindah Dana" di bar aksi sticky `/wallet/[id]` | sudah diketahui (dompet halaman itu) | `wallet-detail-screen.tsx` |
| **iii.** Menu "Lainnya" (bottom-nav) → kelompok "Aksi Cepat" | **belum** → sheet membuka langkah 1 (pemilih dompet) | `components/MobileBottomNav.tsx` |
| **iv.** Sidebar desktop → grup "Kelola Uang" → "Pindah Dana" | **belum** → langkah 1 | `components/catetind/desktop-sidebar.tsx` |

Pintu yang tahu asalnya **tidak** meminta user memilih dua kali (kartu asal langsung terisi + tombol
"Ganti dompet asal" kalau memang salah pilih). Pintu yang tidak tahu asalnya **tidak menebak**:
langkah pertamanya memilih dompet (menebak "dompet konteks aktif" bisa memindahkan uang dari dompet
yang salah).

## 5. Keadaan tepi yang harus ada & benar (prompt poin 5)

| Keadaan | Perilaku | Bukti |
|---|---|---|
| dompet < 2 | **empty state jujur** + CTA "Tambah dompet" → `/wallet`, tombol simpan disembunyikan | `transfer-sheet.tsx` (`needSecondTitle`/`needSecond`/`needSecondCta`) |
| tujuan = asal | tidak mungkin dipilih (tujuan selalu disaring dari asal); store juga menolak | `postTransfer` + uji "menolak pindah dana ke dompet yang sama" |
| nominal > saldo asal | tombol mati + kalimat yang menyebut sisa saldo | `TRANSFER_SHEET_COPY.overBalance` |
| saldo asal 0 | chip "Semua" nonaktif **+ kalimat penjelasan** (kontrol mati tidak dibiarkan tanpa sebab) | `TRANSFER_SHEET_COPY.emptyBalance` |
| tujuan di konteks uang lain | badge konteks per tujuan + catatan "pindah antar konteks uang, Total Saldo tetap sama" | `TRANSFER_SHEET_COPY.crossContextNote`, `WalletAccount.context` |
| sukses | toast 2 sisi (`nominal dari A ke B`) + baris "Pindah ke X" kategori **`Transfer`** di Riwayat, kartu Home, halaman dompet **asal** (keluar) & **tujuan** (masuk) | `useTransferSubmit`, `incomingTransfersFor`, `transferLogOf` |
| dibatalkan | baris hilang + dua baris koreksi bernama jelas; Undo mengembalikan catatan & uang | `cancelTransferRow`, `undoTransferCancellation` |
| uang sudah terpakai di tujuan | pembatalan **ditolak** (tanpa menulis apa pun) | `cancelTransferRow` → `null` |
| jalur mana pun yang mencoba menulis transfer tanpa tujuan | ditolak total | `postTransaction` → `null` |

## 6. Rantai bukti angka (dari uji otomatis, `lib/money/store.test.ts`)

```
sebelum   : BCA Rp 1.450.000 · GoPay Rp 350.000 · Total Rp 1.850.000
transfer  : Rp 250.000 BCA → GoPay            (postTransfer)
sesudah   : BCA Rp 1.200.000 · GoPay Rp 600.000 · Total Rp 1.850.000 (tidak berubah)
            + 1 baris "Pindah ke GoPay" (kategori 'Transfer') di Riwayat/Home/kedua halaman dompet

batalkan  : hapus baris itu dari Riwayat (cancelTransferRow)
            BCA Rp 1.450.000 · GoPay Rp 350.000 · Total Rp 1.850.000  ← kembali seperti semula
            + "Batal pindah ke GoPay" (+250.000) & "Batal terima dari BCA" (−250.000)

Undo      : undoTransferCancellation
            BCA Rp 1.200.000 · GoPay Rp 600.000 · Total Rp 1.850.000  ← kembali ke keadaan setelah transfer
            + "Pindah ke GoPay dipulihkan" & "Terima dari BCA dipulihkan"
```

## 7. Bukti jalur mati (tempelan hasil test)

```
$ npx vitest run lib/money/store.test.ts
 ✓ lib/money/store.test.ts (67 tests)

  · "menolak `type: transfer` di postTransaction tanpa menulis satu baris pun"
      → rows tetap 0, Total Saldo tetap Rp 1.850.000 (null, tanpa tulisan)
  · "menolak pindah dana ke dompet yang sama"           → null, rows 0
  · "menolak pindah dana melebihi saldo sumber"          → null, rows 0
  · "menolak membatalkan kalau uang pindahnya sudah terpakai di dompet tujuan" → null
  · "setoran celengan (`saving`) tetap boleh"            → baris satu sisi sah (regression guard)
  · "invariant ledger tetap lulus setelah seluruh kasus di atas" → assertLedgerInvariant() tidak melempar
```

`pnpm test` penuh: **506 test / 34 berkas lulus**.


---

## 8. Hasil validasi (apa adanya)

```bash
$ pnpm theme:audit
> node scripts/theme/audit-palette.mjs

✓ palet bersih — 336 file diperiksa, tidak ada warna di luar palet.

$ pnpm exec tsc --noEmit
(tanpa keluaran — tidak ada error)

$ pnpm test
 ✓ 34 berkas uji · 506 test lulus · 0 gagal

$ pnpm build
✓ Compiled successfully in 3.5s
✓ Generating static pages using 19 workers (34/34) in 672ms
(tanpa satu pun warning/error dari Next.js)
```

Dua uji lama di `lib/money/smoke-money-flow.test.ts` **diubah isinya** karena keduanya mengunci
perilaku yang justru sedang ditutup: dulu "transfer lewat jalur catatan manual tersimpan". Sekarang
keduanya membuktikan sebaliknya (transfer **ditolak** dari jalur itu, dan tidak ada baris yang
ditulis). Tidak ada test lain yang dilonggarkan.

## 9. Yang belum bisa diverifikasi (batas yang jujur)

* **Uji di perangkat sungguhan** (tap, geser, keyboard iOS/Android, animasi Vaul saat dua sheet
  bertumpuk ketika pintu dibuka dari menu "Lainnya") belum dijalankan — hanya build + test murni.
  Di repo ini tidak ada E2E/CI, jadi verifikasi visual hanya bisa dilakukan manual di browser.
* **`prefers-reduced-motion`** dihormati lewat `useReducedMotion()` (nilai React), bukan diuji
  otomatis; gerak Vaul sendiri di luar kendali komponen ini.
* **Simetri sisi masuk untuk baris pindah dana lawan:** halaman dompet tujuan kini menampilkan baris
  "Pindah ke X" (`incomingTransfersFor`), tapi ringkasan 30 hari & grafik dompet itu **tetap netral**
  terhadap pindah dana — itu memang aturan lama halaman dompet (`walletDelta` transfer = 0, "pindah
  dana tidak mengubah net worth"). Yang berubah hanya daftarnya, bukan rumus ringkasannya.
* **Entri demo `money_movement`** di `CALENDAR_ENTRIES` (seri "Setor Dana Darurat" deterministik)
  tetap tampil di kalender sebagai **pajangan** — sama seperti seluruh baris mock lain (kepala
  `lib/money/ledger.ts`). Ia tidak ditulis ke ledger dan bukan hasil aksi user; yang ditambahkan
  paket ini adalah komentar eksplisit di `lib/data/calendar.ts` + pagar store, supaya tidak ada lagi
  jalur MANA PUN yang membuat catatan "pindah dana" sungguhan tanpa perpindahan.
* **Transfer lewat Joint Wallet / setoran celengan** tidak disentuh: keduanya punya jalur & semantik
  sendiri (`joint-ledger`, `saving`), dan komentar di `joint-screen.tsx` tetap menunjuk
  `postTransfer()` kalau kelak uang bersama menyentuh kas pribadi.
* **Data offline/remote:** pembatalan & Undo ikut lewat `appendRow`/`removeRow`, jadi ia memakai
  antrean lokal & `DELETE` remote yang sama seperti baris lain — tetapi tidak ada backend Supabase
  yang aktif di lingkungan ini, jadi sinkronisasinya tidak diuji di sini.

## 10. Yang sengaja TIDAK diubah

* **Mesin ledger** (`walletDelta`, `netEffect`, `assertLedgerInvariant`) tidak disentuh sama sekali —
  paket ini hanya menambah baris & pagar di store, sesuai larangan prompt.
* **Popover kartu dompet di `/wallet`** tetap ada (hanya namanya diseragamkan jadi "Pindah Dana").
* **Kanon "hapus catatan ≠ uang kembali"** tetap berlaku untuk belanja/pemasukan. Yang khusus adalah
  baris pindah dana: ia menggerakkan dua dompet, jadi pembatalannya menulis pengembalian yang
  bernama — persis pola yang sudah dipakai paket 51 untuk "Batal bayar Kredivo".


## 11. Checklist manual sebelum melapor selesai (`CONTEXT-WAJIB` §8)

| Butir | Hasil |
|---|---|
| Halaman bisa dibuka tanpa error runtime; tanpa hydration mismatch | Sheet baru memakai pola snapshot yang sama (tanggal mock `WALLET_TODAY_ISO`, tanpa `new Date()` di render). Diverifikasi lewat `pnpm build` (34/34 halaman statis) — **belum** dicek di browser nyata |
| 375 px: tanpa horizontal scroll; aksi primer di zona ibu jari; bottom nav tidak menutupi konten | Tombol "Pindah Dana" di `/wallet/[id]` duduk di bar sticky `bottom-[5.5rem]` (pola yang sudah ada); bar-nya `flex-col` di mobile lalu `sm:flex-row`; sheet memakai `BudgetSheet` yang sudah aman di 375 px — **belum** dicek visual |
| 1440 px: grid rapi; sidebar desktop tidak hilang | Entri sidebar baru mengikuti kelas item lain (termasuk keadaan `collapsed` + `NavTooltip`) — **belum** dicek visual |
| Empty state (copy nurturing + CTA) & error state | dompet<2 → empty state + CTA "Tambah dompet"; saldo 0 → kalimat; nominal > saldo → kalimat "sisa saldo"; store menolak → toast `failed`. Semua teks dari `lib/data/*` |
| Semua tautan yang dibuat/diubah menuju route yang ADA | satu tautan baru: CTA "+ Tambah dompet" → `/wallet` (ada); tautan di kartu AI capture → `/wallet` (ada) |
| `prefers-reduced-motion` dihormati pada animasi baru | `RevealStep` kini memakai `useReducedMotion()` (durasi 0) |
| A11y dasar | `role="radiogroup"` + `aria-label` di pemilih asal & tujuan (state dibaca `aria-checked`), `aria-current` di nav (sudah ada), fokus terlihat (ring fokus sheet), kontras mengikuti palet kanon |
| Tidak ada string copy hardcoded di JSX | seluruh teks baru berasal dari `lib/data/add-wallet.ts` & `lib/ai-chat.ts` (termasuk judul kelompok "Aksi Cepat") |

