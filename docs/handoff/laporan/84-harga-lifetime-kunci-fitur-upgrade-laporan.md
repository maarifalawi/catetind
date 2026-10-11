# LAPORAN paket 84 — harga akses selamanya · kunci fitur per tier · upgrade

> Ringkas, tapi lengkap: apa yang berubah, keputusan yang saya ambil sendiri
> beserta alasannya, dan hasil verifikasi. Semua berkas yang disebut bisa dibuka
> langsung di repo ini.

---

## 1. Hasil verifikasi (WAJIB, dijalankan di akhir)

```
pnpm exec tsc --noEmit   → 0 error
pnpm test                → 82 file / 1106 test LULUS (sebelum: 79 file / 1053)
pnpm build               → sukses ("Compiled successfully", 39/39 halaman)
pnpm theme:audit         → ✅ PALET BERSIH (sebelum: 24 pelanggaran)
```

`pnpm theme:audit` yang dulu merah sekarang hijau, dan **bukan** dengan
melonggarkan aturannya: 23 hex di `components/catetind/plant-illustration.tsx`
dipetakan ke warna palet terdekat (mis. `#8fbba0 → #91bb9e`, `#50695a →
#52685c`, `#ffe7b4 → #f6edb7`), dan 1 `bg-white` di
`payment-instruction-card.tsx` menjadi `bg-canvas` (token palet yang memang
putih). Tidak ada warna baru yang ditambahkan ke daftar izin.

---

## 2. TUGAS 1 — harga akses selamanya + kunci fitur + upgrade

### 2a. `lib/data/pricing.ts` = satu-satunya sumber harga & kemampuan

- `PLANS` sekarang: `catet-aja` (109.000, rank 1), `waras` (129.000, rank 2,
  hero), `sultan` (299.000, rank 3). Properti `annual`/`monthly` **hilang**,
  diganti `lifetime` + `rank`.
- `BillingPeriod` tinggal satu nilai: `'lifetime'`.
- DIHAPUS dari file ini: `MONTHS_CHARGED_PER_YEAR`, `monthlyPrice()`,
  `annualSavingsPct()`, `perMonthAnchor()`, `SELLABLE_PERIODS`,
  `isSellablePeriod()`, `BILLING_PERIOD_LABEL`, `PERIOD_CHOICE_LABEL`,
  `periodNote()`, `PERIOD_NOTE`, `NO_AUTO_RENEW_BADGE`, `CATET_AJA_PLAN`,
  `ANNUAL_PLANS`/`AnnualPlan`, `FOUNDING_MEMBER`/`LifetimePlan`,
  `staticPriceState()`/`PriceState`/`FOUNDING_MEMBER_SLOTS`, dan seluruh copy
  periode.
- Ditambahkan: `priceFor()`, `upgradeDiff()`, `isDowngradeOrSame()`,
  `planById()`, `rankOf()`, peta `PLAN_CAPABILITIES`, `capabilitiesOf()`,
  `canUse()`, `capabilityUnlockedBy()`, `lockedCapabilitiesFor()`,
  `CAPABILITY_LABEL`, `lockedBadgeText()`, `buildUpgradeHref()`, copy
  `UPGRADE_COPY` + `LOCKED_FEATURE_COPY`, `SEKALI_BAYAR_BADGE`, `LIFETIME_LABEL`,
  dan `REFERRED_FRIEND_BENEFIT` (dipindah ke sini supaya `pricing.ts` tidak lagi
  bergantung pada `referral.ts` — arah impor jadi bersih).

### 2b. Kunci fitur = peta kemampuan, **dan benar-benar terkunci di server**

- Peta kemampuan (8): `ai-chat`, `ai-categorize`, `ocr`, `voice`, `ai-report`,
  `joint-wallet`, `ai-unlimited`, `priority-support`.
  · tier 1 = kosong · tier 2 = 6 kemampuan pertama · tier 3 = semuanya.
- **Server menolak**: `lib/subscription/capability.ts` (`requireCapability()`)
  dipasang sebagai baris pertama `POST /api/ai/text` (`ai-chat`),
  `/api/ai/ocr` (`ocr`), `/api/ai/categorize` (`ai-categorize`), dan
  `/api/parse-voice` (`voice`).
