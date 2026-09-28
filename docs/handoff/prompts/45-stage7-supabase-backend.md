# 45 — Stage 7 · Backend Nyata: Supabase (Auth + RLS + Ledger di Server)

**Paket:** audit fintech lanjutan · **Depends on:** #44 (UI/input sudah jujur) · **Butuh dependency baru:** `@supabase/supabase-js` + `@supabase/ssr` (izin diberikan di paket ini)

> Baca `docs/handoff/CONTEXT-WAJIB.md` (termasuk §10), `FIXPLAN-AUDIT.md` Stage 4–5, lalu struktur store: `lib/money/{store,ledger,idb}.ts`, `lib/session.ts`, `app/api/**`.

## Fakta project Supabase (SUDAH saya verifikasi 27 Sep 2026 — pakai ini, jangan tanya lagi)

| Item | Nilai |
|---|---|
| Project URL | `https://wmswtoyikvgzcvbgdceo.supabase.co` |
| Publishable / anon key | `sb_publishable_R0epf8wzYiSHr7r0psSryQ_r5ReS5Iw` |
| Project ref | `wmswtoyikvgzcvbgdceo` |
| Status schema | `GET /rest/v1/catetind_probe` → **`PGRST205` / 404 "Could not find the table"** = key VALID, project hidup, **`public` masih KOSONG** (belum ada tabel/RLS) |
| Auth provider | `email: true`, `disable_signup: false`, **`mailer_autoconfirm: false`** (konfirmasi email WAJIB), `anonymous_users: false`, `passkeys_enabled: false` |

Artinya: **(a)** semua tabel + RLS harus dibikin dari nol; **(b)** magic link/OTP email jalan, tapi user harus mengonfirmasi lewat inbox — UI "Cek email" yang sudah ada (`verify-email-screen.tsx`) dipakai apa adanya; **(c)** `mailer_autoconfirm: false` berarti signup pertama harus menyelesaikan konfirmasi sebelum sesi penuh.

**Env yang harus dipakai** (`.env.local` sudah gitignored — jangan pernah hardcode di kode):
```
NEXT_PUBLIC_SUPABASE_URL=https://wmswtoyikvgzcvbgdceo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_R0epf8wzYiSHr7r0psSryQ_r5ReS5Iw
```
Kunci publishable memang boleh ada di klien (aman *hanya karena* RLS ditegakkan). **Dilarang** menaruh `service_role`/`sb_secret_*` di kode klien, di repo, atau di `NEXT_PUBLIC_*`.

## Skema minimum (tulis sebagai migrasi SQL di `supabase/migrations/`, idempotent)

Aturan uang dari Stage 4 **tetap berlaku di server**: `saldo = opening + Σ baris` — jangan pernah menaruh kolom `balance` yang bisa ditulis langsung.

| Tabel | Kolom inti |
|---|---|
| `profiles` | `user_id` pk → `auth.users`, `nickname`, `created_at` |
| `wallets` | id, user_id, name, holder, number, network, kind, type, context, **opening bigint**, art, color, face, band_class, face_class, glow_class |
| `ledger_rows` | id, user_id, wallet_id, `type` enum(`expense`,`income`,`transfer`,`settlement`,`balance_adjustment`,`debt_payment`,`receivable_payment`,`change`,`refund`), amount bigint, date, note, category, counter_wallet_id, `client_tx_id` text, joint_wallet_id null, paid_by_user_id null, created_at · **unique(user_id, client_tx_id)** |
| `debts` | id, user_id, direction(`owed_by_me`/`owed_to_me`), type, counterparty, provider, principal, remaining, monthly_installment, tenor, interest, due_date, status |
| `debt_payments` | id, user_id, debt_id, amount, paid_at, wallet_id, kind, cash_moved, change_amount, client_tx_id |
| `investments` + `asset_transactions` | aset & riwayat harga/transaksi (pola yang sudah ada di `lib/data/wealth.ts`) |
| `goals` + `goal_contributions` | celengan & setorannya |
| `bills` | tagihan rutin |
| `joint_wallets` + `joint_members` + `joint_transactions` | dompet bersama: `paid_by_user_id` (kantong) **terpisah** dari `created_by_user_id`; `split_type`, `split_percents jsonb`, `split_amounts jsonb`, `bearer_id`, `is_private`, `private_for_user`, `is_settlement`, `month_key`, `client_tx_id` |
| `invite_codes` | code pk, joint_wallet_id, created_by, created_at, **expires_at**, used_by |
| `push_subscriptions` | endpoint pk, user_id, subscription jsonb |
| `ai_usage` | user_id, month_key, activity, calls_used, addon_tokens_remaining, purchased_tokens |
| `user_settings` | user_id pk, masked bool, onboarding jsonb, monthly_targets jsonb, privacy jsonb |

Wajib juga:
1. **RLS aktif di SEMUA tabel** + policy `user_id = auth.uid()` untuk `select/insert/update/delete` (`with check` untuk tulis).
2. **Tabel joint**: policy keanggotaan lewat `joint_members` (bukan lewat `user_id`), plus: hanya owner yang boleh melihat isi privat → sediakan **view** `joint_transactions_public` yang mengembalikan `description`/`category` sebagai "Transaksi privat" untuk baris `private_for_user = auth.uid()` ≠ pemilik. Nominal tetap terlihat karena memang dipakai settlement (`PRIVATE_EXPENSE_POLICY='shared'` di `lib/data/joint-ledger.ts`) — tulis batas ini apa adanya di laporan, jangan klaim zero-access.
3. **View turunan**: `wallet_balances` (`opening + Σ ledger_rows`) dan `user_net_worth` (kas + investasi + piutang − hutang) — satu definisi di server, dipakai klien.
4. **Index**: `user_id` di semua tabel, `(user_id, date)` di `ledger_rows`, `(joint_wallet_id, date)` di `joint_transactions`.
5. **Realtime**: aktifkan publication untuk `joint_transactions` (ganti mock `REALTIME_ARRIVAL` di `lib/data/joint.ts` dengan langganan nyata + `removeChannel` saat tab hidden — pola sudah ada di komentar PRD).

