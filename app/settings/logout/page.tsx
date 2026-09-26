import type { Metadata } from 'next'
import { LogoutSettingsPanel } from '@/components/catetind/settings-panel-account'

export const metadata: Metadata = {
  title: 'Keluar — CatetInd',
}

export default function LogoutSettingsPage() {
  return <LogoutSettingsPanel />
}
