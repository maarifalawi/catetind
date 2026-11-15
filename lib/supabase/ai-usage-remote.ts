'use client'

import { monthKeyOf, type AiQuotaActivityId } from '@/lib/ai-quota'
import { browserSupabase } from './client'

/* ── METER PEMAKAIAN AI DI SERVER (`ai_usage`) (paket 45 · revisi refill) ────
   Sebelum paket ini pemakaian AI hidup di memory sesi: refresh halaman =
   kembali ke titik berangkat demo, dan kuota user satu tab tidak pernah sepakat
   dengan tab lainnya (temuan audit Stage 5 #5 yang baru setengah ditutup).

   CATATAN PENTING (keputusan produk — kuota dasar TIDAK di-refill):
   baris `ai_usage` tetap ditulis per (user, bulan, aktivitas) untuk jejak audit,
   tetapi PEMBACAANNYA MENJUMLAHKAN SELURUH BULAN. Artinya kuota dasar hanya
   berlaku SEKALI di bulan pertama paket; begitu bulan berganti, tangki tidak
   otomatis penuh lagi. Untuk memakai AI lagi user membeli token add-on (yang
   memang tidak hangus). Sebelumnya pembacaan hanya bulan berjalan, sehingga
   setiap tanggal 1 tangki kembali 100% — bukan model bisnis yang diinginkan.

   Batas jujur: yang disimpan adalah PEMAKAIAN (jumlah panggilan), bukan token
   provider sungguhan. */

/** bulan berjalan `YYYY-MM` — kunci TULIS baris `ai_usage` (jejak audit).
 *  Diturunkan dari `monthKeyOf()` (`lib/ai-quota.ts`) supaya kuncinya SATU
 *  definisi dengan tanggal yang ditampilkan UI. */
export function currentMonthKey(now = new Date()): string {
  return monthKeyOf(now)
}

export interface RemoteAiUsage {
  /** `activity → calls_used` KUMULATIF (semua bulan) */
  callsUsed: Record<string, number>
  addonTokensRemaining: number
  purchasedTokens: number
}

export async function readAiUsage(): Promise<RemoteAiUsage | null> {
  const client = browserSupabase()
  if (!client) return null
  try {
    /* TANPA filter bulan: jumlahkan semua baris milik user (RLS menyaring
       `user_id = auth.uid()`). Inilah yang membuat tangki tidak "reset sendiri"
       saat bulan berganti. */
    const { data, error } = await client
      .from('ai_usage')
      .select('activity,calls_used,addon_tokens_remaining,purchased_tokens')
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
      callsUsed[row.activity] = (callsUsed[row.activity] ?? 0) + (row.calls_used ?? 0)
      addon = Math.max(addon, row.addon_tokens_remaining ?? 0)
      purchased = Math.max(purchased, row.purchased_tokens ?? 0)
    }
    /* Token add-on yang DIBELI berlaku SELAMANYA, jadi saldonya dibaca dari
       `ai_addons` (satu baris per order_id) — bukan dari `ai_usage` yang kuncinya
       per BULAN (token di sana akan "hilang" saat bulan berganti). RLS
       `ai_addons` menyaring `user_id = auth.uid()`, jadi yang terbaca hanya
       milik user sendiri. */
    const addonRes = await client.from('ai_addons').select('tokens')
    if (!addonRes.error && Array.isArray(addonRes.data)) {
      const addonTokens = (addonRes.data as { tokens?: number }[]).reduce(
        (sum, row) => sum + (Number(row.tokens) || 0),
        0,
      )
      purchased = Math.max(purchased, addonTokens)
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
