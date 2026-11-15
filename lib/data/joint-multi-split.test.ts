import { describe, expect, it } from 'vitest'
import { computeSettlement, toLedgerTx, type JointPerson, type JointTransaction } from './joint'
import { isValidSplit, ledgerTotals, sharesOf } from './joint-ledger'
import { toJointTransaction, toSplitColumns } from '@/lib/supabase/mappers'

/* ── PEMBAGIAN FLEKSIBEL 3–4 ORANG — BUKTI LEWAT PEMETAAN SERVER ─────────────
   Test ini mengunci satu janji yang gampang rusak: porsi yang dipilih di
   perangkat SATU harus menghasilkan angka yang SAMA di perangkat anggota lain.
   Karena itu setiap kasus dijalankan dua kali — sekali dari objek domain yang
   dibuat penginput, sekali dari baris database yang sudah melewati
   `toSplitColumns()` (tulis) lalu `toJointTransaction()` (baca). */

const A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const C = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const D = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
const MEMBERS = [A, B, C, D]
const MONTH = '2026-11'

function person(id: string, name: string): JointPerson {
  return {
    id,
    name,
    avatar: '🧑',
    tint: 'bg-sage/70 text-forest ring-soil/10',
    dot: 'bg-hud-sage',
    rail: 'bg-hud-sage',
  }
}

const PEOPLE = [person(A, 'Ani'), person(B, 'Bayu'), person(C, 'Citra'), person(D, 'Dewi')]

function note(over: Partial<JointTransaction> & Pick<JointTransaction, 'id' | 'amount' | 'split'>) {
  return {
    userId: A,
    paidByUserId: A,
    description: 'Makan bareng',
    category: 'Makanan',
    date: `${MONTH}-20`,
    time: '19:30',
    ...over,
  } satisfies JointTransaction
}

/**
 * Baris domain → baris `joint_transactions_public` → domain lagi.
 *
 * Ini persis dua hop yang dilalui catatan sungguhan: `pushJointTransactionToServer`
 * menulis kolom split, lalu perangkat anggota lain membacanya lewat
 * `toJointTransaction`. Kalau kolom peserta (`split_members`) lupa dipetakan,
 * angka di perangkat lain pasti berbeda dan test ini gagal.
 */
function throughServer(tx: JointTransaction, viewerId = A): JointTransaction {
  const cols = toSplitColumns(tx.split ?? { type: 'equal' })
  return toJointTransaction(
    {
      id: tx.id,
      joint_wallet_id: 'wallet-1',
      user_id: tx.userId,
      paid_by_user_id: tx.paidByUserId ?? tx.userId,
      description: tx.description,
      amount: tx.amount,
      category: tx.category,
      date: tx.date,
      time_label: tx.time,
      split_type: cols.split_type,
      split_percents: cols.split_percents,
      split_amounts: cols.split_amounts,
      split_members: cols.split_members,
      is_private: false,
      is_settlement: false,
      kind: tx.kind === 'income' ? 'income' : 'expense',
    },
    viewerId,
  )
}

function totals(rows: JointTransaction[]) {
  return ledgerTotals(rows.map(toLedgerTx), MEMBERS)
}

function transfersOf(rows: JointTransaction[]) {
  return computeSettlement(rows, {
    month: MONTH,
    members: MEMBERS,
    people: PEOPLE,
    viewerId: A,
  }).transfers.map((row) => ({
    from: row.from.id,
    to: row.to.id,
    amount: row.amount,
  }))
}

describe('Bagi Rata sebagian anggota (3 dari 4 orang)', () => {
  const local = note({
    id: 'equal-3',
    amount: 360_000,
    split: { type: 'equal', participants: [A, B, C] },
  })

  it('porsi hanya jatuh ke peserta; anggota keempat nol dan Σ = nominal', () => {
    const shares = sharesOf(toLedgerTx(local), MEMBERS)
    expect(shares).toEqual({ [A]: 120_000, [B]: 120_000, [C]: 120_000, [D]: 0 })
    expect(Object.values(shares).reduce((a, b) => a + b, 0)).toBe(local.amount)
    expect(isValidSplit(local.split!, MEMBERS, local.amount)).toBe(true)
  })

  it('kolom server membawa peserta & perangkat lain menghitung angka identik', () => {
    const columns = toSplitColumns(local.split!)
    expect(columns.split_type).toBe('equal')
    expect(columns.split_members).toEqual([A, B, C])

    const remote = throughServer(local)
    expect(remote.split).toEqual({ type: 'equal', participants: [A, B, C] })

    expect(totals([remote]).net).toEqual(totals([local]).net)
    expect(transfersOf([remote])).toEqual(transfersOf([local]))
    /* Bayu & Citra masing-masing 120rb ke Ani; Dewi tidak ikut menanggung. */
    expect(transfersOf([remote])).toEqual([
      { from: B, to: A, amount: 120_000 },
      { from: C, to: A, amount: 120_000 },
    ])
  })

  it('peserta di luar anggota dompet ditolak validasi', () => {
    expect(
      isValidSplit({ type: 'equal', participants: [A, 'orang-luar'] }, MEMBERS, 360_000),
    ).toBe(false)
  })
})

