import type { Metadata } from 'next'
import { AppearanceSettingsPanel } from '@/components/catetind/settings-panel-preferences'

export const metadata: Metadata = {
  title: 'Tampilan & Tema — CatetInd',
}

export default function AppearanceSettingsPage() {
  return <AppearanceSettingsPanel />
}
