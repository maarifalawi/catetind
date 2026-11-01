import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/guard'
import { syncAdminOrder } from '@/lib/admin/server-actions'

/* ── POST /api/admin/sync — CEK & SINKRON ULANG SATU ORDER KE MIDTRANS ───────
   Tombol di setiap baris transaksi pembayaran. Server menanyakan status terbaru
   ke Midtrans (kunci server hanya di server), lalu memenuhi order lewat RPC yang
   sama dengan webhook bila provider menyatakan lunas.

   `order_id` hanya MEMILIH order; tidak ada satu pun identitas yang diambil dari
   body. Admin sudah diverifikasi sebelum baris ini berjalan.
   ────────────────────────────────────────────────────────────────────────── */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_ORDER_ID_LENGTH = 128

export async function POST(req: NextRequest) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  const body = (await req.json().catch(() => null)) as { order_id?: unknown } | null
  const raw = typeof body?.order_id === 'string' ? body.order_id.trim() : ''
  if (!raw || raw.length > MAX_ORDER_ID_LENGTH) {
    return NextResponse.json({ ok: false, message: 'Order tidak valid.' }, { status: 422 })
  }

  try {
    const result = await syncAdminOrder(raw)
    return NextResponse.json(result, { status: result.ok ? 200 : 409 })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? `Sinkronisasi gagal: ${error.message}`
            : 'Sinkronisasi gagal dijalankan.',
      },
      { status: 500 },
    )
  }
}
