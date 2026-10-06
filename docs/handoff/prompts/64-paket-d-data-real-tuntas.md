# 64 — TUNTASKAN PAKET D: DATA REAL (Supabase satu-satunya sumber) + verifikasi paket 63

**Jenis tugas:** lanjutan langsung dari paket 63. **Implementasi penuh, bukan rencana.**
**Sumber kebenaran celah:** `docs/STATUS-HALAMAN.md` §9 + §13 (pembaruan paket 63).

> **Cara memulai (tempel satu baris ini di task baru):**
> `Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/64-paket-d-data-real-tuntas.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build, pnpm test) dan laporkan hasilnya apa adanya.`

---

## 0. WAJIB DIBACA DULU (jangan lewati satu pun)

1. `docs/handoff/CONTEXT-WAJIB.md` — sampai habis (konvensi file, aturan warna, bahasa & copy, ergonomi mobile, checklist validasi, Definition of Done). **Catatan:** sebagian §1–2 masih menyebut "repo DEMO tanpa backend" — itu **tidak berlaku lagi**; Supabase sudah LIVE (lihat §1 di bawah).
2. `docs/STATUS-HALAMAN.md` — §9 (daftar celah) **dan §13 (pembaruan paket 63 — WAJIB dibaca, di sanalah status terbaru)**. §10 = deviasi sengaja.
3. Paket 63 yang sudah dikerjakan: `docs/handoff/prompts/63-tutup-semua-celah-status-halaman.md` (konteks), lalu **kode yang dibuatnya** (daftar di §2).
4. Prompt ini (§0–§8) — sampai habis.
5. PRD `CatetInd_Master_PRD_Lengkap.md`, section: **2363–2780** (offline/optimistic & satu ledger), **4503–4607** (renewal/trust), **4759–4937** (kuota AI), **6470–6636** (referral & share). Untuk paket D, yang paling relevan: "**satu sumber kebenaran**" & "**jujur di setiap klaim**" (PRD 244).
6. **Kode acuan wajib** (baca penuh 3–4 file sebelum menulis):
   - **Pola remote yang SUDAH jadi & wajib ditiru:** `lib/supabase/money-remote.ts` + `lib/money/store.ts` (fungsi `readRemoteMoney`, `pushRowToServer`, `mergeMoneySnapshot`). **Ini template resmi** untuk memindahkan modul lain.
   - `lib/money/wealth-store.ts` · `lib/money/funds-store.ts` · `lib/money/bills-store.ts` · `lib/money/joint-store.ts` (empat store yang HARUS dipindah).
   - `lib/money/idb.ts` · `lib/supabase/mappers.ts` · `lib/supabase/rest.ts` · `lib/supabase/client.ts` · `lib/supabase/config.ts`.
   - `lib/demo.ts` (**`SHOWS_SAMPLE_DATA`** — gerbang seed, baru ada di paket 63).
   - `supabase/migrations/*.sql` (skema kanon).

---

## 1. KEADAAN SAAT INI (FAKTA — jangan diragukan lagi)

