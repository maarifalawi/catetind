import { describe, expect, it } from 'vitest'
import { normalizeExtraction } from './extract'

/* Normalisasi menjepit JSON model ke nilai kanon app; yang diuji: field tak sah
   TIDAK dipakai apa adanya, dan `lowFields` jujur menyebut apa yang perlu dicek. */

describe('normalizeExtraction', () => {
  it('menerima hasil yang lengkap & sah', () => {
    const result = normalizeExtraction('receipt', {
      name: 'Belanja Indomaret',
      amount: 87500,
      category: 'Belanja',
      wallet: 'Tunai',
      type: 'expense',
      date: '2026-10-03',
      confidence: 0.9,
    })
    expect(result.source).toBe('receipt')
    expect(result.amount).toBe(87500)
    expect(result.category).toBe('Belanja')
    expect(result.wallet).toBe('Tunai')
    expect(result.date).toBe('2026-10-03')
    expect(result.lowFields).toEqual([])
    expect(result.confidence).toBeLessThan(1)
  })

  it('kategori di luar daftar kanon → fallback "Lainnya" + ditandai low', () => {
    const result = normalizeExtraction('receipt', { name: 'X', amount: 1000, category: 'Kopi Susu' })
    expect(result.category).toBe('Lainnya')
    expect(result.lowFields).toContain('category')
  })

  it('dompet tak dikenal → "Tunai"', () => {
    const result = normalizeExtraction('voice', { name: 'X', amount: 1000, wallet: 'Dana' })
    expect(result.wallet).toBe('Tunai')
  })

  it('nominal 0 → confidence dipaksa < ambang A11 & amount ditandai', () => {
    const result = normalizeExtraction('receipt', { name: 'Struk', amount: 0, confidence: 0.99 })
    expect(result.amount).toBe(0)
    expect(result.confidence).toBeLessThan(0.5)
    expect(result.lowFields).toContain('amount')
  })

  it('tanggal tidak sah → pakai `today`', () => {
    const result = normalizeExtraction('voice', { name: 'X', amount: 5000, date: 'kemarin' }, '2026-10-04')
    expect(result.date).toBe('2026-10-04')
  })

  it('nama kosong → fallback sesuai sumber', () => {
    expect(normalizeExtraction('receipt', { amount: 5000 }).name).toContain('struk')
    expect(normalizeExtraction('voice', { amount: 5000 }).name).toContain('suara')
    /* PAKET 79: ketikan di chat punya kata jatuhnya sendiri — user yang mengetik
       tidak boleh diberi catatan bernama "Catatan dari suara" */
    expect(normalizeExtraction('chat', { amount: 5000 }).name).toContain('chat')
  })

  it('sumber ketikan dipertahankan apa adanya di hasil normalisasi', () => {
    const result = normalizeExtraction('chat', {
      name: 'Air minum',
      amount: 5000,
      category: 'Makanan',
      wallet: 'Tunai',
      type: 'expense',
      date: '2026-10-08',
      confidence: 0.9,
    })
    expect(result.source).toBe('chat')
    expect(result.name).toBe('Air minum')
    expect(result.lowFields).toEqual([])
  })
})
