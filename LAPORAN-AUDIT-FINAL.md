# LAPORAN AUDIT FINAL — CATETIND (SESI 3–5)

Tanggal sesi: 14 November 2026 (Sesi 3) · 14–15 November 2026 (Sesi 4) · 15 November 2026 (Sesi 5)
Metode bukti: **Chromium sungguhan (Playwright) × PostgREST Supabase dengan token user (RLS aktif) × muat ulang penuh**, viewport HP 390×844 & Desktop 1280×800 (Snap diuji di keduanya). Sesi pemilik `/admin` dibuat lewat Admin API `generateLink({ type: 'magiclink' })` → `verify`, hanya untuk membaca/menguji `/admin`.
Akun: hanya akun uji sementara `@catetind.test` (dibuat via Admin API, dihapus di akhir). Akun pemilik `shiimaify@gmail.com` **tidak dipakai untuk menulis data keuangan**.
Server uji: build produksi (`next build` → `next start -p 3000`).

> ⚠️ **KEAMANAN TOKEN**: Personal Access Token Supabase yang dioper di prompt sesi 4 **tidak dipakai** di sesi 5 (tidak ada migrasi baru, tabel `notifications` sudah 200). Token itu sudah tertulis di percakapan sehingga **harus dianggap bocor**. Segera revoke/rotate di Supabase → Account → Access Tokens.

---

## 0. RINGKASAN STATUS PER PRIORITAS (JUJUR, APA ADANYA)

| Prioritas | Status sesi 5 | Skor nyata |
|---|---|---|
| **P1.1 — sapu bersih SVG hiasan** | **SELESAI** (dijaga tetap hijau) | `qa:visual` **131/131** · 0 SVG hiasan di judul kartu/empty state (9 rute × 2 viewport) |
| **P1.2 — gaya bahasa 7 area** | **SELESAI** (dijaga tetap hijau) | `copy-tone.test.ts` **29 cek**; `audit-copy` **0/79** |
| **P1.3 — zero-fluff + kait empty state** | **SELESAI** (dijaga tetap hijau) | 24+ `data-catetind-empty`; `empty-state-markers.test.ts` **22 cek**; `qa:visual` 131/131 |
| **P1.4 — verifikasi 6 redesign + halaman publik** | **SELESAI** (dijaga tetap hijau) | `qa:visual` **131/131** (browser nyata, 2 viewport) |
| **P2 — finance / bills / wealth** | **SELESAI 100%** | `qa:finance` **26/26** · `qa:bills` **26/26** · `qa:wealth` **40/40** |
| **P3 — dompet bersama 3 jendela** | **SELESAI 100%** | `qa:joint` **39/39** (3 konteks, kode 6 karakter, 5 mode, settle per pasangan) |
| **P4 — isolasi ganti akun & bebas data dummy** | **SELESAI** (dijaga tetap hijau) | `qa:isolation` **12/12** |
| **P5.1 — lonceng notifikasi server** | **SELESAI** (dijaga tetap hijau) | `qa:offline` **13/13** |
| **P5.2–P5.6 — Minca AI, Pengaturan, Snap, Admin** | **SELESAI 100%** | `qa:ai` **13/13** · `qa:settings` **23/23** · `qa:snap` **14/14** · `qa:admin` **15/15** |
| **P6 — gerbang kualitas & bersih-bersih** | **SELESAI** | tsc 0 · vitest **2060** · palet 704 · kontras 646 · copy 0/79 · `qa:audit` **206/206** · `qa:crud` **10/10** · `qa:money` **34/34** · sisa akun uji **0** |

**Kesimpulan jujur:** seluruh prioritas P1–P6 tuntas dengan skor nyata dari eksekusi skrip (bukan klaim). Sesi 5 juga menemukan & memperbaiki **5 bug nyata** yang hanya muncul saat tiga lapis (layar × server × reload) diuji bersamaan — rinciannya di §4. Tidak ada skrip yang diklaim lulus tanpa angka.

### 0.2 RINCIAN SESI 4–5 (BUKTI & TEMUAN)

