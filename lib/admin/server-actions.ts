import { monthKeyOf } from '@/lib/ai-quota'
import { adminSupabase } from '@/lib/supabase/admin'
import { reconcileOrder, type ReconcileOrderOutcome } from '@/lib/subscription/reconcile'
import {
  aiBonusOrderId,
  extendPlanPatch,
  planOverridePatch,
  repairPatch,
  type SubscriptionPatch,
} from './actions'
import { expectedEntitlement, planStateOf, type AdminPlanRecord } from './snapshot'
import type { AdminAction, AdminActionResult, AdminPurchaseRecord } from './types'

/* ── PENULISAN AKSI MANUAL (SERVER SAJA, SETELAH PENJAGAAN ADMIN) ────────────
   File ini memegang satu-satunya jalur yang boleh mengubah hak akses user tanpa
   pembayaran. Aturannya:

     · HANYA dipanggil dari `app/api/admin/**` yang sudah lolos `requireAdminApi()`;
     · nilai yang ditulis SELALU hasil fungsi murni `actions.ts` (bukan body
       mentah dari browser);
     · setiap perubahan dicatat lewat `changes` pada balasan supaya bisa
       ditelusuri di log;
     · tidak pernah menghapus data user, dan tidak pernah membaca/menulis isi
       catatan pribadi.

   Kunci peran server dipakai karena admin memang perlu menulis baris milik user
   lain (RLS `user_id = auth.uid()` akan menolak tanpa itu). Itulah sebabnya
   penjagaan admin harus terjadi LEBIH DULU.
   ────────────────────────────────────────────────────────────────────────── */

const SUBSCRIPTION_COLUMNS =
  'user_id,tier_name,billing_period,is_lifetime,is_active,started_at,expires_at'

const PURCHASE_COLUMNS =
  'order_id,user_id,status,price_paid,payment_method,purpose,tier_name,billing_period,created_at,paid_at'

function fail(message: string): AdminActionResult {
  return { ok: false, message }
}

