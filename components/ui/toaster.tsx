'use client'

import { Toaster as SonnerToaster } from 'sonner'

/**
 * Toaster global CatetInd.
 *
 * Dipasang pakai mode `unstyled` sonner supaya bentuk/warna kartunya 100% ikut
 * palet app (warm white, forest, mint) — bukan default sonner. Dipasang sekali
 * di root layout; toast ditembak NON-BLOCKING dari TransactionBottomSheet
 * (`toast.success`) tepat setelah bottom sheet ditutup.
 *
 * Posisi `top-center`: menghindari tabrakan visual dengan bottom nav (bottom-5)
 * dan bubble AI Coach (bottom-24 right-5) yang sama-sama menempati area bawah.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      offset={16}
      mobileOffset={12}
      gap={10}
      duration={2600}
      visibleToasts={3}
      toastOptions={{
        unstyled: true,
        classNames: {
          /* kartu toast — kaca putih hangat, sudut 2xl, shadow forest lembut */
          toast: [
            'pointer-events-auto flex w-[min(22rem,calc(100vw-2rem))] items-center gap-3',
            'rounded-2xl bg-white/95 px-4 py-3.5 font-sans text-ink backdrop-blur-xl',
            'shadow-[0_20px_44px_-18px_rgba(16,58,42,0.45)] ring-1 ring-forest/10',
            /* ikon sonner dibungkus badge mint bulat biar senada dengan AI badge */
            '[&_[data-icon]]:flex [&_[data-icon]]:size-9 [&_[data-icon]]:shrink-0',
            '[&_[data-icon]]:items-center [&_[data-icon]]:justify-center',
            '[&_[data-icon]]:rounded-full [&_[data-icon]]:bg-mint/25 [&_[data-icon]]:text-forest',
            '[&_[data-icon]_svg]:size-[18px]',
          ].join(' '),
          title: 'text-[13.5px] font-semibold leading-snug text-ink',
          description: 'mt-0.5 text-xs leading-relaxed text-ink/55',
          content: 'flex min-w-0 flex-1 flex-col',
          loading: 'text-forest',
        },
      }}
    />
  )
}
