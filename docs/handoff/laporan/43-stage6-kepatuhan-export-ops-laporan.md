# Laporan 43 — Stage 6 · Kepatuhan & Operasional (Export, Hapus Akun, Error Boundary, Observability)

**Status:** selesai diimplementasikan & divalidasi · **Paket:** audit fintech lanjutan Stage 6
**Tempat artefak bukti:** `docs/handoff/laporan/bukti/43-export-contoh.json`

> Ringkas: lima temuan audit Stage 6 ditutup dengan kode yang benar-benar bekerja —
> file ekspor JSON yang terunduh, penghapusan akun berlapis yang mengosongkan
> perangkat, error boundary di empat segmen uang, enam event analitik tanpa
> nominal, dan empat skenario smoke test alur uang pada lapis yang memutuskan
> angka (store ledger & mesin joint).

---

## 0. Acceptance criteria — status apa adanya

| # | Kriteria | Status | Bukti |
|---|---|---|---|
| 1 | Tombol Export menghasilkan file JSON berisi seluruh baris ledger & utang/piutang; isinya dibuka di laporan | ✅ | §2 + `docs/handoff/laporan/bukti/43-export-contoh.json` (7.168 byte) |
| 2 | Hapus akun: semua data hilang; refresh → Home kosong/onboarding; IndexedDB bersih | ✅ (kode + test) · ⚠️ verifikasi browser belum | §3 + checklist §6.1 langkah 7–8 |
| 3 | Error boundary: satu area error tidak mematikan app & tetap ada "Export data" | ✅ struktur & build · ⚠️ belum disuntik error di browser | §4 + checklist §6.1 langkah 9 |
| 4 | Event analytics terkirim tanpa nominal uang (daftar event + payload) | ✅ | §5 + `lib/analytics.test.ts` (8 test) |
| 5 | Empat skenario smoke test dieksekusi & hasilnya ditempel | ✅ (test unit lapis uang) · ⚠️ langkah manual browser belum | §6 + `lib/money/smoke-money-flow.test.ts` |
| 6 | `pnpm test` · `tsc --noEmit` · `pnpm build` hijau; test lama tetap hijau | ✅ (266 test, +35 baru, 231 lama tetap hijau) | §7 |

Penanda ⚠️ di tabel adalah hal yang **tidak bisa** saya jalankan di lingkungan ini
(tidak ada browser). Semuanya ditulis beserta langkahnya, bukan disembunyikan.

---

## 1. Yang dibangun (peta file)

### 1.1 File baru

| File | Isi |
|---|---|
| `lib/analytics.ts` | Katalog 6 event + penyaring payload (kunci uang/catatan dibuang) + `trackMoneyEvent()` ber-guard SSR + sink untuk test |
| `lib/analytics.test.ts` | Test penyaring & katalog (8 test) |
| `lib/money/export.ts` | Penyusun file ekspor (murni) + `moneyExportJson()` + `downloadMoneyExport()` (Blob + `URL.createObjectURL`) |
| `lib/money/export.test.ts` | Test isi & konsistensi angka ekspor (9 test) |
| `lib/money/smoke-money-flow.test.ts` | 4 skenario smoke alur uang (6 test) |
| `lib/account.ts` | `purgeStorageKeys()` (awalan `catet`), `purgeDeviceData()`, `deleteAccount()` |
| `lib/account.test.ts` | Test pembersihan, kata kunci, bukti isi penyimpanan (10 test) |
| `lib/data/account.ts` | Copy: kata kunci `HAPUS AKUN`, kebijakan retensi, panel export, keadaan kosong |
| `lib/data/segment-error.ts` | Copy error boundary per segmen + aksi (muat ulang / unduh data) |
| `lib/privacy-settings.ts` | Kunci & pembaca preferensi "sensor nominal" (dipakai provider + ekspor) |
| `components/catetind/segment-error-screen.tsx` | Layar error bersama (dengan shell → sidebar tetap hidup) |
| `components/catetind/empty-account-notice.tsx` | Keadaan kosong Home setelah akun dihapus |
| `app/error.tsx` | Error boundary akar (tanpa shell, anti-rekursi) |
| `app/wallet/error.tsx`, `app/wealth/error.tsx`, `app/history/error.tsx`, `app/joint/error.tsx` | Error boundary empat area uang |

### 1.2 File yang diubah

