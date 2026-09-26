'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarDays, Check } from 'lucide-react'
import {
  BudgetSheet,
  ChoicePills,
  RevealStep,
  RupiahField,
  SheetSubmit,
  useFocusOnOpen,
} from './budget-sheet'
import { cn } from '@/lib/utils'
import {
  PLATFORM_PROVIDERS,
  WEALTH_TODAY_ISO,
  type DebtDirection,
  type DebtType,
} from '@/lib/data/wealth'

/* ── TAMBAH UTANG / PIUTANG — DUAL FORM (Section 7F, inventaris #v) ─────────
   Satu sheet, DUA bentuk:

   1. Default = Personal (simpel). PRD 2E.2 tegas: hutang teman/keluarga TANPA
      bunga, tenor, atau cicilan. Cukup arah, nama, jumlah, tanggal, catatan —
      supaya tidak terasa seperti menagih teman sendiri 😊
   2. Toggle "Ini pinjaman platform/berbunga" → form MENGEMBANG (RevealStep /
      Framer Motion) dan memunculkan field fintech: provider quick-pick 6 +
      freeform 'Lainnya…', tenor, cicilan per bulan, bunga, tanggal jatuh tempo.

   Shell form memakai kit bersama `budget-sheet.tsx` (Vaul mobile, dialog
   desktop, RupiahField ber-format otomatis) — ritmenya sama dengan sheet lain
   di app.
   ────────────────────────────────────────────────────────────────────────── */

export interface NewDebtInput {
  type: DebtType
  direction: DebtDirection
  counterparty?: string
  provider?: string
  principal: number
  remaining: number
  notes?: string
  /* — khusus platform — */
  tenor?: number
  currentMonth?: number
  monthlyInstallment?: number
  interestRate?: number
  dueDate?: number
}

const DIRECTION_OPTIONS: { id: DebtDirection; label: string }[] = [
  { id: 'owed_by_me', label: 'Aku hutang ke…' },
  { id: 'owed_to_me', label: '…hutang ke aku' },
]

