'use client'

import { useEffect, useMemo, useState } from 'react'
import { ScreenShell } from './screen-shell'
import { LogoWordmark } from './logo-wordmark'
import { GlobalPrivacyToggle } from './global-privacy-toggle'
import { ContextSwitcher } from './context-switcher'
import { useMoneyContext } from './money-context-provider'
import { usePrivacy } from './privacy-provider'
import { CashflowCalendarGrid } from './cashflow-calendar-grid'
import { CashflowInspector } from './cashflow-inspector'
import { AddCalendarNoteSheet, type CalendarNoteInput } from './add-calendar-note-sheet'
import { localISODate } from '@/lib/data/history'
import {
  CALENDAR_ENTRIES,
  CALENDAR_TODAY,
  CALENDAR_TODAY_ISO,
  DEFAULT_PAYDAY_DATE,
  buildCalendarGrid,
  calendarEntriesFromLedger,
  calendarEntryVisible,
  defaultAnchorFor,
  isWithinPeriod,
  periodBounds,
  periodLabel,
  periodRangeLabel,
  selectCell,
  shiftAnchor,
  summarizePeriod,
  type PeriodBounds,
  type PeriodMode,
} from '@/lib/data/calendar'
import { defaultWalletNameFor, useMoneyStore } from '@/lib/money/store'
import { useTransactionSubmit } from '@/hooks/use-transaction-submit'
import { readOnboardingResult } from '@/lib/onboarding'
import {
  CONTEXT_EMPTY_COPY,
  CONTEXT_LABEL,
  SCOPE_NOTE,
  contextCaption,
} from '@/lib/data/money-context'
import { parseISO } from 'date-fns'

/* ── Kalender Cashflow (/app/calendar) ───────────────────────────────────────
   Halaman ini punya DUA kolom yang saling terikat:

     KIRI  (7/12) Kalender      — grid bulan/siklus gajian; warna selnya
                                  menunjukkan perilaku uang harian.
     KANAN (5/12) Panel Detail  — tanggal terpilih + tombol catat (sticky).

   Keputusan arsitektur penting:

   1. `periodMode` mengubah BATAS grid, bukan cuma label. Di mode 'payday',
      grid mulai tanggal gajian BULAN SEBELUMNYA dan berakhir (gajian − 1)
      bulan berjalan — lihat `periodBounds()` di lib/data/calendar.ts.
   2. Saat mode ditukar, jangkar bulan dihitung ulang lewat `defaultAnchorFor()`
      dan tanggal terpilih di-“snap” ke dalam periode baru, jadi panel detail
      tidak pernah menampilkan tanggal yang tidak ada di grid.
   3. `paydayDate` dibaca dari Pengaturan (localStorage hasil onboarding)
      SETELAH mount — render pertama selalu memakai default 25 supaya HTML
      server & client identik (tidak ada hydration mismatch).
   4. Nominal diformat lewat `maskMoney(value, masked)` sehingga tombol mata
      global menyensor halaman ini sama seperti halaman lain.
   5. REDESIGN: tap tanggal tidak lagi menggulirkan layar ke panel detail.
      Umpan balik instannya adalah bubble di atas sel (lihat
      cashflow-calendar-grid.tsx); panel detail cukup mengikuti tanggal yang
      dipilih, jadi tidak ada gerakan layar yang mengagetkan.
   6. PAKET 49 — halaman ini TIDAK menyimpan daftar catatannya sendiri. Entri
      satu hari = konstanta demo `CALENDAR_ENTRIES` + baris ledger sungguhan
      (`calendarEntriesFromLedger()`), sementara catatan baru ditulis lewat
      `useTransactionSubmit()` → `recordDraftTransaction()` → store uang. Jadi
      catatan dari kalender benar-benar muncul di Riwayat, kartu Home, dan saldo
      dompetnya — dan tombol hapus di Riwayat juga menghapusnya dari sini.
   7. PAKET 56 — halaman ini tidak lagi menyimpan `paidForecastIds` (ramalan yang
      "ditandai lunas" tanpa membayar) dan tidak lagi punya aksi [Bayar Sekarang].
      Tidak ada penanda ramalan di localStorage/sesi: yang tersisa hanya state
      tampilan (tanggal terpilih, mode periode, jangkar, sheet). Isi grid = entri
      demo ≤ hari ini + catatan sungguhan, tanpa satu angka pun yang belum terjadi.
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Pilih tanggal pengganti setelah periode bergeser: pertahankan tanggal
 * (mis. tgl 21) selama masih ada di periode baru, kalau tidak jatuh ke hari
 * pertama periode. Ini yang bikin navigasi bulan terasa "mengikuti" user,
 * bukan melompat ke tanggal 1 terus-menerus.
 */
