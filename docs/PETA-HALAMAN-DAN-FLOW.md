# 🗺️ PETA HALAMAN & ALUR (FLOW) — CatetInd

> **Tujuan dokumen ini:** memetakan **SEMUA** halaman/route yang benar-benar ada
> di `app/**`, lalu menyusunnya jadi **alur antar-halaman (A → B → C)** sesuai
> pengalaman user nyata. **Tidak ada satu halaman pun yang di-skip.**
>
> **Sumber kebenaran:** `app/**` (route nyata), `lib/navigation.ts`,
> `lib/public-routes.ts`, `lib/shows-amounts.ts`, `components/MobileBottomNav.tsx`
> (`FOCUS_ROUTES`), `docs/STATUS-HALAMAN.md`, `inventaris_ui_definitif.md`.
>
> **Basis kode:** Next.js 16 · React 19 · Tailwind v4 · TypeScript.
> **Terakhir disusun:** 14 Okt 2026.

---

## 0. Cara baca dokumen ini

- **§1** = inventaris lengkap semua halaman (dikelompokkan per wilayah app).
- **§2** = alur utama (Flow 1 … Flow 21) dengan notasi `A → B → C`.
- **§3** = peta navigasi global (sidebar desktop & bottom-nav mobile).
- **§4** = tabel ringkas "dari halaman mana → bisa ke halaman mana".
- **§5** = gerbang global (siapa boleh lihat apa).
- **§6** = catatan & status jujur (deviasi, yang di luar scope).

File sistem non-halaman (404, error boundary, OG image) ada di **§1H**; endpoint
API pendukung ada di **§1I**.

**Notasi:** `→` transisi user · `(query)` parameter URL · `⟲` redirect · `⌛` hanya
di kondisi tertentu · `🔒` butuh sesi/login · `🧩` deviasi sengaja dari inventaris.

---

## 1. INVENTARIS LENGKAP HALAMAN

Total **38 route halaman** (`page.tsx`) + halaman sistem. Dikelompokkan jadi
7 wilayah:

### 1A. Publik / Pra-App (tanpa navigasi app — `FOCUS_ROUTES`)

| # | Route | File | Komponen | Peran |
|---|---|---|---|---|
| 1 | `/` | `app/page.tsx` | `landing/*` | **Landing page** pemasaran (root). Hero, Pain Calculator, Wealth Gap, Social Proof, Pricing, FAQ, Sticky CTA. |
| 2 | `/welcome` | `app/welcome/page.tsx` | `welcome-screen.tsx` | Halaman depan **editorial gelap** sebelum punya akun. CTA daftar + masuk + tautan legal. |
| 3 | `/registered` | `app/registered/page.tsx` | (inline server) | **"Terima kasih"** setelah registrasi dari landing. Bawa `?email=` & `?plan=`. CTA lanjut bayar. |
| 4 | `/privacy` | `app/privacy/page.tsx` | `legal-shell.tsx` + `lib/legal/privacy.ts` | Kebijakan Privasi (data = dokumen). |
| 5 | `/terms` | `app/terms/page.tsx` | `legal-shell.tsx` + `lib/legal/terms.ts` | Syarat & Ketentuan. |
| 6 | `/join/[code]` | `app/join/[code]/page.tsx` | `join-invite-screen.tsx` | **Landing undangan Joint Wallet** (sisi B). Kode 6 karakter. |
| 7 | `/r/[code]` ⟲ | `app/r/[code]/page.tsx` | — | **Tautan referral** → redirect ke `/checkout?kode=<KODE>`. |
| 8 | `/share/[id]` | `app/share/[id]/page.tsx` | `share-preview-screen.tsx` | **Pratinjau kartu share** publik (nol angka rupiah). |
| 9 | `/help` | `app/help/page.tsx` | `help-center-screen.tsx` | Pusat Bantuan (dipakai publik & app). |

### 1B. Auth (pintu masuk)

| # | Route | File | Komponen | Peran |
|---|---|---|---|---|
| 10 | `/login` | `app/login/page.tsx` | `login-screen.tsx` | **Masuk** — kode OTP 6 angka (tanpa password). Baca `?next=`. |
| 11 | `/login/verify` | `app/login/verify/page.tsx` | `verify-email-screen.tsx` | **Cek email / callback** magic link. Baca `?email=`,`?status=`,`?code=`,`?next=`. |

