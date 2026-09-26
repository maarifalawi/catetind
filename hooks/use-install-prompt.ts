'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Event `beforeinstallprompt` belum ada di lib.dom TypeScript → bentuknya
 * dideklarasikan manual di sini.
 *
 * beforeinstallprompt is supported on Chrome (Android, Windows, Mac), Edge, and
 * Samsung Internet. Not supported on Safari/iOS.
 */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

/** app sedang jalan sebagai aplikasi terpasang (bukan tab browser)? */
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const fromMediaQuery = window.matchMedia('(display-mode: standalone)').matches
  /* iOS Safari (legacy) belum ikut display-mode — punya flag sendiri */
  const iosLegacy = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return fromMediaQuery || iosLegacy
}

/**
 * useInstallPrompt — pembungkus Web API `beforeinstallprompt`.
 *
 * Alur: browser membayar event saat app memenuhi syarat install (manifest +
 * service worker + HTTPS) → event kita tahan supaya prompt bawaan tidak muncul
 * sendiri → user klik CTA kita → `prompt()` memunculkan dialog install native.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isPrompting, setIsPrompting] = useState(false)

  useEffect(() => {
    setIsInstalled(isStandalone())

    function onBeforeInstallPrompt(event: Event) {
      /* tahan dialog bawaan browser — kita buka saat user klik tombol kita */
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    function onInstalled() {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    /* user bisa juga install dari menu browser → ikut pantau perubahan display-mode */
    const mq = window.matchMedia('(display-mode: standalone)')
    const onDisplayModeChange = (event: MediaQueryListEvent) => {
      if (event.matches) setIsInstalled(true)
    }
    mq.addEventListener('change', onDisplayModeChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      mq.removeEventListener('change', onDisplayModeChange)
    }
  }, [])

  /** buka dialog install native — mengembalikan pilihan user (accept/dismiss) */
  const install = useCallback(async (): Promise<InstallOutcome> => {
    if (!deferredPrompt) return 'unavailable'

    setIsPrompting(true)
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setIsInstalled(true)
      /* event hanya bisa dipakai sekali — dibuang supaya tombol tidak jadi mati */
      setDeferredPrompt(null)
      return outcome
    } catch {
      setDeferredPrompt(null)
      return 'unavailable'
    } finally {
      setIsPrompting(false)
    }
  }, [deferredPrompt])

  return {
    /** true = browser sudah siap memunculkan dialog install native */
    canInstall: deferredPrompt !== null,
    /** true = app sedang dibuka dalam mode standalone (sudah terpasang) */
    isInstalled,
    isPrompting,
    install,
  }
}
