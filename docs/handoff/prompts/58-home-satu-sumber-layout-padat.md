# 58 — Home: satu sumber kebenaran, empty state jujur, Jatah Harian dipadatkan

**Baca dulu:** `docs/handoff/AUDIT-UANG-2026-09.md` (khusus AKAR A, §4, §5) +
`docs/handoff/CONTEXT-WAJIB.md` §2–§10.
**Ketergantungan:** paket 57 SELESAI & hijau (jangkar waktu + konfigurasi uang user + Jatah
Harian turunan). Jangan mulai paket ini sebelum 57 hijau.

## 1. Ruang lingkup

Boleh disentuh: `components/catetind/home-screen.tsx`, `daily-hud-card.tsx`,
`daily-hud-summary.tsx`, `expense-distribution-card.tsx`, `recent-transactions-card.tsx`,
`cash-flow-card.tsx`, `plant-widget.tsx`, `my-goals-card.tsx`, `daily-nudge.tsx`,
`monthly-target-card.tsx`, `wallet-card-stack.tsx`, `lib/data/home-money.ts`, `lib/data/home.ts`.

DILARANG menyentuh rumus uang (`lib/money/ledger.ts`, `balanceOf`, `assertLedgerInvariant`) dan
DILARANG menambah konstanta/mock baru.

## 2. Item kerja

### 58.1 Semua kartu Home membaca STORE, bukan konstanta (AKAR A)

Kerjakan **semua baris** tabel AKAR A di dokumen audit. Aturan pengerjaan:

- Pindahkan SUMBER angka ke `useMoneyStore()` / funds-store / konfigurasi uang user (paket 57).
- **DILARANG** hanya menambah cabang `if (length === 0)` di atas mock lama — mock itu harus
  berhenti menjadi sumber angka.
- Setiap kartu WAJIB punya empty state: kalimat nurturing + CTA nyata ke route yang BENAR-BENAR ADA.
- AC: dengan dompet 0 & ledger 0, **tidak ada satu pun angka uang dari data contoh** di layar.
  Bukti: daftar kartu × angka yang muncul sebelum vs sesudah.

### 58.2 `expense-distribution-card.tsx` — turunkan dari transaksi nyata

- `SEGMENTS` (baris 19-24) & `TOTAL = 3_150_000` (baris 26) adalah hardcode.
- Hitung dari transaksi user pada periode yang kartu itu nyatakan (label "Bulan ini" harus sejalan
  dengan periode nyata hasil paket 57).
- Tanpa transaksi → empty state (bukan 4 segmen contoh).
- AC: catat 1 pengeluaran kategori Makanan Rp 30.000 → kartu mencerminkan itu. Bukti angka.

### 58.3 `plant-widget.tsx` — buang `MOCK { hp: 82, activeDays: 21 }`

- Baris 26-30 & 61 dipakai sebagai `plant={{ ...MOCK, stage }}`.
- `activeDays` = jumlah tanggal unik pada ledger (tombstone disaring). `hp` diturunkan dari
  progres celengan (pola `stageFromPercent` / `stageBandProgress` yang sudah ada di
  `my-goals-card.tsx`).
- Tanpa data → tampil "belum ada aktivitas" yang jujur, BUKAN 82% / "21 hari".
- AC: sebelum → sesudah dengan memperlihatkan kedua angka.

### 58.4 `daily-nudge.tsx` — turunkan dari store atau jangan tampil

- Baris 31 masih komentar "mock". Nudge harus dipicu data nyata (mis. belum ada setoran celengan
  bulan ini) atau tidak muncul sama sekali.
- AC: nudge tidak muncul saat pemicunya tidak ada.

### 58.5 Redesign layout Home (permintaan langsung user)

Struktur sekarang (`home-screen.tsx:308-339`):

- baris-1 = `WalletCardStack` (5/12) + [`DailyHudCard` + `DailyNudge`] (7/12)
- baris-2 = `PlantWidget` + `CashFlowCard`
- baris-3 = `RecentTransactionsCard` + [`ExpenseDistributionCard` + `MyGoalsCard`]

Yang diminta:

1. **"Arus Uang" naik ke atas, "Jatah Hari Ini" turun.** Jatah Hari Ini tidak lagi menjadi kartu
   beruang kosong yang mendikte tinggi baris pertama.
2. **Padatkan kartu Jatah Hari Ini.** Sekarang `SIZE = 120` + `STROKE = 11` (ring 104px), saldo
   `text-3xl`, ring %, dan 3 baris footer (`daily-hud-card.tsx:42-44, 156-206`). Yang dituju:
   angka utama + 1 baris konteks + bar progres; ring dipangkas/diganti bentuk.
   Larangan: informasi tidak boleh hilang (sisa, hari tersisa, cicilan, status) dan jangan hapus
   `aria-label` / `role="progressbar"` / `aria-valuenow`.
3. **Tidak boleh ada ruang kosong lebih tinggi dari konten.** Khususnya buang pola
   `flex h-full flex-col justify-center` yang memaksa kartu memanjang mengikuti kartu tinggi di
   sebelahnya (`home-screen.tsx:310`).
4. Hormati `prefers-reduced-motion` untuk animasi ring/bar (yang sekarang:
   `animate-[donut-grow_1.1s_ease-out_both]`).

- AC: tinggi kartu Jatah Hari Ini **sesudah < sebelum** — sebutkan angkanya (mis. dari
  `getBoundingClientRect()` atau hasil analisis CSS build, pola bukti laporan 56).
- AC: daftar elemen informasi sebelum vs sesudah → tidak ada yang hilang.
- Kalau lingkungan kerjamu tidak punya browser: **tulis bahwa uji visual 375/1440 px belum
  dilakukan**. Jangan diklaim.

### 58.6 Riwayat transaksi di Home dibatasi

- `recent-transactions-card.tsx:401` sekarang menampilkan SEMUA grup (`visibleGroups` tanpa cap).
- Batasi ke **7 hari terakhir** (atau N terbaru yang tidak melewati batas 7 hari kalender) +
  tombol **"Lihat semua"** → `/history` (di sana sudah ada filter lengkap).
- AC: dengan data > 7 hari → Home hanya menampilkan yang dalam 7 hari + tombol tersebut.
  Bukti: jumlah baris sebelum vs sesudah.

### 58.7 Kartu dompet saat tidak ada data

- `wallet-card-stack.tsx` membaca store di baris 168.
- Pastikan keadaan 0 dompet menampilkan kartu "Tambah Dompet" sebagai satu-satunya kartu +
  kalimat, tanpa angka contoh.
- AC: kosongkan data → layar Home; daftar kartu yang tampil + kalimat tiap kartu.

## 3. Definition of Done paket 58

1. Empat perintah validasi hijau (tempel output + jumlah test).
2. Tabel: kartu Home × sumber angka sesudah (semuanya store/konfigurasi — nol konstanta).
3. Tabel: keadaan "data kosong" → apa yang tampil di tiap kartu.
4. Tabel sebelum → sesudah: tinggi kartu Jatah Hari Ini + susunan baris Home.
5. Laporan `docs/handoff/laporan/58-home-satu-sumber-layout-padat-laporan.md` (format §6 audit) +
   batas jujur.
