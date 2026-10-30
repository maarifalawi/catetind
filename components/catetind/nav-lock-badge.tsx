import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── GEMBOK NAVIGASI (paket 99) ───────────────────────────────────────────────
   Penanda “halaman ini belum terbuka di paketmu” untuk item navigasi. Dulu
   sidebar desktop hanya menaruh ikon `Lock` abu-abu 12 px di ujung kanan, dan
   laci “Lainnya” di mobile TIDAK punya penanda sama sekali — jadi satu-satunya
   cara tahu sebuah menu terkunci adalah menekannya lalu melihat popup upgrade.

   Sekarang penandanya satu komponen, dua bentuk:

     · `pill`  → sidebar terbuka, laci mobile, menu Pengaturan:
                 pil emas (`daisy`) dengan gembok + nama paket pembukanya.
                 Emas dipakai karena di palet ini `daisy` = “pop brand”, bukan
                 warna alarm; gemboknya menonjol tanpa terasa seperti error.
     · `dot`   → sidebar yang sedang diciutkan: lencana bulat kecil menempel
                 di pojok ikon, karena tidak ada ruang untuk teks.

   Warna memakai token (`daisy`, `daisy-light`, `daisy-deep`, `cream`) — tidak
   ada hex lepas, jadi tetap ikut tema. Efek “logam” dibuat dari inset
   highlight atas + bayangan tipis bawah, bukan gradient acak.

   Komponen ini MURNI tampilan: ia tidak tahu paket user dan tidak membuka
   popup. Sumber kebenaran “terkunci atau tidak” tetap
   `useSubscriptionGate().lockedPageCapability()`; klik menu yang terkunci
   sudah dicegat `UpgradeGateProvider`. */

export type NavLockBadgeVariant = 'pill' | 'dot'

/** “Paket Waras” → “Waras” supaya pil tetap ringkas di sidebar 296 px */
function shortPlanName(planName: string | null | undefined): string {
  const name = planName?.trim() || 'Paket Waras'
  return name.replace(/^paket\s+/i, '')
}

export function NavLockBadge({
  planName,
  variant = 'pill',
  className,
}: {
  /** nama paket terendah yang membuka halaman ini (mis. “Paket Waras”) */
  planName?: string | null
  variant?: NavLockBadgeVariant
  className?: string
}) {
  if (variant === 'dot') {
    return (
      <span
        data-nav-lock="dot"
        aria-hidden
        className={cn(
          'pointer-events-none absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center',
          'rounded-full bg-gradient-to-br from-daisy-light via-daisy to-daisy-deep text-daisy-deep',
          'ring-[1.5px] ring-cream shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_6px_-1px_rgba(106,97,47,0.5)]',
          className,
        )}
      >
        <Lock className="size-[9px]" strokeWidth={3.2} />
      </span>
    )
  }

  return (
    <span
      data-nav-lock="pill"
      aria-hidden
      className={cn(
        'pointer-events-none ml-auto inline-flex shrink-0 items-center gap-1 rounded-full',
        'bg-gradient-to-r from-daisy-light via-daisy to-daisy-light px-1.5 py-[3px]',
        'text-[10.5px] font-semibold tracking-[0.05em] text-daisy-deep uppercase',
        'ring-1 ring-daisy-deep/20',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_2px_rgba(106,97,47,0.22)]',
        'transition-shadow duration-200 group-hover/item:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_0_0_3px_rgba(236,215,104,0.28)]',
        className,
      )}
    >
      <span className="relative flex size-3 items-center justify-center">
        <span aria-hidden className="absolute inset-0 rounded-full bg-cream/60 blur-[3px]" />
        <Lock className="relative size-[10px]" strokeWidth={3} />
      </span>
      <span className="max-w-[64px] truncate">{shortPlanName(planName)}</span>
    </span>
  )
}
