import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/guard'
import { parseAdminAction } from '@/lib/admin/actions'
import { applyAdminAction } from '@/lib/admin/server-actions'

/* ── POST /api/admin/action — FOUNDER TOOLS (PAKET, MASA AKTIF, KUOTA AI) ────
   Satu pintu untuk seluruh aksi manual pemilik:

     set-plan      → beri/ubah paket (30 hari atau selamanya)
     extend-plan   → tambah masa aktif (mis. 7 / 30 hari)
     ai-bonus      → tambah bonus token AI
     ai-reset      → nolkan pemakaian AI bulan berjalan
     repair-plan   → sinkronkan hak akses dari pembayaran lunas (tombol perbaikan)

   Penjagaan: sesi diverifikasi server + email harus ada di daftar admin. Badan
   request divalidasi `parseAdminAction()` sebelum menyentuh database, dan semua
   penulisan memakai kunci peran server yang tidak pernah dikirim ke browser.
   ────────────────────────────────────────────────────────────────────────── */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  const body = await req.json().catch(() => null)
  const parsed = parseAdminAction(body)
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, message: parsed.error }, { status: 422 })
  }

  try {
    const result = await applyAdminAction(parsed.action)
    return NextResponse.json(result, { status: result.ok ? 200 : 409 })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? `Aksi admin gagal: ${error.message}`
            : 'Aksi admin gagal dijalankan.',
      },
      { status: 500 },
    )
  }
}
