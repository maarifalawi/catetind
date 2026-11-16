# Laporan Paket 107 — Landing “muncul lama”: hero tidak lagi menunggu JavaScript

> **Tanggal:** 15 Nov 2026
> **Pemicu (kutipan pemilik produk):**
> *“kok pas buka webnya lemot banget ya? gua buka catetind.com itu lama, munculnya juga lama. pas gua buka website kemnaker maganghub dia langsung, malah bisa langsung di scroll sampe bawah.”*
> **Hasil:** hero landing sekarang **terlihat dari frame pertama tanpa JavaScript**, avatar hero turun dari **1,88 MB → 11 KB**, gambar kartu fitur **774 KB → 123 KB**, dan aset `public/` tidak lagi dikirim dengan `max-age=0`.

---

## 1. Diagnosis (diukur di produksi, bukan dugaan)

| # | Temuan | Angka (sebelum) |
|---|---|---|
| 1 | HTML `/` membawa **18 elemen `style="opacity:0"`** | Hero h1, sub-judul, CTA, social proof, mockup, navbar — semuanya `motion.div` dengan `initial={{opacity:0}}`. Konten SUDAH ada di HTML tetapi tidak terlihat sampai framer-motion hydrate. |
| 2 | Halaman `/` memuat **28 chunk JS** | 2.051 KB mentah (termasuk `@supabase` 254 KB) — ekor halaman app ikut ke landing lewat `app/layout.tsx`. |
| 3 | `<head>` mem-preload lima avatar PNG | `/AVA 1.png` 457 KB · `/AVA 2.png` 346 KB · `/AVA 3.png` 483 KB · `/AVA 4.png` 255 KB · `/AVA 5.png` 342 KB = **1.883 KB** untuk foto yang dirender **28–36 px**. Preload ini berebut bandwidth dengan gambar hero (kandidat LCP). |
| 4 | Kartu fitur memakai PNG mentah | 78 + 185 + 163 + 348 = **774 KB** untuk gambar yang dirender ~600 px. |
| 5 | Aset `public/` dikirim dengan `cache-control: public, max-age=0, must-revalidate` | Setiap kunjungan ulang melakukan revalidasi untuk gambar yang seharusnya bisa di-cache. |

**Kesimpulan:** “munculnya lama” bukan karena server lambat (`x-vercel-cache: HIT`, HTML 160 KB), melainkan karena halaman **sengaja dirender kosong** sampai JS selesai — dan JS itu sendiri diantre oleh 1,9 MB avatar.

---

## 2. Perbaikan

| File | Perubahan |
|---|---|
| `components/landing/lp/reveal.tsx` | `LandingReveal` **bukan lagi client component**: `motion.div` + `initial={{opacity:0}}` diganti `<div class="landing-reveal">` dengan custom property `--lr-y` / `--lr-scale` / `--lr-skew` / `--lr-delay`. framer-motion tidak lagi ikut ke bundle hero/nav. |
| `app/globals.css` | Keyframes baru `landing-reveal-in` + `landing-nav-in` (durasi/easing setara spring Framer `bounce .2 duration 1`), `animation-fill-mode: both`, dan media query `prefers-reduced-motion` yang membuat konten **langsung** tampil. |
| `components/landing/lp/navbar.tsx` | `motion.div` (initial opacity 0, y -80) → `<div class="landing-nav-reveal">`; import `LANDING_SPRING` dihapus. |
| `components/landing/lp/hero.tsx` | `<link rel="preload" as="image">` untuk visual hero dengan `media` per breakpoint (`≥1200px` board 1600px, `<1200px` ponsel). |
| `lib/data/landing.ts` | `avatarPool` → `/avatars/ava-N.webp`; empat `LP_MISSION.cards[].image` → varian `-1280.webp`. |
| `components/landing/lp/live-subscribers.tsx` | Avatar: `loading="eager"` → `lazy` + `fetchPriority="low"` (tidak lagi memicu preload di `<head>`), `width/height` 96. |
| `scripts/landing/make-landing-webp.mjs` **(baru)** | Generator WebP mandiri (server statis + Chromium canvas): avatar 96 px, kartu fitur 1280 px. Dijalankan `pnpm landing:webp`. Sumber PNG **tidak** dihapus/ditimpa (bahan regenerasi). |
| `public/avatars/ava-1…5.webp` **(baru)** | 2 + 2 + 2 + 1 + 2 = **9 KB** (dari 1.883 KB). |
| `public/landing/*-1280.webp` **(baru)** | 19 + 30 + 36 + 38 = **123 KB** (dari 774 KB). |
| `vercel.json` | Header `Cache-Control: public, max-age=86400, stale-while-revalidate=604800` untuk `/avatars/*`, `/landing/*`, dan `/GAMBARDEPAN-1600.webp`. |
| `lib/data/landing.test.ts` | Penjaga regresi: avatar wajib `.webp` < 10 KB, gambar mission wajib `.webp` < 120 KB. |
| `package.json` | Skrip `landing:webp`. |

