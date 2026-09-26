'use client'

import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePrivacy } from './privacy-provider'

/* ── Tombol Global Eye / Privacy Toggle (MASTER COMPONENT — audit UX #4) ───────
   Satu-satunya kontrol privasi di SELURUH halaman. Sebelumnya tiap halaman
   menggambar tombolnya sendiri sehingga muncul beberapa wujud berbeda (ikon
   polos di lingkaran tipis, pill hijau, dst). Sekarang cuma ada SATU komponen
   dengan dua ukuran responsif, jadi bentuknya konsisten di mana pun:

     • < lg  → tombol ikon bulat 36px (header mobile, hemat ruang)
     • ≥ lg  → pill berlabel "Sembunyikan"/"Tampilkan" (header desktop, jelas)

   Sekali klik menyensor SEMUA nominal di layar lewat PrivacyProvider, dan
   status sensor selalu terbaca dari warna + ikon + label. */
export function GlobalPrivacyToggle({ className }: { className?: string }) {
  const { masked, toggle } = usePrivacy()

  const label = masked ? 'Tampilkan' : 'Sembunyikan'
  const actionLabel = masked ? 'Tampilkan semua nominal' : 'Sembunyikan semua nominal'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={masked}
      aria-label={actionLabel}
      title={masked ? 'Tampilkan semua nominal' : 'Sensor semua nominal (privasi layar)'}
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full ring-1 transition-colors active:scale-95',
        /* desktop: melebar jadi pill berlabel (ikon + teks) */
        'lg:h-11 lg:w-auto lg:gap-2 lg:px-4 lg:text-[12.5px] lg:font-semibold',
        masked
          ? 'bg-forest text-mint ring-forest/20 hover:bg-forest-soft'
          : 'bg-cream text-ink ring-soil/12 hover:bg-sage',
        className,
      )}
    >
      {masked ? (
        <EyeOff className="size-4 shrink-0" strokeWidth={2.2} aria-hidden />
      ) : (
        <Eye className="size-4 shrink-0" strokeWidth={2.2} aria-hidden />
      )}
      {/* label hanya di desktop — di mobile tombol tetap ikon bulat ringkas */}
      <span className="hidden lg:inline">{label}</span>
    </button>
  )
}
