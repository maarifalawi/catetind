import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/guard'
import { csvFileName, paymentsCsv, usersCsv } from '@/lib/admin/csv'
import { loadAdminSnapshot } from '@/lib/admin/server'

/* ── GET /api/admin/export?type=users|payments — LAPORAN CSV UNTUK PEMBUKUAN ─
   Dua laporan: Direktori User (identitas + hitungan + paket) dan Riwayat
   Pembayaran (order, status, metode, nominal). Isi catatan pribadi user TIDAK
   pernah ikut — sama seperti layarnya.

   Unduhan dipaksa (`Content-Disposition: attachment`) dan respons tidak
   di-cache. Admin diverifikasi sebelum data dibaca.
   ────────────────────────────────────────────────────────────────────────── */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  const type = new URL(req.url).searchParams.get('type') === 'payments' ? 'payments' : 'users'
  const loaded = await loadAdminSnapshot()
  if (!loaded.ok) {
    return NextResponse.json({ ok: false, error: loaded.error }, { status: 503 })
  }

  const body =
    type === 'payments'
      ? paymentsCsv(loaded.snapshot.payments.rows)
      : usersCsv(loaded.snapshot.users)

  /* BOM supaya Excel membaca huruf beraksen dengan benar; baris tetap CSV murni. */
  const csv = `\uFEFF${body}`
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${csvFileName(type === 'payments' ? 'pembayaran' : 'user')}"`,
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
