import { describe, expect, it } from 'vitest'
import {
  INITIAL_JOINT_TRANSACTIONS,
  JOINT_ME,
  JOINT_MEMBERS,
  JOINT_MONTH_KEY,
  JOINT_PARTNER,
  JOINT_TODAY_ISO,
  PRIVATE_CATEGORY,
  REALTIME_ARRIVAL,
  SETTLEMENT_THRESHOLD,
  categoryBreakdown,
  computeSettlement,
  countsForSettlement,
  hiddenPrivateBurdenOf,
  isTreat,
  ledgerTotalsOf,
  privateBurdenCopy,
  toLedgerTx,
  type JointTransaction,
} from './joint'

/* ── Test computeSettlement terhadap DATA SEED REPO INI ──────────────────────
   Regresi audit fintech #4: sistem lama bilang "Dany transfer Rp 10.000 ke Jon"
   karena hanya melihat siapa yang bayar lebih banyak dan mengabaikan split 60/40
   pada WiFi IndiHome. Angka yang benar: Jon yang harus transfer Rp 25.000 ke
   Dany — kewajibannya (Rp 1.160.000) lebih besar dari uang yang keluar dari
   kantongnya (Rp 1.135.000). */

function jointTx(
  partial: Partial<JointTransaction> & Pick<JointTransaction, 'amount' | 'splitType'>,
): JointTransaction {
  const userId = partial.userId ?? JOINT_ME.id
  return {
    id: partial.id ?? 'tx-baru',
    userId,
    paidByUserId: partial.paidByUserId ?? userId,
    description: partial.description ?? 'Catatan uji',
    amount: partial.amount,
    category: partial.category ?? 'Makanan',
    date: partial.date ?? JOINT_TODAY_ISO,
    time: partial.time ?? '12:00',
    splitType: partial.splitType,
    splits: partial.splits,
    payerId: partial.payerId,
    isPrivate: partial.isPrivate,
  }
}

describe('computeSettlement · data seed', () => {
  const settlement = computeSettlement(INITIAL_JOINT_TRANSACTIONS)

  it('membaca split 60/40 sebagai KEWAJIBAN, bukan sekadar label', () => {
    expect(settlement.myOwed).toBe(1_160_000)
    expect(settlement.partnerOwed).toBe(710_000)
    expect(settlement.myOwed + settlement.partnerOwed).toBe(settlement.totalSpent)
  })

  it('arah transfer benar: Jon yang transfer Rp 25.000 ke Dany', () => {
    expect(settlement.myNet).toBe(-25_000)
    expect(settlement.partnerNet).toBe(25_000)
    expect(settlement.whoOwes.id).toBe(JOINT_ME.id)
    expect(settlement.whoIsOwed.id).toBe(JOINT_PARTNER.id)
    expect(settlement.difference).toBe(25_000)
    /* SATU transfer, bukan setengah selisih (bug lama: 10.000) */
    expect(settlement.settlementAmount).toBe(25_000)
  })

  it('di bawah ambang Rp 100.000 → status "close", tanpa ajakan settle', () => {
    expect(settlement.difference).toBeLessThan(SETTLEMENT_THRESHOLD)
    expect(settlement.level).toBe('close')
  })

  it('panci timbangan = pengeluaran patungan (traktiran keluar)', () => {
    expect(settlement.myTotalSpent).toBe(1_135_000)
    expect(settlement.partnerTotalSpent).toBe(735_000)
    expect(settlement.totalSpent).toBe(1_870_000)
    expect(settlement.myWeighedSpent).toBe(755_000)
    expect(settlement.partnerWeighedSpent).toBe(735_000)
    expect(settlement.weighedTotal).toBe(1_490_000)
    expect(settlement.treatTotal).toBe(380_000)
    expect(settlement.weighedTotal + settlement.treatTotal).toBe(settlement.totalSpent)
  })

  it('Σ net semua anggota selalu 0 — tidak ada uang yang muncul/hilang', () => {
    const totals = ledgerTotalsOf(INITIAL_JOINT_TRANSACTIONS)
    const sum = JOINT_MEMBERS.reduce((acc, id) => acc + (totals.net[id] ?? 0), 0)
    expect(sum).toBe(0)
  })
})

