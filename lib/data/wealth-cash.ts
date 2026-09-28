import { formatIDR } from '../wallets'
import type { LedgerRowType } from '../money/ledger'
import type { BudgetScope } from './budget'
import type { Debt, DebtDirection } from './wealth'

/* ── UTANG/PIUTANG YANG MENYENTUH KAS (paket 41) ─────────────────────────────
   Modul MURNI (tanpa React, tanpa state) yang menjawab SATU pertanyaan:
   "kalau user menekan Catat Bayar / Diterima dengan nominal sekian, baris kas
   apa yang harus lahir, dan apa yang berubah di catatan hutangnya?"

   KENAPA MODUL INI ADA
   Audit fintech Stage 4 menemukan bug paling mahal di halaman Kekayaan:
   "Catat Bayar" hanya mengurangi `debt.remaining` TANPA mendebit dompet. Karena
   Net Worth = kas + investasi − hutang, setiap pelunasan Rp 500.000 menaikkan
   Net Worth Rp 500.000 seolah user dapat uang gratis. Sekarang setiap pelunasan
   WAJIB punya baris ledger (`lib/money/ledger.ts`) lewat `postDebtSettlement()`
   di `lib/money/store.ts`, dan perencana barisnya ada di sini supaya bisa diuji
   tanpa browser.

   SEMANTIK KEMBALIAN (dipilih satu, dipakai konsisten + diuji)
   -----------------------------------------------------------
   Baris `change` SELALU mengikuti uang yang BENAR-BENAR berpindah tangan:

     · Terima pelunasan piutang Rp 50.000 tapi yang diserahkan Rp 100.000
       → kas MASUK Rp 100.000: `receivable_payment` Rp 50.000 (piutang lunas)
         + `change` +Rp 50.000 = uang milik orang lain yang masih di tangan kita,
         jadi lahir catatan `owed_by_me` ("harus kamu kembalikan").

     · Bayar hutang Rp 50.000 tapi kita menyerahkan Rp 100.000
       → kas KELUAR Rp 100.000: `debt_payment` Rp 50.000 (hutang lunas)
         + `change` −Rp 50.000 = kelebihan yang masih dipegang lawan, jadi lahir
         catatan `owed_to_me` ("harus kamu terima").

   Konsekuensi yang penting dan diuji: catatan kembalian itu membuat
   `settlementNetWorthEffect()` selalu 0 — pelunasan (pas, sebagian, maupun lebih
   bayar) TIDAK PERNAH mengubah Net Worth. Tanpa catatan itu, kelebihan bayar
   akan membuat Net Worth melompat tanpa dasar.

   🚧 Produksi: perencana ini berjalan di klien lalu dikirim sebagai
   `POST /api/debt-payments` (tabel `debt_payments` + baris `transactions`), dan
   server mengulang perhitungan yang sama sebagai sumber kebenaran. */

/** arah uang dari sudut pandang user: `out` = kita bayar, `in` = kita menerima */
export type CashDirection = 'out' | 'in'

/** satu baris ledger yang siap ditulis (dompetnya diisi store, bukan di sini) */
export interface SettlementRowDraft {
  type: LedgerRowType
  /** `debt_payment`/`receivable_payment` selalu > 0; `change` bertanda */
  amount: number
}

/**
 * Catatan lawan yang lahir dari kembalian. `owed_by_me` = kembalian yang masih
 * di tangan kita dan harus dikembalikan; `owed_to_me` = kelebihan yang masih
 * dipegang lawan dan harus kita terima.
 */
export interface ChangeRecordDraft {
  direction: DebtDirection
  amount: number
  counterparty: string
  notes: string
}

