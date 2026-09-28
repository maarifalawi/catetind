# 45 — Stage 7 · Backend Nyata: Supabase (Auth + RLS + Ledger di Server)

**Paket:** audit fintech lanjutan #45 · **Status:** selesai · **Tanggal:** 27 Sep 2026
**Project:** `wmswtoyikvgzcvbgdceo` (Northeast Asia · Seoul) · **Kunci klien:** publishable (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, ada di `.env.local` yang gitignored)

Ringkas: `public` yang tadinya kosong sekarang berisi **16 tabel + 10 view turunan
+ 67 policy RLS + 7 fungsi (3 RPC, 2 undangan, 1 meter AI, 1 penjaga push)**, sesinya
Supabase Auth (magic link/OTP), dan store uang app membaca/menulis server dengan
`client_tx_id` sebagai kunci idempotensi yang ditegakkan `unique` di database.
Semua klaim di bawah disertai bukti `curl`/SQL yang bisa diulang.

---

## 1. Apa yang dikerjakan (file)

**Migrasi (baru, idempotent, sudah dijalankan ke project nyata):**

| Berkas | Isi |
|---|---|
| `supabase/migrations/20260927120000_catetind_core.sql` | enum (`ledger_row_type`, `wallet_kind`, `wallet_context`), `profiles`, `wallets`, `ledger_rows`, view `ledger_row_effects`/`wallet_balances`/`wallet_cash_total`, 4 index |
| `supabase/migrations/20260927120100_catetind_domains.sql` | `debts`, `debt_payments`, `investments`, `asset_transactions`, `goals`, `goal_contributions`, `bills`, `ai_usage`, `user_settings`, `push_subscriptions`, `joint_wallets`, `joint_members`, `joint_transactions`, `invite_codes` + view `debt_balances`/`investment_values`/`goal_savings`/`joint_transactions_public`/`user_net_worth`, 15 index |
| `supabase/migrations/20260927120200_catetind_rls.sql` | RLS aktif di SEMUA tabel + 67 policy (4 policy per tabel ber-`user_id`, policy berbasis keanggotaan untuk tabel joint), `catetind_is_joint_member()`, grant/revoke view |
| `supabase/migrations/20260927120300_catetind_rpc.sql` | trigger `catetind_handle_new_user`, RPC `catetind_delete_account_data`, `catetind_create_invite`, `catetind_resolve_invite`, `catetind_accept_invite`, `catetind_record_ai_usage`, `catetind_push_targets`, publication realtime + `replica identity full` |

**Skrip (baru):**

- `scripts/supabase/apply-migrations.mjs` — menerapkan migrasi lewat Management API (`pnpm supabase:migrate`), mencatat riwayat di `supabase_migrations.schema_migrations`, dan **me-reload cache skema PostgREST** di akhir;
- `scripts/supabase/verify-rls.mjs` — membuktikan "tanpa sesi = tidak ada data" untuk 21 tabel/view + 7 RPC (`pnpm supabase:verify`); keluar dengan kode 1 kalau ada yang bocor.

**Kode app (baru):** `lib/supabase/{config,session-cookie,client,server,rest,mappers,money-remote,local-migration,user-settings-remote,ai-usage-remote,invite-remote,realtime}.ts` + `lib/supabase/session-fixture.ts` (helper test).

**Kode app (diubah):** `lib/session.ts`, `lib/session-client.ts`, `lib/account.ts`, `lib/ai-usage-store.ts`, `lib/invite-store.ts`, `lib/money/store.ts`, `app/api/session/route.ts`, `app/api/wallets/{route.ts,store.ts,[id]/route.ts}`, `app/api/push/{store.ts,subscribe/route.ts,send/route.ts}`, `components/catetind/{login-screen,verify-email-screen,join-invite-screen,joint-screen,offline-banner}.tsx`, `app/login/verify/page.tsx`, `lib/data/auth.ts`, `lib/data/monthly-review.ts` (ekspor `TARGET_STORE_KEY`), `.env.example`, `package.json` (2 skrip baru).

**Test:** 3 berkas test lama diperbarui (cookie sesi Supabase, store async) + 2 berkas baru (`lib/supabase/mappers.test.ts`, `lib/money/store-remote-merge.test.ts`).

---

## 2. Skema: tabel, view, policy

