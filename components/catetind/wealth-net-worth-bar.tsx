'use client'

import { motion } from 'framer-motion'
import { NET_WORTH_COPY, compactMoney, maskMoney, netWorthParts, tugOfWar } from '@/lib/data/wealth'

/* ── HERO · KEKAYAAN BERSIH (Net Worth) ──────────────────────────────────────
   Satu-satunya angka yang harus dipahami user dalam satu detik: nominal Net
   Worth. Tidak ada paragraf yang menjelaskan "apa itu net worth" — hanya satu
   label mikro di atas angka besar, satu bar rasio tipis, lalu satu strip
   legenda yang menjawab "asetku berapa, hutangku berapa".

     Kekayaan Bersih
     Rp 1,26 M                ← fokus absolut, ringkas supaya tak terpotong
     Rp 1.261.847.037         ← nominal penuh sebagai sub-label
     ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁    ← mint = aset, terracotta = hutang
     ┌ Aset  Rp …  │ Hutang  Rp … ┐

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

  const netLabel = compactMoney(tug.netWorth, masked)
  /* nominal PENUH selalu ikut ditampilkan sebagai sub-label selama tidak
     disensor: angka ringkas tidak boleh menjadi satu-satunya sumber kebenaran */
  const netExact = maskMoney(tug.netWorth, masked)
  const showExact = !masked && netExact !== netLabel
  const assetLabel = maskMoney(tug.assets, masked)
  const debtLabel = maskMoney(tug.debts, masked)
  /* dua-duanya nol: bar netral penuh supaya hero tidak terlihat rusak */
  const spanEmpty = tug.assets === 0 && tug.debts === 0

  return (
    <section
      aria-label={NET_WORTH_COPY.aria}
      className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-forest-soft via-forest to-evergreen-deep px-5 py-7 text-cream shadow-[0_30px_70px_-32px_rgba(0,0,0,0.75)] ring-1 ring-inset ring-cream/10 sm:px-8 sm:py-9"
    >
      {/* DEFINISI CORAK BATIK — resep SAMA dengan muka kartu dompet & panel
          brand; id diprefiks `networth-batik-` supaya tidak bentrok dengan
          pattern halaman lain yang bisa hidup di DOM yang sama. */}
      <svg aria-hidden data-catetind-batik className="pointer-events-none absolute size-0">
        <defs>
          <g id="networth-batik-kawung-unit">
            {[0, 90, 180, 270].map((angle) => (
              <g key={angle} transform={`rotate(${angle})`}>
                <ellipse cx="0" cy="-19" rx="8.6" ry="14" />
                <ellipse cx="0" cy="-19" rx="4.3" ry="7.6" />
              </g>
            ))}
            <circle cx="0" cy="0" r="1.6" fill="white" fillOpacity="0.45" stroke="none" />
          </g>
          <pattern id="networth-batik-kawung" width="64" height="64" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="white" strokeOpacity="0.17" strokeWidth="1.15">
              {[
                [32, 32],
                [0, 0],
                [64, 0],
                [0, 64],
                [64, 64],
              ].map(([x, y]) => (
                <use key={`${x}-${y}`} href="#networth-batik-kawung-unit" x={x} y={y} />
              ))}
            </g>
          </pattern>
          <pattern id="networth-batik-mendung" width="96" height="48" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="white" strokeLinecap="round">
              <path d="M0 40 Q12 12 24 40 Q36 12 48 40 Q60 12 72 40 Q84 12 96 40" strokeOpacity="0.18" strokeWidth="1.8" />
              <path d="M0 29 Q12 3 24 29 Q36 3 48 29 Q60 3 72 29 Q84 3 96 29" strokeOpacity="0.12" strokeWidth="1.6" />
              <path d="M0 19 Q12 -6 24 19 Q36 -6 48 19 Q60 -6 72 19 Q84 -6 96 19" strokeOpacity="0.08" strokeWidth="1.4" />
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
        data-catetind-batik
        className="pointer-events-none absolute inset-0 h-full w-full [mask-image:radial-gradient(150%_140%_at_6%_-12%,black_10%,transparent_76%)]"
      >
        <rect width="100%" height="100%" fill="url(#networth-batik-kawung)" />
      </svg>
      <svg
        aria-hidden
        data-catetind-batik
        className="pointer-events-none absolute inset-0 h-full w-full [mask-image:radial-gradient(145%_130%_at_104%_112%,black_8%,transparent_70%)]"
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
        <p className="text-[11.5px] font-medium uppercase tracking-[0.24em] text-mint">
          {NET_WORTH_COPY.label}
        </p>
        {/*
          Angka hero TIDAK PERNAH dipotong. Nominal memakai bentuk ringkas
          (`compactMoney` → "Rp 1,26 M") supaya selalu muat di 320 px, lalu
          nominal penuh ditulis tepat di bawahnya sebagai sub-label. Dulu baris
          ini memakai `truncate` sehingga angka terpenting halaman berakhir
          sebagai "Rp 1.261.847.0...".
        */}
        <p className="mt-2.5 font-display text-[2.5rem] font-semibold leading-[0.95] tracking-tight tabular-nums sm:text-[3.4rem] lg:text-[4.25rem]">
          {netLabel}
        </p>
        {showExact && (
          <p className="mt-1.5 font-display text-[13px] font-medium tracking-tight text-cream tabular-nums sm:text-[14.5px]">
            {netExact}
          </p>
        )}
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

        {/* STRIP LEGENDA — dua kolom, dipisah hairline vertikal. Hanya label
            SATU kata + nominal: persen sudah dibawa oleh bar di atasnya, jadi
            menuliskannya lagi di sini cuma menambah teks. Nominal memakai
            font-display + tabular-nums supaya dua angka tetap sejajar kolomnya
            walau digitnya beda panjang; `break-words` menjaga nominal panjang
            tetap utuh di layar sempit (tidak pernah dipotong "..."). */}
        <div className="mt-4 flex items-stretch gap-3 rounded-2xl bg-cream/[0.06] px-3.5 py-3 ring-1 ring-inset ring-cream/10">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-mint">
              <span aria-hidden className="size-1.5 rounded-full bg-mint" />
              {NET_WORTH_COPY.asset}
            </p>
            <p className="mt-1 break-words font-display text-[13px] font-semibold leading-snug tabular-nums sm:text-[16px]">
              {assetLabel}
            </p>
          </div>
          <span aria-hidden className="w-px shrink-0 bg-cream/12" />
          <div className="min-w-0 flex-1 text-right">
            <p className="flex items-center justify-end gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-hud-terracotta">
              {NET_WORTH_COPY.debt}
              <span aria-hidden className="size-1.5 rounded-full bg-hud-terracotta" />
            </p>
            <p className="mt-1 break-words font-display text-[13px] font-semibold leading-snug tabular-nums sm:text-[16px]">
              {debtLabel}
            </p>
          </div>
        </div>

        {/* dua-duanya masih nol: bar netral butuh satu kalimat supaya tidak
            terbaca seperti kartu rusak */}
        {spanEmpty && (
          /* cream/70 (bukan /50): teks 11 px di atas Evergreen harus lolos 4,5:1 */
          <p data-catetind-empty className="mt-3 text-[12px] leading-relaxed text-cream">{NET_WORTH_COPY.empty}</p>
        )}
      </div>
    </section>
  )
}
