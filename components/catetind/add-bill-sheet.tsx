'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Check, ChevronDown } from 'lucide-react'
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
  BILL_CATEGORY_OPTIONS,
  BILL_EMOJI_MORE,
  BILL_EMOJI_PRESETS,
  BILL_REMINDER_OPTIONS,
  BILL_SHEET_COPY,
  BILL_WALLET_OPTIONS,
  billCategoryOptions,
  billWalletOptions,
  type Bill,
} from '@/lib/data/bills'

/* ── 9. Tambah / Edit Tagihan — bottom sheet dengan progressive disclosure ────
   Step 1 identitas (emoji + nama + nominal opsional) → Step 2 jadwal
   (auto-reveal begitu nama terisi) → Step 3 detail tambahan (accordion,
   tertutup default). Tombol simpan baru hidup kalau data wajibnya lengkap,
   jadi tidak ada pesan error yang menghakimi di tengah jalan.

   SATU komponen, DUA mode (paket 03): mode tambah (`initial` kosong) dan mode
   edit (`initial` = tagihan yang sedang diubah). Yang berganti cuma judul, CTA,
   dan isi awal formnya — bukan komponen baru yang menyalin 90% logika di sini.
   Mode edit otomatis membuka accordion "Detail Tambahan" karena isinya memang
   sudah berisi (kalau dibiarkan tertutup, user diberi kesan datanya kosong).

   Shell & atom form-nya memakai kit bersama `budget-sheet.tsx` (Vaul di mobile,
   dialog di desktop) supaya tempo buka/tutup sheet-nya sama dengan halaman
   lain di app — bukan modal baru dengan ritme sendiri.
   ────────────────────────────────────────────────────────────────────────── */

export type NewBill = Omit<Bill, 'id' | 'isPaidThisMonth'>

