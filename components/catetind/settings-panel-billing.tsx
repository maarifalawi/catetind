'use client'

import { BillingPanel } from './billing-panel'
import { SettingsPanel } from './settings-ui'

/* ── Panel: Langganan & Billing (inventaris #18 · Domain 5A/5C) ────────────────
   Isi detailnya memakai `BillingPanel` yang SUDAH ada (kartu paket aktif,
   metode pembayaran tersimpan, fuel gauge AI Token, riwayat pembayaran, modal
   top-up & paket tahunan). Yang ditambahkan di halaman pengaturan ini hanyalah
   jalur berhenti berlangganan yang jujur — lihat `CancelSubscriptionCard` di
   billing-panel.tsx (satu klik dari panel, tanpa labirin menu). */
export function BillingSettingsPanel() {
  return (
    <SettingsPanel
      eyebrow="Langganan"
      title="Langganan & Billing"
      desc="Status paket, perpanjangan manual, dan pemakaian AI Token kamu."
    >
      <BillingPanel />
    </SettingsPanel>
  )
}
