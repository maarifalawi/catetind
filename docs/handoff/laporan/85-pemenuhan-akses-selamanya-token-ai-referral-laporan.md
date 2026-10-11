# LAPORAN paket 85 — akses selamanya (SQL) · verifikasi nominal webhook · token AI nyata · reward referral · kuota per paket

> Ringkas tapi lengkap: apa yang berubah, keputusan yang saya ambil sendiri beserta
> alasannya, dan mana yang **SUDAH diverifikasi** (bukti perintah) vs **BELUM**.
> Semua berkas yang disebut bisa dibuka langsung di repo ini.

---

## 1. Hasil verifikasi (WAJIB, dijalankan di akhir)

```
pnpm exec tsc --noEmit   → 0 error
pnpm test                → 85 file / 1142 test LULUS (baseline paket 84: 82 file / 1106)
pnpm build               → sukses ("Compiled successfully", 39/39 halaman)
pnpm theme:audit         → ✅ palet bersih (496 file diperiksa)
pnpm supabase:migrate    → ✅ 20261011120000_catetind_akses_selamanya.sql DITERAPKAN
pnpm supabase:verify     → "Aman: tidak ada data yang bisa dibaca tanpa sesi" (termasuk ai_addons)
```

Test baru (10 di `lib/subscription/fulfillment.test.ts`, 7 di `lib/data/landing.test.ts`,
4 di `lib/data/referral.test.ts`, 4 di webhook, 7 di charge, 4 di `lib/ai-quota.test.ts`)
→ total **+36 test** dari baseline. Tidak ada test lama yang diubah supaya hijau, dan
`pnpm theme:audit` tidak dilonggarkan.

### Bukti langsung ke database (read-only, lewat Management API)

```
catetind_plan_rank('founding_member') = 3   catetind_plan_rank('monthly') = 1
catetind_plan_rank('sultan') = 3            catetind_normalize_tier('annual') = 'waras'
user_subscriptions(is_lifetime=false AND expires_at NOT NULL) = 0   ← backfill jalan
tabel pricing_state = 0 (sudah di-drop)     kolom baru purchases (expected_amount/purpose/addon_tokens/addon_package_id) = 4
```

---

## 2. TUGAS 1 — 🔴 pemenuhan pembayaran menghasilkan AKSES SELAMANYA

**Berkas baru:** `supabase/migrations/20261011120000_catetind_akses_selamanya.sql`
(migrasi BARU, tidak menyunting `20261010120000/130000` yang sudah tercatat — alasannya
ditulis di komentar migrasi).

Yang dikerjakan:

1. **RPC `catetind_fulfill_purchase` (create or replace)** sekarang menulis
   `is_lifetime = true`, `expires_at = NULL`, dan **tidak menambah hari** apa pun.
   Bug lama (`v_days := case when billing_period='annual' then 365 else 30 end`) hilang —
   itulah yang memberi `+30 hari` ke setiap pembeli 109k/129k/299k.
2. **Upgrade naik tier saja**: `tier_name` di-`update` HANYA bila rank target lebih tinggi
   (`case when rank(lama) >= rank(baru) then lama else baru end`) — **tidak pernah menurunkan**.
3. **Helper rank + pemetaan** `catetind_plan_rank(text)` (3/2/1/0) dan
   `catetind_normalize_tier(text)` (`founding_member|lifetime→sultan`, `yearly|annual→waras`,
   `monthly→catet-aja`), dengan komentar silang ke `PLANS[].rank` (`lib/data/pricing.ts`) dan
   ke `LEGACY_TIER_MAP` (`lib/subscription/plan.ts`) bahwa keduanya WAJIB sinkron.
   Komentar silang juga ditulis di `lib/subscription/plan.ts`.
4. **Idempotensi dipertahankan** (`status='settlement'` → berhenti) + `p_advisory_xact_lock`
   tetap ada; `price_paid` tetap mencatat nominal asli webhook.
5. **Sisa model lama dibersihkan**: `pricing_state` **di-drop** (yatim sejak `GET /api/price`
   dihapus di paket 84), default `tier_name='founding_member'` pada `purchases` &
   `user_subscriptions` **dihapus**. Kolom `is_lifetime`/`expires_at` **TIDAK di-drop** (masih
   ada pembeli lama) dan diberi komentar bahwa untuk paket baru nilainya `true`/`NULL`.
