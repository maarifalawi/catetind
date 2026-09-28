/* ── LEDGER KAS — SATU-SATUNYA SUMBER SALDO DOMPET (paket 40) ────────────────
   Sebelum paket 40 ada DUA daftar dompet dengan saldo berbeda di `lib/wallets.ts`
   (satu berbunyi Rp 1.850.000 untuk halaman Dompet & Kekayaan, satu lagi
   Rp 4.309.573 untuk Home & API), dan setiap halaman membaca yang berbeda-beda.
   Akibatnya Net Worth satu user bisa beda Rp 2.459.573 hanya karena halaman mana
   yang dibuka.

   File ini menutupnya di lapis paling dasar: saldo TIDAK LAGI disimpan sebagai
   angka yang bisa disalin-tempel, tapi DITURUNKAN dari baris ledger.

     balance(dompet) = opening + Σ (efek baris ledger untuk dompet itu)

   Aturan yang membuat turunan ini bisa dipercaya:
     1. Uang selalu INTEGER rupiah (tidak ada pembulatan tersembunyi).
     2. Arah uang dibaca dari `type`, bukan dari tanda angka — kecuali
        `balance_adjustment`, yang memang selisih (bisa negatif).
     3. Baris `transfer`/`settlement` yang menyebut `counterWalletId` WAJIB
        naik-turun seimbang: keluar dari dompet sumber = masuk ke dompet lawan,
        jadi total kas user tidak berubah karena pindah dompet.
     4. Setiap baris punya `id` unik; `clientTxId` disediakan sebagai kunci
        idempotensi klien (produksi: `POST /api/transactions`), supaya double-tap
        tidak jadi dua catatan.

   🚧 Di produksi file ini tetap murni — yang berubah cuma dari mana barisnya
   datang: `SELECT * FROM ledger_rows WHERE user_id = auth.uid()` (Supabase),
   lalu `balanceOf()` dipakai view `user_net_worth`.

   Batas yang jujur: baris mock lama (transaksi Riwayat & Home) TIDAK punya baris
   ledger — angkanya hidup di `lib/data/*` sebagai pajangan. Karena itu `opening`
   dompet = saldo yang selama ini tertera, dan hanya catatan SESI (yang user catat
   sendiri di app) yang benar-benar menggerakkan saldo. */

/** jenis pergerakan uang yang sah di ledger kas */
export type LedgerRowType =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'settlement'
  | 'balance_adjustment'
  /**
   * Bayar hutang (paket 41): uang benar-benar KELUAR dari dompet untuk melunasi
   * hutang/platform. Arah selalu keluar, jadi nominalnya selalu > 0.
   *
   * Sebelum paket ini, "Catat Bayar" cuma mengurangi `debt.remaining` tanpa
   * menyentuh kas — akibatnya setiap pelunasan Rp 500.000 menaikkan Net Worth
   * Rp 500.000 tanpa ada uang yang keluar (temuan audit #1).
   */
  | 'debt_payment'
  /** Terima pelunasan piutang: uang MASUK ke dompet (kebalikan `debt_payment`) */
  | 'receivable_payment'
  /**
   * KEMBALIAN — satu-satunya baris kas yang BERTANDA, karena kembalian bisa
   * mengalir dua arah dan arahnya tidak bisa dibaca dari jenisnya:
   *   `+` = kas MASUK (kita menerima uang lebih → harus kita kembalikan),
   *   `−` = kas KELUAR (kita menyerahkan uang lebih → harus kita terima lagi).
   * Semantik ini dipilih supaya barisnya selalu mengikuti uang yang BENAR-BENAR
   * berpindah tangan di dunia nyata; kewajiban lawannya ditulis sebagai catatan
   * utang/piutang baru (`lib/data/wealth-cash.ts`), bukan cuma diselipkan di teks.
   */
  | 'change'

