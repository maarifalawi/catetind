import { NextRequest, NextResponse } from 'next/server'
import { REFERRAL_DISCOUNT_PCT, isValidReferralCode } from '@/lib/data/pricing'
import { REFERRAL_VALIDATE_COPY } from '@/lib/data/referral'
import { supabaseAnonKey } from '@/lib/supabase/config'
import { restConfigured, restRpc } from '@/lib/supabase/rest'

/* ── INTEGRITAS KODE TEMAN (paket 64 · Domain 7D) ─────────────────────────────
   POST /api/referral/validate
   Body: { code, email? }

   Inilah "backend MUST query the database" sebelum registrasi difinalkan:
     1. bentuk kode diperiksa lebih dulu (murah, tanpa jaringan);
     2. lalu kode dicari di DATABASE lewat RPC `security definer`
        (`validate_referral_code`) — bukan di daftar mock di klien;
     3. kalau kode SAH, relasinya DIPERSIST lewat `record_referral`
        (idempotent per email), sehingga reward pengundang tidak hilang kalau
        user baru belum mengonfirmasi emailnya saat itu;
     4. kalau kode TIDAK ADA → 422 + pesan manusiawi (klien menampilkan error
        state dan tidak melanjutkan pendaftaran).

   Endpoint ini memang `anon`: validasinya terjadi SEBELUM user punya sesi. Yang
   dijaga bukan endpoint-nya, melainkan database — klien tidak punya policy tulis
   ke `referrals`, jadi satu-satunya jalan adalah RPC di atas.

   JALUR DEMO/TEST (tanpa `NEXT_PUBLIC_SUPABASE_*`): kode tidak bisa diverifikasi
   ke database. Jawabannya jujur `{ ok:true, verified:false }` supaya alur
   checkout tidak mati di build tanpa backend — TAPI ia tidak mengaku terverifikasi.
   ────────────────────────────────────────────────────────────────────────── */

interface ValidateBody {
  code?: unknown
  email?: unknown
}

export async function POST(req: NextRequest) {
  let body: ValidateBody
  try {
    body = (await req.json()) as ValidateBody
  } catch {
    return NextResponse.json(
      { ok: false, error: REFERRAL_VALIDATE_COPY.invalid },
      { status: 400 },
    )
  }

  const code = typeof body.code === 'string' ? body.code.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''

  /* 1 — bentuk kode (juga menahan input kosong/asing sebelum menyentuh DB) */
  if (!isValidReferralCode(code)) {
    return NextResponse.json(
      { ok: false, error: REFERRAL_VALIDATE_COPY.invalid },
      { status: 422 },
    )
  }

  /* 2 — tanpa backend: tidak ada yang bisa diverifikasi; katakan apa adanya */
  if (!restConfigured()) {
    return NextResponse.json({ ok: true, verified: false, discountPct: REFERRAL_DISCOUNT_PCT })
  }

  const found = await restRpc<string | null>(
    'validate_referral_code',
    { p_code: code },
    supabaseAnonKey(),
  )
  if (!found.ok) {
    return NextResponse.json(
      { ok: false, error: REFERRAL_VALIDATE_COPY.unavailable },
      { status: 502 },
    )
  }
  if (!found.data) {
    return NextResponse.json(
      { ok: false, error: REFERRAL_VALIDATE_COPY.invalid },
      { status: 422 },
    )
  }

  /* 3 — kode sah: PERSIST relasinya (hanya kalau email ikut dikirim) */
  if (email) {
    const recorded = await restRpc<boolean>(
      'record_referral',
      { p_code: code, p_referred_email: email },
      supabaseAnonKey(),
    )
    if (!recorded.ok) {
      return NextResponse.json(
        { ok: false, error: REFERRAL_VALIDATE_COPY.unavailable },
        { status: 502 },
      )
    }
  }

  return NextResponse.json({ ok: true, verified: true, discountPct: REFERRAL_DISCOUNT_PCT })
}
