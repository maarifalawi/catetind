'use client'

import { CalendarClock, Clock } from 'lucide-react'
import type { AdminExpiryEntry, AdminSnapshot } from '@/lib/admin/types'
import {
  AdminBar,
  AdminEmpty,
  AdminList,
  AdminListRow,
  AdminMeta,
  AdminSection,
  daysLabel,
  formatDate,
  formatNumber,
  formatPercent,
} from './admin-ui'

/* ── TAB LANGGANAN: BAURAN PAKET + DUA DAFTAR YANG BISA DITINDAK ─────────────
   Menjawab dua pertanyaan pemilik: "paket apa yang sedang dipakai user?" dan
   "siapa yang harus segera dihubungi sebelum masa aktifnya habis?".

   Angka & daftar berasal dari snapshot server — layar ini tidak menghitung.
   PENTING: sistem ini TIDAK punya paket gratis. Yang ditampilkan hanya tiga
   paket berbayar (`PLANS`); akun tanpa langganan dihitung terpisah.

   Catatan paket (30 hari = baris prabayar lama) hidup di tooltip ⓘ judul —
   bukan paragraf 3 baris di atas daftar.
   ────────────────────────────────────────────────────────────────────────── */

function ExpiryList({
  entries,
  tone,
}: {
  entries: AdminExpiryEntry[]
  tone: 'cantelope' | 'plum'
}) {
  return (
    <AdminList>
      {entries.map((entry) => (
        <AdminListRow
          key={`${entry.userId}-${entry.expiresAt}`}
          left={
            <span className="flex items-center gap-1.5">
              {tone === 'cantelope' ? (
                <CalendarClock className="size-3 text-cantelope-deep" aria-hidden strokeWidth={1.8} />
              ) : (
                <Clock className="size-3 text-plum" aria-hidden strokeWidth={1.8} />
              )}
              <span className="truncate">{entry.name || entry.email || entry.userId}</span>
            </span>
          }
          meta={entry.email || 'tanpa email'}
          right={
            <span className="block text-[11.5px]">
              <span className="block text-forest/55">{entry.planLabel}</span>
              <span className={tone === 'plum' ? 'text-plum-deep' : 'text-cantelope-deep'}>
                {formatDate(entry.expiresAt)} · {daysLabel(entry.daysLeft)}
              </span>
            </span>
          }
        />
      ))}
    </AdminList>
  )
}

export function AdminPlansTab({ snapshot }: { snapshot: AdminSnapshot }) {
  const { tiers, withoutPlan, expired, totalAccounts } = snapshot.plans
  const lifetimeTotal = tiers.reduce((sum, tier) => sum + tier.lifetime, 0)
  const monthlyTotal = tiers.reduce((sum, tier) => sum + tier.monthly, 0)

  return (
    <div className="space-y-3">
      <AdminSection
        title="Paket"
        note="Kolom 30 hari = baris prabayar lama; produk yang dijual sekarang hanya akses selamanya. Persentase dihitung dari seluruh akun terdaftar."
      >
        <div className="space-y-3">
          {tiers.map((tier) => {
            const share = totalAccounts > 0 ? (tier.total / totalAccounts) * 100 : 0
            return (
              <div key={tier.planId}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[12.5px] font-medium text-forest">{tier.label}</p>
                  <p className="shrink-0 text-[11.5px] tabular-nums text-forest/50">
                    <span className="font-semibold text-forest">{formatNumber(tier.total)}</span> ·{' '}
                    {formatPercent(share)}
                    <span className="ml-1.5 text-forest/35">
                      ({formatNumber(tier.monthly)} 30 hr · {formatNumber(tier.lifetime)} selamanya)
                    </span>
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
          {formatNumber(lifetimeTotal)} akses selamanya · {formatNumber(monthlyTotal)} prabayar 30 hr ·
          belum berlangganan {formatNumber(withoutPlan)} · tidak aktif {formatNumber(expired)} ·{' '}
          {formatNumber(totalAccounts)} akun terdaftar
        </AdminMeta>
      </AdminSection>

      <div className="grid gap-3 xl:grid-cols-2">
        <AdminSection title="Mau habis" note="Masa aktif berakhir dalam 7 hari ke depan.">
          {snapshot.expiryRadar.expiringSoon.length === 0 ? (
            <AdminEmpty>Tidak ada.</AdminEmpty>
          ) : (
            <ExpiryList entries={snapshot.expiryRadar.expiringSoon} tone="cantelope" />
          )}
        </AdminSection>

        <AdminSection title="Baru habis" note="Masa aktif berakhir dalam 14 hari terakhir.">
          {snapshot.expiryRadar.expiredRecently.length === 0 ? (
            <AdminEmpty>Tidak ada.</AdminEmpty>
          ) : (
            <ExpiryList entries={snapshot.expiryRadar.expiredRecently} tone="plum" />
          )}
        </AdminSection>
      </div>
    </div>
  )
}
