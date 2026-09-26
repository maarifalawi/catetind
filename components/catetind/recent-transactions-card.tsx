'use client'

import { memo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Car,
  ChevronRight,
  Coffee,
  Pencil,
  ReceiptText,
  ShoppingBag,
  Sparkles,
  Sprout,
  Trash2,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePrivacy } from './privacy-provider'

type Transaction = {
  icon: LucideIcon
  title: string
  category: string
  time: string
  amount: string
  type: 'income' | 'expense'
  /* tile ikon: gradient + drop shadow warna per kategori (makin kuat saat hover) */
  tile: string
}

type TransactionGroup = {
  label: string
  /* grup hari ini dapat dot leaf berdenyut */
  live?: boolean
  items: Transaction[]
}

const GROUPS: TransactionGroup[] = [
  {
    label: 'Hari ini',
    live: true,
    items: [
      { icon: Coffee, title: 'Starbucks', category: 'Makanan & Minuman', time: '14:32', amount: '-Rp 85.000', type: 'expense', tile: 'bg-gradient-to-br from-cantelope/25 to-cantelope/10 text-cantelope shadow-[0_8px_16px_-8px_rgba(255,184,133,0.45)] group-hover:shadow-[0_14px_24px_-8px_rgba(255,184,133,0.6)]' },
    ],
  },
  {
    label: 'Kemarin',
    items: [
      { icon: Banknote, title: 'Gaji Bulanan', category: 'Pemasukan', time: '09:00', amount: '+Rp 8.500.000', type: 'income', tile: 'bg-gradient-to-br from-mint/80 to-mint/25 text-forest shadow-[0_8px_16px_-8px_rgba(145,187,158,0.55)] group-hover:shadow-[0_14px_24px_-8px_rgba(145,187,158,0.7)]' },
      { icon: Car, title: 'Grab', category: 'Transport', time: '08:15', amount: '-Rp 42.000', type: 'expense', tile: 'bg-gradient-to-br from-thistle/20 to-thistle/10 text-thistle shadow-[0_8px_16px_-8px_rgba(145,160,184,0.4)] group-hover:shadow-[0_14px_24px_-8px_rgba(145,160,184,0.55)]' },
    ],
  },
  {
    label: '21 Sep',
    items: [
      { icon: Zap, title: 'Listrik PLN', category: 'Tagihan', time: '19:40', amount: '-Rp 350.000', type: 'expense', tile: 'bg-gradient-to-br from-daisy/25 to-daisy/10 text-soil shadow-[0_8px_16px_-8px_rgba(255,184,133,0.45)] group-hover:shadow-[0_14px_24px_-8px_rgba(255,184,133,0.6)]' },
      { icon: ShoppingBag, title: 'Shopee', category: 'Belanja', time: '16:05', amount: '-Rp 275.000', type: 'expense', tile: 'bg-gradient-to-br from-plum/20 to-plum/10 text-plum shadow-[0_8px_16px_-8px_rgba(184,145,145,0.4)] group-hover:shadow-[0_14px_24px_-8px_rgba(184,145,145,0.55)]' },
    ],
  },
]

/* offset item kumulatif per grup — untuk delay animasi staggered */
const OFFSETS: number[] = []
{
  let acc = 0
  for (const group of GROUPS) {
    OFFSETS.push(acc)
    acc += group.items.length
  }
}


/**
 * Baris transaksi swipeable (tabel gesture Domain 3D):
 * geser KANAN → reveal tombol "Edit" (olive) · geser KIRI → reveal "Hapus" (plum).
 * Works via pointer events — mouse drag di desktop & touch di mobile.
 */