export interface LedgerRow {
  /** id unik baris di ledger (`session-9001`) */
  id: string
  /** dompet yang disentuh; `''` = baris belum terhubung ke dompet mana pun */
  walletId: string
  type: LedgerRowType
  /**
   * Selalu integer rupiah.
   * `expense`/`income` selalu > 0 (arah dibaca dari `type`);
   * `transfer`/`settlement` > 0 (arah dibaca dari dompet sumber → lawan);
   * `balance_adjustment` BERTANDA — selisih saldo asli vs saldo sistem.
   */
  amount: number
  /** tanggal lokal `YYYY-MM-DD` (pola `lib/data/history.ts`) */
  dateISO: string
  /** nama baris yang dibaca user (`Pengeluaran Tak Tercatat`, `Kopi`, …) */
  note: string
  category?: string
  /** dompet lawan untuk `transfer`/`settlement` (uangnya masuk ke sini) */
  counterWalletId?: string
  /** kunci idempotensi dari klien (produksi: header Idempotency-Key) */
  clientTxId?: string
}

/** jenis yang bisa menggerakkan DUA dompet sekaligus */
export function movesBetweenWallets(type: LedgerRowType): boolean {
  return type === 'transfer' || type === 'settlement'
}

/**
 * Efek satu baris terhadap SATU dompet — inti seluruh perhitungan saldo.
 * `0` berarti baris ini tidak menyentuh dompet tersebut.
 *
 * `transfer`/`settlement` tanpa `counterWalletId` sengaja satu sisi: uangnya
 * keluar dari kas (mis. setoran ke celengan/tabungan yang belum jadi dompet di
 * ledger). Kalau nanti celengan jadi dompet sungguhan, tinggal isi lawannya —
 * rumus di sini tidak perlu berubah.
 */
export function walletDelta(row: LedgerRow, walletId: string): number {
  if (row.walletId !== '' && row.walletId === walletId) {
    switch (row.type) {
      case 'income':
      case 'receivable_payment':
        return row.amount
      case 'balance_adjustment':
      case 'change':
        /* dua jenis ini memang BERTANDA: + menambah saldo, − mengurangi */
        return row.amount
      case 'expense':
      case 'transfer':
      case 'settlement':
      case 'debt_payment':
        return -row.amount
    }
  }
  if (row.counterWalletId && row.counterWalletId === walletId) {
    /* sisi penerima: apa pun jenisnya, uangnya MASUK ke dompet lawan */
    return Math.abs(row.amount)
  }
  return 0
}

/** saldo satu dompet: saldo pembuka + jumlah efek seluruh barisnya */
export function balanceOf(
  rows: readonly LedgerRow[],
  walletId: string,
  opening = 0,
): number {
  return rows.reduce((balance, row) => balance + walletDelta(row, walletId), opening)
}

/**
 * Perubahan bersih SATU baris terhadap seluruh kas user. Untuk transfer yang
 * punya lawan nilainya 0 (pindah dompet bukan pengeluaran) — inilah dasar
 * pemeriksaan "Σ transfer bersih 0".
 */
export function netEffect(row: LedgerRow): number {
  const out = walletDelta(row, row.walletId)
  const into = row.counterWalletId ? walletDelta(row, row.counterWalletId) : 0
  return out + into
}

/* ── PENJAGA INVARIANT ─────────────────────────────────────────────────────── */

/** semua pelanggaran invariant dilempar dengan kalimat Indonesia yang spesifik */
function fail(message: string): never {
  throw new Error(`Ledger tidak seimbang: ${message}`)
}

/**
 * true = baris yang nominalnya BERTANDA (`+` menambah saldo, `−` mengurangi),
 * jadi nol berarti tidak ada pergerakan sama sekali dan harus ditolak.
 * Selain dua jenis ini, arah uang dibaca dari `type` sehingga nominalnya wajib > 0.
 */
export function isSignedRow(type: LedgerRowType): boolean {
  return type === 'balance_adjustment' || type === 'change'
}

