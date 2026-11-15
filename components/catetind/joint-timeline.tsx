'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Lock, Trash2 } from 'lucide-react'
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

/* ── CERITA KITA — DAFTAR TRANSAKSI (redesign Dompet Bersama) ─────────────────
   Sebelumnya timeline ini adalah "buku harian" dua kolom dengan garis tengah,
   kartu berselang-seling, dan panel aksi yang mengembang di dalam tiap kartu —
   padat, dan berbeda bahasa visual dari halaman Riwayat.

   Sekarang bentuknya SAMA dengan daftar Riwayat (sumber yang sama:
   `transaction-category-visual.tsx` + `MONEY_TONE`):
     • kepala hari = label kecil + garis rambut (bukan pill besar),
     • baris = kartu tipis ber-tint keluarga kategori, avatar pembayar di kiri,
       nominal + badge pembagian di kanan,
     • seluruh baris adalah SATU tap target → detail & pembagian dibuka di
       bottom sheet (`joint-entry-sheet.tsx`), bukan di dalam baris.

   Privasi tetap utuh: catatan privat milik pasangan hanya tampil sebagai
   "Pengeluaran Privat Partner" tanpa detail, dan nominalnya ikut sensor global.
   ────────────────────────────────────────────────────────────────────────── */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export function JointTimeline({
  transactions,
  masked,
  me,
  partner,
  people,
  partnerTyping = false,
  onOpenEntry,
  onRequestDelete,
  canDelete,
}: {
  transactions: JointTransaction[]
  masked: boolean
  me: JointPerson
  partner: JointPerson
  /**
   * Semua anggota kantong (2 orang atau lebih). Dipakai untuk mencari SIAPA
   * yang menalangi setiap baris — kalau hanya `me`/`partner`, catatan milik
   * orang ketiga akan salah menampilkan pencatatnya.
   */
  people?: JointPerson[]
  /** true = indikator "Dany sedang mencatat..." tampil (mock Supabase Realtime) */
  partnerTyping?: boolean
  /** tap satu baris → detail catatan & pembagian di bottom sheet */
  onOpenEntry: (tx: JointTransaction) => void
  /**
   * Hapus satu baris langsung dari daftar "Cerita Kita" (dengan konfirmasi di
   * halaman). Opsional supaya komponen ini tetap bisa dipakai tanpa aksi hapus.
   */
  onRequestDelete?: (tx: JointTransaction) => void
  /** aturan boleh-hapus dari store (`jointDeleteState`), bukan tebakan komponen */
  canDelete?: (tx: JointTransaction) => boolean
}) {
  const today = useTodayISO()
  const groups = groupJointTransactions(transactions, today || undefined)
  const roster = people && people.length > 0 ? people : [me, partner]

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
            className="mb-3 flex items-center gap-2 rounded-full bg-cream px-3 py-1.5 text-[12.5px] font-medium text-forest-muted ring-1 ring-soil/10"
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
          /* total hari = pengeluaran − pemasukan; baris settlement/pembuka bukan
             belanja. Dulu pemasukan ikut dijumlahkan sebagai pengeluaran. */
          const spent = group.items
            .filter((tx) => !tx.isSettlement && !tx.isOpening)
            .reduce((sum, tx) => sum + (tx.kind === 'income' ? -tx.amount : tx.amount), 0)

          return (
            <section key={group.date}>
              {/* kepala hari: label + garis rambut, sama seperti halaman Riwayat.
                  `sticky` supaya saat daftar panjang digulir di dalam kartunya,
                  tanggal yang sedang dibaca tetap terlihat. */}
              <div className="sticky top-0 z-10 flex items-center gap-2.5 bg-cream/95 py-1 backdrop-blur-sm">
                <p className="shrink-0 text-[12px] font-medium uppercase tracking-[0.12em] text-forest-muted">
                  {group.label}
                </p>
                <span aria-hidden className="h-px min-w-4 flex-1 bg-soil/[0.09]" />
                {spent !== 0 && (
                  <span
                    className={cn(
                      'shrink-0 text-[12.5px] font-semibold tabular-nums',
                      spent > 0 ? 'text-hud-terracotta' : 'text-forest',
                    )}
                  >
                    {spent > 0 ? '-' : '+'} {moneyLabel(Math.abs(spent), masked)}
                  </span>
                )}
              </div>

              <ul className="mt-2 flex flex-col gap-1.5">
                {group.items.map((tx) => (
                  <TimelineRow
                    key={tx.id}
                    tx={tx}
                    masked={masked}
                    people={roster}
                    onOpen={onOpenEntry}
                    onRequestDelete={onRequestDelete}
                    canDelete={canDelete ? canDelete(tx) : false}
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

/** Satu baris transaksi — seluruh baris adalah tombol (tap → bottom sheet) */
function TimelineRow({
  tx,
  masked,
  people,
  onOpen,
  onRequestDelete,
  canDelete = false,
}: {
  tx: JointTransaction
  masked: boolean
  /** seluruh anggota kantong — untuk mencari nama pembayar sebenarnya */
  people: JointPerson[]
  onOpen: (tx: JointTransaction) => void
  onRequestDelete?: (tx: JointTransaction) => void
  canDelete?: boolean
}) {
  const payerId = pocketOf(tx)
  /**
   * Pembayar bisa saja sudah TIDAK menjadi anggota (keluar/dikeluarkan).
   * Riwayatnya tetap tampil dengan sebutan netral "Anggota" — bukan diganti
   * orang lain (dulu fallback-nya `people[0]`, sehingga catatan lama tampak
   * dibayar oleh pemilik sesi) dan bukan nama contoh.
   */
  const payer =
    people.find((person) => person.id === payerId) ??
    ({
      id: payerId,
      name: 'Anggota',
      avatar: '🧑',
      tint: 'bg-sage/70 text-forest ring-soil/10',
      dot: 'bg-hud-sage',
      rail: 'bg-hud-sage',
    } satisfies JointPerson)
  const viewer = people[0]
  const hiddenFromMe = Boolean(tx.isPrivate) && tx.userId !== viewer.id
  const isPrivateMine = Boolean(tx.isPrivate) && tx.userId === viewer.id
  const isSettlement = Boolean(tx.isSettlement)
  const isOpening = Boolean(tx.isOpening)
  const isIncome = tx.kind === 'income'

  const title = hiddenFromMe ? 'Pengeluaran Privat Partner' : tx.description
  const category = hiddenFromMe ? 'Privat' : tx.category
  const visual = categoryVisualFor(hiddenFromMe ? null : category)

  const amountPrefix = isSettlement ? '⇄ ' : isOpening ? '' : isIncome ? '+ ' : '- '
  const amountTone =
    isSettlement || isOpening ? 'text-forest-muted' : isIncome ? 'text-forest' : 'text-hud-terracotta'

  return (
    <motion.li
      initial={tx.justArrived ? { opacity: 0, x: 28 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="group/row relative"
    >
      <button
        type="button"
        onClick={() => onOpen(tx)}
        aria-label={`${title}, ${payer.name}, ${amountPrefix}${moneyLabel(tx.amount, masked)}. Buka detail.`}
        className={cn(
          'group flex w-full items-center gap-3 rounded-xl py-3 pl-3.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-forest/20',
          canDelete && onRequestDelete ? 'pr-12' : 'pr-3.5',
          visual.row,
        )}
      >
        {/* avatar pembayar — pembeda dua orang tanpa garis waktu */}
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
              <Lock className="size-3 shrink-0 text-forest-muted" strokeWidth={2.4} aria-hidden />
            )}
            {tx.justArrived && (
              <span className="shrink-0 rounded-full bg-hud-amber/25 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-hud-terracotta">
                Baru
              </span>
            )}
            {/* Hanya di perangkat ini: kiriman ke server gagal, jadi pasangan
                belum melihat catatan ini. Ditulis apa adanya, tanpa nada
                menyalahkan — store mencoba mengirim ulang otomatis. */}
            {tx.pendingSync && (
              <span className="shrink-0 rounded-full bg-soil/[0.1] px-1.5 py-0.5 text-[10px] font-medium text-forest-muted">
                Belum tersinkron
              </span>
            )}
          </span>

          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12.5px] text-forest-muted">
            <span className="shrink-0">{payer.name}</span>
            <span className="shrink-0">· {tx.time}</span>
            <span
              className={cn(
                'min-w-0 truncate rounded-full px-1.5 py-0.5 text-[11px] font-medium',
                hiddenFromMe ? 'bg-sage/70 text-forest-muted' : visual.chip,
              )}
            >
              {hiddenFromMe ? '🔒 Privat' : category}
            </span>
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className={cn('block text-[14.5px] font-medium tabular-nums', amountTone)}>
            {amountPrefix}
            {moneyLabel(tx.amount, masked)}
          </span>
          {!hiddenFromMe && (
            <span className="mt-1 inline-block max-w-[92px] truncate rounded-full bg-soil/[0.08] px-1.5 py-0.5 text-[11px] font-medium text-forest-muted">
              {splitLabel(tx, masked, people)}
            </span>
          )}
        </span>
      </button>
      {/* Hapus langsung dari daftar Cerita Kita — konfirmasi tetap di halaman
          (`ConfirmDialog`). Kunci bulan yang sudah settle tidak menampilkan
          tombol ini (`canDelete` dari store). */}
      {canDelete && onRequestDelete && (
        <button
          type="button"
          onClick={() => onRequestDelete(tx)}
          aria-label={`Hapus catatan ${title}`}
          title="Hapus catatan"
          className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-plum/10 text-plum opacity-100 ring-1 ring-plum/20 transition-colors hover:bg-plum/20 active:scale-95 lg:opacity-0 lg:group-hover/row:opacity-100 lg:focus-visible:opacity-100"
        >
          <Trash2 className="size-4" strokeWidth={2.3} aria-hidden />
        </button>
      )}
    </motion.li>
  )
}
