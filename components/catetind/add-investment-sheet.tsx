'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarDays, Check, ChevronDown } from 'lucide-react'
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
  ASSET_TYPE_META,
  ASSET_TYPE_OPTIONS,
  INVESTMENT_PRICE_FIELD,
  INVESTMENT_SHEET_COPY,
  INVESTMENT_TOTAL_LABEL,
  RDN_ACCOUNTS,
  WEALTH_TODAY_ISO,
  formatIDR,
  quantityFieldLabel,
  type AssetType,
  type Investment,
} from '@/lib/data/wealth'

/* ── TAMBAH INVESTASI (Section 5E, inventaris #t) ───────────────────────────
   Bottom sheet (Vaul di mobile, dialog di desktop) memakai kit bersama
   `budget-sheet.tsx` — tempo buka/tutup & radius-nya sama dengan halaman lain.

   Progressive disclosure tiga lapis, supaya user baru tidak disuguhi 8 field
   sekaligus:
     Step 1  jenis aset + nama/ticker + Beli/Jual        (langsung terlihat)
     Step 2  jumlah, harga per unit, tanggal, preview    (auto-reveal setelah
             nama terisi)
     Step 3  'Detail Lanjutan' — biaya, akun RDN, catatan (accordion tertutup)

   Akun RDN hanya muncul kalau jenisnya saham DAN user bilang punya RDN —
   dua lapis penyembunyian, sesuai catatan inventaris "field RDN (progressive
   disclosure toggle)".
   Sejak paket 17, sheet yang sama juga melayani MODE EDIT aset (`initial`
   diisi) — satu komponen, dua mode, sama seperti sheet Tagihan (paket 03).

   ────────────────────────────────────────────────────────────────────────── */

export interface NewInvestmentTx {
  assetType: AssetType
  name: string
  side: 'buy' | 'sell'
  quantity: number
  price: number
  date: string
  fees: number
  rdnAccount?: string
  notes?: string
}

/**
 * Payload MODE EDIT — koreksi posisi aset yang sudah ada, BUKAN transaksi baru.
 *
 * Bentuknya sengaja beda dari `NewInvestmentTx`: arah beli/jual, biaya, akun
 * RDN, dan catatan adalah milik sebuah TRANSAKSI, sedangkan yang dikoreksi di
 * sini adalah posisi asetnya (PRD 2E.1 — nilai & harga di CatetInd diisi manual,
 * jadi harus bisa dibetulkan).
 */
export interface InvestmentEditDraft {
  type: AssetType
  name: string
  /** kode pasar/ticker: BBCA, BTC, RDPU, GOLD */
  symbol: string
  quantity: number
  /** harga rata-rata beli per unit — penentu modal (totalInvested) */
  avgBuyPrice: number
}

const SIDE_OPTIONS: { id: 'buy' | 'sell'; label: string }[] = [
  { id: 'buy', label: 'Beli' },
  { id: 'sell', label: 'Jual' },
]

/* ── SATU SHEET, DUA MODE ────────────────────────────────────────────────────
   `initial` kosong = mode TAMBAH (transaksi beli/jual baru), `initial` diisi =
   mode EDIT (koreksi posisi aset). Yang berganti cuma judul, CTA, dan isi awal
   formnya — bukan komponen baru yang menyalin 90% logika di sini (pola yang sama
   dengan sheet Tagihan, paket 03).

   Yang SENGAJA tidak muncul di mode edit: pilihan Beli/Jual, tanggal transaksi,
   dan accordion 'Detail Lanjutan' (biaya, RDN, catatan). Semuanya milik sebuah
   transaksi; menampilkannya saat mengoreksi posisi aset hanya akan berpura-pura
   menyimpan sesuatu yang tidak ada di model `Investment`. */
