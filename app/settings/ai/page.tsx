import type { Metadata } from 'next'
import { AiSettingsPanel } from '@/components/catetind/settings-panel-preferences'

export const metadata: Metadata = {
  title: 'AI Preferences — CatetInd',
}

export default function AiSettingsPage() {
  return <AiSettingsPanel />
}
