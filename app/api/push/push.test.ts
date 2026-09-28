import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import type { PushSubscription } from 'web-push'
import { SESSION_A, SESSION_B } from '@/lib/supabase/session-fixture'
import { POST as sendRoute } from './send/route'
import { DELETE as unsubscribeRoute, POST as subscribeRoute } from './subscribe/route'
import {
  PUSH_RATE_MAX,
  consumeRateSlot,
  dropEndpoint,
  pushEndpoint,
  resetPushStore,
  subscriptionsOf,
} from './store'

/* ── Test push per-user (diperbarui paket 45) ────────────────────────────────
   Temuan audit: `/api/push/send` dulu menyiarkan `title`/`body`/`url` dari body
   request ke SEMUA subscription — siapa pun bisa mengirim notifikasi apa pun ke
   seluruh pengguna (vektor phishing massal). Test ini mengunci perbaikannya:

     1. tanpa sesi → 401 (sebelum menyentuh VAPID, jadi tetap 401 walau env-nya
        belum di-set);
     2. permintaan yang MENGARAH ke penerima lain (`toUserId`/`endpoint`) → 403;
     3. subscription terpisah per user, dan hanya pemiliknya yang bisa mencabutnya.

   Sejak paket 45 datanya hidup di tabel `push_subscriptions` (RLS aktif), jadi
   fungsi store-nya async dan memakai fallback memory saat backend belum
   dipasangkan (kondisi test env). */

const USER_A = { id: SESSION_A.session.userId, email: SESSION_A.session.email, name: SESSION_A.session.name }
const USER_B = { id: SESSION_B.session.userId, email: SESSION_B.session.email, name: SESSION_B.session.name }

function subscription(endpoint: string): PushSubscription {
  return {
    endpoint,
    keys: { p256dh: 'p256dh-palsu', auth: 'auth-palsu' },
  } as PushSubscription
}

function request({
  method = 'POST',
  user,
  body,
}: {
  method?: string
  user?: typeof SESSION_A
  body?: unknown
} = {}) {
  const headers: Record<string, string> = {}
  if (user) headers.cookie = user.cookieHeader
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  return new NextRequest('http://localhost/api/push/send', {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  resetPushStore()
})

describe('POST /api/push/send · otorisasi', () => {
  it('tanpa sesi → 401 (dicek sebelum VAPID & sebelum rate limit)', async () => {
    const res = await sendRoute(request({ body: { title: 'Halo', body: 'dari anonim' } }))
    expect(res.status).toBe(401)
  })

  it('mengirim ke user lain → 403 eksplisit, bukan diabaikan diam-diam', async () => {
    const res = await sendRoute(
      request({ user: SESSION_A, body: { toUserId: USER_B.id, title: 'Palsu', body: 'Bang' } }),
    )
    expect(res.status).toBe(403)
    expect(await subscriptionsOf(USER_B.id, SESSION_B.session.accessToken)).toHaveLength(0)
  })

  it('memilih endpoint tertentu milik orang lain juga ditolak', async () => {
    const res = await sendRoute(
      request({ user: SESSION_A, body: { endpoints: ['https://push.example/b'] } }),
    )
    expect(res.status).toBe(403)
  })
})

describe('store push · isolasi antar-user (menyusul RLS di server)', () => {
  it('subscription hanya menjangkau pemiliknya', async () => {
    await pushEndpoint(USER_A.id, subscription('https://push.example/a'), SESSION_A.session.accessToken)
    await pushEndpoint(USER_B.id, subscription('https://push.example/b'), SESSION_B.session.accessToken)

    const mine = await subscriptionsOf(USER_A.id, SESSION_A.session.accessToken)
    expect(mine).toHaveLength(1)
    expect(mine[0].subscription.endpoint).toBe('https://push.example/a')
    expect(mine[0].userId).toBe(USER_A.id)
  })

  it('unsubscribe milik orang lain ditolak', async () => {
    await pushEndpoint(USER_B.id, subscription('https://push.example/b'), SESSION_B.session.accessToken)
    expect(await dropEndpoint('https://push.example/b', USER_A.id, SESSION_A.session.accessToken)).toBe(false)
    expect(await subscriptionsOf(USER_B.id, SESSION_B.session.accessToken)).toHaveLength(1)
    /* pemiliknya sendiri tetap bisa mencabut */
    expect(await dropEndpoint('https://push.example/b', USER_B.id, SESSION_B.session.accessToken)).toBe(true)
    expect(await subscriptionsOf(USER_B.id, SESSION_B.session.accessToken)).toHaveLength(0)
  })

  it('rate limit: kiriman ke-6 dalam satu menit ditolak, lalu pulih', () => {
    const now = 1_800_000_000_000
    for (let i = 0; i < PUSH_RATE_MAX; i++) {
      expect(consumeRateSlot(USER_A.id, now + i).allowed).toBe(true)
    }

    const blocked = consumeRateSlot(USER_A.id, now + PUSH_RATE_MAX)
    expect(blocked.allowed).toBe(false)
    if (!blocked.allowed) expect(blocked.retryAfterSeconds).toBeGreaterThan(0)

    /* jendelanya bergeser: setelah 1 menit, jatahnya kembali */
    expect(consumeRateSlot(USER_A.id, now + 60_001).allowed).toBe(true)
  })
})

describe('POST /api/push/subscribe · terikat sesi', () => {
  it('tanpa sesi → 401 dan tidak menyimpan apa pun', async () => {
    const res = await subscribeRoute(request({ body: subscription('https://push.example/x') }))
    expect(res.status).toBe(401)
    expect(await subscriptionsOf(USER_A.id, SESSION_A.session.accessToken)).toHaveLength(0)
  })

  it('dengan sesi → tersimpan atas nama pemanggil', async () => {
    const res = await subscribeRoute(
      request({ user: SESSION_A, body: subscription('https://push.example/x') }),
    )
    expect(res.status).toBe(201)

    const mine = await subscriptionsOf(USER_A.id, SESSION_A.session.accessToken)
    expect(mine).toHaveLength(1)
    expect(mine[0].userId).toBe(USER_A.id)
  })

  it('DELETE hanya mencabut endpoint milik pemanggil', async () => {
    await pushEndpoint(USER_B.id, subscription('https://push.example/b'), SESSION_B.session.accessToken)

    const stolen = await unsubscribeRoute(
      request({ method: 'DELETE', user: SESSION_A, body: { endpoint: 'https://push.example/b' } }),
    )
    const stolenBody = (await stolen.json()) as { removed: boolean }
    expect(stolen.status).toBe(200)
    expect(stolenBody.removed).toBe(false)
    expect(await subscriptionsOf(USER_B.id, SESSION_B.session.accessToken)).toHaveLength(1)

    const mine = await unsubscribeRoute(
      request({ method: 'DELETE', user: SESSION_B, body: { endpoint: 'https://push.example/b' } }),
    )
    const mineBody = (await mine.json()) as { removed: boolean }
    expect(mineBody.removed).toBe(true)
  })
})

