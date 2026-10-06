'use client'

import type { Bill } from '@/lib/data/bills'
import { browserSupabase } from './client'
import { toBill, toBillDbRow, type BillDbRow } from './domain-mappers'

/* ── JALUR TAGIHAN KE SERVER (paket 64 · Paket D) ────────────────────────────
   Sebelum paket ini daftar tagihan hanya hidup di perangkat (IndexedDB). Sekarang,
   saat ada sesi Supabase, `/bills` MEMBACA tabel `bills` sebagai sumber dan
   setiap penulisan dikirim ke sana.

   Semua fungsi di sini TIDAK PERNAH `throw`: tanpa sesi/backend → `null`/`false`,
   dan store tetap jalan di jalur lokal (cache/antrean). Baris yang dikirim
   memakai `remoteId` (uuid) sebagai primary key, terpisah dari id domain lokal
   (`'7'`, `'1000001'`) — lihat `lib/supabase/uuid.ts`.

   `23505` (duplicate key) BUKAN kegagalan: artinya baris ini sudah sampai
   (double-tap / retry) — pemanggil memperlakukannya sebagai "tersimpan". */

/** baca seluruh tagihan milik pemanggil; `null` = tanpa sesi/backend atau gagal */
export async function readRemoteBills(): Promise<Bill[] | null> {
  const client = browserSupabase()
  if (!client) return null
  try {
    const { data: session } = await client.auth.getSession()
    if (!session.session?.access_token) return null

    const { data, error } = await client
      .from('bills')
      .select('*')
      .order('due_day', { ascending: true })
      .limit(200)
    /* gagal baca = jalur lokal yang jalan (bukan layar kosong yang terlihat seperti data hilang) */
    if (error || !data) return null
    return (data as BillDbRow[]).filter((row) => Boolean(row?.id)).map((row) => toBill(row))
  } catch {
    return null
  }
}

/** simpan/perbarui satu tagihan (id = `remoteId` uuid baris itu) */
export async function pushBillToServer(bill: Bill, remoteId: string): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  try {
    const { error } = await client
      .from('bills')
      .upsert({ ...toBillDbRow(bill), id: remoteId }, { onConflict: 'id' })
    return !error || error.code === '23505'
  } catch {
    return false
  }
}

/** hapus tagihan di server (hapus lokal sudah ditangani tombstone store) */
export async function deleteRemoteBill(remoteId: string): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  try {
    const { error } = await client.from('bills').delete().eq('id', remoteId)
    return !error
  } catch {
    return false
  }
}
