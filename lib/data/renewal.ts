/* ── PENGINGAT PERPANJANGAN (inventaris #m · PRD 4503–4607) ────────────────────
   Masa aktif habis adalah titik churn paling berbahaya — sekaligus kesempatan
   membuktikan karakter produk. Dua hal yang tidak boleh dilanggar:

     1. TIDAK ada penagihan otomatis. Perpanjangan selalu butuh tap sadar user
        (PRD 4507–4509) — trust badge adalah selling point, bukan disclaimer.
     2. Data TIDAK PERNAH dihapus, bahkan setelah masa tenggang (PRD 4544–4547).

   File ini memegang dua hal saja:
     • bentuk state langganan (mock) — SEMUA harganya dibaca dari
       `lib/data/pricing.ts`, jadi tidak pernah lahir "daftar harga kedua"
       (larangan tegas PRD 4594–4606), dan
     • logika murni "kapan pengingat boleh muncul" + seluruh copy-nya.

   Task 14 hanya membangun PENGINGATNYA (banner H-7/H-3 + modal H-1). Gerbang
   GLOBAL-nya — Grace Period & Post-Grace read-only (PRD 4534–4547) — ditambahkan
   di bagian bawah file ini oleh task 23: fase langganan murni (`resolvePhase`),
   copy banner verbatim PRD, dan ketentuan "input dikunci, baca tetap jalan".
   Semuanya tetap di sini supaya hanya ADA SATU sumber kebenaran soal status
   langganan — modal pengingat, banner global, dan kunci input tidak mungkin
   beda cerita.
   ─────────────────────────────────────────────────────────────────────────── */

import {
  HERO_PLAN,
  NO_AUTO_RENEW_BADGE,
  PRICING_TRUST_BADGES,
  annualSavingsPct,
  formatIDR,
  monthlyPrice,
  type BillingPeriod,
  type PlanDefinition,
} from './pricing'

/** periode yang bisa dipilih saat memperpanjang (seumur hidup = tanpa perpanjangan) */
export type RenewalPeriod = Extract<BillingPeriod, 'monthly' | 'annual'>

/** panjang masa aktif tiap periode — angka kanon PRD 4602–4603 (30/365 hari) */
export const RENEWAL_DURATION_DAYS: Record<RenewalPeriod, number> = {
  monthly: 30,
  annual: 365,
}

/* ── STATE LANGGANAN (mock) ───────────────────────────────────────────────── */

export interface RenewalState {
  /** hari menuju expired: 7 & 3 = banner + push, 1 = modal penuh (PRD 4514–4532) */
  daysLeft: number
  /** nama paket yang diperpanjang */
  planName: string
  /**
   * Label tanggal berakhir (mis. "21 Oktober 2026"). Dipakai sebagai KUNCI
   * "modal sudah pernah muncul" — penandanya ikut SIKLUS, bukan global.
   */
  expiryLabel: string
  /** token Midtrans tersimpan (masked, PRD 4560). Ada = jalur One-Tap Renew */
  savedTokenMasked?: string
  /** harga periode bulanan — DITURUNKAN dari paket, bukan angka tulis-tangan */
  monthlyPrice: number
  /** harga periode tahunan (365 hari) — idem */
  yearlyPrice: number
}

/**
 * Paket aktif yang diperpanjang. Demo memakai paket hero; di produksi nilai ini
 * datang dari langganan user (nanti: `GET /api/subscription`).
 */
export const RENEWAL_PLAN: PlanDefinition = HERO_PLAN

/**
 * Token Midtrans tersimpan (mock, PRD 4550–4560). Set `undefined` untuk meninjau
 * jalur fallback "full checkout" (PRD 4566–4567) tanpa menyentuh komponen —
 * jalur itu memang harus ada, tapi tidak perlu dipamerkan dua-duanya sekaligus.
 */
export const SAVED_TOKEN_MASKED: string | undefined = '•••• 4821'

/**
 * Tanggal berakhir (mock). Sengaja sama dengan `CURRENT_PLAN.activeUntil` di
 * billing-panel.tsx supaya halaman tagihan & pengingat tidak beda cerita.
 */
