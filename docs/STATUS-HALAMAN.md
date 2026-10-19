# 📋 STATUS HALAMAN CATETIND — Audit PRD vs Implementasi

> **Tujuan:** memetakan SETIAP halaman/modal/state/flow yang diminta PRD terhadap
> apa yang benar-benar ada di repo — supaya jelas mana yang **selesai**, mana yang
> **sebagian (mock)**, dan mana yang **belum dibuat** (beserta alasannya).
>
> **Tanggal audit:** 4 Okt 2026
> **Basis kode:** `app/**`, `components/**`, `lib/**`, `supabase/**`
> **Kanon yang dipakai:** `inventaris_ui_definitif.md` (32 halaman · 22 modal ·
> 15 state · 8 flow) + `CatetInd_Master_PRD_Lengkap.md` (Domain 1–8).

---

## 1. Ringkasan eksekutif

| Kategori (kanon PRD) | Jumlah | ✅ Selesai | ⚠️ Sebagian/mock | ❌ Belum |
|---|---|---|---|---|
| **Halaman (route)** | 32 | 26 | 5 | 1 |
| **Modal / Sheet / Overlay** | 22 | 17 | 4 | 1 |
| **Important States** | 15 | 13 | 1 | 1 |
| **Key Flows** | 8 | 4 | 3 | 1 |
| **API endpoint pendukung** | — | 6 ada | — | 6+ belum |

**Kesimpulan satu paragraf:** **hampir seluruh halaman sudah dibangun** (31 dari 32
route inventaris ada; 1 halaman waitlist sengaja di luar scope). Yang membuat
sebuah halaman belum "100% sesuai PRD" **hampir selalu bukan halamannya sendiri**,
melainkan **lapisan backend yang masih mock**: pembayaran Midtrans,
mesin AI (DeepSeek), generator gambar share, dan reward referral
otomatis. Repo ini memang **repo DESIGN/DEMO** (data mock di `lib/data/*`,
komentar arah produksi di titik integrasi).

---

## 2. Legenda status

| Tanda | Arti |
|---|---|
| ✅ | **Selesai** sesuai inventaris + PRD (UI + state + data). |
| ⚠️ | **Sebagian / mock** — halaman/UI-nya ada dan hidup, tapi satu bagian bergantung pada backend nyata yang belum ada (mis. Midtrans, harga API, AI). |
| ❌ | **Belum dibuat** — tidak ada route/komponennya. |
| 🧩 | **Deviasi disengaja** — beda dari inventaris, tapi ada alasan desain (bukan utang). |

---

## 3. Tabel A — 32 Halaman (route kanon inventaris)

> Kolom **Route nyata** = path yang benar-benar ada di `app/**`. Inventaris
> menulis sebagian route sebagai `/app/wallet`, `/app/history`, dst.; di repo
> **prefix `/app` hanya dipakai untuk Dashboard & Onboarding** (🧩 deviasi
> konsisten, lihat §10).

