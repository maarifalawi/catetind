'use client'

import { useCallback, useEffect, useState } from 'react'

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export type PushSupport = 'checking' | 'unsupported' | 'needs-install' | 'supported'

/** hasil aksi yang menembak endpoint bersesi (paket 39) */
export type PushActionResult = 'ok' | 'no-session' | 'failed'

/**
 * Hook Web Push — permission, subscribe/unsubscribe, test lokal & remote.
 * iOS: butuh install ke Home Screen dulu (audit PRD evidence #18).
 *
 * Sejak paket 39, `POST /api/push/subscribe` & `/api/push/send` MENOLAK request
 * tanpa sesi (401) karena subscription kini disimpan per user. Hook ini
 * meneruskan fakta itu apa adanya (`'no-session'`) — dulu respons gagal pun
 * dianggap sukses karena endpoint-nya tidak memeriksa apa pun.
 */
export function usePushNotifications() {
  const [support, setSupport] = useState<PushSupport>('checking')
  const [permission, setPermission] =
    useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  /** true = endpoint menjawab 401: sesi demo belum dibuat di perangkat ini */
  const [sessionMissing, setSessionMissing] = useState(false)

  useEffect(() => {
    const hasPush =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window

    if (!hasPush) {
      /* iOS Safari non-standalone: PushManager hilang sampai di-install */
      const isIOSSafari =
        /iP(hone|ad|od)/.test(navigator.userAgent) &&
        !window.matchMedia('(display-mode: standalone)').matches
      setSupport(isIOSSafari ? 'needs-install' : 'unsupported')
      return
    }

    setSupport('supported')
    setPermission(Notification.permission)
    if (Notification.permission === 'granted') {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setSubscribed(!!sub))
        .catch(() => setSubscribed(false))
    }
  }, [])

  /** minta izin + subscribe push server — return true jika berhasil */
  const activate = useCallback(async (): Promise<boolean> => {
    if (support !== 'supported') return false
    const perm = await Notification.requestPermission()
    setPermission(perm)
    if (perm !== 'granted') return false

    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
    })
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
    })
    if (res.status === 401) {
      setSessionMissing(true)
      setSubscribed(false)
      return false
    }
    setSessionMissing(false)
    setSubscribed(res.ok)
    return res.ok
  }, [support])

  const deactivate = useCallback(async () => {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
      await sub.unsubscribe()
    }
    setSubscribed(false)
  }, [])

  /** test lokal — muncul langsung, tapi butuh tab app terbuka */
  const testLocal = useCallback(() => {
    if (Notification.permission !== 'granted') return
    new Notification('CatetInd 🌿', {
      body: 'Notifikasi lokal jalan! Ini tampil dari tab app yang terbuka.',
      icon: '/icons/icon-192.png',
    })
  }, [])

  /** test remote — dikirim server, muncul walau tab app ditutup */
  const testRemote = useCallback(async (): Promise<PushActionResult> => {
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'CatetInd 🌿',
          body: 'Push remote BERHASIL! Ini dikirim server — muncul walau app ditutup.',
          url: '/',
        }),
      })
      if (res.status === 401) {
        setSessionMissing(true)
        return 'no-session'
      }
      setSessionMissing(false)
      return res.ok ? 'ok' : 'failed'
    } catch {
      return 'failed'
    }
  }, [])

  return {
    support,
    permission,
    subscribed,
    sessionMissing,
    activate,
    deactivate,
    testLocal,
    testRemote,
  }
}
