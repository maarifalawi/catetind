import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { sessionFixture } from '@/lib/supabase/session-fixture'

/* ── JALUR DATA SERVER (`POST /api/data`) ─────────────────────────────────────
   Route ini adalah jembatan untuk sesi-cookie yang klien browser-nya tidak bisa
   dipakai. Karena ia memakai kunci peran server (BYPASS RLS), yang diuji di sini
   adalah PAGARNYA, bukan jalan bahagianya:

     · tanpa sesi sah        → 401 (identitas tidak pernah dari body);
     · sesi sah tapi kunci peran server tidak ada → 503 (FAIL CLOSED — route ini
       tidak pernah diam-diam bekerja tanpa hak yang benar).

   Penjagaan lain (allowlist tabel, `user_id` dari sesi, `match` hanya kolom
   sederhana, payload ≤ 96 KB) ada di route dan tidak bisa diuji tanpa database;
   komentar di route menjelaskan masing-masing. */

function request(body: unknown, cookie?: string) {
  return new NextRequest('http://localhost/api/data', {
    method: 'POST',
    ...(cookie ? { headers: { cookie, 'content-type': 'application/json' } } : {}),
    body: JSON.stringify(body),
  })
}

describe('POST /api/data · pagar identitas & kunci', () => {
  it('tanpa cookie sesi → 401, apa pun isi body-nya', async () => {
    const res = await POST(request({ table: 'ledger_rows', op: 'select', user_id: 'orang-lain' }))
    expect(res.status).toBe(401)
  })

  it('sesi sah tapi kunci peran server tidak tersedia → 503 (fail closed)', async () => {
    const { cookieHeader } = sessionFixture()
    const res = await POST(
      request({ table: 'user_settings', op: 'select' }, cookieHeader),
    )
    expect(res.status).toBe(503)
    const body = (await res.json()) as { error?: string }
    expect(body.error ?? '').toBeTruthy()
  })
})
