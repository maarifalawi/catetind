'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Wallet, X } from 'lucide-react'
import { BalanceRing } from './balance-ring'
import { IncomeCard } from './income-card'
import { cn } from '@/lib/utils'
import type { DeckSelection } from '@/lib/wallets'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import {
  isRowRemoved,
  recordedTransactions,
  toHistoryTransaction,
  useMoneyStore,
} from '@/lib/money/store'
import { homeMoneyRowFrom, incomeStatsFor, netFlowChangePct } from '@/lib/data/home-money'
import { useTodayISO } from '@/lib/use-today-iso'
import { OVERVIEW_PANEL_COPY } from '@/lib/data/home'

export function OverviewPanel({
  open,
  onClose,
  selection,
  allTotal = 0,
}: {
  open: boolean
  onClose: () => void
  /**
   * Kartu yang dipencet user di deck dompet. Isi panel MENGIKUTI kartu ini —
   * kartu BCA → detail BCA, kartu GoPay → detail GoPay — bukan selalu total
   * gabungan semua dompet.
   */
  selection?: DeckSelection
  /**
   * Total Saldo SELURUH dompet (`cashTotal()`) — dipakai sebagai cadangan saat
   * panel belum punya pilihan kartu. Sebelum paket 44 cadangannya `0`, sehingga
   * satu kondisi balapan kecil (panel terbuka sebelum kartu depan terpilih)
   * menampilkan donat Rp 0 — angka yang tidak pernah benar.
   */
  allTotal?: number
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const snapshot = useMoneyStore()
  const today = useTodayISO()

  /* Baris dompet yang sedang dibuka (PURE dompet itu). Dipakai kartu Pemasukan &
     badge tren donat supaya dua-duanya mustahil bercerita beda. */
  const rows = useMemo(() => {
    const walletId = selection?.type === 'wallet' ? selection.wallet.id : null
    const txs = walletId
      ? snapshot.rows
          .filter((row) => !isRowRemoved(snapshot, row.id) && row.walletId === walletId)
          .map(toHistoryTransaction)
      : recordedTransactions(snapshot)
    return txs.map(homeMoneyRowFrom)
  }, [snapshot, selection])
  const income = useMemo(() => incomeStatsFor(rows, today), [rows, today])
  const trendPct = useMemo(() => netFlowChangePct(rows, today), [rows, today])

  /* saldo + label yang tampil di donat, diturunkan dari kartu yang dipencet */
  const ring =
    selection?.type === 'wallet'
      ? {
          amount: selection.wallet.balance,
          caption: selection.wallet.name,
          subtitle: `${selection.wallet.network} · ${selection.wallet.number}`,
        }
      : {
          amount: selection?.total ?? allTotal,
          caption: 'Total saldo',
          subtitle: OVERVIEW_PANEL_COPY.subtitle,
        }

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // kunci scroll background selama panel terbuka — mobile saja; di desktop
  // panel jadi dialog di tengah, scroll konten utama tetap diizinkan
  useBodyScrollLock(open, true)

  return (
    <div
      className={cn(
        'fixed inset-0 z-[70] flex items-end justify-center lg:items-center lg:p-4',
        !open && 'pointer-events-none',
      )}
      inert={!open}
      aria-hidden={!open}
    >
      {/* backdrop */}
      <button
        aria-label={OVERVIEW_PANEL_COPY.closeLabel}
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-ink/50 transition-opacity duration-500 ease-out',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* panel — bottom sheet di mobile, dialog di TENGAH layar di desktop
          (sebelumnya menempel di sisi kanan; sekarang konsisten dengan sheet lain) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={OVERVIEW_PANEL_COPY.title}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col rounded-t-[2.25rem] bg-cream px-5 pb-7 pt-3 shadow-[0_-24px_60px_-24px_rgba(69,89,78,0.55)] ring-1 ring-soil/12 transition-[transform,opacity] duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform lg:max-h-[88vh] lg:w-[512px] lg:rounded-[2rem] lg:px-7 lg:pb-8 lg:pt-4 lg:shadow-[0_24px_60px_-24px_rgba(69,89,78,0.55)]',
          open ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
        )}
      >
        <div className="mx-auto h-1.5 w-10 rounded-full bg-ink/15" aria-hidden />

        <div className="mt-3 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-medium leading-tight tracking-tight text-forest">
              {OVERVIEW_PANEL_COPY.title}
            </h2>
            <p className="mt-1 text-sm text-forest/50">{ring.subtitle}</p>
            {/* penanda kartu mana yang sedang ditampilkan — panel ini mengikuti
                kartu yang dipencet user di deck dompet */}
            <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-sage/70 px-2.5 py-1 text-[11px] font-medium text-forest ring-1 ring-forest/10">
              <Wallet className="size-3.5" strokeWidth={2.2} />
              {selection?.type === 'wallet'
                ? OVERVIEW_PANEL_COPY.badgeWallet(selection.wallet.name)
                : OVERVIEW_PANEL_COPY.badgeAll}
            </span>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label={OVERVIEW_PANEL_COPY.closeLabel}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-soil/12 transition-colors hover:bg-sage"
          >
            <X className="size-4" />
          </button>
        </div>

        <div
          data-lenis-prevent
          className="mt-2 flex-1 overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div
            className={cn(
              'pt-4 transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
              open ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
            )}
            style={{ transitionDelay: open ? '160ms' : '0ms' }}
          >
            <BalanceRing
              amount={ring.amount}
              caption={ring.caption}
              trend={trendPct === null ? undefined : `${trendPct > 0 ? '+' : ''}${trendPct}%`}
            />
          </div>

          <div
            className={cn(
              'mt-8 transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
              open ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
            )}
            style={{ transitionDelay: open ? '280ms' : '0ms' }}
          >
            <IncomeCard stats={income} />
          </div>
        </div>
      </div>
    </div>
  )
}