export const RENEWAL_EXPIRY_LABEL = '21 Oktober 2026'

/** bangun state dari (hari tersisa + token tersimpan); harga selalu diturunkan */
export function createRenewalState({
  daysLeft,
  savedTokenMasked,
  plan = RENEWAL_PLAN,
  expiryLabel = RENEWAL_EXPIRY_LABEL,
}: {
  daysLeft: number
  savedTokenMasked?: string
  plan?: PlanDefinition
  expiryLabel?: string
}): RenewalState {
  return {
    daysLeft,
    planName: plan.name,
    expiryLabel,
    savedTokenMasked,
    monthlyPrice: monthlyPrice(plan),
    yearlyPrice: plan.annual,
  }
}

/**
 * Kondisi yang dilihat user di demo: masa aktif habis BESOK + sudah ada metode
 * tersimpan, jadi jalur One-Tap maupun pintu masuk dari banner bisa ditinjau
 * langsung. Set `daysLeft` ke 3 atau 7 untuk meninjau kondisi banner saja —
 * modal memang hanya muncul di H-1 (PRD 4525–4532).
 */
export const RENEWAL_STATE: RenewalState = createRenewalState({
  daysLeft: 1,
  savedTokenMasked: SAVED_TOKEN_MASKED,
})

/* ── KAPAN PENGINGAT MUNCUL ───────────────────────────────────────────────── */

/**
 * Modal penuh HANYA di H-1 (PRD 4525–4532) **dan** hanya kalau siklus ini belum
 * pernah ditutup user: "dismissable, muncul 1x saja" itu janji, bukan saran.
 *
 * @param dismissedFor label siklus yang sudah ditutup (`null` = belum pernah)
 */
export function shouldShowRenewalModal(
  state: RenewalState,
  dismissedFor: string | null,
): boolean {
  if (state.daysLeft !== 1) return false
  return dismissedFor !== state.expiryLabel
}

/**
 * Banner di Home aktif di H-1..H-7 (PRD 4514–4523). Di H-1 banner TETAP tampil
 * walau modalnya sudah ditutup: ia pintu masuk manual supaya user tidak
 * kehilangan satu-satunya jalan perpanjang dari dalam app.
 */
export function shouldShowRenewalBanner(state: RenewalState): boolean {
  return state.daysLeft >= 1 && state.daysLeft <= 7
}

/**
 * Kunci penanda per SIKLUS — "muncul 1x" harus berarti 1x untuk masa aktif INI.
 * Begitu diperpanjang, label berakhirnya berubah → kuncinya berubah → pengingat
 * siklus berikutnya tetap jalan tanpa perlu menghapus apa pun.
 */
export function renewalStorageKey(expiryLabel: string): string {
  return `catet-ind-renewal:${expiryLabel}`
}

/** isi penanda: modal sudah pernah muncul & masa aktif sudah diperpanjang */
export interface RenewalMarker {
  shown: boolean
  renewed: boolean
}

/**
 * Baca penanda satu siklus. Aman untuk SSR (mengembalikan "belum pernah"), jadi
 * komponen boleh memanggilnya tanpa menduplikasi cek `typeof window`.
 */
export function readRenewalMarker(expiryLabel: string): RenewalMarker {
  if (typeof window === 'undefined') return { shown: false, renewed: false }
  try {
    const raw = window.localStorage.getItem(renewalStorageKey(expiryLabel))
    if (!raw) return { shown: false, renewed: false }
    const parsed = JSON.parse(raw) as Partial<RenewalMarker>
    return { shown: parsed.shown === true, renewed: parsed.renewed === true }
  } catch {
    /* localStorage diblokir (mode privat) atau isinya rusak — anggap belum pernah */
    return { shown: false, renewed: false }
  }
}

/**
 * Tulis penanda satu siklus (dipanggil dari hook/handler klik, BUKAN saat render
 * → tidak ada risiko hydration mismatch). Nilai lama di-merge, jadi menutup modal
 * setelah berhasil perpanjang tidak menghapus status "sudah diperpanjang".
 */
