import type { ReactNode } from 'react'
import { LogoWordmark } from './logo-wordmark'

export function PhoneStage({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen w-full bg-gradient-to-br from-[#e8f1de] via-[#f4f8ef] to-[#dfead2]">
      {/* giant background wordmark */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 flex justify-center overflow-hidden"
        aria-hidden
      >
        <LogoWordmark className="translate-y-1/4 text-[26vw] font-bold text-forest/[0.035] lg:text-[22vw]" />
      </div>

      <div className="relative w-full">{children}</div>
    </main>
  )
}