6. **BACKFILL** (jawaban §7.1 & §7.7): `update user_subscriptions set is_lifetime=true,
   expires_at=NULL where is_lifetime=false and expires_at is not null` — predikat SEMPIT,
   baris yang sudah `is_lifetime=true` tidak disentuh. Ini sekaligus membetulkan pembelian
   `lifetime` yang sempat kena bug +30 hari.

**Cermin TS yang diuji:** `lib/subscription/fulfillment.ts` (`tierRank`, `resolvedTier`) —
karena SQL tidak punya test di repo ini. 10 test mengunci: rank 1/2/3 sinkron dengan `PLANS`,
tier lama dipetakan sama, upgrade **tidak pernah** menurunkan tier, dan
`isAmountMismatch()`.

**Status: SUDAH diverifikasi** (migrasi diterapkan + query rank/normalize/backfill di atas).

---

## 3. TUGAS 2 — verifikasi NOMINAL notifikasi webhook

Masalahnya: `gross_amount` dari Midtrans diteruskan ke RPC tanpa dibandingkan dengan yang
seharusnya ditagih — notifikasi yang mengaku membayar Rp1.000 tetap bisa "memenuhi".

Yang dikerjakan:

1. Migrasi menambah `purchases.expected_amount` (nominal harapan) & `purchases.purpose`
   (`subscribe` | `upgrade` | `topup`).
2. `app/api/payment/charge/route.ts` menulis `expected_amount` dari hasil hitungan server
   (`priceFor()` / harga add-on) + `purpose` dari body (nilai di luar daftar → 422).
3. `app/api/payment/webhook/route.ts`: membaca baris `purchases` (kunci peran server),
   membandingkan `gross_amount` dengan `expected_amount`. Kalau **beda**:
   - pembelian **TIDAK dipenuhi** (`user_subscriptions` tidak disentuh),
   - status baris dicatat `amount_mismatch` + `updated_at`,
   - balasan tetap **HTTP 200** `{ ok:false, reason:'amount-mismatch' }` (Midtrans me-retry
     notifikasi non-2xx; retry tanpa henti untuk notifikasi yang tidak akan pernah cocok
     hanya membanjiri webhook — alasan ini ditulis di komentar).
   - Baris lama tanpa `expected_amount` tidak dituduh salah (`isAmountMismatch(null, …) → false`).
4. Test baru di `app/api/payment/webhook/route.test.ts`: notifikasi bernominal beda → tidak
   dipenuhi + 200 `ok:false` + status `amount_mismatch`; nominal pas → tetap dipenuhi.
5. `pnpm supabase:verify` membuktikan RPC tetap **tertutup** (`revoke all … from public, anon,
   authenticated` dipertahankan; hasil: `permission denied for function catetind_fulfill_purchase`).

**Status: SUDAH diverifikasi** (test hijau + verify RLS).

---

## 4. TUGAS 3 — token AI: harga kanon + pembayaran nyata

**Keputusan (ditulis di komentar `lib/ai-quota.ts` & `charge/route.ts`):** harga add-on token
AI **tetap hidup di `lib/ai-quota.ts`** (`AI_ADDON_PACKAGES`), TIDAK dipindah ke
`lib/data/pricing.ts`. Alasan: `pricing.ts` adalah kanon harga **paket akses**; memindahkan
harga token ke sana akan mencampur dua jenis produk dan berisiko melahirkan "daftar harga
kedua". Yang penting: **server membaca dari satu sumber itu**, bukan dari body klien.

1. `/api/payment/charge` untuk `purpose:'topup'` memvalidasi server: `packageId` harus ada di
   `AI_ADDON_PACKAGES`; `amount` = harga paket itu (atau versi diskon referral) → kalau tidak
   **422**; `planId` **tidak boleh** dititipkan → 422. Paket tanpa kuota (Catet Aja) / tanpa
   batas (Sultan) ditolak **403 `plan-not-eligible`** (jawaban §7.4: jangan jual ke yang tidak
   punya kuota). Tanpa backend (demo) paket tidak bisa dibaca → dilewatkan.
