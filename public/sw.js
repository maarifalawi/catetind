/* CatetInd Service Worker — penerima remote push (Web Push API).
   Notifikasi tetap muncul di tray HP meski tab app sudah ditutup. */

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

/* payload: { title, body, url } — dikirim dari /api/push/send */
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data?.text() }
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'CatetInd 🌿', {
      body: data.body ?? 'Ada update keuanganmu nih.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url ?? '/' },
      tag: data.tag ?? 'catetind',
      renotify: true,
    }),
  )
})

/* tap notifikasi → fokus tab yang sudah ada, atau buka tab baru */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ('focus' in client) {
            client.focus()
            if ('navigate' in client) client.navigate(url)
            return
          }
        }
        return self.clients.openWindow(url)
      }),
  )
})
