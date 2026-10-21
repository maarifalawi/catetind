'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Pencil, RotateCcw, Trash2, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  BILL_CARD_ACTION_COPY,
  billWalletName,
  dueContext,
  endAfterLabel,
  getBillStatus,
  maskMoney,
  type Bill,
  type BillStatus,
} from '@/lib/data/bills'
import { BillGlyph } from './bill-glyph'

/* ── Kartu tagihan: geser untuk aksi + stempel LUNAS ─────────────────────────
   - Geser KANAN → area sage 'Tandai Lunas' — membuka pemilih DOMPET (paket 51).
     Stempel LUNAS baru muncul setelah baris kasnya benar-benar ditulis
     (`markBillPaid`), jadi kartu ini tidak pernah mengaku lunas tanpa uang keluar
   - Geser KIRI  → area amber 'Edit' + terracotta 'Hapus'
   - Tap         → cuma menutup area aksi (tidak ada teks instruksi apa pun)

   REDESAIN (padat & minimalis): kartu dipadatkan jadi satu baris ±64px.
     · Baris meta yang dulu memanjang (konteks · dompet · kategori · tenor ·
       catatan) dipangkas jadi SATU baris yang digabung dengan teks jatuh tempo —
       konteks tidak perlu diulang karena daftarnya sudah disaring per konteks.
     · Status dibawa oleh LATAR baris yang tipis (lihat ROW_TINT di bawah), bukan
       badge tambahan. Aksi selalu terlihat sebagai pil Evergreen "Bayar →"
       (telat: "Bayar Sekarang"), sementara geser tetap jadi jalur cepat.

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

/* ── TINT BARIS PER STATUS — meminjam opasitas daftar di halaman lain ────────
   Nilainya SAMA dengan `CATEGORY_VISUAL.row` (History/Dashboard), jadi baris
   tagihan terasa satu keluarga dengan daftar transaksi:
     · belum dibayar → Cantelope 10%  (`bg-cantelope/[0.10]`)
     · hari ini      → Daisy 13%     (`bg-daisy/[0.13]`)
     · telat         → Plum 9%       (`bg-plum/[0.09]`)
     · sudah dibayar → Mint 14%      (`bg-mint/[0.14]`)
   Tanpa ring berwarna: batas baris dibawa oleh tint tipis + jarak, persis seperti
   daftar transaksi. Hover hanya menaikkan opasitas satu tingkat. */
const ROW_TINT: Record<BillStatus, string> = {
  overdue: 'bg-plum/[0.09] hover:bg-plum/[0.15]',
  due_today: 'bg-daisy/[0.13] hover:bg-daisy/[0.20]',
  upcoming: 'bg-cantelope/[0.10] hover:bg-cantelope/[0.16]',
  paid: 'bg-mint/[0.14] hover:bg-mint/[0.20]',
}

