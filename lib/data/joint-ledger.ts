/* ── Mesin akuntansi dompet bersama (satu sumber kebenaran) ──────────────────
   Modul ini MURNI angka — tanpa React, tanpa mock, tanpa tanggal global —
   supaya bisa diuji langsung (`lib/data/joint-ledger.test.ts`).

   KENAPA DIPISAH DARI `joint.ts`
   `joint.ts` dulu menyimpulkan utang dari "berapa uang yang keluar dari tiap
   kantong" (`paidBy`) saja, sehingga rasio pembagian (`splits`) hanya hidup di
   label: split 60/40 tercatat, tapi timbangan tetap menganggap 50/50. Akibatnya
   arah & nominal transfer bisa salah — pada data seed repo ini, sistem lama
   bilang "Dany transfer Rp 10.000 ke Jon", padahal Jon yang seharusnya
   transfer Rp 25.000 ke Dany.

   MODEL YANG BENAR (double-entry 2 orang):
     kewajiban(tx, orang) = porsi yang SEHARUSNYA dia tanggung (dari SplitSpec)
     bayar(tx, orang)     = uang yang benar-benar keluar dari kantongnya
     net(orang)           = Σ bayar − Σ kewajiban
   `net > 0` → menalangi lebih dari porsinya → BERHAK MENERIMA
   `net < 0` → menalangi kurang              → HARUS TRANSFER
   Invariant yang selalu dijaga: Σ net semua anggota === 0 (uang tidak pernah
   hilang/muncul) dan Σ kewajiban satu transaksi === nominal transaksinya.

   TRAKTIRAN tidak butuh aturan khusus lagi: pada `single_payer` (atau nominal
   yang porsi pasangannya 0) kewajiban pihak lain = 0 → net-nya otomatis 0.
   Ini sekaligus menutup lubang lama "traktiran yang ditulis lewat mode Nominal
   Custom tetap ikut ditimbang". */

/** id anggota dompet bersama — urutan array TIDAK memengaruhi hasil */
export type LedgerMemberId = string

/**
 * Spesifikasi pembagian — DISCRIMINATED UNION.
 *
 * Inilah perbaikan penting dibanding `splits: Record<string, number>` milik UI
 * lama: di sana persen (60) dan rupiah (60_000) menempati field yang SAMA dan
 * hanya dibedakan `splitType`, sehingga satu salah baca = tagihan hancur.
 * Sekarang bentuk datanya sendiri yang memaksa benar.
 */
export type SplitSpec =
  | { type: 'equal' }
  | { type: 'percentage'; percents: Record<LedgerMemberId, number> }
  | { type: 'nominal'; amounts: Record<LedgerMemberId, number> }
  | { type: 'single_payer'; payerId: LedgerMemberId }

/** satu baris buku besar dompet bersama */
export interface LedgerTx {
  id: string
  /** kantong yang KELUAR uang — bukan "siapa yang mengetik catatannya" */
  payerId: LedgerMemberId
  /** siapa yang mengetik catatan (dipakai untuk izin/privasi, bukan uang) */
  createdByUserId: LedgerMemberId
  /** nominal, selalu positif */
  amount: number
  split: SplitSpec
  /** tanggal lokal `YYYY-MM-DD` */
  date: string
  /** true = itemnya cuma terlihat pembuatnya (TIDAK mengubah kewajiban) */
  isPrivate?: boolean
  /**
   * Pemilik transaksi privat. Kalau kosong, pemiliknya = `createdByUserId`
   * (data lama/seed). Dipakai untuk menentukan apakah seorang anggota boleh
   * melihat isi catatannya — lihat `isHiddenFrom()`.
   */
  privateForUser?: LedgerMemberId
}

/** toleransi pembulatan rupiah — uang terkecil yang bisa berpindah */
export const RUPIAH_EPSILON = 1

/* ── KEBIJAKAN TRANSAKSI PRIVAT (paket 41) ───────────────────────────────────
   Keputusan produk yang dulu diambil DIAM-DIAM dan sekarang jadi satu konstanta
   supaya bisa dibalik satu baris + diuji dua-duanya:

     'shared'   (DEFAULT) — nominal transaksi privat TETAP ikut kewajiban bersama.
                 Pasangan memang menanggung sebagiannya, jadi angkanya tidak
                 disembunyikan; yang disembunyikan hanya ISI catatannya. Karena
                 itu UI WAJIB menampilkan pengungkapan ("kamu menanggung Rp X dari
                 N catatan yang tidak bisa kamu lihat") supaya tidak ada tagihan
                 diam-diam.

     'excluded' — transaksi privat keluar dari buku besar bersama: tidak dihitung
                 di `paid` maupun `owed`, jadi tidak menimbulkan utang sama sekali
                 (dan tidak perlu pengungkapan).

   Kenapa default-nya 'shared': mengeluarkan belanja privat dari kewajiban berarti
   pasangan bisa memindahkan pengeluaran pribadinya ke kantong bersama tanpa
   konsekuensi apa pun — dan itu justru sumber sengketa yang sama-sama tidak
   diinginkan kedua pihak. Disclosure + breakdown tanpa nominal privat adalah
   jalan tengah yang jujur: tanggung jawabnya jelas, isinya tetap rahasia. */
