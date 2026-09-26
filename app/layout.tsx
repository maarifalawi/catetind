import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import { AIChatWidget } from '@/components/catetind/ai-chat-widget'
import { OnboardingWelcomeToast } from '@/components/catetind/onboarding-welcome-toast'
import { MobileBottomNav } from '@/components/MobileBottomNav'
import { MoneyContextProvider } from '@/components/catetind/money-context-provider'
import { PrivacyProvider } from '@/components/catetind/privacy-provider'
import { ServiceWorkerRegistration } from '@/components/catetind/service-worker-registration'
import { SmoothScrollProvider } from '@/components/catetind/smooth-scroll-provider'
import { SubscriptionBanner } from '@/components/catetind/subscription-banner'
import { SubscriptionGateProvider } from '@/components/catetind/subscription-gate-provider'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

/* Plus Jakarta Sans mengisi slot `--font-display` (judul, angka besar, metrik).
   Ia typeface buatan Tokotype untuk identitas visual kota Jakarta, jadi merek
   ini punya akar tipografi Indonesia. Di-self-host lewat next/font: legal,
   tanpa request CDN saat runtime, dan tanpa layout shift.

   Slot ini SEBELUMNYA diisi 'SF Pro Display' lewat `@font-face` + `src:
   local(...)` di app/globals.css. Dua alasan diganti:
     1. `local(...)` hanya menyala di perangkat Apple, jadi mayoritas pengguna
        (Android) tidak pernah melihatnya dan otomatis jatuh ke Inter.
     2. File resmi SF Pro tidak boleh di-self-host — lisensi Apple membatasi
        penggunaannya untuk aplikasi yang berjalan di platform Apple.
   Sistem ini tetap hanya memakai DUA font: Inter (body) + Plus Jakarta Sans
   (judul/metrik). */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
})

export const metadata: Metadata = {
  title: 'CatetInd — Track. Grow. Secure.',
  description:
    'CatetInd is a modern, minimalist personal finance app to track spending, earnings, and insights.',
  generator: 'v0.app',
  /* Favicon = public/favicon.png (wordmark di kanvas putih).
     Ikon Home Screen / PWA = public/icons/*.png yang digenerate
     scripts/generate-icons.mjs (kotak penuh forest + wordmark cream) supaya
     saat di-Add to Home Screen logonya kelihatan, bukan ikon polos. */
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png', sizes: 'any' },
      { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    shortcut: '/favicon.png',
    apple: [{ url: '/icons/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#ffffff',
  userScalable: false,
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
    <html lang="en" className={`light ${inter.variable} ${jakarta.variable}`}>
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
              <SubscriptionBanner />
              {children}
              <MobileBottomNav />
              {/* Toast non-blocking (sonner, gaya unstyled khas CatetInd) — dipicu
                  setelah bottom sheet ditutup, tanpa modal sukses yang blocking */}
              <Toaster />
              {/* Toast "Setup selesai!" — sekali jalan tepat setelah onboarding */}
              <OnboardingWelcomeToast />
              {/* Floating AI Chat — AI Coach CatetInd (Domain 4B); state percakapan
                  persisten lintas halaman karena layout tidak unmount saat navigasi */}
              <AIChatWidget />
            </SubscriptionGateProvider>
          </PrivacyProvider>
        </MoneyContextProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
