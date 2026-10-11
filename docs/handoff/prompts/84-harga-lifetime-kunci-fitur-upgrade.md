# HANDOFF — CatetInd paket 84: HARGA AKSES SELAMANYA · KUNCI FITUR PER TIER · UPGRADE

> **Prompt untuk TASK BARU.** Isinya sengaja lengkap: keputusan produk dari user, status repo
> setelah audit terakhir, dan gotcha dari sesi sebelumnya — supaya task baru TIDAK kekurangan
> informasi dan TIDAK mengulang/mematahkan pekerjaan yang sudah jadi.
> **Baca sampai habis dulu sebelum menulis kode.** Jangan mulai dari nol.

---

## 0. PERAN & GAYA KERJA

- Kamu **MELANJUTKAN** pekerjaan CatetInd. Bahasa obrolan: Indonesia santai-profesional (user pakai "gua/lu").
- SEMUA kode & komentar proyek berbahasa **INDONESIA** → tulis dengan gaya yang sama.
- **ATURAN KERAS:** jangan pernah membuat UI/route yang "mengaku sudah jalan" padahal belum.
  Kalau belum bisa → jawab JUJUR (503 / empty state / kata "belum aktif"), bukan token atau tanda palsu.
- Setiap keputusan penting (harga, alur, kredensial) **LAPORKAN** ke user, jangan diam-diam.
- Sebelum mengubah sesuatu → BACA file relevan. Setelah mengubah → WAJIB verifikasi:
  `pnpm exec tsc --noEmit` + `pnpm test` + `pnpm build`.

## 1. PROYEK

- Root: `c:\Users\maari\Downloads\catet-ind-dashboard-design` (Windows + PowerShell).
- Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · pnpm · Supabase (Postgres+Auth) ·
  Midtrans (Core API) · DeepSeek · Web Push. PWA mobile-first, bahasa Indonesia.
- Git: `github.com/maarifalawi/catetind`, branch `main`. LIVE di `https://catetind.com` (Vercel).
- Perintah: `pnpm dev` · `pnpm build` · `pnpm start` · `pnpm test` · `pnpm exec tsc --noEmit` · `pnpm theme:audit`
- Skrip DB: `pnpm supabase:migrate` · `pnpm supabase:verify`
- **Line ending repo = CRLF** (`core.autocrlf=true`). Jangan menulis berkas baru dengan LF-only.
- **Semua copy user-facing tinggal di `lib/data/*` dan `lib/legal/*`** — komponen harus NOL string JSX.
  `lib/data/*` wajib **bebas React** (tanpa hook/JSX) supaya bisa diuji tanpa DOM.

---

## 2. KEPUTUSAN PRODUK DARI USER (WAJIB — jangan ditawar, jangan diinterpretasi ulang)

### 2.1 Harga = AKSES SELAMANYA (sekali bayar, bukan langganan)

| Tier | `PlanId` | Harga | Arti |
|---|---|---|---|
| Tier 1 | `catet-aja` | **Rp109.000** | akses selamanya, fitur dasar |
| Tier 2 | `waras` | **Rp129.000** | akses selamanya + fitur AI/bersama |
| Tier 3 | `sultan` | **Rp299.000** | akses selamanya + AI tanpa batas |

- **TIDAK ADA** paket bulanan/tahunan. **TIDAK ADA auto-renew.**
- **TIDAK ADA** masa aktif, tanggal kedaluwarsa, grace period, masa tenggang, atau perpanjangan
  untuk ketiga tier ini. Sekali bayar = akses selamanya.
- Mapping tier→harga mengikuti urutan menaik di atas. Kalau user mengoreksi, ubahnya **hanya** di
  `lib/data/pricing.ts` (satu tempat).

### 2.2 Kunci fitur per tier + jalur UPGRADE (permintaan eksplisit user)

> "kalau ada orang yang subs 109k, fitur-fitur yang 129k itu di-lock, jadi nanti kalau mau akses
> harus upgrade ke 129k."

- Pembeli tier 1 **TIDAK** dapat fitur tier 2 → fitur itu **benar-benar terkunci** (bukan cuma
  disembunyikan): server menolak, klien menampilkan ajakan upgrade.