function snapSelection(iso: string, anchor: Date, bounds: PeriodBounds): string {
  if (isWithinPeriod(iso, bounds)) return iso
  const day = parseISO(iso).getDate()
  const candidate = new Date(anchor.getFullYear(), anchor.getMonth(), day)
  const candidateIso = localISODate(candidate)
  if (isWithinPeriod(candidateIso, bounds)) return candidateIso
  return localISODate(bounds.start)
}

/* Catatan: `nowTime()` lokal DIHAPUS di paket 49 — jam catatan tidak lagi
   dirakit halaman ini, melainkan dibaca dari baris ledger (`row.time`) lewat
   `toHistoryTransaction()`, jadi jam di kalender & Riwayat mustahil berbeda. */

export function CashflowCalendarScreen() {
  /* privasi nominal: state GLOBAL (PrivacyProvider) */
  const { masked } = usePrivacy()
  /* konteks uang (Pribadi/Keluarga/Bersama) — state GLOBAL yang sama dengan
     switcher di halaman lain (paket 47). Sebelumnya halaman ini tidak membacanya
     sama sekali: entri bersama tetap tampil walau konteks aktif "Pribadi". */
  const { context, setContext } = useMoneyContext()

  /* ── SATU PINTU TULIS (paket 49) ──────────────────────────────────────────
     Hook yang sama dengan FAB & modal web: hook ini yang MENULIS catatannya,
     menutup panel, lalu menembak toast — dalam urutan itu. `backdated: true`
     karena form tambah di sini memang membawa tanggal sendiri (tanggal terkunci
     dari kalender); tanpa pernyataan itu draft bertanggal dianggap draft MODE
     EDIT dan tidak ditulis (lihat `shouldWriteDraft`).

     Dompet: `defaultWalletNameFor(context)` = dompet pertama di konteks uang
     aktif. Sheet catatan tidak punya pemilih dompet (form tambah engine memang
     tanpa dompet), jadi dompet itu DITAMPILKAN di sheet — bukan disimpan
     diam-diam seperti dulu (`wallet: 'Tunai'` hardcoded). */
  const snapshot = useMoneyStore()
  const defaultWallet = defaultWalletNameFor(context)
  const submit = useTransactionSubmit(defaultWallet, masked, { backdated: true })

  /* ── STATE (kontrak dari PRD) ───────────────────────────────────────────── */
  const [selectedDate, setSelectedDate] = useState<string>(CALENDAR_TODAY_ISO)
  const [periodMode, setPeriodMode] = useState<PeriodMode>('standard')
  /** jangkar navigator; tanggalnya menentukan siklus mana yang dirender */
  const [anchor, setAnchor] = useState<Date>(CALENDAR_TODAY)
  /** tanggal gajian dari Pengaturan (default 25) */
  const [paydayDate, setPaydayDate] = useState<number>(DEFAULT_PAYDAY_DATE)
  const [noteSheetOpen, setNoteSheetOpen] = useState(false)

  /* pengaturan gajian dibaca setelah mount (hidrasi aman) */
  useEffect(() => {
    const stored = readOnboardingResult()?.paydayDate
    if (stored && stored >= 1 && stored <= 31) setPaydayDate(stored)
  }, [])

  /* ── DATA TURUNAN ───────────────────────────────────────────────────────── */
  /** batas periode yang sedang dibaca — dipakai grid & jendela entri ledger */
  const bounds = useMemo(() => periodBounds(anchor, periodMode, paydayDate), [
    anchor,
    periodMode,
    paydayDate,
  ])

  /**
   * Isi satu hari = konstanta demo + catatan SUNGGUHAN dari store (paket 49).
   * `recordedTransactions()` sudah menyaring tombstone & menerapkan override
   * edit (paket 48), jadi baris yang dihapus/diedit di Riwayat ikut berubah di
   * sini — bukan daftar kedua yang bisa bercerita beda.
   *
   * PAKET 56: tidak ada lagi langkah "turunkan status ramalan jadi cleared"
   * (dulu: `paidForecastIds`). Kedua sumber ini isinya sama-sama uang yang sudah
   * tercatat, jadi tidak ada yang perlu ditambal di sini.
   */
  const entries = useMemo(
    () => [...CALENDAR_ENTRIES, ...calendarEntriesFromLedger(snapshot, bounds)],
    [snapshot, bounds],
  )

  /* ── DAFTAR IKUT KONTEKS (paket 47 & 49) ─────────────────────────────────
     Satu keputusan saring untuk dua jenis entri: entri demo memakai `scope`
     yang ditulis di konstanta, entri dari ledger memakai konteks DOMPET barisnya
     (bisa 'unknown' → tetap tampil di semua konteks, kanon #2). Sebelum paket
     47 halaman ini tidak menyaring sama sekali: memilih "Keluarga" tidak
     mengubah satu pun sel. */
  const visibleEntries = useMemo(
    () => entries.filter((entry) => calendarEntryVisible(entry, context)),
    [entries, context],
  )

  const grid = useMemo(
    () =>
      buildCalendarGrid({
        /* daftar & warna sel mengikuti konteks aktif */
        entries: visibleEntries,
        anchor,
        mode: periodMode,
        paydayDate,
      }),
    [visibleEntries, anchor, periodMode, paydayDate],
  )
  /**
   * Ringkasan periode DARI SEMUA ENTRI — bukan dari daftar tersaring.
   *
   * Aturan kanon paket 47 #1: konteks menyaring daftar & arus, bukan total.
   * Angka ringkasan (pemasukan/belanja/net periode) adalah total, jadi ia
   * dihitung dari himpunan penuh lewat grid kedua — bukan dikecilkan diam-diam
   * mengikuti konteks. Kalimat cakupannya ikut ditampilkan di bawah strip angka
   * supaya user tahu kenapa angkanya bisa lebih besar dari sel yang ia lihat.
   */
  const summary = useMemo(
    () =>
      summarizePeriod(
        buildCalendarGrid({ entries, anchor, mode: periodMode, paydayDate }).cells,
      ),
    [entries, anchor, periodMode, paydayDate],
  )
  const cell = useMemo(() => selectCell(grid, selectedDate), [grid, selectedDate])

  /**
   * true = periode yang sedang dibaca memang tidak punya satu entri pun di
   * konteks ini → tampilkan empty state per konteks, bukan kalender kosong
   *
   * PAKET 56: penanda "periode kosong" hanya melihat entri tercatat. Dulu ia
   * ikut melihat `forecast`, jadi periode masa depan tanpa catatan sama sekali
   * dianggap BERPENGHUNI dan halaman menampilkan grid kosong tanpa penjelasan.
   */
  const periodEmpty = useMemo(
    () => !grid.cells.some((item) => item.inPeriod && item.entries.length > 0),
    [grid],
  )

  const label = periodLabel(anchor, periodMode, paydayDate)
  const rangeLabel = periodRangeLabel(anchor, periodMode, paydayDate)

  /* ── HANDLER ────────────────────────────────────────────────────────────── */

  /** pindah tab [Bulan Standar] ↔ [Siklus Gajian] — grid SHIFT, bukan cuma label */
  function handleModeChange(next: PeriodMode) {
    if (next === periodMode) return
    const nextAnchor = defaultAnchorFor(parseISO(selectedDate), next, paydayDate)
    const bounds = periodBounds(nextAnchor, next, paydayDate)
    setPeriodMode(next)
    setAnchor(nextAnchor)
    setSelectedDate(snapSelection(selectedDate, nextAnchor, bounds))
  }

  /** navigator ‹ › — geser satu bulan/satu siklus */
  function handleShift(months: number) {
    const nextAnchor = shiftAnchor(anchor, months)
    const bounds = periodBounds(nextAnchor, periodMode, paydayDate)
    setAnchor(nextAnchor)
    setSelectedDate(snapSelection(selectedDate, nextAnchor, bounds))
  }

  /** tombol "Hari Ini" — kembali ke periode yang memuat hari ini */
  function handleToday() {
    const nextAnchor = defaultAnchorFor(CALENDAR_TODAY, periodMode, paydayDate)
    setAnchor(nextAnchor)
    setSelectedDate(CALENDAR_TODAY_ISO)
  }

  /**
   * Pilih tanggal dari grid.
   *
   * Redesign: tidak ada lagi auto-scroll ke panel detail. Umpan balik instan
   * sudah diberikan bubble di atas sel, dan di mobile panel detail persis ada
   * di bawah kartu kalender — jadi layar tidak perlu "melompat" setiap kali
   * sebuah tanggal disentuh.
   */
  function handleSelectDate(iso: string) {
    setSelectedDate(iso)
  }

  /**
   * PAKET 56 — [Bayar Sekarang] DIHAPUS dari halaman ini.
   *
   * Aksi itu menandai tagihan ramalan "lunas" tanpa menulis satu baris pun ke
   * ledger: saldo dompet tidak bergerak, tagihan di `/bills` tidak berubah, dan
   * tandanya cuma hidup selama halaman terbuka (batas yang sudah ditulis jujur
   * di paket 49). Satu-satunya jalan membereskan tagihan adalah halaman
   * Tagihan, di mana "Tandai Lunas" benar-benar mengeluarkan uang dari dompet
   * yang dipilih (paket 51). Jadi jalur kedua ini ditutup, bukan dibiarkan
   * sebagai tombol yang terlihat seperti pembayaran.
   */

  /**
   * Simpan catatan dari modal — SATU PINTU TULIS (paket 49).
   *
   * Tidak ada entri yang dirakit di sini. Catatannya ditulis lewat
   * `useTransactionSubmit()` (hook yang sama dengan FAB & modal web) ke store
   * uang, lalu grid membacanya kembali dari ledger. Toast pun milik hook itu dan
   * baru berbunyi SETELAH tulisannya berhasil — jadi "tersimpan" untuk catatan
   * yang tidak ada mustahil diucapkan lagi.
   */
  function handleSaveNote(input: CalendarNoteInput) {
    /* TULIS → TUTUP PANEL → toast, seluruhnya di dalam hook. Dompetnya diisi
       EKSPLISIT dari dompet konteks aktif — persis dompet yang ditampilkan di
       sheet — supaya catatan ini tidak bergantung pada default tersembunyi */
    const written = submit({ ...input, wallet: defaultWallet }, () => setNoteSheetOpen(false))
    /* tidak ada yang ditulis (draft ditolak) → jangan gerakkan layar seolah ada
       catatan baru; hook sudah menutup panelnya */
    if (!written) return

    setSelectedDate(written.date)
    /* kalau user membuka kunci tanggal dan memilih tanggal di luar periode
       yang sedang tampil, periode ikut pindah supaya catatannya terlihat */
    if (!isWithinPeriod(written.date, bounds)) {
      setAnchor(defaultAnchorFor(parseISO(written.date), periodMode, paydayDate))
    }
  }

  /* ── RENDER ─────────────────────────────────────────────────────────────── */
  return (
    <ScreenShell>
      {/* header mobile: wordmark + tombol mata (kerangka sama dengan Dashboard) */}
      <header className="flex items-start justify-between lg:hidden">
        <LogoWordmark className="h-5" />
        <GlobalPrivacyToggle />
      </header>

      {/* switcher konteks (mobile): state GLOBAL yang sama dengan switcher
          desktop di baris judul — pola penempatan persis Home & Budget (paket 47). */}
      <div className="mt-4 flex justify-center lg:hidden">
        <ContextSwitcher value={context} onChange={setContext} />
      </div>

      <div className="mt-4 lg:mt-0 lg:flex lg:items-end lg:justify-between lg:gap-8">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-ink/45">{contextCaption(context)}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink lg:text-4xl">
            Kalender Cashflow
          </h1>
          {/* Satu baris ini menggantikan tiga chip meta versi pertama: barang
              pertama yang dibaca user haruslah TUJUAN halaman + satu perintah
              yang jelas, bukan deretan angka. */}
          <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-ink/50 lg:mt-2 lg:text-[13px]">
            Satu warna per tanggal, satu makna. Tap tanggalnya untuk melihat
            rincian harimu.
          </p>
          {/* catatan cakupan: strip angka periode = total SEMUA entri, sedangkan
              sel & daftar harinya mengikuti konteks aktif (kanon paket 47 #1) */}
          <p className="mt-1.5 max-w-md text-[11.5px] font-medium text-ink/45">
            {SCOPE_NOTE.calendar}
          </p>
        </div>

        {/* cluster aksi desktop: switcher konteks + tombol mata global */}
        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          <ContextSwitcher value={context} onChange={setContext} className="w-[280px]" />
          <GlobalPrivacyToggle />
        </div>
      </div>

      {/* empty state per konteks: kalau periode ini tidak punya satu entri pun di
          konteks aktif, katakan apa adanya + beri jalan keluar (bukan kalender
          kosong tanpa penjelasan). */}
      {periodEmpty && (
        <div className="mt-5 flex flex-col items-center rounded-[1.75rem] border-2 border-dashed border-forest/15 bg-cream/60 px-6 py-8 text-center lg:mt-6">
          <h2 className="font-display text-[15.5px] font-bold tracking-tight text-ink">
            {CONTEXT_EMPTY_COPY.calendar.title(CONTEXT_LABEL[context])}
          </h2>
          <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-ink/55">
            {CONTEXT_EMPTY_COPY.calendar.body}
          </p>
          <button
            type="button"
            onClick={() => setNoteSheetOpen(true)}
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-2xl bg-forest px-5 text-[13px] font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-[0.98]"
          >
            {CONTEXT_EMPTY_COPY.calendar.cta}
          </button>
        </div>
      )}

      {/* ── LAYOUT FLUID 2 KOLOM (tanpa container sempit di tengah) ──────────
          KIRI  7/12 → Kalender bulan / siklus gajian
          KANAN 5/12 → Panel detail tanggal (sticky, mengikuti tanggal terpilih) */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:mt-6 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-7">
          <CashflowCalendarGrid
            grid={grid}
            mode={periodMode}
            paydayDate={paydayDate}
            label={label}
            rangeLabel={rangeLabel}
            summary={summary}
            selectedDate={selectedDate}
            masked={masked}
            onModeChange={handleModeChange}
            onShift={handleShift}
            onToday={handleToday}
            onSelectDate={handleSelectDate}
          />
        </div>

        <div className="lg:col-span-5">
          <CashflowInspector
            cell={cell}
            masked={masked}
            dailyAverage={grid.dailyAverage}
            onAddNote={() => setNoteSheetOpen(true)}
          />
        </div>
      </div>

      {/* modal catatan: tanggal terpilih dibawa masuk dalam keadaan terkunci,
          dan dompet tujuan ditampilkan (sheet-nya tanpa pemilih dompet) */}
      <AddCalendarNoteSheet
        open={noteSheetOpen}
        onClose={() => setNoteSheetOpen(false)}
        date={selectedDate}
        walletName={defaultWallet}
        onSubmit={handleSaveNote}
      />
    </ScreenShell>
  )
}
