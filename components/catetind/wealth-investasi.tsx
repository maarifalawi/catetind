'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  History,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { WealthAssetDonut } from './wealth-asset-donut'
import {
  ASSET_TYPE_META,
  assetHistory,
  assetReturn,
  formatAssetQuantity,
  formatIDR,
  formatNumber,
  formatPriceStamp,
  formatShortDate,
  isAssetStale,
  maskMoney,
  totalPortfolioValue,
  totalInvestedValue,
  unrealizedReturn,
  type Investment,
} from '@/lib/data/wealth'

/* ── TAB 1 — INVESTASI (Section 5) ──────────────────────────────────────────
   Alur pandang (sengaja berlapis, bukan tabel):

   5A. Ringkasan portofolio investasi — satu angka besar + return + modal.
       TANPA stempel waktu (audit fintech #4): sumber harga tiap aset berjalan
       ASINKRON (crypto menit-an, emas EOD), jadi satu timestamp global di kartu
       master menyesatkan — apalagi saat timestamp itu justru milik aset yang
       ditandai basi. "Update terakhir" hanya hidup di kartu aset masing-masing.
   5B. Donut alokasi (Recharts) + legenda. Persennya dihitung Largest Remainder
       (audit fintech #3) supaya selalu berjumlah tepat 100%.
   5C. "Detail per Aset" — accordion. Progressive disclosure-nya: user yang cuma
       mau tahu total bisa melipat daftarnya, yang mau audit membuka satu per
       satu. Di dalam setiap kartu: geser KIRI → Edit (amber) + Hapus
       (terracotta), tap → riwayat beli/jual aset itu.
       AFFORDANCE (audit fintech #6): setiap kartu punya chevron ">" + hover
       state jelas — tidak lagi mengandalkan teks instruksi kecil.
   5D. Banner amber per aset kalau harganya basi (crypto > 10 menit, lain-lain
       > 24 jam) + tombol "Update Manual" — satu sumber gagal tidak mematikan
       aset lain (fallback protocol PRD 2E.1 poin 5). TIDAK ada banner agregat
       kedua di kaki daftar (audit fintech #7): satu pesan, satu tempat, satu aksi.
   5E. Tombol "+ Tambah Investasi" duduk di HEADER "Detail per Aset" (kanan
       atas), bukan di dasar daftar (audit fintech #5) — portofolio panjang tidak
       bisa lagi mengubur primary action ini.

   Tata letak desktop: dua kolom (ringkasan + donut di kiri, daftar aset di
   kanan) supaya halaman terasa dashboard, bukan HP yang direntangkan.
   ────────────────────────────────────────────────────────────────────────── */

