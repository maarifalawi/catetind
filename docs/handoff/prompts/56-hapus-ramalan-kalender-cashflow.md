# 56 — Hilangkan "Ramalan" dari Kalender Cashflow

**Paket:** temuan uji pemakaian 28 Sep 2026 · **Fase 13** · **Depends on:** — (bisa jalan sendiri;
koordinasi dengan 49 & 51 untuk isi kalender yang sah)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + `lib/data/calendar.ts` (satu-satunya sumber
> data kalender) + `components/catetind/cashflow-calendar-grid.tsx` & `cashflow-inspector.tsx`.

## Permintaan pemilik produk

"Hilangin ramalan di Kalender Cashflow. Gak usah ada ramal-ramal."

## Bukti: di mana "ramalan" hidup hari ini

| # | Bukti | Isi |
|---|---|---|
| 1 | `lib/data/calendar.ts:59` | `CalendarEntryStatus = 'cleared' \| 'upcoming_forecast'` |
| 2 | `lib/data/calendar.ts:607-670` | `statusFor(iso, todayIso)` → setiap entri seed bertanggal > hari ini otomatis jadi `upcoming_forecast` |
| 3 | `lib/data/calendar.ts:330-361` | pengelompokan sel: `if (entry.status === 'upcoming_forecast') bucket.forecast.push(...)` (+ `plannedCount`) |
| 4 | `lib/data/calendar.ts:124-127, 269-288` | `CellTotals.forecast`, `DayMetrics.hasForecast`, `calendarTone()` → `isFuture ? (hasForecast ? 'planned' : 'none')` |
| 5 | `lib/data/calendar.ts:754-796` | ringkasan periode menghitung `plannedDays` |
| 6 | `components/catetind/cashflow-calendar-grid.tsx:52-65` | bubble sel bisa berbunyi `Rp X · ramalan` |
| 7 | `components/catetind/cashflow-calendar-grid.tsx:231-240` + `CALENDAR_LEGEND` | legenda memuat penanda "Terencana"/ramalan |
| 8 | `components/catetind/cashflow-inspector.tsx:28,62,84,105-106,138,162-197,237,287,325` | judul "Ramalan Tagihan", badge `ramalan`, daftar ramalan, dan aksi **`[Bayar Sekarang]`** untuk tagihan masa depan |
| 9 | `components/catetind/cashflow-calendar-screen.tsx:95-108,166` | state `paidForecastIds` + `handlePayForecast` (ramalan ditandai lunas di halaman itu) |

Dua masalah: (a) kalender menampilkan angka yang **belum terjadi** sebagai kalau-kalau fakta, dan
(b) aksi "Bayar Sekarang" di kalender menandai lunas tanpa benar-benar membayar (jalur tulis kedua
untuk hal yang sudah punya rumahnya sendiri di `/bills`).

## Aturan kanon

- Kalender hanya menampilkan **uang yang benar-benar ada**: catatan user + transaksi dari store
  (paket 49). Yang belum terjadi tidak digambar.
- **Kewajiban yang belum dibayar tetap punya rumah:** `/bills` (+ timeline-nya). Setelah paket 51,
  "Lunas" di sana benar-benar menggerakkan uang.
- Ini **menyimpang dari PRD 3C** yang memang menyebut "Ramalan Tagihan" — penyimpangan itu wajib
  ditulis di laporan sebagai keputusan produk, bukan disembunyikan; kode lama yang tidak dipakai lagi
  boleh dihapus (jangan tinggalkan jalur mati).

## Peta baca

- `lib/data/calendar.ts` → `CellTotals`, `DayMetrics`, `calendarTone()`, `calendarCell()`,
  `CALENDAR_LEGEND`, `CalendarLook`, `PLANNED_BADGE_LABEL`, `SUMMARY`/`plannedDays`
- `components/catetind/cashflow-calendar-screen.tsx` → pemilik state kalender & window periode
- `components/catetind/cashflow-calendar-grid.tsx` → sel + legenda
- `components/catetind/cashflow-inspector.tsx` → panel hari (daftar entri + aksi)

## Yang dikerjakan (urutan)