async function readPlan(userId: string): Promise<AdminPlanRecord | undefined> {
  const client = adminSupabase()
  if (!client) return undefined
  const { data, error } = await client
    .from('user_subscriptions')
    .select(SUBSCRIPTION_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return undefined
  const row = data as unknown as Record<string, unknown>
  return {
    tier: typeof row.tier_name === 'string' ? row.tier_name : null,
    period: typeof row.billing_period === 'string' ? row.billing_period : null,
    isLifetime: row.is_lifetime === true,
    isActive: row.is_active === true,
    startedAt: typeof row.started_at === 'string' ? row.started_at : null,
    expiresAt: typeof row.expires_at === 'string' ? row.expires_at : null,
  }
}

async function writeSubscription(
  userId: string,
  patch: SubscriptionPatch,
): Promise<string | null> {
  const client = adminSupabase()
  if (!client) return 'Kunci peran server belum dikonfigurasi.'
  const { error } = await client
    .from('user_subscriptions')
    .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' })
  return error ? error.message : null
}

async function readUserPurchases(userId: string): Promise<AdminPurchaseRecord[]> {
  const client = adminSupabase()
  if (!client) return []
  const { data, error } = await client
    .from('purchases')
    .select(PURCHASE_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error || !Array.isArray(data)) return []
  return (data as Record<string, unknown>[]).map((row) => ({
    orderId: String(row.order_id ?? ''),
    userId: String(row.user_id ?? userId),
    status: typeof row.status === 'string' ? row.status : 'pending',
    amount: Math.max(0, Math.round(Number(row.price_paid) || 0)),
    paymentMethod: typeof row.payment_method === 'string' ? row.payment_method : null,
    purpose: typeof row.purpose === 'string' ? row.purpose : null,
    tierName: typeof row.tier_name === 'string' ? row.tier_name : null,
    billingPeriod: typeof row.billing_period === 'string' ? row.billing_period : null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : null,
    paidAt: typeof row.paid_at === 'string' ? row.paid_at : null,
  }))
}

/** jalankan satu aksi manual admin dan kembalikan ringkasan yang benar-benar terjadi */
export async function applyAdminAction(
  action: AdminAction,
  now = new Date(),
): Promise<AdminActionResult> {
  if (!adminSupabase()) return fail('Kunci peran server belum dikonfigurasi.')

  if (action.action === 'set-plan') {
    const patch = planOverridePatch({ planId: action.planId, period: action.period, now })
    const error = await writeSubscription(action.userId, patch)
    if (error) return fail(`Paket gagal ditulis: ${error}`)
    return {
      ok: true,
      message:
        action.period === 'lifetime'
          ? `Paket ${action.planId} akses selamanya diberikan.`
          : `Paket ${action.planId} 30 hari diberikan.`,
      changes: {
        tier_name: patch.tier_name,
        period: patch.billing_period,
        expires_at: patch.expires_at,
      },
    }
  }

  if (action.action === 'extend-plan') {
    const record = await readPlan(action.userId)
    if (!record) return fail('Akun ini belum punya paket. Berikan paket dulu.')
    const outcome = extendPlanPatch({
      plan: planStateOf(record, now.getTime()),
      days: action.days,
      now,
    })
    if (!outcome.ok) return fail(outcome.error)
    const error = await writeSubscription(action.userId, outcome.patch)
    if (error) return fail(`Perpanjangan gagal ditulis: ${error}`)
    return {
      ok: true,
      message: `Masa aktif ditambah ${action.days} hari (berakhir ${outcome.expiresAt.slice(0, 10)}).`,
      changes: { expires_at: outcome.expiresAt },
    }
  }

  if (action.action === 'ai-bonus') {
    const client = adminSupabase()
    if (!client) return fail('Kunci peran server belum dikonfigurasi.')
    const orderId = aiBonusOrderId(now)
    const { error } = await client.from('ai_addons').insert({
      user_id: action.userId,
      order_id: orderId,
      package_id: 'admin-bonus',
      tokens: action.tokens,
    })
    if (error) return fail(`Bonus token gagal ditulis: ${error.message}`)
    return {
      ok: true,
      message: `Bonus ${action.tokens.toLocaleString('id-ID')} token AI ditambahkan.`,
      changes: { order_id: orderId, tokens: action.tokens },
    }
  }

  if (action.action === 'ai-reset') {
    const client = adminSupabase()
    if (!client) return fail('Kunci peran server belum dikonfigurasi.')
    const monthKey = monthKeyOf(now)
    const { data, error } = await client
      .from('ai_usage')
      .update({ calls_used: 0, updated_at: now.toISOString() })
      .eq('user_id', action.userId)
      .eq('month_key', monthKey)
      .select('user_id')
    if (error) return fail(`Reset pemakaian AI gagal: ${error.message}`)
    const rows = Array.isArray(data) ? data.length : 0
    return {
      ok: true,
      message:
        rows > 0
          ? `Pemakaian AI bulan ${monthKey} direset (${rows} baris).`
          : `Belum ada pemakaian AI tercatat di bulan ${monthKey}.`,
      changes: { month_key: monthKey, rows },
    }
  }

  /* repair-plan: tulis ulang hak akses dari pembelian yang sudah lunas */
  const purchases = await readUserPurchases(action.userId)
  const expected = expectedEntitlement(purchases, now.getTime())
  if (!expected) {
    return fail('Tidak ada pembayaran lunas yang masih memberi hak akses untuk akun ini.')
  }
  const record = await readPlan(action.userId)
  const current = record ? planStateOf(record, now.getTime()) : null
  const patch = repairPatch(expected, now, current)
  if (!patch) {
    /* Dua sebab `null`; keduanya TIDAK boleh dilaporkan sebagai kegagalan yang
       sama. Yang satu memang tidak perlu diubah, yang lain hak aksesnya habis. */
    if (current?.isLifetime && current.active && !expected.lifetime) {
      return {
        ok: true,
        message: 'Akses selamanya sudah aktif — tidak ada yang perlu diubah.',
        changes: { skipped: 'lifetime-active' },
      }
    }
    return fail('Hak akses dari pembayaran itu sudah lewat masa berlakunya.')
  }
  const error = await writeSubscription(action.userId, patch)
  if (error) return fail(`Sinkronisasi gagal ditulis: ${error}`)
  return {
    ok: true,
    message: `Hak akses disinkronkan: ${patch.tier_name} (${patch.billing_period}).`,
    changes: {
      tier_name: patch.tier_name,
      period: patch.billing_period,
      expires_at: patch.expires_at,
      source_order: expected.source.orderId,
    },
  }
}

export interface AdminSyncResult {
  ok: boolean
  message: string
  outcome?: ReconcileOrderOutcome
}

/**
 * Tanya ulang status satu order ke Midtrans, lalu penuhi lewat RPC yang SAMA
 * dengan webhook (`catetind_fulfill_purchase`) kalau sudah lunas.
 *
 * Tidak ada jalur aktivasi kedua: yang menulis `user_subscriptions` tetap fungsi
 * pemenuhan milik database. Kalau baris pembelian sudah `settlement` tetapi
 * langganannya belum sesuai, tombol "Perbaiki hak akses" (repair-plan) yang
 * dipakai — karena RPC pemenuhan sengaja idempoten dan tidak menulis ulang.
 */
export async function syncAdminOrder(orderId: string): Promise<AdminSyncResult> {
  const client = adminSupabase()
  if (!client) return { ok: false, message: 'Kunci peran server belum dikonfigurasi.' }

  const { data, error } = await client
    .from('purchases')
    .select('order_id,status,expected_amount')
    .eq('order_id', orderId)
    .maybeSingle()
  if (error || !data) return { ok: false, message: 'Order tidak ditemukan.' }

  const row = data as unknown as Record<string, unknown>
  const expectedRaw = Number(row.expected_amount)

  const outcome = await reconcileOrder({
    orderId,
    expectedAmount: Number.isFinite(expectedRaw) ? expectedRaw : null,
    purchaseStatus: typeof row.status === 'string' ? row.status : null,
  })

  const messages: Record<ReconcileOrderOutcome['reason'], string> = {
    fulfilled: 'Pembayaran lunas — hak akses sudah diaktifkan.',
    'already-settled': 'Order ini sudah tercatat lunas sebelumnya.',
    pending: 'Midtrans belum melaporkan pembayaran. Status masih menunggu.',
    expired: 'Tagihan sudah kedaluwarsa.',
    failed: 'Pembayaran ditolak/gagal di provider.',
    'amount-mismatch':
      'Nominal di Midtrans berbeda dari yang seharusnya ditagih — akses TIDAK diaktifkan.',
    'not-configured': 'Midtrans belum dikonfigurasi di server ini.',
    'service-role-missing': 'Kunci peran server belum dikonfigurasi.',
    'provider-error': 'Status tidak bisa dibaca dari Midtrans sekarang.',
    'rpc-failed': 'Pembayaran lunas, tetapi pemenuhan akses gagal ditulis.',
  }

  return {
    ok: outcome.reason === 'fulfilled' || outcome.reason === 'already-settled',
    message: messages[outcome.reason],
    outcome,
  }
}