### Kenapa CSS, bukan “tunggu framer siap”

Animasi CSS mulai pada frame pertama dan tetap berjalan walau chunk JS gagal dimuat. `whileInView` (dulu dipakai section di bawah lipatan) mustahil tanpa JS; karena durasinya ~0,8 detik, section sudah tampil penuh saat pengunjung menggulir — tidak ada lagi section kosong saat JS telat. `prefers-reduced-motion` dipindahkan dari hook React ke media query, jadi tidak bergantung pada hidrasi.


---

## 3. Bukti

Dijalankan pada build produksi lokal (`next build && next start`):

| Uji | Hasil |
|---|---|
| Semua request `*.js` **diblokir** (27 request dibatalkan), 1,2 s | `h1` opacity **1**, navbar opacity **1**, gambar hero termuat, avatar `.webp` termuat |
| `currentSrc` visual hero @1280 px | `/GAMBARDEPAN-1600.webp` (**90 KB**) — bukan PNG 3,9 MB |
| Transfer sebelum satu pun JS | **235 KB** (font 72 · CSS 39 · board 90 · logo 15 · 5 avatar 11 · favicon 4) |
| Inline `opacity:0` di `.next/server/app/index.html` | **18 → 2** (dua sisanya panel FAQ yang memang tertutup) |
| `<link rel=preload as=image>` di `<head>` | dulu `/Dashboard.png` + 5 avatar PNG; sekarang `/Dashboard.png` (15 KB) + visual hero ber-`media` |
| Kartu fitur setelah digulir | 19 / 30 / 36 / 38 KB, semuanya termuat |
| `pnpm exec tsc --noEmit` | bersih |
| `pnpm test` | 152 berkas · **2.070 tes lolos** |

Bukti tangkapan layar (folder `qa-shots/`, gitignored): `perf-hero-nojs.png` (hero utuh tanpa JS) dan `perf-footer-withjs.png` (kartu fitur WebP).

---

## 4. Catatan lanjutan (belum dikerjakan, sengaja)

`app/layout.tsx` masih memasang **seluruh cangkang app** (AccountScope, SubscriptionGateProvider, AppLockProvider, OnboardingGate, MobileBottomNav, AIChatWidget, Toaster, dll.) untuk semua rute — termasuk landing. Itulah sumber 28 chunk / ±2 MB JS dan request `/api/session` + `/api/data` (401 untuk pengunjung anonim) yang terlihat di console landing.

Langkah berikutnya yang disarankan: pindahkan cangkang itu ke `app/(app)/layout.tsx` (route group) sehingga `/`, `/contact`, `/checkout`, `/login` hanya memuat bundle landing. Itu perubahan routing yang lebih besar, jadi dipisahkan dari paket ini agar tidak mencampur perbaikan cepat dengan refactor.

---

## 5. Kondisi setelah deploy (Lighthouse mobile, `--throttling-method=simulate`)

Diukur pada `https://catetind.com/` setelah commit `783fba6` live:

| Metrik | Nilai | Catatan |
|---|---|---|
| Performance score | **57** | naik dari kondisi sebelumnya yang hero-nya tidak pernah terlihat sebelum JS selesai |
| FCP | 3,3 s | |
| LCP | 6,6 s | elemen LCP: **logo navbar** `/Dashboard.png`, bukan hero — artinya hero h1 sudah dicat lebih awal |
| TBT | 262 ms | |
| CLS | **0** | tidak ada layout shift |
| Speed Index | 9,4 s | |
| TTFB | 83 ms | server cepat; masalahnya di unduhan aset |
| Berat halaman | 916 KB | gambar hanya ±115 KB, sisanya JS/CSS |
| `unused-javascript` | 121 KiB | |
| bootup / main-thread | 953 ms / 2.885 ms | |

Semua 28 chunk JS selesai diunduh pada ±3–4,2 s di simulasi 4G — itulah yang menahan skor. Jadi:

- **Beres:** halaman tidak lagi putih menunggu JS (dibuktikan dengan memblokir 27 request JS: hero & navbar opacity 1, gambar hero termuat).
- **Belum beres:** halaman belum “enteng”. Cangkang app di `app/layout.tsx` (±542 KB JS) masih ikut ke landing dan menjadi jalur kritis.

### Catatan metodologi

Angka wall-clock dari Playwright di mesin ini TIDAK dipakai: renderer headless di VM sering tidak memproduksi frame, sehingga `paint`/LCP terbaca 0 dan emulasi CDP sempat melaporkan “CSS 1 KB butuh 15 s” (mustahil). Angka final diambil dari Lighthouse `simulate`, metode yang sama dengan PageSpeed Insights.

Langkah berikutnya untuk mengejar skor 85+: keluarkan cangkang app dari bundle landing (route group `app/(app)/layout.tsx`), lalu ukur ulang dengan perintah yang sama.

