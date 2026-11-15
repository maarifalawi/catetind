/* CatetInd Service Worker KHUSUS PUSH — dipakai HANYA saat `pnpm dev`.
   Notifikasi tetap muncul di tray meski tab app sudah ditutup, tanpa menahan
   aset apa pun di Cache Storage.

   KENAPA FILE TERPISAH DARI `sw.js`: `sw.js` menyajikan `/_next/static/**`
   dengan STALE-WHILE-REVALIDATE. Aturan itu benar untuk aset produksi (namanya
   ber-hash), tetapi di `pnpm dev` nama chunk Turbopack tidak stabil antar-edit —
   browser bisa menjalankan chunk LAMA sementara modul pemanggilnya sudah baru
   (gejala: `... is not a function`). Karena itu `service-worker-registration.tsx`
   sengaja TIDAK mendaftarkan `sw.js` di non-produksi.

   Konsekuensinya dulu: `navigator.serviceWorker.ready` TIDAK PERNAH resolve di
   dev, sehingga tombol "Aktifkan Notifikasi" berputar selamanya. File ini
   menutup celah itu dengan cara paling aman: **tidak ada handler `fetch` sama
   sekali** (nol risiko chunk basi), hanya `push` + `notificationclick` — bagian
   yang memang dibutuhkan Web Push. */

/* ── NOTIFIKASI: TAMPILAN & TAP ───────────────────────────────────────────────

   Payload dari server (`lib/push/deliver.ts` → `pushPayload`):

     { title, body, url, tag, kind }        kind = 'bills' | 'daily' | 'weekly'

   `url` WAJIB path internal. Kalau pengirim (atau pihak lain) mengirim URL
   absolut/`//domain-lain`, SW mengabaikannya dan memakai `/` — notifikasi tidak
   boleh dipakai mengalihkan user ke situs lain, sekalipun push-nya sah.
   Aturan ini SAMA PERSIS dengan `sw.js` produksi. */

const DEFAULT_NOTIFICATION_URL = '/'

/** hanya path internal yang diterima (aturan yang sama dengan `/api/push/send`) */
function safeInternalUrl(raw) {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) {
    return DEFAULT_NOTIFICATION_URL
  }
  return raw
}

self.addEventListener('install', () => {
  /* langsung aktif supaya `navigator.serviceWorker.ready` cepat resolve */
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data && event.data.text ? event.data.text() : '' }
  }

  const url = safeInternalUrl(data.url)
  const tag = typeof data.tag === 'string' && data.tag ? data.tag : 'catetind'
  const title = typeof data.title === 'string' && data.title ? data.title : 'CatetInd 🌿'
  const body =
    typeof data.body === 'string' && data.body ? data.body : 'Ada update keuanganmu nih.'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag,
      renotify: true,
      data: { url, kind: typeof data.kind === 'string' ? data.kind : 'info' },
    }),
  )
})

/* Tap notifikasi:
     1. jendela app yang SUDAH menampilkan tujuan → fokuskan saja;
     2. jendela app lain → fokuskan lalu arahkan ke tujuan;
     3. belum ada jendela app → buka jendela baru menuju tujuan. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = safeInternalUrl(event.notification.data && event.notification.data.url)
  const target = new URL(targetUrl, self.location.origin)

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        try {
          if (new URL(client.url).pathname === target.pathname && 'focus' in client) {
            return client.focus()
          }
        } catch {
          /* URL klien yang tidak bisa dibaca dilewati, bukan menggagalkan tap */
        }
      }

      for (const client of clientList) {
        if (!('focus' in client)) continue
        return Promise.resolve(client.focus()).then(() =>
          'navigate' in client ? client.navigate(target.href) : client,
        )
      }

      return self.clients.openWindow(target.href)
    }),
  )
})