export type PrivateExpensePolicy = 'shared' | 'excluded'

export const PRIVATE_EXPENSE_POLICY: PrivateExpensePolicy = 'shared'

/** true = catatan privat ini bukan milik viewer → detail & irisannya disembunyikan */
export function isHiddenFrom(tx: LedgerTx, viewerId: LedgerMemberId): boolean {
  if (!tx.isPrivate) return false
  return (tx.privateForUser ?? tx.createdByUserId) !== viewerId
}

/* ── 1. ALOKASI UANG (tak ada rupiah yang hilang) ───────────────────────── */

/**
 * Bagi `total` mengikuti bobot, lalu sisa pembulatan dibagikan dengan metode
 * Largest Remainder (pecahan terbesar dulu; seri → urut id, deterministik).
 * Invariant: `Σ hasil === total` selama `total` bulat.
 */
export function allocateMoney(
  total: number,
  weights: { id: LedgerMemberId; weight: number }[],
): Record<LedgerMemberId, number> {
  const out: Record<LedgerMemberId, number> = {}
  for (const entry of weights) out[entry.id] = 0

  const safeTotal = Math.max(0, Math.round(total))
  if (weights.length === 0 || safeTotal === 0) return out

  const positive = weights.map((entry) => ({ id: entry.id, weight: Math.max(0, entry.weight) }))
  const sum = positive.reduce((acc, entry) => acc + entry.weight, 0)

  /* semua bobot 0 (data rusak) → jangan diam-diam menagih ke orang lain:
     seluruh nominal dibebankan ke anggota pertama */
  if (sum === 0) {
    out[positive[0].id] = safeTotal
    return out
  }

  const parts = positive.map((entry) => {
    const exact = (safeTotal * entry.weight) / sum
    const whole = Math.floor(exact)
    return { id: entry.id, whole, frac: exact - whole }
  })

  for (const part of parts) out[part.id] = part.whole

  let remainder = safeTotal - parts.reduce((acc, part) => acc + part.whole, 0)
  const order = [...parts].sort((a, b) => b.frac - a.frac || a.id.localeCompare(b.id))
  let index = 0
  while (remainder > 0) {
    out[order[index % order.length].id] += 1
    remainder -= 1
    index += 1
  }
  return out
}

/* ── 2. KEWAJIBAN SATU TRANSAKSI ────────────────────────────────────────── */

/**
 * Porsi tiap anggota atas SATU transaksi. `Σ hasil === tx.amount` selalu.
 *
 * Aturan sisa pembulatan pada mode `equal`: rupiah ekor jadi beban PIHAK YANG
 * MENALANGI. Alasannya bukan estetika — dia yang sudah mengeluarkan uang di
 * depan, jadi sisa pembulatan tidak boleh berubah menjadi tagihan tambahan
 * untuk pasangannya.
 */
export function sharesOf(tx: LedgerTx, members: LedgerMemberId[]): Record<LedgerMemberId, number> {
  const amount = Math.max(0, Math.round(tx.amount))
  const roster = members.length > 0 ? members : [tx.payerId]
  const out: Record<LedgerMemberId, number> = {}
  for (const id of roster) out[id] = 0

  switch (tx.split.type) {
    case 'equal': {
      const others = roster.filter((id) => id !== tx.payerId)
      const each = Math.floor(amount / roster.length)
      for (const id of others) out[id] = each
      out[tx.payerId] = amount - each * others.length
      return out
    }
    case 'percentage': {
      const percents = tx.split.percents
      const allocated = allocateMoney(
        amount,
        roster.map((id) => ({ id, weight: percents[id] ?? 0 })),
      )
      for (const id of roster) out[id] = allocated[id]
      return out
    }
    case 'nominal': {
      const amounts = tx.split.amounts
      let allocatedTotal = 0
      for (const id of roster) {
        const share = Math.max(0, Math.round(amounts[id] ?? 0))
        out[id] = share
        allocatedTotal += share
      }
      /* form menjaga Σ nominal === total; kalau data meleset, selisihnya
         dibebankan ke pihak yang menalangi supaya invariant tetap utuh */
      out[tx.payerId] = Math.max(0, out[tx.payerId] + (amount - allocatedTotal))
      return out
    }
    case 'single_payer': {
      const bearer = roster.includes(tx.split.payerId) ? tx.split.payerId : tx.payerId
      for (const id of roster) out[id] = id === bearer ? amount : 0
      return out
    }
    default:
      return out
  }
}

