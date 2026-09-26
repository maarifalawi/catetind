import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { NotificationSettings } from '@/components/catetind/notification-settings'

export const metadata: Metadata = {
  title: 'Notifikasi — CatetInd',
}

export default function NotificationsSettingsPage() {
  return (
    <PhoneStage>
      <main className="min-h-screen px-5 pb-32 pt-6 sm:px-8 lg:px-10 lg:pt-8">
        <div className="mx-auto w-full max-w-2xl">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1 text-sm font-medium text-ink/50 transition-colors hover:text-ink"
          >
            <ChevronLeft className="size-4" strokeWidth={2.4} />
            Pengaturan
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink lg:text-4xl">
            Notifikasi
          </h1>
          <p className="mt-1 text-sm text-ink/50">
            Push notif muncul di HP walau app lagi ditutup — kayak WhatsApp.
          </p>

          <div className="mt-6">
            <NotificationSettings />
          </div>
        </div>
      </main>
    </PhoneStage>
  )
}
