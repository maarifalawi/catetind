import { beforeEach, describe, expect, it } from 'vitest'
import { parseISO } from 'date-fns'
import {
  CALENDAR_ENTRIES,
  CALENDAR_NOTE_TYPES,
  CALENDAR_TODAY,
  CALENDAR_TODAY_ISO,
  DEFAULT_PAYDAY_DATE,
  buildCalendarEntries,
  buildCalendarGrid,
  calendarCellLook,
  calendarEntriesFromLedger,
  calendarEntryVisible,
  calendarLedgerType,
  defaultAnchorFor,
  periodBounds,
  selectCell,
  summarizePeriod,
  type CalendarCell,
  type CalendarEntry,
  type CalendarEntryType,
} from './calendar'
import { localISODate } from './history'
import { recordDraftTransaction } from '@/lib/transaction-bus'
import {
  editRow,
  getMoneySnapshot,
  mergeMoneySnapshot,
  postTransfer,
  recordedTransactions,
  removeRow,
  resetMoneyStore,
  walletBalance,
  type MoneySnapshot,
} from '@/lib/money/store'
import type { MoneyContext, TransactionType } from '@/lib/types'

/* ── Test CATATAN KALENDER = CATATAN RIWAYAT (paket 49) ──────────────────────
   Yang diuji di sini bukan "kalender bisa menyimpan", melainkan janji yang
   membuat paket ini ada: satu tindakan = satu catatan di SATU tempat.

   Empat langkah bukti (persis urutan yang diminta prompt), dijalankan lewat
   fungsi yang BENAR-BENAR dipanggil halaman:

     1. catat pengeluaran dari kalender → `recordDraftTransaction()`
        (jalur yang sama dengan `useTransactionSubmit()` milik halaman),
     2. muncul di Riwayat/kartu Home   → `recordedTransactions()`,
     3. saldo dompet tujuan bergerak   → `walletBalance()`,
     4. entri grid ikut lahir/hilang   → `calendarEntriesFromLedger()` +
        `buildCalendarGrid()` (fungsi yang dipakai `/calendar`).

   Karena keempatnya fungsi yang sama dengan halaman, tidak ada rumus salinan
   yang bisa lulus test ini sementara UI-nya berbeda. */

const CONTEXTS = ['pribadi', 'keluarga', 'bersama'] as const
/** periode demo yang sedang dibaca kalender: September 2026 */
const SEPTEMBER = periodBounds(CALENDAR_TODAY, 'standard')
const SEPT_22 = '2026-09-22'
/** angka kanon paket 40 — dipakai sebagai pembanding, bukan diubah */
const BCA_OPENING = 1_450_000

/** snapshot yang dibaca halaman kalender (satu store, tanpa React) */
function snapshot() {
  return getMoneySnapshot()
}

/** daftar nama entri kalender untuk konteks tertentu */
function namesFor(snapshotValue: MoneySnapshot, ctx: MoneyContext | 'all'): string[] {
  return calendarEntriesFromLedger(snapshotValue, SEPTEMBER, ctx).map((entry) => entry.name)
}

/**
 * Jalur tulis yang SAMA dengan `handleSaveNote()` di `/calendar`: draft dari
 * modal (nominal, catatan, tipe, kategori) + dompet konteks aktif yang diisi
 * halaman + tanggal dari kalender.
 */
function saveFromCalendar(
  draft: { amount: number; note: string; type: TransactionType; date: string; clientTxId?: string },
  wallet: string,
) {
  return recordDraftTransaction({ ...draft, category: 'Makanan', wallet }, wallet)
}

