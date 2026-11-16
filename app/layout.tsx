import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { LANDING_META } from '@/lib/data/landing'
import { SITE_ORIGIN } from '@/lib/site'
import './globals.css'

/* ── LAYOUT AKAR — KERANGKA DOKUMEN SAJA (TANPA CANGKANG APLIKASI) ───────────
   Layout ini HANYA memasang <html>/<body>, font, metadata, dan Analytics.
   Sebelum paket 108 ia juga memasang seluruh cangkang app:

     AccountScope → MoneyContextProvider → PrivacyProvider →
     SubscriptionGateProvider → UpgradeGateProvider → AppLockProvider →
     OnboardingGate → (DemoSeedGate, SettingsSync, SubscriptionBanner,
     OfflineBanner, MobileBottomNav, AIChatWidget, Toaster,
     OnboardingWelcomeToast, SmoothScrollProvider, ServiceWorkerRegistration)

   Akibatnya SETIAP halaman publik — termasuk landing — mengunduh 2 MB JS
   (28 chunk, termasuk @supabase 254 KB) dan menembak `/api/session` +
   `/api/data` yang dijawab 401 untuk pengunjung anonim. Lighthouse mobile
   landing tertahan di skor 57 karena itu.

   SEKARANG pemisahannya fisik (bukan `if (pathname)`):
     • `app/(public)/layout.tsx` — halaman publik non-landing (login, kontak,
       bantuan, legal, checkout, undangan). Isinya cuma <Toaster/> (sonner),
       karena halaman-halaman itu memang memanggil `toast()`.
     • `app/(app)/layout.tsx`    — seluruh cangkang app di atas, dipasang
       HANYA untuk rute aplikasi (dashboard, dompet, tagihan, pengaturan,
       admin, …).
     • `app/page.tsx` (landing)  — memakai layout INI saja: nol provider, nol
       panggilan sesi, nol request 401.

   KONSEKUENSI YANG DITERIMA: gulir halus (Lenis) dan registrasi service worker
   kini hanya hidup di halaman app. Halaman publik memakai gulir native — lebih
   ringan dan di HP memang sudah 1:1 (Lenis pun sebelumnya dimatikan di
   perangkat sentuh).

   JANGAN menambahkan provider/preferensi app ke file ini lagi: satu impor
   `@/components/catetind/*` yang berat akan menyeret seluruh app ke landing.
   Ada tes penjaga di `app/layout-isolation.test.ts`. */


/* ── TIPOGRAFI — HANYA SATU FONT DI SELURUH SISTEM: INTER DISPLAY ────────────
   Inter DIBUNDEL DI REPO (`app/fonts/inter-latin-variable.woff2`, satu berkas
   variable `wght 100–900` + `opsz 14–32`, subset latin) dan dimuat
   `next/font/local`. Jadi:
     · tidak ada request ke CDN font saat runtime MAUPUN saat build,
     · tidak ada layout shift (Next menambahkan fallback ber-metrik sama),
     · hasilnya SAMA di semua perangkat — Windows, macOS, Android.

   KENAPA BUKAN `next/font/google` LAGI: memuat font lewat Google Fonts berarti
   build/`dev` WAJIB bisa menghubungi fonts.googleapis.com. Saat koneksi itu
   gagal, Next TIDAK menggagalkan build — ia diam-diam memakai fallback Arial
   ber-`size-adjust` (`@font-face { font-family: "Inter Fallback" }`) sehingga
   seluruh app tiba-tiba merender Arial: huruf terasa "asing" dan teks kecil
   tidak terbaca sejelas Inter. Berkas lokal menghapus ketergantungan itu.

   Inter mengisi KEDUA slot: `--font-sans` (teks/body) DAN `--font-display`
   (judul, angka besar & metrik) — lihat app/globals.css. Jadi seluruh app
   hanya memakai SATU typeface.

   Axis `opsz` (optical size 14–32) ikut dibawa berkas variable-nya karena
   potongan "Inter Display" adalah instance `opsz: 32` dari keluarga yang sama.
   app/globals.css memaku `font-variation-settings: 'opsz' 32` pada `html`,
   sehingga SEMUA teks (bukan hanya judul) memakai potongan Display dan tidak
   ada font kedua. */
const interDisplay = localFont({
  src: './fonts/inter-latin-variable.woff2',
  variable: '--font-inter',
  weight: '100 900',
  style: 'normal',
  /* `swap` = teks tampil SEKARANG dengan font cadangan, berkas Inter menyusul.
     Tidak ada layar kosong menunggu font (FOIT). Next tetap menyuntikkan
     `@font-face` fallback ber-`size-adjust` supaya lebar huruf tidak melompat
     saat Inter tiba — CLS tetap 0. */
  display: 'swap',
  preload: true,
  /* Daftar cadangan eksplisit: system-ui di Android/Windows, lalu Arial. */
  fallback: ['system-ui', 'Segoe UI', 'Arial', 'Helvetica', 'sans-serif'],
  adjustFontFallback: 'Arial',
})

/* ── SATU FONT UNTUK SELURUH SISTEM (termasuk landing) ───────────────────────
   Landing sekarang memakai Design System CatetInd: Inter Display untuk body
   (`font-sans`) dan judul (`font-display`). Tidak ada lagi font kedua khusus
   landing. Bobot maksimum semibold (600); `font-bold`/`extrabold`/`black`
   dipetakan ke 600 di app/globals.css. */