| # | Area | Perubahan / temuan | Bukti |
|---|---|---|---|
| 1 | P1.2 nada copy | `scripts/tools/copy-tone-pass.mjs` (idempoten): "gue"→"aku", "lo/Anda"→"kamu", "nge-judge"→"nyalahin", "harus/wajib"→"perlu" di 7 area + Kalkulator Uang Gaib + testimoni | `copy-tone.test.ts` 29 lulus; `audit-copy` 0/79 |
| 2 | P1.3 kait empty state | 24+ kait `data-catetind-empty` di 21 berkas (tagihan, riwayat, dompet, budget A/B, arus uang, transaksi terakhir, kalender, kekayaan 4 tab, hutang, celengan, rekap, lonceng, pencarian kategori, referral, joint, billing) | `empty-state-markers.test.ts` 22 lulus |
| 3 | P1.3 zero-fluff | Ikon hiasan di dalam empty state dicabut (Sprout/Waves/Puzzle/BellOff/Search/PiggyBank/Plus); paragraf pengantar rekap dipendekkan; panel rekap kosong kini benar-benar menampilkan `emptyBody` (dulu `<p>` kosong) | `qa:visual` 131/131 (0 SVG di empty state) |
| 4 | **BUG P5.1** | Ambang budget memakai jangkar seed `TODAY_ISO` (2026-09-28) → 80/100% **tidak pernah** tercapai. Sekarang `localISODate()` | `qa:finance` 26/26 (85% & 110% → 2 baris `notifications`) |
| 5 | **BUG P5.1** | Id notifikasi stabil berisi titik dua (`budget:…`, `bill-due:…`) dikirim ke kolom `uuid` → INSERT ditolak, item hanya hidup di perangkat. Sekarang `stableNotificationId()` (uuid v4 deterministik) | `notification-id.test.ts` 3 lulus; baris budget di tabel `notifications` |
| 6 | P2 finance | `scripts/qa/finance-flow.mjs` baru: budget 200rb→170rb (85%)→220rb (110%), gajian 25 (server + layar Pengaturan), filter Riwayat, tab Insight, matematika lintas halaman **Rp 0** | `qa:finance` **26/26** |
| 7 | P2 bills | `scripts/qa/bills-flow.mjs` baru: geometri pil (44×24), jatuh tempo 31, tenor 1/6, kalender, edit/hapus. **Sesi 4 terhambat** pada tombol simpan sheet "Tandai Lunas" (15/26); **Sesi 5 diperbaiki → 26/26** | `qa:bills` **26/26** |
| 8 | P4 isolasi | `scripts/qa/isolation.mjs` baru: satu konteks, cookie ditukar Uji 1→Uji 2→Uji 1; data unik (catatan, dompet, budget 111rb) | `qa:isolation` **12/12** |
| 9 | Alat uji | `visual-audit.mjs`: kait empty state 3 rute baru, larangan catatan kaki sheet, langkah Install dibatasi `[data-catetind-langkah]`, seed gaji lewat onboarding nyata | 131/131 |
| 10 | Paket skrip | `qa:finance`, `qa:bills`, `qa:isolation` di `package.json` | — |
| 11 | **P2 bills (sesi 5)** | Kait `data-catetind-bill-pay-submit`/`-pay`/`-unmark`/`-edit`/`-delete`; skrip memilih **radio dompet BCA** (bukan menekan Escape) + `scrollIntoViewIfNeeded()`; **BUG nyata**: batal lunas mengembalikan uang **dua kali** (baris server dihapus + koreksi +500k) → `hideRow()` menyembunyikan baris hanya di perangkat, pasangan −/+ tetap seimbang di server | `qa:bills` **26/26** (saldo 4.475.000 → 4.975.000, ledger `Batal bayar`, tenor 2/6→1/6) |
| 12 | **P2 wealth (sesi 5)** | Skrip baru 40 cek; fitur **Ubah Celengan** (`updateFund`, `EditGoalSheet`, kait `data-catetind-fund-*`) karena aplikasi belum punya jalan mengoreksi celengan tanpa menghapusnya; arah penarikan ditandai `out:` di `client_tx_id` + jumlah bertanda di `funds-remote` (view `goal_savings` menjumlahkan penarikan sebagai setoran) | `qa:wealth` **40/40** (celengan 1 jt, +12,5% investasi, aset fisik, hutang 700k, Net Worth selisih **Rp 0**) |
| 13 | **BUG hooks (sesi 5)** | `GoalDetailScreen` memanggil dua `useMemo` **setelah** early-return `if (!fund)` → reload halaman detail melempar React #310 dan segmen `/budget` jatuh ke error boundary. Hook dipindah ke atas + `NO_LATE_INFO` | `qa:wealth` reload celengan hijau; vitest 2060 |
| 14 | **BUG pembayaran hutang (sesi 5)** | `debt_payments.debt_id` dikirim sebagai id domain (`debt-…`) padahal kolomnya uuid → INSERT 400, sementara ledger & saldo dompet sudah bergerak. Kini diterjemahkan lewat `remoteId`, dan `mergeWithRemoteWealth` memetakan balik `debtId` | `qa:wealth`: sisa 700.000, `debt_payments` 1 baris, tahan reload |
| 15 | **P3 joint (sesi 5)** | Skrip baru 39 cek, 3 konteks; **BUG UX**: pemilik sendirian setelah anggota terakhir keluar jatuh ke "Mau mulai dari mana?" sehingga tidak bisa mengundang/menghapus dompetnya → panel `JOINT_SOLO_OWNER_COPY` (undang lagi / hapus dompet) | `qa:joint` **39/39** (kode 6 karakter, 5 mode, settle per pasangan 2→1, bar 50/50, Cerita Kita scroll) |
| 16 | **P5.2–P5.6 (sesi 5)** | `qa:ai` (Minca santai, tanggal lokal 15 Nov 2026, transaksi chat → `ledger_rows`, `ai_usage` 0→4 & tahan reload); `qa:settings` (nama, avatar 642 B, cookie 2728 B, kategori, AI/notif, PIN, JSON); `qa:snap` (Snap inline 390 & 1280); `qa:admin` (magiclink pemilik, 4 tab, Dry Run, set Waras lifetime untuk akun uji) | `qa:ai` **13/13** · `qa:settings` **23/23** · `qa:snap` **14/14** · `qa:admin` **15/15** |
| 17 | Alat bantu sesi 5 | `restService()` (kunci peran server, hanya bersih-bersih), `sessionFromMagicLink()`, `cleanup.mjs` kini menghapus `purchases` pending + `joint_wallets` milik akun uji | `qa:cleanup`: 0 akun, 0 order, 0 dompet bersama |


