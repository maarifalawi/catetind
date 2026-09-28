# 35 — Ringkasan Uang Home Satu Sumber (Chart Cash Flow vs "Transaksi Terakhir")

**Paket:** konsistensi angka di satu layar · **Fase 12** · **Depends on:** #33 (ringkasan kartu
"Transaksi Terakhir" sudah bergerak mengikuti catatan)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Bukti gap (audit 27 Sep 2026 — akibat sampingan paket 33, belum pernah dilaporkan)

Paket 33 membuat **satu** ringkasan di Home menjadi turunan data, tetapi kartu sebelahnya dibiarkan
statis. Keduanya menampilkan angka yang **sama persis** saat seed — jadi sekarang mereka bisa
bercerita berbeda tentang uang yang sama:

| # | Lokasi | Temuan |
|---|---|---|
| 1 | `components/catetind/cash-flow-card.tsx:7-24` | `INCOME = 8_500_000` · `EXPENSE = 752_000` + `SERIES` 5 titik + `INCOME_MAX`/`INCOME_AXIS`/`EXPENSE_AXIS` — semua **konstanta keras**. Komentarnya sendiri menulis *"data bulan ini — selaras dengan ringkasan di kartu Transaksi Terakhir"* |
| 2 | `components/catetind/cash-flow-card.tsx:273-279` | strip penutup: `saveRate`% + `surplus {money(net)}` dihitung dari dua konstanta di atas |
| 3 | `components/catetind/recent-transactions-card.tsx:365-381` | ringkasan "Minggu ini" **DITURUNKAN** dari baris yang tampil (seed + catatan sesi) → **bergerak** begitu user mencatat |
| 4 | `components/catetind/recent-transactions-card.tsx:111-133`, `:122` | seed-nya memang 8.500.000 masuk (Gaji Bulanan) dan 752.000 keluar → nilainya identik dengan konstanta kartu chart **hanya karena kebetulan seed** |
| 5 | label | kartu chart menyebut konteks **bulan** (`1 Sep … 29 Sep`, "bulan ini") sedangkan kartu transaksi menyebut **"Minggu ini"** — padahal keduanya menampilkan 8.500.000 / 752.000 / net 7.748.000 yang sama |

Akibatnya di layar: user mencatat pengeluaran Rp 25.000, kartu "Transaksi Terakhir" berubah
(8.500.000 / 777.000 / net 7.723.000), lalu tepat di sebelahnya chart masih menulis "surplus
Rp 7.748.000" dan "84% pemasukan disimpan". Dua angka berbeda untuk uang yang sama **di satu layar
yang sama** — persis pola yang paket 30 baru saja tutup untuk kartu celengan.

## Peta baca

- **178–191** — Home: kartu ringkasan harus *nudge kontekstual* dari data user, bukan pajangan
- **294–334 / 2A.1** — *Zero Cognitive Load*: satu angka, satu makna, jangan dua daftar yang mirip
- **244** — "jujur di setiap klaim" (dasar larangan angka yang tidak bisa ditelusuri)
- **641–758** — Budget & Daily HUD: contoh pola "satu sumber angka" yang sudah dipakai repo

**Kode acuan:**

- `components/catetind/recent-transactions-card.tsx:350-381` — pola baca bus + turunkan ringkasan
  (`readRecordedTransactions()` + `subscribeRecordedTransactions()` + `useMemo`)
- `lib/transaction-bus.ts` — pintu baca/langganan yang **sudah ada**; jangan bikin bus kedua
- `components/catetind/daily-hud-card.tsx:19-21` — contoh kartu yang angkanya **tidak** dihitung ulang
  di komponen, tapi dibaca dari satu konstanta kanon di `lib/data/*`
- `lib/data/history.ts` → `amountSign`, `summarizeTransactions`, `MASKED_AMOUNT`

## Kenapa ini penting (psikologi audiens — CONTEXT-WAJIB §5)

1. **§5.1–5.2 — kepercayaan dibangun dari angka yang bisa ditelusuri.** Audiens repo ini capek
   ditipu dasbor yang angkanya tidak nyambung. Dua ringkasan yang berbeda di satu layar cukup untuk
   membuat user berhenti mempercayai **semua** angka di halaman itu.
2. **§5.3 poin 3 — nol pemicu kecemasan.** User mengira uangnya "hilang"/"salah catat"; padahal
   yang salah cuma sumber angkanya.
3. **§5.4 — Zero Cognitive Load.** Kalau ada dua ringkasan, keduanya harus menjelaskan hal yang
   **berbeda** (mis. "bulan ini" vs "minggu ini") — bukan dua bentuk dari kenyataan yang berbeda.

## Yang harus dibangun

Pilih **satu** jalan yang jujur, tulis alasannya di komentar + laporan, lalu selesaikan:

