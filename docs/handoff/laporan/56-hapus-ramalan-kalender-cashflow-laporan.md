# Laporan 56 — Ramalan Dihapus dari Kalender Cashflow

**Status:** selesai diimplementasikan & divalidasi · **Paket:** temuan uji pemakaian 28 Sep 2026 · **Fase 13**
· **Depends on:** — (mandiri) · **Berkaitan dengan:** 49 (satu jalur tulis kalender), 51 ("Lunas" di `/bills`
benar-benar menggerakkan uang), 47 (konteks uang & `scope`)

> Ringkas: kalender berhenti **menaksir**. `CalendarEntryStatus` + `statusFor()` dihapus, keranjang
> `forecast` dihapus, bubble tidak lagi berbunyi `· ramalan`, judul **"Ramalan Tagihan"** + badge `ramalan` +
> aksi **[Bayar Sekarang]** hilang dari panel detail. Sisa isi kalender hanya uang yang sudah terjadi:
> catatan user, transaksi store (paket 49), dan riwayat demo yang **dipotong di hari ini**. Hari mendatang
> yang kosong tampil netral (`tone: 'none'`, muka `empty`) dan diberi empty state jujur yang mengarahkan
> user ke tombol catat — bukan lagi janji "Belum ada tagihan terjadwal".

---

## 1. Bukti gap (audit 28 Sep 2026) → status

| # | Bukti | Masalah | Status | Bukti perbaikan |
|---|---|---|---|---|
| 1 | `lib/data/calendar.ts:66` `CalendarEntryStatus = 'cleared' \| 'upcoming_forecast'` | ada konsep "entri belum terjadi" di tipe data | ✅ FIXED | tipe & field `status` **dihapus total** dari `CalendarEntry`; komentar di `calendar.ts:72-77` menjelaskan alasannya |
| 2 | `lib/data/calendar.ts:656-659` `statusFor(iso, todayIso)` | setiap entri seed bertanggal > hari ini lahir sebagai ramalan | ✅ FIXED | fungsi dihapus; `monthlyDates(day, todayIso)` **dipotong di hari ini** (`calendar.ts:638-657`) |
| 3 | `lib/data/calendar.ts:366-396` pengelompokan sel (`bucket.forecast`, `plannedCount`) | satu hari bisa punya dua daftar: fakta & ramalan | ✅ FIXED | `totalsByDate()` satu keranjang saja (`calendar.ts:365-395`); `CellTotals.forecast` & `plannedCount` hilang |
| 4 | `CellTotals.forecast`, `DayMetrics.hasForecast`, `calendarTone()` cabang `isFuture` | hari masa depan bisa diberi warna "rencana" | ✅ FIXED | `DayMetrics` tinggal `income/variableSpend/fixedSpend`; cabang `isFuture` dihapus (`calendar.ts:313-336`) |
| 5 | `summarizePeriod()` menghitung `plannedDays`/`forecastTotal`/`forecastCount` | ringkasan periode menjumlahkan uang yang belum dibayar | ✅ FIXED | tiga field itu dihapus dari `PeriodSummary` (`calendar.ts:920-940`); test memastikan field-nya tidak ada lagi |
| 6 | `cashflow-calendar-grid.tsx:60-67` bubble `Rp X · ramalan` | angka belum terjadi tampil sebagai fakta | ✅ FIXED | `cellSummary()` hanya: pemasukan → pengeluaran → kosong (`cashflow-calendar-grid.tsx:53-67`) |
| 7 | `cashflow-calendar-grid.tsx` legenda memuat penanda "Terencana" | legenda mengajari user membaca "rencana" | ✅ FIXED | `CALENDAR_LEGEND` tinggal lima makna sel; penanda berubah jadi **"Tagihan Tetap"** (fakta, bukan rencana). Bukti HTML: `Keterangan · Boros · Surplus · Nol jajan · Ada belanja · Tagihan Tetap` |
| 8 | `cashflow-inspector.tsx:28,62,84,105-106,138,162-197,237,287,325` judul "Ramalan Tagihan", badge `ramalan`, aksi [Bayar Sekarang] | kalender mengaku bisa membayar tagihan | ✅ FIXED | judul jadi `Transaksi Hari Ini` / `Catatan Tercatat`, badge & tombol dihapus; `CashflowEntryRow` tinggal satu mode (tanpa `forecast`/`paid`/`onPay`) |
| 9 | `cashflow-calendar-screen.tsx:95-108,166` `paidForecastIds` + `handlePayForecast` | jalur tulis kedua: "lunas" tanpa baris kas | ✅ FIXED | state & handler dihapus (`cashflow-calendar-screen.tsx:146-159, 256-266`); tidak ada penanda ramalan di localStorage/sesi (hanya state tampilan + `paydayDate` dari onboarding) |
| 10 | *(temuan tambahan saat mengerjakan)* `periodEmpty` ikut membaca `cell.forecast` | periode masa depan tanpa catatan dianggap berpenghuni → grid kosong tanpa penjelasan | ✅ FIXED | `periodEmpty` sekarang hanya melihat entri tercatat (`cashflow-calendar-screen.tsx:201-211`) |

