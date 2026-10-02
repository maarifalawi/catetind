# Laporan 60 — Budget & Target Nabung, Tagihan Rutin, Kalender Cashflow

**Status:** ✅ SELESAI — diimplementasikan & divalidasi · **Paket:** 60
**Prompt:** `docs/handoff/prompts/60-budget-tagihan-kalender.md`
**Konteks wajib:** `docs/handoff/CONTEXT-WAJIB.md` + `docs/handoff/AUDIT-UANG-2026-09.md`
**Bukti mentah 4 perintah validasi:** `docs/handoff/laporan/bukti/60-validasi.txt`

## 1. Ringkas (3–5 baris)

- **Dua aksi merusak yang tadinya tidak punya pintu sekarang punya**: budget kategori bisa
  dicabut (`removeBudget`/`restoreBudget`) dan celengan bisa dicabut (`deleteFund`/`restoreFund`,
  tombstone pola `deleteBill`) — dua-duanya lewat konfirmasi berkalimat jujur + Undo.
- **Efek uang celengan diberitahukan dengan angka**: dialog hapus menyebut nominal kewajiban yang
  dilepas, karena `sinkingObligationOf()` memotongnya dari kolam sebelum Jatah Harian dibagi.
  Terbukti: hapus iPhone 16 → Jatah Harian **Rp 200.000 → Rp 700.000**; kalau kewajiban bulan ini
  sudah disetor, dialog memakai kalimat "tidak berubah" (diuji).
- **Tombol "Pin ke Dashboard" DIHAPUS** (pilihan (b) prompt 60.3) karena ia tidak menyematkan apa
  pun — `DailyHudCard` di Home tidak pernah membacanya. Alasan lengkap di §3.
- **Tagihan bisa dibayar & dibatalkan dari desktop tanpa gesture**: tombol "Tandai Lunas" /
  "Batal lunas" selalu terlihat di kartu; geser kanan tetap jalur cepat. Strip 7 hari kini mulai
  hari ini (1 Okt 2026 di mesin ini, dulu 25 Sep 2026).
- **Setiap tombol/angka baru diuji sebagai logika murni**: +19 kasus test (663 test / 41 file,
  semuanya hijau), `tsc` 0 error, build sukses, palet bersih.

> Kerangka awal di bawah sudah diisi seluruhnya. Judul bagian tidak diubah.

## 2. File yang dibuat/diubah

