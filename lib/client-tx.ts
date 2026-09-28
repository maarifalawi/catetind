/* ── KUNCI IDEMPOTENSI KLIEN (paket 42 · audit Stage 5 #1) ───────────────────
   Satu kunci per AKSI tulis, bukan per baris: kalau user menekan "Catat" dua
   kali (double-tap, Enter lalu tap, atau submit ulang setelah jaringan lambat),
   kuncinya sama dan store menolak baris kedua (`lib/money/store.ts`).

   Di produksi nilai yang sama dikirim sebagai header `Idempotency-Key` pada
   `POST /api/transactions`, dan server yang menyimpannya — jadi retry network
   pun tidak menggandakan catatan.

   `crypto.randomUUID()` hanya hidup di secure context (HTTPS / localhost), jadi
   ada jaring aman untuk konteks lain. Jaring itu BUKAN pengganti kualitas UUID;
   ia hanya memastikan demo tetap jalan saat diakses lewat http:// di LAN. */

export function newClientTxId(): string {
  const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID()
  return `tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