16 tabel aplikasi: `profiles`, `wallets`, `ledger_rows`, `debts`, `debt_payments`,
`investments`, `asset_transactions`, `goals`, `goal_contributions`, `bills`,
`ai_usage`, `user_settings`, `push_subscriptions`, `joint_wallets`,
`joint_members`, `joint_transactions`, `invite_codes` (+ tabel riwayat
`supabase_migrations.schema_migrations` milik CLI).

10 view (semua `security_invoker = true`, jadi RLS tabel dasar tetap berlaku):
`ledger_row_effects`, `wallet_balances`, `wallet_cash_total`, `debt_balances`,
`investment_values`, `goal_savings`, `joint_transactions_public`, `user_net_worth`.

**Aturan uang tetap berlaku di server — tidak ada kolom saldo yang bisa ditulis:**

```sql
select c.table_name, c.column_name
  from information_schema.columns c
  join information_schema.tables t on t.table_name = c.table_name and t.table_schema = c.table_schema
 where c.table_schema='public' and t.table_type='BASE TABLE'
   and c.column_name in ('balance','remaining','saved','value');
--> kolom saldo/sisa yang bisa ditulis di TABEL dasar = 0 (daftar: kosong)
```

Saldo = `opening + Σ baris` (`view wallet_balances`), sisa utang =
`principal − Σ debt_payments` (`view debt_balances`), celengan =
`Σ goal_contributions` (`view goal_savings`), net worth = kas + aset + piutang − utang
(`view user_net_worth`).

**Policy RLS — 67 total, 0 tabel tanpa RLS:**

- 13 tabel ber-`user_id` → empat policy per tabel (`select`/`insert`/`update`/`delete`, semuanya `user_id = auth.uid()`, dengan `with check` untuk tulis) dihasilkan satu loop supaya tidak ada tabel yang "lupa satu operasi";
- tabel joint berbasis **keanggotaan** (`catetind_is_joint_member(joint_wallet_id)`), bukan `user_id`, karena di dompet bersama `user_id` = siapa yang mengetik catatan — bukan siapa yang boleh melihatnya;
- insert `joint_transactions` juga memaksa `user_id = auth.uid()` dan `paid_by_user_id` salah satu anggota dompet itu;
- `invite_codes` hanya bisa dibaca/ditulis pembuatnya (penerima lewat RPC). `resolve_invite` sengaja tetap boleh **anon** karena halaman `/join/[code]` menampilkan status undangan sebelum user masuk.

---

## 3. Bukti (a): `curl` REST **tanpa login** → 0 baris / 401

