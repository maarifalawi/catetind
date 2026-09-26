'use client'

import { Drawer } from 'vaul'
import { Pencil, ReceiptText, Trash2 } from 'lucide-react'
import { ConfirmDialog } from './confirm-dialog'
import {
  CONFIRM_DELETE_COPY,
  TRANSACTION_ACTIONS_COPY,
  TRANSACTION_TYPE_LABEL,
  maskMoney,
  resolveCategoryLabel,
  type HistoryTransaction,
} from '@/lib/data/history'

/* ── Aksi sebuah baris transaksi — SATU wujud untuk dua halaman ───────────────
   Baris transaksi muncul di Riwayat & Insight dan di Dompet Detail, jadi sheet
   titik tiga ("Lihat detail / Edit / Hapus") dan dialog konfirmasi hapusnya
   harus sama persis di kedua tempat. Dulu keduanya tinggal di dalam
   history-screen.tsx; sekarang diangkat ke sini supaya tidak ada dua varian
   dialog hapus dengan kalimat berbeda antar halaman.

   Keduanya murni presentasional: halaman yang memutuskan apa yang terjadi
   (`onOpenDetail`, `onEdit`, `onDelete`, `onConfirm`) — termasuk toast & state. */

export function TransactionActionsSheet({
  tx,
  masked,
  onClose,
  onOpenDetail,
  onEdit,
  onDelete,
}: {
  /** null = sheet tertutup */
  tx: HistoryTransaction | null
  masked: boolean
  onClose: () => void
  onOpenDetail: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Drawer.Root open={tx !== null} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[70] bg-ink/40" />
        <Drawer.Content
          aria-label={TRANSACTION_ACTIONS_COPY.sheetTitleFallback}
          className="fixed inset-x-0 bottom-0 z-[70] mx-auto flex w-full max-w-md flex-col rounded-t-[2rem] bg-cream shadow-2xl outline-none"
        >
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-ink/10" />
          <div className="px-4 pb-8 pt-4" data-lenis-prevent>
            <Drawer.Title className="truncate px-1 font-display text-[15px] font-bold tracking-tight text-ink">
              {tx?.name ?? TRANSACTION_ACTIONS_COPY.sheetTitleFallback}
            </Drawer.Title>
            <Drawer.Description className="mt-0.5 px-1 text-[12px] text-ink/50">
              {tx
                ? `${TRANSACTION_TYPE_LABEL[tx.type]} · ${resolveCategoryLabel(tx)} · ${maskMoney(
                    tx.amount,
                    masked,
                  )}`
                : TRANSACTION_ACTIONS_COPY.sheetHintFallback}
            </Drawer.Description>

            <div className="mt-3 space-y-1">
              <button
                type="button"
                onClick={onOpenDetail}
                className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-[14px] font-medium text-ink/75 transition-colors hover:bg-cream"
              >
                <ReceiptText className="size-4 shrink-0 text-ink/45" strokeWidth={2.2} />
                {TRANSACTION_ACTIONS_COPY.detail}
              </button>
              <button
                type="button"
                onClick={onEdit}
                className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-[14px] font-medium text-ink/75 transition-colors hover:bg-cream"
              >
                <Pencil className="size-4 shrink-0 text-forest" strokeWidth={2.2} />
                {TRANSACTION_ACTIONS_COPY.edit}
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-[14px] font-medium text-plum transition-colors hover:bg-plum/15"
              >
                <Trash2 className="size-4 shrink-0" strokeWidth={2.2} />
                {TRANSACTION_ACTIONS_COPY.delete}
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}


/**
 * Dialog konfirmasi hapus transaksi — "Hapus catatan ini?".
 *
 * Sejak paket 03 hapus SELALU punya jaring pengaman: setelah konfirmasi,
 * toast-nya membawa tombol Undo 5 detik (PRD 2251). Kalimat pengamannya
 * ditaruh di sini, SEBELUM user menekan Hapus, supaya rasa aman datang lebih
 * dulu — dan supaya janji "nggak bisa dibatalin" (yang sudah tidak benar)
 * tidak tertinggal di copy lama.
 *
 * Bentuk visualnya sekarang milik <ConfirmDialog /> bersama supaya dialog hapus
 * TAGIHAN di halaman Tagihan bukan varian kedua yang berbeda tampilannya.
 */
export function ConfirmDeleteDialog({
  tx,
  masked,
  onCancel,
  onConfirm,
}: {
  tx: HistoryTransaction
  masked: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <ConfirmDialog
      titleId="hapus-transaksi-judul"
      overlayLabel={CONFIRM_DELETE_COPY.overlay}
      title={CONFIRM_DELETE_COPY.title}
      body={
        <>
          {CONFIRM_DELETE_COPY.bodyLead(tx.name)}
          <b className="font-semibold text-ink">{maskMoney(tx.amount, masked)}</b>{' '}
          {CONFIRM_DELETE_COPY.bodyTail}
        </>
      }
      safety={CONFIRM_DELETE_COPY.safety}
      cancelLabel={CONFIRM_DELETE_COPY.cancel}
      confirmLabel={CONFIRM_DELETE_COPY.confirm}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