| # | File | Perubahan | Alasan |
|---|---|---|---|
| 1 | `lib/data/budget.ts` | `removeBudget()`/`restoreBudget()` + tipe `BudgetRemoval`; `applyBudgetSave(..., takenIds)`; copy `BUDGET_DELETE_COPY`/`BUDGET_DELETE_TOAST`/`BUDGET_CARD_ACTION_COPY`; copy `FUND_DELETE_COPY`/`FUND_DELETE_TOAST`/`FUND_CARD_ACTION_COPY`; **`HUD_COPY.pin`/`pinned` dihapus** | 60.1 jalur hapus budget; 60.2 dialog jujur efek uang; 60.3 tombol tanpa akibat |
| 2 | `lib/money/funds-store.ts` | `removedIds` (tombstone) di `PersistedFunds`/`FundsState`/`FundsSnapshot`; `deleteFund()`, `restoreFund()`, `liveFunds()`, `useLiveFunds()`; `fundById()` menghormati tombstone; `contributeToFund()` menolak celengan terhapus; `commit()` penjaga bentuk; `mergeFundsState()` menggabungkan tombstone; `persist()` menyimpan tombstone | 60.2 pola `deleteBill()` — baris tetap ada untuk Undo & riwayat setoran |
| 3 | `lib/data/budget.test.ts` | **+6 kasus** hapus budget (id ada; id tidak ada; scope/periode lain tidak tersentuh; urutan; Undo nilai+posisi & anti-ganda; id tidak dipakai ulang; Jatah Harian tidak berubah) | bukti angka 60.1 |
| 4 | `lib/money/funds-store.test.ts` | **+8 kasus** hapus celengan (Jatah Harian naik 200rb→700rb; kartu Home berganti wajah; kewajiban sudah disetor → tidak berubah; id/Undo ganda; riwayat setoran utuh; setoran ditolak; tombstone bertahan saat hidrasi; purge saat Hapus Akun) | bukti angka 60.2 |
| 5 | `lib/data/calendar.test.ts` | **+5 kasus** (sel hari ini ikut jam asli; siklus gajian `paydayDate` kustom; pergantian bulan; batas gajian tgl 31; entri seed tidak bocor ke ringkasan) | bukti angka 60.5 |
| 6 | `components/catetind/budget-category-card.tsx` | tombol hapus (ikon + `aria-label` yang menyebut kategori) | 60.1 permukaan hapus |
| 7 | `components/catetind/budget-zone-a.tsx` | prop `onDeleteBudget` diteruskan ke kartu | 60.1 |
| 8 | `components/catetind/sinking-fund-card.tsx` | tombol hapus di footer (opsional, `onDelete`) | 60.2 permukaan hapus |
| 9 | `components/catetind/budget-zone-b.tsx` | prop `onDeleteGoal` | 60.2 |
| 10 | `components/catetind/budget-screen.tsx` | state `pendingBudgetDelete`/`pendingFundDelete` + `handleDelete*`/`confirm*`/`undo*`; dua `<ConfirmDialog/>`; toast Undo; `useLiveFunds()`; `applyBudgetSave(..., retiredBudgetIds)`; `handleContribute`/`handleSweep` jujur saat store menolak; **`hudPinned`/`handlePinHud` dihapus** | 60.1, 60.2, 60.3 |
| 11 | `components/catetind/daily-hud-summary.tsx` | prop `pinned`/`onPin` + tombol Pin + impor ikon `Pin` dihapus | 60.3 |
| 12 | `components/catetind/goal-detail-screen.tsx` | tombol "Hapus celengan" di bar aksi bawah; `ConfirmDialog` + toast Undo + `router.push('/budget')`; `FundUnavailable` dapat wajah ketiga `removed`; setoran yang ditolak store dikatakan | 60.2 di halaman detail |
| 13 | `components/catetind/{daily-hud-card,my-goals-card,plant-widget,monthly-review-modal,monthly-target-card}.tsx` | pembacaan celengan → `useLiveFunds()` | 60.2: satu daftar hidup; tidak boleh ada pembaca yang lupa menyaring tombstone (Jatah Harian tetap terpotong kalau lupa) |
| 14 | `lib/data/bills.ts` | `BILL_CARD_ACTION_COPY` (label tombol terlihat + label geser + aria-label), `CONFIRM_UNPAID_COPY`, `UNPAID_TOAST` | 60.4 kalimat "Batal lunas" + larangan copy di JSX |
| 15 | `components/catetind/bill-card.tsx` | pembungkus kartu (area geser diklip supaya tidak menutupi baris aksi) + baris aksi yang SELALU terlihat ("Tandai Lunas" / "Batal lunas"); label & aria-label pindah ke `lib/data/bills.ts`; baris meta menyebut `paidSeedNote` untuk tagihan contoh | 60.4 discoverability desktop tanpa merusak gesture |
| 16 | `components/catetind/bills-screen.tsx` | state `unpaidTarget` + `handleUnmarkPaid`/`confirmUnpaid` + `<ConfirmDialog/>` "Batal lunas"; `unpaidAmountLabel` dibaca dari baris kasnya; `onUnmarkPaid` diteruskan ke kartu; komentar kepala halaman diperbarui | 60.4 AC: desktop bisa lunas **dan** membatalkannya |
| 17 | `lib/money/export.ts`, `components/catetind/help-center-screen.tsx` | daftar celengan untuk ekspor/berkas bantuan → `liveFunds()` | celengan yang dihapus user tidak ikut terunduh |
| 18 | `lib/data/calendar.ts` | `CALENDAR_PAYDAY_COPY` (kalimat default + CTA) | 60.5 "kalau belum ada → default yang DIJELASKAN di UI" |
| 19 | `components/catetind/cashflow-calendar-screen.tsx` | catatan "memakai tanggal gajian default (tgl 25)" + tautan ke Pengaturan, hanya di mode siklus gajian ketika `paydayDate` belum diatur | 60.5 |
| 20 | `docs/handoff/CONTEXT-WAJIB.md` | §10.2 +3 kanon baru (tombstone celengan & budget, jalur bayar tanpa gesture, larangan tombol tanpa akibat); §10.3 angka test 543/37 → **663/41** + riwayat | baseline wajib diperbarui (aturan `AUDIT §1`) |
| 21 | `docs/handoff/laporan/bukti/60-validasi.txt` **(baru)** | output apa adanya 4 perintah validasi | bukti |