### 1.1 Supabase = LIVE
- Project ref **`wmswtoyikvgzcvbgdceo`**, URL `https://wmswtoyikvgzcvbgdceo.supabase.co`.
- `.env.local` sudah berisi `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (kunci publishable, format `sb_publishable_…`).
- **6 berkas migrasi sudah DITERAPKAN** (diverifikasi `pnpm supabase:migrate` di paket 63). **71 RLS policy** aktif.
- **Tabel yang ADA di `public`:** `ai_usage, asset_transactions, bills, debt_balances, debt_payments, debts, goal_contributions, goal_savings, goals, investment_values, investments, invite_codes, joint_members, joint_transactions, joint_transactions_public, joint_wallets, ledger_row_effects, ledger_rows, physical_assets, profiles, push_subscriptions, referral_codes, referral_rewards, referrals, user_net_worth, user_settings, wallet_balances, wallet_cash_total, wallets`.
- **Tabel yang SENGAJA BELUM ada** (menunggu Midtrans, JANGAN dibuat): `user_subscriptions`, `purchases`, `pricing_state`, `waitlist`.
- **RLS terbukti bekerja**: anon membaca tabel ber-`user_id` → `200 []` (bukan data), dibuktikan `node scripts/supabase/verify-rls.mjs` + probe REST.

### 1.2 Yang SUDAH selesai di paket 63 (JANGAN dikerjakan/dibuat ulang)
- **Paket A** — Mesin AI Gemini nyata (server-only). File: `lib/ai/provider.ts`, `lib/ai/prompts.ts`, `lib/ai/extract.ts`, `lib/ai/rate-limit.ts`; route `app/api/ai/text`, `app/api/ai/ocr`, `app/api/parse-voice`, `app/api/ai/categorize`. Wiring: `hooks/use-ai-chat.ts`, `hooks/use-transaction-capture.ts`, `components/catetind/ai-chat-widget.tsx`, `lib/ai-chat.ts`.
- **Paket B** — Gambar share: `components/catetind/share-og-image.tsx`, `app/share/[id]/opengraph-image.tsx`, `app/share/[id]/twitter-image.tsx`, `app/api/share/[id]/image/route.tsx`; wire di `app/share/[id]/page.tsx`, `lib/data/share.ts`, `components/catetind/share-progress-panel.tsx` (tombol **"Share Report"**).
- **Paket C** — `app/api/price/route.ts` + `app/checkout/page.tsx` (`force-dynamic`) + `components/catetind/checkout-screen.tsx`. `lib/data/pricing.ts` menambah `PriceState`/`staticPriceState`/`LIVE_PRICE_NOTE`.
- **Paket E** — Rail pembayaran/reward/feed: `lib/payments/types.ts`, `lib/payments/midtrans.ts`, `lib/payments/referral-reward.ts`; route `app/api/payment/create`, `app/api/payment/webhook`, `app/api/referral/reward`, `app/api/pricing/recent-purchases`. **Semua fail-closed 503 / daftar kosong jujur.**
- **Paket F** — Tab Properti `/wealth`: `lib/money/physical-store.ts`, `components/catetind/wealth-properti.tsx`, `components/catetind/add-physical-asset-sheet.tsx`; `lib/data/wealth.ts` (`PhysicalAsset`, `PHYSICAL_TAB_COPY`, `netWorthParts(+physical)` — `PROPERTY_V1_COPY` DIHAPUS); wire di `wealth-screen.tsx` + `wealth-net-worth-bar.tsx`; `lib/account.ts` ikut `purgePhysicalStore()`.
- **PAKET D — BARU SEBAGIAN (INILAH TUGAS UTAMAMU):**
  - **`lib/demo.ts`** menambah **`SHOWS_SAMPLE_DATA = DEMO_MODE || process.env.NODE_ENV !== 'production'`**.
  - **`lib/money/store.ts`** (dompet+ledger): seed dibungkus `SEED_WALLETS = SHOWS_SAMPLE_DATA ? WALLET_SEED : []` (dipakai di `SERVER_SNAPSHOT` + jalur hidrasi).
  - **`lib/money/physical-store.ts`**: `SEED_ASSETS` bergerbang `SHOWS_SAMPLE_DATA`.
  - **BELUM**: wealth/funds/bills/joint belum bergerbang dan belum baca/tulis Supabase.

### 1.3 Validasi terakhir (hijau, akhir paket 63)
```
pnpm theme:audit          → palet bersih (418 file)
pnpm exec tsc --noEmit    → bersih
pnpm build                → sukses (semua route ter-build)
pnpm test                 → 55 file · 757 test LULUS
```

### 1.4 Jebakan teknis yang SUDAH ditemukan (jangan terulang)
- **Paksa pnpm:** field `packageManager` = `pnpm@12.3.4` (tidak ada). Pakai `pnpm --config.manage-package-manager-versions=false <script>`.
- **Migrasi** butuh `SUPABASE_ACCESS_TOKEN` (Personal Access Token). Set sebagai env (`$env:SUPABASE_ACCESS_TOKEN='…'`). `psql` TIDAK terpasang.
- **Target TS < ES2018:** flag regex `s` (dotAll) **DILARANG**.
- **Penjaga palet:** HANYA hex palet/turunan yang lolos (`scripts/theme/audit-palette.mjs` → `ALLOWED`). `#8a8f93` dilarang → `#767676`.
- **`next/og` `ImageResponse`:** hanya flexbox; elemen berisi anak WAJIB `display:flex`; hindari emoji.
- **TDZ:** `const` seed harus dideklarasikan **SEBELUM** `SERVER_SNAPSHOT`.
- **Kuota Gemini free tier = 5/menit** — sudah dinormalisasi (kegagalan → fallback aturan lokal jujur).

