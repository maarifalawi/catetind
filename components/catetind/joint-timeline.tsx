'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Lock, SlidersHorizontal } from 'lucide-react'
import {
  JOINT_ME,
  JOINT_PARTNER,
  PRIVATE_OWNER_HINT,
  categoryEmoji,
  groupJointTransactions,
  moneyLabel,
  splitLabel,
  type JointPerson,
  type JointTransaction,
} from '@/lib/data/joint'
import { cn } from '@/lib/utils'

/* ── Together Timeline (Section 5) ───────────────────────────────────────────
   Bukan tabel transaksi: catatan dua orang dijalin di SATU garis waktu —
   transaksiku mekar ke kiri, transaksi Dany ke kanan, seperti buku harian
   bersama. Tiap kartu punya titik penghubung yang menempel ke garis tengah.

   Aturan penting:
   • Desktop (sm+): layout berselang-seling kiri/kanan dengan garis tengah.
   • Mobile (<640): garis tengah jadi REL di kiri, kartu satu kolom, dan tiap
     kartu dibedakan oleh border kiri berwarna (sage = aku, amber = Dany).
   • Privasi (5B): transaksi privat milik SENDIRI tampil utuh + gembok kecil
     (tap gembok = tooltip), sedangkan privat milik pasangan cuma tampil sebagai
     "Pengeluaran Privat Partner" dengan border putus-putus dan tanpa detail.
   ────────────────────────────────────────────────────────────────────────── */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export function JointTimeline({
  transactions,
  masked,
  me = JOINT_ME,
  partner = JOINT_PARTNER,
  partnerTyping = false,
  onOpenSplit,
}: {
  transactions: JointTransaction[]
  masked: boolean
  me?: JointPerson
  partner?: JointPerson
  /** true = indikator "Dany sedang mencatat..." tampil (mock Supabase Realtime) */
  partnerTyping?: boolean
  /** buka Split Bill Sheet untuk transaksi ini (Section 6) */
  onOpenSplit: (tx: JointTransaction) => void
}) {
  const groups = groupJointTransactions(transactions)

  return (
    <div className="relative mt-5">
      {/* garis waktu: rel kiri di mobile, garis tengah di desktop */}
      <span
        aria-hidden
        className="absolute bottom-6 left-[7px] top-2 w-px bg-hud-sage/45 sm:left-1/2 sm:-translate-x-1/2"
      />

      <AnimatePresence initial={false}>
        {partnerTyping && (
          <motion.div
            key="typing"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.24, ease: EASE }}
            className="relative mb-4 pl-6 sm:pl-0"
          >
            <span
              aria-hidden
              className={cn(
                'absolute left-[1px] top-3 size-3 rounded-full ring-2 sm:left-1/2 sm:-translate-x-1/2',
                partner.dot,
              )}
            />
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ffffff] px-3 py-1.5 text-[11.5px] font-semibold text-ink/60 ring-1 ring-soil/10">
              <span aria-hidden>{partner.avatar}</span>
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {groups.map((group) => (
          <section key={group.date} className="relative pt-3">
            {/* separator tanggal yang menyeberangi garis */}
            <h3 className="relative z-10 mb-3 ml-6 w-fit rounded-full bg-[#ffffff] px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink/40 ring-1 ring-soil/10 sm:mx-auto sm:ml-auto">
              {group.label}
            </h3>

            <div className="space-y-3">
              {group.items.map((tx) => (
                <TimelineCard
                  key={tx.id}
                  tx={tx}
                  masked={masked}
                  me={me}
                  partner={partner}
                  onOpenSplit={onOpenSplit}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

/** tampilan transaksi setelah aturan privasi diterapkan — biar kartu tidak
 *  perlu tahu apa-apa soal siapa yang sedang melihat */
type TxView = {
  /** aku pemilik transaksi ini */
  isMine: boolean
  /** transaksi privat MILIK PASANGAN — detailnya disembunyikan dari aku */
  hiddenFromMe: boolean
  description: string
  category: string
}

function presentTransaction(tx: JointTransaction, me: JointPerson): TxView {
  const isMine = tx.userId === me.id
  const hiddenFromMe = Boolean(tx.isPrivate) && !isMine

  if (hiddenFromMe) {
    return {
      isMine,
      hiddenFromMe,
      /* spec 5B: versi yang dilihat pasangan = deskripsi & kategori diganti */
      description: 'Pengeluaran Privat Partner',
      category: '🔒',
    }
  }
  return { isMine, hiddenFromMe, description: tx.description, category: tx.category }
}

/** Satu kartu di timeline — bisa di-tap untuk melihat opsi pembagian */
function TimelineCard({
  tx,
  masked,
  me,
  partner,
  onOpenSplit,
}: {
  tx: JointTransaction
  masked: boolean
  me: JointPerson
  partner: JointPerson
  onOpenSplit: (tx: JointTransaction) => void
}) {
  const view = presentTransaction(tx, me)
  const person = view.isMine ? me : partner
  const [open, setOpen] = useState(false)
  const [lockHint, setLockHint] = useState(false)

  const isPrivateMine = Boolean(tx.isPrivate) && view.isMine
  /** privat milik pasangan: tidak ada detail lagi yang bisa dibuka (5B) */
  const expandable = !view.hiddenFromMe

  return (
    <motion.div
      initial={tx.justArrived ? { opacity: 0, x: 56 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.42, ease: EASE }}
      className="relative pl-6 sm:pl-0"
    >
      {/* titik penghubung yang menempel ke garis waktu */}
      <span
        aria-hidden
        className={cn(
          'absolute left-[1px] top-5 z-10 size-3 rounded-full ring-2 sm:left-1/2 sm:-translate-x-1/2',
          person.dot,
        )}
      />

      <div className={cn('sm:w-[calc(50%-1.75rem)]', view.isMine ? 'sm:mr-auto' : 'sm:ml-auto')}>
        <div
          role={expandable ? 'button' : undefined}
          tabIndex={expandable ? 0 : undefined}
          aria-expanded={expandable ? open : undefined}
          onClick={expandable ? () => setOpen((prev) => !prev) : undefined}
          onKeyDown={
            expandable
              ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setOpen((prev) => !prev)
                  }
                }
              : undefined
          }
          className={cn(
            'rounded-[1.5rem] px-4 py-3.5 ring-1 transition-shadow duration-200',
            /* mobile: border kiri berwarna sebagai pembeda dua orang (5D) */
            'border-l-4 sm:border-l-0',
            person.rail,
            /* privat milik sendiri: latar warm grey + gembok */
            isPrivateMine
              ? 'bg-[#ebe4de] ring-soil/14'
              : view.hiddenFromMe
                ? /* privat milik pasangan: border putus-putus, tanpa detail */
                  'border border-dashed border-hud-amber/50 bg-[#ffffff] ring-transparent'
                : 'bg-[#ffffff] ring-soil/10',
            expandable && 'cursor-pointer hover:shadow-[0_18px_38px_-30px_rgba(69,89,78,0.85)]',
            expandable && open && 'shadow-[0_18px_38px_-30px_rgba(69,89,78,0.85)]',
          )}
        >
          {/* baris 1: siapa & kapan */}
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] ring-1',
                  person.tint,
                )}
              >
                {person.avatar}
              </span>
              <span className="truncate text-[11.5px] font-semibold text-ink/50">
                {person.name} · {tx.time}
              </span>
            </span>

            <span className="flex shrink-0 items-center gap-1.5">
              {tx.justArrived && (
                <span className="rounded-full bg-hud-amber/25 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#b89191]">
                  Baru
                </span>
              )}
              {expandable && (
                <ChevronDown
                  aria-hidden
                  className={cn(
                    'size-3.5 text-ink/30 transition-transform duration-200',
                    open && 'rotate-180',
                  )}
                  strokeWidth={2.6}
                />
              )}
            </span>
          </div>

          {/* baris 2: deskripsi */}
          <p
            className={cn(
              'mt-1.5 text-[14.5px] font-bold leading-snug',
              view.hiddenFromMe ? 'text-ink/70' : 'text-ink',
            )}
          >
            {view.description}
          </p>
          {/* baris 3: nominal + kategori + info pembagian */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
            <span className="flex items-center gap-1.5">
              <span className="text-[15.5px] font-black tabular-nums tracking-tight text-ink">
                {moneyLabel(tx.amount, masked)}
              </span>
              {isPrivateMine && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setLockHint((prev) => !prev)
                  }}
                  aria-label={PRIVATE_OWNER_HINT}
                  className="flex size-5 items-center justify-center rounded-full bg-ink/10 text-ink/60 transition-colors hover:bg-ink/15"
                >
                  <Lock className="size-3" strokeWidth={2.4} />
                </button>
              )}
            </span>

            <span className="flex items-center gap-1.5">
              <span className="rounded-full bg-hud-sage/15 px-2 py-0.5 text-[10.5px] font-semibold text-[#503a3a] ring-1 ring-hud-sage/25">
                {view.category === '🔒'
                  ? '🔒 Privat'
                  : `${categoryEmoji(view.category)} ${view.category}`}
              </span>
              {!view.hiddenFromMe && (
                <span className="rounded-full bg-soil/[0.1] px-2 py-0.5 text-[10.5px] font-medium text-ink/50">
                  {splitLabel(tx, masked)}
                </span>
              )}
            </span>
          </div>

          {/* detail saat kartu di-tap — pintu masuk Split Bill Sheet (Section 6) */}
          <AnimatePresence initial={false}>
            {expandable && open && (
              <motion.div
                key="detail"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.26, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="mt-3 border-t border-soil/12 pt-3">
                  <p className="text-[11.5px] text-ink/45">
                    Split: <b className="font-semibold text-ink/70">{splitLabel(tx, masked)}</b>
                  </p>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onOpenSplit(tx)
                    }}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-forest/5 px-3 py-1.5 text-[11.5px] font-semibold text-forest ring-1 ring-forest/15 transition-colors hover:bg-forest/10"
                  >
                    <SlidersHorizontal className="size-3.5" strokeWidth={2.4} />
                    Atur pembagian →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* tooltip gembok — tap, bukan hover, supaya kepakai di HP (5B) */}
        <AnimatePresence>
          {lockHint && (
            <motion.p
              key="lock-hint"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.16 }}
              className="relative z-20 mt-2 w-fit rounded-2xl bg-ink px-3 py-2 text-[11px] font-medium leading-relaxed text-cream shadow-[0_14px_30px_-18px_rgba(69,89,78,0.9)]"
            >
              {PRIVATE_OWNER_HINT}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

