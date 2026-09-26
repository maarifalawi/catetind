'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarClock, Pencil, Sparkles, Trash2, Wallet as WalletIcon, X } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import type { TransactionType } from '@/lib/types'
import { MONEY_TONE, formatDayLong, maskMoney, type HistoryTransaction } from '@/lib/data/history'
import { cn } from '@/lib/utils'
import { categoryEmoji, transactionAmountLabel } from './history-transaction-row'

/* ── Detail Transaksi (inventaris 97d) ───────────────────────────────────────
   Modal di desktop, bottom sheet di mobile (satu markup, dua perilaku lewat
   breakpoint). Bisa ditutup lewat tombol X, klik overlay, tombol Escape, atau
   di-geser ke bawah dari handle. Berisi aksi Edit & Hapus yang sama dengan
   gesture geser di baris daftar. */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const DISMISS_DRAG = 110 // px — geser ke bawah sejauh ini = tutup

const TYPE_LABEL: Record<TransactionType, string> = {
  income: 'Pemasukan',
  expense: 'Pengeluaran',
  saving: 'Tabungan',
  transfer: 'Transfer',
}

export function TransactionDetailSheet({
  tx,
  masked,
  onClose,
  onEdit,
  onDelete,
}: {
  /** null = sheet tertutup */
  tx: HistoryTransaction | null
  masked: boolean
  onClose: () => void
  onEdit: (tx: HistoryTransaction) => void
  onDelete: (tx: HistoryTransaction) => void
}) {
  /* kunci scroll halaman hanya di mobile (desktop panelnya kecil & mengambang) */
  useBodyScrollLock(!!tx, true)

  /* Escape menutup sheet */
  useEffect(() => {
    if (!tx) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [tx, onClose])

  return (
    <AnimatePresence>
      {tx && (
        <motion.div
          key="detail-sheet"
          className="fixed inset-0 z-[70]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* overlay — klik untuk tutup */}
          <button
            type="button"
            aria-label="Tutup detail transaksi"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-ink/50"
          />
          <div className="absolute inset-x-0 bottom-0 flex justify-center sm:inset-x-4 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`Detail transaksi ${tx.name}`}
              initial={{ y: 64, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 64, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.34, ease: EASE }}
              className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-cream p-5 pb-7 shadow-[0_-24px_60px_-24px_rgba(69,89,78,0.55)] ring-1 ring-soil/12 sm:rounded-[2rem] sm:p-6 sm:shadow-[0_28px_70px_-24px_rgba(69,89,78,0.5)]"
              data-lenis-prevent
            >
              <DetailBody tx={tx} masked={masked} onClose={onClose} onEdit={onEdit} onDelete={onDelete} />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function DetailBody({
  tx,
  masked,
  onClose,
  onEdit,
  onDelete,
}: {
  tx: HistoryTransaction
  masked: boolean
  onClose: () => void
  onEdit: (tx: HistoryTransaction) => void
  onDelete: (tx: HistoryTransaction) => void
}) {
  /* geser ke bawah dari handle untuk menutup (mobile) */
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startY = useRef<number | null>(null)

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startY.current = e.clientY
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startY.current === null) return
    setDragY(Math.max(0, e.clientY - startY.current))
  }
  const onPointerUp = () => {
    if (startY.current === null) return
    startY.current = null
    setDragging(false)
    if (dragY > DISMISS_DRAG) onClose()
    else setDragY(0)
  }

  return (
    <div
      style={{
        transform: dragY ? `translateY(${dragY}px)` : undefined,
        transition: dragging ? 'none' : 'transform 0.28s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      {/* area geser + tombol tutup */}
      <div className="flex items-center justify-between gap-3">
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="flex h-8 flex-1 cursor-grab touch-none items-center active:cursor-grabbing sm:cursor-default"
          aria-hidden
        >
          {/* grabber khas sheet — hanya di mobile */}
          <span className="mx-auto h-1.5 w-12 rounded-full bg-ink/15 sm:hidden" />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink/45 transition-colors hover:bg-cream hover:text-ink"
        >
          <X className="size-4" strokeWidth={2.4} />
        </button>
      </div>

      {/* identitas transaksi */}
      <div className="mt-1 flex items-center gap-3">
        <span
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sage/60 text-[22px] ring-1 ring-inset ring-forest/5"
          aria-hidden
        >
          {categoryEmoji(tx.category)}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate font-display text-[17px] font-bold tracking-tight text-ink">
              {tx.name}
            </h2>
            {tx.aiGenerated && (
              <Sparkles
                className="size-3.5 shrink-0 text-forest/60"
                strokeWidth={2.4}
                aria-label="Nama dibuat AI"
              />
            )}
          </div>
          <p className="mt-0.5 text-[11.5px] text-ink/45">{tx.category}</p>
        </div>
      </div>

      {/* nominal raksasa — ikut mode privasi halaman; warnanya dari `MONEY_TONE`
          (hijau masuk · terracotta keluar · tinta netral untuk pindah dana) */}
      <p
        className={cn(
          'mt-5 font-display text-[2.15rem] font-black leading-none tracking-tight tabular-nums',
          MONEY_TONE[tx.type].text,
        )}
      >
        {transactionAmountLabel(tx, masked)}
      </p>

      {/* pill kategori & dompet */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/60 px-3 py-1.5 text-[11.5px] font-semibold text-forest">
          {categoryEmoji(tx.category)} {tx.category}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5 text-[11.5px] font-semibold text-ink/70 ring-1 ring-soil/12">
          <WalletIcon className="size-3.5 text-forest/70" strokeWidth={2.2} />
          {tx.wallet}
        </span>
      </div>

      {/* meta: tanggal & waktu, dompet, tipe */}
      <dl className="mt-5 space-y-2.5 rounded-2xl bg-cream/70 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <dt className="inline-flex items-center gap-2 text-[12px] text-ink/50">
            <CalendarClock className="size-3.5 text-forest/60" strokeWidth={2.2} />
            Tanggal &amp; waktu
          </dt>
          <dd className="text-right text-[12.5px] font-semibold text-ink">
            {formatDayLong(tx.date)} · {tx.time}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[12px] text-ink/50">Dompet</dt>
          <dd className="text-right text-[12.5px] font-semibold text-ink">{tx.wallet}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[12px] text-ink/50">Tipe</dt>
          <dd className="text-right text-[12.5px] font-semibold text-ink">{TYPE_LABEL[tx.type]}</dd>
        </div>
      </dl>

      {tx.aiGenerated && (
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-mint/20 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-forest">
          <Sparkles className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} />
          Nama transaksi ini dibuat AI dari catatanmu. Masih bisa kamu ubah lewat Edit.
        </p>
      )}

      {/* aksi — sama seperti gesture geser di daftar: Edit = hijau brand,
          Hapus = rose (satu-satunya pemakaian merah, karena memang merusak) */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onEdit(tx)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-forest text-[13.5px] font-semibold text-mint transition-colors hover:bg-forest-soft active:scale-[0.98]"
        >
          <Pencil className="size-4" strokeWidth={2.3} />
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(tx)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-plum text-[13.5px] font-semibold text-cream transition-colors hover:bg-plum active:scale-[0.98]"
        >
          <Trash2 className="size-4" strokeWidth={2.3} />
          Hapus
        </button>
      </div>
    </div>
  )
}