---

## 2. PETA FILE RELEVAN (jangan dibuat ulang yang sudah ada)

**Empat store yang HARUS dipindah ke Supabase (inti Paket D):**
- `lib/money/wealth-store.ts` → `investments`, `asset_transactions`, `debts`, `debt_payments`.
- `lib/money/funds-store.ts` → `goals`, `goal_contributions` (view `goal_savings`).
- `lib/money/bills-store.ts` → `bills`.
- `lib/money/joint-store.ts` → `joint_wallets`, `joint_members`, `joint_transactions`, `invite_codes`.

**Halaman yang MEMBACA store itu (pastikan ikut satu sumber):**
`/app` (`home-screen.tsx`), `/wallet` + `/wallet/[id]`, `/history` (`history-screen.tsx`, `recent-transactions-card.tsx`), `/budget` + `/budget/[id]`, `/bills`, `/calendar` (`cashflow-calendar-screen.tsx`), `/wealth`, `/joint`.

**Pembaca seed di luar store (WAJIB diselidiki & diperbaiki):**
- `app/api/wallets/store.ts` → `seedWallets()` memakai `WALLET_SEED`.
- `lib/data/help.ts` → payload Pusat Bantuan baca konstanta seed.
- `lib/money/export.ts` → "Export Data Saya" baca konstanta seed.
- Konstanta seed: `lib/data/home-money.ts` (`HOME_MONEY_ROWS`), `lib/data/wallet-detail.ts` (`WALLET_DETAIL_TRANSACTIONS`), `lib/data/history.ts` (`HISTORY_TRANSACTIONS`), `lib/data/calendar.ts` (entri mock), `lib/data/budget.ts` (`INITIAL_SINKING_FUNDS`, `INITIAL_BUDGETS`), `lib/data/wealth.ts` (`INITIAL_INVESTMENTS`, `INITIAL_DEBTS`, `INITIAL_DEBT_PAYMENTS`, `INITIAL_ASSET_TRANSACTIONS`), `lib/data/bills.ts` (`INITIAL_BILLS`), seed joint.
- Undangan joint: `lib/invite-store.ts` + RPC `catetind_create_invite`/`catetind_accept_invite`/`catetind_resolve_invite`.

**Test yang mengunci angka seed (WAJIB diperbarui):**
`lib/data/joint.test.ts`, `lib/money/bills-store.test.ts`, `lib/money/wealth-store.test.ts`, `lib/money/funds-store.test.ts`, `lib/money/store.test.ts`, `lib/money/export.test.ts`, `lib/account.test.ts`, test `buildHelpExportPayload`, `lib/money/smoke-money-flow.test.ts`.

---

## 3. SASARAN UTAMA — TUNTASKAN PAKET D

**Sasaran produk (dari pemilik):** aplikasi **tidak lagi menampilkan data contoh sebagai milik user**. `lib/data/*` & `lib/wallets.ts` hanya boleh berisi **copy & konfigurasi statis** (warna, label, kategori, teks). Semua data uang user hidup di **Supabase** sebagai **satu-satunya sumber**. **Semua alur NYAMBUNG** — catat sekali → tampil di semua halaman terkait (Home, Riwayat, Dompet, Budget, Kalender, Wealth, Tagihan, Joint).

