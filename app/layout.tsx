import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { AIChatWidget } from '@/components/catetind/ai-chat-widget'
import { AppLockProvider } from '@/components/catetind/app-lock-provider'
import { DemoSeedGate } from '@/components/catetind/demo-seed-gate'
import { OnboardingWelcomeToast } from '@/components/catetind/onboarding-welcome-toast'
import { MobileBottomNav } from '@/components/MobileBottomNav'
import { MoneyContextProvider } from '@/components/catetind/money-context-provider'
import { OfflineBanner } from '@/components/catetind/offline-banner'
import { PrivacyProvider } from '@/components/catetind/privacy-provider'
import { ServiceWorkerRegistration } from '@/components/catetind/service-worker-registration'
import { SmoothScrollProvider } from '@/components/catetind/smooth-scroll-provider'
import { SubscriptionBanner } from '@/components/catetind/subscription-banner'
import { SubscriptionGateProvider } from '@/components/catetind/subscription-gate-provider'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

/* ── TIPOGRAFI — HANYA SATU FONT DI SELURUH SISTEM: INTER ────────────────────
   Inter dimuat `next/font/google` dan ikut di-self-host saat build, jadi TIDAK
   ada request ke CDN font saat runtime dan TIDAK ada layout shift.

   Inter mengisi KEDUA slot: `--font-sans` (teks/body) DAN `--font-display`
   (judul, angka besar & metrik) — lihat app/globals.css. Jadi seluruh app
   hanya memakai SATU typeface.

   Axis `opsz` (optical size 14–32) ikut dimuat supaya Inter berperan sebagai
   "Display": browser otomatis memakai potongan optik yang dirancang untuk teks
   besar (judul & nominal) dan memakai potongan "text" untuk body — satu font,
   dua optimasi ukuran, tanpa menambah font kedua. */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  axes: ['opsz'],
})

export const metadata: Metadata = {
  title: 'CatetInd — Track. Grow. Secure.',
  description:
    'CatetInd is a modern, minimalist personal finance app to track spending, earnings, and insights.',
  generator: 'v0.app',
  /* Favicon = public/LOGO.png (aset resmi, 1080×1080) — PAKET 70: titiknya
     dipindah dari `favicon.png` ke `LOGO.png` atas permintaan pemilik produk.
     File itu dipakai APA ADANYA: TIDAK digenerate ulang, TIDAK diwarnai ulang,
     TIDAK di-crop — jadi warna favicon persis seperti aset aslinya.
     Ikon Home Screen / PWA tetap public/icons/*.png (digenerate
     scripts/generate-icons.mjs) supaya saat di-Add to Home Screen logonya
     kotak penuh, bukan ikon polos. */
  icons: {
    icon: [{ url: '/LOGO.png', type: 'image/png', sizes: '1080x1080' }],
    shortcut: '/LOGO.png',
    apple: [{ url: '/icons/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#ffffff',
  userScalable: false,
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
    <html lang="en" className={`light ${inter.variable}`}>
      <body className="font-sans antialiased">
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
                <div data-catetind-page-root>
                  {/* Gerbang seed demo (paket 65): menulis data contoh lewat store
                      HANYA saat NEXT_PUBLIC_DEMO=1 — di produksi ia no-op. */}
                  <DemoSeedGate />
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

                {/* Toast SENGAJA di luar wrapper inert: notifikasi (mis. "tersalin")
                    harus tetap bisa diklik walau ada sheet terbuka. */}
                <Toaster />
                {/* Toast "Setup selesai!" — sekali jalan tepat setelah onboarding */}
                <OnboardingWelcomeToast />
              </AppLockProvider>
            </SubscriptionGateProvider>
          </PrivacyProvider>
        </MoneyContextProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
