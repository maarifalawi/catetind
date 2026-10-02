import { beforeEach, describe, expect, it } from 'vitest'
import {
  EXPORT_SCHEMA,
  EXPORT_SCHEMA_VERSION,
  buildMoneyExport,
  collectExportSources,
  downloadMoneyExport,
  moneyExportFileName,
  moneyExportJson,
} from './export'
import { cashTotal, getMoneySnapshot, postExpense, removeRow, removeWalletAccount, resetMoneyStore, restoreWalletAccount } from './store'
import { addDebt, getWealthSnapshot, resetWealthStore } from './wealth-store'
import { addBill, getBillsSnapshot, liveBills, resetBillsStore } from './bills-store'
import { INITIAL_BILLS, type Bill } from '@/lib/data/bills'
import { INITIAL_DEBTS } from '@/lib/data/wealth'
import { cashDirectionOf } from '@/lib/data/wealth-cash'

/* ── Test EXPORT DATA SAYA (paket 43 · audit Stage 6 #1) ─────────────────────
   Yang dibuktikan di sini bukan "ada fungsi export", tapi:

     · jumlah baris & saldo di file SAMA dengan yang dibaca halaman (satu sumber);
     · baris yang sudah dihapus TETAP ikut (ditandai) — ekspor yang menyembunyikan
       riwayat bukan ekspor;
     · file-nya bisa diaudit: ada `exportedAt`, versi skema, dan batas jujurnya. */

const EXPORTED_AT = '2026-09-27T10:15:00.000Z'

beforeEach(() => {
  resetMoneyStore()
  /* kekayaan hidup di store sendiri (paket 50) — dikosongkan juga supaya file
     ekspor tidak mewarisi catatan dari test sebelumnya */
  resetWealthStore()
  /* tagihan juga (paket 51): ekspor kini memuat daftar tagihan dari store */
  resetBillsStore()
})

