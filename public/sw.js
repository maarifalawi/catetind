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

/* v4 (paket cron pengingat): selain kenaikan versi bundel, handler push/klik
   di bawah kini MENGARAHKAN notifikasi ke halaman yang tepat (`/bills`, `/app`,
   `/history`) dan mengidentifikasi pesan dengan `tag` — perubahan SW ini tidak
   menyentuh aset, tetapi versi cache tetap dinaikkan supaya PWA ter-install
   segera memakai SW baru (browser memeriksa isi file SW setiap kali app dibuka). */
const CACHE_VERSION = 'catetind-shell-v4'
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

/* ── NOTIFIKASI: TAMPILAN & TAP ───────────────────────────────────────────────

   Payload yang dikirim server (`lib/push/deliver.ts` → `pushPayload`):

     { title, body, url, tag, kind }        kind = 'bills' | 'daily' | 'weekly'

   `url` WAJIB path internal. Kalau pengirim (atau pihak lain) mengirim URL
   absolut/`//domain-lain`, SW mengabaikannya dan memakai `/` — notifikasi tidak
   boleh dipakai mengalihkan user ke situs lain, sekalipun push-nya sah. */

const DEFAULT_NOTIFICATION_URL = '/'

/** hanya path internal yang diterima (aturan yang sama dengan `/api/push/send`) */
function safeInternalUrl(raw) {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) {
    return DEFAULT_NOTIFICATION_URL
  }
  return raw
}

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
      /* ikon aplikasi resmi — notifikasi adalah permukaan brand */
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      /* `tag` membuat pesan sejenis SALING MEMPERBARUI (tidak menumpuk liar);
         `renotify` memastikan pembaruan itu tetap memicu getar/alert */
      tag,
      renotify: true,
      data: { url, kind: typeof data.kind === 'string' ? data.kind : 'info' },
    }),
  )
})

/* Tap notifikasi:
     1. jendela app yang SUDAH menampilkan tujuan → fokuskan saja;
     2. jendela app lain → fokuskan lalu arahkan ke tujuan;
     3. belum ada jendela app → buka jendela baru menuju tujuan.
   `clients.openWindow` dipakai (bukan `window.open`) karena hanya ini yang
   boleh dipanggil dari service worker. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = safeInternalUrl(event.notification.data && event.notification.data.url)
  const target = new URL(targetUrl, self.location.origin)

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      /* 1. sudah ada tab di halaman yang sama → cukup fokus */
      for (const client of clientList) {
        try {
          if (new URL(client.url).pathname === target.pathname && 'focus' in client) {
            return client.focus()
          }
        } catch {
          /* URL klien yang tidak bisa dibaca dilewati, bukan menggagalkan tap */
        }
      }

      /* 2. tab app lain → fokus lalu arahkan */
      for (const client of clientList) {
        if (!('focus' in client)) continue
        return Promise.resolve(client.focus()).then(() =>
          'navigate' in client ? client.navigate(target.href) : client,
        )
      }

      /* 3. belum ada jendela app → buka baru */
      return self.clients.openWindow(target.href)
    }),
  )
})

