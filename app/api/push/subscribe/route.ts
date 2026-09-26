import { NextResponse } from 'next/server'
import type { PushSubscription } from 'web-push'
import { pushSubs } from '../store'

/** terima PushSubscription dari client & simpan (demo: in-memory) */
export async function POST(req: Request) {
  const sub = (await req.json()) as PushSubscription
  if (!sub?.endpoint) {
    return NextResponse.json({ error: 'endpoint kosong' }, { status: 400 })
  }
  pushSubs.set(sub.endpoint, sub)
  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(req: Request) {
  const { endpoint } = (await req.json()) as { endpoint?: string }
  if (endpoint) pushSubs.delete(endpoint)
  return NextResponse.json({ ok: true })
}