## 3. Yang dikerjakan (per item prompt)

| # | Item | Hasil | Bukti |
|---|---|---|---|
| 60.1 | Budget: buat/edit/hapus | `removeBudget()` + `restoreBudget()` murni di `lib/data/budget.ts`; Undo mengembalikan baris ke POSISI aslinya; `applyBudgetSave(..., takenIds)` melarang id dipakai ulang selama jendela Undo hidup; UI: ikon 🗑 di kartu → `ConfirmDialog` (badan + `note` "Saldo dompet dan Jatah Harian TIDAK berubah") → toast Undo 5 detik. **Jatah Harian tidak berubah**: Rp 1.016.666 → Rp 1.016.666 (dan sisa Rp 3.050.000 → Rp 3.050.000) | `lib/data/budget.test.ts` (6 kasus) |
| 60.2 | Celengan: `deleteFund()` | `removedIds` tombstone + `deleteFund`/`restoreFund` + `liveFunds`/`useLiveFunds`; `fundById` mengembalikan `null` untuk tombstone; baris & `contributions` TIDAK dibuang; semua pembaca tampilan pindah ke `useLiveFunds()`; pintu hapus di kartu Zona B **dan** halaman detail; dialog menyebut nominal kewajiban yang dilepas (atau alasan tidak berubah) | `lib/money/funds-store.test.ts` (8 kasus) |
| 60.3 | Pin Dashboard benar / dihapus | **Dipilih (b): dihapus.** `HUD_COPY.pin`/`pinned`, prop `pinned`/`onPin`, state `hudPinned`, handler `handlePinHud` semuanya hilang; di /budget tidak ada lagi tombol "Pin ke Dashboard" | `Select-String 'hudPinned\|HUD_COPY.pin\|onPin'` → hanya tinggal komentar penjelas di `budget-screen.tsx:118-120` |
| 60.4 | Tagihan: tanggal + aksi bayar terlihat | `upcomingDays()` sudah dipanggil dengan `fromIso = useTodayISO()` (offset 0..6 = **hari ini ikut dihitung**, offset 0 = hari ini) → strip mulai 1 Okt 2026 (dulu 25 Sep). Aksi bayar: tombol "Tandai Lunas" TERLIHAT di setiap kartu belum lunas; "Batal lunas" TERLIHAT untuk tagihan lunas yang punya `paidRowId` (+ konfirmasi, karena uangnya kembali); geser kanan tetap jalur cepat. `bill-timeline.tsx` **tidak** dijadikan pintu bayar — alasannya di §7 | `bills-screen.tsx` + `bill-card.tsx`; angka saldo di §4 |
| 60.5 | Kalender realtime | `cashflow-calendar-screen.tsx` sudah mengirim `todayIso = useTodayISO()` ke `buildCalendarGrid()`; `paydayDate` dibaca dari `lib/user-money-settings.ts` (sumber awal onboarding). Yang ditambahkan di paket ini: kalau user belum pernah mengatur gajian, layar **mengatakannya** ("memakai tanggal gajian default (tgl 25)") + tautan ke Pengaturan, dan 5 test mengunci sel "hari ini", siklus `paydayDate` kustom, pergantian bulan, batas tanggal 31, serta entri seed yang tidak boleh bocor ke ringkasan | `lib/data/calendar.test.ts` (5 kasus) |