2. `components/catetind/top-up-modal.tsx`: `// TODO: Integrate Midtrans Snap` **dihapus**.
   "Bayar Sekarang" sekarang memanggil `/api/payment/charge` lalu menampilkan instruksi bayar
   lewat **komponen yang sudah ada** (`payment-instruction-card.tsx`) — bukan komponen
   pembayaran kedua, bukan Snap. Gagal/tidak tersedia → pesan jujur (`AI_TOPUP_COPY.notConfigured`),
   tidak ada "token masuk" palsu.
3. **Token dicatat di server**: tabel baru `ai_addons` (`user_id`, `order_id` unik, `package_id`,
   `tokens`) + RPC memenuhi cabang `topup` (`insert … on conflict (order_id) do nothing`).
   RLS: pemilik boleh SELECT, tidak ada policy insert (hanya webhook/kunci peran server).
   `useAiQuota()` membaca saldo lewat `lib/supabase/ai-usage-remote.ts` → `ai_addons` (di-`max`
   dengan `ai_usage.purchased_tokens`), dengan **fallback perangkat** yang jujur kalau backend
   belum dikonfigurasi. Karena `ai_addons` berkunci `order_id` (bukan bulan),
   **token berlaku selamanya** — tidak hangus saat bulan berganti.
4. Test baru: `topup` nominal salah → 422; nominal kanon → 200 + `expected_amount`/token benar;
   `planId` dititipkan → 422; Catet Aja/Sultan → 403; diskon teman → 200.

**Status: SUDAH diverifikasi** untuk validasi harga + alur bayar + pencatatan server + verifikasi
nominal. **BELUM diuji end-to-end ke sandbox Midtrans** dari sesi ini (lihat §8).

---

## 5. TUGAS 4 — kuota AI per paket di 3 permukaan yang masih bocor

Semua memakai `planQuota(planId)` + `planKnown` dari gerbang global. Aturan yang dipegang:
**jangan mengunci/menyembunyikan berdasarkan KETIDAKTAHUAN** (`planKnown === false` → perilaku lama).

1. `home-banner.tsx` — banner "Kuota AI-mu menyusut": `quotaApplies = !planKnown ||
   (pq.aiEnabled && !pq.unlimited)`. Untuk Sultan (unlimited) & paket tanpa AI banner **tidak
   muncul**, jadi tidak ada ajakan top up yang tidak masuk akal.
2. `billing-panel.tsx` — band "Top Up AI Token" (`AI_FUEL_COPY.addonBand*`) disembunyikan bila
   `!pq.aiEnabled || pq.unlimited`.
3. `weekly-recap-banner.tsx` — untuk paket tanpa `ai-report` (mis. Catet Aja) tidak lagi
   mengajak membuka rekap AI; diganti `<LockedFeatureNote capability="ai-report" />`.
4. `top-up-modal.tsx` — tidak dirender untuk paket tanpa AI (`planKnown && !pq.aiEnabled → null`).

Catatan: `billing-panel.tsx` `FuelGaugeCard` sudah memakai `planQuota()` sejak paket 84; yang
kurang memang "band" & tiga permukaan lain di atas.

---

## 6. TUGAS 5 — landing live feed: berhenti mengarang bukti sosial

1. `components/landing/social-proof.tsx` sekarang membaca `GET /api/pricing/recent-purchases`
   (endpoint yang sudah ada tapi belum dipakai siapa pun).
2. **Seed hanya tampil bila `SHOWS_SAMPLE_DATA`** (`lib/demo.ts`) — pola yang sama dengan store
   lain. Di produksi daftar kosong → keadaan kosong yang JUJUR (`LIVE_FEED_EMPTY_COPY`), bukan
   daftar nama karangan.
3. Copy baru ditaruh di `lib/data/landing.ts` (`LIVE_FEED_EMPTY_COPY`) + dua fungsi murni
   (`relativeFeedTime`, `liveFeedFromPurchases`) supaya bisa diuji tanpa DOM. Komponen tetap
   nol angka/nama karangan.
