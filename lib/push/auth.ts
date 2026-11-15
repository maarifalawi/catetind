import { timingSafeEqual } from 'node:crypto'

/* ── OTORISASI ENDPOINT CRON (SATU TEMPAT, FAIL-CLOSED) ──────────────────────
   Vercel Cron TIDAK membawa sesi user: satu-satunya bukti yang boleh diterima
   adalah rahasia bersama `CRON_SECRET` (diset sebagai Environment Variable di
   project Vercel). Vercel mengirimnya otomatis sebagai
   `Authorization: Bearer <CRON_SECRET>` pada setiap eksekusi jadwal.

   Tiga aturan yang tidak boleh dilonggarkan:

     1. `CRON_SECRET` kosong = jalur cron MATI (401), bukan terbuka. Ini
        penting: repo ini publik, jadi kalau tidak di-set, siapa pun yang tahu
        URL-nya bisa memicu kiriman massal.
     2. Token hanya diterima dari header `Authorization: Bearer …` atau
        `x-cron-secret`. Header `x-vercel-cron` TIDAK dipakai sebagai bukti —
        header biasa bisa ditempel siapa saja, jadi nilainya tidak mengikat.
     3. Perbandingan dilakukan constant-time (`timingSafeEqual`) supaya panjang
        token tidak bisa ditebak lewat perbedaan waktu balasan.

   Fungsi di file ini MURNI terhadap header, jadi bisa diuji tanpa route
   (`app/api/cron/reminders/route.test.ts`).
   ────────────────────────────────────────────────────────────────────────── */

/** header alternatif untuk pemanggilan server-to-server di luar Vercel (*curl*, CI) */
export const CRON_SECRET_HEADER = 'x-cron-secret'

/** baca rahasia dari environment SAAT DIPANGGIL (bukan saat modul dimuat) */
export function cronSecretFromEnv(env: Record<string, string | undefined> = process.env): string {
  return (env.CRON_SECRET ?? '').trim()
}

function equalSecret(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8')
  const right = Buffer.from(b, 'utf8')
  /* panjang berbeda → pasti tidak sah; `timingSafeEqual` menolak panjang beda */
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

/** token yang dibawa request: Bearer lebih dulu, lalu header khusus */
export function readCronToken(headers: Headers): string {
  const authorization = headers.get('authorization') ?? ''
  const bearer = authorization.toLowerCase().startsWith('bearer ') ? authorization.slice(7).trim() : ''
  if (bearer) return bearer
  return (headers.get(CRON_SECRET_HEADER) ?? '').trim()
}

/**
 * True hanya kalau request membawa rahasia cron yang sah.
 *
 * `secret` bisa disuntikkan untuk pengujian; nilai bawaan dibaca dari env.
 */
export function isAuthorizedCron(
  headers: Headers,
  secret: string = cronSecretFromEnv(),
): boolean {
  if (secret.length === 0) return false
  const token = readCronToken(headers)
  if (token.length === 0) return false
  return equalSecret(token, secret)
}
