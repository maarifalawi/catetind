'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  BILL_CARD_ACTION_COPY,
  billWalletName,
  dueContext,
  endAfterLabel,
  getBillStatus,
  maskMoney,
  type Bill,
} from '@/lib/data/bills'

/* ── Kartu tagihan: geser untuk aksi + stempel LUNAS ─────────────────────────
   - Geser KANAN → area sage 'Tandai Lunas ✓' — membuka pemilih DOMPET (paket 51).
     Stempel LUNAS baru muncul setelah baris kasnya benar-benar ditulis
     (`markBillPaid`), jadi kartu ini tidak pernah mengaku lunas tanpa uang keluar
   - Geser KIRI  → area amber 'Edit' + terracotta 'Hapus'
   - Tap         → cuma menutup area aksi (tidak ada teks instruksi apa pun)

   REDESAIN (padat & minimalis): kartu dipadatkan jadi satu baris ±64px.
     · Baris meta yang dulu memanjang (konteks · dompet · kategori · tenor ·
       catatan) dipangkas jadi SATU baris yang digabung dengan teks jatuh tempo —
       konteks tidak perlu diulang karena daftarnya sudah disaring per konteks.
     · Tombol aksi yang dulu memakan satu baris penuh di bawah kartu kini jadi
       tombol IKON di samping kartu, sejajar tingginya (tetap bisa dijangkau
       keyboard lewat `focus-visible`), sementara geser tetap jadi jalur cepat.

   Aksi tersingkap tetap bisa dijangkau keyboard: opacity 0 untuk mata, tetapi
   saat di-focus (`focus-visible:opacity-100 focus-visible:z-20`) tombolnya naik
   ke atas kartu sehingga tidak ada aksi yang cuma bisa diakses via geser.
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
  onUnmarkPaid,
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
  /** batalkan "lunas" (paket 60.4) — hanya dipasang untuk tagihan yang punya
   *  catatan pembayaran (`paidRowId`), karena hanya itu yang bisa dibalikkan */
  onUnmarkPaid?: (bill: Bill) => void
  onEdit: (bill: Bill) => void
  onDelete: (bill: Bill) => void
}) {
  const status = getBillStatus(bill, currentDay)
  const paid = status === 'paid'
  const due = dueContext(bill, status, currentDay)

  /* satu baris keterangan: status jatuh tempo + info yang benar-benar dibaca
     (dompet sumber & tenor cicilan). Kategori & konteks tidak diulang lagi. */
  const metaLine = [due.text, billWalletName(bill.walletId), endAfterLabel(bill)]
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
    setDx((value) => (Math.abs(value) > SNAP ? (value > 0 ? REVEAL_PAY : -REVEAL_ACTIONS) : 0))
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
      className="scroll-mt-[180px] select-none"
    >
      <div className="flex items-stretch gap-2">
        {/* pembungkus kartu: area aksi tersingkap DIKLIP di sini supaya tingginya
            persis setinggi permukaan kartu. Tombol aksi tetap ada DI LUAR. */}
        <div className="relative min-h-[64px] min-w-0 flex-1 overflow-hidden rounded-2xl">
          {/* aksi KIRI — sage, tersingkap saat geser KANAN */}
          <button
            type="button"
            aria-label={BILL_CARD_ACTION_COPY.markPaidA11y(bill.name)}
            title={BILL_CARD_ACTION_COPY.markPaidHint}
            tabIndex={paid ? -1 : 0}
            onClick={() => {
              setDx(0)
              onMarkPaid(bill)
            }}
            className="absolute inset-y-1 left-0 flex w-[116px] flex-col items-center justify-center gap-1 rounded-2xl bg-hud-sage text-forest transition-opacity focus-visible:z-20 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-forest/40"
            style={{ opacity: dx > 0 ? exposed : 0, pointerEvents: dx > 24 ? 'auto' : 'none' }}
          >
            <Check className="size-4" strokeWidth={2.8} aria-hidden />
            <span className="text-[10px] font-medium">
              {BILL_CARD_ACTION_COPY.markPaidSwipe}
            </span>
          </button>

          {/* aksi KANAN — amber Edit + terracotta Hapus, tersingkap saat geser KIRI */}
          <div
            className="absolute inset-y-1 right-0 flex gap-1"
            style={{ opacity: dx < 0 ? exposed : 0, pointerEvents: dx < -24 ? 'auto' : 'none' }}
          >
            <button
              type="button"
              aria-label={BILL_CARD_ACTION_COPY.editA11y(bill.name)}
              tabIndex={paid ? -1 : 0}
              onClick={() => {
                setDx(0)
                onEdit(bill)
              }}
              className="flex w-[82px] flex-col items-center justify-center gap-1 rounded-2xl bg-hud-amber text-forest focus-visible:z-20 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-forest/40"
            >
              <Pencil className="size-4" strokeWidth={2.4} aria-hidden />
              <span className="text-[10px] font-medium">{BILL_CARD_ACTION_COPY.edit}</span>
            </button>
            <button
              type="button"
              aria-label={BILL_CARD_ACTION_COPY.deleteA11y(bill.name)}
              tabIndex={paid ? -1 : 0}
              onClick={() => {
                setDx(0)
                onDelete(bill)
              }}
              className="flex w-[82px] flex-col items-center justify-center gap-1 rounded-2xl bg-hud-terracotta text-cream focus-visible:z-20 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-forest/40"
            >
              <Trash2 className="size-4" strokeWidth={2.4} aria-hidden />
              <span className="text-[10px] font-medium">{BILL_CARD_ACTION_COPY.delete}</span>
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
            aria-label={`${bill.name}, ${maskMoney(bill.amount, masked)}. ${metaLine}.`}
            className={cn(
              'group relative flex w-full cursor-pointer touch-pan-y items-center gap-3 rounded-2xl bg-cream px-3 py-2.5 text-left outline-none',
              'transition-[background-color,box-shadow,opacity] duration-200 animate-[row-in_0.5s_ease_backwards]',
              paid
                ? 'opacity-80 ring-1 ring-inset ring-hud-sage/25'
                : 'ring-1 ring-inset ring-soil/8 hover:bg-cream',
              highlighted && 'bg-sage/35 ring-2 ring-forest/45',
            )}
            style={{
              transform: `translateX(${dx}px)`,
              transitionDuration: dragging ? '0ms' : undefined,
              animationDelay: `${delay}ms`,
            }}
          >
            {/* petunjuk halus ada aksi di balik kartu: garis sage ngintip di tepi kiri */}
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute rounded-full bg-hud-sage',
                paid ? 'inset-y-0 left-0 w-[3px]' : 'inset-y-2 -left-px w-[2px] rounded-r-full',
              )}
            />

            {/* emoji identitas tagihan */}
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sage/45 text-[20px] leading-none ring-1 ring-inset ring-forest/5"
            >
              {bill.emoji}
            </span>

            {/* nama + SATU baris keterangan (jatuh tempo · dompet · tenor) */}
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  'block truncate text-[13px] font-medium text-forest',
                  paid && 'text-forest/75',
                )}
              >
                {bill.name}
              </span>
              <span className={cn('mt-0.5 block truncate text-[11px] font-medium', due.className)}>
                {metaLine}
              </span>
            </span>

            {/* nominal + badge status (hanya untuk telat / hari ini) */}
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span
                className={cn(
                  'text-[13px] tabular-nums',
                  paid ? 'font-medium text-forest/45 line-through' : 'font-medium text-forest',
                )}
              >
                {bill.amount > 0 ? maskMoney(bill.amount, masked) : 'Fleksibel'}
              </span>
              {status === 'overdue' && (
                <span className="rounded-full bg-hud-terracotta/15 px-2 py-0.5 text-[10px] font-medium text-hud-terracotta ring-1 ring-inset ring-hud-terracotta/25">
                  Telat
                </span>
              )}
              {status === 'due_today' && (
                <span className="rounded-full bg-hud-amber/20 px-2 py-0.5 text-[10px] font-medium text-hud-terracotta ring-1 ring-inset ring-hud-amber/30">
                  Hari Ini
                </span>
              )}
            </span>

            {stamp !== 'none' && <LunasStamp variant={stamp} />}
          </button>
        </div>

        {/* AKSI YANG SELALU TERLIHAT — ikon saja, di luar area geser. Geser tetap
            jadi jalur cepat, tapi BUKAN lagi satu-satunya jalur:
                · belum lunas → tombol centang (buka sheet pemilih dompet);
                · lunas & ada catatan pembayaran → tombol batal (konfirmasi dulu);
                · lunas tanpa catatan (tagihan contoh seed) → TIDAK ada tombol,
                  karena membatalkannya tidak mengembalikan uang apa pun. */}
        {!paid && (
          <button
            type="button"
            onClick={() => onMarkPaid(bill)}
            aria-label={BILL_CARD_ACTION_COPY.markPaidA11y(bill.name)}
            title={BILL_CARD_ACTION_COPY.markPaid}
            className="flex w-11 shrink-0 items-center justify-center rounded-2xl bg-sage/70 text-forest transition-colors hover:bg-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/30 active:scale-95"
          >
            <Check className="size-4" strokeWidth={2.8} aria-hidden />
          </button>
        )}
        {paid && bill.paidRowId && onUnmarkPaid && (
          <button
            type="button"
            onClick={() => onUnmarkPaid(bill)}
            aria-label={BILL_CARD_ACTION_COPY.unmarkPaidA11y(bill.name)}
            title={BILL_CARD_ACTION_COPY.unmarkPaid}
            className="flex w-11 shrink-0 items-center justify-center rounded-2xl text-forest/45 ring-1 ring-inset ring-soil/8 transition-colors hover:bg-soil/[0.06] hover:text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/30 active:scale-95"
          >
            <RotateCcw className="size-4" strokeWidth={2.4} aria-hidden />
          </button>
        )}
      </div>
    </motion.li>
  )
}

/* ── STAMP LUNAS — visual tanda tangan halaman ini ──────────────────────────
   Stempel karet diagonal −15°, diletakkan di tengah kartu:
   - 'fresh'   : baru dicap → scale 0 → 1.1 → 1.0 (200ms ease-out) + denyut
                 bayangan sage, opacity penuh
   - 'settled' : sudah menetap di grup "Sudah Dibayar" → opacity 18%,
                 berpadu dengan nominal yang dicoret

   Tepi kasar ditiru dengan garis dalam putus-putus + tekstur titik rapat (bukan
   SVG filter — tetap murah saat banyak kartu sekaligus). Posisi diatur
   pembungkus luar, animasinya di elemen dalam, jadi transform framer tidak
   bertabrakan dengan utility Tailwind.
   ────────────────────────────────────────────────────────────────────────── */

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
          'relative block select-none rounded-md border-2 border-hud-sage px-2 py-0.5 font-display text-[13px] font-medium uppercase leading-tight tracking-[0.22em] text-hud-sage',
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
