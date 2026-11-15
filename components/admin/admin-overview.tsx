'use client'

import { useMemo, useState } from 'react'
import { Download, Mail } from 'lucide-react'
import { formatIDR } from '@/lib/data/pricing'
import type { AdminRevenueBlock, AdminSnapshot, AdminUserRow } from '@/lib/admin/types'
import {
  AdminBar,
  AdminEmpty,
  AdminList,
  AdminListRow,
  AdminMeta,
  AdminPill,
  AdminSection,
  AdminStat,
  formatDate,
  formatMonth,
  formatNumber,
  formatPercent,
} from './admin-ui'

/* ── TAB RINGKASAN: UANG, USER, PAKET, DAN SIAPA YANG BELUM BAYAR ────────────
   Permintaan pemilik produk: "dashboard admin lebih ke berapa pendapatan sama
   total user aja, sama pembagian dia subs paket apa". Jadi tab ini hanya
   menjawab empat hal, berurutan sesuai kepentingan bisnis:

     1. PENDAPATAN      → total, bulan ini, hari ini (+ rincian paket vs AI);
     2. TOTAL USER      → terdaftar, berlangganan, belum berlangganan;
     3. PEMBAGIAN PAKET → akun per paket (lifetime vs 30 hari);
     4. BELUM BERLANGGANAN → daftar EMAIL siap follow-up.

   Corong aktivasi & adopsi fitur DIHAPUS dari tab ini: keduanya bukan angka
   uang maupun angka pelanggan, dan membuat layar tidak lagi "satu pandang".
   Datanya tetap hidup di tab User & Pembayaran.

   Semua angka datang dari `snapshot` yang dihitung server
   (`lib/admin/snapshot.ts`); komponen ini tidak menghitung ulang apa pun,
   supaya layar dan CSV tidak pernah berbeda.
   ────────────────────────────────────────────────────────────────────────── */

/* ── PENDAPATAN: TOTAL, PER BULAN, DAN FILTER BULAN ─────────────────────────
   Keluhan pemilik produk: tab ini hanya menampilkan "bulan ini", sehingga
   pertanyaan wajar seperti "pendapatan bulan lalu berapa?" dan "total
   penjualan sampai sekarang berapa?" tidak bisa dijawab dari layar.

   Sekarang satu panel menjawab ketiganya:
     · `Semua bulan` (default) → total penjualan sepanjang waktu,
     · pilih bulan tertentu → angka bulan itu (paket / token AI / transaksi),
     · tabel riwayat → semua bulan yang punya penjualan, urut terbaru.
   Angkanya datang dari `revenue.months` yang dihitung server (`snapshot.ts`),
   jadi filter ini tidak menghitung ulang apa pun di browser. */

const SELECT_STYLE =
  'rounded-xl bg-cream px-3 py-2 text-[13px] font-semibold text-forest ring-1 ring-soil/[0.12] outline-none transition-colors hover:bg-sage/40 focus-visible:ring-2 focus-visible:ring-forest/30'