- **Nominal selalu dihitung server**: `POST /api/payment/charge` membaca paket
  yang tersimpan (`readCallerPlan()` → `user_subscriptions`), lalu memakai
  `priceFor()`. `purpose: 'upgrade'` divalidasi: target harus LEBIH TINGGI
  (`403 not-upgrade`), dan kalau nominal tidak sama dengan selisih → `422`.
- **Klien**: `subscription-gate-provider.tsx` diperluas (bukan provider kedua)
  menjadi `{ plan, planId, purchasedAt, capabilities, canUse, planKnown,
  inputLocked, onPublicRoute, refresh }`, membaca `/api/subscription` setelah
  mount (aman hydration).
- **UI terkunci**: komponen baru `components/catetind/locked-feature-note.tsx`
  (badge 🔒 + nama paket pembuka + CTA yang menyebut **selisihnya** dari
  `priceFor()`), dipasang di `ai-chat-widget.tsx`, `ai-capture-bubble.tsx`,
  `weekly-recap-modal.tsx`, dan `joint-screen.tsx`.
- **Kuota AI per paket**: `planQuota()` di `lib/ai-quota.ts` (tier 1 = tanpa AI,
  tier 2 = kuota dasar bulanan, tier 3 = tanpa batas + catatan fair-use), dipakai
  `ai-fuel-card.tsx` dan `FuelGaugeCard` di `billing-panel.tsx`.

### 2c. Sumber kebenaran paket user

- `app/api/subscription/route.ts` mengembalikan `{ ok, configured, active,
  planId, purchasedAt }`.
- `lib/subscription/plan.ts` membaca `user_subscriptions` dengan token
  pemanggil dan membedakan tiga hal: **tidak dikonfigurasi**, **belum beli**,
  dan **gagal membaca** (`failed: true`) — ini yang membuat guard bisa
  fail-closed tanpa menuduh user.

### 2d. Harga landing & sisa periode

- `LANDING_TIERS[].price` **diturunkan** dari `PLANS[].lifetime` lewat
  `landingTier()`; blok `CATATAN HARGA` yang lama dihapus; `periodLabel` =
  `LIFETIME_LABEL`; meta/FAQ/live-feed/trust-badge tidak lagi menulis angka
  tangan (pakai `formatIDR(PLANS[…].lifetime)` atau `PRICE_RANGE_LABEL`).
- `REGISTERED_PURCHASE_PERIOD` **dihapus**; parameter `period` hilang dari
  `/registered`, `/checkout`, `/checkout/bayar`, `CheckoutScreen`,
  `PaymentStartScreen`.
- `app/checkout/bayar/page.tsx` sekarang menghitung paket yang sudah dimiliki
  **di server** (cookie → PostgREST) dan mengirim `ownedPlanId` + `isUpgrade`
  ke layar bayar — jadi angka yang dilihat user di halaman itu sama persis
  dengan angka yang diverifikasi route (tidak ada lomba waktu dengan provider
  status di klien).
- **Diputuskan & dilaporkan**: `components/catetind/annual-plan-modal.tsx` dan
  `components/catetind/snap-payment-sheet.tsx` **DIHAPUS** (bukan dibiarkan
  mati). Keduanya sudah tidak pernah dibuka dari alur mana pun sejak paket 83;
  mempertahankannya berarti menyimpan dua jalur setengah jalan yang menjual
  paket tahunan dan Snap — persis yang dilarang prompt.
- `components/catetind/checkout-screen.tsx`: pemilih periode dihapus total;
  yang tampil cuma `LIFETIME_LABEL`, dan daftar fitur terkunci dijelaskan.

---

## 3. TUGAS 2 — nasib alur PERPANJANGAN → dijadikan UPGRADE

Karena akses sekarang selamanya, perpanjangan tidak punya arti. Yang saya
kerjakan (sesuai rekomendasi prompt, dengan satu deviasi yang dijelaskan di §6):

1. **Ganti peran, bukan alur baru.** `lib/data/renewal.ts` → `lib/data/upgrade.ts`:
   `nextTier()`, `upgradeTargets()`, `upgradeAmount()`,
   `capabilityUpgradeOffer()`, `upgradeBannerCopy()`, `FEATURE_LOCK_COPY`,
   `PLANT_SLEEP_COPY`.
