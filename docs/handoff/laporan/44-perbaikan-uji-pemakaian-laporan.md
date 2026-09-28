# Laporan 44 — Perbaikan Hasil Uji Pemakaian (nominal, saldo per konteks, mask default, /install, AI jujur)

**Status:** selesai diimplementasikan & divalidasi · **Paket:** lanjutan audit fintech (temuan uji langsung pemilik produk, 27 Sep 2026)

> Ringkas: total saldo sekarang **satu definisi** (semua dompet) dan konteks uang tampil sebagai
> baris keterangan terpisah; input nominal **tidak lagi marah saat user masih mengetik**;
> sensor pindah-tab **tidak lagi mengurung user** (aturan malah dikunci di test murni);
> `/install` masuk shell app (sidebar desktop kembali); AI Coach **jujur** — label
> "belum pakai model" + tombol "Hubungkan AI", bukan lagi "sedang dalam pengembangan".

---

## 0. Gejala → status (apa adanya)

| # | Gejala yang dilaporkan | Status | Bukti |
|---|---|---|---|
| 1 | "Nomor 1 masih cacat" — angka saldo beda antar halaman | ✅ **FIXED** | §2 (`cashTotal` dipakai deck Home + panel + ARIA, `/wallet`, Kekayaan; 4 test baru) |
| 2 | `2.5000` → "Nominalnya belum kebaca" | ✅ **FIXED 27 Sep** · dikunci test | §3 + `lib/money/amount-input.test.ts` (*"2.5000 → 25.000"*) |
| 3 | `25.000` tidak terbaca + field "melawan" ketikan | ✅ **FIXED 27 Sep** · diperkuat paket ini | §3 (teks mentah saat mengetik, dirapikan saat blur) |
| 4 | Pindah tab → tersensor dan tetap tersensor | ✅ **FIXED 27 Sep** · sekarang **diuji** | §4 (3 fungsi murni + 8 test `lib/privacy-settings.test.ts`) |
| 5 | AI Coach menjawab "sedang dalam pengembangan" | ✅ **FIXED** (opsi **b**, §5) | Copy jujur + label "belum pakai model" + tombol "Hubungkan AI" → `/settings/ai` |
| 6 | `/install` halaman terpisah, **sidebar hilang** | ✅ **FIXED** | §6 (`ScreenShell`; HTML `/install` memuat label sidebar "Panduan Install") |
| 7 | Belum diuji: PIN, offline, buka di bulan lain | 🔵 **sebagian** | §7 — PIN & bulan-lain terverifikasi (kode + test); langkah browser (offline reload) tidak bisa dijalankan di lingkungan ini |

Baseline → sekarang: **270 test lama tetap hijau**, total **293 test** (23 test baru), `tsc` 0 error,
`pnpm build` sukses, `pnpm theme:audit` "palet bersih" (§8).

---

## 1. Peta perubahan file

### 1.1 File baru

| File | Isi |
|---|---|
| `lib/privacy-settings.test.ts` | 8 test: aturan sensor pindah-tab vs tombol mata + pembaca preferensi (termasuk localStorage diblokir) |
| `lib/data/month-rollover.test.ts` | 5 test: bentuk otomatis dari uji manual "buka di bulan lain" (jam sistem direkayasa ke 5 Okt 2026) |
| `docs/handoff/laporan/44-perbaikan-uji-pemakaian-laporan.md` | laporan ini |

### 1.2 File yang diubah

