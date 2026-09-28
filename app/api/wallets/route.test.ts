import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { SESSION_A, SESSION_B } from '@/lib/supabase/session-fixture'
import { GET as listRoute, POST as createRoute } from './route'
import { DELETE as deleteRoute, GET as detailRoute, PUT as updateRoute } from './[id]/route'
import { resetWalletStore, walletsOf } from './store'

/* ── Test otorisasi endpoint dompet (diperbarui paket 45) ────────────────────
   Dua janji yang sama seperti paket 39 tetap diuji di sini:
     • TANPA sesi → 401 di keempat handler (GET/POST/PUT/DELETE);
     • DENGAN sesi user A → dompet user B tidak bisa disentuh (404), dan isi store
       user A tidak berubah karena permintaan user B.

   Yang berubah sejak paket 45:
     1. cookie sesinya milik SUPABASE (`sessionFixture()` menulis bentuk yang
        benar-benar dipakai `@supabase/ssr`), bukan token mock;
     2. store-nya async (proxy PostgREST saat backend dipasangkan). Di test env
        tanpa `NEXT_PUBLIC_SUPABASE_*`, store otomatis memakai fallback memory —
        jadi test ini tetap deterministik dan tidak menyentuh jaringan;
     3. identitas user datang dari TOKEN, dan token itu yang dipakai store untuk
        memanggil server (RLS di database memeriksanya). */

function request({
  method = 'GET',
  user,
  body,
}: {
  method?: string
  user?: { cookieHeader: string }
  body?: unknown
} = {}) {
  const headers: Record<string, string> = {}
  if (user) headers.cookie = user.cookieHeader
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  return new NextRequest('http://localhost/api/wallets', {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

/** params Next 16 = Promise */
function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  resetWalletStore()
})

describe('tanpa sesi · semua handler menjawab 401', () => {
  it('GET /api/wallets → 401', async () => {
    const res = await listRoute(request())
    expect(res.status).toBe(401)
  })

  it('POST /api/wallets → 401', async () => {
    const res = await createRoute(request({ method: 'POST', body: { name: 'Dompet Nakal' } }))
    expect(res.status).toBe(401)
  })

  it('GET /api/wallets/:id → 401', async () => {
    const res = await detailRoute(request(), params('bca'))
    expect(res.status).toBe(401)
  })

  it('PUT /api/wallets/:id → 401', async () => {
    const res = await updateRoute(request({ method: 'PUT', body: { name: 'Dibajak' } }), params('bca'))
    expect(res.status).toBe(401)
  })

  it('DELETE /api/wallets/:id → 401', async () => {
    const res = await deleteRoute(request({ method: 'DELETE' }), params('bca'))
    expect(res.status).toBe(401)
  })

  it('401 tetap 401 walau body-nya kosong/rusak (dicek sebelum parsing)', async () => {
    const res = await updateRoute(request({ method: 'PUT' }), params('bca'))
    expect(res.status).toBe(401)
  })
})

describe('dengan sesi · data ter-scope satu user', () => {
  it('GET mengembalikan dompet milik pemanggil (store-nya sendiri)', async () => {
    const res = await listRoute(request({ user: SESSION_A }))
    expect(res.status).toBe(200)

    const wallets = (await res.json()) as { id: string }[]
    expect(wallets.length).toBeGreaterThan(0)
    expect(wallets.map((wallet) => wallet.id)).toEqual(
      (await walletsOf(SESSION_A.session.userId, SESSION_A.session.accessToken)).map(
        (wallet) => wallet.id,
      ),
    )
  })

  it('PUT hanya mengubah store user pemanggil — user lain tidak ikut berubah', async () => {
    const res = await updateRoute(
      request({ method: 'PUT', user: SESSION_A, body: { name: 'BCA Gaji' } }),
      params('bca'),
    )
    expect(res.status).toBe(200)

    const a = (await walletsOf(SESSION_A.session.userId, SESSION_A.session.accessToken)).find(
      (wallet) => wallet.id === 'bca',
    )
    const b = (await walletsOf(SESSION_B.session.userId, SESSION_B.session.accessToken)).find(
      (wallet) => wallet.id === 'bca',
    )
    expect(a?.name).toBe('BCA Gaji')
    /* inilah inti paket 39 yang tetap dijaga: perubahan user A tidak menembus ke B */
    expect(b?.name).toBe('BCA')
  })

  it('DELETE dompet milik A tidak menghapus dompet B', async () => {
    const res = await deleteRoute(request({ method: 'DELETE', user: SESSION_A }), params('bca'))
    expect(res.status).toBe(200)

    const a = await walletsOf(SESSION_A.session.userId, SESSION_A.session.accessToken)
    const b = await walletsOf(SESSION_B.session.userId, SESSION_B.session.accessToken)
    expect(a.some((wallet) => wallet.id === 'bca')).toBe(false)
    expect(b.some((wallet) => wallet.id === 'bca')).toBe(true)
  })

  it('id milik user lain tetap 404 — bukan 403 yang membocorkan keberadaan baris', async () => {
    const created = await createRoute(
      request({ method: 'POST', user: SESSION_B, body: { name: 'Dompet B', kind: 'cash' } }),
    )
    const walletB = (await created.json()) as { id: string }

    const stolenGet = await detailRoute(request({ user: SESSION_A }), params(walletB.id))
    const stolenDelete = await deleteRoute(request({ method: 'DELETE', user: SESSION_A }), params(walletB.id))

    expect(stolenGet.status).toBe(404)
    expect(stolenDelete.status).toBe(404)
    const bList = await walletsOf(SESSION_B.session.userId, SESSION_B.session.accessToken)
    expect(bList.some((wallet) => wallet.id === walletB.id)).toBe(true)
  })

  it('POST: `holder` diambil dari sesi, bukan dari body request', async () => {
    const res = await createRoute(
      request({
        method: 'POST',
        user: SESSION_A,
        body: { name: 'Kas Kecil', holder: 'Bima', balance: -500, kind: 'cash' },
      }),
    )
    expect(res.status).toBe(201)

    const wallet = (await res.json()) as { holder: string; balance: number }
    expect(wallet.holder).toBe(SESSION_A.session.name)
    /* validasi Stage 1 tetap berlaku: saldo negatif dijepit jadi 0 */
    expect(wallet.balance).toBe(0)
  })
})

