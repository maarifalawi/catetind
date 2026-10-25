'use client'

import { ArrowRight, Lock, SlidersHorizontal, Trash2 } from 'lucide-react'
import { BudgetSheet, ChoicePills } from './budget-sheet'
import { categoryVisualFor } from './transaction-category-visual'
import {
  JOINT_DELETE_COPY,
  PAID_BY_HINT,
  PAID_BY_LABEL,
  PAID_BY_ME_LABEL,
  PRIVATE_OWNER_HINT,
  categoryEmoji,
  moneyLabel,
  pocketOf,
  splitLabel,
  type JointPerson,
  type JointTransaction,
} from '@/lib/data/joint'
import type { JointDeleteState } from '@/lib/money/joint-store'
import { cn } from '@/lib/utils'

/* ── DETAIL SATU CATATAN BARENG (bottom sheet) ─────────────────────────────────
   Redesign Dompet Bersama: baris di "Cerita Kita" kembali menjadi SATU TAP
   TARGET yang bersih. Semua aksi yang dulu menumpuk di dalam baris (chip split,
   tombol "Atur pembagian", pemilih "Siapa yang nalangin?", tombol hapus) pindah
   ke sheet ini — pola yang sama dengan Detail Transaksi di halaman Riwayat.

   Yang TIDAK berubah: aturan privasi (catatan privat milik pasangan tidak punya
   detail & tidak bisa dibuka), aturan hapus (`jointDeleteState()` di store), dan
   satu sumber kebenaran pembagian (`splitLabel`/`splitSpecOf`).
   ────────────────────────────────────────────────────────────────────────── */

export function JointEntrySheet({
  open,
  tx,
  masked,
  me,
  partner,
  onClose,
  onOpenSplit,
  onChangePaidBy,
  deleteState,
  onDelete,
}: {
  open: boolean
  /** catatan yang dibuka (null = sheet tertutup) */
  tx: JointTransaction | null
  masked: boolean
  me: JointPerson
  partner: JointPerson
  onClose: () => void
  /** buka Split Bill Sheet untuk catatan ini */
  onOpenSplit: (tx: JointTransaction) => void
  onChangePaidBy?: (tx: JointTransaction, userId: string) => void
  deleteState?: JointDeleteState
  onDelete?: (tx: JointTransaction) => void
}) {
  if (!tx) return null

  const payerId = pocketOf(tx)
  const payer = payerId === partner.id ? partner : me
  const hiddenFromMe = Boolean(tx.isPrivate) && tx.userId !== me.id
  const isPrivateMine = Boolean(tx.isPrivate) && tx.userId === me.id
  const isSettlement = Boolean(tx.isSettlement)
  const title = hiddenFromMe ? 'Pengeluaran Privat Partner' : tx.description
  const category = hiddenFromMe ? 'Privat' : tx.category
  const visual = categoryVisualFor(hiddenFromMe ? null : category)
  const canEdit = !hiddenFromMe && !isSettlement
  /** bulan yang sudah disettle = angka yang disepakati tidak boleh berubah */
  const locked = deleteState === 'locked'

  return (
    <BudgetSheet
      open={open}
      onClose={onClose}
      title={title}
      description={hiddenFromMe ? 'Detail disembunyikan oleh pasanganmu.' : `${payer.name} · ${tx.time}`}
    >
      {/* nominal — bahasa warna uang yang sama dengan baris Riwayat */}
      <p
        className={cn(
          'font-display text-[30px] font-semibold leading-none tracking-tight tabular-nums',
          isSettlement ? 'text-forest/55' : 'text-hud-terracotta',
        )}
      >
        {isSettlement ? '⇄ ' : '- '}
        {moneyLabel(tx.amount, masked)}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10.5px] font-medium',
            hiddenFromMe ? 'bg-sage/70 text-forest/60' : visual.chip,
          )}
        >
          {hiddenFromMe ? '🔒 Privat' : `${categoryEmoji(category)} ${category}`}
        </span>
        {!hiddenFromMe && (
          <span className="rounded-full bg-soil/[0.08] px-2 py-0.5 text-[10.5px] font-medium text-forest/50">
            {splitLabel(tx, masked)}
          </span>
        )}
        {isPrivateMine && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sage/70 px-2 py-0.5 text-[10.5px] font-medium text-forest/60">
            <Lock className="size-3" strokeWidth={2.4} aria-hidden />
            {PRIVATE_OWNER_HINT}
          </span>
        )}
      </div>

      {/* rincian ringkas — tanpa kalimat penjelas */}
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-sage/40 px-4 py-3.5">
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-forest/40">
            Dibayar
          </dt>
          <dd className="mt-0.5 text-[12.5px] font-medium text-forest">{payer.name}</dd>
        </div>
        <div className="text-right">
          <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-forest/40">
            Tanggal
          </dt>
          <dd className="mt-0.5 text-[12.5px] font-medium tabular-nums text-forest">
            {tx.date} · {tx.time}
          </dd>
        </div>
      </dl>

      {canEdit && !locked && (
        <>
          {/* "Siapa yang nalangin?" — koreksi kantong, ditulis ke store */}
          {onChangePaidBy && (
            <section className="mt-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-forest/40">
                {PAID_BY_LABEL}
              </p>
              <ChoicePills
                className="mt-2"
                options={[
                  { id: me.id, label: `${PAID_BY_ME_LABEL} (${me.name})` },
                  { id: partner.id, label: partner.name },
                ]}
                value={payerId}
                onChange={(userId) => onChangePaidBy(tx, userId)}
                ariaLabel={PAID_BY_LABEL}
              />
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-forest/40">{PAID_BY_HINT}</p>
            </section>
          )}

          <button
            type="button"
            onClick={() => onOpenSplit(tx)}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-forest/5 text-[13px] font-medium text-forest ring-1 ring-forest/15 transition-colors hover:bg-forest/10 active:scale-[0.99]"
          >
            <SlidersHorizontal className="size-4" strokeWidth={2.4} aria-hidden />
            Atur pembagian
            <ArrowRight className="size-3.5" strokeWidth={2.6} aria-hidden />
          </button>

          {deleteState === 'allowed' && onDelete && (
            <button
              type="button"
              onClick={() => {
                onClose()
                onDelete(tx)
              }}
              aria-label={JOINT_DELETE_COPY.actionAria(tx.description)}
              className="mt-2.5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-plum/12 text-[13px] font-medium text-plum ring-1 ring-plum/25 transition-colors hover:bg-plum/20 active:scale-[0.99]"
            >
              <Trash2 className="size-4" strokeWidth={2.4} aria-hidden />
              {JOINT_DELETE_COPY.action}
            </button>
          )}
        </>
      )}

      {locked && (
        <p className="mt-4 rounded-2xl bg-soil/[0.08] px-3.5 py-2.5 text-[11px] leading-relaxed text-forest/55">
          {JOINT_DELETE_COPY.lockedNote}
        </p>
      )}

      {isSettlement && (
        <p className="mt-4 rounded-2xl bg-hud-sage/15 px-3.5 py-3 text-[11.5px] leading-relaxed text-forest/60">
          Jejak transfer settlement, angkanya sudah masuk ke timbangan bulan ini.
        </p>
      )}
    </BudgetSheet>
  )
}