4. `docs/STATUS-HALAMAN.md` §9.9 diperbarui (dan sekaligus membetulkan baris stale yang masih
   menyebut `use-fomo-counter.ts`, yang sudah dihapus sejak paket 84).

Test baru: `lib/data/landing.test.ts` (7 test).

---

## 7. TUGAS 6 — reward referral otomatis + data referral

1. **Grant dari webhook** (bukan klien): `app/api/payment/webhook/route.ts` memanggil
   `grantReferralForOrder()` setelah pemenuhan `settlement` — membaca `purchases.user_id` +
   `purpose`, mencari relasi di `referrals` (`referred_user_id`), lalu memberi reward ke
   PENGUNDANG (`referrals.referrer_user_id`). Reward = **Token AI** (satu bentuk, jawaban §7.5),
   besarnya `REFERRAL_REWARD_TOKENS` = `AI_BASE_TOKENS_TOTAL` (kuota dasar bulanan kanon — bukan
   angka tulis tangan). Idempoten **per `order_id`**: kolom `referral_rewards.order_id` (unik)
   ditambah di migrasi, plus jaring `unique(referral_id)` yang sudah ada.
2. **Hanya pembelian paket** yang memberi reward: `referralRewardFor('topup') → null`.
3. `POST /api/referral/reward` sekarang **menolak panggilan klien** dengan **409 `webhook-only`**
   (sebelumnya jalur ini masih memanggil `grantReferralReward` dengan token pemanggil — meski RLS
   menutupnya, itu tetap "pintu yang terlihat terbuka"). 503 tetap untuk "belum ada pembayaran".
4. `lib/data/referral.ts`: data kode/riwayat masih MOCK, **tapi tidak lagi menyamar jadi fakta** —
   `REFERRAL_IS_SAMPLE = !SHOWS_SAMPLE_DATA` + tanda "Contoh" (`REFERRAL_SAMPLE_NOTICE`) yang
   dirender di halaman `/referral` saat produksi. (Opsi "pembacaan nyata" belum dikerjakan →
   dicatat di §9.7 docs + §10 laporan ini.)

Test baru: `lib/data/referral.test.ts` (4) + 2 test webhook (reward ke pengundang; top-up tidak
memberi reward).

---

## 8. TUGAS 7 — kerapian sisa paket 84

1. `components/catetind/registration-sheet.tsx` — komentar stale `?plan=…&period=…` dibersihkan.
2. `lib/data/auth.test.ts` — fixture `?plan=waras&period=annual` → `?plan=waras` (+ versi
   ter-encode), supaya tidak ada contoh yang menyebut parameter yang sudah dihapus.
3. **Saklar demo `lib/data/joint.ts`** — diputuskan: `DEMO_PARTNER_JOINED` &
   `DEMO_REALTIME_MOCK` = `DEMO_MODE`, `DEMO_JOINED_CELEBRATION` = `false` (tetap). Ini sudah
   konsisten dengan kontrak `lib/demo.test.ts` dan memang sudah diputuskan di paket 84 →
   **TIDAK ada perubahan kode** dan `lib/demo.test.ts` **tidak dilonggarkan**.
4. Label menu "Langganan" (`settings-shell.tsx`) **dibiarkan**: ia adalah nama *bagian* yang
   lebih pendek dari judul panel "Langganan & Billing" (`settings-panel-billing.tsx`) — sama
   keputusannya dengan paket 84. Tidak ada perubahan.

---

## 9. TUGAS 8 — USULAN (BELUM dikerjakan, sesuai jawaban §7.6)

**Usulan saja, tidak dikerjakan** (permintaan user: "BELUM DIIZINKAN"):

Memindahkan `PhoneStage` + `ScreenShell` (sidebar desktop + bottom nav) ke route group
`app/(app)/layout.tsx` akan membuat `loading.tsx` bisa dipakai di SEMUA halaman app tanpa
menghilangkan navigasi. Alasan lengkapnya sudah ditulis di komentar panjang
`components/catetind/screen-skeleton.tsx`; saat ini hanya `app/settings/loading.tsx` yang aman
karena sidebar halaman pengaturan berasal dari `app/settings/layout.tsx` (tidak ikut unmount).

