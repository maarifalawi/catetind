# Laporan — Grafik "Arus Uang" Bergelombang Sampai Hari Ini

> **Sifat pekerjaan:** murni **DATA seed demo** (`lib/money/demo-bootstrap.ts`) +
> satu blok test baru. Tidak ada perubahan bentuk kartu, rumus, atau warna:
> `components/catetind/cash-flow-card.tsx`, `lib/data/home-money.ts`, dan
> `HOME_CASHFLOW_COLORS` tidak disentuh satu baris pun.

---

## 1. Keluhan yang ditutup

Screenshot kartu **"Arus Uang"** (Home): kurvanya bergelombang **hanya di awal
bulan** — satu puncak tinggi di tanggal 1, lalu garis rata sampai ujung kanan.

Permintaan pemilik produk: **buat gelombangnya jalan sampai hari ini, jangan
cuma di awal.**

---

## 2. Akar masalahnya (bukan bug grafik)

Kartu itu sudah benar: satu titik per hari, sumbu-Y dari puncak harian
(`cashFlowSeriesPeak` → `niceAxisMax`), penanda "Hari ini" jujur. Yang salah
adalah **sebaran tanggal seed demo**.

Dijalankan apa adanya (test probe sementara, `vi.setSystemTime` 15 Okt 2026),
pengeluaran bulan berjalan keluar begini:

| Tanggal | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **(lama)** Rp | 1.862.000 | 177.000 | 429.000 | 1.113.500 | 62.000 | 178.000 | 126.000 | 133.500 | 62.000 | 175.000 | 125.500 | 125.500 | 112.000 | 294.000 | 205.000 |

60% uang bulan itu (kos 1,8jt + listrik + transfer ortu 1jt) jatuh di tanggal
1–4. Sisa bulan cuma Rp 62–294 rb/hari.

Sumbu-Y kartu dipatok gaji **Rp 7,3 jt → `niceAxisMax` = 10 jt**. Di kanvas
setinggi ±300px itu, Rp 60 rb ≈ **2 px** dan Rp 294 rb ≈ **9 px**, sementara
puncak tanggal 1 ≈ **56 px**. Jadi secara matematis kurvanya memang rata —
bukan karena datanya nol, tapi karena nominal hariannya tenggelam oleh satu
tagihan raksasa di tanggal 1.

---

## 3. Yang dibangun

Dua keputusan di `seedExpenses` (`lib/money/demo-bootstrap.ts`):

**a. Tagihan dipasang lewat RASIO bulan berjalan, bukan tanggal tetap.**
Helper baru `anchorDayISO(ratio)`: `0` = tanggal 1, `1` = hari ini (dijepit
`dayOfMonthISO`). Tanggal tetap ("tanggal 12") akan menumpuk SEMUA di tanggal 3
kalau demo dibuka tanggal 3 — gelombangnya balik lagi ke awal. Dengan rasio,
puncaknya selalu jatuh di ~⅓ · ~⅔ · ~⅞ bulan **yang sudah berjalan**, di tanggal
berapa pun demo dibuka.

**b. Kos dibayar DUA KALI (DP + pelunasan).**
Σ kos 1,8jt sekaligus di tanggal 1 selalu jadi puncak tunggal yang menenggelamkan
sisa bulan. Dipecah (`Kosan Bulan Ini (DP)` 1.100.000 + `Kosan Bulan Ini
(pelunasan)` 700.000) kurvanya naik-turun dua kali dengan tinggi sebanding.

Plus: `Transfer Mamah` pindah ke ~85% bulan berjalan, `Token Listrik & WiFi` ke
~35%, `Alfamart` ~30%, `Self-Reward Shopee` ~95%, dan **transport disebar merata**
dari hari ini mundur ke tanggal 1 (`ago` dihitung dari rasio, bukan tanggal).

Hasilnya (tanggal yang sama):

| Tanggal | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **(baru)** Rp | 1.182.000 | 157.000 | 146.000 | 93.500 | **433.000** | 157.000 | 166.000 | 93.500 | **780.000** | 157.000 | 157.500 | 93.500 | **1.152.000** | 207.000 | 205.000 |