- Untuk membuka kunci = **upgrade**, yaitu bayar **SELISIH** harga:

| Dari → Ke | Selisih yang dibayar |
|---|---|
| `catet-aja` → `waras` | **Rp20.000** |
| `waras` → `sultan` | **Rp170.000** |
| `catet-aja` → `sultan` | **Rp190.000** |

- Selisih **DIHITUNG dari `PLANS`**, bukan angka yang ditulis ulang di UI/komponen/komentar.
- **Downgrade TIDAK ditawarkan** (tidak ada refund).

### 2.3 Empat keputusan yang user serahkan ke kamu ("atur aja gimana bagusnya/terbaiknya")

Untuk TUGAS 2, 3, 4, dan 5 di §4, user menyerahkan keputusan teknis & UX ke kamu. Syaratnya:
satu sumber kebenaran, jujur (tidak ada klaim/data palsu), tidak menambah risiko regresi tanpa
alasan, dan **laporkan keputusanmu beserta alasannya** di akhir.

---

## 3. STATUS REPO SEKARANG (INI SUDAH JADI — jangan diulang, jangan dirusak)

Audit besar halaman + alur sudah dijalankan dan diperbaiki. Kalau kamu mengubah berkas di bawah,
**jangan mengembalikannya** ke perilaku lama.

**Route (36 halaman app + 18 API + `/r/[code]`, `/robots.txt`, `/sitemap.xml`):** lengkap dan
terdaftar di `.next/types/routes.d.ts`. `app/insight` = redirect ke `/history`.

**Perbaikan yang sudah diterapkan (ringkas):**

| # | Perbaikan | Berkas kunci |
|---|---|---|
| K1 | Paket yang dipilih di landing **tidak lagi hangus**; `/registered` tidak lagi jalan buntu & copy "pembayaran belum dibuka" dihapus | `lib/data/landing.ts` (`buildRegisteredHref`, `REGISTERED_PLAN_PARAM`, `REGISTERED_PURCHASE_PERIOD`), `components/landing/lead-sheet.tsx`, `app/registered/page.tsx` |
| K2 | `/login` **menghormati `?next=`**; user yang masuk dari tengah alur kembali ke tujuan aslinya | `lib/data/auth.ts` (`AUTH_NEXT_PARAM`, `buildLoginHref`), `app/login/page.tsx`, `components/catetind/login-screen.tsx`, `payment-start-screen.tsx`, `registration-sheet.tsx`, `checkout-screen.tsx` |
| K3 | Halaman legal & 404 **tidak jalan buntu** lagi (logo legal = link, 2 pintasan situs di 404) | `components/catetind/legal-shell.tsx`, `lib/legal/types.ts` (`homeLabel`), `lib/data/not-found.ts` |
| K4 | **Gerbang sesi** ada (`middleware.ts`, aktif hanya kalau Supabase terkonfigurasi & bukan mode demo) + **tidak ada lagi identitas "Jon Snow" hardcoded** | `middleware.ts`, `hooks/use-session-user.ts`, `desktop-sidebar.tsx`, `settings-panel-account.tsx`, `settings-panel-privacy.tsx`, `home-screen.tsx`, `wallet-card-stack.tsx`, `lib/data/auth.ts` (`SESSION_COPY.unknownName/unknownEmail/unknownAccount`) |
| K5 | **Satu sumber domain** (`lib/site.ts`); `catetind.app` hilang; route `/r/[code]` yang dulu 404 sekarang ada | `lib/site.ts`, `app/r/[code]/page.tsx`, `referral.ts`, `share.ts`, `joint-invite.ts`, `install.ts`, `help.ts` |
| S1–S6 | `<main>` bersarang dihapus; `/checkout/selesai` dibungkus `PhoneStage plain`; error boundary baru `/app` & `/budget`; `/install` keluar dari `PUBLIC_ROUTES`; padding FAB AI hanya di `/app` (`AI_COACH_ROUTES`) | `payment-start-screen.tsx`, `payment-done-screen.tsx`, `app/checkout/selesai/page.tsx`, `app/app/error.tsx`, `app/budget/error.tsx`, `lib/data/segment-error.ts`, `lib/public-routes.ts`, `screen-shell.tsx`, `lib/ai-chat.ts` |
| R1–R6 | komentar `/api/payment/charge`; `start_url: '/app'`; `app/robots.ts` + `app/sitemap.ts` baru; `app/hasil.md` pindah ke `docs/hasil-paket-63-83.md` | `app/manifest.ts`, `app/robots.ts`, `app/sitemap.ts` |

