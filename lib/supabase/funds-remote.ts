'use client'

import type { FundContribution, SinkingFundItem } from '@/lib/data/budget'
import { browserSupabase } from './client'
import {
  toFundContribution,
  toGoalContributionDbRow,
  toGoalDbRow,
  toSinkingFund,
  type GoalContributionDbRow,
  type GoalDbRow,
} from './domain-mappers'

/* ── JALUR CELENGAN KE SERVER (paket 64 · Paket D) ───────────────────────────
   Celengan & riwayat setoran dulu hanya hidup di perangkat. Sekarang, saat ada
   sesi Supabase, store MEMBACA `goals` + view `goal_savings` (terkumpul) +
   `goal_contributions` sebagai sumber, dan setiap penulisan dikirim ke sana.

   Id domain celengan NUMERIK sedangkan primary key `goals` uuid; `remoteId`
   (uuid) dijembatani lewat `numericIdFromUuid()` supaya baris yang sama selalu
   punya id domain yang sama di semua perangkat. Semua fungsi TIDAK PERNAH
   `throw`: tanpa sesi/backend → `null`/`false`, store tetap jalan lokal. */

export interface RemoteFunds {
  funds: SinkingFundItem[]
  contributions: FundContribution[]
}

/** baca seluruh celengan milik pemanggil; `null` = tanpa sesi/backend atau gagal */
export async function readRemoteFunds(): Promise<RemoteFunds | null> {
  const client = browserSupabase()
  if (!client) return null
  try {
    const { data: session } = await client.auth.getSession()
    if (!session.session?.access_token) return null

    const [goalsRes, savingsRes, contribRes] = await Promise.all([
      client.from('goals').select('*').order('created_at', { ascending: true }).limit(200),
      client.from('goal_savings').select('goal_id,saved'),
      client
        .from('goal_contributions')
        .select('*')
        .order('contributed_at', { ascending: false })
        .limit(400),
    ])
    if (goalsRes.error) return null

    const savedById = new Map(
      ((savingsRes.data ?? []) as { goal_id: string; saved: number | string }[]).map((row) => [
        row.goal_id,
        Number(row.saved) || 0,
      ]),
    )
    const funds = ((goalsRes.data ?? []) as GoalDbRow[])
      .filter((row) => Boolean(row?.id))
      .map((row) => toSinkingFund(row, savedById.get(row.id) ?? 0))

    const contributions = ((contribRes.data ?? []) as GoalContributionDbRow[])
      .filter((row) => Boolean(row?.id))
      .map((row) => toFundContribution(row))

    return { funds, contributions }
  } catch {
    return null
  }
}

async function upsert(table: string, body: Record<string, unknown>): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  try {
    const { error } = await client.from(table).upsert(body, { onConflict: 'id' })
    return !error || error.code === '23505'
  } catch {
    return false
  }
}

/** simpan/perbarui celengan (id = `remoteId` uuid baris `goals`) */
export async function pushFundToServer(fund: SinkingFundItem, remoteId: string): Promise<boolean> {
  return upsert('goals', { ...toGoalDbRow(fund, remoteId) })
}

/** catat satu setoran (`goal_contributions`); butuh uuid goal induknya */
export async function pushContributionToServer(
  contribution: FundContribution,
  goalRemoteId: string,
  remoteId: string,
): Promise<boolean> {
  return upsert('goal_contributions', {
    ...toGoalContributionDbRow(contribution, goalRemoteId, remoteId),
  })
}

/** hapus celengan di server (hapus lokal sudah ditangani tombstone store) */
export async function deleteRemoteFund(remoteId: string): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  try {
    const { error } = await client.from('goals').delete().eq('id', remoteId)
    return !error
  } catch {
    return false
  }
}