**Risiko kalau dikerjakan:** memindahkan `PhoneStage`/`ScreenShell` ke layout menyentuh SEMUA
`*-screen.tsx` (mereka saat ini merender shell-nya sendiri). Ini refactor besar dengan peluang
regresi layout tinggi, jadi memang pantas menunggu izin eksplisit.

---

## 10. Keputusan yang saya ambil SENDIRI (beserta alasannya)

1. **§7.1 pembeli lama → akses selamanya (b).** Backfill di migrasi baru dengan predikat
   SEMPIT (`is_lifetime=false AND expires_at IS NOT NULL`), alasan ditulis di komentar migrasi +
   laporan. Ini juga menutup §7.7 (pembelian yang kena bug +30 hari). Hasil: 0 baris tersisa.
2. **§7.2 pemetaan pembeli lama** dipakai persis seperti kode paket 84, dan **ditulis di DUA
   tempat** (SQL `catetind_normalize_tier` + `LEGACY_TIER_MAP`) dengan komentar silang di
   keduanya bahwa mengubah satu wajib mengubah yang lain.
3. **§7.3 fair-use Sultan** hanya DITULIS sebagai kebijakan (`AI_UNLIMITED_NOTE`) — tidak
   ditegakkan/dibatasi diam-diam di server.
4. **§7.4 token AI tetap dijual** untuk paket BERKUOTA saja. Ditegakkan di server (`403
   plan-not-eligible` untuk Catet Aja & Sultan, karena menjual ke yang tidak punya kuota =
   jebakan). Token **berlaku selamanya** → tabel `ai_addons` berkunci `order_id`, bukan `ai_usage`
   yang berkunci bulan.
5. **§7.5 reward referral satu bentuk**: 1 bulan Token AI = `AI_BASE_TOKENS_TOTAL` (kuota dasar
   bulanan kanon, bukan angka baru), diberikan untuk pembelian paket APA PUN, dari webhook,
   idempoten per `order_id`.
6. **`pricing_state` di-DROP**, bukan dipertahankan. Alasan: `/api/price` (satu-satunya pembaca)
   sudah dihapus di paket 84, jadi tabel itu adalah "pintu yang mengaku jalan". Tidak ada kode
   TS/route yang menyentuhnya (sudah dicek dengan grep) → drop aman.
7. **`catetind_normalize_tier` + `catetind_plan_rank`** dijadikan fungsi SQL tersendiri (bukan
   `case` inline) supaya aturannya terbaca sebagai satu daftar yang bisa disamakan dengan file TS.
8. **Cermin aturan pemenuhan di TS** (`lib/subscription/fulfillment.ts`). Ini fungsi MURNI yang
   **belum dipanggil runtime** (SQL tetap sumber eksekusi) — sengaja, karena SQL tidak punya test
   di repo ini; gunanya mengunci aturan ("upgrade tidak pernah menurunkan tier") supaya perubahan
   yang lupa disinkronkan ketahuan.
9. **Webhook membaca baris `purchases` untuk verifikasi nominal** (bukan menaruh cek itu di dalam
   RPC). Alasannya: keputusan "memenuhi atau tidak" jadi terlihat di route yang memang memegang
   kunci peran server, dan status `amount_mismatch` bisa ditulis tanpa memanggil RPC.
10. **Nama endpoint `POST /api/referral/reward` tidak dihapus**, hanya diubah jadi 409
    `webhook-only`. Alasannya: menghapus route berarti tautan lama (kalau ada) jadi 404 yang
    membingungkan; 409 + pesan jelas lebih jujur.
11. **Tanda "Contoh" di halaman referral** dipilih daripada mengosongkan data mock. Alasan: data
    kode/link user belum bisa dibaca tanpa menyambungkan tabel `referrals`; mengosongkan akan
    merusak tombol Bagikan. Menandainya "Contoh" memenuhi aturan "jangan menyajikan karangan
    sebagai milik user" tanpa mematikan alur share.
12. **Baris `m | Renewal Modal` di STATUS-HALAMAN.md** saya betulkan jadi "DIHAPUS (paket 84)"
    karena berkasnya memang sudah tidak ada — akurasi dokumen (temuan sampingan, bukan utang paket 85).

---

## 11. Yang SUDAH diverifikasi vs yang BELUM

