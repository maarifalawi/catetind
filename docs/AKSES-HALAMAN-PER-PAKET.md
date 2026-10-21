# Akses Halaman per Paket

Sumber kebenaran:

- **Halaman** → `lib/subscription/page-access.ts` (`PAGE_ACCESS`)
- **Kemampuan paket** → `lib/data/pricing.ts` (`PLAN_CAPABILITIES`)
- **Gerbang sesi / halaman publik** → `lib/public-routes.ts` + `middleware.ts`

Halaman yang tidak terdaftar di `PAGE_ACCESS` **tidak dikunci** (default terbuka).
Kalau sebuah halaman baru khusus paket berbayar, tambahkan aturannya di sana —
jangan menaruh `if (planId …)` baru di dalam halaman.

**Halaman terkunci tidak dirender sama sekali.** Klik menu/tautan ke halaman yang
tidak berhak → navigasi dibatalkan + popup upgrade. Buka URL langsung → halaman
ditahan (tidak ada isi di HTML), lalu user dipindahkan ke halaman aman terdekat
(Dashboard / Pengaturan) sambil popup upgrade tetap terbuka.

## 0. Syarat MASUK app: paket aktif

Sebelum aturan per-paket di bawah berlaku, ada satu gerbang global di
`middleware.ts` (`lib/subscription/app-access.ts`):

| Keadaan user | Yang terjadi |
|---|---|
| punya sesi + paket aktif | app boleh dibuka |
| punya sesi, **belum pernah beli** | **dialihkan ke `/checkout`** (halaman harga) |
| punya sesi, paket kedaluwarsa | dialihkan ke `/checkout` |
| punya sesi, paket gagal dibaca (DB/jaringan) | app dibuka — "tidak tahu" ≠ "belum bayar" |
| backend belum dikonfigurasi (demo/test) | app dibuka |

Artinya Dashboard & halaman app lain **tidak dirender** untuk user yang belum
membayar — bukan sekadar menampilkan popup di atas app. Rute publik di daftar
`PUBLIC_ROUTES` tetap terbuka untuk semua orang.

## 1. Halaman publik / pre-app

Tidak butuh sesi dan **tidak pernah** butuh paket:

`/` · `/welcome` · `/login` · `/login/verify` · `/checkout` · `/checkout/bayar` ·
`/checkout/selesai` · `/bantuan` · `/contact` · `/changelog` · `/privacy` ·
`/terms` · `/security` · `/join/[code]` · `/share/[id]` · `/r/[code]` ·
`/registered` · `/preview-landing` (redirect)

Catatan: `/join/[code]` adalah **landing undangan** Joint Wallet. Siapa pun boleh
membuka tautannya; halaman Joint Wallet-nya sendiri (`/joint`) tetap terkunci
untuk paket yang tidak punya `joint-wallet`.

## 2. Matriks halaman app

| Halaman | Rute | Catet Aja | Waras | Sultan | Aturan |
|---|---|:---:|:---:|:---:|---|
| Dashboard | `/app` | ✅ | ✅ | ✅ | terbuka |
| Onboarding | `/app/onboarding` | ✅ | ✅ | ✅ | terbuka (dikecualikan dari gerbang paket & PIN) |
| Riwayat & Insight | `/history` | ✅ | ✅ | ✅ | terbuka |
| Dompet & Akun | `/wallet` | ✅ | ✅ | ✅ | terbuka |
| Budget & Target Nabung | `/budget` | ✅ | ✅ | ✅ | terbuka |
| Tagihan Rutin | `/bills` | ✅ | ✅ | ✅ | terbuka |
| Kalender Cashflow | `/calendar` | ✅ | ✅ | ✅ | terbuka |
| Kekayaan & Hutang | `/wealth` | ✅ | ✅ | ✅ | terbuka |
| Ajak Teman | `/referral` | ✅ | ✅ | ✅ | terbuka |
| Pusat Bantuan (app) | `/help` | ✅ | ✅ | ✅ | terbuka |
| Panduan Install | `/install` | ✅ | ✅ | ✅ | terbuka |
| Pengaturan (semua section kecuali AI) | `/settings`, `/settings/billing`, `/settings/appearance`, `/settings/categories`, `/settings/notifications`, `/settings/security`, `/settings/data`, `/settings/logout` | ✅ | ✅ | ✅ | terbuka |
| **Joint Wallet** | `/joint` | 🔒 | ✅ | ✅ | butuh `joint-wallet` |
| **AI Preferences** | `/settings/ai` | 🔒 | ✅ | ✅ | butuh `ai-chat` |

