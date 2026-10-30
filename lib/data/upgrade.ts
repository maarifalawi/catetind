/* ── AJAKAN UPGRADE + AKSES PAKET ────────────────────────────────────────────
   Satu periode yang dijual: `lifetime` — sekali bayar, akses selamanya. Nilai
   `monthly` hanya tersisa pada pembelian LAMA (warisan), bukan produk aktif.

   File ini mengurus tiga keadaan yang diturunkan dari `priceFor()`:
     · AJAKAN UPGRADE — user sudah punya paket dan ingin tier lebih tinggi;
       nominal selalu dari `priceFor()` (selisih lifetime, atau harga penuh
       lifetime bila asalnya paket 30 hari lama).
     · EXPIRED — paket 30 hari lama lewat tanggal; banner ramah, CTA lanjut
       ke lifetime (bukan perpanjang bulanan yang sudah tidak dijual).
     · KUNCI PENUH — belum punya paket; baca & jelajah tetap jalan, catat ditahan.

   Jangan mengarang nominal atau status: semua dibaca dari `pricing.ts` dan
   `SubscriptionGateProvider`. */

import {
  CAPABILITY_LABEL,
  PLANS,
  buildUpgradeHref,
  capabilityUnlockedBy,
  capabilitiesOf,
  priceFor,
  type Capability,
  type PlanDefinition,
  type PlanId,
} from './pricing'

/* ── NAIK TIER ─────────────────────────────────────────────────────────────── */

/** paket tepat satu tingkat di atas paket yang dimiliki; `null` = sudah di puncak */
export function nextTier(ownedPlanId: PlanId | null | undefined): PlanDefinition | null {
  const owned = PLANS.find((plan) => plan.id === ownedPlanId) ?? null
  const currentRank = owned?.rank ?? 0
  return PLANS.find((plan) => plan.rank > currentRank) ?? null
}

/** semua paket yang LEBIH TINGGI dari paket yang dimiliki (naik urut dari termurah) */
export function upgradeTargets(ownedPlanId: PlanId | null | undefined): PlanDefinition[] {
  const owned = PLANS.find((plan) => plan.id === ownedPlanId) ?? null
  const currentRank = owned?.rank ?? 0
  return PLANS.filter((plan) => plan.rank > currentRank)
}

/** selisih lifetime untuk naik ke `target` — dari `priceFor()`, bukan angka tulis tangan */
export function upgradeAmount(
  target: PlanDefinition,
  ownedPlanId: PlanId | null | undefined,
  ownedIsLifetime = false,
): number {
  return priceFor(target, { period: 'lifetime', ownedPlanId, ownedIsLifetime })
}

/** rincian ajakan upgrade untuk satu kemampuan yang belum terbuka */
export interface CapabilityUpgradeOffer {
  /** paket TERENDAH yang membuka kemampuan ini */
  target: PlanDefinition
  /** selisih yang harus dibayar dari paket user sekarang (dari `priceFor()`) */
  amount: number
  /** tautan ke halaman bayar untuk paket itu */
  href: string
}

/**
 * Satu tempat yang menerjemahkan "kemampuan terkunci" menjadi ajakan upgrade:
 * paket pembukanya, selisihnya, dan tautannya. Dipakai semua UI terkunci (AI
 * Coach, scan struk, rekap AI, Joint Wallet) supaya nominal di CTA-nya mustahil
 * berbeda antara satu layar dan layar lain — dan mustahil berbeda dari yang
 * ditagih server, karena keduanya memanggil `priceFor()`.
 */
export function capabilityUpgradeOffer(
  capability: Capability,
  ownedPlanId: PlanId | null | undefined,
  ownedIsLifetime = false,
): CapabilityUpgradeOffer {
  const target = capabilityUnlockedBy(capability)
  return {
    target,
    amount: priceFor(target, { period: 'lifetime', ownedPlanId, ownedIsLifetime }),
    href: buildUpgradeHref(target.id, ownedPlanId, 'lifetime'),
  }
}

/* ── HIGHLIGHT FITUR YANG BARU TERBUKA ──────────────────────────────────────
   Satu turunan untuk banner, kartu sidebar, dan modal upgrade: daftar
   kemampuan yang DIMILIKI paket target tapi BELUM dimiliki paket sekarang.
   Labelnya dari `CAPABILITY_LABEL` — bukan copy kedua yang bisa melenceng dari
   matriks `PLAN_CAPABILITIES`. */