export function AddDebtSheet({
  open,
  onClose,
  onSave,
  defaultView = 'hutangku',
}: {
  open: boolean
  onClose: () => void
  onSave: (debt: NewDebtInput) => void
  /** sheet ikut view Tab 3 yang sedang dibuka (Hutangku / Piutangku) */
  defaultView?: 'hutangku' | 'piutangku'
}) {
  const [direction, setDirection] = useState<DebtDirection>('owed_by_me')
  const [name, setName] = useState('')
  const [digits, setDigits] = useState('')
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [isPlatform, setIsPlatform] = useState(false)
  const [provider, setProvider] = useState<string>('')
  const [customProvider, setCustomProvider] = useState('')
  const [tenor, setTenor] = useState('')
  const [installmentDigits, setInstallmentDigits] = useState('')
  const [interest, setInterest] = useState('')
  const [dueDate, setDueDate] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  /* form selalu mulai bersih tiap sheet dibuka; arah ikut view yang aktif */
  useEffect(() => {
    if (!open) return
    setDirection(defaultView === 'piutangku' ? 'owed_to_me' : 'owed_by_me')
    setName('')
    setDigits('')
    setDate('')
    setNote('')
    setIsPlatform(false)
    setProvider('')
    setCustomProvider('')
    setTenor('')
    setInstallmentDigits('')
    setInterest('')
    setDueDate('')
  }, [open, defaultView])

  useFocusOnOpen(open, nameRef)

  const principal = Number(digits || '0')
  const dueDateNumber = Number(dueDate)
  const dueDateInvalid = dueDate !== '' && (dueDateNumber < 1 || dueDateNumber > 31)
  const resolvedProvider = provider === 'Lainnya' ? customProvider.trim() : provider

  const personalReady = !isPlatform && name.trim().length > 0 && principal > 0
  const platformReady =
    isPlatform &&
    resolvedProvider.length > 0 &&
    principal > 0 &&
    Number(tenor) > 0 &&
    Number(installmentDigits) > 0 &&
    dueDate !== '' &&
    !dueDateInvalid
  const ready = personalReady || platformReady

  function submit() {
    if (!ready) return
    if (isPlatform) {
      onSave({
        type: 'platform',
        direction: 'owed_by_me',
        provider: resolvedProvider,
        principal,
        remaining: principal,
        tenor: Number(tenor),
        currentMonth: 1,
        monthlyInstallment: Number(installmentDigits),
        interestRate: interest ? Number(interest) : undefined,
        dueDate: dueDateNumber,
        notes: note.trim() || undefined,
      })
      return
    }
    onSave({
      type: 'personal',
      direction,
      counterparty: name.trim(),
      principal,
      remaining: principal,
      notes: note.trim() || undefined,
    })
  }

  return (
    <BudgetSheet
      open={open}
      onClose={onClose}
      title="Tambah Utang / Piutang"
      description="Catat aja dulu — nanti bisa ditandai lunas kapan pun."
      footer={<SheetSubmit onClick={submit} disabled={!ready} gate>Simpan ✓</SheetSubmit>}
    >
      {/* ── arah ─────────────────────────────────────────────────────────── */}
      <span className="text-[13px] font-semibold leading-snug text-ink">Arah</span>
      <ChoicePills
        className="mt-2"
        ariaLabel="Arah utang piutang"
        options={DIRECTION_OPTIONS}
        value={direction}
        onChange={setDirection}
      />

      {/* ── bentuk PERSONAL (default) ───────────────────────────────────── */}
      <RevealStep show={!isPlatform}>
        <label className="mt-4 block">
          <span className="text-[13px] font-semibold leading-snug text-ink">Nama</span>
          <input
            ref={nameRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nama teman/keluarga"
            className="mt-2 w-full rounded-2xl bg-cream px-4 py-3 text-[15px] font-semibold text-ink outline-none ring-1 ring-soil/16 transition-shadow placeholder:font-medium placeholder:text-ink/25 focus:ring-2 focus:ring-forest/35"
          />
        </label>
      </RevealStep>

      {/* jumlah dipakai bersama: 'Jumlah' (personal) / 'Jumlah pokok' (platform) */}
      <RupiahField
        className="mt-4"
        label={isPlatform ? 'Jumlah pokok (Rp)' : 'Jumlah'}
        digits={digits}
        onDigitsChange={setDigits}
        placeholder="Rp 200.000"
      />

      <RevealStep show={!isPlatform}>
        <div className="mt-4 space-y-4">
          <DateField value={date} onChange={setDate} label="Tanggal (opsional)" allowFuture={false} />
          <label className="block">
            <span className="text-[12.5px] font-semibold text-ink/70">Catatan (opsional)</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder="Misal: makan siang kemarin"
              className="mt-2 w-full resize-none rounded-2xl bg-cream px-4 py-3 text-[13px] leading-relaxed text-ink outline-none ring-1 ring-soil/16 transition-shadow placeholder:text-ink/25 focus:ring-2 focus:ring-forest/35"
            />
          </label>
        </div>
      </RevealStep>

      {/* ── toggle pembuka bentuk PLATFORM ──────────────────────────────── */}
      <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-cream/70 px-4 py-3.5 ring-1 ring-soil/12">
        <span className="pr-2 text-[13px] font-semibold leading-snug text-ink">
          Ini pinjaman platform/berbunga
          <span className="mt-0.5 block text-[11px] font-medium text-ink/45">
            Kredivo, SPayLater, KTA — pakai tenor & cicilan
          </span>
        </span>
        <Switch checked={isPlatform} onChange={setIsPlatform} label="Pinjaman platform" />
      </div>


      {/* ── bentuk PLATFORM — mengembang halus saat toggle dinyalakan ────── */}
      <RevealStep show={isPlatform}>
        <div className="mt-4 space-y-4">
          <div>
            <span className="text-[13px] font-semibold leading-snug text-ink">Provider</span>
            {/* quick-pick 6 provider — deret pill bisa digulir horizontal */}
            <div className="hide-scrollbar -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 py-0.5">
              {[...PLATFORM_PROVIDERS, 'Lainnya'].map((option) => {
                const active = provider === option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setProvider(option)}
                    aria-pressed={active}
                    className={cn(
                      'shrink-0 rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition-all duration-200 active:scale-95',
                      active
                        ? 'bg-forest text-mint shadow-[0_10px_22px_-14px_rgba(69,89,78,0.75)]'
                        : 'bg-cream text-ink/60 ring-1 ring-soil/14 hover:bg-cream hover:text-ink',
                    )}
                  >
                    {option}
                  </button>
                )
              })}
            </div>

            {/* freeform — muncul begitu 'Lainnya' dipilih */}
            <RevealStep show={provider === 'Lainnya'}>
              <input
                value={customProvider}
                onChange={(event) => setCustomProvider(event.target.value)}
                placeholder="Tulis nama provider…"
                aria-label="Nama provider lainnya"
                className="mt-2 w-full rounded-2xl bg-cream px-4 py-3 text-[14px] font-semibold text-ink outline-none ring-1 ring-soil/16 transition-shadow placeholder:font-medium placeholder:text-ink/25 focus:ring-2 focus:ring-forest/35"
              />
            </RevealStep>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[12.5px] font-semibold text-ink/70">Tenor (bulan)</span>
              <input
                value={tenor}
                onChange={(event) => setTenor(event.target.value.replace(/\D/g, '').slice(0, 3))}
                inputMode="numeric"
                placeholder="6"
                aria-label="Tenor dalam bulan"
                className="mt-2 w-full rounded-2xl bg-cream px-4 py-3 text-[15px] font-semibold tabular-nums text-ink outline-none ring-1 ring-soil/16 transition-shadow placeholder:font-medium placeholder:text-ink/25 focus:ring-2 focus:ring-forest/35"
              />
            </label>
            <label className="block">
              <span className="text-[12.5px] font-semibold text-ink/70">Jatuh tempo (1–31)</span>
              <input
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value.replace(/\D/g, '').slice(0, 2))}
                inputMode="numeric"
                placeholder="10"
                aria-label="Tanggal jatuh tempo"
                className={cn(
                  'mt-2 w-full rounded-2xl bg-cream px-4 py-3 text-[15px] font-semibold tabular-nums text-ink outline-none ring-1 transition-shadow placeholder:font-medium placeholder:text-ink/25 focus:ring-2',
                  dueDateInvalid
                    ? 'ring-hud-terracotta/50 focus:ring-hud-terracotta/60'
                    : 'ring-soil/16 focus:ring-forest/35',
                )}
              />
            </label>
          </div>

          <RupiahField
            label="Cicilan per bulan"
            digits={installmentDigits}
            onDigitsChange={setInstallmentDigits}
            placeholder="Rp 550.000"
          />

          <label className="block">
            <span className="text-[12.5px] font-semibold text-ink/70">Bunga (% — opsional)</span>
            <input
              value={interest}
              onChange={(event) => setInterest(sanitizeDecimal(event.target.value, 2))}
              inputMode="decimal"
              placeholder="2,95"
              aria-label="Bunga per bulan"
              className="mt-2 w-full rounded-2xl bg-cream px-4 py-3 text-[15px] font-semibold tabular-nums text-ink outline-none ring-1 ring-soil/16 transition-shadow placeholder:font-medium placeholder:text-ink/25 focus:ring-2 focus:ring-forest/35"
            />
          </label>

          <label className="block">
            <span className="text-[12.5px] font-semibold text-ink/70">Catatan (opsional)</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder="Misal: buat beli HP baru"
              className="mt-2 w-full resize-none rounded-2xl bg-cream px-4 py-3 text-[13px] leading-relaxed text-ink outline-none ring-1 ring-soil/16 transition-shadow placeholder:text-ink/25 focus:ring-2 focus:ring-forest/35"
            />
          </label>
        </div>
      </RevealStep>
    </BudgetSheet>
  )
}