### 1C. Pre-App (fokus, tanpa sidebar & bottom-nav)

| # | Route | File | Komponen | Peran |
|---|---|---|---|---|
| 12 | `/app/onboarding` | `app/app/onboarding/page.tsx` | `onboarding-flow.tsx` | **Onboarding 3 langkah** (<60 detik). Keluar → `/app`. |

### 1D. Checkout & Pembayaran

| # | Route | File | Komponen | Peran |
|---|---|---|---|---|
| 13 | `/checkout` | `app/checkout/page.tsx` | `checkout-screen.tsx` | **Pilih paket + registrasi**. Baca `?plan=`,`?kode=`. |
| 14 | `/checkout/bayar` | `app/checkout/bayar/page.tsx` | `payment-start-screen.tsx` | **Mulai bayar** (nominal dari server). Baca `?plan=`,`?kode=`,`?upgrade=`,`?dari=`. |
| 15 | `/checkout/selesai` | `app/checkout/selesai/page.tsx` | `payment-done-screen.tsx` | **Status pembayaran** (dibaca dari DB, bukan query). Baca `?order_id=`,`?status=`. |

### 1E. Core In-App (dengan sidebar/bottom-nav)

| # | Route | File | Komponen | Peran |
|---|---|---|---|---|
| 16 | `/app` | `app/app/page.tsx` | `home-screen.tsx` | **Dashboard / Home + Daily HUD**. |
| 17 | `/wallet` | `app/wallet/page.tsx` | `wallet-screen.tsx` | Daftar dompet & akun + total saldo. |
| 18 | `/wallet/[id]` | `app/wallet/[id]/page.tsx` | `wallet-detail-screen.tsx` | Detail satu dompet + tren 30 hari. |
| 19 | `/history` | `app/history/page.tsx` | `history-screen.tsx` | Riwayat & Insight. Baca `?q=`. |
| 20 | `/budget` | `app/budget/page.tsx` | `budget-screen.tsx` | Budget & Target Nabung. Baca `?add=`,`?tanam=`. |
| 21 | `/budget/[id]` | `app/budget/[id]/page.tsx` | `goal-detail-screen.tsx` | Detail satu celengan (goal/sinking fund). |
| 22 | `/bills` | `app/bills/page.tsx` | `bills-screen.tsx` | Tagihan rutin (tandai lunas/undo). |
| 23 | `/calendar` | `app/calendar/page.tsx` | `cashflow-calendar-screen.tsx` | Kalender cashflow + inspector hari. |
| 24 | `/wealth` | `app/wealth/page.tsx` | `wealth-screen.tsx` | Kekayaan & Hutang (investasi/properti⁽ᵗᵉᵃˢᵉʳ⁾/hutang). |
| 25 | `/joint` | `app/joint/page.tsx` | `joint-screen.tsx` | Joint Wallet (buku bersama, split, invite, privat). |
| 26 | `/referral` | `app/referral/page.tsx` | `referral-screen.tsx` | Ajak Teman (kode referral + reward). |
| 27 | `/install` | `app/install/page.tsx` | `install-guide-screen.tsx` | Panduan install PWA per platform. |
| 28 | `/insight` ⟲ | `app/insight/page.tsx` | — | **Redirect** lama → `/history` (jaga bookmark). |

### 1F. Pengaturan (master–detail, semua di bawah `/settings`)

Semua halaman ini hidup di dalam **satu layout** (`app/settings/layout.tsx` →
`SettingsShell`) sehingga **sidebar global tidak pernah hilang** saat pindah
section. Daftar menunya satu sumber: `SETTINGS_MENU` di `settings-shell.tsx`.

