'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { HUD_DEDUCTION_HELPER, getBillStatus, maskMoney, type Bill } from '@/lib/data/bills'

/* ── Shield Protection Meter (Section 3) ─────────────────────────────────────
   Metafora halaman ini: bayar tagihan = menutup tameng. Satu tagihan = satu
   lajur vertikal di dalam perisai. Semua lajur penuh → tameng utuh + glow emas
   hangat (token `hud-amber`, masih palet app) sebagai hadiah kecil.

   Kalau ada tagihan telat, lajur yang masih kosong digores retakan terracotta
   supaya "tameng retak" terlihat, bukan cuma dibaca.

   Props `variant="compact"` dipakai empty state (0 tagihan): cuma perisai kelabu
   + pecahan 0/0, tanpa ringkasan uang.
   ────────────────────────────────────────────────────────────────────────── */

/** perisai 64×82 — pangkal lebar di atas, meruncing ke bawah */
const SHIELD_PATH = 'M32 3 L61 13 V40 C61 58.5 48.5 71 32 78.5 C15.5 71 3 58.5 3 40 V13 Z'
/** area lajur di dalam perisai (x dari 3 sampai 61) */
const BAND_LEFT = 3
const BAND_WIDTH = 58
const BAND_GAP = 1.4
const VIEW_BOX = '0 0 64 82'
/** abu-abu netral untuk lajur yang belum tertutup (bukan warna aksen baru) */
const EMPTY_FILL_CLASS = 'fill-[#ebe4de]'

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
  const paid = bills.filter((bill) => bill.isPaidThisMonth)
  const paidCount = paid.length
  const paidAmount = paid.reduce((sum, bill) => sum + bill.amount, 0)
  const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0)
  const overdueCount = bills.filter((bill) => getBillStatus(bill, currentDay) === 'overdue').length
  const allPaid = total > 0 && paidCount === total
  const empty = total === 0

  /* satu lajur per tagihan; saat belum ada tagihan tetap ada satu lajur kelabu
     supaya perisainya tidak "berlubang" */
  const segments = empty
    ? [{ id: 'kosong', filled: false }]
    : bills.map((bill) => ({ id: bill.id, filled: bill.isPaidThisMonth }))
  const bandWidth = BAND_WIDTH / segments.length

  const headline = allPaid
    ? 'Semua tagihan bulan ini aman! 🛡️🌿'
    : overdueCount > 0
      ? `${overdueCount} tagihan telat — tamengmu retak! 🛡️⚠️`
      : `${total - paidCount} tagihan lagi buat tameng penuh 🌿`
  const headlineClass = allPaid
    ? 'text-[#000000]'
    : overdueCount > 0
      ? 'text-hud-terracotta'
      : 'text-ink/55'

  const clipId = 'shield-band-clip'

  return (
    <section
      aria-label="Tameng proteksi tagihan"
      className={cn(
        'mt-5 overflow-hidden rounded-[2rem] bg-cream p-5 text-center shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] ring-1 ring-soil/12 sm:p-6',
        allPaid &&
          'ring-hud-amber/45 shadow-[0_18px_46px_-24px_rgba(255,184,133,0.75),0_0_0_1px_rgba(255,184,133,0.35)]',
        className,
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/35">
        Tameng Proteksi
      </p>

      {/* denyut sekali jalan saat tameng penuh (1.0 → 1.05 → 1.0) */}
      <motion.div
        className="relative mx-auto mt-3 w-fit"
        animate={allPaid && !reduceMotion ? { scale: [1, 1.05, 1] } : { scale: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      >
        {allPaid && (
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-4 rounded-full bg-hud-amber/25 blur-2xl"
          />
        )}
        <svg
          viewBox={VIEW_BOX}
          className={cn(
            'relative h-20 w-auto',
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
      <p className="mt-3 text-[15px] font-bold tabular-nums text-ink">
        {paidCount}/{total} terlindungi
      </p>

      {variant === 'full' && (
        <>
          <p className={cn('mt-1 text-[12.5px] font-semibold leading-snug', headlineClass)}>
            {headline}
          </p>

          <div className="mt-4 h-px w-full bg-soil/[0.09]" aria-hidden />

          <p className="mt-3 text-[12.5px] font-semibold tabular-nums text-ink/70">
            Sudah: {maskMoney(paidAmount, masked)} · Belum:{' '}
            {maskMoney(totalAmount - paidAmount, masked)}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-ink/40">{HUD_DEDUCTION_HELPER}</p>
        </>
      )}
    </section>
  )
}