describe('buildMoneyExport', () => {
  it('memuat seluruh baris ledger, termasuk yang sudah dihapus (ditandai)', () => {
    const first = postExpense({ walletId: 'bca', amount: 85_000, note: 'Kopi' })
    const second = postExpense({ walletId: 'gopay', amount: 25_000, note: 'Parkir' })
    if (!first || !second) throw new Error('baris ledger tidak terbentuk')
    removeRow(second.id)

    const sources = collectExportSources()
    const file = buildMoneyExport(sources, EXPORTED_AT)

    expect(file.schema).toBe(EXPORT_SCHEMA)
    expect(file.schemaVersion).toBe(EXPORT_SCHEMA_VERSION)
    expect(file.exportedAt).toBe(EXPORTED_AT)
    expect(file.counts.ledgerRows).toBe(2)
    expect(file.ledgerRows).toHaveLength(2)
    expect(file.removedRowIds).toEqual([second.id])
    expect(file.ledgerRows.find((row) => row.id === second.id)?.removed).toBe(true)
    expect(file.ledgerRows.find((row) => row.id === first.id)?.removed).toBe(false)
  })

  it('saldonya identik dengan yang dibaca halaman (satu sumber hitung)', () => {
    postExpense({ walletId: 'bca', amount: 100_000, note: 'Belanja' })

    const sources = collectExportSources()
    const file = buildMoneyExport(sources, EXPORTED_AT)
    const bca = file.wallets.find((wallet) => wallet.id === 'bca')

    expect(file.totals.cash).toBe(cashTotal(getMoneySnapshot()))
    expect(bca?.balance).toBe(1_450_000 - 100_000)
  })

  it('memisahkan hutang & piutang dan menyertakan riwayat pembayarannya', () => {
    const file = buildMoneyExport(collectExportSources(), EXPORTED_AT)

    expect(file.counts.debts).toBe(INITIAL_DEBTS.filter((d) => cashDirectionOf(d) === 'out').length)
    expect(file.counts.receivables).toBe(
      INITIAL_DEBTS.filter((d) => cashDirectionOf(d) === 'in').length,
    )
    expect(file.counts.debtPayments).toBeGreaterThan(0)
    expect(file.debts.payable.length + file.debts.receivable.length).toBe(file.counts.debts + file.counts.receivables)
  })

  it('memuat hutang & investasi yang benar-benar dimiliki user (store kekayaan, paket 50)', () => {
    const created = addDebt({
      type: 'personal',
      direction: 'owed_by_me',
      counterparty: 'Dita',
      principal: 1_000_000,
      scope: 'pribadi',
    })!

    const file = buildMoneyExport(collectExportSources(), EXPORTED_AT)

    expect(getWealthSnapshot().debts.some((debt) => debt.id === created.id)).toBe(true)
    expect(file.debts.payable.some((debt) => debt.id === created.id)).toBe(true)
    expect(file.counts.debts).toBe(
      INITIAL_DEBTS.filter((debt) => cashDirectionOf(debt) === 'out').length + 1,
    )
  })

  it('memuat target bulanan, celengan, dan pengaturan privasi', () => {
    const file = buildMoneyExport(collectExportSources(), EXPORTED_AT)

    expect(file.counts.funds).toBeGreaterThan(0)
    expect(file.goals.funds.length).toBe(file.counts.funds)
    expect(file.settings.privacy).toEqual({ amountsMasked: false })
    expect(file.monthlyTarget).toBeNull()
  })

  it('memuat tagihan yang benar-benar dimiliki user (store tagihan, paket 51)', () => {
    const created: Bill = addBill({
      emoji: '🧾',
      name: 'Gym Bulanan',
      amount: 250_000,
      dueDate: 12,
      isRecurring: true,
      category: 'Tagihan',
      walletId: 'bca',
      isPaidThisMonth: false,
      reminderDaysBefore: 1,
      scope: 'pribadi',
    })

    const file = buildMoneyExport(collectExportSources(), EXPORTED_AT)

    expect(file.counts.bills).toBe(liveBills(getBillsSnapshot()).length)
    expect(file.bills.some((bill) => bill.id === created.id)).toBe(true)
    expect(file.bills).toHaveLength(INITIAL_BILLS.length + 1)
    expect(file.limits.join(' ')).toMatch(/tagihan rutin/i)
  })

  it('menuliskan batas jujurnya di dalam file (bukan cuma di komentar kode)', () => {
    const file = buildMoneyExport(collectExportSources(), EXPORTED_AT)

    expect(file.limits.length).toBeGreaterThan(2)
    expect(file.limits.join(' ')).toMatch(/tidak ada salinan di server/i)
    expect(file.app.buildStage).toBe('demo')
  })

  it('memuat dompet yang sudah dihapus, ditandai, tanpa mengubah totals.cash (paket 62)', () => {
    const removal = removeWalletAccount('tunai')!
    const sources = collectExportSources()
    const file = buildMoneyExport(sources, EXPORTED_AT)

    /* schema naik ke v4 karena bentuk filenya bertambah bagian */
    expect(file.schemaVersion).toBe(4)
    expect(file.removedWalletIds).toEqual(['tunai'])

    const tunai = file.wallets.find((wallet) => wallet.id === 'tunai')
    expect(tunai?.removed).toBe(true)
    expect(tunai?.opening).toBe(removal.balance)
    expect(file.wallets.find((wallet) => wallet.id === 'bca')?.removed).toBe(false)

    /* `totals.cash` = angka yang dibaca halaman (dompet hidup saja) */
    expect(file.totals.cash).toBe(cashTotal(getMoneySnapshot()))
    expect(file.totals.cash).toBe(1_800_000)
    /* daftar dompet tetap memuat yang dihapus → selisihnya bisa dijelaskan */
    expect(file.counts.wallets).toBeGreaterThan(
      file.wallets.filter((wallet) => !wallet.removed).length,
    )
    expect(file.limits.join(' ')).toMatch(/dompet yang kamu hapus/i)
  })

  it('Undo membalikkan ekspor: dompet hidup lagi & totals.cash kembali (paket 62)', () => {
    const removal = removeWalletAccount('tunai')!
    expect(restoreWalletAccount(removal)).toBe(true)

    const file = buildMoneyExport(collectExportSources(), EXPORTED_AT)

    expect(file.removedWalletIds).toEqual([])
    expect(file.wallets.every((wallet) => !wallet.removed)).toBe(true)
    expect(file.totals.cash).toBe(1_850_000)
  })

  it('meneruskan identitas pemilik dengan benar (null kalau belum ada sesi)', () => {
    const withoutUser = buildMoneyExport(collectExportSources(), EXPORTED_AT)
    const withUser = buildMoneyExport(
      {
        ...collectExportSources(),
        user: { id: 'u-1', name: 'Jon Snow', email: 'jon@snow.com' },
      },
      EXPORTED_AT,
    )

    expect(withoutUser.user).toBeNull()
    expect(withUser.user).toEqual({ id: 'u-1', name: 'Jon Snow', email: 'jon@snow.com' })
  })
})

describe('moneyExport Json & nama file', () => {
  it('menghasilkan JSON yang bisa diparse ulang (isi file benar-benar utuh)', () => {
    postExpense({ walletId: 'tunai', amount: 10_000, note: 'Air mineral' })

    const { fileName, content, file } = moneyExportJson(null, EXPORTED_AT)

    expect(fileName).toBe('catetind-export-2026-09-27T10-15-00-000Z.json')
    expect(JSON.parse(content)).toEqual(file)
  })

  it('nama file aman di semua OS (tanpa `:`/`.`)', () => {
    expect(moneyExportFileName(EXPORTED_AT)).not.toMatch(/[:]/)
    expect(moneyExportFileName(EXPORTED_AT).endsWith('.json')).toBe(true)
  })

  it('tanpa DOM, unduhan mengembalikan null alih-alih melempar', () => {
    expect(downloadMoneyExport(null)).toBeNull()
  })
})