| # | Route | File | Panel | Isi |
|---|---|---|---|---|
| 29 | `/settings` | `app/settings/page.tsx` | `ProfileSettingsPanel` | **Profil & Akun** (section default). Nama, email, gajian, konteks uang. |
| 30 | `/settings/billing` | `app/settings/billing/page.tsx` | `BillingSettingsPanel` | **Langganan** — kartu paket, kuota AI, jalur **upgrade**, top-up token. |
| 31 | `/settings/appearance` | `app/settings/appearance/page.tsx` | `settings-panel-preferences.tsx` | **Tampilan** — terang/gelap. |
| 32 | `/settings/categories` | `app/settings/categories/page.tsx` | `settings-panel-preferences.tsx` | **Kategori** — atur/hapus/pulihkan kategori. |
| 33 | `/settings/ai` | `app/settings/ai/page.tsx` | `settings-panel-preferences.tsx` | **AI** — auto-kategori & gaya Minca (`lib/ai-prefs.ts`). |
| 34 | `/settings/notifications` | `app/settings/notifications/page.tsx` | `notification-settings.tsx` | **Notifikasi** — Web Push (`use-push-notifications.ts`). |
| 35 | `/settings/security` | `app/settings/security/page.tsx` | `settings-panel-*` | **Keamanan** — PIN (PBKDF2) + biometrik (WebAuthn) + hapus akun. |
| 36 | `/settings/data` | `app/settings/data/page.tsx` | `DataExportSettingsPanel` | **Export Data** — unduh semua data user (JSON). |
| 37 | `/settings/logout` | `app/settings/logout/page.tsx` | `LogoutSettingsPanel` | **Keluar** — akhiri sesi (redirect ke `/login`). |

### 1G. Halaman sistem internal

| # | Route | File | Peran |
|---|---|---|---|
| 38 | `/palette` | `app/palette/page.tsx` | **Review desain** palet warna (internal, `noindex`). |

### 1H. File sistem Next.js (bukan halaman, tapi terpasang otomatis)

| File | Peran |
|---|---|
| `app/not-found.tsx` | **404** — URL tak dikenal (status HTTP 404) → `not-found-screen`. |
| `app/error.tsx` | Error boundary **akar** (menangkap `/app` dst.) → `segment-error-screen`. |
| `app/app/error.tsx`, `app/budget/error.tsx`, `app/history/error.tsx`, `app/joint/error.tsx`, `app/wallet/error.tsx`, `app/wealth/error.tsx` | Error boundary **per segmen**. |
| `app/settings/layout.tsx` | Layout bersama semua `/settings/*` (sidebar tetap). |
| `app/settings/loading.tsx` | Skeleton loading settings. |
| `app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts` | SEO & PWA manifest. |
| `app/share/[id]/opengraph-image.tsx`, `app/share/[id]/twitter-image.tsx` | Gambar kartu share 1200×630 (`next/og`). |

### 1I. Endpoint API (`app/api/**`) — pendukung halaman, bukan halaman

| Endpoint | Method | Dipakai oleh |
|---|---|---|
| `/api/session` | GET / DELETE | Login, identitas, keluar. |
| `/api/wallets` · `/api/wallets/[id]` | GET/POST · GET/PUT/DELETE | `/wallet`, `/wallet/[id]`. |
| `/api/subscription` | GET | `/checkout/selesai`, `/settings/billing`. |
| `/api/payment/charge` | POST | `/checkout/bayar` (buat tagihan). |
| `/api/payment/status` | GET | Kartu instruksi bayar (polling status). |
| `/api/payment/webhook` | POST | Midtrans → pemenuhan paket/referral. |
| `/api/pricing/recent-purchases` | GET | Live feed landing. |
| `/api/referral/validate` · `/api/referral/reward` | POST | `/referral`, `/r/[code]`. |
| `/api/ai/text` · `/api/ai/ocr` · `/api/ai/categorize` | POST | AI Coach, scan struk, auto-kategori. |
| `/api/parse-voice` | POST | Input suara. |
| `/api/push/subscribe` · `/api/push/send` | POST/DELETE · POST | `/settings/notifications`. |
| `/api/share/[id]/image` | GET | Gambar share (Story 1080×1920). |

---

## 2. ALUR ANTAR-HALAMAN (A → B → C)

### FLOW 1 — Pengunjung baru → daftar → bayar → onboarding → dashboard
*(alur terpanjang & paling penting)*

```
/  (Landing)
 └─ klik "Daftar / Coba gratis / pilih paket"
    → /checkout                  (pilih paket + isi email & nama di RegistrationSheet)
       ├─ punya akun? klik "Masuk" → /login?next=/checkout?plan=…&kode=…
       └─ "Buat akun"
          → /registered?email=…&plan=…   (layar "Terima kasih")
             └─ klik CTA
                ├─ (butuh verifikasi) → /login/verify?email=…&next=/checkout/bayar?plan=…
                └─ langsung            → /checkout/bayar?plan=…&kode=…
                                          → /checkout/selesai?order_id=…
                                             └─ "Masuk ke dashboard"
                                                → /app/onboarding  (3 langkah, <60 dtk)
                                                   → /app          (Dashboard)
```

