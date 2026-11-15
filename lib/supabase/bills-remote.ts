'use client'

import type { Bill } from '@/lib/data/bills'
import { browserSupabase } from './client'
import { dataApi, dataApiOk } from './data-api'
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
  const viaBrowser = await readBillsViaBrowser()
  if (viaBrowser) return viaBrowser
  const rows = await dataApi<BillDbRow>({
    table: 'bills',
    op: 'select',
    order: { column: 'due_day', ascending: true },
  })
  if (!rows) return null
  return rows.filter((row) => Boolean(row?.id)).map((row) => toBill(row))
}

async function readBillsViaBrowser(): Promise<Bill[] | null> {
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
  if (client) {
    try {
      const row = { ...toBillDbRow(bill), id: remoteId }
      const { error } = await client.from('bills').upsert(row, { onConflict: 'id' })
      if (!error || error.code === '23505') return true
      /* ── KUNCI ASING DOMPET (23503) ────────────────────────────────────────
         `bills.wallet_id` menunjuk `wallets(user_id, id)`. Dompet lokal yang
         belum/ditolak terkirim membuat SELURUH baris tagihan ditolak server —
         tagihan lalu hidup hanya di perangkat dan hilang begitu cache akun
         tidak terbaca. Tagihan tetap sah tanpa dompet, jadi simpan ulang tanpa
         `wallet_id`; pilihan dompetnya tetap tersimpan lokal (overlay). */
      if (error.code === '23503') {
        const { error: retryError } = await client
          .from('bills')
          .upsert({ ...row, wallet_id: null }, { onConflict: 'id' })
        if (!retryError || retryError.code === '23505') return true
      }
    } catch {
      /* jatuh ke jalur server */
    }
  }
  const ok = await dataApiOk({
    table: 'bills',
    op: 'upsert',
    rows: [{ ...toBillDbRow(bill), id: remoteId } as Record<string, unknown>],
    onConflict: 'id',
  })
  if (ok) return true
  /* jalur server menolak karena kunci asing dompet → ulangi tanpa dompet */
  return dataApiOk({
    table: 'bills',
    op: 'upsert',
    rows: [{ ...toBillDbRow(bill), id: remoteId, wallet_id: null } as Record<string, unknown>],
    onConflict: 'id',
  })
}

/** hapus tagihan di server (hapus lokal sudah ditangani tombstone store) */
export async function deleteRemoteBill(remoteId: string): Promise<boolean> {
  const client = browserSupabase()
  if (client) {
    try {
      const { error } = await client.from('bills').delete().eq('id', remoteId)
      if (!error) return true
    } catch {
      /* jatuh ke jalur server */
    }
  }
  return dataApiOk({ table: 'bills', op: 'delete', match: { id: remoteId } })
}
