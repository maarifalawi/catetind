'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getBillStatus, maskMoney, type Bill } from '@/lib/data/bills'
import { ProgressRing } from './progress-ring'

/* ── RINGKASAN TAGIHAN — HANYA TIGA HAL ──────────────────────────────────────
   Kartu ini sengaja miskin fitur: nominal yang belum dibayar, satu cincin
   persentase, satu bar progres, dan satu baris status.

   Yang DICABUT (redesain halaman Tagihan):
     · "Gaji terpakai" / Waterfall Gaji — porsi pemasukan adalah cerita
       Dashboard & Budget, bukan halaman tagihan. Ia memaksa user membandingkan
       dua ukuran uang sekaligus di kartu yang seharusnya bicara satu angka.
     · Baris "Dibayar Rp X" — progres sudah dibawa bar + cincin; mengulanginya
       sebagai nominal hanya menambah angka untuk dibaca.

   Warna tetap palet kanon: Evergreen (`forest`) untuk progres, Olive
   (`hud-sage`) saat semua lunas, Plum (`hud-terracotta`) saat ada yang telat.
   `ProgressRing` butuh warna hex (bukan kelas), jadi tiga nilai di bawah
   adalah token palet yang sama — ditulis sekali di sini, bukan hex baru. */

/** Evergreen `--color-forest` */
const FOREST_HEX = '#45594e'
/** Olive `--color-hud-sage` */
const OLIVE_HEX = '#b5b987'
/** Plum `--color-hud-terracotta` */
const PLUM_HEX = '#b89191'

export function BillsOverview({
  bills,
  masked,
  currentDay,
  className,
}: {
  bills: Bill[]
  masked: boolean
  /** hari berjalan — status "telat" memakai tanggal perangkat (paket 57) */
  currentDay: number
  className?: string
}) {
  const total = bills.reduce((sum, bill) => sum + bill.amount, 0)
  const paidBills = bills.filter((bill) => bill.isPaidThisMonth)
  const paidAmount = paidBills.reduce((sum, bill) => sum + bill.amount, 0)
  /* tagihan bernominal fleksibel (amount 0) tidak boleh membuat "sisa" negatif */
  const unpaidAmount = Math.max(0, total - paidAmount)
  const overdueCount = bills.filter(
    (bill) => getBillStatus(bill, currentDay) === 'overdue',
  ).length
  const allPaid = bills.length > 0 && paidBills.length === bills.length
  const unpaidCount = Math.max(0, bills.length - paidBills.length)
  const progress = total > 0 ? (paidAmount / total) * 100 : 0

  const ringColor = overdueCount > 0 ? PLUM_HEX : allPaid ? OLIVE_HEX : FOREST_HEX
  /* SATU baris status — tidak ada angka kedua yang harus dicocokkan user */
  const statusLine = allPaid
    ? 'Udah lunas semua'
    : `${unpaidCount} dari ${bills.length} tagihan belum lunas`

  return (
    <section
      aria-label="Ringkasan tagihan bulan ini"
      className={cn(
        'overflow-hidden rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/10 sm:p-7',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-forest-muted">
            {allPaid ? 'Sisa tagihan' : 'Belum dibayar'}
          </p>
          <p className="mt-2 font-display text-[30px] font-semibold leading-none tracking-tight tabular-nums text-forest sm:text-[34px]">
            {maskMoney(unpaidAmount, masked)}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <ProgressRing
            percent={progress}
            size={56}
            stroke={5}
            color={ringColor}
            ariaLabel={`${paidBills.length} dari ${bills.length} tagihan sudah lunas bulan ini`}
            title={`${Math.round(progress)}% nominal tagihan sudah dibayar`}
          >
            {allPaid ? (
              <Check className="size-5 text-forest" strokeWidth={2.6} aria-hidden />
            ) : (
              <span className="text-[11px] font-semibold tabular-nums text-forest">
                {Math.round(progress)}
                <span className="text-[8px] font-medium text-forest-muted">%</span>
              </span>
            )}
          </ProgressRing>
          <span className="text-[9.5px] font-medium leading-none text-forest-muted">
            {allPaid ? 'lunas' : 'nominal lunas'}
          </span>
        </div>
      </div>

      {/* satu bar: porsi NOMINAL yang sudah dibayar (bukan jumlah tagihan).
          8px — ramping, tapi tetap terbaca sebagai data di layar HP. */}
      <div
        role="progressbar"
        aria-label="Nominal tagihan yang sudah dibayar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-6 h-2 w-full overflow-hidden rounded-full bg-sage ring-1 ring-inset ring-soil/5"
      >
        <motion.span
          className={cn(
            'block h-full rounded-full',
            progress > 0 && 'min-w-[6px]',
            allPaid ? 'bg-hud-sage' : 'bg-forest',
          )}
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-[11.5px] font-medium tabular-nums text-forest-muted">
        <span className="min-w-0 truncate">{statusLine}</span>
        <span className="shrink-0 text-right">Total {maskMoney(total, masked)}</span>
      </div>
    </section>
  )
}