| Dari | Ke | Pemicu | Catatan teknis |
|---|---|---|---|
| `/` | `/checkout` | CTA pricing/sticky bar | `LandingCtaProvider` + `buildCheckoutHref()` bawa `?plan=`. |
| `/checkout` | `/login` | "Sudah punya akun? Masuk" | `buildCheckoutHref(offerId, code)`. |
| `/checkout` | `/registered` | `registerAccount()` sukses | `buildRegisteredHref(email, planId)`. |
| `/registered` | `/login/verify` | butuh konfirmasi | `buildVerifyHref(email, payHref)`. |
| `/registered` | `/checkout/bayar` | paket dipilih | `buildPayHref(plan.id)`. |
| `/checkout/bayar` | `/checkout` ⟲ | paket tak dikenal / sudah dimiliki | guard `redirect('/checkout')`. |
| `/checkout/bayar` | `/checkout/selesai` | status `settled` | `payment-instruction-card` / `payment-start-screen`. |
| `/checkout/selesai` | `/app` | "Masuk ke dashboard" | hanya saat state `active`. |
| `/checkout/selesai` | `/checkout` | pembayaran belum tercatat | tombol `homeCta`. |
| `/app/onboarding` | `/app` | selesai 3 langkah | `router.replace(POST_ONBOARDING_ROUTE)`. |

### FLOW 2 — Masuk untuk user yang sudah punya akun

```
(welcome / landing / halaman mana pun yang butuh sesi)
 → /login                    (ketik email → kirim kode 6 angka)
    → /login/verify?email=…&next=…        (opsi magic link dari inbox)
       → resolveAuthLanding(next)
          ├─ ada ?next= aman → halaman tujuan (mis. /checkout/bayar?plan=…)
          └─ tidak ada       → /app  (Dashboard)
```

- `/login` juga dibuka **otomatis** oleh middleware saat user anonim membuka
  halaman app: `/wallet` 🔒 → `/login?next=/wallet`.
- Pintu lain ke `/login`: tombol "Masuk" di `welcome-screen`, `landing-navbar`,
  `public-navbar`, `app-lock-screen` (lupa PIN), `notification-settings`.
- Setelah keluar (`/settings/logout` → `signOut`) → `/login`.

### FLOW 3 — Checkout & pembayaran (detail)

```
/checkout
 ├─ pilih kartu paket  (PLANS: catet-aja / waras / sultan — "sekali bayar")
 ├─ isi RegistrationSheet (email + nama)  →  akun dibuat
 ├─ (opsional) kode teman ?kode=XXXXXX    →  diskon 10%
 └─ "Lanjut bayar"
    → /checkout/bayar?plan=…&kode=…
       ├─ tanpa sesi → kartu "Masuk dulu ya" → /login?next=/checkout/bayar?…
       ├─ pilih metode (QRIS / VA / e-wallet / Mandiri Bill)
       └─ "Bayar sekarang" → POST /api/payment/charge
          → kartu instruksi bayar (QR / nomor VA / kode)
             · polling GET /api/payment/status → saat settled → /checkout/selesai?order_id=…
             · kedaluwarsa/gagal → "Bikin tagihan baru" / "Ganti metode" (tetap di halaman)
```

**Upgrade (sudah punya paket):** `buildUpgradeHref(plan, from)` →
`/checkout/bayar?plan=…&upgrade=1&dari=…`. Nominal = **selisih** dari
`priceFor()`. Pintu masuk: `/settings/billing` + `upgrade-modal`.

### FLOW 4 — Onboarding 3 langkah (pre-app)

```
/app/onboarding
 Step 1  "Siapa kamu?"        → multi-select situasi hidup + periode dashboard
 Step 2  "Pemasukan bulanan?" → OPSIONAL + auto-suggest 50/30/20 + wajib ≥1 dompet
 Step 3  "Catat transaksi 1!" → input 4-tap + izin notifikasi + upacara benih
 └─ selesai  →  /app  (Dashboard; muncul toast "Setup selesai!")
```

Guard keluar (`EXIT_WARNING`) aktif selama belum selesai (beforeunload + popstate).

### FLOW 5 — Alur harian di dalam app (Dashboard sebagai pusat)

