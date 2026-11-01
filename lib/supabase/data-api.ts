'use client'

/* ── KLIEN JALUR DATA SERVER (`POST /api/data`) ──────────────────────────────
   Dipakai sebagai FALLBACK ketika klien Supabase di browser tidak bisa dipakai
   (tidak ada sesi, token basi, atau RLS menolak). Route-nya memakai cookie sesi
   yang sama dengan yang dipakai middleware, jadi selama user bisa membuka app,
   jalur ini bisa membaca & menulis datanya.

   Kontrak: `null` = jalur server tidak tersedia/gagal → pemanggil tetap memakai
   jalur lokal (tidak pernah melempar, tidak pernah mengosongkan layar). */

export type DataApiOp = 'select' | 'insert' | 'upsert' | 'update' | 'delete'

export interface DataApiBody {
  table: string
  op: DataApiOp
  rows?: Record<string, unknown>[]
  patch?: Record<string, unknown>
  match?: Record<string, string | number>
  filter?: Record<string, string | number>
  order?: { column: string; ascending: boolean }
  onConflict?: string
}

export async function dataApi<T = Record<string, unknown>>(body: DataApiBody): Promise<T[] | null> {
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    const json = (await res.json().catch(() => null)) as { data?: T[] } | null
    return Array.isArray(json?.data) ? json.data : null
  } catch {
    return null
  }
}

/** true = jalur server menjawab (dipakai fallback tulis yang tidak butuh data balik) */
export async function dataApiOk(body: DataApiBody): Promise<boolean> {
  return (await dataApi(body)) !== null
}