| File | Perubahan |
|---|---|
| `lib/money/store.ts` | Jejak analitik di 7 aksi tulis (catat/koreksi/hapus/settle) + `purgeMoneyStore()`, `isAccountEmpty()`, state `EMPTY_SNAPSHOT`, penanda `purged` ikut tersimpan, hydration tidak lagi menghidupkan dompet contoh |
| `lib/money/idb.ts` | `clearMoneyState()` — hapus **database** IndexedDB (menutup koneksi dulu, hormati `onblocked`) |
| `lib/ai-usage-store.ts` | `ai_quota_low` ditembak dari tempat pemakaian benar-benar bertambah (ambang 20%, sekali per aktivitas per sesi) |
| `components/catetind/joint-screen.tsx` | `settlement_recorded` (scope joint) + `joint_split_changed` |
| `components/catetind/settings-panel-privacy.tsx` | Export benar-benar mengunduh (+ jalur email berlabel **Demo**), hapus akun dua lapis dengan kata kunci, blok kebijakan retensi, dialog konfirmasi dihapus dari TODO |
| `components/catetind/home-screen.tsx` | Memasang `<EmptyAccountNotice />` |
| `components/catetind/privacy-provider.tsx` | Kunci storage dipindah ke `lib/privacy-settings.ts` (satu sumber dengan file ekspor) |
| `lib/ai-usage-store.test.ts` | Dua test baru untuk `ai_quota_low` (payload & anti-spam) |

---

## 2. Export JSON nyata (temuan #1)

### 2.1 Cara kerjanya

`DataExportSettingsPanel` (`/settings/data`) sekarang memanggil
`downloadMoneyExport()` → `Blob` + `URL.createObjectURL` + `<a download>`.
Tidak ada lagi `setTimeout` yang berpura-pura "mengirim ke email". Isi file
disusun `buildMoneyExport()` dari store hidup (`lib/money/store.ts`) plus data
domain (hutang/piutang, cicilan, celengan, target bulanan, preferensi privasi).

Kunci auditnya ada di file itu sendiri:

```
schema          "catetind.money-export"
schemaVersion   1
exportedAt      "2026-09-27T10:15:00.000Z"
counts          { wallets, ledgerRows, removedRows, debts, receivables, debtPayments, investments, funds }
limits          batas jujur (termasuk "tidak ada salinan di server")
```

### 2.2 Potongan isi file (10 baris pertama — apa adanya)

Artefak lengkap: `docs/handoff/laporan/bukti/43-export-contoh.json` (7.168 byte,
dihasilkan dari store demo + 3 catatan sesi: 1 pemasukan, 2 pengeluaran, 1 di
antaranya dihapus).

```json
{
  "schema": "catetind.money-export",
  "schemaVersion": 1,
  "exportedAt": "2026-09-27T10:15:00.000Z",
  "app": {
    "name": "CatetInd",
    "buildStage": "demo"
  },
  "user": {
    "id": "user_jon",
```

`counts` dari artefak itu:

```json
{ "wallets": 3, "ledgerRows": 3, "removedRows": 1, "debts": 3, "receivables": 2,
  "debtPayments": 3, "investments": 4, "funds": 3 }
```

### 2.3 Yang membuktikan "seluruh baris ledger" benar-benar ikut

Bukan hanya baris yang masih hidup — baris yang **sudah dihapus** tetap
diekspor dan ditandai. Potongan `ledgerRows` dari artefak:

```json
{
  "id": "session-9002",
  "walletId": "tunai",
  "type": "expense",
  "amount": 25000,
  "note": "Parkir",
  "walletName": "Tunai",
  "removed": true
}
```

…dan `"removedRowIds": ["session-9002"]`. Alasannya ditulis di kode: ekspor yang
menyembunyikan baris yang pernah ada bukan ekspor yang bisa dipakai audit.

Konsistensi angka diuji, bukan diklaim: `totals.cash` di file HARUS sama dengan
`cashTotal(snapshot)` yang dibaca `/wallet` + Home, dan saldo tiap dompet =
`opening + Σ baris` (`lib/money/export.test.ts`).

### 2.4 Jalur email (tetap ada, tapi jelas berlabel demo)

Kartu kedua di `/settings/data` menjelaskan apa adanya: jalur ini disiapkan
untuk produksi (server mengompilasi JSON lalu mengirim lewat email
transaksional), dan **di repo ini tombolnya tidak mengirim apa pun** — ada badge
`DEMO` + toast yang menyebutkan sebabnya, bukan toast "Data berhasil dikirim ke
emailmu" seperti sebelumnya.

