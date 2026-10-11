import { cn } from '@/lib/utils'

/*
 * ── KERANGKA LAYAR (SKELETON) — paket 84 ────────────────────────────────────
 *
 * KENAPA BERKAS INI ADA, DAN KENAPA **TIDAK ADA** `app/loading.tsx` GLOBAL.
 *
 * Di repo ini `PhoneStage` + `ScreenShell` (sidebar desktop + bottom nav) hidup
 * DI DALAM tiap `components/catetind/*-screen.tsx`, BUKAN di layout. Artinya
 * kalau kita menaruh `app/loading.tsx`, Next.js akan mengganti SELURUH isi root
 * layout saat transisi — termasuk sidebar dan bottom nav — sehingga user melihat
 * navigasinya berkedip/hilang setiap pindah halaman. Itu regresi UX, bukan
 * perbaikan.
 *
 * Jadi aturannya:
 *   · `app/settings/loading.tsx` AMAN memakai kerangka ini, karena sidebar
 *     halaman pengaturan berasal dari `app/settings/layout.tsx` — layout itu
 *     tidak ikut unmount, hanya kolom kanannya yang memuat.
 *   · untuk halaman app lain, bungkus HANYA bagian yang menunggu data dengan
 *     `<Suspense>` **di dalam** screen-nya, supaya shell tidak ikut hilang.
 *
 * Token palet repo dipakai (sage/soil/cream), bukan abu-abu asing — supaya
 * kerangkanya terasa seperti bagian produk, dan animasinya menghormati
 * `prefers-reduced-motion`.
 */

export function SkeletonLine({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'block h-3.5 rounded-full bg-soil/10',
        'motion-safe:animate-pulse motion-reduce:animate-none',
        className,
      )}
    />
  )
}

/** kerangka satu kartu: judul + dua baris isi */
export function SkeletonCard({ className, lines = 2 }: { className?: string; lines?: number }) {
  return (
    <div className={cn('rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6', className)}>
      <SkeletonLine className="w-1/3" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, index) => (
          <SkeletonLine key={index} className={index === lines - 1 ? 'w-2/3' : 'w-full'} />
        ))}
      </div>
    </div>
  )
}

/**
 * Kerangka umum satu halaman pengaturan: satu kartu utama + satu kartu pendek,
 * dengan `aria-busy` supaya pembaca layar tahu isinya sedang disiapkan (bukan
 * halaman kosong yang selesai dimuat).
 */
export function ScreenSkeleton({ cards = 2 }: { cards?: number }) {
  return (
    <div className="w-full" aria-busy="true" aria-live="polite">
      <SkeletonLine className="w-40" />
      <div className="mt-4 space-y-4">
        {Array.from({ length: cards }).map((_, index) => (
          <SkeletonCard key={index} lines={index === 0 ? 3 : 2} />
        ))}
      </div>
    </div>
  )
}
