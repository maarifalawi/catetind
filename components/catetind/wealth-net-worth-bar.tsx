'use client'

import { motion } from 'framer-motion'
import { maskMoney, netWorthParts, tugOfWar } from '@/lib/data/wealth'

/* ── HERO · KEKAYAAN BERSIH (Net Worth) ──────────────────────────────────────
   Satu-satunya angka yang harus dipahami user dalam satu detik: nominal Net
   Worth. Tidak ada lagi paragraf yang menjelaskan "apa itu net worth" — hanya
   satu label mikro di atas angka raksasa, lalu satu bar rasio minimalis yang
   membandingkan TOTAL ASET vs TOTAL HUTANG.

     Kekayaan Bersih
     Rp 14.549.330            ← fokus absolut, tipografi yang bicara
     ████████████████░░░░░    ← mint = aset, terracotta = hutang
     Aset 82% · Rp …          Hutang 18% · Rp …

   Definisi aset TETAP satu pintu (`netWorthParts`) — kas likuid + investasi +
   aset fisik + piutang. Komponen ini menerima potongannya lalu menjumlahkan
   sendiri, jadi mustahil ada halaman yang memakai definisi berbeda.
   ────────────────────────────────────────────────────────────────────────── */

export function WealthNetWorthBar({
  cash,
  investments,
  physical,
  receivables,
  debts,
  masked,
}: {
  /** kas likuid — saldo seluruh dompet (BCA, GoPay, Tunai) */
  cash: number
  /** total nilai portofolio investasi (saham, reksadana, emas, crypto) */
  investments: number
  /** nilai aset fisik / properti — ikut sisi aset */
  physical?: number
  /** total piutang aktif — uang kita yang masih dipegang orang lain */
  receivables: number
  debts: number
  masked: boolean
}) {
  const parts = netWorthParts({ cash, investments, physical, receivables, debts })
  const tug = tugOfWar(parts.assets, parts.debts)

  const netLabel = maskMoney(tug.netWorth, masked)
  const assetLabel = maskMoney(tug.assets, masked)
  const debtLabel = maskMoney(tug.debts, masked)
  /* dua-duanya nol: bar netral penuh supaya hero tidak terlihat rusak */
  const spanEmpty = tug.assets === 0 && tug.debts === 0

  return (
    <section
      aria-label="Kekayaan bersih: total aset dibanding total hutang"
      className="relative overflow-hidden rounded-[2rem] bg-forest px-5 py-7 text-cream sm:px-8 sm:py-9"
    >
      {/* kabut mint (aset) & terracotta (hutang) di dua sudut — membaca arah bar */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-24 size-56 rounded-full bg-mint/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -right-24 size-64 rounded-full bg-hud-terracotta/20 blur-3xl"
      />

      <div className="relative">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-mint/70">
          Kekayaan Bersih
        </p>
        <p className="mt-3 truncate font-display text-[2.9rem] font-semibold leading-[0.9] tracking-tight tabular-nums sm:text-[4rem] lg:text-[4.75rem]">
          {netLabel}
        </p>
      </div>

      {/* BAR RASIO — aset (mint) vs hutang (terracotta), lebar ikut data */}
      <div className="relative mt-8">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-cream/15">
          {spanEmpty ? (
            <span className="h-full w-full rounded-full bg-cream/20" />
          ) : (
            <>
              <motion.span
                initial={false}
                animate={{ flexGrow: Math.max(tug.assets, 0) }}
                transition={{ type: 'spring', stiffness: 120, damping: 22 }}
                style={{ flexBasis: 0 }}
                className="h-full rounded-full bg-mint"
              />
              <motion.span
                initial={false}
                animate={{ flexGrow: Math.max(tug.debts, 0) }}
                transition={{ type: 'spring', stiffness: 120, damping: 22 }}
                style={{ flexBasis: 0 }}
                className="ml-0.5 h-full rounded-full bg-hud-terracotta"
              />
            </>
          )}
        </div>

        <div className="mt-3.5 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-mint/70">
              <span aria-hidden className="size-2 rounded-full bg-mint" />
              Aset · {tug.assetPctLabel}%
            </p>
            <p className="mt-1 truncate font-display text-[15px] font-semibold tabular-nums">
              {assetLabel}
            </p>
          </div>
          <div className="min-w-0 text-right">
            <p className="flex items-center justify-end gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-hud-terracotta/80">
              Hutang · {tug.debtPctLabel}%
              <span aria-hidden className="size-2 rounded-full bg-hud-terracotta" />
            </p>
            <p className="mt-1 truncate font-display text-[15px] font-semibold tabular-nums">
              {debtLabel}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
