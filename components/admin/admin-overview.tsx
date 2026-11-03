'use client'

import { formatIDR } from '@/lib/data/pricing'
import type { AdminRevenueBlock, AdminSnapshot } from '@/lib/admin/types'
import {
  AdminBar,
  AdminList,
  AdminListRow,
  AdminMeta,
  AdminSection,
  daysLabel,
  formatDate,
  formatNumber,
  formatPercent,
} from './admin-ui'

/* ── TAB RINGKASAN: SATU LAYAR, EMPAT KEPUTUSAN ──────────────────────────────
   Yang ingin dijawab layar ini cuma empat, dan urutannya mengikuti uang:

     1. Uang masuk       → dari mana pendapatannya (paket vs kuota AI);
     2. Paket aktif      → bauran pelanggan;
     3. Corong & Fitur   → di mana orang berhenti / fitur mana yang dipakai;
     4. Perlu perhatian  → paket yang mau habis / baru habis.

   Tidak ada paragraf penjelas di sini: konteks yang penting hidup sebagai
   tooltip ⓘ (`note`) dan keterangan satu baris (`AdminMeta`). Semua angka
   datang dari `snapshot` yang dihitung server (`lib/admin/snapshot.ts`) —
   komponen ini tidak menghitung ulang apa pun, supaya layar dan CSV tidak
   pernah berbeda.
   ────────────────────────────────────────────────────────────────────────── */

