'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarDays, Check, ChevronDown, Wallet as WalletIcon } from 'lucide-react'
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
  TODAY_ISO,
  WALLET_SOURCES,
  formatDeadline,
  formatIDR,
  monthlyNeeded,
  type BudgetScope,
  type GoalPriority,
  type SinkingFundItem,
} from '@/lib/data/budget'

/* ── 4C. Tanam Celengan Baru — 3 langkah (PRD 2C.3) ──────────────────────────
   Step 1 wajib: nama + target. Step 2 auto-reveal setelah keduanya terisi:
   deadline + prioritas + auto-kalkulasi "nabung Rp X/bulan". Step 3 opsional
   (accordion tertutup): catatan, dompet tertaut, pengingat.

   Placeholder sengaja "menjual" (Biaya Operasi Mama / Rp 15.000.000) — contoh
   nyata bikin target terasa mungkin, bukan form kosong yang menakutkan.
   ────────────────────────────────────────────────────────────────────────── */

export function AddGoalSheet({
  open,
  onClose,
  scope,
  onSave,
}: {
  open: boolean
  onClose: () => void
  scope: BudgetScope
  onSave: (fund: Omit<SinkingFundItem, 'id' | 'current' | 'stage' | 'contributedThisMonth'>) => void
}) {
  const [name, setName] = useState('')
  const [digits, setDigits] = useState('')
  const [deadline, setDeadline] = useState('')
  const [priority, setPriority] = useState<GoalPriority>('sedang')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [note, setNote] = useState('')
  const [wallet, setWallet] = useState(WALLET_SOURCES[0].id)
  const [reminderOn, setReminderOn] = useState(false)
  const [reminder, setReminder] = useState<'weekly' | 'monthly'>('monthly')
  const targetRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)

  /* form selalu mulai bersih tiap kali dibuka */
  useEffect(() => {
    if (!open) return
    setName('')
    setDigits('')
    setDeadline('')
    setPriority('sedang')
    setAdvancedOpen(false)
    setNote('')
    setWallet(WALLET_SOURCES[0].id)
    setReminderOn(false)
    setReminder('monthly')
  }, [open])

  useFocusOnOpen(open, targetRef)

  const target = Number(digits || '0')
  const stepOneDone = name.trim().length > 0 && target > 0
  const ready = stepOneDone && deadline !== ''
  const perMonth = ready ? monthlyNeeded(target, 0, deadline) : 0

  function submit() {
    if (!ready) return
    onSave({ name: name.trim(), target, deadline, priority, scope })
  }

  /* ── buka pemilih tanggal native ─────────────────────────────────────────────
     Dulu field ini `<span>` dengan `<input type="date" opacity-0>` ditumpuk di
     atasnya. Di sebagian browser klik tidak membuka apa pun (input transparan
     bukan sasaran klik yang andal). Sekarang seluruh area adalah kontrol yang
     memanggil `showPicker()`; kalau API itu tidak ada, jatuh ke fokus + klik
     bawaan input-nya. */
  function openPicker() {
    const el = dateRef.current
    if (!el) return
    const withPicker = el as HTMLInputElement & { showPicker?: () => void }
    if (typeof withPicker.showPicker === 'function') {
      try {
        withPicker.showPicker()
        return
      } catch {
        /* jatuh ke fokus + klik bawaan */
      }
    }
    el.focus()
    el.click()
  }

  return (
    <BudgetSheet
      open={open}
      onClose={onClose}
      title="Tanam Celengan Baru"
      description="Kasih nama impiannya, lalu kita hitung bareng nabungnya."
      footer={<SheetSubmit onClick={submit} disabled={!ready} gate>Tanam Celengan 🌱</SheetSubmit>}
    >
      {/* ── STEP 1 — nama + target ─────────────────────────────────────── */}
      <label className="block">
        <span className="text-[13px] font-medium leading-snug text-forest">Mau nabung buat apa?</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Biaya Operasi Mama"
          className="mt-2 w-full rounded-2xl bg-cream px-4 py-3 text-[15px] font-medium text-forest outline-none ring-1 ring-soil/16 transition-shadow placeholder:font-medium placeholder:text-forest/25 focus:ring-2 focus:ring-forest/35"
        />
      </label>

      <RupiahField
        className="mt-4"
        label="Targetnya berapa?"
        digits={digits}
        onDigitsChange={setDigits}
        placeholder="Rp 15.000.000"
        inputRef={targetRef}
        hint={
          target > 0 && !deadline
            ? 'Isi tanggal target di bawah biar aku hitung nabung per bulannya 🌱'
            : 'Boleh dibulatkan, yang penting mulai dulu.'
        }
      />

      {/* ── STEP 2 — deadline + prioritas + auto-kalkulasi ─────────────── */}
      <RevealStep show={stepOneDone}>
        <div className="mt-5">
          <span className="text-[13px] font-medium leading-snug text-forest">
            Mau tercapai kapan?
          </span>
          {/* field tanggal: seluruh area dapat diklik → membuka pemilih native */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Pilih target tanggal"
            onClick={openPicker}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                openPicker()
              }
            }}
            className="relative mt-2 flex w-full cursor-pointer items-center gap-2 rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/16 transition-shadow hover:ring-soil/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/35"
          >
            <CalendarDays className="size-4 shrink-0 text-forest/35" strokeWidth={2.2} />
            <span
              className={cn(
                'flex-1 text-[14px] font-medium tabular-nums',
                deadline ? 'text-forest' : 'text-forest/25',
              )}
            >
              {deadline ? formatDeadline(deadline) : 'Pilih target tanggal'}
            </span>
            {deadline && <Check className="size-4 shrink-0 text-hud-sage" strokeWidth={3} />}
            <input
              ref={dateRef}
              type="date"
              value={deadline}
              min={TODAY_ISO}
              onChange={(event) => setDeadline(event.target.value)}
              aria-hidden
              tabIndex={-1}
              className="pointer-events-none absolute inset-0 size-full opacity-0"
            />
          </div>

          <div className="mt-4">
            <p className="text-[13px] font-medium text-forest">Seberapa penting?</p>
            <ChoicePills
              className="mt-2.5"
              options={[
                { id: 'rendah' as GoalPriority, label: 'Rendah' },
                { id: 'sedang' as GoalPriority, label: 'Sedang' },
                { id: 'tinggi' as GoalPriority, label: 'Tinggi' },
                { id: 'kritis' as GoalPriority, label: 'Kritis' },
              ]}
              value={priority}
              onChange={setPriority}
              ariaLabel="Prioritas celengan"
            />
          </div>

          {/* auto-kalkulasi real-time — inti Step 2 */}
          {perMonth > 0 && (
            <p className="mt-4 rounded-2xl bg-sage/60 px-4 py-3 text-[12.5px] leading-relaxed text-forest/70">
              Kamu perlu nabung{' '}
              <b className="font-semibold text-forest tabular-nums">{formatIDR(perMonth)}</b>/bulan biar
              tercapai tepat waktu 🌿
            </p>
          )}
        </div>
      </RevealStep>

      {/* ── STEP 3 — pengaturan lanjutan (accordion, tertutup default) ──── */}
      <RevealStep show={ready}>
        <div className="mt-5 pb-1">
          <button
            type="button"
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-2 rounded-2xl bg-cream/70 px-4 py-3 text-left ring-1 ring-soil/12 transition-colors hover:bg-cream"
          >
            <span className="text-[12.5px] font-medium text-forest/60">
              Pengaturan Lanjutan (Opsional)
            </span>
            <ChevronDown
              className={cn(
                'size-4 shrink-0 text-forest/35 transition-transform duration-300',
                advancedOpen && 'rotate-180',
              )}
              strokeWidth={2.4}
            />
          </button>

          <RevealStep show={advancedOpen}>
            <div className="mt-4 space-y-4">
                  {/* catatan */}
                  <label className="block">
                    <span className="text-[12.5px] font-medium text-forest/70">Catatan</span>
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      rows={3}
                      placeholder="Kenapa ini penting buat kamu?"
                      className="mt-2 w-full resize-none rounded-2xl bg-cream px-4 py-3 text-[13px] leading-relaxed text-forest outline-none ring-1 ring-soil/16 transition-shadow placeholder:text-forest/25 focus:ring-2 focus:ring-forest/35"
                    />
                  </label>

                  {/* dompet tertaut */}
                  <label className="block">
                    <span className="text-[12.5px] font-medium text-forest/70">
                      Dompet buat setor
                    </span>
                    <span className="relative mt-2 flex items-center gap-2 rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/16 focus-within:ring-2 focus-within:ring-forest/35">
                      <WalletIcon className="size-4 shrink-0 text-forest/35" strokeWidth={2.2} />
                      <select
                        value={wallet}
                        onChange={(event) => setWallet(event.target.value)}
                        className="flex-1 appearance-none bg-transparent text-[13.5px] font-medium text-forest outline-none"
                      >
                        {WALLET_SOURCES.map((source) => (
                          <option key={source.id} value={source.id}>
                            {source.name} · {source.kind}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="size-4 shrink-0 text-forest/30" strokeWidth={2.4} />
                    </span>
                  </label>

                  {/* pengingat nabung */}
                  <div className="rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/12">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[12.5px] font-medium text-forest/70">
                        Pengingat nabung
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={reminderOn}
                        aria-label="Pengingat nabung"
                        onClick={() => setReminderOn((prev) => !prev)}
                        className={cn(
                          'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
                          reminderOn ? 'bg-forest' : 'bg-ink/15',
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 size-5 rounded-full bg-cream shadow-sm transition-transform duration-200',
                            reminderOn ? 'translate-x-[22px]' : 'translate-x-0.5',
                          )}
                        />
                      </button>
                    </div>
                    {reminderOn && (
                      <ChoicePills
                        className="mt-3"
                        options={[
                          { id: 'weekly' as const, label: 'Mingguan' },
                          { id: 'monthly' as const, label: 'Bulanan' },
                        ]}
                        value={reminder}
                        onChange={setReminder}
                        ariaLabel="Frekuensi pengingat"
                      />
                    )}
                  </div>
            </div>
          </RevealStep>
        </div>
      </RevealStep>
    </BudgetSheet>
  )
}