## Yang harus diubah di aplikasi (jangan bikin jalur data kedua)

1. **Auth nyata.** `lib/session.ts` (mock) → sesi Supabase: klien `@supabase/ssr` (cookie httpOnly) + `signInWithOtp` dari `/login` (magic link & kode OTP), callback di `/login/verify`, `signOut` di panel Keluar. `requireUser()` **tetap dipertahankan sebagai API** (semua route `app/api/**` sudah memakainya) — isinya diganti pembacaan sesi Supabase, supaya tidak ada route yang perlu ditulis ulang.
2. **Store uang pindah ke server.** `lib/money/store.ts` membaca `wallets`, `ledger_rows`, `wallet_balances` dari Supabase saat login; tulis lewat `insert` dengan `client_tx_id` (idempotensi jadi **unique constraint di DB**, bukan cuma di memori). IndexedDB (`lib/money/idb.ts`) turun peran menjadi **cache offline + antrean** (`syncedIds` sudah ada, `flushPendingSync()` jadi pengirim nyata).
3. **Migrasi data lokal sekali jalan.** Saat login pertama: impor baris IndexedDB + penanda `catet-ind-onboarding`, target bulanan, dan pengaturan privasi ke tabel server (idempotent lewat `client_tx_id`); setelah sukses tandai selesai agar tidak dobel.
4. **Utang/piutang, aset, celengan, tagihan, kuota AI, push, kode undangan** → tabel masing-masing (pergerakan KAS tetap lewat `ledger_rows` sesuai Stage 4B: bayar utang = baris `debt_payment` yang mendebit dompet).
5. **Hapus akun** (Stage 6) jadi nyata: hapus baris milik user di server (RPC `security definer`), lalu bersihkan IndexedDB/localStorage seperti sekarang.
6. **`app/api/wallets/**`**: pilih SATU arah — hapus (UI langsung ke Supabase + RLS) atau jadikan proxy server. Jangan tinggalkan dua sumber yang bisa berbeda.

## Acceptance criteria (harus dibuktikan, bukan diklaim)

- [ ] **Migrasi jalan**: tabel + RLS ada; `curl` REST dengan anon key **tanpa login → 0 baris/401** (buktikan 3 tabel).
- [ ] **Isolasi antar user**: dengan dua akun (A & B) — A tidak bisa `select`/`insert`/`update`/`delete` satu pun baris B; tempel query + hasilnya.
- [ ] **Login nyata**: magic link/OTP dari email Supabase → sesi aktif, refresh tetap login, logout memutus sesi. (Catat: `mailer_autoconfirm:false` → user harus konfirmasi email; jelaskan langkahnya.)
- [ ] **Catat transaksi = baris di server**: bukti dari Table Editor/REST + **buka di browser lain (profil/device kedua) → data yang sama tampil**.
- [ ] **Offline→online**: catat 2 transaksi saat offline → online → 2 baris terkirim sekali (tidak dobel) — bukti `client_tx_id` unik di DB.
- [ ] **Saldo tetap turunan**: `wallet_balances` = `opening + Σ ledger_rows`; tidak ada kolom `balance` yang bisa ditulis bebas (buktikan dengan grep skema).
- [ ] **Joint**: 2 akun dalam satu `joint_wallets` → transaksi partner masuk **realtime**; akun ketiga **ditolak** RLS. Split 60/40 tetap menghasilkan angka yang sama dengan `lib/data/joint.test.ts` (Jon transfer Rp 25.000 / Rp 250.000).
- [ ] **Rahasia tidak bocor**: grep repo untuk `service_role`/`sb_secret` = 0 hasil.
- [ ] **270 test tetap hijau** + test baru untuk mapper row↔domain (`snake_case` ↔ camelCase) dan guard RLS di level kode; `pnpm test` · `pnpm exec tsc --noEmit` · `pnpm build` · `pnpm theme:audit` hijau.

## Dilarang

- Menaruh kunci `service_role`/secret di klien, repo, atau `NEXT_PUBLIC_*`.
- Mematikan RLS "supaya gampang" atau mempercayai `user_id` dari body request.
- Menghapus jalur offline/antrean (Stage 5) atau menurunkan integritas Stage 4 (saldo ditulis langsung).
- Mengklaim "zero-access privacy" tanpa bukti RLS + view masking pada tabel joint.
- Migrasi destruktif (`drop table`) terhadap data yang sudah ada tanpa backup.

## Validasi

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm build
pnpm theme:audit
```
Plus bukti server: tempel (a) nama migrasi + jumlah tabel & policy, (b) hasil `curl` REST tanpa login, (c) hasil query dua akun untuk isolasi, (d) potongan bukti `client_tx_id` unik setelah uji offline.

Laporan wajib memuat: daftar tabel + policy RLS, peran IndexedDB setelah migrasi, cara migrasi data lokal, apa yang masih mock (mis. provider AI), dan batas jujur (mis. nominal transaksi privat tetap terlihat di joint karena dipakai settlement).
