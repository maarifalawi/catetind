'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, CreditCard, RefreshCw, ShoppingCart, Wrench } from 'lucide-react'
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
  AdminEmpty,
  AdminPill,
  AdminSection,
  formatDateTime,
  formatNumber,
} from './admin-ui'

/* ── TAB PEMBAYARAN: MIDTRANS, CHECKOUT MENGGANTUNG, SALAH SINKRON ───────────
   Tiga hal yang dilihat pemilik di sini:

     1. Seluruh transaksi + metode yang paling banyak dipakai (uang masuk);
     2. User yang sudah mencoba membeli tetapi belum lunas / tagihannya mati;
     3. Pembayaran lunas yang hak aksesnya belum sesuai — dengan tombol
        perbaikan satu klik.

   Nominal di sini adalah nominal PEMBELIAN ke CatetInd, bukan saldo user.
   ────────────────────────────────────────────────────────────────────────── */

const STATUS_FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: 'paid', label: 'Lunas' },
  { id: 'pending', label: 'Menggantung' },
  { id: 'failed', label: 'Kedaluwarsa / batal' },
] as const

type StatusFilterId = (typeof STATUS_FILTERS)[number]['id']

function statusPill(status: string) {
  const group = paymentStatusGroup(status)
  if (group === 'paid') return <AdminPill tone="mint">lunas</AdminPill>
  if (group === 'pending') return <AdminPill tone="daisy">menggantung</AdminPill>
  return <AdminPill tone="plum">gagal / kedaluwarsa</AdminPill>
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
      className="inline-flex items-center gap-1.5 rounded-full bg-cream px-2.5 py-1.5 text-[11px] font-semibold text-forest ring-1 ring-soil/15 transition-colors hover:bg-sage disabled:cursor-not-allowed disabled:text-forest/35"
    >
      <RefreshCw className={cn('size-3', busy === orderId && 'animate-spin')} aria-hidden />
      {busy === orderId ? 'Memeriksa…' : label}
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

  return (
    <div className="space-y-4">
      <AdminSection
        title="Metode Pembayaran"
        description="Metode yang benar-benar dipakai pada transaksi LUNAS. Transaksi yang tidak pernah dibayar tidak dihitung."
      >
        {summary.byMethod.length === 0 ? (
          <AdminEmpty>Belum ada transaksi lunas yang tercatat.</AdminEmpty>
        ) : (
          <ul className="space-y-2">
            {summary.byMethod.slice(0, 6).map((method) => (
              <li
                key={method.method}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sage/40 px-3 py-2"
              >
                <span className="flex items-center gap-2 text-[12px] font-medium text-forest">
                  <CreditCard className="size-3.5 text-forest/50" aria-hidden />
                  {method.label}
                </span>
                <span className="text-[11px] text-forest/60">
                  {formatNumber(method.count)} transaksi · {formatIDR(method.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <AdminPill tone="mint">{formatNumber(summary.settledCount)} lunas</AdminPill>
          <AdminPill tone="daisy">{formatNumber(summary.counts.pending)} menggantung</AdminPill>
          <AdminPill tone="plum">{formatNumber(summary.counts.failed)} kedaluwarsa/batal</AdminPill>
        </div>
      </AdminSection>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminSection
          title="Radar Checkout Menggantung"
          description="Sudah mencoba membeli paket, pembayarannya belum lunas atau tagihannya mati, dan akun belum punya paket aktif."
        >
          {abandoned.length === 0 ? (
            <AdminEmpty>Tidak ada checkout menggantung saat ini.</AdminEmpty>
          ) : (
            <ul className="space-y-2">
              {abandoned.slice(0, 8).map((entry) => (
                <li key={`${entry.userId}-${entry.orderId}`} className="rounded-xl bg-sage/40 px-3 py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-1">
                    <span className="flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-forest">
                      <ShoppingCart className="size-3.5 shrink-0 text-forest/45" aria-hidden />
                      <span className="truncate">{entry.name || entry.email || entry.userId}</span>
                    </span>
                    <span className="text-[11px] text-forest/60">{formatIDR(entry.amount)}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-forest/55">
                      {entry.email || 'tanpa email'} · {entry.status} · {formatDateTime(entry.createdAt)}
                    </p>
                    <SyncButton orderId={entry.orderId} busy={busy} onRun={(id) => void sync(id)} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>

        <AdminSection
          title="Detektor Salah Sinkron"
          description="Pembayaran sudah LUNAS, tetapi paket di akun belum aktif atau belum sesuai. Perbaikan menyalin hak akses dari baris pembelian yang lunas."
        >
          {mismatches.length === 0 ? (
            <AdminEmpty>
              Tidak ada ketidakcocokan hak akses. Semua pembayaran lunas sudah sinkron.
            </AdminEmpty>
          ) : (
            <ul className="space-y-2">
              {mismatches.slice(0, 8).map((entry) => (
                <li key={entry.userId} className="rounded-xl bg-plum/10 px-3 py-2.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-1">
                    <span className="flex min-w-0 items-center gap-1.5 text-[12px] font-semibold text-forest">
                      <AlertTriangle className="size-3.5 shrink-0 text-plum" aria-hidden />
                      <span className="truncate">{entry.name || entry.email || entry.userId}</span>
                    </span>
                    <AdminPill tone="plum">{entry.reason}</AdminPill>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-forest/65">{entry.detail}</p>
                  <p className="mt-1 text-[10px] text-forest/45">
                    Order {entry.orderId} · dibayar {formatDateTime(entry.paidAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void repair(entry.userId)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-forest px-2.5 py-1.5 text-[11px] font-semibold text-cream transition-colors hover:bg-forest-soft disabled:cursor-not-allowed disabled:bg-ink/[0.07] disabled:text-forest/35"
                    >
                      <Wrench className="size-3" aria-hidden />
                      {busy === `repair-${entry.userId}` ? 'Memperbaiki…' : 'Perbaiki hak akses'}
                    </button>
                    <SyncButton
                      orderId={entry.orderId}
                      busy={busy}
                      onRun={(id) => void sync(id)}
                      label="Cek & sinkron Midtrans"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>
      </div>

      <AdminSection
        title="Riwayat Transaksi Pembayaran"
        description="Semua transaksi Midtrans. Tombol di setiap baris menanyakan status terbaru ke Midtrans dan langsung mengaktifkan akses bila sudah lunas."
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((item) => {
            const active = filter === item.id
            const count =
              item.id === 'all' ? summary.counts.all : summary.counts[item.id]
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
                  {formatNumber(count)}
                </span>
              </button>
            )
          })}
        </div>

        {rows.length === 0 ? (
          <div className="mt-3">
            <AdminEmpty>Tidak ada transaksi pada filter ini.</AdminEmpty>
          </div>
        ) : (
          <div className="-mx-1 mt-3 overflow-x-auto px-1">
            <table className="w-full min-w-[900px] border-separate border-spacing-y-1.5 text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.12em] text-forest/45">
                  <th className="px-2 pb-1 font-medium">User</th>
                  <th className="px-2 pb-1 font-medium">Order</th>
                  <th className="px-2 pb-1 font-medium">Tanggal</th>
                  <th className="px-2 pb-1 font-medium">Status</th>
                  <th className="px-2 pb-1 font-medium">Metode</th>
                  <th className="px-2 pb-1 font-medium">Tujuan</th>
                  <th className="px-2 pb-1 text-right font-medium">Nominal</th>
                  <th className="px-2 pb-1 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 200).map((payment) => (
                  <tr key={payment.orderId} className="bg-sage/30 align-top">
                    <td className="max-w-[200px] rounded-l-xl px-2 py-2.5">
                      <p className="truncate text-[12px] font-medium text-forest">
                        {payment.name || 'Tanpa nama'}
                      </p>
                      <p className="truncate text-[11px] text-forest/55">{payment.email || '—'}</p>
                    </td>
                    <td className="max-w-[180px] px-2 py-2.5">
                      <p className="truncate text-[11px] text-forest/65" title={payment.orderId}>
                        {payment.orderId}
                      </p>
                    </td>
                    <td className="px-2 py-2.5 text-[11px] text-forest/65">
                      {formatDateTime(payment.paidAt ?? payment.createdAt)}
                    </td>
                    <td className="px-2 py-2.5">
                      {statusPill(payment.status)}
                      <p className="mt-1 text-[10px] text-forest/45">{payment.status}</p>
                    </td>
                    <td className="px-2 py-2.5 text-[12px] text-forest/65">{payment.methodLabel}</td>
                    <td className="px-2 py-2.5 text-[12px] text-forest/65">{purposeLabel(payment)}</td>
                    <td className="px-2 py-2.5 text-right text-[12px] font-semibold text-forest">
                      {formatIDR(payment.amount)}
                    </td>
                    <td className="rounded-r-xl px-2 py-2.5 text-right">
                      <SyncButton orderId={payment.orderId} busy={busy} onRun={(id) => void sync(id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > 200 && (
          <p className="mt-2 text-[11px] text-forest/50">
            Menampilkan 200 transaksi terbaru. Unduh CSV untuk daftar lengkap.
          </p>
        )}
      </AdminSection>
    </div>
  )
}

