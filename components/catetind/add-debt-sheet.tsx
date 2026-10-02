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
  DEBT_SHEET_COPY,
  DEBT_SHEET_FIELD_COPY,
  PLATFORM_PROVIDERS,
  WEALTH_TODAY_ISO,
  type Debt,
  type DebtDirection,
  type DebtType,
} from '@/lib/data/wealth'
import { useTodayISO } from '@/lib/use-today-iso'

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
  onEdit,
  initial = null,
  defaultView = 'hutangku',
}: {
  open: boolean
  onClose: () => void
  onSave: (debt: NewDebtInput) => void
  /**
   * Mode EDIT (paket 61): dipanggil dengan id catatan yang sedang dibuka.
   *
   * Sebelum paket 61 `editDebt()` sudah ada & teruji di store tapi tidak punya
   * UI sama sekali, jadi user yang salah mengetik sisa hutangnya tidak punya
   * cara membetulkan. Satu komponen melayani dua mode (pola sheet Investasi)
   * supaya tidak ada dua form yang harus dijaga tetap sama.
   */
  onEdit?: (id: string, patch: NewDebtInput) => void
  /** catatan yang sedang dibetulkan; `null` = sheet dalam mode TAMBAH */
  initial?: Debt | null
  /** sheet ikut view Tab 3 yang sedang dibuka (Hutangku / Piutangku) */
  defaultView?: 'hutangku' | 'piutangku'
}) {
  const editing = initial !== null
  /** judul/deskripsi/tombol berganti antar mode — teksnya di `lib/data/wealth.ts` */
  const copy = DEBT_SHEET_COPY[editing ? 'edit' : 'add']
  const [direction, setDirection] = useState<DebtDirection>('owed_by_me')
  const [name, setName] = useState('')
  const [digits, setDigits] = useState('')
  /* sisa hanya dipakai di mode EDIT — di mode TAMBAH, catatan baru belum
     pernah dibayar sehingga sisanya selalu sama dengan pokoknya */
  const [remainingDigits, setRemainingDigits] = useState('')
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

  /**
   * Form selalu mulai dari keadaan yang benar-benar sedang dibicarakan:
   *   · mode TAMBAH → bersih, arah ikut view yang aktif;
   *   · mode EDIT → terisi data catatannya, karena user membuka sheet ini untuk
   *     MEMBETULKAN angka, bukan mengetik ulang dari nol.
   */
  useEffect(() => {
    if (!open) return
    if (initial) {
      const platform = initial.type === 'platform'
      const providerName = initial.provider ?? ''
      setIsPlatform(platform)
      setDirection(initial.direction ?? 'owed_by_me')
      setName(platform ? '' : (initial.counterparty ?? ''))
      /* provider di luar quick-pick dibuka sebagai 'Lainnya' supaya namanya
         tidak menggantung di kolom bebas yang tersembunyi */
      const quickPick = (PLATFORM_PROVIDERS as readonly string[]).includes(providerName)
      setProvider(platform ? (quickPick ? providerName : 'Lainnya') : '')
      setCustomProvider(platform && !quickPick ? providerName : '')
      setDigits(String(initial.principal))
      setRemainingDigits(String(initial.remaining))
      setDate('')
      setNote(initial.notes ?? '')
      setTenor(platform && initial.tenor ? String(initial.tenor) : '')
      setInstallmentDigits(
        platform && initial.monthlyInstallment ? String(initial.monthlyInstallment) : '',
      )
      /* desimal ditulis dengan koma seperti placeholder di form ini ("2,95") */
      setInterest(platform && initial.interestRate ? String(initial.interestRate).replace('.', ',') : '')
      setDueDate(platform && initial.dueDate ? String(initial.dueDate) : '')
      return
    }
    setDirection(defaultView === 'piutangku' ? 'owed_to_me' : 'owed_by_me')
    setName('')
    setDigits('')
    setRemainingDigits('')
    setDate('')
    setNote('')
    setIsPlatform(false)
    setProvider('')
    setCustomProvider('')
    setTenor('')
    setInstallmentDigits('')
    setInterest('')
    setDueDate('')
  }, [open, defaultView, initial])

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
  /**
   * Sisa: di mode TAMBAH selalu = pokok (catatan baru belum pernah dibayar).
   * Di mode EDIT nilainya boleh dibetulkan — catatan ini diisi MANUAL, jadi
   * user yang salah mengetik sisanya memang harus bisa memperbaikinya. Dibatasi
   * <= pokok supaya form ini tidak bisa menulis hutang yang sisanya lebih besar
   * dari pokoknya (kalau lebih besar dari itu, uangnya sudah berpindah dan
   * jalurnya "Catat Bayar" — supaya ada baris kasnya).
   */
  const remaining = editing ? Number(remainingDigits || '0') : principal
  const remainingInvalid = editing && remaining > principal
  const ready = (personalReady || platformReady) && !remainingInvalid

  function submit() {
    if (!ready) return
    const payload: NewDebtInput = isPlatform
      ? {
          type: 'platform',
          direction: 'owed_by_me',
          provider: resolvedProvider,
          principal,
          remaining,
          tenor: Number(tenor),
          /* progres tenor TIDAK direset oleh edit: itu jejak pelunasan yang
             sudah berjalan, dan pelunasan menaikkannya lewat "Catat Bayar" */
          currentMonth: initial?.currentMonth ?? 1,
          monthlyInstallment: Number(installmentDigits),
          interestRate: interest ? Number(interest) : undefined,
          dueDate: dueDateNumber,
          notes: note.trim() || undefined,
        }
      : {
          type: 'personal',
          direction,
          counterparty: name.trim(),
          principal,
          remaining,
          notes: note.trim() || undefined,
        }

    /* Satu jalur tulis per mode: EDIT lewat `onEdit` (→ `editDebt()` di store),
       TAMBAH lewat `onSave` (→ `addDebt()`). Kalau sheet dibuka sebagai edit
       tapi `onEdit` tidak dioper, TIDAK ada yang ditulis — lebih baik tidak
       terjadi apa-apa daripada diam-diam membuat catatan baru. */
    if (initial) {
      if (onEdit) onEdit(initial.id, payload)
      return
    }
    onSave(payload)
  }

  return (
    <BudgetSheet
      open={open}
      onClose={onClose}
      title={copy.title}
      description={copy.description}
      footer={<SheetSubmit onClick={submit} disabled={!ready} gate>{copy.submit}</SheetSubmit>}
    >
      {/* ── arah ─────────────────────────────────────────────────────────── */}
      {/* Arah hanya punya arti untuk catatan PERSONAL: pinjaman platform arahnya
          selalu "aku hutang" (payload-nya pun selalu `owed_by_me`). Sebelumnya
          pilihan ini tetap dipajang untuk platform lalu diabaikan diam-diam —
          input yang tidak berpengaruh lebih baik tidak ditawarkan. */}
      {!isPlatform && (
        <>
          <span className="text-[13px] font-semibold leading-snug text-ink">Arah</span>
          <ChoicePills
            className="mt-2"
            ariaLabel="Arah utang piutang"
            options={DIRECTION_OPTIONS}
            value={direction}
            onChange={setDirection}
          />
        </>
      )}

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

      {/* jumlah dipakai bersama: 'Jumlah' (personal) / 'Jumlah pokok' (platform).
          Di mode EDIT labelnya jadi "Jumlah pokok" untuk kedua bentuk, karena
          di bawahnya ada kolom SISA — dua angka berbeda tidak boleh punya nama
          yang bisa tertukar. */}
      <RupiahField
        className="mt-4"
        label={isPlatform || editing ? DEBT_SHEET_FIELD_COPY.principalLabel : 'Jumlah'}
        digits={digits}
        onDigitsChange={setDigits}
        placeholder="Rp 200.000"
      />

      {/* Sisa yang belum dibayar — HANYA mode edit (paket 61). Di mode tambah,
          catatan baru belum pernah dibayar sehingga sisanya = pokok. */}
      {editing && (
        <RupiahField
          className="mt-4"
          label={DEBT_SHEET_FIELD_COPY.remainingLabel}
          digits={remainingDigits}
          onDigitsChange={setRemainingDigits}
          placeholder="Rp 200.000"
          hint={
            remainingInvalid ? (
              <span className="font-semibold text-[#b89191]">
                {DEBT_SHEET_FIELD_COPY.overPrincipal}
              </span>
            ) : (
              DEBT_SHEET_FIELD_COPY.remainingHint
            )
          }
        />
      )}

      <RevealStep show={!isPlatform}>
        <div className="mt-4 space-y-4">
          {/* Tanggal hanya dipajang di mode TAMBAH. Di mode EDIT field ini tidak
              menyimpan apa pun (catatan hutang tidak punya kolom tanggal sama
              sekali — `Debt` cuma punya `dueDate` untuk jatuh tempo platform),
              dan field yang tidak menyimpan apa-apa lebih baik tidak dipajang
              daripada membuat user mengira tanggalnya ikut berubah. */}
          {!editing && (
            <DateField value={date} onChange={setDate} label="Tanggal (opsional)" allowFuture={false} />
          )}
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
  /* batas atas tanggal = HARI INI milik user (paket 57). Dulu `WEALTH_TODAY_ISO`
     yang dipatok 25 Sep: pada 28 Sep user masih bisa memilih tanggal yang sudah
     lewat 3 hari tanpa tersadar — dan sebaliknya, hari ini sendiri bisa TIDAK
     bisa dipilih kalau tanggalnya digeser. Nilainya diisi setelah mount, jadi
     HTML server & client tetap identik. */
  const todayValue = useTodayISO()
  const todayIso = todayValue || WEALTH_TODAY_ISO
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
          max={allowFuture ? undefined : todayIso}
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