export interface SettlementPlan {
  direction: CashDirection
  /** nominal yang memang menjadi kewajiban/hak (sisa catatannya) */
  owedAmount: number
  /** nominal yang benar-benar menghapus kewajiban/hak */
  settledAmount: number
  /** sisa catatan setelah transaksi ini (belum tentu 0 kalau bayarnya sebagian) */
  remaining: number
  settled: boolean
  /** uang yang benar-benar berpindah tangan (bisa lebih besar dari `settledAmount`) */
  cashMoved: number
  changeAmount: number
  changeDirection: CashDirection | 'none'
  /** catatan baris kembalian untuk Riwayat (`''` kalau bayarnya pas) */
  changeNote: string
  /** baris ledger yang harus ditulis, urut: pelunasan lalu kembalian */
  rows: SettlementRowDraft[]
  changeRecord: ChangeRecordDraft | null
}

/**
 * Rencana pelunasan hutang/piutang. `null` = permintaan tidak sah (nominal nol,
 * bukan rupiah bulat, atau catatannya sudah lunas) — store menolak menulis apa
 * pun, jadi tidak ada saldo yang bergerak tanpa catatan.
 */
export function planDebtSettlement(input: {
  direction: CashDirection
  /** sisa kewajiban/hak yang tercatat di catatan hutang */
  owedAmount: number
  /** nominal yang benar-benar diserahkan/diterima user (boleh lebih) */
  paidAmount: number
  /** nama pihak lawan/platform untuk kalimat kembalian */
  counterparty: string
}): SettlementPlan | null {
  const owed = Math.round(input.owedAmount)
  const paid = Math.round(input.paidAmount)
  if (!Number.isFinite(owed) || !Number.isFinite(paid)) return null
  if (owed <= 0 || paid <= 0) return null

  const settledAmount = Math.min(owed, paid)
  const remaining = owed - settledAmount
  const changeAmount = paid - owed
  const changeDirection: CashDirection | 'none' = changeAmount > 0 ? input.direction : 'none'

  const primaryType: LedgerRowType =
    input.direction === 'out' ? 'debt_payment' : 'receivable_payment'
  const rows: SettlementRowDraft[] = [{ type: primaryType, amount: settledAmount }]

  if (changeAmount > 0) {
    /* tanda mengikuti arah uang: `out` = kita menyerahkan kelebihan (kas keluar),
       `in` = kita menerima kelebihan (kas masuk) */
    rows.push({
      type: 'change',
      amount: input.direction === 'out' ? -changeAmount : changeAmount,
    })
  }

  return {
    direction: input.direction,
    owedAmount: owed,
    settledAmount,
    remaining,
    settled: remaining === 0,
    cashMoved: settledAmount + Math.max(0, changeAmount),
    changeAmount: Math.max(0, changeAmount),
    changeDirection,
    changeNote:
      changeAmount > 0 ? changeNoteFor(input.direction, changeAmount, input.counterparty) : '',
    rows,
    changeRecord:
      changeAmount > 0
        ? {
            /* uang lebih diterima → ada di kas kita → kita yang mengembalikan;
               uang lebih diserahkan → dipegang lawan → kita yang menagih */
            direction: input.direction === 'in' ? 'owed_by_me' : 'owed_to_me',
            amount: changeAmount,
            counterparty: input.counterparty,
            notes:
              input.direction === 'in'
                ? `Kembalian dari pelunasan piutang ${input.counterparty}`
                : `Kembalian dari pembayaran ke ${input.counterparty}`,
          }
        : null,
  }
}

/** kalimat kembalian untuk baris ledger — menyebut siapa yang harus bayar */
function changeNoteFor(direction: CashDirection, amount: number, counterparty: string): string {
  return direction === 'in'
    ? `Kembalian ${formatIDR(amount)} yang harus kamu kembalikan ke ${counterparty}`
    : `Kembalian ${formatIDR(amount)} dari ${counterparty} yang harus kamu terima`
}


/** catatan hutang/piutang setelah pelunasan — satu-satunya cara `remaining` berubah */
export function applySettlement(debt: Debt, plan: SettlementPlan): Debt {
  return {
    ...debt,
    remaining: plan.remaining,
    status: plan.settled ? 'settled' : 'active',
  }
}