/** tabel uang masuk: sumber uang dipisah, total di kanan (kolom angka rata) */
function MoneyTable({ revenue }: { revenue: AdminRevenueBlock }) {
  const rows = [
    {
      label: 'Hari ini',
      plan: revenue.subscription.today,
      addon: revenue.addon.today,
      total: revenue.total.today,
    },
    {
      label: 'Bulan ini',
      plan: revenue.subscription.thisMonth,
      addon: revenue.addon.thisMonth,
      total: revenue.total.thisMonth,
    },
    {
      label: 'Total',
      plan: revenue.subscription.allTime,
      addon: revenue.addon.allTime,
      total: revenue.total.allTime,
    },
  ]

  return (
    <>
      <table className="w-full text-[12px] tabular-nums">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.12em] text-forest/40">
            <th className="pb-1.5 text-left font-medium">&nbsp;</th>
            <th className="pb-1.5 text-right font-medium">Paket</th>
            <th className="pb-1.5 text-right font-medium">AI</th>
            <th className="pb-1.5 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-soil/[0.06]">
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="py-1.5 text-forest/60">{row.label}</td>
              <td className="py-1.5 text-right text-forest/50">{formatIDR(row.plan)}</td>
              <td className="py-1.5 text-right text-forest/50">{formatIDR(row.addon)}</td>
              <td className="py-1.5 text-right font-semibold text-forest">
                {formatIDR(row.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <AdminMeta className="mt-2">
        Rata-rata {formatIDR(revenue.averageTransaction)} ·{' '}
        {formatNumber(revenue.settledCount)} transaksi lunas
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
                <p className="truncate text-[12.5px] font-medium text-forest">{tier.label}</p>
                <p className="shrink-0 text-[11.5px] tabular-nums text-forest/50">
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

function Funnel({ snapshot }: { snapshot: AdminSnapshot }) {
  const { stages, biggestDrop } = snapshot.funnel
  const registered = stages[0]?.count ?? 0

  return (
    <>
      <ol className="space-y-2.5">
        {stages.map((stage, index) => {
          const width = registered > 0 ? (stage.count / registered) * 100 : 0
          const leak = biggestDrop?.id === stage.id
          return (
            <li key={stage.id}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-[12.5px] font-medium text-forest">
                  <span className="mr-1.5 tabular-nums text-forest/30">{index + 1}</span>
                  {stage.label}
                </p>
                <p className="shrink-0 text-[11.5px] tabular-nums text-forest/50">
                  <span className="font-semibold text-forest">{formatNumber(stage.count)}</span>
                  {index > 0 && <> · {formatPercent(stage.conversionFromPrevious)}</>}
                </p>
              </div>
              <div className="mt-1">
                <AdminBar
                  percent={width}
                  tone={leak ? 'plum' : index === stages.length - 1 ? 'mint' : 'forest'}
                  label={`${stage.label}: ${stage.count} akun`}
                />
              </div>
            </li>
          )
        })}
      </ol>
      {biggestDrop && (
        <AdminMeta className="mt-2 text-plum-deep">
          Turun terbesar: {biggestDrop.label} · {formatNumber(biggestDrop.droppedBefore)} berhenti
        </AdminMeta>
      )}
    </>
  )
}

function Features({ snapshot }: { snapshot: AdminSnapshot }) {
  return (
    <div className="space-y-2.5">
      {snapshot.featureAdoption.map((feature) => (
        <div key={feature.id}>
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[12.5px] font-medium text-forest">{feature.label}</p>
            <p className="shrink-0 text-[11.5px] tabular-nums text-forest/50">
              <span className="font-semibold text-forest">{formatNumber(feature.users)}</span> ·{' '}
              {formatPercent(feature.sharePercent)}
            </p>
          </div>
          <div className="mt-1">
            <AdminBar
              percent={feature.sharePercent}
              tone={feature.users > 0 ? 'mint' : 'thistle'}
              label={`${feature.label}: ${feature.users} akun`}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Daftar "yang harus disentuh hari ini": paket yang berakhir ≤ 7 hari lagi dan
 * yang baru habis ≤ 14 hari lalu. Digabung, dipotong 5 baris — angka lengkapnya
 * ada di tab Langganan.
 */
function Attention({ snapshot }: { snapshot: AdminSnapshot }) {
  const { expiringSoon, expiredRecently } = snapshot.expiryRadar
  const entries = [
    ...expiringSoon.map((entry) => ({ entry, expired: false })),
    ...expiredRecently.map((entry) => ({ entry, expired: true })),
  ]
  if (entries.length === 0) return null

  const shown = entries.slice(0, 5)
  const rest = entries.length - shown.length

  return (
    <AdminSection
      title="Perlu perhatian"
      note="Paket berakhir ≤ 7 hari lagi atau baru habis ≤ 14 hari lalu."
    >
      <AdminList>
        {shown.map(({ entry, expired }) => (
          <AdminListRow
            key={`${entry.userId}-${entry.expiresAt}`}
            left={entry.name || entry.email || entry.userId}
            meta={
              <span className={expired ? 'text-plum-deep' : undefined}>
                {entry.planLabel} · {daysLabel(entry.daysLeft)}
              </span>
            }
            right={formatDate(entry.expiresAt)}
          />
        ))}
      </AdminList>
      {rest > 0 && <AdminMeta className="mt-2">+{formatNumber(rest)} lainnya di tab Langganan</AdminMeta>}
    </AdminSection>
  )
}

export function AdminOverview({ snapshot }: { snapshot: AdminSnapshot }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <AdminSection
          title="Uang masuk"
          note="Hanya transaksi lunas. Paket langganan dan kuota AI dipisah supaya terlihat dari mana uangnya datang."
        >
          <MoneyTable revenue={snapshot.revenue} />
        </AdminSection>
        <AdminSection
          title="Paket aktif"
          note="30 hari = baris prabayar lama; produk yang dijual sekarang hanya akses selamanya. Persentase dari seluruh akun terdaftar."
        >
          <PlanMix snapshot={snapshot} />
        </AdminSection>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <AdminSection title="Corong aktivasi" note="Berapa akun yang bertahan di setiap langkah.">
          <Funnel snapshot={snapshot} />
        </AdminSection>
        <AdminSection
          title="Fitur terpakai"
          note="Jumlah akun yang memakai tiap fitur utama — hitungan aktivitas, bukan isi catatan."
        >
          <Features snapshot={snapshot} />
        </AdminSection>
      </div>

      <Attention snapshot={snapshot} />
    </div>
  )
}
