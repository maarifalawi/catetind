'use client'

import { useState } from 'react'
import { Download, HardDrive, Trash2, Upload } from 'lucide-react'
import {
  discardPendingLocalData,
  importPendingLocalData,
  isAccountEmpty,
  pendingLocalDataJson,
  useMoneyStore,
  usePendingLocalImport,
} from '@/lib/money/store'

/* ── NOTICE DATA LAMA DI PERANGKAT (paket 100) ───────────────────────────────
   Saat akun baru dibuka di browser yang masih menyimpan data demo / akun lain,
   data itu TIDAK lagi diunggah diam-diam (itu penyebab akun baru punya saldo).
   Snapshot aslinya tetap utuh di IndexedDB, dan kartu ini memberi tiga pilihan
   yang semuanya eksplisit: masukkan ke akun (hanya kalau akun masih kosong),
   unduh sebagai JSON, atau hapus dari perangkat.

   Tidak ada tombol yang menghapus/unggah tanpa konfirmasi. */

export function LocalDataNotice() {
  const snapshot = useMoneyStore()
  const pending = usePendingLocalImport()
  const [busy, setBusy] = useState<'import' | 'download' | 'discard' | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!pending) return null
  const canImport = isAccountEmpty(snapshot)

  async function handleDownload() {
    setBusy('download')
    setError(null)
    try {
      const json = await pendingLocalDataJson()
      if (!json) {
        setError('Data lama tidak bisa dibaca lagi.')
        return
      }
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `catetind-data-perangkat-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
    } finally {
      setBusy(null)
    }
  }

  async function handleImport() {
    setBusy('import')
    setError(null)
    const ok = await importPendingLocalData()
    if (!ok) {
      setError('Data lama belum bisa dimasukkan. Coba lagi atau unduh dulu.')
      setBusy(null)
    }
  }

  async function handleDiscard() {
    const confirmed = window.confirm(
      'Hapus data lama ini dari perangkat? Data akun yang sekarang TIDAK ikut terhapus.',
    )
    if (!confirmed) return
    setBusy('discard')
    setError(null)
    await discardPendingLocalData()
  }

  return (
    <section
      role="status"
      aria-live="polite"
      className="mt-5 rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6"
    >
      <p className="inline-flex items-center gap-2 text-[16px] font-medium text-forest">
        <HardDrive className="size-4 shrink-0 text-forest" strokeWidth={2.2} aria-hidden />
        Ada data lama di perangkat ini
      </p>
      <p className="mt-1.5 text-[14px] leading-relaxed text-forest/60">
        Data ini <b className="font-medium text-forest">tidak</b> dimasukkan ke akunmu, supaya akun
        baru tidak mewarisi saldo dari demo atau akun lain di browser yang sama.
      </p>
      {!canImport && (
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-forest/45">
          Akun ini sudah punya data, jadi pilihan yang tersedia hanya unduh atau hapus dari
          perangkat.
        </p>
      )}
      {error && (
        <p className="mt-2 text-[12.5px] font-medium text-hud-terracotta">{error}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {canImport && (
          <button
            type="button"
            onClick={handleImport}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-2xl bg-forest px-4 py-2.5 text-[13.5px] font-medium text-mint transition-colors hover:bg-forest-soft disabled:opacity-60"
          >
            <Upload className="size-3.5" strokeWidth={2.4} aria-hidden />
            {busy === 'import' ? 'Memasukkan…' : 'Masukkan ke akun'}
          </button>
        )}
        <button
          type="button"
          onClick={handleDownload}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-2xl bg-sage/60 px-4 py-2.5 text-[13.5px] font-medium text-forest transition-colors hover:bg-sage disabled:opacity-60"
        >
          <Download className="size-3.5" strokeWidth={2.4} aria-hidden />
          {busy === 'download' ? 'Menyiapkan…' : 'Unduh JSON'}
        </button>
        <button
          type="button"
          onClick={handleDiscard}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[13.5px] font-medium text-hud-terracotta transition-colors hover:bg-hud-amber/20 disabled:opacity-60"
        >
          <Trash2 className="size-3.5" strokeWidth={2.4} aria-hidden />
          {busy === 'discard' ? 'Menghapus…' : 'Hapus dari perangkat'}
        </button>
      </div>
    </section>
  )
}
