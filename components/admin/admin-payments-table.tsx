'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, RefreshCw, Wrench } from 'lucide-react'
import { formatIDR, planById } from '@/lib/data/pricing'
import { matchesPaymentFilter, paymentStatusGroup } from '@/lib/admin/filters'
import type {
  AdminAbandonedCheckout,
  AdminMismatch,
  AdminPaymentSummary,
  AdminPaymentView,
} from '@/lib/admin/types'
import { cn } from '@/lib/utils'
import { postAdminAction, postAdminSync } from './admin-api'
import {
  ADMIN_PRIMARY_BUTTON,
  ADMIN_SMALL_BUTTON,
  AdminEmpty,
  AdminMeta,
  AdminPill,
  AdminSection,
  AdminStat,
  formatDateTime,
  formatNumber,
} from './admin-ui'

/* ── TAB PEMBAYARAN: UANG MASUK → YANG PERLU DICEK → RIWAYAT ─────────────────
   Urutan blok mengikuti keputusan yang diambil pemilik:

     1. empat angka kunci (lunas, menggantung, gagal, semua transaksi) + metode;
     2. dua daftar yang bisa ditindak SEKARANG (salah sinkron, checkout
        menggantung) — hanya dirender kalau ada isinya;
     3. riwayat transaksi 5 kolom.

   Nominal di sini adalah nominal PEMBELIAN ke CatetInd, bukan saldo user.
   Kalimat penjelas yang dulu menempel di tiap kotak sekarang jadi tooltip ⓘ.
   ────────────────────────────────────────────────────────────────────────── */

const STATUS_FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: 'paid', label: 'Lunas' },
  { id: 'pending', label: 'Menggantung' },
  { id: 'failed', label: 'Gagal' },
] as const

type StatusFilterId = (typeof STATUS_FILTERS)[number]['id']

function statusPill(status: string) {
  const group = paymentStatusGroup(status)
  if (group === 'paid') return <AdminPill tone="mint">lunas</AdminPill>
  if (group === 'pending') return <AdminPill tone="daisy">menggantung</AdminPill>
  return <AdminPill tone="plum">gagal</AdminPill>
}

function purposeLabel(payment: AdminPaymentView): string {
  if (payment.purpose === 'topup') return 'Kuota AI'
  const plan = planById(payment.planId)
  return plan?.name ?? payment.tierName ?? 'Paket'
}

function SyncButton({
  orderId,
  busy,
  onRun,
  label = 'Cek Midtrans',
}: {
  orderId: string
  busy: string | null
  onRun: (orderId: string) => void
  label?: string
}) {
  return (
    <button
      type="button"
      disabled={busy !== null}
      onClick={() => onRun(orderId)}
      className={ADMIN_SMALL_BUTTON}
      title={label}
      aria-label={label}
    >
      <RefreshCw
        className={cn('size-3', busy === orderId && 'animate-spin')}
        aria-hidden
        strokeWidth={1.8}
      />
      <span className="hidden sm:inline">{busy === orderId ? 'Memeriksa…' : label}</span>
    </button>
  )
}

