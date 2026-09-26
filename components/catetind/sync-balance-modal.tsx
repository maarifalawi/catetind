'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Drawer } from 'vaul'
import { Sparkles, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatIDR, type WalletAccount } from '@/lib/wallets'

/* ── SyncBalanceModal — "Magic Vault" Smart Sync (koreksi saldo) ──────────────
   Drawer Vaul yang muncul saat user memilih "Sesuaikan Saldo" di kartu dompet.

   Alur: user mengetik saldo ASLI yang ia baca sendiri di aplikasi bank/e-wallet
   (input 100% manual — CatetInd tidak punya open-banking) → selisih terhadap
   saldo sistem dihitung live (merah kalau minus, hijau kalau plus) → tombol
   "Koreksi Otomatis" mengembalikan angka baru ke parent, yang lalu memperbarui
   state dompet + menembak toast non-blocking.

   Shell-nya mengikuti TransactionBottomSheet (data-catetind-sheet) supaya tempo
   buka/tutupnya sama cepat dengan bottom sheet lain di app (~280ms). */
export function SyncBalanceModal({
  wallet,
  open,
  onClose,
  onConfirm,
}: {
  /** dompet yang sedang disesuaikan — null sebelum pernah dibuka */
  wallet: WalletAccount | null
  open: boolean
  onClose: () => void
  /** dipanggil dengan saldo hasil koreksi; parent yang menutup modal & update state */
  onConfirm: (newBalance: number) => void
}) {
  /** digit mentah tanpa titik — satu-satunya sumber kebenaran format Rupiah */
  const [digits, setDigits] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  /* Snapshot dompet terakhir: Vaul masih menjalankan animasi tutup setelah
     parent mengosongkan `wallet` — tanpa snapshot, judul & saldo modal berkedip
     kosong di tengah animasi keluar. */
  const [shown, setShown] = useState<WalletAccount | null>(wallet)
  useEffect(() => {
    if (wallet) setShown(wallet)
  }, [wallet])

  /* Reset input tiap kali modal dibuka / dompet berganti, lalu auto-focus
     nominal — ditunda ~200ms supaya tidak berebut dengan animasi buka Vaul dan
     keyboard native tidak "nabrak" layout di tengah animasi. */
  useEffect(() => {
    if (!open) return
    setDigits('')
    const id = window.setTimeout(() => inputRef.current?.focus(), 200)
    return () => window.clearTimeout(id)
  }, [open, wallet?.id])

  const systemBalance = shown?.balance ?? 0
  const entered = Number(digits || '0')
  /** selisih saldo asli vs saldo sistem — inti dari Smart Sync */
  const diff = entered - systemBalance
  /** 1000000 → "1.000.000" (auto-format Indonesia seketika saat diketik) */
  const display = digits ? entered.toLocaleString('id-ID') : ''
  const diffText = `${diff < 0 ? '-' : diff > 0 ? '+' : ''}${formatIDR(Math.abs(diff))}`
  const diffTone = diff === 0 ? 'text-ink/45' : diff < 0 ? 'text-plum' : 'text-leaf'

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    // buang semua non-digit, batasi 12 digit (maks Rp 999.999.999.999)
    setDigits(event.target.value.replace(/\D/g, '').slice(0, 12))
  }

  function handleSubmit() {
    if (digits === '') {
      inputRef.current?.focus()
      return
    }
    onConfirm(entered)
  }


  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      autoFocus={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay
          data-catetind-overlay="true"
          className="fixed inset-0 z-[70] bg-ink/60"
        />

        <Drawer.Content
          data-catetind-sheet="true"
          aria-label="Sesuaikan saldo dompet"
          className="fixed inset-x-0 bottom-0 z-[70] mx-auto flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] bg-[#ffffff] pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-24px_60px_-24px_rgba(69,89,78,0.55)] outline-none"
        >
          {/* drag handle khas Vaul */}
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-ink/10" />
          {/* glow mint tipis di bibir atas sheet */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-mint/[0.16] to-transparent"
          />

          <div className="relative px-5 pt-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Drawer.Title className="font-display text-xl font-bold leading-tight tracking-tight text-ink">
                  Sesuaikan Saldo {shown?.name ?? ''}
                </Drawer.Title>
                <Drawer.Description className="mt-1 text-[13px] leading-relaxed text-ink/55">
                  Berapa saldo aslinya sekarang? Buka aplikasi bank/e-wallet kamu, lalu
                  tulis angkanya di sini.
                </Drawer.Description>
              </div>
              {/* badge brand — warnanya mengikuti kartu dompetnya */}
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-full text-cream shadow-sm ring-1 ring-soil/12',
                  shown?.color ?? 'bg-forest',
                )}
              >
                <Wand2 className="size-5" strokeWidth={2.2} />
              </span>
            </div>

            {/* saldo sistem — pembanding koreksi */}
            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-sage/40 px-4 py-3 ring-1 ring-inset ring-forest/[0.06]">
              <span className="flex items-center gap-2 text-[11.5px] font-medium text-ink/55">
                <span className={cn('size-2 rounded-full', shown?.color ?? 'bg-forest')} />
                Saldo sistem
              </span>
              <span className="text-[13.5px] font-bold text-ink tabular-nums">
                {formatIDR(systemBalance)}
              </span>
            </div>

            {/* input saldo asli — nominal raksasa, keyboard numerik */}
            <label className="mt-3 flex cursor-text items-baseline gap-2 rounded-2xl border-2 border-dashed border-oat px-4 py-4 transition-colors focus-within:border-mint focus-within:bg-mint/[0.07]">
              <span aria-hidden className="shrink-0 text-xl font-bold text-ink/25">
                Rp
              </span>
              <input
                ref={inputRef}
                value={display}
                onChange={handleChange}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleSubmit()
                  }
                }}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                enterKeyHint="done"
                placeholder="0"
                aria-label={`Saldo asli di ${shown?.name ?? 'dompet'}`}
                className="min-w-0 flex-1 bg-transparent text-[2rem] font-black leading-none tracking-tight text-ink tabular-nums outline-none placeholder:text-ink/15"
              />
            </label>

            {/* selisih dinamis — merah kalau minus, hijau kalau plus */}
            <div className="mt-3.5 flex items-start gap-2.5">
              <span
                className={cn(
                  'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full',
                  diff === 0
                    ? 'bg-ink/[0.06] text-ink/45'
                    : diff < 0
                      ? 'bg-plum/[0.13] text-plum'
                      : 'bg-leaf/[0.13] text-leaf',
                )}
              >
                <Sparkles className="size-3.5" strokeWidth={2.4} />
              </span>
              <div className="min-w-0">
                <p className={cn('text-[15px] font-bold leading-tight tabular-nums', diffTone)}>
                  Selisih: {diffText}
                </p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink/40">
                  {diff < 0
                    ? 'Pengeluaran Tak Tercatat akan ditambahkan otomatis ke catatanmu.'
                    : diff > 0
                      ? 'Pemasukan Tak Tercatat akan ditambahkan otomatis ke catatanmu.'
                      : 'Saldo di catatanmu sudah sama dengan saldo asli — tidak ada yang perlu dikoreksi.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={digits === ''}
              className={cn(
                'mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-forest-soft to-forest',
                'text-[15px] font-semibold text-cream shadow-[0_18px_36px_-16px_rgba(69,89,78,0.85)]',
                'transition-all hover:brightness-[1.08] active:scale-[0.99]',
                'disabled:cursor-not-allowed disabled:from-forest/20 disabled:to-forest/20 disabled:text-cream/70 disabled:shadow-none',
              )}
            >
              <Wand2 className="size-4" strokeWidth={2.4} />
              Koreksi Otomatis
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

