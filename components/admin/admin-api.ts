'use client'

import type { CronReport, CronRunRow } from '@/lib/push/types'

/* ── PANGGILAN API DASHBOARD ADMIN DARI BROWSER ──────────────────────────────
   Tiga panggilan: aksi manual (paket / masa aktif / kuota AI / perbaikan), cek
   ulang satu order ke Midtrans, dan kontrol pengingat push (cron). Semuanya ke
   route `/api/admin/**` yang MEMVERIFIKASI sesi + email admin di server;
   komponen ini tidak pernah mengirim identitas maupun kunci apa pun.
   ────────────────────────────────────────────────────────────────────────── */

export interface AdminApiResult {
  ok: boolean
  message: string
}

async function readMessage(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as
    | { message?: string; error?: string }
    | null
  return data?.message ?? data?.error ?? `Permintaan ditolak server (${res.status}).`
}


export async function postAdminAction(payload: Record<string, unknown>): Promise<AdminApiResult> {
  try {
    const res = await fetch('/api/admin/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const message = await readMessage(res)
    return { ok: res.ok, message }
  } catch {
    return { ok: false, message: 'Jaringan tidak bisa dihubungi. Coba lagi.' }
  }
}

export async function postAdminSync(orderId: string): Promise<AdminApiResult> {
  try {
    const res = await fetch('/api/admin/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId }),
    })
    const message = await readMessage(res)
    return { ok: res.ok, message }
  } catch {
    return { ok: false, message: 'Jaringan tidak bisa dihubungi. Coba lagi.' }
  }
}

/* ── KONTROL PENGINGAT PUSH (CRON) ─────────────────────────────────────────
   `POST /api/admin/push-cron` menjalankan satu siklus pengingat sekarang juga
   (atau mode simulasi), `GET` mengembalikan eksekusi terakhir. Semua angka yang
   ditampilkan kartu berasal dari sini — tidak ada yang dihitung ulang di
   browser, supaya layar dan riwayat database tidak bisa berbeda. */

export interface PushCronTriggerResult {
  ok: boolean
  message: string
  report: CronReport | null
}

export async function triggerPushCron(dryRun: boolean): Promise<PushCronTriggerResult> {
  try {
    const res = await fetch('/api/admin/push-cron', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dryRun }),
    })
    const data = (await res.json().catch(() => null)) as
      | (Partial<CronReport> & { error?: string; message?: string })
      | null
    if (!data) {
      return { ok: false, message: `Permintaan ditolak server (${res.status}).`, report: null }
    }
    const message =
      data.error ??
      data.message ??
      (res.ok ? 'Pengingat selesai dijalankan.' : `Permintaan ditolak server (${res.status}).`)
    return {
      ok: res.ok && data.ok !== false,
      message,
      report: res.ok ? (data as CronReport) : null,
    }
  } catch {
    return { ok: false, message: 'Jaringan tidak bisa dihubungi. Coba lagi.', report: null }
  }
}

export interface PushCronLastResult {
  ok: boolean
  message: string
  last: CronRunRow | null
}

export async function fetchLastPushCronRun(): Promise<PushCronLastResult> {
  try {
    const res = await fetch('/api/admin/push-cron', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; last?: CronRunRow | null; error?: string }
      | null
    if (!res.ok || !data) {
      return {
        ok: false,
        message: data?.error ?? `Riwayat pengingat tidak bisa dibaca (${res.status}).`,
        last: null,
      }
    }
    return {
      ok: data.ok !== false,
      message: data.error ?? 'Riwayat pengingat terakhir dimuat.',
      last: data.last ?? null,
    }
  } catch {
    return { ok: false, message: 'Jaringan tidak bisa dihubungi.', last: null }
  }
}

