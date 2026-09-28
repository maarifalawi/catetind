/* CatetInd Service Worker — penerima remote push (Web Push API) + shell offline.
   Notifikasi tetap muncul di tray HP meski tab app sudah ditutup.

   PAKET 42: handler `fetch` ditambahkan. Sebelumnya SW ini cuma tahu soal push,
   jadi PWA yang sudah di-Install to Home Screen TIDAK bisa dibuka tanpa sinyal —
   browser minta HTML ke server, gagal, dan tab-nya putih kosong.

   Tiga aturan cache-nya sengaja eksplisit:
     1. `/api/**`  → NETWORK-ONLY, tidak pernah dicache. Ini jalur data uang
        (dan push); menyajikan jawaban lama dari cache = memberi tahu user angka
        yang sudah tidak benar. Kalau jaringan mati, request-nya gagal apa adanya
        dan app menanganinya (banner offline + antrean lokal).
     2. NAVIGASI (dokumen HTML) → network-first, lalu jatuh ke cache, terakhir ke
        shell `/`. Bukan stale-while-revalidate: dokumen dan payload RSC-nya harus
        berasal dari BUILD yang sama, kalau tidak React akan mengeluh hydration
        mismatch saat app dibuka dari cache.
     3. ASET STATIS (/_next/static, ikon, gambar, font) → STALE-WHILE-REVALIDATE.
        Namanya sudah ber-hash, jadi aset lama tidak pernah "salah versi".
     4. Versi cache di `CACHE_VERSION`: setiap deploy baru punya nama cache baru,
        dan cache lama dihapus di `activate` — supaya user tidak tersangkut di
        bundel lama selamanya.

   Batas jujur: SW ini hanya menyediakan SHELL (HTML + aset). Data keuangan yang
   tampil tetap dibaca dari IndexedDB (`lib/money/idb.ts`) — tidak ada API yang
   mengembalikan data keuangan dari cache. */

const CACHE_VERSION = 'catetind-shell-v1'
/** dokumen yang disiapkan supaya app setidaknya bisa DIBUKA saat benar-benar offline */
const SHELL_DOCUMENT = '/'
/** aset ber-hash: aman disajikan dari cache lalu diperbarui di belakang */
const STATIC_PREFIXES = ['/_next/static/', '/icons/', '/fonts/']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.add(new Request(SHELL_DOCUMENT, { cache: 'reload' })))
      /* gagal menyiapkan shell bukan alasan membatalkan instalasi push */
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

/** aset statis: sajikan cache dulu, perbarui di belakang (stale-while-revalidate) */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION)
  const cached = await cache.match(request)

  const fromNetwork = fetch(request)
    .then((response) => {
      /* hanya jawaban sah dari origin sendiri yang layak disimpan */
      if (response && response.ok && response.type === 'basic') {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => null)

  if (cached) return cached
  const fresh = await fromNetwork
  return fresh ?? new Response('', { status: 504, statusText: 'Offline' })
}

/** dokumen: network-first, fallback ke cache, terakhir ke shell `/` */
async function networkFirstDocument(request) {
  const cache = await caches.open(CACHE_VERSION)
  try {
    const response = await fetch(request)
    if (response && response.ok) cache.put(request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    const shell = await cache.match(SHELL_DOCUMENT)
    if (shell) return shell
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Offline</title><body style="font-family:sans-serif;padding:2rem">CatetInd sedang offline dan shell-nya belum tersimpan. Buka sekali lagi saat ada internet ya 🌿</body>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  /* hanya GET: POST/PATCH/DELETE adalah mutasi uang — jangan pernah di-cache */
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  /* lintas origin (analytics, dsb) dibiarkan apa adanya */
  if (url.origin !== self.location.origin) return
  /* aturan 1: data & API tidak pernah dari cache */
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstDocument(request))
    return
  }

  const isStatic = STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
  if (isStatic) event.respondWith(staleWhileRevalidate(request))
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
