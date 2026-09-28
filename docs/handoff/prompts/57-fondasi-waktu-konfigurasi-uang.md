# 57 — Fondasi: satu "hari ini", satu konfigurasi uang user, Jatah Harian yang hidup

**Baca dulu:** `docs/handoff/AUDIT-UANG-2026-09.md` (khusus AKAR B, C, D, §4, §5, §6) +
`docs/handoff/CONTEXT-WAJIB.md` §1–§10.
**Ketergantungan:** TIDAK ADA. Paket ini harus **SELESAI dan hijau** sebelum paket 58–62 dimulai.
**Tujuan:** menghapus dua penyebab utama angka bohong — tanggal jangkar yang dipatok, dan pemasukan
user yang dibuang.

## 1. Ruang lingkup

Boleh disentuh: `lib/time.ts` (baru), `lib/user-money-settings.ts` (baru), `lib/onboarding.ts`,
`lib/account.ts` (hanya menambah pembersihan state baru), `lib/money/export.ts`,
`lib/data/{budget,bills,calendar,joint,wealth,history,home-money,add-wallet}.ts`,
`lib/money/store.ts` (hanya bagian pembacaan/nama dompet default),
`components/catetind/daily-hud-card.tsx`, `daily-hud-summary.tsx`, `budget-screen.tsx`,
`bills-screen.tsx`, `cashflow-calendar-screen.tsx`, `settings-panel-account.tsx`,
`app/app/onboarding/page.tsx`.

DILARANG menyentuh `lib/money/ledger.ts`, rumus `balanceOf`, dan `assertLedgerInvariant`
(kalau menemukan bug di sana → laporkan sebagai temuan, jangan diubah).

## 2. Item kerja

### 57.1 Satu fungsi `todayISO()` — hilangkan lima jangkar yang berbeda

- Buat `lib/time.ts`: `todayISO()` + `localISODate(date)` + hook `useTodayISO()` yang mengisi
  nilainya SETELAH mount (pola `wallet-detail-screen.tsx:147`, `history-screen.tsx:171`) supaya
  tidak ada hydration mismatch (`CONTEXT-WAJIB` §8).
- Ganti PEMAKAIAN jangkar UI di: strip 7 hari tagihan (`bill-timeline.tsx:43` → `bills.ts:432`),
  kalender (`calendar.ts:171, 427, 673`), `/joint` (`joint.ts:93`), `/wealth` (`wealth.ts:245`),
  Riwayat/Home/Budget (`history.ts:143`, `budget.ts:81`, `add-wallet.ts:17`).
- **Data seed TETAP bertanggal tetap.** Yang berubah hanya jangkar ("hari ini", "kemarin", rentang
  "7 hari ke depan", jendela 30 hari).
- AC: buka lima halaman (Home, /bills, /calendar, /wealth, /joint) pada tanggal berjalan → SEMUA
  menyebut tanggal yang sama & benar. Bukti: tabel halaman × tanggal yang tampil.
- AC: `tsc` tetap bersih, tidak ada hydration warning (jelaskan cara memverifikasinya).
- Test: `lib/time.test.ts` (≥ 6 kasus: hari biasa; pergantian bulan; bulan 31 hari; pergantian
  tahun; nilai stabil dalam satu render; format ISO `YYYY-MM-DD`).

### 57.2 Satu konfigurasi uang user — `lib/user-money-settings.ts`

- Bentuk JSON polos siap HTTP (pola `lib/money/idb.ts` + store yang sudah ada): `monthlyIncome`,
  `paydayDate`, `totalInstallments`, `dashboardPeriod`. Persist dengan penanda `purged` (pola yang
  sudah ada) supaya "Hapus Akun" benar-benar membersihkannya.
- **`readOnboardingResult().monthlyIncome` menjadi sumber awal** nilai ini (sekarang nol pemakai).
- Integrasikan ke `purgeDeviceData()` (`lib/account.ts:172-193`) **dan** ke file ekspor
  (`lib/money/export.ts`, `collectExportSources()`) supaya janji privasi utuh.
