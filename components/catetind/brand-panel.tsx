import { cn } from '@/lib/utils'
import { AUTH_BRAND_TAGLINE } from '@/lib/data/auth'

/* ── Panel brand batik — dipakai BERSAMA oleh /login dan /checkout ───────────
   Latarnya TIDAK solid dan TIDAK transparan: gradien Evergreen berlapis
   (`forest-soft → forest → #1f2823`) + motif batik + glow + tekstur titik,
   persis resep muka kartu dompet (`wallet-card-face.tsx` / hero di
   `wallet-screen.tsx`) supaya app terasa satu keluarga.

   Aturan isi: panel ini HANYA memuat TAGLINE. Logo, eyebrow, dan chip jaminan
   sengaja tidak ada (permintaan desain) — yang bicara tekstur batiknya.

   `as` penting untuk struktur judul: di `/login` tagline ADALAH judul halaman
   (`h1`), sedangkan di `/checkout` halaman itu sudah punya `h1` sendiri
   ("Pembayaran"), jadi tagline-nya cukup `<p>` — tidak boleh dua `h1`.
   ────────────────────────────────────────────────────────────────────────── */

export function BrandPanel({
  className,
  as: Tagline = 'p',
}: {
  /** radius/tinggi/sticky diatur pemanggil — komponen ini tidak memaksa bentuk */
  className?: string
  /** `h1` hanya untuk halaman yang belum punya judul lain (mis. /login) */
  as?: 'h1' | 'p'
}) {
  return (
    <aside
      className={cn(
        'relative isolate flex min-h-[200px] flex-col justify-end overflow-hidden bg-gradient-to-br from-forest-soft via-forest to-[#1f2823] p-7 text-cream shadow-[0_30px_70px_-30px_rgba(69,89,78,0.8)] ring-1 ring-inset ring-cream/10 sm:p-9 lg:p-12',
        className,
      )}
    >
      {/* definisi motif batik — resep SAMA dengan muka kartu dompet, jadi
          teksturnya terasa dari keluarga yang sama (bukan batik karangan baru) */}
      <svg aria-hidden className="absolute size-0">
        <defs>
          {/* batik kawung: lingkaran-lingkaran saling beririsan */}
          <pattern id="brand-batik-kawung" width="72" height="72" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="white" strokeOpacity="0.16" strokeWidth="1.6">
              <circle cx="36" cy="36" r="26" />
              <circle cx="0" cy="0" r="26" />
              <circle cx="72" cy="0" r="26" />
              <circle cx="0" cy="72" r="26" />
              <circle cx="72" cy="72" r="26" />
            </g>
            <circle cx="36" cy="36" r="5" fill="white" fillOpacity="0.16" />
          </pattern>
          {/* batik mega mendung: lengkung awan berlapis */}
          <pattern id="brand-batik-mendung" width="90" height="44" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="white">
              <path d="M0 44 Q22.5 8 45 44 Q67.5 8 90 44" strokeOpacity="0.16" strokeWidth="1.8" />
              <path d="M0 32 Q22.5 -4 45 32 Q67.5 -4 90 32" strokeOpacity="0.1" strokeWidth="1.6" />
            </g>
          </pattern>
        </defs>
      </svg>

      {/* cahaya: mint (positif) + hijau dalam + cantelope hangat → panel tidak
          pernah rata, tapi tetap 100% di palet kanon */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-mint/25 blur-[110px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -left-20 size-72 rounded-full bg-[#45594e]/50 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-4 bottom-1/3 size-40 rounded-full bg-cantelope/20 blur-[90px]"
      />

      {/* dua lapis batik yang saling menimpa: kawung dari kiri atas, mega
          mendung dari kanan bawah — supaya serapat kain, bukan garis seragam */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full [mask-image:radial-gradient(130%_125%_at_10%_-12%,black_8%,transparent_72%)]"
      >
        <rect width="100%" height="100%" fill="url(#brand-batik-kawung)" />
      </svg>
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full [mask-image:radial-gradient(125%_115%_at_104%_112%,black_4%,transparent_66%)]"
      >
        <rect width="100%" height="100%" fill="url(#brand-batik-mendung)" />
      </svg>

      {/* tekstur titik halus + hairline bercahaya di bibir atas (resep kartu) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1.2px)] [background-size:10px_10px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cream/45 to-transparent"
      />

      {/* satu-satunya teks di panel ini */}
      <Tagline className="relative max-w-[22ch] font-display text-[1.65rem] leading-[1.15] font-medium tracking-[-0.02em] text-cream drop-shadow-[0_2px_18px_rgba(0,0,0,0.35)] sm:text-[1.9rem] lg:text-[2.2rem]">
        {AUTH_BRAND_TAGLINE}
      </Tagline>
    </aside>
  )
}