**Angka yang HARUS tetap benar sampai sekarang:** `pnpm exec tsc --noEmit` = 0 · `pnpm test` =
**79 file / 1053 test lulus** · `pnpm build` sukses.

**Utang yang SENGAJA ditinggalkan (dan jadi bagian tugas ini):** lihat §4 — harga landing masih
99k/119k/299k "seumur hidup" sementara `PLANS` masih 49k/109k/199k tahunan, dan catatan
`CATATAN HARGA` di `lib/data/landing.ts` menunggu keputusan yang sekarang SUDAH ADA (§2.1).

---

## 4. YANG HARUS DIKERJAKAN

### TUGAS 1 — Harga akses selamanya + kunci fitur per tier + jalur upgrade  *(prioritas tertinggi)*

**1a. `lib/data/pricing.ts` = SATU-SATUNYA sumber harga & kemampuan.**

Rekomendasi bentuk data (sesuaikan kalau ada yang lebih baik, tapi tetap satu tempat):

```ts
export type PlanId = 'catet-aja' | 'waras' | 'sultan'

/** satu-satunya periode yang dijual sejak paket 84: akses selamanya, sekali bayar */
export type BillingPeriod = 'lifetime'

export interface PlanDefinition {
  id: PlanId
  name: string
  subtitle: string
  /** harga akses selamanya (rupiah, sekali bayar) */
  lifetime: number
  /** tingkat akses — dipakai menghitung selisih upgrade */
  rank: 1 | 2 | 3
  features: string[]
  badge?: string
  hero?: boolean
}

export const PLANS: PlanDefinition[] = [
  { id: 'catet-aja', lifetime: 109_000, rank: 1, /* ... */ },
  { id: 'waras',     lifetime: 129_000, rank: 2, hero: true, badge: 'Pilihan Gen-Z 🏆', /* ... */ },
  { id: 'sultan',    lifetime: 299_000, rank: 3, /* ... */ },
]

/** nominal yang harus dibayar. `ownedPlanId` = paket yang SUDAH dibeli user (dari sesi). */
export function priceFor(plan: PlanDefinition, ownedPlanId?: PlanId | null): number
/** href halaman bayar / pilih paket (tanpa parameter periode lagi) */
export function buildPayHref(planId: PlanId, code?: string | null): string
export function buildCheckoutHref(planId?: PlanId | null, code?: string | null): string
/** href khusus ajakan upgrade dari dalam app */
export function buildUpgradeHref(planId: PlanId, from?: PlanId | null): string
```

**Yang HARUS DIHAPUS dari `pricing.ts`** (tidak ada lagi langganan/periode):
`MONTHS_CHARGED_PER_YEAR`, `monthlyPrice()`, `annualSavingsPct()`, `perMonthAnchor()`,
`SELLABLE_PERIODS`, `BILLING_PERIOD_LABEL`, `PERIOD_CHOICE_LABEL`, `periodNote()`,
`isSellablePeriod()`, properti `annual`, dan seluruh copy yang menjanjikan "hemat X% bayar tahunan",
"perpanjangan", atau "auto-renew". Setelah itu **`grep -rn "annual\|monthly\|bulanan\|tahunan\|
perpanjang\|auto-renew\|grace\|masa tengah\|kedaluwarsa"`** dan bersihkan SEMUA sisa — termasuk
komentar yang menyatakan "`Founding Member` (seumur hidup) TIDAK dijual" (sekarang justru
SEBALIKNYA), `lib/data/renewal.ts`, `lib/data/referral.ts` (`SubscriptionType`), `lib/legal/terms.ts`
("langganan prabayar tanpa auto-renew", "grace period 7 hari", "garansi 30 hari"),
`lib/legal/privacy.ts`, `lib/data/help.ts`, dan `docs/STATUS-HALAMAN.md`.