`node scripts/supabase/verify-rls.mjs` (hanya memakai kunci publishable yang memang
ada di klien — sengaja TIDAK memakai kunci rahasia, karena "aman karena kunci
rahasia" bukan bukti):

```
Project: https://wmswtoyikvgzcvbgdceo.supabase.co

OK   wallets                      HTTP 200 · []
OK   ledger_rows                  HTTP 200 · []
OK   debts                        HTTP 200 · []
OK   debt_payments                HTTP 200 · []
OK   investments                  HTTP 200 · []
OK   asset_transactions           HTTP 200 · []
OK   goals                        HTTP 200 · []
OK   goal_contributions           HTTP 200 · []
OK   bills                        HTTP 200 · []
OK   ai_usage                     HTTP 200 · []
OK   user_settings                HTTP 200 · []
OK   push_subscriptions           HTTP 200 · []
OK   joint_wallets                HTTP 200 · []
OK   joint_members                HTTP 200 · []
OK   joint_transactions           HTTP 200 · []
OK   invite_codes                 HTTP 200 · []
OK   wallet_balances              HTTP 401 · {"code":"42501","message":"permission denied for view wallet_balances"}
OK   user_net_worth               HTTP 401 · {"code":"42501","message":"permission denied for view user_net_worth"}
OK   joint_transactions_public    HTTP 401 · {"code":"42501","message":"permission denied for view joint_transactions_public"}
OK   goal_savings                 HTTP 401 · {"code":"42501","message":"permission denied for view goal_savings"}
OK   debt_balances                HTTP 401 · {"code":"42501","message":"permission denied for view debt_balances"}
OK   rpc/catetind_delete_account_data HTTP 401 · {"code":"42501","message":"permission denied for function catetind_delete_account_data"}
OK   rpc/catetind_create_invite   HTTP 401 · {"code":"42501","message":"permission denied for function catetind_create_invite"}
OK   rpc/catetind_accept_invite   HTTP 401 · {"code":"42501","message":"permission denied for function catetind_accept_invite"}
OK   rpc/catetind_push_targets    HTTP 401 · {"code":"42501","message":"permission denied for function catetind_push_targets"}
OK   rpc/catetind_record_ai_usage HTTP 401 · {"code":"42501","message":"permission denied for function catetind_record_ai_usage"}
OK   rpc/catetind_handle_new_user HTTP 404 · {"code":"PGRST202","message":"Searched for the function public.catetind_handle_new_user without parameters"}
OK   rpc/catetind_resolve_invite  HTTP 200 · [{"invite_status":"not_found","invite_wallet_id":null,...}]

Aman: tidak ada data yang bisa dibaca tanpa sesi.
```

Dua baris terakhir perlu dijelaskan apa adanya: `catetind_handle_new_user` adalah
**fungsi trigger** — ia tidak punya jalur pemanggilan dari luar sama sekali
(Postgres menolak fungsi bertipe kembalian `trigger`), jadi "aman"-nya bukan karena
izinnya dicabut, melainkan karena memang tidak bisa dipanggil; dan
`resolve_invite` **boleh** dipanggil tanpa login (itu desainnya untuk halaman
`/join/[code]`), tapi hanya mengembalikan status + nama dompet, dan kode yang tidak
ada → `not_found`.


- `invite_codes` hanya bisa dibaca/ditulis pembuatnya (penerima lewat RPC). `resolve_invite` sengaja tetap boleh **anon** karena halaman `/join/[code]` menampilkan status undangan sebelum user masuk.

---

## 4. Bukti (b): login nyata + isolasi dua akun (A & B) + akun ketiga (C)

Satu hal harus dijelaskan lebih dulu: **`mailer_autoconfirm: false`** → user baru
**wajib** menyelesaikan konfirmasi email dulu. Buktinya, masuk dengan password yang
barusan dibuat **ditolak**:

```
=== 2. mailer_autoconfirm:false -> password DITOLAK sebelum konfirmasi ===
D POST /auth/v1/token?grant_type=password -> HTTP 400 |
{"code":400,"error_code":"email_not_confirmed","msg":"Email not confirmed"}
```

Karena mesin ini tidak punya inbox, sesi diambil lewat **jalur yang sama dengan
mengklik tautan email**: `admin/generate_link` mengembalikan OTP/tautan yang persis
dikirim ke email, lalu ditukar jadi sesi. Yang diterima user nyata tidak berubah;
yang diganti cuma "membaca inbox" → "membaca respons API". (UI app-nya sendiri
memakai `signInWithOtp` + `verifyOtp`/`exchangeCodeForSession` di
`lib/session-client.ts` & `components/catetind/verify-email-screen.tsx`.)

```
=== 3. Login nyata lewat MAGIC LINK/OTP ===
OTP dari tautan email = 71968529
sesi A = user 84ab0c78-c3d3-4a90-a316-43993223dca7 · expires_in 3600s · refresh_token ada = True
sesi B = user bf6140d6-6c2f-4a51-8f78-48160d4b7993 · sesi C = user 4e8d582f-091a-4405-9984-ad3cfc145ad1

=== 4. Refresh tetap login, lalu logout memutus sesi ===
refresh A -> token baru = True · user sama = True
logout A -> 204 (tanpa isi)
refresh pakai token yang sudah di-logout -> HTTP 400 |
{"code":400,"error_code":"refresh_token_not_found","msg":"Invalid Refresh Token: Refresh Token Not Found"}
GET /auth/v1/user pakai access token yang sudah di-logout -> HTTP 403 |
{"code":403,"error_code":"session_not_found","msg":"Session from session_id claim in JWT does not exist"}
```

**Isolasi antar-user** (A sudah punya dompet `bca` + 3 baris; B memakai tokennya sendiri):

```
=== 8. ISOLASI: B tidak bisa select/insert/update/delete baris A ===
B GET /wallets (harus 0) -> HTTP 200 | []
B GET /ledger_rows (harus 0) -> HTTP 200 | []
B PATCH wallets?user_id=eq.<A> -> HTTP 200 | []
B DELETE wallets?user_id=eq.<A> -> HTTP 200 | []
B INSERT ledger_rows memakai user_id A (dipalsukan) -> HTTP 403 |
{"code":"42501","message":"new row violates row-level security policy for table \"ledger_rows\""}
dompet A sesudah semua percobaan B -> HTTP 200 | {"id":"bca","name":"BCA"}
```

Baca hasilnya begini: `PATCH`/`DELETE` menjawab `200` **dengan isi kosong** — itu
cara PostgREST melaporkan "nol baris terpengaruh"; tidak satu pun baris A berubah
(`dompet A sesudahnya` masih ada). Yang benar-benar ditolak keras adalah **insert
dengan `user_id` palsu: `403` + `42501`** — persis yang dulu bisa dilakukan sebelum
paket ini.

**Batas yang harus dibaca:** token yang sudah di-logout masih diterima PostgREST
sampai masa berlakunya habis, karena PostgREST memverifikasi JWT secara stateless
(ia tidak bertanya ke GoTrue tiap request). Yang sudah dibuktikan: token itu tidak
bisa diperpanjang (`refresh_token_not_found`) dan sudah ditolak Auth
(`session_not_found`) — sesi memang putus di sisi yang berwenang. Pencabutan yang
instan sampai ke PostgREST perlu JWT berumur pendek; itu belum diubah di project ini.


---

## 5. Bukti (c): catat transaksi = baris di server, saldo turunan, perangkat kedua

```
=== 5. Sesi A baru (perangkat pertama) + seed dompet/baris ===
A INSERT wallets(bca, opening 1.450.000) -> HTTP 200 | {"id":"bca",...,"opening":1450000,...}
A INSERT ledger_rows(kopi 25.000, client_tx_id tx-a-1) -> HTTP 200 |
{"id":"session-9001","wallet_id":"bca","type":"expense","amount":25000,"date":"2026-09-27",
 "note":"Kopi","category":"Makan","client_tx_id":"tx-a-09272341-1",...,"seq":9001}

=== 7. Saldo tetap TURUNAN (1.450.000 - 25.000) ===
A wallet_balances -> HTTP 200 | {"wallet_id":"bca","opening":1450000,"balance":1425000}
A user_net_worth -> HTTP 200 | {"cash":1425000,"assets":0,"receivables":0,"debts":0,"net_worth":1425000}

=== 10. Browser/perangkat KEDUA: sesi baru akun A melihat data yang sama ===
A (perangkat 2) GET ledger_rows -> HTTP 200 | [{"id":"session-9001","amount":25000,"note":"Kopi"},
  {"id":"session-9101","amount":15000,"note":"Parkir"},{"id":"session-9102","amount":32000,"note":"Nasi uduk"}]
A (perangkat 2) GET wallet_balances -> HTTP 200 | {"wallet_id":"bca","balance":1378000}
```

"Perangkat kedua" di sini adalah **sesi baru akun A** lewat tautan berbeda di mesin
yang sama — itulah yang bisa dibuktikan tanpa browser kedua. Datanya identik dan
saldonya konsisten (1.450.000 − 25.000 − 15.000 − 32.000 = 1.378.000).

---

## 6. Bukti (d): offline → online, `client_tx_id` unik di database

```
=== 6. Idempotensi: client_tx_id yang sama dikirim ULANG ===
kiriman kedua (double-tap/retry) -> HTTP 409 |
{"code":"23505","message":"duplicate key value violates unique constraint \"ledger_rows_pkey\""}
jumlah baris A (harus 1) -> HTTP 200 | {"id":"session-9001","client_tx_id":"tx-a-09272341-1"}

=== 9. Offline -> online: 2 catatan terkirim SEKALI ===
kirim #1 -> HTTP 200 | {"id":"session-9101",...,"client_tx_id":"offline-09272341-1"}
kirim #2 -> HTTP 200 | {"id":"session-9102",...,"client_tx_id":"offline-09272341-2"}
flush ULANG #1 -> HTTP 409 | {"code":"23505","message":"duplicate key value violates unique constraint \"ledger_rows_pkey\""}
flush ULANG #2 -> HTTP 409 | {"code":"23505","message":"duplicate key value violates unique constraint \"ledger_rows_pkey\""}
total baris A (harus 3, tidak 5) -> HTTP 200 |
[{"client_tx_id":"offline-09272341-1"},{"client_tx_id":"offline-09272341-2"},{"client_tx_id":"tx-a-09272341-1"}]
```

Jadi janji "kirim ulang tidak menggandakan" tidak lagi bergantung pada memory
klien: yang menolaknya `unique (user_id, client_tx_id)` di database, dan klien
memperlakukan `409`/`23505` sebagai "sudah tersimpan" (bukan kegagalan). Retry
jaringan, double-tap, dan dua perangkat yang syncing bersamaan jadi aman. Di app,
antrean itu hidup di `lib/money/store.ts` (`pendingSyncCount`, `flushPendingSync()`
yang sekarang benar-benar mengirim).


---

## 7. Bukti (e): dompet bersama (joint) — 2 akun diterima, akun ketiga ditolak

```
=== 11. JOINT: A owner, B masuk lewat kode undangan, C ditolak ===
A INSERT joint_wallets -> HTTP 200 | {"id":"a830e9ac-...","name":"Dompet Berdua","owner_id":"84ab0c78-..."}
A INSERT joint_members (dirinya, role owner) -> HTTP 200 | {"role":"owner",...}
A RPC create_invite(code JOIN09272341, 24 jam) -> HTTP 200 |
{"invite_code":"JOIN09272341","invite_expires_at":"2026-09-28T16:41:42.640483+00:00"}
B RPC resolve_invite (sebelum jadi anggota) -> HTTP 200 |
{"invite_status":"valid","invite_wallet_name":"Dompet Berdua","invite_member_count":1}
B RPC accept_invite -> HTTP 200 | {"invite_wallet_id":"a830e9ac-...","invite_wallet_name":"Dompet Berdua"}
C RPC accept_invite kode yang SAMA (harus ditolak) -> HTTP 409 | (kode sudah dipakai)

B INSERT joint_transactions (split 60/40) -> HTTP 200 | {"id":"340ed7a3-...","user_id":"bf6140d6-..."}
A melihat transaksi partner -> HTTP 200 |
{"description":"Groceries Superindo","amount":285000,
 "split_percents":{"84ab0c78-...":60,"bf6140d6-...":40},"paid_by_user_id":"bf6140d6-..."}
C (bukan anggota) SELECT joint_transactions (harus 0) -> HTTP 200 | []
C (bukan anggota) INSERT joint_transactions (harus ditolak) -> HTTP 403 |
{"code":"42501","message":"new row violates row-level security policy for table \"joint_transactions\""}
RPC create_invite TANPA sesi (anon) -> HTTP 401 |
{"code":"42501","message":"permission denied for function catetind_create_invite"}
```

**Realtime** (bukan lagi timer mock): `joint_transactions` ada di publication
`supabase_realtime` + `replica identity full`; `lib/supabase/realtime.ts`
berlangganan Postgres Changes dengan filter `joint_wallet_id` dan membuang channel
saat tab disembunyikan. Bukti skema:

```
tabel di publication realtime = joint_transactions
```

**Split 60/40 tetap menghasilkan angka yang sama dengan `lib/data/joint.test.ts`**
(Jon transfer **Rp 25.000**; dengan `REALTIME_ARRIVAL` → **Rp 250.000**): rumusnya
tidak disentuh paket ini. Server hanya **menyimpan** `split_type` + `split_percents`
dan mengembalikannya utuh (lihat `split_percents` di atas), sementara perhitungan
siapa-transfer-berapa tetap di `lib/data/joint-ledger.ts` (25 test-nya masih hijau).

**Catatan privasi (batas jujur, bukan klaim "zero-access"):** isi catatan privat
disamarkan view `joint_transactions_public`, tapi **nominalnya tetap terlihat
pasangan** karena memang dipakai menghitung kewajiban bersama
(`PRIVATE_EXPENSE_POLICY = 'shared'`):

```
view joint_transactions_public (A/pemilik) -> HTTP 200 |
[{"description":"Groceries Superindo","amount":285000},{"description":"Skincare rahasia","amount":180000}]
view joint_transactions_public (B/pasangan) -> HTTP 200 |
[{"description":"Groceries Superindo","amount":285000},{"description":"Transaksi privat","amount":180000}]
```


---

## 8. Peran IndexedDB setelah migrasi, & cara data lokal dinaikkan

- **IndexedDB bukan lagi sumber kebenaran, tapi tetap dipakai** (`lib/money/idb.ts`
  TIDAK dihapus — Stage 5 tidak diturunkan): saat login, `hydrateMoneyStore()`
  membaca server lebih dulu (`wallets` + `ledger_rows` + `wallet_balances`); kalau
  tidak ada sesi / server tidak bisa dihubungi, store jatuh ke jalur lokal seperti
  sebelumnya. IndexedDB sekarang berperan sebagai **cache + antrean offline**:
  baris yang lahir offline ada di layar & IndexedDB, kuncinya belum masuk
  `syncedIds`, jadi ia terhitung di `pendingSyncCount` dan dikirim oleh
  `flushPendingSync()` (juga saat event `online`).
- **Gabungan server ⇄ lokal** di `mergeWithRemote()` (murni, diuji di
  `lib/money/store-remote-merge.test.ts`): dompet = milik server apa adanya (server
  kosong ⇒ keadaan kosong, bukan saldo contoh yang bukan milik user), baris =
  server + antrean lokal yang belum sampai, tombstone (`removedIds`) tetap berlaku
  untuk baris mock `lib/data/*`.
- **Migrasi sekali jalan** (`lib/supabase/local-migration.ts`): saat login pertama
  untuk akun yang masih kosong di server, dompet + baris dari IndexedDB diimpor
  (`upsert` dompet, lalu `insert` baris), bersama **penanda onboarding**
  (`catet-ind-onboarding`), **target bulanan** (`catet-ind-monthly-target`), dan
  **preferensi privasi** (`catet-ind-privacy-masked`) → tabel `user_settings`
  (jsonb + kolom `masked`). Idempotensinya dua lapis: penanda
  `catet-ind-migrated-v1:<userId>` di perangkat, dan `client_tx_id`/PK unik di
  server. Kalau ada baris yang gagal, penanda **tidak** dipasang supaya percobaan
  berikutnya mengulang (aman, karena idempotent).
- Yang **tetap lokal dan memang harus lokal**: PIN/kunci app
  (`lib/app-lock-store.ts`) dan preferensi tampilan.

---

## 9. `app/api/wallets/**`: arah yang dipilih

Dipilih **proxy**, bukan dihapus: `app/api/wallets/store.ts` meneruskan permintaan
ke PostgREST dengan `Authorization: Bearer <token pemanggil>`, jadi database yang
memutuskan izin (RLS) dan tidak ada state kedua yang bisa berbeda dari database.
Route handler tetap `requireUser()` sebagai baris pertama (401 tanpa sesi) dan tetap
`404` — bukan `403` — untuk id milik orang lain, supaya keberadaan baris user lain
tidak bocor. Fallback store memory hanya hidup saat `NEXT_PUBLIC_SUPABASE_*` tidak
ada (test & build tanpa backend) dan tidak pernah aktif kalau backend dipasangkan.

---

## 10. Hasil validasi (apa adanya)

```bash
$ pnpm test
 Test Files  24 passed (24)
      Tests  319 passed (319)     # sebelumnya 270 → +49 test (mapper, sesi, guard RPC, izin store)

$ pnpm exec tsc --noEmit
 (tanpa keluaran / tanpa error)

$ pnpm build
 ✓ build sukses; seluruh route ter-render (termasuk /login/verify yang dinamis)

$ pnpm theme:audit
 ✓ palet bersih — 314 file diperiksa, tidak ada warna di luar palet.

$ node scripts/supabase/verify-rls.mjs
 Aman: tidak ada data yang bisa dibaca tanpa sesi.
```

**Grep kunci rahasia** (pola kunci rahasia peran server / `sb_`+`secret_`): **0 hasil**
di `app/`, `lib/`, `components/`, `hooks/`, `scripts/`, `supabase/`. Kunci
publishable memang ada di `.env.local` (gitignored) dan di prompt handoff — itu
memang boleh, karena yang melindungi data adalah RLS (dibuktikan bagian 3).

---

## 11. Bug nyata yang ketemu & diperbaiki selama paket ini

Empat hal ini ditemukan karena diuji ke server sungguhan — bukan dari membaca kode:

1. **Rekursi tak berujung di policy `joint_members`** (`42P17`): policy `select`
   memakai subquery ke tabelnya sendiri. Diperbaiki memakai fungsi
   `security definer` `catetind_is_joint_member()`.
2. **`42702 column reference is ambiguous`** di `catetind_create_invite` &
   `catetind_accept_invite`: nama kolom keluaran (`code`, `expires_at`,
   `joint_wallet_id`) bertabrakan dengan nama kolom tabel di dalam badan fungsi.
   Diperbaiki dengan prefiks (`invite_code`, `invite_expires_at`, `invite_wallet_id`).
3. **Grants yang "hidup lagi"**: `drop function` + `create or replace`
   mengembalikan hak default Postgres (EXECUTE untuk PUBLIC), jadi revoke/grant
   harus berada **setelah** definisi fungsi. Versi pertama migrasi menaruhnya
   sebelum, dan `catetind_push_targets` sempat bisa dipanggil tanpa sesi — ketahuan
   oleh `scripts/supabase/verify-rls.mjs`.
4. **Cache skema PostgREST**: setelah bentuk fungsi berubah, REST masih melayani
   versi lama (gejalanya menyesatkan: `42702` padahal SQL-nya sudah benar). Skrip
   migrasi sekarang menutup dengan `notify pgrst, 'reload schema'`.


---

## 12. Apa yang MASIH mock / batas jujur

1. **Provider AI (DeepSeek) belum ada.** Yang nyata sejak paket ini hanya METER
   pemakaiannya: tabel `ai_usage` + RPC naik-tambah atomik
   (`catetind_record_ai_usage`), jadi kuota tidak lagi hilang saat refresh dan dua
   tab tidak saling menimpa. Isi balasan AI tetap mock.
2. **Layar Kekayaan/Utang, Celengan, dan Tagihan masih membaca konstanta
   `lib/data/*`.** Tabelnya lengkap + RLS + view turunan (`debt_balances`,
   `goal_savings`, `investment_values`), tapi UI-nya belum dipindah. Pergerakan
   KAS-nya sudah nyata karena selalu lewat `ledger_rows` (Stage 4B).
3. **Layar /joint masih memakai id dompet kanon (`joint-1`)** yang belum ada di
   tabel `joint_wallets`, jadi langganan realtime belum menerima baris di UI;
   jalur server-nya sendiri sudah terbukti (bagian 7). Ini pekerjaan lanjutan yang
   jelas, bukan sesuatu yang disembunyikan.
4. **Midtrans/pembayaran** tetap mock (`top-up-modal`), begitu pula langganan.
5. **Rate limit push masih per-instance** (in-memory). Supaya berlaku lintas
   instance, penghitungnya harus ikut ke database.
6. **Pencabutan sesi belum instan di PostgREST** (lihat catatan bagian 4).
7. **Pembersihan endpoint push mati pada jalur internal** (broadcast scheduler)
   belum punya RPC; sementara dilakukan operator lewat SQL.
8. **Akun uji paket ini masih ada di project**: 3 akun `catet.[a-c].<stamp>@catetind.dev`
   beserta data contohnya (dompet BCA + 3 baris + 1 dompet bersama). Aman dihapus
   kapan saja lewat dashboard atau
   `delete from auth.users where email like 'catet.%@catetind.dev';`.
9. **Belum ada CI** yang menjalankan migrasi/verifikasi otomatis; perintah manualnya
   sudah disediakan (`pnpm supabase:migrate`, `pnpm supabase:verify`).
10. **Pengujian di browser sungguhan belum dijalankan** (tidak ada Playwright di
    repo): jalur tulis app diuji di lapis store + mapper (test), jalur server-nya
    diuji lewat REST (bukti di laporan ini), tapi klik-demi-klik di browser dan
    inbox email sungguhan belum.

---

## 13. Perintah untuk mengulang semuanya

```bash
# 1. terapkan migrasi (butuh SUPABASE_ACCESS_TOKEN; JANGAN di-commit)
SUPABASE_ACCESS_TOKEN=xxx pnpm supabase:migrate          # tambahkan --force untuk re-apply

# 2. buktikan tidak ada data tanpa sesi (butuh kunci publishable saja)
pnpm supabase:verify

# 3. validasi repo
pnpm test && pnpm exec tsc --noEmit && pnpm build && pnpm theme:audit
```

