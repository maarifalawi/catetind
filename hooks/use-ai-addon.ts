'use client'

import { useEffect, useState } from 'react'
import { aiAddonTank, type AiAddonTank } from '@/lib/ai-quota'
import { readPurchasedAddonTokens, subscribeAiAddonPurchases } from '@/lib/ai-quota-bus'

/**
 * Tangki add-on AI YANG BERJALAN — jatah mock bawaan + token yang dibeli di sesi
 * demo ini (prompt 24).
 *
 * Kenapa hook, bukan konstanta: angka add-on harus ikut berubah begitu user
 * menekan "Bayar Sekarang" di modal Top Up — dan perubahan itu harus terlihat di
 * SEMUA permukaan yang menampilkannya (banner Home, Fuel Gauge Billing).
 * Menyalin angka ke state lokal per komponen justru bikin versi baru dari
 * masalah yang sudah ditutup task 21 ("sidebar 5 jt vs Billing 150/60/500 vs
 * ToS 601.500"), jadi turunannya tetap dihitung di `lib/ai-quota.ts`.
 *
 * Penanda sesi dibaca SETELAH mount (efek) — pola `hooks/use-renewal-reminder.ts`
 * — supaya HTML server dan render pertama client identik (anti hydration
 * mismatch), lalu langganan bus-nya memasang pembelian berikutnya.
 */
export function useAiAddon(): AiAddonTank {
  const [purchased, setPurchased] = useState(0)

  useEffect(() => {
    setPurchased(readPurchasedAddonTokens())
    return subscribeAiAddonPurchases(setPurchased)
  }, [])

  return aiAddonTank(purchased)
}
