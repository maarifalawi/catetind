import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { restConfigured, restRpc } from '@/lib/supabase/rest'

/* ── GET /api/referral/me — ANGKA REFERRAL MILIK PEMANGGIL ────────────────────
   Sebelum endpoint ini ada, halaman `/referral` menampilkan konstanta contoh
   (`lib/data/referral.ts`: kode `RINA-X7K`, 12 klik, Budi/Siska/Reza). Endpoint
   ini menggantinya dengan SATU panggilan yang seluruhnya dibatasi `auth.uid()`:

     { ok, configured, code, clicks, pending, converted, rewardTokens, friends }

   Tiga aturan yang mengikat:

     1. TIDAK ADA data user lain yang bisa ikut. Semua angka dihitung di RPC
        `catetind_referral_overview()` yang memakai `auth.uid()` (bukan parameter
        dari klien), dan RLS `referrals`/`referral_clicks` tetap berlaku sebagai
        lapis kedua.
     2. Kode dibuat kalau belum ada (`catetind_ensure_my_referral_code`) — akun
        yang lahir sebelum trigger dipasang tetap punya kode, jadi tombol
        Bagikan tidak pernah mengirim link kosong.
     3. Gagal baca = `502` dengan `ok:false`. Klien menampilkan keadaan "belum
        bisa dimuat", BUKAN angka contoh. Di build tanpa backend jawabannya
        `configured:false` dengan angka nol, dan UI mengatakan apa adanya.

   `friends` memuat `id` (uuid relasi), `name` turunan dari email yang diundang,
   `converted`, dan `joinedAt` (tanggal, bukan waktu) — cukup untuk daftar di
   layar tanpa membocorkan email penuh.
   ────────────────────────────────────────────────────────────────────────── */

export interface ReferralOverviewResponse {
  ok: boolean
  /** false = build tanpa backend Supabase: belum ada kode & belum ada angka */
  configured: boolean
  code: string | null
  clicks: number
  pending: number
  converted: number
  /** total token AI yang sudah benar-benar cair (dari `referral_rewards`) */
  rewardTokens: number
  friends: { id: string; name: string; converted: boolean; joinedAt: string }[]
  error?: string
}

/** bentuk JSON dari `catetind_referral_overview()` */
interface OverviewPayload {
  code?: unknown
  clicks?: unknown
  pending?: unknown
  converted?: unknown
  rewardTokens?: unknown
  friends?: unknown
}

function toCount(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0
}

function toFriends(value: unknown): ReferralOverviewResponse['friends'] {
  if (!Array.isArray(value)) return []
  const out: ReferralOverviewResponse['friends'] = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const row = raw as Record<string, unknown>
    const id = typeof row.id === 'string' ? row.id : ''
    if (!id) continue
    out.push({
      id,
      name: typeof row.name === 'string' && row.name.trim() ? row.name.trim() : 'Teman',
      converted: row.converted === true,
      joinedAt: typeof row.joinedAt === 'string' ? row.joinedAt : '',
    })
  }
  return out
}

const EMPTY: Omit<ReferralOverviewResponse, 'ok' | 'configured'> = {
  code: null,
  clicks: 0,
  pending: 0,
  converted: 0,
  rewardTokens: 0,
  friends: [],
}

export async function GET(req: NextRequest) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response

  /* Tanpa backend tidak ada angka yang bisa diklaim — katakan apa adanya. */
  if (!restConfigured()) {
    return NextResponse.json<ReferralOverviewResponse>({
      ok: true,
      configured: false,
      ...EMPTY,
    })
  }

  /* Kode dulu (idempoten), baru ringkasan — supaya kode yang baru lahir ikut
     terbaca di panggilan yang sama. */
  const ensured = await restRpc<string | null>('catetind_ensure_my_referral_code', {}, auth.token)
  if (!ensured.ok) {
    return NextResponse.json<ReferralOverviewResponse>(
      { ok: false, configured: true, ...EMPTY, error: 'Kode referral belum bisa dibaca.' },
      { status: 502 },
    )
  }

  const overview = await restRpc<OverviewPayload>('catetind_referral_overview', {}, auth.token)
  if (!overview.ok || !overview.data) {
    return NextResponse.json<ReferralOverviewResponse>(
      { ok: false, configured: true, ...EMPTY, error: 'Statistik referral belum bisa dibaca.' },
      { status: 502 },
    )
  }

  const payload = overview.data
  const code =
    typeof payload.code === 'string' && payload.code.trim()
      ? payload.code.trim()
      : typeof ensured.data === 'string' && ensured.data.trim()
        ? ensured.data.trim()
        : null

  return NextResponse.json<ReferralOverviewResponse>({
    ok: true,
    configured: true,
    code,
    clicks: toCount(payload.clicks),
    pending: toCount(payload.pending),
    converted: toCount(payload.converted),
    rewardTokens: toCount(payload.rewardTokens),
    friends: toFriends(payload.friends),
  })
}