```
/app  (Dashboard / Home)
 ├─ header cari transaksi     →  /history?q=…
 ├─ kartu saldo (BalanceRing) →  /joint   ·   /history
 ├─ kartu arus uang           →  /history
 ├─ jadwal/jatah harian       →  /budget
 ├─ FAB input transaksi       →  sheet catat (data tersimpan di ledger)
 └─ bottom-nav / sidebar      →  seluruh halaman app (lihat §3)
```

### FLOW 6 — Catat transaksi (3 cara)

```
/app (atau halaman app mana pun lewat FAB bottom-nav)
 ├─ Manual     → TransactionInputEngine (4 tap)   → ledger
 ├─ Voice      → /api/parse-voice (Web Speech)     → kartu konfirmasi
 └─ Scan struk → /api/ai/ocr                        → kartu konfirmasi
     ↓ konfirmasi
   catatan masuk ledger → tampil di /app (5 terakhir) & /history
   (butuh dompet baru? ada tautan pintas ke /wallet)
```

### FLOW 7 — Dompet & pindah dana

```
/app  →  /wallet                       (daftar dompet + total saldo)
 ├─ "+ Tambah Akun"   → AddWalletSheet              → tetap di /wallet
 ├─ tap kartu dompet  → /wallet/[id]                (detail + tren 30 hari)
 │    └─ "Hapus dompet" → ConfirmDialog + Undo      → /wallet
 ├─ menu kartu → "Pindah Dana"  → TransferFlow (sheet)
 └─ menu kartu → "Hapus dompet" → ConfirmDialog + Undo
```

### FLOW 8 — Budget & celengan (sinking fund)

```
/app  →  /budget                      (Zona A: jatah harian · Zona B: celengan)
 ├─ "+ Budget baru"       → AddBudgetSheet         → tetap di /budget
 ├─ "+ Tanam celengan"    → AddGoalSheet (3 langkah) → tetap di /budget
 │    └─ pintasan URL: /budget?tanam=1
 ├─ tap celengan          → /budget/[id]           (GoalDetailScreen)
 │    ├─ "Setor"          → ContributeSheet        → tetap di /budget/[id]
 │    ├─ "Hapus celengan" → ConfirmDialog + Undo   → /budget
 │    └─ id tidak dikenal → empty state ramah (bukan 404 mentah)
 └─ dari toast MonthlyReviewModal "atur target" → /budget
```

### FLOW 9 — Tagihan rutin

```
/app → /bills                   (daftar tagihan + pengingat jatuh tempo)
 ├─ "+ Tambah"       → AddBillSheet              → tetap di /bills
 └─ tandai lunas     → tombol aksi / geser       → "Batal lunas" (undo)
```

### FLOW 10 — Kalender cashflow

```
/app → /calendar                (grid bulan + inspector hari)
 └─ tap tanggal → CashflowInspector        (detail arus uang hari itu)
    ⌛ tambah catatan kalender → AddCalendarNoteSheet → tetap di /calendar
```

### FLOW 11 — Kekayaan & Hutang

```
/app  →  /wealth                       (Aset vs Hutang · Net Worth)
 ├─ Tab Investasi  → AddInvestmentSheet    (beli/jual, RDN)
 ├─ Tab Properti   → teaser "Segera" 🧩 (PRD A12 — di luar V1, bukan utang)
 └─ Tab Hutang     → AddDebtSheet          (simple / platform berbunga)
      → "Snowball" / DTI badge  → angka ikut memotong jatah harian di /app & /budget
```

### FLOW 12 — Joint Wallet + undangan pasangan (Key Flow #2)

```
/app  →  /joint                        (buku bersama, timbangan settlement, timeline)
 ├─ "Ajak pasangan"  → JointInviteFlow  → kode 6 karakter + tombol Salin/Bagikan
 │    └─ tautan: /join/<KODE>
 │                (pratinjau dari /joint: buildJoinHref() → /join/<KODE>)
 ├─ "Catat transaksi bersama" → form joint (FAB khusus /joint)
 ├─ "Split bill"     → JointSplitSheet (4 mode) + ringkasan settlement
 └─ privat per transaksi (toggle privasi)

SISI B (pasangan):
 /join/<KODE>  (publik)
  ├─ valid   → "Gabung"    → ⌛ belum punya akun → /checkout lalu login
  │                          ⌛ sudah login        → auto-join → /joint
  ├─ valid   → "Nanti aja" → keluar tanpa tekanan (nol hitungan mundur)
  ├─ dipakai → state "kode sudah dipakai"
  └─ kedaluwarsa → state "undangan berlaku 24 jam"
```