- **Jalan A — satu sumber data (disarankan).** Kartu chart menghitung total & serinya dari daftar
  transaksi yang **sama** dengan kartu "Transaksi Terakhir" (seed + catatan sesi lewat
  `lib/transaction-bus.ts`), lalu kedua kartu menyebut periode yang **sama** (mis. "Bulan ini" untuk
  keduanya — jangan satu "minggu", satu "bulan"). Seri 5 titik boleh tetap disusun dari total itu,
  tapi jumlah `expense` di seri **wajib** sama dengan total yang ditulis di strip.
- **Jalan B — akui bedanya (kalau chart memang periode lain).** Tulis periode tiap kartu secara
  eksplisit dan beda ("Bulan ini" vs "Minggu ini"), dan pastikan angka chart juga bergerak saat user
  mencatat dalam periode itu — bukan konstanta keras.

Kewajiban untuk kedua jalan:

1. **Satu sumber angka.** Nol konstanta nominal keras di komponen kartu; angka diturunkan dari data
   (seed + bus) atau dibaca dari `lib/data/*`. Kalau butuh seri bulanan, turunkan di `lib/data/*`
   sebagai helper murni.
2. **Nilai awal tidak boleh bergeser.** Tanpa catatan sesi, kedua kartu tetap menampilkan
   `8.500.000` masuk · `752.000` keluar · net `7.748.000` (seed Hari ini/Kemarin/21 Sep) — angka
   patokan audit.
3. **Sikap privasi tetap (§5.7).** Kedua kartu sudah memakai `usePrivacy` (`cash-flow-card.tsx:82`,
   `recent-transactions-card.tsx:330`) — pastikan sifat itu tidak hilang; termasuk sumbu-Y chart
   (`INCOME_AXIS`/`EXPENSE_AXIS`, mis. `"8,5 jt"`) yang juga menyiratkan nominal. Kalau sumbu itu
   dibiarkan terbaca, tulis alasannya; kalau disensor, tetap satu definisi (`MASKED_AMOUNT`/helper lain).
4. **Nol string copy baru di JSX** — label periode/insight tinggal di `lib/data/*`.
5. **Hapus komentar yang tidak lagi benar** di `cash-flow-card.tsx:7` ("selaras dengan ringkasan di
   kartu Transaksi Terakhir") — ganti dengan aturan final.

## Acceptance criteria

- [ ] Setelah mencatat satu transaksi (FAB `+`), angka di kartu chart **dan** kartu "Transaksi
      Terakhir" sama-sama bergerak (dibuktikan lewat kode + HTML/probe; tidak ada konstanta keras
      yang tertinggal).
- [ ] Tanpa catatan sesi, kedua kartu identik dengan sebelumnya (`8.500.000` / `752.000` / net
      `7.748.000`) — angka patokan audit tidak bergeser.
- [ ] Label periode kedua kartu **jujur** (tidak satu "Minggu ini" vs satu "Bulan ini" untuk total
      yang sama, kecuali memang totalnya dihitung beda).
- [ ] Nol bus/store kedua; `lib/transaction-bus.ts` dipakai apa adanya.
- [ ] Privasi tetap berlaku di kedua kartu (termasuk label sumbu bila menyiratkan nominal).
- [ ] `DAILY_HUD` tidak bergeser: `remaining 800000 · daysLeft 4 · dailyBudget 200000 ·
      sinkingObligation 3600000 · shortfall false`; HTML Home tetap `Rp 800.000×2 · Rp 200.000×1 ·
      "4 hari"×1`.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Menambah angka/konstanta nominal baru di komponen (semua turunan atau dari `lib/data/*`).
- Mengubah seed kartu "Transaksi Terakhir" atau `INITIAL_*` supaya "kelihatan cocok".
- Menambah backend/API/dependency baru, atau Zustand/IndexedDB (pola bus sesi + komentar arah produksi).
- Menyentuh `lib/data/pricing.ts`, `/terms`, `/privacy`, Properti (PRD A12), dan tabel hutang.
- Mengubah angka patokan demo (saldo dompet mock, `SPENT_THIS_MONTH`, `TOTAL_INSTALLMENTS`,
  `DAILY_HUD`, `INITIAL_BUDGETS`, `INITIAL_SINKING_FUNDS`).

## Validasi (jalankan & tempel hasilnya apa adanya)

```bash
pnpm theme:audit
pnpm exec tsc --noEmit
pnpm build
```

Laporan wajib memuat: jalan yang dipilih + alasannya, file yang dibuat/diubah, bukti kedua kartu
bergerak bersama (sebelum → sesudah satu catatan), bukti angka patokan tidak bergeser, dan hasil
ketiga perintah di atas.

