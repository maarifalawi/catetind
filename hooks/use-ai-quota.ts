'use client'

import { useSyncExternalStore } from 'react'
import { aiQuotaSnapshot, type AiQuotaSnapshot } from '@/lib/ai-quota'
import { readAiUsageState, seedAiUsageState, subscribeAiUsage } from '@/lib/ai-usage-store'

/**
 * Kuota AI YANG BERJALAN untuk komponen (paket 42).
 *
 * Dipakai SEMUA permukaan yang menampilkan kuota — kartu sidebar
 * (`ai-fuel-card`), Fuel Gauge di `/settings/billing` (`billing-panel`), banner
 * Home (`home-banner`), dan header AI Coach (`ai-chat-widget`) — supaya tidak ada
 * satu gauge pun yang menyimpan salinan angkanya sendiri (aturan yang sudah
 * berlaku sejak task 21: "satu sumber kebenaran").
 *
 * `useSyncExternalStore` + `seedAiUsageState` dipakai karena ia punya
 * `getServerSnapshot`: HTML server memakai titik berangkat yang sama dengan
 * render pertama client (tanpa hydration mismatch), lalu otomatis pindah ke
 * angka hidup begitu user memakai AI atau top up.
 */
export function useAiQuota(): AiQuotaSnapshot {
  const state = useSyncExternalStore(subscribeAiUsage, readAiUsageState, seedAiUsageState)
  return aiQuotaSnapshot(state.callsUsed, state.purchasedTokens)
}
