'use client'

import type { AiQuotaActivityId } from '@/lib/ai-quota'
import { browserSupabase } from './client'

/* ── METER PEMAKAIAN AI DI SERVER (`ai_usage`) (paket 45) ───────────────────
   Sebelum paket ini pemakaian AI hidup di memory sesi: refresh halaman =
   kembali ke titik berangkat demo, dan kuota user satu tab tidak pernah sepakat
   dengan tab lainnya (temuan audit Stage 5 #5 yang baru setengah ditutup).

   Sekarang angka pemakaiannya satu baris per (user, bulan, aktivitas) di
   `ai_usage`, dan penambahannya lewat RPC `catetind_record_ai_usage` supaya
   ATOMIK: dua tab yang memakai AI bersamaan tidak saling menimpa.

   Batas jujur: yang disimpan adalah PEMAKAIAN, bukan token sungguhan — provider
   AI-nya sendiri masih mock (tidak ada DeepSeek/apa pun yang dipanggil). */

/** bulan berjalan `YYYY-MM` — kunci baris `ai_usage` */
export function currentMonthKey(now = new Date()): string {
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}`
}

export interface RemoteAiUsage {
  /** `activity → calls_used` untuk bulan ini */
  callsUsed: Record<string, number>
  addonTokensRemaining: number
  purchasedTokens: number
}

export async function readAiUsage(monthKey = currentMonthKey()): Promise<RemoteAiUsage | null> {
  const client = browserSupabase()
  if (!client) return null
  try {
    const { data, error } = await client
      .from('ai_usage')
      .select('activity,calls_used,addon_tokens_remaining,purchased_tokens')
      .eq('month_key', monthKey)
    if (error || !data) return null

    const callsUsed: Record<string, number> = {}
    let addon = 0
    let purchased = 0
    for (const row of data as {
      activity: string
      calls_used: number
      addon_tokens_remaining: number
      purchased_tokens: number
    }[]) {
      callsUsed[row.activity] = row.calls_used
      addon = Math.max(addon, row.addon_tokens_remaining ?? 0)
      purchased = Math.max(purchased, row.purchased_tokens ?? 0)
    }
    return { callsUsed, addonTokensRemaining: addon, purchasedTokens: purchased }
  } catch {
    return null
  }
}

/**
 * Catat pemakaian (dan/atau pembelian token add-on) di server.
 * Mengembalikan baris terbaru, atau `null` kalau tidak ada sesi/backend.
 * TIDAK PERNAH melempar: gagal menyimpan meter tidak boleh menggagalkan aksi
 * user yang sedang menyimpan uangnya (aturan yang sama dengan `recordAiUsage`).
 */
export async function recordAiUsageRemote(
  activity: AiQuotaActivityId | string,
  calls = 1,
  addonTokens = 0,
): Promise<RemoteAiUsage | null> {
  const client = browserSupabase()
  if (!client) return null
  try {
    const { data, error } = await client.rpc('catetind_record_ai_usage', {
      p_month_key: currentMonthKey(),
      p_activity: String(activity),
      p_calls: Math.max(1, Math.round(calls)),
      p_addon_tokens: Math.max(0, Math.round(addonTokens)),
    })
    if (error) return null
    const row = (Array.isArray(data) ? data[0] : data) as
      | { out_calls_used: number; out_addon_tokens_remaining: number }
      | undefined
    if (!row) return null
    return {
      callsUsed: { [String(activity)]: row.out_calls_used },
      addonTokensRemaining: row.out_addon_tokens_remaining,
      purchasedTokens: 0,
    }
  } catch {
    return null
  }
}
