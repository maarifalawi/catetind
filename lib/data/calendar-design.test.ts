import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { parseISO } from 'date-fns'
import { CashflowCalendarGrid } from '@/components/catetind/cashflow-calendar-grid'
import { CashflowInspector } from '@/components/catetind/cashflow-inspector'
import {
  buildCalendarGrid,
  selectCell,
  summarizePeriod,
  type CalendarEntry,
} from './calendar'

/* ── SMOKE TEST REDESAIN HALAMAN KALENDER CASHFLOW ───────────────────────────
   Mengunci janji desain yang tidak terlihat dari tipe: tidak ada legenda,
   tidak ada tooltip di atas sel, tidak ada nominal di dalam sel, tidak ada
   banner peringatan di panel hari, dan baris transaksi memakai tabel visual
   yang sama dengan Riwayat/Dashboard.

   Render memakai `react-dom/server` (environment node, tanpa DOM) — pola yang
   sama dengan `lib/data/bills-design.test.ts`. */

const render = (element: ReturnType<typeof createElement>) => renderToStaticMarkup(element)

const TODAY = '2026-09-22'
const SELECTED_BILL_DATE = '2026-09-20'

const ENTRIES: CalendarEntry[] = [
  {
    id: 'kalender-var-1',
    date: TODAY,
    name: 'Delivery Makanan',
    amount: 100_000,
    type: 'variable_expense',
    category: 'Makanan',
    wallet: 'BCA',
    emoji: '🍜',
    time: '12:10',
    scope: 'pribadi',
  },
  {
    id: 'kalender-var-2',
    date: TODAY,
    name: 'Ojek Online',
    amount: 1_000_000,
    type: 'variable_expense',
    category: 'Transportasi',
    wallet: 'BCA',
    emoji: '🛵',
    time: '18:05',
    scope: 'pribadi',
  },
  {
    id: 'kalender-bill-1',
    date: SELECTED_BILL_DATE,
    name: 'Kos Bulanan',
    amount: 1_500_000,
    type: 'fixed_bill',
    category: 'Tagihan',
    wallet: 'BCA',
    emoji: '🧾',
    time: '09:00',
    scope: 'pribadi',
  },
]

const GRID = buildCalendarGrid({
  entries: ENTRIES,
  anchor: parseISO('2026-09-25'),
  mode: 'standard',
  paydayDate: 25,
  todayIso: TODAY,
})
const SUMMARY = summarizePeriod(GRID.cells)
const SELECTED_CELL = selectCell(GRID, TODAY)!

function gridHtml() {
  return render(
    createElement(CashflowCalendarGrid, {
      grid: GRID,
      mode: 'standard',
      label: 'September 2026',
      summary: SUMMARY,
      selectedDate: TODAY,
      masked: false,
      onModeChange: () => {},
      onShift: () => {},
      onToday: () => {},
      onSelectDate: () => {},
    }),
  )
}

function inspectorHtml() {
  return render(
    createElement(CashflowInspector, {
      cell: SELECTED_CELL,
      masked: false,
      onAddNote: () => {},
    }),
  )
}

describe('redesain Kalender Cashflow (render nyata)', () => {
  it('header hanya membawa periode, net, navigator, mode, dan Hari Ini', () => {
    const html = gridHtml()

    expect(html).toContain('September 2026')
    expect(html).toContain('Net')
    expect(html).toContain('−Rp 2.600.000')
    expect(html).toContain('Bulanan')
    expect(html).toContain('Siklus Gajian')
    expect(html).toContain('Hari Ini')

    /* sub-teks rentang tanggal dihapus */
    expect(html).not.toContain('1 – 30 September 2026')
    /* seluruh legenda warna dihapus dari layar */
    expect(html).not.toContain('Keterangan')
    expect(html).not.toContain('Warna')
    expect(html).not.toContain('Boros')
    expect(html).not.toContain('Surplus')
    expect(html).not.toContain('Nol jajan')
    expect(html).not.toContain('Ada belanja')
    expect(html).not.toContain('Tagihan Tetap')
    expect(html).not.toContain('Belum berjalan')
    /* tooltip di atas sel dihapus */
    expect(html).not.toContain('role="tooltip"')
    /* nominal ringkas di dalam sel dihapus */
    expect(html).not.toContain('−100rb')
    expect(html).not.toContain('−1jt')
  })

  it('sel = tanggal + tint + satu titik tagihan; tanggal terpilih memakai ring', () => {
    const html = gridHtml()

    /* hanya tanggal 20 yang punya tagihan terjadwal */
    expect((html.match(/bg-current opacity-60/g) ?? []).length).toBe(1)
    /* pola terpilih yang sama dengan kalender Tagihan */
    expect(html).toContain('ring-2 ring-inset ring-forest/70')
  })

  it('panel hari: tanpa banner peringatan, CTA penuh, baris bergaya Riwayat', () => {
    const html = inspectorHtml()

    expect(html).toContain('Hari Ini')
    expect(html).toContain('Selasa, 22 September 2026')
    expect(html).toContain('−Rp 1.100.000 keluar')
    expect(html).toContain('2 catatan')
    expect(html).toContain('Tambah Catatan di Tgl 22')
    expect(html).toContain('h-11 w-full')
    expect(html).toContain('rounded-full bg-forest')
    expect(html).toContain('Transaksi')

    /* banner belanja di atas rata-rata + catatan tagihan dihapus */
    expect(html).not.toContain('di atas rata-rata harianmu')
    expect(html).not.toContain('Tagihan terjadwal tampil netral')

    /* baris transaksi: visual yang sama dengan History/Dashboard */
    expect(html).toContain('Delivery Makanan')
    expect(html).toContain('-Rp 100.000')
    expect(html).toContain('bg-cantelope/[0.10]')
    expect(html).toContain('bg-thistle/[0.10]')
    /* satu chip kategori per baris (tidak ada chip tipe kembar) */
    expect((html.match(/>Makanan</g) ?? []).length).toBe(1)
    expect(html).not.toContain('>Variabel<')
    expect(html).not.toContain('>Pindah dana<')
  })
})
