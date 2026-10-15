# Laporan Paket 96 — Kartu "Transaksi Terakhir" Berisi Variasi (bukan cuma Pengeluaran)

> **Tanggal:** 15 Okt 2026
> **Kanon kerja:** `docs/handoff/CONTEXT-WAJIB.md` (§2 struktur, §7 no dead affordance, §9 DoD)
> **Permintaan pemilik produk:** “transaksi terakhir coba bikin variasi jangan
> semuanya pengeluaran. di bagian yang ini aja: `/app` — pure untuk demo aja itu.”

## Akar masalah — jendela 7 hari berisi PENGELUARAN saja

Kartu "Transaksi Terakhir" di `/app` membaca baris ledger NYATA
(`recordedTransactions()` → `homeMoneyRowFrom()`), menyaring 7 hari kalender
terakhir, lalu memotongnya ke 5 baris (`HOME_RECENT_MAX_ROWS`). Seluruh isi seed
demo — kecuali satu baris gaji bertanggal **tanggal 1** — adalah pengeluaran yang
disebar dari tanggal 1 sampai HARI INI. Akibatnya, di hari biasa (mis. hari ke-15)
lima baris yang terlihat semuanya dari hari yang sama dan semuanya `-Rp`:

| # | Sebelum (jam · tipe · catatan) |
|---|---|
| 1 | 14:40 · expense · Kopi lokal (americano) |
| 2 | 13:05 · expense · Nasi Padang Sederhana |
| 3 | 12:40 · expense · Mie Gacoan (makan siang bareng kantor) |
| 4 | 09:15 · expense · Kopi Kenangan Oat Latte |
| 5 | 07:20 · expense · Gojek ke Stasiun (hujan deras) |

Kartu yang seharusnya meringkas "bagaimana uangku bergerak" jadi terbaca seperti
riwayat belanja sehari — padahal uang masuk & pindah dana sama normalnya.

## Yang diperbaiki (3 berkas)

| File | Perubahan |
|---|---|
| `lib/money/demo-bootstrap.ts` | **Baris ekor baru** (`seedRecentActivity`, dipanggil PALING AKHIR): satu **uang masuk** (`Tunjangan Transport & Makan`, Rp 300.000, kategori `Pemasukan Lain` → tile mint, tanda `+`) dan satu **pindah dana** (`Top up GoPay dari BCA`, Rp 200.000, kategori `Transfer`, tanda `⇄`) berjam paling malam di hari berjalan (22:30 & 22:15). Gaji dipecah jadi gaji pokok (Rp 7.000.000, tanggal 1) + tunjangan (Rp 300.000, hari ini) sehingga Σ pemasukan tetap `DEMO_INCOME` 7.300.000. `opening` BCA/GoPay digeser (300.000 / 750.000) supaya saldo tiap dompet tetap angka cerita. `DEMO_SEED_VERSION` `'4'` → `'5'` (perangkat yang masih memegang persona lama otomatis disiapkan ulang). |
| `lib/money/store.ts` | `TransferInput.time?: string` (opsional) diteruskan `postTransfer()` → `appendRow()`. Alasan & cakupannya SAMA dengan `ExpenseInput.time`: diisi HANYA oleh seed demo supaya jam baris contoh masuk akal; catatan user tetap memakai jam dinding (`clockLabel()`). Tanpa ini baris pindah dana contoh berjam "jam seed dijalankan" dan bisa muncul di ATAS catatan yang lebih baru. |
| `lib/money/demo-bootstrap.test.ts` | +3 kasus: lima baris teratas memuat `income` + `transfer` + `expense` dan baris pertama BUKAN pengeluaran; urutan "terbaru dulu" tetap utuh; angka cerita tidak bergeser (7.300.000 · 5.180.000 · total 2.120.000). Barisnya dibangun lewat pipeline yang SAMA dengan komponennya (`recordedTransactions()` → `homeMoneyRowFrom()` → `homeRowsInLastDays()` → `capHomeRecentRows()`). |

## Sesudah (dicetak dari ledger seed yang sama)

| # | Sesudah (jam · tipe · catatan · nominal) |
|---|---|
| 1 | 22:30 · **income** · Tunjangan Transport & Makan · `+Rp 300.000` |
| 2 | 22:15 · **transfer** · Top up GoPay dari BCA · `Rp 200.000` |
| 3 | 14:40 · expense · Kopi lokal (americano) · `-Rp 25.500` |
| 4 | 13:05 · expense · Nasi Padang Sederhana · `-Rp 100.000` |
| 5 | 12:40 · expense · Mie Gacoan (makan siang bareng kantor) · `-Rp 28.500` |

## Keputusan desain yang perlu diingat

1. **Angka cerita TIDAK bergeser.** Tunjangan bukan uang baru: ia bagian dari
   `DEMO_INCOME` (gaji pokok diturunkan sebesar itu), dan pindah dana netral untuk
   total uang. Karena itu Σ pemasukan 7.300.000, Σ pengeluaran 5.180.000, dan
   total dompet 2.120.000 tetap sama — seluruh test persona & `monthlyIncome`
   tidak perlu diubah.
2. **Ditulis PALING AKHIR, jam paling malam.** Baris ledger disisipkan di DEPAN
   (`appendRow`), jadi yang terakhir ditulis = yang teratas di kartu — dan
   ketentuan "input sudah urut terbaru dulu" di `capHomeRecentRows()` tetap
   jujur. Jam 22:15/22:30 dipilih karena itu LEBIH LAMBAT dari jam seed termalam
   yang mungkin jatuh di hari ini (`Gojek ke stasiun (malam)` 22:10, self-reward
   Shopee 21:30) — termasuk saat seed dijalankan tanggal 1, ketika semua jangkar
   tanggal terjepit ke hari ini.
3. **Bukan gesture/data baru di UI.** Tidak ada satu komponen pun disentuh:
   kartu Home sudah bisa menggambar `income`/`transfer` (`MONEY_ROW_VISUAL` +
   `amountSign`), jadi yang kurang memang hanya datanya.
4. **Halaman Riwayat ikut kaya secara gratis.** Karena barisnya baris ledger
   sungguhan (bukan hiasan khusus kartu Home), ia juga muncul di `/history`,
   `/wallet/[id]`, dan grafik/ringkasan periode — tanpa perubahan khusus.
5. **Cakupan SENGAJA hanya demo.** Replika layar di landing
   (`HERO_DEVICE_TXN_ROWS`) tidak diubah: komponennya menggambar semua baris
   sebagai pengeluaran (tile plum + panah `ArrowUpRight`), jadi menambahkan baris
   masuk/pindah dana di sana berarti mengubah komponen landing — di luar
   permintaan "di bagian ini aja".

## Validasi (output apa adanya)

- `pnpm exec tsc --noEmit` → **bersih** (tanpa output).
- `pnpm exec vitest run` → **1231 test / 89 berkas LULUS**
  (sebelum paket ini 1228/89).
- `pnpm exec vitest run lib/money/demo-bootstrap.test.ts` → **15 test LULUS**
  (12 lama + 3 baru).
- Profil baris di atas dicetak dari ledger NYATA hasil `seedDemoDataOnce()`
  (probe sementara sudah dihapus setelah dipakai), termasuk saldo per dompet:
  BCA 1.650.000 · GoPay 320.000 · ShopeePay 85.000 · Tunai 65.000 (Σ 2.120.000).
