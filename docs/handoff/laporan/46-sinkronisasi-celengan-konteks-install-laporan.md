# Laporan 46 — Sinkronisasi Celengan, Konteks Uang di Desktop, & Layout `/install`

**Status:** selesai diimplementasikan & divalidasi · **Paket:** lanjutan audit sinkronisasi antar-halaman (temuan pemilik produk, 28 Sep 2026)

> Ringkas: **celengan impian sekarang punya SATU store** (`lib/money/funds-store.ts`) — kartu
> "Tabungan Impian" di Dashboard, halaman `/budget`, halaman detail `/budget/<id>`, widget
> Tanamanmu, Jatah Hari Ini, modal Target Bulanan, dan file ekspor membaca daftar yang sama,
> jadi satu celengan tidak bisa lagi punya dua progres. **Konteks uang Pribadi/Keluarga/Bersama
> kembali bisa dipilih di desktop** (switcher-nya dulu hanya ada di header mobile, sementara blok
> di Sidebar sudah dihapus → Dashboard & Budget tampak "cuma Pribadi"). **Halaman `/install`
> tidak lagi berlayout ponsel** di layar lebar: grid 12 kolom seperti halaman lain.

---

## 1. Tiga temuan yang dilaporkan (gejala → status)

| # | Gejala | Status | Bukti |
|---|---|---|---|
| 1 | "Tabungan Impian di dashboard belum sync ke menu lain" | ✅ **FIXED** | §2 — 3 sumber angka → 1 store; 13 test baru di `lib/money/funds-store.test.ts` |
| 2 | "Dashboard seharusnya ada 3 kategori (Pribadi/Keluarga/Bersama), sekarang cuma Pribadi" | ✅ **FIXED** | §3 — switcher konteks muncul di desktop; HTML Home & `/budget` memuat 2 switcher (mobile + desktop) |
| 3 | "Halaman install layoutnya jangan seperti mobile, kiri-kanan terlalu jauh" | ✅ **FIXED** | §4 — `mx-auto max-w-2xl` dicabut → `lg:grid-cols-12`; HTML `/install` memuat `lg:col-span-5` & `lg:col-span-7`, **0** sisa `max-w-2xl` |

---

## 2. Temuan #1 — Tabungan Impian belum sinkron

### Gejala teknis (3 sumber untuk satu celengan)

| Sumber | Dibaca oleh | Akibat |
|---|---|---|
| `INITIAL_SINKING_FUNDS` (konstanta) | kartu Tabungan Impian + widget Tanamanmu (Home) | Home tidak pernah berubah setelah user beraktivitas |
| `useState(INITIAL_SINKING_FUNDS)` di `BudgetScreen` | `/budget` | celengan baru hanya hidup di halaman itu |
| `useState` fund + riwayat di `GoalDetailScreen` | `/budget/<id>` | setoran tidak sampai ke `/budget` maupun Home |

Bukti gap yang ikut ditutup: `handleOpenFund()` di `/budget` menolak membuka celengan baru
dengan toast "Celengan barumu cuma ada di halaman ini 🌱" — jalan buntu di tautan yang app-nya
sendiri buat (dilarang kanon "jujur di setiap klaim", PRD 244).

### Solusi: satu store, pola yang sama dengan store uang

`lib/money/funds-store.ts` (baru) — `funds` + `contributions` + `hydrated`, API tulis
(`addFund`, `contributeToFund`, `sweepIntoFund`), persist IndexedDB key **`funds`** di database
`catetind-money` yang sama, hidrasi ditunda sampai pelanggan pertama (anti hydration mismatch),
`purgeFundsStore()` untuk "Hapus Akun". Selector: `fundById`, `contributionsOf`,
`useFundsStore`.

### Pembaca yang sekarang melewati store (satu daftar, satu progres)

| File | Perubahan |
|---|---|
| `components/catetind/my-goals-card.tsx` | `heroFundOf(funds)` / `sortFundsByUrgency(funds)` dari store |
| `components/catetind/plant-widget.tsx` | baris "nutrisi" tanaman dari `heroFundOf(funds)` |
| `components/catetind/daily-hud-card.tsx` | "Jatah Hari Ini" = `computeDailyHud({ sinkingFunds: funds })` (rumus sama dengan `/budget`) |
| `components/catetind/budget-screen.tsx` | tidak lagi punya `useState` funds: `addFund` / `contributeToFund` / `sweepIntoFund` |
| `components/catetind/goal-detail-screen.tsx` | `fundId` + store; setoran lewat `contributeToFund` (satu tulisan: progres, tahap, riwayat) |
| `app/budget/[id]/page.tsx` | metadata dari seed; badan halaman memutuskan "belum ada di perangkat ini" (bukan 404) |
| `components/catetind/monthly-target-card.tsx` | nama & saran celengan dari store (`monthlyNeeded` tetap dari lib/data) |
| `components/catetind/monthly-review-modal.tsx` | quick-pick celengan dari store (prop baru `TargetPanel.funds`) |
| `lib/money/export.ts` · `lib/data/help.ts` + `help-center-screen.tsx` | ekspor `/settings/data` & `/help` memuat celengan yang benar-benar dimiliki user |
| `lib/account.ts` | `purgeFundsStore()` + `fundsCleared` di `PurgeReport` |