Empat puncak (±37px · 13px · 24px · 36px) tersebar tiap ~4 hari, dengan lembah
Rp 94–166 rb — gelombangnya berjalan dari tanggal 1 **sampai hari ini**, dan
tanggal setelah hari ini tetap nol (ekor rata itu jujur: sisa bulan belum jalan).

### Yang TIDAK berubah (dikunci test lama, tetap lulus)

- Σ per kategori persis: Kos+Listrik 2.150.000 · Makan 1.350.000 · Transfer Ortu
  1.000.000 · Kopi 420.000 · Transport 210.000 · Self-Reward 50.000.
- Σ pengeluaran 5.180.000 · pemasukan 7.300.000 · sisa 2.120.000.
- Saldo tiap dompet: BCA 1.650.000 · GoPay 320.000 · ShopeePay 85.000 · Tunai
  65.000.
- Celengan Bali 25% (Tunas), donut distribusi, dan cermin angka di
  `lib/data/landing.ts` — semuanya ikut utuh karena totalnya tidak bergerak.


---

## 4. Nomor versi seed dinaikkan → perangkat lama menyiapkan ulang sendiri

`DEMO_SEED_VERSION` `'3'` → **`'4'`**. Sesuai mekanisme fresh start yang sudah
ada, browser yang masih memegang persona lama akan membuang state LOKAL
(IndexedDB + kunci `catet*`) lalu **memuat ulang sekali**, dan menulis persona
baru. Tanpa itu, demo yang sudah pernah dibuka tetap menampilkan grafik lama.

---

## 5. File yang berubah

| File | Perubahan |
|---|---|
| `lib/money/demo-bootstrap.ts` | `DEMO_SEED_VERSION = '4'`. Helper baru `anchorDayISO(ratio)`. `seedExpenses`: kos dipecah DP (1.100.000) + pelunasan (700.000), listrik/alfamart/reward/transfer ortu dipasang lewat rasio bulan berjalan, transport disebar merata dari hari ini mundur ke tanggal 1. Doc "CERITA AKUN DEMO" + catatan "PENGELUARAN BULAN INI, DISEBAR SAMPAI HARI INI" ditulis ulang (alasan angka & tanggalnya). |
| `lib/money/demo-bootstrap.test.ts` | Import `afterEach`/`vi`; `describe` baru **"gelombang arus uang sampai hari ini (seed 4)"**, 3 kasus, tanggal dipatok `vi.setSystemTime` (15 Okt 2026 & 3 Okt 2026) supaya deterministik: (1) ≥3 puncak (≥10% pengeluaran bulan) dengan puncak terakhir mendekati hari ini dan maksimum satu di sepertiga pertama; (2) tiap hari 1…hari ini punya pengeluaran, tanggal 16+ nol; (3) dibuka tanggal 3 pun tidak menumpuk (tanggal 1 < Rp 2 jt). |
| `docs/handoff/laporan/arus-uang-gelombang-sampai-hari-ini-laporan.md` | Laporan ini. |

---

## 6. Bukti validasi

- `pnpm exec vitest run lib/money/demo-bootstrap.test.ts` → **12 passed**
  (9 lama utuh + 3 kasus gelombang baru).
- `pnpm exec vitest run` (seluruh suite) → **89 file, 1228 test, semua lulus**
  (baseline sebelum perubahan: 1225 test — +3 kasus gelombang baru).
- `pnpm exec tsc --noEmit` → bersih.
- Profil harian di atas dicetak dari ledger NYATA hasil `seedDemoDataOnce()`
  lewat `homeCashFlowSeries()`/`cashFlowSeriesPeak()` — bukan dari konstanta di
  test (probe sementara sudah dihapus setelah dipakai).

## 7. Cara melihat

```powershell
pnpm dev
# http://localhost:3000/app  → kartu "Arus Uang"
```

Browser yang sudah pernah membuka demo akan **memuat ulang sekali sendiri**
(versi seed baru) — setelah itu grafiknya bergelombang dari tanggal 1 sampai
penanda "Hari ini". Paksa mulai ulang kapan saja: DevTools → Application →
Storage → **Clear site data** → refresh.

**Catatan:** kalau dibuka di awal bulan (tanggal ≤ 5), gelombangnya otomatis
memadat di hari-hari yang sudah berjalan — itu memang jujur, bukan regresi.