export function WealthInvestasi({
  investments,
  masked,
  expandedAssetId,
  onToggleExpand,
  onAdd,
  onUpdatePrice,
  onEdit,
  onDelete,
}: {
  investments: Investment[]
  masked: boolean
  expandedAssetId: string | null
  onToggleExpand: (id: string) => void
  onAdd: () => void
  onUpdatePrice: (asset: Investment) => void
  onEdit: (asset: Investment) => void
  onDelete: (asset: Investment) => void
}) {
  const [detailOpen, setDetailOpen] = useState(true)

  const totalValue = totalPortfolioValue(investments)
  const invested = totalInvestedValue(investments)
  const ret = unrealizedReturn(investments)

  return (
    <div className="grid gap-5 lg:gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-start">
      {/* ── KOLOM KIRI: ringkasan + donut ──────────────────────────────── */}
      <div className="space-y-5 lg:space-y-6">
        <PortfolioSummaryCard
          totalValue={totalValue}
          invested={invested}
          returnValue={ret.value}
          returnPct={ret.pct}
          assetCount={investments.length}
          masked={masked}
        />

        <WealthAssetDonut investments={investments} masked={masked} />
      </div>

      {/* ── KOLOM KANAN: detail per aset ───────────────────────────────── */}
      <div>
        {/* ── HEADER "Detail per Aset" + 5E: primary action di sini ─────────
            Audit fintech #5: tombol "+ Tambah Investasi" dulu duduk di DASAR
            daftar, jadi portofolio panjang mengubur satu-satunya jalan mencatat
            aset baru. Sekarang ia di kanan atas, sebaris dengan judul.

            Audit fintech #6: teks instruksi "tap kartu untuk riwayat…" dihapus.
            Affordance-nya dipindah ke siluet kartu (chevron + hover state),
            bukan ke teks kecil yang harus dibaca dulu.

            Struktur tombol dipisah (bukan <button> di dalam <button>) supaya
            HTML-nya valid: toggle lipat = satu tombol, aksi tambah = tombol lain. */}
        <div className="flex items-center gap-2 rounded-[1.5rem] bg-[#FFFDF7] px-4 py-3.5 shadow-[0_14px_34px_-28px_rgba(16,58,42,0.5)] ring-1 ring-black/[0.05] sm:px-5 sm:py-4">
          <button
            type="button"
            onClick={() => setDetailOpen((prev) => !prev)}
            aria-expanded={detailOpen}
            className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl text-left outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-forest/30"
          >
            <span className="min-w-0">
              <span className="block font-display text-[14px] font-bold tracking-tight text-ink">
                Detail per Aset
              </span>
              <span className="mt-0.5 block text-[11.5px] text-ink/45">
                {investments.length} aset
              </span>
            </span>
            <ChevronDown
              className={cn(
                'size-4 shrink-0 text-ink/35 transition-transform duration-300',
                detailOpen && 'rotate-180',
              )}
              strokeWidth={2.4}
            />
          </button>

          <button
            type="button"
            onClick={onAdd}
            /* label penuh di layar >=sm; di HP sempit cukup ikon + aria-label
               supaya judul "Detail per Aset" tidak terpotong */
            aria-label="Tambah investasi"
            title="Tambah investasi"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-2xl bg-forest px-3 text-[12.5px] font-semibold text-cream shadow-[0_12px_26px_-16px_rgba(16,58,42,0.8)] transition-colors hover:bg-forest-soft active:scale-[0.98] sm:px-4"
          >
            <Plus className="size-4" strokeWidth={2.6} />
            <span className="hidden sm:inline">Tambah Investasi</span>
          </button>
        </div>

        <AnimatePresence initial={false}>
          {detailOpen && (
            <motion.div
              key="asset-detail"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              {/* 5D — banner harga basi hanya menempel di KARTU aset yang
                  bersangkutan. Tidak ada lagi banner agregat kedua di kaki
                  daftar (audit fintech #7): pesan yang sama dua kali membuat
                  halaman terasa rusak, bukan terasa jujur. */}
              <ul className="mt-3 space-y-2.5">
                {investments.map((asset, index) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    masked={masked}
                    stale={isAssetStale(asset)}
                    expanded={expandedAssetId === asset.id}
                    delay={0.03 * index}
                    onToggle={() => onToggleExpand(asset.id)}
                    onUpdatePrice={() => onUpdatePrice(asset)}
                    onEdit={() => onEdit(asset)}
                    onDelete={() => onDelete(asset)}
                  />
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ── 5A: kartu ringkasan portofolio INVESTASI ───────────────────────────────
   Audit fintech #4: stempel waktu global DIHAPUS dari kartu ini.

   Dulu kartu ini menulis "Harga per 03:25" — yaitu update TERBARU dari seluruh
   portofolio. Masalahnya: 03:25 itu justru milik Bitcoin yang di kartunya
   sendiri ditandai "harga belum diperbarui", sementara Emas (update kemarin
   16:00) sama sekali tidak diberi warning. Satu cap waktu global untuk sumber
   yang berjalan asinkron (crypto menit-an vs emas EOD) itu menyatakan valid
   pada data yang belum tervalidasi.

   Sekarang kartu ini murni bicara NILAI & MODAL; "Update terakhir" hidup di
   tiap kartu aset, tempat ia benar-benar relevan. */
function PortfolioSummaryCard({
  totalValue,
  invested,
  returnValue,
  returnPct,
  assetCount,
  masked,
}: {
  totalValue: number
  invested: number
  returnValue: number
  returnPct: number
  assetCount: number
  masked: boolean
}) {
  const positive = returnValue >= 0
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] bg-[#FFFDF7] p-5 shadow-[0_20px_46px_-30px_rgba(16,58,42,0.5)] ring-1 ring-black/[0.05] sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-14 -top-16 size-48 rounded-full bg-hud-sage/25 blur-3xl"
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-ink/40">
            Total Aset Investasi
          </span>
          <span className="rounded-full bg-hud-sage/25 px-2.5 py-1 text-[10.5px] font-bold text-[#4F5C3C]">
            {assetCount} aset
          </span>
        </div>

        <p className="mt-2 font-display text-[2rem] font-black leading-none tracking-tight text-ink tabular-nums sm:text-[2.4rem]">
          {maskMoney(totalValue, masked)}
        </p>

        <p
          className={cn(
            'mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] font-bold tabular-nums',
            positive ? 'text-[#7D8B65]' : 'text-hud-terracotta',
          )}
        >
          <span>
            {positive ? '+' : '−'}
            {maskMoney(Math.abs(returnValue), masked)}
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11.5px]',
              positive ? 'bg-hud-sage/25' : 'bg-hud-terracotta/15',
            )}
          >
            {positive ? '+' : '−'}
            {Math.abs(returnPct).toFixed(2)}%
          </span>
          {!masked && <span className="text-[11px] font-medium text-ink/40">belum terealisasi</span>}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink/40">
          <span className="tabular-nums">Modal {maskMoney(invested, masked)}</span>
          <span aria-hidden>·</span>
          {/* #4 — TIDAK ADA stempel waktu global di kartu master. Harga tiap
              aset diperbarui manual & asinkron, jadi waktu validasinya cuma
              bermakna di kartu aset itu sendiri. */}
          <span>update harga manual per aset</span>
        </div>
      </div>
    </section>
  )
}


/* ── 5C + 5D: kartu aset (geser kiri = Edit/Hapus, tap = riwayat) ──────────── */

/** lebar area aksi yang tersingkap (px) — dua tombol di kanan */
const REVEAL_ACTIONS = 168
/** ambang snap: geseran > 44px langsung membuka penuh */
const SNAP = 44

function AssetCard({
  asset,
  masked,
  stale,
  expanded,
  delay,
  onToggle,
  onUpdatePrice,
  onEdit,
  onDelete,
}: {
  asset: Investment
  masked: boolean
  stale: boolean
  expanded: boolean
  delay: number
  onToggle: () => void
  onUpdatePrice: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const meta = ASSET_TYPE_META[asset.type]
  const ret = assetReturn(asset)
  const profit = ret.value >= 0
  const history = assetHistory(asset.id)

  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef<number | null>(null)
  const moved = useRef(false)

  const clamp = (value: number) => Math.max(-REVEAL_ACTIONS, Math.min(0, value))

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

  /** lepas jari: snap ke lebar penuh kalau lewat ambang, kalau tidak tutup */
  const settle = () => {
    if (startX.current === null) return
    startX.current = null
    setDragging(false)
    setDx((value) => (Math.abs(value) > SNAP ? -REVEAL_ACTIONS : 0))
  }

  /** tap: kalau barusan menggeser cukup tutup area aksi, kalau tidak buka detail */
  const handleClick = () => {
    if (moved.current) {
      moved.current = false
      setDx(0)
      return
    }
    onToggle()
  }

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, delay, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      {/* area aksi di belakang kartu (terungkap saat digeser kiri) */}
      <div className="absolute inset-y-0 right-0 flex overflow-hidden rounded-[1.35rem]">
        <button
          type="button"
          onClick={() => {
            setDx(0)
            onEdit()
          }}
          className="flex w-[84px] flex-col items-center justify-center gap-1 bg-hud-amber text-[10.5px] font-bold text-[#4a2f10] transition-colors hover:brightness-105"
        >
          <Pencil className="size-4" strokeWidth={2.4} />
          Edit
        </button>
        <button
          type="button"
          onClick={() => {
            setDx(0)
            onDelete()
          }}
          className="flex w-[84px] flex-col items-center justify-center gap-1 bg-hud-terracotta text-[10.5px] font-bold text-cream transition-colors hover:brightness-105"
        >
          <Trash2 className="size-4" strokeWidth={2.4} />
          Hapus
        </button>
      </div>

      <motion.button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={settle}
        onPointerCancel={settle}
        onClick={handleClick}
        aria-expanded={expanded}
        aria-label={`${asset.name}, ${formatAssetQuantity(asset)}, nilai ${maskMoney(asset.currentValue, masked)}`}
        animate={{ x: dx }}
        transition={dragging ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 30 }}
        style={{ touchAction: 'pan-y' }}
        className="group relative w-full cursor-pointer touch-pan-y overflow-hidden rounded-[1.35rem] bg-white px-3.5 py-3.5 text-left shadow-[0_10px_28px_-24px_rgba(16,58,42,0.6)] ring-1 ring-black/[0.05] transition-[box-shadow,background-color,ring-color] duration-200 outline-none hover:bg-[#FFFDF7] hover:shadow-[0_18px_34px_-24px_rgba(16,58,42,0.75)] hover:ring-forest/20 focus-visible:ring-2 focus-visible:ring-forest/30"
      >
        {/* 5D — harga basi: banner amber tepat di atas isi kartu aset ini */}
        {stale && (
          <span className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-hud-amber/12 px-3 py-2 ring-1 ring-inset ring-hud-amber/25">
            <span className="flex min-w-0 flex-1 items-start gap-1.5 text-[11px] leading-snug text-[#8a5a1f]">
              <AlertTriangle className="mt-px size-3.5 shrink-0" strokeWidth={2.4} />
              <span>
                Harga belum diperbarui. Update terakhir: {formatPriceStamp(asset.lastUpdate)}
              </span>
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation()
                onUpdatePrice()
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                event.stopPropagation()
                onUpdatePrice()
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10.5px] font-bold text-[#8a5a1f] ring-1 ring-hud-amber/40 transition-colors hover:bg-hud-amber/15"
            >
              <RefreshCw className="size-3" strokeWidth={2.6} />
              Update Manual
            </span>
          </span>
        )}


        <span className="flex items-center gap-3">
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-2xl text-[17px]',
              meta.chipClass,
            )}
            aria-hidden
          >
            {meta.emoji}
          </span>

          {/* tengah: nama + simbol + satuan + harga rata-rata */}
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[13.5px] font-bold text-ink">{asset.name}</span>
              <span className="shrink-0 rounded-full bg-ink/[0.05] px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-ink/50">
                {asset.symbol}
              </span>
            </span>
            <span className="mt-1 block truncate text-[11.5px] text-ink/50 tabular-nums">
              {formatAssetQuantity(asset)}
            </span>
            <span className="mt-0.5 block truncate text-[10.5px] text-ink/40 tabular-nums">
              Avg {maskMoney(asset.avgBuyPrice, masked)}
            </span>
          </span>

          {/* kanan: nilai sekarang + return + timestamp harga */}
          <span className="flex shrink-0 flex-col items-end">
            <span className="text-[13.5px] font-bold text-ink tabular-nums">
              {maskMoney(asset.currentValue, masked)}
            </span>
            <span
              className={cn(
                'mt-0.5 text-[11px] font-bold tabular-nums',
                profit ? 'text-[#7D8B65]' : 'text-hud-terracotta',
              )}
            >
              {profit ? '+' : '−'}
              {formatIDR(Math.abs(ret.value))} ({Math.abs(ret.pct).toFixed(2)}%)
            </span>
            {/* "Update terakhir" per aset — satu-satunya tempat stempel harga
                yang sah, karena jadwal update tiap aset berbeda (audit #4) */}
            <span className="mt-0.5 text-[10px] text-ink/35 tabular-nums">
              {formatPriceStamp(asset.lastUpdate)}
            </span>
          </span>

          {/* #6 — AFFORDANCE: chevron ">" adalah tanda universal "bisa dibuka",
              plus hover state (kartu menyala + chevron bergeser & menggelap).
              Ini menggantikan teks instruksi kecil "tap kartu untuk riwayat…". */}
          <ChevronRight
            aria-hidden
            className={cn(
              'mt-0.5 size-4 shrink-0 text-ink/25 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-forest/60',
              expanded && 'rotate-90 text-forest/70',
            )}
            strokeWidth={2.4}
          />
        </span>
      </motion.button>

      {/* ── sub-section inline: riwayat beli/jual aset ini ──────────────── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="history"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-[1.35rem] bg-cream/70 px-3.5 py-3.5 ring-1 ring-inset ring-black/[0.04]">
              <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink/40">
                <History className="size-3.5" strokeWidth={2.6} />
                Riwayat Beli/Jual
              </p>
              {/* TODO: ambil dari tabel investment_transactions
                  (asset_id, type buy/sell, quantity, price_per_unit,
                   transaction_date, fees, rdn_account) lewat Supabase */}
              <ul className="mt-2.5 space-y-2">
                {history.map((tx) => (
                  <li key={tx.id} className="flex items-center gap-2.5 text-[11.5px]">
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide',
                        tx.side === 'buy'
                          ? 'bg-hud-sage/25 text-[#4F5C3C]'
                          : 'bg-hud-terracotta/15 text-[#8f4f18]',
                      )}
                    >
                      {tx.side === 'buy' ? 'Beli' : 'Jual'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink/60 tabular-nums">
                      {formatShortDate(tx.date)} · {formatNumber(tx.quantity, 6)}{' '}
                      {meta.unit || asset.symbol}
                    </span>
                    <span className="shrink-0 font-semibold text-ink/70 tabular-nums">
                      {maskMoney(tx.price, masked)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-[10px] text-ink/35">
                Harga rata-rata dihitung otomatis (weighted average) dari riwayat ini.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}

