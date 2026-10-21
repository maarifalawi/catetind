import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { WealthNetWorthBar } from '@/components/catetind/wealth-net-worth-bar'
import { WealthAssetDonut } from '@/components/catetind/wealth-asset-donut'
import { WealthInvestasi } from '@/components/catetind/wealth-investasi'
import { WealthHutang } from '@/components/catetind/wealth-hutang'
import { INITIAL_DEBTS, INITIAL_INVESTMENTS, compactMoney, type Debt } from './wealth'

/* ── SMOKE TEST REDESAIN HALAMAN KEKAYAAN & HUTANG ───────────────────────────
   Mengunci janji desain yang tidak terlihat dari tipe:
   · angka Net Worth tidak pernah dipotong (`truncate`) — versi ringkas + nominal
     penuh sebagai sub-label;
   · donut & legendanya hilang saat aset tinggal satu;
   · aksi Edit/Hapus Investasi berupa ikon inline (bukan baris tombol lebar);
   · baris snowball adalah daftar hutangnya sendiri: "Catat Bayar" inline, tanpa
     section PLATFORM kedua, tanpa badge "Mulai dari sini", tanpa copy onboarding,
     dan label jatuh tempo hanya muncul kalau tanggalnya ada.

   Render memakai `react-dom/server` (environment node, tanpa DOM) — pola yang
   sama dengan `lib/data/bills-design.test.ts` & `calendar-design.test.ts`. */

const render = (element: ReturnType<typeof createElement>) => renderToStaticMarkup(element)

const PLATFORM_ONLY = INITIAL_DEBTS.filter((debt) => debt.type === 'platform')

const HUTANG_PROPS = {
  payments: [],
  view: 'hutangku' as const,
  onChangeView: () => {},
  masked: false,
  monthlyIncome: 7_500_000,
  celebrateId: null,
  walletOptions: [{ id: 'bca', label: 'BCA', balance: 2_000_000 }],
  onAddDebt: () => {},
  onPayDebt: () => true,
  onEditDebt: () => {},
  onDeleteDebt: () => {},
}

const INVESTASI_PROPS = {
  transactions: [],
  masked: false,
  expandedAssetId: null,
  onToggleExpand: () => {},
  onAdd: () => {},
  onUpdatePrice: () => {},
  onEdit: () => {},
  onDelete: () => {},
}

describe('hero Kekayaan Bersih', () => {
  it('nominal ringkas + nominal penuh, tanpa truncate', () => {
    const html = render(
      createElement(WealthNetWorthBar, {
        cash: 1_263_347_037,
        investments: 0,
        physical: 0,
        receivables: 0,
        debts: 1_500_000,
        masked: false,
      }),
    )
    expect(html).toContain('Rp 1,26 M')
    expect(html).toContain('Rp 1.261.847.037')
    expect(html).not.toContain('truncate')
    expect(html).not.toContain('Aset ·')
    expect(html).not.toContain('Hutang ·')
  })

  it('compactMoney tetap jujur untuk nominal kecil & privasi', () => {
    expect(compactMoney(1_261_847_037)).toBe('Rp 1,26 M')
    expect(compactMoney(1_261_847)).toBe('Rp 1,26 jt')
    expect(compactMoney(12_600_000)).toBe('Rp 12,6 jt')
    expect(compactMoney(126_000_000)).toBe('Rp 126 jt')
    expect(compactMoney(950_000)).toBe('Rp 950.000')
    expect(compactMoney(-1_261_847_037)).toBe('−Rp 1,26 M')
    expect(compactMoney(1_261_847_037, true)).toBe('Rp •••••••')
  })
})


describe('donut alokasi', () => {
  it('hilang saat aset tinggal satu (atau satu jenis)', () => {
    expect(
      render(
        createElement(WealthAssetDonut, {
          investments: INITIAL_INVESTMENTS.slice(0, 1),
          masked: false,
        }),
      ),
    ).toBe('')
    const sameType = [
      INITIAL_INVESTMENTS[0],
      { ...INITIAL_INVESTMENTS[0], id: 'reksadana-kedua', name: 'Reksadana Kedua' },
    ]
    expect(render(createElement(WealthAssetDonut, { investments: sameType, masked: false }))).toBe('')
  })

  it('tampil dengan ≥ 2 jenis, TANPA legenda duplikat', () => {
    const html = render(
      createElement(WealthAssetDonut, {
        investments: INITIAL_INVESTMENTS.slice(0, 2),
        masked: false,
      }),
    )
    expect(html).toContain('Alokasi Aset')
    /* legenda lama satu-satunya <ul> di kartu ini — sekarang daftar aset yang
       jadi legenda, jadi donut tidak boleh punya daftar sendiri */
    expect(html).not.toContain('<ul')
  })
})

describe('tab Investasi', () => {
  it('aksi Edit/Hapus inline sebagai ikon, bukan baris tombol lebar', () => {
    const asset = INITIAL_INVESTMENTS[0]
    const html = render(
      createElement(WealthInvestasi, { ...INVESTASI_PROPS, investments: [asset] }),
    )
    expect(html).toContain(`aria-label="Edit ${asset.name}"`)
    expect(html).toContain(`aria-label="Hapus ${asset.name}"`)
    expect(html).not.toContain('>Edit<')
    expect(html).not.toContain('>Hapus<')
    /* satu aset → donut & kepala "N aset" tidak perlu tampil */
    expect(html).not.toContain('Alokasi Aset')
    expect(html).not.toContain('1 aset')
  })
})

describe('tab Hutangku', () => {
  it('baris snowball = daftar hutang, aksi inline, tanpa duplikat', () => {
    const html = render(createElement(WealthHutang, { ...HUTANG_PROPS, debts: INITIAL_DEBTS }))
    expect(html).toContain('Debt Snowball Tracker')
    expect(html).toContain('Catat Bayar')
    expect(html).toContain('Jatuh tempo tanggal 10')
    expect(html).toContain('role="progressbar"')
    expect(html).toContain('Rp 1.250.000')
    expect(html).toContain('Rp 4.500.000')

    /* yang dihapus tidak boleh kembali */
    expect(html).not.toContain('PLATFORM')
    expect(html).not.toContain('Mulai dari sini')
    expect(html).not.toContain('Lunasi dari yang terkecil dulu.')
    expect(html).not.toContain('Snowball Progress')
  })

  it('label jatuh tempo hilang saat tanggalnya tidak ada', () => {
    const withoutDue = PLATFORM_ONLY.map(({ dueDate, ...rest }) => rest as Debt)
    const html = render(createElement(WealthHutang, { ...HUTANG_PROPS, debts: withoutDue }))
    expect(html).not.toContain('Jatuh tempo')
  })

  it('empty state PERSONAL = ikon + satu baris + satu tombol', () => {
    const html = render(createElement(WealthHutang, { ...HUTANG_PROPS, debts: PLATFORM_ONLY }))
    expect(html).toContain('Belum ada hutang personal aktif')
    expect(html).toContain('Tambah Catatan')
    expect(html).not.toContain('bukan buat ngejar-ngejar')
    expect(html).not.toContain('Catat aja biar gak lupa')
  })
})