export function writeRenewalMarker(
  expiryLabel: string,
  patch: Partial<RenewalMarker>,
): RenewalMarker {
  const next: RenewalMarker = { ...readRenewalMarker(expiryLabel), ...patch }
  try {
    window.localStorage.setItem(renewalStorageKey(expiryLabel), JSON.stringify(next))
  } catch {
    /* storage diblokir — pengingat tetap tampil, cuma tidak "ingat" antar reload */
  }
  return next
}

/* ── COPY (PRD 4514–4532 · 4560–4592 · inventaris #m) ────────────────────────
   Nol string user-facing di JSX. Nada yang DILARANG: hitungan mundur, warna
   merah, dan kalimat "jangan sampai datamu hilang". Yang dipakai adalah suara
   pengingat dari teman — jelas, hangat, dan selalu menyisakan tombol "Nanti aja". */

export const RENEWAL_COPY = {
  /* — modal (H-1) — */
  eyebrow: 'Perpanjangan langganan',
  title: 'Besok masa aktifmu habis.',
  body: 'Perpanjang sekarang agar catatan keuanganmu tetap aman.',
  planLabel: 'Paket aktif',
  planExpiry: 'Aktif sampai {expiry}',
  daysChip: 'Sisa {days} hari',
  /** chip sisa hari saat masa aktif SUDAH habis (dibuka dari banner gerbang) */
  daysChipExpired: 'Masa aktif berakhir',
  /* — modal saat masa aktif SUDAH habis (dibuka dari banner gerbang global).
     Tetap tanpa nada menakut-nakuti: yang ditegaskan justru data masih terbaca. */
  titleExpired: 'Masa aktifmu sudah habis.',
  bodyExpired:
    'Perpanjang untuk mulai catat lagi. Saldo & histori tetap bisa kamu baca, dan datamu aman, gak hilang 💚',
  /** label tombol: dipakai apa adanya sesuai inventaris #m & PRD 4560 */
  monthlyCta: 'Perpanjang {price}/bulan',
  yearlyCta: 'Perpanjang {price}/tahun — Hemat {pct}%',
  oneTapCta: 'Perpanjang dengan {token}',
  oneTapHint: 'Satu tap aja — kamu nggak perlu pilih metode atau ketik apa pun.',
  checkoutHint:
    'Metode pembayaran belum tersimpan — pilih cara bayarnya di halaman pembayaran.',
  monthlyNote: 'Masa aktif 30 hari. Bisa berhenti kapan aja tanpa ditagih lagi.',
  yearlyNote: 'Masa aktif penuh satu tahun (365 hari) — {pct}% lebih murah per bulan.',
  perMonth: '/ bulan',
  perYear: '/ tahun',
  laterCta: 'Nanti aja',
  laterHint:
    'Nggak ada yang dipotong diam-diam. Kamu bisa perpanjang kapan pun dari Pengaturan → Langganan.',
  /** label tombol silang & area luar modal (a11y) */
  closeLabel: 'Tutup pengingat perpanjangan',
  /** catatan kecil wajib (PRD 4509/4585) — satu sumber dengan halaman harga */
  trustNote: NO_AUTO_RENEW_BADGE,
  mockNote: 'Demo: perpanjangan disimulasikan di browser, belum ada transaksi nyata.',

  /* — proses & hasil — */
  processing: 'Memproses…',
  successTitle: 'Masa aktifmu lanjut! 🌿',
  successBody:
    'Terima kasih ya. {days} hari ke depan kamu bisa catat sepuasnya, dan tanamanmu ikut segar lagi 🌱',
  successPlant: 'Tanamanmu balik segar begitu kamu catat hari ini — pelan-pelan aja, yang penting jalan 🌿',
  successCta: 'Oke, lanjut catat',
  successToast: 'Perpanjangan berhasil 🌿',
  successToastBody: 'Masa aktifmu lanjut. Makasih ya udah lanjut bareng CatetInd.',

  /* — banner di Home (7 / 3 / 1 hari, PRD 4514–4523) — */
  bannerTitleDays: 'Masa aktifmu tersisa {days} hari lagi',
  bannerTitleTomorrow: 'Besok masa aktifmu habis',
  bannerBody: 'Tanpa auto-renew — data kamu aman kok. Perpanjang kapan pun kamu siap. 💚',
  bannerBodyOneTap: 'Satu tap aja buat perpanjang 🌿 Datamu aman terus kok.',
  bannerCta: 'Perpanjang',
} as const

