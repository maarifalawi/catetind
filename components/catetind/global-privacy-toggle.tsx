'use client'

import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePrivacy } from './privacy-provider'

/* ── Tombol Global Eye / Privacy Toggle (MASTER COMPONENT — audit UX #4) ───────
   Satu-satunya kontrol privasi di SELURUH halaman. Sebelumnya tiap halaman
   menggambar tombolnya sendiri sehingga muncul beberapa wujud berbeda (ikon
   polos di lingkaran tipis, pill hijau, dst). Sekarang cuma ada SATU komponen,
   jadi bentuknya konsisten di mana pun.

   PAKET 66 — IKON SAJA, TANPA TEKS. Dulu di desktop pill-nya melebar memuat
   label "Sembunyikan"/"Tampilkan". Permintaan pemilik produk: cukup simbol
   mata. Statusnya tetap terbaca dari ikon (mata vs mata-tercoret) + warna +
   `aria-pressed`, dan alasan tindakannya tetap diumumkan pembaca layar lewat
   `aria-label`/`title` — jadi yang hilang cuma teks yang memakan lebar header,
   bukan maknanya. */
export function GlobalPrivacyToggle({ className }: { className?: string }) {
  const { masked, toggle } = usePrivacy()

  const actionLabel = masked ? 'Tampilkan semua nominal' : 'Sembunyikan semua nominal'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={masked}
      aria-label={actionLabel}
      title={masked ? 'Tampilkan semua nominal' : 'Sensor semua nominal (privasi layar)'}
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full ring-1 transition-colors active:scale-95 lg:size-10',
        masked
          ? 'bg-forest text-mint ring-forest/20 hover:bg-forest-soft'
          : 'bg-cream text-forest ring-soil/12 hover:bg-sage',
        className,
      )}
    >
      {masked ? (
        <EyeOff className="size-4 shrink-0" strokeWidth={2.2} aria-hidden />
      ) : (
        <Eye className="size-4 shrink-0" strokeWidth={2.2} aria-hidden />
      )}
    </button>
  )
}
