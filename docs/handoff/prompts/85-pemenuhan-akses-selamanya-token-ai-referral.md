# HANDOFF — CatetInd paket 85: pemenuhan AKSES SELAMANYA (SQL) · token AI nyata · reward referral · kuota per paket

> **Prompt untuk TASK BARU.** Paket 84 sudah SELESAI dan tertutup: harga jadi akses selamanya,
> kunci fitur per tier jalan (server 403), upgrade = bayar selisih, landing satu harga, theme
> audit bersih. Paket 85 menutup **celah yang ditinggalkan paket 84** — yang paling gawat ada di
> **SQL pemenuhan pembayaran**: pembeli akses selamanya saat ini akan dinonaktifkan setelah 30
> hari. Baca sampai habis sebelum menulis kode.

---

## 0. PERAN & GAYA KERJA

- Kamu **MELANJUTKAN** pekerjaan CatetInd. Bahasa obrolan: Indonesia santai-profesional (user pakai "gua/lu").
- SEMUA kode & komentar proyek berbahasa **INDONESIA** → tulis dengan gaya yang sama.
- **ATURAN KERAS:** jangan pernah membuat UI/route/endpoint yang "mengaku sudah jalan" padahal belum.
  Kalau belum bisa → jawab JUJUR (503 / empty state / kata "belum aktif"), bukan token atau tanda palsu.
  Ini juga berlaku untuk **migrasi SQL**: kalau kredensial Supabase tidak ada, JANGAN mengklaim
  migrasi sudah dijalankan — laporkan apa adanya.
- Setiap keputusan penting (pemetaan pembeli lama, harga token, gerbang demo) **LAPORKAN** ke user.
- Sebelum mengubah sesuatu → BACA file relevan. Setelah mengubah → WAJIB verifikasi:
  `pnpm exec tsc --noEmit` + `pnpm test` + `pnpm build` + `pnpm theme:audit`.

## 1. PROYEK

- Root: `c:\Users\maari\Downloads\catet-ind-dashboard-design` (Windows + PowerShell).
- Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · pnpm · Supabase (Postgres+Auth) ·
  Midtrans (Core API) · DeepSeek · Web Push. PWA mobile-first, bahasa Indonesia.
- Git: `github.com/maarifalawi/catetind`, branch `main`. LIVE di `https://catetind.com` (Vercel).
- Perintah: `pnpm dev` · `pnpm build` · `pnpm start` · `pnpm test` · `pnpm exec tsc --noEmit` ·
  `pnpm theme:audit` · `pnpm supabase:migrate` · `pnpm supabase:verify`
- **Line ending repo = CRLF** (`core.autocrlf=true`). Jangan menulis berkas baru LF-only.
- **Semua copy user-facing tinggal di `lib/data/*`, `lib/legal/*`, `lib/ai-quota.ts`, `lib/weekly-recap.ts`**
  — komponen harus NOL string kalimat di JSX. `lib/data/*` wajib **bebas React** (tanpa hook/JSX).
- **Angka harga HANYA di `lib/data/pricing.ts`** (+ harga add-on token di `lib/ai-quota.ts`). Tidak ada
  nominal di JSX, komponen, atau komentar alur. CTA yang menyebut rupiah harus MEMBACA dari fungsi kanon.

### Berkas yang WAJIB dibaca lebih dulu (peta konteks, urut prioritas)

1. `lib/data/pricing.ts` — satu sumber harga + kemampuan (`PLANS`, `priceFor`, `capabilitiesOf`).
2. `lib/data/upgrade.ts` — `nextTier`, `upgradeTargets`, `capabilityUpgradeOffer`, copy upgrade.
3. `lib/subscription/plan.ts` — `readCallerPlan`, `normalizeTier`, `LEGACY_TIER_MAP` (pembeli lama).
4. `lib/subscription/capability.ts` — `requireCapability` (kunci server 403/401/503).
5. `supabase/migrations/20261010130000_catetind_pemenuhan_langganan.sql` — **RPC pemenuhan (BUG, §4.1)**.
6. `app/api/payment/charge/route.ts` + `app/api/payment/webhook/route.ts` — tagih & pemenuhan.
7. `components/catetind/subscription-gate-provider.tsx` — gerbang global `{ plan, canUse, planKnown, inputLocked }`.
8. `lib/ai-quota.ts` — `planQuota()`, `AI_ADDON_PACKAGES`, `AI_QUOTA_EXHAUSTED_COPY`, copy per paket.
9. `docs/handoff/laporan/84-harga-lifetime-kunci-fitur-upgrade-laporan.md` — laporan paket 84 (apa yang sudah jadi).

