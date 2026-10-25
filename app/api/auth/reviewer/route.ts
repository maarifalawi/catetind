import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  REVIEWER_CREDENTIALS_MESSAGE,
  REVIEWER_DISABLED_MESSAGE,
  REVIEWER_RATE_LIMIT_MESSAGE,
  REVIEWER_SESSION_FAILED_MESSAGE,
  REVIEWER_TEST_EMAIL,
  REVIEWER_TEST_NICKNAME,
  REVIEWER_UNAVAILABLE_MESSAGE,
  isReviewerEmail,
  isReviewerTestCode,
  reviewerLoginEnabled,
} from '@/lib/data/reviewer-access'
import {
  hasSupabaseConfig,
  hasSupabaseServiceRole,
  supabaseServiceKey,
  supabaseUrl,
} from '@/lib/supabase/config'

/* ── POST /api/auth/reviewer — SESI UNTUK REVIEWER MIDTRANS ──────────────────
   Kenapa route ini ada: login normal mengirim OTP ke inbox email. Reviewer
   manusia dari Midtrans tidak punya akses inbox kita, jadi mereka tidak akan
   pernah bisa masuk untuk menguji checkout. Route ini membuat sesi Supabase
   SUNGGUHAN untuk akun uji `reviewer@catetind.com` saat kode akses tetap
   `123456` dikirim — tanpa SMTP, tanpa inbox.

   Alur (semua di server, kunci rahasia tidak pernah ke browser):
     1. validasi kredensial reviewer (email persis + kode persis);
     2. pastikan akun reviewer ada & emailnya terkonfirmasi (`admin.createUser`
        dengan `email_confirm: true`; kalau sudah ada, lanjut);
     3. `admin.generateLink({ type: 'magiclink' })` → `hashed_token` (Supabase
        TIDAK mengirim email di jalur admin ini);
     4. balas `hashed_token` ke browser; klien menukarnya jadi sesi dengan
        `verifyOtp({ token_hash, type: 'magiclink' })` — cookie sesi ditulis
        `@supabase/ssr` seperti login OTP biasa.

   Keamanan yang berlaku:
     · HANYA email + kode reviewer (lihat `lib/data/reviewer-access.ts`);
     · butuh `SUPABASE_SERVICE_ROLE_KEY` (server-only, tidak pernah NEXT_PUBLIC_);
     · rate-limit percobaan per IP (best-effort, per instance server);
     · pesan error tidak membocorkan detail Supabase;
     · akun reviewer tetap akun biasa — RLS & gerbang paket berlaku sama. */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** maksimum percobaan per IP dalam satu jendela waktu */
const ATTEMPT_LIMIT = 20
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000
/** batas kasar supaya Map tidak tumbuh tanpa henti di proses yang hidup lama */
const ATTEMPT_KEYS_LIMIT = 500

const attempts = new Map<string, number[]>()

function callerKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for') ?? ''
  const first = forwarded.split(',')[0]?.trim()
  return first || request.headers.get('x-real-ip')?.trim() || 'unknown'
}

/** catat percobaan; `false` = sudah lewat batas */
function allowAttempt(key: string, now = Date.now()): boolean {
  const recent = (attempts.get(key) ?? []).filter((time) => now - time < ATTEMPT_WINDOW_MS)
  if (recent.length >= ATTEMPT_LIMIT) {
    attempts.set(key, recent)
    return false
  }
  recent.push(now)
  attempts.set(key, recent)
  if (attempts.size > ATTEMPT_KEYS_LIMIT) {
    attempts.forEach((times, entry) => {
      const fresh = times.filter((time) => now - time < ATTEMPT_WINDOW_MS)
      if (fresh.length === 0) attempts.delete(entry)
      else attempts.set(entry, fresh)
    })
  }
  return true
}

/** hanya untuk test: kosongkan penghitung percobaan */
export function resetReviewerAttemptsForTest(): void {
  attempts.clear()
}

function fail(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

interface ReviewerBody {
  email?: unknown
  code?: unknown
}

export async function POST(request: NextRequest) {
  if (!reviewerLoginEnabled(process.env.REVIEWER_TEST_LOGIN_ENABLED)) {
    return fail(REVIEWER_DISABLED_MESSAGE, 403)
  }

  if (!allowAttempt(callerKey(request))) {
    return fail(REVIEWER_RATE_LIMIT_MESSAGE, 429)
  }

  const body = (await request.json().catch(() => null)) as ReviewerBody | null
  const email = typeof body?.email === 'string' ? body.email : ''
  const code = typeof body?.code === 'string' ? body.code : ''

  /* Satu pesan untuk email salah MAUPUN kode salah — endpoint ini tidak boleh
     menjadi alat menebak email mana yang punya jalur khusus. */
  if (!isReviewerEmail(email) || !isReviewerTestCode(email, code)) {
    return fail(REVIEWER_CREDENTIALS_MESSAGE, 401)
  }

  if (!hasSupabaseConfig() || !hasSupabaseServiceRole()) {
    console.error('[reviewer-login] service role / Supabase belum dikonfigurasi')
    return fail(REVIEWER_UNAVAILABLE_MESSAGE, 503)
  }

  const admin = createClient(supabaseUrl(), supabaseServiceKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  /* 1 — pastikan akun reviewer ada & terkonfirmasi. `createUser` mengembalikan
     error kalau emailnya sudah terdaftar; itu keadaan normal (login kedua dst.),
     jadi bukan kegagalan. */
  try {
    const created = await admin.auth.admin.createUser({
      email: REVIEWER_TEST_EMAIL,
      email_confirm: true,
      user_metadata: { nickname: REVIEWER_TEST_NICKNAME },
    })
    if (created.error) {
      const alreadyExists =
        created.error.code === 'email_exists' ||
        /already (been )?registered|already exists/i.test(created.error.message)
      if (!alreadyExists) {
        console.error('[reviewer-login] createUser gagal:', created.error.message)
      }
    }
  } catch (error) {
    console.error('[reviewer-login] createUser melempar:', error)
  }

  /* 2 — buat token sesi lewat Admin API (tanpa mengirim email). */
  try {
    const link = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: REVIEWER_TEST_EMAIL,
    })
    const tokenHash = link.data?.properties?.hashed_token
    if (link.error || !tokenHash) {
      console.error('[reviewer-login] generateLink gagal:', link.error?.message ?? 'tanpa token')
      return fail(REVIEWER_SESSION_FAILED_MESSAGE, 502)
    }

    return NextResponse.json({
      ok: true,
      email: REVIEWER_TEST_EMAIL,
      tokenHash,
      type: 'magiclink',
    })
  } catch (error) {
    console.error('[reviewer-login] generateLink melempar:', error)
    return fail(REVIEWER_SESSION_FAILED_MESSAGE, 502)
  }
}
