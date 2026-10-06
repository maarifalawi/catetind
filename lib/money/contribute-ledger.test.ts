import { beforeEach, describe, expect, it } from 'vitest'
import { getMoneySnapshot, resetMoneyStore, walletBalance } from './store'
import { contributeToFund, getFundsSnapshot, resetFundsStore, sweepIntoFund } from './funds-store'
import { assertLedgerInvariant } from './ledger'

/* ── Test SETORAN CELENGAN → LEDGER (paket 65 · Tugas B) ─────────────────────
   Aturan kanon: uang yang keluar dari dompet HARUS punya baris ledger. Sebelum
   paket ini baris `saving` ditulis di UI, jadi setoran dari pintu selain
   budget-screen (halaman detail celengan, modal review, sapu bersih) tidak
   pernah tercatat. Sekarang `contributeToFund()` (store) yang menulisnya, jadi
   SEMUA pemanggilnya ikut tercatat. */

beforeEach(() => {
  resetMoneyStore()
  resetFundsStore()
})

describe('setoran celengan menulis baris ledger (Tugas B)', () => {
  it('contributeToFund menggerakkan saldo dompet & mencatat baris `saving`', () => {
    const fund = getFundsSnapshot().funds[0]!
    const before = walletBalance(getMoneySnapshot(), 'bca')

    const result = contributeToFund(fund.id, 100_000, 'bca')
    expect(result).not.toBeNull()

    const after = walletBalance(getMoneySnapshot(), 'bca')
    expect(before - after).toBe(100_000)

    const rows = getMoneySnapshot().rows
    const saving = rows.filter((row) => row.note.startsWith('Setor '))
    expect(saving).toHaveLength(1)
    /* kunci idempotensi = id setoran ⇒ tidak mungkin baris kembar dari aksi yang sama */
    expect(saving[0]?.clientTxId).toBe(`fund-contribution-${result!.contribution.id}`)
  })

  it('dua setoran berbeda = dua baris (uang memang keluar dua kali)', () => {
    const fund = getFundsSnapshot().funds[0]!
    contributeToFund(fund.id, 50_000, 'bca')
    contributeToFund(fund.id, 70_000, 'bca')
    expect(getMoneySnapshot().rows.filter((row) => row.note.startsWith('Setor '))).toHaveLength(2)
    expect(walletBalance(getMoneySnapshot(), 'bca')).toBe(1_450_000 - 120_000)
  })

  it('sweepIntoFund (sumber "Sisa budget", bukan dompet) TIDAK mengarang baris kas', () => {
    const fund = getFundsSnapshot().funds[0]!
    const rowsBefore = getMoneySnapshot().rows.length
    expect(sweepIntoFund(fund.id, 60_000)).not.toBeNull()
    /* uang sapu bersih tidak pernah ada di dompet → tidak ada baris kas yang dikarang */
    expect(getMoneySnapshot().rows.length).toBe(rowsBefore)
  })

  it('invariant ledger tetap lolos setelah setoran', () => {
    const fund = getFundsSnapshot().funds[0]!
    contributeToFund(fund.id, 123_000, 'bca')
    /* store sudah memanggil invariant ini di setiap commit; di sini dibuktikan
       bentuk barisnya tetap sah (nominal bulat, lawan dompet konsisten, dst.) */
    const snapshot = getMoneySnapshot()
    expect(() => assertLedgerInvariant(snapshot.rows)).not.toThrow()
  })
})
