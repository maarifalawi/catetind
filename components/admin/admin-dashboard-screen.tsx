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
  ShieldCheck,
  Users,
} from 'lucide-react'
import type { AdminSnapshot } from '@/lib/admin/types'
import { cn } from '@/lib/utils'
import { AdminOverview } from './admin-overview'
import { AdminPaymentsTable } from './admin-payments-table'
import { AdminPlansTab } from './admin-plans-tab'
import { AdminUsersTable } from './admin-users-table'
import { AdminEmpty, AdminPill, formatDateTime, formatNumber } from './admin-ui'

/* ── FOUNDER COMMAND CENTER — BINGKAI LAYAR ─────────────────────────────────
   Satu halaman, empat tab: Ringkasan · User · Langganan · Pembayaran.

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
    <a
      href={`/api/admin/export?type=${type}`}
      className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-2 text-[11px] font-semibold text-forest ring-1 ring-soil/15 transition-colors hover:bg-sage"
    >
      <Download className="size-3.5" aria-hidden />
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

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-6 sm:px-6 lg:px-10">
      <header className="rounded-[1.6rem] bg-forest p-4 text-cream sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <AdminPill tone="daisy">
                <ShieldCheck className="size-3" aria-hidden /> Khusus pemilik
              </AdminPill>
              <AdminPill tone="mint">Data live Supabase</AdminPill>
              <span className="text-[11px] text-cream/60">{email}</span>
            </div>
            <h1 className="mt-2 text-[20px] font-semibold leading-tight sm:text-[24px]">
              Founder Command Center
            </h1>
            <p className="mt-1 text-[12px] leading-relaxed text-cream/70">
              {name ? `${name}, ini` : 'Ini'} ringkasan operasional CatetInd: pertumbuhan user,
              pendapatan bersih, paket aktif, dan pembayaran Midtrans. Angka di bawah dibaca langsung
              dari tabel Supabase (`auth.users`, `user_subscriptions`, `purchases`, dan tabel
              aktivitas) — tanpa seed, tanpa data contoh, tanpa angka cadangan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/app"
              className="inline-flex items-center gap-1.5 rounded-full bg-cream/10 px-3 py-2 text-[11px] font-semibold text-cream ring-1 ring-cream/20 transition-colors hover:bg-cream/20"
            >
              <ArrowLeft className="size-3.5" aria-hidden /> Dashboard
            </Link>
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-full bg-cream/10 px-3 py-2 text-[11px] font-semibold text-cream ring-1 ring-cream/20 transition-colors hover:bg-cream/20 disabled:opacity-60"
            >
              <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} aria-hidden />
              {refreshing ? 'Memuat…' : 'Muat ulang'}
            </button>
            <ExportLink type="users" label="CSV User" />
            <ExportLink type="payments" label="CSV Pembayaran" />
          </div>
        </div>
        {snapshot && (
          <p className="mt-3 text-[11px] text-cream/55">
            Snapshot dibuat {formatDateTime(snapshot.generatedAt)} · {formatNumber(snapshot.users.length)}{' '}
            akun dibaca
            {snapshot.limits.usersTruncated ? ' (menyentuh batas baca — angka bisa terpotong)' : ''}
          </p>
        )}
      </header>

      {!snapshot ? (
        <div className="mt-4 rounded-[1.4rem] bg-cream p-4 ring-1 ring-soil/10">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-plum" aria-hidden />
            <div>
              <p className="text-[13px] font-semibold text-forest">Data admin belum bisa dibaca</p>
              <p className="mt-1 text-[12px] leading-relaxed text-forest/65">
                {error ?? 'Snapshot belum tersedia.'}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-forest/50">
                Dashboard ini membutuhkan `SUPABASE_SERVICE_ROLE_KEY` di server. Kunci itu tidak
                pernah dikirim ke browser dan tidak boleh ditulis di kode.
              </p>
            </div>
          </div>
          <div className="mt-3">
            <AdminEmpty>Perbaiki konfigurasi server lalu muat ulang halaman ini.</AdminEmpty>
          </div>
        </div>
      ) : (
        <>
          <nav
            aria-label="Bagian dashboard admin"
            className="mt-4 flex flex-wrap items-center gap-1.5"
          >
            {TABS.map((item) => {
              const Icon = item.icon
              const active = tab === item.id
              const badge =
                item.id === 'users'
                  ? snapshot.users.length
                  : item.id === 'payments'
                    ? snapshot.mismatches.length
                    : item.id === 'plans'
                      ? snapshot.revenue.paidUsers
                      : null
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  aria-pressed={active}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold transition-colors',
                    active
                      ? 'bg-forest text-cream'
                      : 'bg-sage/60 text-forest/70 hover:bg-sage hover:text-forest',
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                  {item.label}
                  {badge !== null && badge > 0 && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[10px]',
                        item.id === 'payments'
                          ? active
                            ? 'bg-cream/20 text-cream'
                            : 'bg-plum/20 text-plum-deep'
                          : active
                            ? 'bg-cream/20 text-cream'
                            : 'bg-ink/[0.06] text-forest/60',
                      )}
                    >
                      {formatNumber(badge)}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {snapshot.mismatches.length > 0 && tab !== 'payments' && (
            <button
              type="button"
              onClick={() => setTab('payments')}
              className="mt-3 flex w-full items-start gap-2 rounded-2xl bg-plum/10 px-3.5 py-3 text-left text-[12px] leading-relaxed text-plum-deep transition-colors hover:bg-plum/15"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {formatNumber(snapshot.mismatches.length)} pembayaran lunas belum sinkron dengan hak
                akses user. Buka tab Pembayaran untuk memperbaiki.
              </span>
            </button>
          )}

          <div className="mt-4">
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
  )
}