---

## 2. KEPUTUSAN PRODUK YANG SUDAH MENGIKAT (dari paket 84 — JANGAN diubah tanpa izin)

1. **Harga = AKSES SELAMANYA, sekali bayar.** `catet-aja` Rp109.000 · `waras` Rp129.000 ·
   `sultan` Rp299.000. TIDAK ADA paket bulanan/tahunan, auto-renew, masa aktif, grace period,
   tanggal kedaluwarsa, atau perpanjangan.
2. **Kunci fitur per tier benar-benar terkunci:** server menolak (403), klien menampilkan ajakan
   upgrade dengan **selisih** dari `priceFor()`. Peta kemampuan ada di `PLAN_CAPABILITIES`.
3. **Upgrade = bayar SELISIH**, dihitung server dari paket yang tersimpan. Downgrade tidak ditawarkan
   (tidak ada refund).
4. **BillingPeriod tinggal `'lifetime'`.** `/api/payment/charge` menulis `billing_period: 'lifetime'`
   ke tabel `purchases`.
5. `sultan` = AI tanpa batas (dengan **fair-use yang DITULIS**, bukan pembatasan diam-diam).

---

## 3. STATUS REPO SEKARANG (SUDAH JADI di paket 84 — jangan diulang, jangan dirusak)

**Angka baseline yang harus tetap benar sampai paket 85 selesai:**

```
pnpm exec tsc --noEmit   → 0 error
pnpm test                → 82 file / 1106 test LULUS
pnpm build               → sukses (39/39 halaman)
pnpm theme:audit         → ✅ palet bersih (492 file, 0 pelanggaran)
```

**Yang sudah ada dan TIDAK boleh dikembalikan ke perilaku lama:**

| # | Yang sudah jalan | Berkas kunci |
|---|---|---|
| A | `PLANS` = 3 tier akses selamanya + `rank`; `priceFor()`; peta 8 kemampuan | `lib/data/pricing.ts` |
| B | Kunci fitur server: 403/401/503 di `/api/ai/*` + `/api/parse-voice` | `lib/subscription/capability.ts`, 4 route AI |
| C | `/api/subscription` → `{ configured, active, planId, purchasedAt }` | `app/api/subscription/route.ts` |
| D | Gerbang global `{ plan, planId, purchasedAt, capabilities, canUse, planKnown, inputLocked }` | `components/catetind/subscription-gate-provider.tsx` |
| E | UI terkunci + CTA selisih (badge 🔒 + paket pembuka) | `components/catetind/locked-feature-note.tsx` (dipakai ai-chat-widget, ai-capture-bubble, weekly-recap-modal, joint-screen) |
| F | Modal upgrade (satu alur naik tier) + banner paket global | `components/catetind/upgrade-modal.tsx`, `subscription-banner.tsx` |
| G | `planQuota()` per paket (tier 1 tanpa AI, tier 2 berkuota, tier 3 tanpa batas) | `lib/ai-quota.ts` |
| H | Landing satu harga (diturunkan dari `PLANS`), tanpa parameter `period` | `lib/data/landing.ts`, `/checkout`, `/checkout/bayar`, `/registered` |
| I | 5 berkas mati DIHAPUS: `renewal.ts`, `renewal-modal.tsx`, `annual-plan-modal.tsx`, `snap-payment-sheet.tsx`, `use-renewal-reminder.ts`, `use-fomo-counter.ts`, `app/api/price/` | — |
| J | Manifest: `orientation` dihapus + `shortcuts`; skeleton `app/settings/loading.tsx` | `app/manifest.ts`, `components/catetind/screen-skeleton.tsx` |
| K | theme:audit bersih (23 hex plant-illustration + 1 `bg-white` diperbaiki) | `plant-illustration.tsx`, `payment-instruction-card.tsx` |