export function AdminPaymentsTable({
  payments,
  summary,
  abandoned,
  mismatches,
}: {
  payments: AdminPaymentView[]
  summary: AdminPaymentSummary
  abandoned: AdminAbandonedCheckout[]
  mismatches: AdminMismatch[]
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<StatusFilterId>('all')
  const [busy, setBusy] = useState<string | null>(null)

  const rows = useMemo(
    () => payments.filter((payment) => matchesPaymentFilter(payment, filter)),
    [payments, filter],
  )

  async function sync(orderId: string) {
    setBusy(orderId)
    const result = await postAdminSync(orderId)
    setBusy(null)
    if (result.ok) {
      toast.success(result.message)
      router.refresh()
    } else {
      toast.error(result.message)
    }
  }

  async function repair(userId: string) {
    setBusy(`repair-${userId}`)
    const result = await postAdminAction({ action: 'repair-plan', userId })
    setBusy(null)
    if (result.ok) {
      toast.success(result.message)
      router.refresh()
    } else {
      toast.error(result.message)
    }
  }

  const shown = rows.slice(0, 200)

  return (
    <div className="space-y-3">
      <AdminSection>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <AdminStat
            label="Lunas"
            value={formatNumber(summary.settledCount)}
            hint={formatIDR(summary.settledAmount)}
          />
          <AdminStat
            label="Menggantung"
            value={formatNumber(summary.counts.pending)}
            hint="belum dibayar"
          />
          <AdminStat
            label="Gagal"
            value={formatNumber(summary.counts.failed)}
            hint="kedaluwarsa / batal"
          />
          <AdminStat
            label="Semua transaksi"
            value={formatNumber(summary.counts.all)}
            hint="seluruh status"
          />
        </div>
        {summary.byMethod.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-soil/[0.06] pt-3">
            {summary.byMethod.slice(0, 6).map((method) => (
              <span
                key={method.method}
                className="inline-flex items-center gap-1 rounded-full bg-sage/50 px-2 py-0.5 text-[10.5px] tabular-nums text-forest/60"
                title={formatIDR(method.amount)}
              >
                {method.label}
                <span className="font-semibold text-forest">{formatNumber(method.count)}</span>
              </span>
            ))}
          </div>
        )}
      </AdminSection>

      {(mismatches.length > 0 || abandoned.length > 0) && (
        <div className="grid gap-3 xl:grid-cols-2">
          {mismatches.length > 0 && (
            <AdminSection
              title="Perlu dicek"
              note="Pembayaran sudah lunas, tetapi paket di akun belum aktif atau belum sesuai. Perbaikan menyalin hak akses dari baris pembelian yang lunas."
            >
              <ul className="divide-y divide-soil/[0.06]">
                {mismatches.slice(0, 5).map((entry) => (
                  <li key={entry.userId} className="py-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="flex min-w-0 items-center gap-1.5 text-[12.5px] font-medium text-forest">
                        <AlertTriangle
                          className="size-3 shrink-0 text-plum"
                          aria-hidden
                          strokeWidth={2}
                        />
                        <span className="truncate">{entry.name || entry.email || entry.userId}</span>
                      </p>
                      <AdminPill tone="plum">{entry.reason}</AdminPill>
                    </div>
                    <p
                      className="mt-0.5 truncate text-[10.5px] tabular-nums text-forest/45"
                      title={entry.detail}
                    >
                      {entry.orderId} · dibayar {formatDateTime(entry.paidAt)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void repair(entry.userId)}
                        className={ADMIN_PRIMARY_BUTTON}
                      >
                        <Wrench className="size-3" aria-hidden strokeWidth={2} />
                        {busy === `repair-${entry.userId}` ? 'Memperbaiki…' : 'Perbaiki'}
                      </button>
                      <SyncButton orderId={entry.orderId} busy={busy} onRun={(id) => void sync(id)} />
                    </div>
                  </li>
                ))}
              </ul>
              {mismatches.length > 5 && (
                <AdminMeta className="mt-2">
                  +{formatNumber(mismatches.length - 5)} lainnya
                </AdminMeta>
              )}
            </AdminSection>
          )}

          {abandoned.length > 0 && (
            <AdminSection
              title="Checkout menggantung"
              note="Sudah mencoba membeli paket, pembayarannya belum lunas atau tagihannya mati, dan akun belum punya paket aktif."
            >
              <ul className="divide-y divide-soil/[0.06]">
                {abandoned.slice(0, 5).map((entry) => (
                  <li
                    key={`${entry.userId}-${entry.orderId}`}
                    className="flex items-center justify-between gap-2 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-forest">
                        {entry.name || entry.email || entry.userId}
                      </p>
                      <p className="truncate text-[10.5px] tabular-nums text-forest/45">
                        {formatIDR(entry.amount)} · {entry.status} · {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                    <SyncButton orderId={entry.orderId} busy={busy} onRun={(id) => void sync(id)} />
                  </li>
                ))}
              </ul>
              {abandoned.length > 5 && (
                <AdminMeta className="mt-2">
                  +{formatNumber(abandoned.length - 5)} lainnya
                </AdminMeta>
              )}
            </AdminSection>
          )}
        </div>
      )}

      <AdminSection
        title="Transaksi"
        note="Tombol di setiap baris menanyakan status terbaru ke Midtrans dan langsung mengaktifkan akses bila sudah lunas."
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((item) => {
            const active = filter === item.id
            const count = item.id === 'all' ? summary.counts.all : summary.counts[item.id]
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                aria-pressed={active}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                  active
                    ? 'bg-forest text-cream'
                    : 'bg-sage/50 text-forest/60 hover:bg-sage hover:text-forest',
                )}
              >
                {item.label}
                <span
                  className={cn(
                    'text-[10px] tabular-nums',
                    active ? 'text-cream/70' : 'text-forest/35',
                  )}
                >
                  {formatNumber(count)}
                </span>
              </button>
            )
          })}
          <AdminMeta className="ml-auto">
            {formatNumber(shown.length)} / {formatNumber(rows.length)}
          </AdminMeta>
        </div>

        {rows.length === 0 ? (
          <div className="mt-3">
            <AdminEmpty>Tidak ada transaksi.</AdminEmpty>
          </div>
        ) : (
          <div className="-mx-1 mt-2 overflow-x-auto px-1">
            <table className="w-full min-w-[680px] border-separate border-spacing-y-1 text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.12em] text-forest/40">
                  <th className="px-2 pb-1 font-medium">User</th>
                  <th className="px-2 pb-1 font-medium">Tanggal</th>
                  <th className="px-2 pb-1 font-medium">Status</th>
                  <th className="px-2 pb-1 text-right font-medium">Nominal</th>
                  <th className="px-2 pb-1 text-right font-medium">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((payment) => (
                  <tr key={payment.orderId} className="bg-sage/25 align-top">
                    <td className="max-w-[240px] rounded-l-xl px-2 py-2">
                      <p className="truncate text-[12.5px] font-medium text-forest">
                        {payment.name || 'Tanpa nama'}
                      </p>
                      <p className="truncate text-[10.5px] text-forest/45">{payment.email || '—'}</p>
                    </td>
                    <td className="px-2 py-2 text-[11.5px] tabular-nums text-forest/55">
                      {formatDateTime(payment.paidAt ?? payment.createdAt)}
                    </td>
                    <td className="px-2 py-2" title={payment.status}>
                      {statusPill(payment.status)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <p className="text-[12px] font-semibold tabular-nums text-forest">
                        {formatIDR(payment.amount)}
                      </p>
                      <p className="truncate text-[10.5px] text-forest/45">
                        {purposeLabel(payment)} · {payment.methodLabel}
                      </p>
                    </td>
                    <td className="rounded-r-xl px-2 py-2 text-right">
                      <SyncButton
                        orderId={payment.orderId}
                        busy={busy}
                        onRun={(id) => void sync(id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

    </div>
  )
}
