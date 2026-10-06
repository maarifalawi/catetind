'use client'

import { useEffect, useState } from 'react'
import { BudgetSheet, ChoicePills, RupiahField, SheetSubmit } from './budget-sheet'
import { MARK_PAID_SHEET_COPY, maskMoney, type Bill } from '@/lib/data/bills'

/* ── "TANDAI LUNAS" = PILIH DOMPET, BUKAN STEMPEL (paket 51 · temuan E) ──────
   Sebelum paket ini, menggeser kartu ke kanan langsung menempelkan stempel
   LUNAS: tidak ada uang yang keluar, tidak ada baris di Riwayat, dan saldo
   dompet tetap utuh. Sheet ini menutupnya dengan pola yang SAMA seperti "Catat
   Bayar" di halaman Kekayaan (`wealth-hutang.tsx`):

     1. nominal yang akan dibayar (terisi dari tagihannya, tapi boleh dikoreksi —
        tagihan dengan nominal fleksibel sengaja boleh diisi manual);
     2. dompet sumber dari LEDGER yang asli (`walletOptionsFor`), lengkap dengan
        saldonya — jadi user tahu uangnya cukup atau tidak SEBELUM menekan simpan;
     3. satu kalimat yang menyebut uangnya benar-benar keluar dari dompet itu.

   Kalau saldonya kurang, tombol simpan mati dan alasannya ditulis di tempat —
   bukan toast yang hilang. Kalau user menutup sheet tanpa memilih, TIDAK ada
   baris kas dan status tagihannya juga tidak berubah (`MARK_PAID_SHEET_COPY.closedNote`
   yang mengatakan itu apa adanya). */

export function MarkBillPaidSheet({
  bill,
  masked,
  walletOptions,
  defaultWalletId,
  onClose,
  onConfirm,
}: {
  /** tagihan yang sedang dibayar; `null` = sheet tertutup */
  bill: Bill | null
  masked: boolean
  /** dompet dari ledger + saldonya (bukan daftar mock) */
  walletOptions: { id: string; label: string; balance: number }[]
  /** dompet yang disarankan: dompet tagihan ini, kalau tidak ada → dompet konteks aktif */
  defaultWalletId: string
  onClose: () => void
  /** `true` = baris kas tertulis & status tagihan berubah (sheet boleh ditutup) */
  onConfirm: (amount: number, walletName: string) => boolean
}) {
  const [digits, setDigits] = useState('')
  const [wallet, setWallet] = useState('')
  const [error, setError] = useState('')

  /* Isi form tiap kali sheet dibuka untuk tagihan (baru): nominal dari
     tagihannya, dompet dari saran halaman. Tanpa reset ini, nominal tagihan
     sebelumnya bisa "menempel" ke tagihan berikutnya. */
  useEffect(() => {
    if (!bill) return
    setDigits(bill.amount > 0 ? String(bill.amount) : '')
    setWallet(walletOptions.some((option) => option.id === defaultWalletId) ? defaultWalletId : (walletOptions[0]?.id ?? ''))
    setError('')
  }, [bill, defaultWalletId, walletOptions])

  const amount = bill ? Number(digits || '0') : 0
  const selected = walletOptions.find((option) => option.id === wallet)
  const notEnough = selected ? amount > selected.balance : false
  const submitDisabled = amount <= 0 || walletOptions.length === 0 || notEnough

  const submit = () => {
    if (walletOptions.length === 0) {
      setError(MARK_PAID_SHEET_COPY.noWallet)
      return
    }
    if (amount <= 0) {
      setError(MARK_PAID_SHEET_COPY.invalid)
      return
    }
    if (!selected || !onConfirm(amount, selected.label)) {
      setError(MARK_PAID_SHEET_COPY.rejected)
      return
    }
    setError('')
  }

  return (
    <BudgetSheet
      open={bill !== null}
      onClose={onClose}
      title={bill ? MARK_PAID_SHEET_COPY.title(bill.name) : MARK_PAID_SHEET_COPY.title('')}
      description={MARK_PAID_SHEET_COPY.description}
      footer={
        <SheetSubmit onClick={submit} disabled={submitDisabled} gate>
          {MARK_PAID_SHEET_COPY.submit}
        </SheetSubmit>
      }
    >
      <RupiahField
        label={MARK_PAID_SHEET_COPY.amountLabel}
        digits={digits}
        onDigitsChange={setDigits}
        placeholder="Rp 350.000"
        size="lg"
      />

      {/* kalimat yang membuat klaimnya jujur: uangnya keluar dari dompet mana */}
      {selected && amount > 0 && (
        <p className="mt-3 rounded-2xl bg-sage/60 px-4 py-3 text-[12px] leading-relaxed text-forest/70">
          {MARK_PAID_SHEET_COPY.cashLine(maskMoney(amount, masked), selected.label)}
        </p>
      )}

      <div className="mt-4">
        <span className="text-[13px] font-medium leading-snug text-forest">
          {MARK_PAID_SHEET_COPY.walletLabel}
        </span>
        {walletOptions.length === 0 ? (
          <p className="mt-2 rounded-2xl bg-hud-amber/15 px-4 py-3 text-[11.5px] leading-relaxed text-[#b89191]">
            {MARK_PAID_SHEET_COPY.noWallet}
          </p>
        ) : (
          <>
            <ChoicePills
              className="mt-2"
              ariaLabel={MARK_PAID_SHEET_COPY.walletLabel}
              options={walletOptions.map((option) => ({ id: option.id, label: option.label }))}
              value={wallet}
              onChange={setWallet}
            />
            {selected && (
              <p className="mt-2 text-[11px] text-forest/45 tabular-nums">
                {MARK_PAID_SHEET_COPY.walletBalance(maskMoney(selected.balance, masked))}
              </p>
            )}
          </>
        )}

        {/* saldo tidak cukup / nominal tidak sah / ditolak store: tampil DI SINI,
            bukan sebagai toast yang hilang — user harus bisa membetulkan tanpa
            menebak. Dua sumbernya: pemeriksaan lokal atas saldo (`notEnough`)
            dan pesan dari percobaan simpan yang ditolak store (`error`). */}
        {walletOptions.length > 0 && (error || notEnough) && (
          <p className="mt-2 rounded-2xl bg-hud-terracotta/12 px-4 py-3 text-[11.5px] leading-relaxed text-[#b89191] ring-1 ring-inset ring-hud-terracotta/25">
            {error || MARK_PAID_SHEET_COPY.insufficient(selected?.label ?? '')}
          </p>
        )}
      </div>
    </BudgetSheet>
  )
}
