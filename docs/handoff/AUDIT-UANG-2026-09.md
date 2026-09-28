# AUDIT UANG & KEJUJURAN TAMPILAN — CatetInd (28 Sep 2026)

> Baca ini **sebelum** `docs/handoff/prompts/57..62-*.md`. Bersama `docs/handoff/CONTEXT-WAJIB.md`
> (§1–§10), dua dokumen ini adalah kontrak kerja paket 57–62.
> Semua temuan di bawah **sudah diverifikasi di kode** (diberi `file:line`). Jangan diperlakukan
> sebagai hipotesis.

## 0. Kenapa paket ini ada

Audit uji-pakai menemukan: **layar CatetInd masih mengklaim angka yang tidak berasal dari data
user.** Setelah user mengosongkan seluruh datanya, kartu utama tetap menampilkan nominal contoh;
"Jatah Hari Ini" tidak bergerak walau user mencatat pengeluaran; sebagian tanggal tidak realtime;
dan sebagian data sah untuk dihapus tapi belum punya pintunya. Itu pelanggaran kanon repo:
**"jujur di setiap klaim" (PRD 244)**.

## 1. Kontrak repo yang TIDAK BOLEH dilanggar

Baca `CONTEXT-WAJIB.md` §2 (peta file), §3 (warna), §4 (bahasa), §5.5–5.7 (ergonomi & privasi),
§8 (checklist), §9 (DoD), §10 (baseline). Yang paling sering dilanggar:

1. Route tipis → `ScreenShell` → sub-komponen → data murni di `lib/data/*` (**tanpa React**).
2. **Copy user-facing WAJIB di `lib/data/*`** sebagai konstanta bernama. Dilarang literal di JSX.
3. Warna HANYA token palet. Dilarang hex baru / kelas Tailwind bawaan
   (`text-slate-500`, `bg-blue-600`, `text-white`, `bg-black`, dst).
4. Uang selalu lewat formatter yang sudah ada (`formatIDR` / `maskMoney` / `money()`/`hide()`).
   Dilarang `toFixed` / `toLocaleString` sendiri di komponen.
5. Angka uang **tidak pernah disimpan** — `balance = opening + Σ baris` (`lib/money/ledger.ts`).
   `commit()` (`lib/money/store.ts:259`) memanggil `assertLedgerInvariant()`: pelanggaran
   invariant = tulisan **DITOLAK**. Jangan pernah membuang baris ledger demi tampilan.
6. Hapus = **tombstone** (`removedIds`), bukan hapus fisik; uang yang sudah keluar **tidak
   kembali**. Acuan pola: `removeRow()`/`restoreRow()` (`lib/money/store.ts`), `deleteBill()` +
   Undo (`lib/money/bills-store.ts`, `bills-screen.tsx:283-320`), `ConfirmDeleteDialog`
   (`transaction-actions.tsx`).
7. Edit catatan lewat SATU pintu `editRow()` + `applyRowOverride()`. Dilarang menyimpan hasil edit
   di state halaman (paket 48 sudah menghapus `editedTxs`).
8. Privasi: **yang DIBACA disensor, yang DISUNTING tidak** (§5.7). Format sensor punya SATU
   definisi: `MASKED_AMOUNT` (`lib/data/history.ts:267`). Toast juga disensor (paket 31).
9. Gesture kanon: swipe kiri = hapus, swipe kanan = edit. Jangan bikin jalur navigasi paralel.
10. Dilarang menambah dependency. Animasi = SVG/CSS/Framer Motion yang sudah ada.
11. Dilarang menambah mock/konstanta baru untuk menutupi masalah. Seed lama boleh tetap ada
    sebagai data DEMO, tapi **tidak boleh lagi menjadi sumber angka di komponen**.
12. Skema/RLS Supabase hanya diubah lewat `supabase/migrations/*.sql` (jangan lewat dashboard).

## 2. Perintah validasi (WAJIB dijalankan, output ditempel di laporan)

```bash
pnpm test                # baseline TERUKUR 28 Sep 2026: 511 test / 34 file — HARUS hijau, tanpa .skip
pnpm exec tsc --noEmit   # HARUS 0 error
pnpm build               # HARUS sukses
pnpm theme:audit         # HARUS "palet bersih", 0 pelanggaran
```

Catatan mesin (diverifikasi saat audit): **pnpm lokal = 9.12.0** sementara `package.json` menulis
`packageManager: pnpm@12.3.4` → kalau perintah pnpm gagal, tambahkan
`--config.manage-package-manager-versions=false` (catatan lama yang sama ada di `CONTEXT-WAJIB` §10.3).

