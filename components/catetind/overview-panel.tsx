'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { BalanceRing } from './balance-ring'
import { IncomeCard } from './income-card'
import { cn } from '@/lib/utils'

export function OverviewPanel({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div
      className={cn('fixed inset-0 z-50', !open && 'pointer-events-none')}
      inert={!open}
      aria-hidden={!open}
    >
      {/* backdrop */}
      <button
        aria-label="Close overview"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-ink/50 transition-opacity duration-500 ease-out',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your Balance Overview"
        className={cn(
          'absolute inset-x-0 bottom-0 top-8 flex flex-col rounded-t-[2.25rem] bg-cream px-5 pb-6 pt-3 shadow-[0_-24px_60px_-24px_rgba(16,58,42,0.55)] ring-1 ring-black/5 transition-[transform,opacity] duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform lg:inset-x-auto lg:inset-y-3 lg:right-3 lg:w-[440px] lg:rounded-[2rem] lg:shadow-[-24px_0_60px_-24px_rgba(16,58,42,0.55)]',
          open
            ? 'translate-y-0 opacity-100 lg:translate-x-0'
            : 'translate-y-full opacity-0 lg:translate-y-0 lg:translate-x-[calc(100%+12px)]',
        )}
      >
        <div className="mx-auto h-1.5 w-10 rounded-full bg-ink/15" aria-hidden />

        <div className="mt-3 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold leading-tight tracking-tight text-ink">
              Your Balance
              <br />
              Overview
            </h2>
            <p className="mt-1 text-sm text-ink/50">
              Track spending, earnings, and insights
            </p>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-ink ring-1 ring-black/5 transition-colors hover:bg-sage"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-2 flex-1 overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div
            className={cn(
              'pt-4 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
              open ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
            )}
            style={{ transitionDelay: open ? '160ms' : '0ms' }}
          >
            <BalanceRing />
          </div>

          <div
            className={cn(
              'mt-8 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
              open ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
            )}
            style={{ transitionDelay: open ? '280ms' : '0ms' }}
          >
            <IncomeCard />
          </div>
        </div>
      </div>
    </div>
  )
}
