'use client'

/* ── PANGGILAN API DASHBOARD ADMIN DARI BROWSER ──────────────────────────────
   Dua panggilan saja: aksi manual (paket / masa aktif / kuota AI / perbaikan)
   dan cek ulang satu order ke Midtrans. Semuanya ke route `/api/admin/**` yang
   MEMVERIFIKASI sesi + email admin di server; komponen ini tidak pernah
   mengirim identitas maupun kunci apa pun.
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
