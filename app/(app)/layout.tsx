import { AccountScope } from '@/components/catetind/account-scope'
import { AIChatWidget } from '@/components/catetind/ai-chat-widget'
import { AppLockProvider } from '@/components/catetind/app-lock-provider'
import { DemoSeedGate } from '@/components/catetind/demo-seed-gate'
import { SettingsSync } from '@/components/catetind/settings-sync'
import { OnboardingGate } from '@/components/catetind/onboarding-gate'
import { OnboardingWelcomeToast } from '@/components/catetind/onboarding-welcome-toast'
import { MobileBottomNav } from '@/components/MobileBottomNav'
import { MoneyContextProvider } from '@/components/catetind/money-context-provider'
import { OfflineBanner } from '@/components/catetind/offline-banner'
import { PrivacyProvider } from '@/components/catetind/privacy-provider'
import { ServiceWorkerRegistration } from '@/components/catetind/service-worker-registration'
import { SmoothScrollProvider } from '@/components/catetind/smooth-scroll-provider'
import { SubscriptionBanner } from '@/components/catetind/subscription-banner'
import { SubscriptionGateProvider } from '@/components/catetind/subscription-gate-provider'
import { UpgradeGateProvider } from '@/components/catetind/upgrade-gate-provider'
import { Toaster } from '@/components/ui/toaster'

/* ── LAYOUT CANGKANG APLIKASI (route group `(app)`) ──────────────────────────
   SELURUH pembungkus & penyedia data milik app hidup DI SINI, bukan di layout
   akar. Route group `(app)` tidak mengubah URL: `app/(app)/wallet/page.tsx`
   tetap `/wallet`, `app/(app)/settings/billing/page.tsx` tetap
   `/settings/billing`, dst.

   KENAPA DIPISAH (paket 108): selama provider ini berada di layout akar,
   halaman publik — termasuk landing — ikut mengunduh 2 MB JS (28 chunk,
   @supabase 254 KB) dan menembak `/api/session` + `/api/data` yang dijawab 401
   untuk pengunjung anonim. Sesudah dipindah, landing hanya memakai
   `app/layout.tsx` (kerangka dokumen) sehingga HTML-nya statis, nol panggilan
   sesi, dan bisa disajikan langsung dari CDN.

   APA YANG TIDAK BOLEH HILANG DARI SINI:
     · urutan provider (AccountScope → Money → Privacy → Subscription →
       Upgrade → AppLock → Onboarding) karena masing-masing membaca konteks
       induknya;
     · wrapper `data-catetind-page-root` — dipakai `useSheetBackgroundIsolation`
       untuk memberi `inert` ke latar saat bottom sheet terbuka (Vaul merender
       sheet lewat portal, jadi sheet tetap di luar wrapper);
     · `<Toaster/>` & `<OnboardingWelcomeToast/>` di dalam AppLockProvider tapi
       DI LUAR wrapper inert, supaya toast tetap bisa diklik saat sheet terbuka.

   Halaman publik TIDAK memakai layout ini — mereka punya
   `app/(public)/layout.tsx` (hanya `<Toaster/>`). */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ServiceWorkerRegistration />
      {/* Smooth scroll (Lenis) — hanya halaman app; halaman publik memakai
          gulir native supaya tidak ada rAF loop di landing. */}
      <SmoothScrollProvider />
      {/* ── CAKUPAN AKUN ──────────────────────────────────────────────────
          Semua provider di bawah ini membaca penyimpanan browser yang dipisah
          per akun. Gerbang ini menetapkan akun aktif LEBIH DULU (parkir/pulih
          kunci `catet*`), dan menahan render app sampai cakupannya pasti —
          lihat `lib/account-scope.ts`. */}
      <AccountScope>
        {/* Konteks Uang Global (Pribadi/Keluarga/Bersama) — satu provider:
            Sidebar desktop & header mobile membaca nilai yang sama. */}
        <MoneyContextProvider>
          <PrivacyProvider>
            {/* Gerbang Langganan Global (Grace Period / Post-Grace). Satu
                provider memegang status "boleh catat atau tidak" supaya FAB,
                tombol Tambah sidebar, engine input, dan semua sheet tambah
                membaca fakta yang sama. Banner-nya ditaruh paling atas. */}
            <SubscriptionGateProvider>
              {/* Gerbang upgrade global: halaman terkunci tidak dirender; klik
                  menu atau URL langsung memunculkan SATU popup upgrade. */}
              <UpgradeGateProvider>
                {/* Gerbang Kunci Perangkat (paket 39): kalau PIN app aktif &
                    belum dibuka, provider ini MENGGANTIKAN seluruh isi app —
                    termasuk bottom nav, tombol mata, toast, dan AI chat —
                    dengan layar kunci. */}
                <AppLockProvider>
                  {/* ── WRAPPER LATAR APLIKASI (`data-catetind-page-root`) ──
                      Selagi bottom sheet terbuka, wrapper ini diberi `inert` +
                      `pointer-events: none` oleh `useSheetBackgroundIsolation`
                      (hooks/use-sheet-viewport-cage.ts). */}
                  <OnboardingGate>
                    <div data-catetind-page-root>
                      {/* Gerbang seed demo (paket 65): menulis data contoh lewat
                          store HANYA saat NEXT_PUBLIC_DEMO=1 — produksi no-op. */}
                      <DemoSeedGate />
                      {/* Sinkron pengaturan uang & limit budget dari akun
                          (paket 13): tanpa ini, pindah perangkat = Jatah Hari
                          Ini kembali "belum diatur" & limit kategori hilang. */}
                      <SettingsSync />
                      <SubscriptionBanner />
                      {/* Banner Offline & Antrean Lokal (paket 42) — di bawah
                          banner langganan supaya saat keduanya tampil user
                          melihat dua-duanya. */}
                      <OfflineBanner />
                      {children}
                      <MobileBottomNav />
                      {/* Floating AI Chat — AI Coach CatetInd (Domain 4B); state
                          percakapan persisten lintas halaman karena layout tidak
                          unmount saat navigasi */}
                      <AIChatWidget />
                    </div>
                  </OnboardingGate>

                  {/* Toast SENGAJA di luar wrapper inert: notifikasi (mis.
                      "tersalin") harus tetap bisa diklik walau ada sheet. */}
                  <Toaster />
                  {/* Toast "Setup selesai!" — sekali jalan setelah onboarding */}
                  <OnboardingWelcomeToast />
                </AppLockProvider>
              </UpgradeGateProvider>
            </SubscriptionGateProvider>
          </PrivacyProvider>
        </MoneyContextProvider>
      </AccountScope>
    </>
  )
}
