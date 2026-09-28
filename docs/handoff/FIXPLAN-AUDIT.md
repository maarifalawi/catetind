# FIXPLAN AUDIT FINTECH — CatetInd

Dokumen kerja untuk membereskan temuan audit. Urutannya sengaja begini: **integritas uang dulu**, keamanan kedua, baru fitur/UX. Jangan ada fitur baru sebelum Stage 2 kelar.

Perintah verifikasi (wajib hijau sebelum lanjut stage):
```bash
pnpm test          # vitest: logika uang + regresi audit
npx tsc --noEmit   # typecheck
pnpm build         # build produksi
```
Catatan lokal: pnpm di mesin ini 9.12.0 sedangkan `package.json` menulis `packageManager: pnpm@12.3.4`, jadi perintah pnpm perlu
`--config.manage-package-manager-versions=false` (dan `-w` untuk `pnpm add`). Kalau versi pnpm diseragamkan, flag itu bisa dibuang.

---

## ✅ Stage 1 — Mesin uang (SELESAI)

| # | Yang dikerjakan | Bukti |
|---|---|---|
| 1 | Modul ledger baru `lib/data/joint-ledger.ts`: `SplitSpec` (discriminated union, persen & rupiah TIDAK bisa tertukar), `sharesOf`, `allocateMoney` (Largest Remainder), `ledgerTotals` (net = bayar − kewajiban), `withinMonth` | 11 test di `lib/data/joint-ledger.test.ts` |
| 2 | `computeSettlement` tidak lagi menebak dari "siapa bayar lebih banyak": arah & nominal transfer dibaca dari **net**. `settlementAmount` = satu transfer penuh (dulu setengah selisih) | 12 test di `lib/data/joint.test.ts` |
| 3 | Traktiran dideteksi dari **porsi 0** → traktiran lewat mode "Nominal Custom" tidak lagi ikut ditimbang | test *"traktiran lewat mode Nominal Custom"* |
| 4 | `paidByUserId` (kantong yang keluar uang) terpisah dari `userId` (pembuat catatan) + `pocketOf()` dipakai `paidBy`/`weighedPaidBy` | test *"catatan Dany yang ditulis Jon tetap milik Dany"* |
| 5 | Settlement disaring per bulan (`month` / `JOINT_MONTH_KEY`) — tidak lagi kumulatif selamanya | test *"transaksi bulan lain tidak menekan timbangan"* |
| 6 | Infrastruktur test pertama di repo (Vitest 5 + `vitest.config.mts` + script `test`) | **23 test hijau**, `tsc` bersih, `pnpm build` hijau |
| 7 | Bug id API diperbaiki: `` id: `${body.kind}-${Date.now()}` `` (di-escape → id konstan untuk semua dompet) + validasi saldo | `app/api/wallets/route.ts` |

**Angka yang berubah (wajib diumumkan ke tim desain):** pada data seed, timbangan kini bilang **Jon transfer Rp 25.000 ke Dany** — bukan "Dany transfer Rp 10.000 ke Jon". Setelah transaksi partner (Rp 450.000) masuk, nominal transfer = **Rp 250.000** (dulu 215.000).

---

## 🔜 Stage 2 — UI mengikuti uang yang benar (1–2 hari)

1. **Panci timbangan & modal rekap menampilkan NET**, bukan "patungan" (nominal bisa negatif → tampilkan sebagai `±Rp X · berhak menerima / harus transfer`). File: `joint-balance-scale.tsx`, `joint-settlement-modal.tsx`, `joint-recap-banners.tsx`.
2. **`JointSplitDraft` disimpan sebagai `SplitSpec`** (bukan `splits: Record<string, number>`), sehingga ambiguitas persen/rupiah hilang di UI juga. File: `joint-split-sheet.tsx`, `joint-screen.tsx`, `joint-add-sheet.tsx`.
3. **Pemilih "Siapa yang nalangin?"** di form tambah (chips 2 tap, default "Aku") → isi `paidByUserId`. Ini menutup cacat atribusi (sekarang masih selalu pencatat).
4. **Pindahkan `extraFields` (split & privasi) ke ATAS tombol "Catat"** di `transaction-input-engine.tsx:747`; larang dua `Drawer.Root` hidup bersamaan (tutup sheet add saat sheet split dibuka).
5. **Settle jadi entri ledger**: tombol "Tandai Sudah Settle" menulis transaksi `settlement {from, to, amount, method}`; penanda settle per `monthKey` disimpan (bukan `useState`), lalu dibawa sebagai opening balance bulan berikutnya.
6. Perbaiki dua konstanta kuota AI yang harus disinkron manual (`AI_QUOTA_RESET_DATE` + `AI_QUOTA_RESET_DAYS`) → turunkan satu dari yang lain.

