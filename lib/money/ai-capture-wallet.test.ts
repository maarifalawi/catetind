import { beforeEach, describe, expect, it } from 'vitest'
import { hasUnknownContext, transactionsForContext } from './context-filter'
import { captureWalletChoice, getMoneySnapshot, resetMoneyStore, walletBalance } from './store'
import { draftFormFrom, parseTypedTransaction } from '@/lib/transaction-ai'
import { recordTransaction } from '@/lib/transaction-bus'
import type { MoneyContext } from '@/lib/types'

/* ── BUKTI AKAR + PERBAIKAN "Belum berkonteks" DARI JALUR AI (paket 79) ───────
   Keluhan yang dijawab paket ini: mencatat lewat AI menghasilkan baris yang
   muncul di Riwayat dengan badge **"Belum berkonteks"**.

   Akarnya bukan penanda di Riwayat (itu memang jujur): kartu konfirmasi AI
   menulis NAMA dompet dari daftar statis (`TRANSACTION_WALLET_OPTIONS`), lalu
   `walletIdOfName()` tidak menemukannya di ledger user ⇒ `walletId: ''` ⇒
   konteksnya tak bisa dipastikan ⇒ badge muncul di SEMUA konteks dan saldo
   dompet mana pun tidak bergerak.

   Test ini menjalankan URUTAN YANG SAMA dengan `useTransactionCapture`
   (`parseTypedTransaction` → `captureWalletChoice` → `recordTransaction`) —
   tanpa React, karena keputusannya memang murni. Dua kasus pertama sengaja
   berdampingan: yang pertama membuktikan akarnya (tanpa perbaikan), yang kedua
   membuktikan hasil sesudahnya (dengan perbaikan). */

beforeEach(() => resetMoneyStore())

/**
 * Persis langkah `hooks/use-transaction-capture.ts`, dengan `useFix = false`
 * untuk meniru perilaku LAMA (nama dompet tebakan AI ditulis apa adanya).
 */
function submitLikeAiCapture(text: string, ctx: MoneyContext, useFix = true) {
  const draft = draftFormFrom(parseTypedTransaction(text, '2026-10-08'), text)
  const wallet = useFix
    ? captureWalletChoice(getMoneySnapshot(), ctx, draft.wallet).value
    : draft.wallet
  return recordTransaction({
    name: draft.name,
    amount: Number(draft.amountDigits || '0'),
    type: draft.type,
    category: draft.category,
    wallet,
    date: draft.date,
  })
}

describe('catatan dari AI tidak lagi lahir "Belum berkonteks"', () => {
  it('keadaan LAMA: tebakan "OVO" (dompet yang tidak dimiliki user) jadi tak berkonteks', () => {
    submitLikeAiCapture('makan pakai ovo 27rb', 'pribadi', false)

    const snapshot = getMoneySnapshot()
    expect(hasUnknownContext(snapshot)).toBe(true)
    expect(walletBalance(snapshot, 'bca')).toBe(1_450_000) // saldo tidak bergerak
    for (const ctx of ['pribadi', 'keluarga', 'bersama'] as const) {
      const listed = transactionsForContext(snapshot, ctx)
      expect(listed).toHaveLength(1)
      expect(listed[0]?.unknownContext).toBe(true)
    }
  })

  it('SESUDAH perbaikan: barisnya masuk konteks yang benar & saldonya bergerak', () => {
    const draft = parseTypedTransaction('makan pakai ovo 27rb', '2026-10-08')
    /* AI tetap menebak "OVO" — yang berubah: kartu memakai dompet MILIK user */
    expect(draft.wallet).toBe('OVO')

    submitLikeAiCapture('makan pakai ovo 27rb', 'pribadi')

    const snapshot = getMoneySnapshot()
    expect(hasUnknownContext(snapshot)).toBe(false)

    const row = snapshot.rows[0]!
    expect(row.walletId).toBe('bca')
    expect(walletBalance(snapshot, 'bca')).toBe(1_450_000 - 27_000)

    const pribadi = transactionsForContext(snapshot, 'pribadi')
    expect(pribadi).toHaveLength(1)
    expect(pribadi[0]?.unknownContext).toBe(false)
    expect(pribadi[0]?.context).toBe('pribadi')
    expect(transactionsForContext(snapshot, 'bersama')).toHaveLength(0)
  })

  it('ketikan tanpa menyebut dompet masuk dompet konteks yang sedang aktif', () => {
    submitLikeAiCapture('airminum 5k', 'keluarga')

    const snapshot = getMoneySnapshot()
    const row = snapshot.rows[0]!
    expect(row.walletName).toBe('Tunai') // dompet konteks Keluarga
    expect(walletBalance(snapshot, 'tunai')).toBe(50_000 - 5_000)
    expect(hasUnknownContext(snapshot)).toBe(false)
  })

  it('tebakan AI yang DIMILIKI user di konteks lain tetap dipakai — dan disebutkan', () => {
    /* switcher di "Bersama", user mengetik "airminum 5k": AI menebak `Tunai`,
       dompet Keluarga yang memang milik user. Catatannya sah (dompetnya nyata,
       tampil di kartu), dan `outsideContext` yang membuat kartu mengatakannya. */
    const choice = captureWalletChoice(getMoneySnapshot(), 'bersama', 'Tunai')
    expect(choice.value).toBe('Tunai')
    expect(choice.outsideContext).toBe(true)
    expect(choice.unknownGuess).toBe('')

    submitLikeAiCapture('airminum 5k', 'bersama')
    expect(hasUnknownContext(getMoneySnapshot())).toBe(false)
  })

  it('konteks tanpa dompet: tidak ada baris yang ditulis (bukan "Belum berkonteks")', () => {
    /* Konteks "Bersama" belum punya dompet, dan tebakan AI ("OVO") bukan dompet
       user → dompet kartu = ''. Pagar di hook menahan lebih dulu
       (`AI_CAPTURE_COPY.noWalletToPick`) dan pintu tulis store menolak sebagai
       pagar terakhir: dua pagar, nol baris tanpa dompet. Dompet konteks lain
       SENGAJA tidak dipakai sebagai tambalan (paket 59 · temuan audit #1). */
    expect(captureWalletChoice(getMoneySnapshot(), 'bersama', 'OVO').value).toBe('')
    expect(() => submitLikeAiCapture('makan pakai ovo 27rb', 'bersama')).toThrow()

    const snapshot = getMoneySnapshot()
    expect(snapshot.rows).toHaveLength(0)
    expect(hasUnknownContext(snapshot)).toBe(false)
  })
})
