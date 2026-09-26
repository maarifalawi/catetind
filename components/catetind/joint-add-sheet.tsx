'use client'

import { Drawer } from 'vaul'
import { EyeOff, SlidersHorizontal } from 'lucide-react'
import { TransactionInputEngine } from '@/components/dashboard/transaction-input-engine'
import {
  JOINT_ME,
  JOINT_PARTNER,
  PRIVACY_WARNING_COPY,
  moneyLabel,
  type JointPerson,
  type JointSplitType,
} from '@/lib/data/joint'
import type { JointSplitDraft } from './joint-split-sheet'
import { cn } from '@/lib/utils'

/* ── Add Joint Transaction (Section 9) ──────────────────────────────────────
   FAB (+) di halaman Joint memakai Transaction Input Engine yang SAMA dengan
   halaman lain — jadi perilaku input tidak pernah divergen — tapi dompet
   bersamanya otomatis jadi sumber dana (`sourceLabel`) dan di bawah tombol
   Catat ada DUA field tambahan khas halaman ini:

   1. Pemilih split (default "Bagi Rata (50/50)") + tautan "Atur pembagian →"
      yang membuka Split Bill Bottom Sheet (Section 6).
   2. Toggle "Sembunyikan dari pasangan 🔒" — saat menyala, pemilih split
      DISEMBUNYIKAN karena pembagiannya bukan urusan pasangan, dan muncul
      peringatan. Catatan akuntansi (audit fintech #3): NOMINAL transaksi
      privat tetap ikut dihitung di total bersama & timbangan settlement —
      yang disembunyikan cuma itemnya. Lihat `weighedPaidBy()`.
   ────────────────────────────────────────────────────────────────────────── */

export function JointAddSheet({
  open,
  onClose,
  walletName,
  splitDraft,
  privateOn,
  onAmountChange,
  onOpenSplit,
  onTogglePrivate,
  onSubmitted,
  me = JOINT_ME,
  partner = JOINT_PARTNER,
}: {
  open: boolean
  onClose: () => void
  /** nama dompet bersama — ditampilkan sebagai sumber dana terpilih */
  walletName: string
  /** pembagian yang sedang dipilih (null = default bagi rata) */
  splitDraft: JointSplitDraft | null
  privateOn: boolean
  onAmountChange: (amount: number) => void
  onOpenSplit: () => void
  onTogglePrivate: () => void
  /** transaksi selesai dicatat — halaman menyisipkannya ke timeline */
  onSubmitted: (input: {
    description: string
    amount: number
    isPrivate: boolean
    split: JointSplitDraft | null
  }) => void
  me?: JointPerson
  partner?: JointPerson
}) {
  const extraFields = (
    <div className="space-y-2.5">
      {/* 1. pemilih split — disembunyikan saat transaksi privat */}
      {!privateOn && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/12">
          <span className="flex min-w-0 items-center gap-2">
            <SlidersHorizontal className="size-4 shrink-0 text-forest" strokeWidth={2.3} />
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-semibold text-ink">
                Split: {draftLabel(splitDraft, me, partner)}
              </span>
              <span className="mt-0.5 block text-[11px] text-ink/45">
                Bisa diubah kapan aja sebelum dicatat
              </span>
            </span>
          </span>
          <button
            type="button"
            onClick={onOpenSplit}
            className="shrink-0 text-[11.5px] font-semibold text-forest underline decoration-dotted underline-offset-4 transition-colors hover:text-forest-soft"
          >
            Atur pembagian →
          </button>
        </div>
      )}

      {/* 2. toggle privasi */}
      <div className="rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/12">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[12.5px] font-semibold text-ink/80">
            <EyeOff className="size-4 text-ink/40" strokeWidth={2.3} />
            Sembunyikan dari pasangan 🔒
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={privateOn}
            aria-label="Sembunyikan dari pasangan"
            onClick={onTogglePrivate}
            className={cn(
              'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
              privateOn ? 'bg-forest' : 'bg-ink/15',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 size-5 rounded-full bg-cream shadow-sm transition-transform duration-200',
                privateOn ? 'translate-x-[22px]' : 'translate-x-0.5',
              )}
            />
          </button>
        </div>
        {privateOn && (
          <p className="mt-2 text-[11px] leading-relaxed text-hud-terracotta">
            {PRIVACY_WARNING_COPY}
          </p>
        )}
      </div>
    </div>
  )
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      autoFocus={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay data-catetind-overlay="true" className="fixed inset-0 z-[70] bg-ink/60" />
        <Drawer.Content
          data-catetind-sheet="true"
          aria-label="Catat transaksi bareng"
          className="fixed inset-x-0 bottom-0 z-[70] mx-auto flex max-h-[94dvh] w-full max-w-md flex-col rounded-t-[2rem] bg-[#ffffff] shadow-[0_-24px_60px_-24px_rgba(69,89,78,0.55)] outline-none"
        >
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-ink/10" />
          <Drawer.Title className="sr-only">Catat transaksi bareng</Drawer.Title>
          <Drawer.Description className="sr-only">
            Catat pengeluaran di dompet bersama, atur pembagiannya, dan sembunyikan dari pasangan
            kalau perlu.
          </Drawer.Description>

          <div
            data-lenis-prevent
            className="overflow-y-auto px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          >
            <TransactionInputEngine
              active={open}
              layout="sheet"
              sourceLabel={walletName}
              onAmountChange={onAmountChange}
              extraFields={extraFields}
              onSubmitted={(payload) => {
                onSubmitted({
                  description: payload.note || 'Pengeluaran Bareng',
                  amount: payload.amount,
                  isPrivate: privateOn,
                  split: privateOn ? null : splitDraft,
                })
                onClose()
              }}
            />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

/** label singkat pembagian untuk baris "Split: ..." di form */
function draftLabel(
  draft: JointSplitDraft | null,
  me: JointPerson,
  partner: JointPerson,
): string {
  if (!draft) return 'Bagi Rata (50/50)'

  const type: JointSplitType = draft.splitType
  if (type === 'percentage') {
    return `Persentase ${draft.splits?.[me.id] ?? 50}/${draft.splits?.[partner.id] ?? 50}`
  }
  if (type === 'nominal') {
    return `Nominal ${moneyLabel(draft.splits?.[me.id] ?? 0, false)} · ${moneyLabel(
      draft.splits?.[partner.id] ?? 0,
      false,
    )}`
  }
  if (type === 'single_payer') {
    const payer = draft.payerId === partner.id ? partner : me
    return `${payer.name} yang bayar`
  }
  return 'Bagi Rata (50/50)'
}
