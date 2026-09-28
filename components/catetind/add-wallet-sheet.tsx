'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Plus, Sparkles } from 'lucide-react'
import {
  BudgetSheet,
  ChoicePills,
  RevealStep,
  RupiahField,
  SheetSubmit,
  useFocusOnOpen,
} from './budget-sheet'
import { usePrivacy } from './privacy-provider'
import { MaskedAmount, WALLET_TYPE_LABEL, WalletFace, WalletTypeMark } from './wallet-card-face'
import { cn } from '@/lib/utils'
import { AMOUNT_LABEL, AMOUNT_LG } from '@/lib/typography'
import { ADD_WALLET_SHEET_COPY } from '@/lib/data/add-wallet'
import {
  WALLET_KIND_OPTIONS,
  WALLET_NUMBER_MASK,
  createWalletAccount,
  formatIDR,
  maskedAccountNumber,
  walletBrandByName,
  walletBrandsByKind,
  type WalletAccount,
  type WalletDraft,
} from '@/lib/wallets'

/* ── Modal Tambah Dompet (inventaris #o) — satu form, sesedikit mungkin isian ──
   Dompet adalah GERBANG seluruh app (Daily HUD, budget, tagihan, dan Kekayaan
   semuanya membaca saldo dompet), jadi formnya sengaja dibuat pendek: hanya nama
   yang wajib. Friksi di langkah pertama = user menyerah sebelum produk terasa
   berguna (CONTEXT §5).

   Tiga hal yang membedakannya dari form biasa:
   1. KARTU PREVIEW hidup di atas form. User langsung melihat kartunya (warna,
      motif batik, monogram) sebelum menyimpan — "satu tap sudah terasa kena" —
      dan sekaligus jadi bukti bahwa warnanya lahir dari palet, bukan pilihan
      acak user.
   2. Pemilih brand = "pilih logo bank dari daftar". Menekan brand langsung
      mengisi jenis akun + namanya, tapi keduanya tetap bisa diubah — karena
      boleh punya lebih dari satu akun dari platform yang sama.
   3. Bantuan kontekstual duduk DI DALAM form (PRD 194–200), bukan mengirim user
      keluar ke Help Center hanya untuk tahu "boleh nggak punya dua GoPay?".

   Shell & atom form-nya memakai kit bersama `budget-sheet.tsx` (Vaul di mobile,
   dialog di desktop) supaya ritme buka/tutupnya sama dengan sheet lain di app.
   ────────────────────────────────────────────────────────────────────────── */

