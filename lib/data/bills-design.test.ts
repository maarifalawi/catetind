import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { BillsOverview } from '@/components/catetind/bills-overview'
import { BillTimeline } from '@/components/catetind/bill-timeline'
import { BillCard } from '@/components/catetind/bill-card'
import { CURRENT_DAY, INITIAL_BILLS, TODAY_ISO } from '@/lib/data/bills'

/* ── SMOKE TEST REDESAIN HALAMAN TAGIHAN ─────────────────────────────────────
   Mengunci janji desain yang tidak terlihat dari tipe: kartu ringkasan tidak
   boleh memuat porsi pemasukan, kalender 14 hari tidak boleh memuat baris pratinjau
   / legenda / label jumlah, dan tiap status baris harus memakai tint Earth
   Pastel yang benar. Render memakai `react-dom/server` (environment node,
   tanpa DOM) supaya bisa dijalankan di konfigurasi Vitest repo ini. */

const render = (element: ReturnType<typeof createElement>) => renderToStaticMarkup(element)

describe('redesain Tagihan Rutin (render nyata)', () => {
  it('ringkasan hanya memuat nominal, progres, dan satu baris status', () => {
    const html = render(
      createElement(BillsOverview, {
        bills: INITIAL_BILLS,
        masked: false,
        currentDay: CURRENT_DAY,
      }),
    )
    expect(html).toContain('Belum dibayar')
    expect(html).toContain('2 dari 6 tagihan belum lunas')
    expect(html).toContain('Total ')
    expect(html).not.toContain('Gaji terpakai')
    expect(html).not.toContain('dari pemasukan')
    expect(html).not.toContain('Jatah harian')
    expect(html).not.toContain('Dibayar ')
  })

  it('kalender 14 hari: tanggal + titik, tanpa legenda/pratinjau', () => {
    const html = render(
      createElement(BillTimeline, {
        bills: INITIAL_BILLS,
        currentDay: CURRENT_DAY,
        todayIso: TODAY_ISO,
        masked: false,
        onPick: () => {},
      }),
    )
    /* 14 sel tanggal (sel kosong padding bukan tombol) */
    expect((html.match(/<button/g) ?? []).length).toBe(14)
    expect(html).toContain('Tagihan 14 hari ke depan')
    expect(html).not.toContain('Tanggal bertitik')
    expect(html).not.toContain('hari lagi')
    expect(html).not.toContain('tagihan lain')
    expect(html).not.toContain('Minggu ini aman')
    expect(html).toContain('bg-daisy/[0.13]')
  })

  it('baris tagihan memakai tint status + CTA yang berbeda', () => {
    const unpaid = INITIAL_BILLS.find((bill) => !bill.isPaidThisMonth)!
    const paid = INITIAL_BILLS.find((bill) => bill.isPaidThisMonth)!
    const props = {
      masked: false,
      currentDay: CURRENT_DAY,
      stamp: 'none' as const,
      onMarkPaid: () => {},
      onUnmarkPaid: () => {},
      onEdit: () => {},
      onDelete: () => {},
    }
    const unpaidHtml = render(createElement(BillCard, { ...props, bill: unpaid }))
    const paidHtml = render(
      createElement(BillCard, { ...props, bill: { ...paid, paidRowId: 'row-paid' } }),
    )
    const overdueHtml = render(
      createElement(BillCard, {
        ...props,
        bill: { ...unpaid, id: 'smoke-overdue', name: 'Telat', dueDate: CURRENT_DAY - 3 },
      }),
    )
    /* tint memakai opasitas daftar halaman lain (`CATEGORY_VISUAL.row`) */
    expect(unpaidHtml).toContain('bg-daisy/[0.13]')
    expect(unpaidHtml).toContain('Bayar')
    expect(unpaidHtml).not.toContain('>Lunas</span>')
    expect(paidHtml).toContain('bg-mint/[0.14]')
    /* baris lunas tidak lagi membawa label "Lunas" — hanya tombol batal */
    expect(paidHtml).not.toContain('>Lunas</span>')
    expect(paidHtml).not.toContain('Lunas ✓')
    expect(paidHtml).toContain('Batalkan status lunas Kos Bulanan')
    /* telat → Plum tipis + label CTA mendesak, tanpa ring berwarna */
    expect(overdueHtml).toContain('bg-plum/[0.09]')
    expect(overdueHtml).toContain('Bayar Sekarang')
    expect(overdueHtml).not.toContain('ring-plum')
  })

  it('saat semua lunas, ringkasan memakai kalimat pendek', () => {
    const html = render(
      createElement(BillsOverview, {
        bills: INITIAL_BILLS.map((bill) => ({ ...bill, isPaidThisMonth: true })),
        masked: false,
        currentDay: CURRENT_DAY,
      }),
    )
    expect(html).toContain('Udah lunas semua')
    expect(html).not.toContain('Semua tagihan bulan ini lunas')
  })
})
