import type { ReactNode } from 'react'
import { Toaster } from '@/components/ui/toaster'

/* ── LAYOUT HALAMAN PUBLIK (route group `(public)`) ──────────────────────────
   Isinya SENGAJA hanya `<Toaster/>` (sonner). Halaman di grup ini — login,
   verifikasi email, kontak, pusat bantuan publik, changelog, dokumen legal,
   pembayaran (/checkout), undangan (/join, /share, /r), /welcome, /registered —
   memanggil `toast()` (lihat login-screen, verify-email-screen,
   payment-instruction-card, share-progress-panel), jadi satu kontainer toast
   dibutuhkan.

   Yang TIDAK dipasang di sini: AccountScope, MoneyContext, SubscriptionGate,
   AppLock, MobileBottomNav, AIChatWidget. Halaman publik tidak butuh status
   langganan/PIN/data uang — dan memasangnya berarti seluruh app ikut terunduh
   (persis masalah yang diperbaiki paket 108).

   `/checkout` sengaja ada di grup ini walau ia membaca sesi di server: halaman
   itu tetap butuh `cookies()` (dynamic), dan `CheckoutScreen` mengurus sesi
   sendiri lewat `lib/session-client.ts` — tidak lewat provider app. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}