export function AddInvestmentSheet({
  open,
  onClose,
  onSave,
  onEdit,
  initial = null,
}: {
  open: boolean
  onClose: () => void
  onSave: (tx: NewInvestmentTx) => void
  /**
   * Dipanggil di mode edit (saat `initial` ada isinya). `onSave` — payload
   * transaksi baru — tidak ikut terpanggil supaya tidak ada aset dobel.
   */
  onEdit?: (draft: InvestmentEditDraft) => void
  /**
   * Aset yang sedang dikoreksi. Diisi = MODE EDIT. `null` (default) = mode
   * tambah, persis seperti pemakaian sebelumnya — jadi pemakaian tambah tidak
   * perlu diubah sama sekali.
   */
  initial?: Investment | null
}) {
  /** mode yang sedang TAMPIL — di-latch saat sheet dibuka supaya judulnya tidak
   *  berkedip berubah ketika halaman mengosongkan `initial` (sheet menutup) */
  const [mode, setMode] = useState<'add' | 'edit'>('add')
  const copy = INVESTMENT_SHEET_COPY[mode]
  const priceField = INVESTMENT_PRICE_FIELD[mode]

  const [assetType, setAssetType] = useState<AssetType>('mutual_fund')
  const [name, setName] = useState('')
  /** kode pasar/ticker — disentuh HANYA di mode edit (di mode tambah ia
   *  diturunkan dari nama, seperti sebelumnya) */
  const [symbol, setSymbol] = useState('')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [quantityDigits, setQuantityDigits] = useState('')
  const [priceDigits, setPriceDigits] = useState('')
  const [date, setDate] = useState(WEALTH_TODAY_ISO)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [feesDigits, setFeesDigits] = useState('')
  const [hasRdn, setHasRdn] = useState(false)
  const [rdnAccount, setRdnAccount] = useState<string>(RDN_ACCOUNTS[0])
  const [note, setNote] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  /* Form dibuka dengan nilai yang tepat: mode tambah = bersih; mode edit =
     terisi nilai aset yang sedang dibetulkan. Latch-nya ada DI SINI (bukan
     membaca `initial` langsung saat render) supaya animasi tutup tetap
     menampilkan form versi terakhir yang dilihat user. */
  useEffect(() => {
    if (!open) return
    if (initial) {
      setMode('edit')
      setAssetType(initial.type)
      setName(initial.name)
      setSymbol(initial.symbol)
      setSide('buy')
      /* field harga = harga rata-rata beli, karena itulah penentu MODAL.
         Harga pasar punya jalurnya sendiri ("Update Manual" di kartu aset) supaya
         tidak ada dua tempat berbeda yang mengaku "sumber harga". */
      setQuantityDigits(String(initial.quantity))
      setPriceDigits(String(initial.avgBuyPrice))
      setDate(WEALTH_TODAY_ISO)
      setAdvancedOpen(false)
      setFeesDigits('')
      setHasRdn(false)
      setRdnAccount(RDN_ACCOUNTS[0])
      setNote('')
      return
    }
    setMode('add')
    setAssetType('mutual_fund')
    setName('')
    setSymbol('')
    setSide('buy')
    setQuantityDigits('')
    setPriceDigits('')
    setDate(WEALTH_TODAY_ISO)
    setAdvancedOpen(false)
    setFeesDigits('')
    setHasRdn(false)
    setRdnAccount(RDN_ACCOUNTS[0])
    setNote('')
  }, [open, initial])

  /* Auto-focus nama HANYA di mode tambah. Di mode edit formnya sudah terisi, dan
     mengangkat keyboard sendiri menutupi justru field yang mau dibetulkan. */
  useFocusOnOpen(open && initial === null, nameRef)

  const quantity = Number(quantityDigits.replace(',', '.') || '0')
  const price = Number(priceDigits || '0')
  const total = quantity * price
  const stepOneDone = name.trim().length > 0
  const ready = stepOneDone && quantity > 0 && price > 0 && date !== ''
  const isStock = assetType === 'stock'
  const editing = mode === 'edit'
  /* preview khusus mode edit: nilai sekarang memakai harga terakhir yang
     tersimpan (form ini tidak menyentuh harga pasar), jadi user melihat langsung
     dampak koreksi kuantitas/modal terhadap angka di kartu asetnya */
  const editingCurrentValue = quantity * (initial?.currentPrice ?? 0)
  const editingReturn = editingCurrentValue - total

  function submit() {
    if (!ready) return
    if (editing) {
      onEdit?.({
        type: assetType,
        name: name.trim(),
        /* kode pasar jarang ikut berubah, tapi ia bagian dari identitas aset —
           kalau kosong, kode lama (atau turunan nama) yang dipakai */
        symbol: (symbol.trim() || initial?.symbol || name.trim().slice(0, 6)).toUpperCase(),
        quantity,
        avgBuyPrice: price,
      })
      return
    }
    onSave({
      assetType,
      name: name.trim(),
      side,
      quantity,
      price,
      date,
      fees: Number(feesDigits || '0'),
      rdnAccount: isStock && hasRdn ? rdnAccount : undefined,
      notes: note.trim() || undefined,
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
      {/* ── STEP 1 — jenis aset, nama/ticker, arah transaksi ─────────────── */}
      <span className="text-[13px] font-semibold leading-snug text-ink">Jenis aset</span>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {ASSET_TYPE_OPTIONS.map((option) => {
          const active = option.id === assetType
          const meta = ASSET_TYPE_META[option.id]
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setAssetType(option.id)}
              aria-pressed={active}
              className={cn(
                'flex items-center gap-2 rounded-2xl px-3.5 py-3 text-left text-[13px] font-semibold transition-all duration-200 active:scale-[0.98]',
                active
                  ? 'bg-forest text-mint shadow-[0_12px_26px_-16px_rgba(69,89,78,0.85)]'
                  : 'bg-cream text-ink/65 ring-1 ring-soil/14 hover:bg-cream hover:text-ink',
              )}
            >
              <span aria-hidden className="text-[15px]">
                {meta.emoji}
              </span>
              {meta.label}
            </button>
          )
        })}
      </div>

      <label className="mt-4 block">
        <span className="text-[13px] font-semibold leading-snug text-ink">
          {editing ? 'Nama aset' : 'Nama / ticker'}
        </span>
        <input
          ref={nameRef}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Contoh: BBCA, Bitcoin, Bibit RDPU"
          className="mt-2 w-full rounded-2xl bg-cream px-4 py-3 text-[15px] font-semibold text-ink outline-none ring-1 ring-soil/16 transition-shadow placeholder:font-medium placeholder:text-ink/25 focus:ring-2 focus:ring-forest/35"
        />
      </label>

      {/* Kode pasar hanya bisa dibetulkan di mode edit: di mode tambah ia
          diturunkan otomatis dari nama (perilaku lama, tidak diubah). */}
      {editing && (
        <label className="mt-4 block">
          <span className="text-[13px] font-semibold leading-snug text-ink">Kode / ticker</span>
          <span className="mt-2 flex items-center gap-2 rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/16 focus-within:ring-2 focus-within:ring-forest/35">
            <input
              value={symbol}
              onChange={(event) => setSymbol(event.target.value.toUpperCase())}
              placeholder="BBCA"
              aria-label="Kode pasar atau ticker"
              className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold uppercase tracking-wide text-ink outline-none placeholder:font-medium placeholder:text-ink/25"
            />
          </span>
          <span className="mt-1.5 block text-[11px] leading-relaxed text-ink/45">
            Kode yang tampil sebagai badge di kartu aset — mis. BBCA, BTC, RDPU.
          </span>
        </label>
      )}

      {/* Arah transaksi = milik transaksi baru, bukan milik posisi aset */}
      {!editing && (
        <div className="mt-4">
          <span className="text-[13px] font-semibold leading-snug text-ink">Transaksi</span>
          <ChoicePills
            className="mt-2"
            ariaLabel="Arah transaksi"
            options={SIDE_OPTIONS}
            value={side}
            onChange={setSide}
          />
        </div>
      )}

      {/* ── STEP 2 — jumlah, harga per unit, tanggal, preview total ──────── */}
      <RevealStep show={stepOneDone}>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-[13px] font-semibold leading-snug text-ink">
              {quantityFieldLabel(assetType)}
            </span>
            <span className="mt-2 flex items-center gap-2 rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/16 focus-within:ring-2 focus-within:ring-forest/35">
              <input
                value={quantityDigits}
                onChange={(event) => setQuantityDigits(sanitizeDecimal(event.target.value))}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                aria-label={quantityFieldLabel(assetType)}
                className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold tabular-nums text-ink outline-none placeholder:font-medium placeholder:text-ink/25"
              />
              <span className="shrink-0 text-[12px] font-semibold text-ink/40">
                {ASSET_TYPE_META[assetType].unit || 'koin'}
              </span>
            </span>
          </label>

          <RupiahField
            label={priceField.label}
            digits={priceDigits}
            onDigitsChange={setPriceDigits}
            placeholder="Rp 9.250"
            hint={priceField.hint}
          />

          {/* tanggal transaksi hanya relevan untuk transaksi BARU — posisi aset
              tidak punya tanggal pembelian di model `Investment` */}
          {!editing && (
            <div>
              <span className="text-[13px] font-semibold leading-snug text-ink">Tanggal</span>
              <span className="relative mt-2 flex items-center gap-2 rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/16 focus-within:ring-2 focus-within:ring-forest/35">
                <CalendarDays className="size-4 shrink-0 text-ink/35" strokeWidth={2.2} />
                <span className="flex-1 text-[14px] font-semibold tabular-nums text-ink">
                  {formatSheetDate(date)}
                </span>
                <Check className="size-4 shrink-0 text-hud-sage" strokeWidth={3} />
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  aria-label="Tanggal transaksi"
                  className="absolute inset-0 size-full cursor-pointer rounded-2xl opacity-0"
                />
              </span>
            </div>
          )}

          {/* auto-kalkulasi real-time: quantity × price */}
          <div className="flex flex-col gap-2 rounded-2xl bg-sage/60 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12.5px] font-semibold text-ink/70">
                {INVESTMENT_TOTAL_LABEL[mode]}
              </span>
              <span className="font-display text-[16px] font-black tracking-tight text-forest tabular-nums">
                {formatIDR(total)}
              </span>
            </div>

            {/* di mode edit, preview-nya bicara dalam bahasa hasil koreksi: modal
                vs nilai sekarang, supaya user tahu angka di kartu akan jadi apa */}
            {editing && (
              <>
                <div className="flex items-center justify-between gap-3 text-[12px] text-ink/55 tabular-nums">
                  <span>Nilai sekarang (harga terakhir)</span>
                  <span className="font-semibold">{formatIDR(editingCurrentValue)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-[12px] tabular-nums">
                  <span className="text-ink/55">Return belum terealisasi</span>
                  <span
                    className={cn(
                      'font-semibold',
                      editingReturn >= 0 ? 'text-[#b5b987]' : 'text-hud-terracotta',
                    )}
                  >
                    {editingReturn >= 0 ? '+' : '−'}
                    {formatIDR(Math.abs(editingReturn))}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </RevealStep>


      {/* ── STEP 3 — accordion 'Detail Lanjutan' (tertutup default) ────────
          Hanya untuk transaksi BARU: biaya, akun RDN, dan catatan menempel pada
          transaksi, bukan pada posisi aset — jadi tidak ada di mode edit. */}
      <RevealStep show={stepOneDone && !editing}>
        <div className="mt-4 overflow-hidden rounded-2xl bg-cream/70 ring-1 ring-soil/12">
          <button
            type="button"
            onClick={() => setAdvancedOpen((prev) => !prev)}
            aria-expanded={advancedOpen}
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
          >
            <span className="text-[13px] font-semibold text-ink">Detail Lanjutan</span>
            <ChevronDown
              className={cn(
                'size-4 shrink-0 text-ink/35 transition-transform duration-200',
                advancedOpen && 'rotate-180',
              )}
              strokeWidth={2.4}
            />
          </button>

          <RevealStep show={advancedOpen}>
            <div className="space-y-4 border-t border-soil/10 px-4 py-4">
              <RupiahField
                label="Biaya transaksi (opsional)"
                digits={feesDigits}
                onDigitsChange={setFeesDigits}
                placeholder="Rp 0"
                hint="Fee broker / biaya jual-beli, kalau ada."
              />

              {/* akun RDN hanya untuk saham — dan hanya kalau user punya */}
              {isStock && (
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-semibold text-ink">Punya akun RDN?</span>
                    <ToggleSwitch checked={hasRdn} onChange={setHasRdn} label="Punya akun RDN" />
                  </div>
                  <RevealStep show={hasRdn}>
                    <label className="mt-3 block">
                      <span className="text-[12.5px] font-semibold text-ink/70">Akun RDN</span>
                      <span className="relative mt-2 flex items-center gap-2 rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/16 focus-within:ring-2 focus-within:ring-forest/35">
                        <select
                          value={rdnAccount}
                          onChange={(event) => setRdnAccount(event.target.value)}
                          aria-label="Akun RDN"
                          className="flex-1 appearance-none bg-transparent text-[13.5px] font-semibold text-ink outline-none"
                        >
                          {RDN_ACCOUNTS.map((account) => (
                            <option key={account} value={account}>
                              {account}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="size-4 shrink-0 text-ink/30" strokeWidth={2.4} />
                      </span>
                    </label>
                  </RevealStep>
                </div>
              )}

              <label className="block">
                <span className="text-[12.5px] font-semibold text-ink/70">Catatan (opsional)</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  placeholder="Misal: DCA bulanan rutin"
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

/** hanya angka + satu pemisah desimal (koma/titik) — maksimal 8 digit belakang */
function sanitizeDecimal(raw: string): string {
  const cleaned = raw.replace(/[^\d.,]/g, '').replace(/,/g, '.')
  const [whole, ...rest] = cleaned.split('.')
  const decimals = rest.join('').slice(0, 8)
  return rest.length > 0 ? `${whole}.${decimals}` : whole
}

/** `25 Sep 2026` — tanggal ringkas untuk field sheet */
function formatSheetDate(iso: string): string {
  if (!iso) return 'Pilih tanggal'
  const [year, month, day] = iso.split('-').map(Number)
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ]
  return `${day} ${months[(month ?? 1) - 1]} ${year}`
}

/** Switch kecil on/off — pola sama dengan sheet Budget & Tagihan */
function ToggleSwitch({
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

