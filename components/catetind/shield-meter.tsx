'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { getBillStatus, maskMoney, type Bill } from '@/lib/data/bills'

/* ── Shield Protection Meter ─────────────────────────────────────────────────
   Metafora halaman Tagihan Rutin: bayar tagihan = menutup tameng. Satu tagihan
   = satu lajur vertikal di dalam perisai; semua lajur penuh → tameng utuh +
   glow emas hangat (token hud-amber, masih palet app) sebagai hadiah kecil.
   Lajur yang belum tertutup digores retakan terracotta kalau ada yang telat.

   REDESAIN (padat & minimalis): tameng kini jadi ikon di KIRI (bukan ilustrasi
   raksasa di tengah kartu), angkanya di kanan + satu bar progres tipis. Semua
   teks dekoratif (headline bernada, catatan "dipotong dari Jatah Harian")
   dicabut — yang tersisa hanya angka yang benar-benar dibaca. `variant="compact"`
   dipakai empty state: perisai + pecahan saja, tanpa bar & nominal.
   ────────────────────────────────────────────────────────────────────────── */

/** perisai 64×82 — pangkal lebar di atas, meruncing ke bawah */
const SHIELD_PATH = 'M32 3 L61 13 V40 C61 58.5 48.5 71 32 78.5 C15.5 71 3 58.5 3 40 V13 Z'
/** area lajur di dalam perisai (x dari 3 sampai 61) */
const BAND_LEFT = 3
const BAND_WIDTH = 58
const BAND_GAP = 1.4
const VIEW_BOX = '0 0 64 82'
/** abu-abu netral untuk lajur yang belum tertutup (Oat — token `sage`) */
const EMPTY_FILL_CLASS = 'fill-sage'

export function ShieldMeter({
  bills,
  masked,
  currentDay,
  variant = 'full',
  className,
}: {
  bills: Bill[]
  masked: boolean
  currentDay: number
  /** 'compact' = hanya perisai + pecahan (dipakai empty state) */
  variant?: 'full' | 'compact'
  /** override margin luar (dipakai saat kartu disusun dalam grid 2 kolom) */
  className?: string
}) {
  const reduceMotion = useReducedMotion()

  const total = bills.length
  const paidBills = bills.filter((bill) => bill.isPaidThisMonth)
  const paidCount = paidBills.length
  const paidAmount = paidBills.reduce((sum, bill) => sum + bill.amount, 0)
  const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0)
  const overdueCount = bills.filter((bill) => getBillStatus(bill, currentDay) === 'overdue').length
  const allPaid = total > 0 && paidCount === total
  const progress = total > 0 ? (paidCount / total) * 100 : 0

  /* satu lajur per tagihan; saat belum ada tagihan tetap ada satu lajur kelabu
     supaya perisainya tidak "berlubang" */
  const segments =
    total === 0
      ? [{ id: 'kosong', filled: false }]
      : bills.map((bill) => ({ id: bill.id, filled: bill.isPaidThisMonth }))
  const bandWidth = BAND_WIDTH / segments.length
  const clipId = 'shield-band-clip'


  const shield = (
    <motion.div
      className="relative w-fit shrink-0"
      animate={allPaid && !reduceMotion ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={{ duration: 0.9, ease: 'easeOut' }}
    >
      {allPaid && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-3 rounded-full bg-hud-amber/25 blur-2xl"
        />
      )}
      <svg
        viewBox={VIEW_BOX}
        className={cn(
          'relative h-14 w-auto',
          allPaid && 'drop-shadow-[0_6px_14px_rgba(255,184,133,0.55)]',
        )}
        role="img"
        aria-label={`${paidCount} dari ${total} tagihan terlindungi`}
      >
        <defs>
          <clipPath id={clipId}>
            <path d={SHIELD_PATH} />
          </clipPath>
        </defs>

        {/* lajur tagihan — sage penuh kalau bulan ini sudah dibayar */}
        <g clipPath={`url(#${clipId})`}>
          {segments.map((segment, index) => {
            const x = BAND_LEFT + index * bandWidth + BAND_GAP / 2
            const width = Math.max(1, bandWidth - BAND_GAP)
            return (
              <rect
                key={segment.id}
                x={x}
                y={0}
                width={width}
                height={82}
                rx={1.4}
                className={cn(
                  'transition-[fill] duration-500 ease-out',
                  segment.filled ? 'fill-hud-sage' : EMPTY_FILL_CLASS,
                )}
              />
            )
          })}

          {/* retakan di lajur yang belum tertutup — hanya saat ada yang telat */}
          {overdueCount > 0 &&
            segments.map((segment, index) => {
              if (segment.filled) return null
              const x = BAND_LEFT + index * bandWidth + BAND_GAP / 2
              const width = Math.max(1, bandWidth - BAND_GAP)
              return (
                <path
                  key={`crack-${segment.id}`}
                  d={`M${x + width * 0.1} 22 L${x + width * 0.72} 35 L${x + width * 0.2} 47 L${x + width * 0.85} 62`}
                  className="fill-none stroke-hud-terracotta/80"
                  strokeWidth={1.3}
                  strokeLinecap="round"
                />
              )
            })}
        </g>

        {/* garis tepi perisai — berubah emas saat tameng utuh */}
        <path
          d={SHIELD_PATH}
          className={cn(
            'fill-none transition-colors duration-500',
            allPaid ? 'stroke-hud-amber' : 'stroke-ink/12',
          )}
          strokeWidth={allPaid ? 2.2 : 1.4}
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  )

  if (variant === 'compact') {
    return (
      <section
        aria-label="Tameng proteksi tagihan"
        className={cn(
          'flex items-center gap-3.5 rounded-3xl bg-cream p-4 ring-1 ring-soil/10',
          className,
        )}
      >
        {shield}
        <p className="text-[13px] font-semibold tabular-nums text-forest">
          {paidCount}/{total} terlindungi
        </p>
      </section>
    )
  }

  return (
    <section
      aria-label="Tameng proteksi tagihan"
      className={cn(
        'flex items-center gap-4 rounded-3xl bg-cream p-4 ring-1 ring-soil/10',
        allPaid && 'ring-hud-amber/45 shadow-[0_18px_46px_-24px_rgba(255,184,133,0.7)]',
        className,
      )}
    >
      {shield}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[13px] font-semibold tabular-nums text-forest">
            {paidCount}/{total} lunas
          </p>
          {allPaid ? (
            <span className="text-[11px] font-medium text-hud-amber">Tameng penuh</span>
          ) : overdueCount > 0 ? (
            <span className="text-[11px] font-medium text-hud-terracotta">
              {overdueCount} telat
            </span>
          ) : null}
        </div>

        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sage">
          <motion.span
            className={cn('block h-full rounded-full', allPaid ? 'bg-hud-amber' : 'bg-hud-sage')}
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 text-[11px] font-medium tabular-nums text-forest/45">
          <span>Dibayar {maskMoney(paidAmount, masked)}</span>
          <span>Sisa {maskMoney(totalAmount - paidAmount, masked)}</span>
        </div>
      </div>
    </section>
  )
}