---

## 1. BLOCKER 3 SESI DISELESAIKAN: TABEL `notifications` + CADANGAN OTOMATIS

Sebelum sesi ini, seluruh tulisan/bacaan lonceng ke server dijawab `404 PGRST205` karena tabel belum ada. Sekarang:

| Langkah | Bukti |
|---|---|
| Migrasi `20261111160000_catetind_notifications.sql` diterapkan lewat Management API (token dari ENV) | `✓` + `notify pgrst, 'reload schema'` |
| `GET /rest/v1/notifications?select=id` | **HTTP 200** (`[]`) |
| Migrasi baru `20261114120000_catetind_notifications_cache.sql` | kolom `user_settings.notifications_cache` → **HTTP 200** |
| Cadangan otomatis di `lib/supabase/notifications-remote.ts` | jalur utama gagal → baca/tulis `user_settings.notifications_cache` |
| Unit test cadangan | `lib/supabase/notifications-cache.test.ts` **6/6 lulus** |

Alasan kolom cadangan **tidak** menumpang `push_state`: `lib/push/cron.ts` menulis `push_state` sebagai objek utuh setiap cron berjalan, jadi notifikasi di dalamnya akan terhapus.

---

## 2. PERUBAHAN KODE SESI INI

| # | Berkas | Perubahan |
|---|---|---|
| 1 | `supabase/migrations/20261114120000_catetind_notifications_cache.sql` | kolom jsonb cadangan lonceng + realtime |
| 2 | `lib/supabase/notifications-cache.ts` (baru) + `.test.ts` | parsing/merge/patch murni, 6 test |
| 3 | `lib/supabase/notifications-remote.ts` | fallback otomatis ke tabel pengaturan user |
| 4 | `lib/money/notification-store.ts` | **BUGFIX**: item yang baru dibersihkan tidak hidup lagi saat realtime mengirim ulang daftar server (`clearedBeforeMs`) |
| 5 | `scripts/supabase/apply-sql.mjs` (baru) | menerapkan satu/beberapa berkas SQL tanpa menyentuh migrasi lain |
| 6 | `scripts/qa/visual-audit.mjs` (baru) | 121 pemeriksaan browser: SVG hiasan, zero-fluff, 6 redesign, publik |
| 7 | `scripts/tools/remove-decorative-icons.mjs` (baru) | codemod idempoten pencabut ikon hiasan |
| 8 | `plant-illustration.tsx`, `plant-art-defs.tsx`, `batik-cloth.tsx`, `wallet-card-face.tsx`, `wallet-card-stack.tsx`, `wealth-net-worth-bar.tsx`, `install-step-visual.tsx` | seluruh SVG dekoratif dicabut (API komponen dipertahankan agar pemanggil tidak rusak) |
| 9 | 25 berkas komponen | 24 nama impor + **30 elemen ikon hiasan** (`Sparkles`, `Crown`, `Trophy`, `Flame`, `Wand2`, `Gem`) dicabut |
| 10 | `components/landing/lp/pricing.tsx` + `lib/data/landing.ts` | **saklar 30 Hari ↔ Akses Selamanya** pada 3 kartu; nominal & `checkoutHref` ikut periode; ikon bintang di lencana dicabut |
| 11 | `lib/data/monthly-review.ts`, `lib/data/joint-invite.ts`, `joint-invite-flow.tsx` | paragraf pengantar dihapus, copy dipendekkan (zero-fluff) |
| 12 | `lib/data/bills.ts` | pil filter `Aktif` → **`Belum Bayar`** (sesuai mandat) |
| 13 | `daily-hud-summary.tsx`, `bills-overview.tsx`, `bills-screen.tsx`, `cashflow-inspector.tsx` | kait DOM stabil `data-catetind-*` untuk uji otomatis |
| 14 | `scripts/qa/offline-flow.mjs` | tambah bukti lapis-2: baris nyata di tabel `notifications` server |
| 15 | `package.json` | `qa:visual`, `supabase:sql` |

### 2.2 PERUBAHAN KODE SESI 5