/**
 * Catatan baru dari kembalian — `null` kalau uangnya pas (tidak ada selisih).
 *
 * Tanpa catatan ini, kembalian hanya "kelihatan" dari selisih saldo, dan Net
 * Worth user melompat: kelebihan yang diterima menaikkan kas tanpa kewajiban
 * apa pun (padahal uangnya bukan milik kita), dan kelebihan yang diserahkan
 * menurunkan kas tanpa hak tagih yang tercatat. Karena itu arahnya dibalik:
 * uang lebih yang DITERIMA jadi hutang kita, uang lebih yang DISERAHKAN jadi
 * piutang kita.
 *
 * `scope` (paket 47) WAJIB dikirim pemanggil dan bukan default diam-diam:
 * catatan kembalian mewarisi konteks uang hutang yang dilunasi (`debt.scope`),
 * jadi kembalian dari hutang bersama tidak pernah muncul sebagai hutang pribadi.
 */
export function changeDebtFrom(plan: SettlementPlan, id: string, scope: BudgetScope): Debt | null {
  const record = plan.changeRecord
  if (!record) return null
  return {
    id,
    type: 'personal',
    direction: record.direction,
    counterparty: record.counterparty,
    principal: record.amount,
    remaining: record.amount,
    notes: record.notes,
    status: 'active',
    scope,
  }
}

/**
 * Efek satu pelunasan terhadap NET WORTH (`kas + investasi + piutang − hutang`).
 *
 * Selalu 0, dan itu memang tujuan paket ini: uang pindah, kewajiban ikut turun —
 * yang berubah hanya bentuknya (kas ↔ piutang), bukan total kekayaannya.
 * Fungsi ini ada supaya janji itu bisa diuji, bukan cuma ditulis di komentar.
 */
export function settlementNetWorthEffect(direction: CashDirection, plan: SettlementPlan): number {
  const cashDelta = direction === 'out' ? -plan.cashMoved : plan.cashMoved
  const liabilityDelta = direction === 'out' ? -plan.settledAmount : 0
  const receivableDelta = direction === 'in' ? -plan.settledAmount : 0
  const changeLiability = plan.changeRecord?.direction === 'owed_by_me' ? plan.changeRecord.amount : 0
  const changeReceivable = plan.changeRecord?.direction === 'owed_to_me' ? plan.changeRecord.amount : 0
  return cashDelta + receivableDelta + changeReceivable - liabilityDelta - changeLiability
}

/** arah kas satu catatan: piutang (orang lain hutang ke kita) = uang MASUK */
export function cashDirectionOf(debt: Debt): CashDirection {
  return debt.direction === 'owed_to_me' ? 'in' : 'out'
}

/** nominal yang diisikan sheet sebagai titik awal (user tetap bisa mengubahnya) */
export function defaultCashAmount(debt: Debt): number {
  if (cashDirectionOf(debt) === 'in') return debt.remaining
  /* platform: cicilan bulanannya; personal: seluruh sisanya */
  return debt.monthlyInstallment ?? debt.remaining
}

/** nama yang disebut di judul sheet & kalimat kembalian */
export function settlementCounterparty(debt: Debt): string {
  return debt.provider ?? debt.counterparty ?? 'Teman'
}

/**
 * Nama baris ledger yang dibaca user di Riwayat. Sengaja menyebut arah uangnya
 * ("Bayar Kredivo" / "Terima dari Rina") supaya baris kas ini tidak pernah
 * terlihat seperti transaksi misterius di daftar Riwayat.
 */
export function settlementNote(direction: CashDirection, counterparty: string): string {
  return direction === 'out' ? `Bayar ${counterparty}` : `Terima dari ${counterparty}`
}

/**
 * Kategori baris kas utang/piutang. Nilainya WAJIB salah satu label kanon
 * `TRANSACTION_CATEGORY_OPTIONS` (`lib/data/history.ts`): kategori baru yang
 * tidak ada di daftar itu tidak akan terjaring filter mana pun di Riwayat —
 * jadi lebih baik memakai "Tagihan" (hutang) & "Lainnya" (piutang/kembalian)
 * daripada mengarang label.
 */