**DoD:** split 60/40 mengubah angka di layar; form joint ≤ 3 tap dari FAB untuk mengubah pembagian; settle tidak muncul lagi setelah refresh.

---

## 🔜 Stage 3 — Keamanan & sesi (butuh keputusan backend)

1. **Pilih backend** (Supabase sesuai PRD, atau lokal-only IndexedDB). Tanpa ini, poin 2–5 cuma tambal sulam.
2. **Sesi + otorisasi di SEMUA `app/api/**`** (sekarang nol pemeriksaan): `401` tanpa sesi, semua mutasi ter-scope `userId`.
3. **Push per-user**: `Map<userId, PushSubscription[]>` + rate limit `/api/push/send` (sekarang siapa pun bisa menyiarkan notifikasi ke seluruh pengguna).
4. **Kode undangan per wallet** (nanoid 6, single-use, kedaluwarsa 24 jam). Sekarang `INVITE_CODE` konstanta global `A7K2M9` yang ikut ter-bundle.
5. **PIN/biometrik jadi gate nyata** atau cabut klaimnya: lock screen di root, auto-lock `visibilitychange`/idle, flow "lupa PIN", anti brute-force.
6. Rotasi pasangan kunci VAPID + pindahkan ke secret manager.

---

## 🔜 Stage 4 — Satu ledger kas (menyambung semua fitur uang)

1. Hapus `INITIAL_WALLETS`; satu store (`INITIAL_WALLET_ACCOUNTS`) → Home, `/wallet`, `/wallet/[id]`, Net Worth membaca angka yang sama.
2. Semua pergerakan uang jadi baris ledger (`expense|income|transfer|settlement|balance_adjustment|debt_payment|receivable_payment|refund`); `balance(wallet) = opening + Σ rows`.
3. **Bayar utang mendebit dompet sumber** (sekarang Net Worth naik Rp 500.000 setiap kali user melunasi utang) dan **piutang masuk sisi Aset**.
4. "Koreksi Otomatis" benar-benar menulis pengeluaran tak tercatat — atau copy-nya diubah (sekarang toast menjanjikan pencatatan yang tidak terjadi).
5. Operasi hapus jadi benar: store punya `remove`, `transaction-bus.ts` tidak lagi append-only (sekarang catatan yang dihapus hidup lagi di Riwayat).
6. Tentukan **kebijakan privasi** (lihat "Keputusan" di bawah) + tutup kebocoran nominal privat di breakdown kategori.

---

## ✅ Stage 5 — Anti-friksi & offline (SELESAI — paket 42)

| # | Yang dikerjakan | Bukti |
|---|---|---|
| 1 | **Idempotency**: kunci submit sinkron (`ref`, bukan state) + `clientTxId` per pembukaan panel → store menolak baris kembar (kembalikan baris pertama), invariant ledger ikut menjaga | 4 test `lib/money/store.test.ts` (*"DUA submit beruntun = SATU catatan"*, *"baris kembar ditolak juga di lapis ledger"*) |
| 2 | **Input nominal manusiawi** `lib/money/amount-input.ts`: `1,5jt` → 1.500.000, `50rb`/`50k` → 50.000, batas 13 digit, chip konfirmasi, pesan jelas untuk input tak terbaca | 15 test `lib/money/amount-input.test.ts` |
| 3 | **Offline**: `public/sw.js` dapat handler `fetch` (network-only `/api/**`, network-first dokumen + fallback shell, SWR aset ber-hash, versi cache) · `lib/connection.ts` + `lib/offline-queue` di store (`syncedIds`, `pendingSyncCount`, `flushPendingSync`) · banner `components/catetind/offline-banner.tsx` | 3 test antrean offline di `lib/money/store.test.ts`; build hijau |
| 4 | **Metering AI nyata**: satu usage-store (`lib/ai-usage-store.ts`), 4 gauge membaca `useAiQuota()` (sidebar, Billing, banner Home, header AI Coach), state `exhausted` mematikan voice/OCR + penjelasan (catat manual tetap jalan) | 10 test `lib/ai-usage-store.test.ts`; angka 3× chat: 464.020 → 467.020 terpakai (137.480 → 134.480 sisa) |
| 5 | **Env-gate saklar demo**: satu gerbang `lib/demo.ts` (`NEXT_PUBLIC_DEMO=1`) untuk `DEMO_PARTNER_JOINED`, `DEMO_FORCE_*_RECAP`, `DEMO_REALTIME_MOCK`, nudge harian, recap mingguan, `DEMO_SHOW_UPGRADE_DIFF`, `DEMO_DAY_OVERRIDE` | `lib/demo.test.ts` (mode produksi & mode review), grep: hanya SATU file membaca env-nya |

