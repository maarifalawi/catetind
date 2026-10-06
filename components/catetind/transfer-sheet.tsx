'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeftRight, CalendarDays, Check, Info, Plus, Wallet as WalletIcon } from 'lucide-react'
import {
  BudgetSheet,
  RevealStep,
  RupiahField,
  SheetSubmit,
  useFocusOnOpen,
} from './budget-sheet'
import { usePrivacy } from './privacy-provider'
import { WALLET_TYPE_LABEL } from './wallet-card-face'
import { cn } from '@/lib/utils'
import { formatDayLabel, maskMoney } from '@/lib/data/history'
import { TRANSFER_SHEET_COPY, WALLET_TODAY_ISO } from '@/lib/data/add-wallet'
import { useTodayISO } from '@/lib/use-today-iso'
import { CONTEXT_LABEL } from '@/lib/data/money-context'
import type { WalletAccount } from '@/lib/wallets'

/* ── Sheet Pindah Dana (paket 04 → dirapikan paket 55) ───────────────────────
   PINDAH DANA = SATU alur, tiga langkah, dan bisa dijelaskan dalam satu kalimat:

       dari dompet mana → ke dompet mana → berapa
       (tanggal = hari ini, catatan opsional) → ringkasan `Rp 250.000 · BCA → GoPay`
       → tombol “Pindah Rp 250.000”

   Semua pintu masuk memakai sheet INI — tidak ada modal transfer kedua:
     · popover kartu dompet di /wallet          (asal sudah diketahui: kartu itu)
     · tombol “Pindah Dana” di /wallet/[id]     (asal sudah diketahui: dompet itu)
     · entri menu “Lainnya” & sidebar desktop   (asal BELUM diketahui → langkah 1)

   Empat keputusan yang membentuk isi sheet:

   1. PINDAH DANA BUKAN TINDAKAN MENAKUTKAN. Tidak ada istilah bank
      (debit/kredit/mutasi), tidak ada nomor referensi, dan nominalnya selalu
      bisa dilihat utuh di “Ringkasan” sebelum disimpan — jadi user tahu persis
      apa yang akan terjadi pada DUA saldonya.
   2. PENOLAKAN HARUS TERASA DITEMANI. Nominal di atas saldo bukan “error 400”:
      sistem menyebut sisa saldonya lalu mengajak memperkecil. Saldo nol pun
      dijelaskan (bukan chip mati tanpa sebab). Tombolnya memang mati, tapi
      kalimatnya menjelaskan kenapa (PRD 2A.4, tone “teman yang suportif”).
   3. LANGKAH MUNCUL BERURUTAN (RevealStep), bukan satu form panjang: dompet
      tujuan baru muncul setelah asalnya jelas, dan nominal baru muncul setelah
      dua ujungnya jelas. Itu yang membuat alurnya “nggak ngambang”: user selalu
      tahu ia sedang di langkah ke berapa.
   4. TUJUAN TIDAK PERNAH DITEBAK kalau pilihannya lebih dari satu. Versi
      sebelumnya otomatis memilih dompet tujuan PERTAMA — dengan tiga dompet,
      saldo bisa pindah ke dompet yang tidak pernah dipilih user. Sekarang
      pemilihan otomatis hanya terjadi kalau memang cuma ada satu kandidat
      (yaitu saat dompetnya cuma dua).

   Nominal yang DITAMPILKAN (saldo dompet asal/tujuan, ringkasan, chip “Semua”,
   tombol simpan) ikut tombol mata privasi global. Yang TIDAK disensor hanya
   angka yang sedang user ketik sendiri — menyembunyikan angka yang baru saja ia
   tekan itu menghambat, bukan melindungi. Saldo di TILE pemilih dikecualikan
   dengan alasan yang sama (tile dipakai untuk memilih, bukan untuk memamerkan
   angka) — lihat catatan di `WalletTile`.
   ────────────────────────────────────────────────────────────────────────── */