| # | Halaman | Route inventaris | Route nyata | Status | Bukti / catatan |
|---|---|---|---|---|---|
| 1 | **Pre-Launch Waitlist** | `/` (pra-launch) | — | ❌ | **DILUAR SCOPE** (`CONTEXT-WAJIB.md:326`). Fitur antrian/referral waitlist tidak ada; `/` sekarang = landing (#2). |
| 2 | **Full Landing Page** | `/` | `/` (`app/page.tsx`) | ✅ | Hero, Pain Calculator, Wealth Gap, Social Proof + Live Feed, Pricing Counter, FAQ, Sticky CTA — semua ada. Live Feed masih **seeded**. |
| 3 | **Checkout Page** | `/checkout` | `/checkout` | ✅ | UI lengkap; **harga tunggal per paket, sekali bayar untuk akses selamanya** (109k/129k/299k, dari `lib/data/pricing.ts`). Pembayaran **nyata sejak paket 83**: Midtrans **Core API** — QRIS/VA/e-wallet/Mandiri Bill tampil di `/checkout/bayar`. **Paket 84:** pemilih periode dihapus, `GET /api/price` + `snap-payment-sheet.tsx` + `annual-plan-modal.tsx` DIHAPUS, dan nominal upgrade = selisih (`priceFor()`). |
| 4 | **Privacy Policy** | `/privacy` | `/privacy` | ✅ | Dokumen = data (`lib/legal/privacy.ts`) + `legal-shell`. |
| 5 | **Terms of Service** | `/terms` | `/terms` | ✅ | `lib/legal/terms.ts`. |
| 6 | **Cara Install PWA** | `/install` | `/install` | ✅ | `install-guide-screen.tsx` (+ QR & ilustrasi). |
| 7 | **Joint Wallet Invite Landing** | `/join/[code]` | `/join/[code]` | ✅ | `join-invite-screen.tsx` + `lib/invite-store.ts`. |
| 8 | **Login (Magic Link)** | `/login` | `/login` | ✅ | Kode 6 angka + tautan `/login/verify`, `public-navbar`. |
| 9 | **Cek Email / Callback** | `/login/verify` | `/login/verify` | ✅ | Baca `?email`,`?status`,… di server → `verify-email-screen`. |
| 10 | **Onboarding (3 step)** | `/app/onboarding` | `/app/onboarding` | ✅ | `onboarding-flow.tsx` (situasi → pemasukan/dompet → transaksi pertama). |
| 11 | **Home / Daily HUD** | `/app` | `/app` | ✅ | `home-screen.tsx` + HUD, tanaman, context switcher, banner kondisional. |
| 12 | **Wallet List** | `/app/wallet` | `/wallet` 🧩 | ✅ | `wallet-screen.tsx`; tambah dompet + pindah dana (sheet). |
| 13 | **Wallet Detail** | `/app/wallet/[id]` | `/wallet/[id]` 🧩 | ✅ | `wallet-detail-screen.tsx`; saldo dari store ledger. |
| 14 | **History & Insights** | `/app/history` | `/history` 🧩 | ✅ | `history-screen.tsx` + insight cards + heatmap; pintasan `?q=`. |
| 15 | **Settings (Menu Master)** | `/app/settings` | `/settings` 🧩 | ✅ | `settings-shell.tsx` (master–detail, sidebar tetap). |
| 16 | **Share Preview (Public)** | `/share/[id]` | `/share/[id]` | ⚠️ | Pratinjau kartu ada; **generator gambar** (untuk OG/IG Story) belum (`share/[id]/page.tsx:50`). |
| 17 | **Profil & Akun** | `/app/settings/profile` | `/settings` 🧩 | ✅ | Digabung sebagai section default `/settings` (`settings-panel-account.tsx`). |
| 18 | **Langganan & Billing** | `/app/settings/billing` | `/settings/billing` | ⚠️ | `billing-panel.tsx` + Fuel Gauge; kartu paket & jalur upgrade nyata (paket 84). Kuota AI kini per paket (`planQuota()`): tier 1 tanpa AI, tier 2 berkuota, tier 3 tanpa batas. Top up token AI kini **nyata** (Midtrans Core API + `ai_addons`, paket 85) dan band Top-Up hanya tampil untuk paket berkuota. |
| 19 | **Tampilan & Tema** | `/app/settings/appearance` | `/settings/appearance` | ✅ | `settings-panel-preferences.tsx`. |
| 20 | **Kustomisasi Kategori** | `/app/settings/categories` | `/settings/categories` | ✅ | idem. |
| 21 | **AI Preferences** | `/app/settings/ai` | `/settings/ai` | ✅ | idem (+ `lib/ai-prefs.ts`). |
| 22 | **Notifikasi** | `/app/settings/notifications` | `/settings/notifications` | ✅ | `notification-settings.tsx` + Web Push (`lib/use-push-notifications.ts`). |
| 23 | **Keamanan / PIN Lock** | `/app/settings/security` | `/settings/security` | ✅ | PIN (PBKDF2) + biometrik WebAuthn. |
| 24 | **Budgeting** | `/app/budget` | `/budget` 🧩 | ✅ | `budget-screen.tsx` (Zona A/B) + tab periode + pintasan `?add=`,`?tanam=`. |
| 25 | **Goal / Sinking Fund Detail** | `/app/budget/[id]` | `/budget/[id]` 🧩 | ✅ | `goal-detail-screen.tsx`; celengan dari store perangkat. |
| 26 | **Tagihan / Recurring Bills** | `/app/bills` | `/bills` 🧩 | ✅ | `bills-screen.tsx` + tandai lunas/undo. |
| 27 | **Calendar View** | `/app/calendar` | `/calendar` 🧩 | ✅ | `cashflow-calendar-screen.tsx` + inspector hari. |
| 28 | **Joint Wallet** | `/app/joint` | `/joint` 🧩 | ✅ | `joint-screen.tsx` (timbangan, split, privat, invite). |
| 29 | **Wealth & Debt Tracking** | `/app/wealth` | `/wealth` 🧩 | ⚠️ | Tab 1 Investasi ✅ & Tab 3 Hutang ✅; **Tab 2 Properti = teaser** (PRD A12, lihat §10). |
| 30 | **Panduan / Help Center** | `/app/help` | `/help` 🧩 | ✅ | `help-center-screen.tsx` + Screenshot Policy. |
| 31 | **Referral Dashboard** | `/app/referral` | `/referral` 🧩 | ⚠️ | UI + `POST /api/referral/validate` ada. Diskon 10% kini **hanya sah bila kode terverifikasi server** (`/api/payment/charge`), relasi menulis `referred_user_id`, dan reward **diberikan otomatis dari webhook** (idempoten per `order_id`). Data kode/riwayat di halaman ini masih contoh dan ditandai "Contoh". |
| 32 | **404 / Not Found** | catch-all | `app/not-found.tsx` | ✅ | `not-found-screen.tsx`, status HTTP 404. |

**Rekap Tabel A:** ✅ 26 · ⚠️ 5 (#3, #16, #18, #29, #31) · ❌ 1 (#1).

---

## 4. Tabel B — Route tambahan (di luar 32 inventaris)

Route ini **nyata ada di repo** tetapi **tidak** termasuk 32 kanon inventaris
(entah karena digabung, jadi redirect, atau tambahan flow). Semuanya ✅ hidup.

| Route | File | Kenapa ada | Status |
|---|---|---|---|
| `/welcome` | `app/welcome/page.tsx` | Halaman depan publik (editorial gelap) sebelum punya akun — layar pertama. | ✅ |
| `/registered` | `app/registered/page.tsx` | Halaman "Terima kasih" setelah registrasi dari landing (`?email=`). | ✅ |
| `/insight` | `app/insight/page.tsx` | Rute lama → `redirect('/history')` (jaga bookmark lama). | ✅ (redirect) |
| `/settings/data` | `app/settings/data/page.tsx` | "Export Data Saya" (mendukung **Key Flow #4**). | ✅ |
| `/settings/logout` | `app/settings/logout/page.tsx` | Pintu keluar akun (juga disinggung inventaris #22). | ✅ |

> Catatan: root `/` = Landing (#2) dan dashboard ada di `/app`. Route mati lama
> (`/more`, `/family`, `/overview`) sudah **dihapus** — lihat §10.

---

## 5. Tabel C — 22 Modal / Bottom Sheet / Overlay

| # | Nama (inventaris) | Komponen repo | Status | Catatan |
|---|---|---|---|---|
| a | Manual Quick-Add | `dashboard/transaction-input-engine.tsx`, `transaction-bottom-sheet.tsx`, `transaction-web-modal.tsx` | ✅ | Ditulis ke ledger nyata (paket 33). |
| b | OCR Scan Struk | `ai-capture-bubble.tsx` | ⚠️ | UI + konfirmasi ada; **mesin OCR/AI mock** (tanpa DeepSeek). |
| c | Voice Input | `ai-capture-bubble.tsx` | ✅ | Web Speech API + form konfirmasi. |
| d | Detail Transaksi | `transaction-detail-sheet.tsx` | ✅ | |
| e | Edit Transaksi | `edit-transaction-sheet.tsx` | ✅ | Pre-filled. |
| f | Menu "Lainnya" | `mobile-nav-drawer.tsx` | ✅ | Grup sesuai `lib/navigation.ts`. |
| g | Weekly Recap (5 slide) | `weekly-recap-modal.tsx` | ✅ | + tombol Share. |
| h | Monthly Recap (5 slide shareable) | `share-progress-panel.tsx` + `share-achievement-card.tsx` + `/share/[id]` | ⚠️ | Jalur share ada; **ekspor gambar** ke IG Story belum. |
| i | Monthly Review & Target Setup | `monthly-review-modal.tsx` | ✅ | Auto-popup tgl 1–3 + set target. |
| j | Plant Detail View | `plant-detail-modal.tsx` | ✅ | HP, streak, stage. |
| k | Milestone Celebration | `milestone-celebration.tsx` + `confetti-overlay.tsx` | ✅ | Streak 7/14/21/30, stage up. |
| l | AI Token Purchase | `top-up-modal.tsx` | ⚠️ | Paket ada; pembayaran **nyata** lewat Midtrans Core API (paket 85) + instruksi bayar di modal. |
| m | Renewal Modal | — | ❌ | **DIHAPUS** di paket 84: tidak ada perpanjangan untuk akses selamanya. |
| n | Registration / Identifikasi | `registration-sheet.tsx` | ✅ | Email + nama panggilan (zero password). |
| o | Tambah Wallet / Akun | `add-wallet-sheet.tsx` | ✅ | |
| p | Tambah Tagihan | `add-bill-sheet.tsx` | ✅ | Emoji, nominal, due date. |
| q | Tambah Budget Baru | `add-budget-sheet.tsx` | ✅ | Progressive disclosure. |
| r | Tambah Sinking Fund (3 step) | `add-goal-sheet.tsx` | ✅ | |
| s | Kontribusi ke Sinking Fund | `contribute-sheet.tsx` | ✅ | |
| t | Tambah Investasi | `add-investment-sheet.tsx` | ✅ | Termasuk beli/jual & RDN. |
| u | Tambah Properti / Aset Fisik | — | ❌ | **PRD A12**: properti di luar V1 (teaser di `/wealth`, §10). |
| v | Tambah Debt / Utang-Piutang (dual form) | `add-debt-sheet.tsx` | ✅ | Simple + platform/berbunga. |
| w | Split Bill (4 mode) | `joint-split-sheet.tsx` | ✅ | + settlement summary. |

**Rekap Tabel C:** ✅ 17 · ⚠️ 4 (b, h, l, m) · ❌ 1 (u).

---

## 6. Tabel D — 15 Important States

| # | State | Di mana | Status | Bukti |
|---|---|---|---|---|
| I | Empty State — Transaksi Hari Ini | Home | ✅ | `recent-transactions-card.tsx`. |
| II | Empty State — Per Modul | Budget/Bills/Wealth/Joint | ✅ | Empty state + CTA di tiap screen. |
| III | Kunci belum-ada-paket (read-only) | Semua halaman app | ✅ | `subscription-gate-provider.tsx` + `subscription-banner.tsx`. Paket 84: pemicunya bukan grace period, tapi user yang belum punya paket. |
| IV | ~~Post-Grace Period~~ | — | ➖ | **Dihapus di paket 84**: tidak ada masa aktif, jadi fase ini mustahil. `lib/data/renewal.ts` diganti `lib/data/upgrade.ts`. |
| V | Tanaman Layu (HP ≤20) | Home | ✅ | `plant-illustration.tsx` (`wilted`). |
| VI | Tanaman Menunggu | Home (belum ada paket) | ✅ | `plant-illustration.tsx` (`sleeping`) + `PLANT_SLEEP_COPY` (kini di `lib/data/upgrade.ts`). |
| VII | Optimistic Transaction Loading | List transaksi | ✅ | Offline/optimistic (paket 42). |
| VIII | Failed Transaction (FAILED_PERMANENT) | List transaksi | ✅ | idem + retry manual. |
| IX | Offline App Shell | Semua halaman | ✅ | `offline-banner.tsx` + `public/sw.js`. |
| X | AI Fallback Error — Chat | AI Coach | ✅ | `lib/ai-chat.ts` (`AI_STATUS_COPY`). |
| XI | AI Fallback Error — OCR | Scan struk | ⚠️ | Copy ada; mesin OCR tetap mock. |
| XII | Daily Budget HUD Color States | Home → HUD | ✅ | `daily-hud-card.tsx`. |
| XIII | Dry Spell Card | Home/Budget | ✅ | `daily-hud-card.tsx` + `HUD_COPY.drySpell*`. |
| XIV | Early Access Checkout State | Landing/Checkout | ❌ | Bagian dari **waitlist** (DILUAR SCOPE). |
| XV | OCR Scanning Loading | Scan struk | ✅ | Loading bubble `ai-capture-bubble.tsx`. |

**Rekap Tabel D:** ✅ 13 · ⚠️ 1 (XI) · ❌ 1 (XIV).

---

## 7. Tabel E — 8 Key Flows

| # | Flow | Status | Apa yang kurang |
|---|---|---|---|
| 1 | Checkout & Onboarding | ⚠️ | Rantai `/checkout → /app/onboarding` jalan; **pembayaran Midtrans** mock. |
| 2 | Joint Wallet Onboarding | ✅ | `/joint` → invite 6 kar → `/join/[code]`. |
| 3 | Offline Transaction Retry | ✅ | Optimistic + retry queue + FAILED_PERMANENT. |
| 4 | Data Export ("Export Data Saya") | ✅ | `/settings/data` + `lib/money/export.ts` (unduh JSON nyata). |
| 5 | Share Report (Privacy-Safe) | ⚠️ | Kartu + pratinjau ada; **generate image** (slide 1/2/4) → IG Story belum. |
| 6 | Two-Sided Referral | ✅ | `/referral` + `POST /api/referral/validate`; diskon 10% divalidasi ke DB di `/api/payment/charge` (kode palsu/self-referral ditolak), `purchases.referral_code` menyimpan bukti, `referred_user_id` diisi (RPC + trigger), reward otomatis dari webhook. Data dashboard `/referral` masih contoh. |
| 7 | Waitlist Referral Loop | ❌ | Bergantung halaman waitlist (#1) yang di-skip. |
| 8 | Upgrade Paket (dulu Renewal Manual) | ✅ | Paket 84: posisi perpanjang diganti **upgrade**. `UpgradeModal` + `SubscriptionBanner` menampilkan SELISIH dari `priceFor()`, CTA ke `/checkout/bayar?plan=…`. Pembayaran nyata via Core API (paket 83). |

**Rekap Tabel E:** ✅ 5 · ⚠️ 2 · ❌ 1.

---

## 8. Tabel F — API endpoint

### Sudah ada (`app/api/**`)

| Endpoint | Method | Fungsi |
|---|---|---|
| `/api/session` | GET / DELETE / POST(405) | Identitas pemanggil & pintu keluar (POST demo ditutup). |
| `/api/wallets` | GET / POST | Daftar dompet (+`?context=`) & tambah dompet. |
| `/api/wallets/[id]` | GET / PUT / DELETE | Detail / ubah / hapus dompet. |
| `/api/push/subscribe` | POST / DELETE | Daftar / cabut subscription Web Push. |
| `/api/push/send` | POST | Kirim push (rate limit + jalur internal scheduler). |
| `/api/referral/validate` | POST | Validasi kode referral ke DB (RPC `validate_referral_code`). |

### Belum dibuat (dibutuhkan PRD)

| Endpoint (arah produksi) | Untuk | Sumber |
|---|---|---|
| ~~`GET /api/price`~~ | **DIHAPUS di paket 84** | harga tunggal per paket; tidak ada harga bergerak |
| `POST /api/payment/charge` + `GET /api/payment/status` + webhook Midtrans | Checkout pembelian pertama (3 tier × bulanan/tahunan) | PRD 4293. Sejak paket 83 tagihan dibuat di route ini (katalog metode: `lib/payments/methods.ts`); status dibaca route server — server key tidak pernah ke browser — dan pemenuhan tetap lewat webhook + RPC. Top-up/upgrade/renewal masih `TODO` (`top-up-modal`, `annual-plan-modal`, `renewal-modal`). |
| ~~`POST /api/subscription/cancel`~~ | **DIHAPUS di paket 84** | tidak ada langganan berulang untuk dibatalkan |
| `GET /api/joint/invite/:code` | Status invite server-side (auto-join setelah login) | PRD AC1; `join/[code]/page.tsx`. |
| `/api/export` (email) | Kirim JSON via email | Jalur email masih berlabel **Demo**. |
| Endpoint data (Supabase/RLS) | Wealth/Celengan/Tagihan pindah dari konstanta ke tabel | `CONTEXT-WAJIB.md:316`. |

> **Skema DB Supabase SUDAH ada** — `supabase/migrations/`: `..._core.sql`,
> `..._domains.sql`, `..._rls.sql`, `..._rpc.sql`, `..._referrals.sql`. Yang
> belum: **UI memindahkan pembacaannya** dari `lib/data/*` ke tabel itu.

---

## 9. Yang BELUM dibuat / belum diselesaikan (detail + alasan)

Diurutkan dari yang paling "belum" ke yang paling "sebagian".

### 9.1 ❌ Halaman Pre-Launch Waitlist (`/` versi antrian) — #1
- **Apa yang hilang:** mini pain calculator antrian, email capture, **posisi
  antrian** ("Kamu di #234"), **referral link waitlist**, tombol Share/Copy,
  dan **Waitlist Referral Loop** (+5 posisi per ajakan — PRD A2).
- **Alasan:** ditandai **DILUAR SCOPE** (`CONTEXT-WAJIB.md:326`, `ROADMAP-HALAMAN.md:247`).
  Yang tetap ada: email-capture di landing (`lead-sheet.tsx`) → `/registered`.
- **Kalau dikerjakan:** butuh tabel `waitlist` + `waitlist_referral` (skema di
  PRD 6151–6170), formula posisi (PRD 6172), dan halaman baru di `/`.

### 9.2 ❌ Modal Tambah Properti / Aset Fisik — u (dan Tab 2 `/wealth`)
- **Apa yang hilang:** form tambah & list properti/aset fisik.
- **Alasan:** **PRD Asumsi A12** — properti/aset fisik **TIDAK masuk V1**
  (beachhead first-jobber 22–27). Teaser "Segera" di `/wealth` **memang sesuai PRD**
  (`PROPERTY_V1_COPY` di `lib/data/wealth.ts:1309+`). **Bukan utang.**

### 9.3 ✅ Checkout + upgrade + top-up nyata (Midtrans Core API)
- **Sudah jalan (paket 83):** checkout pembelian pertama ditagih lewat **Midtrans Core API**;
  QRIS, Virtual Account (BCA/BRI/BNI/Permata), GoPay, ShopeePay, dan Mandiri Bill tampil
  **di dalam app** (`/checkout/bayar`) — user tidak pindah ke domain Midtrans.
  Webhook bertanda tangan SHA512 + RPC `catetind_fulfill_purchase` tetap SATU-SATUNYA jalur
  yang mengaktifkan akses; polling status di UI hanya untuk tampilan.
- **Bukti:** `app/api/payment/{charge,status}/route.ts`, `lib/payments/{methods,midtrans,types}.ts`
  + `components/catetind/payment-{start-screen,instruction-card}.tsx` (70 test baru: 43 di
  `lib/payments/*`, 27 di dua route baru) dan uji
  sandbox nyata: charge QRIS → tekan bayar lagi = order yang sama → webhook sah →
  `/api/subscription` menjawab `active:true` + `planId`.
- **Paket 84:** upgrade SUDAH nyata (bayar selisih lewat `priceFor()`, `purpose: upgrade`),
  dan jalur perpanjangan/cancel DIHAPUS karena tidak ada langganan berulang.
- **Paket 85:** top-up token AI SUDAH nyata juga — `purpose: 'topup'`, harga add-on dibaca
  server dari `lib/ai-quota.ts` (hanya untuk paket berkuota), token dicatat di `ai_addons`
  lewat webhook (idempoten per `order_id`), dan modal menampilkan instruksi bayar yang SAMA
  dengan checkout paket. TIDAK ada lagi TODO pembayaran di `top-up-modal.tsx`.
- **Catatan:** alur lama Snap **sudah dihapus** (`/api/payment/create`,
  `createSnapTransaction`, `midtransSnapEndpoint`) supaya tidak ada dua jalur setengah jalan. Paket 84 juga menghapus SISA-nya: `snap-payment-sheet.tsx`, `annual-plan-modal.tsx`, `renewal-modal.tsx`, `hooks/use-renewal-reminder.ts`, dan `GET /api/price`.

### 9.4 ✅ Ditutup dengan cara yang lebih jujur (paket 84)
- **Keputusan produk:** harga TIDAK lagi bergerak. Tiga tier, sekali bayar untuk akses selamanya,
  dan semua angkanya hidup di `lib/data/pricing.ts`.
- **Konsekuensi:** `GET /api/price`, tabel `pricing_state`, dan tipe `FoundingMember`/`PriceState` DIHAPUS — endpoint yang melayani harga bergerak untuk produk yang tidak ada lagi adalah pintu yang mengaku jalan.

### 9.5 ⚠️ Mesin AI nyata (DeepSeek) — chat, OCR, kategorisasi, apresiasi
- **Apa yang ada:** **meter** pemakaian nyata (`ai_usage` + `lib/ai-usage-store.ts`),
  UI chat/scan/voice (`ai-chat-widget.tsx`, `ai-capture-bubble.tsx`).
- **Apa yang hilang:** respons AI & OCR asli (masih mock/fallback).

### 9.6 ⚠️ Generator gambar Share (Privacy-Safe) — Key Flow #5 / modal h
- **Apa yang ada:** kartu share (`share-achievement-card.tsx`), panel
  (`share-progress-panel.tsx`), pratinjau publik (`/share/[id]`).
- **Apa yang hilang:** render gambar (1080×1920) + tombol "Share Report" yang
  mengekspor **hanya slide 1/2/4** (PRD 6578–6611). `share/[id]/page.tsx:50` menjelaskan
  gambar thumbnail belum ada.

### 9.7 ✅ Reward referral otomatis — Key Flow #6
- **Apa yang ada:** `/referral`, validasi kode via RPC (`/api/referral/validate`), diskon 10%
  yang **hanya sah setelah kode diverifikasi server** (`/api/payment/charge` menolak nominal
  diskon tanpa kode, kode palsu, dan kode milik sendiri).
- **Jejak pembelian:** `purchases.referral_code` menyimpan kode yang dipakai;
  `purchases.expected_amount` = nominal yang benar-benar ditagih, sehingga pembayaran diskon
  tidak lagi ditandai `amount_mismatch` oleh webhook.
- **Relasi & reward:** `record_referral` mengisi `referred_user_id` (plus trigger `auth.users`
  untuk akun baru), menolak self-referral dan pengundang kedua. Reward **diberikan otomatis
  oleh WEBHOOK** pembayaran ke PENGUNDANG (Token AI = kuota dasar bulanan; idempoten per
  `order_id` lewat `referral_rewards.order_id`). `POST /api/referral/reward` menolak
  panggilan klien (409, webhook-only).
- **Apa yang hilang:** kode & riwayat di halaman `/referral` masih MOCK — kini ditandai
  "Contoh" (`REFERRAL_IS_SAMPLE`) supaya tidak terbaca sebagai data user; pembacaan nyata
  dari tabel `referrals` belum.

### 9.8 ⚠️ UI modul baca dari Supabase
- **Apa yang ada:** skema + RLS + RPC di `supabase/migrations/*`.
- **Apa yang hilang:** `/wealth`, celengan, `/bills` masih membaca konstanta
  `lib/data/*` (belum pindah ke tabel). `CONTEXT-WAJIB.md:316`.

### 9.9 ✅ Live Purchase Feed (landing) = data NYATA (paket 85)
- **Apa yang ada:** `social-proof.tsx` membaca `GET /api/pricing/recent-purchases`
  (nama, kota, nominal apa adanya dari tabel `purchases`).
- **Kejujuran kosong:** di produksi daftar kosong ditulis apa adanya
  ("Belum ada pembelian terbaru"); seed contoh hanya tampil di build demo
  (`SHOWS_SAMPLE_DATA`). Saklar lama `use-fomo-counter.ts` sudah dihapus.

---

## 10. Deviasi & hal yang SENGAJA tidak dikerjakan (bukan utang)

| Item | Keputusan | Alasan (sumber) |
|---|---|---|
| **Prefix `/app`** hanya untuk Dashboard & Onboarding | `/wallet`, `/history`, `/budget`, `/settings`, … tanpa prefix | Disederhanakan; semua tautan konsisten (`lib/navigation.ts`). |
| **Profil & Akun** tidak di `/settings/profile` | Digabung sebagai section default `/settings` | `SETTINGS_MENU` (`settings-shell.tsx`). |
| **Tab Properti** `/wealth` = teaser | Tidak dibangun | PRD A12 (di luar V1). |
| **Bank-sync / open banking** | Tidak ada | Anti-dark-pattern; manual-first. |
| **Supabase/RLS/Midtrans nyata** | Mock + komentar arah produksi | Repo DEMO. |
| **Angka harga paket** | `lib/data/pricing.ts` | **Keputusan bisnis pemilik produk** (paket 84: 109k/129k/299k sekali bayar, akses selamanya). Harga landing DITURUNKAN dari file ini. |
| Route `/more`, `/family`, `/overview` | Sudah dihapus | Bukan halaman (Vaul sheet / money-context); tanpa tautan masuk (`ROADMAP §3`). |

---

## 11. Saran langkah berikutnya (kalau mau menutup celah)

Diurutkan berdasar dampak ÷ usaha, dan **tanpa** menyentuh keputusan bisnis:

1. **Data referral nyata di `/referral`** — halaman masih menampilkan contoh (sudah
   ditandai "Contoh"); tinggal membaca `referral_codes` + `referrals` dari sesi untuk
   menutup §9.7 sepenuhnya.
2. **Generator gambar Share (`/share/[id]` OG image / IG Story)** — menutup #9.6
   dan Key Flow #5.
3. **Halaman Waitlist + referral loop** — menutup #1 & Key Flow #7 (butuh
   keputusan produk: waitlist memang mau dihidupkan?).
4. **Pindahkan `/wealth` + celengan + `/bills` ke Supabase** — menutup #9.8
   (skema & RLS sudah siap).
5. **Integrasi Midtrans + webhook** — menutup #9.3 & reward referral #9.7
   (butuh kredensial & keputusan harga).

---

## 12. Cara memverifikasi ulang dokumen ini

```bash
# daftar semua route halaman yang benar-benar ada
Get-ChildItem app -Recurse -File -Filter page.tsx |
  ForEach-Object { $_.FullName.Replace((Resolve-Path app).Path,'') }

# endpoint API
Get-ChildItem app/api -Recurse -File -Filter route.ts |
  ForEach-Object { $_.FullName }

# skema DB
Get-ChildItem supabase -Recurse -File

# validasi repo (wajib hijau)
pnpm theme:audit ; pnpm exec tsc --noEmit ; pnpm build
```

> **Batas kejujuran:** audit ini memeriksa **struktur kode & dokumentasi**.
> Verifikasi "halaman benar-benar jalan di browser" (klik nyata, IndexedDB,
> Service Worker, PIN) belum dilakukan penuh di perangkat sungguhan — lihat
> catatan yang sama di `docs/handoff/laporan/` dan `app/hasil.md`.

---

## 13. Pembaruan paket 63 — "Tutup semua celah" (4 Okt 2026)

> **Konteks:** Supabase project `wmswtoyikvgzcvbgdceo` = **LIVE** (migrasi 01–05
> sudah diterapkan, RLS aktif — dibuktikan `pnpm supabase:migrate` + probe REST).
> Migrasi 06 baru (`physical_assets`, `referral_rewards`) ditambahkan di paket ini.
> Keputusan produk: tabel `user_subscriptions`/`purchases`/`pricing_state`
> **TIDAK dibuat** — dibiarkan menunggu Midtrans (tidak dipalsukan).

### 13.1 Celah yang DITUTUP

| Celah | Status | Bukti |
|---|---|---|
| **§9.5 AI (chat/OCR/voice)** | ✅ Tutup | Mesin AI nyata (Gemini, server-only `lib/ai/provider.ts`): `/api/ai/text`, `/api/ai/ocr`, `/api/parse-voice`, `/api/ai/categorize`. Capture memakai route asli; gagal provider → jatuh **jujur** ke aturan lokal (label "belum pakai model"). |
| **§9.4 Harga real-time** | ➖ Ditutup (paket 84) | Harga tidak lagi bergerak: 3 tier akses selamanya di `lib/data/pricing.ts`; `GET /api/price` + `pricing_state` dihapus supaya tidak ada endpoint harga yang menganggur. |
| **§9.6 Generator gambar share** | ✅ Tutup | `next/og`: `app/share/[id]/opengraph-image.tsx` + `twitter-image.tsx` (1200×630) + `GET /api/share/[id]/image` (Story 1080×1920). Tombol **"Share Report"** di panel rekap (Web Share files → fallback unduh). Privacy-safe (nol rupiah). |
| **§9.3/9.7/9.9 Pembayaran/reward/live-feed** | ✅ Checkout + **top-up** + reward NYATA | `lib/payments/*` + `/api/payment/charge` + `/api/payment/status` + `/api/payment/webhook` (verifikasi SHA512, 403/503 fail-closed; pemenuhan lewat RPC). Top-up token masih rail; **upgrade sudah nyata** (bayar selisih); renewal/cancel dihapus. `/api/referral/reward` (503), `/api/pricing/recent-purchases` (`{items:[],firstHere:true}`). |
| **Tab Properti `/wealth`** (modal `u`) | ✅ Dibangun | `wealth-properti.tsx` + `add-physical-asset-sheet.tsx` + store `lib/money/physical-store.ts` + tabel `physical_assets`. Nilai aset fisik **ikut Net Worth**. |
| **§9.8 Data real (seed→Supabase)** | ⚠️ Sebagian | Gerbang `SHOWS_SAMPLE_DATA` (`lib/demo.ts`); **dompet** & **aset fisik** sudah bergerbang (produksi = kosong, bukan seed). Kekayaan/tagihan/celengan/joint **sudah disambung penuh** (paket 64): keempat store bergerbang `SHOWS_SAMPLE_DATA` (produksi = kosong) + baca/tulis Supabase lewat mapper `lib/supabase/domain-mappers.ts` + `*-remote.ts`. |
| **§9.2 Sesi demo** | ✅ Tutup | 405 sejak paket 45; copy AI-status diperbarui + banner widget hanya saat `modelConnected === false`. |

### 13.2 Menunggu Midtrans (tidak dipalsukan)

`user_subscriptions` · `purchases` · `pricing_state` · pembayaran (checkout/top-up/
upgrade/renew/cancel) · reward referral otomatis · Live Purchase Feed real — semua
**fail-closed** (503 / daftar kosong jujur).

### 13.3 Masih tersisa (jujur)

- **Paket D (data real) — SELESAI (paket 64):** `/wealth`, `/budget`, `/bills`,
  `/joint` + `app/api/wallets` sudah bergerbang `SHOWS_SAMPLE_DATA` (produksi =
  kosong, bukan seed) DAN membaca/menulis tabel Supabase lewat mapper
  `lib/supabase/domain-mappers.ts` + `*-remote.ts` (bills/wealth/funds/joint)
  dengan penggabungan server+perangkat (`mergeWithRemoteBills` /
  `mergeWithRemoteFunds` / `mergeWithRemoteWealth`). Id baris lokal (mis.
  `inv-6`) dijembatani ke uuid kolom Postgres lewat `remoteId`
  (`lib/supabase/uuid.ts`). Validasi: 777 test hijau · tsc bersih · build sukses
  · `theme:audit` palet bersih.
- **Paket D — batas jujur:** kolom yang TIDAK ada di skema kanon (`scope`,
  `emoji`, `notes`, `symbol`, `is_paid_this_month`) **tidak dikarang** di server;
  saat membaca, nilainya diambil dari cache perangkat atau default konservatif
  (didokumentasikan di `domain-mappers.ts`). Jalur server (sesi Supabase) belum
  diverifikasi di perangkat sungguhan — hanya fungsi murni mapper & merge yang
  diuji.
- Verifikasi browser nyata (kamera OCR, Web Share files) belum di perangkat sungguhan.