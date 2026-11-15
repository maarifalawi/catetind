'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { maskMoney, isBillCompleted, type Bill } from '@/lib/data/bills'

/* ── RINGKASAN TAGIHAN — SATU BARIS TIPIS ─────────────────────────────────────
   Redesain "ultra-compact": satu kartu setipis mungkin yang hanya membawa tiga
   fakta — total tagihan bulan ini, jumlah lunas, jumlah belum lunas — plus
   bilah progres ramping. Cincin persentase dan baris penjelasan panjang
   dicabut karena angka yang sama sudah dibaca dari tempat lain.

   Palet: Evergreen untuk progres, Olive saat semua lunas. Tidak ada hex baru. */

export function BillsOverview({
  bills,
  masked,
  currentDay,
  daysInMonth = 31,
  className,
}: {
  bills: Bill[]
  masked: boolean
  /** hari berjalan — dipertahankan demi pemanggil lama (status telat pindah ke pil) */
  currentDay: number
  /** hari terakhir bulan berjalan — dipertahankan demi pemanggil lama */
  daysInMonth?: number
  className?: string
}) {
  void currentDay
  void daysInMonth

  const total = bills.reduce((sum, bill) => sum + bill.amount, 0)
  const paidBills = bills.filter((bill) => bill.isPaidThisMonth || isBillCompleted(bill))
  const paidAmount = paidBills.reduce((sum, bill) => sum + bill.amount, 0)
  const unpaidCount = Math.max(0, bills.length - paidBills.length)
  const allPaid = bills.length > 0 && unpaidCount === 0
  const progress = total > 0 ? Math.min(100, (paidAmount / total) * 100) : 0

  return (
    <section
      aria-label="Ringkasan tagihan bulan ini"
      data-catetind-ringkasan="tagihan"
      className={cn(
        'flex items-center gap-4 rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/10',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-forest-muted">
          Total bulan ini
        </p>
        <p className="mt-0.5 font-display text-[22px] font-semibold leading-none tracking-tight tabular-nums text-forest">
          {maskMoney(total, masked)}
        </p>
        <div
          role="progressbar"
          aria-label="Nominal tagihan yang sudah dibayar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-2 h-1 w-full overflow-hidden rounded-full bg-soil/[0.07]"
        >
          <motion.span
            className={cn(
              'block h-full rounded-full',
              progress > 0 && 'min-w-[4px]',
              allPaid ? 'bg-hud-sage' : 'bg-forest',
            )}
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 text-[12px] font-medium tabular-nums">
        <span className="rounded-full bg-hud-sage/25 px-2 py-1 text-forest">
          Lunas {paidBills.length}
        </span>
        <span
          className={cn(
            'rounded-full px-2 py-1',
            unpaidCount > 0 ? 'bg-hud-amber/25 text-hud-terracotta' : 'bg-sage/60 text-forest-muted',
          )}
        >
          Belum {unpaidCount}
        </span>
      </div>
    </section>
  )
}
