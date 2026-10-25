'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, BellRing, X } from 'lucide-react'
import {
  JOINT_ME,
  JOINT_PARTNER,
  moneyLabel,
  type JointTransaction,
} from '@/lib/data/joint'

/* ── NOTIFIKASI PUSH PENGELUARAN BESAR (Section 11) ──────────────────────────
   Satu-satunya banner yang tersisa di halaman Dompet Bersama setelah redesign.
   Ia BUKAN kartu settlement dan bukan rekap: hanya penanda bahwa catatan baru
   melewati ambang `PUSH_ALERT_THRESHOLD`, dengan satu pintu ke Split Bill.

   Banner rekap bulanan & mingguan (yang dulu menampilkan timbangan mini dan
   tombol settle duplikat) DIHAPUS dari modul ini — halaman sekarang punya satu
   kartu settlement saja.
   ────────────────────────────────────────────────────────────────────────── */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/** banner gaya push notification untuk pengeluaran bareng yang besar */
export function JointPushBanner({
  tx,
  masked,
  onDismiss,
  onOpenSplit,
}: {
  /** transaksi besar terakhir (null = tidak ada) */
  tx: JointTransaction | null
  masked: boolean
  onDismiss: () => void
  onOpenSplit: (tx: JointTransaction) => void
}) {
  const who = tx?.userId === JOINT_PARTNER.id ? JOINT_PARTNER : JOINT_ME

  return (
    <AnimatePresence initial={false}>
      {tx && (
        <motion.div
          key={tx.id}
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="mt-3 flex items-start gap-3 rounded-[1.5rem] bg-cream px-4 py-3.5 ring-1 ring-hud-amber/45 shadow-[0_20px_44px_-34px_rgba(255,184,133,0.95)]"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-hud-amber/25 text-hud-terracotta">
            <BellRing className="size-4" strokeWidth={2.3} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5">
              <span className="rounded-full bg-hud-amber/25 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-hud-terracotta">
                Push
              </span>
              <span className="text-[10.5px] font-medium text-forest/40">Pengeluaran besar</span>
            </p>
            <p className="mt-1 text-[13px] font-medium leading-snug text-forest">
              {who.avatar} {who.name} barusan catat {tx.description}{' '}
              <span className="tabular-nums">{moneyLabel(tx.amount, masked)}</span>, split-nya udah
              pas belum?
            </p>
            <button
              type="button"
              onClick={() => onOpenSplit(tx)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-forest/5 px-3 py-1.5 text-[11.5px] font-medium text-forest ring-1 ring-forest/15 transition-colors hover:bg-forest/10"
            >
              Atur pembagian
              <ArrowRight className="size-3.5" strokeWidth={2.6} />
            </button>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Tutup notifikasi"
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-forest/35 transition-colors hover:bg-soil/[0.11] hover:text-forest/60"
          >
            <X className="size-3.5" strokeWidth={2.4} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
