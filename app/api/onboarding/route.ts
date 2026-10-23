import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { restConfigured, restFetch } from '@/lib/supabase/rest'
import {
  isOnboardingPayload,
  readCallerOnboarding,
} from '@/lib/subscription/onboarding'

/* ── GET/POST /api/onboarding — STATUS & PENYIMPANAN ONBOARDING ──────────────
   GET  → dipakai `OnboardingGate` untuk memutuskan apakah user baru harus
          diarahkan ke `/app/onboarding`.
   POST → dipanggil SETELAH flow onboarding selesai. Hasilnya disimpan di
          `user_settings.onboarding` atas nama pemanggil (RLS), sehingga
          onboarding tidak diulang di perangkat kedua dan statusnya bisa
          dipercaya server.

   Kenapa di server, bukan langsung dari browser: `onboarding` adalah data
   AKUN. Menulisnya lewat route ini membuat satu pintu validasi + satu tempat
   yang mudah diaudit. */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response

  const status = await readCallerOnboarding(auth.token)
  return NextResponse.json({ ok: true, ...status })
}

export async function POST(req: NextRequest) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => null)
  if (!isOnboardingPayload(body)) {
    return NextResponse.json(
      { ok: false, error: 'Data onboarding tidak lengkap.' },
      { status: 422 },
    )
  }

  /* Tanpa backend (demo/test) tidak ada tempat menyimpan. Jangan gagalkan flow:
     localStorage tetap menyimpan hasilnya di perangkat ini. */
  if (!restConfigured()) {
    return NextResponse.json({ ok: true, persisted: false, configured: false })
  }

  const saved = await restFetch<unknown>('user_settings?on_conflict=user_id', {
    method: 'POST',
    accessToken: auth.token,
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: {
      user_id: auth.user.id,
      onboarding: body,
      updated_at: new Date().toISOString(),
    },
  })

  if (!saved.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Onboarding sudah tersimpan di perangkat, tapi belum bisa dikirim ke server.',
      },
      { status: 502 },
    )
  }

  return NextResponse.json({ ok: true, persisted: true, configured: true })
}
