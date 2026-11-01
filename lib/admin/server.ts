import type { SupabaseClient } from '@supabase/supabase-js'
import { adminSupabase } from '@/lib/supabase/admin'
import { monthKeyOf } from '@/lib/ai-quota'
import { isOnboardingComplete } from '@/lib/subscription/onboarding'
import { ADMIN_COLUMNS } from './columns'
import {
  buildAdminSnapshot,
  buildAdminUserRows,
  toCountMap,
  type AdminAuthUser,
  type AdminPlanRecord,
} from './snapshot'
import type { AdminPurchaseRecord, AdminSnapshot } from './types'

/* ── PENGAMBILAN DATA DASHBOARD ADMIN (SERVER SAJA) ──────────────────────────
   Satu-satunya tempat yang membaca data LINTAS USER. Ia memakai klien kunci
   peran server (`lib/supabase/admin.ts`), jadi:

     · file ini HANYA boleh diimpor route handler & Server Component,
     · pemanggilnya WAJIB sudah lolos `lib/admin/guard.ts` lebih dulu,
     · kolom yang dibaca dibatasi `lib/admin/columns.ts` (tanpa isi catatan).

   Semua agregasi tetap dikerjakan fungsi murni di `snapshot.ts`; file ini
   hanya menjawab "baris apa yang ada di database".

   BATAS YANG DISEBUT APA ADANYA: pembacaan dibatasi `MAX_ROWS` baris per tabel.
   Kalau jumlahnya menyentuh batas, layar menyebutkan bahwa angka bisa
   terpotong — bukan menampilkan total palsu yang terlihat lengkap.
   ────────────────────────────────────────────────────────────────────────── */

const PAGE_SIZE = 1000
const MAX_ROWS = 20_000
const MAX_USER_PAGES = 20

interface IdRow {
  user_id?: string | null
}

interface LedgerRow extends IdRow {
  ai_generated?: boolean | null
}

interface AiUsageRow extends IdRow {
  month_key?: string | null
  calls_used?: number | null
}

interface AiAddonRow extends IdRow {
  tokens?: number | null
}

interface ReferralRow {
  referrer_user_id?: string | null
}

interface SettingsRow extends IdRow {
  onboarding?: unknown
}

interface ProfileRow extends IdRow {
  nickname?: string | null
}

interface SubscriptionRow extends IdRow {
  tier_name?: string | null
  billing_period?: string | null
  is_lifetime?: boolean | null
  is_active?: boolean | null
  started_at?: string | null
  expires_at?: string | null
}

interface PurchaseRow {
  order_id?: string | null
  user_id?: string | null
  status?: string | null
  price_paid?: number | string | null
  payment_method?: string | null
  purpose?: string | null
  tier_name?: string | null
  billing_period?: string | null
  created_at?: string | null
  paid_at?: string | null
  /** nominal yang SEHARUSNYA ditagih — dipakai untuk transaksi yang belum lunas */
  expected_amount?: number | string | null
}

interface QueryResult<T> {
  rows: T[]
  truncated: boolean
}

/** baca satu tabel per halaman sampai habis (dibatasi `MAX_ROWS`) */
async function selectAll<T>(
  client: SupabaseClient,
  table: string,
  columns: string,
): Promise<QueryResult<T>> {
  const rows: T[] = []
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    const batch = (data ?? []) as T[]
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) return { rows, truncated: false }
  }
  return { rows, truncated: true }
}

function mapAuthUser(user: {
  id: string
  email?: string | null
  created_at?: string | null
  last_sign_in_at?: string | null
  user_metadata?: Record<string, unknown> | null
}): AdminAuthUser {
  const nickname = user.user_metadata?.nickname
  return {
    id: user.id,
    email: user.email ?? '',
    name: typeof nickname === 'string' ? nickname.trim() : '',
    createdAt: user.created_at ?? null,
    lastActiveAt: user.last_sign_in_at ?? user.created_at ?? null,
  }
}

