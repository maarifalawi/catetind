'use client'

import { motion } from 'framer-motion'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatIDR, maskMoney, netWorthCopy, netWorthParts, tugOfWar } from '@/lib/data/wealth'

/* ── NET WORTH "TUG-OF-WAR" BAR (Section 3) ─────────────────────────────────
   Alih-alih dua kartu angka yang membosankan ("Total Aset" / "Total Hutang"),
   hubungan keduanya digambar sebagai TARIK TAMBANG satu bar:

     Aset  ◀━━━━━━━━━━━━━━━━━●━━━━━━━▶  Hutang
     (sage, menarik ke kiri)   ↑      (terracotta, menarik ke kanan)
                           fulcrum

   Siapa pun langsung lihat siapa yang "menang" tanpa membaca angka: kiri
   panjang = aset unggul, kanan panjang = hutang unggul. Titik fulcrum di
   persimpangan digambar sebagai pivot putih yang menonjol sedikit di atas bar
   (seperti poros jungkat-jungkit).

   DUA PERBAIKAN AUDIT yang mengikat komponen ini:

   1. #1 — `Aset` BUKAN cuma portofolio investasi. Komponen ini menerima `cash`
      (kas likuid: BCA + GoPay + Tunai, dari store uang `lib/money/store.ts`) dan
      `investments`, lalu menjumlahkan keduanya SENDIRI. Jadi total aset tidak
      bisa lagi diam-diam kehilangan uang rekening.
   2. #2 — Lebar bar diikat ke DATA (`flexGrow` dari nominal asli, `flexBasis: 0`),
      bukan `width` yang dihitung manual. Lebar piksel mustahil berbeda dari
      angka yang tertulis: hijau 82% benar-benar 82% dari panjang bar.
      Nominalnya dinamis (update hutang → bar menggeser) tapi tetap proporsional.

   Proporsi bar dianimasikan Framer Motion: saat user mencatat pembayaran
   hutang di Tab 3, bar ini "bergeser" halus — bukan melompat.
   ────────────────────────────────────────────────────────────────────────── */

