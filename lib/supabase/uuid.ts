/* ── UUID UNTUK BARIS BARU (paket 64 · Paket D) ──────────────────────────────
   Primary key tabel domain (investments/debts/bills/goals/joint_transactions)
   bertipe `uuid`, sementara id domain store ini dulu buatan lokal
   (`inv-6`, `'7'`, angka `1`). Untuk mengirim baris baru ke server tanpa
   "kehilangan" identitasnya, id baris baru dibuat uuid SEPAKAT dari klien:
   `randomUuid()` dipakai untuk baris yang lahir di produksi, lalu
   disimpan kembali ke `remoteId` baris itu (lihat `*-remote.ts` & store).

   Fallback `Math.random` sengaja ada: `crypto.randomUUID` tidak tersedia di
   semua konteks (HTTP lama / WebView), dan baris uang tidak boleh gagal dibuat
   hanya karena API itu absen. */

export function randomUuid(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()

  const bytes = new Uint8Array(16)
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(bytes)
  else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** true = string berbentuk uuid v4 (id yang sah untuk kolom `uuid` Postgres) */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}