### 3.1 Keputusan desain & alasannya

| Keputusan | Alasan |
|---|---|
| 60.3 → **hapus** tombol Pin (bukan menyimpan pin di konfigurasi uang) | (1) Paket 58 baru saja MENETAPKAN urutan kartu Home ("Jatah Hari Ini TURUN ke baris kedua" — keputusan eksplisit dengan alasan); pin yang bisa melawan keputusan itu = dua sumber kebenaran untuk satu tata letak. (2) Menyimpan pin menambah satu field konfigurasi + satu cabang render di Home + satu tombol lagi yang harus dijaga, untuk manfaat yang belum pernah diminta user. (3) Prompt 60.3 sendiri menyediakan pilihan (b), dan repo punya kanon yang jelas: tombol tanpa akibat dilarang (prompt 24). |
| Undo hapus budget menyimpan **posisi**, bukan cuma baris | Baris yang "dibalikin ke paling bawah" akan terlihat seperti budget baru — user tidak bisa memastikan Undo-nya berhasil. `BudgetRemoval.removed = { item, index }` membuat `restoreBudget()` memulihkan nilai & urutan sekaligus (diuji `toEqual(daftar)`). |
| `removedIds` (tombstone) untuk celengan, bukan hapus fisik | Sama seperti `deleteBill()`: (1) Undo harus memulihkan target, progres, tahap tanaman, dan posisi baris; (2) `contributions` menunjuk `fundId` yang sama — membuang barisnya membuat riwayat uang yang sudah keluar jadi yatim; (3) /budget/<id> bisa membedakan "dihapus" dari "tidak ditemukan". Purge fisik terjadi di `purgeFundsStore()` (Hapus Akun). |
| Semua pembaca celengan pindah ke `useLiveFunds()` (termasuk file ekspor & berkas bantuan) | `sinkingObligationOf()` membaca daftar ini. Kalau satu pembaca saja lupa menyaring tombstone, kartunya hilang tapi Jatah Harian tetap terpotong — dua cerita di satu layar. `CONTEXT-WAJIB` §10.2 sekarang melarang pembacaan `snapshot.funds` mentah untuk tampilan. |
| "Batal lunas" **tidak** ditawarkan untuk tagihan contoh tanpa `paidRowId` | Membatalkannya tidak mengembalikan uang apa pun (baris kasnya memang tidak pernah ada). Tombol yang "kelihatan bisa" di situ = janji kosong (PRD 244). Sebagai gantinya baris meta kartu menulis `paidSeedNote` ("Lunas contoh (tanpa catatan dompet)") supaya state-nya tetap dijelaskan. |
| "Batal lunas" lewat tombol TIDAK dibatasi jendela 5 detik, sementara Undo di toast tetap dibatasi | Bukan dua aturan yang bertabrakan: Undo di toast = jaring pengaman untuk salah tekan pada detik-detik setelah aksi; tombol di kartu = keputusan sadar (dan tagihan yang salah ditandai lunas kemarin pun harus bisa dibetulkan). Keduanya memanggil `unmarkBillPaid()` yang sama, jadi tidak ada jalur uang kedua. |
| `bill-timeline.tsx` tidak dijadikan pintu bayar | Prompt menyebutnya opsional ("boleh"). Mengubah tap-tanggal menjadi "bayar" akan menabrak keputusan audit #3 (tap tanggal = lompat ke kartunya). Tombol di kartu sudah menutup AC "desktop tanpa gesture", jadi timeline dibiarkan apa adanya. |
| Format isian **"Tandai Lunas ✓"** di area geser tetap ada | Prompt: swipe harus tetap hidup sebagai jalur cepat, bukan dihapus. |

## 4. SEBELUM → SESUDAH (angka)