/** isi `{placeholder}` di satu template copy — dipakai semua label turunan */
function fill(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, value),
    template,
  )
}

/* ── LABEL SIAP-RENDER (harga & penghematan sudah final) ───────────────────── */

export interface RenewalOption {
  period: RenewalPeriod
  /** teks tombol final — jangan disusun ulang di JSX */
  label: string
  /** catatan kecil di bawah tombol */
  note: string
  /**
   * Nominal + satuan periode, ditampilkan TERPISAH hanya kalau label tombolnya
   * tidak memuat harga (kasus One-Tap: label = token tersimpan, harga di kanan).
   */
  amount?: { value: string; label: string }
  /** true = jalur One-Tap Renew (token Midtrans tersimpan) */
  oneTap: boolean
}

/**
 * Dua opsi perpanjangan: bulanan (primer) & tahunan (sekunder). Kalau ada token
 * Midtrans tersimpan, tombolnya jadi jalur One-Tap — TETAP butuh tap user, karena
 * produk ini tidak pernah menagih otomatis (PRD 4570–4579).
 */
export function renewalOptions(
  state: RenewalState,
  plan: PlanDefinition = RENEWAL_PLAN,
): RenewalOption[] {
  const pct = String(annualSavingsPct(plan))
  const oneTap = Boolean(state.savedTokenMasked)
  const token = state.savedTokenMasked ?? ''

  return [
    {
      period: 'monthly',
      label: oneTap
        ? fill(RENEWAL_COPY.oneTapCta, { token })
        : fill(RENEWAL_COPY.monthlyCta, { price: formatIDR(state.monthlyPrice) }),
      note: oneTap ? RENEWAL_COPY.oneTapHint : RENEWAL_COPY.checkoutHint,
      /* label One-Tap memuat token, bukan harga → nominalnya tampil terpisah */
      amount: oneTap
        ? { value: formatIDR(state.monthlyPrice), label: RENEWAL_COPY.perMonth }
        : undefined,
      oneTap,
    },
    {
      period: 'annual',
      label: fill(RENEWAL_COPY.yearlyCta, { price: formatIDR(state.yearlyPrice), pct }),
      note: fill(RENEWAL_COPY.yearlyNote, { pct }),
      oneTap,
    },
  ]
}

/** baris "Paket aktif …" + chip sisa hari di modal */
export function renewalPlanLabels(state: RenewalState) {
  return {
    planName: state.planName,
    planExpiry: renewalExpiryLabel(state.expiryLabel),
    /* saat masa aktif sudah habis, "Sisa -3 hari" akan jadi angka yang salah
       baca — chip-nya berganti jadi status, bukan hitungan negatif */
    daysChip:
      state.daysLeft > 0
        ? fill(RENEWAL_COPY.daysChip, { days: String(state.daysLeft) })
        : RENEWAL_COPY.daysChipExpired,
  }
}

/**
 * Judul & badan modal, dibedakan oleh sisa hari: H-1 memakai copy pengingat
 * (PRD 4527–4529), sedangkan masa aktif yang sudah habis memakai copy gerbang
 * (PRD 4540–4541) — supaya modal yang dibuka dari banner global tidak pernah
 * bilang "besok masa aktifmu habis" padahal hari ini sudah lewat.
 */
export function renewalModalHeadline(state: RenewalState) {
  if (state.daysLeft > 0) {
    return {
      eyebrow: RENEWAL_COPY.eyebrow,
      title: RENEWAL_COPY.title,
      body: RENEWAL_COPY.body,
    }
  }
  return {
    eyebrow: RENEWAL_COPY.eyebrow,
    title: RENEWAL_COPY.titleExpired,
    body: RENEWAL_COPY.bodyExpired,
  }
}

