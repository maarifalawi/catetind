import { describe, expect, it } from 'vitest'
import {
  INITIAL_JOINT_TRANSACTIONS,
  JOINT_ME,
  JOINT_MONTH_KEY,
  JOINT_PARTNER,
  JOINT_TODAY_ISO,
  SETTLEMENT_CATEGORY,
  buildCarryOverEntry,
  buildSettlementEntry,
  computeSettlement,
  isSettlementTx,
  monthLabelOf,
  netPhrase,
  previousMonthKey,
  settlementCarryCopy,
  settlementEntriesFor,
  signedMoneyLabel,
  splitSpecLabel,
  splitSpecOf,
  type JointSettlementRecord,
  type JointTransaction,
} from './joint'

/* ── Test bahasa NET + settle sebagai entri ledger (audit fintech Stage 2) ────
   Fokus empat hal yang dulu tidak nyambung antara mesin & layar:

   1. NET adalah satu-satunya angka yang menentukan arah transfer — dan layar
      harus memberinya label (`+Rp X · berhak menerima` / `-Rp X · harus
      transfer`), tidak pernah nominal negatif telanjang.
   2. Label pembagian dibaca dari `SplitSpec`, jadi persen & rupiah tidak bisa
      lagi tertukar di UI.
   3. Settle MENULIS baris ledger: net jadi nol, tapi "Total Pengeluaran
      Bersama" tidak ikut membengkak.
   4. Sisa bulan lalu menyeberang sebagai baris PEMBUKA bulan berikutnya.

   File ini terpisah supaya 23 test Stage 1 (`joint.test.ts` +
   `joint-ledger.test.ts`) tetap utuh — angka yang sah sekarang tidak diubah. */

/** penanda settle contoh: Jon transfer Rp 25.000 ke Dany (angka seed repo) */
function settleRecord(partial: Partial<JointSettlementRecord> = {}): JointSettlementRecord {
  return {
    month: JOINT_MONTH_KEY,
    from: JOINT_ME.id,
    to: JOINT_PARTNER.id,
    amount: 25_000,
    method: 'BCA',
    carryOver: 0,
    ...partial,
  }
}

/** transaksi "WiFi IndiHome" Rp 350.000 yang uangnya keluar dari kantong Jon */
function wifiTx(split: JointTransaction['split']): JointTransaction {
  return {
    id: 'wifi',
    userId: JOINT_ME.id,
    paidByUserId: JOINT_ME.id,
    description: 'WiFi IndiHome',
    amount: 350_000,
    category: 'Tagihan',
    date: `${JOINT_MONTH_KEY}-23`,
    time: '09:00',
    split,
  }
}

describe('bahasa net di layar', () => {
  it('memberi tanda & arti pada nominal net', () => {
    expect(signedMoneyLabel(25_000, false)).toBe('+Rp 25.000')
    expect(signedMoneyLabel(-25_000, false)).toBe('-Rp 25.000')
    expect(signedMoneyLabel(0, false)).toBe('Rp 0')

    expect(netPhrase(25_000, false)).toBe('+Rp 25.000 · berhak menerima')
    expect(netPhrase(-25_000, false)).toBe('-Rp 25.000 · harus transfer')
    expect(netPhrase(0, false)).toBe('Rp 0 · udah impas')
  })

  it('nominal negatif tidak pernah tampil tanpa label arah', () => {
    const phrase = netPhrase(-250_000, false)
    expect(phrase.startsWith('-')).toBe(true)
    expect(phrase).toContain('harus transfer')
  })

  it('ikut toggle privasi halaman (nominal disamarkan, label tetap)', () => {
    const masked = netPhrase(25_000, true)
    expect(masked).toContain('berhak menerima')
    expect(masked).not.toContain('25.000')
  })
})

describe('splitSpecOf · bentuk kanonik vs migrasi data lama', () => {
  it('memakai `split` (SplitSpec) kalau ada — inilah yang ditulis UI', () => {
    const spec = {
      type: 'percentage' as const,
      percents: { [JOINT_ME.id]: 60, [JOINT_PARTNER.id]: 40 },
    }
    expect(splitSpecOf(wifiTx(spec))).toEqual(spec)
  })

  it('data lama (tanpa `split`) tetap dimigrasikan dari splitType/splits', () => {
    const legacy: JointTransaction = {
      ...wifiTx(undefined),
      splitType: 'percentage',
      splits: { [JOINT_ME.id]: 60, [JOINT_PARTNER.id]: 40 },
    }
    expect(splitSpecOf(legacy)).toEqual({
      type: 'percentage',
      percents: { [JOINT_ME.id]: 60, [JOINT_PARTNER.id]: 40 },
    })
  })
})