export function TransferSheet({
  wallets,
  source,
  open,
  onClose,
  onTransfer,
}: {
  /** daftar dompet terkini (state halaman /wallet) — calon asal & tujuan */
  wallets: WalletAccount[]
  /** dompet asal yang sudah diketahui pintu masuknya (null = user memilih sendiri) */
  source: WalletAccount | null
  open: boolean
  onClose: () => void
  /**
   * SATU-SATUNYA jalur tulis pindah dana: parent memanggil `postTransfer()`
   * (`lib/money/store.ts`) lewat `useTransferSubmit()`, lalu menutup sheet ini.
   */
  onTransfer: (fromWalletId: string, toWalletId: string, amount: number, note: string) => void
}) {
  const { masked } = usePrivacy()
  /**
   * Tanggal "hari ini" untuk baris tanggal di sheet (paket 57).
   *
   * Sheet ini tidak punya pemilih tanggal — barisnya hanya memberi tahu bahwa
   * baris ledger akan bertanggal hari ini. Dulu nilainya konstanta
   * `WALLET_TODAY_ISO` (27 Sep) sehingga sheet bisa menyebut tanggal yang bukan
   * hari ini; sekarang dari jam perangkat, diisi setelah mount (hidrasi aman).
   */
  const todayValue = useTodayISO()
  const todayIso = todayValue || WALLET_TODAY_ISO
  const [fromId, setFromId] = useState<string | null>(null)
  const [toId, setToId] = useState<string | null>(null)
  const [digits, setDigits] = useState('')
  const [note, setNote] = useState('')
  /** pemilih asal dipaksa terbuka (tombol “Ganti dompet asal”) */
  const [pickingFrom, setPickingFrom] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)

  /* form selalu mulai bersih tiap kali dibuka / dompet asal berganti; saat
     MENUTUP sengaja tidak direset supaya isi sheet tidak berkedip kosong di
     tengah animasi keluar Vaul. */
  useEffect(() => {
    if (!open) return
    setFromId(source?.id ?? null)
    setToId(null)
    setDigits('')
    setNote('')
    /* pintu “Lainnya” tidak membawa dompet asal → pemilihnya langsung terbuka */
    setPickingFrom(source === null)
  }, [open, source])

  useFocusOnOpen(open, amountRef)

  const origin = wallets.find((wallet) => wallet.id === fromId) ?? null
  /** dompet selain asal — pindah dana ke dompet yang sama itu mustahil */
  const destinations = useMemo(
    () => wallets.filter((wallet) => wallet.id !== origin?.id),
    [wallets, origin?.id],
  )
  /**
   * Tujuan terpilih: pilihan user, ATAU satu-satunya kandidat (dompetnya cuma
   * dua). Kalau kandidatnya lebih dari satu dan user belum memilih, `null` —
   * sheet menunggu, bukan menebak.
   */
  const destination =
    destinations.find((wallet) => wallet.id === toId) ??
    (destinations.length === 1 ? destinations[0]! : null)

  const amount = Number(digits || '0')
  const balance = origin?.balance ?? 0
  const exceeded = amount > balance
  const ready = origin !== null && destination !== null && amount > 0 && !exceeded
  /** tujuan lintas konteks uang (paket 47) → disebut apa adanya sebelum simpan */
  const crossContext =
    origin !== null && destination !== null && origin.context !== destination.context

  const tooFewWallets = wallets.length < 2
  const showFromPicker = pickingFrom || origin === null

  function submit() {
    if (!origin || !destination || amount <= 0 || exceeded) return
    onTransfer(origin.id, destination.id, amount, note.trim())
  }

  return (
    <BudgetSheet
      open={open}
      onClose={onClose}
      title={TRANSFER_SHEET_COPY.title}
      description={TRANSFER_SHEET_COPY.description}
      footer={
        tooFewWallets ? undefined : (
          <SheetSubmit onClick={submit} disabled={!ready} gate>
            {amount > 0
              ? TRANSFER_SHEET_COPY.submitFor(maskMoney(amount, masked))
              : TRANSFER_SHEET_COPY.submit}
          </SheetSubmit>
        )
      }
    >
      {/* ── EMPTY STATE JUJUR: dompet < 2 berarti tidak ada dua sisi untuk
             dipindah. Sheet kosong (form yang diam) lebih buruk daripada
             mengatakan kenapa + jalan keluarnya (kanon paket 29/49). ─────── */}
      {tooFewWallets ? (
        <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-forest/15 bg-cream/50 px-5 py-8 text-center">
          <span
            aria-hidden
            className="flex size-14 items-center justify-center rounded-2xl border-2 border-dashed border-forest/20 bg-cream/60"
          >
            <ArrowLeftRight className="size-6 text-forest/45" strokeWidth={2.2} />
          </span>
          <p className="mt-3.5 text-[13.5px] font-medium text-forest">
            {TRANSFER_SHEET_COPY.needSecondTitle}
          </p>
          <p className="mt-1.5 max-w-xs text-[12.5px] leading-relaxed text-forest/55">
            {TRANSFER_SHEET_COPY.needSecond}
          </p>
          {/* CTA-nya menuju halaman yang benar-benar bisa menambah dompet
              (rail “Tambah Dompet Cepat” di /wallet) — bukan jalan buntu */}
          <Link
            href="/wallet"
            onClick={onClose}
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-2xl bg-forest px-5 text-[13px] font-medium text-mint transition-colors hover:bg-forest-soft active:scale-[0.98]"
          >
            <Plus className="size-4" strokeWidth={2.6} aria-hidden />
            {TRANSFER_SHEET_COPY.needSecondCta}
          </Link>
          <p className="mt-2 text-[11px] leading-relaxed text-forest/40">
            {TRANSFER_SHEET_COPY.needSecondCtaHint}
          </p>
        </div>
      ) : (
        <>


          {/* ── LANGKAH 1: DARI DOMPET MANA ──────────────────────────────────
              Pintu yang sudah tahu asalnya (kartu dompet / dompet detail)
              menampilkan kartu terkunci + tombol ganti — user tidak memilih dua
              kali. Pintu “Lainnya” menampilkan pemilihnya langsung. */}
          {showFromPicker ? (
            <div>
              <p className="text-[13px] font-medium leading-snug text-forest">
                {TRANSFER_SHEET_COPY.fromPickLabel}
              </p>
              <div
                role="radiogroup"
                aria-label={TRANSFER_SHEET_COPY.fromPickLabel}
                className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3"
              >
                {wallets.map((wallet) => {
                  const active = origin?.id === wallet.id
                  return (
                    <button
                      key={wallet.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        setFromId(wallet.id)
                        /* tujuan lama bisa jadi dompet asal yang baru → pilihan
                           tujuan direset, bukan dibiarkan menunjuk asalnya sendiri */
                        setToId(null)
                        setPickingFrom(false)
                      }}
                      className={cn(
                        'flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left transition-all duration-200 active:scale-95',
                        active
                          ? 'bg-cream ring-2 ring-forest shadow-[0_12px_26px_-18px_rgba(69,89,78,0.65)]'
                          : 'bg-cream/60 ring-1 ring-soil/12 hover:bg-cream',
                      )}
                    >
                      <WalletTile wallet={wallet} active={active} />
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-forest/45">
                {TRANSFER_SHEET_COPY.fromPickHint}
              </p>
            </div>
          ) : (
            /* ── LANGKAH 1 (lanjutan): kartu dompet asal + tombol ganti ────────
                Pintu yang sudah tahu asalnya menampilkan kartunya TERKUNCI —
                user tidak perlu memilih dua kali — tapi tetap boleh membetulkan
                lewat “Ganti dompet asal” tanpa menutup sheet. */
            <div className="flex items-center gap-3 rounded-2xl bg-cream p-3.5 ring-1 ring-soil/12">
              <span
                aria-hidden
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-2xl text-[14px] font-medium text-forest ring-1 ring-inset ring-soil/10',
                  origin?.color,
                )}
              >
                {origin?.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-forest/40">
                  {TRANSFER_SHEET_COPY.fromLabel}
                </p>
                <p className="mt-0.5 truncate text-[14px] font-medium text-forest">{origin?.name}</p>
                <p className="text-[11px] text-forest/45">
                  {origin ? WALLET_TYPE_LABEL[origin.type] : ''} · {maskMoney(balance, masked)} ·{' '}
                  {origin ? CONTEXT_LABEL[origin.context] : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickingFrom(true)}
                className="shrink-0 rounded-full bg-cream px-3 py-1.5 text-[11px] font-medium text-forest ring-1 ring-soil/14 transition-colors hover:bg-sage/60"
              >
                {TRANSFER_SHEET_COPY.changeFrom}
              </button>
            </div>
          )}

          {/* ── LANGKAH 2: KE DOMPET MANA ────────────────────────────────────
              Muncul setelah asalnya jelas. Tujuan yang berada di konteks uang
              lain DIBERI TAHU (paket 47) — pindah antar konteks itu sah, yang
              tidak boleh adalah terjadi tanpa user sadar. */}
          <RevealStep show={origin !== null && !showFromPicker} className="mt-5">
            <p className="text-[13px] font-medium leading-snug text-forest">
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
                    <WalletTile wallet={wallet} active={active} />
                  </button>
                )
              })}
            </div>

            {crossContext && destination && origin && (
              <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-sage/50 p-3.5 ring-1 ring-soil/10">
                <span
                  aria-hidden
                  className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-sage text-forest"
                >
                  <Info className="size-3.5" strokeWidth={2.4} />
                </span>
                <p className="text-[12.5px] font-medium leading-relaxed text-forest/70">
                  {TRANSFER_SHEET_COPY.crossContextNote(
                    CONTEXT_LABEL[destination.context],
                    CONTEXT_LABEL[origin.context],
                  )}
                </p>
              </div>
            )}
          </RevealStep>


          {/* ── LANGKAH 3: BERAPA ────────────────────────────────────────────
              Baru muncul setelah kedua ujungnya jelas — user selalu tahu ia
              sedang di langkah ke berapa (keputusan #3 di kepala file). */}
          <RevealStep show={origin !== null && destination !== null}>
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
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium tabular-nums transition-all active:scale-95',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                  amount === balance && balance > 0
                    ? 'bg-forest text-mint'
                    : 'bg-cream text-forest/55 ring-1 ring-soil/14 hover:text-forest',
                )}
              >
                <WalletIcon className="size-3.5" strokeWidth={2.4} />
                {TRANSFER_SHEET_COPY.allAmount} · {maskMoney(balance, masked)}
              </button>
            </div>

            {/* ── penolakan yang ramah (bukan pesan error merah) ───────────
                Dua kalimat, karena dua keadaan berbeda: “dompetnya kosong” dan
                “nominalnya kegedean”. Kontrol mati tanpa penjelasan = pelanggaran
                kanon paket 29/49, jadi keduanya DIKATAKAN. */}
            {origin && balance <= 0 && (
              <div className="mt-3.5 flex items-start gap-2.5 rounded-2xl bg-hud-amber/[0.14] p-3.5 ring-1 ring-hud-amber/25">
                <span
                  aria-hidden
                  className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-hud-amber/25 text-forest/60"
                >
                  <Info className="size-3.5" strokeWidth={2.4} />
                </span>
                <p className="text-[12.5px] font-medium leading-relaxed text-forest/70">
                  {TRANSFER_SHEET_COPY.emptyBalance(origin.name)}
                </p>
              </div>
            )}

            {origin && exceeded && balance > 0 && (
              <div className="mt-3.5 flex items-start gap-2.5 rounded-2xl bg-hud-amber/[0.14] p-3.5 ring-1 ring-hud-amber/25">
                <span
                  aria-hidden
                  className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-hud-amber/25 text-forest/60"
                >
                  <Info className="size-3.5" strokeWidth={2.4} />
                </span>
                <p className="text-[12.5px] font-medium leading-relaxed text-forest/70">
                  {TRANSFER_SHEET_COPY.overBalance(origin.name, balance)}
                </p>
              </div>
            )}

            {/* ── tanggal (otomatis hari ini — tidak ada yang perlu dipilih) ── */}
            <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/12">
              <CalendarDays className="size-4 shrink-0 text-forest/35" strokeWidth={2.2} />
              <span className="text-[11.5px] font-medium text-forest/55">
                {TRANSFER_SHEET_COPY.dateLabel}
              </span>
              <span className="ml-auto text-[12.5px] font-semibold tabular-nums text-forest">
                {TRANSFER_SHEET_COPY.today} · {formatDayLabel(todayIso)}
              </span>
            </div>

            {/* ── catatan (opsional) ───────────────────────────────────────── */}
            <label className="mt-4 block">
              <span className="text-[13px] font-medium leading-snug text-forest">
                {TRANSFER_SHEET_COPY.noteLabel}
              </span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                placeholder={TRANSFER_SHEET_COPY.notePlaceholder}
                className="mt-2 w-full resize-none rounded-2xl bg-cream px-4 py-3 text-[13px] leading-relaxed text-forest outline-none ring-1 ring-soil/16 transition-shadow placeholder:text-forest/25 focus:ring-2 focus:ring-forest/35"
              />
            </label>

            {/* ── ringkasan sebelum simpan: “Rp 250.000 · BCA → GoPay” ─────── */}
            <div className="mb-1 mt-5 rounded-2xl bg-sage/70 p-3.5 ring-1 ring-soil/10">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-forest/40">
                {TRANSFER_SHEET_COPY.summaryLabel}
              </p>
              <p
                className={cn(
                  'mt-1 text-[14.5px] font-medium leading-snug',
                  ready || (amount > 0 && !exceeded) ? 'text-forest' : 'text-forest/40',
                )}
              >
                {origin && destination
                  ? TRANSFER_SHEET_COPY.summary(
                      maskMoney(amount, masked),
                      origin.name,
                      destination.name,
                    )
                  : TRANSFER_SHEET_COPY.needSecond}
              </p>
            </div>
          </RevealStep>

        </>
      )}
    </BudgetSheet>
  )
}

