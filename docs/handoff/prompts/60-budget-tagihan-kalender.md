# 60 — Budget & Target Nabung, Tagihan Rutin, Kalender Cashflow

**Baca dulu:** `docs/handoff/AUDIT-UANG-2026-09.md` (AKAR B & D, §4 aturan hapus, §5) +
`docs/handoff/CONTEXT-WAJIB.md` §2–§10.
**Ketergantungan:** paket 57 (todayISO + konfigurasi uang user + Jatah Harian turunan)
**SELESAI & hijau**.

## 1. Ruang lingkup

`components/catetind/budget-screen.tsx`, `budget-zone-a.tsx`, `budget-zone-b.tsx`,
`budget-category-card.tsx`, `add-budget-sheet.tsx`, `add-goal-sheet.tsx`, `bills-screen.tsx`,
`bill-card.tsx`, `bill-timeline.tsx`, `mark-bill-paid-sheet.tsx`, `cashflow-calendar-screen.tsx`,
`goal-detail-screen.tsx`, `lib/data/{budget,bills,calendar}.ts`, `lib/money/funds-store.ts`.

## 2. Item kerja

### 60.1 Budget kategori: bisa dibuat, diedit, DIHAPUS

- `lib/data/budget.ts:901` `applyBudgetSave()` hanya punya `mode: 'create' | 'edit'`; **tidak ada**
  `removeBudget` di seluruh repo (sudah dicek).
- Tambah jalur hapus sebagai fungsi murni baru di `lib/data/budget.ts` (teruji), UI hapus di
  `budget-category-card.tsx` (sekarang hanya tombol hint baris 86-89 + tombol review 122-128),
  + `ConfirmDeleteDialog` + Undo (pola acuan `bills-screen.tsx:283-320`).
- **Copy konfirmasi jujur**: hapus budget hanya mencabut target yang user pasang sendiri; ia
  **TIDAK** mengubah saldo maupun Jatah Harian. Sebut ini di dialog supaya user tidak berharap
  uangnya kembali.
- AC: buat → edit → hapus → Undo; sebut limit sebelum/sesudah dan tegaskan Jatah Harian tidak
  berubah (dengan angkanya).
- Test: tambahan di `lib/data/budget.test.ts` (≥ 6 kasus: hapus id ada; hapus id tidak ada →
  tidak mengubah apa pun; hapus tidak menyentuh scope/periode lain; urutan tetap; undo memulihkan
  nilai asli; id tidak dipakai ulang).

### 60.2 Celengan: bisa ditanam, disetor, DIHAPUS

- `lib/money/funds-store.ts` punya `addFund()` (`:235`) & `contributeToFund()` (`:265`), **tidak
  punya** delete. Tambah `deleteFund()` mengikuti pola `deleteBill()` (`lib/money/bills-store.ts:290`)
  → tombstone + Undo + purge dari IndexedDB.
- UI: tombol hapus di halaman detail `/budget/<id>` (`goal-detail-screen.tsx` — sekarang hanya
  Setor + riwayat) dan jalur dari kartu (`budget-zone-b.tsx` / `my-goals-card.tsx`).
- **WAJIB diperhitungkan & diberitahukan**: `sinkingObligationOf()` (`lib/data/budget.ts:634-638`)
  dipotong dari kolam sebelum Jatah Harian dibagi (`:595, 606, 615`). Jadi menghapus celengan
  **MENAIKKAN Jatah Harian**. Dialog konfirmasi harus menyebut ini + nominal kewajiban yang dilepas.
- Riwayat setoran (`contributionsOf()`) **JANGAN dibuang** — uangnya memang sudah keluar dari dompet.
- AC: hapus celengan dengan kewajiban bulanan Rp X → Jatah Harian naik (sebut angka sebelum/sesudah)
  dan kartu Home (`my-goals-card`) ikut berubah.
- Test: tambahan di `lib/money/funds-store.test.ts` (≥ 6 kasus).