**1b. Kunci fitur = peta kemampuan, bukan `if` yang disebar.**

```ts
export type Capability =
  | 'ai-chat' | 'ocr' | 'voice' | 'ai-report' | 'joint-wallet'
  | 'ai-unlimited' | 'priority-support'

export const PLAN_CAPABILITIES: Record<PlanId, Capability[]>
export function capabilitiesOf(planId: PlanId | null): Capability[]
export function canUse(planId: PlanId | null, capability: Capability): boolean
```

Lalu **terapkan kuncinya dengan benar-benar berfungsi** (bukan hiasan):

- **Server wajib menolak**, bukan cuma klien menyembunyikan tombol:
  route `/api/ai/*` (chat/OCR/voice/categorize) mengembalikan **403** kalau paket user tidak punya
  kemampuan terkait, dan `/api/payment/charge` menolak tujuan upgrade yang tidak sah.
- **Nominal SELALU dihitung server** dari paket yang tersimpan (`user_subscriptions`) +
  `planId` target dari body. Jangan pernah menagih angka kiriman klien (pola ini sudah dipakai
  sekarang: nominal dicocokkan dengan harga kanon, salah → 422).
- **`/api/payment/charge`** perlu `purpose: 'upgrade'` di samping `'subscribe'`, dengan nominal =
  selisih dari `priceFor()`.
- **Klien**: pakai gerbang yang sudah ada, jangan bikin provider kedua. Perluas
  `components/catetind/subscription-gate-provider.tsx` supaya meng-expose
  `{ planId, capabilities, canUse }` dari satu tempat (dia sudah jadi gerbang global di `app/layout.tsx`).
- **UI terkunci**: badge `🔒` + nama paket yang membukanya + CTA yang menyebut **selisihnya**
  (mis. "Buka dengan upgrade — Rp20.000") → `/checkout/bayar?plan=waras`. Nominal di CTA dibaca
  dari `priceFor()`, bukan diketik.
- Tempat yang perlu dikunci & diberi ajakan upgrade (cek satu per satu): widget AI Coach
  (`ai-chat-widget.tsx`), scan struk + voice (`ai-capture-bubble.tsx`), laporan/rekap AI
  (`weekly-recap-modal.tsx`), Joint Wallet (`joint-screen.tsx` + route API-nya), dan
  kuota AI (`lib/ai-quota.ts` — tier 1 = 0, tier 2 = terbatas, tier 3 = tanpa batas).

**1c. Sumber kebenaran paket user.**

- Server: `app/api/subscription/route.ts` (baca `user_subscriptions`) → kembalikan
  `{ planId, purchasedAt, active }`.
- Di repo DEMO (tanpa Supabase) boleh pakai store perangkat seperti store lain, **wajib diberi
  komentar jujur** "produksi: dibaca dari `/api/subscription`" + gerbang `SHOWS_SAMPLE_DATA`
  (`lib/demo.ts`). Jangan mengaku punya riwayat pembelian kalau tidak ada.

**1d. Rapikan harga landing (sekaligus menutup utang §3).**

- `lib/data/landing.ts`: `LANDING_TIERS[].price` **diturunkan dari `PLANS[].lifetime`** (hapus
  99k/119k/299k dan blok `CATATAN HARGA` yang lama), `periodLabel` → "Sekali bayar, akses selamanya".
- Hapus `REGISTERED_PURCHASE_PERIOD` + seluruh parameter periode di `/registered`, `/checkout`,
  dan `/checkout/bayar`.
- `app/checkout/bayar/page.tsx`: guard jadi `if (!plan) redirect('/checkout')` (tidak ada periode).
- `components/catetind/checkout-screen.tsx`: **hapus toggle periode** & pemilih periode — satu
  pembelian, satu harga.
