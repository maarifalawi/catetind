# Laporan 57 — Fondasi: satu "hari ini", satu konfigurasi uang user, Jatah Harian turunan

**Status:** ✅ SELESAI — diimplementasikan & divalidasi (28 Sep 2026) · **Paket:** 57
**Prompt:** `docs/handoff/prompts/57-fondasi-waktu-konfigurasi-uang.md`
**Konteks wajib:** `docs/handoff/CONTEXT-WAJIB.md` + `docs/handoff/AUDIT-UANG-2026-09.md`

> Ringkas: dua penyebab utama "angka bohong" dihapus — (a) lima jangkar tanggal yang dipatok diganti satu
> `todayISO()`/`useTodayISO()`, (b) pemasukan user yang dulu dibuang kini jadi satu konfigurasi
> (`lib/user-money-settings.ts`) yang dipakai kartu Jatah Hari Ini bersama pengeluaran NYATA dari ledger.
> Pemasukan belum diatur → CTA jujur, bukan angka contoh. Saldo kanon Rp 1.850.000 & kanon `DAILY_HUD`
> tidak berubah.

## 1. Ringkas (3–5 baris)

- Lima jangkar tanggal yang dipatok (`2026-09-25` ×4, `2026-09-27`, `2026-09-25`) diganti SATU
  `todayISO()`; halaman mengisinya setelah mount lewat `useTodayISO()` supaya HTML server =
  render pertama client. Data seed tetap bertanggal tetap.
- Pemasukan yang diisi user saat onboarding (dulu **nol pemakai**) sekarang hidup di
  `lib/user-money-settings.ts` dan itulah yang dipakai kartu "Jatah Hari Ini" Home & `/budget`,
  bersama pengeluaran **nyata** dari ledger (dulu `spent` yang dikirim halaman diabaikan).
- Pemasukan belum diatur → kartu menampilkan **CTA jujur**; pembagi DTI/Waterfall Gaji pun berhenti
  memakai angka contoh (`0% — Sehat` tidak lagi mungkin muncul).
- Saldo kanon **Rp 1.850.000 tidak berubah**; kanon `DAILY_HUD` juga tetap (dibuktikan manual §7).
- Validasi: `pnpm test` **543 test / 37 file** hijau, `tsc` 0 error, `pnpm build` sukses,
  `pnpm theme:audit` "palet bersih".


## 2. File yang dibuat/diubah