function SwipeRow({
  tx,
  delay,
  onDelete,
}: {
  tx: Transaction
  delay: number
  onDelete: () => void
}) {
  const { hide } = usePrivacy()
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef<number | null>(null)
  const moved = useRef(false)

  const clamp = (v: number) => Math.max(-REVEAL, Math.min(REVEAL, v))

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    startX.current = e.clientX
    moved.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (startX.current === null) return
    const d = e.clientX - startX.current
    if (Math.abs(d) > 6) {
      moved.current = true
      setDragging(true)
    }
    setDx(clamp(d))
  }
  const settle = () => {
    if (startX.current === null) return
    startX.current = null
    setDragging(false)
    setDx((v) => (Math.abs(v) > 44 ? Math.sign(v) * REVEAL : 0))
  }
  /* klik biasa tetap jalan — tap tanpa geser dianggap buka detail */
  const onClick = (e: React.MouseEvent) => {
    if (moved.current || dx !== 0) {
      e.preventDefault()
      e.stopPropagation()
      setDx(0)
    }
  }

  const exposed = Math.abs(dx) / REVEAL

  return (
    <li className="relative select-none overflow-hidden rounded-2xl">
      {/* aksi kanan — swipe KIRI (hapus) */}
      <button
        type="button"
        aria-label={`Hapus ${tx.title}`}
        onClick={onDelete}
        className="absolute inset-y-0 right-0 flex w-[84px] flex-col items-center justify-center gap-1 rounded-r-2xl bg-plum/15 text-plum transition-opacity"
        style={{ opacity: dx < 0 ? exposed : 0, pointerEvents: dx < -20 ? 'auto' : 'none' }}
      >
        <Trash2 className="size-4" strokeWidth={2.2} />
        <span className="text-[10px] font-semibold">Hapus</span>
      </button>

      {/* aksi kiri — swipe KANAN (edit) */}
      <button
        type="button"
        aria-label={`Edit ${tx.title}`}
        onClick={() => setDx(0)}
        className="absolute inset-y-0 left-0 flex w-[84px] flex-col items-center justify-center gap-1 rounded-l-2xl bg-sage text-forest transition-opacity"
        style={{ opacity: dx > 0 ? exposed : 0, pointerEvents: dx > 20 ? 'auto' : 'none' }}
      >
        <Pencil className="size-4" strokeWidth={2.2} />
        <span className="text-[10px] font-semibold">Edit</span>
      </button>

      {/* konten baris */}
      <button
        type="button"
        aria-label={`${tx.title}, ${tx.category}, ${hide(tx.amount)}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={settle}
        onPointerCancel={settle}
        onClick={onClick}
        className="group relative flex w-full cursor-pointer touch-pan-y items-center gap-3 rounded-2xl bg-cream px-2 py-2.5 text-left outline-none transition-[background,box-shadow,transform] duration-200 animate-[row-in_0.5s_ease_backwards] hover:bg-cream hover:shadow-[0_10px_24px_-14px_rgba(0,0,0,0.35)] focus-visible:bg-cream focus-visible:ring-2 focus-visible:ring-forest/20"
        style={{
          transform: `translateX(${dx}px)`,
          transitionDuration: dragging ? '0ms' : undefined,
          animationDelay: `${delay}ms`,
        }}
      >
        {/* wrapper tile — badge di luar supaya tidak ke-clip overflow-hidden */}
        <span className="relative shrink-0">
          <span
            className={cn(
              'relative flex size-11 items-center justify-center overflow-hidden rounded-2xl transition-all duration-300 animate-[tile-pop_0.55s_cubic-bezier(0.34,1.56,0.64,1)_backwards] group-hover:-translate-y-0.5 group-hover:-rotate-6 group-hover:scale-105',
              tx.tile,
            )}
            style={{ animationDelay: `${delay + 140}ms` }}
          >
            {/* kilau atas ala kaca */}
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-cream/60 to-transparent"
            />
            {/* shine sweep saat hover */}
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-[110%] skew-x-12 bg-gradient-to-r from-transparent via-cream/70 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[110%]"
            />
            <tx.icon
              className="relative size-5 drop-shadow-sm transition-transform duration-300 group-hover:scale-110"
              strokeWidth={2.2}
            />
          </span>
          {/* badge arah — masuk ↙ mint solid, keluar ↗ rose solid */}
          <span
            className={cn(
              'absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full shadow-sm ring-2 ring-cream transition-transform duration-300 animate-[fade-pop_0.4s_ease_backwards] group-hover:scale-110',
              tx.type === 'income' ? 'bg-mint text-forest' : 'bg-plum text-cream',
            )}
            style={{ animationDelay: `${delay + 280}ms` }}
          >
            {tx.type === 'income' ? (
              <ArrowDownLeft className="size-3" strokeWidth={3} />
            ) : (
              <ArrowUpRight className="size-3" strokeWidth={3} />
            )}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">
            {tx.title}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-ink/45">
            {tx.category} · {tx.time}
          </span>
        </span>

        <span
          className={cn(
            'shrink-0 text-sm font-semibold tabular-nums',
            tx.type === 'income' ? 'text-forest' : 'text-ink/80',
          )}
        >
          {hide(tx.amount)}
        </span>

        {/* Affordance geser (pengganti teks manual "💡 Geser baris..."):
            chevron kecil SELALU tampak di ujung kanan + tray tipis sebagai
            isyarat bahwa baris ini punya lapisan aksi di belakangnya.
            UI yang baik tidak perlu menjelaskan dirinya sendiri. */}
        <span className="relative flex shrink-0 flex-col items-center justify-center gap-0.5 text-ink/25 transition-colors duration-300 group-hover:text-forest">
          <ChevronRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.4} />
          <ChevronRight className="-mt-2 size-3.5 -translate-x-1 opacity-60 transition-transform duration-300 group-hover:translate-x-0" strokeWidth={2.4} />
        </span>
      </button>
    </li>
  )
}

/** Dibungkus `memo` — kartu ini tidak menerima props, jadi tidak perlu ikut
 *  re-render saat HomeScreen mengubah state popup (lihat catatan di
 *  cash-flow-card.tsx). Baris-baris swipe tetap punya state sendiri. */
export const RecentTransactionsCard = memo(function RecentTransactionsCard() {
  const { hide } = usePrivacy()
  /* daftar transaksi jadi state — baris bisa dihapus via swipe kiri */
  const [groups, setGroups] = useState(GROUPS)
  const visibleGroups = groups.filter((g) => g.items.length > 0)
  const totalItems = groups.reduce((acc, g) => acc + g.items.length, 0)

  const deleteTx = (label: string, title: string) =>
    setGroups((prev) =>
      prev.map((g) =>
        g.label === label
          ? { ...g, items: g.items.filter((t) => t.title !== title) }
          : g,
      ),
    )

  /* delay staggered kumulatif — direcompute dari grup yang masih tampil */
  const delays: number[] = (() => {
    let acc = 0
    return visibleGroups.map((g) => {
      const a = acc
      acc += g.items.length
      return a
    })
  })()

  return (
    <div className="flex flex-col rounded-[2rem] bg-cream p-6 ring-1 ring-soil/12">
      {/* header — konsisten dengan kartu lain */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-sage text-forest">
            <ReceiptText className="size-4" strokeWidth={2.4} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Transaksi Terakhir</p>
            <p className="text-xs text-ink/45">Aktivitas 3 hari terakhir</p>
          </div>
        </div>
        <Link
          href="/history"
          className="group/link flex items-center gap-1.5 rounded-full bg-sage py-1.5 pl-3 pr-1.5 text-[11px] font-semibold text-forest transition-colors duration-300 hover:bg-forest hover:text-mint"
        >
          Lihat semua
          <span className="flex size-4 items-center justify-center rounded-full bg-forest text-mint transition-colors duration-300 group-hover/link:bg-mint group-hover/link:text-forest">
            <ArrowUpRight className="size-2.5" strokeWidth={2.6} />
          </span>
        </Link>
      </div>

      {totalItems === 0 ? (
        /* ── Empty State I — copy nurturing (PRD State I) ── */
        <div className="mx-2 mt-4 flex flex-col items-center rounded-2xl border-2 border-dashed border-forest/15 bg-cream/50 px-6 py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-sage text-forest">
            <Sprout className="size-6" strokeWidth={1.8} />
          </span>
          <p className="mt-4 text-sm font-semibold text-ink">
            Belum ada catatan hari ini...
          </p>
          <p className="mt-1 text-xs text-ink/50">
            Catat yang pertama yuk! 🌱
          </p>
          <button
            type="button"
            className="mt-4 rounded-full bg-forest px-5 py-2.5 text-[13px] font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-[0.97]"
          >
            + Catat Transaksi
          </button>
        </div>
      ) : (
        /* ── daftar transaksi — dikelompokkan per hari ── */
        <div className="-mx-2 mt-4 flex flex-col gap-4">
          {visibleGroups.map((group, gi) => (
            <section key={group.label}>
              <div className="mx-2 flex items-center gap-2">
                <p className="text-[10px] font-semibold tracking-[0.14em] text-ink/40 uppercase">
                  {group.label}
                </p>
                {group.live && (
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-mint" />
                  </span>
                )}
                <span className="h-px flex-1 bg-soil/8" />
              </div>

              <ul className="mt-1.5 flex flex-col gap-0.5">
                {group.items.map((tx, i) => (
                  <SwipeRow
                    key={tx.title}
                    tx={tx}
                    delay={120 + (delays[gi] + i) * 70}
                    onDelete={() => deleteTx(group.label, tx.title)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* insight mingguan — pola strip yang sama dengan kartu distribusi */}
      <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-cream px-4 py-2.5 text-center text-xs leading-relaxed text-ink/55">
        <Sparkles className="size-3.5 shrink-0 text-forest" strokeWidth={2.2} />
        <span>
          Minggu ini <b className="font-semibold text-forest">{hide('+Rp 8.500.000')}</b>{' '}
          masuk, <b className="font-semibold text-ink">{hide('-Rp 752.000')}</b> keluar —
          net <b className="font-semibold text-forest">{hide('+Rp 7.748.000')}</b>
        </span>
      </div>
    </div>
  )
})

/* lebar area aksi yang terungkap saat swipe (px) */
const REVEAL = 84