export function upgradeHighlights(
  ownedPlanId: PlanId | null | undefined,
  target: PlanDefinition,
  limit = 4,
): string[] {
  const owned = new Set(capabilitiesOf(ownedPlanId))
  const labels = capabilitiesOf(target.id)
    .filter((capability) => !owned.has(capability))
    .map((capability) => CAPABILITY_LABEL[capability])
  if (limit <= 0 || labels.length <= limit) return labels
  return [...labels.slice(0, limit), `+${labels.length - limit} lainnya`]
}

/* ── COPY AKSES BELUM AKTIF (dipakai gerbang input global) ───────────────────
   Dipakai semua titik yang MENAMBAH data: FAB bottom nav, tombol Tambah
   sidebar, engine input transaksi, dan `SheetSubmit` di sheet tambah. Nadanya
   mengajak, bukan menyalahkan, dan tidak pernah menyebut data akan hilang. */

export const FEATURE_LOCK_COPY = {
  /** copy utama saat user menyentuh titik masuk input yang belum aktif */
  inputHint: 'Pilih paket dulu biar bisa mulai catat 🌿',
  /** keterangan tombol simpan di dalam sheet/modal yang sudah terbuka */
  saveHint: 'Pencatatan aktif setelah paketmu dipilih 🌿',
  /** aria-label FAB di bottom nav saat terkunci */
  fabAria: 'Catat transaksi belum aktif, pilih paket dulu biar bisa mulai catat',
  /** aria-label tombol Tambah di sidebar saat terkunci */
  addAria: 'Tambah transaksi belum aktif, pilih paket dulu biar bisa mulai catat',
} as const

/* ── COPY TANAMAN "MENUNGGU PAKET" (inventaris state VI · PRD 4542) ──────────
   Tanaman menunggu — bukan mati, bukan layu, dan TIDAK memakai angka HP. PRD
   1989–1994 melarang HP ditampilkan sebagai angka; saat menunggu, kelima
   droplet visualnya disembunyikan supaya tidak terasa seperti hukuman. */

export const PLANT_SLEEP_COPY = {
  badge: 'Belum aktif',
  caption:
    'Tanamanmu nunggu paketmu aktif dulu, dia belum bisa tumbuh sebelum kamu mulai catat 🌙',
  aria: 'Tanaman (menunggu paket aktif)',
  /** pengganti baris "Tap untuk lihat detail" saat menunggu */
  detailHint: 'Pilih paket buat mulai menumbuhkan dia 🌿',
} as const

/* ── COPY BANNER GLOBAL (dipakai subscription-banner.tsx) ─────────────────── */

export interface UpgradeBannerCopy {
  title: string
  /** baris kedua (muted) di bawah judul. Kosong = banner cukup judul + tombol. */
  body?: string
  /** label tombol — SATU kata, satu aksi */
  cta: string
}

/** isi `{placeholder}` di satu template copy */
function fill(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, value),
    template,
  )
}

export const UPGRADE_BANNER_COPY = {
  /**
   * Belum pernah beli. Banner ini muncul di dalam app saja (halaman publik
   * sudah menyembunyikannya), dan CTA-nya membawa user ke halaman paket —
   * bukan memaksa apa pun: membaca & menjelajah tetap jalan.
   */
  noPurchase: {
    title: 'Pilih paket buat mulai catat',
    body: 'Sekali bayar untuk akses selamanya. Tanpa tagihan bulanan.',
    cta: 'Pilih paket',
  },
  /**
   * Sudah beli tapi belum di tier tertinggi. `{target}` nama paket berikutnya,
   * `{highlight}` satu kemampuan yang baru terbuka, `{price}` kalimat nominal
   * dari `UPGRADE_BANNER_PRICE_COPY`. Semua placeholder DIISI oleh
   * `upgradeBannerCopy()`; tidak ada yang boleh bocor ke layar sebagai `{...}`.
   *
   * Tidak ada eyebrow di sini (dan di varian lain): judul sudah berdiri sendiri
   * sebagai blok pertama, keterangan duduk di baris berikutnya.
   */
  upgrade: {
    title: 'Buka Semua Fitur {target}',
    body: '{highlight} · {price}',
    cta: 'Upgrade',
  },
  /**
   * Paket 30 hari LAMA sudah berakhir: ramah, bukan menuduh, dan menawarkan
   * jalan ke akses selamanya — perpanjangan bulanan sudah tidak dijual.
   */
  expired: {
    title: 'Paket {plan} sudah berakhir, lanjut ke Lifetime',
    body: 'Semua catatanmu tetap aman dan bisa dibaca/diekspor. Sekali bayar lifetime membuka lagi tombol tambah data, selamanya.',
    cta: 'Lanjut ke Lifetime',
  },
} as const