| # | Berkas | Perubahan |
|---|---|---|
| 1 | `components/catetind/budget-sheet.tsx` | `SheetSubmit` menerima `submitAttrs` (kait `data-catetind-*` pada tombol, perilaku tidak berubah) |
| 2 | `mark-bill-paid-sheet.tsx`, `bill-card.tsx` | kait `data-catetind-bill-pay-submit`, `-pay`, `-unmark`, `-edit`, `-delete` |
| 3 | `lib/money/store.ts` | `hideRow()` — tombstone lokal TANPA menghapus baris di server (dipakai batal lunas) |
| 4 | `lib/money/bills-store.ts` | `unmarkBillPaid()` memakai `hideRow()` → pengembalian uang tepat satu kali |
| 5 | `lib/data/budget.ts` | `FUND_EDIT_COPY`, `updateFund()` (nama & target tanpa menyentuh progres) |
| 6 | `components/catetind/edit-goal-sheet.tsx` (baru) + `goal-detail-screen.tsx` | sheet **Ubah Celengan**; hook `projection`/`late` dipindah ke atas early-return (React #310); kait `data-catetind-fund-*` |
| 7 | `lib/supabase/domain-mappers.ts` | arah penarikan celengan ditandai `out:` di `client_tx_id`; `toFundContribution` membacanya kembali |
| 8 | `lib/supabase/funds-remote.ts` | terkumpul dihitung **bertanda** dari `goal_contributions` (bukan view `goal_savings` yang menjumlahkan penarikan) |
| 9 | `lib/money/wealth-store.ts` | `debt_payments.debt_id` diterjemahkan ke uuid lewat `remoteId`; merge memetakan balik ke id domain |
| 10 | `lib/data/joint.ts` + `joint-screen.tsx` | panel pemilik sendirian (`JOINT_SOLO_OWNER_COPY`) setelah anggota terakhir keluar |
| 11 | `scripts/qa/harness.mjs` | `restService()` (kunci peran server, hanya bersih-bersih) & `sessionFromMagicLink()` |
| 12 | `scripts/qa/{wealth-flow,joint-three,ai-flow,settings-flow,snap-flow,admin-flow}.mjs` (baru) | 6 skrip QA baru, total **144 cek** |
| 13 | `scripts/qa/cleanup.mjs` | hapus `purchases` pending + `joint_wallets` milik akun uji sebelum akunnya |
| 14 | `package.json` | `qa:wealth`, `qa:joint`, `qa:ai`, `qa:settings`, `qa:snap`, `qa:admin` |

---

## 3. BUKTI TIGA LAPIS

### 3.1 P1 — Visual, zero-fluff, redesign, halaman publik · `node scripts/qa/visual-audit.mjs` → **131/131 LULUS**

| Area | Bukti nyata |
|---|---|
| Sapuan 9 rute × 2 viewport | tiap halaman `200` & tidak terlempar ke `/login`; **0 teks terlarang**; **0 SVG hiasan** di judul kartu/empty state; **0 gulir horizontal** |
| Jatah Hari Ini | tepat **1 nilai angka besar** + tepat **1 `role="progressbar"`**; info ≤ 20 kata |
| Tagihan compact | kartu ringkasan **77 px**; pil `Semua / Belum Bayar / Lunas` **sejajar satu baris** (`offsetTop` identik); baris `<li>` rapat, celah ≤ 20 px |
| Kalender (390px) | kartu detail tanggal: **0 tumpang tindih**, jarak antar bagian **8 px**, tombol “Tambah Catatan di Tgl …” tampil |
| Pusat Bantuan | pencarian menyaring (panjang konten berubah), pil topik mengubah konten, akordeon `aria-expanded` berubah saat diklik |
| Install | 2 tab (`role=tab`), klik tab kedua `aria-selected=true`; **tepat 3 langkah bernomor** |
| Undangan Dompet Bersama | kode **6 karakter** (`AK258X`), tombol salin/bagikan ada, satu aksi utama |
| Landing | 2 slider; **0 `NaN`/`undefined`**; 3 kartu paket; saklar periode mengubah **ketiga** tautan menjadi `period=monthly` / `period=lifetime` dengan `plan=` tepat |
| Legal | `/privacy` & `/terms` 200 + menulis aturan **kuota AI sekali pakai, tidak diisi ulang otomatis** |

### 3.2 P5.1 — Lonceng notifikasi · `node scripts/qa/offline-flow.mjs` → **13/13 LULUS**

| Lapis | Bukti |
|---|---|
| Layar | item “Pengeluaran tercatat” muncul di panel lonceng 390px |
| Tabel server | `GET /rest/v1/notifications?select=id,title,is_read` → **HTTP 200 · 1 baris** (token user, RLS) |
| Tahan refresh / offline→online | antrean terkirim otomatis tepat **1 baris**, tanpa reload; “Tandai semua dibaca” menghapus lencana; “Bersihkan” mengosongkan panel |

### 3.3 P2 — Tagihan & Kekayaan (sesi 5)

| Skrip | Lapis layar | Lapis server (RLS) | Tahan reload |
|---|---|---|---|
| `bills-flow.mjs` **26/26** | saklar 44×24 (radius pil, thumb bulat), jatuh tempo 31 → “Tgl 30”, tenor 1/6, kartu detail tanggal, “Tambah Catatan di Tgl …” | bayar 500k: `wallet_balances` 4.975.000→4.475.000, `ledger_rows` kategori Tagihan, `notifications` 1 baris; batal lunas: saldo kembali 4.975.000 + baris “Batal bayar” | tenor 2/6 & status lunas bertahan; batal → 1/6 |
| `wealth-flow.mjs` **40/40** | celengan 1 jt: setor 400k, tolak 9 jt (alasan tampil, tombol mati), tarik 100k, setor 700k → 100%, ubah nama/target, hapus; investasi 1.125.000 (+12,5%); properti 3 jt; hutang → 700k | `goals` target 1.000.000; `goal_contributions` bertanda 400k/100k(out)/700k; `investments` 10×100k + `investment_values` 1.125.000; `physical_assets` 3 jt; `debt_balances` 700k + `debt_payments` 300k | semua angka bertahan; Net Worth **Rp 0** selisih (`/wealth` = `/wallet` + Kekayaan + Properti − Hutang) |

### 3.4 P3 — Dompet bersama 3 jendela · `qa:joint` **39/39**

| Area | Bukti |
|---|---|
| Undangan | kode **6 karakter** (`/^[A-Z0-9]{6}$/`) + baris `invite_codes`; dipakai 2 anggota gratis dengan kode yang sama → `joint_members` **3** |
| 5 mode | `equal` (3 peserta), **porsi** (`split_members` 2), `percentage` (validasi total ≠100 ditolak; 50/30/20 tersimpan), `nominal` (validasi 250k≠300k ditolak; 150/100/50 tersimpan), `single_payer` (traktir: `bearer_id` = pembayar) |
| Pemasukan | `kind='income'` Rp 500.000 di server + “PEMASUKAN BERSAMA +Rp 500.000” di layar |
| Settle per pasangan | rencana **2 transfer**; klik “Lunasi” satu baris → `is_settlement` +1, baris transfer **2→1**, kartu tidak “Semua Impas” |
| Bar kontribusi | dua orang: 100%/0% → setelah settle **50%/50%** |
| Cerita Kita | `overflow-y:auto`, `max-height 506px`, `scrollHeight 1525` → `scrollTop 1019` |
| Kelola | hapus catatan (baris server −1), keluar (anggota 3→2), keluarkan (2→1), hapus dompet (`joint_wallets` hilang); state lokal anggota lain bersih |

### 3.5 P5.2 — Minca AI · `qa:ai` **13/13**

| Bukti | Angka nyata |
|---|---|
| Balasan santai | memakai “gue/lo/aku/kamu”, **0 “Anda”**, menyebut saldo & pengeluaran |
| Tanggal lokal | kartu konfirmasi `input[type=date]` = **2026-11-15** (hari ini WIB) |
| Transaksi dari chat | `ledger_rows` expense Rp 25.000 `Beli Kopi` tanggal 2026-11-15; tampil di Transaksi Terbaru |
| Kuota kumulatif | `ai_usage.chat.calls_used` **0 → 4** (bulan 2026-11); setelah reload tetap **4**, gauge **99% sisa** (bukan 100%) |

### 3.6 P5.3 — Pengaturan · `qa:settings` **23/23**

| Area | Bukti |
|---|---|
| Nama | `profiles.nickname` = nama baru, bertahan reload |
| Avatar | `data:image/webp` **642 B** (≤ 20 KB), 1 cookie sesi **2.728 B** (< 4096) |
| Kategori | `catet-category-prefs` berisi kustom + `hidden:["hiburan"]`; label “Disembunyikan” & kustom bertahan reload |
| AI | `autoNaming:false`, `mincaMode:"savage"` di perangkat **dan** `user_settings.ai_prefs`; pilihan Savage bertahan |
| Notifikasi | `reminder-harian:false` di `user_settings.notif_prefs`; saklar bertahan reload |
| PIN | `catet-ind-app-lock` (hash lokal) tertulis; status Kunci Aplikasi aktif |
| Export | `catetind.money-export` versi 4, 1 dompet, 1 baris ledger |

### 3.7 P5.4 — Snap inline · `qa:snap` **14/14**

| Viewport | Respons charge | Inline | Cleanup |
|---|---|---|---|
| 390×844 | HTTP **200**, token Snap, `redirectUrl` Midtrans, `snap.scriptUrl` + `clientKey` | `#catetind-snap-embed` + `iframe[src*=midtrans]` visible (320×560 di dalam viewport), tanpa tab baru | order pending dihapus |
| 1280×800 | idem (akun terpisah) | iframe 800×560 di dalam viewport | 2/2 baris `purchases` dihapus |

### 3.8 P5.5 — Admin · `qa:admin` **15/15**

| Bukti | Hasil |
|---|---|
| Login pemilik | `generateLink({type:'magiclink'})` → `verify` → cookie sesi; email `shiimaify@gmail.com` |
| 4 tab | Ringkasan · User · Langganan · Pembayaran semuanya `aria-pressed=true`; pencarian user tampil; tabel pembayaran tampil |
| Dry Run cron | POST `/api/admin/push-cron` **200**, `dryRun:true`, `sent:0`; UI menandai “simulasi” |
| Aksi founder | akun uji → `user_subscriptions` `waras` + `is_lifetime` + `is_active`; jendela akun uji langsung masuk onboarding (bukan `/checkout`) dan Billing menampilkan **Waras** |


---

## 4. BUG YANG DITEMUKAN & DIPERBAIKI SESI INI

| # | Temuan | Bukti | Status |
|---|---|---|---|
| 1 | Setelah “Bersihkan”, item yang baru dihapus **hidup lagi** karena event realtime `notifications` mengirim ulang daftar server sebelum DELETE selesai (bug baru muncul setelah tabel server aktif) | `qa:offline` awal sesi: 11/12; tangkapan layar `qa-shots/notification-bell.png` masih menampilkan 1 item | **DIPERBAIKI** — `clearedBeforeMs`; kini **13/13** |
| 2 | Ikon/ilustrasi hiasan tersebar di 25 berkas + 7 komponen ilustrasi | inventaris `grep <svg` & impor lucide | **DIPERBAIKI** — 30 elemen JSX + 24 impor dicabut, DOM guard 0 |
| 3 | Landing hanya menjual satu periode | `LpPricingMode = 'lifetime'` | **DIPERBAIKI** — dua periode, harga & tautan ikut saklar |
| 4 | Paragraf pengantar di kartu/undangan & copy rekap bertele-tele | `qa:visual` zero-fluff gagal sebelum perbaikan | **DIPERBAIKI** — copy dipendekkan, pemeriksaan DOM lulus |
| 5 | **Batal lunas mengembalikan uang dua kali** — `removeRow()` menghapus baris pengeluaran di server (uang “pulang” dari view) **dan** koreksi +500.000 ditulis lagi → saldo naik Rp 1.000.000 untuk pembayaran Rp 500.000 | `qa:bills` sebelum perbaikan: 4.475.000 → **5.475.000** (bukan 4.975.000) | **DIPERBAIKI** — `hideRow()` (tombstone lokal, pasangan −/+ tetap seimbang di server); kini **26/26** |
| 6 | **Reload halaman detail celengan melempar React #310** — dua `useMemo` berada setelah early-return `if (!fund)`, jumlah hook berubah saat hidrasi | `qa:wealth` awal: layar “Budget & celengan gagal dimuat” setelah `page.reload()` | **DIPERBAIKI** — hook dipindah ke atas + `NO_LATE_INFO`; relod hijau |
| 7 | **Tarik dana celengan menaikkan progres di server** — view `goal_savings` menjumlahkan SEMUA baris `goal_contributions`, termasuk penarikan | `qa:wealth` awal: setelah tarik 100k, server 500k (bukan 300k) | **DIPERBAIKI** — penanda `out:` + jumlah bertanda di `funds-remote`; 400k → 300k → 1.000.000 |
| 8 | **Catat Bayar hutang gagal 400 di server** — `debt_payments.debt_id` memakai id domain (`debt-…`), bukan uuid baris `debts`; ledger & saldo sudah bergerak sehingga hutang “tidak pernah lunas” | `qa:wealth` awal: INSERT 400, `debt_balances` tetap 1.000.000 | **DIPERBAIKI** — terjemahan `remoteId` + merge balik; sisa **700.000** |
| 9 | **Pemilik sendirian kehilangan dompetnya dari layar** — setelah anggota terakhir keluar, UI jatuh ke “Mau mulai dari mana?” sehingga tombol undang/hapus dompet tidak terjangkau | `qa:joint` awal: `joint_wallets` masih ada, `catetind_joint_access` = `owner`, tetapi layar hanya pilihan awal | **DIPERBAIKI** — panel pemilik sendirian; kini **39/39** |

---

## 5. GERBANG KUALITAS (HASIL NYATA)

| Gerbang | Perintah | Hasil |
|---|---|---|
| Tipe data | `npx tsc --noEmit` | **0 error** |
| Unit test | `npx vitest run` | **151 berkas / 2060 test lulus** |
| Palet warna | `node scripts/theme/audit-palette.mjs` | **704 berkas bersih** |
| Kontras teks | `node scripts/theme/audit-text-contrast.mjs` | **646 berkas bersih** |
| 79 teks terlarang | `node scripts/tools/audit-copy.mjs` | **0 kemunculan** (474 berkas, 79 pola) |
| Build produksi | `npx next build` | **sukses** |
| Sapuan 206 | `node scripts/qa/audit.mjs` | **206/206 lulus** |
| Transaksi pertama | `node scripts/qa/crud.mjs` | **10/10 lulus** |
| Dompet & transaksi | `node scripts/qa/money-flow.mjs` | **34/34 lulus** |
| Offline & lonceng | `node scripts/qa/offline-flow.mjs` | **13/13 lulus** |
| Visual & redesign | `node scripts/qa/visual-audit.mjs` | **131/131 lulus** |
| Keuangan inti | `node scripts/qa/finance-flow.mjs` | **26/26 lulus** |
| Tagihan | `node scripts/qa/bills-flow.mjs` | **26/26 lulus** |
| Isolasi akun | `node scripts/qa/isolation.mjs` | **12/12 lulus** |
| Kekayaan & celengan | `node scripts/qa/wealth-flow.mjs` | **40/40 lulus** |
| Dompet bersama 3 jendela | `node scripts/qa/joint-three.mjs` | **39/39 lulus** |
| Minca AI | `node scripts/qa/ai-flow.mjs` | **13/13 lulus** |
| Pengaturan | `node scripts/qa/settings-flow.mjs` | **23/23 lulus** |
| Snap inline | `node scripts/qa/snap-flow.mjs` | **14/14 lulus** |
| Admin / founder | `node scripts/qa/admin-flow.mjs` | **15/15 lulus** |
| Bersih-bersih akun uji | `node scripts/qa/cleanup.mjs` | **sisa akun uji: 0** · order pending 0 · dompet bersama 0 |

Laporan mentah: `qa-audit-report.json`, `qa-crud-report.json`, `qa-money-report.json`, `qa-offline-report.json`, `qa-visual-report.json`, `qa-finance-report.json`, `qa-bills-report.json`, `qa-isolation-report.json`, `qa-wealth-report.json`, `qa-joint-report.json`, `qa-ai-report.json`, `qa-settings-report.json`, `qa-snap-report.json`, `qa-admin-report.json`, serta log `qa-*-s5.log`.


---

## 6. STATUS AKHIR & BATAS JUJUR (SESI 5)

### 6.1 Tidak ada prioritas yang tersisa
Seluruh butir P1–P6 di prompt sesi 5 sudah dikerjakan dan dibuktikan dengan skrip nyata (§3, §5). Tidak ada lagi skrip yang “belum dibuat” atau “15/26”.

### 6.2 Batas jujur yang TETAP dicatat (bukan blocker, tapi harus diketahui)
1. **View `goal_savings` menjumlahkan penarikan sebagai setoran.** Skema `goal_contributions` hanya punya `amount > 0`, jadi arah uang tidak punya kolom. Klien sekarang menandai penarikan `out:` di `client_tx_id` dan menghitung jumlah **bertanda** dari tabel server (`funds-remote.ts`). Artinya angka yang dipakai aplikasi benar, tetapi *view* SQL mentah tetap bukan sumber yang boleh dipakai untuk audit penarikan. Usulan produksi: tambah kolom `direction` (perlu migrasi; tidak dilakukan karena tidak ada token DB di sesi ini).
2. **`user_net_worth` di server tidak memasukkan aset fisik.** Net Worth di UI = kas + investasi + piutang + aset fisik − hutang; skrip membandingkan angka layar dengan penjumlahan yang sama dari tabel (`wallet_balances`, `investment_values`, `physical_assets`, `debt_balances`) dan **selisih Rp 0**. View server dipakai hanya untuk bagian kas+investasi+hutang.
3. **Charge Snap kedua untuk `order_id` yang sama menjawab 400.** Satu sesi normal tidak pernah menagih dua kali (order dipakai ulang), tetapi dua jendela berbeda dengan akun yang sama tidak bisa memakai token yang sama. `qa:snap` memakai **satu akun uji per viewport** dan menghapus kedua baris `purchases`. Ini batas idempotensi provider, bukan klaim “dua embed dari satu order”.
4. **`ai_usage` metering chat vs capture.** Pesan transaksi (`kopi 25000`) tidak dihitung sebagai panggilan `chat` — ia masuk jalur capture (kuota `categorize`), sesuai desain `hooks/use-ai-chat.ts`. Skrip mengirim 4 pertanyaan keuangan agar kenaikan `chat.calls_used` terbukti (0 → 4).
5. **PIN & kategori hidup di perangkat** (localStorage), bukan tabel server. Bukti tiga lapis untuk area ini = layar × localStorage × reload; `user_settings` hanya menyimpan preferensi AI/notifikasi.
6. **Akun pemilik tidak pernah menulis data keuangan.** Sesi `/admin` hanya membaca snapshot, menjalankan Dry Run (tidak mengirim push), dan memberi paket ke akun uji. Semua angka keuangan berasal dari akun `@catetind.test`.

---

## 7. CARA MEMBUKTIKAN ULANG (REVIEWER)

```bash
# prasyarat: .env.local lengkap, lalu build produksi
npx tsc --noEmit && npx vitest run
npx next build && npx next start -p 3000

# gerbang statis
node scripts/theme/audit-palette.mjs
node scripts/theme/audit-text-contrast.mjs
node scripts/tools/audit-copy.mjs

# bukti browser (skor nyata)
node scripts/qa/visual-audit.mjs     # 131/131 (SVG, zero-fluff, empty state, 6 redesign, publik)
node scripts/qa/crud.mjs             # 10/10
node scripts/qa/money-flow.mjs       # 34/34
node scripts/qa/offline-flow.mjs     # 13/13  (termasuk baris notifications server)
node scripts/qa/audit.mjs            # 206/206
node scripts/qa/finance-flow.mjs     # 26/26  (budget 85/110%, gajian, riwayat, Rp 0)
node scripts/qa/bills-flow.mjs       # 26/26  (bayar/batal lunas, ledger, notifications, edit/hapus)
node scripts/qa/isolation.mjs        # 12/12  (ganti akun, 0 kebocoran, bebas dummy)
node scripts/qa/wealth-flow.mjs      # 40/40  (celengan, investasi +12,5%, properti, hutang, Net Worth Rp 0)
node scripts/qa/joint-three.mjs      # 39/39  (3 konteks, 5 mode, settle per pasangan, kelola dompet)
node scripts/qa/ai-flow.mjs          # 13/13  (Minca santai, tanggal lokal, transaksi chat, ai_usage)
node scripts/qa/settings-flow.mjs    # 23/23  (nama, avatar ≤20 KB, kategori, AI/notif, PIN, export JSON)
node scripts/qa/snap-flow.mjs        # 14/14  (Snap inline 390 & 1280; order pending dihapus)
node scripts/qa/admin-flow.mjs       # 15/15  (magiclink pemilik, 4 tab, Dry Run, founder → akun uji)

# wajib terakhir
node scripts/qa/cleanup.mjs          # sisa akun uji: 0 · order pending 0 · dompet bersama 0
```

Catatan operasional:
- Skrip browser mengasumsikan **port 3000 menjalankan build produksi** (`next start`). Setiap perubahan `app/`, `components/`, atau `lib/` wajib: stop port 3000 → `npx next build` → `npx next start -p 3000` sebelum menjalankan skrip.
- `qa:admin` memakai `generateLink` magiclink untuk `shiimaify@gmail.com` (kunci peran server dari `.env.local`); hanya membaca snapshot & memberi paket ke akun uji.
- `qa:snap` membuat order Midtrans sungguhan berstatus `pending` lalu menghapus baris `purchases`-nya; transaksi di sisi Midtrans akan kedaluwarsa sendiri.
- Migrasi SQL tidak diperlukan sesi ini (tabel `notifications` sudah 200). Bila suatu saat perlu migrasi, token Management API **hanya dari ENV** dan langsung di-revoke.

---

## === PROMPT LANJUTAN UNTUK NEW TASK (COPY-PASTE KE CHAT BARU) ===

Kamu melanjutkan **Sesi 6 CatetInd**. Baca `LAPORAN-AUDIT-FINAL.md` di root (terutama §0, §5, §6) dan **pakai alat yang SUDAH ADA** — jangan mengulang sapuan yang sudah lulus.

### SUDAH 100% SELESAI (jangan dikerjakan ulang; cukup jaga tetap lulus)
1. **P1 (visual, copy, zero-fluff, redesign, publik)** — `qa:visual` **131/131**, `copy-tone` 29, `empty-state-markers` 22, `audit-copy` **0/79**.
2. **P2 keuangan** — `qa:finance` **26/26**, `qa:bills` **26/26**, `qa:wealth` **40/40**.
3. **P3 dompet bersama** — `qa:joint` **39/39** (3 konteks, kode 6 karakter, 5 mode, settle per pasangan, bar 50/50, Cerita Kita scroll, kelola anggota & dompet).
4. **P4 isolasi** — `qa:isolation` **12/12**.
5. **P5** — `qa:offline` **13/13**, `qa:ai` **13/13**, `qa:settings` **23/23**, `qa:snap` **14/14**, `qa:admin` **15/15**.
6. **Gerbang sesi 5** — tsc **0** · vitest **151 berkas / 2060 test** · palet **704** · kontras **646** · audit-copy **0/79** · build sukses · `qa:audit` **206/206** · `qa:crud` **10/10** · `qa:money` **34/34** · `qa:cleanup` sisa akun uji **0**.

### PEKERJAAN SESI 6 (pilih sesuai mandat pemilik; semua bukti 3 lapis)
1. **Migrasi `goal_contributions.direction`** (butuh token Management API baru dari ENV): tambah kolom `direction text not null default 'in' check (direction in ('in','out'))`, backfill dari prefiks `client_tx_id = 'out:%'`, dan ubah view `goal_savings` menjadi `sum(case when direction='out' then -amount else amount end)`. Setelah itu `funds-remote.ts` bisa memakai view lagi (kode penanda `out:` tetap kompatibel).
2. **`user_net_worth` + aset fisik**: putuskan apakah view server ikut menjumlahkan `physical_assets.current_value`; kalau ya, tambah migrasi + uji ulang `qa:wealth` (target tetap selisih **Rp 0**).
3. **Snap multi-jendela satu akun**: selidiki 400 pada charge kedua untuk `order_id` yang sama (idempotensi provider vs route). Target: dua embed dari satu order **atau** pesan jujur “tagihan ini sudah dibuka di jendela lain” — jangan biarkan 400 mentah.
4. **Perluas cakupan QA** bila fitur baru masuk (mis. ekspor CSV admin, push cron live, top-up token AI) dengan pola yang sama: layar × tabel server (token user/RLS) × `page.reload()`, kait `data-catetind-*` bila locator rapuh.
5. **Jaga tetap hijau**: jalankan ulang seluruh skrip §7 setiap perubahan `app/`/`components/`/`lib/`, dan akhiri dengan `node scripts/qa/cleanup.mjs`.

### ATURAN WAJIB
- Akun pemilik `shiimaify@gmail.com` **hanya** untuk `/admin` (magiclink Admin API); semua tulis data keuangan lewat `@catetind.test`.
- Setiap klaim = 3 lapis: layar Chromium 390×844/1280×800, baris tabel Supabase (token user/RLS), tahan `page.reload()`.
- Port 3000 = **build produksi** (`next start`), bukan `next dev`. Setiap perubahan kode aplikasi → stop → `npx next build` → `npx next start -p 3000`.
- Jangan percaya “0 baris” tanpa status HTTP (harness mencetak error REST).
- Token Supabase PAT lama **sudah bocor** — pakai token baru hanya dari ENV dan revoke setelah dipakai.
- Akhiri dengan `node scripts/qa/cleanup.mjs` → **sisa akun uji 0**.

=== AKHIR PROMPT LANJUTAN ===





