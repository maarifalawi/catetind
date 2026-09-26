import type { Metadata } from 'next'
import { CategoriesSettingsPanel } from '@/components/catetind/settings-panel-preferences'

export const metadata: Metadata = {
  title: 'Kustomisasi Kategori — CatetInd',
}

export default function CategoriesSettingsPage() {
  return <CategoriesSettingsPanel />
}