`/insight` hanya redirect ke `/history` (tidak punya halaman sendiri).

## 3. Fitur yang tetap terkunci di dalam halaman

Halaman boleh terbuka, tetapi fitur berbayar di dalamnya tetap mengikuti
kemampuan paket:

| Fitur | Letak | Catet Aja | Waras | Sultan |
|---|---|:---:|:---:|:---:|
| AI Coach (chat) | FAB `/app` + panel chat | 🔒 | ✅ | ✅ |
| Scan struk (OCR) | AI capture di AI Coach | 🔒 | ✅ | ✅ |
| Input suara (parsing) | AI capture di AI Coach | 🔒 | ✅ | ✅ |
| Auto-kategorisasi | `POST /api/ai/categorize` | 🔒 403 | ✅ | ✅ |
| Rekap mingguan AI | `/app` (banner Jumat–Minggu) & `/history` | 🔒 | ✅ | ✅ |
| Joint Wallet | `/joint` | 🔒 | ✅ | ✅ |
| AI tanpa batas | kuota AI (`ai-unlimited`) | 🔒 | 🔒 | ✅ |
| Priority support | `priority-support` | 🔒 | 🔒 | ✅ |
| Top up token AI | `/settings/billing` | 🔒 (tidak punya AI) | ✅ | ❌ (unlimited) |

Endpoint yang menolak di server untuk paket tanpa kemampuan:

- `POST /api/ai/text` → `ai-chat`
- `POST /api/ai/ocr` → `ocr`
- `POST /api/ai/categorize` → `ai-categorize`
- `POST /api/parse-voice` → `voice`

Jawabannya **403 `plan-locked`** (bukan 200 yang berpura-pura berhasil).

## 4. Perilaku saat paket belum diketahui

Kalau backend belum terkonfigurasi atau `/api/subscription` gagal dibaca,
`lockedPageCapability()` mengembalikan `null` → **tidak ada halaman yang
dikunci**. Ini aturan yang sama dengan fitur lain: jangan menuduh user belum
bayar hanya karena satu request gagal. Yang tetap berjalan adalah `inputLocked`
(belum punya paket → pencatatan ditahan), dan itu hanya aktif saat paket
**benar-benar terbaca** sebagai kosong/kedaluwarsa.

Selama jawaban paket belum datang (`planReady` false), halaman yang punya
`capability` **ditahan render-nya** — jadi paket Catet Aja tidak sempat melihat
isi `/joint` atau `/settings/ai` di HTML awal. Halaman tanpa `capability` tetap
render normal supaya Dashboard tidak ikut berkedip.

## 5. Cara mengubah batasan

1. Ubah `PAGE_ACCESS` di `lib/subscription/page-access.ts` (tambah/ubah `capability`).
2. Kalau butuh kemampuan baru, tambahkan di `PLAN_CAPABILITIES` (`lib/data/pricing.ts`)
   lalu di `Capability`.
3. Perbarui `lib/subscription/page-access.test.ts` — test itu mengunci matriks
   tiga paket supaya tidak bergeser tanpa sengaja.
4. Jalankan `pnpm vitest run lib/subscription/page-access.test.ts` dan `pnpm exec tsc --noEmit`.

Efek otomatis: halaman terkunci tidak dirender; klik menu/tautan memunculkan
popup upgrade (`UpgradeGateProvider` → `UpgradeModal`), dan sidebar & menu
Pengaturan menampilkan badge 🔒. Nominal upgrade tetap dari `priceFor()`.
