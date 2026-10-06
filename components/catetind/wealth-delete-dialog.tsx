'use client'

import { ConfirmDialog } from './confirm-dialog'
import { DELETE_ASSET_COPY, DELETE_DEBT_COPY } from '@/lib/data/wealth'

/* ── SATU DIALOG HAPUS UNTUK SELURUH HALAMAN KEKAYAAN (paket 61) ─────────────
   Hapus HUTANG dan hapus ASET dulu berjalan dengan dua cara: aset lewat toast
   polos tanpa konfirmasi, hutang bahkan belum punya tombolnya. Dua pengalaman
   untuk satu kekhawatiran yang sama ("yakin kehilangan catatan ini?") itu
   persis yang dilarang paket 61.2 — jadi keduanya memakai dialog ini, dan
   seluruh kalimatnya datang dari `lib/data/wealth.ts`.

   Komponen ini sengaja TIDAK menyimpan state & tidak menulis ke store:
   halaman (`wealth-screen.tsx`) yang memutuskan apa yang terjadi, dan halaman
   juga yang menaruh komponen ini di dalam <AnimatePresence> supaya animasi
   keluarnya tetap jalan — pola yang sama dengan `ConfirmDeleteDialog` di
   `transaction-actions.tsx` (paket 03). */

export function WealthDeleteDialog({
  variant,
  kind = 'hutang',
  name,
  amountLabel,
  onCancel,
  onConfirm,
}: {
  variant: 'debt' | 'asset'
  /**
   * Hanya dipakai varian `debt`: arah catatan menentukan arah akibatnya ke Net
   * Worth (hutang hilang → Net Worth naik, piutang hilang → turun). Kalau
   * dibalik di sini, kalimat jujurnya justru jadi salah.
   */
  kind?: 'hutang' | 'piutang'
  /** nama provider / lawan / aset yang akan dihapus */
  name: string
  /**
   * Nominal yang SUDAH diformat pemanggil (`maskMoney`) — dialog ini tidak
   * pernah mengarang angka sendiri, dan ikut tersensor saat mode privasi nyala.
   */
  amountLabel: string
  onCancel: () => void
  onConfirm: () => void
}) {
  const debt = variant === 'debt'
  const copy = debt ? DELETE_DEBT_COPY : DELETE_ASSET_COPY
  const title = debt ? DELETE_DEBT_COPY.title(kind) : DELETE_ASSET_COPY.title
  const tail = debt ? DELETE_DEBT_COPY.bodyTail(kind) : DELETE_ASSET_COPY.bodyTail

  return (
    <ConfirmDialog
      titleId={debt ? 'hapus-hutang-judul' : 'hapus-aset-judul'}
      overlayLabel={copy.overlay}
      title={title}
      body={
        <>
          {copy.bodyLead(name)}
          <b className="font-medium text-forest tabular-nums">{amountLabel}</b> {tail}
        </>
      }
      note={copy.cashNote}
      safety={copy.safety}
      cancelLabel={copy.cancel}
      confirmLabel={copy.confirm}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
