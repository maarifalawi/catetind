'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Check, Info, Wallet as WalletIcon } from 'lucide-react'
import { BudgetSheet, RupiahField, SheetSubmit, useFocusOnOpen } from './budget-sheet'
import { usePrivacy } from './privacy-provider'
import { WALLET_TYPE_LABEL } from './wallet-card-face'
import { cn } from '@/lib/utils'
import { formatDayLabel, maskMoney } from '@/lib/data/history'
import { TRANSFER_SHEET_COPY, WALLET_TODAY_ISO } from '@/lib/data/add-wallet'
import type { WalletAccount } from '@/lib/wallets'

/* ── Sheet Pindah Saldo (popover kartu dompet → "Pindah Saldo") ────────────────
   Pindah saldo antar dompet sendiri. Dua aturan yang membentuk seluruh sheet ini:

   1. PINDAH SALDO BUKAN TINDAKAN MENAKUTKAN. Tidak ada istilah bank
      (debit/kredit/mutasi), tidak ada nomor referensi, dan nominalnya selalu
      bisa dilihat utuh di "Ringkasan" sebelum disimpan — jadi user tahu persis
      apa yang akan terjadi pada DUA saldonya.
   2. PENOLAKAN HARUS TERASA DITEMANI. Nominal di atas saldo bukan "error 400":
      sistem menyebut sisa saldonya lalu mengajak memperkecil. Tombolnya memang
      mati, tapi kalimatnya menjelaskan kenapa — bukan pesan merah yang
      menghakimi (PRD 2A.4, tone "teman yang suportif").

   Nominal yang DITAMPILKAN (saldo dompet asal/tujuan, ringkasan, chip "Semua")
   ikut tombol mata privasi global. Yang TIDAK disensor hanya angka yang sedang
   user ketik sendiri — menyembunyikan angka yang baru saja ia tekan itu
   menghambat, bukan melindungi.
   ────────────────────────────────────────────────────────────────────────── */