export const DEBT_CASH_CATEGORY: Record<'debt_payment' | 'receivable_payment' | 'change', string> = {
  debt_payment: 'Tagihan',
  receivable_payment: 'Lainnya',
  change: 'Lainnya',
}


/* ── COPY (satu sumber untuk sheet bayar/terima) ─────────────────────────────
   Semua kalimat dialog hidup di sini, bukan di JSX: nominal & arah uang
   (bayar vs terima) ikut menentukan nadanya, jadi satu-satunya tempat yang tahu
   bedanya adalah modul yang menghitungnya. */
export const DEBT_CASH_COPY = {
  pay: {
    title: (name: string) => `Catat Bayar ${name}`,
    description:
      'Pembayaran langsung mendebit dompet yang kamu pilih — uangnya benar-benar keluar, dan sisa hutangnya ikut menyusut.',
    amountLabel: 'Nominal dibayar',
    walletLabel: 'Dompet sumber',
    submit: 'Simpan Pembayaran ✓',
    toastTitle: (name: string) => `Pembayaran ${name} dicatat! 💪`,
    toastShrinking: 'Bar snowball-mu langsung menyusut.',
    toastSettled: 'Hutang ini lunas! 🎉',
  },
  receive: {
    title: (name: string) => `Terima dari ${name}`,
    description:
      'Uangnya langsung masuk ke dompet yang kamu pilih, dan piutangnya berkurang — bukan cuma ditandai lunas.',
    amountLabel: 'Nominal diterima',
    walletLabel: 'Dompet tujuan',
    submit: 'Simpan Penerimaan ✓',
    toastTitle: (name: string) => `Pelunasan dari ${name} dicatat! 🌿`,
    toastShrinking: 'Piutangmu langsung berkurang.',
    toastSettled: 'Piutang ini lunas! 🎉',
  },
  /** `Sisa setelah transaksi ini: Rp 0 — langsung LUNAS! 🎉` */
  remainingLine: (value: string, settled: boolean) =>
    `Sisa setelah transaksi ini: ${value}${settled ? ' — langsung LUNAS! 🎉' : ''}`,
  /** pengingat bahwa kas-nya benar-benar bergerak */
  cashOutLine: (value: string, walletName: string) =>
    `${value} akan benar-benar keluar dari ${walletName}.`,
  cashInLine: (value: string, walletName: string) =>
    `${value} akan masuk ke ${walletName}.`,
  dateLabel: 'Tanggal transaksi',
  /** label tombol aksi di kartu (piutang = uang masuk, hutang = uang keluar) */
  actionLabel: {
    pay: 'Catat Bayar',
    receive: 'Diterima',
  },
  /** penanda arah di baris riwayat pembayaran (uang MASUK ke dompet) */
  receivableTag: 'Diterima',
  /** kembalian yang masih di tangan kita → jadi hutang kita */
  changeReturned: (value: string, name: string) =>
    `Kamu menerima ${value} lebih dari piutangnya. Kembalian itu dicatat sebagai hutangmu ke ${name} — uangnya bukan milik kita, jadi harus dikembalikan.`,
  /** kembalian yang masih dipegang lawan → jadi piutang kita */
  changePending: (value: string, name: string) =>
    `Kamu menyerahkan ${value} lebih dari sisa hutangnya. Kembalian itu dicatat sebagai piutang ke ${name} supaya tidak lupa ditagih.`,
  insufficient: (walletName: string) =>
    `Saldo ${walletName} gak cukup untuk ini. Pilih dompet lain atau catat nominal yang lebih kecil.`,
  /** saldo dompet terpilih — supaya user tahu batasnya sebelum menekan simpan */
  walletBalance: (value: string) => `Saldo sekarang ${value}`,
  noWallet: 'Belum ada dompet yang bisa dipakai. Tambah dompet dulu di halaman Dompet & Akun.',
  invalid: 'Nominalnya belum sah — isi angka rupiah lebih dari nol.',
  changeRecorded: (value: string) => `Kembalian ${value} ikut tercatat sebagai catatan baru.`,
} as const

