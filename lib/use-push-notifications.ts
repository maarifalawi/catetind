'use client'

import { useCallback, useEffect, useState } from 'react'

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

/** batas tunggu service worker siap (ms).
 *
 *  KENAPA ADA BATAS: `navigator.serviceWorker.ready` TIDAK PERNAH resolve kalau
 *  tidak ada service worker terdaftar (bukan reject — promise-nya menggantung).
 *  Dulu itulah yang membuat tombol "Aktifkan Notifikasi" berputar selamanya di
 *  `pnpm dev` tanpa pesan apa pun. Dengan batas ini, semua jalur gagal berakhir
 *  dengan pesan yang bisa dibaca user. */
const SW_READY_TIMEOUT_MS = 8000

/** `Promise.race` dengan batas waktu; melempar `Error(reason)` saat lewat batas */
function withTimeout<T>(promise: Promise<T>, ms: number, reason: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(reason)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

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
 * Hasil aktivasi push. Dibedakan supaya layar Pengaturan bisa menjelaskan
 * APA yang gagal, bukan hanya berhenti berputar:
 *   · `unsupported`   — browser ini tidak punya Web Push;
 *   · `denied`        — izin notifikasi ditolak user/browser;
 *   · `no-worker`     — service worker tidak siap (mis. dev tanpa SW, HTTPS salah);
 *   · `no-session`    — endpoint menolak (401): belum masuk akun;
 *   · `failed`        — subscribe/izin gagal karena sebab lain (mis. VAPID kosong).
 */
export type PushActivateResult =
  | 'ok'
  | 'unsupported'
  | 'denied'
  | 'no-worker'
  | 'no-session'
  | 'failed'

/**
 * Hook Web Push — permission, subscribe/unsubscribe, test lokal & remote.
 * iOS: butuh install ke Home Screen dulu (audit PRD evidence #18).
 *
 * Sejak paket 39, `POST /api/push/subscribe` & `/api/push/send` MENOLAK request
 * tanpa sesi (401) karena subscription kini disimpan per user. Hook ini
 * meneruskan fakta itu apa adanya (`'no-session'`) — dulu respons gagal pun
 * dianggap sukses karena endpoint-nya tidak memeriksa apa pun.
 *
 * DEV (perbaikan "tombol Aktifkan Notifikasi berputar terus"): semua akses
 * `navigator.serviceWorker.ready` dibatasi waktu (`withTimeout`). Dulu, saat
 * `pnpm dev` tidak punya service worker terdaftar, promise itu menggantung
 * selamanya sehingga spinner tidak pernah berhenti. Sekarang `sw-push-dev.js`
 * didaftarkan di dev, dan kalau tetap tidak ada SW, hasilnya `'no-worker'` —
 * user melihat kalimat penjelas, bukan spinner abadi.
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
      /* batas waktu juga di sini: tanpa SW, `ready` menggantung dan status
         "sudah terdaftar" tidak pernah muncul (spinner status di kartu) */
      void withTimeout(navigator.serviceWorker.ready, SW_READY_TIMEOUT_MS, 'no-service-worker')
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setSubscribed(!!sub))
        .catch(() => setSubscribed(false))
    }
  }, [])

  /** ambil registrasi SW yang siap, atau melempar `no-service-worker` */
  const readyRegistration = useCallback(async (): Promise<ServiceWorkerRegistration> => {
    if (!('serviceWorker' in navigator)) throw new Error('no-service-worker')
    return withTimeout(
      navigator.serviceWorker.ready,
      SW_READY_TIMEOUT_MS,
      'no-service-worker',
    )
  }, [])

  /** minta izin + subscribe push server — hasilnya dibaca layar Pengaturan */
  const activate = useCallback(async (): Promise<PushActivateResult> => {
    if (support !== 'supported') return 'unsupported'
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'failed'

      const reg = await readyRegistration()
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
        return 'no-session'
      }
      setSessionMissing(false)
      setSubscribed(res.ok)
      return res.ok ? 'ok' : 'failed'
    } catch (error) {
      /* Tidak ada satu pun jalur yang boleh menggantung: lemparan apa pun
         diubah jadi hasil yang bisa dijelaskan ke user. */
      return error instanceof Error && error.message === 'no-service-worker'
        ? 'no-worker'
        : 'failed'
    }
  }, [readyRegistration, support])

  const deactivate = useCallback(async () => {
    try {
      const reg = await readyRegistration()
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
    } catch {
      /* gagal mencabut di server/perangkat: status lokal tetap dimatikan supaya
         tombol tidak menggantung di keadaan "masih terdaftar" */
    }
    setSubscribed(false)
  }, [readyRegistration])

  /** test lokal — muncul langsung, tapi butuh tab app terbuka */
  const testLocal = useCallback(() => {
    if (Notification.permission !== 'granted') return
    new Notification('CatetInd 🧩', {
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
          title: 'CatetInd 🧩',
          body: 'Push remote BERHASIL! Ini dikirim server, muncul walau app ditutup.',
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
