'use client'

import { useState } from 'react'
import { Home, Pencil, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PHYSICAL_TAB_COPY,
  formatIDR,
  maskMoney,
  physicalCategoryLabel,
  totalPhysicalValue,
  type PhysicalAsset,
} from '@/lib/data/wealth'
import { BudgetSheet } from './budget-sheet'

/* ── TAB 2 · PROPERTI & ASET FISIK (paket 63) ────────────────────────────────
   Isi tab ini: kartu total + daftar aset (nama, kategori, harga beli, nilai
   sekarang, selisih ±) + aksi Tambah/Edit/Hapus. Nilai totalnya IKUT ke Total
   Kekayaan di `WealthNetWorthBar` (lewat `physical`), jadi tab ini bukan hiasan.

   Delete selalu lewat konfirmasi (pola halaman ini): hapus aset mengubah Total
   Kekayaan, dan itu tidak boleh terjadi karena salah pencet. Semua copy dari
   `lib/data/wealth.ts` (PHYSICAL_TAB_COPY) — nol string di JSX. */

/** selisih nilai → teks + warna (naik = forest, turun = terracotta, stabil = netral) */
function diffOf(asset: PhysicalAsset): { text: string; tone: string } {
  const diff = asset.currentValue - asset.purchasePrice
  if (diff === 0) return { text: PHYSICAL_TAB_COPY.flatLabel, tone: 'text-forest/45' }
  const sign = diff > 0 ? '+' : '−'
  const label = diff > 0 ? PHYSICAL_TAB_COPY.gainLabel : PHYSICAL_TAB_COPY.lossLabel
  return {
    text: `${label} ${sign}${formatIDR(Math.abs(diff))}`,
    tone: diff > 0 ? 'text-forest' : 'text-hud-terracotta',
  }
}

export function WealthProperti({
  assets,
  masked,
  onAdd,
  onEdit,
  onDelete,
}: {
  assets: PhysicalAsset[]
  masked: boolean
  onAdd: () => void
  onEdit: (asset: PhysicalAsset) => void
  onDelete: (asset: PhysicalAsset) => void
}) {
  const total = totalPhysicalValue(assets)
  /* konfirmasi hapus lokal — dipegang tab ini supaya aksinya dekat dengan datanya */
  const [pendingDelete, setPendingDeleteState] = useState<PhysicalAsset | null>(null)

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-[1.75rem] border-2 border-dashed border-forest/25 bg-cream px-6 py-12 text-center">
        <span aria-hidden className="flex size-12 items-center justify-center rounded-2xl bg-sage/60 text-forest">
          <Home className="size-6" strokeWidth={2} />
        </span>
        <h2 className="mt-3 font-display text-[17px] font-semibold tracking-tight text-forest">
          {PHYSICAL_TAB_COPY.emptyTitle}
        </h2>
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-forest/55">
          {PHYSICAL_TAB_COPY.emptyBody}
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-5 inline-flex h-11 items-center gap-1.5 rounded-full bg-forest px-5 text-[13px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-[0.98] motion-reduce:transition-none"
        >
          <Plus className="size-4" strokeWidth={2.6} aria-hidden />
          {PHYSICAL_TAB_COPY.emptyCta}
        </button>
      </div>
    )
  }

  return (
    <section className="space-y-3">
      {/* kartu total — angka yang ikut ke Total Kekayaan di atas */}
      <div className="flex items-baseline justify-between rounded-2xl bg-forest p-4 text-cream">
        <span className="text-[11px] font-medium uppercase tracking-wide text-cream/60">
          {PHYSICAL_TAB_COPY.totalLabel}
        </span>
        <span className="font-display text-[1.35rem] font-semibold tabular-nums">
          {maskMoney(total, masked)}
        </span>
      </div>

      <PhysicalList assets={assets} masked={masked} onEdit={onEdit} onDelete={setPendingDeleteState} />

      <button
        type="button"
        onClick={onAdd}
        className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full border border-forest/30 bg-cream text-[13px] font-medium text-forest transition-colors hover:bg-sage/60 active:scale-[0.98] motion-reduce:transition-none"
      >
        <Plus className="size-4" strokeWidth={2.6} aria-hidden />
        {PHYSICAL_TAB_COPY.addLabel}
      </button>

      <BudgetSheet
        open={pendingDelete !== null}
        onClose={() => setPendingDeleteState(null)}
        title={PHYSICAL_TAB_COPY.delete.title}
        description={pendingDelete ? PHYSICAL_TAB_COPY.delete.body(pendingDelete.name) : undefined}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPendingDeleteState(null)}
              className="h-12 flex-1 rounded-full bg-soil/[0.08] text-[14px] font-medium text-forest transition-colors hover:bg-soil/[0.14]"
            >
              {PHYSICAL_TAB_COPY.delete.cancel}
            </button>
            <button
              type="button"
              onClick={() => {
                if (pendingDelete) onDelete(pendingDelete)
                setPendingDeleteState(null)
              }}
              className="h-12 flex-1 rounded-full bg-hud-terracotta text-[14px] font-medium text-cream transition-colors hover:opacity-90"
            >
              {PHYSICAL_TAB_COPY.delete.confirm}
            </button>
          </div>
        }
      >
        <p className="text-[12.5px] leading-relaxed text-forest/55">{PHYSICAL_TAB_COPY.blurb}</p>
      </BudgetSheet>
    </section>
  )
}

/** daftar kartu aset — dipisah supaya `WealthProperti` tetap terbaca */
function PhysicalList({
  assets,
  masked,
  onEdit,
  onDelete,
}: {
  assets: PhysicalAsset[]
  masked: boolean
  onEdit: (asset: PhysicalAsset) => void
  onDelete: (asset: PhysicalAsset) => void
}) {
  return (
    <ul className="space-y-3">
      {assets.map((asset) => {
        const diff = diffOf(asset)
        return (
          <li
            key={asset.id}
            className="rounded-2xl bg-cream p-4 ring-1 ring-soil/12 transition-shadow hover:shadow-[0_16px_36px_-28px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-display text-[15px] font-medium tracking-tight text-forest">
                  {asset.name}
                </p>
                <p className="mt-0.5 text-[11.5px] font-medium text-forest/50">
                  {physicalCategoryLabel(asset.category)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(asset)}
                  aria-label={`Edit ${asset.name}`}
                  className="flex size-8 items-center justify-center rounded-full bg-soil/[0.08] text-forest/60 transition-colors hover:bg-sage hover:text-forest"
                >
                  <Pencil className="size-3.5" strokeWidth={2.4} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(asset)}
                  aria-label={`Hapus ${asset.name}`}
                  className="flex size-8 items-center justify-center rounded-full bg-soil/[0.08] text-hud-terracotta transition-colors hover:bg-hud-terracotta/20"
                >
                  <Trash2 className="size-3.5" strokeWidth={2.4} aria-hidden />
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-forest/45">{PHYSICAL_TAB_COPY.currentLabel}</p>
                <p className="font-display text-[16px] font-semibold tabular-nums text-forest">
                  {maskMoney(asset.currentValue, masked)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-medium text-forest/45">{PHYSICAL_TAB_COPY.purchaseLabel}</p>
                <p className="text-[13px] font-medium tabular-nums text-forest/60">
                  {maskMoney(asset.purchasePrice, masked)}
                </p>
              </div>
            </div>

            <p className={cn('mt-2 text-[12px] font-medium tabular-nums', diff.tone)}>{diff.text}</p>
          </li>
        )
      })}
    </ul>
  )
}

