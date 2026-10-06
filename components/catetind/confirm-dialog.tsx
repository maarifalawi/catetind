'use client'

import { useEffect, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react'

/* ── Dialog Konfirmasi (aksi merusak) — SATU wujud untuk seluruh app ──────────
   Hapus TAGIHAN (paket 03) dan hapus TRANSAKSI memakai jaring pengaman yang
   sama: konfirmasi dulu, lalu masih ada Undo 5 detik. Supaya dua alur itu tidak
   menumbuhkan dua dialek dialog (beda radius, beda ritme, beda kalimat), bentuk
   visualnya diangkat ke satu komponen presentasional di sini.

   Murni tampilan: halaman pemilik state yang memutuskan apa yang terjadi, dan
   halaman juga yang menaruh komponen ini di dalam <AnimatePresence> supaya
   animasi keluarnya tetap jalan. */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export function ConfirmDialog({
  titleId,
  overlayLabel,
  title,
  body,
  safety,
  note,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  /** id untuk aria-labelledby (harus unik per dialog) */
  titleId: string
  /** aria-label tombol gelap di belakang dialog (klik = batal) */
  overlayLabel: string
  title: string
  /** isi kalimat; boleh memuat elemen tebal (mis. nominalnya) */
  body: ReactNode
  /**
   * Baris pengaman di atas tombol: menjelaskan bahwa aksinya MASIH bisa
   * dibatalkan (Undo). Ditaruh sebelum user menekan Hapus, bukan sesudah —
   * rasa aman harus datang lebih dulu.
   */
  safety?: string
  /**
   * Kalimat FAKTA yang harus terbaca SEBELUM user menekan Hapus. Dipisah dari
   * `body` karena artinya beda: `body` menjawab "apa yang hilang", `note`
   * menjawab "apa yang TIDAK ikut hilang" (mis. baris kas yang sudah benar-benar
   * keluar di halaman Kekayaan, paket 61). Opsional — pemanggil lama tidak
   * berubah sama sekali.
   */
  note?: string
  cancelLabel: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}) {
  /* Escape = membatalkan (pilihan AMAN, bukan yang merusak) */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center p-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <button
        type="button"
        aria-label={overlayLabel}
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-ink/50"
      />
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 6 }}
        transition={{ duration: 0.24, ease: EASE }}
        className="relative w-full max-w-sm rounded-[1.75rem] bg-cream p-5 shadow-[0_28px_70px_-24px_rgba(69,89,78,0.5)] ring-1 ring-soil/12"
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-plum/15 text-plum">
          <AlertTriangle className="size-5" strokeWidth={2.2} />
        </span>
        <h2
          id={titleId}
          className="mt-3 font-display text-[16px] font-medium tracking-tight text-forest"
        >
          {title}
        </h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-forest/55">{body}</p>

        {note && (
          <p className="mt-3 rounded-2xl bg-soil/[0.1] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-forest/60">
            {note}
          </p>
        )}

        {safety && (
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-sage/50 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-forest">
            <RotateCcw className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
            {safety}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="h-11 rounded-2xl bg-cream text-[13.5px] font-medium text-forest ring-1 ring-soil/12 transition-colors hover:bg-sage/60 active:scale-[0.98]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-plum text-[13.5px] font-medium text-cream transition-colors hover:bg-plum active:scale-[0.98]"
          >
            <Trash2 className="size-4" strokeWidth={2.3} aria-hidden />
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