Pintu lain ke `/join/<KODE>`: `settings-panel-account` (kartu "Ajak Pasangan").

### FLOW 13 — Share Report (privacy-safe) & pratinjau publik

```
/app atau /history
 └─ panel rekap (WeeklyRecapModal / ShareProgressPanel) → "Share Report"
    → kartu share (slide 1/2/4 — NOL angka rupiah)
       ├─ Web Share files  → dibagikan ke aplikasi lain
       ├─ fallback unduh   → /api/share/[id]/image (Story 1080×1920)
       └─ tautan publik    → /share/[id]
                              ├─ kartu dikenal  → SharePreviewScreen
                              └─ id tak dikenal → empty state hangat (bukan 404)
```

### FLOW 14 — Referral "Ajak Teman" (dua sisi)

```
/app → /referral                        (kode unik + riwayat + reward)
 └─ bagikan tautan:  /r/<KODE>  ⟲  →  /checkout?kode=<KODE>   (diskon 10%)

SISI TEMAN:
 /r/<KODE>  → /checkout?kode=… → /checkout/bayar?plan=…&kode=…
    → POST /api/referral/validate (validasi kode → DB)
    → setelah webhook pembayaran sukses → reward otomatis (idempoten per order_id)
```

### FLOW 15 — Pengaturan (master–detail)

Semua di bawah satu layout, sidebar **tidak pernah hilang**:

```
(yang membuka)  sidebar / bottom-nav → "Pengaturan"
 └─ /settings                       (indeks; desktop tampil Profil & Akun)
     ├─ /settings/billing      → kartu paket · kuota AI · top-up · upgrade → /checkout/bayar?…
     ├─ /settings/appearance   → terang/gelap
     ├─ /settings/categories   → atur/hapus/pulihkan kategori
     ├─ /settings/ai           → auto-kategori & gaya Minca
     ├─ /settings/notifications→ izin Web Push (POST /api/push/subscribe)
     ├─ /settings/security     → PIN + biometrik + hapus akun
     ├─ /settings/data         → "Export Data Saya" (unduh JSON)
     └─ /settings/logout       → konfirmasi → signOut → /login

 Mobile: /settings hanya daftar menu; memilih menu membuka sub-section
         + tombol "‹ Pengaturan" untuk kembali.
```

### FLOW 16 — Keluar (logout)

```
/settings (paling bawah: tombol "Keluar" bergaya plum)  ·  atau /settings/logout langsung
 → LogoutSettingsPanel → konfirmasi → signOut()
    → /login
```

### FLOW 17 — Kunci app (PIN/biometrik)

```
/settings/security  → aktifkan PIN
 → begitu aktif, AppLockProvider MENGGANTIKAN seluruh isi app dengan AppLockScreen
    saat app dibuka kembali ATAU setelah idle 60 detik
 ├─ buka dengan PIN / biometrik → isi app muncul
 └─ "lupa PIN" → /login (ganti akun)
```

### FLOW 18 — Offline & antrean transaksi

```
kapan pun koneksi putus (halaman app mana pun)
 → OfflineBanner muncul
 → transaksi disimpan optimistic (⏳) → retry 1s/2s/4s → background 30s
    ├─ sukses            → hilang penanda (✓)
    └─ FAILED_PERMANENT  → (🔴) + tombol retry manual di daftar transaksi
```

### FLOW 19 — Push notification

```
/app/onboarding Step 3  ┐
/settings/notifications ┘ → izin Web Push → POST /api/push/subscribe
   → pengingat harian / tagihan / rekap dikirim lewat POST /api/push/send
```

### FLOW 20 — Bantuan & Panduan Install

```
(landing / welcome publik)  public-navbar → "Bantuan" → /help   (tanpa sesi, publik)
(app, user login)           sidebar       → "Pusat Bantuan" → /help
                            sidebar       → "Panduan Install" → /install
/install  → QR + langkah per platform (iOS Safari / Android Chrome / Desktop)
```

### FLOW 21 — Halaman legal & 404 / error

```
/login, /welcome, footer landing, /register
 ├─ → /privacy    (Kebijakan Privasi — legal-shell, logo = pintu ke /welcome)
 └─ → /terms      (Syarat & Ketentuan)

URL apa pun yang tidak dikenal  → app/not-found.tsx           (HTTP 404)
error render di /app, /wallet, /budget, /history, /joint, /wealth
                                  → error.tsx per segmen (tombol reset)
error render di halaman lain      → app/error.tsx (boundary akar)
```