export function AddWalletSheet({
  open,
  onClose,
  onSave,
  cardIndex,
  initialBrand = null,
}: {
  open: boolean
  onClose: () => void
  onSave: (draft: WalletDraft) => void
  /** posisi dompet baru di daftar — menentukan resep warna (siklus palet) */
  cardIndex: number
  /**
   * Brand yang dibawa dari rail "Tambah Dompet Cepat" (ghost card). Diisi =
   * jenis akun + nama sudah terisi begitu sheet dibuka — inilah janji ghost card
   * yang sekarang ditepati. `null` = tombol "Lainnya", form dibuka bersih.
   */
  initialBrand?: string | null
}) {
  const { masked } = usePrivacy()
  const [type, setType] = useState<WalletAccount['type']>('Bank')
  /** nama brand yang dipilih dari daftar (null = diketik sendiri) */
  const [brand, setBrand] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [last4, setLast4] = useState('')
  const [digits, setDigits] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  /* Isi awal ditentukan saat sheet DIBUKA (latch), bukan dibaca langsung dari
     props tiap render: Vaul masih menjalankan animasi tutup setelah parent
     mengosongkan `initialBrand`, dan tanpa latch preview akan berkedip kosong di
     tengah animasi keluarnya. */
  useEffect(() => {
    if (!open) return
    const option = initialBrand ? walletBrandByName(initialBrand) : null
    setType(option?.type ?? 'Bank')
    setBrand(option?.name ?? null)
    setName(option?.name ?? '')
    setLast4('')
    setDigits('')
  }, [open, initialBrand])

  /* keyboard diangkat HANYA kalau form dibuka kosong. Kalau brand sudah terisi,
     yang paling mungkin diubah adalah saldonya — membuka keyboard di atas field
     nama justru menutupi field di bawahnya. */
  useFocusOnOpen(open && initialBrand === null, nameRef)

  const brandOptions = useMemo(() => walletBrandsByKind(type), [type])
  const trimmedName = name.trim()
  const balance = Number(digits || '0')
  const ready = trimmedName.length > 0
  /* nomor akun cuma masuk akal di muka kartu BANK (muka e-wallet memakai
     monogram brand, muka tunai memakai tumpukan uang — lihat wallet-card-face) */
  const previewNumber =
    type === 'Bank' && last4 ? maskedAccountNumber(last4) : undefined

  /** kartu yang dilihat user di atas form — resep warnanya dari siklus palet */
  const preview = useMemo<WalletAccount>(
    () => ({
      /* id placeholder: yang menentukan id dompet sungguhan adalah store
         (`lib/money/store.ts`, paket 40). Kartu preview cuma perlu kunci stabil
         untuk id gradien chip-nya. */
      id: 'preview',
      ...createWalletAccount(
        {
          name: trimmedName || ADD_WALLET_SHEET_COPY.previewFallbackName,
          type,
          balance,
          ...(previewNumber ? { number: previewNumber } : {}),
        },
        cardIndex,
      ),
    }),
    [trimmedName, type, balance, previewNumber, cardIndex],
  )

  /** menekan brand: jenis + nama ikut terisi, tapi tetap bisa diubah user */
  function pickBrand(brandName: string) {
    const option = walletBrandByName(brandName)
    if (!option) return
    setBrand(option.name)
    setType(option.type)
    setName(option.name)
  }

  /** ganti jenis akun: brand lama tidak berlaku lagi (GoPay bukan Bank) */
  function pickKind(next: WalletAccount['type']) {
    setType(next)
    const option = brand ? walletBrandByName(brand) : null
    if (option && option.type !== next) {
      setBrand(null)
      /* nama yang masih persis nama brand ikut dikosongkan supaya tidak ada
         "Dompet Tunai bernama GoPay" — kalau user sudah mengubah namanya sendiri,
         namanya dihormati dan dibiarkan. */
      if (name.trim().toLowerCase() === option.name.toLowerCase()) setName('')
    }
  }

  function submit() {
    if (!ready) return
    onSave({
      name: trimmedName,
      type,
      ...(previewNumber ? { number: previewNumber } : {}),
      balance,
    })
  }

  return (
    <BudgetSheet
      open={open}
      onClose={onClose}
      title={ADD_WALLET_SHEET_COPY.title}
      description={ADD_WALLET_SHEET_COPY.description}
      footer={
        <SheetSubmit onClick={submit} disabled={!ready} gate>
          {ADD_WALLET_SHEET_COPY.submit}
        </SheetSubmit>
      }
    >
      {/* ── KARTU PREVIEW — warna & motifnya sudah final sebelum disimpan ── */}
      <div>
        <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink/55">
          <Sparkles className="size-3.5 shrink-0 text-forest/60" strokeWidth={2.4} />
          {ADD_WALLET_SHEET_COPY.previewLabel}
        </p>
        <div className="group relative mt-2">
          <WalletFace wallet={preview} className="rounded-[1.5rem] p-4">
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-display text-[14.5px] font-bold tracking-tight">
                  {preview.name}
                </p>
                {preview.number && (
                  <p className="mt-1 truncate text-[10px] font-semibold tracking-[0.2em] text-cream/60 tabular-nums">
                    {preview.number}
                  </p>
                )}
                <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-cream/20 px-2.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-cream/90 ring-1 ring-inset ring-cream/30">
                  <span aria-hidden className="size-1.5 rounded-full bg-cream/70" />
                  {WALLET_TYPE_LABEL[preview.type]}
                </span>
              </div>
              <WalletTypeMark wallet={preview} chipId="add-wallet-preview-chip" />
            </div>

            <div className="relative mt-6">
              <p className={cn(AMOUNT_LABEL, 'text-cream/60')}>
                {ADD_WALLET_SHEET_COPY.previewBalanceLabel}
              </p>
              <div className="mt-1.5">
                <MaskedAmount
                  value={formatIDR(preview.balance)}
                  masked={masked}
                  className={AMOUNT_LG}
                />
              </div>
            </div>
          </WalletFace>
        </div>
      </div>

      {/* ── STEP 1 — jenis akun ─────────────────────────────────────────── */}
      <div className="mt-5">
        <p className="text-[13px] font-semibold leading-snug text-ink">
          {ADD_WALLET_SHEET_COPY.kindLabel}
        </p>
        <ChoicePills
          className="mt-2.5"
          ariaLabel={ADD_WALLET_SHEET_COPY.kindLabel}
          options={WALLET_KIND_OPTIONS}
          value={type}
          onChange={pickKind}
        />
      </div>

      {/* ── STEP 2 — pilih brand dari daftar (tidak berlaku untuk Tunai) ── */}
      <RevealStep show={type !== 'Cash'}>
        <div className="mt-5">
          <p className="text-[13px] font-semibold leading-snug text-ink">
            {ADD_WALLET_SHEET_COPY.brandLabel}
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink/45">
            {ADD_WALLET_SHEET_COPY.brandHint}
          </p>
          <div
            role="radiogroup"
            aria-label={ADD_WALLET_SHEET_COPY.brandLabel}
            className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-4"
          >
            {brandOptions.map((option) => {
              const active = brand === option.name
              return (
                <button
                  key={option.name}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => pickBrand(option.name)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 transition-all duration-200 active:scale-95',
                    active
                      ? 'bg-cream ring-2 ring-forest shadow-[0_12px_26px_-18px_rgba(69,89,78,0.65)]'
                      : 'bg-cream/60 ring-1 ring-soil/12 hover:bg-cream',
                  )}
                >
                  <span
                    className={cn(
                      'relative flex size-8 items-center justify-center rounded-xl text-[12px] font-black ring-1 ring-inset',
                      option.tile,
                    )}
                  >
                    {option.name.charAt(0)}
                    {active && (
                      <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-forest text-mint ring-2 ring-cream">
                        <Check className="size-2.5" strokeWidth={3.4} />
                      </span>
                    )}
                  </span>
                  <span className="text-[11.5px] font-bold leading-tight text-ink">
                    {option.name}
                  </span>
                </button>
              )
            })}

            {/* jalan keluar kalau brandnya tidak ada di daftar — sama seperti slot
                "Lainnya" di rail: lepaskan pilihan brand, lalu arahkan user ke
                field nama supaya ia tinggal mengetik */}
            <button
              type="button"
              onClick={() => {
                setBrand(null)
                nameRef.current?.focus()
              }}
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-ink/[0.1] bg-cream/50 px-2 py-3 transition-all duration-200 hover:border-forest/25 hover:bg-cream active:scale-95"
            >
              <span className="flex size-8 items-center justify-center rounded-xl bg-cream text-ink/40">
                <Plus className="size-4" strokeWidth={2.6} />
              </span>
              <span className="text-[11.5px] font-semibold leading-tight text-ink/45">
                {ADD_WALLET_SHEET_COPY.brandNone}
              </span>
            </button>
          </div>
        </div>
      </RevealStep>

      {/* ── STEP 3 — nama akun (satu-satunya field wajib) ────────────────── */}
      <label className="mt-5 block">
        <span className="text-[13px] font-semibold leading-snug text-ink">
          {ADD_WALLET_SHEET_COPY.nameLabel}
        </span>
        <input
          ref={nameRef}
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            /* user mengetik sendiri = brand tidak lagi mengikat */
            setBrand(null)
          }}
          placeholder={ADD_WALLET_SHEET_COPY.namePlaceholder}
          className="mt-2 w-full rounded-2xl bg-cream px-4 py-3 text-[15px] font-semibold text-ink outline-none ring-1 ring-soil/16 transition-shadow placeholder:font-medium placeholder:text-ink/25 focus:ring-2 focus:ring-forest/35"
        />
        {/* bantuan kontekstual DI DALAM form (PRD 194–200) */}
        <span className="mt-1.5 block text-[11.5px] leading-relaxed text-ink/45">
          {ADD_WALLET_SHEET_COPY.duplicateHint}
        </span>
      </label>

      {/* ── STEP 4 — nomor tersamarkan (opsional, muka kartu bank saja) ──── */}
      <RevealStep show={type === 'Bank' && trimmedName.length > 0}>
        <label className="mt-4 block">
          <span className="text-[13px] font-semibold leading-snug text-ink">
            {ADD_WALLET_SHEET_COPY.numberLabel}
          </span>
          <span className="mt-2 flex items-center gap-2 rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/16 focus-within:ring-2 focus-within:ring-forest/35">
            <span
              aria-hidden
              className="shrink-0 text-[15px] font-bold tracking-[0.18em] text-ink/30"
            >
              {WALLET_NUMBER_MASK}
            </span>
            <input
              value={last4}
              onChange={(event) => setLast4(event.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              autoComplete="off"
              placeholder={ADD_WALLET_SHEET_COPY.numberPlaceholder}
              aria-label={ADD_WALLET_SHEET_COPY.numberLabel}
              className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold tracking-[0.18em] text-ink tabular-nums outline-none placeholder:font-medium placeholder:tracking-normal placeholder:text-ink/25"
            />
          </span>
          <span className="mt-1.5 block text-[11.5px] leading-relaxed text-ink/45">
            {ADD_WALLET_SHEET_COPY.numberHint}
          </span>
        </label>
      </RevealStep>

      {/* ── STEP 5 — saldo sekarang (dikosongkan = 0) ───────────────────── */}
      <RupiahField
        className="mt-5"
        label={ADD_WALLET_SHEET_COPY.balanceLabel}
        digits={digits}
        onDigitsChange={setDigits}
        placeholder="Rp 0"
        hint={ADD_WALLET_SHEET_COPY.balanceHint}
      />
    </BudgetSheet>
  )
}

