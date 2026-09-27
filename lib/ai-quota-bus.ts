// ---------------------------------------------------------------------------
// Bus + penyimpanan SESI untuk token add-on AI yang dibeli dari modal Top Up.
//
// Kenapa perlu: tombol "Beli Add-On →" di banner Home, modal Top Up (dipakai di
// Home & /settings/billing), dan kartu Fuel Gauge di Billing adalah tiga tempat
// berbeda yang menampilkan angka add-on yang SAMA. Tanpa backend, tidak ada
// server yang bisa memberi tahu ketiganya, jadi: (1) jumlah pembelian disimpan
// di memory modul ini, dan (2) setiap pemakai yang sedang ter-mount diberi tahu
// lewat CustomEvent — pola yang sama dengan `lib/transaction-bus.ts`.
//
// Batas jujurnya: pembelian hilang saat halaman di-refresh (prd: tidak ada
// Midtrans di demo ini). Di produksi, `purchaseAiAddon` jadi
// `POST /api/payment/topup` → Midtrans Snap, dan angka add-on datang dari
// webhook (`addon_tokens_remaining` di tabel langganan) — bukan dari bus ini.
// ---------------------------------------------------------------------------

/** nama event — dipakai `hooks/use-ai-addon.ts` lewat `subscribeAiAddonPurchases` */
export const AI_ADDON_PURCHASED_EVENT = 'catetind:ai-addon-purchased'

/** total token add-on yang dibeli di sesi demo ini (0 = belum pernah beli) */
let purchasedTokens = 0

/**
 * "Pembayaran" berhasil (mock) → token add-on bertambah untuk seluruh aplikasi.
 * Mengembalikan total pembelian sesi ini supaya pemanggil bisa langsung
 * menampilkannya tanpa menghitung ulang.
 */
export function purchaseAiAddon(tokens: number): number {
  purchasedTokens += Math.max(0, Math.round(tokens))

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(AI_ADDON_PURCHASED_EVENT, { detail: purchasedTokens }),
    )
  }

  return purchasedTokens
}

/**
 * Total pembelian sesi ini. Dipanggil SETELAH mount oleh pemakai hook
 * (`hooks/use-ai-addon.ts`) — pola repo untuk state yang hanya hidup di client,
 * supaya HTML server dan render pertama client identik.
 */
export function readPurchasedAddonTokens(): number {
  return purchasedTokens
}

/** dengarkan pembelian berikutnya; kembalikan fungsi pembatalan langganan */
export function subscribeAiAddonPurchases(listener: (total: number) => void): () => void {
  function handle(event: Event) {
    const detail = (event as CustomEvent<number>).detail
    if (typeof detail === 'number') listener(detail)
  }

  window.addEventListener(AI_ADDON_PURCHASED_EVENT, handle)
  return () => window.removeEventListener(AI_ADDON_PURCHASED_EVENT, handle)
}
