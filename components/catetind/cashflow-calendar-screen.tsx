'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ScreenShell } from './screen-shell'
import { LogoWordmark } from './logo-wordmark'
import { GlobalPrivacyToggle } from './global-privacy-toggle'
import { usePrivacy } from './privacy-provider'
import { CashflowCalendarGrid } from './cashflow-calendar-grid'
import { CashflowInspector } from './cashflow-inspector'
import { AddCalendarNoteSheet, type CalendarNoteInput } from './add-calendar-note-sheet'
import { maskMoney, localISODate } from '@/lib/data/history'
import {
  CALENDAR_ENTRIES,
  CALENDAR_TODAY,
  CALENDAR_TODAY_ISO,
  DEFAULT_PAYDAY_DATE,
  buildCalendarGrid,
  defaultAnchorFor,
  isWithinPeriod,
  periodBounds,
  periodLabel,
  periodRangeLabel,
  selectCell,
  shiftAnchor,
  shortDateLabel,
  summarizePeriod,
  type CalendarEntry,
  type CalendarEntryType,
  type PeriodBounds,
  type PeriodMode,
} from '@/lib/data/calendar'
import { readOnboardingResult } from '@/lib/onboarding'
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

/** jam lokal sekarang `HH:MM` — dipanggil dari event handler, bukan saat render */
function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function CashflowCalendarScreen() {
  /* privasi nominal: state GLOBAL (PrivacyProvider) */
  const { masked } = usePrivacy()

  /* ── STATE (kontrak dari PRD) ───────────────────────────────────────────── */
  const [selectedDate, setSelectedDate] = useState<string>(CALENDAR_TODAY_ISO)
  const [periodMode, setPeriodMode] = useState<PeriodMode>('standard')
  /** jangkar navigator; tanggalnya menentukan siklus mana yang dirender */
  const [anchor, setAnchor] = useState<Date>(CALENDAR_TODAY)
  /** tanggal gajian dari Pengaturan (default 25) */
  const [paydayDate, setPaydayDate] = useState<number>(DEFAULT_PAYDAY_DATE)
  /** catatan yang user tambahkan sendiri di sesi ini (mock — nanti Supabase) */
  const [noteEntries, setNoteEntries] = useState<CalendarEntry[]>([])
  /** ramalan yang sudah ditandai lunas lewat [Bayar Sekarang] */
  const [paidForecastIds, setPaidForecastIds] = useState<string[]>([])
  const [noteSheetOpen, setNoteSheetOpen] = useState(false)

  /* pengaturan gajian dibaca setelah mount (hidrasi aman) */
  useEffect(() => {
    const stored = readOnboardingResult()?.paydayDate
    if (stored && stored >= 1 && stored <= 31) setPaydayDate(stored)
  }, [])

  /* ── DATA TURUNAN ───────────────────────────────────────────────────────── */
  const entries = useMemo(() => {
    /* ramalan yang sudah dibayar turun statusnya jadi 'cleared' supaya berhenti
       muncul sebagai tagihan menunggu (dan hilang dari chip "menunggu") */
    if (paidForecastIds.length === 0) return [...CALENDAR_ENTRIES, ...noteEntries]
    const paid = new Set(paidForecastIds)
    return [...CALENDAR_ENTRIES, ...noteEntries].map((entry) =>
      paid.has(entry.id) ? { ...entry, status: 'cleared' as const } : entry,
    )
  }, [noteEntries, paidForecastIds])

  const grid = useMemo(
    () => buildCalendarGrid({ entries, anchor, mode: periodMode, paydayDate }),
    [entries, anchor, periodMode, paydayDate],
  )
  const summary = useMemo(() => summarizePeriod(grid.cells), [grid])
  const cell = useMemo(() => selectCell(grid, selectedDate), [grid, selectedDate])

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

  /** [Bayar Sekarang] di inspector: tagihan ramalan ditandai lunas */
  function handlePayForecast(entry: CalendarEntry) {
    setPaidForecastIds((prev) => (prev.includes(entry.id) ? prev : [...prev, entry.id]))
    toast.success(`${entry.name} ditandai lunas 🎉`, {
      description: `${shortDateLabel(entry.date)} · ${maskMoney(entry.amount, masked)}`,
    })
  }

  /** simpan catatan baru dari modal (tanggal sudah dibawa dari inspector) */
  function handleSaveNote(input: CalendarNoteInput) {
    const iso = input.date || selectedDate
    const type: CalendarEntryType =
      input.type === 'income'
        ? 'income'
        : input.type === 'expense'
          ? 'variable_expense'
          : 'money_movement'

    const entry: CalendarEntry = {
      id: `note-${iso}-${noteEntries.length + 1}`,
      date: iso,
      name:
        input.note.trim() ||
        (type === 'income' ? 'Pemasukan' : type === 'money_movement' ? 'Pindah dana' : 'Pengeluaran'),
      amount: input.amount,
      type,
      /* catatan yang user ketik sendiri = uang yang benar-benar tercatat */
      status: 'cleared',
      category:
        type === 'income' ? 'Pemasukan Lain' : type === 'money_movement' ? 'Tabungan' : 'Lainnya',
      wallet: 'Tunai',
      emoji: type === 'income' ? '💰' : type === 'money_movement' ? '🏦' : '🧾',
      time: nowTime(),
    }

    setNoteEntries((prev) => [...prev, entry])
    setSelectedDate(iso)

    /* kalau user membuka kunci tanggal dan memilih tanggal di luar periode
       yang sedang tampil, periode ikut pindah supaya catatannya terlihat */
    if (!isWithinPeriod(iso, periodBounds(anchor, periodMode, paydayDate))) {
      setAnchor(defaultAnchorFor(parseISO(iso), periodMode, paydayDate))
    }

    toast.success(`Catatan ${shortDateLabel(iso)} tersimpan 🌱`)
  }

  /* ── RENDER ─────────────────────────────────────────────────────────────── */
  return (
    <ScreenShell>
      {/* header mobile: wordmark + tombol mata (kerangka sama dengan Dashboard) */}
      <header className="flex items-start justify-between lg:hidden">
        <LogoWordmark className="h-5" />
        <GlobalPrivacyToggle />
      </header>

      <div className="mt-4 lg:mt-0 lg:flex lg:items-end lg:justify-between lg:gap-8">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink lg:text-4xl">
            Kalender Cashflow
          </h1>
          {/* Satu baris ini menggantikan tiga chip meta versi pertama: barang
              pertama yang dibaca user haruslah TUJUAN halaman + satu perintah
              yang jelas, bukan deretan angka. */}
          <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-ink/50 lg:mt-2 lg:text-[13px]">
            Satu warna per tanggal, satu makna. Tap tanggalnya untuk melihat
            rincian harimu.
          </p>
        </div>

        {/* tombol mata global GLOBAL — pill berlabel di desktop */}
        <div className="hidden shrink-0 lg:block">
          <GlobalPrivacyToggle />
        </div>
      </div>

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
            paidForecastIds={paidForecastIds}
            onAddNote={() => setNoteSheetOpen(true)}
            onPayForecast={handlePayForecast}
          />
        </div>
      </div>

      {/* modal catatan: tanggal terpilih dibawa masuk dalam keadaan terkunci */}
      <AddCalendarNoteSheet
        open={noteSheetOpen}
        onClose={() => setNoteSheetOpen(false)}
        date={selectedDate}
        onSave={handleSaveNote}
      />
    </ScreenShell>
  )
}
