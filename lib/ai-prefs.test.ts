import { describe, expect, it } from 'vitest'
import {
  AI_PREFS_DEFAULT,
  AI_PREFS_KEY,
  readAiPrefs,
  withCapturePrefs,
  writeAiPrefs,
} from './ai-prefs'
import type { TransactionDraftForm } from './transaction-ai'

/* ── Test SAKLAR AI YANG BENAR-BENAR DIBACA (paket 54) ───────────────────────
   Yang dikunci di sini: saklar "Kategorisasi Otomatis oleh AI" & "Penamaan
   Otomatis Transaksi" dulu tersimpan rapi di localStorage tapi TIDAK dibaca
   siapa pun (grep berhenti di `settings-panel-preferences.tsx`) — kontrol yang
   tidak mengontrol apa pun. Paket 54 memilih jalan (b) FUNGSIKAN, dan
   pembacanya cuma satu jalur: AI capture (struk & ucapan).

   Test ini LAPIS ATURAN, bukan test browser: bukti bahwa jalur capture benar
   memanggilnya ada di `hooks/use-transaction-capture.ts`, dan langkah
   verifikasi manualnya ditulis di laporan paket 54. */

/** draft khas hasil "AI baca struk" — nilai AI sudah terisi */
const capturedDraft: TransactionDraftForm = {
  source: 'receipt',
  type: 'expense',
  name: 'Belanja Indomaret Cilandak',
  amountDigits: '87500',
  category: 'Belanja',
  wallet: 'Tunai',
  date: '2026-09-28',
  confidence: 0.82,
  lowFields: [],
}

/** localStorage tiruan: di lingkungan test (node) `window` tidak ada sama sekali */
function withFakeWindow(
  storage: { getItem: () => string | null; setItem?: (value: string) => void },
  run: () => void,
) {
  const globalWithWindow = globalThis as { window?: unknown }
  const before = globalWithWindow.window
  globalWithWindow.window = {
    localStorage: {
      getItem: storage.getItem,
      setItem: (_key: string, value: string) => storage.setItem?.(value),
    },
  }
  try {
    run()
  } finally {
    globalWithWindow.window = before
  }
}

describe('readAiPrefs', () => {
  it('tanpa window (server/test) → default: saklar ON, Mode Bestie', () => {
    expect(readAiPrefs()).toEqual(AI_PREFS_DEFAULT)
  })

  it('menyimpan ke kunci lama supaya preferensi user tidak hilang', () => {
    expect(AI_PREFS_KEY).toBe('catet-ai-prefs')
  })

  it('membaca isi tersimpan apa adanya', () => {
    withFakeWindow(
      {
        getItem: () =>
          JSON.stringify({ autoCategory: false, autoNaming: true, mincaMode: 'savage' }),
      },
      () => {
        const prefs = readAiPrefs()
        expect(prefs.autoCategory).toBe(false)
        expect(prefs.autoNaming).toBe(true)
        expect(prefs.mincaMode).toBe('savage')
      },
    )
  })

  it('JSON rusak / isi asing → default, bukan error yang membuntuti user', () => {
    withFakeWindow({ getItem: () => 'bukan-json' }, () => expect(readAiPrefs()).toEqual(AI_PREFS_DEFAULT))
    withFakeWindow({ getItem: () => '"teks"' }, () => expect(readAiPrefs()).toEqual(AI_PREFS_DEFAULT))
    withFakeWindow({ getItem: () => null }, () => expect(readAiPrefs()).toEqual(AI_PREFS_DEFAULT))
    withFakeWindow(
      { getItem: () => JSON.stringify({ mincaMode: 'mode-ngawur' }) },
      () => expect(readAiPrefs().mincaMode).toBe('bestie'),
    )
  })
})

describe('writeAiPrefs — satu pintu tulis untuk kunci yang sama', () => {
  it('menulis JSON ke kunci lama dan mengembalikan nilai yang berlaku', () => {
    let written = ''
    const next = { autoCategory: false, autoNaming: true, mincaMode: 'savage' } as const
    withFakeWindow(
      { getItem: () => null, setItem: (value) => (written = value) },
      () => expect(writeAiPrefs({ ...next })).toEqual(next),
    )
    expect(JSON.parse(written)).toEqual(next)
  })

  it('storage diblokir → tidak melempar, preferensi tetap berlaku sesi ini', () => {
    const next = { autoCategory: false, autoNaming: false, mincaMode: 'bestie' } as const
    withFakeWindow(
      {
        getItem: () => null,
        setItem: () => {
          throw new Error('blocked')
        },
      },
      () => expect(writeAiPrefs({ ...next })).toEqual(next),
    )
  })

  it('tanpa window (server/test) → tidak melempar dan mengembalikan nilai yang sama', () => {
    expect(writeAiPrefs(AI_PREFS_DEFAULT)).toEqual(AI_PREFS_DEFAULT)
  })

  it('yang ditulis bisa dibaca kembali utuh (baca & tulis kunci yang sama)', () => {
    let stored: string | null = null
    withFakeWindow(
      { getItem: () => stored, setItem: (value) => (stored = value) },
      () => {
        writeAiPrefs({ autoCategory: false, autoNaming: true, mincaMode: 'savage' })
        expect(readAiPrefs()).toEqual({
          autoCategory: false,
          autoNaming: true,
          mincaMode: 'savage',
        })
      },
    )
  })
})

describe('withCapturePrefs — dua saklar benar-benar bekerja di jalur AI capture', () => {
  it('saklar ON (default): hasil bacaan AI dipakai apa adanya', () => {
    const draft = withCapturePrefs(capturedDraft, AI_PREFS_DEFAULT)
    expect(draft.category).toBe('Belanja')
    expect(draft.name).toBe('Belanja Indomaret Cilandak')
  })

  it('autoCategory OFF → kategori dikosongkan supaya user yang memilih', () => {
    const draft = withCapturePrefs(capturedDraft, { ...AI_PREFS_DEFAULT, autoCategory: false })
    expect(draft.category).toBe('')
    /* dan field kosong itu TIDAK ditandai "AI belum yakin" — tidak ada tebakan
       yang perlu diragukan, user memang diminta memilih (lihat doc modul) */
    expect(draft.lowFields).toEqual([])
    expect(draft.name).toBe('Belanja Indomaret Cilandak')
  })

  it('autoNaming OFF → nama dikosongkan, kategori tetap dari AI', () => {
    const draft = withCapturePrefs(capturedDraft, { ...AI_PREFS_DEFAULT, autoNaming: false })
    expect(draft.name).toBe('')
    expect(draft.category).toBe('Belanja')
  })

  it('dua-duanya OFF → kedua field diisi user (AI hanya membaca nominal & tipe)', () => {
    const draft = withCapturePrefs(capturedDraft, {
      ...AI_PREFS_DEFAULT,
      autoCategory: false,
      autoNaming: false,
    })
    expect(draft).toMatchObject({ category: '', name: '' })
    /* nominal & tipe tetap hasil bacaan: itu isi catatannya, bukan penamaan */
    expect(draft.amountDigits).toBe('87500')
    expect(draft.type).toBe('expense')
  })

  it('draft aslinya tidak diubah (fungsi murni)', () => {
    withCapturePrefs(capturedDraft, { ...AI_PREFS_DEFAULT, autoCategory: false })
    expect(capturedDraft.category).toBe('Belanja')
    expect(capturedDraft.name).toBe('Belanja Indomaret Cilandak')
  })
})