- `components/catetind/annual-plan-modal.tsx` dan `snap-payment-sheet.tsx`: putuskan & LAPORKAN
  (hapus kalau memang mati; jangan biarkan komponen mati yang menyesatkan).

### TUGAS 2 — Nasib alur PERPANJANGAN *(user: "atur aja gimana bagusnya")*

Karena akses sekarang selamanya, **perpanjangan tidak punya arti lagi**. Rekomendasi saya (kamu boleh
menggantinya, tapi wajib lapor):

1. **Ganti peran, jangan tambah alur baru.** Posisi yang dulu diisi "perpanjang" sekarang diisi
   **upgrade**. `lib/data/renewal.ts` `RENEWAL_CHECKOUT_HREF='/checkout'` → diganti
   `buildUpgradeHref(planId)`.
2. `components/catetind/renewal-modal.tsx` → jadikan **modal upgrade** (terima `targetPlanId`,
   tampilkan selisih dari `priceFor()`, CTA ke `/checkout/bayar?plan=<target>`), ATAU komponen
   baru `upgrade-modal.tsx` + hapus yang lama. Pilih satu, jangan dua-duanya hidup.
3. `components/catetind/subscription-banner.tsx` → banner **upgrade** ("Fitur AI masih terkunci —
   buka dengan Rp20.000") untuk user yang sudah beli tapi belum di tier tertinggi. Untuk user yang
   BELUM pernah beli, banner-nya jadi ajakan beli.
4. Fase kedaluwarsa/grace di `lib/data/renewal.ts` + `subscription-gate-provider.tsx`: **jangan
   dihapus tanpa berpikir** kalau masih ada pembeli lama. Kalau dibuang, tandai dengan komentar
   tegas mengapa; kalau disimpan, beri label eksplisit `LEGACY` dan **jangan tautkan dari UI baru**.
5. Semua copy "masa tenggang", "H-1 reminder", "perpanjang sekarang" di `lib/legal/*` dan
   `lib/data/help.ts` harus ikut berubah.

### TUGAS 3 — Identitas & data demo yang masih mengarang *(user: "atur aja gimana terbaiknya")*

Rekomendasi: **turunkan dari data nyata, dan kalau tidak ada data → jangan tampilkan apa pun.**

1. `components/catetind/settings-panel-account.tsx` — `MEMBER_BADGE = '🏆 Founding Member #47'`
   masih konstanta demo yang **mengarang nomor member**. Ganti jadi turunan paket nyata
   (mis. `Akses Selamanya · ${plan.name}` + tanggal beli dari `purchasedAt`). Kalau paket belum
   diketahui → **badge tidak dirender sama sekali**.
2. `DEMO_PARTNER_JOINED` + `JOINT_PARTNER` (kartu "Dompet Bersama" di panel yang sama) — gerbangkan
   dengan `SHOWS_SAMPLE_DATA` (`lib/demo.ts`) seperti store lain; produksi = keadaan kosong yang
   jujur + CTA "Undang pasangan" (pakai `JOIN_PREVIEW_COPY` yang sudah ada).
3. `grep -rn "Jon Snow\|jon@snow\|Founding Member\|RINA-X7K"` → pastikan yang tersisa hanya seed
   demo yang **memang** bergerbang `SHOWS_SAMPLE_DATA`, dan `referralState` yang masih mock diberi
   komentar "produksi: dari endpoint referral" (sudah ada polanya di file itu).

### TUGAS 4 — `app/manifest.ts` *(user: "atur aja gimana terbaiknya")*

Rekomendasi: **hapus `orientation: 'portrait'`**. Alasannya: seluruh halaman sudah punya tata letak
`lg:`/landscape (bento grid Dashboard, 2 kolom `/login` & `/checkout`), jadi memaksa portrait justru
merusak tampilan tablet & foldable. `start_url: '/app'` dan `scope: '/'` **dibiarkan**.

Nilai tambah opsional (kerjakan kalau murah & laporkan): tambahkan `shortcuts` PWA untuk aksi yang
paling sering — mis. "Catat" (`/app`), "Wallet" (`/wallet`), "Budget" (`/budget`) — karena app ini
dipasang justru supaya cepat dipakai mencatat.

### TUGAS 5 — Skeleton/loading *(user: "atur aja gimana terbaiknya")*

**JANGAN membuat `app/loading.tsx` global.** Alasannya arsitektur: `PhoneStage` + `ScreenShell`
(sidebar/bottom-nav) hidup DI DALAM tiap `components/catetind/*-screen.tsx`, bukan di layout. Jadi
`app/loading.tsx` akan MENGHAPUS sidebar selama transisi — itu regresi UX, bukan perbaikan.

Rekomendasi yang benar:

1. Buat `components/catetind/screen-skeleton.tsx`: kerangka kartu memakai token palet repo
   (bukan abu-abu asing), `aria-busy="true"`, animasi yang menghormati `prefers-reduced-motion`.
2. Pakai sebagai `app/settings/loading.tsx` (dan sub-route kalau perlu). Di sana sidebar memang
   berasal dari `app/settings/layout.tsx` → **sidebar tetap hidup**, hanya kolom kanan yang memuat.
3. Untuk halaman app lain: bungkus bagian yang benar-benar menunggu data dengan `<Suspense>` **di
   dalam** screen, jadi shell tidak ikut hilang.
4. Tulis komentar yang menjelaskan ALASAN arsitekturnya, supaya orang berikutnya tidak
   "memperbaikinya" menjadi `app/loading.tsx`.
5. Opsional & **hanya dengan izin user** (risiko besar): pindahkan `PhoneStage`+`ScreenShell` ke
   route group `app/(app)/layout.tsx` supaya `loading.tsx` bisa dipakai di semua halaman app.
   Usulkan dulu, jangan kerjakan sendiri.

---

## 5. VERIFIKASI & DEFINITION OF DONE

Wajib dijalankan dan **hasilnya dilaporkan**:

```powershell
pnpm exec tsc --noEmit      # harus 0 error
pnpm test                   # sekarang 79 file / 1053 test — harus tetap hijau
pnpm build                  # harus sukses
pnpm theme:audit            # lihat catatan di bawah
```

Test baru yang EXPECTED ada:

- `priceFor()`: selisih antar tier benar (109→129 = 20.000; 129→299 = 170.000; 109→299 = 190.000),
  pembelian pertama = harga penuh, target ≤ paket yang dimiliki = tidak menagih.
- `capabilitiesOf()` / `canUse()`: tier 1 tidak punya `ai-chat`, tier 2 punya tapi tidak
  `ai-unlimited`, tier 3 punya semuanya.
- `buildPayHref()` / `buildUpgradeHref()` / `buildCheckoutHref()`: bentuk URL.
- Route `/api/payment/charge`: menolak nominal salah (422) DAN menolak `purpose: 'upgrade'` yang
  tidak sah / target lebih rendah (403).
- Route `/api/ai/*`: menolak (403) saat paket tidak punya kemampuan itu.

**`pnpm theme:audit` masih GAGAL sekarang — dan itu BUKAN dari perubahan ini.** Penyebabnya 24 warna
di luar palet di DUA berkas yang belum tersentuh: `components/catetind/plant-illustration.tsx` (23
hex) dan `components/catetind/payment-instruction-card.tsx` (1 `bg-white`). Perbaiki sekalian supaya
audit bersih, atau laporkan kalau kamu sengaja menundanya. **Jangan** melonggarkan aturan audit hanya
supaya hijau.

Setelah selesai, perbarui dokumentasi repo:

- `docs/STATUS-HALAMAN.md` — status halaman ikut berubah (khusus #3 Checkout, #18 Billing,
  #31 Referral, dan seluruh tabel harga/grace-period di dalamnya).
- `docs/handoff/laporan/84-*.md` — laporan hasil (konvensi folder itu sudah ada; lihat berkas
  laporan paket-paket sebelumnya).

---

## 6. LARANGAN & GOTCHA

- **Copy user-facing WAJIB di `lib/data/*` / `lib/legal/*`.** NOL string kalimat di JSX. Butuh
  kalimat baru → taruh di berkas data.
- **Angka harga HANYA di `lib/data/pricing.ts`.** Tidak ada nominal di JSX, komponen, atau komentar
  alur. CTA yang menyebut "Rp20.000" harus **membaca** dari `priceFor()`.
- **Komentar tidak boleh bohong.** Banyak komentar saat ini menyatakan kebalikan dari keputusan baru
  ("seumur hidup TIDAK dijual", "tanpa auto-renew", "grace period 7 hari"). Semuanya HARUS diperbarui
  di commit yang sama — itu bagian dari tugas, bukan kerapian opsional.
- **Selisih upgrade dihitung SERVER**, dari paket yang tersimpan. Klien hanya mengirim *tujuan*.
- **Jangan menghidupkan kembali Snap/hosted Midtrans.** Paket 83 sudah memindahkan pembayaran ke
  `/checkout/bayar` (Core API) di dalam app.
- **Jangan bikin provider status kedua.** `subscription-gate-provider.tsx` sudah jadi gerbang global
  di `app/layout.tsx`; perluas, jangan duplikasi.
- **Jangan menghapus `middleware.ts`** dan jangan menyalakan gerbangnya secara paksa: ia sengaja
  hanya aktif kalau Supabase terkonfigurasi DAN `NEXT_PUBLIC_DEMO !== '1'`, supaya build demo tetap
  bisa dijelajahi.
- `next-env.d.ts` berubah sendiri tiap `pnpm build` — itu normal, **jangan** diklaim sebagai
  perbaikan (dan jangan di-restore berulang kali).
- **Line ending CRLF.** Kalau menyunting lewat script, hormati EOL berkas.
- `lib/data/*` **bebas React**; jangan mengimpor komponen/hook di sana.
- Kalau ragu soal produk → **TANYAKAN**, jangan mengarang. Contoh kasus yang mudah salah: siapa yang
  boleh memakai app tanpa membayar, dan paket tier berapa untuk pembeli lama.

---

## 7. PERTANYAAN TERBUKA (tanyakan ke user SEBELUM implementasi kalau jawabannya mengubah desain)

1. **User yang belum pernah bayar** — pakai mode **baca-saja + CTA beli** (memanfaatkan gerbang yang
   SUDAH ada di `subscription-gate-provider.tsx`), atau app tetap terbuka penuh seperti demo
   sekarang dan yang baru dikunci hanya fitur tier di atasnya? Rekomendasi saya: yang pertama,
   karena itu satu-satunya cara "kunci fitur" jadi bermakna.
2. **Daftar fitur per tier** — wajib diturunkan dari `PLANS[].features` yang sudah ada
   (Catet Aja / Waras / Sultan). Kalau user punya daftar final yang berbeda, minta daftarnya dulu
   sebelum mengunci apa pun.
3. **Pembeli lama** — kalau ada yang pernah membayar paket tahunan lama (49k/109k/199k), mereka
   dihormati sebagai pemilik tier mana saat upgrade?
4. **`sultan` = AI tanpa batas** — batasnya benar-benar tanpa batas, atau ada fair-use (mis. X pesan
   per hari) supaya biaya DeepSeek tidak meledak? Rekomendasi: tulis fair-use di copy, jangan
   diam-diam membatasi.

---

## 8. URUTAN KERJA YANG DISARANKAN

1. TUGAS 1a + 1d (`pricing.ts` + landing + hapus periode) → jalankan tsc/test/build. **Ini fondasi
   semua tugas lain.**
2. TUGAS 1b + 1c (kemampuan, kunci server, provider status) → test baru → verifikasi.
3. TUGAS 2 (perpanjangan → upgrade) — bergantung pada 1a.
4. TUGAS 3 (identitas & data demo).
5. TUGAS 4 + 5 (manifest, skeleton) — paling kecil risikonya, bisa di akhir.
6. Perbarui `docs/STATUS-HALAMAN.md` + tulis laporan `docs/handoff/laporan/84-*.md`, lalu **laporkan
   seluruh keputusan yang kamu ambil sendiri** (§2.3) beserta alasannya.




