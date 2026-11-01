'use client'

import { AlertTriangle, ArrowDownRight, Crown, ShieldCheck, TrendingUp, Users, Wallet } from 'lucide-react'
import { formatIDR } from '@/lib/data/pricing'
import type { AdminSnapshot } from '@/lib/admin/types'
import {
  AdminBar,
  AdminEmpty,
  AdminPill,
  AdminSection,
  AdminStat,
  daysLabel,
  formatDate,
  formatNumber,
  formatPercent,
} from './admin-ui'

/* ── TAB RINGKASAN: EKSEKUTIF, CORONG, FITUR, PAKET ──────────────────────────
   Semua angka datang dari `snapshot` yang dihitung server (`lib/admin/snapshot.ts`).
   Komponen ini tidak menghitung ulang apa pun — kalau ia menghitung sendiri,
   layar dan CSV bisa berbeda.
   ────────────────────────────────────────────────────────────────────────── */

function Funnel({ snapshot }: { snapshot: AdminSnapshot }) {
  const registered = snapshot.funnel.stages[0]?.count ?? 0
  return (
    <AdminSection
      title="Corong Aktivasi 5 Tahap"
      description="Berapa user yang bertahan di setiap langkah. Tahap dengan angka berhenti terbesar adalah tempat perbaikan paling mendesak."
    >
      <ol className="space-y-3">
        {snapshot.funnel.stages.map((stage, index) => {
          const width = registered > 0 ? (stage.count / registered) * 100 : 0
          const leak = snapshot.funnel.biggestDrop?.id === stage.id
          return (
            <li key={stage.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[13px] font-medium text-forest">
                  <span className="mr-1.5 text-forest/40">{index + 1}.</span>
                  {stage.label}
                </p>
                <p className="text-[12px] text-forest/60">
                  <span className="font-semibold text-forest">{formatNumber(stage.count)}</span> user
                  {index > 0 && (
                    <span className="ml-1.5">
                      · {formatPercent(stage.conversionFromPrevious)} lanjut
                      {stage.droppedBefore > 0 && ` · ${formatNumber(stage.droppedBefore)} berhenti`}
                    </span>
                  )}
                </p>
              </div>
              <div className="mt-1.5">
                <AdminBar
                  percent={width}
                  tone={leak ? 'plum' : index === 4 ? 'mint' : 'forest'}
                  label={`${stage.label}: ${stage.count} user`}
                />
              </div>
            </li>
          )
        })}
      </ol>
      {snapshot.funnel.biggestDrop ? (
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-plum/10 px-3.5 py-3 text-[12px] leading-relaxed text-plum-deep">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Kebocoran terbesar ada di tahap <strong>{snapshot.funnel.biggestDrop.label}</strong>:{' '}
            {formatNumber(snapshot.funnel.biggestDrop.droppedBefore)} user berhenti tepat sebelumnya.
          </span>
        </p>
      ) : (
        <p className="mt-4 rounded-2xl bg-mint/15 px-3.5 py-3 text-[12px] text-forest/65">
          Belum ada kebocoran yang terukur — semua user di data ini lanjut ke tahap berikutnya.
        </p>
      )}
    </AdminSection>
  )
}

function FeatureTable({ snapshot }: { snapshot: AdminSnapshot }) {
  return (
    <AdminSection
      title="Peta Pemakaian Fitur"
      description="Berapa akun yang benar-benar memakai tiap fitur utama. Ini hitungan aktivitas, bukan isi catatan."
    >
      <ul className="space-y-3">
        {snapshot.featureAdoption.map((feature) => (
          <li key={feature.id}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[13px] font-medium text-forest">{feature.label}</p>
              <p className="text-[12px] text-forest/60">
                <span className="font-semibold text-forest">{formatNumber(feature.users)}</span> user ·{' '}
                {formatPercent(feature.sharePercent)}
              </p>
            </div>
            <div className="mt-1.5">
              <AdminBar
                percent={feature.sharePercent}
                tone={feature.users > 0 ? 'mint' : 'thistle'}
                label={`${feature.label}: ${feature.users} user`}
              />
            </div>
            <p className="mt-1 text-[11px] text-forest/45">{feature.hint}</p>
          </li>
        ))}
      </ul>
    </AdminSection>
  )
}

function PlanTable({ snapshot }: { snapshot: AdminSnapshot }) {
  return (
    <AdminSection
      title="Paket Berbayar yang Sedang Aktif"
      description="Hanya tiga paket yang ada di sistem: Catet Aja, Waras, Sultan. Kolom 30 hari = baris prabayar lama (produk yang dijual sekarang hanya akses selamanya). Akun yang belum membeli tidak disebut paket — dihitung terpisah di bawah."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-separate border-spacing-y-1 text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.12em] text-forest/45">
              <th className="px-2 pb-1 font-medium">Paket</th>
              <th className="px-2 pb-1 text-right font-medium">30 hari</th>
              <th className="px-2 pb-1 text-right font-medium">Selamanya</th>
              <th className="px-2 pb-1 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.plans.tiers.map((tier) => (
              <tr key={tier.planId} className="bg-sage/40">
                <td className="rounded-l-xl px-2 py-2 text-[13px] font-medium text-forest">
                  {tier.label}
                </td>
                <td className="px-2 py-2 text-right text-[13px] text-forest/70">
                  {formatNumber(tier.monthly)}
                </td>
                <td className="px-2 py-2 text-right text-[13px] text-forest/70">
                  {formatNumber(tier.lifetime)}
                </td>
                <td className="rounded-r-xl px-2 py-2 text-right text-[13px] font-semibold text-forest">
                  {formatNumber(tier.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <AdminPill tone="thistle">
          {formatNumber(snapshot.plans.withoutPlan)} akun belum berlangganan
        </AdminPill>
        <AdminPill tone="plum">
          {formatNumber(snapshot.plans.expired)} langganan tidak aktif
        </AdminPill>
        <AdminPill tone="forest">
          {formatNumber(snapshot.plans.totalAccounts)} akun terdaftar
        </AdminPill>
      </div>
    </AdminSection>
  )
}

export function AdminOverview({ snapshot }: { snapshot: AdminSnapshot }) {
  const growth = snapshot.growth
  const revenue = snapshot.revenue

  return (
    <div className="space-y-4">
      <AdminSection
        title="Pertumbuhan & Keaktifan User"
        description="Dihitung dari tanggal akun dibuat dan waktu masuk terakhir (`last_sign_in_at`) — bukan tebakan dari aktivitas lain."
      >
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <AdminStat label="Total akun" value={formatNumber(growth.users.total)} hint="terdaftar" tone="forest" />
          <AdminStat label="Daftar hari ini" value={formatNumber(growth.users.today)} hint="hari ini" tone="mint" />
          <AdminStat label="7 hari" value={formatNumber(growth.users.last7)} hint="pendaftar baru" tone="mint" />
          <AdminStat label="30 hari" value={formatNumber(growth.users.last30)} hint="pendaftar baru" tone="mint" />
          <AdminStat label="Aktif harian" value={formatNumber(growth.activeDaily)} hint="masuk ≤ 24 jam" tone="daisy" />
          <AdminStat label="Aktif bulanan" value={formatNumber(growth.activeMonthly)} hint="masuk ≤ 30 hari" tone="daisy" />
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <AdminPill tone="thistle">
            <Users className="size-3" aria-hidden /> {formatNumber(growth.activeWeekly)} aktif mingguan
          </AdminPill>
          <AdminPill tone="mint">
            <ShieldCheck className="size-3" aria-hidden />{' '}
            {formatNumber(growth.onboardingCompleted)} selesai onboarding
          </AdminPill>
        </div>
      </AdminSection>

      <AdminSection
        title="Pendapatan Bersih"
        description="Hanya transaksi LUNAS. Paket langganan dan pembelian kuota AI dipisah supaya terlihat dari mana uangnya datang."
      >
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStat
            label="Hari ini"
            value={formatIDR(revenue.total.today)}
            hint={`paket ${formatIDR(revenue.subscription.today)} · AI ${formatIDR(revenue.addon.today)}`}
            tone="mint"
          />
          <AdminStat
            label="Bulan ini"
            value={formatIDR(revenue.total.thisMonth)}
            hint={`paket ${formatIDR(revenue.subscription.thisMonth)} · AI ${formatIDR(revenue.addon.thisMonth)}`}
            tone="mint"
          />
          <AdminStat
            label="Sepanjang waktu"
            value={formatIDR(revenue.total.allTime)}
            hint={`paket ${formatIDR(revenue.subscription.allTime)} · AI ${formatIDR(revenue.addon.allTime)}`}
            tone="forest"
          />
          <AdminStat
            label="Rata-rata transaksi"
            value={formatIDR(revenue.averageTransaction)}
            hint={`${formatNumber(revenue.settledCount)} transaksi lunas`}
            tone="daisy"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AdminPill tone="mint">
            <TrendingUp className="size-3" aria-hidden /> Akun berbayar{' '}
            {formatPercent(revenue.paidAccountPercent)} dari total akun
          </AdminPill>
          <AdminPill tone="forest">
            <Crown className="size-3" aria-hidden /> {formatNumber(revenue.paidUsers)} akun punya paket
          </AdminPill>
          <AdminPill tone="thistle">
            <Wallet className="size-3" aria-hidden /> {formatNumber(revenue.totalUsers)} akun terdaftar
          </AdminPill>
        </div>
      </AdminSection>

      <div className="grid gap-4 xl:grid-cols-2">
        <Funnel snapshot={snapshot} />
        <FeatureTable snapshot={snapshot} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <PlanTable snapshot={snapshot} />
        <AdminSection
          title="Radar Masa Aktif Paket 30 Hari"
          description="Paket yang akan habis ≤ 7 hari lagi dan yang baru habis ≤ 14 hari lalu."
        >
          <div className="space-y-4">
            <div>
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-forest">
                <ArrowDownRight className="size-3.5" aria-hidden /> Akan habis (
                {formatNumber(snapshot.expiryRadar.expiringSoon.length)})
              </p>
              {snapshot.expiryRadar.expiringSoon.length === 0 ? (
                <p className="mt-1.5 text-[12px] text-forest/50">
                  Tidak ada paket yang mendekati habis.
                </p>
              ) : (
                <ul className="mt-1.5 space-y-1.5">
                  {snapshot.expiryRadar.expiringSoon.slice(0, 4).map((entry) => (
                    <li
                      key={entry.userId}
                      className="flex flex-wrap items-baseline justify-between gap-1 rounded-xl bg-sage/40 px-3 py-2"
                    >
                      <span className="min-w-0 truncate text-[12px] text-forest">
                        {entry.name || entry.email || entry.userId}
                      </span>
                      <span className="text-[11px] text-forest/60">
                        {entry.planLabel} · {daysLabel(entry.daysLeft)} · {formatDate(entry.expiresAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-[12px] font-semibold text-plum-deep">
                Baru habis ({formatNumber(snapshot.expiryRadar.expiredRecently.length)})
              </p>
              {snapshot.expiryRadar.expiredRecently.length === 0 ? (
                <p className="mt-1.5 text-[12px] text-forest/50">Tidak ada paket yang baru habis.</p>
              ) : (
                <ul className="mt-1.5 space-y-1.5">
                  {snapshot.expiryRadar.expiredRecently.slice(0, 4).map((entry) => (
                    <li
                      key={entry.userId}
                      className="flex flex-wrap items-baseline justify-between gap-1 rounded-xl bg-plum/10 px-3 py-2"
                    >
                      <span className="min-w-0 truncate text-[12px] text-forest">
                        {entry.name || entry.email || entry.userId}
                      </span>
                      <span className="text-[11px] text-plum-deep">
                        {entry.planLabel} · {daysLabel(entry.daysLeft)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </AdminSection>
      </div>

      <AdminSection title="Prinsip Privasi CatetInd">
        <p className="text-[12px] leading-relaxed text-forest/65">
          Halaman ini hanya menampilkan <strong>jumlah</strong> aktivitas per akun — berapa dompet dan
          berapa transaksi — tanpa pernah membuka deskripsi transaksi, kategori, catatan, nama dompet,
          atau saldo pribadi user. Nominal yang terlihat di tab Pembayaran adalah uang yang masuk ke
          CatetInd, bukan saldo dompet user.
        </p>
        {snapshot.limits.usersTruncated && (
          <div className="mt-3">
            <AdminPill tone="plum">
              <AlertTriangle className="size-3" aria-hidden /> Sebagian data menyentuh batas baca —
              angka bisa terpotong
            </AdminPill>
          </div>
        )}
        {snapshot.users.length === 0 && (
          <div className="mt-3">
            <AdminEmpty>Belum ada akun yang bisa ditampilkan dari backend ini.</AdminEmpty>
          </div>
        )}
      </AdminSection>
    </div>
  )
}



