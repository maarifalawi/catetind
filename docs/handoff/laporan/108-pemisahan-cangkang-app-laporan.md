# Laporan Paket 108 — Cangkang App Dipisah Fisik, Landing Jadi Halaman Statis Ringan

> **Tanggal:** 16 Nov 2026
> **Pemicu (kutipan pemilik produk):** *“Lampu hijau penuh! Lanjutkan pemisahan cangkang aplikasi sekarang secara menyeluruh … agar skor Lighthouse Mobile di catetind.com benar-benar melonjak tembus 85-90+ tanpa merusak satu pun fitur yang sudah berjalan.”*
> **Hasil:** cangkang app (provider akun/uang/langganan/PIN + navigasi bawah + AI chat + sinkron pengaturan) hanya hidup di `app/(app)/layout.tsx`. Halaman depan kini memakai layout akar yang **tidak membaca cookie, tidak memanggil sesi, dan tidak mengunduh @supabase/recharts/vaul**. Bundle landing turun, hero ponsel mengunduh varian 480/768 px, dan section bawah-lipatan dipecah jadi chunk terpisah.

---

## 1. Pemisahan fisik cangkang aplikasi

### Struktur baru

| Lokasi | Isi | Contoh rute |
|---|---|---|
| `app/layout.tsx` | **kerangka dokumen saja**: `<html>/<body>`, font lokal, metadata, Analytics | semua rute |
| `app/(public)/layout.tsx` | hanya `<Toaster/>` (sonner) | `/login`, `/contact`, `/bantuan`, `/changelog`, `/privacy`, `/terms`, `/security`, `/checkout`, `/welcome`, `/registered`, `/join/[code]`, `/share/[id]`, `/r/[code]` |
| `app/(app)/layout.tsx` | **seluruh cangkang app**: AccountScope → MoneyContext → Privacy → SubscriptionGate → UpgradeGate → AppLock → OnboardingGate, lalu `data-catetind-page-root` + DemoSeedGate + SettingsSync + SubscriptionBanner + OfflineBanner + MobileBottomNav + AIChatWidget + Toaster + OnboardingWelcomeToast + SmoothScrollProvider + ServiceWorkerRegistration | `/app`, `/wallet`, `/bills`, `/budget`, `/calendar`, `/wealth`, `/history`, `/insight`, `/joint`, `/settings/**`, `/admin`, `/help`, `/install`, `/referral`, `/palette` |
| `app/page.tsx` (landing) | memakai layout akar saja — **nol provider app** | `/` |

Route group `(app)`/`(public)` tidak mengubah satu pun URL: `app/(app)/wallet/page.tsx` tetap `/wallet`. Pemindahan dilakukan dengan `git mv`/`Move-Item`; tidak ada impor relatif di dalam folder rute (semua `@/…`), jadi tidak ada tautan impor yang putus.

### Dua hal yang ikut diperbaiki karena ikut terangkat

1. **404 akar** (`app/not-found.tsx`) memakai `NotFoundScreen` yang membungkus dirinya dengan `ScreenShell` → `ScreenShell` memanggil `useSubscriptionGate`. Begitu provider pindah, build gagal (`/_not-found` prerender). Solusinya mengikuti pola yang **sudah ada** di `SegmentErrorScreen`: prop `withShell` (default `true`), dan 404 akar memakai `withShell={false}`. 404 jadi halaman publik ringan — pengunjung anonim tidak perlu cangkang app untuk membaca “halaman tidak ditemukan”.
2. **`PlantArtDefs`** ternyata sudah mengembalikan `null` sejak “sapu bersih SVG hiasan” (sesi 3) dan hanya dipanggil layout akar → dihapus dari pohon render (berkasnya tetap ada supaya impor lama tidak rusak).

---

## 2. Halaman depan statis & nol panggilan sesi

| Sebelum | Sesudah |
|---|---|
| Layout akar memasang `AccountScope` + `SettingsSync` → setiap pengunjung anonim menembak `/api/session` & `/api/data`, dijawab **401** | Layout akar hanya metadata + font. Landing tidak memasang satu pun provider |
| `/api/session` 401 × 2 terlihat di console landing | **0** permintaan `/api/session`, `/api/data`, `/api/onboarding` (diuji `scripts/qa/navigation.mjs`) |
| Layout akar membaca penyimpanan lewat provider klien sebelum render | Layout akar tidak mengimpor `next/headers`/`cookies()` → tidak ada pembacaan cookie di server; `/` tetap `○ (Static)` dengan `revalidate = 3600` |

Bukti tambahan: `hasBottomNav`/`data-catetind-page-root` **false** saat landing dimuat, dan `AIChatWidget` tidak muncul — cangkang app benar-benar tidak dijalankan, bukan sekadar disembunyikan.

---

## 3. Hero responsif: ponsel tidak lagi mengunduh gambar desktop

`LP_HERO` sekarang membawa `srcSet`/`sizes`, dan **preload** memakai `imageSrcSet`/`imageSizes` sehingga berkas yang dipreload persis berkas yang akan dipakai `<picture>`.

