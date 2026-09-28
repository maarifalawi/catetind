'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  billWalletName,
  dueContext,
  endAfterLabel,
  getBillStatus,
  maskMoney,
  type Bill,
} from '@/lib/data/bills'
import { CONTEXT_LABEL } from '@/lib/data/money-context'

/* ── Kartu tagihan: geser untuk aksi + stempel LUNAS (Section 7B–7D) ────────
   - Geser KANAN → area sage 'Tandai Lunas ✓' — membuka pemilih DOMPET (paket
     51). Stempel LUNAS baru muncul setelah baris kasnya benar-benar ditulis
     (`markBillPaid`), jadi kartu ini tidak pernah mengaku lunas tanpa uang keluar
   - Geser KIRI  → area amber 'Edit' + terracotta 'Hapus'
   - Tap         → cuma menutup area aksi (tidak ada teks instruksi apa pun)

   Kartu yang belum dibayar menampilkan garis sage 2px yang "ngintip" di tepi
   kiri sebagai petunjuk halus bahwa ada aksi di baliknya. Kartu lunas justru
   dapat garis sage 3px penuh + stempel diagonal samar + nominal dicoret.

   Aksi tersingkap tetap bisa dijangkau keyboard: opacity-nya 0 untuk mata,
   tetapi saat di-focus (`focus-visible:opacity-100 focus-visible:z-20`) tombol
   naik ke atas kartu sehingga tidak ada aksi yang cuma bisa diakses via geser.
   ────────────────────────────────────────────────────────────────────────── */

/** lebar area aksi yang tersingkap (px) — kanan lebih lebar karena memuat dua
 *  tombol (Edit + Hapus) */
const REVEAL_PAY = 116
const REVEAL_ACTIONS = 168
/** ambang snap: geseran > 44px langsung membuka penuh */
const SNAP = 44

export type StampState = 'none' | 'fresh' | 'settled'

