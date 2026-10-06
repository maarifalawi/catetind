'use client'

import { useEffect, useRef, useState } from 'react'
import { BudgetSheet, RupiahField, SheetSubmit, useFocusOnOpen } from './budget-sheet'
import { cn } from '@/lib/utils'
import { WALLET_SOURCES, fundPercent, maskNominal, type SinkingFundItem } from '@/lib/data/budget'

/* ── 4B. Setor ke Celengan — sheet kecil, satu ketukan selesai ───────────────
   Isinya sengaja cuma tiga hal: nominal, dari dompet mana, lalu setor. Nominal
   cepat (chip) dipakai supaya mayoritas user tidak perlu mengetik sama sekali.

   Pemilih dompet dibuat tile berwarna khas brand (BCA biru, GoPay teal, Tunai
   amber) — bukan dropdown abu-abu — supaya terasa hidup & menyenangkan, sejalan
   dengan kartu dompet di halaman Dompet & Akun.
   ────────────────────────────────────────────────────────────────────────── */

const QUICK_AMOUNTS = [50_000, 100_000, 250_000, 500_000]

export function ContributeSheet({
  fund,
  open,
  onClose,
  onContribute,
  masked,
}: {
  /** celengan yang sedang disetor — null sebelum pernah dibuka */
  fund: SinkingFundItem | null
  open: boolean
  onClose: () => void
  onContribute: (fundId: number, amount: number, walletId: string) => void
  masked: boolean
}) {
  const [digits, setDigits] = useState('')
  const [walletId, setWalletId] = useState(WALLET_SOURCES[0].id)
  const amountRef = useRef<HTMLInputElement>(null)

  /* snapshot celengan: Vaul masih beranimasi tutup setelah parent mengosongkan
     `fund` — tanpa snapshot judul & progres akan berkedip kosong */
  const [shown, setShown] = useState<SinkingFundItem | null>(fund)
  useEffect(() => {
    if (fund) setShown(fund)
  }, [fund])

  useEffect(() => {
    if (!open) return
    setDigits('')
    setWalletId(WALLET_SOURCES[0].id)
  }, [open])

  useFocusOnOpen(open, amountRef)

  const amount = Number(digits || '0')
  const percent = shown ? fundPercent(shown) : 0
  /** proyeksi progres setelah setoran — bikin setoran terasa berdampak */
  const afterPercent =
    shown && shown.target > 0
      ? Math.min(100, Math.round(((shown.current + amount) / shown.target) * 100))
      : 0
  const ready = shown !== null && amount > 0

  function submit() {
    if (!shown || amount <= 0) return
    onContribute(shown.id, amount, walletId)
  }

  return (
    <BudgetSheet
      open={open}
      onClose={onClose}
      title={`Setor ke ${shown?.name ?? 'Celengan'}`}
      description="Nabung kecil-kecilan hari ini, tetap dihitung 🌱"
      footer={<SheetSubmit onClick={submit} disabled={!ready} gate>Setor 💰</SheetSubmit>}
    >
      {/* progres sekarang → proyeksi setelah setor */}
      <div className="rounded-2xl bg-cream p-3.5 ring-1 ring-soil/12">
        <div className="flex items-center justify-between gap-3 text-[11.5px] font-medium text-forest/50">
          <span className="tabular-nums">
            {maskNominal(shown?.current ?? 0, masked)} dari{' '}
            {maskNominal(shown?.target ?? 0, masked)}
          </span>
          <span className="tabular-nums">{Math.round(percent)}%</span>
        </div>
        <div className="relative mt-2 h-2.5 w-full overflow-hidden rounded-full bg-cream ring-1 ring-soil/8">
          <div className="h-full rounded-full bg-hud-sage/70" style={{ width: `${percent}%` }} />
          {/* bayangan progres tambahan dari setoran yang sedang diketik */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-hud-sage transition-[width] duration-300"
            style={{ width: `${afterPercent}%`, opacity: amount > 0 ? 1 : 0 }}
          />
        </div>
        {amount > 0 && (
          <p className="mt-2 text-[11.5px] font-medium text-forest">
            Setelah setor ini: {afterPercent}% tercapai 🌿
          </p>
        )}
      </div>

      <RupiahField
        className="mt-5"
        label="Mau setor berapa?"
        digits={digits}
        onDigitsChange={setDigits}
        placeholder="Rp 100.000"
        inputRef={amountRef}
      />

      {/* nominal cepat — mayoritas setoran tidak perlu mengetik */}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {QUICK_AMOUNTS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setDigits(String(value))}
            className={cn(
              'rounded-full px-3 py-1.5 text-[11.5px] font-medium tabular-nums transition-all active:scale-95',
              Number(digits) === value
                ? 'bg-forest text-mint'
                : 'bg-cream text-forest/55 ring-1 ring-soil/14 hover:bg-cream hover:text-forest',
            )}
          >
            {maskNominal(value, masked)}
          </button>
        ))}
      </div>

      {/* ── dari dompet mana — tile berwarna brand, bukan dropdown abu-abu ── */}
      <div className="mt-5 pb-1">
        <p className="text-[13px] font-medium text-forest">Setor dari dompet</p>
        <div
          role="radiogroup"
          aria-label="Pilih dompet sumber"
          className="mt-2.5 grid grid-cols-3 gap-2"
        >
          {WALLET_SOURCES.map((source) => {
            const active = walletId === source.id
            return (
              <button
                key={source.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setWalletId(source.id)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 transition-all duration-200 active:scale-95',
                  active
                    ? 'bg-cream ring-2 ring-forest shadow-[0_12px_26px_-18px_rgba(69,89,78,0.65)]'
                    : 'bg-cream/60 ring-1 ring-soil/12 hover:bg-cream',
                )}
              >
                <span
                  className={cn(
                    'flex size-8 items-center justify-center rounded-xl text-[12px] font-medium ring-1 ring-inset',
                    source.tile,
                  )}
                >
                  {source.name.charAt(0)}
                </span>
                <span className="text-[11.5px] font-medium leading-tight text-forest">
                  {source.name}
                </span>
                <span className="flex items-center gap-1 text-[9.5px] font-medium text-forest/40">
                  <span aria-hidden className={cn('size-1.5 rounded-full', source.dot)} />
                  {source.kind}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </BudgetSheet>
  )
}