- AC: isi pemasukan di onboarding → buka Home → Jatah Harian memakai angka itu (bukan 7.500.000).
- AC: hapus akun → konfigurasinya hilang, onboarding berikutnya mulai dari kosong.
- Test: `lib/user-money-settings.test.ts` (≥ 8 kasus: default saat belum ada; baca/tulis; nilai
  rusak/asing → dianggap belum ada; purge; tidak melempar saat storage diblokir).

### 57.3 Jatah Harian jadi turunan NYATA

- `computeDailyHud()` dipanggil dengan: `monthlyIncome` + `totalInstallments` dari 57.2,
  `sinkingFunds` dari funds-store, `window` yang benar, dan **`spent` = pengeluaran NYATA dari
  ledger** pada window itu.
- `daily-hud-card.tsx:56` ganti `SPENT_TODAY` → pengeluaran hari ini dari ledger.
- Dua angka gaji disatukan: `home-money.ts:79` & `calendar.ts:561` (8.500.000) vs
  `budget.ts:96` / `bills.ts:80` / `wealth.ts:243` (7.500.000) → **satu sumber** = konfigurasi
  user (57.2).
- Kalau user belum mengisi pemasukan: kartu menampilkan CTA jujur ("Atur pemasukanmu dulu biar
  jatah hariannya benar") — BUKAN angka dari konstanta.
- AC WAJIB (bukti angka): catat pengeluaran Rp 50.000 → Jatah Harian **TURUN**, dan angka yang
  sama muncul di Home **dan** `/budget` tab yang sama.
- AC: dry spell (`hasIncomeInWindow`) ikut konfigurasi user, bukan konstanta.

### 57.4 Pintu mengubah pemasukan & cicilan (bukan cuma disimpan)

- Tambah field di `settings-panel-account.tsx` (sekarang hanya "Tanggal Gajian", baris 209):
  **PEMASUKAN BULANAN** + **TOTAL CICILAN BULANAN**, memakai formatter yang sudah ada.
- Wajib ada CTA dari kartu Jatah Harian di `/budget` yang membuka pengaturan ini.
- AC: ubah pemasukan 7.500.000 → 9.000.000 → Jatah Harian berubah di Home & /budget tanpa reload.
- Test: ≥ 4 kasus turunan (income naik; cicilan naik; keduanya 0; income 0 → jatah 0 / dry spell).

### 57.5 Umumkan perubahan angka kanon

- `CONTEXT-WAJIB.md` §10.1 mengikat `DAILY_HUD` (Rp 800.000 ×2 · Rp 200.000 ×1 · 4 hari ×1) dan
  saldo kanon Rp 1.850.000.
- Perbarui §10.1 dengan angka baru + **dasar hitungan** + alasan. Saldo Rp 1.850.000 tidak boleh
  berubah.
- **Perbarui juga §10.3**: angka basi "319 test / 24 file" → jumlah nyata. Saat audit dijalankan,
  `pnpm exec vitest run` melaporkan **511 test / 34 file**; tulis angka yang kamu lihat sendiri
  setelah paket ini selesai.
- AC: hitung manual angka `DAILY_HUD` demo sebelum & sesudah, tulis di laporan.


## 3. Definition of Done paket 57

1. `pnpm test` (baseline terukur 511 test / 34 file + test baru, semua hijau),
   `pnpm exec tsc --noEmit` 0 error, `pnpm build` sukses, `pnpm theme:audit` bersih — output ditempel.
2. Tabel: halaman × tanggal yang ditampilkan (sesudah) semuanya tanggal berjalan.
3. Tabel sebelum → sesudah: Jatah Harian, income yang dipakai, `spent` yang dipakai.
4. Laporan `docs/handoff/laporan/57-fondasi-waktu-konfigurasi-uang-laporan.md` lengkap
   (format §6 dokumen audit) + batas jujur.
5. `CONTEXT-WAJIB.md` §10.1 **dan §10.3** diperbarui + alasannya.