**Akar masalahnya satu:** kalender menyimpan **dua arti** untuk satu daftar (fakta vs ramalan) dan
menampilkan keduanya dengan bahasa visual yang sama. Begitu ramalan dihapus, sisa satu arti — dan semua
turunan warna, bubble, legenda, judul, sampai aksi di panel detail ikut menyesuaikan tanpa perlu pengecualian.

## 2. Keputusan desain & alasannya

### 2.1 `status` entri dihapus, bukan disisakan `'cleared'` saja
Prompt membolehkan dua pilihan (tinggal `'cleared'` atau hapus tipenya). Dipilih **hapus total**: field yang
nilainya cuma bisa satu akan tetap dibaca sebagai "ada kemungkinan lain" oleh orang berikutnya yang membaca
kode — dan justru di situlah ramalan akan tumbuh lagi. Bukti: test `expect('status' in entry).toBe(false)`.

### 2.2 Entri demo dipotong di hari ini (dan kenapa ini bukan "mengubah seed")
Prompt melarang mengubah seed selain status & `scope`. Yang dijaga dari larangan itu tetap dijaga: **tidak
satu pun** definisi demo disentuh — nama, nominal, tanggal jatuh, kategori, dompet, `scope`, urutan, bahkan
seed PRNG (`mulberry32(20260925)`) sama persis. Yang berubah hanya **rentang tanggal** yang dihasilkan
(`monthlyDates()` berhenti di `todayIso`), dan itu wajib:

1. Kalau entri masa depan tetap dihasilkan, setelah `status` dihapus ia berubah dari "ramalan berlabel"
   menjadi **"fakta palsu"** — Kredivo Rp 420.000 tanggal 28 Sep (hari ini 25 Sep) akan tampil seperti uang
   yang sudah keluar. Itu lebih buruk daripada temuan awalnya.
2. Kanon paket ini sendiri: *"kalender hanya menampilkan uang yang benar-benar ada … yang belum terjadi tidak
   digambar"*, dan bukti layar yang diminta: *"tidak memuat angka tagihan masa depan yang belum dibayar"*.
3. Alternatif yang ditolak: menyaring entri masa depan **di dalam grid**. Itu memindahkan aturan yang sama ke
   tempat lain, dan ikut menyembunyikan **catatan user** yang sengaja bertanggal depan (paket 49 menjanjikan
   catatan bertanggal masa depan tetap sah sebagai uang tercatat). Dengan pemotongan di sumber, batasnya
   jelas: *demo* hanya berisi riwayat, *catatan user* tetap muncul di tanggalnya.
4. Preseden di berkas yang sama: bagian B (belanja rutin & hari kalap) sudah lebih dulu dibatasi `≤ hari ini`;
   sekarang seri A mengikuti aturan yang sama — tidak ada lagi dua aturan rentang yang berbeda di satu berkas.

### 2.3 Tone `'planned'` dipertahankan, artinya diubah; `plannedCount`/`plannedDays` dibuang
`planned` sekarang **hanya** lahir dari satu cabang: hari yang pengeluarannya murni tagihan tetap
(`fixedSpend > 0 && variableSpend === 0`) — mis. tanggal 1 (Kos) yang sudah tercatat. Artinya "hari yang
isinya cuma uang yang sudah direncanakan", bukan "rencana". `plannedCount`/`plannedDays` dihapus karena
satu-satunya pembacanya adalah ringkasan periode (tidak ada UI yang menampilkannya) → itu jalur mati.

