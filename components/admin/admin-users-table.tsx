'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import {
  aiQuotaOf,
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
  AdminMeta,
  AdminPill,
  AdminSection,
  daysLabel,
  formatDate,
  formatNumber,
  formatRelative,
} from './admin-ui'

/* ── TAB USER: CARI → SARING → KELOLA ────────────────────────────────────────
   Satu baris kontrol (pencarian + saringan), satu angka "ditampilkan / cocok",
   lalu tabel 5 kolom. Setiap baris hanya memuat identitas + HITUNGAN aktivitas +
   keadaan paket — tidak ada isi catatan uang user.

   Yang dipadatkan dari versi lama: kolom "Terdaftar", "Terakhir aktif", dan
   "Onboarding" tidak lagi jadi kolom sendiri (tiga kolom sempit yang membuat
   tabel melebar 860px). Terakhir aktif pindah ke baris identitas sebagai
   "· aktif 3 hr lalu", dan onboarding hanya muncul sebagai pill saat BELUM
   selesai — keadaan yang memang perlu ditindak.
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
        {user.plan.period && <p className="text-[12px] text-plum-deep">tidak aktif</p>}
      </div>
    )
  }
  const days = daysUntil(user.plan.expiresAt, nowMs)
  return (
    <div className="space-y-1">
      <AdminPill tone={user.plan.isLifetime ? 'mint' : 'forest'}>
        {planLabelOf(user.plan.planId)}
      </AdminPill>
      <p className="text-[12px] leading-snug tabular-nums text-forest-muted">
        {user.plan.isLifetime
          ? 'selamanya'
          : user.plan.expiresAt
            ? `${formatDate(user.plan.expiresAt)}${days === null ? '' : ` · ${daysLabel(days)}`}`
            : 'tanpa tanggal'}
      </p>
    </div>
  )
}

/* ── SEL "SISA AI" — berapa persen kuota AI akun ini yang masih tersisa ───────
   Permintaan pemilik repo: di dashboard admin bisa terlihat sisa kuota AI tiap
   user, dalam bentuk PERSEN saja.

   Tiga bentuk, tiga arti (lihat `aiQuotaOf` di `lib/admin/filters.ts`):
     ·  —  → paket tanpa AI (angka apa pun akan menyesatkan)
     ·  ∞  → paket tanpa batas
     · 78% → sisa kuota dasar paket berkuota
   Warnanya memakai palet status kanon yang sama dengan Daily HUD (mint aman,
   hud-amber mendekati batas, plum lewat batas) — tidak ada warna baru. */
function AiQuotaCell({ user }: { user: AdminUserRow }) {
  const quota = aiQuotaOf(user)

  if (quota.kind === 'none') {
    return <span className="text-[13.5px] text-forest-muted">—</span>
  }
  if (quota.kind === 'unlimited') {
    return <span className="text-[13.5px] font-medium text-forest">∞</span>
  }

  const tone = quota.pct >= 50 ? 'mint' : quota.pct >= 20 ? 'cantelope' : 'plum'
  return (
    <AdminPill tone={tone}>
      <span className="tabular-nums">{quota.pct}%</span>
    </AdminPill>
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
    <AdminSection title="User">
      <div className="flex flex-col gap-2.5">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-forest-muted"
            aria-hidden
            strokeWidth={1.8}
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama atau email…"
            aria-label="Cari user berdasarkan nama atau email"
            className="w-full rounded-xl bg-sage/40 py-2 pl-9 pr-3 text-[14px] text-forest ring-1 ring-soil/[0.07] outline-none transition placeholder:text-forest-muted focus:ring-2 focus:ring-forest/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((item) => {
            const active = filter === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                aria-pressed={active}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium transition-colors',
                  active
                    ? 'bg-forest text-cream'
                    : 'bg-sage/50 text-forest-muted hover:bg-sage hover:text-forest',
                )}
              >
                {item.label}
                <span
                  className={cn(
                    'text-[11.5px] tabular-nums',
                    active ? 'text-cream' : 'text-forest-muted',
                  )}
                >
                  {formatNumber(counts[item.id])}
                </span>
              </button>
            )
          })}
          <AdminMeta className="ml-auto">
            {formatNumber(shown.length)} / {formatNumber(filtered.length)}
          </AdminMeta>
        </div>
      </div>

      {selected && (
        <div className="mt-3">
          <AdminUserActions user={selected} onClose={() => setSelectedId(null)} />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="mt-3">
          <AdminEmpty>Tidak ada akun yang cocok.</AdminEmpty>
        </div>
      ) : (
        <div className="-mx-1 mt-2 overflow-x-auto px-1">
          <table className="w-full min-w-[820px] border-separate border-spacing-y-1 text-left">
            <thead>
              <tr className="text-[11.5px] uppercase tracking-[0.12em] text-forest-muted">
                <th className="px-2.5 pb-1.5 font-medium">User</th>
                <th className="px-2.5 pb-1.5 font-medium">Paket</th>
                <th className="px-2.5 pb-1.5 text-right font-medium" title="dompet / transaksi">
                  Aktivitas
                </th>
                <th className="px-2.5 pb-1.5 text-right font-medium" title="panggilan AI bulan ini">
                  AI
                </th>
                {/* Kolom baru: sisa kuota AI dalam persen. Angkanya turunan dari
                    `aiCallsThisMonth` vs kuota dasar kanon (`aiQuotaOf`), bukan
                    kolom server baru — pagar privasi `lib/admin/columns.ts` tetap. */}
                <th
                  className="px-2.5 pb-1.5 text-right font-medium"
                  title="sisa kuota dasar AI bulan berjalan"
                >
                  Sisa AI
                </th>
                <th className="px-2.5 pb-1.5 text-right font-medium">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((user) => (
                <tr key={user.id} className="bg-sage/25 align-top">
                  <td className="max-w-[340px] rounded-l-xl px-2.5 py-2.5">
                    <p className="flex items-center gap-1.5 text-[14px] font-medium text-forest">
                      <span className="truncate">{user.name || 'Tanpa nama'}</span>
                      {!user.onboardingCompleted && (
                        <AdminPill tone="cantelope">belum onboarding</AdminPill>
                      )}
                    </p>
                    <p className="truncate text-[12px] tabular-nums text-forest-muted">
                      {user.email || user.id} · aktif {formatRelative(user.lastActiveAt, nowMs)}
                    </p>
                  </td>
                  <td className="px-2.5 py-2.5">
                    <PlanCell user={user} nowMs={nowMs} />
                  </td>
                  <td
                    className="px-2.5 py-2.5 text-right text-[13.5px] font-semibold tabular-nums text-forest"
                    title={`${formatNumber(user.walletCount)} dompet · ${formatNumber(
                      user.transactionCount,
                    )} transaksi`}
                  >
                    {formatNumber(user.walletCount)}
                    <span className="font-normal text-forest-muted"> / </span>
                    {formatNumber(user.transactionCount)}
                  </td>
                  <td className="px-2.5 py-2.5 text-right text-[13.5px] tabular-nums text-forest-muted">
                    {formatNumber(user.aiCallsThisMonth)}
                  </td>
                  <td className="px-2.5 py-2.5 text-right">
                    <AiQuotaCell user={user} />
                  </td>
                  <td className="rounded-r-xl px-2.5 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedId(selectedId === user.id ? null : user.id)}
                      aria-expanded={selectedId === user.id}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[12.5px] font-semibold transition-colors',
                        selectedId === user.id
                          ? 'bg-forest text-cream'
                          : 'bg-cream text-forest-soft ring-1 ring-soil/[0.08] hover:bg-sage/60 hover:text-forest',
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