**Catatan batas jujur (ditulis juga di kode):** tanpa backend, "tersinkron" = sudah tersimpan di IndexedDB perangkat ini; `flushPendingSync()` tidak mengirim apa pun ke jaringan. Pemakaian AI hidup di memory sesi (refresh = kembali ke titik berangkat demo).

---

## 🔜 Stage 6 — Kepatuhan & operasional

Export JSON nyata (sekarang TODO + toast), penghapusan akun + kebijakan retensi, error boundary per segmen, event analytics untuk aksi kritikal uang, dan test E2E tipis (Playwright) untuk tiga jalur uang utama.

---

## ✅ Stage 7 — Backend nyata: Supabase (SELESAI — paket 45)

Ringkas: tabel + RLS + view turunan ada di project `wmswtoyikvgzcvbgdceo`, sesi
memakai Supabase Auth (magic link/OTP), store uang membaca/menulis server, dan
kunci idempotensi (`client_tx_id`) ditegakkan `unique` di database. Laporan
lengkap + bukti `curl` ada di `docs/handoff/laporan/45-stage7-supabase-backend-laporan.md`.

| # | Yang dikerjakan | Bukti |
|---|---|---|
| 1 | 4 migrasi idempotent: 16 tabel, 10 view turunan, 67 policy RLS, 3 RPC + 2 inviter + 1 meter AI | `supabase/migrations/*.sql` · `curl` tanpa login → 0 baris/401 · `pnpm supabase:verify` |
| 2 | Sesi = Supabase Auth. Cookie `sb-<ref>-auth-token` (bukan lagi `catet-ind-session` mock), `requireUser()` tetap API yang sama + `token` pemanggil | 2 akun uji: select/patch/delete lintas-user = 0 baris, insert palsu = 403 |
| 3 | Store uang pindah ke server: baca `wallets`+`ledger_rows`+`wallet_balances`, tulis lewat insert `client_tx_id`; IndexedDB jadi cache + antrean; `flushPendingSync()` benar-benar mengirim | 2 perangkat (sesi berbeda) melihat baris + saldo yang sama |
| 4 | Migrasi data lokal sekali jalan (`local-migration.ts`): dompet, baris, penanda onboarding, target bulanan, privasi → server (idempotent) | `catet-ind-migrated-v1:<userId>` + `unique (user_id, client_tx_id)` |
| 5 | `app/api/wallets/**` dipilih jadi **proxy** (bukan sumber kedua) + `app/api/push/**` pindah ke tabel `push_subscriptions` | test route 401/isolasi tetap hijau, store async |
| 6 | Hapus akun nyata (RPC `security definer` → `auth.users` ikut terhapus) | RPC mengembalikan jumlah baris per tabel sebagai bukti |

**Masih mock / batas jujur:** provider AI (DeepSeek) belum ada — yang nyata cuma
METER pemakaiannya; layar Kekayaan/Utang, Celengan, dan Tagihan masih membaca
konstanta `lib/data/*` (tabelnya ada + RLS, tapi UI-nya belum pindah); rate limit
push masih per-instance; layar /joint masih memakai id dompet kanon (`joint-1`)
sehingga realtime belum menerima baris sampai /joint membaca `joint_wallets`.

---


1. **Privasi transaksi di dompet bersama** — (a) privat = dikeluarkan dari kewajiban bersama, atau (b) privat = biaya bersama dan nominalnya **wajib terlihat** oleh pasangan. Sekarang sistem memilih diam-diam: nominal ikut ditimbang, tapi pasangan diminta tidak tahu. Taruh keputusan ini sebagai satu konstanta kebijakan di `joint-ledger.ts` supaya dua-duanya bisa diuji.
2. **Backend**: Supabase (sesuai PRD) atau lokal-only dulu (IndexedDB) — menentukan Stage 3 & 4.
3. **Ambang settle** tetap Rp 100.000? Sejak Stage 1 ambangnya dibandingkan dengan **nominal transfer** (dulu setengah selisih), jadi artinya bergeser.

