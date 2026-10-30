'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Plus } from 'lucide-react'
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
import { AMOUNT_LG } from '@/lib/typography'
import { ADD_WALLET_SHEET_COPY, EDIT_WALLET_SHEET_COPY } from '@/lib/data/add-wallet'
import {
  WALLET_CUSTOM_THEMES,
  WALLET_THEME_COPY,
  applyWalletTheme,
  walletThemeById,
} from '@/lib/data/wallet-themes'
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

/* â”€â”€ Modal Tambah Dompet (inventaris #o) â€” satu form, sesedikit mungkin isian â”€â”€
   Dompet adalah GERBANG seluruh app (Daily HUD, budget, tagihan, dan Kekayaan
   semuanya membaca saldo dompet), jadi formnya sengaja dibuat pendek: hanya nama
   yang wajib. Friksi di langkah pertama = user menyerah sebelum produk terasa
   berguna (CONTEXT Â§5).

   Tiga hal yang membedakannya dari form biasa:
   1. KARTU PREVIEW hidup di atas form. User langsung melihat kartunya (warna,
      motif batik, monogram) sebelum menyimpan â€” "satu tap sudah terasa kena" â€”
      dan sekaligus jadi bukti bahwa warnanya lahir dari palet, bukan pilihan
      acak user.
   2. Pemilih brand = "pilih logo bank dari daftar". Menekan brand langsung
      mengisi jenis akun + namanya, tapi keduanya tetap bisa diubah â€” karena
      boleh punya lebih dari satu akun dari platform yang sama.
   3. Bantuan kontekstual duduk DI DALAM form (PRD 194â€“200), bukan mengirim user
      keluar ke Help Center hanya untuk tahu "boleh nggak punya dua GoPay?".

   Shell & atom form-nya memakai kit bersama `budget-sheet.tsx` (Vaul di mobile,
   dialog di desktop) supaya ritme buka/tutupnya sama dengan sheet lain di app.
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function AddWalletSheet({
  open,
  onClose,
  onSave,
  cardIndex,
  initialBrand = null,
  wallet = null,
  initialThemeId = null,
  onSaveIdentity,
  onThemeChange,
}: {
  open: boolean
  onClose: () => void
  /** dipakai HANYA oleh mode tambah */
  onSave: (draft: WalletDraft) => void
  /** posisi dompet baru di daftar â€” menentukan resep warna (siklus palet) */
  cardIndex: number
  /**
   * Brand yang dibawa dari rail "Tambah Dompet Cepat" (ghost card). Diisi =
   * jenis akun + nama sudah terisi begitu sheet dibuka â€” inilah janji ghost card
   * yang sekarang ditepati. `null` = tombol "Lainnya", form dibuka bersih.
   */
  initialBrand?: string | null
  /**
   * MODE UBAH: dompet yang sedang diedit. Diisi = sheet berjalan sebagai "Ubah
   * Dompet" dan memanggil `onSaveIdentity` (bukan `onSave`). Tidak diisi = alur
   * TAMBAH yang lama, tanpa satu pun perubahan perilaku.
   */
  wallet?: WalletAccount | null
  /** tema kartu yang sedang aktif untuk dompet itu (mode ubah) */
  initialThemeId?: string | null
  /**
   * Simpan identitas dompet (mode ubah). `false` = store menolak (nama kosong /
   * sudah dipakai) â†’ sheet TETAP TERBUKA dan menampilkan alasan, jadi user tidak
   * kehilangan isian yang sudah ia ketik.
   */
  onSaveIdentity?: (patch: { name: string; number?: string }) => boolean
  /** pilihan tema di mode ubah langsung disimpan (tema = preferensi tampilan) */
  onThemeChange?: (themeId: string | null) => void
}) {
  const editing = wallet !== null
  const copy = editing ? EDIT_WALLET_SHEET_COPY : ADD_WALLET_SHEET_COPY
  const { masked } = usePrivacy()
  const [type, setType] = useState<WalletAccount['type']>('Bank')
  /** nama brand yang dipilih dari daftar (null = diketik sendiri) */
  const [brand, setBrand] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [last4, setLast4] = useState('')
  const [digits, setDigits] = useState('')
  /**
   * TEMA KARTU yang dipilih user (paket 77) â€” id dari `WALLET_CUSTOM_THEMES`,
   * `null` = kartu bawaan. Diteruskan lewat `onSave` supaya pilihan ini benar-
   * benar tersimpan (bukan cuma mengubah pratinjau).
   */
  const [themeId, setThemeId] = useState<string | null>(null)
  /** store menolak penyimpanan identitas (nama kosong / duplikat) */
  const [rejected, setRejected] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  /* Isi awal ditentukan saat sheet DIBUKA (latch), bukan dibaca langsung dari
     props tiap render: Vaul masih menjalankan animasi tutup setelah parent
     mengosongkan `initialBrand`, dan tanpa latch preview akan berkedip kosong di
     tengah animasi keluarnya. */
  useEffect(() => {
    if (!open) return
    /* MODE UBAH: isi dari dompet yang sedang diedit. Saldo sengaja TIDAK diisi â€”
       di mode ini saldo tidak bisa diubah (lihat catatan di `EDIT_â€¦` copy). */
    if (wallet) {
      setType(wallet.type)
      setBrand(walletBrandByName(wallet.name)?.name ?? null)
      setName(wallet.name)
      const digitsOnly = (wallet.number ?? '').replace(/\D/g, '').slice(-4)
      setLast4(digitsOnly)
      setDigits('')
      setThemeId(initialThemeId)
      setRejected(false)
      return
    }
    const option = initialBrand ? walletBrandByName(initialBrand) : null
    setType(option?.type ?? 'Bank')
    setBrand(option?.name ?? null)
    setName(option?.name ?? '')
    setLast4('')
    setDigits('')
    /* form dibuka bersih tiap kali: tema lama tidak boleh "menempel" ke dompet
       berikutnya tanpa user memilihnya lagi (paket 77) */
    setThemeId(null)
    setRejected(false)
  }, [open, initialBrand, wallet, initialThemeId])

  /* keyboard diangkat HANYA kalau form dibuka kosong. Kalau brand sudah terisi,
     yang paling mungkin diubah adalah saldonya â€” membuka keyboard di atas field
     nama justru menutupi field di bawahnya. */
  useFocusOnOpen(open && initialBrand === null, nameRef)

  const brandOptions = useMemo(() => walletBrandsByKind(type), [type])
  const trimmedName = name.trim()
  const balance = Number(digits || '0')
  const ready = trimmedName.length > 0
  /* nomor akun cuma masuk akal di muka kartu BANK (muka e-wallet memakai
     monogram brand, muka tunai memakai tumpukan uang â€” lihat wallet-card-face) */
  const previewNumber =
    type === 'Bank' && last4 ? maskedAccountNumber(last4) : undefined

  /** kartu dasar (resep palet BAWAAN) â€” dipakai sebagai pratinjau & sebagai
      contoh tema "Bawaan" di pemilih tema */
  const previewBase = useMemo<WalletAccount>(() => {
    /* MODE UBAH: kartu yang dipratinjau = kartu DOMPET ITU (warna & motifnya
       sudah tersimpan di datanya), bukan resep dompet baru. Jadi yang dilihat
       user adalah kartunya sendiri dengan nama barunya. */
    if (wallet) {
      return {
        ...wallet,
        name: trimmedName || EDIT_WALLET_SHEET_COPY.previewFallbackName,
        ...(previewNumber ? { number: previewNumber } : {}),
      }
    }
    return {
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
    }
  }, [wallet, trimmedName, type, balance, previewNumber, cardIndex])

  /**
   * Pratinjau = kartu dasar + TEMA yang sedang dipilih (paket 77). Karena tema
   * dipasang dengan fungsi yang SAMA dengan muka kartu di /wallet
   * (`applyWalletTheme`), yang dilihat user di sini benar-benar yang akan ia
   * dapat setelah menyimpan â€” bukan dua resep berbeda.
   */
  const preview = useMemo(() => applyWalletTheme(previewBase, themeId), [previewBase, themeId])

  /** pilihan tema: "Bawaan" (resep palet) + SEPULUH tema kustom dari data */
  const themeChoices = useMemo(
    () => [
      {
        id: null,
        name: WALLET_THEME_COPY.defaultName,
        note: WALLET_THEME_COPY.defaultNote,
        swatch: previewBase.face,
      },
      ...WALLET_CUSTOM_THEMES.map((theme) => ({
        id: theme.id,
        name: theme.name,
        note: theme.note,
        swatch: theme.swatch,
      })),
    ],
    [previewBase.face],
  )
  const activeTheme = themeId ? walletThemeById(themeId) : null

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
         "Dompet Tunai bernama GoPay" â€” kalau user sudah mengubah namanya sendiri,
         namanya dihormati dan dibiarkan. */
      if (name.trim().toLowerCase() === option.name.toLowerCase()) setName('')
    }
  }

  function submit() {
    if (!ready) return
    /* MODE UBAH: satu pintu tulis (`renameWalletAccount`, lewat pemanggil).
       Saldo & jenis akun tidak dikirim â€” identitas saja. */
    if (editing) {
      const ok = onSaveIdentity?.({
        name: trimmedName,
        ...(previewNumber ? { number: previewNumber } : {}),
      })
      if (ok === false) {
        setRejected(true)
        return
      }
      setRejected(false)
      onClose()
      return
    }
    onSave({
      name: trimmedName,
      type,
      ...(previewNumber ? { number: previewNumber } : {}),
      balance,
      /* tema kartu ikut disimpan (paket 77) â€” halaman pemanggil menuliskannya ke
         preferensi perangkat setelah store memberi id dompet barunya */
      ...(themeId ? { themeId } : {}),
    })
  }

  return (
    <BudgetSheet
      open={open}
      onClose={onClose}
      title={copy.title}
      footer={
        <SheetSubmit onClick={submit} disabled={!ready} gate>
          {copy.submit}
        </SheetSubmit>
      }
    >
      {/* â”€â”€ KARTU PREVIEW â€” warna & motifnya sudah final sebelum disimpan â”€â”€ */}
      <div className="group relative">
        <WalletFace wallet={preview} className="rounded-[1.5rem] p-4">
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-display text-[15.5px] font-medium tracking-tight">
                {preview.name}
              </p>
              {preview.number && (
                <p className="mt-1 truncate text-[11px] font-medium tracking-[0.2em] text-cream/60 tabular-nums">
                  {preview.number}
                </p>
              )}
              <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-cream/20 px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.1em] text-cream/90 ring-1 ring-inset ring-cream/30">
                <span aria-hidden className="size-1.5 rounded-full bg-cream/70" />
                {WALLET_TYPE_LABEL[preview.type]}
              </span>
            </div>
            <WalletTypeMark wallet={preview} chipId="add-wallet-preview-chip" />
          </div>

          {/* label mikro "Saldo" DIHAPUS (paket 77) â€” pratinjau ini meniru muka
              kartu asli, dan muka kartu asli tidak lagi memakai label itu. */}
          <div className="relative mt-5">
            <MaskedAmount
              value={formatIDR(preview.balance)}
              masked={masked}
              className={AMOUNT_LG}
            />
          </div>
        </WalletFace>
      </div>

      {/* â”€â”€ STEP 1 â€” jenis akun â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          Disembunyikan di mode UBAH: memindahkan dompet ke jenis lain berarti
          mengganti selera warna & monogram kartunya, dan itu bukan "mengubah
          identitas" â€” kartu yang sudah dipakai user tidak boleh berubah rupa
          hanya karena ia memperbaiki nama. */}
      {!editing && (
        <div className="mt-5">
          <p className="text-[14px] font-medium leading-snug text-forest">
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
      )}

      {/* â”€â”€ STEP 2 â€” pilih brand dari daftar (tidak berlaku untuk Tunai) â”€â”€ */}
      <RevealStep show={!editing && type !== 'Cash'}>
        <div className="mt-5">
          <p className="text-[14px] font-medium leading-snug text-forest">
            {ADD_WALLET_SHEET_COPY.brandLabel}
          </p>
          <div
            role="radiogroup"
            aria-label={ADD_WALLET_SHEET_COPY.brandLabel}
            className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4"
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
                      ? 'bg-cream ring-2 ring-forest shadow-[0_12px_26px_-18px_rgba(0,0,0,0.65)]'
                      : 'bg-cream/60 ring-1 ring-soil/12 hover:bg-cream',
                  )}
                >
                  <span
                    className={cn(
                      'relative flex size-8 items-center justify-center rounded-xl text-[13px] font-medium ring-1 ring-inset',
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
                  <span className="text-[12.5px] font-medium leading-tight text-forest">
                    {option.name}
                  </span>
                </button>
              )
            })}

            {/* jalan keluar kalau brandnya tidak ada di daftar â€” sama seperti slot
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
              <span className="flex size-8 items-center justify-center rounded-xl bg-cream text-forest/40">
                <Plus className="size-4" strokeWidth={2.6} />
              </span>
              <span className="text-[12.5px] font-medium leading-tight text-forest/45">
                {ADD_WALLET_SHEET_COPY.brandNone}
              </span>
            </button>
          </div>
        </div>
      </RevealStep>

      {/* â”€â”€ STEP 3 â€” nama akun (satu-satunya field wajib) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <label className="mt-5 block">
        <span className="text-[14px] font-medium leading-snug text-forest">
          {copy.nameLabel}
        </span>
        <input
          ref={nameRef}
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            /* user mengetik sendiri = brand tidak lagi mengikat */
            setBrand(null)
            setRejected(false)
          }}
          placeholder={copy.namePlaceholder}
          className="mt-2 w-full rounded-2xl bg-cream px-4 py-3 text-[16px] font-medium text-forest outline-none ring-1 ring-soil/16 transition-shadow placeholder:font-medium placeholder:text-forest/25 focus:ring-2 focus:ring-forest/35"
        />
      </label>

      {/* penolakan store (nama kosong / sudah dipakai) â€” dikatakan di tempat
          isiannya, bukan lewat toast yang hilang sendiri */}
      {rejected && (
        <p className="mt-2 rounded-2xl bg-plum/12 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-plum ring-1 ring-plum/25">
          {EDIT_WALLET_SHEET_COPY.rejected}
        </p>
      )}

      {/* â”€â”€ STEP 4 â€” nomor tersamarkan (opsional, muka kartu bank saja) â”€â”€â”€â”€ */}
      <RevealStep show={type === 'Bank' && trimmedName.length > 0}>
        <label className="mt-4 block">
          <span className="text-[14px] font-medium leading-snug text-forest">
            {copy.numberLabel}
          </span>
          <span className="mt-2 flex items-center gap-2 rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/16 focus-within:ring-2 focus-within:ring-forest/35">
            <span
              aria-hidden
              className="shrink-0 text-[16px] font-medium tracking-[0.18em] text-forest/30"
            >
              {WALLET_NUMBER_MASK}
            </span>
            <input
              value={last4}
              onChange={(event) => setLast4(event.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              autoComplete="off"
              placeholder={copy.numberPlaceholder}
              aria-label={copy.numberLabel}
              className="min-w-0 flex-1 bg-transparent text-[16px] font-medium tracking-[0.18em] text-forest tabular-nums outline-none placeholder:font-medium placeholder:tracking-normal placeholder:text-forest/25"
            />
          </span>
          <span className="mt-1.5 block text-[12.5px] leading-relaxed text-forest/45">
            {copy.numberHint}
          </span>
        </label>
      </RevealStep>

      {/* ── STEP 5 — saldo sekarang (mode TAMBAH saja) ─────────────────────
          Di mode UBAH field ini TIDAK dirender: saldo punya pintu sendiri
          (`Sesuaikan Saldo` → baris `balance_adjustment`), dan dua pintu untuk
          satu angka adalah cara paling mudah membuat saldo bercerita beda.
          Yang tampil menggantikannya adalah satu kalimat jalan keluarnya. */}
      {editing ? (
        <p className="mt-5 rounded-2xl bg-sage/60 px-3.5 py-3 text-[12.5px] leading-relaxed text-forest/60">
          {EDIT_WALLET_SHEET_COPY.balanceNote}
        </p>
      ) : (
        <RupiahField
          className="mt-5"
          label={ADD_WALLET_SHEET_COPY.balanceLabel}
          digits={digits}
          onDigitsChange={setDigits}
          placeholder="Rp 0"
          hint={ADD_WALLET_SHEET_COPY.balanceHint}
        />
      )}

      {/* â”€â”€ STEP 6 â€” TEMA KARTU (paket 77) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          Permukaan KUSTOMISASI DOMPET yang sudah ada (sheet ini) diperluas:
          dulu warna kartu 100% ditentukan kode, sekarang user boleh memilih satu
          dari SEMBILAN tema kustom yang dikurasi di `lib/data/wallet-themes.ts`.
          Dua hal yang membuatnya jujur:
            Â· "Bawaan" selalu jadi pilihan pertama & default â€” form ini tetap
              bisa disimpan tanpa menyentuh tema sama sekali;
            Â· pilihan yang dibuat di sini BENAR-BENAR disimpan (diteruskan lewat
              `onSave`), bukan cuma mengubah pratinjau. */}
      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[14px] font-medium leading-snug text-forest">
            {WALLET_THEME_COPY.label}
          </p>
          <span className="shrink-0 rounded-full bg-sage px-2 py-0.5 text-[11.5px] font-medium text-forest ring-1 ring-forest/10">
            {WALLET_THEME_COPY.count(WALLET_CUSTOM_THEMES.length)}
          </span>
        </div>
        <div
          role="radiogroup"
          aria-label={WALLET_THEME_COPY.label}
          className="mt-3 grid grid-cols-5 gap-2"
        >
          {themeChoices.map((option) => {
            const active = themeId === option.id
            return (
              <button
                key={option.id ?? 'default'}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={WALLET_THEME_COPY.chooseA11y(option.name, option.note)}
                onClick={() => {
                  setThemeId(option.id)
                  /* mode UBAH: tema = preferensi tampilan, jadi langsung
                     disimpan. Mode TAMBAH: menunggu `submit()` seperti biasa
                     (dompetnya belum punya id untuk ditempeli tema). */
                  if (editing) onThemeChange?.(option.id)
                }}
                className={cn(
                  'relative aspect-[4/3] overflow-hidden rounded-xl transition-all duration-200 active:scale-95',
                  active
                    ? 'ring-2 ring-forest'
                    : 'ring-1 ring-soil/12 hover:ring-forest/30 focus-visible:ring-2 focus-visible:ring-forest/40',
                )}
              >
                {/* swatch TIDAK diberi label teks di dalam tile (ruangnya sempit):
                    nama + keterangan tema terpilih dibaca di bawah grid, dan
                    tiap tombol punya aria-label dari copy.chooseA11y */}
                <span aria-hidden className={cn('absolute inset-0', option.swatch)} />
                {active && (
                  <span className="absolute bottom-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-forest text-mint ring-2 ring-cream">
                    <Check className="size-2.5" strokeWidth={3.4} />
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-forest/55">
          {activeTheme
            ? `${activeTheme.name}, ${activeTheme.note}`
            : WALLET_THEME_COPY.defaultNote}
        </p>
      </div>
    </BudgetSheet>
  )
}