describe('catat dari kalender → satu catatan di semua permukaan', () => {
  it('(a) muncul di Riwayat (b) saldo dompet tujuan turun (c) masuk grid & ringkasan periode', () => {
    const written = saveFromCalendar(
      {
        amount: 85_000,
        note: 'Makan malam',
        type: 'expense',
        /* tanggal datang dari kalender (tanggal terkunci di modal) */
        date: SEPT_22,
        clientTxId: 'kalender-1',
      },
      /* dompet aktif konteks Pribadi — sama dengan `defaultWalletNameFor('pribadi')` */
      'BCA',
    )

    /* (a) daftar yang dibaca /history, kartu Home, dan /wallet/[id] */
    expect(recordedTransactions(snapshot()).map((tx) => tx.name)).toContain('Makan malam')

    /* (b) saldo dompet yang DIPILIH bergerak — bukan dompet yang di-hardcode */
    expect(walletBalance(snapshot(), 'bca')).toBe(BCA_OPENING - 85_000)

    /* (c) kalender membacanya dari ledger, bukan dari daftar pribadinya */
    const entries = calendarEntriesFromLedger(snapshot(), SEPTEMBER)
    const entry = entries.find((item) => item.name === 'Makan malam')
    expect(entry).toMatchObject({
      date: SEPT_22,
      amount: 85_000,
      type: 'variable_expense',
      wallet: 'BCA',
      category: 'Makanan',
      context: 'pribadi',
    })
    /* PAKET 56: entri tidak lagi membawa `status` — uang yang tercatat di ledger
       memang uang yang sudah terjadi, jadi tidak ada ramalan yang perlu ditandai */
    expect(entry && 'status' in entry).toBe(false)
    /* jamnya pun sama dengan baris di Riwayat (`toHistoryTransaction`) */
    expect(entry?.time).toBe(written.time)

    /* grid + ringkasan: entri itu benar-benar ikut dihitung di hari & periode itu */
    const withNote = buildCalendarGrid({
      entries: [...CALENDAR_ENTRIES, ...entries],
      anchor: CALENDAR_TODAY,
      mode: 'standard',
    })
    const mockOnly = buildCalendarGrid({
      entries: CALENDAR_ENTRIES,
      anchor: CALENDAR_TODAY,
      mode: 'standard',
    })
    const cellBefore = selectCell(mockOnly, SEPT_22)?.variableSpend ?? 0
    expect(selectCell(withNote, SEPT_22)?.variableSpend).toBe(cellBefore + 85_000)
    expect(
      summarizePeriod(withNote.cells).variableSpend -
        summarizePeriod(mockOnly.cells).variableSpend,
    ).toBe(85_000)
  })

  it('double-tap tidak menghasilkan catatan kedua (kunci idempotensi tetap dipakai)', () => {
    const draft = {
      amount: 30_000,
      note: 'Kopi',
      type: 'expense' as TransactionType,
      date: SEPT_22,
      clientTxId: 'kalender-dobel',
    }
    const first = saveFromCalendar(draft, 'BCA')
    const second = saveFromCalendar(draft, 'BCA')

    expect(second.id).toBe(first.id)
    expect(recordedTransactions(snapshot())).toHaveLength(1)
    expect(walletBalance(snapshot(), 'bca')).toBe(BCA_OPENING - 30_000)
  })
})

