import type { ReactNode } from 'react'
import { LogoWordmark } from './logo-wordmark'

/**
 * Bingkai "panggung ponsel" untuk halaman-halaman app.
 *
 * Dasar halaman PUTIH RATA (`bg-canvas`) — tanpa gradien — dan kartu juga
 * putih (`bg-cream`), jadi latar harus netral supaya aksen palet yang
 * berbicara. Batas antar-kartu dibawa hairline `ring-soil` + shadow lembut.
 *
 * `plain` dipakai flow onboarding (inventaris #10): kanvasnya rata tanpa
 * wordmark raksasa di latar, supaya layar setup yang minimalis tidak bersaing
 * dengan latar. Halaman lain tetap menampilkan wordmark sebagai watermark.
 */
export function PhoneStage({
  children,
  plain = false,
}: {
  children: ReactNode
  /** true = tanpa watermark wordmark (dipakai onboarding) */
  plain?: boolean
}) {
  return (
    <main className="relative min-h-[100dvh] w-full bg-canvas">
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