---

## 3. Hapus akun + kebijakan retensi (temuan #2)

### 3.1 Alur (dua lapis, satu pintu)

`Keamanan & Privasi → Zona Berbahaya`:

1. **Lapis 1** — penjelasan apa yang hilang (3 langkah), tombol *Unduh Data Saya
   (JSON)* sebagai jalan keluar jujur, dan input **wajib ketik `HAPUS AKUN`**;
   tombol "Lanjut Hapus" mati sampai cocok (`matchesDeleteKeyword`).
2. **Lapis 2** — konfirmasi terakhir tanpa input apa pun; UI-nya menyebut bahwa
   tidak ada salinan di server yang bisa diminta kembali.
3. Setelah itu `deleteAccount()` berjalan: toast hasil ditampilkan, lalu setelah
   1,2 detik halaman berpindah **penuh** ke `/login` (`window.location.assign`,
   bukan navigasi client-side).

`deleteAccount()` (`lib/account.ts`), berurutan:

| Langkah | Fungsi | Bukti |
|---|---|---|
| Buang penanda lokal | `purgeStorageKeys(localStorage)` & `purgeStorageKeys(sessionStorage)` — semua kunci ber-awalan `catet` | test penyimpanan palsu: 3 kunci app terhapus, `other-app-token` tetap |
| Hapus IndexedDB | `clearMoneyState()` → `indexedDB.deleteDatabase('catetind-money')` (koneksi ditutup dulu) | `report.indexedDbCleared`; `false` = diblokir tab lain → toast memberi tahu user |
| Kosongkan store | `purgeMoneyStore()` → `EMPTY_SNAPSHOT` + penanda `purged: true` ditulis ke penyimpanan | test "BUKTI ISI PENYIMPANAN" di bawah |
| Kosongkan store lain | `resetInviteStore()`, `resetAiUsageStore()` | kode undangan & pemakaian AI sesi ini hilang |
| Akhiri sesi | `endSession()` → `DELETE /api/session` | `report.sessionEnded`; kalau gagal, user diberi tahu untuk keluar sekali lagi |

### 3.2 Bukti data benar-benar terhapus

(a) **Isi penyimpanan setelah penghapusan** — ini satu-satunya yang tertinggal,
dan isinya kosong (`lib/account.test.ts: BUKTI ISI PENYIMPANAN…`):

```
{ wallets: [], rows: [], removedIds: [], syncedIds: [], purged: true }
```

(b) **Dompet contoh tidak pernah "lahir lagi"** — ini regresi yang paling
berbahaya. Tanpa penanda `purged`, hydration akan mengisi ulang `WALLET_SEED`
(3 dompet contoh) dan user melihat datanya kembali. Dua test mengunci itu:

- `mergeMoneySnapshot({ wallets: [], …, purged: true })` → 0 dompet, 0 baris;
- tanpa penanda → tetap seperti kunjungan pertama (`WALLET_SEED`) — jadi perilaku
  lama tidak berubah.

Saat penyaring itu ditulis, test menemukan satu celah nyata di versi pertama
saya: saat hidrasi, state di memory **masih berisi dompet seed** (`SERVER_SNAPSHOT`),
dan state itu ikut ditambahkan kembali sebagai "dompet yang lahir sebelum
hidrasi". Perbaikannya ada di `mergeMoneySnapshot` (kalau `purged`, dompet kanon
disaring dari `extras`) dan itulah yang diuji test tersebut.

(c) **Home kosong/onboarding** — `isAccountEmpty()` sekarang dipakai
`EmptyAccountNotice` di Home: satu kartu yang menyebut "Akun ini kosong —
datanya sudah dihapus", menjelaskan bahwa angka contoh repo masih tampil sampai
user mencatat lagi, dan menautkan ke `/app/onboarding`. Tanpa kartu itu, user
yang baru selesai menghapus akun akan melihat angka di layar dan wajar menyimpulkan
datanya kembali — kesan yang tidak boleh muncul di aplikasi keuangan.

(d) **Yang masih terbuka:** verifikasi visual di browser (refresh → Home, cek
DevTools → IndexedDB kosong) **belum dijalankan** karena lingkungan ini tidak
punya browser. Yang tersedia adalah bukti jalur kode + test di atas; langkahnya
tertulis di §6.1 supaya bisa dijalankan sekali duduk.

