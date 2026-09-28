import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { requireUser } from '@/lib/session'
import { allSubscriptions, consumeRateSlot, dropEndpoint, subscriptionsOf } from '../store'

/* ── KIRIM PUSH (paket 39) ───────────────────────────────────────────────────
   Sebelumnya handler ini menerima `title`/`body`/`url` dari siapa pun dan
   mengirimnya ke SEMUA subscription yang tersimpan — satu request anonim cukup
   untuk mengirim notifikasi apa pun ke seluruh pengguna (vektor phishing
   massal). Sekarang:

     1. WAJIB ada sesi (`requireUser`) → 401 tanpa cookie.
     2. Target = subscription MILIK PEMANGGIL saja. Body request TIDAK boleh
        memilih penerima (`toUserId`/`endpoint`/`endpoints` → 403 eksplisit),
        supaya "kirim ke orang lain" bukan sekadar diabaikan, tapi ditolak.
     3. Broadcast lintas-user hanya lewat `INTERNAL_PUSH_TOKEN` di header
        (`x-internal-push-token`) — jalur server-to-server untuk scheduler
        pengingat 12:30/19:00 WIB. Karena itu token ini WAJIB di-set di
        produksi; kalau kosong, jalur internal mati (fail-closed), bukan terbuka.
     4. Rate limit per user (5/menit, lihat `store.ts`) → 429 + `Retry-After`.
     5. `url` hanya boleh path internal (`/…`) supaya notifikasi tidak bisa
        dipakai mengarahkan user ke situs lain.

   🔑 VAPID: private key HANYA dibaca dari `process.env.VAPID_PRIVATE_KEY`
   (tanpa awalan `NEXT_PUBLIC_`, jadi tidak pernah ikut ke bundle browser).
   Pasangan kunci di `.env.local` repo ini adalah kunci DEMO — WAJIB dirotasi
   sebelum produksi dan disimpan di secret manager, karena kunci yang pernah
   ada di repo harus dianggap bocor.
   ────────────────────────────────────────────────────────────────────────── */

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? ''
const SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:admin@catetind.example'
const INTERNAL_PUSH_TOKEN = process.env.INTERNAL_PUSH_TOKEN ?? ''

/** batas panjang teks notifikasi — notifikasi adalah permukaan brand, bukan kanal bebas */
const MAX_TITLE_LENGTH = 80
const MAX_BODY_LENGTH = 240

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

/** hanya izinkan path internal — cegah notifikasi dipakai mengarahkan ke domain lain */
function safeUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '/'
  /* `//evil.example` juga bukan path internal, jadi diperiksa eksplisit */
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
}

export async function POST(req: NextRequest) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response

  const body = (await req.json().catch(() => ({}))) as {
    title?: string
    body?: string
    url?: string
    toUserId?: string
    endpoint?: string
    endpoints?: string[]
  }

  /* Permintaan yang MENGARAHKAN ke penerima lain ditolak terang-terangan.
     Kalau cuma diabaikan, pemanggil akan mengira notifikasinya terkirim. */
  if (body.toUserId || body.endpoint || body.endpoints) {
    return NextResponse.json(
      { error: 'Endpoint ini cuma bisa mengirim ke perangkat pemanggilnya sendiri.' },
      { status: 403 },
    )
  }

  const isInternal =
    INTERNAL_PUSH_TOKEN.length > 0 &&
    req.headers.get('x-internal-push-token') === INTERNAL_PUSH_TOKEN

  /* jendela rate limit berlaku untuk jalur user; jalur internal adalah server
     kami sendiri (scheduler) yang justru harus bisa mengirim ke banyak user */
  if (!isInternal) {
    const verdict = consumeRateSlot(auth.user.id)
    if (!verdict.allowed) {
      return NextResponse.json(
        { error: `Terlalu sering mengirim notifikasi. Coba lagi dalam ${verdict.retryAfterSeconds} detik.` },
        { status: 429, headers: { 'Retry-After': String(verdict.retryAfterSeconds) } },
      )
    }
  }

  try {
    ensureVapid()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  const payload = JSON.stringify({
    title: (body.title ?? 'CatetInd 🌿').slice(0, MAX_TITLE_LENGTH),
    body: (body.body ?? 'Tes push berhasil!').slice(0, MAX_BODY_LENGTH),
    url: safeUrl(body.url),
    tag: 'catetind-test',
  })

  const targets = isInternal
    ? await allSubscriptions(INTERNAL_PUSH_TOKEN, auth.token)
    : await subscriptionsOf(auth.user.id, auth.token)

  let sent = 0
  let dropped = 0
  for (const { subscription } of targets) {
    try {
      await webpush.sendNotification(subscription, payload, { TTL: 60 })
      sent++
    } catch (err) {
      /* 404/410 = endpoint mati → hapus dari store (perilaku lama, dipertahankan) */
      const status = (err as { statusCode?: number })?.statusCode
      if (status === 404 || status === 410) {
        await dropEndpoint(subscription.endpoint, auth.user.id, auth.token)
        dropped++
      }
    }
  }

  return NextResponse.json({ ok: true, sent, dropped, scope: isInternal ? 'semua' : 'pemanggil' })
}