export function TransferSheet({
  wallets,
  source,
  open,
  onClose,
  onTransfer,
}: {
  /** daftar dompet terkini (state halaman /wallet) — calon tujuan */
  wallets: WalletAccount[]
  /** dompet asal (null = sheet tertutup) */
  source: WalletAccount | null
  open: boolean
  onClose: () => void
  /** parent yang mengubah dua saldo + mencatat transfernya */
  onTransfer: (destinationId: number, amount: number, note?: string) => void
}) {
  const { masked } = usePrivacy()
  const [toId, setToId] = useState<number | null>(null)
  const [digits, setDigits] = useState('')
  const [note, setNote] = useState('')
  const amountRef = useRef<HTMLInputElement>(null)

  /* Snapshot dompet terakhir: Vaul masih beranimasi tutup setelah parent
     mengosongkan `source` — tanpa snapshot, judul & saldo asal berkedip kosong. */
  const [shown, setShown] = useState<WalletAccount | null>(source)
  useEffect(() => {
    if (source) setShown(source)
  }, [source])

  /* form selalu mulai bersih tiap kali dibuka / dompet asal berganti */
  useEffect(() => {
    if (!open) return
    setToId(null)
    setDigits('')
    setNote('')
  }, [open, source?.id])

  useFocusOnOpen(open, amountRef)

  /** dompet selain sumber — tidak mungkin memindahkan dana ke dompet yang sama */
  const destinations = useMemo(
    () => wallets.filter((wallet) => wallet.id !== shown?.id),
    [wallets, shown?.id],
  )
  /* tujuan terpilih: pilihan user, atau dompet pertama yang bukan sumber (biar
     satu ketukan sudah cukup kalau dompetnya cuma dua) */
  const destination =
    destinations.find((wallet) => wallet.id === toId) ?? destinations[0] ?? null

  const amount = Number(digits || '0')
  const balance = shown?.balance ?? 0
  const exceeded = amount > balance
  const ready = shown !== null && destination !== null && amount > 0 && !exceeded

  function submit() {
    if (!ready || !destination) return
    onTransfer(destination.id, amount, note.trim() || undefined)
  }

  return (
    <BudgetSheet
      open={open}
      onClose={onClose}
      title={TRANSFER_SHEET_COPY.title}
      description={TRANSFER_SHEET_COPY.description}
      footer={
        <SheetSubmit onClick={submit} disabled={!ready} gate>
          {TRANSFER_SHEET_COPY.submit}
        </SheetSubmit>
      }
    >
      {/* ── dompet asal — dikunci, bukan pilihan (user sudah memilih dari kartunya) ── */}
      <div className="flex items-center gap-3 rounded-2xl bg-cream p-3.5 ring-1 ring-soil/12">
        <span
          aria-hidden
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-2xl text-[14px] font-black text-ink ring-1 ring-inset ring-soil/10',
            shown?.color,
          )}
        >
          {shown?.name.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink/40">
            {TRANSFER_SHEET_COPY.fromLabel}
          </p>
          <p className="mt-0.5 truncate text-[14px] font-bold text-ink">{shown?.name}</p>
          <p className="text-[11px] text-ink/45">
            {shown ? WALLET_TYPE_LABEL[shown.type] : ''} · {maskMoney(balance, masked)}
          </p>
        </div>
      </div>

      {/* ── dompet tujuan ────────────────────────────────────────────────── */}
      {destinations.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-[11.5px] leading-relaxed text-ink/55 ring-1 ring-soil/12">
          {TRANSFER_SHEET_COPY.needSecond}
        </p>
      ) : (
        <div className="mt-5">
          <p className="text-[13px] font-semibold leading-snug text-ink">
            {TRANSFER_SHEET_COPY.toLabel}
          </p>
          <div
            role="radiogroup"
            aria-label={TRANSFER_SHEET_COPY.toLabel}
            className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3"
          >
            {destinations.map((wallet) => {
              const active = destination?.id === wallet.id
              return (
                <button
                  key={wallet.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setToId(wallet.id)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left transition-all duration-200 active:scale-95',
                    active
                      ? 'bg-cream ring-2 ring-forest shadow-[0_12px_26px_-18px_rgba(69,89,78,0.65)]'
                      : 'bg-cream/60 ring-1 ring-soil/12 hover:bg-cream',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'relative flex size-8 shrink-0 items-center justify-center rounded-xl text-[12px] font-black text-ink ring-1 ring-inset ring-soil/10',
                      wallet.color,
                    )}
                  >
                    {wallet.name.charAt(0)}
                    {active && (
                      <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-forest text-mint ring-2 ring-cream">
                        <Check className="size-2.5" strokeWidth={3.4} />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-bold leading-tight text-ink">
                      {wallet.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[10.5px] tabular-nums text-ink/45">
                      {maskMoney(wallet.balance, masked)}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── nominal + isi-cepat seluruh saldo ────────────────────────────── */}
      <RupiahField
        className="mt-5"
        label={TRANSFER_SHEET_COPY.amountLabel}
        digits={digits}
        onDigitsChange={setDigits}
        placeholder="Rp 100.000"
        inputRef={amountRef}
      />
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setDigits(String(balance))}
          disabled={balance <= 0}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold tabular-nums transition-all active:scale-95',
            'disabled:cursor-not-allowed disabled:opacity-40',
            amount === balance && balance > 0
              ? 'bg-forest text-mint'
              : 'bg-cream text-ink/55 ring-1 ring-soil/14 hover:text-ink',
          )}
        >
          <WalletIcon className="size-3.5" strokeWidth={2.4} />
          {TRANSFER_SHEET_COPY.allAmount} · {maskMoney(balance, masked)}
        </button>
      </div>

      {/* ── penolakan yang ramah (bukan pesan error merah) ───────────────── */}
      {exceeded && shown && (
        <div className="mt-3.5 flex items-start gap-2.5 rounded-2xl bg-hud-amber/[0.14] p-3.5 ring-1 ring-hud-amber/25">
          <span
            aria-hidden
            className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-hud-amber/25 text-ink/60"
          >
            <Info className="size-3.5" strokeWidth={2.4} />
          </span>
          <p className="text-[12.5px] font-medium leading-relaxed text-ink/70">
            {TRANSFER_SHEET_COPY.overBalance(shown.name, balance)}
          </p>
        </div>
      )}

      {/* ── tanggal (otomatis hari ini — tidak ada yang perlu dipilih) ───── */}
      <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/12">
        <CalendarDays className="size-4 shrink-0 text-ink/35" strokeWidth={2.2} />
        <span className="text-[11.5px] font-semibold text-ink/55">
          {TRANSFER_SHEET_COPY.dateLabel}
        </span>
        <span className="ml-auto text-[12.5px] font-bold tabular-nums text-ink">
          {TRANSFER_SHEET_COPY.today} · {formatDayLabel(WALLET_TODAY_ISO)}
        </span>
      </div>

      {/* ── catatan (opsional) ───────────────────────────────────────────── */}
      <label className="mt-4 block">
        <span className="text-[13px] font-semibold leading-snug text-ink">
          {TRANSFER_SHEET_COPY.noteLabel}
        </span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          placeholder={TRANSFER_SHEET_COPY.notePlaceholder}
          className="mt-2 w-full resize-none rounded-2xl bg-cream px-4 py-3 text-[13px] leading-relaxed text-ink outline-none ring-1 ring-soil/16 transition-shadow placeholder:text-ink/25 focus:ring-2 focus:ring-forest/35"
        />
      </label>

      {/* ── ringkasan sebelum simpan: "Rp 250.000 dari BCA → GoPay" ──────── */}
      <div className="mb-1 mt-5 rounded-2xl bg-sage/70 p-3.5 ring-1 ring-soil/10">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink/40">
          {TRANSFER_SHEET_COPY.summaryLabel}
        </p>
        <p
          className={cn(
            'mt-1 text-[14.5px] font-bold leading-snug',
            ready || (amount > 0 && !exceeded) ? 'text-ink' : 'text-ink/40',
          )}
        >
          {shown && destination
            ? TRANSFER_SHEET_COPY.summary(maskMoney(amount, masked), shown.name, destination.name)
            : TRANSFER_SHEET_COPY.needSecond}
        </p>
      </div>
    </BudgetSheet>
  )
}
