import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { readCallerPlan, subscriptionPayload } from '@/lib/subscription/plan'
import { reconcileCallerPurchases } from '@/lib/subscription/reconcile'

/* ── POST|GET /api/payment/reconcile (paket 99) — “CEK LAGI” YANG BEKERJA ────
   Halaman `/checkout/selesai` dulu menekan tombol “Cek lagi” yang hanya membaca
   ulang `user_subscriptions`. Kalau webhook Midtrans belum masuk (localhost,
   atau notifikasi gagal terkirim), hasilnya SELALU “belum tercatat” — tombolnya
   terasa mati karena memang tidak ada yang berubah.

   Route ini menutup celah itu: ia mencocokkan order `pending` milik PEMANGGIL
   ke Midtrans, lalu memenuhi order yang sudah lunas lewat RPC yang sama dengan
   webhook. Identitas datang dari sesi; `order_id` hanya MEMPERSEMPIT order yang
   diperiksa, bukan bukti kepemilikan (RLS yang menyaring).

   Balasan = bentuk `/api/subscription` + ringkasan `reconcile`, supaya UI cukup
   satu request untuk tahu “sudah aktif atau belum”. GET disediakan untuk
   pemeriksaan manual/curl; POST yang dipakai halaman. */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** batas wajar id order Midtrans; lebih dari ini pasti bukan order kita */
const MAX_ORDER_ID_LENGTH = 128

function readOrderId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > MAX_ORDER_ID_LENGTH) return null
  return trimmed
}

async function handle(req: NextRequest, rawOrderId: unknown) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response

  const orderId = readOrderId(rawOrderId)

  const reconcile = await reconcileCallerPurchases(auth.token, { orderId })

  /* Dibaca SETELAH pemenuhan supaya jawabannya mencerminkan hasil rekonsiliasi
     pada request ini juga — bukan snapshot sebelum uang dicocokkan. */
  const caller = await readCallerPlan(auth.token)
  if (caller.failed) {
    return NextResponse.json(
      { ok: false, error: 'Paket tidak bisa dibaca setelah pencocokan.', reconcile },
      { status: 502 },
    )
  }

  return NextResponse.json({ ...subscriptionPayload(caller), reconcile })
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { order_id?: unknown } | null
  return handle(req, body?.order_id)
}

export async function GET(req: NextRequest) {
  return handle(req, new URL(req.url).searchParams.get('order_id'))
}
