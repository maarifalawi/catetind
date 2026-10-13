'use client'

import { motion } from 'framer-motion'
import { NET_WORTH_COPY, maskMoney, netWorthParts, tugOfWar } from '@/lib/data/wealth'

/* ── HERO · KEKAYAAN BERSIH (Net Worth) ──────────────────────────────────────
   Satu-satunya angka yang harus dipahami user dalam satu detik: nominal Net
   Worth. Tidak ada paragraf yang menjelaskan "apa itu net worth" — hanya satu
   label mikro di atas angka besar, satu bar rasio tipis, lalu satu strip
   legenda yang menjawab "asetku berapa, hutangku berapa".

     Kekayaan Bersih
     Rp 14.549.330            ← fokus absolut, tipografi yang bicara
     ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁    ← mint = aset, terracotta = hutang
     ┌ Aset 82% · Rp … │ Hutang 18% · Rp … ┐

   REVISI DESAIN: versi lama adalah kotak hijau rata dengan dua bulatan blur
   besar. Sekarang kartunya memakai RESEP MUKA KARTU yang sama dengan hero
   `/wallet` & panel brand (`brand-panel.tsx` / `wallet-card-face.tsx`) supaya
   halaman Kekayaan terasa satu keluarga dengan kartu dompet:

     · gradien Evergreen berlapis (forest-soft → forest → evergreen-deep)
     · CORAK BATIK dua lapis — kawung dari kiri atas, mega mendung dari kanan
       bawah — dipasang sebagai lapisan `mask-image` radial supaya coraknya
       hanya menyentuh sudut kartu dan angkanya tetap bersih dibaca
     · tekstur titik halus + hairline bercahaya di bibir atas (resep kartu)

   Minimalis artinya: satu angka, satu bar, satu strip legenda. Nol paragraf,
   nol chip tambahan. Kalimat yang muncul di kartu ini semuanya dari
   `NET_WORTH_COPY` (kanon repo: copy bukan literal di JSX).

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
      aria-label={NET_WORTH_COPY.aria}
      className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-forest-soft via-forest to-evergreen-deep px-5 py-7 text-cream shadow-[0_30px_70px_-32px_rgba(0,0,0,0.75)] ring-1 ring-inset ring-cream/10 sm:px-8 sm:py-9"
    >
      {/* definisi CORAK BATIK — resep SAMA dengan muka kartu dompet & panel
          brand; id diprefiks `networth-batik-` supaya tidak bentrok dengan
          pattern halaman lain yang bisa hidup di DOM yang sama */}
      <svg aria-hidden className="absolute size-0">
        <defs>
          {/* batik kawung: lingkaran-lingkaran saling beririsan */}
          <pattern id="networth-batik-kawung" width="72" height="72" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="white" strokeOpacity="0.14" strokeWidth="1.6">
              <circle cx="36" cy="36" r="26" />
              <circle cx="0" cy="0" r="26" />
              <circle cx="72" cy="0" r="26" />
              <circle cx="0" cy="72" r="26" />
              <circle cx="72" cy="72" r="26" />
            </g>
            <circle cx="36" cy="36" r="5" fill="white" fillOpacity="0.14" />
          </pattern>
          {/* batik mega mendung: lengkung awan berlapis */}
          <pattern id="networth-batik-mendung" width="90" height="44" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="white">
              <path d="M0 44 Q22.5 8 45 44 Q67.5 8 90 44" strokeOpacity="0.16" strokeWidth="1.8" />
              <path d="M0 32 Q22.5 -4 45 32 Q67.5 -4 90 32" strokeOpacity="0.1" strokeWidth="1.6" />
              <path d="M0 20 Q22.5 -16 45 20 Q67.5 -16 90 20" strokeOpacity="0.07" strokeWidth="1.4" />
            </g>
          </pattern>
        </defs>
      </svg>

      {/* aurora: mint (aset) di kiri atas, terracotta (hutang) di kanan bawah —
          arah warnanya menyiapkan mata sebelum ia membaca bar di bawahnya */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-24 size-56 rounded-full bg-mint/20 blur-[90px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -right-24 size-64 rounded-full bg-hud-terracotta/20 blur-[100px]"
      />

      {/* dua lapis batik yang saling menimpa — kawung dari kiri atas, mega
          mendung dari kanan bawah. Keduanya DIBERI TOPENG radial supaya corak
          hanya menyentuh sudut kartu dan angka di tengah tetap bersih. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full [mask-image:radial-gradient(130%_125%_at_8%_-14%,black_6%,transparent_68%)]"
      >
        <rect width="100%" height="100%" fill="url(#networth-batik-kawung)" />
      </svg>
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full [mask-image:radial-gradient(125%_115%_at_104%_112%,black_4%,transparent_62%)]"
      >
        <rect width="100%" height="100%" fill="url(#networth-batik-mendung)" />
      </svg>

      {/* tekstur titik halus + hairline bercahaya di bibir atas (resep kartu) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1.2px)] [background-size:10px_10px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cream/45 to-transparent"
      />

      <div className="relative">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-mint/70">
          {NET_WORTH_COPY.label}
        </p>
        <p className="mt-2.5 truncate font-display text-[2.75rem] font-semibold leading-[0.95] tracking-tight tabular-nums sm:text-[3.6rem] lg:text-[4.25rem]">
          {netLabel}
        </p>
      </div>

      {/* BAR RASIO — aset (mint) vs hutang (terracotta), lebar ikut data.
          Hairline di atasnya yang memisahkan angka dari bar: pemisah, bukan
          hiasan — supaya kartunya tetap terbaca sebagai satu blok utuh. */}
      <div className="relative mt-6 border-t border-cream/10 pt-5">
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-cream/12">
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

        {/* STRIP LEGENDA — dua kolom, dipisah hairline vertikal. Nominal memakai
            font-display + tabular-nums supaya dua angka tetap sejajar kolomnya
            walau digitnya beda panjang. */}
        <div className="mt-4 flex items-stretch gap-3 rounded-2xl bg-cream/[0.06] px-3.5 py-3 ring-1 ring-inset ring-cream/10">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-mint/70">
              <span aria-hidden className="size-1.5 rounded-full bg-mint" />
              {NET_WORTH_COPY.asset} · {tug.assetPctLabel}%
            </p>
            <p className="mt-1 truncate font-display text-[15px] font-semibold tabular-nums">
              {assetLabel}
            </p>
          </div>
          <span aria-hidden className="w-px shrink-0 bg-cream/12" />
          <div className="min-w-0 flex-1 text-right">
            <p className="flex items-center justify-end gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-hud-terracotta/80">
              {NET_WORTH_COPY.debt} · {tug.debtPctLabel}%
              <span aria-hidden className="size-1.5 rounded-full bg-hud-terracotta" />
            </p>
            <p className="mt-1 truncate font-display text-[15px] font-semibold tabular-nums">
              {debtLabel}
            </p>
          </div>
        </div>

        {/* dua-duanya masih nol: bar netral butuh satu kalimat supaya tidak
            terbaca seperti kartu rusak */}
        {spanEmpty && (
          /* cream/70 (bukan /50): teks 11 px di atas Evergreen harus lolos 4,5:1 */
          <p className="mt-3 text-[11px] leading-relaxed text-cream/70">{NET_WORTH_COPY.empty}</p>
        )}
      </div>
    </section>
  )
}