describe('hapus & edit di Riwayat ikut terbaca kalender (tombstone & override yang sama)', () => {
  it('baris yang dihapus di Riwayat hilang dari kalender, juga setelah state dibaca ulang', () => {
    const written = saveFromCalendar(
      { amount: 20_000, note: 'Kopi', type: 'expense', date: SEPT_22, clientTxId: 'hapus-1' },
      'BCA',
    )
    expect(namesFor(snapshot(), 'all')).toContain('Kopi')

    removeRow(written.id)

    /* Riwayat & kalender membaca daftar yang SAMA → hilang di dua tempat */
    expect(recordedTransactions(snapshot())).toHaveLength(0)
    expect(namesFor(snapshot(), 'all')).not.toContain('Kopi')

    /* BATAS YANG SUDAH DIKETAHUI (laporan 43, poin "belum bisa diverifikasi"
       #5): tombstone menyembunyikan baris dari SEMUA daftar, tapi baris
       ledger-nya masih ikut menghitung saldo (`balanceOf` membaca semua baris)
       — jadi saldo TIDAK kembali saat catatan dihapus. Yang diuji di sini
       adalah konsistensi DAFTAR, dan perilaku saldo itu dikunci apa adanya
       supaya perubahan rumus uang tidak lolos tanpa disadari. */
    expect(walletBalance(snapshot(), 'bca')).toBe(BCA_OPENING - 20_000)

    /* SIMULASI REFRESH: state dibaca ulang dari penyimpanan yang sama seperti
       saat hidrasi IndexedDB — tombstone bertahan, catatannya tidak lahir lagi */
    const before = snapshot()
    const afterReload = mergeMoneySnapshot({
      wallets: [...before.wallets],
      rows: [...before.rows],
      removedIds: [...before.removedIds],
      syncedIds: [...before.syncedIds],
    })
    expect(namesFor(afterReload, 'all')).not.toContain('Kopi')
  })

  it('nama & nominal yang diedit di Riwayat langsung jadi nilai yang tampil di kalender', () => {
    const written = saveFromCalendar(
      { amount: 20_000, note: 'Kopi', type: 'expense', date: SEPT_22, clientTxId: 'edit-1' },
      'BCA',
    )

    editRow(written.id, { name: 'Kopi susu', amount: 18_000 })

    const names = namesFor(snapshot(), 'all')
    expect(names).toContain('Kopi susu')
    expect(names).not.toContain('Kopi')
    const entry = calendarEntriesFromLedger(snapshot(), SEPTEMBER).find(
      (item) => item.name === 'Kopi susu',
    )
    expect(entry?.amount).toBe(18_000)
  })
})

describe('jendela periode & konteks uang', () => {
  it('catatan di luar periode yang sedang dibaca tidak muncul di kalender periode itu', () => {
    saveFromCalendar(
      { amount: 40_000, note: 'Jajan Agustus', type: 'expense', date: '2026-08-20' },
      'BCA',
    )

    expect(namesFor(snapshot(), 'all')).not.toContain('Jajan Agustus')
    /* periode Agustus memuatnya — jadi yang menyaring adalah JENDELA, bukan bug */
    const august = periodBounds(parseISO('2026-08-20'), 'standard')
    expect(calendarEntriesFromLedger(snapshot(), august).map((entry) => entry.name)).toContain(
      'Jajan Agustus',
    )
  })

  it('catatan dompet Keluarga tidak bocor ke Pribadi — konteks dibaca dari dompetnya', () => {
    saveFromCalendar(
      { amount: 25_000, note: 'Belanja sayur', type: 'expense', date: SEPT_22 },
      /* 'Tunai' = dompet konteks Keluarga di WALLET_SEED */
      'Tunai',
    )

    expect(namesFor(snapshot(), 'pribadi')).not.toContain('Belanja sayur')
    expect(namesFor(snapshot(), 'keluarga')).toContain('Belanja sayur')
    expect(namesFor(snapshot(), 'all')).toContain('Belanja sayur')
  })

  it('baris yang dompetnya belum ada di daftar dompet tetap tampil di SEMUA konteks (kanon #2)', () => {
    /* 'OVO' belum ada di ledger → barisnya tercatat apa adanya tanpa menggerakkan
       saldo. Konteksnya tak bisa dipastikan, jadi ia TIDAK BOLEH hilang begitu
       user berpindah konteks. */
    saveFromCalendar({ amount: 40_000, note: 'Kopi OVO', type: 'expense', date: SEPT_22 }, 'OVO')

    const entry = calendarEntriesFromLedger(snapshot(), SEPTEMBER).find(
      (item) => item.name === 'Kopi OVO',
    ) as CalendarEntry
    expect(entry.context).toBe('unknown')
    for (const ctx of CONTEXTS) {
      expect(namesFor(snapshot(), ctx)).toContain('Kopi OVO')
      /* penyaring yang dipakai halaman memutuskan hal yang sama */
      expect(calendarEntryVisible(entry, ctx)).toBe(true)
    }
  })

  it('entri mock dibaca lewat `scope` oleh penyaring yang sama (mock & ledger satu aturan)', () => {
    const mock = CALENDAR_ENTRIES[0]
    for (const ctx of CONTEXTS) {
      expect(calendarEntryVisible(mock, ctx)).toBe(mock.scope === ctx)
    }
  })
})