/* ── atom lokal sheet ini ─────────────────────────────────────────────────── */

/** angka + satu pemisah desimal, dibatasi `maxDecimals` digit di belakang */
function sanitizeDecimal(raw: string, maxDecimals = 2): string {
  const cleaned = raw.replace(/[^\d.,]/g, '').replace(/,/g, '.')
  const [whole, ...rest] = cleaned.split('.')
  const decimals = rest.join('').slice(0, maxDecimals)
  return rest.length > 0 ? `${whole}.${decimals}` : whole
}

/** `25 Sep 2026` — tanggal ringkas untuk field sheet */
function formatSheetDate(iso: string): string {
  if (!iso) return ''
  const [year, month, day] = iso.split('-').map(Number)
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ]
  return `${day} ${months[(month ?? 1) - 1]} ${year}`
}

/** field tanggal: label custom + input date native transparan di atasnya */
function DateField({
  value,
  onChange,
  label,
  allowFuture = true,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  allowFuture?: boolean
}) {
  return (
    <div>
      <span className="text-[13px] font-semibold leading-snug text-ink">{label}</span>
      <span className="relative mt-2 flex items-center gap-2 rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/16 focus-within:ring-2 focus-within:ring-forest/35">
        <CalendarDays className="size-4 shrink-0 text-ink/35" strokeWidth={2.2} />
        <span
          className={cn(
            'flex-1 text-[14px] font-semibold tabular-nums',
            value ? 'text-ink' : 'font-medium text-ink/25',
          )}
        >
          {value ? formatSheetDate(value) : 'Pilih tanggal'}
        </span>
        {value && <Check className="size-4 shrink-0 text-hud-sage" strokeWidth={3} />}
        <input
          type="date"
          value={value}
          max={allowFuture ? undefined : WEALTH_TODAY_ISO}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          className="absolute inset-0 size-full cursor-pointer rounded-2xl opacity-0"
        />
      </span>
    </div>
  )
}

/** Switch kecil on/off — pola sama dengan sheet Budget & Tagihan */
function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
        checked ? 'bg-forest' : 'bg-ink/15',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-5 rounded-full bg-cream shadow-sm transition-transform duration-200',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