export const metadata: Metadata = {
  /* ── METADATA AKAR (SEO halaman utama) ────────────────────────────────────
     Judul/deskripsi DIBACA dari `LANDING_META` (lib/data/landing.ts), bukan
     ditulis lagi di sini: `app/page.tsx` memakai konstanta yang sama, jadi
     judul landing & judul metadata akar mustahil berbeda.

     `metadataBase` WAJIB dipasang. Tanpa itu Next tidak tahu alamat absolut
     situs, sehingga `og:image: "/og-image.png"` dikirim sebagai path relatif
     (atau diresolusi ke `http://localhost:3000`) — WhatsApp/X/Facebook lalu
     gagal menampilkan kartu pratinjau. Dengan `metadataBase`, SEMUA metadata
     gambar relatif di seluruh rute otomatis menjadi URL absolut.

     `alternates.canonical` di root = halaman utama (`https://catetind.com`).
     Halaman publik lain WAJIB memasang canonical-nya sendiri (`/contact`,
     `/changelog`, `/bantuan`, `/privacy`, `/terms`, `/security`, `/checkout`,
     `/welcome`) — kalau tidak, ia mewarisi nilai ini dan Google menganggapnya
     duplikat dari beranda. Halaman `noindex` (`/login`, `/registered`,
     `/share/[id]`, `/join/[code]`) aman karena tetap tidak diindeks. */
  metadataBase: new URL(SITE_ORIGIN),
  title: LANDING_META.title,
  description: LANDING_META.description,
  alternates: { canonical: LANDING_META.ogUrl },
  /* ── OPEN GRAPH & TWITTER CARD ────────────────────────────────────────────
     Satu gambar 1200×630 untuk kedua kartu (`public/og-image.png`, digenerate
     `scripts/landing/make-og-image.mjs`). `twitter.card: summary_large_image`
     butuh rasio lebar; memakai gambar persegi di sini membuat pratinjau X
     terpotong. `locale: id_ID` + `siteName` dipakai WhatsApp/X untuk label
     sumber tautan. */
  openGraph: {
    type: 'website',
    locale: LANDING_META.ogLocale,
    siteName: LANDING_META.ogSiteName,
    title: LANDING_META.ogTitle,
    description: LANDING_META.ogDescription,
    url: LANDING_META.ogUrl,
    images: [
      {
        url: LANDING_META.ogImage,
        width: LANDING_META.ogImageWidth,
        height: LANDING_META.ogImageHeight,
        alt: LANDING_META.ogImageAlt,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: LANDING_META.ogTitle,
    description: LANDING_META.ogDescription,
    images: [LANDING_META.ogImage],
  },
  generator: 'v0.app',
  /* Favicon = artwork `public/faviconn.png` (wordmark "catet" hijau tua di
     kanvas putih 1080×1080) yang digenerate ke `app/favicon.ico`, `app/icon.png`,
     dan `public/favicon-192.png` oleh `scripts/generate-favicon.mjs`
     (`pnpm favicon`). Google butuh favicon persegi minimal 48px di root
     (`/favicon.ico`) supaya logo tampil di hasil pencarian, dulu yang
     dideklarasikan hanya `/LOGO.png` (wordmark 1080px dengan latar putih),
     sehingga Google menampilkan ikon globe tanpa logo.
     Entri 192px sengaja memakai `/favicon-192.png`, BUKAN
     `/icons/icon-192.png`: yang di `public/icons/` adalah ikon Home Screen /
     notifikasi PWA (kotak penuh berlatar gelap, digenerate
     `scripts/generate-icons.mjs`) dan tidak boleh berubah jadi artwork terang
     hanya karena favicon berganti. Ikon Home Screen tetap public/icons/*.png
     supaya saat di-Add to Home Screen logonya kotak penuh, bukan ikon polos. */
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
      { url: '/favicon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/icons/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#ffffff',
  /* `userScalable: false` DIHAPUS: mematikan pinch-zoom melanggar WCAG 1.4.4
     dan bikin pengguna low-vision tidak bisa memperbesar teks. */
  /* ── KEYBOARD VIRTUAL DI MOBILE (paket 64) ────────────────────────────────
     `interactive-widget=resizes-content` membuat CHROME ANDROID benar-benar
     menyusutkan viewport saat keyboard terbuka.

     Penting: iOS Safari MENGABAIKAN atribut ini — di sana keyboard hanya
     mengubah *visual viewport*, dan justru itu yang dulu membuat bottom sheet
     "melayang". Karena itu fix sesungguhnya TIDAK bergantung pada baris ini:
     `useSheetViewportCage` + `[data-catetind-sheet-cage]` (lihat
     hooks/use-sheet-viewport-cage.ts & app/globals.css) menyematkan sheet ke
     visual viewport mana pun. Baris ini dipertahankan karena di Android ia
     membuat latar ikut menyusut, sehingga tidak perlu dua mekanisme berbeda. */
  interactiveWidget: 'resizes-content',
}


/* ── BODY ROOT — SENGAJA TANPA SATU PUN PROVIDER APP ─────────────────────────
   `light` mengunci palet terang (lihat viewport.colorScheme). `suppressHydration-
   Warning` adalah perisai ekstensi browser (custom cursor / penerjemah) yang
   menyuntikkan atribut ke <html>/<body> sebelum React hydrate; itu bukan bug
   aplikasi, markup kita sama.

   Yang TIDAK boleh kembali ke sini: AccountScope, MoneyContextProvider,
   PrivacyProvider, SubscriptionGateProvider, UpgradeGateProvider,
   AppLockProvider, OnboardingGate, MobileBottomNav, AIChatWidget, SettingsSync,
   SmoothScrollProvider, ServiceWorkerRegistration, Toaster app. Semuanya hidup
   di `app/(app)/layout.tsx`. */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={`light ${interDisplay.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

