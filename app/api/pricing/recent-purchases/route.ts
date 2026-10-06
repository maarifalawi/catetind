import { NextResponse } from 'next/server'
import { supabaseAnonKey } from '@/lib/supabase/config'
import { restConfigured, restFetch } from '@/lib/supabase/rest'

/* ── GET /api/pricing/recent-purchases (paket 63) ────────────────────────────
   Sumber "Live Purchase Feed" di landing (#2). PRD A10 melarang MENGARANG bukti
   sosial, jadi endpoint ini jujur dua arah:
     · tabel `purchases` ada & berisi → kirim barisnya apa adanya;
     · belum ada (sekarang: pembayaran/Midtrans belum aktif) → `{ items: [],
       firstHere: true }`.

   `firstHere: true` = "kamu yang pertama di sini" — keadaan yang BENAR saat belum
   ada pembelian, bukan angka fiktif. Komponen landing sudah dibentuk untuk
   menerima bentuk ini. */

export const dynamic = 'force-dynamic'

interface PurchaseRow {
  display_name?: unknown
  city?: unknown
  amount?: unknown
  created_at?: unknown
}

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' } as const

  if (!restConfigured()) {
    return NextResponse.json({ items: [], firstHere: true }, { headers })
  }

  const res = await restFetch<PurchaseRow[]>(
    'purchases?select=display_name,city,amount,created_at&order=created_at.desc&limit=8',
    { accessToken: supabaseAnonKey() },
  )
  if (!res.ok || !Array.isArray(res.data) || res.data.length === 0) {
    return NextResponse.json({ items: [], firstHere: true }, { headers })
  }

  const items = res.data.map((row) => ({
    name: typeof row.display_name === 'string' ? row.display_name : '',
    city: typeof row.city === 'string' ? row.city : '',
    price: Number(row.amount) || 0,
    at: typeof row.created_at === 'string' ? row.created_at : '',
  }))

  return NextResponse.json({ items, firstHere: false }, { headers })
}
