'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { BudgetSheet, RupiahField, SheetSubmit } from './budget-sheet'
import { cn } from '@/lib/utils'
import {
  ASSET_TYPE_META,
  PRICE_UPDATE_COPY,
  WEALTH_NOW_ISO,
  formatAssetQuantity,
  formatPriceStamp,
  isAssetStale,
  maskMoney,
  stalePriceWarning,
  type Investment,
} from '@/lib/data/wealth'

/* ── UPDATE MANUAL HARGA (Section 5D, PRD 2E.1 poin 3–4) ─────────────────────
   Jalur cepat mengoreksi HARGA SEKARANG satu aset saja — bukan form lengkap,
   bukan pula transaksi. Alasannya ada di PRD 2E.1: sumber harga otomatis bisa
   gagal (satu sumber down TIDAK boleh mematikan aset lain), dan saat itu user
   harus punya jalan keluar sendiri: isi harga yang ia lihat di aplikasi
   broker/bursa, lalu warning amber di kartu aset itu hilang.

   Yang dibangun bukan sekadar input angka: user melihat AKIBATNYA lebih dulu
   (nilai aset & return setelah update) sebelum menyimpan, karena koreksi harga
   langsung menggerakkan total portofolio & Net Worth.

   Shell-nya memakai kit `budget-sheet.tsx` (Vaul di mobile, dialog di desktop)
   supaya tempo buka/tutupnya sama dengan sheet lain di halaman Kekayaan.
   ────────────────────────────────────────────────────────────────────────── */

export function UpdatePriceModal({
  asset,
  masked,
  onClose,
  onConfirm,
}: {
  /** aset yang harganya sedang dikoreksi — null sebelum modal pernah dibuka */
  asset: Investment | null
  masked: boolean
  onClose: () => void
  /** harga baru hasil input user; parent yang menutup modal & memperbarui state */
  onConfirm: (price: number) => void
}) {
  const [digits, setDigits] = useState('')

  /* Snapshot aset terakhir: Vaul masih menganimasikan penutupan setelah parent
     mengosongkan `asset` — tanpa snapshot, judul & ringkasannya berkedip kosong
     di tengah animasi keluar (pola yang sama dengan edit-transaction-sheet). */
  const [shown, setShown] = useState<Investment | null>(asset)
  useEffect(() => {
    if (asset) setShown(asset)
  }, [asset])

  const open = asset !== null

  /* Tiap kali modal dibuka (atau pindah aset), inputnya mulai dari kosong:
     prefill "harga sekarang" bikin user cenderung menyimpan angka lama tanpa
     melihat, padahal justru angkanya yang mau diganti. */
  useEffect(() => {
    if (!open) return
    setDigits('')
  }, [open, asset?.id])

  /* dibaca sinkron supaya frame pertama saat modal dibuka sudah berisi data */
  const data = asset ?? shown
  const meta = data ? ASSET_TYPE_META[data.type] : null
  const price = Number(digits || '0')
  /** dampak yang akan terjadi kalau disimpan — dihitung live, bukan setelah simpan */
  const newValue = (data?.quantity ?? 0) * price
  const invested = data?.totalInvested ?? 0
  const returnValue = newValue - invested
  const stamp = formatPriceStamp(WEALTH_NOW_ISO)
  const stale = data ? isAssetStale(data) : false

  function submit() {
    if (!data || price <= 0) return
    onConfirm(price)
  }

  return (
    <BudgetSheet
      open={open}
      onClose={onClose}
      title={PRICE_UPDATE_COPY.title}
      description={PRICE_UPDATE_COPY.description}
      footer={
        <SheetSubmit onClick={submit} disabled={!data || price <= 0} gate>
          <span className="inline-flex items-center gap-2">
            <RefreshCw className="size-4" strokeWidth={2.6} />
            {PRICE_UPDATE_COPY.submit}
          </span>
        </SheetSubmit>
      }
    >
      {/* `data` bisa null sebelum modal pernah dibuka — isinya hanya dirender saat
          asetnya benar-benar ada (Drawer-nya sendiri sedang tertutup) */}
      {data && meta && (
        <>
          <div className="flex items-center gap-3 rounded-2xl bg-cream px-4 py-3.5 ring-1 ring-soil/10">
            <span
              aria-hidden
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-2xl text-[17px]',
                meta.chipClass,
              )}
            >
              {meta.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium text-forest">{data.name}</span>
              <span className="mt-0.5 block truncate text-[11px] text-forest/45 tabular-nums">
                {formatAssetQuantity(data)} · {maskMoney(data.currentPrice, masked)} per unit sekarang
              </span>
            </span>
          </div>

          {/* kalau kartunya memang sedang ditandai basi, sebutkan sebabnya di sini
              juga — user tahu kenapa ia berada di modal ini */}
          {stale && (
            <p className="mt-3 flex items-start gap-2 rounded-2xl bg-hud-amber/12 px-3.5 py-3 text-[11.5px] leading-relaxed text-[#b89191] ring-1 ring-inset ring-hud-amber/25">
              <AlertTriangle className="mt-px size-3.5 shrink-0" strokeWidth={2.4} />
              <span className="min-w-0">
                {stalePriceWarning(meta.label, formatPriceStamp(data.lastUpdate))}
              </span>
            </p>
          )}

          <RupiahField
            label={PRICE_UPDATE_COPY.fieldLabel}
            digits={digits}
            onDigitsChange={setDigits}
            placeholder="Rp 9.875"
            hint={PRICE_UPDATE_COPY.fieldHint}
            size="lg"
          />

          {/* akibat update, live: nilai aset & return terhadap modal */}
          {price > 0 && (
            <div className="mt-3.5 space-y-2 rounded-2xl bg-sage/60 px-4 py-3 text-[12px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-forest/60">{PRICE_UPDATE_COPY.valueLabel}</span>
                <span className="font-semibold text-forest tabular-nums">
                  {maskMoney(newValue, masked)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-forest/60">{PRICE_UPDATE_COPY.returnLabel}</span>
                <span
                  className={cn(
                    'font-semibold tabular-nums',
                    returnValue >= 0 ? 'text-[#b5b987]' : 'text-hud-terracotta',
                  )}
                >
                  {returnValue >= 0 ? '+' : '−'}
                  {maskMoney(Math.abs(returnValue), masked)}
                </span>
              </div>
            </div>
          )}

          <p className="mt-3 text-[10.5px] leading-relaxed text-forest/40">
            {PRICE_UPDATE_COPY.stampNote(stamp)}
          </p>
        </>
      )}
    </BudgetSheet>
  )
}