describe('pindah dana bukan belanja — dan tidak ditawarkan sebagai catatan kalender', () => {
  it('pindah dana masuk sebagai `money_movement` dan tidak menambah belanja hari itu', () => {
    postTransfer({
      fromWalletId: 'bca',
      toWalletId: 'gopay',
      amount: 100_000,
      note: 'Pindah ke GoPay',
      dateISO: SEPT_22,
    })

    const entries = calendarEntriesFromLedger(snapshot(), SEPTEMBER, 'pribadi')
    expect(entries.find((item) => item.name === 'Pindah ke GoPay')?.type).toBe('money_movement')

    const cell = selectCell(
      buildCalendarGrid({ entries, anchor: CALENDAR_TODAY, mode: 'standard' }),
      SEPT_22,
    )
    /* ⇄ pindah dana netral: masuk `moved`, TIDAK masuk belanja variabel/tagihan */
    expect(cell?.moved).toBe(100_000)
    expect(cell?.totalSpend).toBe(0)
    expect(cell?.variableSpend).toBe(0)
  })

  it('kalender hanya menawarkan pemasukan & pengeluaran (pindah dana butuh alur dua sisi)', () => {
    expect([...CALENDAR_NOTE_TYPES]).toEqual(['expense', 'income'])
    expect(calendarLedgerType('income')).toBe('income')
    expect(calendarLedgerType('expense')).toBe('variable_expense')
    expect(calendarLedgerType('transfer')).toBe('money_movement')
    expect(calendarLedgerType('saving')).toBe('money_movement')
  })
})


/* ── PAKET 56 — KALENDER TANPA RAMALAN ────────────────────────────────────────
   Empat janji yang diuji di sini, semuanya lewat fungsi yang BENAR-BENAR dipakai
   halaman `/calendar`:

     1. tidak ada entri yang lahir dengan status ramalan — kontrak `status`
        hilang dari `CalendarEntry`;
     2. entri demo tidak pernah bertanggal setelah hari ini;
     3. hari masa depan yang kosong → `tone: 'none'`, tanpa `forecast`/`plannedCount`;
     4. hari yang berisi entri nyata → tone & ringkasan periode apa adanya.

   Angka harapan di sini ditulis tangan (bukan dibaca dari mesin yang sedang
   diuji) supaya perubahan aturan tone tidak bisa lolos sendiri.
   ────────────────────────────────────────────────────────────────────────── */

/** hari masa depan di periode yang sedang dibaca (dulu: tanggal Kredivo seed) */
const FUTURE_DAY = '2026-09-28'

/** entri kalender minimal — semua field wajib terisi, `name` = id */
function testEntry(entry: {
  id: string
  date: string
  amount: number
  type: CalendarEntryType
}): CalendarEntry {
  return {
    name: entry.id,
    category: 'Uji',
    wallet: 'BCA',
    emoji: '🧪',
    scope: 'pribadi',
    ...entry,
  }
}

