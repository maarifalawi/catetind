import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Chip meta kecil di header halaman (jumlah dompet / transaksi / kategori …
 * atau penanda konteks uang).
 *
 * Dulu ia hidup privat di dalam `home-screen.tsx`. Sekarang diekstrak ke sini
 * supaya halaman lain — mulai dari Budget & Target — bisa memakai chip yang
 * PERSIS sama, sehingga baris meta di header semua halaman punya ukuran,
 * padding, dan warna yang identik (konsistensi layout lintas halaman).
 */
export function MetaChip({
  icon: Icon,
  children,
  tone = 'default',
  className,
}: {
  icon: LucideIcon
  children: ReactNode
  /** `scope` = nada olive/forest untuk penanda konteks uang */
  tone?: 'default' | 'scope'
  className?: string
}) {
  const isScope = tone === 'scope'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1',
        isScope
          ? 'bg-sage/70 text-forest ring-forest/10'
          : 'bg-cream text-ink/60 ring-soil/5',
        className,
      )}
    >
      <Icon
        className={cn('size-3.5', isScope ? 'text-forest/70' : 'text-forest/55')}
        strokeWidth={2.2}
      />
      {children}
    </span>
  )
}