function RevenuePanel({ revenue }: { revenue: AdminRevenueBlock }) {
  const [scope, setScope] = useState<'all' | string>('all')
  const month = scope === 'all' ? null : (revenue.months.find((row) => row.month === scope) ?? null)

  const plan = month ? month.subscription : revenue.subscription.allTime
  const addon = month ? month.addon : revenue.addon.allTime
  const total = month ? month.total : revenue.total.allTime
  const count = month ? month.settledCount : revenue.settledCount
  const scopeLabel = month ? formatMonth(month.month) : 'Total penjualan'

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <AdminStat
          label={scopeLabel}
          value={formatIDR(total)}
          hint={`${formatNumber(count)} transaksi lunas`}
        />
        <AdminStat label="Paket" value={formatIDR(plan)} />
        <AdminStat label="Token AI" value={formatIDR(addon)} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-soil/[0.06] pt-3">
        <label
          htmlFor="pendapatan-bulan"
          className="text-[12px] font-medium uppercase tracking-[0.12em] text-forest-muted"
        >
          Filter bulan
        </label>
        <select
          id="pendapatan-bulan"
          value={scope}
          onChange={(event) => setScope(event.target.value)}
          className={SELECT_STYLE}
        >
          <option value="all">Semua bulan · {formatIDR(revenue.total.allTime)}</option>
          {revenue.months.map((row) => (
            <option key={row.month} value={row.month}>
              {formatMonth(row.month)} · {formatIDR(row.total)}
            </option>
          ))}
        </select>
      </div>

      <table className="mt-3 w-full text-[13.5px] tabular-nums">
        <thead>
          <tr className="text-[11.5px] uppercase tracking-[0.12em] text-forest-muted">
            <th className="pb-1.5 text-left font-medium">Bulan</th>
            <th className="pb-1.5 text-right font-medium">Paket</th>
            <th className="pb-1.5 text-right font-medium">AI</th>
            <th className="pb-1.5 text-right font-medium">Lunas</th>
            <th className="pb-1.5 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-soil/[0.06]">
          {revenue.months.map((row) => {
            const active = scope === row.month
            return (
              <tr key={row.month} className={active ? 'bg-sage/35' : undefined}>
                <td className="py-1.5 text-forest-muted">
                  <button
                    type="button"
                    onClick={() => setScope(active ? 'all' : row.month)}
                    className="text-left font-medium text-forest transition-colors hover:text-forest-soft"
                    aria-pressed={active}
                  >
                    {formatMonth(row.month)}
                  </button>
                </td>
                <td className="py-1.5 text-right text-forest-muted">{formatIDR(row.subscription)}</td>
                <td className="py-1.5 text-right text-forest-muted">{formatIDR(row.addon)}</td>
                <td className="py-1.5 text-right text-forest-muted">{formatNumber(row.settledCount)}</td>
                <td className="py-1.5 text-right font-semibold text-forest">
                  {formatIDR(row.total)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <AdminMeta className="mt-2">
        Rata-rata {formatIDR(revenue.averageTransaction)} · {formatNumber(revenue.settledCount)}{' '}
        transaksi lunas sepanjang waktu
      </AdminMeta>
    </>
  )
}

function PlanMix({ snapshot }: { snapshot: AdminSnapshot }) {
  const { tiers, withoutPlan, expired, totalAccounts } = snapshot.plans

  return (
    <>
      <div className="space-y-2.5">
        {tiers.map((tier) => {
          const share = totalAccounts > 0 ? (tier.total / totalAccounts) * 100 : 0
          return (
            <div key={tier.planId}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-[14px] font-medium text-forest">{tier.label}</p>
                <p className="shrink-0 text-[13px] tabular-nums text-forest-muted">
                  <span className="font-semibold text-forest">{formatNumber(tier.total)}</span> ·{' '}
                  {formatPercent(share)}
                </p>
              </div>
              <div className="mt-1">
                <AdminBar
                  percent={share}
                  tone={tier.lifetime > 0 ? 'mint' : 'forest'}
                  label={`${tier.label}: ${tier.total} akun`}
                />
              </div>
            </div>
          )
        })}
      </div>
      <AdminMeta className="mt-3">
        Belum berlangganan {formatNumber(withoutPlan)} · Tidak aktif {formatNumber(expired)}
      </AdminMeta>
    </>
  )
}

/**
 * Akun TERDAFTAR yang belum punya paket aktif — daftar follow-up.
 *
 * Sumbernya `snapshot.users` (dibaca server dari `auth.users` +
 * `user_subscriptions`), jadi ini email SUNGGUHAN, bukan contoh. Urutannya
 * pendaftar terbaru dulu: mereka yang paling mungkin masih hangat dihubungi.
 */
function NonSubscribers({ users }: { users: AdminUserRow[] }) {
  const pending = useMemo(
    () =>
      users
        .filter((user) => !user.plan.active)
        .sort(
          (a, b) =>
            (Date.parse(b.createdAt ?? '') || 0) - (Date.parse(a.createdAt ?? '') || 0),
        ),
    [users],
  )

  const emails = pending.map((user) => user.email).filter(Boolean)

  return (
    <AdminSection
      title="Belum berlangganan"
      note="Semua akun terdaftar yang belum punya paket aktif. Emailnya bisa langsung dipakai untuk follow-up."
      action={
        emails.length > 0 ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <a
              href="/api/admin/export?type=unsubscribed"
              className="inline-flex items-center gap-1.5 rounded-full bg-cream px-2.5 py-1.5 text-[12.5px] font-semibold text-forest ring-1 ring-soil/[0.08] transition-colors hover:bg-sage/60"
              title="Unduh daftar email yang belum berlangganan (CSV)"
            >
              <Download className="size-3.5" aria-hidden strokeWidth={2} />
              CSV
            </a>
            <a
              href={`mailto:?bcc=${encodeURIComponent(emails.join(','))}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-cream px-2.5 py-1.5 text-[12.5px] font-semibold text-forest ring-1 ring-soil/[0.08] transition-colors hover:bg-sage/60"
            >
              <Mail className="size-3.5" aria-hidden strokeWidth={2} />
              Email semua ({formatNumber(emails.length)})
            </a>
          </div>
        ) : null
      }
    >
      {pending.length === 0 ? (
        <AdminEmpty>Semua akun terdaftar sudah berlangganan.</AdminEmpty>
      ) : (
        <AdminList className="max-h-[420px] overflow-y-auto">
          {pending.map((user) => (
            <AdminListRow
              key={user.id}
              left={<span className="font-normal text-forest">{user.email || '—'}</span>}
              meta={
                <>
                  Daftar {formatDate(user.createdAt)} · {formatNumber(user.transactionCount)}{' '}
                  catatan
                  {user.onboardingCompleted ? '' : ' · onboarding belum selesai'}
                </>
              }
              right={
                user.plan.period === null ? (
                  <AdminPill tone="cantelope">Belum pernah bayar</AdminPill>
                ) : (
                  <AdminPill tone="plum">Tidak aktif</AdminPill>
                )
              }
            />
          ))}
        </AdminList>
      )}
    </AdminSection>
  )
}

export function AdminOverview({ snapshot }: { snapshot: AdminSnapshot }) {
  const { revenue, users, growth } = snapshot
  const subscribed = users.filter((user) => user.plan.active).length
  const notSubscribed = users.length - subscribed
  const subscribedShare = users.length > 0 ? (subscribed / users.length) * 100 : 0

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <AdminSection
          title="Pendapatan"
          note="Hanya transaksi lunas. Paket langganan dan kuota AI dipisah supaya terlihat dari mana uangnya datang. Pilih bulan di filter untuk melihat pendapatan bulan sebelumnya; tanpa filter, angkanya total sepanjang waktu."
        >
          <RevenuePanel revenue={revenue} />
        </AdminSection>

        <AdminSection
          title="Total user"
          note="Jumlah akun terdaftar (auth.users). Berlangganan = punya paket yang benar-benar aktif sekarang."
        >
          <div className="grid grid-cols-3 gap-3">
            <AdminStat
              label="Terdaftar"
              value={formatNumber(users.length)}
              hint={`+${formatNumber(growth.users.last30)} / 30 hr`}
            />
            <AdminStat
              label="Berlangganan"
              value={formatNumber(subscribed)}
              hint={`${formatPercent(subscribedShare)} dari akun`}
            />
            <AdminStat label="Belum" value={formatNumber(notSubscribed)} hint="perlu follow-up" />
          </div>
          {snapshot.limits.usersTruncated && (
            <AdminMeta className="mt-3">
              Data menyentuh batas baca — angka bisa terpotong.
            </AdminMeta>
          )}
        </AdminSection>
      </div>

      <AdminSection
        title="Pembagian paket"
        note="30 hari = baris prabayar lama; produk yang dijual sekarang hanya akses selamanya. Persentase dari seluruh akun terdaftar."
      >
        <PlanMix snapshot={snapshot} />
      </AdminSection>

      <NonSubscribers users={users} />
    </div>
  )
}
