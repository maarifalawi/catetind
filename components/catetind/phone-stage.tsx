import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { LogoWordmark } from './logo-wordmark'

/**
 * Bingkai "panggung ponsel" untuk halaman-halaman app.
 *
 * `plain` dipakai flow onboarding (inventaris #10): kanvasnya rata (bg-cream)
 * tanpa gradien hijau + wordmark raksasa, supaya layar setup yang minimalis
 * tidak bersaing dengan latar. Halaman lain tetap memakai versi bergradien.
 */
export function PhoneStage({
  children,
  plain = false,
}: {
  children: ReactNode
  /** true = kanvas rata tanpa watermark (dipakai onboarding) */
  plain?: boolean
}) {
  return (
    <main
      className={cn(
        'relative min-h-screen w-full',
        plain
          ? 'bg-cream'
          : 'bg-gradient-to-br from-[#e8f1de] via-[#f4f8ef] to-[#dfead2]',
      )}
    >
      {/* giant background wordmark — versi gambar: lebar relatif (vw) + opasitas
          sangat rendah supaya tetap terasa seperti watermark, bukan logo */}
      {!plain && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 flex justify-center overflow-hidden"
          aria-hidden
        >
          <LogoWordmark className="w-[68vw] max-w-[1100px] translate-y-1/4 opacity-[0.05] lg:w-[58vw]" />
        </div>
      )}

      <div className="relative w-full">{children}</div>
    </main>
  )
}
