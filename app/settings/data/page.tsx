import type { Metadata } from 'next'
import { DataExportSettingsPanel } from '@/components/catetind/settings-panel-privacy'

export const metadata: Metadata = {
  title: 'Export Data Saya — CatetInd',
}

export default function DataExportSettingsPage() {
  return <DataExportSettingsPanel />
}
