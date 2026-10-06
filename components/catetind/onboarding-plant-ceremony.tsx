'use client'

import { useState } from 'react'
import { Bell, BellRing, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PlantIllustration } from './plant-illustration'
import { usePushNotifications } from '@/lib/use-push-notifications'
import { ONBOARD_CARD } from './onboarding-ui'

/**
 * Upacara Tanaman (section 4C) — tampilan setelah transaksi pertama tersimpan.
 *
 * Alasan ada: hadiah sensorik di akhir onboarding (Domain 3A/3B) — user baru
 * selesai 3 langkah dan langsung melihat tanaman stage 0 miliknya. Dari sini
 * juga minta izin push, karena momentumnya paling tepat (baru lihat hasil).
 *
 * Redesign minimalis: glow `animate-ping` dihapus (dua getaran di satu layar
 * terasa ramai), teks pemuka jadi satu heading SF-style + satu subjudul, dan
 * kartu izin notifikasi memakai permukaan onboarding (ONBOARD_CARD) supaya
 * konsisten dengan 3 step sebelumnya.
 */
export function OnboardingPlantCeremony({
  onReminderChange,
}: {
  /** naik ke flow supaya pilihan izin ikut tersimpan di hasil onboarding */
  onReminderChange: (enabled: boolean) => void
}) {
  const { support, activate } = usePushNotifications()
  const [busy, setBusy] = useState(false)
  const [granted, setGranted] = useState(false)

  /** izin notifikasi: activate() = requestPermission + subscribe push server */
  async function handleActivate() {
    setBusy(true)
    try {
      const ok = await activate()
      if (ok) {
        setGranted(true)
        onReminderChange(true)
        toast.success('Pengingat aktif! Maks 2x sehari, jam 12:30 & 19:00 🔔')
      } else {
        toast('Oke, pengingatnya nanti aja ya 🔔')
      }
    } catch {
      /* VAPID/browser yang tidak mendukung push jangan sampai bikin step
         terakhir macet — cukup beri tahu dengan tenang */
      toast('Belum bisa nyalain pengingat di perangkat ini')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-center text-center">
      {/* ── tanaman + animasi penyiraman ─────────────────────────────── */}
      <div className="relative flex w-full justify-center pt-2">
        <div className="relative w-36">
          {/* tetes air jatuh bergantian; .water-drop didefinisikan di globals.css */}
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className="water-drop absolute size-1.5 rounded-full bg-thistle/30"
                style={{
                  left: 38 + index * 7 + '%',
                  animationDelay: index * 520 + 'ms',
                }}
              />
            ))}
          </span>

          {/* TODO: Replace with actual seed SVG stage 0 — sementara memakai
              ilustrasi tanaman bawaan (tahap Benih) supaya bahasa visualnya
              sudah konsisten dengan Home & Plant Detail */}
          <PlantIllustration stage={1} className="relative z-10" />
        </div>
      </div>

      <h2 className="mt-7 font-sans text-[1.55rem] font-medium leading-[1.15] tracking-[-0.035em] text-forest">
        Tanamanmu baru saja ditanam
      </h2>
      <p className="mt-3 max-w-[32ch] text-[14.5px] leading-relaxed tracking-[-0.01em] text-forest/50">
        Setiap kali kamu catat, tanamanmu akan tumbuh. Rawat dia baik-baik ya.
      </p>

      {/* ── izin notifikasi ──────────────────────────────────────────────
          Cuma dirender kalau browser memang punya PushManager. Di iOS Safari
          yang belum di-install ke Home Screen, prompt-nya tidak ada gunanya
          (push memang belum tersedia) — jadi lebih baik dilewati daripada
          menampilkan tombol yang pasti gagal. */}
      {support === 'supported' && (
        <section className={cn('mt-8 w-full p-4 text-left ring-1 ring-ink/[0.06]', ONBOARD_CARD)}>
          <div className="flex items-start gap-3.5">
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-[0.8rem]',
                granted ? 'bg-mint/40 text-forest' : 'bg-cream text-forest',
              )}
            >
              {granted ? (
                <BellRing className="size-[18px]" strokeWidth={2.2} />
              ) : (
                <Bell className="size-[18px]" strokeWidth={2.2} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium leading-snug tracking-[-0.01em] text-forest">
                {granted ? 'Pengingat aktif' : 'Aktifkan pengingat?'}
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-forest/45">
                {granted
                  ? 'Kami cuma muncul 2x sehari — jam 12:30 & 19:00. Tidak akan spam.'
                  : 'Cuma 2x sehari, jam 12:30 (setelah makan siang) dan 19:00 (setelah makan malam). Gak akan spam.'}
              </p>
            </div>
          </div>

          {!granted && (
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={handleActivate}
                disabled={busy}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-forest text-[13.5px] font-medium tracking-[-0.01em] text-cream transition-all duration-150 hover:bg-forest-soft active:scale-[0.98] disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" strokeWidth={2.4} />
                ) : (
                  <Bell className="size-4" strokeWidth={2.4} />
                )}
                {busy ? 'Minta izin…' : 'Aktifkan'}
              </button>
              <button
                type="button"
                onClick={() => onReminderChange(false)}
                className="h-11 rounded-full px-4 text-[13px] font-medium text-forest/40 transition-colors hover:bg-ink/[0.04] hover:text-forest/70"
              >
                Nanti aja
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