### D1 — Gerbang seed paritas (LANGKAH PERTAMA, paling kecil & paling aman)
Ulangi pola `lib/money/store.ts` (`SEED_WALLETS`) di **empat store lain**:
- `lib/money/wealth-store.ts`: bungkus `SERVER_SNAPSHOT` **dan jalur merge** (`mergeWealthState` — `baseOf(..., INITIAL_INVESTMENTS)` dst.) dengan `SEED_INVESTMENTS/SEED_DEBTS/SEED_PAYMENTS = SHOWS_SAMPLE_DATA ? INITIAL_* : []`.
- `lib/money/funds-store.ts`: `SEED_FUNDS` / `SEED_CONTRIBUTIONS`.
- `lib/money/bills-store.ts`: `SEED_BILLS`.
- `lib/money/joint-store.ts`: seed dompet/buku besar bersama.
- `app/api/wallets/store.ts`: `seedWallets()` → kosong saat `!SHOWS_SAMPLE_DATA`.

**Perhatian:** tiap store punya LEBIH DARI SATU referensi seed (`SERVER_SNAPSHOT`, **fallback hidrasi**, dan **filter tombstone**). Ganti di SEMUA jalur. **Deklarasikan `const` seed SEBELUM `SERVER_SNAPSHOT`** (hindari TDZ). Untuk filter tombstone yang membandingkan dengan seed, pikirkan semantiknya saat seed kosong (jangan sampai dompet contoh "lahir lagi").

### D2 — Remote read/write (inti, terbesar) — TIRU `lib/supabase/money-remote.ts`
1. **Mapper** baru (di `lib/supabase/mappers.ts` atau file `*-mappers.ts`): investment/asset_transaction, debt/debt_payment, goal/goal_contribution, bill, joint_wallet/joint_transaction. Bentuk JSON polos siap HTTP (state store sudah begitu).
2. **Layer remote** baru: `lib/supabase/wealth-remote.ts`, `funds-remote.ts`, `bills-remote.ts`, `joint-remote.ts` (lihat yang sudah ada) — fungsi `readRemote*()`, `push*ToServer()`, `deleteRemote*()`. **Semua TIDAK pernah `throw`**; tanpa sesi → `null`/kosong.
3. Di tiap store: saat **ada sesi**, **baca server** sebagai sumber; IndexedDB jadi **cache/antrean offline** (persis pola `store.ts` + `mergeMoneySnapshot`). Tanpa sesi → perilaku lokal tetap jalan.
4. **Idempotensi**: pakai `client_tx_id` + constraint `unique (user_id, client_tx_id)` yang SUDAH ada (mencegah dobel).
5. **RLS menegakkan `user_id = auth.uid()`** — klien/route **TIDAK** menyaring `user_id` sendiri.

**Tabel & view tersedia (JANGAN bikin tabel baru):** `investments`, `asset_transactions`, `debts`, `debt_payments`, `goals`, `goal_contributions`, `bills`, `joint_wallets`, `joint_members`, `joint_transactions`, `joint_transactions_public`, `invite_codes`, `physical_assets`; view `wallet_balances`, `debt_balances`, `goal_savings`, `investment_values`, `user_net_worth`.

> **View `user_net_worth`:** sudah memasukkan kas+investasi+piutang−hutang tetapi **BELUM** `physical_assets`. Kalau mau menyamakan: **JANGAN** `create or replace view` (menambah kolom di tengah mengubah posisi → error). Buat migrasi baru: `drop view if exists public.user_net_worth;` lalu `create view` ulang (+ `physical`) + `grant select on public.user_net_worth to anon, authenticated;`. ATAU biarkan net worth dihitung di lapis app (sudah dilakukan paket F). **Pilih satu, tulis alasannya.**