### 2.4 `PLANNED_BADGE_LABEL` → `FIXED_BILL_BADGE_LABEL` (`'Tagihan Tetap'`)
Label lama berbunyi "Terencana" dan dipakai untuk menandai rencana masa depan. Karena label itu masih
dipakai untuk hal yang nyata (baris tagihan tetap di daftar hari + muka sel), namanya ikut diganti supaya
tidak ada lagi kata `planned` yang bermakna "masa depan". Sekaligus chip baris harian dipindah ke
`CALENDAR_ENTRY_CHIP` di `lib/data/calendar.ts` — dulu label-labelnya hidup di JSX komponen, jadi legenda
kalender dan daftar hari bisa berbeda kalimat tanpa ada yang sadar.

### 2.5 [Bayar Sekarang] tidak diganti tombol apa pun
Tombol itu "pembayaran" yang tidak membayar apa pun (tanpa baris kas, tanpa saldo bergerak, tandanya hilang
saat halaman ditutup — batas yang sudah jujur ditulis di paket 49). Rumah tagihan adalah `/bills`, dan sejak
paket 51 tombol "Tandai Lunas" di sana membuka pemilih dompet lalu **benar-benar mengeluarkan uang**.
Menambahkan tombol apa pun di kalender hanya akan membuat "pintu kedua" lagi, jadi jalurnya ditutup, bukan
dijembatani.

### 2.6 Empty state hari mendatang: jujur + tetap punya aksi
Dua kalimat lama (`Belum ada tagihan terjadwal`, `Tidak ada tagihan jatuh tempo di tanggal ini. Tenang aja 🌿`)
adalah klaim tentang masa depan yang tidak bisa dibuktikan aplikasi ini. Diganti:
`Belum ada catatan` + penjelasan bahwa user boleh mencatat, **diarahkan ke tombol `Tambah Catatan di Tgl X`**
yang duduk dua baris di atasnya (buka `AddCalendarNoteSheet` dengan tanggal terpilih). Tidak dibuat CTA kedua
di dalam kotak kosong: satu tombol untuk satu aksi.