/** identitas semua akun lewat Admin API (satu-satunya sumber email) */
async function listAuthUsers(client: SupabaseClient): Promise<QueryResult<AdminAuthUser>> {
  const users: AdminAuthUser[] = []
  for (let page = 1; page <= MAX_USER_PAGES; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: PAGE_SIZE })
    if (error) throw new Error(`auth.users: ${error.message}`)
    const batch = data?.users ?? []
    for (const user of batch) users.push(mapAuthUser(user))
    if (batch.length < PAGE_SIZE) return { rows: users, truncated: false }
  }
  return { rows: users, truncated: true }
}

export type AdminLoadResult =
  | { ok: true; snapshot: AdminSnapshot }
  | { ok: false; error: string }

/** rakit snapshot lengkap; tidak pernah melempar (route/page menampilkan pesan) */
export async function loadAdminSnapshot(now = new Date()): Promise<AdminLoadResult> {
  const client = adminSupabase()
  if (!client) {
    return {
      ok: false,
      error:
        'Kunci peran server (SUPABASE_SERVICE_ROLE_KEY) belum diisi di server ini, jadi dashboard admin tidak bisa membaca data.',
    }
  }

  try {
    const [
      auth,
      profiles,
      wallets,
      ledger,
      bills,
      goals,
      joint,
      debts,
      investments,
      assets,
      aiUsage,
      aiAddons,
      referrals,
      settings,
      subscriptions,
      purchases,
    ] = await Promise.all([
      listAuthUsers(client),
      selectAll<ProfileRow>(client, 'profiles', ADMIN_COLUMNS.profiles),
      selectAll<IdRow>(client, 'wallets', ADMIN_COLUMNS.wallets),
      selectAll<LedgerRow>(client, 'ledger_rows', ADMIN_COLUMNS.ledgerRows),
      selectAll<IdRow>(client, 'bills', ADMIN_COLUMNS.bills),
      selectAll<IdRow>(client, 'goals', ADMIN_COLUMNS.goals),
      selectAll<IdRow>(client, 'joint_members', ADMIN_COLUMNS.jointMembers),
      selectAll<IdRow>(client, 'debts', ADMIN_COLUMNS.debts),
      selectAll<IdRow>(client, 'investments', ADMIN_COLUMNS.investments),
      selectAll<IdRow>(client, 'physical_assets', ADMIN_COLUMNS.physicalAssets),
      selectAll<AiUsageRow>(client, 'ai_usage', ADMIN_COLUMNS.aiUsage),
      selectAll<AiAddonRow>(client, 'ai_addons', ADMIN_COLUMNS.aiAddons),
      selectAll<ReferralRow>(client, 'referrals', ADMIN_COLUMNS.referrals),
      selectAll<SettingsRow>(client, 'user_settings', ADMIN_COLUMNS.userSettings),
      selectAll<SubscriptionRow>(client, 'user_subscriptions', ADMIN_COLUMNS.subscriptions),
      selectAll<PurchaseRow>(client, 'purchases', ADMIN_COLUMNS.purchases),
    ])

    /* nama terbaru dari `profiles` menimpa metadata (sama seperti /api/session) */
    const profileNames = new Map<string, string>()
    for (const row of profiles.rows) {
      const name = (row.nickname ?? '').trim()
      if (row.user_id && name) profileNames.set(row.user_id, name)
    }
    const authUsers = auth.rows.map((user) => ({
      ...user,
      name: profileNames.get(user.id) ?? user.name,
    }))

    const walletCounts = toCountMap(wallets.rows.map((row) => row.user_id))
    const transactionCounts = toCountMap(ledger.rows.map((row) => row.user_id))
    const aiCaptureUserIds = ledger.rows
      .filter((row) => row.ai_generated === true)
      .map((row) => row.user_id)

    const monthKey = monthKeyOf(now)
    const aiCallsThisMonth = new Map<string, number>()
    for (const row of aiUsage.rows) {
      if (!row.user_id || row.month_key !== monthKey) continue
      const calls = Math.max(0, Math.round(Number(row.calls_used) || 0))
      aiCallsThisMonth.set(row.user_id, (aiCallsThisMonth.get(row.user_id) ?? 0) + calls)
    }

    const aiBonusTokens = new Map<string, number>()
    for (const row of aiAddons.rows) {
      if (!row.user_id) continue
      const tokens = Math.max(0, Math.round(Number(row.tokens) || 0))
      aiBonusTokens.set(row.user_id, (aiBonusTokens.get(row.user_id) ?? 0) + tokens)
    }

    /* Onboarding: penanda tersimpan ATAU akun warisan yang sudah punya dompet /
       catatan (aturan yang sama dengan `onboardingDecision()` — akun lama tidak
       boleh dihitung "belum onboarding" hanya karena penandanya belum ada). */
    const onboardingUserIds = new Set<string>()
    for (const row of settings.rows) {
      if (row.user_id && isOnboardingComplete(row.onboarding)) onboardingUserIds.add(row.user_id)
    }
    for (const [userId, count] of walletCounts) if (count > 0) onboardingUserIds.add(userId)
    for (const [userId, count] of transactionCounts) if (count > 0) onboardingUserIds.add(userId)

    const wealthUserIds = [
      ...debts.rows.map((row) => row.user_id),
      ...investments.rows.map((row) => row.user_id),
      ...assets.rows.map((row) => row.user_id),
    ]

    const plans = new Map<string, AdminPlanRecord>()
    for (const row of subscriptions.rows) {
      if (!row.user_id) continue
      plans.set(row.user_id, {
        tier: row.tier_name ?? null,
        period: row.billing_period ?? null,
        isLifetime: row.is_lifetime === true,
        isActive: row.is_active === true,
        startedAt: row.started_at ?? null,
        expiresAt: row.expires_at ?? null,
      })
    }

    const purchaseRecords: AdminPurchaseRecord[] = purchases.rows
      .filter((row) => Boolean(row.order_id && row.user_id))
      .map((row) => {
        /* Transaksi yang belum lunas punya `price_paid = 0`; yang ditampilkan
           adalah nominal yang SEHARUSNYA dibayar (`expected_amount`) supaya
           radar checkout menggantung & ringkasan tidak menyebut "Rp0". */
        const paid = Math.max(0, Math.round(Number(row.price_paid) || 0))
        const expected = Math.max(0, Math.round(Number(row.expected_amount) || 0))
        return {
          orderId: String(row.order_id),
          userId: String(row.user_id),
          status: row.status ?? 'pending',
          amount: paid > 0 ? paid : expected,
          paymentMethod: row.payment_method ?? null,
          purpose: row.purpose ?? null,
          tierName: row.tier_name ?? null,
          billingPeriod: row.billing_period ?? null,
          createdAt: row.created_at ?? null,
          paidAt: row.paid_at ?? null,
        }
      })

    const users = buildAdminUserRows(
      authUsers,
      {
        onboardingUserIds,
        walletCounts,
        transactionCounts,
        aiCaptureUserIds,
        aiCallsThisMonth,
        aiBonusTokens,
        billUserIds: bills.rows.map((row) => row.user_id),
        goalUserIds: goals.rows.map((row) => row.user_id),
        jointUserIds: joint.rows.map((row) => row.user_id),
        wealthUserIds,
        referralCounts: toCountMap(referrals.rows.map((row) => row.referrer_user_id)),
        plans,
      },
      now.getTime(),
    )

    /* `truncated` = salah satu tabel menyentuh batas baca → layar menyebut
       bahwa angkanya bisa terpotong, bukan menyembunyikannya. */
    const truncated =
      auth.truncated ||
      purchases.truncated ||
      wallets.truncated ||
      ledger.truncated ||
      subscriptions.truncated

    return {
      ok: true,
      snapshot: buildAdminSnapshot({
        users,
        purchases: purchaseRecords,
        now,
        usersTruncated: truncated,
      }),
    }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? `Data admin gagal dibaca: ${error.message}`
          : 'Data admin gagal dibaca.',
    }
  }
}