export type StampState = 'none' | 'fresh'

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
  /** 'fresh' = stempel baru dicap (0 → 1.1 → 1.0); 'none' = tanpa stempel.
   *  Baris yang sudah menetap lunas TIDAK diberi watermark — statusnya cukup
   *  dibawa oleh nominal yang dicoret + tombol centang di kanan kartu. */
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
     (dompet sumber & tenor cicilan). Untuk baris LUNAS, teks statusnya tidak
     diulang — barisnya sudah berada di grup "Sudah dibayar". */
  const metaLine = [
    paid ? '' : due.text,
    billWalletName(bill.walletId),
    endAfterLabel(bill),
  ]
    .filter(Boolean)
    .join(' · ')
  /* H6-3 (audit UI/UX): dompet sumber dipisah dari baris teks supaya bisa
     tampil sebagai badge yang menonjol (ikon + nama). */
  const walletName = billWalletName(bill.walletId)
  const metaText = [paid ? '' : due.text, endAfterLabel(bill)].filter(Boolean).join(' · ')

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
          {/* aksi KIRI — sage, tersingkap saat geser KANAN. Tidak dirender untuk
              baris lunas: baris itu tidak bisa digeser, jadi teks "Lunas" di
              dalamnya tidak perlu ada sama sekali. */}
          {!paid && (
            <button
              type="button"
              aria-label={BILL_CARD_ACTION_COPY.markPaidA11y(bill.name)}
              title={BILL_CARD_ACTION_COPY.markPaidHint}
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
          )}

          {/* aksi KANAN — amber Edit + terracotta Hapus, tersingkap saat geser KIRI */}
          {!paid && (
            <div
              className="absolute inset-y-1 right-0 flex gap-1"
              style={{ opacity: dx < 0 ? exposed : 0, pointerEvents: dx < -24 ? 'auto' : 'none' }}
            >
              <button
                type="button"
                aria-label={BILL_CARD_ACTION_COPY.editA11y(bill.name)}
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
          )}

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
              'group relative flex w-full cursor-pointer touch-pan-y items-center gap-2.5 rounded-2xl px-3.5 py-3 text-left outline-none',
              'transition-[background-color,box-shadow,opacity] duration-200 animate-[row-in_0.5s_ease_backwards]',
              ROW_TINT[status],
              highlighted && 'ring-2 ring-inset ring-forest/25',
            )}
            style={{
              transform: `translateX(${dx}px)`,
              transitionDuration: dragging ? '0ms' : undefined,
              animationDelay: `${delay}ms`,
            }}
          >
            {/* ikon identitas tagihan — SATU set ikon garis untuk semua kartu
                (emoji bawaan sistem diganti BillGlyph supaya gayanya konsisten) */}
            <BillGlyph bill={bill} muted={paid} />

            {/* nama + SATU baris keterangan (jatuh tempo · dompet · tenor) */}
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  'block truncate text-[13px] font-semibold text-forest',
                  paid && 'text-forest-muted',
                )}
              >
                {bill.name}
              </span>
              <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
                {metaText && (
                  <span className={cn('truncate text-[11px] font-medium', due.className)}>
                    {metaText}
                  </span>
                )}
                {walletName && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sage/70 px-2 py-0.5 text-[10px] font-medium text-forest-muted">
                    <Wallet className="size-3" strokeWidth={2.2} aria-hidden />
                    {walletName}
                  </span>
                )}
              </span>
            </span>

            {/* nominal (kanan, sejajar) — status tidak diulang sebagai label:
                warna baris + tanggal jatuh tempo sudah membawanya */}
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span
                className={cn(
                  'text-[12.5px] font-medium tabular-nums',
                  paid
                    ? 'text-forest-muted line-through decoration-forest/20'
                    : 'text-forest',
                )}
              >
                {bill.amount > 0 ? maskMoney(bill.amount, masked) : 'Fleksibel'}
              </span>
            </span>

            {/* stempel karet hanya saat BARU dibayar — baris yang sudah menetap
                tidak lagi diberi watermark LUNAS supaya daftar tetap bersih. */}
            {stamp === 'fresh' && <LunasStamp />}
          </button>
        </div>

        {/* AKSI YANG SELALU TERLIHAT — bentuknya sengaja BEDA antara aksi dan
            status supaya di layar sentuh tidak ada yang salah tap:
                · belum lunas → tombol PIL penuh Evergreen "Bayar →" (jelas bisa
                  ditekan; membuka sheet pemilih dompet). Yang telat memakai
                  label mendesak "Bayar Sekarang";
                · lunas → TIDAK ada label "Lunas" lagi: barisnya sudah berada di
                  grup "Sudah dibayar". Yang tersisa hanya tombol putar balik
                  untuk membatalkan pembayaran (kalau ada catatan kasnya). */}
        {!paid && (
          <button
            type="button"
            onClick={() => onMarkPaid(bill)}
            aria-label={BILL_CARD_ACTION_COPY.markPaidA11y(bill.name)}
            title={BILL_CARD_ACTION_COPY.markPaid}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 self-center whitespace-nowrap rounded-full bg-forest pl-3 pr-2.5 text-cream transition-colors hover:bg-forest-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/30 active:scale-95"
          >
            <span className="text-[10px] font-semibold leading-none">
              {status === 'overdue' ? 'Bayar Sekarang' : 'Bayar'}
            </span>
            <ArrowRight className="size-3.5" strokeWidth={2.6} aria-hidden />
          </button>
        )}
        {paid && bill.paidRowId && onUnmarkPaid && (
          <button
            type="button"
            onClick={() => onUnmarkPaid(bill)}
            aria-label={BILL_CARD_ACTION_COPY.unmarkPaidA11y(bill.name)}
            title={BILL_CARD_ACTION_COPY.unmarkPaid}
            className="relative flex size-8 shrink-0 items-center justify-center self-center rounded-full text-forest-muted ring-1 ring-inset ring-soil/12 transition-colors after:absolute after:-inset-2 after:content-[''] hover:bg-sage/50 hover:text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/30 active:scale-95"
          >
            <RotateCcw className="size-3.5" strokeWidth={2.4} aria-hidden />
          </button>
        )}
      </div>
    </motion.li>
  )
}

/* ── STAMP LUNAS — visual tanda tangan halaman ini ──────────────────────────
   Stempel karet diagonal −15° yang HANYA muncul tepat setelah user menekan
   "Tandai Lunas" (animasi scale 0 → 1.1 → 1.0 + denyut bayangan sage), lalu
   hilang bersama `stampId`. Kartu yang sudah menetap di grup "Sudah Dibayar"
   tidak lagi membawa watermark — daftar tetap bersih dan nominal yang dicoret
   sudah cukup menjelaskan statusnya.

   Tepi kasar ditiru dengan garis dalam putus-putus + tekstur titik rapat (bukan
   SVG filter — tetap murah saat banyak kartu sekaligus). Posisi diatur
   pembungkus luar, animasinya di elemen dalam, jadi transform framer tidak
   bertabrakan dengan utility Tailwind.
   ────────────────────────────────────────────────────────────────────────── */

function LunasStamp() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
    >
      <motion.span
        initial={{ opacity: 0, scale: 0.35, rotate: -15 }}
        animate={{
          opacity: 1,
          scale: [0, 1.1, 1],
          rotate: -15,
          boxShadow: ['0 0 0 0 rgba(181,185,135,0.55)', '0 0 0 12px rgba(181,185,135,0)'],
        }}
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
