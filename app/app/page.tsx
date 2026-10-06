import { HomeScreen } from '@/components/catetind/home-screen'
import { PhoneStage } from '@/components/catetind/phone-stage'

/**
 * Dashboard (/app) — layar Home/Daily HUD.
 *
 * Route ini DULU ada di root `/` (sebelum landing page pindah ke sana). Karena
 * root sekarang jadi halaman pemasaran publik, seluruh tautan "kembali ke
 * dashboard" (sidebar, bottom nav, redirect setelah masuk/onboarding) diarahkan
 * ke `/app` — lihat `lib/navigation.ts` & `lib/onboarding.ts`.
 */
export default function DashboardPage() {
  return (
    <PhoneStage>
      <HomeScreen />
    </PhoneStage>
  )
}
