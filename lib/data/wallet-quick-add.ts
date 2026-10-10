import { WALLET_BRAND_OPTIONS, type WalletBrandOption } from '../wallets'

/* ── SARAN "TAMBAH DOMPET CEPAT": TOP 3 + "LAINNYA" (paket 77) ────────────────
   Sebelum paket ini rail "Tambah Dompet Cepat" di /wallet adalah DERET GULIR
   horizontal: tiga brand + slot dashed "Lainnya", dan yang keempat tersembunyi
   di luar tepi layar. Artinya user harus menyapu (swipe) untuk menemukan jalan
   masuk yang paling dasar — "tambah dompet" — dan di desktop gulir itu tidak
   terlihat seperti gulir sama sekali (trackpad-only).

   Aturan barunya sederhana dan sengaja dipisah jadi fungsi MURNI di sini supaya
   bisa diuji tanpa React:
     1. buang brand yang SUDAH dimiliki user (tidak boleh menawarkan dompet yang
        user sudah punya — aturan paket 04 yang tetap berlaku);
     2. urutkan sisa kandidat menurut SINYAL PAKAI (`usage`) menurun, jadi brand
        yang paling sering ia pakai muncul lebih dulu;
     3. seri = urutan kanon `WALLET_BRAND_OPTIONS`, BUKAN acak/trio hardcoded;
     4. ambil `QUICK_ADD_LIMIT` (3) teratas.

   Kalau sinyal pakainya kosong (kasus paling umum: brand itu belum pernah
   dipakai), urutannya jatuh ke urutan kanon — jadi tiga saran pertama tetap
   stabil dari hari ke hari, tidak "berpindah sendiri" tanpa sebab.
   ────────────────────────────────────────────────────────────────────────── */

/** berapa saran yang dirender langsung (bukan gulir) — "Top 3" */
export const QUICK_ADD_LIMIT = 3

/** peta `nama brand (lowercase) → jumlah pemakaian` */
export type WalletBrandUsage = Readonly<Record<string, number>>

/** kunci pencocokan nama: rapikan spasi & abaikan besar-kecil huruf */
function nameKey(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Sinyal pakai dari nama-nama dompet yang muncul di buku besar.
 *
 * Kenapa dari buku besar: `lib/money/store.ts` adalah satu-satunya tempat yang
 * tahu dompet mana yang benar-benar dipakai mencatat uang. Nama yang dihitung
 * termasuk dompet yang SUDAH DIHAPUS user — justru itu sinyal yang paling
 * berguna di sini: "kamu pernah pakai Mandiri" membuat Mandiri naik ke atas
 * saran, walau dompetnya sudah tidak ada di daftar.
 *
 * Murni: menerima daftar nama, mengembalikan peta. Tidak menyentuh store/DOM.
 */
export function brandUsageFromWalletNames(names: readonly string[]): WalletBrandUsage {
  const out: Record<string, number> = {}
  for (const name of names) {
    const key = nameKey(name)
    if (!key) continue
    out[key] = (out[key] ?? 0) + 1
  }
  return out
}

/**
 * Top-N brand yang boleh disarankan sebagai dompet baru.
 *
 * @param ownedNames nama SEMUA dompet yang dimiliki user (termasuk dompet di
 *   konteks uang lain — menawarkan dompet yang sudah dimiliki tetap keliru)
 * @param usage peta dari `brandUsageFromWalletNames`; kosong = pakai urutan kanon
 * @param limit jumlah saran (default 3)
 */
export function quickAddBrands({
  brands = WALLET_BRAND_OPTIONS,
  ownedNames,
  usage,
  limit = QUICK_ADD_LIMIT,
}: {
  brands?: readonly WalletBrandOption[]
  ownedNames: readonly string[]
  usage?: WalletBrandUsage
  limit?: number
}): WalletBrandOption[] {
  const owned = new Set(ownedNames.map(nameKey))
  const ranked = brands
    .map((brand, index) => ({ brand, index, used: usage?.[nameKey(brand.name)] ?? 0 }))
    /* dompet yang sudah dimiliki user tidak pernah ditawarkan (aturan paket 04) */
    .filter((entry) => !owned.has(nameKey(entry.brand.name)))
    /* pakai terbanyak dulu; seri diputuskan urutan kanon (stabil, bukan acak) */
    .sort((a, b) => b.used - a.used || a.index - b.index)
  return ranked.slice(0, Math.max(0, Math.floor(limit))).map((entry) => entry.brand)
}

/* ── COPY RAIL (user-facing — tidak boleh ditulis di JSX) ─────────────────── */

export const WALLET_QUICK_ADD_COPY = {
  title: 'Tambah Dompet Cepat',
  /** badge kecil di kepala rail yang menyebut mengapa ini cepat */
  badge: '1 ketukan',
  /** semua brand populer sudah dipakai → jalan keluar tetap ditunjuk */
  allOwned:
    'Semua brand populer sudah kamu pakai — tambah dompet lain lewat “Lainnya” di bawah.',
  /** tombol LEBAR PENUH di bawah tiga saran */
  other: 'Lainnya',
  /** aria-label tombol Lainnya — menyebut aksinya, bukan cuma "Lainnya" */
  otherA11y: 'Tambah dompet lain — buka form Tambah Dompet',
  /** aria-label tiap saran brand: menyebut brandnya supaya jelas apa yang terjadi */
  brandA11y: (name: string) => `Tambah dompet ${name} — form dibuka dengan brand ini terisi`,
} as const
