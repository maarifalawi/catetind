# 🗺️ PETA HALAMAN & ALUR (FLOW) — CatetInd

> **Tujuan dokumen ini:** memetakan **SEMUA** halaman/route yang benar-benar ada
> di `app/**`, lalu menyusunnya jadi **alur antar-halaman (A → B → C)** sesuai
> pengalaman user nyata. **Tidak ada satu halaman pun yang di-skip.**
>
> 🔗 **Semua route di dokumen ini adalah TAUTAN yang bisa diklik** dan langsung
> membuka halaman di **https://catetind.com** (origin kanon = `SITE_ORIGIN` di
> `lib/site.ts`). Contoh: [`/wallet`](https://catetind.com/wallet).
>
> **Sumber kebenaran:** `app/**` (route nyata), `lib/navigation.ts`,
> `lib/public-routes.ts`, `lib/shows-amounts.ts`, `components/MobileBottomNav.tsx`
> (`FOCUS_ROUTES`), `lib/site.ts`, `docs/STATUS-HALAMAN.md`,
> `inventaris_ui_definitif.md`.
>
> **Basis kode:** Next.js 16 · React 19 · Tailwind v4 · TypeScript.
> **Terakhir disusun:** 14 Okt 2026.

---

## 0. Cara baca dokumen ini

- **§1** = inventaris lengkap semua halaman (dikelompokkan per wilayah app).
- **§2** = alur utama (Flow 1 … Flow 21) — tiap langkah TAUTAN yang bisa diklik.
- **§3** = peta navigasi global (sidebar desktop & bottom-nav mobile).
- **§4** = tabel ringkas "dari halaman mana → bisa ke halaman mana".
- **§5** = gerbang global (siapa boleh lihat apa).
- **§6** = catatan & status jujur (deviasi, yang di luar scope).

File sistem non-halaman (404, error boundary, OG image) ada di **§1H**; endpoint
API pendukung ada di **§1I**.

**Notasi:** `→` transisi user · `(query)` parameter URL · `⟲` redirect · `⌛` hanya
di kondisi tertentu · `🔒` butuh sesi/login · `🧩` deviasi sengaja dari inventaris.

> **Route dinamis** (`/wallet/[id]`, `/budget/[id]`, `/join/[code]`, `/r/[code]`,
> `/share/[id]`) tidak punya satu alamat tetap. Agar bisa diklik, tautan contohnya
> memakai nilai nyata: [`/wallet/1`](https://catetind.com/wallet/1),
> [`/budget/1`](https://catetind.com/budget/1),
> [`/join/A7K2M9`](https://catetind.com/join/A7K2M9),
> [`/r/A7K2M9`](https://catetind.com/r/A7K2M9),
> [`/share/1`](https://catetind.com/share/1).

---

## 1. INVENTARIS LENGKAP HALAMAN

Total **38 route halaman** (`page.tsx`) + halaman sistem. Dikelompokkan jadi
7 wilayah:

### 1A. Publik / Pra-App (tanpa navigasi app — `FOCUS_ROUTES`)

| # | Route | File | Komponen | Peran |
|---|---|---|---|---|
| 1 | [`/`](https://catetind.com/) | `app/page.tsx` | `landing/*` | **Landing page** pemasaran (root). Hero, Pain Calculator, Wealth Gap, Social Proof, Pricing, FAQ, Sticky CTA. |
| 2 | [`/welcome`](https://catetind.com/welcome) | `app/welcome/page.tsx` | `welcome-screen.tsx` | Halaman depan **editorial gelap** sebelum punya akun. CTA daftar + masuk + tautan legal. |
| 3 | [`/registered`](https://catetind.com/registered) | `app/registered/page.tsx` | (inline server) | **"Terima kasih"** setelah registrasi dari landing. Bawa `?email=` & `?plan=`. CTA lanjut bayar. |
| 4 | [`/privacy`](https://catetind.com/privacy) | `app/privacy/page.tsx` | `legal-shell.tsx` + `lib/legal/privacy.ts` | Kebijakan Privasi (data = dokumen). |
| 5 | [`/terms`](https://catetind.com/terms) | `app/terms/page.tsx` | `legal-shell.tsx` + `lib/legal/terms.ts` | Syarat & Ketentuan. |
| 6 | [`/join/[code]`](https://catetind.com/join/A7K2M9) | `app/join/[code]/page.tsx` | `join-invite-screen.tsx` | **Landing undangan Joint Wallet** (sisi B). Kode 6 karakter. |
| 7 | [`/r/[code]`](https://catetind.com/r/A7K2M9) ⟲ | `app/r/[code]/page.tsx` | — | **Tautan referral** → redirect ke [`/checkout`](https://catetind.com/checkout)`?kode=<KODE>`. |
| 8 | [`/share/[id]`](https://catetind.com/share/1) | `app/share/[id]/page.tsx` | `share-preview-screen.tsx` | **Pratinjau kartu share** publik (nol angka rupiah). |
| 9 | [`/help`](https://catetind.com/help) 🔒 | `app/help/page.tsx` | `help-center-screen.tsx` | Pusat Bantuan **di dalam app** — memakai `ScreenShell` (sidebar + data). Wajib login; tidak pernah ada di `PUBLIC_ROUTES`. |
| 9b | [`/bantuan`](https://catetind.com/bantuan) | `app/bantuan/page.tsx` | `landing/lp/help-center.tsx` | Pusat Bantuan **publik** (artikel + kontak, tanpa sidebar app). Tujuan tautan "Emailmu nggak ketemu?" di [`/login`](https://catetind.com/login). |

### 1B. Auth (pintu masuk)

| # | Route | File | Komponen | Peran |
|---|---|---|---|---|
| 10 | [`/login`](https://catetind.com/login) | `app/login/page.tsx` | `login-screen.tsx` | **Masuk** — kode OTP 6 angka (tanpa password). Baca `?next=`. |
| 11 | [`/login/verify`](https://catetind.com/login/verify) | `app/login/verify/page.tsx` | `verify-email-screen.tsx` | **Cek email / callback** magic link. Baca `?email=`,`?status=`,`?code=`,`?next=`. |

### 1C. Pre-App (fokus, tanpa sidebar & bottom-nav)

| # | Route | File | Komponen | Peran |
|---|---|---|---|---|
| 12 | [`/app/onboarding`](https://catetind.com/app/onboarding) | `app/app/onboarding/page.tsx` | `onboarding-flow.tsx` | **Onboarding 3 langkah** (<60 detik). Keluar → [`/app`](https://catetind.com/app). |

### 1D. Checkout & Pembayaran

| # | Route | File | Komponen | Peran |
|---|---|---|---|---|
| 13 | [`/checkout`](https://catetind.com/checkout) | `app/checkout/page.tsx` | `checkout-screen.tsx` | **Pilih paket + registrasi**. Baca `?plan=`,`?kode=`. |
| 14 | [`/checkout/bayar`](https://catetind.com/checkout/bayar) | `app/checkout/bayar/page.tsx` | `payment-start-screen.tsx` | **Mulai bayar** (nominal dari server). Baca `?plan=`,`?kode=`,`?upgrade=`,`?dari=`. |
| 15 | [`/checkout/selesai`](https://catetind.com/checkout/selesai) | `app/checkout/selesai/page.tsx` | `payment-done-screen.tsx` | **Status pembayaran** (dibaca dari DB, bukan query). Baca `?order_id=`,`?status=`. |

### 1E. Core In-App (dengan sidebar/bottom-nav)

| # | Route | File | Komponen | Peran |
|---|---|---|---|---|
| 16 | [`/app`](https://catetind.com/app) | `app/app/page.tsx` | `home-screen.tsx` | **Dashboard / Home + Daily HUD**. |
| 17 | [`/wallet`](https://catetind.com/wallet) | `app/wallet/page.tsx` | `wallet-screen.tsx` | Daftar dompet & akun + total saldo. |
| 18 | [`/wallet/[id]`](https://catetind.com/wallet/1) | `app/wallet/[id]/page.tsx` | `wallet-detail-screen.tsx` | Detail satu dompet + tren 30 hari. |
| 19 | [`/history`](https://catetind.com/history) | `app/history/page.tsx` | `history-screen.tsx` | Riwayat & Insight. Baca `?q=`. |
| 20 | [`/budget`](https://catetind.com/budget) | `app/budget/page.tsx` | `budget-screen.tsx` | Budget & Target Nabung. Baca `?add=`,`?tanam=`. |
| 21 | [`/budget/[id]`](https://catetind.com/budget/1) | `app/budget/[id]/page.tsx` | `goal-detail-screen.tsx` | Detail satu celengan (goal/sinking fund). |
| 22 | [`/bills`](https://catetind.com/bills) | `app/bills/page.tsx` | `bills-screen.tsx` | Tagihan rutin (tandai lunas/undo). |
| 23 | [`/calendar`](https://catetind.com/calendar) | `app/calendar/page.tsx` | `cashflow-calendar-screen.tsx` | Kalender cashflow + inspector hari. |
| 24 | [`/wealth`](https://catetind.com/wealth) | `app/wealth/page.tsx` | `wealth-screen.tsx` | Kekayaan & Hutang (investasi/properti⁽ᵗᵉᵃˢᵉʳ⁾/hutang). |
| 25 | [`/joint`](https://catetind.com/joint) | `app/joint/page.tsx` | `joint-screen.tsx` | Joint Wallet (buku bersama, split, invite, privat). |
| 26 | [`/referral`](https://catetind.com/referral) | `app/referral/page.tsx` | `referral-screen.tsx` | Ajak Teman (kode referral + reward). |
| 27 | [`/install`](https://catetind.com/install) | `app/install/page.tsx` | `install-guide-screen.tsx` | Panduan install PWA per platform. |
| 28 | [`/insight`](https://catetind.com/insight) ⟲ | `app/insight/page.tsx` | — | **Redirect** lama → `/history` (jaga bookmark). |

### 1F. Pengaturan (master–detail, semua di bawah `/settings`)

Semua halaman ini hidup di dalam **satu layout** (`app/settings/layout.tsx` →
`SettingsShell`) sehingga **sidebar global tidak pernah hilang** saat pindah
section. Daftar menunya satu sumber: `SETTINGS_MENU` di `settings-shell.tsx`.

| # | Route | File | Panel | Isi |
|---|---|---|---|---|
| 29 | [`/settings`](https://catetind.com/settings) | `app/settings/page.tsx` | `ProfileSettingsPanel` | **Profil & Akun** (section default). Nama, email, gajian, konteks uang. |
| 30 | [`/settings/billing`](https://catetind.com/settings/billing) | `app/settings/billing/page.tsx` | `BillingSettingsPanel` | **Langganan** — kartu paket, kuota AI, jalur **upgrade**, top-up token. |
| 31 | [`/settings/appearance`](https://catetind.com/settings/appearance) | `app/settings/appearance/page.tsx` | `settings-panel-preferences.tsx` | **Tampilan** — terang/gelap. |
| 32 | [`/settings/categories`](https://catetind.com/settings/categories) | `app/settings/categories/page.tsx` | `settings-panel-preferences.tsx` | **Kategori** — atur/hapus/pulihkan kategori. |
| 33 | [`/settings/ai`](https://catetind.com/settings/ai) | `app/settings/ai/page.tsx` | `settings-panel-preferences.tsx` | **AI** — auto-kategori & gaya Minca (`lib/ai-prefs.ts`). |
| 34 | [`/settings/notifications`](https://catetind.com/settings/notifications) | `app/settings/notifications/page.tsx` | `notification-settings.tsx` | **Notifikasi** — Web Push (`use-push-notifications.ts`). |
| 35 | [`/settings/security`](https://catetind.com/settings/security) | `app/settings/security/page.tsx` | `settings-panel-*` | **Keamanan** — PIN (PBKDF2) + biometrik (WebAuthn) + hapus akun. |
| 36 | [`/settings/data`](https://catetind.com/settings/data) | `app/settings/data/page.tsx` | `DataExportSettingsPanel` | **Export Data** — unduh semua data user (JSON). |
| 37 | [`/settings/logout`](https://catetind.com/settings/logout) | `app/settings/logout/page.tsx` | `LogoutSettingsPanel` | **Keluar** — akhiri sesi (redirect ke `/login`). |

### 1G. Halaman sistem internal

| # | Route | File | Peran |
|---|---|---|---|
| 38 | [`/palette`](https://catetind.com/palette) | `app/palette/page.tsx` | **Review desain** palet warna (internal, `noindex`). |

### 1H. File sistem Next.js (bukan halaman, tapi terpasang otomatis)

| File | Peran |
|---|---|
| `app/not-found.tsx` | **404** — URL tak dikenal (status HTTP 404) → `not-found-screen`. |
| `app/error.tsx` | Error boundary **akar** (menangkap `/app` dst.) → `segment-error-screen`. |
| `app/app/error.tsx`, `app/budget/error.tsx`, `app/history/error.tsx`, `app/joint/error.tsx`, `app/wallet/error.tsx`, `app/wealth/error.tsx` | Error boundary **per segmen**. |
| `app/settings/layout.tsx` | Layout bersama semua `/settings/*` (sidebar tetap). |
| `app/settings/loading.tsx` | Skeleton loading settings. |
| [`robots.txt`](https://catetind.com/robots.txt), [`sitemap.xml`](https://catetind.com/sitemap.xml), `app/manifest.ts` | SEO & PWA manifest. |
| `app/share/[id]/opengraph-image.tsx`, `app/share/[id]/twitter-image.tsx` | Gambar kartu share 1200×630 (`next/og`). |

### 1I. Endpoint API (`app/api/**`) — pendukung halaman, bukan halaman

| Endpoint | Method | Dipakai oleh |
|---|---|---|
| [`/api/session`](https://catetind.com/api/session) | GET / DELETE | Login, identitas, keluar. |
| [`/api/wallets`](https://catetind.com/api/wallets) · [`/api/wallets/[id]`](https://catetind.com/api/wallets/1) | GET/POST · GET/PUT/DELETE | [`/wallet`](https://catetind.com/wallet), [`/wallet/[id]`](https://catetind.com/wallet/1). |
| [`/api/subscription`](https://catetind.com/api/subscription) | GET | [`/checkout/selesai`](https://catetind.com/checkout/selesai), [`/settings/billing`](https://catetind.com/settings/billing). |
| [`/api/payment/charge`](https://catetind.com/api/payment/charge) | POST | [`/checkout/bayar`](https://catetind.com/checkout/bayar) (buat tagihan). |
| [`/api/payment/status`](https://catetind.com/api/payment/status) | GET | Kartu instruksi bayar (polling status). |
| [`/api/payment/webhook`](https://catetind.com/api/payment/webhook) | POST | Midtrans → pemenuhan paket/referral. |
| [`/api/pricing/recent-purchases`](https://catetind.com/api/pricing/recent-purchases) | GET | Live feed landing. |
| [`/api/referral/validate`](https://catetind.com/api/referral/validate) · [`/api/referral/reward`](https://catetind.com/api/referral/reward) | POST | [`/referral`](https://catetind.com/referral), [`/r/[code]`](https://catetind.com/r/A7K2M9). |
| [`/api/ai/text`](https://catetind.com/api/ai/text) · [`/api/ai/ocr`](https://catetind.com/api/ai/ocr) · [`/api/ai/categorize`](https://catetind.com/api/ai/categorize) | POST | AI Coach, scan struk, auto-kategori. |
| [`/api/parse-voice`](https://catetind.com/api/parse-voice) | POST | Input suara. |
| [`/api/push/subscribe`](https://catetind.com/api/push/subscribe) · [`/api/push/send`](https://catetind.com/api/push/send) | POST/DELETE · POST | [`/settings/notifications`](https://catetind.com/settings/notifications). |
| [`/api/share/[id]/image`](https://catetind.com/api/share/1/image) | GET | Gambar share (Story 1080×1920). |

---

## 2. ALUR ANTAR-HALAMAN (A → B → C)

### FLOW 1 — Pengunjung baru → daftar → bayar → onboarding → dashboard
*(alur terpanjang & paling penting)*

1. [`/`](https://catetind.com/) **Landing** → klik CTA "Daftar / Coba gratis / pilih paket"
   - → [`/checkout`](https://catetind.com/checkout) — pilih paket + isi email & nama (RegistrationSheet)
     - ⌛ sudah punya akun? → [`/login`](https://catetind.com/login)`?next=/checkout?plan=…&kode=…`
     - "Buat akun" → [`/registered`](https://catetind.com/registered)`?email=…&plan=…` *(layar "Terima kasih")*
       - ⌛ butuh verifikasi email → [`/login/verify`](https://catetind.com/login/verify)`?email=…&next=/checkout/bayar?plan=…`
       - → [`/checkout/bayar`](https://catetind.com/checkout/bayar)`?plan=…&kode=…`
         - → [`/checkout/selesai`](https://catetind.com/checkout/selesai)`?order_id=…`
           - "Masuk ke dashboard" → [`/app/onboarding`](https://catetind.com/app/onboarding) *(3 langkah, <60 detik)*
             - → [`/app`](https://catetind.com/app) **Dashboard**

| Dari | Ke | Pemicu | Catatan teknis |
|---|---|---|---|
| [`/`](https://catetind.com/) | [`/checkout`](https://catetind.com/checkout) | CTA pricing/sticky bar | `LandingCtaProvider` + `buildCheckoutHref()` bawa `?plan=`. |
| [`/checkout`](https://catetind.com/checkout) | [`/login`](https://catetind.com/login) | "Sudah punya akun? Masuk" | `buildCheckoutHref(offerId, code)`. |
| [`/checkout`](https://catetind.com/checkout) | [`/registered`](https://catetind.com/registered) | `registerAccount()` sukses | `buildRegisteredHref(email, planId)`. |
| [`/registered`](https://catetind.com/registered) | [`/login/verify`](https://catetind.com/login/verify) | butuh konfirmasi | `buildVerifyHref(email, payHref)`. |
| [`/registered`](https://catetind.com/registered) | [`/checkout/bayar`](https://catetind.com/checkout/bayar) | paket dipilih | `buildPayHref(plan.id)`. |
| [`/checkout/bayar`](https://catetind.com/checkout/bayar) | [`/checkout`](https://catetind.com/checkout) ⟲ | paket tak dikenal / sudah dimiliki | guard `redirect('/checkout')`. |
| [`/checkout/bayar`](https://catetind.com/checkout/bayar) | [`/checkout/selesai`](https://catetind.com/checkout/selesai) | status `settled` | `payment-instruction-card` / `payment-start-screen`. |
| [`/checkout/selesai`](https://catetind.com/checkout/selesai) | [`/app`](https://catetind.com/app) | "Masuk ke dashboard" | hanya saat state `active`. |
| [`/checkout/selesai`](https://catetind.com/checkout/selesai) | [`/checkout`](https://catetind.com/checkout) | pembayaran belum tercatat | tombol `homeCta`. |
| [`/app/onboarding`](https://catetind.com/app/onboarding) | [`/app`](https://catetind.com/app) | selesai 3 langkah | `router.replace(POST_ONBOARDING_ROUTE)`. |

### FLOW 2 — Masuk untuk user yang sudah punya akun

1. Dari [`/welcome`](https://catetind.com/welcome) / [`/`](https://catetind.com/) / halaman mana pun yang butuh sesi
   - → [`/login`](https://catetind.com/login) — ketik email → kirim kode 6 angka
     - → [`/login/verify`](https://catetind.com/login/verify)`?email=…&next=…` *(opsi magic link dari inbox)*
       - `resolveAuthLanding(next)`:
         - ⌛ ada `?next=` aman → halaman tujuan (mis. [`/checkout/bayar`](https://catetind.com/checkout/bayar)`?plan=…`)
         - → [`/app`](https://catetind.com/app) (bila tidak ada `?next=`)

- [`/login`](https://catetind.com/login) juga dibuka **otomatis** oleh middleware saat user anonim membuka halaman app: [`/wallet`](https://catetind.com/wallet) 🔒 → [`/login`](https://catetind.com/login)`?next=/wallet`.
- Pintu lain ke [`/login`](https://catetind.com/login): tombol "Masuk" di [`/welcome`](https://catetind.com/welcome), navbar landing, navbar situs, layar kunci (lupa PIN), [`/settings/notifications`](https://catetind.com/settings/notifications).
- Setelah keluar ([`/settings/logout`](https://catetind.com/settings/logout) → `signOut`) → [`/login`](https://catetind.com/login).

### FLOW 3 — Checkout & pembayaran (detail)

1. [`/checkout`](https://catetind.com/checkout)
   - pilih kartu paket (`PLANS`: catet-aja / waras / sultan — "sekali bayar")
   - isi RegistrationSheet (email + nama) → akun dibuat
   - ⌛ (opsional) kode teman `?kode=XXXXXX` → diskon 10%
   - "Lanjut bayar"
     - → [`/checkout/bayar`](https://catetind.com/checkout/bayar)`?plan=…&kode=…`
       - ⌛ tanpa sesi → kartu "Masuk dulu ya" → [`/login`](https://catetind.com/login)`?next=/checkout/bayar?…`
       - pilih metode (QRIS / VA / e-wallet / Mandiri Bill)
       - "Bayar sekarang" → `POST` [`/api/payment/charge`](https://catetind.com/api/payment/charge)
         - → kartu instruksi bayar (QR / nomor VA / kode)
           - polling `GET` [`/api/payment/status`](https://catetind.com/api/payment/status) → saat `settled` → [`/checkout/selesai`](https://catetind.com/checkout/selesai)`?order_id=…`
           - ⌛ kedaluwarsa/gagal → "Bikin tagihan baru" / "Ganti metode" (tetap di halaman)

**Upgrade (sudah punya paket):** `buildUpgradeHref(plan, from)` →
[`/checkout/bayar`](https://catetind.com/checkout/bayar)`?plan=…&upgrade=1&dari=…`.
Nominal = **selisih** dari `priceFor()`. Pintu masuk:
[`/settings/billing`](https://catetind.com/settings/billing) + `upgrade-modal`.

### FLOW 4 — Onboarding 3 langkah (pre-app)

[`/app/onboarding`](https://catetind.com/app/onboarding)

1. **Step 1 "Siapa kamu?"** → multi-select situasi hidup + periode dashboard
2. **Step 2 "Pemasukan bulanan?"** → OPSIONAL + auto-suggest 50/30/20 + wajib ≥1 dompet
3. **Step 3 "Catat transaksi 1!"** → input 4-tap + izin notifikasi + upacara benih

- selesai → [`/app`](https://catetind.com/app) (Dashboard; muncul toast "Setup selesai!")

Guard keluar (`EXIT_WARNING`) aktif selama belum selesai (beforeunload + popstate).

### FLOW 5 — Alur harian di dalam app (Dashboard sebagai pusat)

[`/app`](https://catetind.com/app) — Dashboard / Home

- header cari transaksi → [`/history`](https://catetind.com/history)`?q=…`
- kartu saldo (BalanceRing) → [`/joint`](https://catetind.com/joint) · [`/history`](https://catetind.com/history)
- kartu arus uang → [`/history`](https://catetind.com/history)
- jadwal / jatah harian → [`/budget`](https://catetind.com/budget)
- FAB input transaksi → sheet catat (data tersimpan di ledger)
- bottom-nav / sidebar → seluruh halaman app (lihat §3)

### FLOW 6 — Catat transaksi (3 cara)

Dari [`/app`](https://catetind.com/app) (atau halaman app mana pun lewat FAB bottom-nav)

- **Manual** → `TransactionInputEngine` (4 tap) → ledger
- **Voice** → `POST` [`/api/parse-voice`](https://catetind.com/api/parse-voice) (Web Speech) → kartu konfirmasi
- **Scan struk** → `POST` [`/api/ai/ocr`](https://catetind.com/api/ai/ocr) → kartu konfirmasi
  - ↓ konfirmasi → catatan masuk ledger → tampil di [`/app`](https://catetind.com/app) (5 terakhir) & [`/history`](https://catetind.com/history)
  - (butuh dompet baru? ada tautan pintas ke [`/wallet`](https://catetind.com/wallet))

### FLOW 7 — Dompet & pindah dana

[`/app`](https://catetind.com/app) → [`/wallet`](https://catetind.com/wallet) *(daftar dompet + total saldo)*

- "+ Tambah Akun" → AddWalletSheet → tetap di [`/wallet`](https://catetind.com/wallet)
- tap kartu dompet → [`/wallet/[id]`](https://catetind.com/wallet/1) *(detail + tren 30 hari)*
  - "Hapus dompet" → ConfirmDialog + Undo → [`/wallet`](https://catetind.com/wallet)
- menu kartu → "Pindah Dana" → `TransferFlow` (sheet)
- menu kartu → "Hapus dompet" → ConfirmDialog + Undo

### FLOW 8 — Budget & celengan (sinking fund)

[`/app`](https://catetind.com/app) → [`/budget`](https://catetind.com/budget) *(Zona A: jatah harian · Zona B: celengan)*

- "+ Budget baru" → AddBudgetSheet → tetap di [`/budget`](https://catetind.com/budget)
- "+ Tanam celengan" → AddGoalSheet (3 langkah) → tetap di [`/budget`](https://catetind.com/budget)
  - pintasan URL: [`/budget?tanam=1`](https://catetind.com/budget?tanam=1)
- tap celengan → [`/budget/[id]`](https://catetind.com/budget/1) *(GoalDetailScreen)*
  - "Setor" → ContributeSheet → tetap di halaman detail
  - "Hapus celengan" → ConfirmDialog + Undo → [`/budget`](https://catetind.com/budget)
  - ⌛ id tidak dikenal → empty state ramah (bukan 404 mentah)
- dari toast MonthlyReviewModal "atur target" → [`/budget`](https://catetind.com/budget)

### FLOW 9 — Tagihan rutin

[`/app`](https://catetind.com/app) → [`/bills`](https://catetind.com/bills) *(daftar tagihan + pengingat jatuh tempo)*

- "+ Tambah" → AddBillSheet → tetap di [`/bills`](https://catetind.com/bills)
- tandai lunas → tombol aksi / geser → "Batal lunas" (undo)

### FLOW 10 — Kalender cashflow

[`/app`](https://catetind.com/app) → [`/calendar`](https://catetind.com/calendar) *(grid bulan + inspector hari)*

- tap tanggal → CashflowInspector (detail arus uang hari itu)
- ⌛ tambah catatan kalender → AddCalendarNoteSheet → tetap di [`/calendar`](https://catetind.com/calendar)

### FLOW 11 — Kekayaan & Hutang

[`/app`](https://catetind.com/app) → [`/wealth`](https://catetind.com/wealth) *(Aset vs Hutang · Net Worth)*

- Tab Investasi → AddInvestmentSheet (beli/jual, RDN)
- Tab Properti → teaser "Segera" 🧩 (PRD A12 — di luar V1, bukan utang)
- Tab Hutang → AddDebtSheet (simple / platform berbunga)
  - → "Snowball" / DTI badge → angka ikut memotong jatah harian di [`/app`](https://catetind.com/app) & [`/budget`](https://catetind.com/budget)

### FLOW 12 — Joint Wallet + undangan pasangan (Key Flow #2)

[`/app`](https://catetind.com/app) → [`/joint`](https://catetind.com/joint) *(buku bersama, timbangan settlement, timeline)*

- "Ajak pasangan" → JointInviteFlow → kode 6 karakter + tombol Salin/Bagikan
  - tautan: [`/join/[code]`](https://catetind.com/join/A7K2M9) *(pratinjau dari [`/joint`](https://catetind.com/joint): `buildJoinHref()`)*
- "Catat transaksi bersama" → form joint (FAB khusus [`/joint`](https://catetind.com/joint))
- "Split bill" → JointSplitSheet (4 mode) + ringkasan settlement
- privat per transaksi (toggle privasi)

**Sisi B (pasangan):** [`/join/[code]`](https://catetind.com/join/A7K2M9) *(publik)*

- ⌛ valid → "Gabung":
  - ⌛ belum punya akun → [`/checkout`](https://catetind.com/checkout) lalu [`/login`](https://catetind.com/login)
  - ⌛ sudah login → auto-join → [`/joint`](https://catetind.com/joint)
- ⌛ valid → "Nanti aja" → keluar tanpa tekanan (nol hitungan mundur)
- ⌛ dipakai → state "kode sudah dipakai"
- ⌛ kedaluwarsa → state "undangan berlaku 24 jam"

Pintu lain ke [`/join/[code]`](https://catetind.com/join/A7K2M9):
[`/settings`](https://catetind.com/settings) (kartu "Ajak Pasangan").

### FLOW 13 — Share Report (privacy-safe) & pratinjau publik

[`/app`](https://catetind.com/app) atau [`/history`](https://catetind.com/history)

- panel rekap (WeeklyRecapModal / ShareProgressPanel) → "Share Report"
  - → kartu share (slide 1/2/4 — NOL angka rupiah)
    - Web Share files → dibagikan ke aplikasi lain
    - fallback unduh → [`/api/share/[id]/image`](https://catetind.com/api/share/1/image) (Story 1080×1920)
    - tautan publik → [`/share/[id]`](https://catetind.com/share/1)
      - ⌛ kartu dikenal → SharePreviewScreen
      - ⌛ id tak dikenal → empty state hangat (bukan 404)

### FLOW 14 — Referral "Ajak Teman" (dua sisi)

[`/app`](https://catetind.com/app) → [`/referral`](https://catetind.com/referral) *(kode unik + riwayat + reward)*

- bagikan tautan: [`/r/[code]`](https://catetind.com/r/A7K2M9) ⟲ → [`/checkout?kode=<KODE>`](https://catetind.com/checkout) (diskon 10%)

**Sisi teman:** [`/r/[code]`](https://catetind.com/r/A7K2M9) ⟲ [`/checkout`](https://catetind.com/checkout) → [`/checkout/bayar`](https://catetind.com/checkout/bayar)`?plan=…&kode=…`

- `POST` [`/api/referral/validate`](https://catetind.com/api/referral/validate) (validasi kode → DB)
- setelah webhook pembayaran sukses → reward otomatis (idempoten per `order_id`)

### FLOW 15 — Pengaturan (master–detail)

Semua di bawah satu layout, sidebar **tidak pernah hilang**:

1. sidebar / bottom-nav → "Pengaturan" → [`/settings`](https://catetind.com/settings) *(indeks; desktop tampil Profil & Akun)*
   - [`/settings/billing`](https://catetind.com/settings/billing) → kartu paket · kuota AI · top-up · upgrade → [`/checkout/bayar`](https://catetind.com/checkout/bayar)`?…`
   - [`/settings/appearance`](https://catetind.com/settings/appearance) → terang/gelap
   - [`/settings/categories`](https://catetind.com/settings/categories) → atur/hapus/pulihkan kategori
   - [`/settings/ai`](https://catetind.com/settings/ai) → auto-kategori & gaya Minca
   - [`/settings/notifications`](https://catetind.com/settings/notifications) → izin Web Push (`POST /api/push/subscribe`)
   - [`/settings/security`](https://catetind.com/settings/security) → PIN + biometrik + hapus akun
   - [`/settings/data`](https://catetind.com/settings/data) → "Export Data Saya" (unduh JSON)
   - [`/settings/logout`](https://catetind.com/settings/logout) → konfirmasi → `signOut` → [`/login`](https://catetind.com/login)

Mobile: [`/settings`](https://catetind.com/settings) hanya daftar menu; memilih menu
membuka sub-section + tombol "‹ Pengaturan" untuk kembali.

### FLOW 16 — Keluar (logout)

[`/settings`](https://catetind.com/settings) (paling bawah: tombol "Keluar" bergaya plum) · atau [`/settings/logout`](https://catetind.com/settings/logout) langsung

- → LogoutSettingsPanel → konfirmasi → `signOut()` → [`/login`](https://catetind.com/login)

### FLOW 17 — Kunci app (PIN/biometrik)

[`/settings/security`](https://catetind.com/settings/security) → aktifkan PIN

- begitu aktif, `AppLockProvider` **menggantikan seluruh isi app** dengan AppLockScreen saat app dibuka kembali ATAU setelah idle 60 detik
  - ⌛ buka dengan PIN / biometrik → isi app muncul
  - ⌛ "lupa PIN" → [`/login`](https://catetind.com/login) (ganti akun)

### FLOW 18 — Offline & antrean transaksi

Kapan pun koneksi putus (halaman app mana pun)

- `OfflineBanner` muncul
- transaksi disimpan optimistic (⏳) → retry 1s/2s/4s → background 30s
  - ⌛ sukses → hilang penanda (✓)
  - ⌛ `FAILED_PERMANENT` → (🔴) + tombol retry manual di daftar transaksi ([`/history`](https://catetind.com/history))

### FLOW 19 — Push notification

[`/app/onboarding`](https://catetind.com/app/onboarding) Step 3 · [`/settings/notifications`](https://catetind.com/settings/notifications)

- → izin Web Push → `POST` [`/api/push/subscribe`](https://catetind.com/api/push/subscribe)
- pengingat harian / tagihan / rekap dikirim lewat `POST` [`/api/push/send`](https://catetind.com/api/push/send)

### FLOW 20 — Bantuan & Panduan Install

- (publik) navbar situs / footer / kaki [`/login`](https://catetind.com/login) "Emailmu nggak ketemu?" → [`/bantuan`](https://catetind.com/bantuan) *(tanpa sidebar app; aman dibuka sebelum login)*
- (app) sidebar "Pusat Bantuan" → [`/help`](https://catetind.com/help) 🔒 *(memakai `ScreenShell`; hanya untuk user yang sudah masuk)*
- (app) sidebar "Panduan Install" → [`/install`](https://catetind.com/install) → QR + langkah per platform (iOS Safari / Android Chrome / Desktop)

### FLOW 21 — Halaman legal & 404 / error

- [`/login`](https://catetind.com/login), [`/welcome`](https://catetind.com/welcome), footer landing, [`/registered`](https://catetind.com/registered)
  - → [`/privacy`](https://catetind.com/privacy) *(Kebijakan Privasi — logo = pintu ke [`/welcome`](https://catetind.com/welcome))*
  - → [`/terms`](https://catetind.com/terms) *(Syarat & Ketentuan)*
- URL apa pun yang tidak dikenal → `app/not-found.tsx` (HTTP **404**)
- error render di [`/app`](https://catetind.com/app), [`/wallet`](https://catetind.com/wallet), [`/budget`](https://catetind.com/budget), [`/history`](https://catetind.com/history), [`/joint`](https://catetind.com/joint), [`/wealth`](https://catetind.com/wealth) → `error.tsx` per segmen (tombol reset)
- error render di halaman lain → `app/error.tsx` (boundary akar)

---

## 3. PETA NAVIGASI GLOBAL (sidebar desktop & bottom-nav mobile)

Satu sumber kebenaran: `lib/navigation.ts` (`NAV_GROUPS`). Keduanya membaca
daftar yang sama supaya hierarki desktop & mobile tidak pernah beda.

**Sidebar desktop — 5 grup:**

| Grup | Item |
|---|---|
| Menu Utama | [Dashboard](https://catetind.com/app) · [Riwayat & Insight](https://catetind.com/history) |
| Kelola Uang | [Dompet & Akun](https://catetind.com/wallet) · [Budget & Target Nabung](https://catetind.com/budget) · [Tagihan Rutin](https://catetind.com/bills) · [Kalender Cashflow](https://catetind.com/calendar) |
| Aset & Bersama | [Kekayaan & Hutang](https://catetind.com/wealth) · [Joint Wallet](https://catetind.com/joint) · [Ajak Teman](https://catetind.com/referral) |
| Bantuan | [Pusat Bantuan](https://catetind.com/help) · [Panduan Install](https://catetind.com/install) |
| Sistem | [Pengaturan](https://catetind.com/settings) · + tombol **Keluar** → [logout](https://catetind.com/settings/logout) |

**Bottom-nav mobile (tab tetap):** [Home](https://catetind.com/app) ·
[Wallet](https://catetind.com/wallet) · [Insight](https://catetind.com/history) ·
FAB (input transaksi / pindah dana) · menu "Lainnya" (laci berisi semua grup
kecuali Menu Utama = `MOBILE_MENU_GROUPS`).

**Navigasi non-app (navbar SITUS, `public-navbar`)** — dipakai di
[welcome](https://catetind.com/welcome), [login](https://catetind.com/login),
[verify](https://catetind.com/login/verify), [checkout](https://catetind.com/checkout),
[help](https://catetind.com/help), [privacy](https://catetind.com/privacy),
[terms](https://catetind.com/terms), [join](https://catetind.com/join/A7K2M9),
[share](https://catetind.com/share/1): logo → [welcome](https://catetind.com/welcome)
· "Harga" → [checkout](https://catetind.com/checkout) · "Bantuan" →
[help](https://catetind.com/help) · "Masuk" → [login](https://catetind.com/login)
· "Daftar gratis" → [checkout](https://catetind.com/checkout).

**Halaman tanpa navigasi app (`FOCUS_ROUTES` di `MobileBottomNav.tsx`):**
[`/`](https://catetind.com/), [`/registered`](https://catetind.com/registered),
[`/app/onboarding`](https://catetind.com/app/onboarding),
[`/welcome`](https://catetind.com/welcome), [`/checkout`](https://catetind.com/checkout),
[`/login`](https://catetind.com/login), [`/join/[code]`](https://catetind.com/join/A7K2M9),
[`/share/[id]`](https://catetind.com/share/1), [`/privacy`](https://catetind.com/privacy),
[`/terms`](https://catetind.com/terms).

---

## 4. MATRIKS "DARI HALAMAN MANA → BISA KE MANA"

> `⌛` kondisi · `⟲` redirect · `🔒` butuh sesi.

| Dari halaman | Bisa pergi ke |
|---|---|
| [`/`](https://catetind.com/) | [checkout](https://catetind.com/checkout) (CTA/daftar), [login](https://catetind.com/login), [privacy](https://catetind.com/privacy), [terms](https://catetind.com/terms) |
| [`/welcome`](https://catetind.com/welcome) | [checkout](https://catetind.com/checkout), [login](https://catetind.com/login), [privacy](https://catetind.com/privacy), [terms](https://catetind.com/terms) |
| [`/registered`](https://catetind.com/registered) | [checkout/bayar](https://catetind.com/checkout/bayar)`?plan=…` · [`/`](https://catetind.com/) |
| [`/login`](https://catetind.com/login) | [login/verify](https://catetind.com/login/verify) · [checkout](https://catetind.com/checkout) · ⟲ [app](https://catetind.com/app) / `?next=` |
| [`/login/verify`](https://catetind.com/login/verify) | ⟲ [app](https://catetind.com/app) atau `?next=` |
| [`/checkout`](https://catetind.com/checkout) | [login](https://catetind.com/login) · [registered](https://catetind.com/registered) · [checkout/bayar](https://catetind.com/checkout/bayar) · [welcome](https://catetind.com/welcome) |
| [`/checkout/bayar`](https://catetind.com/checkout/bayar) | ⟲ [checkout](https://catetind.com/checkout) · [login](https://catetind.com/login)`?next=…` · [checkout/selesai](https://catetind.com/checkout/selesai) |
| [`/checkout/selesai`](https://catetind.com/checkout/selesai) | [app](https://catetind.com/app) · [checkout](https://catetind.com/checkout) |
| [`/app/onboarding`](https://catetind.com/app/onboarding) | [app](https://catetind.com/app) |
| [`/app`](https://catetind.com/app) | [history](https://catetind.com/history), [joint](https://catetind.com/joint), [wallet](https://catetind.com/wallet), [budget](https://catetind.com/budget), [bills](https://catetind.com/bills), [calendar](https://catetind.com/calendar), [wealth](https://catetind.com/wealth), [referral](https://catetind.com/referral), [help](https://catetind.com/help), [install](https://catetind.com/install), [settings](https://catetind.com/settings) |
| [`/wallet`](https://catetind.com/wallet) | [wallet/[id]](https://catetind.com/wallet/1) · sheet tambah/pindah/hapus |
| [`/wallet/[id]`](https://catetind.com/wallet/1) | [wallet](https://catetind.com/wallet) (setelah hapus) · sheet edit/hapus |
| [`/history`](https://catetind.com/history) | [budget](https://catetind.com/budget) · panel share |
| [`/budget`](https://catetind.com/budget) | [budget/[id]](https://catetind.com/budget/1) · sheet tambah/tanam/setor |
| [`/budget/[id]`](https://catetind.com/budget/1) | [budget](https://catetind.com/budget) (setelah hapus) · sheet setor |
| [`/bills`](https://catetind.com/bills) | sheet tambah tagihan (tetap di halaman) |
| [`/calendar`](https://catetind.com/calendar) | inspector hari · sheet catatan kalender |
| [`/wealth`](https://catetind.com/wealth) | sheet investasi/hutang · teaser properti |
| [`/joint`](https://catetind.com/joint) | [join](https://catetind.com/join/A7K2M9) · sheet catat/split/privat |
| [`/join/[code]`](https://catetind.com/join/A7K2M9) | [checkout](https://catetind.com/checkout) → [login](https://catetind.com/login) · [joint](https://catetind.com/joint) · keluar |
| [`/referral`](https://catetind.com/referral) | [r](https://catetind.com/r/A7K2M9) ⟲ [checkout](https://catetind.com/checkout)`?kode=…` |
| [`/r/[code]`](https://catetind.com/r/A7K2M9) | ⟲ [checkout](https://catetind.com/checkout)`?kode=<KODE>` · ⟲ [checkout](https://catetind.com/checkout) |
| [`/share/[id]`](https://catetind.com/share/1) | halaman publik lain (empty state hangat bila id tak dikenal) |
| [`/help`](https://catetind.com/help) | navbar situs → [checkout](https://catetind.com/checkout), [login](https://catetind.com/login), [welcome](https://catetind.com/welcome) |
| [`/install`](https://catetind.com/install) | sidebar & bottom-nav aktif (semua halaman app) |
| [`/settings`](https://catetind.com/settings) | seluruh `/settings/*` · [logout](https://catetind.com/settings/logout) |
| [`/settings/billing`](https://catetind.com/settings/billing) | [checkout/bayar](https://catetind.com/checkout/bayar)`?…&upgrade=1&dari=…` · top-up token |
| [`/settings/notifications`](https://catetind.com/settings/notifications) | [login](https://catetind.com/login) (bila belum masuk) |
| [`/settings/security`](https://catetind.com/settings/security) | layar kunci app (PIN) · hapus akun |
| [`/settings/data`](https://catetind.com/settings/data) | unduh JSON (tidak pindah halaman) |
| [`/settings/logout`](https://catetind.com/settings/logout) | [login](https://catetind.com/login) (setelah signOut) |
| [`/privacy`](https://catetind.com/privacy), [`/terms`](https://catetind.com/terms) | [welcome](https://catetind.com/welcome) (logo = pintu pulang) |
| [`/palette`](https://catetind.com/palette) | halaman internal review |

---

## 5. GERBANG GLOBAL (siapa boleh lihat apa)

Gerbang hidup di root layout / middleware, bukan di tiap halaman:

| Gerbang | Berkas | Aturan |
|---|---|---|
| **Sesi** | `middleware.ts` + `lib/public-routes.ts` | Halaman app (di luar `PUBLIC_ROUTES`) tanpa sesi Supabase yang **diverifikasi** (`supabase.auth.getUser()`, bukan cuma cookie) → `⟲` [`/login`](https://catetind.com/login)`?next=<tujuan>`. **Tidak ada jalan pintas demo/env**: `NEXT_PUBLIC_DEMO=1` dan Supabase kosong tetap ditolak. `/help` & `/install` termasuk halaman app; `/bantuan` & `/contact` publik. |
| **Langganan** | `SubscriptionGateProvider` | Mengunci input transaksi bagi user tanpa paket; dilewati di `PUBLIC_ROUTES`. |
| **Akses halaman per paket** | `PAGE_ACCESS` (`lib/subscription/page-access.ts`) + `ScreenShell` + `UpgradeGateProvider` | Catet Aja: `/joint` & `/settings/ai` 🔒 (butuh Waras); halaman terkunci tidak dirender — klik menu/URL langsung memunculkan popup upgrade. Waras & Sultan: semua halaman app. Rincian & matriks: [`docs/AKSES-HALAMAN-PER-PAKET.md`](./AKSES-HALAMAN-PER-PAKET.md). |
| **Kunci perangkat (PIN)** | `AppLockProvider` | PIN aktif & belum dibuka → `AppLockScreen` menggantikan seluruh isi app. Dilewati di halaman publik. |
| **Toggle nominal (mata)** | `lib/shows-amounts.ts` | Tombol sensor hanya di `AMOUNT_ROUTES`: [app](https://catetind.com/app), [wallet](https://catetind.com/wallet), [history](https://catetind.com/history), [budget](https://catetind.com/budget), [bills](https://catetind.com/bills), [calendar](https://catetind.com/calendar), [wealth](https://catetind.com/wealth), [joint](https://catetind.com/joint). |
| **Seed demo** | `DemoSeedGate` + `lib/demo.ts` | Data contoh hanya saat `NEXT_PUBLIC_DEMO=1`; produksi = kosong jujur. |
| **Nav & AI disembunyikan** | `FOCUS_ROUTES` + `AI_COACH_ROUTES` (`lib/ai-chat.ts`) | Halaman publik/alur fokus: tanpa bottom-nav; AI Coach hanya di [app](https://catetind.com/app). |

`PUBLIC_ROUTES`: [`/`](https://catetind.com/),
[`/registered`](https://catetind.com/registered),
[`/welcome`](https://catetind.com/welcome), [`/login`](https://catetind.com/login),
[`/checkout`](https://catetind.com/checkout), [`/privacy`](https://catetind.com/privacy),
[`/terms`](https://catetind.com/terms), [`/join`](https://catetind.com/join/A7K2M9),
[`/share`](https://catetind.com/share/1),
[`/app/onboarding`](https://catetind.com/app/onboarding).

---

## 6. CATATAN & STATUS (jujur, sesuai `docs/STATUS-HALAMAN.md`)

- **38 route halaman** semuanya ada & hidup. Satu-satunya yang **sengaja di luar
  scope**: halaman **Pre-Launch Waitlist** (tidak ada route-nya).
- **Deviasi penamaan 🧩:** prefix `/app` dipakai **hanya** untuk
  [Dashboard](https://catetind.com/app) & [Onboarding](https://catetind.com/app/onboarding).
  Halaman app lain tanpa prefix: [wallet](https://catetind.com/wallet),
  [history](https://catetind.com/history), [budget](https://catetind.com/budget),
  [settings](https://catetind.com/settings), dst.
- **Profil & Akun** tidak di `/settings/profile` — digabung sebagai section
  default di [settings](https://catetind.com/settings).
- **Sebagian/mock:** generator gambar share sekarang **nyata** (`next/og`);
  tab **Properti** di [wealth](https://catetind.com/wealth) tetap **teaser**
  (PRD A12, di luar V1).
- **Route redirect/legacy:** [insight](https://catetind.com/insight) `⟲`
  [history](https://catetind.com/history);
  [r/[code]](https://catetind.com/r/A7K2M9) `⟲` [checkout](https://catetind.com/checkout).
- **Pembayaran:** Midtrans Core API nyata; nama file lama `snap-payment-sheet.tsx`
  & `annual-plan-modal.tsx` serta `GET /api/price` sudah **dihapus** (paket 84).

> Dokumen ini diturunkan langsung dari struktur `app/**` & berkas navigasi.
> Semua route bisa diklik → domain kanon **https://catetind.com** (`SITE_ORIGIN`).