describe('Persentase multi-anggota (4 orang)', () => {
  const local = note({
    id: 'percent-4',
    paidByUserId: D,
    amount: 400_000,
    split: {
      type: 'percentage',
      percents: { [A]: 25, [B]: 25, [C]: 25, [D]: 25 },
    },
  })

  it('Σ persen = 100 & tiap orang menanggung 100rb', () => {
    expect(isValidSplit(local.split!, MEMBERS, local.amount)).toBe(true)
    expect(sharesOf(toLedgerTx(local), MEMBERS)).toEqual({
      [A]: 100_000,
      [B]: 100_000,
      [C]: 100_000,
      [D]: 100_000,
    })
  })

  it('setelah pemetaan server, net & rencana transfer sama persis', () => {
    const remote = throughServer(local, B)
    expect(remote.split).toEqual(local.split)

    const localTotals = totals([local])
    const remoteTotals = totals([remote])
    expect(remoteTotals.net).toEqual(localTotals.net)
    expect(localTotals.net).toEqual({
      [A]: -100_000,
      [B]: -100_000,
      [C]: -100_000,
      [D]: 300_000,
    })
    expect(transfersOf([remote])).toEqual(transfersOf([local]))
  })

  it('persentase yang tidak berjumlah 100 ditolak', () => {
    expect(
      isValidSplit(
        { type: 'percentage', percents: { [A]: 25, [B]: 25, [C]: 25, [D]: 20 } },
        MEMBERS,
        400_000,
      ),
    ).toBe(false)
  })
})

describe('Nominal custom multi-anggota (4 orang)', () => {
  const local = note({
    id: 'nominal-4',
    paidByUserId: C,
    amount: 400_000,
    split: {
      type: 'nominal',
      amounts: { [A]: 50_000, [B]: 100_000, [C]: 150_000, [D]: 100_000 },
    },
  })

  it('Σ nominal wajib tepat sama dengan nominal transaksi', () => {
    expect(isValidSplit(local.split!, MEMBERS, 400_000)).toBe(true)
    expect(isValidSplit(local.split!, MEMBERS, 399_999)).toBe(false)
    expect(sharesOf(toLedgerTx(local), MEMBERS)).toEqual({
      [A]: 50_000,
      [B]: 100_000,
      [C]: 150_000,
      [D]: 100_000,
    })
  })

  it('hasil impas identik setelah baris dibaca ulang dari server', () => {
    const remote = throughServer(local, D)
    expect(remote.split).toEqual(local.split)

    const localTotals = totals([local])
    const remoteTotals = totals([remote])
    expect(remoteTotals.net).toEqual(localTotals.net)
    expect(localTotals.net).toEqual({
      [A]: -50_000,
      [B]: -100_000,
      [C]: 250_000,
      [D]: -100_000,
    })
    expect(transfersOf([remote])).toEqual(transfersOf([local]))
  })
})

describe('Pelunasan per pasangan lewat pemetaan server', () => {
  it('baris settle mengenali pembayar B & penerima manfaat 100% A', () => {
    const settle = toJointTransaction(
      {
        id: 'settle-b-a',
        joint_wallet_id: 'wallet-1',
        user_id: B,
        paid_by_user_id: B,
        description: 'Settle 2026-11',
        amount: 100_000,
        category: 'Settle',
        date: `${MONTH}-25`,
        time_label: '20:30',
        split_type: 'single_payer',
        split_percents: null,
        split_amounts: null,
        split_members: null,
        bearer_id: A,
        settle_to_user_id: A,
        is_settlement: true,
        kind: 'expense',
      },
      A,
    )

    expect(settle.paidByUserId).toBe(B)
    expect(settle.isSettlement).toBe(true)
    expect(settle.split).toEqual({ type: 'single_payer', payerId: A })

    /* utang B lunas, utang C & D tidak tersentuh */
    const net = totals([settle]).net
    expect(net[B]).toBe(100_000)
    expect(net[A]).toBe(-100_000)
    expect(net[C]).toBe(0)
    expect(net[D]).toBe(0)
  })
})

describe('Pemasukan bersama pada grup 4 orang', () => {
  it('tidak menimbulkan kewajiban & hanya menambah talangan penyetor', () => {
    const income = note({
      id: 'income-4',
      paidByUserId: B,
      amount: 240_000,
      kind: 'income',
      split: { type: 'equal' },
    })
    const remote = throughServer(income, C)
    expect(remote.kind).toBe('income')

    const net = totals([remote]).net
    expect(net[B]).toBe(240_000)
    expect(net[A]).toBe(0)
    expect(net[C]).toBe(0)
    expect(net[D]).toBe(0)
    /* pemasukan tidak menagih siapa pun: porsi semua orang nol */
    expect(sharesOf(toLedgerTx(remote), MEMBERS)).toEqual({ [A]: 0, [B]: 0, [C]: 0, [D]: 0 })
  })
})
