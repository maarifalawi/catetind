import type { Metadata } from 'next'
import { InstallGuideScreen } from '@/components/catetind/install-guide-screen'
import { PhoneStage } from '@/components/catetind/phone-stage'

export const metadata: Metadata = {
  title: 'Install CatetInd — Gratis, Tanpa App Store',
  description:
    'Install CatetInd ke HP atau desktop kamu: bisa offline, loading instan, hemat storage. Ada bonus eksklusif buat yang buka app dari Homescreen.',
}

export default function InstallPage() {
  return (
    <PhoneStage>
      <InstallGuideScreen />
    </PhoneStage>
  )
}