### D3 — Hapus/gate seed di runtime
- Tidak ada seed yang boleh dirender sebagai milik user. Kalau butuh untuk test → pindahkan ke **fixture test** (`*.test.ts` atau `lib/data/fixtures/*`) yang **tidak** ikut ke UI.
- `lib/data/*` akhirnya hanya berisi **copy & konfigurasi statis**.
- **`help.ts` & `export.ts`:** sekarang membaca konstanta seed → ubah agar membaca **store hidup** (`liveInvestments`, `liveBills`, `liveFunds`, `liveDebts`, snapshot uang) supaya "Export Data Saya" & Pusat Bantuan mengekspor data user yang SEBENARNYA, bukan contoh. Kalau store belum terhidrasi di konteks itu, ambil dari server.

### D4 — Empty state = keadaan NORMAL
- Untuk user baru (login magic link, belum isi apa pun): setiap halaman menampilkan empty state rapi + CTA (arahkan ke `/app/onboarding` / tombol tambah). **Bukan** layar kosong tanpa penjelasan, dan **bukan** data contoh.

### D5 — Fail-loud & jujur
- Kalau koneksi/Supabase gagal: tampilkan **error state yang jelas**. **JANGAN** diam-diam jatuh ke data contoh. Bedakan "tanpa sesi" (boleh lokal) dari "sesi ada tapi gagal" (harus jujur/error).

### D6 — Satu ledger / semua alur nyambung (bukti wajib)
- Catat sekali (mis. pengeluaran di `/app`) → muncul di Home, Riwayat, Dompet terkait, Budget, Kalender. Setor celengan → Home + `/budget`. Bayar hutang → kas (ledger) + `/wealth` + `user_net_worth`. Tambah tagihan → `/bills` + Home. Transaksi joint → `/joint` + settlement. Aset fisik → Net Worth.
- Sertakan bukti (screenshot/manual) di laporan.

### D7 — Perbarui test
- Semua test yang mengunci angka seed ikut sumber baru; `pnpm test` tetap hijau. Tambah test baru: (a) gate seed (produksi kosong), (b) mapper remote, (c) merge server+lokal, (d) export/help membaca store hidup.

---

## 4. VERIFIKASI ULANG PAKET 63 (yang belum sempat dicek di browser)

Paket 63 hanya divalidasi lewat build+test. Lakukan cek manual singkat & catat apa adanya:
- `/checkout` menampilkan harga & catatan `LIVE_PRICE_NOTE.static`; `GET /api/price` → `isDynamic:false`.
- `/share/rina-sep` → tab Network memuat `…/opengraph-image` & `…/api/share/rina-sep/image` (200, PNG).
- Panel rekap mingguan → tombol **"Share Report"** (Web Share `files` bila didukung; kalau tidak → unduh).
- Widget AI (`/app`) → kirim pesan; **sukses** = balasan model tanpa label "belum pakai model"; **gagal/kuota** = balasan lokal berlabel + banner status.
- Scan struk & input suara → kartu konfirmasi (atau problem state jujur bila provider mati).
- `/wealth` tab **Properti** → Tambah/Edit/Hapus aset fisik; pastikan **Total Kekayaan naik** sejumlah nilai aset.
- Pastikan **tidak ada** tautan mati / toast "segera hadir".
- 375px (tanpa horizontal scroll; bottom nav tidak menutupi konten) & 1440px (sidebar desktop tidak hilang).


---

## 5. LARANGAN & BATASAN (jangan dilanggar)

