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

