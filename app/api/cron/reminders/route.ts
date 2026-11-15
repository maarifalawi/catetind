import { NextRequest, NextResponse } from 'next/server'
import { cronSecretFromEnv, isAuthorizedCron } from '@/lib/push/auth'
import { runReminderCron } from '@/lib/push/cron'
import { resolveCronMode } from '@/lib/push/plan'

/* ── GET/POST /api/cron/reminders — PENGINGAT OTOMATIS TERJADWAL ─────────────
   Dipanggil Vercel Cron (`vercel.json`) pada 01:00 UTC (08:00 WIB) setiap hari
   dan 13:00 UTC (20:00 WIB) setiap Minggu. Bisa juga dipanggil manual:

     curl -X POST https://catetind.com/api/cron/reminders?mode=morning \
          -H "Authorization: Bearer $CRON_SECRET"

   Aturan yang dipegang di sini:

     1. OTORISASI DULUAN. Tanpa `CRON_SECRET` yang sah → 401, sebelum satu baris
        database disentuh. Kalau env-nya kosong, jalur ini MATI (fail-closed),
        bukan terbuka — repo ini publik.
     2. `?mode=morning|weekly` memilih jadwal secara eksplisit. Tanpa parameter,
        mode ditentukan jam WIB saat ini (`resolveCronMode`), jadi jadwal Vercel
        yang terkirim tanpa query pun tetap masuk ke pesan yang benar.
     3. `?dryRun=1` = mode simulasi: menghitung target tanpa menembakkan push dan
        tanpa menulis stempel harian — dipakai untuk memeriksa jadwal di produksi.
     4. Status balasan jujur: 200 saat eksekusi berjalan, 503 saat backend/VAPID
        belum siap (bukan 200 dengan angka nol), 500 saat ada galat tak terduga.

   `maxDuration` 60 detik: pengiriman dibagi menjadi kelompok paralel 10
   (`lib/push/deliver.ts`) supaya tidak menyentuh batas waktu fungsi serverless.
   ────────────────────────────────────────────────────────────────────────── */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const TRUTHY = new Set(['1', 'true', 'yes', 'on'])

async function handle(req: NextRequest): Promise<NextResponse> {
  const secret = cronSecretFromEnv()
  if (!isAuthorizedCron(req.headers, secret)) {
    return NextResponse.json(
      {
        ok: false,
        error: secret
          ? 'Token cron tidak sah.'
          : 'CRON_SECRET belum di-set di server — jalur cron dimatikan.',
      },
      { status: 401 },
    )
  }

  const params = req.nextUrl.searchParams
  const mode = resolveCronMode(params.get('mode'))
  const dryRun = TRUTHY.has((params.get('dryRun') ?? '').toLowerCase())

  try {
    const report = await runReminderCron({ mode, dryRun, actor: 'cron' })
    return NextResponse.json(report, { status: report.ok ? 200 : 503 })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? `Cron gagal dijalankan: ${error.message}` : 'Cron gagal dijalankan.',
      },
      { status: 500 },
    )
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handle(req)
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handle(req)
}
