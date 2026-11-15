import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { readCallerPurchases } from '@/lib/subscription/purchases'

/* ── GET /api/billing/purchases — RIWAYAT PEMBAYARAN PEMANGGIL ────────────────
   Sumber data: tabel `purchases` milik akun ini. RLS (`user_id = auth.uid()`)
   yang menyaring, jadi route ini TIDAK bisa melihat pembelian akun lain — tidak
   ada parameter `userId` yang bisa dipakai untuk mengintip.

   Bentuk balasan:
     { ok, configured, purchases: [{ orderId, paidAt, createdAt, label, amount,
       status, method }] }

   Tiga keadaan yang dibedakan dengan sengaja:
     · `configured:false` + `ok:false` → backend belum ada; UI bilang "belum bisa
       dibaca", BUKAN "belum pernah bayar";
     · `ok:false` (502) → query gagal; UI menyuruh muat ulang;
     · `ok:true` + `purchases: []` → akun ini memang belum pernah membayar.

   Panel Billing (`components/catetind/billing-panel.tsx`) membaca route ini dan
   tidak lagi menyimpan daftar kwitansi contoh di dalam komponen.
   ────────────────────────────────────────────────────────────────────────── */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response

  const history = await readCallerPurchases(auth.token)
  if (!history.ok) {
    return NextResponse.json(
      {
        ok: false,
        configured: history.configured,
        purchases: [],
        error: history.configured
          ? 'Riwayat pembayaran belum bisa dibaca.'
          : 'Server pembayaran belum terhubung.',
      },
      { status: history.configured ? 502 : 503 },
    )
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    purchases: history.items,
  })
}
