'use client'

import { Sprout } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SUBSCRIPTION_LOCK_COPY } from '@/lib/data/renewal'

/**
 * Catatan kecil yang menemani tombol simpan/tambah ketika masa aktif habis
 * (task 23). Ia menjawab pertanyaan yang pasti muncul — "kenapa tombolnya nggak
 * bisa ditekan?" — dengan sebab + jalan keluar, tanpa nada menyalahkan dan tanpa
 * sekali pun menyebut data akan hilang.
 *
 * Dipakai bareng di dalam `SheetSubmit`, engine input transaksi, dan titik masuk
 * lain, supaya satu perilaku terkunci selalu berbicara dengan suara yang sama.
 */
export function SubscriptionLockNote({
  className,
  text = SUBSCRIPTION_LOCK_COPY.saveHint,
}: {
  className?: string
  /** boleh diganti titik pemakai bila konteksnya beda (mis. FAB vs tombol simpan) */
  text?: string
}) {
  return (
    <p
      data-subscription-lock-note="true"
      className={cn(
        'mt-2 flex items-start justify-center gap-1.5 text-center text-[11px] leading-relaxed font-medium text-forest/55',
        className,
      )}
    >
      <Sprout className="mt-0.5 size-3.5 shrink-0 text-forest" strokeWidth={2.4} aria-hidden />
      <span>{text}</span>
    </p>
  )
}