| # | File | Perubahan | Alasan |
|---|---|---|---|
| 1 | `lib/time.ts` **(baru)** | `localISODate()`, `todayISO()`, `dayOfMonth()` + seluruh penjelasan lima jangkar lama | 57.1 — satu definisi "hari ini" (AKAR B) |
| 2 | `lib/use-today-iso.ts` **(baru)** | `useTodayISO()` (`'use client'`), nilai diisi setelah mount | 57.1 — hidrasi aman; dipisah dari `lib/time.ts` karena build Next menolak `useState` di modul yang diimpor Server Component/route handler |
| 3 | `lib/user-money-settings.ts` **(baru)** | Konfigurasi uang user (JSON polos), sumber awal onboarding, penanda `purged`, sanitasi, `MONEY_SETTINGS_COPY`, hook `useUserMoneySettings()` | 57.2 & 57.4 — satu sumber pemasukan/cicilan (AKAR C/D) |
| 4 | `lib/time.test.ts`, `lib/user-money-settings.test.ts`, `lib/data/budget.test.ts` **(baru)** | 8 + 13 + 9 kasus uji | 57.1–57.4 (acceptance + bukti angka) |
| 5 | `lib/data/history.ts` | `localISODate` diteruskan ke `lib/time.ts`; dokumentasi `HISTORY_TODAY_ISO` jadi "jangkar data seed" | 57.1 |
| 6 | `lib/data/budget.ts` | `computeDailyHud` memakai `spent`/`monthlyIncome`/`totalInstallments` yang dikirim halaman + argumen `earned`; `periodIncome`/`hasIncomeInWindow` menerima pemasukan terkonfigurasi + field `configured`; helper `windowTransactions/spentInWindow/earnedInWindow/spentOn`; copy `notConfigured*` + `MONEY_SETTINGS_HREF`; dokumentasi kanon (`MONTHLY_INCOME`, `SPENT_THIS_MONTH`, `SPENT_TODAY`, `DAILY_HUD`, `TODAY_ISO/CURRENT_DAY`) | 57.3 — jatah harian jadi turunan nyata (AKAR D) |
| 7 | `lib/data/{bills,wealth,calendar,home-money,joint,add-wallet}.ts` | duplikat `MONTHLY_INCOME` dihapus (diteruskan), gaji demo disatukan ke kanon; `jointDateLabel`/`groupJointTransactions` menerima `todayIso`; copy `WATERFALL_NO_INCOME_COPY` & `DTI_UNKNOWN_COPY`; dokumentasi jangkar seed | 57.1 & 57.3 (AKAR B/C) |
| 8 | `lib/account.ts` | `purgeDeviceData()` memurge konfigurasi uang + melaporkan `moneySettingsPurged` | 57.2 — janji "Hapus Akun" |
| 9 | `lib/money/export.ts` | `settings.money` + `EXPORT_SCHEMA_VERSION` 2 → 3 + satu baris `limits` | 57.2 — janji portabilitas data |
| 10 | `lib/onboarding.ts` | dokumentasi: `monthlyIncome`/`paydayDate`/`dashboardPeriod` jadi sumber awal konfigurasi | 57.2 |
| 11 | `components/catetind/daily-hud-card.tsx`, `daily-hud-summary.tsx`, `budget-screen.tsx`, `spending-review-sheet.tsx` | jatah harian dari konfigurasi + ledger; cabang "belum diatur" (CTA) & tautan ke Pengaturan; panel review memakai catatan nyata | 57.3 & 57.4 |
| 12 | `components/catetind/bills-screen.tsx`, `bill-timeline.tsx`, `cashflow-calendar-screen.tsx`, `joint-timeline.tsx`, `wealth-screen.tsx`, `wealth-hutang.tsx`, `add-debt-sheet.tsx`, `add-investment-sheet.tsx`, `transfer-sheet.tsx`, `settings-panel-account.tsx` | jangkar tanggal live + pembagi uang dari konfigurasi user (Waterfall & DTI; `salary-waterfall.tsx` sendiri tidak diubah — pagarnya di `bills-screen`) + field konfigurasi uang | 57.1, 57.3, 57.4 |
| 13 | `lib/money/store.test.ts`, `lib/money/bills-store.test.ts` | dua ekspektasi lama disesuaikan (nominal kanon gaji & versi skema ekspor) + alasannya ditulis di komentar | 57.3/57.2 — bukan penghapusan/`.skip` |
| 14 | `docs/handoff/CONTEXT-WAJIB.md` | §10.1, §10.2, §10.3 diperbarui | 57.5 |
| 15 | `docs/handoff/laporan/57-…-laporan.md` | laporan ini | — |

## 3. Yang dikerjakan (per item prompt)