Angka di bawah diambil dengan probe sementara (`lib/zz-60-probe.test.ts` yang dihapus setelah
tercatat) yang memanggil **fungsi yang sama** dengan halaman: `removeBudget()`, `deleteFund()`,
`liveFunds()`, `computeDailyHud()`, `upcomingDays()`, `markBillPaid()`/`unmarkBillPaid()`,
`buildCalendarGrid()`. Jatah Harian dihitung dengan dua acuan: (i) **konfigurasi user** yang
representatif — pemasukan Rp 7.500.000 · cicilan Rp 800.000 · uang keluar ledger Rp 50.000 ·
jendela September (28 Sep, sisa 3 hari); (ii) **kanon demo** (`MONTHLY_INCOME`/`TOTAL_INSTALLMENTS`/
`SPENT_THIS_MONTH`, jendela 27 Sep) yang diikat `CONTEXT-WAJIB` §10.1.

| Yang diukur | Sebelum | Sesudah | Cara reproduksi |
|---|---|---|---|
| Limit budget Kopi (spent Rp 285.000) | **Rp 300.000** · 8 kategori | baris **dicabut** · 7 kategori | `/budget` → kartu Kopi → ikon 🗑 → Hapus |
| Jatah Harian setelah budget dihapus (**harus TIDAK berubah**) | **Rp 1.016.666** (sisa Rp 3.050.000) | **Rp 1.016.666** (sisa Rp 3.050.000) ✓ tidak berubah | probe: `computeDailyHud({..., window: periodWindow('monthly','2026-09-28')})` sebelum/sesudah `removeBudget()`; test `Jatah Harian TIDAK berubah…` |
| Celengan: total kewajiban yang dipotong dari kolam | **Rp 3.600.000** | **Rp 1.600.000** (−Rp 2.000.000) | `/budget` → Celengan Impian → iPhone 16 → 🗑 → Hapus |
| Jatah Harian **kanon** setelah hapus celengan (Rp 2jt/bulan) — angka yang tampil di kartu Home & tab Bulanan | **Rp 200.000/hari** (sisa Rp 800.000) | **Rp 700.000/hari** (sisa Rp 2.800.000) — **NAIK Rp 500.000/hari** (sisa +Rp 2.000.000, dibagi 4 hari) | probe: `computeDailyHud({ sinkingFunds: liveFunds(getFundsSnapshot()) })` |
| Jatah Harian (konfigurasi user Rp 7,5jt/Rp 800rb, 28 Sep) setelah hapus celengan | **Rp 1.016.666** | **Rp 1.683.333** (+Rp 666.667 = Rp 2.000.000/3 hari) | probe idem, `window: periodWindow('monthly','2026-09-28')` |
| Jatah Harian kalau kewajiban bulan ini **sudah disetor** lalu celengannya dihapus | Rp 1.016.666 | Rp 1.016.666 (tidak berubah) — dialog memakai `noObligationNote` | test `kewajiban bulan ini SUDAH disetor → Jatah Harian tidak berubah` |
| Kartu Home "Tabungan Impian" (`my-goals-card` → `heroFundOf`) | **Dana Darurat** (prioritas kritis) | **Tiket Konser Coldplay** (progres 60%) | test `kartu Home (heroFundOf) ikut berganti…` |
| Perilaku "Pin ke Dashboard" | tombol ADA; ditekan → toast "dipin ke Dashboard", **0 perubahan di Home** (state halaman saja) | **tombol & copy DIHAPUS** — tidak ada lagi di /budget; tidak ada klaim palsu | `/budget` → kartu "Jatah Hari Ini" (header) → tidak ada tombol Pin |
| Tanggal awal strip "7 Hari ke Depan" di `/bills` | **2026-09-25** (25 Sep) | **2026-10-01** (1 Okt, tanggal mesin ini) | `/bills` → strip di kartu "📅 7 Hari ke Depan" |
| Langkah klik bayar tagihan + saldo | Kartu belum punya tombol bayar; geser kanan = satu-satunya jalan → sheet dompet | **Klik**: `/bills` → kartu "Cicilan HP" → tombol **"Tandai Lunas"** → sheet dompet (default BCA) → tombol **"Tandai Lunas ✓"**. Saldo BCA **Rp 1.450.000 → Rp 1.000.000** (baris kas Rp 450.000, id `session-9001`), stempel LUNAS + toast menyebut nominal & dompet | probe `markBillPaid()` + `walletBalance()` |
| Langkah klik **membatalkan** lunas + saldo | Tidak ada (hanya tombol Undo 5 detik di toast) | **Klik**: kartu "Cicilan HP" (lunas) → tombol **"Batal lunas"** → dialog (sebut nominal & akibat + catatan tetap ada) → saldo BCA **Rp 1.000.000 → Rp 1.450.000**; baris `session-9001` dicabut + baris koreksi `session-9002` ("Batal bayar Cicilan HP") | probe `unmarkBillPaid()` + `walletBalance()` |
| Sel "hari ini" di `/calendar` | **2026-09-25** (jangkar seed) | **2026-10-01** (jam perangkat) | `/calendar` → sel dengan cincin forest |
| Siklus gajian `paydayDate` = 26 pada 28 Sep | dulu hanya mungkin tgl 25 | grid **26 Sep – 25 Okt** (30 hari), 28 Sep `isToday` & `inPeriod` | test `siklus gajian memakai paydayDate user (tgl 26)` |

