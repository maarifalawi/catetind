# Laporan 47 — Konteks Uang (Pribadi/Keluarga/Bersama) Dihormati SELURUH Halaman

**Status:** selesai diimplementasikan & divalidasi · **Paket:** temuan A laporan 46 · **Fase 13**

> Ringkas: konteks uang akhirnya berlaku di **seluruh** halaman, bukan cuma Home & `/budget`.
> Sebelum paket ini hanya **4 berkas** yang membaca `useMoneyContext()`; sekarang `/wallet`,
> `/history`, `/calendar`, `/bills`, `/wealth`, dan `/joint` masing-masing memuat switcher
> (mobile + desktop), menyaring **daftar & arus** dengan konteks aktif, dan tetap menampilkan
> **total global** dengan kalimat cakupan. Model `Bill`, `CalendarEntry`, `Investment`, dan
> `Debt` mendapat kolom `scope` (tipe `BudgetScope` yang sama — tidak ada tipe konteks kedua),
> penyaringnya satu modul murni (`lib/money/context-filter.ts`), dan baris yang konteksnya tak
> bisa dipastikan **tidak hilang** — ia diberi badge "Belum berkonteks".

---

## 1. Bukti gap yang ditutup (audit 28 Sep 2026 → status)

| # | Gejala (laporan 46 §6 temuan A) | Status | Bukti |
|---|---|---|---|
| 1 | `/wallet` menampilkan & menghitung dompet semua konteks | ✅ FIXED | §3 — kartu disaring `homeWallets()`, total tetap `cashTotal()` + baris "Dompet Pribadi: Rp 1.800.000" |
| 2 | `/history` mencampur transaksi semua konteks | ✅ FIXED | §4 — konteks dibaca dari DOMPET catatan (`rowsForContext`/`tagTransactionsForContext`), baris tanpa dompet ditandai |
| 3 | `/calendar` tidak menyadari konteks | ✅ FIXED | §5 — `CalendarEntry.scope` + saringan `scopedItems()`; ringkasan periode tetap global |
| 4 | `/bills` menampilkan tagihan semua konteks | ✅ FIXED | §6 — daftar & angka pill filter ikut konteks, tameng/waterfall/% beban tetap global |
| 5 | `/wealth` menampilkan aset & hutang semua konteks | ✅ FIXED | §7 — tab Investasi & Hutang disaring, Net Worth tetap global |
| 6 | `/joint` tidak tahu konteks aktif | ✅ FIXED | §8 — catatan jujur + tombol **"Pindah ke Bersama"** (satu tap `setContext('bersama')`) |
| 7 | Model data belum punya konteks | ✅ FIXED | §2 — `scope` di `Bill`, `CalendarEntry`, `Investment`, `Debt`; seed punya isi di ketiga konteks |
| 8 | Baris tanpa dompet dikenal bisa "hilang" saat konteks aktif | ✅ DIKUNCI | §2 — kanon #2: selalu lolos + badge "Belum berkonteks" (12 test di `context-filter.test.ts`) |

---

## 2. Lapis murni yang baru (fondasi semua halaman)

### `lib/money/context-filter.ts` (baru, tanpa React)

