'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CreditCard,
  Crown,
  Download,
  LayoutDashboard,
  RefreshCw,
  Users,
} from 'lucide-react'
import { formatIDR } from '@/lib/data/pricing'
import type { AdminSnapshot } from '@/lib/admin/types'
import { cn } from '@/lib/utils'
import { AdminOverview } from './admin-overview'
import { AdminPaymentsTable } from './admin-payments-table'
import { AdminPlansTab } from './admin-plans-tab'
import { AdminUsersTable } from './admin-users-table'
import {
  ADMIN_PRIMARY_BUTTON,
  ADMIN_SMALL_BUTTON,
  ADMIN_TOOL_BUTTON,
  AdminMeta,
  AdminSection,
  AdminStat,
  formatNumber,
  formatPercent,
  formatRelative,
} from './admin-ui'

/* ── DASHBOARD ADMIN — BINGKAI LAYAR ─────────────────────────────────────────
   Satu halaman, empat tab: Ringkasan · User · Langganan · Pembayaran.

   Bentuk layar ini sengaja TIPIS: top bar 1 baris (judul + kesegaran data +
   empat alat), satu baris 4 angka kunci, lalu tab. Tidak ada paragraf
   pengantar — penjelasan yang dulu memakan 4 baris sekarang hidup sebagai
   tooltip ⓘ di kotak yang membutuhkannya.

   Halaman ini TIDAK memakai `ScreenShell` app: ia bukan halaman pemakaian
   harian user, dan menu sidebar app tidak relevan untuk pemantauan bisnis.
   Yang membatasi akses bukan tampilan ini, melainkan `app/admin/page.tsx` yang
   memverifikasi sesi + email admin di server sebelum snapshot dibaca.
   ────────────────────────────────────────────────────────────────────────── */

type AdminTabId = 'overview' | 'users' | 'plans' | 'payments'

const TABS: { id: AdminTabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'users', label: 'User', icon: Users },
  { id: 'plans', label: 'Langganan', icon: Crown },
  { id: 'payments', label: 'Pembayaran', icon: CreditCard },
]

function ExportLink({ type, label }: { type: 'users' | 'payments'; label: string }) {
  return (
    <a href={`/api/admin/export?type=${type}`} className={ADMIN_SMALL_BUTTON} title={`Unduh ${label}`}>
      <Download className="size-3.5" aria-hidden strokeWidth={1.8} />
      {label}
    </a>
  )
}

