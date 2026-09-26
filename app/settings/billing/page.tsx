import type { Metadata } from 'next'
import { BillingSettingsPanel } from '@/components/catetind/settings-panel-billing'

/* Sub-section Langganan & Billing (inventaris #18).
   Isinya `BillingPanel` yang sudah ada + jalur berhenti berlangganan. */

export const metadata: Metadata = {
  title: 'Langganan & Billing — CatetInd',
}

export default function BillingSettingsPage() {
  return <BillingSettingsPanel />
}