---

## 3. PETA NAVIGASI GLOBAL (sidebar desktop & bottom-nav mobile)

Satu sumber kebenaran: `lib/navigation.ts` (`NAV_GROUPS`). Keduanya membaca
daftar yang sama supaya hierarki desktop & mobile tidak pernah beda.

**Sidebar desktop — 5 grup:**

| Grup | Item (href) |
|---|---|
| Menu Utama | Dashboard (`/app`) · Riwayat & Insight (`/history`) |
| Kelola Uang | Dompet & Akun (`/wallet`) · Budget & Target Nabung (`/budget`) · Tagihan Rutin (`/bills`) · Kalender Cashflow (`/calendar`) |
| Aset & Bersama | Kekayaan & Hutang (`/wealth`) · Joint Wallet (`/joint`) · Ajak Teman (`/referral`) |
| Bantuan | Pusat Bantuan (`/help`) · Panduan Install (`/install`) |
| Sistem | Pengaturan (`/settings`) · + tombol **Keluar** (`/settings/logout`) |

**Bottom-nav mobile (tab tetap):** Home (`/app`) · Wallet (`/wallet`) ·
Insight (`/history`) · FAB (input transaksi / pindah dana) · menu "Lainnya"
(laci berisi semua grup kecuali Menu Utama = `MOBILE_MENU_GROUPS`).

**Navigasi non-app (navbar SITUS, `public-navbar`)** — dipakai di `/welcome`,
`/login`, `/login/verify`, `/checkout`, `/help`, `/privacy`, `/terms`, `/join`,
`/share`: logo → `/welcome` · "Harga" → `/checkout` · "Bantuan" → `/help` ·
"Masuk" → `/login` · "Daftar gratis" → `/checkout`.

**Halaman tanpa navigasi app (`FOCUS_ROUTES` di `MobileBottomNav.tsx`):**
`/`, `/registered`, `/app/onboarding`, `/welcome`, `/checkout`, `/login`,
`/join`, `/share`, `/privacy`, `/terms`.

---

## 4. MATRIKS "DARI HALAMAN MANA → BISA KE MANA"

> `⌛` kondisi · `⟲` redirect · `🔒` butuh sesi.

| Dari halaman | Bisa pergi ke |
|---|---|
| `/` (Landing) | `/checkout` (CTA/daftar), `/login` (navbar), `/privacy`, `/terms` (footer) |
| `/welcome` | `/checkout` (daftar), `/login`, `/privacy`, `/terms` |
| `/registered` | `/checkout/bayar?plan=…` (paket dipilih) · `/` (tidak) |
| `/login` | `/login/verify` (kirim kode) · `/checkout` ("Daftar") · `⟲` `/app` atau `?next=` tujuan |
| `/login/verify` | `/app` atau `?next=` (setelah sesi) |
| `/checkout` | `/login` ("Masuk") · `/registered` (daftar sukses) · `/checkout/bayar` · `/welcome` |
| `/checkout/bayar` | `⟲` `/checkout` (invalid/sudah dimiliki) · `/login?next=…` (tanpa sesi) · `/checkout/selesai` (settled) |
| `/checkout/selesai` | `/app` (aktif) · `/checkout` (belum tercatat) |
| `/app/onboarding` | `/app` (selesai) |
| `/app` | `/history?q=`, `/joint`, `/wallet`, `/budget`, `/bills`, `/calendar`, `/wealth`, `/referral`, `/help`, `/install`, `/settings` (via nav) |
| `/wallet` | `/wallet/[id]` · sheet tambah/pindah/hapus |
| `/wallet/[id]` | `/wallet` (setelah hapus) · sheet edit/hapus |
| `/history` | `/budget` (atur target dari rekap) · panel share |
| `/budget` | `/budget/[id]` · sheet tambah budget / tanam-setor celengan |
| `/budget/[id]` | `/budget` (setelah hapus) · sheet setor |
| `/bills` | sheet tambah tagihan (tetap di halaman) |
| `/calendar` | inspector hari · sheet catatan kalender |
| `/wealth` | sheet investasi/hutang · teaser properti (belum ada) |
| `/joint` | `/join/<KODE>` (pratinjau undangan) · sheet catat/split/privat |
| `/join/[code]` | `/checkout` → `/login` (gabung, belum akun) · `/joint` (gabung, sudah login) · keluar ("Nanti aja") |
| `/referral` | `/r/<KODE>` `⟲` `/checkout?kode=…` |
| `/r/[code]` | `⟲` `/checkout?kode=<KODE>` · `⟲` `/checkout` (kode kosong) |
| `/share/[id]` | halaman publik lain (empty state hangat bila id tak dikenal) |
| `/help` | navbar situs → `/checkout`, `/login`, `/welcome` |
| `/install` | (sidebar & bottom-nav aktif → semua halaman app) |
| `/settings` | seluruh `/settings/*` · `/settings/logout` |
| `/settings/billing` | `/checkout/bayar?plan=…&upgrade=1&dari=…` · top-up token |
| `/settings/notifications` | `/login` (bila belum masuk) |
| `/settings/security` | layar kunci app (PIN) · hapus akun |
| `/settings/data` | unduh JSON (tidak pindah halaman) |
| `/settings/logout` | `/login` (setelah signOut) |
| `/privacy`, `/terms` | `/welcome` (logo = pintu pulang) |
| `/palette` | halaman internal review |