**Utang yang SENGAJA ditinggalkan paket 84 (= isi paket ini):** lihat §4. Yang paling gawat adalah
§4.1 — SQL pemenuhan pembayaran **masih** bercerita langganan berperiode.

---

## 4. YANG HARUS DIKERJAKAN

### TUGAS 1 — 🔴 KRITIS: pemenuhan pembayaran harus menghasilkan AKSES SELAMANYA

**Bug yang sudah terbukti ada** (baca sendiri di
`supabase/migrations/20261010130000_catetind_pemenuhan_langganan.sql`):

```sql
-- baris ~78
v_days := case when v_purchase.billing_period = 'annual' then 365 else 30 end;
-- baris ~89-103
insert into public.user_subscriptions (user_id, tier_name, is_lifetime, started_at, expires_at, ...)
values (v_purchase.user_id, v_tier, FALSE, now(),
        now() + (v_days || ' days')::interval, true, now(), now())
on conflict (user_id) do update set ..., is_lifetime = FALSE,
  expires_at = greatest(...) + (v_days || ' days')::interval, ...;
```

Karena `/api/payment/charge` (paket 84) sekarang menulis **`billing_period = 'lifetime'`**, maka
`v_days` jatuh ke `else 30` → **setiap pembeli 109k/129k/299k mendapat `expires_at = now() + 30 hari`
dan `is_lifetime = false`**. Artinya janji "akses selamanya" dilanggar oleh database. Ini bug
produksi, bukan kosmetik.

**Yang harus dikerjakan:**

1. **Tambah migrasi BARU** (jangan mengedit migrasi lama): nama
   `supabase/migrations/20261011120000_catetind_akses_selamanya.sql`. Alasan wajib ditulis di
   komentar migrasi: `20261010120000_*` & `20261010130000_*` **sudah tercatat** di
   `supabase_migrations.schema_migrations` (sudah pernah dijalankan), jadi mengeditnya tidak berefek
   di lingkungan yang sudah migrasi. Skrip `pnpm supabase:migrate` menjalankan berkas urut nama
   (`sort()`), jadi timestamp baru = dijalankan terakhir.
2. **RPC `catetind_fulfill_purchase` (create or replace) menangani akses selamanya:**
   - `billing_period = 'lifetime'` → `is_lifetime = true`, **`expires_at = NULL`** (bukan +30 hari);
   - **upgrade naik tier**: naikkan `tier_name` HANYA bila rank target lebih tinggi, **tidak pernah
     menurunkan**, dan **tidak menambah hari** apa pun;
   - idempotensi dipertahankan (notifikasi ganda dari Midtrans tidak boleh mengaktifkan dua kali);
   - `p_amount` tetap dicatat apa adanya di `purchases.price_paid`.
3. **Helper rank di SQL**: `catetind_plan_rank(text)` → `sultan=3`, `waras=2`, `catet-aja=1`,
   selain itu `0`. Tulis di komentar bahwa angka ini HARUS sinkron dengan `rank` di `PLANS`
   (`lib/data/pricing.ts`) — dua implementasi, satu aturan.
4. **Samakan pemetaan tier LAMA dengan `LEGACY_TIER_MAP`** di `lib/subscription/plan.ts`:
   `founding_member|lifetime → sultan`, `yearly|annual → waras`, `monthly → catet-aja`. Tulis
   komentar silang di kedua tempat bahwa mengubah salah satu wajib mengubah yang lain.