2. **`renewal-modal.tsx` + `annual-plan-modal.tsx` → SATU komponen baru**
   `components/catetind/upgrade-modal.tsx` (menampilkan selisih dari
   `priceFor()`, CTA ke `/checkout/bayar?plan=<target>`). Kedua berkas lama
   dihapus supaya tidak ada dua modal hidup.
3. **`subscription-banner.tsx`** ditulis ulang: user yang belum beli → ajakan
   memilih paket; user yang sudah beli tapi belum di puncak → ajakan upgrade
   dengan selisihnya; di tier tertinggi → tidak dirender. Banner **hanya muncul
   saat paket user benar-benar diketahui**, dan sekarang bisa ditutup (dulu
   sengaja tidak bisa, karena ia menjelaskan tombol yang mati — sekarang tidak
   ada tombol mati yang bergantung padanya).
4. **Fase grace/post-grace DIBUANG** dengan komentar tegas di
   `lib/data/upgrade.ts` dan `subscription-gate-provider.tsx` (alasan: mustahil
   untuk paket akses selamanya; mempertahankannya = layar yang menceritakan
   keadaan yang tidak ada). Yang dipakai ulang bukan fasenya, tapi **gerbang
   inputnya**, dengan pemicu baru: "belum punya paket".
5. **Copy** "masa tenggang", "H-1", "perpanjang sekarang" sudah hilang dari
   `lib/legal/terms.ts`, `lib/legal/privacy.ts`, dan `lib/data/help.ts`.

---

## 4. TUGAS 3 — identitas & data demo

- `settings-panel-account.tsx`: `MEMBER_BADGE = '🏆 Founding Member #47'`
  (angka member KARANGAN) dihapus. Badge sekarang turunan paket nyata
  (`🏆 Akses Selamanya · <nama paket>` + tanggal beli kalau ada), dan **tidak
  dirender sama sekali** kalau paketnya belum diketahui.
- `lib/money/store.ts`: fallback nama pemegang dompet `'Jon Snow'` (identitas
  karangan untuk dompet baru) → string kosong, dengan komentar bahwa nama
  sebenarnya datang dari sesi saat disimpan ke server (`POST /api/wallets`
  menulis `holder: auth.user.name`).
- `referralState.referralCode` diberi komentar "produksi: dari endpoint
  referral" (polanya sudah ada di file itu).
- GREP `Jon Snow|jon@snow|Founding Member|RINA-X7K` → sisanya hanya:
  seed dompet (`lib/wallets.ts`) yang dipakai HANYA saat `SHOWS_SAMPLE_DATA`,
  placeholder contoh kode di halaman checkout, dan fixture test. Tidak ada lagi
  yang tampil sebagai milik user.
- **Deviasi yang dilaporkan** soal `DEMO_PARTNER_JOINED`: lihat §6.

---

## 5. TUGAS 4 & 5 — manifest, skeleton

- `app/manifest.ts`: `orientation: 'portrait'` **dihapus** (semua halaman punya
  tata letak `lg:`; memaksa portrait merusak tablet & foldable), dan
  `shortcuts` **ditambahkan**: Catat (`/app`), Wallet (`/wallet`), Budget
  (`/budget`). `start_url: '/app'` & `scope: '/'` dibiarkan.
- `components/catetind/screen-skeleton.tsx` (baru): kerangka kartu dengan token
  palet repo, `aria-busy`, animasi yang menghormati `prefers-reduced-motion`.
  Dipakai `app/settings/loading.tsx` — **dan itu satu-satunya `loading.tsx` di
  repo**, karena di sana sidebar berasal dari `app/settings/layout.tsx` sehingga
  navigasi tetap hidup. Alasan arsitekturnya ditulis panjang di dalam
  `screen-skeleton.tsx` supaya orang berikutnya tidak "memperbaikinya" menjadi
  `app/loading.tsx` global (yang akan menghapus sidebar selama transisi).
  Opsi route-group `app/(app)/layout.tsx` **tidak** dikerjakan (butuh izin user,
  risikonya besar) — saya usulkan di §7.