**Angka basi yang wajib dikoreksi:** `CONTEXT-WAJIB.md` §10.3 masih menulis "319 test / 24 file",
padahal `pnpm test` sekarang menjalankan **511 test / 34 file**. Jangan pakai angka lama sebagai
target, dan perbarui §10.3 di paket 57 (lihat 57.5).

Test baru mengikuti pola repo: `lib/**/<nama>.test.ts` (vitest, murni, tanpa React).


## 3. EMPAT AKAR MASALAH (semua sudah diverifikasi di kode)

### AKAR A — Dua sumber data berdampingan: store (bisa dikosongkan) vs konstanta `lib/data/*`

Bukti paling telak: `components/catetind/history-screen.tsx:194-206` menggabung `recordedTxs`
(store) dengan `HISTORY_TRANSACTIONS` (konstanta). Akibatnya, setelah `purgeDeviceData()`
(`lib/account.ts:172-193` mengosongkan lima store) kartu berikut **TETAP terisi**:

| Komponen | baris | sumber | nominal contoh |
|---|---|---|---|
| `expense-distribution-card.tsx` | 19-26 | hardcode `SEGMENTS` + `TOTAL` | Rp 3.150.000 |
| `recent-transactions-card.tsx` | 175-181, 401 | `HOME_MONEY_GROUPS` | 8.500.000 / 752.000 |
| `cash-flow-card.tsx` | 8-16 | `HOME_MONEY_ROWS` | 8.500.000 / 752.000 |
| `daily-hud-card.tsx` | 54, 56 | default `computeDailyHud()` + `SPENT_TODAY` | MONTHLY_INCOME 7.500.000 |
| `plant-widget.tsx` | 26-30, 61 | `MOCK { hp: 82, activeDays: 21 }` + funds seed | 82% / 21 hari |
| `my-goals-card.tsx` | 328 | funds-store seed | celengan contoh |
| `history-screen.tsx` | 123, 560 | `TOTAL_TRANSACTIONS = 24`, `HEALTH_SCORE = 72` | "24/30 transaksi" |
| `insight-cards.tsx` | 28, 97 | copy mock 40 / 22 / 45 % | insight palsu |
| `lib/data/wallet-detail.ts` | 62-87 | `WALLET_DETAIL_TRANSACTIONS` | 9 & 5 catatan |
| `daily-nudge.tsx` | 31 | mock | nudge tetap muncul |

**Aturan pengerjaan:** pindahkan SUMBER ke store / konfigurasi uang user. Dilarang hanya menambah
cabang `if (kosong)` di atas mock lama.

### AKAR B — "Hari ini" dipatok lima nilai berbeda, semuanya bukan hari ini

```
lib/data/bills.ts:77       TODAY_ISO          = '2026-09-25'
lib/data/calendar.ts:171   CALENDAR_TODAY_ISO = '2026-09-25'
lib/data/joint.ts:93       JOINT_TODAY_ISO    = '2026-09-25'
lib/data/wealth.ts:245     WEALTH_TODAY_ISO   = '2026-09-25'
lib/data/history.ts:143    HISTORY_TODAY_ISO  = '2026-09-27'
+ mengalir ke lib/data/budget.ts:81 dan lib/data/add-wallet.ts:17
Hari ini saat audit: 28 Sep 2026.
```

**Aturan pengerjaan:** satu fungsi `todayISO()` (dihitung SETELAH mount supaya HTML server &
render pertama client identik — pola `localISODate()` di `wallet-detail-screen.tsx:147` dan
`history-screen.tsx:171`) untuk SEMUA jangkar UI: strip 7 hari tagihan, kalender, /joint, /wealth,
Riwayat, Home, /budget. **Data seed tetap boleh bertanggal tetap** (demo stabil); yang WAJIB dari
jam asli adalah JANGKAR-nya ("hari ini", "kemarin", jendela 30 hari, "7 hari ke depan").

### AKAR C — Pemasukan user dibuang; ada dua angka gaji berbeda

```
Rp 7.500.000 → lib/data/bills.ts:80, lib/data/budget.ts:96, lib/data/wealth.ts:243,
               lib/data/history.ts:152 (Gaji September)
Rp 8.500.000 → lib/data/home-money.ts:79 (Gaji Bulanan), lib/data/calendar.ts:561
```

