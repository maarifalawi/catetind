'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  History,
  Pencil,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { WealthAssetDonut } from './wealth-asset-donut'
import {
  ASSET_HISTORY_EMPTY,
  ASSET_HISTORY_EMPTY_HINT,
  ASSET_HISTORY_TITLE,
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
  priceUpdatedLabel,
  stalePriceWarning,
  WEALTH_ROW_ACTION,
  type AssetTransaction,
  type Investment,
} from '@/lib/data/wealth'
import { CONTEXT_LABEL } from '@/lib/data/money-context'

/* ── TAB 1 — INVESTASI (Section 5) ──────────────────────────────────────────
   Alur pandang (sengaja berlapis, bukan tabel):

   5A. Ringkasan portofolio investasi — satu angka besar + return + modal.
       TANPA stempel waktu (audit fintech #4): sumber harga tiap aset berjalan
       ASINKRON (crypto menit-an, emas EOD), jadi satu timestamp global di kartu
       master menyesatkan — apalagi saat timestamp itu justru milik aset yang
       ditandai basi. "Update terakhir" hanya hidup di kartu aset masing-masing.
   5B. Donut alokasi (Recharts), TANPA legenda. Persennya dihitung Largest
       Remainder (audit fintech #3) supaya selalu berjumlah tepat 100%. Donut
       hanya muncul saat jumlah aset > 1 (satu aset = lingkaran penuh tanpa
       informasi); legenda di bawahnya dihapus karena mengulang daftar aset.
   5C. "Detail per Aset" — accordion. Progressive disclosure-nya: user yang cuma
       mau tahu total bisa melipat daftarnya, yang mau audit membuka satu per
       satu. Tap pada kartu → riwayat beli/jual aset itu. Edit/Hapus kini IKON
       INLINE di tepi kanan baris (pensil + tempat sampah) — bentuk yang sudah
       dipakai tab Properti, jadi dua tab bersaudara memakai satu bahasa aksi.
       Baris tombol selebar kartu yang lama (`AssetActionRow`) dihapus: dua
       tombol besar untuk aksi sekunder terlalu berat.
       "Edit" membuka sheet edit aset yang benar-benar menyimpan (paket 17).
       Riwayat beli/jual adalah TURUNAN dari ledger transaksi aset
       (`assetHistory`); aset tanpa baris ledger menampilkan empty state jujur,
       bukan daftar kosong.

       AFFORDANCE (audit fintech #6 + masukan langsung user): setiap kartu punya
       chevron ">" + hover state jelas, dan tombol ikon aksi ber-`aria-label`
       yang menyebut nama asetnya — tidak ada kemampuan yang harus ditebak.
   5D. Banner amber per aset kalau harganya basi (crypto > 10 menit, lain-lain
       > 24 jam) + tombol "Update Manual" — satu sumber gagal tidak mematikan
       aset lain (fallback protocol PRD 2E.1 poin 5). TIDAK ada banner agregat
       kedua di kaki daftar (audit fintech #7): satu pesan, satu tempat, satu aksi.
       Tombol "Update Manual" membuka modal koreksi harga satu aset
       (`update-price-modal.tsx`): harga sekarang, akibatnya pada nilai & return,
       lalu stempel "Terakhir diperbarui" ikut berubah.

   5E. Tombol "+ Tambah Investasi" duduk di HEADER "Detail per Aset" (kanan
       atas), bukan di dasar daftar (audit fintech #5) — portofolio panjang tidak
       bisa lagi mengubur primary action ini.

   Tata letak desktop: dua kolom (ringkasan + donut di kiri, daftar aset di
   kanan) supaya halaman terasa dashboard, bukan HP yang direntangkan.
   ────────────────────────────────────────────────────────────────────────── */

