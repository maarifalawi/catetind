'use client'

import { CalendarClock, Clock, Crown, Infinity as InfinityIcon } from 'lucide-react'
import type { AdminSnapshot } from '@/lib/admin/types'
import {
  AdminBar,
  AdminEmpty,
  AdminPill,
  AdminSection,
  daysLabel,
  formatDate,
  formatNumber,
  formatPercent,
} from './admin-ui'

/* ── TAB LANGGANAN: RINCIAN PAKET + RADAR MASA AKTIF ─────────────────────────
   Menjawab dua pertanyaan pemilik: "paket apa yang sedang dipakai user?" dan
   "siapa yang harus segera dihubungi sebelum masa aktifnya habis?".
   Angka & daftar berasal dari snapshot server — layar ini tidak menghitung.

   PENTING: sistem ini TIDAK punya paket gratis. Yang ditampilkan hanya tiga
   paket berbayar (`PLANS`). Akun tanpa langganan dihitung terpisah sebagai
   "belum berlangganan", bukan sebagai sebuah paket.
   ────────────────────────────────────────────────────────────────────────── */

export function AdminPlansTab({ snapshot }: { snapshot: AdminSnapshot }) {
  const { tiers, withoutPlan, expired, totalAccounts } = snapshot.plans
  const lifetimeTotal = tiers.reduce((sum, tier) => sum + tier.lifetime, 0)
  const monthlyTotal = tiers.reduce((sum, tier) => sum + tier.monthly, 0)

  return (
    <div className="space-y-4">
      <AdminSection
        title="Rincian Paket Berbayar"
        description="Hanya paket yang benar-benar ada di sistem: Catet Aja, Waras, Sultan. Kolom 30 hari = baris prabayar lama; produk yang dijual sekarang hanya akses selamanya. Persentase dihitung dari seluruh akun terdaftar."
      >
        <div className="space-y-3">
          {tiers.map((tier) => {
            const share = totalAccounts > 0 ? (tier.total / totalAccounts) * 100 : 0
            return (
              <div key={tier.planId}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[13px] font-medium text-forest">
                    <Crown className="size-3.5 text-daisy-deep" aria-hidden />
                    {tier.label}
                  </p>
                  <p className="text-[12px] text-forest/60">
                    <span className="font-semibold text-forest">{formatNumber(tier.total)}</span> user ·{' '}
                    {formatPercent(share)} dari {formatNumber(totalAccounts)} akun
                    <span className="ml-1.5">
                      ({formatNumber(tier.monthly)} bulanan · {formatNumber(tier.lifetime)} selamanya)
                    </span>
                  </p>
                </div>
                <div className="mt-1.5">
                  <AdminBar
                    percent={share}
                    tone={tier.lifetime > 0 ? 'mint' : 'forest'}
                    label={`${tier.label}: ${tier.total} user`}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <AdminPill tone="mint">
            <InfinityIcon className="size-3" aria-hidden /> {formatNumber(lifetimeTotal)} akses selamanya
          </AdminPill>
          <AdminPill tone="forest">{formatNumber(monthlyTotal)} prabayar 30 hari</AdminPill>
          <AdminPill tone="thistle">{formatNumber(withoutPlan)} belum berlangganan</AdminPill>
          <AdminPill tone="plum">{formatNumber(expired)} langganan tidak aktif</AdminPill>
          <AdminPill tone="forest">{formatNumber(totalAccounts)} akun terdaftar</AdminPill>
        </div>
      </AdminSection>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminSection
          title="Radar Paket Mau Habis (7 hari)"
          description="Paket bulanan yang masa aktifnya berakhir dalam 7 hari ke depan. Waktu yang tepat untuk mengingatkan perpanjangan."
        >
          {snapshot.expiryRadar.expiringSoon.length === 0 ? (
            <AdminEmpty>Tidak ada paket yang mendekati habis.</AdminEmpty>
          ) : (
            <ul className="space-y-2">
              {snapshot.expiryRadar.expiringSoon.map((entry) => (
                <li
                  key={entry.userId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sage/40 px-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-medium text-forest">
                      {entry.name || entry.email || entry.userId}
                    </span>
                    <span className="block truncate text-[11px] text-forest/55">
                      {entry.email || 'tanpa email'}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-[11px] text-forest/65">
                    <CalendarClock className="size-3.5 text-cantelope-deep" aria-hidden />
                    {entry.planLabel} · {formatDate(entry.expiresAt)} · {daysLabel(entry.daysLeft)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>

        <AdminSection
          title="Baru Habis (14 hari terakhir)"
          description="Paket bulanan yang baru saja berakhir. Berguna untuk melihat retensi perpanjangan dan menghubungi yang belum kembali."
        >
          {snapshot.expiryRadar.expiredRecently.length === 0 ? (
            <AdminEmpty>Tidak ada paket yang baru habis.</AdminEmpty>
          ) : (
            <ul className="space-y-2">
              {snapshot.expiryRadar.expiredRecently.map((entry) => (
                <li
                  key={entry.userId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-plum/10 px-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-medium text-forest">
                      {entry.name || entry.email || entry.userId}
                    </span>
                    <span className="block truncate text-[11px] text-forest/55">
                      {entry.email || 'tanpa email'}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-[11px] text-plum-deep">
                    <Clock className="size-3.5" aria-hidden />
                    {entry.planLabel} · {formatDate(entry.expiresAt)} · {daysLabel(entry.daysLeft)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>
      </div>
    </div>
  )
}
