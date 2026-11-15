'use client'

import { useState } from 'react'
import { Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DeviceType } from '@/hooks/use-device-detect'
import { useDeviceDetect } from '@/hooks/use-device-detect'
import { useInstallPrompt } from '@/hooks/use-install-prompt'
import { INSTALL_HERO, TUTORIALS } from '@/lib/data/install'
import { InstallCta } from './install-cta'
import { ScreenShell } from './screen-shell'

/* ── /install — SATU LAYAR, TIGA LANGKAH ──────────────────────────────────────
   Redesain: halaman ini dulu memuat hero + tiga kartu manfaat + CTA + panduan
   manual yang bisa dilipat + kartu batasan + serah-terima QR + panduan
   perangkat lain + dua baris kaki. Sekarang tinggal SATU alur:

     judul → pemilih tab (iPhone / Android) → 3 langkah bernomor.

   Tombol install 1-klik tetap dipakai saat browser menawarkannya
   (`beforeinstallprompt`) — itu aksi fungsional, bukan hiasan. Tidak ada
   ilustrasi SVG, tidak ada paragraf penjelasan tambahan. */

const TABS: DeviceType[] = ['ios', 'android']

export function InstallGuideScreen() {
  const { device, isReady } = useDeviceDetect()
  const { canInstall, isInstalled, isPrompting, install } = useInstallPrompt()
  const [pickedTab, setPickedTab] = useState<DeviceType | null>(null)
  const activeTab: DeviceType = pickedTab ?? (device === 'ios' ? 'ios' : 'android')
  const tutorial = TUTORIALS[activeTab]
  /* 3 langkah pertama saja — sisanya variasi browser yang jarang dipakai */
  const steps = tutorial.steps.slice(0, 3)

  return (
    <ScreenShell>
      <div className="mx-auto w-full max-w-xl">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-forest sm:text-3xl">
          {INSTALL_HERO.title}
        </h1>

        {/* pemilih tab */}
        <div
          role="tablist"
          aria-label="Pilih perangkat"
          className="mt-4 flex items-center gap-1 rounded-full bg-cream p-1 ring-1 ring-soil/12"
        >
          {TABS.map((target) => {
            const active = activeTab === target
            return (
              <button
                key={target}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setPickedTab(target)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium transition-colors',
                  active ? 'bg-sage text-forest' : 'text-forest-muted hover:text-forest',
                )}
              >
                <Smartphone className="size-3.5" strokeWidth={2.2} aria-hidden />
                {TUTORIALS[target].label}
              </button>
            )
          })}
        </div>

        {/* CTA install — baru dirender setelah perangkat terdeteksi, supaya
            kalimat "install otomatis belum bisa" tidak pernah salah sasaran
            (mis. kalimat desktop sempat tampil sekejap di iPhone). */}
        {isReady && !isInstalled && (
          <InstallCta
            className="mt-3"
            isInstalled={isInstalled}
            canInstall={canInstall}
            isPrompting={isPrompting}
            onInstall={install}
            device={device}
          />
        )}

        {/* tiga langkah bernomor */}
        <ol data-catetind-langkah className="mt-4 flex flex-col gap-2">
          {steps.map((step, index) => (
            <li
              key={step.text}
              className="flex items-start gap-3 rounded-2xl bg-cream px-3.5 py-3 ring-1 ring-soil/10"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-forest text-[12px] font-semibold tabular-nums text-cream">
                {index + 1}
              </span>
              <p className="min-w-0 text-[13.5px] leading-relaxed text-forest">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </ScreenShell>
  )
}