5. **Bersihkan sisa model lama di skema** (dengan komentar tegas alasannya):
   - `public.pricing_state` (+ `current_slot`, `current_price`, `current_tier`) sekarang **YATIM** —
     `/api/price` sudah DIHAPUS di paket 84. `drop table if exists` (kalau kamu punya alasan kuat
     untuk mempertahankannya, jelaskan di laporan).
   - Default kolom `tier_name = 'founding_member'` di `purchases` & `user_subscriptions` → **hapus
     defaultnya** supaya database tidak pernah mengarang tier
     (`alter table ... alter column tier_name drop default`, idempoten).
   - Kolom `expires_at` & `is_lifetime` **JANGAN di-drop**: masih ada pembeli lama (lihat §7.2).
     Beri komentar bahwa untuk paket baru keduanya bernilai `NULL`/`true`.
6. **Idempoten & aman diulang**: seluruh migrasi harus bisa dijalankan dua kali tanpa error
   (`if not exists`, `create or replace`, `drop ... if exists`).
7. **Verifikasi**: `pnpm supabase:migrate` lalu `pnpm supabase:verify`. Kalau kredensial Supabase
   tidak ada di lingkunganmu → **JANGAN mengklaim sudah diuji**; tulis di laporan "migrasi belum
   dijalankan, perlu dijalankan di lingkungan berkredensial" dan buktikan sebisa mungkin lewat
   review manual + uji logika setara di TS (`rankOf` sudah ada di `lib/data/pricing.ts` — kunci
   nilainya dengan test supaya perubahan yang lupa disinkronkan ke SQL ketahuan).

### TUGAS 2 — Webhook: verifikasi nominal + simpan NIAT pembelian

**Masalah:** `app/api/payment/webhook/route.ts` meneruskan `gross_amount` dari notifikasi ke RPC
tanpa membandingkannya dengan yang **seharusnya** ditagih. Baris `purchases` tidak menyimpan nominal
harapan, jadi notifikasi bernominal beda (mis. user membayar Rp1.000) tetap bisa "memenuhi" pembelian.

**Yang harus dikerjakan:**

1. Migrasi (boleh digabung TUGAS 1): tambah `purchases.expected_amount integer` dan
   `purchases.purpose text` (`subscribe` | `upgrade` | `topup`).
2. `/api/payment/charge/route.ts`: tulis `expected_amount` = nominal hasil hitungan server
   (`priceFor()` dari paket tersimpan; atau harga add-on untuk `topup`) dan `purpose` = niat dari
   body (nilai di luar yang dikenal → 422).
3. Webhook: bandingkan `gross_amount` dengan `expected_amount`. Kalau **beda**:
   - **jangan memenuhi** (jangan sentuh `user_subscriptions`),
   - catat status barisnya (`status = 'amount_mismatch'` atau serupa) + `updated_at`,
   - **tetap balas HTTP 200** dengan `{ ok: false, reason: 'amount-mismatch' }` — Midtrans me-retry
     notifikasi yang dijawab non-2xx, dan retry tanpa henti untuk notifikasi yang memang tidak akan
     pernah cocok hanya membanjiri webhook. **Tulis alasan ini di komentar.**
4. Test baru di `app/api/payment/webhook/route.test.ts`: notifikasi bernominal salah → pembelian TIDAK
   dipenuhi (tidak ada pemenuhan sukses) dan route tetap balas 200 `ok:false`.
5. `pnpm supabase:verify` (kalau bisa) untuk memastikan RPC tetap **TERTUTUP** dari
   `anon`/`authenticated` setelah `create or replace` (`revoke all on function ... from public, anon,
   authenticated` wajib tetap ada).

### TUGAS 3 — Token AI: harga kanon + pembayaran nyata (jalur pembayaran terakhir yang masih mock)

**Kondisi sekarang:** `components/catetind/top-up-modal.tsx` masih menyimulasikan pembayaran
(`// TODO: Integrate Midtrans Snap API...`, timer mock). Padahal sejak paket 83 pembayaran sudah
Core API di `POST /api/payment/charge`.

**Yang harus dikerjakan:**

1. **Harga add-on = satu sumber.** `AI_ADDON_PACKAGES` di `lib/ai-quota.ts` sudah memuat harga token;
   **putuskan dan tulis alasannya di komentar** bahwa harga add-on AI hidup di `lib/ai-quota.ts`
   (bukan dipindah ke `pricing.ts` yang khusus paket akses) — supaya tidak lahir daftar harga kedua —
   lalu pastikan `charge` MEMBACA dari sana, bukan dari body klien.
