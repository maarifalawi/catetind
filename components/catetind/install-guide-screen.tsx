'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, MonitorDown, Share, Smartphone, Zap, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDeviceDetect, type DeviceType } from '@/hooks/use-device-detect'
import { useInstallPrompt } from '@/hooks/use-install-prompt'
import {
  INSTALL_BENEFITS,
  INSTALL_CHECKOUT_CTA,
  INSTALL_DETECTING_LABEL,
  INSTALL_HELP_FOOTER,
  INSTALL_HERO,
  INSTALL_IOS_CTA,
  INSTALL_OTHER_GUIDES_LABEL,
  INSTALL_TABLIST_LABEL,
  TUTORIALS,
} from '@/lib/data/install'
import { InstallCta } from './install-cta'
import { InstallLimitsCard } from './install-limits-card'
import { InstallQrHandoff } from './install-qr-handoff'
import { InstallRewardBanner } from './install-reward-banner'
import { IosInstallArrow } from './ios-install-arrow'
import { ManualTutorial } from './manual-tutorial'
import { ScreenShell } from './screen-shell'

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
 * - Desktop dapat serah-terima link ke HP (Bagikan/Salin), semua orang dapat
 *   kartu batasan PWA yang jujur + banner bonus.
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
    <ScreenShell>
      {/* ── `/install` DI DALAM SHELL APP (paket 44) ────────────────────────────
          Dulu halaman ini cuma `PhoneStage` + kolom sendiri, jadi saat dibuka dari
          sidebar/menu "Lainnya" navigasinya HILANG: user kehilangan sidebar di
          desktop dan tidak bisa pindah halaman dari panduan install. Sekarang ia
          memakai `ScreenShell` seperti semua halaman app lain — sidebar desktop
          tetap ada, dan bottom nav + FAB sudah aktif di route ini
          (`components/MobileBottomNav.tsx` tidak memasukkan `/install` ke
          FOCUS_ROUTES).

          LAYOUT (audit 46): dulu isinya dibungkus `mx-auto max-w-2xl`, jadi di
          layar lebar halaman ini tampak seperti halaman ponsel — kolom tipis di
          tengah dengan sisa lebar menganggur di kiri-kanan. Sekarang polanya sama
          dengan halaman app lain (kanon CONTEXT §6: desktop = grid 12 kolom):

            · mobile  → SATU kolom, urutan tetap: kenapa install → panduan → kaki;
            · desktop → kolom kiri 5 (hero + 3 alasan + serah-terima link ke HP),
                        kolom kanan 7 (CTA install, langkah, batasan, perangkat
                        lain, kaki halaman).

          Tidak ada lebar maksimum buatan: padding & lebar konten datang dari
          shell, jadi tepi kiri/kanan `/install` sejajar dengan Dashboard. */}
      <div className="w-full lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-8">
        {/* ── HERO: jual alasannya dulu ──
            Penempatan grid ditulis EKSPLISIT (`row-start`) supaya kartu kiri
            (hero + serah-terima) menumpuk rapi di kolom 1–5 dan kolom kanan
            membentang penuh di sebelahnya. Sebelumnya `InstallQrHandoff` adalah
            anak grid TANPA `lg:col-span-*` → di grid 12 kolom ia menyempit jadi
            1 kolom dan kolom kanan terlempar ke baris baru (tata letak 5/7 pecah). */}
        <header className="lg:col-span-5 lg:row-start-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cream/70 px-3 py-1 text-[11px] font-medium tracking-[0.16em] text-forest uppercase ring-1 ring-soil/12">
            <Zap className="size-3" strokeWidth={2.6} aria-hidden />
            {INSTALL_HERO.badge}
          </span>

          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-forest lg:text-4xl">
            {INSTALL_HERO.title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-forest/55 sm:text-base">
            {INSTALL_HERO.subtitle}
          </p>

          <ul className="mt-6 grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
            {INSTALL_BENEFITS.map((benefit) => (
              <li
                key={benefit.title}
                className="flex items-center gap-3 rounded-2xl bg-cream/85 px-3.5 py-3 ring-1 ring-soil/12 backdrop-blur-xl sm:flex-col sm:items-start sm:gap-2 sm:py-4 lg:flex-row lg:items-center lg:gap-3 lg:py-3"
              >
                <span aria-hidden className="text-xl">
                  {benefit.emoji}
                </span>
                <div>
                  <p className="text-sm font-medium text-forest">{benefit.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-forest/50">{benefit.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </header>

        {/* desktop: serah-terima link ke HP — ditaruh di kolom kiri (bukan di
            dalam blok panduan) supaya kolom kiri tidak menganggur di layar lebar.
            `isReady` WAJIB ikut: sebelum deteksi selesai `device` bernilai
            'desktop' (state awal hook), jadi tanpa gerbang ini HTML server akan
            berbeda dari render pertama client (hydration mismatch). */}
        {isReady && device === 'desktop' && (
          <InstallQrHandoff className="mt-6 lg:col-span-5 lg:col-start-1 lg:row-start-2" />
        )}

        {/* ── KOLOM KANAN: panduan langkah demi langkah (7/12 di desktop) ── */}
        <div className="lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1">
          {!isReady ? (
            /* deteksi perangkat jalan setelah mount — jangan sempat menampilkan
               panduan perangkat yang salah */
            <div className="mt-6 space-y-3" aria-live="polite">
              <div className="h-16 animate-pulse rounded-3xl bg-cream/60 ring-1 ring-soil/12" />
              <div className="h-64 animate-pulse rounded-3xl bg-cream/60 ring-1 ring-soil/12" />
              <p className="text-center text-xs text-forest/40">{INSTALL_DETECTING_LABEL}</p>
            </div>
          ) : (
            <>
              {/* ── CTA 1-KLIK (Android & desktop) / arahan manual (iOS) ── */}
              {device === 'ios' ? (
                <div className="mt-6 flex items-start gap-3 rounded-3xl bg-sage/70 px-5 py-4 ring-1 ring-forest/10">
                  <Share className="size-5 shrink-0 text-forest" strokeWidth={2.2} />
                  <p className="text-sm leading-relaxed text-forest">
                    {INSTALL_IOS_CTA(TUTORIALS.ios.steps.length)}
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
              {/* kartu "Lanjutkan di HP" untuk desktop sudah pindah ke KOLOM KIRI
                  (di atas) supaya tidak menumpuk di kolom panduan */}
              {/* ── BATASAN: pasangan jujur dari kartu benefit di hero (PRD 4A) ── */}
              <InstallLimitsCard className="mt-4" />
              {/* ── PERANGKAT LAIN: panduan lain disembunyikan sampai diminta ── */}
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setAllGuidesOpen((open) => !open)}
                  aria-expanded={allGuidesOpen}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-forest/70 underline-offset-4 transition-colors duration-200 hover:text-forest hover:underline"
                >
                  {allGuidesOpen ? INSTALL_OTHER_GUIDES_LABEL.close : INSTALL_OTHER_GUIDES_LABEL.open}
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
                    aria-label={INSTALL_TABLIST_LABEL}
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
                              ? 'bg-sage font-medium text-forest'
                              : 'text-forest/50 hover:text-forest',
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
                  </div>
                </div>
              )}

              {/* kaki halaman: satu baris saja — bantuan + jalan masuk kalau belum punya akun */}
              <p className="mt-6 text-center text-[11px] leading-relaxed text-forest/35">
                {INSTALL_HELP_FOOTER.prefix}
                <a href="/help" className="font-medium text-forest/70 underline underline-offset-2">
                  {INSTALL_HELP_FOOTER.linkLabel}
                </a>
                {INSTALL_HELP_FOOTER.suffix}
                <span className="mx-1.5 text-forest/20">·</span>
                {INSTALL_CHECKOUT_CTA.prefix}{' '}
                <Link
                  href={INSTALL_CHECKOUT_CTA.href}
                  className="font-medium text-forest/70 underline underline-offset-2"
                >
                  {INSTALL_CHECKOUT_CTA.linkLabel}
                </Link>
              </p>

              {/* ── REWARD: penutup halaman, alasan terakhir buat install ── */}
              <InstallRewardBanner />
            </>
          )}
        </div>
      </div>

      <IosInstallArrow show={showIosArrow} />
    </ScreenShell>
  )
}