export function BillCard({
  bill,
  masked,
  currentDay,
  stamp,
  highlighted = false,
  delay = 0,
  onMarkPaid,
  onEdit,
  onDelete,
}: {
  bill: Bill
  masked: boolean
  currentDay: number
  /** 'fresh' = stempel baru dicap (0 → 1.1 → 1.0), 'settled' = lunas menetap */
  stamp: StampState
  /** kartu baru disorot karena tanggalnya dipilih di timeline */
  highlighted?: boolean
  /** jeda animasi masuk (stagger antar kartu) */
  delay?: number
  onMarkPaid: (bill: Bill) => void
  onEdit: (bill: Bill) => void
  onDelete: (bill: Bill) => void
}) {
  const status = getBillStatus(bill, currentDay)
  const paid = status === 'paid'
  const due = dueContext(bill, status, currentDay)
  /* badge konteks (paket 47): tagihan ini milik konteks uang yang mana. Ditulis
     di baris meta (bukan tooltip) supaya user tahu kepemilikannya tanpa hover —
     penting karena satu tagihan bisa dibuka dari halaman lain/konteks lain. */
  const meta = [
    CONTEXT_LABEL[bill.scope],
    billWalletName(bill.walletId),
    bill.category,
    endAfterLabel(bill),
  ]
    .filter(Boolean)
    .join(' · ')

  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef<number | null>(null)
  const moved = useRef(false)

  /* kartu lunas tidak bisa digeser lagi — hanya tagihan aktif yang punya aksi */
  const clamp = (value: number) =>
    paid ? 0 : Math.max(-REVEAL_ACTIONS, Math.min(REVEAL_PAY, value))

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    startX.current = event.clientX
    moved.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (startX.current === null) return
    const distance = event.clientX - startX.current
    if (Math.abs(distance) > 6) {
      moved.current = true
      setDragging(true)
    }
    setDx(clamp(distance))
  }

  /** lepas jari: snap ke lebar penuh kalau sudah lewat ambang, kalau tidak tutup */
  const settle = () => {
    if (startX.current === null) return
    startX.current = null
    setDragging(false)
    setDx((value) =>
      Math.abs(value) > SNAP
        ? value > 0
          ? REVEAL_PAY
          : -REVEAL_ACTIONS
        : 0,
    )
  }

  /* tap tidak pernah ikut terhitung saat kartunya sedang digeser */
  const onClick = (event: React.MouseEvent) => {
    if (moved.current || dx !== 0) {
      event.preventDefault()
      event.stopPropagation()
      setDx(0)
    }
  }

  const exposed = Math.abs(dx) / (dx > 0 ? REVEAL_PAY : REVEAL_ACTIONS)

  return (
    <motion.li
      layout
      layoutId={`bill-${bill.id}`}
      id={`bill-card-${bill.id}`}
      transition={{ type: 'spring', stiffness: 340, damping: 34 }}
      className="relative min-h-[76px] scroll-mt-[180px] select-none overflow-hidden rounded-2xl"
    >
      {/* aksi KIRI — sage, tersingkap saat geser KANAN */}
      <button
        type="button"
        aria-label={`Tandai lunas ${bill.name}`}
        tabIndex={paid ? -1 : 0}
        onClick={() => {
          setDx(0)
          onMarkPaid(bill)
        }}
        className="absolute inset-y-1 left-0 flex w-[116px] flex-col items-center justify-center gap-1 rounded-2xl bg-hud-sage text-[#000000] transition-opacity focus-visible:z-20 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-forest/40"
        style={{ opacity: dx > 0 ? exposed : 0, pointerEvents: dx > 24 ? 'auto' : 'none' }}
      >
        <Check className="size-4" strokeWidth={2.8} />
        <span className="text-[10px] font-bold">Tandai Lunas ✓</span>
      </button>

      {/* aksi KANAN — amber Edit + terracotta Hapus, tersingkap saat geser KIRI */}
      <div
        className="absolute inset-y-1 right-0 flex gap-1"
        style={{ opacity: dx < 0 ? exposed : 0, pointerEvents: dx < -24 ? 'auto' : 'none' }}
      >
        <button
          type="button"
          aria-label={`Edit ${bill.name}`}
          tabIndex={paid ? -1 : 0}
          onClick={() => {
            setDx(0)
            onEdit(bill)
          }}
          className="flex w-[82px] flex-col items-center justify-center gap-1 rounded-2xl bg-hud-amber text-[#000000] focus-visible:z-20 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-forest/40"
        >
          <Pencil className="size-4" strokeWidth={2.4} />
          <span className="text-[10px] font-bold">Edit</span>
        </button>
        <button
          type="button"
          aria-label={`Hapus ${bill.name}`}
          tabIndex={paid ? -1 : 0}
          onClick={() => {
            setDx(0)
            onDelete(bill)
          }}
          className="flex w-[82px] flex-col items-center justify-center gap-1 rounded-2xl bg-hud-terracotta text-cream focus-visible:z-20 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-forest/40"
        >
          <Trash2 className="size-4" strokeWidth={2.4} />
          <span className="text-[10px] font-bold">Hapus</span>
        </button>
      </div>

      {/* permukaan kartu — inilah yang digeser & ditempeli stempel LUNAS */}
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={settle}
        onPointerCancel={settle}
        onClick={onClick}
        aria-label={`${bill.name}, ${maskMoney(bill.amount, masked)}. ${due.text}.`}
        className={cn(
          'group relative flex w-full cursor-pointer touch-pan-y items-center gap-3 rounded-2xl bg-cream px-3.5 py-3 text-left outline-none',
          'transition-[background-color,box-shadow,opacity] duration-200 animate-[row-in_0.5s_ease_backwards]',
          paid
            ? 'opacity-75 ring-1 ring-inset ring-hud-sage/25'
            : 'ring-1 ring-inset ring-soil/8 hover:bg-cream',
          highlighted && 'bg-sage/35 ring-2 ring-forest/45',
        )}
        style={{
          transform: `translateX(${dx}px)`,
          transitionDuration: dragging ? '0ms' : undefined,
          animationDelay: `${delay}ms`,
        }}
      >
        {/* anjuran halus ada aksi di balik kartu: garis sage ngintip di tepi kiri */}
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute rounded-full bg-hud-sage',
            paid ? 'inset-y-0 left-0 w-[3px]' : 'inset-y-2 -left-px w-[2px] rounded-r-full',
          )}
        />

        {/* emoji besar */}
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sage/45 text-[26px] leading-none ring-1 ring-inset ring-forest/5"
        >
          {bill.emoji}
        </span>

        {/* nama + konteks jatuh tempo + meta */}
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block truncate text-[13.5px] font-semibold text-ink',
              paid && 'text-ink/75',
            )}
          >
            {bill.name}
          </span>
          <span className={cn('mt-0.5 block truncate text-[11.5px] font-medium', due.className)}>
            {due.text}
          </span>
          {meta && (
            <span className="mt-0.5 block truncate text-[10.5px] text-ink/35">{meta}</span>
          )}
        </span>

        {/* nominal + badge status */}
        <span className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={cn(
              'text-[13.5px] tabular-nums',
              paid ? 'font-semibold text-ink/45 line-through' : 'font-bold text-ink',
            )}
          >
            {bill.amount > 0 ? maskMoney(bill.amount, masked) : 'Fleksibel'}
          </span>
          {status === 'overdue' && (
            <span className="rounded-full bg-hud-terracotta/15 px-2 py-0.5 text-[10px] font-bold text-hud-terracotta ring-1 ring-inset ring-hud-terracotta/25">
              Telat
            </span>
          )}
          {status === 'due_today' && (
            <span className="rounded-full bg-hud-amber/20 px-2 py-0.5 text-[10px] font-bold text-[#b89191] ring-1 ring-inset ring-hud-amber/30">
              Hari Ini
            </span>
          )}
        </span>

        {stamp !== 'none' && <LunasStamp variant={stamp} />}
      </button>
    </motion.li>
  )
}