| # | Item | Hasil | Bukti |
|---|---|---|---|
| 57.1 | Satu `todayISO()` | Selesai. Satu definisi di `lib/time.ts` (+ hook `lib/use-today-iso.ts`); jangkar UI di /bills, /calendar, /joint, /wealth, /wallet, Home, /budget memakai tanggal perangkat, diisi setelah mount; data seed tetap bertanggal tetap | Tabel §4 (lima halaman → satu tanggal: 28 Sep 2026); `lib/time.test.ts` 8 kasus; `pnpm build` sukses |
| 57.2 | Konfigurasi uang user | Selesai. `lib/user-money-settings.ts`: `monthlyIncome`, `totalInstallments`, `paydayDate`, `dashboardPeriod`; sumber awal = `readOnboardingResult()` (yang dulu nol pemakai); penanda `purged`; ikut `purgeDeviceData()` + file ekspor (skema v2 → v3) | `lib/user-money-settings.test.ts` 13 kasus; `lib/account.test.ts` & `lib/money/export.test.ts` hijau |
| 57.3 | Jatah Harian turunan | Selesai. `computeDailyHud()` dipanggil dengan pemasukan & cicilan konfigurasi user, `sinkingFunds` dari funds-store, `window` hasil `periodWindowForTab('monthly', todayISO())`, dan `spent` = `spentInWindow(recordedTransactions(), window)`; `SPENT_TODAY` (bar progres Home) → `spentOn(ledger, todayISO())`; dua angka gaji (8.500.000 vs 7.500.000) disatukan ke `MONTHLY_INCOME`; dry spell ikut konfigurasi (`PeriodIncome.configured`) | `lib/data/budget.test.ts` 9 kasus (termasuk Rp 50.000 → jatah turun); tabel §4 |
| 57.4 | Pintu ubah pemasukan/cicilan | Selesai. Field PEMASUKAN BULANAN + TOTAL CICILAN BULANAN di `settings-panel-account.tsx` (write-through ke store, formatter `digitsToDisplay`/`onlyDigits` yang sudah ada, copy di `MONEY_SETTINGS_COPY`); periode & tanggal gajian kini ikut tersimpan; CTA dari kartu Jatah Harian /budget (dan kartu Home) menuju `/settings`; /calendar membaca `paydayDate` dari store yang sama | 4+ kasus turunan (income naik; cicilan naik; keduanya 0; income 0) di `lib/data/budget.test.ts`; tautan menunjuk route yang ada (`/settings`) |
| 57.5 | Perbarui §10.1 | Selesai. §10.1 diperbarui (kanon `DAILY_HUD` tetap + baris baru untuk Jatah Harian turunan & angka gaji 7.500.000, berikut alasan/dasar hitungan); §10.3 diperbarui 319/24 → **543/37** + riwayat angkanya; §10.2 dapat dua butir baru (satu "hari ini", satu konfigurasi uang) | `docs/handoff/CONTEXT-WAJIB.md:274-276,281-282,294,302`; saldo kanon Rp 1.850.000 tidak berubah |

## 4. SEBELUM → SESUDAH (angka)

| Yang diukur | Sebelum | Sesudah | Cara reproduksi |
|---|---|---|---|
| Tanggal "hari ini" di Home / /budget | `2026-09-27` (HISTORY_TODAY_ISO → TODAY_ISO) | **tanggal berjalan perangkat** — di mesin verifikasi ini **28 Sep 2026** | buka `/` → footer kartu Jatah Hari Ini ("sisa N hari"), `/budget` tab Bulanan → chip periode (`Bulan ini · 1 – 30 Sep`) |
| Tanggal "hari ini" di /bills | `2026-09-25` (`TODAY_ISO`/`CURRENT_DAY` = 25) | **28 Sep 2026** (`currentDay` = 28) | `/bills` → sel pertama strip "7 Hari ke Depan" = 28, cincin "hari ini" pindah; status telat dihitung dari 28 |
| Tanggal "hari ini" di /calendar | `2026-09-25` (`CALENDAR_TODAY_ISO`) | **28 Sep 2026** | `/calendar` → sel bertanda "hari ini" + tombol "Hari Ini" mendarat di 28 Sep |
| Tanggal "hari ini" di /wealth | `2026-09-25` (`WEALTH_TODAY_ISO`) | **28 Sep 2026** | `/wealth` → "Catat Bayar"/"Tambah Investasi" membuka field tanggal di 28 Sep; hutang personal tidak boleh bertanggal masa depan |
| Tanggal "hari ini" di /joint | `2026-09-25` (`JOINT_TODAY_ISO`) | **28 Sep 2026** | `/joint` → separator waktu: catatan 25 Sep tidak lagi disebut "Hari ini" (jadi "25 Sep"), tanggal perangkat yang akan menyandang label itu |
| Tanggal "hari ini" di /wallet (sheet Pindah Dana) | `2026-09-27` (`WALLET_TODAY_ISO`) | **28 Sep 2026** | `/wallet` → Pindah Dana → baris tanggal `Hari ini · 28 Sep 2026` |
| Income yang dipakai Jatah Harian | `MONTHLY_INCOME` 7.500.000 (konstanta, apa pun yang diisi user) | **konfigurasi user** (`lib/user-money-settings.ts`): onboarding/`/settings`; 0 → CTA, bukan angka | `/settings` → Profil & Akun → isi 9.000.000 → `/` & `/budget` langsung memakai 9.000.000 |
| `spent` yang dipakai Jatah Harian | `SPENT_THIS_MONTH` 2.300.000 / `SPENT_TODAY` 85.000 (konstanta, argumen `spent` DIABAIKAN di cabang bulanan) | **baris ledger nyata** (`spentInWindow(recordedTransactions(), window)`); 0 kalau belum ada catatan | catat pengeluaran di `/history` atau panel input, lalu lihat kartu |
| Jatah Harian setelah catat pengeluaran Rp 50.000 | **tidak berubah** (2.300.000-nya konstanta; 85.000-nya bar progres) | **turun**: `3.100.000 / 3 = 1.033.333` → `3.050.000 / 3 = 1.016.666` (−16.667) | dengan pemasukan 7.500.000 & cicilan 800.000 tersimpan, catat Rp 50.000 bertanggal hari ini → kartu Home & /budget tab Bulanan sama-sama turun |
| Angka gaji di kartu "Arus Uang" Home | masuk **8.500.000** · keluar 752.000 · net **7.748.000** | masuk **7.500.000** · keluar 752.000 · net **6.748.000** | `lib/data/home-money.ts` baris seed "Gaji Bulanan" memakai `MONTHLY_INCOME` |
| Pemasukan periode di ringkasan /calendar | 9.750.000 (gaji 8.500.000 + freelance 1.250.000) | 8.750.000 (gaji 7.500.000 + freelance 1.250.000) | `lib/data/calendar.ts` `INCOME_SERIES` gaji memakai `MONTHLY_INCOME` |
| Rasio DTI /wealth (cicilan 1.070.000) | 14% "Sehat" (pembagi konstanta 7.500.000 — dan **"DTI 0% — Sehat"** kalau pemasukan belum diisi) | 14% bila pemasukan diatur 7.500.000; **"Belum bisa dihitung"** bila belum | `/wealth` tab Hutangku → badge DTI |
| Rasio beban tetap /bills (Waterfall Gaji) | total tagihan ÷ 7.500.000 (konstanta) | ÷ pemasukan user; kalau 0 → kartu "Waterfall Gaji belum bisa dihitung" + tautan Pengaturan | `/bills` → kartu Waterfall |
| Saldo kas likuid (kanon Rp 1.850.000 — TIDAK boleh berubah) | **Rp 1.850.000** (BCA 1.450.000 + GoPay 350.000 + Tunai 50.000) | **Rp 1.850.000** (tidak disentuh sama sekali) | `/` kartu dompet & `/wallet`; `lib/wallets.ts` tidak diubah |
| Jumlah test / file test | 511 / 34 | **543 / 37** | `pnpm test` |