export function AddBillSheet({
  open,
  onClose,
  onSave,
  initial = null,
}: {
  open: boolean
  onClose: () => void
  onSave: (bill: NewBill) => void
  /**
   * Tagihan yang sedang diubah. Diisi = MODE EDIT: tipe transaksinya cuma
   * "mengubah yang salah", jadi seluruh field dibuka sudah terisi data tagihan
   * itu. `null` (default) = mode tambah, persis seperti sebelumnya.
   */
  initial?: Bill | null
}) {
  /** mode yang sedang TAMPIL — di-latch saat sheet dibuka supaya judulnya tidak
   *  berkedip berubah ketika halaman mengosongkan `initial` (sheet menutup) */
  const [mode, setMode] = useState<'add' | 'edit'>('add')
  const copy = BILL_SHEET_COPY[mode]

  const [emoji, setEmoji] = useState<string>(BILL_EMOJI_PRESETS[0])
  const [moreEmojiOpen, setMoreEmojiOpen] = useState(false)
  const [name, setName] = useState('')
  const [digits, setDigits] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [recurring, setRecurring] = useState(true)
  const [endMode, setEndMode] = useState<'unlimited' | 'limited'>('unlimited')
  const [endMonths, setEndMonths] = useState('')
  const [reminderDays, setReminderDays] = useState(1)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [category, setCategory] = useState<string>(BILL_CATEGORY_OPTIONS[0])
  const [walletId, setWalletId] = useState(BILL_WALLET_OPTIONS[0].id)
  const [note, setNote] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  const categories = billCategoryOptions(initial?.category)
  const wallets = billWalletOptions(initial?.walletId)

  /* Form dibuka dengan nilai yang tepat: mode tambah = bersih; mode edit =
     terisi data tagihannya. Latch-nya ada DI SINI (bukan membaca `initial`
     langsung saat render) supaya animasi tutup tetap menampilkan form versi
     terakhir yang dilihat user, bukan versi yang sudah di-reset. */
  useEffect(() => {
    if (!open) return
    setMode(initial ? 'edit' : 'add')
    if (initial) {
      setEmoji(initial.emoji)
      /* kalau ikonnya dari grid "Lainnya", buka grid-nya supaya ikon terpilih
         benar-benar terlihat — bukan seolah tidak ada yang dipilih */
      setMoreEmojiOpen(!(BILL_EMOJI_PRESETS as readonly string[]).includes(initial.emoji))
      setName(initial.name)
      setDigits(initial.amount > 0 ? String(initial.amount) : '')
      setDueDate(String(initial.dueDate))
      setRecurring(initial.isRecurring)
      setEndMode(initial.endAfterMonths ? 'limited' : 'unlimited')
      setEndMonths(initial.endAfterMonths ? String(initial.endAfterMonths) : '')
      setReminderDays(initial.reminderDaysBefore)
      /* detail tambahan sudah berisi (kategori/dompet/catatan) → tampilkan */
      setAdvancedOpen(true)
      setCategory(initial.category)
      setWalletId(initial.walletId)
      setNote(initial.note ?? '')
      return
    }
    setEmoji(BILL_EMOJI_PRESETS[0])
    setMoreEmojiOpen(false)
    setName('')
    setDigits('')
    setDueDate('')
    setRecurring(true)
    setEndMode('unlimited')
    setEndMonths('')
    setReminderDays(1)
    setAdvancedOpen(false)
    setCategory(BILL_CATEGORY_OPTIONS[0])
    setWalletId(BILL_WALLET_OPTIONS[0].id)
    setNote('')
  }, [open, initial])

  /* auto-focus nama hanya di mode TAMBAH. Di mode edit formnya sudah terisi,
     jadi mengangkat keyboard sendiri justru menutupi field di bawahnya dan
     memaksa user menutupnya dulu — padahal yang salah mungkin tanggalnya. */
  useFocusOnOpen(open && initial === null, nameRef)

  const amount = Number(digits || '0')
  const dueDateNumber = Number(dueDate)
  /** validasi real-time: hanya tanggal 1–31 yang diterima */
  const dueDateInvalid = dueDate !== '' && (dueDateNumber < 1 || dueDateNumber > 31)
  const endMonthsNumber = Number(endMonths)
  const limitedInvalid = endMode === 'limited' && (endMonths === '' || endMonthsNumber < 1)
  const stepOneDone = name.trim().length > 0
  const stepTwoDone = dueDate !== '' && !dueDateInvalid && !limitedInvalid
  const ready = stepOneDone && stepTwoDone

  function submit() {
    if (!ready) return
    onSave({
      emoji,
      name: name.trim(),
      amount,
      dueDate: dueDateNumber,
      isRecurring: recurring,
      category,
      walletId,
      reminderDaysBefore: recurring ? reminderDays : 0,
      endAfterMonths: recurring && endMode === 'limited' ? endMonthsNumber : undefined,
      /* Cicilan yang sudah berjalan TIDAK boleh balik ke bulan ke-1 cuma karena
         tagihannya diedit — progres tenornya milik user, bukan milik form. */
      currentMonth:
        recurring && endMode === 'limited' ? (initial?.currentMonth ?? 1) : undefined,
      note: note.trim() || undefined,
    })
  }

  return (
    <BudgetSheet
      open={open}
      onClose={onClose}
      title={copy.title}
      description={copy.description}
      footer={
        <SheetSubmit onClick={submit} disabled={!ready} gate>
          {copy.submit}
        </SheetSubmit>
      }
    >
      {/* ── STEP 1 — identitas: emoji + nama + nominal (opsional) ────────── */}
      <div>
        <p className="text-[13px] font-semibold leading-snug text-ink">Pilih ikonnya</p>
        <div
          role="radiogroup"
          aria-label="Pilih emoji tagihan"
          className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-12"
        >
          {BILL_EMOJI_PRESETS.map((option) => {
            const active = emoji === option
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`Emoji ${option}`}
                onClick={() => setEmoji(option)}
                className={cn(
                  'flex h-10 items-center justify-center rounded-xl text-[19px] transition-all duration-200 active:scale-90',
                  active
                    ? 'bg-forest ring-2 ring-forest'
                    : 'bg-cream ring-1 ring-soil/14 hover:bg-cream',
                )}
              >
                <span aria-hidden>{option}</span>
              </button>
            )
          })}
        </div>

        {/* 'Lainnya' → grid emoji tambahan (tanpa dependensi emoji-picker) */}
        <button
          type="button"
          aria-expanded={moreEmojiOpen}
          onClick={() => setMoreEmojiOpen((prev) => !prev)}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5 text-[11.5px] font-semibold text-ink/60 ring-1 ring-soil/14 transition-colors hover:bg-cream hover:text-ink"
        >
          Lainnya
          <ChevronDown
            className={cn(
              'size-3.5 transition-transform duration-300',
              moreEmojiOpen && 'rotate-180',
            )}
            strokeWidth={2.6}
          />
        </button>

        <RevealStep show={moreEmojiOpen}>
          <div
            role="radiogroup"
            aria-label="Emoji tagihan lainnya"
            className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-12"
          >
            {BILL_EMOJI_MORE.map((option) => {
              const active = emoji === option
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`Emoji ${option}`}
                  onClick={() => setEmoji(option)}
                  className={cn(
                    'flex h-10 items-center justify-center rounded-xl text-[19px] transition-all duration-200 active:scale-90',
                    active
                      ? 'bg-forest ring-2 ring-forest'
                      : 'bg-cream ring-1 ring-soil/14 hover:bg-cream',
                  )}
                >
                  <span aria-hidden>{option}</span>
                </button>
              )
            })}
          </div>
        </RevealStep>

        <label className="mt-4 block">
          <span className="text-[13px] font-semibold leading-snug text-ink">
            Tagihannya apa?
          </span>
          <input
            ref={nameRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Contoh: Kos Bulanan, Netflix"
            className="mt-2 w-full rounded-2xl bg-cream px-4 py-3 text-[15px] font-semibold text-ink outline-none ring-1 ring-soil/16 transition-shadow placeholder:font-medium placeholder:text-ink/25 focus:ring-2 focus:ring-forest/35"
          />
        </label>

        <RupiahField
          className="mt-4"
          label="Nominal per bulan"
          digits={digits}
          onDigitsChange={setDigits}
          placeholder="Rp 1.500.000"
          hint="(Opsional — kosongkan kalau nominalnya berubah-ubah)"
        />
      </div>

      {/* ── STEP 2 — jadwal (auto-reveal begitu nama terisi) ──────────────── */}
      <RevealStep show={stepOneDone}>
        <div className="mt-5">
          <label className="block">
            <span className="text-[13px] font-semibold leading-snug text-ink">
              Jatuh Tempo Setiap Tanggal
            </span>
            <span className="relative mt-2 flex items-center gap-2 rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/16 transition-shadow focus-within:ring-2 focus-within:ring-forest/35">
              <input
                type="number"
                min={1}
                max={31}
                inputMode="numeric"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                placeholder="25"
                aria-invalid={dueDateInvalid}
                aria-label="Tanggal jatuh tempo"
                className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold tabular-nums text-ink outline-none placeholder:font-medium placeholder:text-ink/25"
              />
              <span className="shrink-0 text-[12px] font-medium text-ink/35">/ bulan</span>
              {dueDate !== '' && !dueDateInvalid && (
                <Check className="size-4 shrink-0 text-hud-sage" strokeWidth={3} />
              )}
            </span>
            {dueDateInvalid && (
              <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-hud-terracotta">
                <AlertCircle className="size-3.5" strokeWidth={2.4} />
                Tanggal harus 1-31
              </span>
            )}
          </label>

          {/* berulang setiap bulan + batas tenor */}
          <div className="mt-4 rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/12">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12.5px] font-semibold text-ink/70">
                Berulang setiap bulan
              </span>
              <Switch
                checked={recurring}
                onChange={setRecurring}
                label="Berulang setiap bulan"
              />
            </div>

            <RevealStep show={recurring}>
              <div className="mt-3">
                <p className="text-[12.5px] font-semibold text-ink/70">
                  Tagihan berakhir setelah
                </p>
                <ChoicePills
                  className="mt-2.5"
                  options={[
                    { id: 'unlimited' as const, label: 'Tanpa batas' },
                    { id: 'limited' as const, label: 'Terbatas' },
                  ]}
                  value={endMode}
                  onChange={setEndMode}
                  ariaLabel="Batas tagihan berulang"
                />

                {endMode === 'limited' && (
                  <label className="mt-3 flex items-center gap-2 rounded-2xl bg-cream px-3.5 py-2.5">
                    <input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={endMonths}
                      onChange={(event) => setEndMonths(event.target.value)}
                      placeholder="12"
                      aria-label="Berapa bulan"
                      className="w-16 bg-transparent text-[14px] font-bold tabular-nums text-ink outline-none placeholder:font-medium placeholder:text-ink/25"
                    />
                    <span className="text-[12.5px] font-semibold text-ink/60">
                      berapa bulan?
                    </span>
                  </label>
                )}

                {limitedInvalid && (
                  <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-hud-terracotta">
                    <AlertCircle className="size-3.5" strokeWidth={2.4} />
                    Isi jumlah bulannya (minimal 1)
                  </span>
                )}
              </div>
            </RevealStep>
          </div>

          {/* pengingat sebelum jatuh tempo */}
          <label className="mt-4 block">
            <span className="text-[12.5px] font-semibold text-ink/70">
              Ingatkan sebelum jatuh tempo
            </span>
            <span className="relative mt-2 flex items-center gap-2 rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/16 focus-within:ring-2 focus-within:ring-forest/35">
              <select
                value={reminderDays}
                onChange={(event) => setReminderDays(Number(event.target.value))}
                aria-label="Ingatkan sebelum jatuh tempo"
                className="flex-1 appearance-none bg-transparent text-[13.5px] font-semibold text-ink outline-none"
              >
                {BILL_REMINDER_OPTIONS.map((option) => (
                  <option key={option.days} value={option.days}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="size-4 shrink-0 text-ink/30" strokeWidth={2.4} />
            </span>
          </label>
        </div>
      </RevealStep>

      {/* ── STEP 3 — detail tambahan (accordion, tertutup default) ────────── */}
      <RevealStep show={stepTwoDone}>
        <div className="mt-5 pb-1">
          <button
            type="button"
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-2 rounded-2xl bg-cream/70 px-4 py-3 text-left ring-1 ring-soil/12 transition-colors hover:bg-cream"
          >
            <span className="text-[12.5px] font-semibold text-ink/60">
              Detail Tambahan (Opsional)
            </span>
            <ChevronDown
              className={cn(
                'size-4 shrink-0 text-ink/35 transition-transform duration-300',
                advancedOpen && 'rotate-180',
              )}
              strokeWidth={2.4}
            />
          </button>

          <RevealStep show={advancedOpen}>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-[12.5px] font-semibold text-ink/70">Kategori</span>
                <span className="relative mt-2 flex items-center gap-2 rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/16 focus-within:ring-2 focus-within:ring-forest/35">
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    aria-label="Kategori tagihan"
                    className="flex-1 appearance-none bg-transparent text-[13.5px] font-semibold text-ink outline-none"
                  >
                    {categories.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="size-4 shrink-0 text-ink/30" strokeWidth={2.4} />
                </span>
              </label>

              <label className="block">
                <span className="text-[12.5px] font-semibold text-ink/70">
                  Dompet pembayaran
                </span>
                <span className="relative mt-2 flex items-center gap-2 rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/16 focus-within:ring-2 focus-within:ring-forest/35">
                  <select
                    value={walletId}
                    onChange={(event) => setWalletId(event.target.value)}
                    aria-label="Dompet pembayaran"
                    className="flex-1 appearance-none bg-transparent text-[13.5px] font-semibold text-ink outline-none"
                  >
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name} · {wallet.kind}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="size-4 shrink-0 text-ink/30" strokeWidth={2.4} />
                </span>
              </label>

              <label className="block">
                <span className="text-[12.5px] font-semibold text-ink/70">Catatan</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  placeholder="Nomor pelanggan, kode langganan, dll."
                  className="mt-2 w-full resize-none rounded-2xl bg-cream px-4 py-3 text-[13px] leading-relaxed text-ink outline-none ring-1 ring-soil/16 transition-shadow placeholder:text-ink/25 focus:ring-2 focus:ring-forest/35"
                />
              </label>
            </div>
          </RevealStep>
        </div>
      </RevealStep>
    </BudgetSheet>
  )
}

/** Switch kecil on/off — pola sama dengan sheet Budget supaya satu bahasa UI */
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

