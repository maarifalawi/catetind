import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  OWNER_CREDENTIALS_MESSAGE,
  OWNER_DISABLED_MESSAGE,
  OWNER_RATE_LIMIT_MESSAGE,
  OWNER_SESSION_FAILED_MESSAGE,
  OWNER_UNAVAILABLE_MESSAGE,
  isOwnerTestCode,
  isOwnerTestEmail,
  ownerFastLoginConfigured,
  ownerLoginEnabled,
  ownerTestEmail,
  ownerTestNickname,
} from '@/lib/data/owner-access'
import { hasSupabaseConfig, hasSupabaseServiceRole, supabaseServiceKey, supabaseUrl } from '@/lib/supabase/config'
import { serverSupabase } from '@/lib/supabase/server'

/* ── POST /api/auth/owner — SESI PEMILIK TANPA EMAIL ─────────────────────────
   Kenapa route ini ada: login normal mengirim OTP ke inbox. Pemilik aplikasi
   butuh masuk ke akunnya tanpa menunggu email (uji build produksi, perangkat
   tanpa akses inbox). Route ini membuat sesi Supabase SUNGGUHAN untuk akun di
   env `OWNER_TEST_EMAIL` saat kode `OWNER_TEST_OTP` dikirim — tanpa SMTP.

   DUA TAHAP (satu endpoint):
     · `{ email }` tanpa kode  → PROBE: `{ ok, fastLogin }`. Layar masuk
       memakainya untuk tahu apakah email ini harus melewati pengiriman email.
       Tidak membuat sesi, tidak menyentuh Admin API.
     · `{ email, code }`       → KREDENSIAL: buat sesi (alur di bawah).

   Alur pembuatan sesi (semua di server, kunci rahasia tidak pernah ke browser):
     1. validasi kredensial pemilik (email persis + kode persis);
     2. pastikan akun ada & emailnya terkonfirmasi (`admin.createUser` dengan
        `email_confirm: true`; kalau sudah ada, lanjut);
     3. `admin.generateLink({ type: 'magiclink' })` → `hashed_token`
        (jalur admin ini TIDAK mengirim email);
     4. tukar `hashed_token` jadi sesi DI SERVER lewat `verifyOtp` pada klien
        `@supabase/ssr` — cookie sesi ditulis `setAll`, persis seperti login OTP
        biasa. Token TIDAK pernah dikirim ke browser.

   Keamanan yang berlaku:
     · kredensialnya hanya dari env (`lib/data/owner-access.ts`), tidak ditulis
       di kode — repo publik, jadi tidak ada email/kode yang ikut ter-commit;
     · env kosong = jalur mati (probe menjawab `fastLogin:false`);
     · butuh `SUPABASE_SERVICE_ROLE_KEY` (server-only, tidak pernah NEXT_PUBLIC_);
     · rate-limit percobaan per IP (best-effort, per instance server);
     · pesan error tidak membocorkan detail Supabase;
     · akun pemilik tetap akun biasa — RLS & gerbang paket berlaku sama.
     · env `OWNER_TEST_LOGIN_ENABLED=0` mematikan route ini (403). */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** maksimum percobaan per IP dalam satu jendela waktu — kode tetap hanya 6
 *  angka, jadi batas ketat inilah yang membuatnya tidak bisa ditebak */
const ATTEMPT_LIMIT = 10
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
export function resetOwnerAttemptsForTest(): void {
  attempts.clear()
}

