import { NextResponse, type NextRequest } from 'next/server'
import {
  CAPABILITY_LABEL,
  capabilityUnlockLabel,
  canUse,
  type Capability,
  type PlanId,
} from '@/lib/data/pricing'
import { readSupabaseSession } from '@/lib/supabase/session-cookie'
import { restConfigured } from '@/lib/supabase/rest'
import { readCallerPlan } from './plan'

/* ── GUARD KEMAMPUAN (SERVER) — kunci fitur yang BENAR-BENAR terkunci ────────
   Permintaan produk: "kalau ada orang yang subs paket bawah, fitur-fitur paket atas itu
   di-lock". Menyembunyikan tombol saja bukan kunci — endpoint harus menolak.
   Karena itu route `/api/ai/*` memanggil `requireCapability()` sebelum
   menyentuh provider: paket yang tidak punya kemampuan itu dijawab 403.

   BENTUK KEPUTUSANNYA (dan kenapa):

     · Backend Supabase BELUM terkonfigurasi (build demo / test) → DILEWATKAN.
       Bukan kelonggaran: tanpa database, "paket user" memang tidak bisa
       diketahui, dan menolak semua orang berarti demo tidak bisa dijelajahi.
       Yang dipakai di sini hanya fakta yang benar-benar bisa dibaca.
     · Tidak ada sesi & backend terkonfigurasi → 401. Fitur berbayar tidak
       dilayani untuk pemanggil anonim di produksi.
     · Ada sesi, tapi baca database GAGAL → 503. Fail-CLOSED dan jujur
       ("belum bisa diperiksa") — bukan 200 yang berpura-pura aman.
     · Paket terbaca & tidak punya kemampuan → 403 + nama paket pembukanya,
       supaya UI bisa menyebut jalan keluarnya tanpa menebak. */

export type CapabilityGuard =
  | { ok: true; planId: PlanId | null }
  | { ok: false; response: NextResponse }

/** pesan tolak yang menyebut sebab + jalan keluar (dipakai UI apa adanya) */
export function capabilityLockedMessage(capability: Capability): string {
  return `Fitur ${CAPABILITY_LABEL[capability]} aktif di ${capabilityUnlockLabel(capability)}. Buka dengan upgrade.`
}

export async function requireCapability(
  req: NextRequest,
  capability: Capability,
): Promise<CapabilityGuard> {
  /* tanpa backend, paket tidak bisa dibaca sama sekali → jangan menghalangi */
  if (!restConfigured()) return { ok: true, planId: null }

  const session = readSupabaseSession(req.headers.get('cookie'))
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, reason: 'not-authenticated', error: 'Masuk dulu ya biar fitur ini bisa dipakai.' },
        { status: 401 },
      ),
    }
  }

  const caller = await readCallerPlan(session.accessToken)
  if (!caller.configured) return { ok: true, planId: null }

  if (caller.failed) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          reason: 'plan-unreadable',
          error: 'Paketmu belum bisa diperiksa sekarang. Coba lagi sebentar ya.',
        },
        { status: 503 },
      ),
    }
  }

  const planId = caller.active ? caller.planId : null
  if (!canUse(planId, capability)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          reason: 'plan-locked',
          capability,
          unlockedBy: capabilityUnlockLabel(capability),
          error: capabilityLockedMessage(capability),
        },
        { status: 403 },
      ),
    }
  }

  return { ok: true, planId }
}
