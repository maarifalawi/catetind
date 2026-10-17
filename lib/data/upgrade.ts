/* ── AJAKAN UPGRADE + AKSES PAKET ────────────────────────────────────────────
   Sejak rilis prepaid ada DUA periode nyata:
     1. `monthly` — prabayar 30 hari; bisa diperpanjang manual, pindah tier,
        termasuk turun tier tanpa refund.
     2. `lifetime` — sekali bayar, akses selamanya.

   File ini mengurus tiga keadaan yang diturunkan dari `priceFor()`:
     · AJAKAN UPGRADE — user sudah punya paket dan ingin tier lebih tinggi;
       nominal selalu dari `priceFor()` (bisa selisih lifetime atau harga penuh
       lifetime kalau asalnya monthly).
     · EXPIRED — prabayar lewat tanggal; banner ramah, CTA perpanjang monthly.
     · KUNCI PENUH — belum punya paket; baca & jelajah tetap jalan, catat ditahan.

   Jangan mengarang nominal atau status: semua dibaca dari `pricing.ts` dan
   `SubscriptionGateProvider`. */

import {
  PLANS,
  buildUpgradeHref,
  capabilityUnlockedBy,
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
  fabAria: 'Catat transaksi belum aktif — pilih paket dulu biar bisa mulai catat',
  /** aria-label tombol Tambah di sidebar saat terkunci */
  addAria: 'Tambah transaksi belum aktif — pilih paket dulu biar bisa mulai catat',
} as const

/* ── COPY TANAMAN "MENUNGGU PAKET" (inventaris state VI · PRD 4542) ──────────
   Tanaman menunggu — bukan mati, bukan layu, dan TIDAK memakai angka HP. PRD
   1989–1994 melarang HP ditampilkan sebagai angka; saat menunggu, kelima
   droplet visualnya disembunyikan supaya tidak terasa seperti hukuman. */

export const PLANT_SLEEP_COPY = {
  badge: 'Belum aktif',
  caption:
    'Tanamanmu nunggu paketmu aktif dulu — dia belum bisa tumbuh sebelum kamu mulai catat 🌙',
  aria: 'Tanaman (menunggu paket aktif)',
  /** pengganti baris "Tap untuk lihat detail" saat menunggu */
  detailHint: 'Pilih paket buat mulai menumbuhkan dia 🌿',
} as const

/* ── COPY BANNER GLOBAL (dipakai subscription-banner.tsx) ─────────────────── */

export interface UpgradeBannerCopy {
  eyebrow: string
  title: string
  body: string
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
    eyebrow: 'Belum ada paket aktif',
    title: 'Pilih paket buat mulai catat',
    body: 'Prabayar 30 hari atau sekali bayar lifetime. Tanpa auto-debet.',
    cta: 'Pilih paket',
  },
  /**
   * Sudah beli tapi belum di tier tertinggi — `{target}` nama paket berikutnya,
   * `{amount}` selisih dari `priceFor()`.
   */
  upgrade: {
    eyebrow: 'Masih ada fitur terkunci',
    title: 'Buka semua fitur {target}',
    body: 'Upgrade ke lifetime {target}: {amount}. Aksesnya selamanya, tanpa auto-debet.',
    cta: 'Upgrade',
  },
  /** Masa aktif prabayar habis: ramah, bukan menuduh, dan menawarkan renew. */
  expired: {
    eyebrow: 'Masa aktif habis',
    title: 'Masa aktif {plan} habis — perpanjang 30 hari',
    body: 'Semua catatanmu tetap aman dan bisa dibaca/diekspor. Tombol tambah data hidup lagi setelah diperpanjang.',
    cta: 'Perpanjang',
  },
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
  return {
    ...UPGRADE_BANNER_COPY.upgrade,
    title: fill(UPGRADE_BANNER_COPY.upgrade.title, { target: target.name }),
    body: fill(UPGRADE_BANNER_COPY.upgrade.body, {
      amount: formatAmount(priceFor(target, { period: 'lifetime', ownedPlanId: plan.id, ownedIsLifetime })),
    }),
  }
}

/**
 * Copy banner saat masa aktif prabayar habis. CTA-nya perpanjangan monthly —
 * bukan upgrade lifetime — karena kebutuhan user saat itu adalah membuka lagi
 * pencatatan, bukan membeli akses yang lebih tinggi.
 */
export function expiredBannerCopy(planName: string): UpgradeBannerCopy {
  return {
    ...UPGRADE_BANNER_COPY.expired,
    title: fill(UPGRADE_BANNER_COPY.expired.title, { plan: planName }),
  }
}
