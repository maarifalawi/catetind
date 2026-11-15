import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/guard'
import { csvFileName, paymentsCsv, usersCsv } from '@/lib/admin/csv'
import { loadAdminSnapshot } from '@/lib/admin/server'

/* ── GET /api/admin/export?type=users|payments|unsubscribed — LAPORAN CSV ────
   Tiga laporan: Direktori User (identitas + hitungan + paket), Riwayat
   Pembayaran (order, status, metode, nominal), dan **Belum Berlangganan**
   (akun terdaftar yang belum punya paket aktif) — yang terakhir ini dipakai
   untuk follow-up: kolom emailnya bisa langsung diimpor ke alat email/marketing.
   Isi catatan pribadi user TIDAK pernah ikut — sama seperti layarnya.

   Unduhan dipaksa (`Content-Disposition: attachment`) dan respons tidak
   di-cache. Admin diverifikasi sebelum data dibaca.
   ────────────────────────────────────────────────────────────────────────── */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ExportType = 'users' | 'payments' | 'unsubscribed'

function readType(value: string | null): ExportType {
  if (value === 'payments') return 'payments'
  if (value === 'unsubscribed') return 'unsubscribed'
  return 'users'
}

const FILE_LABEL = {
  users: 'user',
  payments: 'pembayaran',
  unsubscribed: 'belum-berlangganan',
} as const satisfies Record<ExportType, 'user' | 'pembayaran' | 'belum-berlangganan'>

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  const type = readType(new URL(req.url).searchParams.get('type'))
  const loaded = await loadAdminSnapshot()
  if (!loaded.ok) {
    return NextResponse.json({ ok: false, error: loaded.error }, { status: 503 })
  }

  const body =
    type === 'payments'
      ? paymentsCsv(loaded.snapshot.payments.rows)
      : type === 'unsubscribed'
        ? usersCsv(loaded.snapshot.users.filter((user) => !user.plan.active))
        : usersCsv(loaded.snapshot.users)

  /* BOM supaya Excel membaca huruf beraksen dengan benar; baris tetap CSV murni. */
  const csv = `\uFEFF${body}`
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${csvFileName(FILE_LABEL[type])}"`,
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