---

## 5. GERBANG GLOBAL (siapa boleh lihat apa)

Gerbang hidup di root layout / middleware, bukan di tiap halaman:

| Gerbang | Berkas | Aturan |
|---|---|---|
| **Sesi** | `middleware.ts` + `lib/public-routes.ts` | Halaman app (di luar `PUBLIC_ROUTES`) tanpa cookie Supabase → `⟲ /login?next=<tujuan>`. Aktif hanya bila Supabase dikonfigurasi **dan** `NEXT_PUBLIC_DEMO !== '1'`. |
| **Langganan** | `SubscriptionGateProvider` | Mengunci input transaksi bagi user tanpa paket; dilewati di `PUBLIC_ROUTES`. |
| **Kunci perangkat (PIN)** | `AppLockProvider` | PIN aktif & belum dibuka → `AppLockScreen` menggantikan seluruh isi app. Dilewati di halaman publik. |
| **Toggle nominal (mata)** | `lib/shows-amounts.ts` | Tombol sensor hanya di `AMOUNT_ROUTES`: `/app`, `/wallet`, `/history`, `/budget`, `/bills`, `/calendar`, `/wealth`, `/joint`. |
| **Seed demo** | `DemoSeedGate` + `lib/demo.ts` | Data contoh hanya saat `NEXT_PUBLIC_DEMO=1`; produksi = kosong jujur. |
| **Nav & AI disembunyikan** | `FOCUS_ROUTES` + `AI_COACH_ROUTES` (`lib/ai-chat.ts`) | Halaman publik/alur fokus: tanpa bottom-nav; AI Coach hanya di `/app`. |

`PUBLIC_ROUTES`: `/`, `/registered`, `/welcome`, `/login`, `/checkout`,
`/privacy`, `/terms`, `/join`, `/share`, `/app/onboarding`.

---

## 6. CATATAN & STATUS (jujur, sesuai `docs/STATUS-HALAMAN.md`)

- **38 route halaman** semuanya ada & hidup. Satu-satunya yang **sengaja di luar
  scope**: halaman **Pre-Launch Waitlist** (tidak ada route-nya).
- **Deviasi penamaan 🧩:** prefix `/app` dipakai **hanya** untuk Dashboard
  (`/app`) & Onboarding (`/app/onboarding`). Halaman app lain tanpa prefix
  (`/wallet`, `/history`, `/budget`, `/settings`, …).
- **Profil & Akun** tidak di `/settings/profile` — digabung sebagai section
  default di `/settings`.
- **Sebagian/mock:** generator gambar share sekarang **nyata** (`next/og`);
  tab **Properti** `/wealth` tetap **teaser** (PRD A12, di luar V1).
- **Route redirect/legacy:** `/insight` `⟲` `/history`, `/r/[code]` `⟲`
  `/checkout`.
- **Pembayaran:** Midtrans Core API nyata; nama file lama `snap-payment-sheet.tsx`
  & `annual-plan-modal.tsx` serta `GET /api/price` sudah **dihapus** (paket 84).

> Dokumen ini diturunkan langsung dari struktur `app/**` & berkas navigasi;
> setiap route di §1 dapat diverifikasi dengan membuka folder rutenya.