1. **Data: buang status ramalan** (`lib/data/calendar.ts`)
   - `CalendarEntryStatus` tinggal `'cleared'` (atau tipe enumnya dihapus dan entri tidak lagi punya
     `status`); hapus `statusFor()` sehingga tidak ada lagi entri yang lahir sebagai ramalan.
   - Hapus `CellTotals.forecast`, `DayMetrics.hasForecast`, `plannedCount`/`plannedDays` **kecuali**
     masih dipakai untuk SEL non-ramalan (kalau dipakai untuk "hari ini hanya berisi tagihan tetap",
     ganti namanya jadi jelas: `fixedOnlyCount` — jangan pertahankan nama `planned` yang bermakna ramalan).
   - `calendarTone()`: cabang `isFuture` **dihapus** → hari masa depan tanpa catatan = `'none'`
     (netral, tanpa larangan warna). Tone `'planned'` hanya untuk hari yang benar-benar berisi entri
     tetap (mis. tagihan yang sudah tercatat/dibayar).
2. **Grid: bubble jujur** (`cashflow-calendar-grid.tsx`) — `cellSummary()` hanya: (1) pemasukan,
   (2) pengeluaran, (3) kosong. Tidak ada lagi `· ramalan`. Legenda (`CALENDAR_LEGEND`) diperbarui:
   penanda ramalan/Terencana dihapus dari daftar; label tone yang tersisa tetap dijelaskan.
3. **Inspector: hanya hari yang punya isi** (`cashflow-inspector.tsx`)
   - judul daftar "Ramalan Tagihan" → hilang; hanya ada daftar catatan/transaksi hari itu;
   - badge `ramalan` + `PLANNED_BADGE_LABEL` di daftar dihapus (kalau label itu masih dipakai untuk
     entri nyata, ganti namanya);
   - aksi **[Bayar Sekarang]** dihapus dari kalender (rumahnya di `/bills`, dan di sana sudah
     diwajibkan menggerakkan uang oleh paket 51);
   - hari masa depan yang kosong → empty state jujur + jalur "Catat di tanggal ini" (buka
     `AddCalendarNoteSheet` dengan tanggal terpilih) supaya user tetap punya aksi;
   - copy `plannedOnly`/ringkasan jadwal disesuaikan dengan keadaan baru (semua copy ke `lib/data/*`).
4. **Screen: bersihkan state ramalan** (`cashflow-calendar-screen.tsx`) — hapus `paidForecastIds`,
   `handlePayForecast`, dan impor yang jadi mati. Pastikan tidak ada penanda localStorage/sesi
   ramalan yang tersisa (kalau ada, hapus + tulis di laporan).
5. **Konsistensi dengan paket lain (tanpa mengerjakannya di sini):**
   - paket 49: catatan user & transaksi store tetap muncul di tanggalnya (itu satu-satunya isi kalender);
   - paket 51: tagihan yang dibayar di `/bills` menggerakkan uang di DOMAIN tagihan; kalau ingin
     barisnya muncul di kalender, itu pekerjaan lanjutan (tulis sebagai usulan, jangan setengah-setengah).
6. **Test murni** (`lib/data/calendar.test.ts` — buat berkasnya kalau belum ada):
   - entri bertanggal masa depan TIDAK lagi punya status ramalan;
   - `calendarCell()` untuk hari masa depan kosong → `tone: 'none'`, tanpa `forecast`/`plannedCount`;
   - hari yang berisi entri nyata → `tone` & ringkasan benar;
   - ringkasan periode tidak lagi menghitung `plannedDays`.

## Larangan

- Menampilkan angka yang belum terjadi sebagai fakta (termasuk "proyeksi saldo akhir periode" — kalau
  ada di layar kalender, ikut dihapus).
- Menyentuh mesin lain di `calendar.ts` (window periode, tone defisit/surplus, benih "nol belanja").
- Menghapus kemampuan user mencatat dari kalender (justru dipertahankan lewat poin 3).
- Menambah tombol/CTA baru yang tidak punya jalur tulis (dilarang "tombol mati").
- Mengubah seed `CALENDAR_ENTRIES` selain status & `scope` (paket 47).

## Bukti yang harus ditunjukkan

- `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`, `pnpm theme:audit`.
- Bukti layar (boleh dari HTML `next start`): kalender **tidak** memuat kata "ramalan"/"Ramalan" dan
  tidak memuat angka tagihan masa depan yang belum dibayar; hari masa depan kosong tampil netral.
- Bukti data: daftar entri seed setelah perubahan (semua `cleared`) + test poin 6 hijau.
- Laporan: file dibuat/diubah, **pernyataan eksplisit** bahwa ini menyimpang dari PRD 3C (dan bahwa
  kewajiban tagihan tetap hidup di `/bills`), plus hal yang belum bisa diverifikasi.