**SUDAH (bukti perintah, bukan klaim):**

- `pnpm exec tsc --noEmit` → 0 error; `pnpm test` → 85 file / 1138 test; `pnpm build` → sukses
  39/39 halaman; `pnpm theme:audit` → palet bersih.
- `pnpm supabase:migrate` → `20261011120000_catetind_akses_selamanya.sql` **diterapkan** ke project
  `wmswtoyikvgzcvbgdceo`; tabel `ai_addons` muncul; `pricing_state` hilang.
- `pnpm supabase:verify` → semua tabel tertutup tanpa sesi (termasuk `ai_addons`), RPC
  `catetind_fulfill_purchase` tetap `permission denied` untuk anon/authenticated.
- Query read-only ke DB: `catetind_plan_rank` 3/1/3, `catetind_normalize_tier('annual')='waras'`,
  `is_lifetime=false AND expires_at IS NOT NULL` = **0**, `pricing_state` = 0, kolom baru
  `purchases` = 4. → **Backfill & migrasi terbukti di DB, bukan cuma dibaca kode.**
- Test baru mengunci: rank sinkron `PLANS`, upgrade tak menurunkan, `isAmountMismatch`,
  `planQuota()` 3 paket + `null`, `topup` 422/200/403, webhook `amount-mismatch` & reward referral,
  feed pembelian (`relativeFeedTime`, `liveFeedFromPurchases`), reward referral murni.

**BELUM (jujur — tidak diklaim sudah jalan):**

- **Alur bayar top-up end-to-end ke sandbox Midtrans** (charge QRIS → bayar → webhook → token
  bertambah) **belum dijalankan** dari sesi ini; yang diverifikasi adalah validasi server + unit
  test route + pemenuhan lewat RPC (`ai_addons`). Midtrans di `.env.local` memang sandbox.
- **Reward referral end-to-end** (pembelian nyata dengan `referred_by` → baris `referral_rewards`)
  belum dijalankan sungguhan; dikunci lewat unit test dengan RPC/REST di-stub.
- **Pembacaan saldo `ai_addons` di browser** belum diuji dengan sesi user nyata (butuh login);
  yang dikunci adalah kode jalurnya + RLS-nya.
- **Data referral nyata** (kode & riwayat dari `referrals`) **belum** dikerjakan — sengaja, dicatat
  sebagai sisa utang §9.7.
- **TUGAS 8** (route group `app/(app)/layout.tsx`) **belum** dikerjakan (tidak diizinkan).

---

## 12. Daftar berkas (ringkas)

**Baru:** `supabase/migrations/20261011120000_catetind_akses_selamanya.sql`,
`lib/subscription/fulfillment.ts` (+`.test.ts`), `lib/data/landing.test.ts`,
`lib/data/referral.test.ts`, `docs/handoff/laporan/85-pemenuhan-akses-selamanya-token-ai-referral-laporan.md`.

**Ditulis/diubah:** `app/api/payment/{charge,webhook}/route.ts` (+ test),
`app/api/referral/reward/route.ts`, `components/catetind/{home-banner,billing-panel,
weekly-recap-banner,top-up-modal,referral-screen,registration-sheet}.tsx`,
`components/landing/social-proof.tsx`, `lib/ai-quota.ts` (+ test), `lib/data/{landing,referral,auth.test}.ts`,
`lib/payments/referral-reward.ts`, `lib/subscription/plan.ts`, `lib/supabase/ai-usage-remote.ts`,
`scripts/supabase/verify-rls.mjs`, `docs/STATUS-HALAMAN.md`.

---

## 13. ⚠️ TINDAK LANJUT UNTUK USER

- **REVOKE token Management API** (`sbp_…`) di Dashboard Supabase → Account → Access Tokens.
  Token itu hanya dipakai untuk `pnpm supabase:migrate`/verify di sesi ini dan **tidak pernah
  ditulis ke berkas mana pun** (hanya environment variable) — tapi tetap harus di-revoke.
- Kalau mau menutup §9.7 penuh: sambungkan halaman `/referral` ke `referral_codes` + `referrals`
  (kodenya sudah dibuat otomatis oleh trigger `catetind_ensure_referral_code` saat user lahir).




