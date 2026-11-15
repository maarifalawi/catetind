import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/guard'
import { readLastCronRun, runReminderCron } from '@/lib/push/cron'

/* ── KONTROL MANUAL PENGINGAT PUSH DARI DASHBOARD ADMIN ──────────────────────
   Dua kebutuhan pemilik produk yang tidak bisa dipenuhi jadwal Vercel:

     · "Jalankan sekarang" → memicu siklus pengingat saat itu juga, jadi pesan
       bisa dipastikan sampai ke HP penguji tanpa menunggu 08:00 WIB;
     · "Mode simulasi"     → menghitung siapa & pesan apa TANPA menembakkan push
       (tidak ada notifikasi nyasar ke user saat pengujian).

   Penjagaan: `requireAdminApi()` — sesi diverifikasi ke Supabase Auth DAN email
   pemanggil harus ada di daftar admin (`lib/admin/access.ts`). Route ini TIDAK
   menerima `CRON_SECRET`: jalur rahasia itu khusus mesin (Vercel), sedangkan
   manusia lewat sesi admin. Dengan begitu membocorkan satu jalur tidak otomatis
   membuka jalur lainnya.

   GET dipakai kartu admin untuk "Ringkasan Hasil Terakhir" (baris terakhir
   `push_cron_runs`), termasuk saat terakhir dijalankan dan hasilnya.
   ────────────────────────────────────────────────────────────────────────── */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(): Promise<NextResponse> {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  const result = await readLastCronRun()
  return NextResponse.json(result, { status: 200 })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  const body = (await req.json().catch(() => ({}))) as { dryRun?: unknown; mode?: unknown }
  const mode = body.mode === 'morning' || body.mode === 'weekly' ? body.mode : 'auto'

  try {
    const report = await runReminderCron({
      mode,
      dryRun: body.dryRun === true,
      actor: 'admin',
    })
    return NextResponse.json(report, { status: report.ok ? 200 : 503 })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? `Pengingat gagal dijalankan: ${error.message}`
            : 'Pengingat gagal dijalankan.',
      },
      { status: 500 },
    )
  }
}