describe('label SplitSpec di kartu timeline & form', () => {
  it('persen dibaca sebagai persen, bukan rupiah', () => {
    expect(
      splitSpecLabel(
        { type: 'percentage', percents: { [JOINT_ME.id]: 60, [JOINT_PARTNER.id]: 40 } },
        JOINT_ME,
        JOINT_PARTNER,
      ),
    ).toBe('60/40')
  })

  it('nominal menampilkan rupiah dua sisi (aku dulu)', () => {
    expect(
      splitSpecLabel(
        { type: 'nominal', amounts: { [JOINT_ME.id]: 210_000, [JOINT_PARTNER.id]: 140_000 } },
        JOINT_ME,
        JOINT_PARTNER,
      ),
    ).toBe('Rp 210.000 · Rp 140.000')
  })

  it('single_payer & equal tetap singkat', () => {
    expect(
      splitSpecLabel({ type: 'single_payer', payerId: JOINT_PARTNER.id }, JOINT_ME, JOINT_PARTNER),
    ).toBe('Dany yang bayar')
    expect(splitSpecLabel({ type: 'equal' }, JOINT_ME, JOINT_PARTNER)).toBe('Bagi rata')
  })
})

describe('split 60/40 dari UI benar-benar mengubah angka timbangan', () => {
  it('sebelum — bagi rata: Jon berhak menerima Rp 175.000', () => {
    const s = computeSettlement([wifiTx({ type: 'equal' })])
    expect(s.myNet).toBe(175_000)
    expect(s.partnerNet).toBe(-175_000)
    expect(netPhrase(s.myNet, false)).toBe('+Rp 175.000 · berhak menerima')
  })

  it('sesudah — 60/40: angkanya berubah jadi Rp 140.000', () => {
    const s = computeSettlement([
      wifiTx({ type: 'percentage', percents: { [JOINT_ME.id]: 60, [JOINT_PARTNER.id]: 40 } }),
    ])
    expect(s.myOwed).toBe(210_000)
    expect(s.myNet).toBe(140_000)
    expect(netPhrase(s.partnerNet, false)).toBe('-Rp 140.000 · harus transfer')
  })
})

describe('settle = entri ledger (bukan cuma useState)', () => {
  it('barisnya memakai kantong pengirim & penerima yang benar', () => {
    const entry = buildSettlementEntry(settleRecord({ method: 'GoPay' }))

    expect(isSettlementTx(entry)).toBe(true)
    expect(entry.paidByUserId).toBe(JOINT_ME.id)
    expect(entry.userId).toBe(JOINT_ME.id)
    /* kewajiban baris ini ada di pihak penerima → net pengirim naik, net
       penerima turun, utangnya benar-benar lunas */
    expect(entry.split).toEqual({ type: 'single_payer', payerId: JOINT_PARTNER.id })
    expect(entry.settlementMethod).toBe('GoPay')
    expect(entry.category).toBe(SETTLEMENT_CATEGORY)
    expect(entry.date).toBe(JOINT_TODAY_ISO)
  })

  it('id-nya turunan record → dipulihkan berkali-kali tidak menggandakan baris', () => {
    expect(buildSettlementEntry(settleRecord()).id).toBe(buildSettlementEntry(settleRecord()).id)
  })

  it('melunasi timbangan TANPA menggelembungkan pengeluaran bersama', () => {
    const withSettle = [buildSettlementEntry(settleRecord()), ...INITIAL_JOINT_TRANSACTIONS]
    const s = computeSettlement(withSettle)

    /* lapisan pengeluaran: sama sekali tidak berubah */
    expect(s.myTotalSpent).toBe(1_135_000)
    expect(s.partnerTotalSpent).toBe(735_000)
    expect(s.totalSpent).toBe(1_870_000)

    /* lapisan net: nol → "impas" */
    expect(s.myNet).toBe(0)
    expect(s.partnerNet).toBe(0)
    expect(s.difference).toBe(0)
    expect(s.level).toBe('equal')
  })
})