### Detail keputusan

1. **`lib/money/idb.ts` digeneralisasi** (`loadDeviceState`/`saveDeviceState` + key per
   bagian). Dua key di SATU database: satu "Hapus Akun" tetap membersihkan semuanya, tanpa
   database kedua yang bisa terlupa.
2. **Id sebelum hidrasi memakai ruang tinggi (≥ 1.000.000)** supaya celengan yang ditanam
   sebelum IndexedDB selesai dibaca tidak pernah menimpa id data tersimpan (test khusus).
3. **Sapu Bersih mencatat baris riwayat bersumber `'sweep'`** (`CONTRIBUTION_SOURCES` baru di
   `lib/data/budget.ts`) — uangnya dari sisa limit kategori, bukan dari dompet, jadi riwayatnya
   tidak boleh menyebut BCA/GoPay. `CONTRIBUTION_SOURCES` sengaja tidak ikut jadi pilihan di
   sheet setor.
4. **Id URL yang belum dikenal tidak lagi 404** kalau berupa angka: 404 server mustahil
   mengetahui celengan lokal user. Keadaan "belum ada" + CTA kembali ditampilkan oleh screen
   (`FUND_DETAIL_COPY.notFoundBody/notFoundCta`); `/budget/abc` tetap 404.
5. **Copy baru masuk `lib/data`** (`FUND_CREATE_TOAST`, `FUND_SWEEP_TOAST`, notFound/loading) —
   tidak ada kalimat baru di JSX.
6. **Angka demo tidak bergeser:** daftar awal tetap `INITIAL_SINKING_FUNDS`, jadi
   `DAILY_HUD` (jatah Rp 200.000) tetap sama di Home & tab Bulanan (diverifikasi runtime).

---

## 3. Temuan #2 — konteks uang tidak bisa dipilih di desktop

**Gejala:** `ContextSwitcher` hanya dirender di header **mobile** (`lg:hidden`) di Home &
Budget, sementara blok "Konteks Uang" sudah dihapus dari Sidebar (keputusan task 06). Artinya
di layar ≥ 1024 px satu-satunya jejak konteks adalah chip bacaan "Pribadi" — user desktop tidak
punya cara pindah ke Keluarga/Bersama.

**Perbaikan:**

- `components/catetind/home-screen.tsx` — chip scope `MetaChip` (bacaan) **diganti** switcher
  sungguhan (`hidden w-[262px] lg:flex`) di baris chip; versi mobile tetap.
- `components/catetind/budget-screen.tsx` — switcher desktop ditambahkan di cluster aksi baris
  judul (`w-[280px]`), berdampingan dengan tombol mata.
- Komentar lama yang menyebut "switcher desktop ada di Sidebar" diperbarui (itu sudah tidak
  benar dan justru penyebab bug ini).

Alasan tidak sekalian menyaring semua halaman: **konteks tetap menyaring DAFTAR & ARUS, bukan
Total Saldo** (paket 44), dan deck dompet Home sengaja global. Penyaring konteks di
`/wallet`, `/history`, `/calendar`, `/bills`, `/wealth`, `/joint` belum ada — lihat §6.

---

## 4. Temuan #3 — layout `/install`

Sebelum: `<div className="mx-auto w-full max-w-2xl">` → di 1440 px hanya ±672 px terpakai, sisa
lebar kosong di kiri-kanan, jadi terasa seperti halaman ponsel (dan berbeda dari halaman app lain
yang memakai grid 12 kolom).

Sesudah (`components/catetind/install-guide-screen.tsx`):

- pembungkus: `w-full lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-8` (tanpa `max-w-*`);
- `<header className="lg:col-span-5">` = badge + judul + 3 alasan install (kartu alasan jadi
  satu kolom di desktop: `sm:grid-cols-3 lg:grid-cols-1`);
- kartu serah-terima link ("Lanjutkan di HP") naik ke kolom kiri (`isReady && device === 'desktop'`)
  — mengisi kolom kiri, tidak lagi menumpuk di kolom panduan;
- kolom kanan (`lg:col-span-7`) = CTA install, langkah tutorial, panduan perangkat lain,
  batasan PWA, footer bantuan/checkout, banner reward;
- mobile tetap SATU kolom dengan urutan lama (kenapa install → panduan → kaki).

---

## 5. Perbaikan lain dalam paket ini

1. **`fundNameOf(fundId, funds)`** — boleh menerima daftar dari store; komentar menjelaskan
   bahwa default seed hanya untuk pemanggil tanpa akses store.
2. **`lib/data/budget.ts`**: `CONTRIBUTION_SOURCES` + `SWEEP_SOURCE_ID`,
   `walletSourceById()` mengenali sumber non-dompet, copy `FUND_CREATE_TOAST` / `FUND_SWEEP_TOAST`,
   `FUND_DETAIL_COPY.notFoundBody/notFoundCta/loadingLabel`; copy usang
   `demoOnlyTitle/demoOnlyHint` dihapus.
