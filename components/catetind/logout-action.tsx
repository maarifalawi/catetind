'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog, DialogButton } from './settings-dialog'
import { LOGIN_PATH, SESSION_COPY } from '@/lib/data/auth'
import { useSessionUser } from '@/hooks/use-session-user'
import { endSession } from '@/lib/session-client'

/* ── KELUAR: SATU KLIK → LANGSUNG DIALOG KONFIRMASI ──────────────────────────
   Revisi pemilik produk: tombol "Keluar" TIDAK lagi membuka panel perantara
   yang menjelaskan panjang lebar lalu masih harus diklik sekali lagi. Klik dari
   sidebar atau Pengaturan langsung memunculkan pertanyaan "yakin mau keluar?".

   Yang berakhir hanya SESI di perangkat ini, bukan datanya. `endSession()`
   memarkir seluruh penyimpanan browser milik akun ini (`catet…#<id>`),
   mengosongkan penanda sesi tab, lalu server mencabut cookie lewat
   `DELETE /api/session`. Identitas dioper supaya perangkat yang belum punya
   penanda akun tetap memarkir datanya atas nama pemilik yang benar. */

export function LogoutConfirmDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { user } = useSessionUser()
  const [busy, setBusy] = useState(false)

  async function handleLogout() {
    if (busy) return
    setBusy(true)
    const ok = await endSession(user?.id ?? null)
    setBusy(false)
    onClose()
    if (!ok) {
      toast.error(SESSION_COPY.signOutFailed, {
        description: SESSION_COPY.signOutFailedDescription,
      })
      return
    }
    toast.success(SESSION_COPY.signedOutToast, {
      description: SESSION_COPY.signedOutToastDescription,
    })
    /* Reload penuh, bukan navigasi client: store uang & store domain lain hidup
       di memory modul. `assign` memastikan semua modul lahir kosong dan membaca
       sesi baru. */
    window.location.assign(LOGIN_PATH)
  }

  return (
    <ConfirmDialog
      id="logout-confirm"
      open={open}
      onClose={onClose}
      icon={LogOut}
      tone="danger"
      title="Yakin mau keluar?"
      body="Sesi di perangkat ini akan diakhiri. Catatan keuanganmu tetap aman di akun dan bisa dibuka lagi kapan aja pakai email yang sama."
      actions={
        <>
          <DialogButton tone="danger" disabled={busy} onClick={handleLogout}>
            {busy ? 'Mengakhiri sesi…' : 'Ya, Keluar'}
          </DialogButton>
          <DialogButton tone="neutral" onClick={onClose}>
            Batal
          </DialogButton>
        </>
      }
    />
  )
}

/**
 * Pemicu keluar: klik → dialog konfirmasi langsung muncul (tanpa halaman
 * perantara). `children` mengikuti gaya tempat pemanggilnya (item sidebar atau
 * tombol lebar di Pengaturan), jadi tidak ada CSS baru di sini.
 */
export function LogoutButton({
  className,
  label = 'Keluar',
  children,
}: {
  className?: string
  /** aria-label — wajib saat teksnya disembunyikan (sidebar collapsed) */
  label?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  /* Dialog dipasang ke `document.body`, BUKAN di dalam tombolnya: sidebar
     desktop adalah elemen `fixed z-30` (stacking context sendiri), sehingga
     dialog yang bersarang di dalamnya bisa tertimpa elemen z-50 lain (bubble
     Minca, bottom nav). Portal mengembalikan dialog ke lapisan teratas. */
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={label} className={className}>
        {children}
      </button>
      {mounted &&
        createPortal(
          <LogoutConfirmDialog open={open} onClose={() => setOpen(false)} />,
          document.body,
        )}
    </>
  )
}