(e) **Temuan saat implementasi: navigasi harus PENUH, bukan client-side.**
Kunci app (PIN) menyimpan `enabled`/`locked` di state provider yang hidup sampai
reload. Kalau setelah penghapusan kita hanya berpindah secara client-side, PIN
yang baru saja dihapus **masih "aktif" di memory** — dan begitu user masuk lagi
dan membuka halaman app, ia akan terjebak di layar kunci yang PIN-nya sudah tidak
ada. Karena itu alur ini memakai `window.location.assign('/login')` (dengan jeda
1,2 detik supaya toastnya terbaca). Ini juga membersihkan store lain di memory
(uang, undangan, pemakaian AI) tanpa celah.

### 3.3 Kebijakan retensi

Ditulis di UI (bukan cuma komentar kode), 4 poin: apa yang dihapus, IndexedDB
dikosongkan seluruhnya, **tidak ada retensi di server** karena demo ini belum
punya backend, dan satu penanda kecil "akun sudah dihapus" yang tersisa beserta
alasannya. Tidak ada klaim GDPR/UU PDP di mana pun — yang tertulis adalah apa
yang benar-benar diimplementasikan.

---

## 4. Error boundary per segmen (temuan #3)

Lima berkas: `app/error.tsx` (akar, `withShell={false}`) + `app/wallet/error.tsx`,
`app/wealth/error.tsx`, `app/history/error.tsx`, `app/joint/error.tsx` — semuanya
merender satu komponen bersama `components/catetind/segment-error-screen.tsx`.

Yang membuatnya berguna (bukan sekadar sopan):

- **Sidebar tetap hidup.** Empat segmen uang memakai `ScreenShell`, jadi satu
  error render tidak lagi mematikan seluruh app: user masih bisa pindah halaman.
- **"Muat ulang halaman"** → `reset()` dari Next, dan **"Unduh Data Saya (JSON)"**
  → jalur ekspor yang SAMA (`lib/money/export.ts`), dibaca dari store, bukan dari
  komponen yang error. Kalau environment tidak bisa mengunduh, toast-nya
  mengatakan itu (bukan tombol mati).
- **Rantai fallback aman:** kalau yang gagal ternyata sidebar/shell, boundary
  segmen ikut gagal → Next naik ke `app/error.tsx` yang tidak memakai shell.
- Copy tenang per area (di `lib/data/segment-error.ts`), tanpa kode error mentah
  di layar (`error.digest` hanya ke konsol) + satu kalimat penenang yang benar:
  catatan hidup di store/IndexedDB, bukan di komponen yang gagal.

**Bukti menjalankan:** tidak ada test DOM di repo ini, jadi yang bisa dibuktikan
adalah struktur & jalur rendernya (`tsc` bersih + `pnpm build` sukses + halaman
404 lama tetap jalan). Menyuntikkan error di browser belum dijalankan (§7).

---

## 5. Event analytics kritikal (temuan #4) — tanpa nominal

Enam event, semuanya dari `lib/analytics.ts` (`MONEY_EVENT_CATALOG`), ditembak
dari **titik yang benar-benar mengubah state** — store uang, store kuota AI, dan
satu aksi joint — bukan dari komponen halaman.

| Event | Ditembak saat | Payload (persis) | Tidak pernah ikut |
|---|---|---|---|
| `transaction_created` | baris ledger baru tertulis (panel input & AI capture) — bukan pengulangan idempotensi | `kind`, `offline`, `ai_generated`, `linked` | nominal, nama catatan, nama dompet, kategori, `clientTxId` |
| `transaction_deleted` | hapus di Riwayat / Home / detail dompet (tombstone) | `kind` | nominal, nama catatan, id baris |
| `balance_adjusted` | koreksi saldo benar-benar menulis baris `balance_adjustment` | `direction` (`up`/`down`) | selisih, saldo lama, saldo baru, nama dompet |
| `settlement_recorded` | settle dompet bersama (`scope: joint`) atau pelunasan hutang/piutang menyentuh kas (`scope: debt`) | `scope`, `direction`, `has_change`, `method` (joint) | nominal transfer/pelunasan, nama lawan transaksi |
| `joint_split_changed` | pembagian disimpan dari Split Bill sheet | `mode`, dan untuk mode persentase `me_percent` + `partner_percent` | nominal total, nominal per orang, nama transaksi |
| `ai_quota_low` | setelah pemakaian AI dicatat & sisa panggilan satu aktivitas ≤ 20% kuotanya (sekali per aktivitas per sesi) | `activity`, `remaining_calls`, `quota_calls`, `exhausted` | nominal, isi percakapan, teks struk, nama catatan |