| File | Perubahan |
|---|---|
| `lib/money/store.ts` | `cashTotal()` jadi SATU definisi Total Saldo (dokumentasi tegas) + `cashTotalByContext()` + tipe `WalletContextFilter` |
| `lib/money/store.test.ts` | +4 test: angka 3 konteks, invariant Σ per-konteks = total semua, "konteks menyaring daftar bukan total", dompet baru/koreksi ikut mengalir |
| `lib/money/amount-input.test.ts` | +6 test: enam input dari uji pemakaian (`25.000`, `2.5000`, `1,5jt`, `50rb`, `-50000`, `25.`) |
| `components/catetind/wallet-card-stack.tsx` | `totalBalance` = `cashTotal(snapshot)` (bukan jumlah lokal) → kartu "Total Saldo" + ARIA pembaca layar ikut angka kanon |
| `components/catetind/overview-panel.tsx` | prop `allTotal` (cadangan donat saat pilihan kartu belum ada — dulu `Rp 0`) |
| `components/catetind/home-screen.tsx` | chip dompet = SEMUA dompet; baris `Dompet {konteks}: Rp X` + "Total Saldo = semua dompet"; panel diberi `allTotal` |
| `lib/data/home.ts` | `HOME_TOTAL_COPY` (chip, baris konteks, penegas cakupan) |
| `lib/data/wallet-detail.ts` | `WALLET_TOTAL_COPY` (subjudul hero + penegas konteks + aria nominal) |
| `components/catetind/wallet-screen.tsx` | hero: "Total Saldo semua dompet · N dompet aktif" + "Konteks uang menyaring daftar & arus — bukan angka total di atas." |
| `components/dashboard/transaction-input-engine.tsx` | `amountSettled` (problem hanya blur/submit); ketikan dipasang mentah; chip konfirmasi saat shorthand **atau** blur; hasil OCR/voice langsung "settled" |
| `lib/privacy-settings.ts` | `autoMaskedForHidden()`, `maskedForVisibility()`, `maskedSettingValue()` — aturan sensor jadi logika murni yang bisa diuji |
| `components/catetind/privacy-provider.tsx` | memakai tiga helper itu (tidak ada lagi `userMasked \|\| autoMasked` / literal `'1'` di komponen) |
| `components/catetind/install-guide-screen.tsx` | dibungkus `ScreenShell`; padding ganda dihapus |
| `lib/ai-chat.ts` | `ChatMessage.ruleBased`; `AI_NOT_CONNECTED_REPLY` (menggantikan `MOCK_FALLBACK_REPLY`); `AI_CONNECT_LABEL`/`AI_CONNECT_HREF`; copy status panel & halaman AI |
| `hooks/use-ai-chat.ts` | `mockReply` → `aiReply` (aturan lokal), balasan jujur untuk pertanyaan bebas, TODO "Connect to DeepSeek" dihapus |
| `components/catetind/ai-chat-widget.tsx` | label **"belum pakai model"** di bubble berbasis aturan + banner status AI dengan tautan "Hubungkan AI" |
| `components/catetind/settings-panel-preferences.tsx` | kartu "Status AI hari ini" di `/settings/ai` (tujuan tombol "Hubungkan AI" bukan jalan buntu) |

---

## 2. Satu definisi "Total Saldo" + angka 3 konteks

**Aturan yang sekarang dikunci:** Total Saldo = **SALDO SELURUH DOMPET** (`cashTotal(snapshot)` di
`lib/money/store.ts`). Konteks uang **menyaring daftar & arus, bukan total**. Kalau daftarnya lebih
pendek, yang tampil bukan total yang mengecil melainkan baris keterangan
`Dompet {konteks}: Rp X` (baru, di Home).

Angka yang sekarang tampil (data seed, diambil dari test `lib/money/store.test.ts`):

| Konteks | Dompet | Saldo konteks |
|---|---|---|
| `pribadi` | BCA + GoPay | **Rp 1.800.000** |
| `keluarga` | Tunai | **Rp 50.000** |
| `bersama` | — (belum punya dompet) | **Rp 0** |
| **Total Saldo (semua konteks)** | BCA 1.450.000 + GoPay 350.000 + Tunai 50.000 | **Rp 1.850.000** |

**Total Saldo = Rp 1.850.000 di Home, `/wallet`, `/wallet/[id]`, dan Kekayaan — untuk konteks apa pun**
(tidak lagi Rp 1.800.000 di Home vs Rp 1.850.000 di halaman lain). Invariant yang diuji:

```
cashTotalByContext('pribadi') + cashTotalByContext('keluarga') + cashTotalByContext('bersama')
  = cashTotal(snapshot) = Rp 1.850.000
```

Diverifikasi lewat HTTP ke build produksi (`next start`, dijalankan di lingkungan ini):

