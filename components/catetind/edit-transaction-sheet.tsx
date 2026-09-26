'use client'

import { useEffect, useState } from 'react'
import { BudgetSheet } from './budget-sheet'
import {
  TransactionInputEngine,
  type TransactionDraft,
} from '@/components/dashboard/transaction-input-engine'
import { EDIT_TRANSACTION_COPY, type HistoryTransaction } from '@/lib/data/history'

/* ── Sheet Edit Transaksi (paket 03) ──────────────────────────────────────────
   Jalur UTAMA perbaikan data. Kasus paling umum bukan "user mau mengarang
   catatan baru", tapi "Minca salah nebak kategori" (lihat artikel bantuan
   "Minca Salah Nebak Kategori, Gimana?") — karena itu menekan Edit harus
   membuka form yang SUDAH TERISI, bukan form kosong yang harus diisi ulang.

   Isinya tetap `TransactionInputEngine` yang sama dengan bottom sheet FAB &
   modal web (Single Source of Truth form transaksi) dalam `initial` = mode
   edit; shell-nya `BudgetSheet` supaya tempo buka/tutup, radius, dan posisi
   dialog di desktop identik dengan sheet lain di app.

   Presentasional: halaman pemanggil yang menyimpan & memberi toast. */

export function EditTransactionSheet({
  tx,
  onSave,
  onClose,
}: {
  /** transaksi yang sedang diubah — null = sheet tertutup */
  tx: HistoryTransaction | null
  /** menerima transaksi VERSI BARU (id tetap sama) */
  onSave: (next: HistoryTransaction) => void
  onClose: () => void
}) {
  /**
   * `shown` = salinan transaksi terakhir yang dibuka.
   *
   * Dua alasannya: (1) saat sheet sedang MENUTUP, halaman pemanggil sudah
   * mengosongkan `tx` padahal animasi tutup Vaul masih berjalan ~280ms — tanpa
   * salinan ini judulnya berkedip jadi "Edit " kosong; (2) data yang dipakai
   * saat submit harus yang terakhir terlihat, bukan yang sudah di-null-kan.
   */
  const [shown, setShown] = useState<HistoryTransaction | null>(null)

  useEffect(() => {
    if (tx) setShown(tx)
  }, [tx])

  /* dibaca sinkron (bukan dari state turunan lewat effect) supaya frame PERTAMA
     saat sheet dibuka sudah berisi data — tidak ada kedipan "Edit " */
  const data = tx ?? shown

  function submit(draft: TransactionDraft) {
    if (!data) return
    const name = draft.note.trim() || data.name
    onSave({
      ...data,
      name,
      amount: draft.amount,
      type: draft.type,
      category: draft.category ?? data.category,
      wallet: draft.wallet ?? data.wallet,
      date: draft.date ?? data.date,
      /* badge "dibuat AI" cuma jujur selama namanya memang belum disentuh user */
      aiGenerated: name === data.name ? data.aiGenerated : false,
    })
  }

  return (
    <BudgetSheet
      open={tx !== null}
      onClose={onClose}
      title={EDIT_TRANSACTION_COPY.title(data?.name ?? '')}
      description={EDIT_TRANSACTION_COPY.description}
    >
      <TransactionInputEngine
        active={tx !== null}
        layout="dialog"
        initial={data}
        onSubmitted={submit}
      />
    </BudgetSheet>
  )
}