Contoh payload nyata (dari test, bukan karangan):

```json
{ "name": "ai_quota_low",
  "payload": { "activity": "chat", "remaining_calls": 40, "quota_calls": 200, "exhausted": false } }
```

### 5.1 Kenapa "tidak memuat angka uang" itu bisa dipercaya

Janji ini dijaga dua lapis, bukan oleh niat penulis event:

1. `sanitizeEventPayload()` **membuang** kunci yang cocok pola
   `/(amount|nominal|note|nama|name|catatan|saldo|balance|total|nilai|value|harga|price|wallet|dompet|debt|goal|target|email|user)/i`
   dan membuang nilai string > 24 karakter (jalur "menyelundupkan catatan lewat
   nilai"). Di non-produksi ia menulis satu peringatan konsol.
2. Test mengunci katalognya: setiap kunci di `MONEY_EVENT_CATALOG.payload` diuji
   terhadap pola terlarang yang sama (`lib/analytics.test.ts`) — event baru yang
   menambahkan `amount` akan **gagal** di test, bukan lolos ke produksi.

Catatan temuan saat menulis test: kunci `ai_named` (rencana awal saya) GAGAL
diuji karena mengandung `name` → diganti `ai_generated`. Itu bukti penjaganya
bekerja, bukan hiasan.

Sinktest (`setAnalyticsSink`, pola sama dengan `setOnlineOverride` di
`lib/connection.ts`) membuat test bisa memeriksa event yang benar-benar ditembak;
di produksi fungsi itu tidak dipanggil siapa pun.

---

## 6. Smoke test alur uang (temuan #5)

**Cara yang dipilih: memperkuat test unit di lapis keputusan uang.** Playwright
TIDAK dipasang — menambah devDependency butuh izin eksplisit dan tidak diberikan
di paket ini. Karena itu keempat skenario wajib dijalankan di tempat angka
benar-benar diputuskan: `lib/money/store.ts` (ledger kas) dan
`lib/data/joint-ledger.ts` (pembagian bersama). Hasilnya **semua LULUS**
(`lib/money/smoke-money-flow.test.ts`, 6 test):

| Skenario | Yang diperiksa | Hasil |
|---|---|---|
| (a) catat pengeluaran → saldo & HUD berubah | BCA 1.450.000 → 1.365.000; total kas turun tepat 85.000; catatan muncul di daftar yang dibaca Home/Riwayat/dompet; `computeDailyHud({ spent })` → `remaining` turun 85.000 & `dailyBudget` turun | ✅ LULUS |
| (b) split joint 60/40 → nominal transfer benar | 250.000 → aku 150.000, pasangan 100.000 (Σ 250.000); karena aku menalangi, posisi bersih aku +100.000 & pasangan −100.000 (Σ 0) | ✅ LULUS |
| (c) koreksi saldo → Net Worth ikut | GoPay 350.000 → 500.000: Net Worth naik **tepat** 150.000; koreksi ke bawah (BCA 1.450.000 → 1.300.000) menurunkan Net Worth 150.000 dan tetap menyisakan 1 baris catatan | ✅ LULUS |
| (d) hapus → bertahan lintas halaman | setelah `removeRow`, baris hilang dari daftar bersama; `isRowRemoved` true; setelah state dibaca ulang (simulasi refresh/hidrasi IndexedDB) baris **tetap** hilang | ✅ LULUS |

Catatan jujur untuk (a): kartu "Jatah Hari Ini" di Home masih memakai konstanta
`DAILY_HUD` (`lib/data/budget.ts`) — pacing mock repo ini. Yang diuji adalah
**input** HUD-nya (`computeDailyHud`), yang benar-benar turun ketika pengeluaran
hari ini dibaca dari store. Menyambungkan `DAILY_HUD` langsung ke store berarti
mengubah rumus uang — di luar mandat paket ini dan tidak saya lakukan.

### 6.1 Checklist verifikasi manual (untuk dijalankan di browser — belum dijalankan di sini)

Lingkungan kerja paket ini tidak punya browser, jadi langkah berikut **belum
diverifikasi secara visual**. Semuanya satu duduk (~5 menit):

1. `/settings/data` → tekan **Unduh File JSON** → cek folder unduhan:
   `catetind-export-<waktu>.json` ada; buka isinya: `schema`, `schemaVersion`,
   `exportedAt`, `counts`, `ledgerRows`, `debts`, `limits`.
2. `/settings/data` → tekan **Kirim ke Email Saya (demo)** → toast "Belum ada
   server pengirim email"; inbox memang kosong (itu memang janjinya).
3. Catat pengeluaran dari FAB → Home: total saldo & kartu dompet turun; Riwayat
   menampilkan catatannya.
4. Hapus catatan di Riwayat → hilang di Home & `/wallet/[id]`; pindah halaman lalu
   kembali → tetap hilang.
5. `/wallet` → koreksi saldo (Smart Sync) → angka berubah di Home, `/wallet/[id]`,
   dan Net Worth di `/wealth`.
6. `/joint` → Split Bill 60/40 lalu **Tandai Sudah Settle** → nominal transfer di
   layar settlement sesuai porsi.
7. `/settings/security` → **Hapus Akun Saya** → ketik `HAPUS AKUN` (tombol aktif
   hanya saat cocok) → lanjut → konfirmasi terakhir → kembali ke `/login` dengan
   toast keberhasilan.
8. Setelah penghapusan: buka DevTools → **Application → IndexedDB**
   (`catetind-money`) sudah tidak ada; **Local Storage** tidak menyisakan kunci
   `catet*`; buka `/` → muncul kartu "Akun ini kosong" + CTA onboarding.
9. Error boundary: (cara cepat) buka `/wallet` dengan DevTools → matikan
   `indexedDB`/inject error, atau tambahkan sementara `throw new Error('uji')` di
   `wallet-screen.tsx` → layar tenang + sidebar hidup + tombol "Muat ulang" dan
   "Unduh Data Saya (JSON)" yang benar-benar mengunduh file.
10. 375 px & 1440 px pada 3 layar baru (panel export, dialog hapus akun, layar
    error): tidak ada scroll horizontal, sidebar desktop tetap ada, aksi utama di
    zona jempol, bottom nav tidak menutupi konten terakhir.

---

## 7. Hasil validasi (apa adanya)

Dijalankan di Windows, `pnpm` 12.3.4, Node lokal. Semua keluaran ditempel apa
adanya:

```bash
$ pnpm test
 Test Files  20 passed (20)
      Tests  266 passed (266)
   Duration  848ms
```

Sebelum paket ini: **231 test / 16 file**. Sesudah: **266 test / 20 file**
(+35 test; 231 test lama tidak ada yang dihapus atau diubah angkanya).

```bash
$ pnpm exec tsc --noEmit
TSC_EXIT=0            # tanpa error
```

```bash
$ pnpm build
✓ Compiled successfully in 1153ms
✓ Generating static pages using 19 workers (34/34) in 777ms
…(seluruh route terdaftar; tidak ada yang gagal)
```

```bash
$ pnpm theme:audit    # penjaga palet wajib (CONTEXT-WAJIB §8)
✓ palet bersih — 296 file diperiksa, tidak ada warna di luar palet.
```

Semua hijau. Yang **tidak** bisa dijalankan di lingkungan ini: verifikasi visual
di browser (375/1440 px, unduhan nyata di folder Downloads, penyuntikan error) —
itu isi checklist §6.1.

---

## 8. Batas yang masih terbuka untuk produksi

Ditulis lengkap supaya penerima paket ini tahu apa yang belum, tanpa harus
membaca kode:

1. **Tidak ada backend — jadi tidak ada penghapusan di server.** Alur hapus akun
   hanya membersihkan perangkat ini karena tidak ada data di tempat lain.
   Pindah ke produksi: `DELETE /api/account` → hapus baris `wallets`,
   `ledger_rows`, `debt*`, `goals`, `ai_usage` milik `auth.uid()`, hapus objek
   storage, lalu hapus auth user Supabase (satu transaksi + job pengawas).
2. **Email tidak pernah terkirim.** Jalur email sengaja berlabel demo; produksi
   butuh server pengompilasi + provider transaksional (mis. Resend).
3. **Export berisi data contoh repo untuk bagian tertentu.** Baris ledger adalah
   catatan sesi di perangkat; hutang/piutang/cicilan/celengan/investasi masih
   konstanta `lib/data/*`. Itu ditulis di `limits` di dalam file ekspor.
4. **Penanda `purged` tersisa di penyimpanan** (kunci `purged: true`, isi kosong).
   Fungsinya mencegah dompet contoh muncul kembali. Kalau nanti ada backend,
   penanda ini tidak lagi diperlukan (`GET /api/wallets` akan kosong dengan
   sendirinya).
5. **Hapus catatan tidak mengembalikan saldo.** Tombstone hanya menyembunyikan
   baris dari daftar; baris ledger-nya masih ikut menghitung saldo
   (`balanceOf` membaca Semua baris) dan tetap ikut diekspor dengan tanda
   `removed: true`. Ini perilaku yang **sudah ada sebelum paket 43** dan saya
   tidak mengubahnya karena itu perubahan rumus uang (dilarang di paket ini).
   Yang perlu diputuskan product: hapus = "sembunyikan" atau "batalkan (reversal)"?
6. **Analitik hanya terkirim di lingkungan produksi Vercel.** `<Analytics />`
   dipasang sejak sebelum paket ini dan hanya aktif saat
   `NODE_ENV === 'production'`; `trackMoneyEvent()` juga tidak menembak saat
   `window` tidak ada. Jadi di dev/demo event-nya tidak ke mana-mana — itu
   disengaja (privasi + tidak mengotori data analitik).
7. **Error boundary belum diuji di browser.** Struktur & build-nya hijau, tapi
   "menyuntikkan error tidak mematikan app" belum saya lihat dengan mata.
8. **Ekspor belum di-stream/di-sign.** Untuk user dengan ratusan ribu baris,
   `JSON.stringify` di klien akan berat; produksi perlu ekspor server-side
   (`POST /api/export` → job → tautan unduhan bertanda tangan + kedaluwarsa).
9. **Belum ada jejak audit server-side untuk penghapusan** (siapa, kapan, apa).
   Di produksi, penghapusan akun sebaiknya menulis satu baris log
   `account_deleted` (tanpa data keuangan) agar bisa dipertanggungjawabkan.

---

## 9. Keputusan desain (dan alasannya)

| Keputusan | Alasan |
|---|---|
| Event ditembak dari **store**, bukan dari komponen | Satu-satunya tempat yang menjamin setiap aksi uang meninggalkan jejak; komponen bisa lupa, pintu tulis tidak |
| `sanitizeEventPayload()` membuang kunci terlarang **dan** nilai string panjang | Kunci saja tidak cukup — catatan user bisa lolos lewat nilai; penjaga diuji, bukan dijanjikan |
| Keadaan kosong disimpan sebagai **penanda `purged` di state uang**, bukan kunci localStorage terpisah | Satu sumber: kalau state uang hilang, penandanya ikut; tidak ada dua tempat yang bisa berbeda |
| Hapus akun = **dua dialog + tulis kata kunci** | Keputusan yang tidak bisa dibatalkan tidak boleh selesai dalam satu klik; kata kunci lebih jelas daripada "ketik email" (yang di demo ini tidak membuktikan kepemilikan) |
| Tombol **Unduh dulu** ada di dalam dialog hapus | Portabilitas dan penghapusan adalah dua hak yang sama-sama milik user; memaksa user kehilangan salinan sebelum menghapus bukan desain yang jujur |
| Error boundary memakai **`ScreenShell`** (bukan layar mati) | Satu bagian gagal ≠ kehilangan akses ke catatan; sidebar & tombol ekspor tetap hidup |
| Ekspor ditulis **2 spasi indentasi** | File ini dibuka manusia (auditor/akuntan/diri sendiri setahun lagi), bukan mesin yang butuh byte paling kecil |
| Baris yang sudah dihapus **tetap diekspor** (`removed: true`) | Ekspor yang menyembunyikan riwayat tidak bisa dipakai audit |
| Playwright **tidak dipasang** | Butuh devDependency baru = butuh izin eksplisit; test unit di lapis keputusan uang lebih kuat daripada test klik yang rapuh |
| Copy semua di `lib/data/*` | Aturan repo: nol string user-facing di JSX — supaya janji privasi bisa dibaca sebagai satu dokumen |