2. `/api/payment/charge`: untuk `purpose: 'topup'`, validasi **server**:
   - `packageId` harus ada di `AI_ADDON_PACKAGES`;
   - `amount` harus sama dengan harga paket itu (atau versi diskon referral bila berlaku) → kalau tidak **422**;
   - `purpose: 'topup'` tidak boleh menuntut `planId` (bukan pembelian tier).
3. `top-up-modal.tsx`: alihkan ke `/checkout/bayar` atau tampilkan instruksi bayar lewat komponen
   yang SUDAH ada (`payment-instruction-card.tsx`) — **jangan bikin komponen pembayaran kedua** dan
   jangan bikin alur Snap baru.
4. **Token yang dibeli harus tercatat di server** (sekarang hanya hidup di
   `lib/ai-usage-store.ts` per perangkat). Sederhananya: tambah tabel `ai_addons`
   (`user_id`, `tokens`, `order_id`, `created_at`, idempoten per `order_id`) + pemenuhan lewat RPC
   yang sama, lalu `useAiQuota()` membaca saldo add-on dari API (dengan fallback perangkat yang
   jujur kalau backend belum dikonfigurasi). Kalau tugas ini kamu nilai terlalu besar untuk satu sesi:
   **pecah dan laporkan** — kerjakan validasi harga + alur bayar dulu, lalu catat sisanya di laporan.
5. Test baru: `charge` menolak `topup` dengan nominal salah (422) dan menerima nominal kanon (200).

### TUGAS 4 — Kuota AI per paket: selesaikan 3 permukaan yang BELUM memakai `planQuota()`

Paket 84 baru menutup 2 tempat. Yang **masih bocor** (pakai `planQuota(planId)` + `planKnown`):

1. `components/catetind/home-banner.tsx` — banner "Kuota AI-mu menyusut" masih bisa muncul untuk
   **Paket Sultan (unlimited)** dan untuk paket **tanpa AI**. Untuk unlimited: jangan tampilkan
   ajakan top-up; untuk paket tanpa AI: ganti penjelasan (`AI_PLAN_LOCKED_COPY`) atau tidak render
   sama sekali.
2. `components/catetind/billing-panel.tsx` — band "Top Up AI Token" (`AI_FUEL_COPY.addonBand*`)
   masih tampil untuk semua paket. Sembunyikan bila `pq.unlimited` (tidak butuh) atau
   `!pq.aiEnabled` (tidak ada AI).
3. `components/catetind/weekly-recap-banner.tsx` — masih mengajak membuka rekap AI untuk tier 1;
   untuk paket tanpa `ai-report` tampilkan ajakan upgrade (`LockedFeatureNote`) atau sembunyikan.
4. `components/catetind/top-up-modal.tsx` — jangan biarkan bisa dibuka oleh paket tanpa AI.

**Aturan yang dipegang:** jangan pernah mengunci/menyembunyikan berdasarkan KETIDAKTAHUAN
(`planKnown === false`, mis. build demo tanpa Supabase) — kalau paket belum diketahui, perilakunya
seperti sekarang (jangan dikunci).

### TUGAS 5 — Landing live feed: berhenti mengarang bukti sosial

**Kondisi sekarang:** `components/landing/social-proof.tsx` masih membaca `LIVE_FEED_SEED`
(`lib/data/landing.ts`), sementara `GET /api/pricing/recent-purchases` sudah ada tapi tidak dipakai
siapa pun. Ini sisa audit §9.9 `docs/STATUS-HALAMAN.md`.

**Yang harus dikerjakan:**

1. `social-proof.tsx` membaca `/api/pricing/recent-purchases`.
2. **Seed hanya boleh tampil bila `SHOWS_SAMPLE_DATA`** (`lib/demo.ts`) — pola yang sama dengan
   store lain. Di produksi: kalau daftar kosong → tampilkan keadaan kosong yang JUJUR (mis. sembunyikan
   bagian feed / tulis "belum ada pembelian terbaru"), **bukan** daftar karangan.