/**
 * Penjaga integritas ledger. Dipanggil SETELAH setiap penulisan di
 * `lib/money/store.ts` (bukan cuma di test), supaya baris yang rusak tidak
 * pernah sempat dibaca halaman.
 *
 * Dua lapis:
 *   1. bentuk baris — id unik, uang integer, nominal > 0 untuk baris berarah
 *      (kecuali `balance_adjustment` & `change` yang memang bertanda),
 *      transfer/settlement wajib punya lawan yang bukan dompetnya sendiri;
 *   2. kesamaan total — kalau `snapshot` diberikan:
 *        · Σ efek semua baris === Σ saldo − Σ opening (rupiah tidak hilang
 *          atau lahir dari mana pun), dan
 *        · saldo tiap dompet === opening + Σ barisnya (dua cara hitung yang
 *          harus sepakat).
 */
export function assertLedgerInvariant(
  rows: readonly LedgerRow[],
  snapshot?: {
    openings: Readonly<Record<string, number>>
    balances: Readonly<Record<string, number>>
  },
): void {
  const seen = new Set<string>()
  /* kunci idempotensi juga dijaga di lapis paling dasar (paket 42): kalau ada
     dua baris dengan `clientTxId` yang sama, itu artinya satu aksi tulis masuk
     dua kali — persis "dua catatan identik" yang dilaporkan audit. Store sudah
     menolaknya; penjaga ini memastikan jalur mana pun (termasuk state yang
     dihidrasi dari IndexedDB) tidak bisa lolos. */
  const seenClientTx = new Set<string>()

  for (const row of rows) {
    if (!row.id) fail('ada baris tanpa id')
    if (seen.has(row.id)) fail(`id baris dipakai dua kali (${row.id})`)
    seen.add(row.id)

    if (row.clientTxId) {
      if (seenClientTx.has(row.clientTxId)) {
        fail(`kunci idempotensi dipakai dua kali (${row.clientTxId})`)
      }
      seenClientTx.add(row.clientTxId)
    }

    if (!Number.isInteger(row.amount)) fail(`nominal bukan rupiah bulat (${row.id})`)
    /* baris tanpa dompet hanya boleh berupa baris yang memang tidak menggerakkan
       saldo; ia tetap wajib punya id & nominal bulat supaya bisa dicari user */
    if (!row.walletId) continue

    if (movesBetweenWallets(row.type)) {
      if (row.amount <= 0) fail(`nominal ${row.type} harus lebih dari nol (${row.id})`)
      if (row.counterWalletId === undefined) continue // keluar kas (mis. celengan)
      if (row.counterWalletId === '') fail(`dompet lawan kosong (${row.id})`)
      if (row.counterWalletId === row.walletId) {
        fail(`pindah dana ke dompet yang sama (${row.id})`)
      }
      if (netEffect(row) !== 0) fail(`pindah dana tidak seimbang (${row.id})`)
      continue
    }

    if (row.counterWalletId) fail(`${row.type} tidak boleh punya dompet lawan (${row.id})`)
    if (isSignedRow(row.type)) {
      /* `balance_adjustment` = selisih saldo, `change` = kembalian: dua-duanya
         bertanda, dan nol berarti baris kosong yang tidak punya arti */
      if (row.amount === 0) {
        fail(
          row.type === 'balance_adjustment'
            ? `koreksi saldo tanpa selisih (${row.id})`
            : `kembalian tanpa selisih (${row.id})`,
        )
      }
    } else if (row.amount <= 0) {
      fail(`nominal ${row.type} harus lebih dari nol (${row.id})`)
    }
  }

  if (!snapshot) return

  const rowsTotal = rows.reduce((sum, row) => sum + netEffect(row), 0)
  const openingsTotal = Object.values(snapshot.openings).reduce((sum, value) => sum + value, 0)
  const balancesTotal = Object.values(snapshot.balances).reduce((sum, value) => sum + value, 0)

  if (rowsTotal !== balancesTotal - openingsTotal) {
    fail(`Σ baris (${rowsTotal}) ≠ Σ saldo (${balancesTotal}) − Σ opening (${openingsTotal})`)
  }

  for (const [walletId, balance] of Object.entries(snapshot.balances)) {
    const derived = balanceOf(rows, walletId, snapshot.openings[walletId] ?? 0)
    if (derived !== balance) {
      fail(`saldo ${walletId} (${balance}) ≠ opening + Σ barisnya (${derived})`)
    }
  }
}