describe('kalender cashflow tanpa ramalan (paket 56)', () => {
  it('entri demo tidak punya status ramalan & tidak ada yang bertanggal masa depan', () => {
    expect(CALENDAR_ENTRIES.length).toBeGreaterThan(0)
    for (const entry of CALENDAR_ENTRIES) {
      expect('status' in entry).toBe(false)
      expect(entry.date <= CALENDAR_TODAY_ISO).toBe(true)
    }
    /* dipanggil ulang pun tetap dipotong di hari ini — tidak ada entri masa depan
       yang bisa "lahir sebagai fakta" setelah ramalan dihapus */
    expect(buildCalendarEntries(CALENDAR_TODAY_ISO).filter((e) => e.date > CALENDAR_TODAY_ISO)).toEqual(
      [],
    )
  })

  it('hari masa depan yang kosong → tone `none`, tanpa forecast/plannedCount', () => {
    const grid = buildCalendarGrid({ entries: [], anchor: CALENDAR_TODAY, mode: 'standard' })
    const cell = selectCell(grid, FUTURE_DAY) as CalendarCell

    expect(cell.inPeriod).toBe(true)
    expect(cell.isFuture).toBe(true)
    expect(cell.entries).toEqual([])
    expect(cell.income).toBe(0)
    expect(cell.totalSpend).toBe(0)
    expect(cell.tone).toBe('none')
    expect(calendarCellLook(cell)).toBe('empty')
    /* field ramalan benar-benar hilang dari kontrak sel, bukan cuma dikosongkan */
    expect('forecast' in cell).toBe(false)
    expect('plannedCount' in cell).toBe(false)
  })

  it('catatan bertanggal masa depan tetap tampil sebagai entri biasa (bukan ramalan)', () => {
    const grid = buildCalendarGrid({
      entries: [testEntry({ id: 'catatan-besok', date: FUTURE_DAY, amount: 50_000, type: 'variable_expense' })],
      anchor: CALENDAR_TODAY,
      mode: 'standard',
    })
    const cell = selectCell(grid, FUTURE_DAY) as CalendarCell

    expect(cell.entries).toHaveLength(1)
    expect(cell.variableSpend).toBe(50_000)
    /* 50rb di bawah ambang (Rp 150rb) → tidak dihukum boros, dan tidak "planned" */
    expect(cell.tone).toBe('none')
    expect(calendarCellLook(cell)).toBe('spend')
  })

  it('hari berisi entri nyata → tone & muka sel sesuai isinya', () => {
    const entries: CalendarEntry[] = [
      /* 18 & 19 Sep: satu hari hemat + satu hari kalap → rata-rata 500rb,
         ambang defisit 800rb, jadi hari 900rb benar-benar "boros" */
      testEntry({ id: 'warteg', date: '2026-09-18', amount: 100_000, type: 'variable_expense' }),
      testEntry({ id: 'kalap', date: '2026-09-19', amount: 900_000, type: 'variable_expense' }),
      testEntry({ id: 'kos', date: '2026-09-20', amount: 1_500_000, type: 'fixed_bill' }),
      testEntry({ id: 'gaji', date: '2026-09-21', amount: 2_000_000, type: 'income' }),
    ]
    const grid = buildCalendarGrid({ entries, anchor: CALENDAR_TODAY, mode: 'standard' })
    const day = (iso: string) => selectCell(grid, iso) as CalendarCell

    expect(grid.deficitThreshold).toBeCloseTo(800_000, -1)
    expect(day('2026-09-19').tone).toBe('deficit')
    expect(calendarCellLook(day('2026-09-19'))).toBe('deficit')
    /* "The Rent Penalty Fix" tetap utuh: tagihan tetap besar TIDAK PERNAH merah */
    expect(day('2026-09-20').tone).toBe('planned')
    expect(day('2026-09-20').totalSpend).toBe(1_500_000)
    expect(day('2026-09-20').entries).toHaveLength(1)
    expect(day('2026-09-21').tone).toBe('surplus')
    /* hari yang cuma punya belanja kecil → netral, tanpa label khusus */
    expect(day('2026-09-18').tone).toBe('none')
    expect(calendarCellLook(day('2026-09-18'))).toBe('spend')
  })

  it('ringkasan periode hanya berisi fakta — plannedDays & forecast dihapus', () => {
    const entries: CalendarEntry[] = [
      testEntry({ id: 'kos', date: '2026-09-20', amount: 1_500_000, type: 'fixed_bill' }),
      testEntry({ id: 'kopi', date: '2026-09-24', amount: 25_000, type: 'variable_expense' }),
      testEntry({ id: 'tabung', date: '2026-09-24', amount: 300_000, type: 'money_movement' }),
      testEntry({ id: 'gaji', date: '2026-09-25', amount: 2_000_000, type: 'income' }),
    ]
    const grid = buildCalendarGrid({ entries, anchor: CALENDAR_TODAY, mode: 'standard' })
    const summary = summarizePeriod(grid.cells)

    expect(summary.income).toBe(2_000_000)
    expect(summary.fixedSpend).toBe(1_500_000)
    expect(summary.variableSpend).toBe(25_000)
    expect(summary.moved).toBe(300_000)
    expect(summary.net).toBe(2_000_000 - 1_500_000 - 25_000)
    expect('plannedDays' in summary).toBe(false)
    expect('forecastTotal' in summary).toBe(false)
    expect('forecastCount' in summary).toBe(false)
  })
})


