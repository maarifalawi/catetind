# Laporan 58 — Home: satu sumber kebenaran, empty state jujur, Jatah Harian dipadatkan

**Status:** ✅ SELESAI — diimplementasikan & divalidasi (28 Sep 2026) · **Paket:** 58
**Prompt:** `docs/handoff/prompts/58-home-satu-sumber-layout-padat.md`
**Konteks wajib:** `docs/handoff/CONTEXT-WAJIB.md` + `docs/handoff/AUDIT-UANG-2026-09.md`

> Ringkas: Home berhenti membaca konstanta demo. Kartu "Arus Uang", "Distribusi
> Pengeluaran", dan "Transaksi Terakhir" kini membaca baris LEDGER NYATA
> (`useMoneyStore()`) — bukan `HOME_MONEY_GROUPS`/`HOME_MONEY_ROWS` — dan semuanya
> punya empty state yang jujur. MOCK tanaman (82% / 21 hari) dibuang, nudge AI
> dipicu data nyata, layout diatur ulang (Arus Uang naik, Jatah Hari Ini turun +
> dipadatkan), dan daftar Transaksi dibatasi 7 hari kalender dengan "Lihat semua".

## 1. Ringkas (3–5 baris)

- **58.1** — Sumber angka kartu uang Home = `recordedTransactions()` (ledger nyata,
  tombstone sudah disaring) + konfigurasi uang user (paket 57). Seed demo tetap
  hidup sebagai kanon data (audit §1.11) tetapi berhenti menjadi sumber angka
  kartu. Temuan "tiga angka pengeluaran berbeda di Home" tertutup: HUD,
  Distribusi, dan Arus Uang kini membaca himpunan yang sama.