Dan yang paling menentukan:

- onboarding mengumpulkan pemasukan: `onboarding-step-income.tsx` → `onboarding-flow.tsx:167-173`
  → `saveOnboardingResult({ monthlyIncome })` (`lib/onboarding.ts:222`)
- yang membaca `readOnboardingResult()`: HANYA `cashflow-calendar-screen.tsx:134`, dan hanya
  field `paydayDate`.
- **`monthlyIncome` NOL PEMAKAI di seluruh repo.**

Itulah sebab keluhan "Jatah Hari Ini ngga bisa disetting": user SUDAH mengisi pemasukannya di
onboarding, lalu nilainya dibuang.

### AKAR D — Jatah Hari Ini bukan turunan

`daily-hud-card.tsx:54` memanggil `computeDailyHud({ sinkingFunds: funds })` — income, cicilan,
dan `spent` semua mengambil default konstanta: `MONTHLY_INCOME 7.500.000`,
`TOTAL_INSTALLMENTS 800.000`, `SPENT_THIS_MONTH 2.300.000` (`lib/data/budget.ts:96, 126, 127`).
Bar progres memakai `SPENT_TODAY` (konstanta, `daily-hud-card.tsx:56`). Akibatnya pengeluaran user
**tidak pernah** menggerakkan angka.

Bonus temuan: ada **tiga angka pengeluaran berbeda di Home yang sama** — HUD 2.300.000,
Distribusi Pengeluaran 3.150.000, grafik Arus Uang 752.000.

## 4. Aturan uang & hapus (berlaku di SEMUA paket)

1. Setiap perubahan angka uang wajib punya **sebelum → sesudah** yang bisa direproduksi.
2. Hapus data: **dialog konfirmasi + Undo**; copy menyebut akibatnya apa adanya.
3. **Hapus dompet TIDAK BOLEH hard delete.** `assertLedgerInvariant()` (`lib/money/store.ts:259-263`
   → `lib/money/ledger.ts:236-242`) menolak commit kalau `Σ baris ≠ Σ saldo − Σ opening`.
   Pakai tombstone/purge yang teruji, dan pastikan rujukan dompet tidak jadi yatim:
   baris ledger (`walletId`), tagihan (`paidRowId`), celengan (`contributions.walletId`),
   pelunasan hutang (`postDebtSettlement`), transfer (`counterWalletId`).
4. **Hapus celengan MENGUBAH Jatah Harian** (kewajiban bulanan dilepas — `lib/data/budget.ts:595,
   606, 615` dan `sinkingObligationOf()` `:634-638`). Konfirmasinya WAJIB menyebut ini. Riwayat
   setoran jangan dibuang: uangnya memang sudah keluar dari dompet.
5. **Hapus catatan tidak mengembalikan saldo** — perilaku ini SENGAJA dan sudah terkunci test
   (`docs/handoff/laporan/49-...:211-215` dan `43-...:413`). Jangan "diperbaiki" tanpa keputusan
   produk tertulis. Kalimat konfirmasi wajib jujur soal ini.
6. **Hapus hutang/piutang tidak menghapus baris kas** (keputusan paket 50, `50-...:90`).
7. Setiap aksi hapus menulis jejak analitik (`trackMoneyEvent`, pola `lib/money/store.ts:1310`).

## 5. KONFLIK YANG HARUS DIUMUMKAN (jangan dikerjakan diam-diam)

`CONTEXT-WAJIB.md` §10.1 mengikat angka kanon `DAILY_HUD` **"tidak bergeser (Rp 800.000 ×2 ·
Rp 200.000 ×1 · 4 hari ×1)"** dan saldo kanon **Rp 1.850.000**. Paket 57–60 MENGUBAH cara angka itu
dihitung (dari konstanta → turunan data user), jadi angka demo **bisa** berubah.

Aturan mainnya:

- Perubahan itu **bukan regresi** — sebutkan alasannya di laporan + perbarui §10.1 dengan angka baru
  beserta dasar hitungannya.
- Kalau karena perubahan ini angka `DAILY_HUD` justru tetap sama, **buktikan** (hitung manual) —
  jangan diklaim.
- Saldo kanon **Rp 1.850.000 TIDAK BOLEH berubah**; itu di luar lingkup paket ini. Kalau berubah,
  itu bug dan harus dilaporkan sebagai temuan.

## 6. Format bukti yang wajib ada di setiap laporan