const BAR_HEIGHT = 'h-6' /* ~24px sesuai spesifikasi */

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
  /** nilai aset fisik / properti (paket 63) — ikut sisi aset */
  physical?: number
  /** total piutang aktif — uang kita yang masih dipegang orang lain (paket 41) */
  receivables: number
  debts: number
  masked: boolean
}) {
  /* #1 — sisi ASET = KAS LIKUID + ASET INVESTASI + PIUTANG (definisi tunggal di
     `netWorthParts()`; piutang dulu cuma pajangan di tab "Piutangku") */
  const parts = netWorthParts({ cash, investments, physical, receivables, debts })
  const tug = tugOfWar(parts.assets, parts.debts)
  const assetLabel = maskMoney(tug.assets, masked)
  const debtLabel = maskMoney(tug.debts, masked)
  const netLabel = maskMoney(tug.netWorth, masked)
  /* rasio ikut disembunyikan saat mask — nominalnya bisa ditebak dari rasio */
  const ratioText = masked || !tug.debts ? '•' : tug.ratio.toFixed(1)
  /* porsi 0 tetap 0 — kalau HUTANG nol, hijau memenuhi bar (bukan terbelah dua) */
  const assetWeight = tug.assets
  const debtWeight = tug.debts
  /* portofolio & hutang dua-duanya kosong: tampilkan bar olive penuh supaya
     empty state tidak terlihat seperti komponen rusak */
  const spanEmpty = assetWeight === 0 && debtWeight === 0

  return (
    <section
      aria-label="Net worth: total aset (kas likuid + investasi + piutang) dibanding hutang"
      className="relative overflow-hidden rounded-[1.75rem] bg-[#ffffff] p-5 shadow-[0_22px_50px_-30px_rgba(69,89,78,0.5)] ring-1 ring-soil/10 sm:p-6"
    >
      {/* kabut sage (aset) & terracotta (hutang) di dua sudut — penanda siapa
          menarik ke arah mana, tetap di palet kanon */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-20 size-52 rounded-full bg-hud-sage/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-hud-terracotta/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(181,185,135,0.35)_0.6px,transparent_0.9px)] [background-size:12px_12px]"
      />

      <div className="relative">
        {/* 1. label + nominal di dua sisi bar (kiri Aset, kanan Hutang) */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-forest">
              <TrendingUp className="size-3.5" strokeWidth={2.6} />
              Aset
            </span>
            <span className="mt-1 block truncate font-display text-[19px] font-semibold leading-none tracking-tight text-[#b5b987] tabular-nums sm:text-[22px]">
              {assetLabel}
            </span>
            {/* #1 — komposisi aset dibuka terang-terangan: user langsung lihat
                bahwa uang di rekening/e-wallet IKUT dihitung sebagai aset */}
            <span className="mt-1 block truncate text-[10px] font-medium text-forest/40 tabular-nums">
              kas {maskMoney(cash, masked)} · investasi {maskMoney(investments, masked)}
            </span>
          </div>
          <div className="min-w-0 text-right">
            <span className="flex items-center justify-end gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-hud-terracotta">
              Hutang
              <TrendingDown className="size-3.5" strokeWidth={2.6} />
            </span>
            <span className="mt-1 block truncate font-display text-[19px] font-semibold leading-none tracking-tight text-hud-terracotta tabular-nums sm:text-[22px]">
              {debtLabel}
            </span>
          </div>
        </div>

        {/* 2. bar tarik tambang — dua potongan proporsional + fulcrum

            #2 — LEBAR DIAMBIL DARI DATA, BUKAN DARI DESAIN:
            setiap segmen memakai `flexGrow` = nominal rupiahnya sendiri dengan
            `flexBasis: 0`, jadi panjang pikselnya = nilai / total. Tidak ada
            satu pun angka lebar yang ditulis manual di sini, sehingga tidak
            mungkin ada segmen berlabel 18% yang digambar sepanjang 28%. */}
        <div className="relative mt-4">
          <div
            className={cn(
              BAR_HEIGHT,
              'flex w-full overflow-hidden rounded-full bg-cream ring-1 ring-inset ring-forest/10',
            )}
          >
            {/* aset menarik ke kiri (sage) */}
            <motion.span
              initial={false}
              animate={{ flexGrow: spanEmpty ? 1 : assetWeight }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              style={{ flexBasis: 0 }}
              className="relative h-full min-w-0 bg-gradient-to-r from-[#b5b987] to-hud-sage"
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-cream/40" />
            </motion.span>
            {/* hutang menarik ke kanan (terracotta) */}
            <motion.span
              initial={false}
              animate={{ flexGrow: spanEmpty ? 0 : debtWeight }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              style={{ flexBasis: 0 }}
              className="relative h-full min-w-0 bg-gradient-to-r from-hud-terracotta to-[#ffb885]"
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-cream/30" />
            </motion.span>
          </div>

          {/* fulcrum (poros jungkat-jungkit) tepat di titik pisah */}
          <motion.span
            aria-hidden
            initial={false}
            animate={{ left: `${tug.assetPct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className="pointer-events-none absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-[#ffffff] shadow-[0_8px_18px_-8px_rgba(69,89,78,0.6)] ring-1 ring-forest/10">
              <span className="size-2.5 rounded-full bg-gradient-to-br from-hud-sage to-hud-terracotta" />
            </span>
          </motion.span>
        </div>

        {/* 3. porsi masing-masing sisi — mikro, biar tidak perlu hitung sendiri.
            Dua label dibulatkan BERSAMA (Largest Remainder) sehingga selalu
            berjumlah tepat 100% — tidak ada 83% + 17% atau 99% yang bikin ragu. */}
        <div className="mt-2 flex items-center justify-between text-[10.5px] font-medium text-forest/40 tabular-nums">
          <span>{tug.assetPctLabel}% dari total</span>
          <span>{tug.debtPctLabel}% dari total</span>
        </div>

        {/* 4. Net Worth — hasil akhir tarik tambang, di tengah */}
        <div className="mt-5 border-t border-dashed border-forest/10 pt-4 text-center">
          <span className="text-[10.5px] font-medium uppercase tracking-[0.2em] text-forest/40">
            Net Worth
          </span>
          <p
            className={cn(
              'mt-1.5 flex items-center justify-center gap-2 font-display text-[1.9rem] font-semibold leading-none tracking-tight tabular-nums sm:text-[2.3rem]',
              tug.positive ? 'text-[#b5b987]' : 'text-hud-terracotta',
            )}
          >
            <span className="truncate">{netLabel}</span>
            <span aria-hidden className="text-[1.4rem] sm:text-[1.7rem]">
              {tug.positive ? '📈' : '📉'}
            </span>
          </p>
          <p className="mx-auto mt-2 max-w-[24rem] text-[12.5px] leading-relaxed text-forest/55">
            {netWorthCopy(tug.positive, ratioText)}
          </p>
          {/* hitungan terbuka hanya saat tidak dimask. Paket 41 membukanya lebih
              lebar: sisi aset dipecah jadi kas + investasi + PIUTANG supaya
              konversi piutang → kas kelihatan sebagai perpindahan potongan, bukan
              angka aset yang berubah-ubah tanpa sebab. */}
          {!masked && (
            <div className="mt-1.5 space-y-1 text-[10.5px] text-forest/35 tabular-nums">
              <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
                <span>kas {formatIDR(parts.cash)}</span>
                <span aria-hidden>+</span>
                <span>investasi {formatIDR(parts.investments)}</span>
                <span aria-hidden>+</span>
                <span className={cn(parts.physical > 0 && 'text-forest/55')}>
                  fisik {formatIDR(parts.physical)}
                </span>
                <span aria-hidden>+</span>
                <span className={cn(parts.receivables > 0 && 'text-forest/55')}>
                  piutang {formatIDR(parts.receivables)}
                </span>
                <span aria-hidden>=</span>
                <span className="font-medium text-forest/50">aset {formatIDR(parts.assets)}</span>
              </p>
              <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
                <span>aset {formatIDR(parts.assets)}</span>
                <span aria-hidden>−</span>
                <span>hutang {formatIDR(parts.debts)}</span>
                <span aria-hidden>=</span>
                <span className="font-medium text-forest/50">net worth</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
