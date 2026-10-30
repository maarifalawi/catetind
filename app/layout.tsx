import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { AIChatWidget } from '@/components/catetind/ai-chat-widget'
import { AppLockProvider } from '@/components/catetind/app-lock-provider'
import { DemoSeedGate } from '@/components/catetind/demo-seed-gate'
import { SettingsSync } from '@/components/catetind/settings-sync'
import { OnboardingGate } from '@/components/catetind/onboarding-gate'
import { OnboardingWelcomeToast } from '@/components/catetind/onboarding-welcome-toast'
import { MobileBottomNav } from '@/components/MobileBottomNav'
import { MoneyContextProvider } from '@/components/catetind/money-context-provider'
import { OfflineBanner } from '@/components/catetind/offline-banner'
import { PlantArtDefs } from '@/components/catetind/plant-art-defs'
import { PrivacyProvider } from '@/components/catetind/privacy-provider'
import { ServiceWorkerRegistration } from '@/components/catetind/service-worker-registration'
import { SmoothScrollProvider } from '@/components/catetind/smooth-scroll-provider'
import { SubscriptionBanner } from '@/components/catetind/subscription-banner'
import { SubscriptionGateProvider } from '@/components/catetind/subscription-gate-provider'
import { UpgradeGateProvider } from '@/components/catetind/upgrade-gate-provider'
import { Toaster } from '@/components/ui/toaster'
import { LANDING_META } from '@/lib/data/landing'
import { SITE_ORIGIN } from '@/lib/site'
import './globals.css'

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
  display: 'swap',
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    /* `light` mengunci palet terang: app/globals.css punya blok
       `@media (prefers-color-scheme: dark) { :root:not(.light) { … } }`.
       Kanvas halaman sudah eksplisit putih (`bg-canvas`), jadi tanpa kelas ini
       perangkat bermode gelap akan mendapat kanvas putih + permukaan shadcn
       gelap — tidak konsisten. Sesuai `viewport.colorScheme: 'light'`. */
    /* ── `suppressHydrationWarning` = PERISAI EKSTENSI BROWSER ─────────────────
       Ekstensi “custom cursor” (mis. yang menulis `data-cc-prev-cursor`) dan
       penerjemah halaman menyuntikkan atribut/`style` ke <html> & <body> SEBELUM
       React hydrate. Server tidak mungkin mengirim atribut itu, jadi React
       melaporkan “tree hydrated but some attributes … didn't match”.

       Itu bukan bug aplikasi: markup kita memang sama. Menambahkan prop ini
       membuat React tidak membandingkan atribut pada dua elemen itu (isi &
       komponen di dalamnya TETAP diperiksa), sehingga error console hilang
       tanpa mematikan pemeriksaan hydration untuk seluruh app.

       JANGAN dihapus juga saat ada yang melihat diff atribut di DevTools —
       selisihnya berasal dari ekstensi di browser pengunjung, bukan dari HTML
       yang kita render. */
    <html lang="id" className={`light ${interDisplay.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {/* Gradien tanaman (SVG) — satu definisi untuk seluruh app. Wajib di
            root supaya tanaman di halaman/tab mana pun memakai definisi yang
            sama, termasuk saat section lain sedang `display:none`. */}
        <PlantArtDefs />
        <ServiceWorkerRegistration />
        {/* Smooth scroll global (Lenis) — dipasang di root layout supaya
            gulir terasa halus di SEMUA halaman, bukan cuma dashboard */}
        <SmoothScrollProvider />
        {/* Global Privacy Toggle (Sensor Layar): satu state `masked` untuk
            SEMUA nominal di seluruh app. Provider ada di root supaya halaman
            mana pun bisa membaca status yang sama dengan tombol mata di header. */}
        {/* Konteks Uang Global (Pribadi/Keluarga/Bersama) — dulu toggle ini
            ditaruh di body halaman Budget (audit UX #6). Sekarang satu provider
            di root: Sidebar desktop & header mobile membaca nilai yang sama. */}
        <MoneyContextProvider>
          <PrivacyProvider>
            {/* Gerbang Langganan Global (Grace Period / Post-Grace — inventaris
                state III/IV & PRD 4534–4547). Satu provider di root memegang
                status "boleh catat atau tidak" supaya FAB, tombol Tambah sidebar,
                engine input, dan semua sheet tambah membaca fakta yang sama.
                Banner-nya ditaruh paling atas supaya langsung terlihat di halaman
                app mana pun (dan menyembunyikan diri di halaman publik/pre-app). */}
            <SubscriptionGateProvider>
              {/* Gerbang upgrade global: halaman terkunci tidak dirender; klik
                  menu atau URL langsung memunculkan SATU popup upgrade yang
                  sama (dipakai sidebar, drawer, menu Pengaturan, & ScreenShell). */}
              <UpgradeGateProvider>
                {/* Gerbang Kunci Perangkat (paket 39): kalau PIN app aktif &
                    belum dibuka, provider ini MENGGANTIKAN seluruh isi app —
                    termasuk bottom nav, tombol mata, toast, dan AI chat — dengan
                    layar kunci. Dulu toggle PIN di Pengaturan cuma `useState`
                    yang tidak dibaca siapa pun. */}
                <AppLockProvider>
                  {/* ── WRAPPER LATAR APLIKASI (`data-catetind-page-root`) ──────
                      Selagi bottom sheet terbuka, wrapper ini diberi `inert` +
                      `pointer-events: none` oleh `useSheetBackgroundIsolation`
                      (hooks/use-sheet-viewport-cage.ts) supaya seluruh halaman,
                      navigasi, banner, dan tombol mengapung di belakangnya
                      benar-benar mati — tidak ada elemen sticky/fixed latar (mis.
                      CTA "Daftar & mulai" di /checkout) yang ikut bergeser dan
                      bocor saat keyboard HP terbuka. Vaul merender sheet-nya lewat
                      PORTAL ke <body>, jadi sheet ada DI LUAR wrapper ini dan
                      tetap interaktif. */}
                  <OnboardingGate>
                    <div data-catetind-page-root>
                      {/* Gerbang seed demo (paket 65): menulis data contoh lewat store
                          HANYA saat NEXT_PUBLIC_DEMO=1 — di produksi ia no-op. */}
                      <DemoSeedGate />
                      {/* Sinkron pengaturan uang & limit budget dari akun
                          (paket 13): tanpa ini, pindah perangkat = Jatah Hari
                          Ini kembali "belum diatur" & limit kategori hilang. */}
                      <SettingsSync />
                      <SubscriptionBanner />
                      {/* Banner Offline & Antrean Lokal (paket 42) — di bawah banner
                          langganan supaya saat keduanya tampil user melihat dua-duanya.
                          Menyembunyikan diri sendiri kalau online & antrean kosong. */}
                      <OfflineBanner />
                      {children}
                      <MobileBottomNav />
                      {/* Floating AI Chat — AI Coach CatetInd (Domain 4B); state percakapan
                          persisten lintas halaman karena layout tidak unmount saat navigasi */}
                      <AIChatWidget />
                    </div>
                  </OnboardingGate>

                  {/* Toast SENGAJA di luar wrapper inert: notifikasi (mis. "tersalin")
                      harus tetap bisa diklik walau ada sheet terbuka. */}
                  <Toaster />
                  {/* Toast "Setup selesai!" — sekali jalan tepat setelah onboarding */}
                  <OnboardingWelcomeToast />
                </AppLockProvider>
              </UpgradeGateProvider>
            </SubscriptionGateProvider>
          </PrivacyProvider>
        </MoneyContextProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