3. **Test yang bergantung kalender mesin diperbaiki**: `lib/money/smoke-money-flow.test.ts`
   membandingkan tanggal baris baru dengan `HISTORY_TODAY_ISO` (dipatok `'2026-09-27'`), sehingga
   GAGAL di mesin yang tanggalnya beda (28 Sep 2026) — bukan karena uangnya salah. Sekarang
   pembandingnya `localISODate()` (tanggal yang dipakai store saat menulis baris). Bukti empiris:
   dengan `TZ` yang membuat tanggal lokal = 27 Sep, test yang sama hijau.

---

## 6. Audit sisa: bagian yang BELUM sinkron (dilaporkan, belum dikerjakan)

Ditemukan saat memeriksa keseluruhan sistem, dengan bukti kode. **Tidak** diubah di paket ini
karena masing-masing butuh keputusan produk dan/atau store baru — bukan perbaikan satu baris.

| # | Temuan | Bukti | Dampak ke user |
|---|---|---|---|
| A | **Konteks uang hanya dihormati Home, `/budget`, & sheet input transaksi** | `useMoneyContext()` hanya muncul di `home-screen`, `budget-screen`, `transaction-bottom-sheet`, `transaction-web-modal` | Pilih "Keluarga" lalu buka `/wallet`, `/history`, `/calendar`, `/bills`, `/wealth`, `/joint`, `/insight` → semuanya tetap menampilkan data semua konteks |
| B | **Edit di `/history` hidup di state halaman** | `history-screen.tsx:216-222` → `setEditedTxs(...)`; tidak ada tulisan ke store | Nilai hasil edit terlihat di Riwayat, tapi Home & `/wallet/<id>` tetap menampilkan nilai lama |
| C | **Catatan `/calendar` tidak pernah masuk jalur catatan** | `cashflow-calendar-screen.tsx:175-210` → `setNoteEntries` + toast "tersimpan" | Pengeluaran yang dicatat dari kalender tidak muncul di Riwayat/Home — sudah tercatat sebagai **#37 di ROADMAP-HALAMAN.md** |
| D | **Utang/investasi/aset `/wealth` hidup di state halaman** | `wealth-screen.tsx:95-98` (`useState(INITIAL_DEBTS/INITIAL_INVESTMENTS/INITIAL_DEBT_PAYMENTS)`) | Tambah utang / "tandai lunas" / update harga tidak terlihat di halaman lain **dan** tidak ikut file ekspor (`lib/money/export.ts` masih membaca `INITIAL_DEBTS`) |
| E | **Tagihan `/bills` hidup di state halaman** | `bills-screen.tsx:71` (`useState(INITIAL_BILLS)`) | Perubahan tagihan tidak ikut ekspor (`lib/data/help.ts` memakai `INITIAL_BILLS`) maupun pengingat lain |
| F | **Kantong bersama `/joint` masih keadaan halaman** | `joint-screen.tsx:100-106` + penanda settle di localStorage | Sudah tercatat di laporan 45 (realtime belum menerima baris sampai `/joint` membaca `joint_wallets`) |

Pola akarnya sama untuk B–F: **satu halaman memegang salinan datanya sendiri**, sementara
halaman lain (dan ekspor) membaca konstanta. Paket 46 menutup pola itu untuk **celengan**;
utang/investasi/aset/tagihan adalah kandidat berikutnya dengan resep yang sama (store per domain
+ persist IndexedDB + selector).

---

## 7. Validasi (dijalankan, hasil apa adanya)

```bash
npx tsc --noEmit        # 0 error
npx vitest run          # 25 file · 335 test hijau (termasuk 14 test baru funds-store)
node scripts/theme/audit-palette.mjs   # "palet bersih — 317 file diperiksa"
npx next build          # ✓ Compiled successfully
```

Smoke test produksi (`next start`):

| Route | Status | Bukti di HTML |
|---|---|---|
| `/` | 200 | "Tabungan Impian", "Tiket Konser Coldplay", tautan `/budget/1`, **2** switcher konteks (mobile + `hidden w-[262px] lg:flex`), "Jatah hari ini" + jatah **Rp 200.000** (angka kanon tidak bergeser) |
| `/budget` | 200 | "Rp 200.000", **2** switcher konteks |
| `/budget/1` | 200 | celengan seed dari store (judul & progres tampil) |
| `/budget/99` | 200 | keadaan "Celengan tidak ditemukan" + CTA kembali (bukan halaman 404) |
| `/budget/abc` | 404 | id non-angka memang bukan celengan |
| `/install` | 200 | `lg:col-span-5` & `lg:col-span-7` ada, **0** sisa `mx-auto w-full max-w-2xl` |

Belum diverifikasi di browser sungguhan: gerak animasi switcher konteks desktop, perilaku
IndexedDB di mode privat, dan persepsi visual layout `/install` di 1440 px (hanya diperiksa dari
HTML/kelas yang benar-benar terkirim).