- **58.2** — Distribusi Pengeluaran diturunkan dari pengeluaran user di bulan
  berjalan (`distributionSegments()`, murni & teruji); kategori ke-5+ digabung ke
  "Lainnya"; tanpa pengeluaran ⇒ empty state (temuan #11).
- **58.3/58.4** — `MOCK { hp: 82, activeDays: 21 }` diganti turunan: hp = progres
  celengan hero, activeDays = jumlah tanggal unik di ledger; nudge AI dipicu
  fungsi murni `shouldShowDailyNudge()` (belum ada catatan hari ini + sudah sore +
  akun tidak kosong).
- **58.5** — Layout baru: baris-1 = deck dompet + **Arus Uang**; baris-2 = tanaman +
  **[Jatah Hari Ini + Nudge]**. Jatah Hari Ini dipadatkan (ring 104 px → bar 2 px,
  angka 28 px, satu baris konteks) ⇒ tinggi kartu turun **≈ 218 px → ≈ 166 px**
  (analisis CSS; browser tidak tersedia di lingkungan ini).
- **58.6/58.7** — Daftar Transaksi Terakhir dibatasi 7 hari kalender ("Lihat semua"
  → `/history`); keadaan 0 dompet = kartu "Tambah Dompet" sebagai satu-satunya
  kartu + kalimat pengantar.
- Validasi: **564 test / 38 file hijau**, `tsc` 0 error, `pnpm build` sukses,
  `pnpm theme:audit` "palet bersih" (343 file).

## 2. File yang dibuat/diubah

| # | File | Perubahan | Alasan |
|---|---|---|---|
| 1 | `lib/data/home-money.ts` | Turunan murni baru: `homeRowsInLastDays()` (58.6), `homeMoneyGroupLabel()`/`groupHomeMoneyRows()`, `distributionSegments()` (58.2), `activeLedgerDays()` (58.3), `monthShortFromISO()`, `shouldShowDailyNudge()` (58.4); `homeCashFlowSeries(rows, monthISO?)` menerima bulan nyata; `HOME_MONEY_COPY` + kalimat empty state; doc "PAKET 58" (seed = kanon demo, bukan sumber angka) | 58.1–58.4 & 58.6 — semua angka kartu Home harus turunan yang bisa diuji tanpa React |
| 2 | `lib/data/home.ts` | `HOME_PLANT_COPY` diperluas (judul modal, label HP, label/body hari aktif + varian "Belum ada aktivitas"); `HOME_WALLET_STACK_COPY`; `HOME_NUDGE_COPY` | §8 — copy user-facing tidak boleh literal di JSX |
| 3 | `components/catetind/expense-distribution-card.tsx` | Tulis ulang: `SEGMENTS`/`TOTAL = 3_150_000` dibuang; segmen dari ledger bulan berjalan; empty state + CTA; palet kanon dirotasi per urutan segmen; `motion-reduce:animate-none` | 58.2 + temuan #11 (kartu tidak punya empty state) |
| 4 | `components/catetind/recent-transactions-card.tsx` | `HOME_MONEY_GROUPS`+catatan sesi → **hanya** `recordedTransactions()`; cap 7 hari kalender; grup per tanggal nyata (`groupHomeMoneyRows`); strip "Bulan ini" dari baris bulan berjalan; copy → `HOME_MONEY_COPY` | 58.1 + 58.6 (AKAR A) |
| 5 | `components/catetind/cash-flow-card.tsx` | `HOME_MONEY_ROWS` dibuang; seri + label bulan dari jam perangkat; empty state + CTA + tautan Riwayat; badge surplus/defisit hanya saat ada data | 58.1 (AKAR A) |
| 6 | `components/catetind/daily-hud-card.tsx` | Tulis ulang bentuk padat: angka 28 px + bar progres (`role="progressbar"` + `aria-valuenow`) + satu baris konteks (sisa · hari · cicilan); ring 104 px & `text-3xl` dihapus; `motion-reduce:transition-none` | 58.5 — Jatah Hari Ini tidak lagi mendikte tinggi baris |
| 7 | `components/catetind/daily-nudge.tsx` | `HAS_RECORD_TODAY = false` (mock) → fakta dari `recordedTransactions()` + `useTodayISO()`; gate lewat `shouldShowDailyNudge()`; akun kosong tidak dinudge; copy → `lib/data/home.ts` | 58.4 (AKAR A) |
| 8 | `components/catetind/plant-widget.tsx` | `MOCK { hp: 82, activeDays: 21, wilted: false }` dibuang; hp = `fundPercentRounded(heroFund)`; activeDays = `activeLedgerDays(ledger, today)`; wilted = hp > 0 && hp ≤ 20; droplet & judul memakai `HOME_PLANT_COPY` | 58.3 (AKAR A) |
| 9 | `components/catetind/plant-detail-modal.tsx` | "Hari aktif bulan ini" menampilkan **"Belum ada aktivitas"** saat 0 (bukan "0 hari"); judul/label/kalimat pindah ke `HOME_PLANT_COPY` | 58.3 — surface tempat `hp`/`activeDays` benar-benar dibaca user |
| 10 | `components/catetind/home-screen.tsx` | Layout: baris-1 = deck + **Arus Uang**; baris-2 = tanaman + **[Jatah + Nudge]**; pembungkus `flex h-full flex-col justify-center` dibuang | 58.5 (permintaan langsung user) |
| 11 | `components/catetind/wallet-card-stack.tsx` | Deck saat 0 dompet = hanya kartu "Tambah Dompet" (kartu agregat "Rp 0" tidak dirender) + baris kalimat; copy ke `HOME_WALLET_STACK_COPY` | 58.7 |
| 12 | `lib/money/store.test.ts` | SATU test lama ("satu edit terbaca sama di Riwayat, Home, dan /wallet/[id]") disesuaikan pembangun row-set-nya agar mencerminkan sumber baru — **tidak** dihapus/di-`skip` | test harus jujur ikut desain baru |
| 13 | `lib/data/home-money.test.ts` **(baru)** | 21 kasus uji: 7 hari (3), grup harian (4), distribusi (4), hari aktif (3), seri bulanan (3), pemicu nudge (4) | bukti angka yang bisa dijalankan ulang |

## 3. Yang dikerjakan (per item prompt)

| # | Item | Hasil | Bukti |
|---|---|---|---|
| 58.1 | Semua kartu Home baca store (AKAR A) | Arus Uang, Transaksi, Distribusi = ledger nyata; HUD = ledger + konfigurasi user (paket 57); Tanaman = ledger + funds-store; Nudge = ledger; Deck = ledger. `HOME_MONEY_ROWS/GROUPS` hanya tersisa di komentar + kanon demo/test | grep `HOME_MONEY_ROWS` di `components/**` ⇒ hanya komentar; `git diff --stat` 12 file |
| 58.2 | Distribusi Pengeluaran turunan | `distributionSegments()`: hanya `expense` > 0, urut menurun, >4 kategori ⇒ "Lainnya"; kartu: empty state + CTA + tautan `/history` | `lib/data/home-money.test.ts` case "catat 1 pengeluaran Makanan Rp 30.000 → Makanan 30.000 (100%)" |
| 58.3 | Plant widget tanpa MOCK | hp/activeDays/wilted turunan; modal menulis "Belum ada aktivitas" saat 0 | test `activeLedgerDays` (3 kasus) + grep `MOCK` ⇒ 0 pemakaian kode |
| 58.4 | Daily nudge turunan | `shouldShowDailyNudge({ hour, hasRecordToday, accountEmpty, forceShow })`; komponen membacanya | test 4 kasus (jam 20 + ada catatan ⇒ false; akun kosong ⇒ false) |
| 58.5 | Redesign layout (Arus Uang naik) | baris-1 = deck(5)+ArusUang(7); baris-2 = tanaman(5)+[HUD+Nudge](7); `justify-center` dibuang; HUD padat; `role="progressbar"`/`aria-valuenow` ditambah; `motion-reduce` dihormati | `home-screen.tsx:303-341`; tinggi CSS ≈ 218 → ≈ 166 px (§4) |
| 58.6 | Riwayat Home dibatasi 7 hari | `homeRowsInLastDays(rows, today)` + "Lihat semua" → `/history` (tombol lama dipertahankan, teks dari copy) | test 3 kasus (28/22/21 Sep + 1 Okt ⇒ 2 baris) |
| 58.7 | Kartu dompet saat 0 data | deck = `[{ type: 'add' }]` saat `wallets.length === 0`; kartu agregat tidak dirender; kalimat pengantar di muka kartu | `wallet-card-stack.tsx:176-185`, `:805-814` |

## 4. SEBELUM → SESUDAH (angka)

### 4.1 Kartu yang menampilkan angka contoh saat data kosong (dompet 0 & ledger 0 = "Hapus Akun")

| Kartu | Sebelum | Sesudah |
|---|---|---|
| Distribusi Pengeluaran | 4 segmen contoh — Makanan 1.260.000 (40%) · Transport 819.000 (26%) · Tagihan 630.000 (20%) · Belanja 441.000 (14%); badge TOTAL **Rp 3.150.000** | **0 angka** — "Belum ada pengeluaran bulan ini" + CTA "+ Catat Pengeluaran" + tautan "Lihat Riwayat" (/history) |
| Transaksi Terakhir | 5 baris seed: Gaji Bulanan **7.500.000** · Starbucks 85.000 · Grab 42.000 · Listrik PLN 350.000 · Shopee 275.000; strip "Bulan ini +7.500.000 masuk, -752.000 keluar — net +6.748.000" | **0 angka** — "Belum ada catatan" + CTA "+ Catat Transaksi" |
| Arus Uang | pemasukan **7.500.000** / pengeluaran **752.000**; badge "Surplus 90%"; sumbu "10 jt"/"500 rb" | **0 angka** — "Arus uangmu belum tergambar" + CTA; badge & sumbu tidak dirender |
| Tanamanmu | HP **82%** (4/5 droplet) · "Hari aktif bulan ini: **21 hari**" · kalimat "Kamu udah catat 21 hari bulan ini" | hp = progres celengan (demo: Dana Darurat 4.200.000/15.000.000 = **28%**, 1/5 droplet) · "**Belum ada aktivitas**" · kalimat `activeEmptyBody` |
| Nudge AI Coach | selalu layak tampil (`HAS_RECORD_TODAY = false` + gate jam) | **tidak dirender** — pemicu palsu hilang; akun kosong juga tidak dinudge |
| Deck dompet | 2 kartu: "Semua Dompet **Rp 0**" + "Tambah Dompet" | 1 kartu: "Tambah Dompet" + "Belum ada dompet — tambah satu dulu biar saldomu kebaca 🌱" |
| Jatah Hari Ini | CTA "Jatah harianmu belum bisa dihitung…" (sejak paket 57) | sama — nol angka contoh |

Cara reproduksi: `/settings` → Hapus Akun (atau panggil `purgeDeviceData()`), lalu lihat Home — sebelum paket 58 kolom kiri masih berisi; sesudahnya semuanya empty state.

### 4.2 AC 58.2 — catat 1 pengeluaran kategori Makanan Rp 30.000

| Yang diukur | Sebelum | Sesudah |
|---|---|---|
| Segmen kartu | tetap 4 segmen contoh (3.150.000); catatan 30.000 tidak muncul | `[{ Makanan, 30.000, 100% }]` + badge total Rp 30.000 |
| Bukti | — | `lib/data/home-money.test.ts` → "catat 1 pengeluaran Makanan Rp 30.000 → Makanan 30.000 (100%)" |

### 4.3 AC 58.6 — jumlah baris Riwayat di Home dengan data > 7 hari

| Input uji (hari ini 28 Sep 2026) | Sebelum (tanpa cap) | Sesudah |
|---|---|---|
| 4 baris: 28 Sep, 22 Sep, 21 Sep, 1 Okt | 4 baris / 3 grup tampil | **2 baris** (28 & 22 Sep); 21 Sep & 1 Okt hanya di `/history`; tombol "Lihat semua" tetap ada |

### 4.4 Tinggi kartu Jatah Hari Ini + susunan baris Home (58.5)

| Yang diukur | Sebelum | Sesudah |
|---|---|---|
| Tinggi kartu, keadaan normal (analisis CSS box-model) | header ≈ 32 + ring **104** + footer ≈ 38 + padding 32 ≈ **218 px** | header ≈ 32 + angka 28 + caption 14 + bar 8 + footer ≈ 38 + gap ≈ 14 + padding 32 ≈ **166 px** (**−52 px ≈ −24%**) |
| Tinggi keadaan "over" | ≈ 218 px + CTA Review ≈ 38 | ≈ 166 + copy status 16 + CTA 38 ≈ 224 px (kartu masih lebih pendek dari ring-state saat lebarnya sama) |
| Susunan baris Home | baris-1 = deck(5) + [Jatah + Nudge](7) · baris-2 = Tanaman(5) + **Arus Uang**(7) · baris-3 = Transaksi(7) + [Distribusi + Goals](5) | baris-1 = deck(5) + **Arus Uang**(7) · baris-2 = Tanaman(5) + **[Jatah + Nudge](7)** · baris-3 tetap |
| Elemen informasi kartu Jatah | judul · subjudul · chip status · angka · caption · ring % · copy status · sisa · hari · cicilan · CTA (over) | judul ✓ · subjudul ✓ · chip status ✓ · angka ✓ · caption ✓ · **% terpakai + label** (menggantikan ring) ✓ · bar progres ✓ (baru: `role="progressbar"` + `aria-valuenow`) · copy status (saat approaching/over) ✓ · sisa ✓ · hari ✓ · cicilan ✓ · CTA Review (over) ✓ |
| Informasi hilang | — | **tidak ada** (lihat baris di atas; ring 104 px diganti bar 2 px, bukan dihapus informasinya) |

> Catatan metode: angka tinggi di atas dihitung dari kelas CSS (padding, font-size, gap, tinggi svg) — **bukan** `getBoundingClientRect()`, karena lingkungan kerja ini tidak punya browser. "Sesudah < sebelum" berlaku untuk perhitungan yang sama di kedua kolom.

## 5. Test

| File test | Jumlah kasus | Hasil |
|---|---|---|
| `lib/data/home-money.test.ts` **(baru)** | 21 | ✅ hijau (`pnpm exec vitest run lib/data/home-money.test.ts` → 21 passed) |
| `lib/money/store.test.ts` (1 test disesuaikan: row-set Home) | 67 | ✅ hijau |
| Seluruh suite | **564 test / 38 file** | ✅ hijau (baseline sebelum paket ini: 543 test / 37 file) |

## 6. Validasi (output apa adanya)

```bash
pnpm test                # 564 test / 38 file — hijau, tanpa .skip
  Test Files  38 passed (38)
       Tests  564 passed (564)

pnpm exec tsc --noEmit   # 0 error (exit 0, tanpa output)

pnpm build               # sukses — seluruh route ter-generate
  ✓ /  /bills  /budget  /budget/[id]  /calendar  /history  /wallet/[id]  /wealth  …

pnpm theme:audit         # palet bersih — 343 file diperiksa, tidak ada warna di luar palet
```

Output lengkap 4 perintah disimpan di `docs/handoff/laporan/bukti/58-validasi.txt`.

> Catatan: output mentah memuat satu peringatan Node (`--localstorage-file`) yang
> diangkat PowerShell sebagai `NativeCommandError` — itu peringatan lingkungan, bukan
> kegagalan test/build: keempat perintah berakhir dengan exit code 0.

## 7. Batas jujur

- **Uji visual 375/1440 px & `getBoundingClientRect()` BELUM dilakukan** — lingkungan ini
  tidak punya browser. Klaim "tinggi turun" di §4.4 adalah **analisis CSS box-model**
  (padding/font-size/gap/tinggi svg) atas kelas yang dipakai, bukan pengukuran piksel
  nyata; horizontal scroll, kerapian grid 1440 px, dan kontras juga belum diverifikasi
  di layar.
- **`prefers-reduced-motion` dihormati lewat kelas** (`motion-reduce:transition-none` di
  bar Jatah Harian, `motion-reduce:animate-none` di kartu Distribusi/Arus Uang), tapi
  **belum diuji di perangkat** dengan setelan itu aktif.
- **Home vs `/history` bisa tampak berbeda sampai paket 59 selesai**: Home kini murni
  baris ledger, sedangkan `/history` masih menggabung `HISTORY_TRANSACTIONS` (mock)
  (`history-screen.tsx:194-206` — baris yang persis disebut audit AKAR A). Itu batas
  paket: 58 menggarap Home; 59 menggarap Riwayat. Bukan regresi — justru alasan tombol
  "Lihat semua" dipertahankan.
- **Demo Home kini "kosong" untuk kartu uang sampai user mencatat.** Ini konsekuensi
  langsung dari AC 58.1 ("dompet 0 & ledger 0 ⇒ nol angka contoh") + aturan audit §1.11
  (seed tidak boleh lagi menjadi sumber angka komponen). Sengaja, diumumkan, dan
  punya empty state + CTA di tiap kartu.
- **Asumsi keputusan yang saya ambil** (prompt mengizinkan ambil keputusan konservatif):
  1. sumber angka Home = **ledger nyata + konfigurasi uang user** (bukan seed demo);
  2. `HOME_MONEY_GROUPS`/`HOME_MONEY_ROWS` **tidak dihapus** — tetap kanon DEMO & bahan
     test (masih dipakai `lib/money/store.test.ts` dan katalog `mockRowByKey()`), hanya
     berhenti dipakai sebagai angka layar;
  3. copy status kartu Jatah dirender hanya saat status ≠ `onTrack`; chip status selalu ada;
  4. `plant-detail-modal.tsx` ikut disentuh (di luar daftar file prompt) karena di sanalah
     `hp`/`activeDays` dibaca user — tanpa itu AC "belum ada aktivitas" tidak bisa dipenuhi.
- `daily-hud-summary.tsx` (ada di daftar ruang lingkup) **nol perubahan diperlukan**: ia
  menerima `hud`/`income` sebagai props dari `/budget`, dan sejak paket 57 keduanya sudah
  dihitung dari store + konfigurasi uang user.
- **Satu test lama disesuaikan, bukan dihapus/di-`skip`**: `lib/money/store.test.ts`
  ("satu edit terbaca sama di Riwayat, Home, dan /wallet/[id]") — pembangun row-set-nya
  dulu `recorded + HOME_MONEY_ROWS`, sekarang `recordedTransactions()` saja, mengikuti
  sumber baru; assertions-nya tidak dilonggarkan (row teredit tetap harus bergerak & pindah
  dompet).
- Keyframe `donut-grow` (`app/globals.css`) kini tanpa pemakai di kartu Jatah Harian;
  `globals.css` di luar ruang lingkup paket ini sehingga **sengaja tidak disentuh**.
- Tidak ada dependency baru, tidak ada mock/konstanta baru (hanya fungsi turunan murni +
  copy di `lib/data/*`), dan **tidak ada perintah git yang dijalankan** (working tree
  paket 43–57 tetap utuh, apa adanya).

## 8. Pertanyaan terbuka

1. **Riwayat (paket 59) vs sumber baru Home.** Home sekarang = ledger-only, sedangkan
   prompt 59.1 masih menghitung "baris sesi + mock yang belum dihapus tombstone". Kalau
   Riwayat tetap menggabung mock, daftar Riwayat akan lebih panjang daripada Home sampai
   ada keputusan produk. Pilihan yang mungkin: (a) ikut ledger-only (mock jadi kanon test
   saja), atau (b) mock tetap tampil di Riwayat. Paket 58 memilih (a) untuk Home karena
   AC-nya menuntut itu — keputusan untuk Riwayat ada di paket 59/pemilik repo.
2. **Apakah seed baris ledger demo mau ditanam ke IndexedDB saat first-run** supaya demo
   Home tetap "hidup" tanpa user mencatat? Itu keputusan produk; paket 58 tidak menambah
   mock baru (aturan audit) dan memilih jujur-mengosongkan layar daripada mengarang angka.
3. **Copy status Jatah Hari Ini** saat on-track tidak dirender (chip statusnya tetap ada).
   Kalau pemilik repo ingin kalimatnya selalu tampil, cukup hapus kondisi
   status !== 'onTrack' di daily-hud-card.tsx — tinggi kartu ikut naik ±16 px.
4. **`HOME_MONEY_GROUPS`/`HOME_MONEY_ROWS` + override `seed-*`** sekarang tanpa pemakaian
   di UI (masih dipakai test & katalog edit baris mock). Hapus saja setelah paket 59–62,
   atau pertahankan sebagai kanon demo ekspor/onboarding?
