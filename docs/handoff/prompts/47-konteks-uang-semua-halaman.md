# 47 — Konteks Uang (Pribadi/Keluarga/Bersama) Dihormati SELURUH Halaman

**Paket:** temuan A dari laporan 46 · **Fase 13** · **Depends on:** — (lakukan ini PALING DULU;
50 & 51 memakai `scope` yang diperkenalkan di sini)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + laporan
> `docs/handoff/laporan/46-sinkronisasi-celengan-konteks-install-laporan.md` §6 (tabel temuan A–F).

## Bukti gap (audit 28 Sep 2026)

Konteks uang dipromosikan jadi **satu state global** (audit UX #6) dan switcher-nya kembali
tampil di desktop (paket 46) — tapi yang benar-benar MEMBACA konteks itu hanya 4 berkas:

| Berkas | Bukti |
|---|---|
| `components/catetind/home-screen.tsx` | `useMoneyContext()` (`:51`) → deck dompet, jumlah transaksi, baris konteks |
| `components/catetind/budget-screen.tsx` | `useMoneyContext()` (`:88`) → `visibleBudgets`/`visibleFunds` disaring `scope` |
| `components/dashboard/transaction-bottom-sheet.tsx` | `:41` — dompet default ikut konteks |
| `components/dashboard/transaction-web-modal.tsx` | `:42` — idem |

Halaman lain menampilkan **semua** konteks sekaligus, tanpa satu pun penyaring:

| Halaman | Sumber data hari ini | Akibat saat konteks = "Keluarga" |
|---|---|---|
| `/wallet` | `walletAccounts(snapshot)` (`wallet-screen.tsx`) | dompet pribadi tetap tampil & ikut dihitung di ringkasan halaman |
| `/history` | `recordedTransactions(snapshot)` + `ALL_TRANSACTIONS` | transaksi bersama & pribadi bercampur |
| `/calendar` | `CALENDAR_ENTRIES` (`lib/data/calendar.ts:731`) | entri bersama tetap tampil |
| `/bills` | `useState(INITIAL_BILLS)` (`bills-screen.tsx:71`) | tagihan keluarga tetap tampil |
| `/wealth` | `useState(INITIAL_DEBTS/…)` (`wealth-screen.tsx:95-98`) | hutang/aset bersama tetap tampil |
| `/joint` | `useState(INITIAL_JOINT_WALLET/…)` (`joint-screen.tsx:100-106`) | halaman bersama tidak menyadari konteks aktif |
| `/insight` | ringkasan dari data historis | idem |

Dan **model datanya memang belum punya konteks**: `Bill` (`lib/data/bills.ts:31`),
`CalendarEntry` (`lib/data/calendar.ts:61`), `Investment` (`lib/data/wealth.ts:91`),
`Debt` (`lib/data/wealth.ts:114`) — tidak ada field `scope`.

## Aturan kanon yang TIDAK boleh dilanggar

1. **Konteks menyaring DAFTAR & ARUS, bukan total.** Angka berlabel "Total Saldo" / "Net Worth"
   tetap seluruh dompet — lihat dokumentasi panjang di `lib/money/store.ts:557-573` dan laporan 44
   §9.1. Halaman yang menampilkan total wajib menyebut cakupannya ("… = semua dompet"),
   bukan mengecilkan angkanya.
2. **Jangan menyembunyikan data yang tidak bisa dipastikan konteksnya.** Baris tanpa dompet
   dikenal (mis. nama dompet lama yang belum jadi dompet) TIDAK boleh hilang saat konteks aktif.
3. **Angka demo tidak bergeser** (jatah harian Rp 200.000, saldo Rp 1.850.000, dll).

## Peta baca

- **PRD 2C.2** (Scope Pribadi/Keluarga/Bersama) — satu-satunya definisi resmi konteks.
- `docs/handoff/laporan/44-perbaikan-uji-pemakaian-laporan.md` §9 — alasan kenapa total global.
- **Kode acuan (tiru, jangan bikin baru):**
  - `components/catetind/context-switcher.tsx` + `money-context-provider.tsx` — kontrol & state-nya
  - `components/catetind/home-screen.tsx:199-215` & `budget-screen.tsx:355-395` — pola penempatan
    switcher: mobile di baris sendiri, desktop di cluster aksi baris judul
  - `lib/money/store.ts` → `homeWallets(snapshot, ctx)`, `cashTotalByContext()`,
    `filterWalletsByContext()` (`lib/wallets.ts:224`) — penyaring yang SUDAH ada, pakai ini
  - `components/catetind/budget-screen.tsx:132-139` — contoh penyaringan `scope` yang sudah benar
- Copy baru (label konteks di kartu, kalimat empty state, catatan cakupan) → `lib/data/*`,
  **bukan** di JSX.

## Yang dikerjakan (urutan)

1. **Satu helper murni untuk konteks baris** — `lib/money/store.ts` (atau modul murni baru
   `lib/money/context-filter.ts` kalau lebih rapi):
   - baris ledger → konteks **diturunkan dari dompetnya** (`WalletSeed.context`). Jangan menambah
     kolom `context` kedua di baris: dompet sudah satu-satunya pemilik fakta itu.
   - `rowsForContext(snapshot, ctx)` + `hasUnknownContext(snapshot)` untuk baris yang dompetnya
     tak dikenal (tetap tampil, ditandai "belum berkonteks" — aturan kanon #2 di atas).
   - test murni: baris BCA (pribadi) tidak muncul di "keluarga"; baris tanpa dompet tetap
     dikembalikan di SEMUA konteks dengan penanda.
2. **`scope` pada model yang belum punya** — `Bill`, `CalendarEntry`, `Debt`, `Investment`
   mendapat `scope: BudgetScope` (impor tipe dari `lib/data/budget.ts`, jangan bikin tipe konteks
   baru). Isi seed-nya: mayoritas `pribadi`, sisanya `keluarga`/`bersama` supaya ketiga konteks
   benar-benar punya isi nyata dan bisa diuji (jangan bikin semua `pribadi` — itu menyembunyikan
   bug penyaring).
3. **Switcher di header tiap halaman** — `/wallet`, `/history`, `/calendar`, `/bills`, `/wealth`,
   `/insight`, `/joint`. Pakai `<ContextSwitcher/>` + `useMoneyContext()` yang sama; pola
   penempatan persis seperti Home/Budget (mobile: baris sendiri di bawah header; desktop: cluster
   aksi di baris judul). Header yang sekarang belum punya baris judul desktop (mis. `/wallet`)
   **tidak perlu dirombak** — cukup tempatkan switcher di cluster aksi header yang sudah ada.
4. **Saring daftar & arus tiap halaman:**
   - `/wallet` → `homeWallets(snapshot, context)` untuk daftar kartu; total ringkasan tetap
     `cashTotal(snapshot)` + baris "Dompet {konteks}: Rp X" (persis pola Home, jangan bikin versi
     kedua).
   - `/history` → daftar & ringkasan (`summarizeTransactions`, heatmap, insight kategori) memakai
     hasil `rowsForContext`; filter kategori/tipe yang sudah ada tetap jalan.
   - `/calendar` + `/bills` + `/wealth` → filter `scope` pada daftar, ringkasan tetap global
     dengan catatan cakupan.
   - `/insight` → ringkasan mengikuti konteks aktif (sumbernya sama dengan `/history`).
   - `/joint` → halaman ini MEMANG konteks `bersama`. Kalau konteks aktif ≠ `bersama`, tampilkan
     catatan jujur + tombol "Pindah ke Bersama" (satu tap ke `setContext('bersama')`), **bukan**
     daftar kosong tanpa penjelasan.
5. **Empty state per konteks** (copy nurturing + CTA, dari `lib/data/*`): konteks yang memang
   belum punya data harus bilang apa adanya ("Belum ada dompet di konteks Keluarga — tambah di
   sini", tombol ke form tambah), bukan layar kosong.
6. **Badge konteks di kartu** yang muncul lintas konteks (tagihan, celengan, hutang/aset) supaya
   user tahu item itu milik siapa — copy-nya di `lib/data/*`.

## Larangan

- **Menambah store baru** untuk tagihan/kekayaan/joint di paket ini — itu paket 50/51/52. Di sini
  cukup menyaring + menambah `scope` pada model & seed.
- Memfilter angka berlabel "Total Saldo"/"Net Worth"/"Total Kas" (aturan kanon #1).
- Menyembunyikan catatan yang konteksnya tak bisa dipastikan (aturan kanon #2).
- Menyentuh angka patokan demo / konstanta `DAILY_HUD` / `INITIAL_*` (selain menambah `scope`).
- Membuat dua daftar konteks (duplikat `MoneyContext`/`BudgetScope`) — pakai yang ada.

## Bukti yang harus ditunjukkan

- `pnpm test` (helper penyaring + test murni baru), `pnpm exec tsc --noEmit`, `pnpm build`,
  `pnpm theme:audit`.
- Tangkapan HTML/kelas (boleh lewat `next start` + `Invoke-WebRequest`/`curl`): tiap halaman
  memuat 2 switcher konteks (mobile + desktop).
- Daftar angka sebelum/sesudah untuk 3 halaman yang punya total, membuktikan totalnya **tidak**
  berubah dan hanya daftarnya yang menyaring.
- Laporan jujur: file dibuat/diubah + asumsi yang diambil + apa yang belum bisa diverifikasi
  (mis. perilaku tap di perangkat sungguhan).
