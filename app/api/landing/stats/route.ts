import { NextResponse } from 'next/server'
import { supabaseAnonKey } from '@/lib/supabase/config'
import { restConfigured, restFetch } from '@/lib/supabase/rest'
import { LP_LIVE_SUBSCRIBERS } from '@/lib/data/landing'

/* ── GET /api/landing/stats ───────────────────────────────────────────────────
   Endpoint angka pengguna publik. Hero sekarang memakai label statis `1.000+`
   (lihat `LP_LIVE_SUBSCRIBERS.displayCount`), jadi endpoint ini BUKAN lagi
   sumber render hero; tetap disediakan untuk kebutuhan lain (mis. eksperimen
   atau halaman internal) dengan bentuk jawaban yang stabil.

   Sumbernya tabel publik `landing_stats` (migrasi 20261019130000): satu baris
   `global`, boleh dibaca anon lewat RLS, dan dinaikkan oleh trigger hanya saat
   ada langganan baru.

   Kenapa endpoint ini ada padahal landing juga bisa memanggil PostgREST
   langsung: satu bentuk jawaban yang stabil (`{ count, updatedAt, live }`),
   satu tempat menyembunyikan detail tabel, dan build tanpa Supabase tetap
   menampilkan titik awal yang benar (234) alih-alih angka kosong.

   Selalu `no-store`: angka ini bergerak, dan cache 1 jam milik landing akan
   membekukannya. Realtime menangani pembaruan berikutnya di browser. */

export const dynamic = 'force-dynamic'

interface LandingStatRow {
  subscriber_count?: unknown
  updated_at?: unknown
}

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' } as const
  const fallback = {
    count: LP_LIVE_SUBSCRIBERS.startCount,
    updatedAt: null as string | null,
    live: false,
  }

  if (!restConfigured()) {
    return NextResponse.json(fallback, { headers })
  }

  const res = await restFetch<LandingStatRow[]>(
    'landing_stats?select=subscriber_count,updated_at&id=eq.global&limit=1',
    { accessToken: supabaseAnonKey() },
  )

  if (!res.ok || !Array.isArray(res.data) || res.data.length === 0) {
    return NextResponse.json(fallback, { headers })
  }

  const raw = Number(res.data[0].subscriber_count)
  const count = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : LP_LIVE_SUBSCRIBERS.startCount
  const updatedAt =
    typeof res.data[0].updated_at === 'string' ? res.data[0].updated_at : null

  return NextResponse.json({ count, updatedAt, live: true }, { headers })
}