## 5. Test

| File test | Jumlah kasus | Hasil |
|---|---|---|
| `lib/time.test.ts` (baru) | 8 | ✅ hijau — hari biasa; pergantian bulan; bulan 31 hari & Februari; pergantian tahun; nilai stabil dalam satu render; format ISO |
| `lib/user-money-settings.test.ts` (baru) | 13 | ✅ hijau — default saat belum ada; baca/tulis; sumber awal onboarding; nilai rusak/asing → "belum ada"; versi lain ditolak; storage diblokir tidak melempar; purge + penanda `purged` |
| `lib/data/budget.test.ts` (baru) | 9 | ✅ hijau — income naik → jatah naik; cicilan naik → jatah turun; keduanya 0 → jatah 0/ditahan; income 0 → 0 tanpa "ditahan"; Rp 50.000 → jatah turun; Home ↔ /budget satu jendela; ledger (tabungan keluar, transfer netral, di luar jendela tidak dihitung); dry spell ikut konfigurasi; kanon `DAILY_HUD` tidak bergeser |
| `lib/money/bills-store.test.ts` (lama) | 20 | ✅ hijau — 1 ekspektasi `schemaVersion` 2 → 3 (bagian `settings.money` baru) + alasan tertulis |
| `lib/money/store.test.ts` (lama) | 67 | ✅ hijau — 1 ekspektasi `homeRow.amount` 8.500.000 → 7.500.000 (kanon gaji disatukan) + alasan tertulis |
| `lib/account.test.ts` (lama) | 14 | ✅ hijau — `purgeDeviceData()` kini juga memurge konfigurasi uang (`moneySettingsPurged`) |
| `lib/money/export.test.ts` (lama) | 9 | ✅ hijau — file ekspor memuat `settings.money` |

## 6. Validasi (output apa adanya)

```bash
pnpm test                # 543 test / 37 file — semua hijau (0 failed, 0 .skip)
pnpm exec tsc --noEmit   # 0 error
pnpm build               # sukses — seluruh route ter-generate (static + dynamic), exit 0
pnpm theme:audit         # "✓ palet bersih — 342 file diperiksa, tidak ada warna di luar palet."
```
Output mentah (dipotong bagian yang relevan, apa adanya):