/** true = ada anggota yang porsinya 0 → praktiknya traktiran (tidak ditimbang) */
export function isTreatShares(shares: Record<LedgerMemberId, number>): boolean {
  return Object.values(shares).some((share) => share === 0)
}

/** validasi bentuk split sebelum disimpan (dipakai form & test) */
export function isValidSplit(split: SplitSpec, members: LedgerMemberId[]): boolean {
  switch (split.type) {
    case 'equal':
      return members.length > 0
    case 'percentage': {
      const values = members.map((id) => split.percents[id] ?? 0)
      return values.every((value) => value >= 0) && Math.round(values.reduce((a, b) => a + b, 0)) === 100
    }
    case 'nominal':
      return members.every((id) => (split.amounts[id] ?? 0) >= 0)
    case 'single_payer':
      return members.includes(split.payerId)
    default:
      return false
  }
}

/* ── 3. AGREGAT BUKU BESAR ──────────────────────────────────────────────── */

export interface LedgerTotals {
  /** uang yang benar-benar keluar dari kantong tiap anggota */
  paid: Record<LedgerMemberId, number>
  /** kewajiban total tiap anggota */
  owed: Record<LedgerMemberId, number>
  /** paid − owed; positif = berhak menerima, negatif = harus transfer */
  net: Record<LedgerMemberId, number>
}

/**
 * Total per anggota untuk daftar transaksi (penyaringan bulan dilakukan
 * pemanggil, supaya modul ini tetap bebas kalender).
 *
 * `privatePolicy` diteruskan ke sini, bukan dibaca langsung dari konstanta,
 * supaya dua pilihan produk itu bisa diuji berdampingan (`PRIVATE_EXPENSE_POLICY`
 * dipakai sebagai default). Dengan `'excluded'`, baris privat tidak masuk `paid`
 * MAUPUN `owed` — jadi ia tidak menimbulkan utang ke siapa pun.
 */
export function ledgerTotals(
  transactions: LedgerTx[],
  members: LedgerMemberId[],
  { privatePolicy = PRIVATE_EXPENSE_POLICY }: { privatePolicy?: PrivateExpensePolicy } = {},
): LedgerTotals {
  const paid: Record<LedgerMemberId, number> = {}
  const owed: Record<LedgerMemberId, number> = {}
  const net: Record<LedgerMemberId, number> = {}
  for (const id of members) {
    paid[id] = 0
    owed[id] = 0
    net[id] = 0
  }

  for (const tx of transactions) {
    if (tx.isPrivate && privatePolicy === 'excluded') continue
    const shares = sharesOf(tx, members)
    for (const id of members) {
      if (id === tx.payerId) paid[id] += Math.max(0, Math.round(tx.amount))
      owed[id] += shares[id] ?? 0
    }
  }

  for (const id of members) net[id] = paid[id] - owed[id]
  return { paid, owed, net }
}

/**
 * Pengungkapan wajib untuk kebijakan `'shared'`: berapa rupiah yang DITANGGUNG
 * viewer dari catatan privat milik orang lain, dan berapa banyak catatannya.
 *
 * Angka ini yang membuat "privat tapi tetap ditagih" berhenti jadi rahasia:
 * nominalnya (dan bukan isi catatannya) diumumkan di kartu rincian bersama.
 * Dengan kebijakan `'excluded'` hasilnya selalu nol — tidak ada yang ditanggung,
 * jadi tidak ada yang perlu diungkapkan.
 */
export interface HiddenPrivateBurden {
  /** total porsi viewer dari catatan privat yang tidak bisa ia lihat */
  amount: number
  /** jumlah catatan privat yang tidak bisa ia lihat */
  count: number
}

export function hiddenPrivateBurden(
  transactions: LedgerTx[],
  viewerId: LedgerMemberId,
  members: LedgerMemberId[],
  { privatePolicy = PRIVATE_EXPENSE_POLICY }: { privatePolicy?: PrivateExpensePolicy } = {},
): HiddenPrivateBurden {
  if (privatePolicy === 'excluded') return { amount: 0, count: 0 }

  let amount = 0
  let count = 0
  for (const tx of transactions) {
    if (!isHiddenFrom(tx, viewerId)) continue
    count += 1
    amount += sharesOf(tx, members)[viewerId] ?? 0
  }
  return { amount, count }
}

/* ── 4. JENDELA WAKTU ───────────────────────────────────────────────────── */

/** `'2026-09-25'` → `'2026-09'` (dibaca apa adanya, bebas timezone) */
export function monthOf(isoDate: string): string {
  return isoDate.slice(0, 7)
}

/** true = tanggal itu berada di bulan `month` (`YYYY-MM`) */
export function withinMonth(isoDate: string, month: string): boolean {
  return monthOf(isoDate) === month
}