- **JANGAN** menyentuh/menghidupkan apa pun yang butuh **Midtrans** (pembayaran, `user_subscriptions`, `purchases`, `pricing_state`, reward otomatis, Live Purchase Feed real). Biarkan **fail-closed 503 / daftar kosong jujur**.
- **JANGAN** membuat **waitlist** atau turunannya (posisi antrian, referral waitlist, State XIV). Dilarang menambah route/komponen/copy antrian.
- **JANGAN** membuat **route halaman baru**; semua pekerjaan menyentuh bagian dalam halaman yang sudah ada. Admin Dashboard DI LUAR SCOPE.
- **JANGAN** menulis `GEMINI_API_KEY`/`MIDTRANS_SERVER_KEY`/service-role/PAT ke kode/komentar/test (hanya `.env.local`; `.env.example` hanya **nama** variabel).
- **JANGAN** mengubah keputusan bisnis (angka harga di `lib/data/pricing.ts`) tanpa persetujuan.
- **JANGAN** menampilkan seed/dummy sebagai milik user (inti D).
- Semua copy user-facing **Bahasa Indonesia** di `lib/data/*` (nol string di JSX). Warna HANYA token palet. Hormati `prefers-reduced-motion` & a11y (aria-label, fokus terlihat, kontras ≥ 4.5:1).

---

## 6. VALIDASI & LAPORAN

Sebelum melapor SELESAI, jalankan dan tempel hasilnya apa adanya:
```
pnpm theme:audit
pnpm exec tsc --noEmit
pnpm build
pnpm test
```
Tambahan Supabase (bila menjalankan migrasi):
```
$env:SUPABASE_ACCESS_TOKEN='<PAT>'; pnpm --config.manage-package-manager-versions=false supabase:migrate
node scripts/supabase/verify-rls.mjs
```

**Laporan akhir WAJIB memuat:**
- Status tiap sub-paket D1–D7 (selesai/tidak) + paket 63 yang sudah selesai (diverifikasi ulang).
- File dibuat/diubah.
- Keputusan + alasan (mis. pilihan soal `user_net_worth`, sumber `help/export`).
- Hasil 4 perintah validasi apa adanya (termasuk yang gagal).
- Yang **BELUM** bisa diverifikasi (jujur) — terutama yang butuh Midtrans/perangkat sungguhan.
- Perbarui `docs/STATUS-HALAMAN.md` §13 (tandai Paket D selesai; sisakan eksplisit yang menunggu Midtrans).

---

## 7. LAMPIRAN — ENV & PERINTAH

**Env di `.env.local` (server-only kecuali `NEXT_PUBLIC_*`):**
```
NEXT_PUBLIC_SUPABASE_URL=https://wmswtoyikvgzcvbgdceo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sb_publishable_…>
GEMINI_API_KEY=<sudah terisi>
GEMINI_MODEL_TEXT=            # opsional, default gemini-2.5-flash
GEMINI_MODEL_VISION=          # opsional, default gemini-2.5-flash
MIDTRANS_SERVER_KEY=          # KOSONG — jangan diisi (menunggu Midtrans)
```
`SUPABASE_ACCESS_TOKEN` (PAT) hanya untuk menjalankan migrasi; set sebagai env, jangan di-commit.

**Perintah penting:**
```
pnpm --config.manage-package-manager-versions=false dev
pnpm --config.manage-package-manager-versions=false test
pnpm --config.manage-package-manager-versions=false build
pnpm --config.manage-package-manager-versions=false theme:audit
pnpm exec tsc --noEmit
```

---

## 8. DEFINITION OF DONE (paket 64)

1. `lib/data/*` & `lib/wallets.ts` **hanya** berisi copy/konfigurasi statis (tidak ada data uang user).
2. Login (Supabase Auth) → semua modul (dompet, ledger, kekayaan, hutang, celengan, tagihan, kalender, joint, aset fisik) membaca & menulis **Supabase** sebagai satu sumber; catat sekali tampil di semua halaman terkait.
3. Tanpa sesi / user baru → **empty state** rapi + CTA (bukan seed).
4. `pnpm theme:audit` bersih · `tsc` bersih · `pnpm build` sukses · `pnpm test` hijau.
5. Midtrans & waitlist tetap **tidak disentuh**; semua titiknya fail-closed jujur.
6. `docs/STATUS-HALAMAN.md` §13 diperbarui apa adanya.

