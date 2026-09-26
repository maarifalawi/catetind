import { cn } from '@/lib/utils'

/* ── Tooltip nav sidebar ──────────────────────────────────────────────────────
   Pill gelap yang melayang di kanan icon saat sidebar desktop sedang collapsed.
   Dipakai nav item, tombol "Tambah Transaksi", tombol Keluar, dan kartu Bahan
   Bakar AI — jadi tampilannya cuma diatur di satu tempat ini.

   Kontrak pemakaian: elemen pembungkus WAJIB `relative` + `group/item`, karena
   posisi (left-full) & kemunculannya (group-hover/item) diatur dari sini.
   z-50 hanya efektif kalau `<aside>` sidebar punya z-index di atas kolom konten
   (lihat desktop-sidebar.tsx). */
export function NavTooltip({ label, className }: { label: string; className?: string }) {
  return (
    <span
      role="tooltip"
      className={cn(
        'pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium text-cream opacity-0 shadow-lg shadow-ink/10 transition-all duration-150 group-hover/item:translate-x-0 group-hover/item:opacity-100',
        className,
      )}
    >
      {label}
    </span>
  )
}