/** label "Aktif sampai …" siap-render untuk satu tanggal (dipakai juga saat sukses) */
export function renewalExpiryLabel(expiry: string): string {
  return fill(RENEWAL_COPY.planExpiry, { expiry })
}

/** copy banner Home — ikut siklus & jalur pembayaran yang tersedia */
export function renewalBannerCopy(state: RenewalState) {
  const oneTap = Boolean(state.savedTokenMasked)
  return {
    title:
      state.daysLeft <= 1
        ? RENEWAL_COPY.bannerTitleTomorrow
        : fill(RENEWAL_COPY.bannerTitleDays, { days: String(state.daysLeft) }),
    body: oneTap ? RENEWAL_COPY.bannerBodyOneTap : RENEWAL_COPY.bannerBody,
    cta: RENEWAL_COPY.bannerCta,
  }
}

/**
 * Catatan "data aman" di modal — diambil dari badge kanon `pricing.ts`, bukan
 * copy baru, supaya janji yang sama tidak pernah melunak di tempat lain.
 */
export const RENEWAL_DATA_NOTE =
  PRICING_TRUST_BADGES.find((badge) => badge.id === 'data-aman')?.note ??
  'Catatanmu tetap tersimpan meski tidak diperpanjang.'

/** panjang masa aktif yang didapat dari satu periode */
export function renewalDurationDays(period: RenewalPeriod): number {
  return RENEWAL_DURATION_DAYS[period]
}

/**
 * Tujuan jalur fallback saat belum ada token tersimpan (PRD 4566–4567: "full
 * checkout"). Route-nya ADA di repo ini (`app/checkout/page.tsx`) — jangan ganti
 * tanpa route-nya, pola sama dengan `SHARE_CTA_HREF` di lib/data/share.ts.
 */
export const RENEWAL_CHECKOUT_HREF = '/checkout'

/** copy sukses siap-render — jumlah hari mengikuti periode yang dibayar */
export function renewalSuccessBody(period: RenewalPeriod): string {
  return fill(RENEWAL_COPY.successBody, { days: String(renewalDurationDays(period)) })
}

/* ── FASE LANGGANAN & GERBANG READ-ONLY GLOBAL (inventaris state III/IV/VI · PRD 4534–4547) ──
   Ini momen paling rawan churn di seluruh produk, dan PRD memberi dua pagar
   yang tidak boleh dilanggar:

     1. Baca TIDAK pernah dikunci. `/history`, `/wallet`, `/budget` tetap
        menampilkan data & saldo apa adanya (PRD 4538) — yang berhenti hanya
        ALIRAN MASUK data baru.
     2. Data TIDAK PERNAH dihapus, bahkan setelah masa tenggang (PRD 4545).
        Karena itu dilarang keras menulis copy bertema "datamu akan hilang".

   Semua istilah dihitung MURNI di sini (tanpa React) supaya bisa diuji: fase,
   jumlah hari di dalam grace, dan seluruh copy-nya. Provider & komponen hanya
   membaca hasilnya. */

/** tiga fase hidup langganan: normal → tenggang 7 hari → setelah tenggang */
export type SubscriptionPhase = 'active' | 'grace' | 'post_grace'

/**
 * Panjang masa tenggang (PRD 4544: "hari ke-7 post-expired"). Angka ini
 * dijadikan konstanta eksplisit — bukan `7` yang terselip di perbandingan —
 * supaya bisa diuji dan tidak pernah diam-diam berubah.
 */
export const GRACE_DAYS = 7

/**
 * 🧪 KONSTANTA DEMO/REVIEW — BUKAN hasil produksi.
 *
 * Di produksi fase dibaca dari status langganan user (nanti:
 * `GET /api/subscription`). Repo ini demo tanpa backend, jadi memaksa state
 * grace dengan menunggu 7 hari itu mustahil ditinjau. Ubah konstanta ini ke
 * `'grace'` / `'post_grace'` untuk melihat perilaku read-only lengkap (banner,
 * FAB terkunci, tanaman tidur) lalu kembalikan ke `'active'`.
 *
 * Aturan mainnya: `'active'` = hitungan alami (tidak ada regresi), sedangkan
 * `'grace'`/`'post_grace'` = override KHUSUS tinjauan. Setelah user menekan
 * "Perpanjang" di banner, penanda `renewed` menang → app kembali normal tanpa
 * perlu menghapus localStorage.
 */
