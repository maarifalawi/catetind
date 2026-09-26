'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, MonitorDown, Share, Smartphone, Zap, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDeviceDetect, type DeviceType } from '@/hooks/use-device-detect'
import { useInstallPrompt } from '@/hooks/use-install-prompt'
import { InstallCta } from './install-cta'
import { InstallQrHandoff } from './install-qr-handoff'
import { InstallRewardBanner } from './install-reward-banner'
import { IosInstallArrow } from './ios-install-arrow'
import { ManualTutorial, TUTORIALS } from './manual-tutorial'

/** 3 alasan install — bahasa user, bukan bahasa fitur */
const BENEFITS = [
  { emoji: '📴', title: 'Bisa Offline', desc: 'Catat walau gak ada sinyal.' },
  { emoji: '🚀', title: '3x Lebih Cepat', desc: 'Loading instan tanpa nunggu browser.' },
  { emoji: '💾', title: 'Hemat Storage', desc: 'Gak makan memori berkiga-giga.' },
]

const TAB_ORDER: DeviceType[] = ['ios', 'android', 'desktop']
const TAB_ICON: Record<DeviceType, LucideIcon> = {
  ios: Smartphone,
  android: Smartphone,
  desktop: MonitorDown,
}

/**
 * InstallGuideScreen — halaman /install.
 *
 * Mesin konversi install, bukan tutorial kaku:
 * - Deteksi perangkat → hanya panduan yang relevan yang tampil (device lain
 *   disembunyikan, bisa dibuka lewat link "Lihat panduan untuk perangkat lain").
 * - Android/desktop dapat tombol install 1-klik (beforeinstallprompt).
 * - iOS dapat panduan manual Safari + panah melayang yang menunjuk tombol Share.
 * - Desktop dapat QR handoff ke HP, dan semua orang dapat banner bonus.
 */