Catatan: saldo kanon Rp 1.850.000 & kanon `DAILY_HUD` (Rp 800.000 sisa / Rp 200.000/hari / 4 hari)
**tidak diubah** oleh paket ini — yang berubah hanya angka setelah user melakukan aksi
(menghapus celengan / membayar tagihan), dan itu memang perintahnya.

## 5. Test

| File test | Jumlah kasus | Hasil |
|---|---|---|
| `lib/data/budget.test.ts` | 11 → **17** (+6) | ✅ hijau |
| `lib/money/funds-store.test.ts` | 16 → **24** (+8) | ✅ hijau |
| `lib/data/calendar.test.ts` | 15 → **20** (+5) | ✅ hijau |
| **Total suite** | 644 → **663** (41 file) | ✅ 663 passed / 0 failed, tanpa `.skip` |


## 6. Validasi (output apa adanya)

Output mentah lengkap ada di `docs/handoff/laporan/bukti/60-validasi.txt`.

```bash
pnpm test                # Test Files 41 passed (41) · Tests 663 passed (663) · Duration 3.64s
pnpm exec tsc --noEmit   # (tidak ada keluaran) → 0 error
pnpm build               # ✓ Compiled successfully in 1754ms · Finished TypeScript in 2.4s
                         #   ✓ Generating static pages 34/34 · semua route ter-generate tanpa error
pnpm theme:audit         # ✓ palet bersih — 350 file diperiksa, tidak ada warna di luar palet.
```

Kutipan mentah dari berkas bukti (baris terakhir §1, §3, §4):

```
Test Files  41 passed (41)
     Tests  663 passed (663)
  Duration  3.64s (transform 49%, import 45%, tests 5%, worker 2%)
```

```
✓ Compiled successfully in 1754ms
  Running TypeScript ...
  Finished TypeScript in 2.4s ...
  ✓ Generating static pages using 19 workers (34/34) in 665ms
```

```
✓ palet bersih — 350 file diperiksa, tidak ada warna di luar palet.
```

Catatan mesin: `pnpm` dijalankan apa adanya (tidak perlu
`--config.manage-package-manager-versions=false` di mesin ini); keempat perintah keluar dengan
exit code **0**.

## 7. Batas jujur

- **Belum diverifikasi di browser.** Lingkungan ini tidak punya browser, jadi klaim berikut hanya
  terbukti lewat logika murni + `pnpm build` (sukses, 34/34 halaman ter-generate): tidak ada
  hydration warning, tidak ada horizontal scroll pada 375 px, grid rapi pada 1440 px, kontras
  warna tombol baru, dan "bottom nav tidak menutupi konten terakhir". Yang BISA diklaim: HTML
  server & render pertama client memakai nilai yang sama secara desain (tanggal lewat
  `useTodayISO()` → `''`, celengan lewat `SERVER_SNAPSHOT`, konfigurasi uang →
  `DEFAULT_USER_MONEY_SETTINGS`), dan `pnpm theme:audit` memastikan tidak ada warna di luar palet.