| Varian | Sebelum ada? | Ukuran | Dipakai untuk |
|---|---|---|---|
| `GAMBARDEPAN-1200.webp` | **baru** | 60 KB | desktop ≥1200 px (`sizes="(min-width:1200px) 1200px"`) |
| `GAMBARDEPAN-1600.webp` | ada | 90 KB | desktop DPR tinggi |
| `…-480.webp` | **baru** | 33 KB | ponsel 333 px @1× |
| `…-768.webp` | **baru** | 61 KB | ponsel 333 px @2×/3× |
| `…-1000.webp` | ada | 107 KB | hanya jika layarnya memang butuh |

Hero ponsel SELALU dirender 333 px (`w-[333px]`), jadi angka `sizes="333px"` bukan `100vw`: ponsel tidak lagi mengunduh berkas 1000 px. Hanya satu gambar yang berprioritas tinggi (`fetchPriority="high"`) — visual hero; **avatar pembeli** `loading="lazy"` + `fetchPriority="low"` (2 KB/berkas) dan **gambar kartu fitur** sudah `loading="lazy"` (19–38 KB/berkas).

---

## 4. Bundle landing: navbar tanpa pustaka animasi, section bawah = chunk sendiri

| Perubahan | Efek |
|---|---|
| `LandingReveal` + navbar memakai keyframes CSS (`landing-reveal-in`, `landing-nav-reveal`, `landing-menu-in`) | hero & menu tampil dari frame pertama; framer-motion tidak lagi di jalur kritis hero/nav |
| Panel menu mobile: `motion.div` → `<div class="landing-menu-in">` | `framer-motion` **tidak lagi diimpor** `navbar.tsx` (dipakai di semua halaman publik) |
| `app/page.tsx`: Pain Calculator, Mission, Pricing, FAQ, Purchase Toasts dimuat lewat `next/dynamic` | HTML tetap di-SSR (SEO aman), tetapi chunk JS-nya terpisah dari bundel awal |
| Umpan pembeli tetap memanggil `/api/pricing/recent-purchases` | bukan endpoint sesi — tidak ada 401 |

Catatan jujur: Turbopack (Next 16) tetap mengirim sebagian chunk bersama di `<script>` halaman; yang berubah nyata adalah **komposisi** (tidak ada lagi eksekusi cangkang app: `data-catetind-page-root` false di landing) dan **ukuran gambar**. Angka pasti ada di bagian 6.

---

## 5. Font & tampilan awal

`next/font/local` dengan `display: 'swap'` (teks tampil seketika memakai fallback), `preload: true`, `fallback: ['system-ui','Segoe UI','Arial','Helvetica','sans-serif']`, dan `adjustFontFallback: 'Arial'`. Satu berkas variable `wght 100–900` (subset latin, 72 KB) tetap menjadi satu-satunya typeface — tidak ada permintaan ke Google Fonts.


---

## 6. Gerbang kualitas & pengujian browser

| Gerbang | Hasil |
|---|---|
| `pnpm exec tsc --noEmit` | bersih (0 error) |
| `pnpm test` | **153 berkas · 2.076 tes lolos** (termasuk 6 tes baru `app/layout-isolation.test.ts`) |
| `node scripts/theme/audit-palette.mjs` | 707 berkas, 0 warna di luar palet |
| `node scripts/theme/audit-text-contrast.mjs` | 651 berkas, 0 teks < 60% opacity |
| `node scripts/tools/audit-copy.mjs` | 477 berkas, 79 kalimat terlarang → 0 kemunculan |
| `pnpm build` | sukses; `/` tetap `○ (Static)` |
| `node scripts/qa/audit.mjs` (19 halaman × HP+desktop, akun berbayar & gratis) | **206/206 lolos · 0 gagal** |
| `node scripts/qa/navigation.mjs` (**baru**) | **29/29 lolos** |

`scripts/qa/navigation.mjs` mengunci hal-hal yang paling mudah rusak oleh pemindahan folder:

| Cek | Hasil |
|---|---|
| 11 halaman publik dijawab < 400 (`/`, `/login`, `/contact`, `/bantuan`, `/changelog`, `/privacy`, `/terms`, `/security`, `/welcome`, `/checkout`, `/registered`) | lolos |
| **0** panggilan `/api/session`, `/api/data`, `/api/onboarding` saat landing anonim dibuka | lolos |
| 14 tautan internal yang ditemukan di halaman publik semuanya hidup (< 400) | lolos |
| landing → CTA “Cobain” → `/checkout?period=lifetime&plan=waras` | lolos |
| landing → “Masuk” → `/login` | lolos |
| `/wallet` tanpa sesi → `/login?next=/wallet` | lolos |
| URL tak dikenal anonim → `/login` (gerbang sesi, bukan 404) | lolos |
| `/app`, `/wallet`, `/bills`, `/joint`, `/settings` dengan sesi berbayar → terbuka + `data-catetind-page-root` ada | lolos (5/5) |
| `/admin` dengan akun non-admin → dialihkan ke `/app` (bukan 500/kosong) | lolos |
| 404 untuk pengguna bersesi → status **404**, tanpa cangkang app | lolos |