export function InstallGuideScreen() {
  const { device, browser, isReady } = useDeviceDetect()
  const { canInstall, isInstalled, isPrompting, install } = useInstallPrompt()

  /* user pilih lihat perangkat lain → Tabs terbuka dengan semua panduan */
  const [allGuidesOpen, setAllGuidesOpen] = useState(false)
  /* tab default mengikuti perangkat hasil deteksi; user boleh menggeser */
  const [pickedTab, setPickedTab] = useState<DeviceType | null>(null)
  const activeTab = pickedTab ?? device

  /* iOS: panah melayang auto-hilang begitu user lewat langkah-langkah tutorial */
  const stepsEndRef = useRef<HTMLDivElement | null>(null)
  const [passedSteps, setPassedSteps] = useState(false)

  useEffect(() => {
    if (device !== 'ios') return
    const node = stepsEndRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setPassedSteps(true)
      },
      { rootMargin: '0px 0px -25% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [device, isReady])

  /* panah hanya untuk iPhone yang dibuka di Safari, belum terpasang, dan
     belum lewat langkah tutorial */
  const showIosArrow =
    isReady &&
    device === 'ios' &&
    browser === 'Safari' &&
    !isInstalled &&
    !passedSteps &&
    !allGuidesOpen

  return (
    <>
      <div className="mx-auto w-full max-w-2xl px-5 pt-6 pb-32 sm:px-8 lg:px-10 lg:pt-8">
        {/* ── HERO: jual alasannya dulu ── */}
        <header>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cream/70 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-forest uppercase ring-1 ring-soil/12">
            <Zap className="size-3" strokeWidth={2.6} />
            Gratis · Tanpa App Store
          </span>

          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink lg:text-4xl">
            Install CatetInd di HP Kamu
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink/55 sm:text-base">
            Biar nyatet pengeluaran secepat buka Instagram.
          </p>

          <ul className="mt-6 grid gap-2.5 sm:grid-cols-3">
            {BENEFITS.map((benefit) => (
              <li
                key={benefit.title}
                className="flex items-center gap-3 rounded-2xl bg-cream/85 px-3.5 py-3 ring-1 ring-soil/12 backdrop-blur-xl sm:flex-col sm:items-start sm:gap-2 sm:py-4"
              >
                <span aria-hidden className="text-xl">
                  {benefit.emoji}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{benefit.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink/50">{benefit.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </header>
        {!isReady ? (
          /* deteksi perangkat jalan setelah mount — jangan sempat menampilkan
             panduan perangkat yang salah */
          <div className="mt-6 space-y-3" aria-live="polite">
            <div className="h-16 animate-pulse rounded-3xl bg-cream/60 ring-1 ring-soil/12" />
            <div className="h-64 animate-pulse rounded-3xl bg-cream/60 ring-1 ring-soil/12" />
            <p className="text-center text-xs text-ink/40">Mendeteksi perangkat kamu…</p>
          </div>
        ) : (
          <>
            {/* ── CTA 1-KLIK (Android & desktop) / arahan manual (iOS) ── */}
            {device === 'ios' ? (
              <div className="mt-6 flex items-start gap-3 rounded-3xl bg-sage/70 px-5 py-4 ring-1 ring-forest/10">
                <Share className="size-5 shrink-0 text-forest" strokeWidth={2.2} />
                <p className="text-sm leading-relaxed text-forest">
                  Di iPhone install-nya lewat tombol Share Safari — ikuti{' '}
                  {TUTORIALS.ios.steps.length} langkah di bawah ya 👇
                </p>
              </div>
            ) : (
              <InstallCta
                className="mt-6"
                isInstalled={isInstalled}
                canInstall={canInstall}
                isPrompting={isPrompting}
                onInstall={install}
              />
            )}
            {/* ── PANDUAN perangkat yang terdeteksi ── */}
            <ManualTutorial device={device} className="mt-4" />
            {/* sentinel: begitu masuk viewport, user sudah lewat langkah tutorial */}
            {device === 'ios' && <div ref={stepsEndRef} aria-hidden className="h-px w-full" />}
            {device === 'desktop' && <InstallQrHandoff className="mt-4" />}
            {/* ── PERANGKAT LAIN: panduan lain disembunyikan sampai diminta ── */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setAllGuidesOpen((open) => !open)}
                aria-expanded={allGuidesOpen}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest/70 underline-offset-4 transition-colors duration-200 hover:text-forest hover:underline"
              >
                {allGuidesOpen
                  ? 'Sembunyikan panduan perangkat lain'
                  : 'Lihat panduan untuk perangkat lain'}
                {allGuidesOpen ? (
                  <ChevronUp className="size-3.5" strokeWidth={2.4} />
                ) : (
                  <ChevronDown className="size-3.5" strokeWidth={2.4} />
                )}
              </button>
            </div>
            {allGuidesOpen && (
              <div className="mt-4">
                <div
                  role="tablist"
                  aria-label="Pilih perangkat"
                  className="flex w-full items-center gap-1 rounded-full bg-cream p-1 shadow-[0_10px_24px_-18px_rgba(69,89,78,0.55)] ring-1 ring-soil/12"
                >
                  {TAB_ORDER.map((target) => {
                    const active = activeTab === target
                    const Icon = TAB_ICON[target]
                    return (
                      <button
                        key={target}
                        type="button"
                        role="tab"
                        id={`install-tab-${target}`}
                        aria-selected={active}
                        aria-controls={`install-panel-${target}`}
                        onClick={() => setPickedTab(target)}
                        className={cn(
                          'flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-xs font-medium transition-colors duration-200 active:scale-95',
                          active
                            ? 'bg-sage font-semibold text-forest'
                            : 'text-ink/50 hover:text-ink',
                        )}
                      >
                        <Icon className="size-4 shrink-0" strokeWidth={2.2} />
                        {TUTORIALS[target].label}
                      </button>
                    )
                  })}
                </div>

                <div
                  role="tabpanel"
                  id={`install-panel-${activeTab}`}
                  aria-labelledby={`install-tab-${activeTab}`}
                >
                  <ManualTutorial device={activeTab} className="mt-3" />
                  {activeTab === 'desktop' && <InstallQrHandoff className="mt-3" />}
                  {activeTab === 'ios' && activeTab !== device && (
                    <p className="mt-3 text-center text-xs text-ink/40">
                      Panah panduan Share hanya muncul saat halaman ini dibuka di iPhone.
                    </p>
                  )}
                </div>
              </div>
            )}

            <p className="mt-6 text-center text-[11px] leading-relaxed text-ink/35">
              Masih bingung? Buka{' '}
              <a href="/help" className="font-semibold text-forest/70 underline underline-offset-2">
                Pusat Bantuan
              </a>
              .
            </p>

            {/* ── REWARD: penutup halaman, alasan terakhir buat install ── */}
            <InstallRewardBanner />
          </>
        )}
      </div>

      <IosInstallArrow show={showIosArrow} />
    </>
  )
}