| Fungsi | Kegunaan |
|---|---|
| `walletContextOf(snapshot, walletId)` | konteks SATU dompet kanon — **satu-satunya pemilik fakta konteks** |
| `walletNameContext(snapshot, name)` | konteks dari NAMA dompet (baris pajangan: mock Riwayat, kalender) |
| `matchesContext(rowCtx, ctx)` | satu keputusan saring; `'unknown'` **selalu lolos** (kanon #2) |
| `rowsForContext(snapshot, ctx)` | baris ledger yang lolos konteks (tombstone tetap dihormati) |
| `hasUnknownContext(snapshot)` | apakah ada baris yang konteksnya tak bisa dipastikan |
| `contextOfTransaction()` / `tagTransactionsForContext()` / `transactionsForContext()` | versi untuk daftar pajangan (`HistoryTransaction` + penanda) |

**Kenapa konteks dibaca dari DOMPET, bukan kolom `context` di baris catatan:** dompet sudah
menyimpan fakta itu (`WalletSeed.context`, juga kolom `wallets.context` di Supabase). Menambah
kolom konteks kedua di baris = dua sumber kebenaran yang cepat atau lambat berbeda — dan itu
dilarang eksplisit di prompt paket ini.

### `lib/data/money-context.ts` (baru, copy + satu saringan)

- `CONTEXT_LABEL` / `contextName()` / `contextCaption()` — nama konteks yang dipakai switcher,
  caption judul, badge kartu, dan empty state (**satu sumber**; `lib/data/home.ts` yang tadinya
  punya `SCOPE_LABEL` sendiri sekarang mengimpor dari sini).
- `UNKNOWN_CONTEXT_COPY` — badge "Belum berkonteks" + kalimat penjelas (dipakai sebagai `title`
  & bagian dari `aria-label` baris).
- `SCOPE_NOTE` — **kalimat cakupan wajib** untuk tiap angka total (kanon #1).
- `CONTEXT_EMPTY_COPY` — empty state per konteks per halaman (wallet, history, calendar, bills,
  investments, debts) lengkap dengan CTA.
- `JOINT_CONTEXT_COPY` — notice `/joint` + label tombolnya.
- `scopedItems(items, ctx)` — SATU implementasi penyaring `scope` untuk tagihan/kalender/hutang/aset.

### `scope` pada model & seed (§2 prompt)

| Model | Seed (konteks) |
|---|---|
| `Bill` (`lib/data/bills.ts`) | Kos Bulanan · Spotify · Cicilan HP · Kredivo = **pribadi**; Netflix = **keluarga**; Paket Internet = **bersama** |
| `CalendarEntry` (`lib/data/calendar.ts`) | tiap seri membawa `scope`: Kos/Cicilan Motor/Spotify/Cicilan HP/Kredivo + gaji & freelance + setoran + kopi/warteg/ojol/skincare = **pribadi**; Netflix/Asuransi Jiwa/Belanja sayur/Jajan online/Baju kerja = **keluarga**; IndiHome = **bersama** |
| `Investment` (`lib/data/wealth.ts`) | Bibit RDPU · BBCA · Bitcoin = **pribadi**; Emas Antam = **keluarga** |
| `Debt` (`lib/data/wealth.ts`) | Kredivo · SPayLater · Budi (lunas) = **pribadi**; Rina (piutang) = **keluarga**; Andi = **bersama** |

Semua seed sengaja **tidak** seragam `pribadi`: konteks yang tidak punya isi akan menyembunyikan
bug penyaring, jadi penyebarannya dikunci test (`lib/data/money-context.test.ts`).

---

## 3. `/wallet` — kartu disaring, total & komposisi tetap global

| Bagian | Sebelum | Sesudah |
|---|---|---|
| Kartu dompet | semua dompet (`walletAccounts(snapshot)`) | `homeWallets(snapshot, context)` → hanya dompet konteks aktif |
| Hero "Total Saldo" | `cashTotal()` | **tetap** `cashTotal()` + baris kecil `HOME_TOTAL_COPY.contextLine` ("Dompet Pribadi: Rp 1.800.000") dan `scopeNote` — pola **persis Home**, bukan versi kedua |
| Panel "Komposisi" | semua dompet | **tetap** semua dompet + label "3 akun · semua dompet" (`WALLET_TOTAL_COPY.compositionAccounts`) supaya tidak terbaca bertentangan dengan daftar kartu |
| "Tambah Dompet Cepat" | brand yang belum dimiliki | tetap dari **semua** dompet — menawarkan dompet yang sudah dimiliki di konteks lain itu keliru |
| Log "Pindah Dana Terakhir" | semua baris `transfer` | disaring konteks (arus ikut konteks), baris tanpa dompet tetap tampil |
| Sheet "Pindah Saldo" | daftar tujuan = kartu yang tampil | tujuan = **semua** dompet (pindah ke konteks lain itu sah) |
| Empty state | tidak ada | "Belum ada dompet di konteks Bersama" + CTA yang menambah dompet **di konteks itu** |

Store mendapat satu tambahan kecil agar CTA empty state bukan jalan buntu: `NewWalletInput.context`
(opsional, default `'pribadi'` seperti sebelumnya). Warna kartu tetap dari `walletCardRecipe()`
indeks **seluruh** dompet, bukan yang tersaring — supaya resepnya tidak melompat.

## 4. `/history` (+ `/insight`) — konteks dari dompet, penanda jujur

- Daftar & ringkasan (`summarizeTransactions`, grup harian, "x dari y") memakai himpunan yang
  sudah disaring konteks; filter Waktu/Dompet/Tipe/Kategori & pencarian yang sudah ada tetap jalan
  (diterapkan **setelah** saringan konteks).
- **Insight AI** memakai ambang dari catatan konteks aktif (`InsightCards totalTransactions={contextCount}`)
  → konteks yang belum punya cukup data **tidak** diberi klaim (kanon "jangan pernah kasih false insight").
- **Skor Kewarasan** tetap metrik global (seperti "Total Saldo"), dengan catatan cakupan di header.
- **Heatmap "Kapan Kamu Sering Boros?"** — satu-satunya permukaan yang angkanya DIBANGKITKAN
  (bukan dibaca dari ledger). Seed-nya kini disuntikkan per konteks (`CONTEXT_HEATMAP_SEED`) dan
  labelnya menyebut konteks aktif. Ini keputusan yang diambil **jujur dengan keterbatasan mock**:
  data mock harian belum punya kolom konteks, jadi yang dijamin adalah (a) tiap konteks punya pola
  deterministiknya sendiri (SSR aman), (b) cakupannya tertulis di kartunya. Di produksi angkanya
  datang dari `SELECT occurred_on, SUM(amount) … WHERE context = $1`.
- Baris yang dompetnya belum ada di daftar dompet tampil di **semua** konteks dengan badge
  **"Belum berkonteks"** (mock OVO: 3 baris) — tidak ada catatan user yang hilang (kanon #2).
  `HistoryTransactionRow` mendapat prop opsional `unknownContext` yang juga ikut ke `aria-label`.
- `/insight` tetap **pengalih** ke `/history` (rute lamanya sudah dipindahkan sejak dulu). Karena
  halaman tujuan kini membaca konteks global, ringkasan & insight di `/insight` ikut konteks tanpa
  switcher kedua — alasannya ditulis di `app/insight/page.tsx`.


## 5. `/calendar` — sel & daftar ikut konteks, strip ringkasan tetap total

- Grid dibangun dari entri konteks aktif (`buildCalendarGrid({ entries: visibleEntries })`), jadi
  **sel, warna, forecast, dan daftar tanggal** mengikuti konteks.
- Strip angka periode (pemasukan/belanja/net) dihitung dari **himpunan penuh** lewat grid kedua
  (fungsi murni yang sama) — total tidak mengecil — dan `SCOPE_NOTE.calendar` ditulis di header
  supaya user tahu kenapa angkanya bisa lebih besar dari sel yang ia lihat.
- Catatan yang user ketik lewat sheet membawa `scope: context` (langsung muncul di kalender yang
  ia lihat setelah menyimpan).
- Empty state per konteks: kalau periode ini tidak punya satu entri pun di konteks aktif, muncul
  kartu nurturing + CTA "Catat di tanggal ini" (bukan kalender kosong tanpa penjelasan).

## 6. `/bills` — daftar & pill filter ikut konteks, tameng/waterfall tetap global

| Bagian | Perlakuan |
|---|---|
| Daftar tagihan + angka pill filter + chip jumlah | disaring konteks (angka pill dihitung dari daftar yang benar-benar ia saring — pill "Telat (1)" tidak boleh membuka daftar kosong) |
| Tameng Proteksi, Waterfall Gaji, chip "6 tagihan / Rp 2.508.990 / 23% dari gaji" | **seluruh** tagihan (total) + `SCOPE_NOTE.bills` di bawahnya |
| Timeline 7 hari | ikut daftar aktif (semua konteks) seperti sebelumnya — ia ringkasan waktu, bukan daftar yang bisa digulir |
| Kartu tagihan | badge konteks ("Pribadi/Keluarga/Bersama") di baris meta |
| Empty state | "Belum ada tagihan rutin di konteks X" + CTA tambah (tagihan baru otomatis masuk konteks aktif) |

`NewBill` sengaja dibuat `Omit<Bill, … | 'scope'>`: sheet tidak punya (dan tidak boleh punya)
kontrol konteks — konteks itu satu state global yang ditempelkan halaman saat menyimpan.

## 7. `/wealth` — tab disaring, Net Worth tetap seluruhnya

- Tab Investasi memakai `visibleInvestments`, tab Hutang memakai `visibleDebts` +
  `visiblePayments` (riwayat pembayaran hanya untuk hutang yang tampil).
- **Net Worth bar, kas likuid, piutang, dan total hutang tetap himpunan penuh** — angkanya tidak
  boleh bergerak saat konteks ditukar — dengan `SCOPE_NOTE.netWorth` + caption konteks di bawah bar.
- Badge konteks di kartu aset (`wealth-investasi`) dan kartu hutang/piutang (`wealth-hutang`).
- Empty state per konteks di kedua tab (dibedakan dari empty state "memang belum punya data sama
  sekali"): kalimatnya menyebut konteks + menjelaskan bahwa Net Worth tetap global.
- Catatan baru yang dibuat user (aset, hutang, catatan kembalian) mewarisi konteks aktif:
  `changeDebtFrom(plan, id, scope)` kini **wajib** menerima scope (bukan default diam-diam).

## 8. `/joint` — konteks `bersama`, dijelaskan bukan disembunyikan

- Switcher konteks (mobile + desktop) diletakkan **di atas percabangan** "Ajak Pasangan" ⇄ kantong
  bersama, jadi kedua wujud halaman punya kontrol yang sama.
- Saat konteks aktif ≠ `bersama`: banner jujur ("Dompet Bersama itu konteks Bersama" + konteks yang
  sedang aktif) dengan tombol **"Pindah ke Bersama"** → satu tap `setContext('bersama')`, bukan
  daftar kosong tanpa penjelasan.

## 9. Bonus: badge konteks pada kartu yang muncul lintas halaman

Selain badge di kartu tagihan/aset/hutang, kartu celengan (`sinking-fund-card.tsx`) juga diberi
badge konteks — karena halaman detail `/budget/<id>` & kartu "Tabungan Impian" di Home memang
menampilkan celengan lintas konteks (aturan yang sudah didokumentasikan di `lib/data/home.ts`).


---

## 10. Angka sebelum/sesudah (bukti total TIDAK bergeser, hanya daftar yang menyaring)

Angka "sebelum" = angka kanon yang sudah dikunci paket 40–46 (dan test `lib/money/store.test.ts`);
angka "sesudah" dihitung dengan fungsi murni yang sama (skrip scratch sementara, dihapus lagi) dan
diverifikasi ulang di HTML produksi.

| Halaman | Angka | Sebelum | Sesudah |
|---|---|---|---|
| `/wallet` | Total Saldo (semua dompet) | Rp 1.850.000 | **Rp 1.850.000** (tidak berubah) + baris baru "Dompet Pribadi: Rp 1.800.000" |
| `/wallet` | saldo per konteks | — | pribadi 1.800.000 · keluarga 50.000 · bersama 0 |
| `/wallet` | kartu yang tampil | 3 (BCA, GoPay, Tunai) | **2 di Pribadi** (BCA, GoPay); Tunai muncul saat konteks Keluarga |
| `/bills` | total tagihan/bulan & % beban | Rp 2.508.990 · 23% dari gaji (6 tagihan) | **Rp 2.508.990 · 23%** (tidak berubah) |
| `/bills` | daftar tagihan | 6 baris | **4 di Pribadi** (Rp 2.354.990) · Keluarga 1 (Rp 54.000) · Bersama 1 (Rp 100.000) |
| `/wealth` | Net Worth | Rp 14.699.330 | **Rp 14.699.330** (tidak berubah) |
| `/wealth` | total portofolio (bar) | Rp 16.149.330 | **Rp 16.149.330** (tidak berubah) |
| `/wealth` | aset yang tampil | 4 (Rp 16.149.330) | **3 di Pribadi** (Rp 13.779.330) · Keluarga 1 (Rp 2.370.000) · Bersama 0 |
| `/wealth` | hutang/piutang | 5 baris | Pribadi 3 · Keluarga 1 · Bersama 1 |
| `/history` | baris bertanda "Belum berkonteks" | — | 3 (mock OVO, tampil di **semua** konteks) |
| Home | jatah harian | Rp 200.000 | **Rp 200.000** (tidak disentuh) |

## 11. Validasi (dijalankan, hasil apa adanya)

```bash
pnpm test               # 27 file · 359 test hijau (12 context-filter + 11 money-context baru)
pnpm theme:audit        # "palet bersih — 321 file diperiksa, tidak ada warna di luar palet"
pnpm exec tsc --noEmit  # 0 error (exit 0)
pnpm build              # ✓ Compiled successfully · 34/34 halaman di-generate
```

Smoke test produksi (`next start`, HTML sungguhan):

| Route | Status | Bukti di HTML |
|---|---|---|
| `/` | 200 | **2** switcher konteks; "Rp 200.000" (jatah harian kanon) tetap |
| `/wallet` | 200 | **2** switcher · "Rp 1.850.000" · "Dompet Pribadi: Rp 1.800.000" · "3 akun · semua dompet" · kartu Tunai ("Uang cash") **tidak** ada |
| `/history` | 200 | **2** switcher · badge "Belum berkonteks" **3×** · catatan cakupan skor |
| `/calendar` | 200 | **2** switcher · caption konteks + "Ringkasan periode = seluruh catatan, semua konteks" |
| `/bills` | 200 | **2** switcher · "6 tagihan" · "Rp 2.508.990" · kartu ter-render: `bill-card-1, 3, 4, 5` (persis 4 tagihan Pribadi; Netflix & Paket Internet hanya muncul di waterfall global) |
| `/wealth` | 200 | **2** switcher · "Net Worth = seluruh aset & hutang…" · "Emas Antam" **tidak** ada (milik Keluarga) · Bibit/BBCA/Bitcoin ada |

## 12. Yang BELUM bisa diverifikasi (jujur)

- **Klik nyata di browser**: mengubah konteks di switcher lalu mengamati daftar mengecil baru
  dipastikan lewat kode + data (tanpa Playwright di lingkungan ini). Yang terverifikasi: HTML
  produksi untuk konteks default (`pribadi`) dan angka semua konteks lewat fungsi murni.
- **375 px & 1440 px**: tidak ada pemeriksaan visual. Yang bisa diklaim dari kelas Tailwind:
  switcher ber-`max-w-[300px]`/`w-[280px]` dan berada di barisnya sendiri di mobile, jadi tidak ada
  elemen baru yang memaksa lebar lebih dari viewport.
- **`prefers-reduced-motion`**: paket ini **tidak menambah animasi baru** — seluruh kontrol baru
  memakai komponen yang sudah ada (termasuk `ContextSwitcher` beserta animasi pill-nya).
- **Mode privat / IndexedDB & localStorage diblokir** dan **haptik** pada aksi tagihan tidak diuji ulang.
- **Perangkat sungguhan** (tap switcher, geser kartu tagihan, sticky header di iOS) belum dijalankan.
- Temuan B–F laporan 46 (edit `/history` yang masih state halaman, catatan `/calendar` belum masuk
  jalur catatan, utang/tagihan/joint belum punya store sendiri) **tidak** disentuh di paket ini —
  itu paket 50/51/52 sesuai larangan prompt.

## 13. File yang dibuat / diubah

**Baru:** `lib/money/context-filter.ts`, `lib/money/context-filter.test.ts`,
`lib/data/money-context.ts`, `lib/data/money-context.test.ts`, laporan ini.

**Data & store:** `lib/data/bills.ts`, `lib/data/calendar.ts`, `lib/data/wealth.ts`,
`lib/data/wealth-cash.ts` (+ test), `lib/data/history.ts`, `lib/data/home.ts`,
`lib/data/wallet-detail.ts`, `lib/money/store.ts`.

**Halaman & komponen:** `components/catetind/wallet-screen.tsx`, `history-screen.tsx`,
`history-transaction-row.tsx`, `spending-heatmap.tsx`, `cashflow-calendar-screen.tsx`,
`bills-screen.tsx`, `bill-card.tsx`, `add-bill-sheet.tsx`, `wealth-screen.tsx`,
`wealth-hutang.tsx`, `wealth-investasi.tsx`, `sinking-fund-card.tsx`, `joint-screen.tsx`,
`app/insight/page.tsx` (komentar alasannya tetap pengalih).

| `/joint` | 200 | **2** switcher · banner "Dompet Bersama itu konteks Bersama" + 1 tombol "Pindah ke Bersama" |
| `/insight` | 307 | pengalih ke `/history` (halaman yang membaca konteks) — bukan halaman kosong |
