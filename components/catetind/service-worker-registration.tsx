'use client'

import { useEffect } from 'react'

/** register service worker sekali per sesi — dibutuhkan untuk Web Push */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* gagal register (mis. mode dev tanpa HTTPS) — push dinonaktifkan saja */
    })
  }, [])
  return null
}