describe('computeSettlement · mode split', () => {
  it('satu transaksi 60/40 saja: aku menalangi lebih → partner yang transfer', () => {
    const only = [
      jointTx({
        id: 'wifi',
        amount: 350_000,
        splitType: 'percentage',
        splits: { [JOINT_ME.id]: 60, [JOINT_PARTNER.id]: 40 },
      }),
    ]
    const s = computeSettlement(only)
    expect(s.myOwed).toBe(210_000)
    expect(s.partnerOwed).toBe(140_000)
    expect(s.myNet).toBe(140_000)
    expect(s.whoOwes.id).toBe(JOINT_PARTNER.id)
    expect(s.settlementAmount).toBe(140_000)
  })

  it('traktiran lewat mode "Nominal Custom" (porsi pasangan 0) TIDAK ditimbang', () => {
    const treat = [
      jointTx({
        id: 'traktiran-nominal',
        amount: 350_000,
        splitType: 'nominal',
        splits: { [JOINT_ME.id]: 350_000, [JOINT_PARTNER.id]: 0 },
      }),
    ]
    expect(isTreat(treat[0])).toBe(true)
    expect(countsForSettlement(treat[0])).toBe(false)
    const s = computeSettlement(treat)
    expect(s.weighedTotal).toBe(0)
    expect(s.treatTotal).toBe(350_000)
    expect(s.difference).toBe(0)
    expect(s.level).toBe('equal')
  })

  it('transaksi privat tetap masuk kewajiban (nominalnya tidak hilang dari hitungan)', () => {
    const priv = [
      jointTx({
        id: 'privat',
        userId: JOINT_PARTNER.id,
        amount: 150_000,
        splitType: 'equal',
        isPrivate: true,
      }),
    ]
    const s = computeSettlement(priv)
    expect(s.myOwed).toBe(75_000)
    expect(s.myNet).toBe(-75_000)
    expect(s.whoOwes.id).toBe(JOINT_ME.id)
  })

  it('pembayar eksplisit: catatan Dany yang ditulis Jon tetap milik Dany', () => {
    const paidByPartner = [
      jointTx({
        id: 'dibayar-dany',
        userId: JOINT_ME.id,
        paidByUserId: JOINT_PARTNER.id,
        amount: 200_000,
        splitType: 'equal',
      }),
    ]
    const s = computeSettlement(paidByPartner)
    expect(s.myTotalSpent).toBe(0)
    expect(s.partnerTotalSpent).toBe(200_000)
    expect(s.myNet).toBe(-100_000)
    expect(s.whoOwes.id).toBe(JOINT_ME.id)
  })
})

describe('computeSettlement · jendela bulan', () => {
  it('transaksi bulan lain tidak lagi menekan timbangan bulan ini', () => {
    const withJuly = [
      ...INITIAL_JOINT_TRANSACTIONS,
      jointTx({ id: 'juli', amount: 1_000_000, splitType: 'equal', date: '2026-07-01' }),
    ]
    const after = computeSettlement(withJuly)
    const jul = computeSettlement(withJuly, { month: '2026-07' })

    expect(after.month).toBe(JOINT_MONTH_KEY)
    expect(after.difference).toBe(25_000)
    expect(after.totalSpent).toBe(1_870_000)
    expect(jul.totalSpent).toBe(1_000_000)
    expect(jul.myNet).toBe(500_000)
  })
})

describe('computeSettlement · realtime partner', () => {
  it('transaksi partner yang masuk menaikkan nominal transfer ke Rp 250.000', () => {
    const withArrival = [REALTIME_ARRIVAL, ...INITIAL_JOINT_TRANSACTIONS]
    const s = computeSettlement(withArrival)
    expect(s.myNet).toBe(-250_000)
    expect(s.settlementAmount).toBe(250_000)
    expect(s.level).toBe('settle')
  })
})

describe('pemetaan ke ledger', () => {
  it('paidByUserId kosong (data lama) → dianggap pembuat catatan', () => {
    const legacy = jointTx({ id: 'lama', amount: 10_000, splitType: 'equal' })
    expect(toLedgerTx({ ...legacy, paidByUserId: undefined }).payerId).toBe(JOINT_ME.id)
  })
})


/* ── PRIVASI NOMINAL DI RINCIAN BERSAMA (paket 41, audit Stage 4 #6) ─────────
   Sebelum paket ini, nominal transaksi 🔒 privat milik pasangan tampil sebagai
   irisan "🔒 Privat Rp 150.000" di kartu rincian bersama: nominalnya bocor,
   sementara Jon tetap ditagih separuhnya tanpa tahu alasannya. Sekarang irisan
   itu hilang dari rincian, dan beban yang benar-benar ditanggung Jon diucapkan
   terang sebagai pengungkapan. */

