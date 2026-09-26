'use client'

import { useEffect, useState } from 'react'

/** 3 kelompok perangkat — masing-masing punya panduan install yang berbeda */
export type DeviceType = 'ios' | 'android' | 'desktop'

/**
 * Bentuk minimal `navigator.userAgentData` (NavigatorUAData). API ini belum
 * ada di lib.dom TypeScript, jadi tipenya dideklarasikan lokal lalu dipakai
 * opsional: kalau browser tidak menyediakannya (Safari/Firefox) kita fallback
 * ke parsing userAgent klasik.
 */
type UserAgentBrand = { brand: string; version: string }
type UserAgentDataLike = {
  brands?: UserAgentBrand[]
  mobile?: boolean
  platform?: string
}

export type DeviceInfo = {
  device: DeviceType
  browser: string
  /** false selama render pertama (SSR) — UI menampilkan placeholder deteksi dulu */
  isReady: boolean
}

/** state awal deterministik supaya render server & klien identik (bebas hydration mismatch) */
const UNKNOWN: DeviceInfo = { device: 'desktop', browser: '', isReady: false }

/** deteksi browser: userAgentData lebih dulu (kalau ada), lalu userAgent klasik */
function detectBrowser(ua: string, uaData?: UserAgentDataLike): string {
  const brands = uaData?.brands?.map((b) => b.brand.toLowerCase()) ?? []
  const hasBrand = (needle: string) => brands.some((b) => b.includes(needle))

  if (hasBrand('microsoft edge') || /Edg[A-Za-z]*\//.test(ua)) return 'Edge'
  if (hasBrand('opera') || /OPiOS\/|OPR\//.test(ua)) return 'Opera'
  if (hasBrand('samsung') || /SamsungBrowser/.test(ua)) return 'Samsung Internet'
  if (/FxiOS\/|Firefox\//.test(ua)) return 'Firefox'
  if (hasBrand('google chrome') || /CriOS\/|Chrome\//.test(ua)) return 'Chrome'
  if (/Version\//.test(ua) && /Safari\//.test(ua)) return 'Safari'
  return 'Browser lain'
}

/** deteksi perangkat — iPadOS 13+ menyamar sebagai Mac, jadi dicek lewat maxTouchPoints juga */
function detectDevice(
  ua: string,
  uaData?: UserAgentDataLike,
  maxTouchPoints = 0,
): DeviceType {
  const isIpadDesktopMode = /Macintosh/.test(ua) && maxTouchPoints > 1
  if (/iPad|iPhone|iPod/.test(ua) || isIpadDesktopMode) return 'ios'
  if (/Android/.test(ua) || uaData?.platform?.toLowerCase() === 'android') return 'android'
  /* sinyal "mobile" dari userAgentData tapi platform tak dikenali (langka) —
     semua mobile non-iOS praktis Android */
  if (uaData?.mobile === true && !/Windows|Macintosh|Linux/.test(ua)) return 'android'
  return 'desktop'
}

/**
 * useDeviceDetect — klasifikasi perangkat & browser user.
 *
 * Dipakai halaman /install untuk menyembunyikan panduan yang tidak relevan:
 * iPhone dapat tutorial manual (iOS tidak punya beforeinstallprompt), Android &
 * desktop dapat tombol install 1-klik + tutorial fallback.
 *
 * Aman untuk SSR: `device`/`browser` baru terisi setelah mount (`isReady`),
 * jadi markup server tidak pernah menebak salah.
 */
export function useDeviceDetect(): DeviceInfo {
  const [info, setInfo] = useState<DeviceInfo>(UNKNOWN)

  useEffect(() => {
    const ua = navigator.userAgent
    const uaData = (navigator as Navigator & { userAgentData?: UserAgentDataLike })
      .userAgentData

    setInfo({
      device: detectDevice(ua, uaData, navigator.maxTouchPoints ?? 0),
      browser: detectBrowser(ua, uaData),
      isReady: true,
    })
  }, [])

  return info
}