/**
 * Kalimat nominal untuk baris kedua banner. Dua bentuk karena ARTI nominalnya
 * beda, dan menulis "cukup tambah" untuk harga penuh adalah janji palsu:
 *   · `delta` → paket yang dimiliki sudah lifetime, jadi yang dibayar SELISIH;
 *   · `full`  → pembelian lama 30 hari / belum punya paket, jadi yang dibayar
 *     harga lifetime penuh.
 * Nominalnya sendiri selalu dari `priceFor()`, tidak pernah ditulis di sini.
 */
export const UPGRADE_BANNER_PRICE_COPY = {
  delta: 'Cukup tambah {amount} untuk akses selamanya.',
  full: 'Harga akses selamanya {amount}.',
} as const

/**
 * copy banner siap-render untuk paket yang dimiliki.
 *
 * `null` = tidak ada yang perlu ditampilkan (user sudah di tier tertinggi),
 * jadi komponen cukup tidak merender apa pun.
 */
export function upgradeBannerCopy(
  ownedPlanId: PlanId | null | undefined,
  formatAmount: (value: number) => string,
  ownedIsLifetime = false,
): UpgradeBannerCopy | null {
  const plan = PLANS.find((item) => item.id === ownedPlanId) ?? null
  if (!plan) return UPGRADE_BANNER_COPY.noPurchase
  const target = nextTier(plan.id)
  if (!target) return null

  /* Nominal SELALU dari `priceFor()` — angka yang sama dengan yang ditagih
     server, bukan selisih tulis tangan. */
  const amount = priceFor(target, { period: 'lifetime', ownedPlanId: plan.id, ownedIsLifetime })
  /* satu kemampuan yang baru terbuka; `null` = tidak ada yang bisa disebut */
  const highlight = upgradeHighlights(plan.id, target, 1)[0] ?? null
  /* nominal 0 tidak pernah ditulis "cukup tambah Rp 0" — baris nominalnya
     dibuang, bukan dipaksa tampil. */
  const price =
    amount > 0
      ? fill(ownedIsLifetime ? UPGRADE_BANNER_PRICE_COPY.delta : UPGRADE_BANNER_PRICE_COPY.full, {
          amount: formatAmount(amount),
        })
      : null

  return {
    title: fill(UPGRADE_BANNER_COPY.upgrade.title, { target: target.name }),
    /* dua bagian: kalau salah satunya tidak bisa dinyatakan jujur, yang tersisa
       tetap ditulis; kalau dua-duanya kosong, banner cukup judul + tombol. */
    body:
      highlight && price
        ? fill(UPGRADE_BANNER_COPY.upgrade.body, { highlight, price })
        : (highlight ?? price ?? undefined),
    cta: UPGRADE_BANNER_COPY.upgrade.cta,
  }
}

/**
 * Copy banner saat paket 30 hari LAMA habis. CTA-nya akses selamanya karena
 * perpanjangan bulanan sudah tidak dijual; kebutuhan user saat itu adalah
 * membuka lagi pencatatan, dan lifetime adalah satu-satunya jalan.
 *
 * `PLANS[].name` sudah berbunyi "Paket Waras" sementara template di bawah sudah
 * menulis "Paket", jadi awalan itu dibuang: judulnya tidak boleh berbunyi
 * "Paket Paket Waras". Nama kosong jatuh ke "kamu", bukan kata "undefined".
 */
export function expiredBannerCopy(planName: string): UpgradeBannerCopy {
  const name = planName.replace(/^paket\s+/i, '').trim() || 'kamu'
  return {
    ...UPGRADE_BANNER_COPY.expired,
    title: fill(UPGRADE_BANNER_COPY.expired.title, { plan: name }),
  }
}