| Route | Status | Fakta yang diperiksa |
|---|---|---|
| `/` | 200 | HTML memuat `Total Saldo = semua dompet` **dan** chip `3 dompet` (dulu `2 dompet` di konteks pribadi) |
| `/wallet` | 200 | HTML memuat `Total Saldo semua dompet` |
| `/wallet/[id]` | — | angka per dompet dari `walletAccountOf(snapshot, id)` (store yang sama; tidak ada konstanta saldo di komponen) |
| `/wealth` | 200 | kas likuid = `cashTotal(snapshot)` (tidak diubah, sudah benar sejak paket 40) |

Keputusan desain: baris konteks **selalu tampil** (tidak bersyarat `ctx !== 'all'`) karena konteks
uang di app ini tidak punya keadaan "semua" — selalu Pribadi/Keluarga/Bersama. Angkanya lewat
`money()` supaya tombol mata global tetap menyensor nominal baru ini. Panel "Your Balance Overview"
juga dapat cadangan `allTotal` (dulu donat bisa jatuh ke `Rp 0`).


---

## 3. Input nominal — "jangan marah saat user masih mengetik"

Yang berubah di `components/dashboard/transaction-input-engine.tsx`:

1. **`problem` hanya diumumkan saat blur/submit.** Sebelumnya pesan dihitung setiap ketikan, jadi
   mengetik `25.000` berhenti di `25.` dan langsung teriak "Nominalnya belum kebaca". Sekarang ada
   penanda `amountSettled` yang dipasang saat `onBlur`/submit dan dilepas lagi begitu user mengetik
   (`aria-invalid` juga mengikuti pesan yang benar-benar tampil, bukan state tersembunyi).
2. **`display` tidak dirapikan di tengah ketikan.** Ketikan dipasang apa adanya; perapian ribuan
   (`25000` → `25.000`) terjadi di `handleAmountBlur`. Efeknya: kursor tidak melompat, backspace
   tidak menghapus karakter lain, dan `2.5000` boleh terus diketik.
3. **Chip konfirmasi `Rp 1.500.000?`** muncul saat `shorthand` (rb/jt/ribu/juta) **atau** saat field
   kehilangan fokus dengan angka yang sah — jadi nominal biasa juga bisa dicek sekali lagi.
4. Hasil OCR & voice (mock) dipasang sudah "settled" + dirapikan → chip konfirmasi langsung tampil
   untuk nominal yang datang dari mesin (yang justru paling perlu dikonfirmasi manusia).

Hasil ketik, dikunci sebagai test (`lib/money/amount-input.test.ts` → 25 test, semua hijau):