describe('rincian kategori & pengungkapan privat', () => {
  it('irisan nominal privat milik pasangan TIDAK lagi muncul di rincian bersama', () => {
    const total = categoryBreakdown(INITIAL_JOINT_TRANSACTIONS)
    const partnerCard = categoryBreakdown(INITIAL_JOINT_TRANSACTIONS, JOINT_PARTNER.id)

    expect(total.some((slice) => slice.category === PRIVATE_CATEGORY)).toBe(false)
    expect(partnerCard.some((slice) => slice.category === PRIVATE_CATEGORY)).toBe(false)
    /* yang terlihat tetap lengkap: tidak ada kategori sah yang ikut terbuang */
    expect(total.map((slice) => slice.category)).toContain('Makanan')
    expect(total.map((slice) => slice.category)).toContain('Tagihan')
  })

  it('pemiliknya sendiri tetap bisa melihat nominal privatnya (sebagai satu irisan anonim)', () => {
    const mine = categoryBreakdown(INITIAL_JOINT_TRANSACTIONS, JOINT_PARTNER.id, {
      viewerId: JOINT_PARTNER.id,
    })
    const privat = mine.find((slice) => slice.category === PRIVATE_CATEGORY)
    expect(privat?.amount).toBe(150_000)
  })

  it('pengungkapan menyebut Rp 75.000 dari 1 catatan yang tidak bisa dilihat', () => {
    const burden = hiddenPrivateBurdenOf(INITIAL_JOINT_TRANSACTIONS, { viewerId: JOINT_ME.id })
    expect(burden).toEqual({ amount: 75_000, count: 1 })
    expect(privateBurdenCopy(burden, false)).toBe(
      'Kamu menanggung Rp 75.000 dari 1 catatan yang tidak bisa kamu lihat.',
    )
    /* nominalnya ikut tersensor saat privasi halaman dinyalakan */
    expect(privateBurdenCopy(burden, true)).not.toContain('75.000')
  })

  it('tanpa catatan privat tersembunyi → tidak ada kalimat pengungkapan', () => {
    const tanpa = INITIAL_JOINT_TRANSACTIONS.filter((tx) => !tx.isPrivate)
    const burden = hiddenPrivateBurdenOf(tanpa, { viewerId: JOINT_ME.id })
    expect(burden).toEqual({ amount: 0, count: 0 })
    expect(privateBurdenCopy(burden, false)).toBe('')
  })
})

describe('PRIVATE_EXPENSE_POLICY mengubah angka settlement (bisa dibalik satu baris)', () => {
  it("default 'shared': angka seed TIDAK berubah (Rp 25.000 tetap jadi arah transfer)", () => {
    const settlement = computeSettlement(INITIAL_JOINT_TRANSACTIONS)
    expect(settlement.myOwed).toBe(1_160_000)
    expect(settlement.myNet).toBe(-25_000)
    expect(settlement.difference).toBe(25_000)
  })

  it("'excluded': belanja privat keluar dari buku besar bersama", () => {
    const settlement = computeSettlement(INITIAL_JOINT_TRANSACTIONS, {
      privatePolicy: 'excluded',
    })

    /* kewajiban Jon turun 75.000 (separuh dari 150.000 milik Dany) */
    expect(settlement.myOwed).toBe(1_085_000)
    expect(settlement.partnerOwed).toBe(635_000)
    /* berat panci juga turun, dan arah transfer berbalik ke Dany */
    expect(settlement.myWeighedSpent).toBe(755_000)
    expect(settlement.partnerWeighedSpent).toBe(585_000)
    expect(settlement.myNet).toBe(50_000)
    expect(settlement.whoOwes.id).toBe(JOINT_PARTNER.id)
    /* Σ net tetap 0 — uang tidak pernah muncul/hilang */
    const totals = ledgerTotalsOf(INITIAL_JOINT_TRANSACTIONS, { privatePolicy: 'excluded' })
    expect(JOINT_MEMBERS.reduce((acc, id) => acc + (totals.net[id] ?? 0), 0)).toBe(0)
    /* dan tidak ada yang perlu diungkapkan: tidak ada tanggungannya */
    expect(
      hiddenPrivateBurdenOf(INITIAL_JOINT_TRANSACTIONS, {
        viewerId: JOINT_ME.id,
        privatePolicy: 'excluded',
      }),
    ).toEqual({ amount: 0, count: 0 })
  })

  it("'excluded' juga mengeluarkan privat dari berat timbangan (countsForSettlement)", () => {
    const privat = INITIAL_JOINT_TRANSACTIONS.find((tx) => tx.isPrivate)!
    expect(countsForSettlement(privat, { privatePolicy: 'shared' })).toBe(true)
    expect(countsForSettlement(privat, { privatePolicy: 'excluded' })).toBe(false)
  })
})

