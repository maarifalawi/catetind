'use client'

import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import {
  countByFilter,
  daysUntil,
  matchesUserFilter,
  matchesUserQuery,
  planLabelOf,
} from '@/lib/admin/filters'
import type { AdminUserFilterId, AdminUserRow } from '@/lib/admin/types'
import { cn } from '@/lib/utils'
import { AdminUserActions } from './admin-user-actions'
import {
  AdminEmpty,
  AdminPill,
  AdminSection,
  daysLabel,
  formatDate,
  formatDateTime,
  formatNumber,
} from './admin-ui'

/* ── DIREKTORI USER + KONTROL HAK AKSES MANUAL ───────────────────────────────
   Pencarian cepat (nama/email) dan filter status. Setiap baris hanya memuat
   identitas + HITUNGAN aktivitas + keadaan paket — tidak ada isi catatan uang
   user. Tombol "Kelola" membuka panel tindakan manual (paket, perpanjangan,
   kuota AI) yang menulis lewat route server.
   ────────────────────────────────────────────────────────────────────────── */

const FILTERS: { id: AdminUserFilterId; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'paid', label: 'Berbayar' },
  { id: 'free', label: 'Tanpa paket' },
  { id: 'onboarding-pending', label: 'Belum onboarding' },
  { id: 'no-transactions', label: 'Belum ada transaksi' },
  { id: 'expiring-soon', label: 'Paket mau habis' },
]

const ROW_LIMIT = 150

function PlanCell({ user, nowMs }: { user: AdminUserRow; nowMs: number }) {
  const paid = Boolean(user.plan.active && user.plan.planId)
  if (!paid) {
    return (
      <div className="space-y-1">
        <AdminPill tone="thistle">Tanpa paket</AdminPill>
        {user.plan.period && <p className="text-[11px] text-plum-deep">langganan tidak aktif</p>}
      </div>
    )
  }
  const days = daysUntil(user.plan.expiresAt, nowMs)
  return (
    <div className="space-y-1">
      <AdminPill tone={user.plan.isLifetime ? 'mint' : 'forest'}>
        {planLabelOf(user.plan.planId)}
      </AdminPill>
      <p className="text-[11px] leading-snug text-forest/55">
        {user.plan.isLifetime
          ? 'akses selamanya'
          : user.plan.expiresAt
            ? `${formatDate(user.plan.expiresAt)}${days === null ? '' : ` · ${daysLabel(days)}`}`
            : 'tanpa tanggal berakhir'}
      </p>
    </div>
  )
}

