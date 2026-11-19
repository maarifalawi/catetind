import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { OnboardingFlow } from '@/components/catetind/onboarding-flow'
import { previewEnabled } from '@/lib/preview-routes'

/* ── PREVIEW ONBOARDING (/preview-onboarding) — DEV SAJA ─────────────────────
   Salinan persis layar `/app/onboarding` TANPA sesi, supaya desainnya bisa
   ditinjau tanpa membuat akun atau membuka akun pemilik (aturan lengkapnya di
   `lib/preview-routes.ts`).

   Kenapa di grup `(public)`: layout grup itu hanya memasang `<Toaster/>`
   (dipakai `OnboardingFlow` saat gagal), sehingga tidak ada `OnboardingGate`,
   `SubscriptionGateProvider`, `AppLockProvider`, atau bottom-nav yang menahan
   layar ini. Komponennya SAMA yang dipakai rute asli — bukan tiruan — jadi yang
   ditinjau memang layar produksi.

   Yang TIDAK berlaku di sini (dan memang tidak perlu untuk review desain):
     · status onboarding akun → gerbang tidak dipasang, jadi layar selalu mulai
       dari langkah 1;
     · penyimpanan ke server → `POST /api/onboarding` dijawab 401 tanpa sesi,
       dan flow tetap lanjut karena kegagalan itu tidak ditunggu. */

export const metadata: Metadata = {
  title: 'Preview Onboarding | CatetInd',
  /* rute internal — jangan pernah masuk indeks mesin pencari */
  robots: { index: false, follow: false },
}

export default function PreviewOnboardingPage() {
  /* Pertahanan kedua: middleware sudah menolak di produksi, tetapi halaman ini
     juga tidak boleh pernah dirender di sana. `notFound()` membuat build
     produksi menghasilkan 404 biasa — bukan layar app tanpa login. */
  if (!previewEnabled()) notFound()

  return (
    <PhoneStage plain>
      <OnboardingFlow />
    </PhoneStage>
  )
}