---

## 6. KEPUTUSAN YANG DIAMBIL SENDIRI (beserta alasannya)

1. **Alur perpanjangan: diganti upgrade, bukan dipelihara.** Alasan: keputusan
   produk §2.1 menyatakan tidak ada masa aktif/grace/kedaluwarsa, jadi layar
   perpanjangan akan menampilkan keadaan yang mustahil.
2. **`annual-plan-modal.tsx` + `snap-payment-sheet.tsx` + `GET /api/price` +
   `hooks/use-renewal-reminder.ts` + `hooks/use-fomo-counter.ts` DIHAPUS.**
   Semuanya hanya melayani model lama (paket tahunan, Snap, harga bergerak,
   FOMO counter). Menyimpannya = komponen mati yang menyesatkan (aturan
   eksplisit prompt), dan `GET /api/price` untuk harga bergerak padahal harga
   tidak bergerak lagi = endpoint yang mengaku jalan.
3. **`requireCapability()` fail-open saat backend TIDAK terkonfigurasi, dan
   fail-closed saat baca DB gagal.** Di build demo/test paket user memang tidak
   bisa diketahui, jadi mengunci semua orang akan memenjarakan demo dan pemilik
   paket saat Supabase sedang mati; sebaliknya, saat kita POSITIF tahu paketnya
   kurang → **403**, dan saat kita tahu kita *gagal* membaca → **503** yang
   jujur. Tidak ada jalur yang membalas 200 dengan akses yang belum tentu sah.
4. **User yang belum pernah bayar:** di build demo TIDAK dikunci total (paket
   tidak diketahui), tapi saat backend aktif semua fitur berbayar tertutup dan
   pencatatan ditahan (`inputLocked` — gerbang yang SUDAH ada sejak paket 23,
   sekarang pemicunya "belum ada paket"). **Ini pertanyaan terbuka §7.1 prompt**;
   kalau user mau app benar-benar read-only juga di build demo, jawabannya
   cukup satu baris di provider.
5. **Pemetaan paket pembeli lama** (§7.3 prompt): `founding_member`/`lifetime`
   → **sultan**, `yearly`/`annual` → **waras**, `monthly` → **catet-aja**
   (`LEGACY_TIER_MAP` di `lib/subscription/plan.ts`). Produk lama yang paling
   mahal dipetakan ke tier paling mahal, jadi tidak ada pembeli lama yang
   kehilangan akses; pemetaan ini hanya BACA, tidak pernah ditulis balik ke DB.
   **Perlu konfirmasi user.**
6. **`sultan` = tanpa batas kuota, tapi fair-use DITULIS** (§7.4 prompt):
   `AI_UNLIMITED_NOTE` di `lib/ai-quota.ts` dan paragraf kuota di ToS/privacy
   menyebut pemakaian wajar secara terbuka — bukan pembatasan diam-diam.
7. **`DEMO_PARTNER_JOINED` tetap memakai `DEMO_MODE`, bukan
   `SHOWS_SAMPLE_DATA` seperti saran prompt.** Alasannya: nilainya dikunci
   `lib/demo.test.ts` sebagai kontrak "satu gerbang `NEXT_PUBLIC_DEMO` untuk
   SEMUA saklar review"; memindahkannya ke `SHOWS_SAMPLE_DATA` (yang `true` di
   test) mematahkan kontrak itu dan memunculkan pasangan contoh di setiap run
   test. Hasil yang diminta prompt tetap tercapai: **build produksi bernilai
   `false`** → keadaan kosong jujur + CTA "Undang pasangan". Catatannya ditulis
   di `lib/data/joint.ts`.
8. **Kuota AI jadi tanggung jawab paket, tapi angkanya tidak diduplikasi.**
   Yang berbeda per paket hanya "boleh dipakai" dan "batasnya berlaku"; total
   token tetap SATU angka (`AI_BASE_TOKENS_TOTAL`) supaya ToS, kartu sidebar,
   dan banner Home tidak bisa beda cerita.
9. **Hanya `app/settings/loading.tsx`** sebagai loading state; tidak ada
   `app/loading.tsx` global (alasan di §5).