```text
$ pnpm test
 ✓ lib/data/budget.test.ts (9 tests)
 ✓ lib/user-money-settings.test.ts (13 tests)
 ✓ lib/time.test.ts (8 tests)
 Test Files  37 passed (37)
      Tests  543 passed (543)
   Duration  2.80s
$ echo $?          # 0

$ pnpm exec tsc --noEmit
(no output — exit 0)

$ pnpm build
 ✓ Compiled successfully
 (…daftar route: ○ static / ƒ server-rendered…)
 ○  (Static)   prerendered as static content
 ƒ  (Dynamic)  server-rendered on demand
(exit 0)

$ pnpm theme:audit
> node scripts/theme/audit-palette.mjs
✓ palet bersih — 342 file diperiksa, tidak ada warna di luar palet.
(exit 0)
```

Angka pembanding: sebelum paket 57 → **511 test / 34 file** (terukur saat audit 28 Sep 2026, sama dengan
catatan di `docs/handoff/AUDIT-UANG-2026-09.md` §2); berkas yang dipindai palet 336 → 342 (enam berkas
baru: tiga modul — `lib/time.ts`, `lib/use-today-iso.ts`, `lib/user-money-settings.ts` — dan tiga file
test).



## 7. Perubahan `CONTEXT-WAJIB` §10.1

- Angka `DAILY_HUD` baru: **tetap** `remaining Rp 800.000` · `dailyBudget Rp 200.000` · `daysLeft 4`
  (dasar hitungan: `7.500.000 − 800.000 − 3.600.000 = 3.100.000`; `3.100.000 − 2.300.000 = 800.000`;
  `800.000 / 4 hari (27..30 Sep) = 200.000` — sama seperti sebelum paket 57, dan itu memang disengaja:
  konstanta ini sekarang KANON DEMO, bukan angka yang dibaca layar).
- Yang berubah dan diumumkan: **Jatah Harian yang dilihat user** dulu dihitung dari 7.500.000/800.000/2.300.000
  (konstanta) dan sekarang dari konfigurasi user + pengeluaran ledger, sehingga angkanya bergantung pada
  tanggal & pengeluaran nyata. Contoh sah (pemasukan 7.500.000, cicilan 800.000, celengan 3.600.000,
  pengeluaran ledger 0, hari 28 Sep 2026): `3.100.000 / 3 hari = Rp 1.033.333`; setelah mencatat
  Rp 50.000 → **Rp 1.016.666**. Sebelum paket 57 kedua angka itu tidak mungkin muncul (spent diabaikan).
- Angka gaji demo: 8.500.000 → **7.500.000** di `home-money.ts` & `calendar.ts` (satu kanon). Efeknya
  disebut di tabel §4.
- Alasan perubahan: jangkar tanggal & pemasukan adalah dua penyebab keluhan "angka tidak berasal dari
  data user" (AKAR B, C, D audit 28 Sep 2026); §10.1 sebelumnya memakai kalimat "kalau berubah, sebut
  alasannya" — alasannya di laporan ini, angkanya dihitung manual, dan test `lib/data/budget.test.ts`
  mengunci kanon `DAILY_HUD` supaya tidak bergeser tanpa sengaja.
- Saldo kanon Rp 1.850.000: TIDAK berubah (bukti: `lib/wallets.ts` `WALLET_SEED.opening` tidak disentuh
  paket ini; `lib/money/store.test.ts` yang menguji `CANON_CASH`/saldo dompet tetap hijau, 543 test lolos).
- Alasan perubahan: jangkar tanggal & pemasukan adalah dua penyebab keluhan "angka tidak berasal dari data user" (lihat baris di atas).
- Saldo kanon Rp 1.850.000: TIDAK berubah (lihat baris bukti di atas).

## 8. Batas jujur


