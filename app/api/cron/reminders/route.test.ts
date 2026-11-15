import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { CRON_SECRET_HEADER, isAuthorizedCron, readCronToken } from '@/lib/push/auth'
import { GET, POST } from './route'

/* ── ENDPOINT CRON: TANPA RAHASIA = 401 ──────────────────────────────────────
   Jalur ini bisa mengirim notifikasi ke SELURUH pengguna, dan repo-nya publik.
   Karena itu penolakan harus terjadi SEBELUM satu baris database disentuh, dan
   `CRON_SECRET` yang kosong berarti jalur MATI — bukan terbuka.

   Test ini sengaja menguji tiga lapis:

     1. `isAuthorizedCron` (aturan header: Bearer & `x-cron-secret`);
     2. route menjawab 401 saat rahasianya tidak ada / tidak cocok;
     3. route LOLOS otorisasi saat rahasianya benar — dibuktikan dengan status
        yang berbeda (503 = backend belum siap di lingkungan test), bukan 401.
        Tanpa pemisahan ini, test "401" akan lulus walau route menolak semuanya. */

const SECRET = 'rahasia-cron-uji-32-karakter-panjang'
const ORIGINAL_SECRET = process.env.CRON_SECRET

function request(headers: Record<string, string> = {}, url = 'http://localhost/api/cron/reminders?mode=morning') {
  return new NextRequest(url, { method: 'GET', headers })
}

beforeEach(() => {
  delete process.env.CRON_SECRET
})

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = ORIGINAL_SECRET
})

describe('isAuthorizedCron · aturan header', () => {
  it('menerima Authorization: Bearer (bentuk yang dikirim Vercel Cron)', () => {
    expect(isAuthorizedCron(new Headers({ authorization: `Bearer ${SECRET}` }), SECRET)).toBe(true)
  })

  it('menerima header x-cron-secret (pemanggilan manual/CI)', () => {
    expect(isAuthorizedCron(new Headers({ [CRON_SECRET_HEADER]: SECRET }), SECRET)).toBe(true)
  })

  it('menolak rahasia kosong, salah, dan token berlebih', () => {
    expect(isAuthorizedCron(new Headers({ authorization: `Bearer ${SECRET}` }), '')).toBe(false)
    expect(isAuthorizedCron(new Headers({ authorization: 'Bearer salah' }), SECRET)).toBe(false)
    expect(isAuthorizedCron(new Headers({}), SECRET)).toBe(false)
    expect(isAuthorizedCron(new Headers({ authorization: `Bearer ${SECRET}x` }), SECRET)).toBe(false)
  })

  it('membaca token dari Bearer lebih dulu, lalu x-cron-secret', () => {
    expect(readCronToken(new Headers({ authorization: `Bearer ${SECRET}` }))).toBe(SECRET)
    expect(readCronToken(new Headers({ [CRON_SECRET_HEADER]: 'abc' }))).toBe('abc')
    expect(readCronToken(new Headers({}))).toBe('')
  })
})

describe('GET/POST /api/cron/reminders · otorisasi', () => {
  it('tanpa CRON_SECRET di server → 401 (fail-closed, bukan terbuka)', async () => {
    const res = await GET(request({ authorization: `Bearer ${SECRET}` }))
    expect(res.status).toBe(401)
    const body = (await res.json()) as { ok: boolean; error: string }
    expect(body.ok).toBe(false)
    expect(body.error).toContain('CRON_SECRET')
  })

  it('tanpa header otorisasi → 401', async () => {
    process.env.CRON_SECRET = SECRET
    const res = await GET(request())
    expect(res.status).toBe(401)
  })

  it('token salah → 401', async () => {
    process.env.CRON_SECRET = SECRET
    const res = await POST(request({ authorization: 'Bearer token-palsu' }))
    expect(res.status).toBe(401)
  })

  it('token sah → lolos otorisasi; 503 karena Supabase belum dikonfigurasi di test env', async () => {
    process.env.CRON_SECRET = SECRET
    const res = await POST(request({ [CRON_SECRET_HEADER]: SECRET }))
    /* 401 = ditolak; 503 = lolos tapi backend/VAPID belum siap. Yang diuji:
       route TIDAK lagi menolak token yang benar. */
    expect(res.status).not.toBe(401)
    expect(res.status).toBe(503)
    const body = (await res.json()) as { ok: boolean; error?: string }
    expect(body.ok).toBe(false)
    expect(body.error).toBeTruthy()
  })

  it('mode simulasi (?dryRun=1) juga melewati otorisasi yang sama', async () => {
    process.env.CRON_SECRET = SECRET
    const res = await GET(request({ authorization: `Bearer ${SECRET}` }, 'http://localhost/api/cron/reminders?mode=weekly&dryRun=1'))
    expect(res.status).not.toBe(401)
  })
})