export function AdminUsersTable({
  users,
  nowMs,
}: {
  users: AdminUserRow[]
  /** jam yang sama dengan snapshot server — supaya hitungan chip tidak berbeda antar render */
  nowMs: number
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<AdminUserFilterId>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const counts = useMemo(() => countByFilter(users, nowMs), [users, nowMs])

  const filtered = useMemo(() => {
    return users
      .filter((user) => matchesUserFilter(user, filter, nowMs) && matchesUserQuery(user, query))
      .sort((a, b) => {
        const left = a.createdAt ? Date.parse(a.createdAt) : 0
        const right = b.createdAt ? Date.parse(b.createdAt) : 0
        return right - left
      })
  }, [users, filter, query, nowMs])

  const selected = users.find((user) => user.id === selectedId) ?? null
  const shown = filtered.slice(0, ROW_LIMIT)

  return (
    <AdminSection
      title="Direktori User"
      description="Cari berdasarkan nama atau email, saring menurut status, lalu kelola paket & kuota AI per akun. Isi catatan pribadi user tidak pernah ditampilkan di sini."
    >
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-forest/40"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama atau email…"
            aria-label="Cari user berdasarkan nama atau email"
            className="w-full rounded-2xl bg-sage/50 py-2.5 pl-9 pr-3 text-[13px] text-forest ring-1 ring-soil/10 outline-none transition placeholder:text-forest/40 focus:ring-2 focus:ring-forest/25"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <SlidersHorizontal className="mr-1 size-3.5 text-forest/40" aria-hidden />
          {FILTERS.map((item) => {
            const active = filter === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                aria-pressed={active}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors',
                  active
                    ? 'bg-forest text-cream'
                    : 'bg-sage/60 text-forest/70 hover:bg-sage hover:text-forest',
                )}
              >
                {item.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px]',
                    active ? 'bg-cream/20 text-cream' : 'bg-ink/[0.06] text-forest/60',
                  )}
                >
                  {formatNumber(counts[item.id])}
                </span>
              </button>
            )
          })}
        </div>

        <p className="text-[11px] text-forest/50">
          Menampilkan {formatNumber(shown.length)} dari {formatNumber(filtered.length)} akun yang
          cocok{filtered.length > ROW_LIMIT ? ' (persempit dengan pencarian untuk melihat sisanya)' : ''}.
        </p>
      </div>

      {selected && (
        <div className="mt-3">
          <AdminUserActions user={selected} onClose={() => setSelectedId(null)} />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="mt-3">
          <AdminEmpty>Tidak ada akun yang cocok dengan pencarian & filter ini.</AdminEmpty>
        </div>
      ) : (
        <div className="-mx-1 mt-3 overflow-x-auto px-1">
          <table className="w-full min-w-[860px] border-separate border-spacing-y-1.5 text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.12em] text-forest/45">
                <th className="px-2 pb-1 font-medium">User</th>
                <th className="px-2 pb-1 font-medium">Terdaftar</th>
                <th className="px-2 pb-1 font-medium">Terakhir aktif</th>
                <th className="px-2 pb-1 font-medium">Onboarding</th>
                <th className="px-2 pb-1 text-right font-medium">Dompet</th>
                <th className="px-2 pb-1 text-right font-medium">Transaksi</th>
                <th className="px-2 pb-1 font-medium">Paket</th>
                <th className="px-2 pb-1 text-right font-medium">AI bulan ini</th>
                <th className="px-2 pb-1 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((user) => (
                <tr key={user.id} className="bg-sage/30 align-top">
                  <td className="max-w-[220px] rounded-l-xl px-2 py-2.5">
                    <p className="truncate text-[13px] font-medium text-forest">
                      {user.name || 'Tanpa nama'}
                    </p>
                    <p className="truncate text-[11px] text-forest/55">{user.email || user.id}</p>
                  </td>
                  <td className="px-2 py-2.5 text-[12px] text-forest/65">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-2 py-2.5 text-[12px] text-forest/65">
                    {formatDateTime(user.lastActiveAt)}
                  </td>
                  <td className="px-2 py-2.5">
                    <AdminPill tone={user.onboardingCompleted ? 'mint' : 'cantelope'}>
                      {user.onboardingCompleted ? 'selesai' : 'belum'}
                    </AdminPill>
                  </td>
                  <td className="px-2 py-2.5 text-right text-[12px] font-semibold text-forest">
                    {formatNumber(user.walletCount)}
                  </td>
                  <td className="px-2 py-2.5 text-right text-[12px] font-semibold text-forest">
                    {formatNumber(user.transactionCount)}
                  </td>
                  <td className="px-2 py-2.5">
                    <PlanCell user={user} nowMs={nowMs} />
                  </td>
                  <td className="px-2 py-2.5 text-right text-[12px] text-forest/65">
                    {formatNumber(user.aiCallsThisMonth)}
                  </td>
                  <td className="rounded-r-xl px-2 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedId(selectedId === user.id ? null : user.id)}
                      aria-expanded={selectedId === user.id}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors',
                        selectedId === user.id
                          ? 'bg-forest text-cream'
                          : 'bg-cream text-forest ring-1 ring-soil/15 hover:bg-sage',
                      )}
                    >
                      {selectedId === user.id ? 'Tutup' : 'Kelola'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminSection>
  )
}