---

## 7. Lighthouse Mobile — sebelum vs sesudah

Metode: Lighthouse 12, `--form-factor=mobile --throttling-method=simulate` (metode yang sama dengan PageSpeed Insights), dijalankan **ke `https://catetind.com/`**. Empat run sesudah perbaikan diambil berurutan dengan pembersihan proses Chrome antar-run.

| Metrik | Sebelum (15 Nov, `783fba6`) | Sesudah run 1 | run 2 | run 3 | run 4 | **Median** |
|---|---|---|---|---|---|---|
| Performance score | **57** | 76 | 77 | **97** | 68 | **76,5** |
| FCP | 3.290 ms | 1.975 | 3.667 | **1.369** | 3.799 | 2.821 ms |
| LCP | 6.577 ms | 4.595 | 3.804 | **2.494** | 4.678 | 4.200 ms |
| TBT | 262 ms | 267 | 148 | **56** | 152 | **150 ms** |
| CLS | 0 | 0 | 0,047 | 0 | 0,047 | 0,024 |
| Speed Index | 9.421 ms | 3.078 | 4.445 | **1.483** | 6.646 | 3.762 ms |
| Berat halaman | 916 KB | 832 | 833 | 833 | 833 | **833 KB** |
| JS transfer | 542 KB | — | — | — | — | **496 KB** |
| Elemen LCP | logo navbar (`/Dashboard.png`) | gambar hero | h1 | h1 | h1 | — |

**Cara membaca angka ini dengan jujur.** Mesin uji ini (VM Windows tanpa GPU, jaringan kantor yang dipakai bersama proses `npx`/install) menghasilkan **varians besar antar-run**: FCP 1,4 s – 3,8 s untuk halaman yang sama. Skor 97 muncul saat jaringan+menganggur; 68 saat jaringan sedang sibuk. Yang bisa disimpulkan dengan aman:

- **TBT turun drastis** (262 → median 150 ms, terbaik 56 ms) — cangkang app tidak lagi dihidrasi di landing.
- **Elemen LCP sudah benar** (h1 / gambar hero, bukan lagi logo 24 px atau avatar 36 px).
- **LCP terbaik 2,5 s** dan **Speed Index terbaik 1,5 s** pada run yang jaringannya sehat.
- Skor median di mesin ini 76,5; **run bersih 97**. Diukur dari Indonesia (TTFB ke `sin1` ±50–150 ms, bukan 770–850 ms seperti dari VM ini) angka riil seharusnya berada di antara keduanya — untuk angka resmi, jalankan PageSpeed Insights pada `https://catetind.com/`.

### Sisa hambatan struktural (bukan bug, tapi batas Next 16)

Graf impor landing sudah bersih: 27 berkas yang terjangkau dari `app/page.tsx` + `app/layout.tsx` **tidak menyentuh `framer-motion`, `@supabase`, `vaul`, atau `recharts`** (diverifikasi skrip penelusuran impor). Tetap saja HTML landing memuat 26 chunk / 1.638 KB mentah (496 KB terkirim) karena **Next 16 mengirim chunk klien bersama ke semua rute**: chunk framer-motion 123 KB ikut diunduh juga oleh `/privacy` dan `/terms` yang tidak punya satu pun komponen klien. Itulah sebabnya pemisahan layout menurunkan *eksekusi* (0 request sesi, TBT anjlok) tetapi tidak banyak menurunkan *byte*.

Untuk menembus median 85+ secara konsisten, langkah berikutnya adalah mengecilkan JS bersama itu sendiri:

1. cabut framer-motion dari seluruh komponen app (±32 berkas memakainya: bill-card, bills-screen, budget-*, wealth-*, weekly-recap, transaction-input-engine, …) dan ganti dengan keyframes CSS seperti yang sudah dilakukan di landing; atau
2. pindahkan `AIChatWidget`, `MobileBottomNav`, dan sheet-sheet berat ke `next/dynamic` di dalam `app/(app)/layout.tsx` supaya tidak ikut graf klien awal; dan/atau
3. evaluasi build webpack (`next build --webpack`) yang memecah per-entry — sudah dicoba, build-nya lolos setelah `lib/auth/owner-attempts.ts` dipisah, tetapi hasil chunk-nya sama besarnya (36 chunk / 1.551 KB), jadi tidak dipakai.

Catatan teknis kecil yang ikut diperbaiki: `resetOwnerAttemptsForTest` dulu diekspor dari `app/api/auth/owner/route.ts`. File `route` hanya boleh mengekspor handler + opsi segmen; helper itu dipindah ke `lib/auth/owner-attempts.ts` (bersama penghitungnya) dan tes mengimpornya dari sana.

