# 18 — Budget: Tab Periode Non-Bulanan (Mingguan / Custom / Siklus Gajian)

**Paket:** melengkapi `/budget` (tanpa route baru) · **Fase 7** · **Depends on:** —

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Bukti gap (hasil audit)

- `components/catetind/budget-zone-a.tsx:135-142` → saat tab ≠ Bulanan muncul kartu
  **"Segera hadir — Filter periode mingguan/custom sedang disiapkan"**.
- `components/catetind/budget-zone-a.tsx:31-33` → `PERIOD_TABS` sudah mendaftarkan
  `weekly`, `monthly`, `custom`, dan `payday` (hanya labelnya yang jalan).
- Inventaris **#24** mensyaratkan: *"Tab periode: **Mingguan**/Bulanan/**Custom (Siklus Gajian)**"* → jadi ini gap nyata, bukan opsional.
- Inventaris **#10** (onboarding) mensyaratkan user memilih **Dashboard Period**:
  *Bulan kalender* vs *Siklus gajian* — jadi "custom/payday" memang bagian model data.

## Peta baca

**PRD:**

- **641–712** — 2B. Variable Income Budgeting: konteks & **2B.1 Daily HUD / Pacing Limits**
  (pacing = inti modul ini: jatah harian dihitung dari sisa periode)
- **712–736** — 2B.3 Edge Cases: **bulan tanpa income (dry spell)** & **income masuk di
  tengah bulan** — dua kasus yang WAJIB benar saat periode diganti
- **682–711** — 2B.2 Homescreen Visualization (rincian pacing & tone)
- **2282–2323** — Home: cara modul ini menampilkan pacing-nya

**Kode acuan:**

- `lib/data/budget.ts` — `BudgetPeriod` (`'weekly' | 'monthly' | 'custom'`),
  `BUDGET_PERIOD_OPTIONS` (baris 229), `computeDailyHud()` (95), `DAILY_HUD` (138),
  `pacingPercent()` / `pacingOf()` (268–303), `TODAY_ISO`/`CURRENT_DAY`/`DAYS_IN_MONTH` (62–64)
- `components/catetind/budget-zone-a.tsx` — tab periode + kartu HUD
- `lib/data/history.ts` — `localISODate`, `shiftISODate`, `summarizeTransactions`, filter tanggal
- `components/catetind/add-budget-sheet.tsx` — `ChoicePills` dengan `BUDGET_PERIOD_OPTIONS` (form tambah sudah punya pilihannya)

## Kenapa ini penting (bukan kosmetik)

Modul 2B dibangun untuk **income tidak tetap** — justru orang seperti itu yang berpikir
dalam **minggu** dan **siklus gajian**, bukan bulan kalender. Tab periode yang mati
berarti seluruh modul ini hanya benar untuk satu dari tiga model penghasilan.
Psikologi yang berlaku (CONTEXT-WAJIB §5.2): freelancer butuh pacing berbasis
**sisa hari di periodenya**, dan saat dry spell, **pacing-nya harus menghilang**,
bukan menampilkan jatah yang tidak ada.

## Yang harus dibangun

1. **Logika murni di `lib/data/budget.ts`** (satu sumber, tanpa React):
   - `periodWindow(period, todayIso)` → `{ startISO, endISO, dayIndex, daysInPeriod, label }`
     untuk `weekly` (Senin–Minggu), `monthly`, dan `custom` (siklus gajian: 25 → 24,
     dapat dikonfigurasi lewat konstanta `PAYDAY_DATE`).
   - `budgetsForPeriod(budgets, window)` + `computeDailyHud({ …, window })` sehingga
     **pacing** memakai `daysInPeriod` milik periode aktif (bukan `DAYS_IN_MONTH`).
   - `periodLabel()` untuk chip/title (mis. `"Minggu ini · 22–28 Sep"`, `"Siklus 25 Agu – 24 Sep"`).
   - Tulis komentar: `CURRENT_DAY`/`DAYS_IN_MONTH` tetap ada untuk Home (bulan kalender),
     sedangkan Budget memakai `periodWindow()` — jangan menghapus konstanta lama.
2. **UI `budget-zone-a.tsx`**:
   - Hapus blok **"Segera hadir"**; render daftar budget + pacing yang **sama** untuk
     semua periode (komponen yang sudah ada, tinggal disuapi window).
   - Kartu HUD menampilkan label periode aktif + rentang tanggalnya.
   - Tombol tambah budget **mewarisi periode aktif** (pre-selected di `AddBudgetSheet`).
3. **Edge case WAJIB diuji & ditangani** (PRD 712–736):
   - **Dry spell** (tidak ada pemasukan di window) → kartu khusus
     *"Belum ada pemasukan di periode ini"* + CTA `[+ Catat Pemasukan]`, dan
     **pacing disembunyikan** (inventaris state XIII).
   - **Income masuk di tengah periode** → jatah harian dihitung ulang dari sisa hari,
     dan UI menunjukkan itu terjadi (mis. catatan kecil *"Pemasukan masuk hari ini — jatah
     harianmu disesuaikan."*).
   - Periode dengan 0 hari tersisa → jangan pembagian nol (guard eksplisit).
4. **Konsistensi**: `/budget` dan Home **tidak boleh** menampilkan angka pacing yang berbeda
   untuk bulan kalender. Kalau Home memakai `DAILY_HUD`, pastikan nilainya identik
   dengan `computeDailyHud({ period: 'monthly' })`.
5. **Copy** tetap di `lib/data/budget.ts`; hapus konstanta copy "Segera hadir" yang tidak dipakai.

## Acceptance criteria

- [ ] Tab Mingguan / Bulanan / Custom(Siklus gajian) semuanya menampilkan daftar + pacing nyata; **nol** teks "Segera hadir" di `/budget`.
- [ ] Rentang tanggal periode tampil dan benar (uji: awal periode, tengah, hari terakhir).
- [ ] Dry spell → kartu khusus + CTA, pacing hilang.
- [ ] Income di tengah periode → jatah harian menyesuaikan & ada penjelasan singkat.
- [ ] Budget baru otomatis mewarisi periode aktif.
- [ ] Angka bulanan identik antara `/budget` dan Home.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Menghitung ulang pacing langsung di JSX (semua di `lib/data/budget.ts`).
- Membuat daftar budget terpisah per periode (satu daftar, disaring per window).
- Menampilkan kata "limit/habis" atau warna merah (kanon 2B.2 & 5C).