3. Jangan menambah angka/nama baru di komponen; kalau butuh copy baru, taruh di `lib/data/landing.ts`.
4. Perbarui baris §9.9 di `docs/STATUS-HALAMAN.md`.

### TUGAS 6 — Reward referral otomatis (webhook → grant) + sambungkan data referral

**Kondisi sekarang:** `app/api/referral/reward/route.ts` membalas **503** ("belum ada pembayaran"),
dan `lib/data/referral.ts` masih MOCK (kode `RINA-X7K`, statistik teman, `REFERRAL_HISTORY`).

**Yang harus dikerjakan:**

1. **Grant reward dari webhook pemenuhan** (bukan dari klien): setelah pembelian terpenuhi dan
   pembeli punya `referred_by`, berikan reward ke pengundang. Reward sejak paket 84 = **Token AI**
   (tidak ada tambahan hari — lihat `getReferrerReward()`), dan **idempoten per `order_id`**
   (notifikasi ganda tidak boleh memberi reward dua kali).
2. `POST /api/referral/reward` mengembalikan **503 jujur** kalau Midtrans/Supabase belum
   dikonfigurasi (jangan mengarang sukses), dan **jangan** dipakai sebagai jalur pemberian reward
   dari klien.
3. `lib/data/referral.ts`: ganti data mock dengan pembacaan nyata (kode milik user dari sesi,
   riwayat teman dari tabel referral + `purchases`), atau kalau belum bisa, **pertahankan mock-nya
   TAPI pastikan seluruh halaman menyatakan "contoh" / bergerbang `SHOWS_SAMPLE_DATA`** — jangan
   menampilkan statistik teman karangan sebagai milik user.
4. Test baru bila logika reward murni ditambahkan (mis. perhitungan token reward idempoten).

### TUGAS 7 — Kerapian sisa paket 84 (kecil, jangan dilewatkan)

1. `components/catetind/registration-sheet.tsx:~57` — komentar masih menyebut `period=…` (stale;
   parameter itu sudah dihapus).
2. `lib/data/auth.test.ts` — fixture memakai `?plan=waras&period=annual`; boleh dibiarkan (menguji
   query apa pun dipertahankan), tapi lebih rapi kalau diganti ke bentuk baru tanpa `period`.
3. Saklar demo yang belum diputuskan: `DEMO_PARTNER_JOINED`, `DEMO_JOINED_CELEBRATION`,
   `DEMO_REALTIME_MOCK` di `lib/data/joint.ts`. Putuskan konsistensinya, dan **jangan melonggarkan**
   `lib/demo.test.ts` supaya hijau — kalau kontraknya memang berubah, ubah kontraknya secara sadar
   dan jelaskan di laporan. (Catatan paket 84: `DEMO_PARTNER_JOINED` sengaja tetap `DEMO_MODE`;
   baca komentarnya sebelum mengubah.)
4. Label menu "Langganan" di `components/catetind/settings-shell.tsx` (opsional, kosmetik) — kalau
   diubah, samakan dengan judul panel `settings-panel-billing.tsx`.

### TUGAS 8 — USULAN (jangan dikerjakan tanpa izin user)

Pindahkan `PhoneStage` + `ScreenShell` ke route group `app/(app)/layout.tsx` supaya `loading.tsx`
bisa dipakai di semua halaman app tanpa menghilangkan sidebar. **Usulkan dulu, tunggu jawaban.**
Alasan lengkapnya ada di komentar panjang `components/catetind/screen-skeleton.tsx`.

---

## 5. VERIFIKASI & DEFINITION OF DONE

Wajib dijalankan dan **hasilnya dilaporkan**:

```powershell
pnpm exec tsc --noEmit      # harus 0 error
pnpm test                   # minimal 82 file / 1106 test — baseline paket 84, tidak boleh turun
pnpm build                  # harus sukses
pnpm theme:audit            # harus TETAP "palet bersih" (baseline sudah hijau!)
pnpm supabase:migrate       # kalau kredensial ada; kalau tidak → LAPORKAN jujur
pnpm supabase:verify        # idem
```