describe('sisa bulan lalu dibawa sebagai pembuka bulan berikutnya', () => {
  const previous = settleRecord({ month: previousMonthKey(JOINT_MONTH_KEY), carryOver: 30_000 })

  it('baris pembuka dibalik arahnya & bertanggal di bulan baru', () => {
    const opening = buildCarryOverEntry(previous, JOINT_MONTH_KEY)

    expect(opening).not.toBeNull()
    expect(opening?.isOpening).toBe(true)
    expect(opening?.isSettlement).toBe(true)
    expect(opening?.date).toBe(`${JOINT_MONTH_KEY}-01`)
    expect(opening?.paidByUserId).toBe(JOINT_PARTNER.id)
    expect(opening?.split).toEqual({ type: 'single_payer', payerId: JOINT_ME.id })
  })

  it('menaikkan utangku di bulan baru: Rp 25.000 → Rp 55.000', () => {
    const opening = buildCarryOverEntry(previous, JOINT_MONTH_KEY)
    const s = computeSettlement([...(opening ? [opening] : []), ...INITIAL_JOINT_TRANSACTIONS])

    expect(s.myNet).toBe(-55_000)
    expect(s.settlementAmount).toBe(55_000)
    /* pembuka bukan pengeluaran → kartu "Total Bersama" tidak ikut naik */
    expect(s.myTotalSpent).toBe(1_135_000)
    expect(s.totalSpent).toBe(1_870_000)
  })

  it('tanpa sisa → tidak ada baris pembuka', () => {
    expect(buildCarryOverEntry(settleRecord({ carryOver: 0 }), JOINT_MONTH_KEY)).toBeNull()
  })

  it('settlementEntriesFor: pembuka dulu, lalu baris settle bulan ini', () => {
    const records = {
      [previous.month]: previous,
      [JOINT_MONTH_KEY]: settleRecord(),
    }
    const entries = settlementEntriesFor(records, JOINT_MONTH_KEY)

    expect(entries.map((entry) => Boolean(entry.isOpening))).toEqual([true, false])
    expect(entries.every((entry) => entry.isSettlement)).toBe(true)
  })

  it('bulan tanpa penanda sama sekali → tidak ada entri', () => {
    expect(settlementEntriesFor({}, JOINT_MONTH_KEY)).toEqual([])
  })
})

describe('mengubah split di UI mengubah angka & arah timbangan (data seed)', () => {
  it('WiFi IndiHome 60/40 → 50/50: Jon berbalik jadi berhak menerima', () => {
    const asSeed = computeSettlement(INITIAL_JOINT_TRANSACTIONS)
    expect(asSeed.myNet).toBe(-25_000)
    expect(netPhrase(asSeed.myNet, false)).toBe('-Rp 25.000 · harus transfer')

    /* id '5' = WiFi IndiHome Rp 350.000 (seed 60/40). Diubah jadi bagi rata
       lewat `split` kanonik — jalur yang sama dipakai Split Bill Sheet. */
    const wifiEqual = INITIAL_JOINT_TRANSACTIONS.map((tx) =>
      tx.id === '5' ? { ...tx, split: { type: 'equal' as const } } : tx,
    )
    const afterEdit = computeSettlement(wifiEqual)

    expect(afterEdit.myNet).toBe(10_000)
    expect(netPhrase(afterEdit.myNet, false)).toBe('+Rp 10.000 · berhak menerima')
    expect(afterEdit.whoOwes.id).toBe(JOINT_PARTNER.id)
    expect(afterEdit.whoIsOwed.id).toBe(JOINT_ME.id)
    /* `split` kanonik menang atas field lama (`splitType`/`splits`) */
    expect(afterEdit.myOwed).toBe(1_125_000)
  })
})

describe('helper bulan & copy rekap', () => {
  it('previousMonthKey menyeberang tahun dengan benar', () => {
    expect(previousMonthKey('2026-09')).toBe('2026-08')
    expect(previousMonthKey('2026-01')).toBe('2025-12')
    expect(previousMonthKey('bukan-bulan')).toBe('bukan-bulan')
  })

  it('monthLabelOf menulis bulan Indonesia tanpa locale mesin', () => {
    expect(monthLabelOf('2026-09')).toBe('September 2026')
  })

  it('copy sisa bulan lalu menyebut jumlah & bulannya', () => {
    expect(settlementCarryCopy(settleRecord({ month: '2026-08', carryOver: 30_000 }), false)).toBe(
      'Sisa bulan lalu dibawa: Rp 30.000 (dari Agustus 2026).',
    )
  })
})