export const SUBSCRIPTION_DEMO_PHASE: SubscriptionPhase = 'active'

export interface SubscriptionSnapshot {
  phase: SubscriptionPhase
  /** hari ke-berapa DI DALAM grace (1..GRACE_DAYS); 0 saat tidak di grace */
  daysInGrace: number
  /** berapa hari sejak masa aktif berakhir; 0 saat masih aktif */
  daysSinceExpiry: number
}

/** dipakai berulang — objek beku supaya tidak ada satu pun tempat yang mengubahnya */
const ACTIVE_SNAPSHOT: SubscriptionSnapshot = {
  phase: 'active',
  daysInGrace: 0,
  daysSinceExpiry: 0,
}

/**
 * Fase ALAMI dari sisa hari + penanda siklus. Fungsi murni, tanpa efek samping.
 *
 * `state.daysLeft` 0 = hari expired (PRD 4534: "EXPIRED (hari ke-0)"), jadi hari
 * pertama grace. Nilai negatif = sudah lewat; dipakai murni sebagai hitungan
 * mock karena dialog `RenewalModal` hanya tahu "sisa hari".
 */
export function resolvePhase(
  state: RenewalState,
  marker: RenewalMarker,
): SubscriptionSnapshot {
  /* sudah diperpanjang di siklus ini → tidak ada gerbang sama sekali */
  if (marker.renewed) return ACTIVE_SNAPSHOT
  /* masih ada sisa hari → masa aktif normal */
  if (state.daysLeft > 0) return ACTIVE_SNAPSHOT

  const daysSinceExpiry = Math.max(0, -state.daysLeft)
  const graceDay = daysSinceExpiry + 1
  if (graceDay > GRACE_DAYS) {
    return { phase: 'post_grace', daysInGrace: 0, daysSinceExpiry }
  }
  return { phase: 'grace', daysInGrace: graceDay, daysSinceExpiry }
}

/* hari "sekarang" saat state ditinjau lewat `SUBSCRIPTION_DEMO_PHASE` — sengaja
   di tengah grace supaya status "3 dari 7 hari" terlihat, bukan angka ekstrem */
const DEMO_GRACE_DAY = 3
const DEMO_POST_GRACE_DAYS = GRACE_DAYS + 5

/**
 * Snapshot fase yang DIPAKAI UI (provider membaca ini).
 *
 * Urutan prioritasnya penting: `marker.renewed` menang atas segalanya, jadi
 * tinjauan demo pun kembali normal begitu user menekan "Perpanjang". Setelah
 * itu barulah hitungan alami — atau override demo kalau sedang dipakai.
 */
export function resolveSubscription(
  state: RenewalState = RENEWAL_STATE,
  marker: RenewalMarker = readRenewalMarker(state.expiryLabel),
): SubscriptionSnapshot {
  if (marker.renewed) return ACTIVE_SNAPSHOT
  if (SUBSCRIPTION_DEMO_PHASE === 'active') return resolvePhase(state, marker)
  if (SUBSCRIPTION_DEMO_PHASE === 'grace') {
    return {
      phase: 'grace',
      daysInGrace: DEMO_GRACE_DAY,
      daysSinceExpiry: DEMO_GRACE_DAY - 1,
    }
  }
  return { phase: 'post_grace', daysInGrace: 0, daysSinceExpiry: DEMO_POST_GRACE_DAYS }
}

/* ── COPY BANNER GLOBAL — VERBATIM PRD 4540–4541 & 4546–4547 ──────────────── */

export interface SubscriptionBannerCopy {
  /** label kecil di atas judul */
  eyebrow: string
  title: string
  body: string
  /** label tombol perpanjang — sama dengan banner Home (satu kata, satu aksi) */
  cta: string
  /** keterangan status kecil di bawah badan banner */
  status: string
}

