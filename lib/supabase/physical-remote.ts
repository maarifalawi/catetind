'use client'

import type { PhysicalAsset } from '@/lib/data/wealth'
import { browserSupabase } from './client'
import { toPhysicalAsset, toPhysicalAssetDbRow, type PhysicalAssetDbRow } from './domain-mappers'

/* ── JALUR ASET FISIK / PROPERTI KE SERVER (paket 84) ────────────────────────
   Tabel `physical_assets` (paket 63) sudah ada + RLS `user_id = auth.uid()`.
   Sebelumnya store aset fisik HANYA menulis ke IndexedDB perangkat, jadi aset
   tidak pernah sampai ke server dan tidak ikut ke perangkat lain. Sekarang
   store membaca tabel ini saat ada sesi, menulis tiap perubahan, dan (lewat
   `subscribePhysicalChanges`) membaca ulang saat baris berubah dari tab/
   perangkat lain — aset fisik pun sync realtime.

   Semua fungsi TIDAK PERNAH `throw`: tanpa sesi/backend → `null`/`false`, dan
   store tetap jalan di jalur lokal. `scope` tidak ada di skema → overlay lokal. */

/** baca seluruh aset fisik milik pemanggil; `null` = tanpa sesi/backend atau gagal */
export async function readRemotePhysicalAssets(): Promise<PhysicalAsset[] | null> {
  const client = browserSupabase()
  if (!client) return null
  try {
    const { data: session } = await client.auth.getSession()
    if (!session.session?.access_token) return null
    const { data, error } = await client
      .from('physical_assets')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(200)
    if (error) return null
    return ((data ?? []) as PhysicalAssetDbRow[])
      .filter((row) => Boolean(row?.id))
      .map((row) => toPhysicalAsset(row))
  } catch {
    return null
  }
}

export async function pushPhysicalAssetToServer(
  asset: PhysicalAsset,
  remoteId: string,
): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  try {
    const { error } = await client
      .from('physical_assets')
      .upsert(toPhysicalAssetDbRow(asset, remoteId), { onConflict: 'id' })
    return !error || error.code === '23505'
  } catch {
    return false
  }
}

export async function deleteRemotePhysicalAsset(remoteId: string): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  try {
    const { error } = await client.from('physical_assets').delete().eq('id', remoteId)
    return !error
  } catch {
    return false
  }
}
