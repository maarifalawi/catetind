import { describe, expect, it } from 'vitest'
import { INITIAL_BILLS } from './bills'
import { CALENDAR_ENTRIES } from './calendar'
import { INITIAL_DEBTS, INITIAL_INVESTMENTS } from './wealth'
import {
  CONTEXT_EMPTY_COPY,
  CONTEXT_LABEL,
  JOINT_CONTEXT_COPY,
  SCOPE_NOTE,
  contextCaption,
  contextName,
  scopedItems,
} from './money-context'

/* ── Test KONTEKS UANG DI SELURUH HALAMAN (paket 47) ────────────────────────
   Dua hal yang dikunci di sini:

     1. `scopedItems()` benar-benar menyaring `scope` (dan tidak menyaring apa
        pun saat konteksnya sama).
     2. SEED mock punya isi di KETIGA konteks. Ini bukan tes hiasan: kalau semua
        seed `pribadi`, bug "daftar tidak berubah saat konteks ditukar" tidak
        akan pernah terlihat di demo maupun di test.

   Yang TIDAK diuji di sini: penyaringan baris ledger & penanda "belum
   berkonteks" — itu di `lib/money/context-filter.test.ts`.
   ────────────────────────────────────────────────────────────────────────── */

const CONTEXTS = ['pribadi', 'keluarga', 'bersama'] as const

describe('scopedItems', () => {
  it('menyaring daftar ber-`scope` tanpa mengubah urutan', () => {
    const items = [
      { id: 'a', scope: 'pribadi' as const },
      { id: 'b', scope: 'keluarga' as const },
      { id: 'c', scope: 'pribadi' as const },
    ]
    expect(scopedItems(items, 'pribadi').map((item) => item.id)).toEqual(['a', 'c'])
    expect(scopedItems(items, 'keluarga').map((item) => item.id)).toEqual(['b'])
    expect(scopedItems(items, 'bersama')).toEqual([])
  })

  it('jumlah semua konteks = panjang daftar (tidak ada baris yang hilang)', () => {
    const total = CONTEXTS.reduce((sum, ctx) => sum + scopedItems(INITIAL_BILLS, ctx).length, 0)
    expect(total).toBe(INITIAL_BILLS.length)
  })
})

describe('seed mock punya isi di KETIGA konteks', () => {
  /** nama-nama item per konteks — dipakai agar pesan gagalnya informatif */
  function spread<T extends { scope: string; name?: string }>(items: T[]) {
    return Object.fromEntries(
      CONTEXTS.map((ctx) => [
        ctx,
        items.filter((item) => item.scope === ctx).length,
      ]),
    )
  }

  it('tagihan rutin: mayoritas Pribadi, tapi ada Keluarga & Bersama', () => {
    const counts = spread(INITIAL_BILLS)
    expect(counts.pribadi).toBeGreaterThan(counts.keluarga)
    expect(counts.keluarga).toBeGreaterThan(0)
    expect(counts.bersama).toBeGreaterThan(0)
  })

  it('hutang/piutang: ketiga konteks terisi', () => {
    const counts = spread(INITIAL_DEBTS)
    for (const ctx of CONTEXTS) expect(counts[ctx]).toBeGreaterThan(0)
  })

  it('aset investasi: ada Pribadi & Keluarga (Bersama memang boleh kosong → empty state)', () => {
    const counts = spread(INITIAL_INVESTMENTS)
    expect(counts.pribadi).toBeGreaterThan(0)
    expect(counts.keluarga).toBeGreaterThan(0)
  })

  it('entri kalender: ketiga konteks terisi', () => {
    const counts = spread(CALENDAR_ENTRIES)
    for (const ctx of CONTEXTS) expect(counts[ctx]).toBeGreaterThan(0)
  })

  it('ringkasan kalender tetap utuh: menyaring konteks TIDAK menghapus entri dari data', () => {
    const total = CONTEXTS.reduce((sum, ctx) => sum + scopedItems(CALENDAR_ENTRIES, ctx).length, 0)
    expect(total).toBe(CALENDAR_ENTRIES.length)
  })
})

describe('copy konteks', () => {
  it('label konteks & caption konsisten di satu sumber', () => {
    expect(CONTEXT_LABEL.pribadi).toBe('Pribadi')
    expect(contextName('keluarga')).toBe('keluarga')
    expect(contextCaption('bersama')).toBe('Konteks uang: Bersama')
  })

  it('empty state per konteks menyebut konteksnya + selalu punya CTA', () => {
    for (const ctx of CONTEXTS) {
      const label = CONTEXT_LABEL[ctx]
      expect(CONTEXT_EMPTY_COPY.wallet.title(label)).toContain(label)
      expect(CONTEXT_EMPTY_COPY.history.title(label)).toContain(label)
      expect(CONTEXT_EMPTY_COPY.bills.title(label)).toContain(label)
      expect(CONTEXT_EMPTY_COPY.investments.title(label)).toContain(label)
      expect(CONTEXT_EMPTY_COPY.debts.title(label)).toContain(label)
      expect(CONTEXT_EMPTY_COPY.calendar.title(label)).toContain(label)
    }
    expect(CONTEXT_EMPTY_COPY.wallet.cta('Keluarga')).toBe('Tambah dompet keluarga')
    expect(CONTEXT_EMPTY_COPY.history.cta.length).toBeGreaterThan(0)
    expect(CONTEXT_EMPTY_COPY.bills.cta.length).toBeGreaterThan(0)
    expect(CONTEXT_EMPTY_COPY.investments.cta.length).toBeGreaterThan(0)
    expect(CONTEXT_EMPTY_COPY.debts.cta.length).toBeGreaterThan(0)
    expect(CONTEXT_EMPTY_COPY.calendar.cta.length).toBeGreaterThan(0)
  })

  it('setiap angka total punya kalimat cakupan (kanon #1)', () => {
    for (const note of Object.values(SCOPE_NOTE)) {
      expect(note.length).toBeGreaterThan(10)
    }
  })

  it('notice /joint menyebut konteks aktif & menyediakan satu tombol pindah', () => {
    expect(JOINT_CONTEXT_COPY.body('Pribadi')).toContain('Pribadi')
    expect(JOINT_CONTEXT_COPY.cta).toBe('Pindah ke Bersama')
  })
})
