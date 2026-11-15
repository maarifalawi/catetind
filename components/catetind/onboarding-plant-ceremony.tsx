'use client'

import { useState } from 'react'
import { Bell, BellRing, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PlantIllustration } from './plant-illustration'
import { usePushNotifications } from '@/lib/use-push-notifications'
import { ONBOARD_CARD } from './onboarding-ui'

/**
 * Upacara Puzzle (section 4C) — tampilan setelah transaksi pertama tersimpan.
 *
 * Alasan ada: hadiah sensorik di akhir onboarding (Domain 3A/3B) — user baru
 * selesai 3 langkah dan langsung melihat papan puzzle pertamanya. Dari sini
 * juga minta izin push, karena momentumnya paling tepat (baru lihat hasil).
 *
 * Revisi metafora: dulu layar ini "menanam benih" (ilustrasi tanaman + tetesan
 * air). Sekarang "memasang kepingan pertama" — ilustrasinya papan puzzle dan
 * hiasannya halo yang berdenyut lembut, bukan tetesan air.
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

  /** izin notifikasi: activate() = requestPermission + subscribe push server.
   *  Sejak hook-nya diperbaiki, hasilnya KODE ('ok' | 'denied' | 'no-worker' | …),
   *  bukan boolean — jadi pengecekannya harus eksplisit `=== 'ok'`; string
   *  apa pun selain itu truthy dan dulu akan salah dianggap berhasil. */
  async function handleActivate() {
    setBusy(true)
    try {
      const result = await activate()
      if (result === 'ok') {
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
      {/* ── papan puzzle + halo lembut ───────────────────────────────── */}
      <div className="relative flex w-full justify-center pt-2">
        <div className="relative w-36">
          {/* halo yang berdenyut pelan — pengganti tetesan air versi tanaman */}
          <span
            aria-hidden
            className="onboarding-puzzle-glow pointer-events-none absolute inset-x-0 top-1/4 mx-auto size-28 rounded-full bg-mint/30 blur-2xl"
          />

          {/* Papan puzzle (tahap 1) — komponen yang SAMA dengan Home & Puzzle
              Detail, jadi bahasa visualnya konsisten sejak upacara pertama. */}
          <PlantIllustration stage={1} className="relative z-10" />
        </div>
      </div>

      <h2 className="mt-7 font-sans text-[1.55rem] font-medium leading-[1.15] tracking-[-0.035em] text-forest">
        Kepingan pertamamu sudah terpasang
      </h2>

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
              <p className="text-[15px] font-medium leading-snug tracking-[-0.01em] text-forest">
                {granted ? 'Pengingat aktif' : 'Aktifkan pengingat?'}
              </p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-forest-muted">
                {granted
                  ? 'Kami cuma muncul 2x sehari, jam 12:30 & 19:00. Tidak akan spam.'
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
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-forest text-[14.5px] font-medium tracking-[-0.01em] text-cream transition-all duration-150 hover:bg-forest-soft active:scale-[0.98] disabled:opacity-60"
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
                className="h-11 rounded-full px-4 text-[14px] font-medium text-forest-muted transition-colors hover:bg-ink/[0.04] hover:text-forest-soft"
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