**Test baru yang EXPECTED ada:**

- `rankOf()`/urutan tier mengunci `catet-aja=1 < waras=2 < sultan=3` (sinkron dengan SQL).
- `/api/payment/charge`: `topup` menolak nominal salah (422), menerima harga kanon (200).
- `/api/payment/webhook`: nominal notifikasi beda dari `expected_amount` → **tidak memenuhi** + 200 `ok:false`.
- `planQuota()` untuk 3 paket + `null`.
- Logika pemenuhan yang bisa diuji di TS (mis. "upgrade tidak pernah menurunkan tier") kalau kamu
  memindahkan aturannya ke fungsi murni — **disarankan**, karena SQL tidak punya test di repo ini.

**Test yang TIDAK boleh diubah supaya hijau:** `lib/demo.test.ts`, `lib/data/pricing.test.ts`,
`lib/subscription/*.test.ts`, dan test route yang sudah ada. Kalau sebuah test gagal, perbaiki
KODE-nya — bukan testnya. Kalau kamu yakin testnya yang salah, jelaskan alasannya di laporan.

**Dokumentasi yang harus diperbarui:**

- `docs/STATUS-HALAMAN.md` — status #18 Billing, §9.3 (top-up), §9.7 (reward referral), §9.9 (live feed).
- `docs/handoff/laporan/85-*.md` — laporan hasil (konvensi folder itu sudah ada; lihat laporan 84).

---

## 6. LARANGAN & GOTCHA

- **Jangan hidupkan kembali** langganan/periode/perpanjangan/grace period/auto-renew/`annual`/
  `monthly` dalam bentuk apa pun (kode MAUPUN SQL). Ini keputusan produk yang sudah final.
- **Angka harga HANYA di `lib/data/pricing.ts`** (paket) dan `lib/ai-quota.ts` (add-on token).
  Tidak ada nominal di JSX/komponen/komentar alur; CTA yang menyebut rupiah harus membaca dari fungsi.
- **Copy user-facing WAJIB di berkas data** (`lib/data/*`, `lib/legal/*`, `lib/ai-quota.ts`,
  `lib/weekly-recap.ts`). NOL string kalimat di JSX — termasuk label tombol baru.
- **Jangan bikin provider status kedua.** `subscription-gate-provider.tsx` sudah jadi gerbang global
  di `app/layout.tsx`; perluas, jangan duplikasi.
- **Jangan bikin komponen pembayaran kedua.** Instruksi bayar yang sudah ada:
  `components/catetind/payment-instruction-card.tsx` + alur `/checkout/bayar`.
- **Jangan menghidupkan Snap/hosted Midtrans.** Pembayaran = Core API di dalam app (paket 83).
- **Migrasi: DILARANG mengedit berkas migrasi yang sudah tercatat** di
  `supabase_migrations.schema_migrations` (`202609*`, `20261004120000`, `20261009120000`,
  `20261010120000`, `20261010130000`). Perbaikan = migrasi BARU dengan timestamp lebih besar,
  idempoten, dan aman diulang.
- **Jangan mengklaim pemenuhan/akses "sudah benar" tanpa bukti.** Kalau RPC belum bisa dijalankan,
  tulis di laporan apa yang sudah diverifikasi dan apa yang belum.
- **Jangan melonggarkan `pnpm theme:audit`** (palet) atau `lib/demo.test.ts` (kontrak saklar demo)
  hanya supaya hijau. Menambah warna ke daftar izin = mengubah aturan, bukan memperbaiki.
- **Jangan menghapus/menyalakan paksa `middleware.ts`** — ia sengaja hanya aktif kalau Supabase
  terkonfigurasi DAN `NEXT_PUBLIC_DEMO !== '1'`, supaya build demo tetap bisa dijelajahi.
