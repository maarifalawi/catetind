# 14 — Renewal Modal + One-Tap Renew

**Paket:** modal (inventaris #m) · **Fase 6** · **Depends on:** #08 (`lib/data/pricing.ts` sudah ada)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Peta baca

**PRD (bagian paling penting — baca utuh):**

- **4503–4548** — **Renewal Flow lengkap**: 7 hari (banner + email) → 3 hari (banner
  prominent + push) → **1 hari (full-screen modal, dismissable, muncul 1x)** →
  expired → **grace 7 hari read-only** (data & histori tetap bisa dibaca, input
  diblokir, tanaman "tidur") → post-grace (banner berubah, data **tidak pernah** dihapus)
- **4550–4580** — **One-Tap Renew** dengan `midtrans_saved_token_id`;
  *"TIDAK auto-charge — user HARUS tap tombol ini"*
- **4507–4509** — BIMA: *"Auto-renew subscription adalah salah satu sumber anxiety
  Gen-Z terbesar"* → DIAN: trust badge adalah **selling point**, bukan disclaimer
- **4582–4607** — trust badge + "Harga Konsisten & Transparan"

**Inventaris:** baris 109 (#m) memuat **copy modal yang harus dipakai**:
*"Besok masa aktifmu habis…"*, tiga opsi `[Perpanjang Rp49.000/bulan]` (sage green),
`[Perpanjang Rp399.000/tahun — Hemat 32%]` (sekunder), `[Nanti aja]`; dismissable, muncul 1x.

**Kode acuan:**

- `components/catetind/home-banner.tsx` — banner renewal yang **sudah ada**
  (`DEMO.renewalDaysLeft = 3`, prioritas banner: Renewal > AI Fuel Gauge > Sinking Fund,
  dismiss disimpan di `localStorage`)
- `lib/data/pricing.ts` — **sumber harga** (dibuat di prompt 08); jangan hardcode harga
- `components/catetind/billing-panel.tsx` — `CurrentPlanCard` (tombol "Perpanjang"),
  `SAVED_PAYMENT` ("Dipakai buat perpanjang satu tap"), trust badge "Tanpa auto-renew"
- `components/catetind/annual-plan-modal.tsx` — pola modal penuh + langkah Midtrans (mock)
- `components/catetind/top-up-modal.tsx` — pola modal paket & pembayaran

## Kenapa paket ini ada

Langganan habis adalah titik churn paling berbahaya — dan sekaligus kesempatan
membuktikan karakter produk. PRD menegaskan dua hal yang tidak boleh dilanggar:

1. **Tidak ada penagihan otomatis.** Semua perpanjangan lewat tap sadar dari user.
2. **Data tidak pernah dihapus.** Bahkan setelah grace period.

Psikologi yang berlaku (CONTEXT-WAJIB §5.3 no.3): modal ini harus terasa seperti
**pengingat dari teman**, bukan tagihan dari sistem. Tanpa hitungan mundur panik,
tanpa warna merah, tanpa kalimat "jangan sampai datamu hilang".

## Yang harus dibangun

1. **`lib/data/renewal.ts`** (baru) — state & logika murni:
   - `interface RenewalState { daysLeft: number; planName: string; savedTokenMasked?: string;
     monthlyPrice: number; yearlyPrice: number }` (harga **dibaca** dari `lib/data/pricing.ts`).
   - `shouldShowRenewalModal(state, dismissedFor)` → `true` hanya saat `daysLeft === 1`
     **dan** belum pernah ditutup untuk siklus ini.
   - `RENEWAL_COPY` — judul dari PRD 4528–4529, 3 label tombol dari inventaris #m,
     catatan kecil "Tanpa auto-renew paksa — kamu yang pegang kendali".
   - `renewalStorageKey(expiryLabel)` supaya "muncul 1x" benar-benar per siklus.
2. **`components/catetind/renewal-modal.tsx`**:
   - Modal penuh (overlay) dengan 3 opsi + opsi **`Nanti aja`** (tanpa rasa bersalah).
   - Jika `savedTokenMasked` ada → tombol primer jadi **One-Tap Renew**:
     `"Perpanjang dengan •••• 1234"` + harga (pola PRD 4560).
   - Menutup modal menyimpan penanda di `localStorage` (pola `home-banner.tsx`),
     jadi ia benar-benar **muncul 1x**.
   - Sukses "perpanjang" → masa aktif diperbarui (mock), toast hangat, dan catatan
     bahwa tanaman kembali segar (kaitan ke sistem tanaman, cukup sebagai copy).
3. **Trigger yang jujur & bisa diuji**:
   - Pasang di Home (satu tempat dengan `HomeBanners`) supaya muncul otomatis di
     kondisi benar.
   - **Banner Renewal di Home harus bisa diklik untuk membuka modal ini** — supaya
     halaman bisa ditinjau kapan saja tanpa menghapus `localStorage` (dan sekaligus
     melunasi banner yang sebelumnya hanya pajangan).
   - Bila ada tombol `"Perpanjang"` di `billing-panel.tsx` yang membuka alur berbeda,
     pastikan keduanya **tidak bertabrakan**: jelaskan di komentar peran masing-masing
     (modal tahunan = *upgrade*, modal ini = *perpanjang masa aktif*).
4. **Catat batasnya di komentar**: **state Grace Period / Post-Grace tidak dibangun di
   task ini** (ia gerbang global di seluruh halaman app — tercatat di
   `ROADMAP-HALAMAN.md` §5 butir 3). Jangan membuat gerbang setengah jalan.

## Acceptance criteria

- [ ] Modal muncul saat `daysLeft === 1` (dan tidak muncul lagi setelah ditutup).
- [ ] Tiga opsi ada dengan copy sesuai inventaris #m; `Nanti aja` benar-benar menutup tanpa nag.
- [ ] Harga bersumber dari `lib/data/pricing.ts` (tidak ada angka harga yang di-hardcode).
- [ ] One-Tap Renew muncul saat ada saved token, dan tetap **butuh tap** (tanpa auto-charge).
- [ ] Tidak ada warna merah/urgensi buatan; trust badge tampil.
- [ ] Banner Renewal di Home membuka modal ini.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Auto-charge, hitungan mundur, atau kalimat yang menakut-nakuti kehilangan data.
- Menyalin harga (49.000/399.000) langsung di komponen/data baru.
- Membangun gerbang read-only/grace period setengah-setengah di task ini.