function fail(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

interface OwnerBody {
  email?: unknown
  code?: unknown
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as OwnerBody | null
  const email = typeof body?.email === 'string' ? body.email : ''
  const code = typeof body?.code === 'string' ? body.code : ''

  /* ── TAHAP 1 · PROBE (tanpa kode) ─────────────────────────────────────────
     Dipanggil `sendLoginLink` SEBELUM `signInWithOtp`: layar masuk perlu tahu
     apakah email ini memakai jalur tanpa email. Balasannya tidak membuat sesi
     dan tidak menyentuh Admin API. Env kosong / jalur dimatikan → `false`, jadi
     login OTP biasa berjalan persis seperti sebelumnya. */
  if (!code) {
    const fastLogin =
      ownerLoginEnabled(process.env.OWNER_TEST_LOGIN_ENABLED) &&
      ownerFastLoginConfigured() &&
      isOwnerTestEmail(email)
    return NextResponse.json({ ok: true, fastLogin })
  }

  /* ── TAHAP 2 · KREDENSIAL ──────────────────────────────────────────────── */
  if (!ownerLoginEnabled(process.env.OWNER_TEST_LOGIN_ENABLED)) {
    return fail(OWNER_DISABLED_MESSAGE, 403)
  }

  if (!ownerFastLoginConfigured()) {
    /* env belum diisi: jangan pernah membuat sesi, dan jangan menyalahkan kode */
    console.error('[owner-login] OWNER_TEST_EMAIL / OWNER_TEST_OTP belum diisi')
    return fail(OWNER_UNAVAILABLE_MESSAGE, 503)
  }

  if (!allowAttempt(callerKey(request))) {
    return fail(OWNER_RATE_LIMIT_MESSAGE, 429)
  }

  /* Satu pesan untuk email salah MAUPUN kode salah — endpoint ini tidak boleh
     menjadi alat menebak email mana yang punya jalur khusus. */
  if (!isOwnerTestEmail(email) || !isOwnerTestCode(email, code)) {
    return fail(OWNER_CREDENTIALS_MESSAGE, 401)
  }

  if (!hasSupabaseConfig() || !hasSupabaseServiceRole()) {
    console.error('[owner-login] service role / Supabase belum dikonfigurasi')
    return fail(OWNER_UNAVAILABLE_MESSAGE, 503)
  }

  const ownerEmail = ownerTestEmail()

  const admin = createClient(supabaseUrl(), supabaseServiceKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  /* 1 — pastikan akun pemilik ada & terkonfirmasi. `createUser` mengembalikan
     error kalau emailnya sudah terdaftar; itu keadaan normal (login kedua dst.),
     jadi bukan kegagalan. */
  try {
    const created = await admin.auth.admin.createUser({
      email: ownerEmail,
      email_confirm: true,
      user_metadata: { nickname: ownerTestNickname() },
    })
    if (created.error) {
      const alreadyExists =
        created.error.code === 'email_exists' ||
        /already (been )?registered|already exists/i.test(created.error.message)
      if (!alreadyExists) {
        console.error('[owner-login] createUser gagal:', created.error.message)
      }
    }
  } catch (error) {
    console.error('[owner-login] createUser melempar:', error)
  }

  /* 2 — buat token sesi lewat Admin API (tanpa mengirim email). */
  try {
    const link = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: ownerEmail,
    })
    const tokenHash = link.data?.properties?.hashed_token
    if (link.error || !tokenHash) {
      console.error('[owner-login] generateLink gagal:', link.error?.message ?? 'tanpa token')
      return fail(OWNER_SESSION_FAILED_MESSAGE, 502)
    }

    /* 3 — tukar token jadi sesi DI SERVER. `serverSupabase()` adalah klien
       `@supabase/ssr`, jadi cookie sesi ditulis ke response oleh `setAll` —
       browser tidak pernah melihat `token_hash`. */
    const supabase = await serverSupabase()
    if (!supabase) {
      console.error('[owner-login] klien sesi server tidak tersedia')
      return fail(OWNER_UNAVAILABLE_MESSAGE, 503)
    }

    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
    if (error) {
      console.error('[owner-login] verifyOtp gagal:', error.message)
      return fail(OWNER_SESSION_FAILED_MESSAGE, 502)
    }

    return NextResponse.json({ ok: true, email: ownerEmail })
  } catch (error) {
    console.error('[owner-login] pembuatan sesi melempar:', error)
    return fail(OWNER_SESSION_FAILED_MESSAGE, 502)
  }
}
