import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { pushSubs } from '../store'

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? ''
const SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:admin@catetind.example'

let vapidReady = false
function ensureVapid() {
  if (!vapidReady) {
    if (!PUBLIC_KEY || !PRIVATE_KEY) {
      throw new Error('VAPID keys belum di-set di .env.local')
    }
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY)
    vapidReady = true
  }
}

/** kirim push ke SEMUA subscription tersimpan — dipakai tombol test demo */
export async function POST(req: Request) {
  try {
    ensureVapid()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    title?: string
    body?: string
    url?: string
  }
  const payload = JSON.stringify({
    title: body.title ?? 'CatetInd 🌿',
    body: body.body ?? 'Tes push berhasil!',
    url: body.url ?? '/',
    tag: 'catetind-test',
  })

  let sent = 0
  let dropped = 0
  for (const sub of [...pushSubs.values()]) {
    try {
      await webpush.sendNotification(sub, payload, { TTL: 60 })
      sent++
    } catch (err) {
      /* 404/410 = endpoint mati → hapus dari store */
      const status = (err as { statusCode?: number })?.statusCode
      if (status === 404 || status === 410) {
        pushSubs.delete(sub.endpoint)
        dropped++
      }
    }
  }

  return NextResponse.json({ ok: true, sent, dropped })
}