export function WealthInvestasi({
  investments,
  transactions,
  masked,
  expandedAssetId,
  onToggleExpand,
  onAdd,
  onUpdatePrice,
  onEdit,
  onDelete,
}: {
  investments: Investment[]
  /**
   * Ledger transaksi beli/jual (satu daftar datar, seperti tabel
   * `investment_transactions`) — riwayat per aset diturunkan dari sini, jadi
   * aset yang belum punya baris ledger otomatis tampil sebagai empty state.
   */
  transactions: AssetTransaction[]
  masked: boolean
  expandedAssetId: string | null
  onToggleExpand: (id: string) => void
  onAdd: () => void
  onUpdatePrice: (asset: Investment) => void
  onEdit: (asset: Investment) => void
  onDelete: (asset: Investment) => void
}) {
  const [detailOpen, setDetailOpen] = useState(true)

  /* Daftar aset dipakai dua jalur render: di dalam accordion (saat jumlah aset
     > 1) atau langsung (saat hanya ada satu aset — donut & header lipat tidak
     punya arti di situ). */
  const list = (
    <ul className="space-y-3.5">
      {investments.map((asset, index) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          transactions={transactions}
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
  )

  return (
    <div className="flex flex-col gap-5">
      {/* donut alokasi — otomatis hilang kalau asetnya tinggal satu */}
      <WealthAssetDonut investments={investments} masked={masked} />

      {investments.length > 1 ? (
        <>
          {/* kepala daftar ringan: jumlah aset + lipat/buka. Tombol tambah sudah
              ada di kepala kartu panel (wealth-screen), jadi tidak diduplikasi
              di sini. */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-forest/40">
              {investments.length} aset
            </p>
            <button
              type="button"
              onClick={() => setDetailOpen((prev) => !prev)}
              aria-expanded={detailOpen}
              aria-label="Lipat atau buka daftar aset"
              className="flex size-8 items-center justify-center rounded-full text-forest/40 outline-none transition-colors hover:bg-sage hover:text-forest focus-visible:ring-2 focus-visible:ring-forest/30"
            >
              <ChevronDown
                className={cn(
                  'size-4 transition-transform duration-300',
                  detailOpen && 'rotate-180',
                )}
                strokeWidth={2.4}
              />
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
                    bersangkutan; tidak ada banner agregat kedua di kaki daftar. */}
                {list}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        list
      )}
    </div>
  )
}

/* ── 5C + 5D: kartu aset (tap = riwayat, aksi inline di tepi kanan baris) ─── */

function AssetCard({
  asset,
  transactions,
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
  transactions: AssetTransaction[]
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
  const history = assetHistory(transactions, asset.id)

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, delay, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      {/* Satu baris = kartu (tap → riwayat) + aksi ikon di tepi kanannya.
          Tombol aksi tidak boleh bersarang di dalam <button> kartu, jadi ia
          duduk di luar kartu — persis pola yang sudah dipakai tab Properti. */}
      <div className="flex items-stretch gap-1.5">
        <motion.button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={`${asset.name}, ${formatAssetQuantity(asset)}, nilai ${maskMoney(asset.currentValue, masked)}`}
          className="group relative min-w-0 flex-1 cursor-pointer overflow-hidden rounded-[1.35rem] bg-cream px-3.5 py-3.5 text-left shadow-[0_10px_28px_-24px_rgba(0,0,0,0.6)] ring-1 ring-soil/10 transition-[box-shadow,background-color,ring-color] duration-200 outline-none hover:bg-cream hover:shadow-[0_18px_34px_-24px_rgba(0,0,0,0.75)] hover:ring-forest/20 focus-visible:ring-2 focus-visible:ring-forest/30"
        >
          {/* 5D — harga basi: banner amber tepat di atas isi kartu aset ini */}
          {stale && (
            <span className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-hud-amber/12 px-3 py-2 ring-1 ring-inset ring-hud-amber/25">
              <span className="flex min-w-0 flex-1 items-start gap-1.5 text-[11px] leading-snug text-hud-terracotta">
                <AlertTriangle className="mt-px size-3.5 shrink-0" strokeWidth={2.4} />
                <span>
                  {stalePriceWarning(meta.label, formatPriceStamp(asset.lastUpdate))}
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
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-cream px-2.5 py-1 text-[10.5px] font-medium text-hud-terracotta ring-1 ring-hud-amber/40 transition-colors hover:bg-hud-amber/15"
              >
                <RefreshCw className="size-3" strokeWidth={2.6} />
                Update Manual
              </span>
            </span>
          )}
  
  
          {/* baris identitas: ikon + nama + chip + chevron. Nama mendapat
              seluruh sisa lebar — dengan kolom nilai di baris yang sama, nama
              aset terpotong sampai 0 px saat panel kanan-kiri (desktop). */}
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

            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium text-forest">
                {asset.name}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="shrink-0 rounded-full bg-ink/[0.05] px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wide text-forest/50">
                  {asset.symbol}
                </span>
                {/* badge konteks uang aset ini (paket 47) — aset yang muncul di
                    beberapa halaman harus menyebut milik siapa */}
                <span className="shrink-0 rounded-full bg-sage/70 px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wide text-forest ring-1 ring-inset ring-forest/10">
                  {CONTEXT_LABEL[asset.scope]}
                </span>
                <span className="truncate text-[11.5px] text-forest/50 tabular-nums">
                  {formatAssetQuantity(asset)}
                </span>
              </span>
            </span>

            {/* #6 — AFFORDANCE: chevron ">" adalah tanda universal "bisa dibuka",
                plus hover state (kartu menyala + chevron bergeser & menggelap).
                Ini menggantikan teks instruksi kecil "tap kartu untuk riwayat…". */}
            <ChevronRight
              aria-hidden
              className={cn(
                'size-4 shrink-0 text-forest/25 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-forest/60',
                expanded && 'rotate-90 text-forest/70',
              )}
              strokeWidth={2.4}
            />
          </span>

          {/* baris nominal — pola dua tingkat yang SAMA dengan kartu Properti:
              kiri = modal + umur harga (+ pintu Update Harga), kanan = hasil. */}
          <span className="mt-3 flex items-end justify-between gap-3">
            <span className="min-w-0">
              <span className="block truncate text-[10.5px] text-forest/40 tabular-nums">
                Avg {maskMoney(asset.avgBuyPrice, masked)}
              </span>
              {/* "Terakhir diperbarui" per aset — satu-satunya tempat stempel harga
                  yang sah, karena jadwal update tiap aset berbeda (audit #4) */}
              <span className="mt-0.5 block text-[10px] leading-snug text-forest/35 tabular-nums">
                {priceUpdatedLabel(formatPriceStamp(asset.lastUpdate))}
              </span>
              {/* pintu UPDATE HARGA yang SELALU ada (bukan hanya saat harga basi):
                  harga pasar diisi manual, jadi user harus bisa mengoreksinya kapan
                  saja — termasuk saham yang harganya belum lewat 24 jam. Saat kartu
                  sudah menandai basi, banner amber di atas yang mengambil alih
                  tombol ini supaya tidak ada dua tombol bernama sama. */}
              {!stale && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Update harga ${asset.name}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    onUpdatePrice()
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      event.stopPropagation()
                      onUpdatePrice()
                    }
                  }}
                  className="mt-1.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-sage/70 px-2.5 py-1 text-[10.5px] font-medium text-forest ring-1 ring-forest/10 transition-colors hover:bg-forest hover:text-mint"
                >
                  <RefreshCw className="size-3" strokeWidth={2.6} aria-hidden />
                  Update Harga
                </span>
              )}
            </span>

            <span className="shrink-0 text-right">
              <span
                className={cn(
                  'block text-[11px] font-semibold tabular-nums',
                  profit ? 'text-hud-sage' : 'text-hud-terracotta',
                )}
              >
                {profit ? '+' : '−'}
                {formatIDR(Math.abs(ret.value))} ({Math.abs(ret.pct).toFixed(2)}%)
              </span>
              <span className="mt-1 block font-display text-[17px] font-semibold text-forest tabular-nums">
                {maskMoney(asset.currentValue, masked)}
              </span>
            </span>
          </span>
        </motion.button>

        {/* AKSI INLINE — pensil + tempat sampah, ukuran & warna yang SAMA dengan
            tab Properti (size-8, lingkaran soil tipis). Aksi sekunder tidak
            boleh selebar kartu; baris tombol besar yang lama sudah dihapus. */}
        <div className="flex shrink-0 flex-col items-center justify-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label={WEALTH_ROW_ACTION.editAria(asset.name)}
            title={WEALTH_ROW_ACTION.edit}
            className="flex size-8 items-center justify-center rounded-full bg-soil/[0.08] text-forest/60 transition-colors hover:bg-sage hover:text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/30"
          >
            <Pencil className="size-3.5" strokeWidth={2.4} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={WEALTH_ROW_ACTION.removeAria(asset.name)}
            title={WEALTH_ROW_ACTION.remove}
            className="flex size-8 items-center justify-center rounded-full bg-soil/[0.08] text-hud-terracotta transition-colors hover:bg-hud-terracotta/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/30"
          >
            <Trash2 className="size-3.5" strokeWidth={2.4} aria-hidden />
          </button>
        </div>
      </div>

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
            <div className="mt-2 rounded-[1.35rem] bg-cream/70 px-3.5 py-3.5 ring-1 ring-inset ring-soil/8">
              <p className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-forest/40">
                <History className="size-3.5" strokeWidth={2.6} />
                {ASSET_HISTORY_TITLE}
              </p>
              {/* Riwayat datang dari ledger `investment_transactions`
                  (asset_id, type buy/sell, quantity, price_per_unit,
                  transaction_date, fees, rdn_account). Aset yang belum punya
                  baris di ledger TIDAK dibiarkan menampilkan daftar kosong —
                  user diberi tahu apa adanya + jalan keluarnya. */}
              {history.length === 0 ? (
                <div className="mt-2.5 rounded-2xl bg-cream px-3.5 py-3 ring-1 ring-inset ring-soil/8">
                  <p className="text-[11.5px] font-medium leading-relaxed text-forest/60">
                    {ASSET_HISTORY_EMPTY}
                  </p>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-forest/40">
                    {ASSET_HISTORY_EMPTY_HINT}
                  </p>
                </div>
              ) : (
                <>
                  <ul className="mt-2.5 space-y-2">
                    {history.map((tx) => (
                      <li key={tx.id} className="flex items-center gap-2.5 text-[11.5px]">
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-wide',
                            tx.side === 'buy'
                              ? 'bg-hud-sage/25 text-forest'
                              : 'bg-hud-terracotta/15 text-hud-terracotta',
                          )}
                        >
                          {tx.side === 'buy' ? 'Beli' : 'Jual'}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-forest/60 tabular-nums">
                          {formatShortDate(tx.date)} · {formatNumber(tx.quantity, 6)}{' '}
                          {meta.unit || asset.symbol}
                        </span>
                        <span className="shrink-0 font-medium text-forest/70 tabular-nums">
                          {maskMoney(tx.price, masked)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}