| Ketikan | Hasil | Catatan |
|---|---|---|
| `25.000` | **Rp 25.000**, `problem: null` | dua angka sebelum titik (temuan #3) |
| `2.5000` | **Rp 25.000**, `problem: null` | kelompok bukan tiga digit (temuan #2) |
| `1,5jt` | **Rp 1.500.000**, `shorthand: true` | chip konfirmasi wajib tampil |
| `50rb` | **Rp 50.000**, `shorthand: true` | — |
| `-50000` | `amount: null`, `problem: 'negative'` | **ditolak halus** — pesan menyebut jalan keluarnya ("catat sebagai pemasukan"), bukan dibuang diam-diam |
| `25.` | **Rp 25**, `problem: null` | bukan error — user masih mengetik |

Batas jujur: ini test lapis PARSER + tata kelola pesan di engine. Yang tidak bisa saya jalankan di sini
adalah mengetik di HP sungguhan (tidak ada browser di lingkungan ini) — langkahnya:

1. buka FAB `+` → ketik `2500` (field harus tetap `2500`, bukan berubah sendiri), lanjutkan `0` → `25000`;
2. tap keluar dari field → field jadi `25.000` **dan** muncul chip `Rp 25.000?`;
3. ganti isi jadi `-50000` lalu tekan Catat → toast + kalimat merah di field, panel tidak tertutup.

---

## 4. Mask default = tampil (pindah tab tidak mengurung)

Keluhan: "setelah pindah tab, angka tersensor dan tetap tersensor". Perbaikan 27 Sep sudah
memisahkan sensor sementara dari preferensi user; paket ini **mengunci aturannya di logika murni**
yang bisa diuji dan dipakai langsung oleh provider:

| Fungsi (`lib/privacy-settings.ts`) | Arti | Dipakai di |
|---|---|---|
| `autoMaskedForHidden(document.hidden)` | tab disembunyikan = sensor ON, tab terlihat = sensor OFF | handler `visibilitychange` |
| `maskedForVisibility(userMasked, autoMasked)` | yang tampil disensor = pilihan user **atau** sensor sementara | nilai `masked` context |
| `maskedSettingValue(userMasked)` | yang ditulis ke `localStorage` **hanya** pilihan user | efek persist |

Bukti (8 test `lib/privacy-settings.test.ts`, semua hijau):

- tab hidden → **tersensor** (`maskedForVisibility(false, true) === true`);
- tab kembali terlihat → **langsung tampil** (`maskedForVisibility(false, false) === false`) —
  inti keluhan yang ditutup;
- tombol mata **permanen**: `maskedForVisibility(true, …) === true` di keadaan tab mana pun;
- sensor sementara **tidak pernah dipersist** (`maskedSettingValue(false) === '0'`), jadi refresh
  setelah pindah tab tetap tampil;
- `readMaskedSetting()` default **tampil** di server/test dan saat `localStorage` diblokir.

Langkah manual yang belum dijalankan (tidak ada browser di lingkungan ini): buka app → pindah tab →
kembali (angka harus tampil tanpa menyentuh tombol mata) → tekan tombol mata (harus tetap tersensor
setelah refresh).


---

## 5. Keputusan AI = **(b) jujur + tetap berguna**

**Alasan:** `.env.local` di repo ini hanya berisi kunci VAPID Web Push — **tidak ada API key LLM**, dan
`§AI` opsi (a) mensyaratkan key itu diberikan pemilik produk dan disimpan server-side. Menyambungkan
provider tanpa key berarti mengarang integrasi yang tidak bisa jalan (dilarang `CONTEXT-WAJIB` §1),
dan memanggil `POST /api/ai/text` dengan key kosong akan menghasilkan error yang lebih buruk daripada
copy jujur. Jadi opsi (b) dipilih **tanpa** mengubah metering kuota yang sudah nyata.

Yang dikerjakan:

- `MOCK_FALLBACK_REPLY` ("Fitur AI Coach sedang dalam pengembangan… Nanti aku bisa…") **dihapus**,
  diganti `AI_NOT_CONNECTED_REPLY`: menyebut apa yang belum bisa, apa yang masih bisa, lalu menawarkan
  tombol **"Hubungkan AI"** → `/settings/ai` (route sudah ada).
- Jawaban berbasis aturan **dipertahankan** (sapaan proaktif, review pengeluaran, limit kategori,
  apresiasi) karena jawabannya ada di data lokal — tapi setiap balasan itu sekarang membawa
  `ruleBased: true` dan widget mencetak label **"belum pakai model"** di bubble-nya. Klaim palsu
  ("aku menganalisis keuanganmu") tidak mungkin lagi muncul tanpa label.
- Banner status di panel AI Coach: "AI Coach masih menjawab dari aturan lokal (belum pakai model)…"
  + tautan "Hubungkan AI" (panel ditutup saat ditekan).
- `/settings/ai` diberi kartu **"Status AI hari ini"**: badge "Belum tersambung ke model", penjelasan
  bahwa saklar-saklar di halaman itu baru berlaku penuh saat provider disambungkan, dan daftar yang
  tetap jalan sekarang (catat manual, saran kategori, jawaban dari data lokal).
- Jejak produksi ditulis sebagai komentar (bukan TODO yang menggantung): ganti `aiReply()` dengan
  `fetch('/api/ai/text')` + `AI_CAPTURE_COPY.saveFailed` sebagai state gagal yang sudah ada.

Catatan jujur: 2 dari 4 chip saran ("Analisis pengeluaran minggu ini", "Tips hemat bulan ini") **tidak
bisa** dijawab aturan lokal, jadi sengaja mendarat di balasan jujur + tombol Hubungkan AI — itu
keadaan yang benar untuk demo tanpa model, bukan bug.

---

## 6. `/install` di dalam shell app (satu halaman)

- `InstallGuideScreen` sekarang merender `<ScreenShell>…</ScreenShell>` seperti halaman app lain, jadi
  **sidebar desktop kembali** (dan tautan "Panduan Install" di sidebar/menu "Lainnya" aktif).
- Bottom nav + FAB memang sudah aktif di route ini sejak dulu (`components/MobileBottomNav.tsx` tidak
  memasukkan `/install` ke `FOCUS_ROUTES`) — yang kurang hanya sidebar, dan itu yang ditutup.
- Padding halaman diambil dari shell (`px-5 … xl:px-14`, `pb-32 … lg:pb-28`), isi dibatasi
  `max-w-2xl` supaya baris bacaan tetap nyaman. **Tidak** ada layout kedua, tidak ada route baru,
  halamannya tetap satu.
- Bukti: `next start` → `GET /install` **200** dan HTML-nya memuat label sidebar **"Panduan Install"**.

---

## 7. Tiga verifikasi manual — hasil apa adanya

| # | Verifikasi | Hasil | Bukti / catatan |
|---|---|---|---|
| 1 | **PIN**: aktifkan → refresh → terkunci; pindah tab & kembali → terkunci; 5× salah → tunggu; "Lupa PIN" → bisa masuk lagi | ✅ terverifikasi di lapis kebijakan & kode, ⚠️ langkah browser tidak dijalankan | `locked` di-inisialisasi dari `readLockRecord()` setelah mount → **refresh = terkunci**; `visibilitychange` hidden → `lockNow()` → **pindah tab = terkunci**; kebijakan 5 salah → tunggu 5 menit + hitung mundur + `failure` di-reset setelah masa tunggu dikunci `lib/data/app-lock.test.ts` (9 test, hijau); `forgotPin()` = `router.replace('/login')` **lalu** sesi diakhiri + record PIN dibuang → bukan layar buntu |
| 2 | **Offline**: DevTools Offline → reload → app terbuka + banner "Offline"; catat transaksi → "Tersimpan di perangkat"; Online → "Proses sekarang" → antrean 0 | ⚠️ tidak dijalankan di browser; ✅ logika antrean & copy terverifikasi | `lib/money/store.test.ts` (3 test antrean: lahir offline → `pendingSyncCount() === 2` → `flushPendingSync() === 2` → 0, dan antrean bertahan saat state dibaca ulang); copy `OFFLINE_COPY.offlineTitle/savedOfflineTitle/pendingCta` ada di `lib/data/offline.ts`; `public/sw.js` lolos `node --check` dan punya handler `fetch` (dokumen network-first → cache → shell `/`) |
| 3 | **Bulan lain**: majukan jam ke bulan berikutnya → `/joint`, Riwayat, HUD tidak menampilkan "bulan ini kosong" yang aneh | ✅ terverifikasi (jam sistem direkayasa ke 5 Okt 2026), ℹ️ 1 catatan demo | `lib/data/month-rollover.test.ts` (5 test): Riwayat **tidak kosong** (filter default "Semua waktu"), filter "Bulan ini" kosong **secara jujur** (memang belum ada catatan Oktober), `/joint` tetap memakai bulan datanya (`JOINT_MONTH_KEY = 2026-09`) & label bulan lain benar, banner rekap joint tidak melempar. Catatan: HUD Home memakai jangkar tanggal MOCK (`HISTORY_TODAY_ISO = 2026-09-27`) sehingga tetap menampilkan angka September di bulan nyata mana pun — keputusan demo yang sudah ada (tanggal statis = bebas hydration mismatch), **bukan** efek samping paket ini |


---

## 8. Validasi (dijalankan, output ditempel apa adanya)

```bash
$ pnpm test
 ✓ lib/money/amount-input.test.ts (25 tests)   ✓ lib/data/joint-ledger.test.ts (16)
 ✓ lib/money/ledger.test.ts (20)               ✓ lib/data/app-lock.test.ts (9)
 ✓ lib/analytics.test.ts (8)                   ✓ lib/ai-usage-store.test.ts (12)
 ✓ lib/data/joint-invite.test.ts (18)          ✓ lib/data/month-rollover.test.ts (5)
 ✓ lib/session.test.ts (8)                     ✓ lib/invite-store.test.ts (7)
 ✓ lib/data/joint-settlement.test.ts (22)      ✓ lib/data/joint.test.ts (19)
 ✓ lib/data/wealth-cash.test.ts (22)           ✓ app/api/wallets/route.test.ts (11)
 ✓ lib/money/smoke-money-flow.test.ts (6)      ✓ lib/privacy-settings.test.ts (8)
 ✓ lib/money/export.test.ts (9)                ✓ app/api/push/push.test.ts (9)
 ✓ lib/ai-quota.test.ts (3)                    ✓ lib/account.test.ts (10)
 ✓ lib/money/store.test.ts (45)                ✓ lib/demo.test.ts (1)

 Test Files  22 passed (22)
      Tests  293 passed (293)

$ pnpm exec tsc --noEmit
TSC: 0 error

$ pnpm build
✓ Compiled successfully in 1032ms
✓ Generating static pages using 19 workers (34/34) in 676ms
  Finalizing page optimization ...
Route (app) … ├ ○ /install … (34 route, termasuk `/install` sebagai halaman statis)

$ pnpm theme:audit
✓ palet bersih — 298 file diperiksa, tidak ada warna di luar palet.
```

Catatan mesin (sama seperti paket sebelumnya): pnpm lokal 9.12.0 sedangkan `package.json` menulis
`packageManager: pnpm@12.3.4`, jadi semua perintah dijalankan dengan
`pnpm --config.manage-package-manager-versions=false …`. Field itu sebaiknya diperbaiki sebelum CI
dibuat.

Smoke test produksi tambahan (di luar empat perintah wajib): `next start -p 3123` →
`GET /` 200 · `GET /install` 200 · `GET /wallet` 200 · `GET /joint` 200 · `GET /history` 200 ·
`GET /settings/ai` 200 · `GET /wealth` 200; HTML `/install` memuat label sidebar "Panduan Install",
HTML `/` memuat baris "Total Saldo = semua dompet" + chip "3 dompet", HTML `/settings/ai` memuat badge
"Belum tersambung ke model". Server dimatikan lagi setelah pemeriksaan.

---

## 9. Keputusan desain (dan alasannya)

1. **Total Saldo = semua dompet, tanpa kecuali.** Alternatif "total mengikuti konteks" ditolak karena
   angka itu lalu berubah makna diam-diam antar halaman — persis temuan yang dilaporkan. Konteks tetap
   berguna, jadi ia yang dipindah ke baris keterangan (`Dompet Pribadi: Rp 1.800.000`).
2. **Baris konteks selalu tampil**, tidak bersyarat "kalau konteks aktif": konteks uang selalu punya
   nilai, dan membandingkan total halaman lain dengan total yang menyaring dompet adalah satu-satunya
   sumber kebingungan yang tersisa.
3. **Chip dompet di Home dihitung dari SEMUA dompet** (`3 dompet`), bukan daftar tersaring: satu layar
   tidak boleh memuat dua jumlah dompet yang berbeda.
4. **`problem` gating dipasang di engine, bukan di parser.** Parser tetap murni & mudah diuji
   (`lib/money/amount-input.test.ts`); "kapan boleh bicara" adalah keputusan UI.
5. **Perapian angka pindah ke `onBlur`** — kompromi terbaik antara enak dibaca (ribuan bertitik) dan
   tidak melawan ketikan.
6. **Aturan sensor dijadikan fungsi murni** (`lib/privacy-settings.ts`) supaya janji "pindah tab →
   sensor, kembali → tampil, tombol mata tetap permanen" bisa diuji tanpa browser.
7. **AI jujur (opsi b)** daripada menyambungkan provider tanpa key; label "belum pakai model" ada di
   setiap balasan aturan supaya tidak ada klaim kemampuan yang belum ada.

---

## 10. Yang BELUM selesai (jangan diklaim sudah)

- Langkah **browser** untuk tiga verifikasi manual (§7): pindah tab sungguhan, DevTools offline +
  reload, dan memajukan jam sistem perangkat — tidak bisa dijalankan di lingkungan agent ini.
- **Provider LLM** tetap belum tersambung (butuh API key pemilik produk, server-side). Paket ini
  memilih jujur + tetap berguna, bukan menyambungkannya tanpa key.
- Sesuai larangan prompt, paket ini **tidak menyentuh Supabase/backend** — itu paket #45.
- Semua perubahan ini **belum di-commit** (working tree, sama seperti paket-paket sebelumnya).

