'use client'

import { useRef, useState } from 'react'
import { Check, ChevronDown, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TRANSACTION_INPUT_COPY, maskMoney } from '@/lib/data/history'
import { PickerSheet } from './picker-sheet'

/* --- WalletPicker - pemilih "Sumber Dompet" (paket 69) ---------------------
   Dropdown kustom (bottom sheet di mobile, panel di desktop) yang isinya dompet
   NYATA dari ledger + saldonya - jadi user melihat uangnya keluar dari dompet
   mana, bukan menebak-nebak. Bukan <select> native, dan saldonya ikut tombol
   mata privasi global lewat prop `masked`. */

export interface WalletPickerOption {
  /** id dompet di ledger - dipakai sebagai React key */
  id: string
  /** nama dompet yang TERSIMPAN di baris transaksi */
  label: string
  balance: number
}

const TRIGGER_CLASS =
  'flex w-full items-center justify-between gap-2 rounded-xl bg-soil/[0.09] px-3 py-2.5 text-left text-[12.5px] font-medium text-forest outline-none ring-1 ring-transparent transition-all hover:bg-soil/[0.12] focus-visible:bg-cream focus-visible:ring-forest/15'

export function WalletPicker({
  value,
  options,
  onChange,
  masked = false,
  invalid = false,
  describedBy,
}: {
  value: string
  options: WalletPickerOption[]
  onChange: (name: string) => void
  /** tombol mata global aktif -> saldo disensor */
  masked?: boolean
  invalid?: boolean
  describedBy?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.label === value) ?? null
  /* tombol pemicu — dikirim ke `PickerSheet` supaya host overlay dicari dari
     ancestor TOMBOL INI (`closest`), bukan dari dialog pertama di dokumen
     (lihat catatan "PAKET 70" di picker-sheet.tsx). */
  const triggerRef = useRef<HTMLButtonElement>(null)

  function choose(name: string) {
    onChange(name)
    setOpen(false)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={TRANSACTION_INPUT_COPY.walletOpenLabel}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className={cn(TRIGGER_CLASS, invalid && 'bg-cream ring-hud-amber/45')}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected ? (
            <>
              <span className="truncate">{selected.label}</span>
              <span className="shrink-0 text-[11.5px] text-forest/45">
                {maskMoney(selected.balance, masked)}
              </span>
            </>
          ) : (
            <span className="truncate text-forest/40">
              {TRANSACTION_INPUT_COPY.walletPlaceholder}
            </span>
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 text-forest/40" aria-hidden />
      </button>

      <PickerSheet
        open={open}
        anchor={triggerRef}
        onClose={() => setOpen(false)}
        title={TRANSACTION_INPUT_COPY.walletSheetTitle}
        closeLabel={TRANSACTION_INPUT_COPY.walletCloseLabel}
      >
        {options.length === 0 ? (
          <div className="mt-6 flex flex-col items-center px-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-sage text-forest">
              <Wallet className="size-5" strokeWidth={1.8} aria-hidden />
            </span>
            <p className="mt-3 text-[13px] font-medium text-forest">
              {TRANSACTION_INPUT_COPY.walletEmptyTitle}
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-forest/50">
              {TRANSACTION_INPUT_COPY.walletEmptyBody}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {options.map((option) => {
              const active = option.label === value
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => choose(option.label)}
                    aria-label={option.label}
                    aria-pressed={active}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl bg-cream px-3.5 py-3 text-left ring-1 ring-soil/10 transition-colors hover:bg-sage/40',
                      active && 'ring-2 ring-forest',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-forest">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-forest/45">
                        {TRANSACTION_INPUT_COPY.walletBalance(maskMoney(option.balance, masked))}
                      </span>
                    </span>
                    {active && (
                      <Check className="size-4 shrink-0 text-forest" strokeWidth={2.6} aria-hidden />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </PickerSheet>
    </>
  )
}