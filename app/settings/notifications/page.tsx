import type { Metadata } from 'next'
import { NotificationsSettingsPanel } from '@/components/catetind/settings-panel-preferences'

/* Sub-section Notifikasi (inventaris #22) — isinya `NotificationSettings`
   yang sudah terhubung ke Web Push asli (lib/use-push-notifications.ts). */

export const metadata: Metadata = {
  title: 'Notifikasi — CatetInd',
}

export default function NotificationsSettingsPage() {
  return <NotificationsSettingsPanel />
}