10. **Nama bagian "Langganan" & nama berkas `billing-panel.tsx` /
    `settings-panel-billing.tsx` TIDAK di-rename.** Keduanya masih akurat
    sebagai nama *bagian* (paket & tagihan), dan mengganti nama berkas akan
    menyentuh banyak impor tanpa manfaat produk.
11. **Label badge terkunci memakai `capabilityUnlockedBy()`** (paket TERENDAH
    yang membuka), bukan paket berikutnya — supaya "buka di Paket Waras" tidak
    berubah arti kalau user sudah di Waras dan memakai fitur Sultan.

---

## 7. Yang belum dikerjakan / perlu keputusan lanjutan

1. **`app/(app)/layout.tsx` (route group)** untuk memungkinkan skeleton di
   semua halaman app — sengaja belum, sesuai instruksi "usulkan dulu".
2. **`lib/data/referral.ts` masih MOCK** (kode `RINA-X7K`, statistik teman),
   sudah diberi komentar "produksi: dari endpoint referral".
3. **`DEMO_JOINED_CELEBRATION` / `DEMO_REALTIME_MOCK`** masih saklar demo lama;
   tidak disentuh karena di luar lingkup.
4. **Tidak ada endpoint API khusus Joint Wallet** — datanya hidup di store
   klien (`lib/data/joint.ts`), jadi kuncinya saya pasang di layarnya
   (`joint-screen.tsx`), bukan di route server. Kalau nanti ada route API joint,
   `requireCapability(req, 'joint-wallet')` sudah tersedia untuk dipakai apa
   adanya.
5. **`top-up-modal.tsx`** (isi ulang token AI) masih berlabel TODO untuk
   pembayaran — di luar lingkup paket ini, tapi sekarang jadi satu-satunya jalur
   pembayaran yang tersisa di daftar TODO.

---

## 8. Daftar berkas (ringkas)

**Baru:** `lib/data/pricing.test.ts`, `lib/data/upgrade.ts`,
`lib/data/upgrade.test.ts`, `lib/subscription/plan.ts`,
`lib/subscription/plan.test.ts`, `lib/subscription/capability.ts`,
`lib/subscription/capability.test.ts`, `components/catetind/upgrade-modal.tsx`,
`components/catetind/locked-feature-note.tsx`,
`components/catetind/screen-skeleton.tsx`, `app/settings/loading.tsx`,
`docs/handoff/laporan/84-harga-lifetime-kunci-fitur-upgrade-laporan.md`.

**Ditulis ulang:** `lib/data/pricing.ts`,
`components/catetind/subscription-gate-provider.tsx`,
`components/catetind/subscription-banner.tsx`, `app/api/subscription/route.ts`,
`app/api/payment/charge/route.ts`.

**Dihapus:** `lib/data/renewal.ts`, `components/catetind/renewal-modal.tsx`,
`components/catetind/annual-plan-modal.tsx`,
`components/catetind/snap-payment-sheet.tsx`, `hooks/use-renewal-reminder.ts`,
`hooks/use-fomo-counter.ts`, `app/api/price/route.ts` + testnya.

**Disesuaikan:** `app/api/ai/{text,ocr,categorize}/route.ts`,
`app/api/parse-voice/route.ts`, `lib/payments/types.ts`, `lib/ai-quota.ts`,
`lib/data/landing.ts`, `lib/data/referral.ts`, `lib/legal/{terms,privacy}.ts`,
`lib/data/help.ts`, `lib/data/welcome.ts`, `lib/data/joint.ts`,
`lib/money/store.ts`, `lib/weekly-recap.ts`, `app/manifest.ts`,
`app/checkout/**`, `app/registered/page.tsx`, komponen `catetind/*` (checkout,
payment-start, ai-chat-widget, ai-capture-bubble, weekly-recap-modal,
joint-screen, home-banner, home-screen, billing-panel, referral-screen,
share-preview-screen, settings-panel-account, settings-panel-billing,
subscription-lock-note, plant-illustration, plant-widget,
payment-instruction-card), `components/MobileBottomNav.tsx`,
`components/dashboard/transaction-input-engine.tsx`, `docs/STATUS-HALAMAN.md`.