- **Tinggi baris kartu tagihan bertambah** (~28 px per kartu) karena baris aksi yang selalu terlihat.
  Secara desain itu kompensasi yang sadar untuk AC 60.4; efeknya pada "kepadatan" daftar di layar
  nyata belum diukur.
- **`prefers-reduced-motion`**: paket ini tidak menambah animasi baru (tombol, dialog, dan baris
  aksi memakai transisi/`:hover` bawaan Tailwind). Kartu tagihan tetap memakai animasi lama; baris
  aksi baru sendiri statis, jadi tidak ada animasi baru yang perlu dijaga.
- **Uji haptic/keyboard di perangkat nyata belum ada** (fokus terlihat diuji lewat kelas
  `focus-visible:*`, bukan diukur).
- **"Batal lunas" pada tagihan contoh (tanpa `paidRowId`) sengaja tidak disediakan** — lihat §3.1.
  Konsekuensinya, di sesi baru dengan data seed, tombol "Batal lunas" baru muncul setelah user
  membayar satu tagihan lewat app. Bukan bug: status lunas contoh memang tidak punya uang yang
  bisa dikembalikan.
- **`ContributeSheet`/`SweepSheet` yang terbuka lalu celengannya dihapus dari tab lain**: store
  menolak menulis dan layar mengatakan apa adanya (`FUND_DELETE_COPY.goneNote`). Dua tab
  sungguhan belum bisa disimulasikan di sini (butuh browser), jadi jalur ini hanya terbukti lewat
  test `setoran ke celengan yang sudah dihapus ditolak`.
- **Tidak ada perintah git yang dijalankan** (working tree paket 43–62 tetap utuh, apa adanya).
- Angka "hari ini" di laporan ini (**1 Okt 2026**) datang dari jam mesin tempat validasi dijalankan;
  di perangkat lain strip 7 hari & sel "hari ini" akan mengikuti tanggal perangkat itu — itulah
  perbaikan yang diminta.

## 8. Pertanyaan terbuka

1. **`bill-timeline.tsx` sebagai pintu bayar.** Prompt 60.4 menyebutnya opsional; saya
   membiarkannya (tap tanggal = lompat ke kartu, keputusan audit #3). Kalau pemilik repo ingin
   timeline pun membuka sheet bayar (mis. tap tanggal yang hanya punya SATU tagihan aktif
   langsung membuka `MarkBillPaidSheet`), itu satu keputusan produk — bukan bug.
2. **Tagihan contoh yang "Lunas" tanpa baris kas.** Sejak paket 60 keadaannya dijelaskan di baris
   meta (`Lunas contoh (tanpa catatan dompet)`). Pertanyaan produk: apakah seed-nya sebaiknya
   diubah supaya SETIAP tagihan lunas punya baris kas (jadi semuanya bisa dibatalkan), atau tetap
   dipertahankan sebagai data demo? Saya tidak mengubah seed (aturan audit §1.11: jangan mengarang
   mock baru / jangan membuang data demo).
3. **`purge` tombstone dalam sesi panjang.** `removedIds` tumbuh selama sesi dan hanya dibersihkan
   saat Hapus Akun. Untuk demo ini tidak terasa; kalau kelak dipakai produksi, baris tombstone
   mungkin perlu dipadatkan (mis. saat ekspor/sinkron) — sama seperti `removedIds` di
   `lib/money/store.ts`, jadi bukan hal baru yang khas paket ini.
4. **Apakah pin pantas dibuat nanti?** Kalau pemilik repo ingin "Jatah Hari Ini" bisa disematkan,
   jalur yang benar sudah tertulis di `CONTEXT-WAJIB` §10.2 (simpan di konfigurasi uang user +
   Home WAJIB berubah, mis. section "Disematkan" di atas banner). Itu pekerjaan baru, bukan
   sisa paket ini.