- **Line ending CRLF.** Kalau menyunting lewat script, hormati EOL berkas.
- `lib/data/*` **bebas React** (tanpa hook/JSX) — jangan mengimpor komponen di sana.
- `next-env.d.ts` berubah sendiri tiap `pnpm build` — itu normal, **jangan** diklaim sebagai perbaikan.
- **`pnpm test` sekarang 82 file / 1106 test.** Kalau angkanya turun, ada test yang hilang — selidiki.

---

## 7. PERTANYAAN TERBUKA (tanyakan ke user SEBELUM implementasi kalau jawabannya mengubah desain)

1. **Pembeli lama yang masih punya masa aktif** (baris `user_subscriptions` lama dengan
   `expires_at` bertanggal, `is_lifetime = false`): mau diperlakukan bagaimana?
   - (a) dibiarkan sampai `expires_at` habis (mereka akan kehilangan akses — bertentangan dengan
     semangat akses selamanya),
   - (b) **dijadikan akses selamanya** (goodwill sekali jalan: `is_lifetime = true`, `expires_at = NULL`),
     dengan tier sesuai `LEGACY_TIER_MAP`,
   - (c) dibiarkan tapi diberi perpanjangan otomatis satu periode penuh.
   **Rekomendasi saya: (b)**, dan tulis alasannya di migrasi + laporan. Ini keputusan bisnis, bukan teknis.
2. **Konfirmasi pemetaan pembeli lama**: `founding_member|lifetime → sultan`, `yearly|annual → waras`,
   `monthly → catet-aja`. Paket 84 sudah memakainya di kode; migrasi harus sama.
3. **`sultan` fair-use**: apakah ada batas angka (mis. X pesan/hari) yang perlu DITEGAKKAN di server,
   atau cukup ditulis sebagai kebijakan? (Sekarang hanya ditulis, tidak ditegakkan.)
4. **Token AI masih dijual?** Kalau ya: (a) berlaku selamanya, (b) apakah pembeli `sultan`
   (unlimited) tetap boleh membeli token? Ini menentukan apakah TUGAS 3 penuh atau disederhanakan.
5. **Reward referral**: satu bentuk (1 bulan Token AI) tetap dipakai? Diberikan ke pengundang untuk
   pembelian paket apa pun, atau hanya paket berbayar tertentu?
6. **Izin route group `app/(app)/layout.tsx`** (TUGAS 8) — boleh dikerjakan atau tidak.
7. **Backfill pembeli yang TERLANJUR dirugikan bug TUGAS 1**: kalau ada pembelian `lifetime` yang
   sudah dipenuhi dengan `expires_at = +30 hari`, apakah barisnya perlu dibetulkan mundur
   (`update ... set is_lifetime = true, expires_at = null`)? Rekomendasi: **ya**, dengan `where`
   sempit yang hanya menyasar baris dengan `tier_name` paket baru + `is_lifetime = false`.

---

## 8. URUTAN KERJA YANG DISARANKAN

1. **TUGAS 1 (SQL pemenuhan akses selamanya) + TUGAS 2 (verifikasi nominal).** Ini yang
   paling gawat; keduanya menyentuh migrasi yang sama, jadi kerjakan bersama. Jalankan
   tsc/test/build setelah selesai.
2. **TUGAS 4 (kuota per paket di 3 permukaan)** — murni UI + `planQuota()`, tidak menyentuh DB,
   jadi bisa jalan paralel dengan pemikiran soal SQL.
3. **TUGAS 3 (token AI nyata)** — bergantung pada TUGAS 1/2 untuk tabel & RPC pemenuhan.
4. **TUGAS 6 (reward referral)** — bergantung pada webhook yang sudah diverifikasi di TUGAS 2.
5. **TUGAS 5 (live feed)** dan **TUGAS 7 (kerapian)** — kecil, kerjakan di akhir.
6. **TUGAS 8** hanya kalau user menjawab "boleh".
7. Perbarui `docs/STATUS-HALAMAN.md`, tulis laporan `docs/handoff/laporan/85-*.md`, lalu
   **laporkan seluruh keputusan yang kamu ambil sendiri beserta alasannya** ke user
   (terutama jawaban §7.1 — perlakuan pembeli lama).
