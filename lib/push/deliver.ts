/* ── PENGIRIMAN PARALEL BERKELOMPOK (TIMEOUT-PROOF) ──────────────────────────
   Kenapa tidak `for … await` satu per satu: fungsi serverless Vercel dipotong
   setelah 10–15 detik (60 detik untuk paket berbayar). Mengirim 200 notifikasi
   berurutan (~200–400 ms per kiriman ke layanan push browser) menghabiskan
   40–80 detik, jadi sebagian besar user TIDAK PERNAH menerima pengingatnya —
   dan cron terlihat "sukses" karena tidak ada yang melempar galat.

   Kenapa tidak `Promise.all` untuk semua sekaligus: ratusan handshake TLS
   bersamaan membuat fungsi kehabisan socket/memori dan sebagian kiriman
   gagal karena alasan yang sama sekali tidak berhubungan dengan perangkat
   user. Kelompok kecil (bawaan 10) adalah titik seimbang: cukup cepat, tetap
   aman.

   Modul ini juga pemilik dua aturan yang tidak boleh tersebar:
     1. `safeInternalUrl()` — `url` notifikasi hanya boleh path internal;
     2. pembersihan langganan mati: status 404/410 (izin dicabut / browser
        dihapus) → perangkat dicabut dari database, bukan dicoba lagi selamanya.

   Semua efek samping (kirim & hapus) DISUNTIKKAN lewat `deps`, jadi perilaku
   di atas bisa diuji tanpa `web-push` maupun database
   (`lib/push/deliver.test.ts`).
   ────────────────────────────────────────────────────────────────────────── */

/** satu kiriman: satu pesan ke satu perangkat */
export interface OutboundPush {
  userId: string
  /** endpoint push browser — kunci `push_subscriptions` */
  endpoint: string
  /** `bills` | `daily` | `weekly` — ikut ke payload untuk analitik/UX */
  kind: string
  title: string
  body: string
  url: string
  tag: string
}

export type SendOutcome =
  | { ok: true }
  /** `statusCode` dari layanan push; `null` = gagal jaringan / tanpa status */
  | { ok: false; statusCode?: number | null }

export interface DeliveryDeps<T extends OutboundPush = OutboundPush> {
  send: (push: T, payload: string) => Promise<SendOutcome>
  /** dipanggil untuk endpoint yang dinyatakan mati (404/410) */
  drop: (push: T) => Promise<void>
  /** ukuran kelompok paralel; dibatasi `MAX_BATCH_SIZE` */
  batchSize?: number
}

export interface DeliveryReport {
  attempted: number
  sent: number
  failed: number
  dropped: number
  /** endpoint yang harus dihapus dari `push_subscriptions` */
  removedEndpoints: string[]
  /** user yang minimal satu perangkatnya menerima pesan (untuk stempel harian) */
  sentUserIds: string[]
  /** kegagalan selain 404/410 — dilaporkan, bukan ditelan */
  failures: { endpoint: string; statusCode: number | null }[]
}

/** kelompok bawaan: 10 kiriman paralel per gelombang */
export const DEFAULT_BATCH_SIZE = 10
/** batas atas supaya satu gelombang tidak menghabiskan socket fungsi serverless */
export const MAX_BATCH_SIZE = 25

const MAX_TITLE_LENGTH = 80
const MAX_BODY_LENGTH = 240

function truncate(value: string, max: number): string {
  const text = typeof value === 'string' ? value.trim() : ''
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

/**
 * Hanya path internal yang boleh menjadi tujuan notifikasi.
 *
 * `//evil.example` juga bukan path internal (browser membacanya sebagai
 * protokol-relative URL), jadi diperiksa eksplisit — aturan yang sama dipakai
 * `/api/push/send` dan `public/sw.js`.
 */
export function safeInternalUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '/'
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
}

/** payload yang dibaca `public/sw.js` — satu bentuk untuk semua jenis pesan */
export function pushPayload(push: OutboundPush): string {
  return JSON.stringify({
    title: truncate(push.title, MAX_TITLE_LENGTH),
    body: truncate(push.body, MAX_BODY_LENGTH),
    url: safeInternalUrl(push.url),
    tag: push.tag,
    kind: push.kind,
  })
}

/** potong array menjadi kelompok berukuran `size` */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const safeSize = Math.max(1, Math.min(MAX_BATCH_SIZE, Math.round(size) || DEFAULT_BATCH_SIZE))
  const batches: T[][] = []
  for (let index = 0; index < items.length; index += safeSize) {
    batches.push(items.slice(index, index + safeSize))
  }
  return batches
}

/**
 * Kirim semua pesan dalam kelompok paralel dan TUNGGU seluruhnya selesai.
 *
 * Kegagalan satu perangkat tidak menghentikan kelompoknya (kalau `Promise.all`
 * dibiarkan menolak, sisa kelompok tidak jadi dikirim dan laporannya bohong).
 * 404/410 → `drop()` dipanggil supaya baris `push_subscriptions` hilang.
 */
export async function deliverPushes<T extends OutboundPush>(
  pushes: readonly T[],
  deps: DeliveryDeps<T>,
): Promise<DeliveryReport> {
  const report: DeliveryReport = {
    attempted: 0,
    sent: 0,
    failed: 0,
    dropped: 0,
    removedEndpoints: [],
    sentUserIds: [],
    failures: [],
  }
  const sentUsers = new Set<string>()
  const size = deps.batchSize ?? DEFAULT_BATCH_SIZE

  for (const batch of chunk(pushes, size)) {
    await Promise.all(
      batch.map(async (push) => {
        report.attempted++
        const payload = pushPayload(push)

        let outcome: SendOutcome
        try {
          outcome = await deps.send(push, payload)
        } catch {
          outcome = { ok: false, statusCode: null }
        }

        if (outcome.ok) {
          report.sent++
          sentUsers.add(push.userId)
          return
        }

        const statusCode = outcome.statusCode ?? null
        if (statusCode === 404 || statusCode === 410) {
          /* izin dicabut / browser dihapus → jangan disimpan selamanya */
          report.dropped++
          report.removedEndpoints.push(push.endpoint)
          try {
            await deps.drop(push)
          } catch {
            /* penghapusan gagal bukan alasan menggagalkan kiriman lain */
          }
          return
        }

        report.failed++
        report.failures.push({ endpoint: push.endpoint, statusCode })
      }),
    )
  }

  report.sentUserIds = [...sentUsers]
  return report
}
