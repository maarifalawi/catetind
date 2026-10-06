'use client'

import { useState } from 'react'
import { Moon, Sprout } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RENEWAL_STATE, subscriptionBannerCopy, type RenewalState } from '@/lib/data/renewal'
import { RenewalModal } from './renewal-modal'
import { useSubscriptionGate } from './subscription-gate-provider'

/**
 * Banner gerbang langganan GLOBAL (inventaris state III/IV · PRD 4536–4547).
 *
 * Muncul hanya saat fase bukan `active`, dan disembunyikan total di halaman
 * publik/pre-app (gerbangnya sendiri dimatikan di provider — user yang tidak bisa
 * login harus tetap bisa membayar & membaca dokumen legal).
 *
 * Tiga keputusan desain yang disengaja:
 *   1. TIDAK bisa ditutup. Banner ini bukan nagging, ia penjelasan kenapa tombol
 *      catat mendadak mati — menutupnya berarti menyembunyikan alasannya.
 *   2. Tombol "Perpanjang" membuka `RenewalModal` yang SUDAH ada (satu alur
 *      perpanjangan, bukan alur kedua), dengan copy modal versi "masa aktif
 *      sudah habis" (PRD 4540–4541).
 *   3. Nada banner memakai warna hangat `hud-amber` (bukan merah/terracotta) dan
 *      selalu menegaskan data aman lebih dulu — pagar psikologi CONTEXT-WAJIB §5.3.
 */
export function SubscriptionBanner() {
  const { snapshot, onPublicRoute, markRenewed } = useSubscriptionGate()
  const [renewOpen, setRenewOpen] = useState(false)

  const copy = subscriptionBannerCopy(snapshot)
  /* bar hanya tampil kalau memang ada gerbang & user ada di dalam app */
  const showBar = copy !== null && !onPublicRoute

  return (
    <>
      {showBar && copy && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'sticky top-0 z-[45] w-full px-4 py-2.5 ring-1 ring-inset backdrop-blur-md',
            /* margin (bukan padding) dipakai supaya kotaknya benar-benar MULAI di
               kanan sidebar desktop — sidebar itu `fixed` z-30, jadi kotak yang
               melebar ke kirinya akan menutupi logo. Di mobile margin-nya 0. */
            'transition-[margin-left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
            'lg:ml-[var(--catet-sidebar-w,280px)]',
            snapshot.phase === 'grace'
              ? 'bg-hud-amber/20 ring-hud-amber/35'
              : 'bg-sage/90 ring-soil/12',
          )}
        >
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1.5">
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full',
                snapshot.phase === 'grace'
                  ? 'bg-hud-amber/35 text-hud-terracotta'
                  : 'bg-forest/10 text-forest',
              )}
            >
              {snapshot.phase === 'grace' ? (
                <Moon className="size-4" strokeWidth={2.2} aria-hidden />
              ) : (
                <Sprout className="size-4" strokeWidth={2.2} aria-hidden />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium tracking-[0.16em] text-forest/45 uppercase">
                {copy.eyebrow}
              </p>
              <p className="text-[13px] leading-snug font-medium text-forest">
                {copy.title}{' '}
                <span className="font-normal text-forest/70">{copy.body}</span>
              </p>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-forest/50">{copy.status}</p>
            </div>

            <button
              type="button"
              onClick={() => setRenewOpen(true)}
              className="shrink-0 rounded-full bg-forest px-4 py-2 text-xs font-medium text-cream shadow-[0_12px_24px_-16px_rgba(69,89,78,0.9)] transition-colors hover:bg-forest-soft active:scale-95"
            >
              {copy.cta}
            </button>
          </div>
        </div>
      )}

      {/* Modal perpanjangan yang sama dengan pengingat Home. Ia tetap hidup di
          sini (bukan ikut hilang bersama bar) supaya user sempat membaca panel
          sukses "masa aktifmu lanjut" setelah tombol Perpanjang ditekan. */}
      {renewOpen && (
        <RenewalModal
          open={renewOpen}
          state={EXPIRED_RENEWAL_STATE}
          onDismiss={() => setRenewOpen(false)}
          onRenewed={markRenewed}
        />
      )}
    </>
  )
}

/**
 * State yang dikirim ke modal dari banner: `daysLeft: 0` = masa aktif sudah
 * habis, jadi modal memakai copy gerbang & chip "Masa aktif berakhir" — bukan
 * "besok masa aktifmu habis" yang jelas salah saat grace (lihat komentar di
 * `renewalModalHeadline`).
 */
const EXPIRED_RENEWAL_STATE: RenewalState = { ...RENEWAL_STATE, daysLeft: 0 }