export const SUBSCRIPTION_BANNER_COPY: Record<
  Exclude<SubscriptionPhase, 'active'>,
  SubscriptionBannerCopy
> = {
  /* PRD 4540–4541 — nada tenang, menegaskan data aman lebih dulu */
  grace: {
    eyebrow: 'Masa aktif berakhir',
    title: 'Masa aktifmu sudah habis.',
    body: 'Perpanjang untuk mulai catat lagi. Datamu aman, gak hilang 💚',
    cta: RENEWAL_COPY.bannerCta,
    status: 'Hari ke-{day} dari {days} hari masa tenggang — catatan lama tetap bisa dibaca.',
  },
  /* PRD 4546–4547 — tanpa tenggat, tanpa nada menyalahkan */
  post_grace: {
    eyebrow: 'Datamu masih tersimpan',
    title: 'Yuk kembali kapan aja kamu siap.',
    body: 'Semua datamu masih tersimpan aman di sini 🌱',
    cta: RENEWAL_COPY.bannerCta,
    status: 'Mode baca — saldo & histori tetap lengkap, catatan baru menunggu masa aktifmu.',
  },
}

/** copy banner siap-render; `null` saat fase active (tidak ada yang dirender) */
export function subscriptionBannerCopy(
  snapshot: SubscriptionSnapshot,
): SubscriptionBannerCopy | null {
  if (snapshot.phase === 'active') return null
  const copy = SUBSCRIPTION_BANNER_COPY[snapshot.phase]
  return {
    ...copy,
    status: fill(copy.status, {
      day: String(snapshot.daysInGrace),
      days: String(GRACE_DAYS),
    }),
  }
}

/* ── COPY KUNCI INPUT (dipakai semua titik: FAB, tombol Tambah, & tombol simpan) ──
   Nada sengaja hangat & memberi sebab-akibat yang jelas ("dulu" → "buat catat
   yang baru"), bukan larangan. Tidak satu pun menyebut data hilang. */
export const SUBSCRIPTION_LOCK_COPY = {
  /** copy utama saat user menyentuh titik masuk input yang terkunci */
  inputHint: 'Perpanjang dulu buat catat yang baru 🌿',
  /** keterangan tombol simpan di dalam sheet/modal yang sudah terbuka */
  saveHint: 'Catat yang baru lagi aktif setelah kamu perpanjang 🌿',
  /** aria-label FAB di bottom nav saat terkunci */
  fabAria: 'Catat transaksi terkunci — perpanjang dulu buat catat yang baru',
  /** aria-label tombol Tambah di sidebar saat terkunci */
  addAria: 'Tambah transaksi terkunci — perpanjang dulu buat catat yang baru',
} as const

/* ── COPY TANAMAN SLEEP MODE (inventaris state VI · PRD 4542) ─────────────────
   Tanaman "tidur" — bukan mati, bukan layu, dan TIDAK memakai angka HP. PRD
   1989–1994 melarang HP ditampilkan sebagai angka; saat tidur, bahkan kelima
   droplet visualnya disembunyikan supaya tidak terasa seperti hukuman. */
export const PLANT_SLEEP_COPY = {
  badge: 'Mode tidur',
  caption: 'Tanamanmu tidur selama masa aktif habis. Dia nungguin, bukan marah 🌙',
  aria: 'Tanaman (mode tidur)',
  /** pengganti baris "Tap untuk lihat detail" saat tidur */
  detailHint: 'Perpanjang buat bangunin dia lagi 🌿',
} as const

/**
 * Label tanggal berakhir BARU setelah perpanjangan (mock).
 *
 * Dipanggil HANYA dari handler klik, tidak pernah saat render — karena itu
 * tanggalnya dihitung saat itu juga. Kalau dihitung saat render, HTML server dan
 * client bisa berbeda (pola repo: tanggal mock sudah diformat jadi string). Di
 * produksi angka ini datang dari webhook Midtrans, bukan dari `new Date()`.
 */
export function renewalNextExpiryLabel(period: RenewalPeriod): string {
  const next = new Date()
  next.setDate(next.getDate() + renewalDurationDays(period))
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(next)
}
