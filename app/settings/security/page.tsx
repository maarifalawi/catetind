import type { Metadata } from 'next'
import { SecuritySettingsPanel } from '@/components/catetind/settings-panel-privacy'

export const metadata: Metadata = {
  title: 'Keamanan & Privasi — CatetInd',
}

export default function SecuritySettingsPage() {
  return <SecuritySettingsPanel />
}
