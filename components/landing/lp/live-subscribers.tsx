'use client'

import { useCallback, useState } from 'react'
import { UserRound } from 'lucide-react'
import { LP_LIVE_SUBSCRIBERS as COPY } from '@/lib/data/landing'
import { cn } from '@/lib/utils'

/* ── BUKTI SOSIAL HERO ───────────────────────────────────────────────────────
   Satu blok kecil di samping CTA:
     · LIMA avatar lokal `public/AVA 1.png` … `AVA 5.png` (bukan foto stok
       pihak ketiga), berderet dengan outline GELAP TIPIS — bukan halo warna;
     · label publik `1.000+ udah pake` — angka statis, supaya hero tidak
       pernah menampilkan seed database 234;
     · siluet `UserRound` di belakang foto: kalau file gagal dimuat, lingkaran
       tetap rapi (tidak ada ikon gambar rusak).

   Client hanya karena fallback `onError` butuh state. Tidak ada fetch/realtime
   di sini; `GET /api/landing/stats` tetap tersedia untuk kebutuhan lain. */

const NUMBER = new Intl.NumberFormat('id-ID')

export function LandingLiveSubscribers({ className }: { className?: string }) {
  const [failedAvatars, setFailedAvatars] = useState<ReadonlySet<string>>(() => new Set())

  const markAvatarFailed = useCallback((src: string) => {
    setFailedAvatars((previous) => {
      if (previous.has(src)) return previous
      const next = new Set(previous)
      next.add(src)
      return next
    })
  }, [])

  const displayCount = `${NUMBER.format(COPY.displayCount)}${COPY.displaySuffix}`

  return (
    <div className={cn('relative flex min-w-0 flex-col gap-1 overflow-hidden landing-tab:gap-2', className)}>
      {/* ticker avatar: 5 foto, gap 4px seperti export. Tidak ada fade tepi
          lagi karena baris CTA kini selebar konten dan dipusatkan, bukan
          dipotong oleh kolom `flex-1`. */}
      <span
        aria-hidden
        className="relative flex h-7 items-center min-[420px]:h-8 landing-tab:h-9"
      >
        <span className="flex w-max items-center gap-1">
          {COPY.avatarPool.map((avatar) => (
            <span
              key={avatar.src}
              className="relative flex size-7 items-center justify-center rounded-full ring-1 ring-forest/40 min-[420px]:size-8 landing-tab:size-9"
            >
              <span className="relative flex size-full items-center justify-center overflow-hidden rounded-full bg-canvas">
                <UserRound
                  className="size-3.5 text-forest/45 landing-tab:size-4"
                  strokeWidth={1.75}
                />
                {failedAvatars.has(avatar.src) ? null : (
                  <img
                    src={avatar.src}
                    alt=""
                    width={72}
                    height={72}
                    loading="eager"
                    decoding="async"
                    onError={() => markAvatarFailed(avatar.src)}
                    className="absolute inset-0 size-full object-cover"
                  />
                )}
              </span>
            </span>
          ))}
        </span>
      </span>

      <p className="whitespace-nowrap text-[12px] leading-none text-forest-muted min-[420px]:text-[13px] landing-tab:text-[14px] max-[380px]:text-[11px]">
        {displayCount} {COPY.labelTail}
      </p>
    </div>
  )
}