Ikuti format `docs/handoff/laporan/47..56-*-laporan.md`. Minimal berisi:

1. Tabel `# | yang dikerjakan | file | bukti`.
2. **Tabel sebelum → sesudah** untuk setiap angka yang berubah (termasuk saldo, Jatah Harian,
   jumlah kartu yang tampil, jumlah catatan).
3. Hasil empat perintah validasi + jumlah test.
4. Cara mereproduksi di browser (langkah klik), kalau ada browser.
5. **"Batas jujur"**: apa yang belum bisa diverifikasi (mis. uji 375/1440 px kalau lingkungan kerja
   tidak punya browser) dan apa yang sengaja dibiarkan + alasannya.
6. Pertanyaan terbuka kalau ada yang ambigu — **jangan menebak**.

## 7. Larangan eksplisit

- ❌ Mengklaim "selesai" tanpa angka sebelum/sesudah.
- ❌ Menyembunyikan kartu (`hidden`, `display:none`, `return null` diam-diam) sebagai pengganti
  empty state yang benar.
- ❌ Menambah konstanta/mock baru.
- ❌ Mengubah rumus uang (`lib/money/ledger.ts`) untuk menyenangkan tampilan.
- ❌ Mengubah `CONTEXT-WAJIB` §10.1 tanpa menulis alasan + dasar hitungan.
- ❌ Membuat test lama hijau dengan cara dihapus/di-`.skip`.
- ❌ Menghapus penyensoran privasi demi merapikan tata letak.

## 8. Indeks temuan tambahan (belum masuk keluhan asli — WAJIB ditangani di paket yang disebut)

| # | Temuan | Bukti | Paket |
|---|---|---|---|
| 1 | Konteks "Bersama" memotong saldo dompet "Tunai" (fallback senyap) | `lib/money/store.ts:1882-1888` | 59.4 |
| 2 | Dompet: API hapus ADA (`app/api/wallets/[id]/route.ts:56`, `app/api/wallets/store.ts:160`), UI **nol pemanggil** | grep `/api/wallets` di `components/**` & `app/**` → kosong | 62 |
| 3 | `isAccountEmpty` terlalu ketat (`wallets == 0 && rows == 0`) → notice kosong-akun tidak muncul saat masih ada baris | `lib/money/store.ts:575-577` | 59/62 |
| 4 | Celengan punya efek uang yang tidak diberitahukan (hapus = Jatah Harian naik) | `lib/data/budget.ts:595, 606, 615, 634-638` | 60.2 |
| 5 | Kalender memakai gaji Rp 8.500.000 (`lib/data/calendar.ts:561`) sementara HUD Rp 7.500.000 | AKAR C | 57.3 / 60.5 |
| 6 | `CURRENT_DAY = 27` & `DAYS_IN_MONTH = 30` dipatok → "Telat X hari" bisa salah | `lib/data/budget.ts:82-83`, `lib/data/bills.ts:79` | 57 + 60.4 |
| 7 | Insight AI memakai persentase keras dan bisa bertentangan dengan data user | `components/catetind/insight-cards.tsx:28, 97` | 59.1 |
| 8 | Tidak ada setelan pemasukan/cicilan sama sekali (hanya "Tanggal Gajian") | `components/catetind/settings-panel-account.tsx:209` | 57.4 |
| 9 | "Skor Kewarasan Finansial" = konstanta 72 | `lib/data/history.ts:122` | 59.1 |
| 10 | Kategori bawaan hanya bisa disembunyikan & tidak dijelaskan ke user | `settings-panel-preferences.tsx:119, 270` | 62 |
| 11 | "Distribusi Pengeluaran" tidak punya cabang empty state | `expense-distribution-card.tsx` (tidak ada `length === 0`) | 58.2 |

## 9. Urutan pengerjaan & aturan disiplin

```
57 (fondasi)  → WAJIB selesai & hijau sebelum yang lain
   ↓
58 (Home)  &  59 (Riwayat/Dompet)  → boleh dua arah, laporan dipisah
   ↓
60 (Budget/Tagihan/Kalender)  →  61 (Kekayaan/Joint)  →  62 (Hapus data semua jalur)
```

**Jangan lanjut paket berikutnya sebelum paket sebelumnya hijau** (empat perintah validasi) **dan**
laporannya sudah ada di `docs/handoff/laporan/`. Setelah `CONTEXT-WAJIB.md` §10.1 diperbarui
(paket 57), paket-paket berikutnya memakai angka baru itu sebagai baseline.



