import { NextRequest, NextResponse } from 'next/server'
import type { PushSubscription } from 'web-push'
import { requireUser } from '@/lib/session'
import { dropEndpoint, pushEndpoint } from '../store'

/**
 * Web Push subscribe/unsubscribe — sekarang TERIKAT SESI.
 *
 * Sebelumnya: siapa pun bisa menyimpan subscription tanpa identitas, dan
 * pemiliknya tidak pernah dicatat — jadi `send` harus menyiarkan ke semua orang.
 * Sekarang tiap subscription menyimpan `userId` pemanggil, dan itulah yang
 * membuat `POST /api/push/send` bisa memilih target dengan benar.
 *
 * 🚧 Produksi: `INSERT INTO push_subscriptions (user_id, endpoint, subscription)`
 * + RLS `user_id = auth.uid()`.
 */
export async function POST(req: NextRequest) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response

  const sub = (await req.json().catch(() => null)) as PushSubscription | null
  if (!sub?.endpoint) {
    return NextResponse.json({ error: 'endpoint kosong' }, { status: 400 })
  }

  await pushEndpoint(auth.user.id, sub, auth.token)
  return NextResponse.json({ ok: true, userId: auth.user.id }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response

  const { endpoint } = ((await req.json().catch(() => ({}))) as { endpoint?: string })
  if (!endpoint) {
    return NextResponse.json({ error: 'endpoint kosong' }, { status: 400 })
  }

  /* `userId` selalu dikirim → user A tidak bisa mencabut subscription user B */
  const removed = await dropEndpoint(endpoint, auth.user.id, auth.token)
  return NextResponse.json({ ok: true, removed })
}