- **Belum diverifikasi di browser.** Lingkungan kerja ini tidak punya browser, jadi klaim berikut hanya
  terbukti lewat logika murni + `pnpm build` (sukses, semua route ter-generate): tidak ada hydration
  warning, tidak ada horizontal scroll di 375 px, grid rapi di 1440 px, dan kontras/warna kartu baru.
  Yang bisa diklaim: HTML server & render pertama client memakai nilai yang SAMA (`useTodayISO()` → `''`,
  store konfigurasi → `DEFAULT_USER_MONEY_SETTINGS`) sehingga tidak ada mismatch *secara desain*, dan
  `pnpm theme:audit` memastikan tidak ada warna di luar palet.
- **Belum ada uji perangkat nyata** untuk: haptic, `prefers-reduced-motion` (tidak ada animasi baru di
  paket ini — hanya tautan & kartu statis), dan perilaku localStorage di mode privat Safari (hanya diuji
  dengan storage tiruan yang melempar).
- **Kalender & Home belum membaca konfigurasi user** (lihat §9.1). Kartu Jatah Harian, pembagi DTI,
  pembagi Waterfall Gaji, dan pembagi rasio beban tetap tagihan SUDAH; ringkasan periode kalender &
  kartu arus uang Home baru akan ikut di paket 58 & 60.
- **Sengaja dibiarkan:** `SPENT_TODAY`, `SPENT_THIS_MONTH`, `MONTHLY_INCOME`, `TOTAL_INSTALLMENTS`,
  `DAILY_HUD`, `CURRENT_DAY`, `DAYS_IN_MONTH` tetap ada di `lib/data/budget.ts` sebagai kanon demo &
  default test (aturan audit: seed lama boleh hidup sebagai DATA DEMO, asalkan bukan sumber angka di
  komponen). Semuanya sudah diberi komentar "bukan sumber angka layar".
- **Satu test lama disesuaikan** (`lib/money/store.test.ts:1119`): `homeRow.amount` 8.500.000 → 7.500.000
  karena nominal seed itu memang disatukan ke kanon. Test itu TIDAK dihapus/di-skip; maksudnya sama
  (konstanta demo tidak ikut tersunting saat user mengedit pajangannya) dan alasannya ditulis di
  komentar test-nya. Ekspektasi `schemaVersion` di `bills-store.test.ts` juga naik 2 → 3 (bagian
  `settings.money` baru), dengan alasan tertulis.
- **Tidak ada perintah git yang dijalankan** (working tree paket 43–56 tetap utuh, apa adanya).


## 9. Pertanyaan terbuka

1. **Seed demo vs konfigurasi user.** Baris/templat demo (`HISTORY_TRANSACTIONS`, `HOME_MONEY_GROUPS`,
   `INCOME_SERIES` kalender) sekarang memakai satu kanon (7.500.000) tapi **belum mengikuti** angka yang
   user atur. Membuat kartu Home & ringkasan kalender ikut bergerak adalah pekerjaan 58 & 60 — paket ini
   hanya memastikan TIDAK ADA lagi angka gaji kedua (8.500.000) dan memberi satu sumber
   (`lib/user-money-settings.ts`) untuk diikat paket-paket itu. **Pertanyaan produk:** apakah baris seed
   "Gaji Bulanan" sebaiknya dihapus saja dari demo setelah paket 58 (biar yang muncul murni catatan user)?
2. **`JOINT_MONTH_KEY` masih dari jangkar seed** (`2026-09`). Mengubahnya berarti mengubah bulan
   settlement yang sudah dikunci test & data seed; label "Hari ini" di /joint sudah live, tapi bulan buku
   bersama masih September. Dijadwalkan ke paket 61 — kalau pemilik repo ingin /joint jalan di bulan
   berjalan, itu keputusan produk (data bersama contoh harus dipindah juga).
3. **`paydayDate` di Pengaturan tidak mengubah hasil onboarding yang tersimpan** (dibaca sekali sebagai
   sumber awal). Bila diinginkan "Pengaturan selalu menang", cukup ubah prioritas di
   `resolve()` (`lib/user-money-settings.ts`) — sekarang nilai tersimpan memang sudah menang; yang tidak
   diubah adalah *hasil onboarding* setelahnya.
4. **`WEALTH_NOW_ISO` (badge "harga basi") masih dipatok** 2026-09-25. Paket 57 hanya menggarap
   `WEALTH_TODAY_ISO` sesuai prompt; harga pasar contoh memang harus punya "sekarang" yang stabil untuk
   demo. Ini usulan untuk paket 61: ganti ke waktu perangkat, dengan konsekuensi badge basi berubah.