### 60.3 "Pin ke Dashboard" harus benar-benar mem-pin (atau dihapus)

- `budget-screen.tsx:94, 188` → `hudPinned` hanya state halaman; `DailyHudCard` di Home tidak
  menerima prop `pinned` (`daily-hud-card.tsx:50`) dan tidak membaca penyimpanan apa pun.
  Tombolnya tidak melakukan apa pun = pelanggaran kanon "jujur di setiap klaim".
- Pilih SATU dan kerjakan utuh:
  (a) simpan pin ke konfigurasi uang user (paket 57) dan Home mematuhinya (mis. kartu Jatah Hari
      Ini naik ke posisi teratas / ada section "Disematkan"), **atau**
  (b) HAPUS tombolnya beserta copy-nya (`HUD_COPY.pin` / `HUD_COPY.pinned`, `lib/data/budget.ts:1085`).
- Sebut pilihan + alasannya di laporan. AC: buktikan perilakunya (Home benar-benar berubah, atau
  tombolnya benar-benar tidak ada).

### 60.4 Tagihan: strip 7 hari ikut hari ini + aksi bayar bisa ditemukan

- Strip sekarang mulai 25 Sep (AKAR B): `bills.ts:77` → `upcomingDays()` (`bills.ts:432`) →
  `bill-timeline.tsx:43`. Setelah paket 57, `fromIso` = hari ini.
- Jelaskan di laporan definisi offset-nya (kode menulis "7 hari ke depan dimulai hari ini
  (offset 0..count-1)") supaya tidak ambigu apakah hari ini ikut dihitung.
- Aksi bayar sekarang **HANYA** muncul setelah swipe kanan (`bill-card.tsx:140-153`,
  `pointerEvents: dx > 24`). Perbaikan untuk desktop & discoverability:
  - tambah aksi "Tandai Lunas ✓" yang TERLIHAT di kartu (tombol/menu) — swipe tetap ada sebagai
    jalur cepat, bukan satu-satunya jalur;
  - `bill-timeline.tsx` (sekarang murni display) boleh jadi pintu bayar juga;
  - `unmarkBillPaid()` (`bills-screen.tsx:239`) juga butuh pintu "Batal lunas" yang terlihat.
- Sebutkan langkah klik dari /bills sampai status lunas, **beserta saldo sebelum/sesudah** karena
  `markBillPaid` menulis baris kas lewat `postExpense` (`bills-screen.tsx:196-203`).
- AC: dari desktop (tanpa gesture) user bisa menandai lunas **dan** membatalkannya.

### 60.5 Kalender Cashflow: tanggal realtime

- `lib/data/calendar.ts:171` (`CALENDAR_TODAY_ISO`) dipakai sebagai jangkar di `:45, 427, 673`.
  Setelah paket 57 jangkar datang dari jam asli; DATA seed tetap bertanggal tetap.
- Pastikan `paydayDate` dari onboarding (`readOnboardingResult()`,
  `cashflow-calendar-screen.tsx:134`) tetap dipakai; kalau belum ada → default yang DIJELASKAN di UI.
- AC: buka /calendar pada tanggal berjalan → sel "hari ini" benar; mode siklus gajian benar untuk
  `paydayDate` user.
- Test: tambahan di `lib/data/calendar.test.ts` (≥ 5 kasus: sel hari ini; siklus gajian dengan
  `paydayDate` kustom; pergantian bulan; batas 31 hari; entri seed tidak bocor ke luar jendela).

## 3. Definition of Done paket 60

1. Empat perintah validasi hijau + jumlah test baru.
2. Tabel sebelum → sesudah: budget (limit; Jatah Harian **tidak** berubah), celengan (Jatah Harian
   **naik** berapa), pin (perilaku baru / tombol dihapus), strip 7 hari (tanggal awal), dan langkah
   bayar tagihan + saldo.
3. Laporan `docs/handoff/laporan/60-budget-tagihan-kalender-laporan.md` + batas jujur.