/* ── STAMP LUNAS — visual tanda tangan halaman ini (Section 7C) ─────────────
   Stempel karet diagonal −15°, diletakkan di tengah kartu:
   - 'fresh'   : baru dicap → scale 0 → 1.1 → 1.0 (200ms ease-out) + denyut
                 bayangan sage, opacity penuh
   - 'settled' : sudah menetap di grup "Sudah Dibayar" → opacity 18%,
                 berpadu dengan nominal yang dicoret

   Tepi kasar ditiru dengan garis dalam putus-putus + tekstur titik rapat
   (bukan SVG filter — tetap murah saat banyak kartu sekaligus). Posisi diatur
   pembungkus luar, animasinya di elemen dalam, jadi transform framer tidak
   bertabrakan dengan utility Tailwind. */
function LunasStamp({ variant }: { variant: 'fresh' | 'settled' }) {
  const fresh = variant === 'fresh'
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
    >
      <motion.span
        initial={fresh ? { opacity: 0, scale: 0.35, rotate: -15 } : false}
        animate={
          fresh
            ? {
                opacity: 1,
                scale: [0, 1.1, 1],
                rotate: -15,
                boxShadow: ['0 0 0 0 rgba(181,185,135,0.55)', '0 0 0 12px rgba(181,185,135,0)'],
              }
            : { opacity: 0.18, scale: 1, rotate: -15 }
        }
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={cn(
          'relative block select-none rounded-md border-2 border-hud-sage px-2 py-0.5 font-display text-[13px] font-black uppercase leading-tight tracking-[0.22em] text-hud-sage',
          /* tepi kasar ala stempel karet: garis dalam putus-putus + tekstur tinta */
          'after:absolute after:inset-[2.5px] after:rounded-[3px] after:border after:border-dashed after:border-hud-sage/45',
          '[background-image:radial-gradient(rgba(181,185,135,0.28)_0.6px,transparent_0.9px)] [background-size:4px_4px]',
        )}
      >
        LUNAS
      </motion.span>
    </span>
  )
}