export function AdminDashboardScreen({
  email,
  name,
  snapshot,
  error,
}: {
  email: string
  name: string
  snapshot: AdminSnapshot | null
  error: string | null
}) {
  const router = useRouter()
  const [tab, setTab] = useState<AdminTabId>('overview')
  const [refreshing, setRefreshing] = useState(false)

  const nowMs = snapshot ? Date.parse(snapshot.generatedAt) : Date.now()

  function refresh() {
    setRefreshing(true)
    router.refresh()
    /* `router.refresh()` tidak memberi sinyal selesai; status tombol dikembalikan
       singkat supaya tidak terlihat "macet" saat server lambat. */
    window.setTimeout(() => setRefreshing(false), 1200)
  }

  const counts: Record<AdminTabId, number | null> = {
    overview: null,
    users: snapshot?.users.length ?? null,
    plans: snapshot?.revenue.paidUsers ?? null,
    payments: snapshot?.payments.summary.counts.all ?? null,
  }

  return (
    <>
      <header className="border-b border-soil/[0.07]">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[13px] font-semibold tracking-tight text-forest">
              Admin
              <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.12em] text-forest/40">
                <span className="size-1.5 rounded-full bg-mint" aria-hidden />
                live
              </span>
              {snapshot && (
                <span className="text-[11px] font-normal tracking-normal text-forest/35">
                  {formatRelative(snapshot.generatedAt, nowMs)}
                </span>
              )}
            </p>
            <p className="mt-0.5 max-w-[48vw] truncate text-[11px] text-forest/40" title={email}>
              {name || email}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <ExportLink type="users" label="CSV user" />
            <ExportLink type="payments" label="CSV bayar" />
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              title="Muat ulang"
              aria-label="Muat ulang data"
              className={ADMIN_TOOL_BUTTON}
            >
              <RefreshCw
                className={cn('size-4', refreshing && 'animate-spin')}
                aria-hidden
                strokeWidth={1.8}
              />
            </button>
            <Link
              href="/app"
              title="Kembali ke aplikasi"
              aria-label="Kembali ke aplikasi"
              className={ADMIN_TOOL_BUTTON}
            >
              <ArrowLeft className="size-4" aria-hidden strokeWidth={1.8} />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        {!snapshot ? (
          <AdminSection
            title="Data belum bisa dibaca"
            note="Dashboard membaca data lewat kunci peran server (SUPABASE_SERVICE_ROLE_KEY). Kunci itu tidak pernah dikirim ke browser."
          >
            <p className="text-[12px] leading-relaxed text-forest/60">
              {error ?? 'Snapshot belum tersedia.'}
            </p>
            <button type="button" onClick={refresh} className={cn(ADMIN_PRIMARY_BUTTON, 'mt-3')}>
              <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} aria-hidden />
              Muat ulang
            </button>
          </AdminSection>
        ) : (
          <>
            <AdminSection>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <AdminStat
                  label="Pendapatan bulan ini"
                  value={formatIDR(snapshot.revenue.total.thisMonth)}
                  hint={`hari ini ${formatIDR(snapshot.revenue.total.today)}`}
                />
                <AdminStat
                  label="Akun berbayar"
                  value={formatNumber(snapshot.revenue.paidUsers)}
                  hint={`${formatPercent(snapshot.revenue.paidAccountPercent)} dari ${formatNumber(
                    snapshot.revenue.totalUsers,
                  )} akun`}
                />
                <AdminStat
                  label="Total akun"
                  value={formatNumber(snapshot.growth.users.total)}
                  hint={`+${formatNumber(snapshot.growth.users.last30)} / 30 hr`}
                />
                <AdminStat
                  label="Aktif 30 hari"
                  value={formatNumber(snapshot.growth.activeMonthly)}
                  hint={`${formatNumber(snapshot.growth.activeDaily)} / 24 jam`}
                />
              </div>
              {snapshot.limits.usersTruncated && (
                <AdminMeta className="mt-3">
                  Data menyentuh batas baca — angka bisa terpotong.
                </AdminMeta>
              )}
            </AdminSection>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-full bg-sage/60 p-1">
                {TABS.map((item) => {
                  const Icon = item.icon
                  const active = tab === item.id
                  const badge = counts[item.id]
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
                      aria-pressed={active}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors sm:px-3 sm:text-[12px]',
                        active
                          ? 'bg-cream text-forest ring-1 ring-soil/[0.08]'
                          : 'text-forest/55 hover:text-forest',
                      )}
                    >
                      <Icon className="hidden size-3.5 sm:block" aria-hidden strokeWidth={1.8} />
                      {item.label}
                      {badge !== null && badge > 0 && (
                        <span className="text-[10px] font-medium tabular-nums text-forest/35">
                          {formatNumber(badge)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {snapshot.mismatches.length > 0 && tab !== 'payments' && (
                <button
                  type="button"
                  onClick={() => setTab('payments')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-plum/10 px-3 py-1.5 text-[11.5px] font-semibold text-plum-deep transition-colors hover:bg-plum/15"
                >
                  <AlertTriangle className="size-3.5" aria-hidden strokeWidth={1.8} />
                  {formatNumber(snapshot.mismatches.length)} pembayaran perlu dicek
                </button>
              )}
            </div>

            <div className="mt-3">
              {tab === 'overview' && <AdminOverview snapshot={snapshot} />}
              {tab === 'users' && <AdminUsersTable users={snapshot.users} nowMs={nowMs} />}
              {tab === 'plans' && <AdminPlansTab snapshot={snapshot} />}
              {tab === 'payments' && (
                <AdminPaymentsTable
                  payments={snapshot.payments.rows}
                  summary={snapshot.payments.summary}
                  abandoned={snapshot.abandoned}
                  mismatches={snapshot.mismatches}
                />
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