/**
 * Tile dompet untuk pemilih asal & tujuan — satu muka, dipakai dua kali di
 * sheet, supaya “Dari dompet ini” dan “Ke dompet mana?” terbaca sebagai dua
 * langkah dari satu alur (bukan dua komponen yang kebetulan mirip).
 *
 * Saldo di tile TIDAK ikut tombol mata privasi global, beda dengan ringkasan &
 * tombol simpan. Alasannya: tile ini dipakai untuk MEMILIH, dan pilihan yang
 * angkanya tidak bisa dibedakan membuat user menebak dompet mana yang mau
 * dipakai — persis “menghambat, bukan melindungi”.
 */
function WalletTile({ wallet, active }: { wallet: WalletAccount; active: boolean }) {
  return (
    <>
      <span
        aria-hidden
        className={cn(
          'relative flex size-8 shrink-0 items-center justify-center rounded-xl text-[12px] font-medium text-forest ring-1 ring-inset ring-soil/10',
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
        <span className="block truncate text-[12.5px] font-medium leading-tight text-forest">
          {wallet.name}
        </span>
        <span className="mt-0.5 block truncate text-[10.5px] tabular-nums text-forest/45">
          {maskMoney(wallet.balance, false)} · {CONTEXT_LABEL[wallet.context]}
        </span>
      </span>
    </>
  )
}

