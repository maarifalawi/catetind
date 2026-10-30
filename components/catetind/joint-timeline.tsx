'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import {
  groupJointTransactions,
  moneyLabel,
  pocketOf,
  splitLabel,
  type JointPerson,
  type JointTransaction,
} from '@/lib/data/joint'
import { useTodayISO } from '@/lib/use-today-iso'
import { cn } from '@/lib/utils'
import { categoryVisualFor } from './transaction-category-visual'

/* â”€â”€ CERITA KITA â€” DAFTAR TRANSAKSI (redesign Dompet Bersama) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Sebelumnya timeline ini adalah "buku harian" dua kolom dengan garis tengah,
   kartu berselang-seling, dan panel aksi yang mengembang di dalam tiap kartu â€”
   padat, dan berbeda bahasa visual dari halaman Riwayat.

   Sekarang bentuknya SAMA dengan daftar Riwayat (sumber yang sama:
   `transaction-category-visual.tsx` + `MONEY_TONE`):
     â€¢ kepala hari = label kecil + garis rambut (bukan pill besar),
     â€¢ baris = kartu tipis ber-tint keluarga kategori, avatar pembayar di kiri,
       nominal + badge pembagian di kanan,
     â€¢ seluruh baris adalah SATU tap target â†’ detail & pembagian dibuka di
       bottom sheet (`joint-entry-sheet.tsx`), bukan di dalam baris.

   Privasi tetap utuh: catatan privat milik pasangan hanya tampil sebagai
   "Pengeluaran Privat Partner" tanpa detail, dan nominalnya ikut sensor global.
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export function JointTimeline({
  transactions,
  masked,
  me,
  partner,
  partnerTyping = false,
  onOpenEntry,
}: {
  transactions: JointTransaction[]
  masked: boolean
  me: JointPerson
  partner: JointPerson
  /** true = indikator "Dany sedang mencatat..." tampil (mock Supabase Realtime) */
  partnerTyping?: boolean
  /** tap satu baris â†’ detail catatan & pembagian di bottom sheet */
  onOpenEntry: (tx: JointTransaction) => void
}) {
  const today = useTodayISO()
  const groups = groupJointTransactions(transactions, today || undefined)

  return (
    <div className="mt-4">
      <AnimatePresence initial={false}>
        {partnerTyping && (
          <motion.div
            key="typing"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.24, ease: EASE }}
            className="mb-3 flex items-center gap-2 rounded-full bg-cream px-3 py-1.5 text-[12.5px] font-medium text-forest/60 ring-1 ring-soil/10"
          >
            <span aria-hidden className="text-[14px]">
              {partner.avatar}
            </span>
            {partner.name} sedang mencatat
            <span className="flex items-end gap-0.5" aria-hidden>
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="ai-typing-dot size-1 rounded-full bg-hud-amber"
                  style={{ animationDelay: `${dot * 160}ms` }}
                />
              ))}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-5">
        {groups.map((group) => {
          /* total hari = pengeluaran saja; baris settlement/pembuka bukan belanja */
          const spent = group.items
            .filter((tx) => !tx.isSettlement && !tx.isOpening)
            .reduce((sum, tx) => sum + tx.amount, 0)

          return (
            <section key={group.date}>
              {/* kepala hari: label + garis rambut, sama seperti halaman Riwayat */}
              <div className="flex items-center gap-2.5">
                <p className="shrink-0 text-[12px] font-medium uppercase tracking-[0.12em] text-forest/45">
                  {group.label}
                </p>
                <span aria-hidden className="h-px min-w-4 flex-1 bg-soil/[0.09]" />
                {spent > 0 && (
                  <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-hud-terracotta">
                    - {moneyLabel(spent, masked)}
                  </span>
                )}
              </div>

              <ul className="mt-2 flex flex-col gap-1.5">
                {group.items.map((tx) => (
                  <TimelineRow
                    key={tx.id}
                    tx={tx}
                    masked={masked}
                    me={me}
                    partner={partner}
                    onOpen={onOpenEntry}
                  />
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}

/** Satu baris transaksi â€” seluruh baris adalah tombol (tap â†’ bottom sheet) */
function TimelineRow({
  tx,
  masked,
  me,
  partner,
  onOpen,
}: {
  tx: JointTransaction
  masked: boolean
  me: JointPerson
  partner: JointPerson
  onOpen: (tx: JointTransaction) => void
}) {
  const payerId = pocketOf(tx)
  const payer = payerId === partner.id ? partner : me
  const hiddenFromMe = Boolean(tx.isPrivate) && tx.userId !== me.id
  const isPrivateMine = Boolean(tx.isPrivate) && tx.userId === me.id
  const isSettlement = Boolean(tx.isSettlement)
  const isOpening = Boolean(tx.isOpening)

  const title = hiddenFromMe ? 'Pengeluaran Privat Partner' : tx.description
  const category = hiddenFromMe ? 'Privat' : tx.category
  const visual = categoryVisualFor(hiddenFromMe ? null : category)

  const amountPrefix = isSettlement ? 'â‡„ ' : isOpening ? '' : '- '
  const amountTone = isSettlement || isOpening ? 'text-forest/55' : 'text-hud-terracotta'

  return (
    <motion.li
      initial={tx.justArrived ? { opacity: 0, x: 28 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <button
        type="button"
        onClick={() => onOpen(tx)}
        aria-label={`${title}, ${payer.name}, ${amountPrefix}${moneyLabel(tx.amount, masked)}. Buka detail.`}
        className={cn(
          'group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-forest/20',
          visual.row,
        )}
      >
        {/* avatar pembayar â€” pembeda dua orang tanpa garis waktu */}
        <span
          aria-hidden
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full text-[17px] ring-1',
            payer.tint,
          )}
        >
          {payer.avatar}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="line-clamp-2 text-[14.5px] font-medium text-forest">
              {title}
            </span>
            {isPrivateMine && (
              <Lock className="size-3 shrink-0 text-forest/40" strokeWidth={2.4} aria-hidden />
            )}
            {tx.justArrived && (
              <span className="shrink-0 rounded-full bg-hud-amber/25 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-hud-terracotta">
                Baru
              </span>
            )}
          </span>

          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12.5px] text-forest/40">
            <span className="shrink-0">{payer.name}</span>
            <span className="shrink-0">Â· {tx.time}</span>
            <span
              className={cn(
                'min-w-0 truncate rounded-full px-1.5 py-0.5 text-[11px] font-medium',
                hiddenFromMe ? 'bg-sage/70 text-forest/60' : visual.chip,
              )}
            >
              {hiddenFromMe ? 'ðŸ”’ Privat' : category}
            </span>
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className={cn('block text-[14.5px] font-medium tabular-nums', amountTone)}>
            {amountPrefix}
            {moneyLabel(tx.amount, masked)}
          </span>
          {!hiddenFromMe && (
            <span className="mt-1 inline-block max-w-[92px] truncate rounded-full bg-soil/[0.08] px-1.5 py-0.5 text-[11px] font-medium text-forest/50">
              {splitLabel(tx, masked)}
            </span>
          )}
        </span>
      </button>
    </motion.li>
  )
}