### 2.7 Copy pindah ke `lib/data/calendar.ts`
Semua kalimat yang disentuh paket ini (judul daftar, hitungan "n catatan", dua empty state, CTA "Tambah
Catatan di Tgl X", baris "Tidak ada uang yang bergerak", teks bubble kosong, panel "Pilih tanggal dulu")
tinggal di `CALENDAR_DAY_COPY`. Tidak ada string copy baru yang ditulis langsung di JSX.

---

## 3. Penyimpangan dari PRD — wajib diumumkan

**Ini menyimpang dari PRD 3C yang memang menyebut "Ramalan Tagihan" untuk kalender cashflow.** Permintaan
pemilik produk ("hilangin ramalan … gak usah ada ramal-ramal") diambil sebagai keputusan produk yang
menggantikan bagian PRD itu: kalender **tidak lagi** menjadi tempat melihat kewajiban yang belum dibayar.

Yang menyertainya (supaya penyimpangan ini tidak menghapus fungsi):

1. **Kewajiban yang belum dibayar tetap punya rumah:** `/bills` — daftar + timeline + "7 Hari ke Depan" —
   lengkap dengan "Tandai Lunas" yang menggerakkan uang dari dompet yang dipilih (paket 51).
2. **Perubahan brief yang perlu ditulis di dokumen PRD/brief:** kalimat "Ramalan Tagihan" pada brief halaman
   Kalender (bagian 3C) sudah tidak berlaku; gantinya: *"Kalender hanya menampilkan uang yang sudah tercatat."*
3. **Usulan lanjutan (TIDAK dikerjakan di paket ini, sengaja tidak setengah-setengah):** kalau nanti
   dikehendaki baris tagihan yang dibayar di `/bills` ikut muncul di tanggalnya di kalender, itu berarti
   menulis baris kas bertipe `fixed_bill` (atau menandai barisnya sebagai milik tagihan) — pekerjaan
   tersendiri (butuh kolom asal-tagihan di baris ledger + aturan konteks uangnya), bukan tambalan di grid.

## 4. File yang dibuat / diubah

| Berkas | Status | Isi perubahan |
|---|---|---|
| `lib/data/calendar.ts` | diubah | `CalendarEntryStatus` & field `status` dihapus; `statusFor()` dihapus; `monthlyDates(day, todayIso)` dipotong di hari ini; `CellTotals.forecast`/`plannedCount` & `DayMetrics.hasForecast`/`isFuture` dihapus; cabang `isFuture` `calendarTone()` dihapus; `forecastTotal`/`forecastCount`/`plannedDays` dihapus; `PLANNED_BADGE_LABEL` → `FIXED_BILL_BADGE_LABEL` `'Tagihan Tetap'`; `CALENDAR_ENTRY_CHIP` & `CALENDAR_DAY_COPY` baru; doc komentar dirapikan jujur |
| `components/catetind/cashflow-calendar-grid.tsx` | diubah | `cellSummary()` tanpa cabang ramalan (pakai `CALENDAR_DAY_COPY.bubbleEmpty`); doc muka sel & makna krem diperbarui |
| `components/catetind/cashflow-inspector.tsx` | diubah | judul "Ramalan Tagihan" + badge `ramalan` dihapus; daftar `cell.forecast` & [Bayar Sekarang] dihapus; `CashflowEntryRow` disederhanakan (tanpa `forecast`/`paid`/`onPay`); empty state dua versi (masa depan vs sudah lewat) dari `CALENDAR_DAY_COPY`; prop `paidForecastIds`/`onPayForecast` dibuang; `ENTRY_CHIP` lokal → `CALENDAR_ENTRY_CHIP` |
| `components/catetind/cashflow-calendar-screen.tsx` | diubah | state `paidForecastIds` + `handlePayForecast` + impor mati (`toast`, `maskMoney`, `shortDateLabel`, `type CalendarEntry`) dihapus; `entries` memo jadi satu baris; `periodEmpty` hanya melihat entri tercatat; doc PAKET 56 ditambahkan |
| `lib/data/calendar.test.ts` | diubah | ekspektasi `status: 'cleared'` diganti `expect('status' in entry).toBe(false)`; **5 test baru** untuk paket 56 (lihat §5) |
| `docs/handoff/laporan/bukti/56-calendar-entri-contoh.json` | **baru** | bukti data: 159 entri demo, **0** berstatus ramalan, **0** bertanggal masa depan, tanggal terbaru `2026-09-25` |
| `docs/handoff/laporan/bukti/56-calendar-halaman.html` | **baru** | bukti layar: HTML `/calendar` dari `next start` |
| `docs/handoff/laporan/56-hapus-ramalan-kalender-cashflow-laporan.md` | **baru** | laporan ini |

Bukti data diambil lewat probe sementara `lib/data/zz-probe.test.ts` (pola yang sama dengan paket 51);
berkas probe **sudah dihapus** — yang tertinggal hanya JSON buktinya.

---

## 5. Test murni paket 56 (`lib/data/calendar.test.ts`)

| # | Test | Yang dikunci |
|---|---|---|
| 1 | *entri demo tidak punya status ramalan & tidak ada yang bertanggal masa depan* | `'status' in entry === false` untuk **semua** 159 entri demo + `buildCalendarEntries()` (dipanggil ulang) tidak menghasilkan satu pun tanggal `> hari ini` |
| 2 | *hari masa depan yang kosong → tone `none`, tanpa forecast/plannedCount* | 28 Sep 2026 (hari masa depan di periode September): `tone 'none'`, muka `empty`, `'forecast' in cell === false`, `'plannedCount' in cell === false` |
| 3 | *catatan bertanggal masa depan tetap tampil sebagai entri biasa (bukan ramalan)* | entri tanggal 28 Sep ikut dihitung (`variableSpend` 50rb) dan tidak dikategorikan "planned" (muka `spend`) — ramalan dihapus tanpa ikut menghapus kemampuan user mencatat |
| 4 | *hari berisi entri nyata → tone & muka sel sesuai isinya* | ambang defisit 800rb (rerata 500rb × 1,6), hari 900rb `deficit`, hari tagihan tetap 1,5jt `planned` ("The Rent Penalty Fix" utuh), hari gaji `surplus`, hari kecil `none` |
| 5 | *ringkasan periode hanya berisi fakta* | `income`/`fixedSpend`/`variableSpend`/`moved`/`net` benar; `'plannedDays' in summary === false`, `'forecastTotal'`/`'forecastCount'` juga |

Hasil: **`lib/data/calendar.test.ts` 15 test hijau** (10 test paket 49 lama + 5 baru), total suite
**511 test / 34 berkas hijau**.

## 6. Bukti layar & bukti data

`next start` → `GET /calendar` (HTTP 200, 113.825 byte) → disimpan di
`docs/handoff/laporan/bukti/56-calendar-halaman.html`. Pencarian di HTML:

| Yang dicari | Jumlah | Arti |
|---|---|---|
| `ramalan` / `Ramalan` | **0** | kata itu hilang dari halaman |
| `Terencana` | **0** | penanda rencana hilang dari legenda & daftar |
| `Bayar Sekarang` | **0** | aksi bayar palsu hilang |
| `Kredivo`, `420.000` | **0** | tagihan masa depan yang belum dibayar tidak digambar (28 Sep kosong) |
| `forecast` | **0** | tidak ada sisa istilah itu di markup |
| `Belum ada tagihan terjadwal` | **0** | janji masa depan hilang |
| `Keterangan · Boros · Surplus · Nol jajan · Ada belanja · Tagihan Tetap` | 1 tiap label | legenda menjelaskan lima muka yang memang masih dipakai |
| aria-label `26/27/28 Sep — belum ada catatan` | 1 tiap tanggal | hari mendatang kosong = netral, tanpa taksiran |
| `Transaksi Hari Ini` + `Gaji Bulanan` | 1 | panel hari terpilih (25 Sep) menampilkan uang yang memang tercatat |

Bukti data (`56-calendar-entri-contoh.json`): `jumlahEntri: 159`,
`entriTanpaStatusRamalan: 159`, `entriBertanggalMasaDepan: []`, `tanggalTerbaru: "2026-09-25"`,
78 tanggal berisi entri (1 Juli – 25 Sep 2026).

---

## 7. Hasil validasi (apa adanya)

```
pnpm theme:audit          → ✓ palet bersih — 336 file diperiksa, tidak ada warna di luar palet.
pnpm exec tsc --noEmit    → (tanpa output) exit code 0
pnpm test                 → Test Files 34 passed (34) · Tests 511 passed (511)
pnpm build                → exit code 0 · route `/calendar` ○ (Static) prerendered as static content
```

---

## 8. Yang belum bisa diverifikasi

1. **Klik sungguhan di browser** (memilih tanggal 28 Sep, mencatat dari panel hari kosong, lalu melihat
   tanggalnya muncul di Riwayat/kalender) — bukti di atas diambil dari HTML `next start` (server-rendered) +
   test murni; interaksi client belum diuji di perangkat.
2. **Nilai `moved`/`income` di bulan-bulan awal jendela data (Juli–Agustus)** hanya terverifikasi lewat fungsi
   murni, bukan lewat navigasi grid di layar.
3. **Perilaku periode masa depan (Oktober–November 2026)** — sekarang periode itu tampil kosong + empty state
   per konteks (tidak ada entri demo di masa depan). Tampilan empty state itu belum dilihat di layar; yang
   diuji baru logikanya (`periodEmpty`).
4. **Penyelarasan dokumen PRD**: kalimat "Ramalan Tagihan" pada brief halaman Kalender **belum** diubah di
   berkas PRD (`CatetInd_Master_PRD_Lengkap.md` tidak memuat frasa itu; teksnya ada di brief/prompt paket).
   Catatan penyimpangan di §3 ini yang jadi rujukan sampai brief/PRD diperbarui.
5. **Catatan proses (jujur):** saat mengerjakan paket ini satu berkas (`cashflow-inspector.tsx`) sempat
   terhapus karena salah tulis path pada perintah shell; berkas itu **dipulihkan persis** dari git
   (terverifikasi: `git diff` untuk berkas itu kosong, dan seluruh test/`tsc`/`build` hijau setelahnya).
   Tidak ada pekerjaan paket lain yang hilang karena berkas itu tidak punya modifikasi lokal yang belum
   ter-commit.