beforeEach(() => {
  resetMoneyStore()
})

/* ── TANGGAL BERJALAN & SIKLUS GAJIAN USER (paket 60 · 60.5 · AKAR B) ────────
   Temuan audit: `CALENDAR_TODAY_ISO` ('2026-09-25') dipakai sebagai jangkar di
   tiga tempat, jadi sel "hari ini", tombol "Hari Ini", dan label periode bisa
   menunjuk tanggal yang bukan hari ini. Sejak paket 57 halaman mengirim
   `todayIso` hasil `useTodayISO()` ke `buildCalendarGrid()`; test di bawah
   mengunci janjinya beserta dua hal yang gampang lolos:

     · siklus gajian memakai `paydayDate` MILIK USER (bukan selalu 25);
     · seri demo yang bertanggal tetap TIDAK bocor ke luar jendela periode yang
       sedang dibaca (kalau bocor, hari di luar siklus ikut dihitung statistik).

   Semuanya fungsi murni yang dipakai halaman — tidak ada rumus salinan. */

describe('jangkar "hari ini" & siklus gajian user (paket 60.5)', () => {
  const HARI_INI = '2026-09-28'
  /** grid kosong dengan jangkar & jam yang bisa ditentukan (bukan konstanta seed) */
  const gridAt = (todayIso: string, anchor = CALENDAR_TODAY, paydayDate = DEFAULT_PAYDAY_DATE) =>
    buildCalendarGrid({ entries: [], anchor, mode: 'standard', paydayDate, todayIso })

  it('sel "hari ini" mengikuti tanggal perangkat, bukan 25 Sep milik data seed', () => {
    const grid = buildCalendarGrid({ entries: [], anchor: parseISO(HARI_INI), mode: 'standard', todayIso: HARI_INI })
    const hari = selectCell(grid, HARI_INI) as CalendarCell
    const besok = selectCell(grid, '2026-09-29') as CalendarCell

    expect(hari.isToday).toBe(true)
    expect(hari.daysFromToday).toBe(0)
    expect(hari.isFuture).toBe(false)
    expect(besok.isFuture).toBe(true)
    /* hanya SATU sel yang boleh mengaku hari ini */
    expect(grid.cells.filter((cell) => cell.isToday)).toHaveLength(1)
    /* jangkar seed tetap 25 Sep: tanpa `todayIso`, jawabannya berbeda — inilah
       yang dulu tampil di layar (temuan AKAR B) */
    expect((selectCell(gridAt(CALENDAR_TODAY_ISO), '2026-09-25') as CalendarCell).isToday).toBe(true)
  })

  it('siklus gajian memakai paydayDate user (tgl 26), bukan default tgl 25', () => {
    const PAYDAY = 26
    const anchor = defaultAnchorFor(parseISO(HARI_INI), 'payday', PAYDAY)
    const grid = buildCalendarGrid({ entries: [], anchor, mode: 'payday', paydayDate: PAYDAY, todayIso: HARI_INI })

    /* 28 Sep ≥ gajian tgl 26 → tanggal itu ada di siklus BERIKUTNYA: 26 Sep–25 Okt */
    expect(localISODate(grid.bounds.start)).toBe('2026-09-26')
    expect(localISODate(grid.bounds.end)).toBe('2026-10-25')
    expect(grid.periodLength).toBe(30)
    /* hari ini ikut di dalam siklusnya, dan ditandai sebagai hari ini */
    expect((selectCell(grid, HARI_INI) as CalendarCell).isToday).toBe(true)
    expect((selectCell(grid, HARI_INI) as CalendarCell).inPeriod).toBe(true)
    /* tanggal gajian lama (25 Sep) jatuh di LUAR siklus ini */
    expect((selectCell(grid, '2026-09-25') as CalendarCell).inPeriod).toBe(false)
  })

  it('pergantian bulan: satu grid memuat dua bulan, dan sel di luar periode ditandai', () => {
    const grid = buildCalendarGrid({
      entries: [],
      anchor: parseISO('2026-10-28'),
      mode: 'payday',
      paydayDate: 26,
      todayIso: HARI_INI,
    })

    /* satu grid membentang dari minggu yang memuat 26 Sep sampai minggu yang
       memuat 25 Okt → September & Oktober ada di layar yang sama */
    const oktober = selectCell(grid, '2026-10-01') as CalendarCell
    expect(oktober.inPeriod).toBe(true)
    expect(oktober.monthShort).toBe('Okt')
    expect((selectCell(grid, '2026-09-26') as CalendarCell).monthShort).toBe('Sep')

    /* sel di minggu pertama tetap digambar (biar barisnya utuh) tapi BUKAN
       bagian periode — statistik & ringkasan tidak ikut menghitungnya */
    const sebelumPeriode = selectCell(grid, '2026-09-21') as CalendarCell
    expect(sebelumPeriode.inPeriod).toBe(false)
    expect(summarizePeriod(grid.cells).cleanDays).toBeLessThanOrEqual(grid.periodLength)

    /* tanggal setelah akhir periode tidak ikut digambar sama sekali */
    expect(selectCell(grid, '2026-10-26')).toBeNull()
  })

  it('batas siklus tetap sah untuk gajian tgl 31 (bulan 30 hari ikut dikunci)', () => {
    /* Januari: gajian 31 Des → 30 Jan = 31 hari. November: gajian 31 Okt → 29 Nov,
       karena gajian bulan berikutnya dikunci ke hari terakhir bulan (30 Nov). */
    const januari = periodBounds(parseISO('2026-01-10'), 'payday', 31)
    const november = periodBounds(parseISO('2026-11-10'), 'payday', 31)

    expect(localISODate(januari.start)).toBe('2025-12-31')
    expect(localISODate(januari.end)).toBe('2026-01-30')
    expect(localISODate(november.start)).toBe('2026-10-31')
    expect(localISODate(november.end)).toBe('2026-11-29')

    const grid = buildCalendarGrid({
      entries: [],
      anchor: parseISO('2026-11-10'),
      mode: 'payday',
      paydayDate: 31,
      todayIso: '2026-11-10',
    })
    expect(grid.periodLength).toBe(30)
    /* tidak ada sel di luar periode yang ikut dihitung statistik */
    expect(grid.cells.filter((cell) => cell.inPeriod).length).toBe(grid.periodLength)
  })

  it('entri demo bertanggal tetap tidak bocor ke ringkasan periode', () => {
    /* Seri demo dibangun dengan jangkar seed (25 Sep): gaji bulanan tgl 25 ada di
       sana. Di siklus 26 Sep–25 Okt, entri itu di LUAR jendela — grid boleh
       menggambarnya sebagai sel di luar periode, tapi TIDAK boleh menjumlahkannya
       ke ringkasan periode (kalau bocor, angka pemasukan siklus jadi palsu). */
    expect(CALENDAR_ENTRIES.some((entry) => entry.date === CALENDAR_TODAY_ISO)).toBe(true)

    const grid = buildCalendarGrid({
      entries: CALENDAR_ENTRIES,
      anchor: parseISO('2026-10-28'),
      mode: 'payday',
      paydayDate: 26,
      todayIso: HARI_INI,
    })
    const luar = selectCell(grid, CALENDAR_TODAY_ISO) as CalendarCell

    expect(luar.inPeriod).toBe(false)
    expect(luar.isPast).toBe(true)
    /* ringkasan: tidak ada satu pun pemasukan demo yang masuk siklus ini */
    expect(summarizePeriod(grid.cells).income).toBe(0)
    expect(
      grid.cells
        .filter((cell) => cell.inPeriod)
        .every((cell) => cell.date >= '2026-09-26' && cell.date <= '2026-10-25'),
    ).toBe(true)
  })
})
