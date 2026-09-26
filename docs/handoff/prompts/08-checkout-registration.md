# 08 — Checkout + Registrasi

**Route:** `app/checkout/page.tsx` (+ modal/bottom sheet registrasi) · **Inventaris:** #3 (+ modal #n) · **Fase 4** · **Depends on:** —

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Peta baca

**PRD:**

- **5887–5935** — Section 5 "Checkout Flow (Maksimal 3 Langkah)": langkah 1 identifikasi
  (email + nama panggilan, **ZERO password/telepon/alamat/gender/tanggal lahir**),
  langkah 2 pembayaran (Midtrans Snap: QRIS, GoPay, OVO, DANA, VA),
  langkah 3 akun aktif → `/app/onboarding`. BIMA: *"User harus LANGSUNG bisa pakai app
  setelah bayar — ini momentum yang tidak boleh dibuang."* CANDRA: magic link Supabase.
- **4503–4607** — 5A renewal: **"Auto-renew subscription adalah salah satu sumber
  anxiety Gen-Z terbesar"** → prepaid manual; trust badge **"Tanpa auto-renew paksa —
  kamu yang pegang kendali"** (baris 4509 & 4585) + "Harga Konsisten & Transparan" (4594).
- **5782–5886** — Section 5 dinamika harga & CTA + trust badge (konteks komponen harga).
- **194–200** — yang patut ditiru: bantuan kontekstual di dalam form, placeholder
  contoh angka yang "menjual", nudge di momen momentum bukan interupsi.

**Kode acuan:**

- `components/catetind/annual-plan-modal.tsx` — `ANNUAL_PLANS` (49.000 / 109.000 / 199.000),
  `HERO_PLAN`, `CATET_AJA_PLAN`, `upgradeDiff`, pola Midtrans Snap + komentar arah produksi
- `components/catetind/billing-panel.tsx` — `CURRENT_PLAN`, `PAYMENT_METHODS`, `SAVED_PAYMENT`,
  trust badge, dan satu **sumber harga yang sama** dengan di atas
- `components/catetind/top-up-modal.tsx` — contoh modal paket + pembayaran
- `components/catetind/payment-method-logos.tsx` — logo metode (monokrom, `PaymentLogo`)
- `lib/data/referral.ts` — pola konstanta copy + `buildReferralShareUrl()` (untuk diskon 10%)
- `app/app/onboarding/page.tsx` + `lib/onboarding.ts` — tujuan setelah pembayaran sukses

## Kenapa halaman ini ada

Ini satu-satunya halaman tempat user **menyerahkan uang**. Dua hal yang harus
terasa sepanjang halaman: **ringan** (maksimal 3 langkah, 2 field, tanpa password)
dan **jujur** (harga konsisten, tanpa auto-renew, tanpa countdown palsu).

Psikologi yang berlaku (CONTEXT-WAJIB §5.3):

- **Kecemasan langganan adalah musuh utama.** Trust badge bukan disclaimer —
  ia selling point (PRD 4509).
- **Harga harus konsisten.** PRD mengkritik kompetitor yang harganya berubah-ubah
  (baris 208); karena itu checkout, billing, dan modal tahunan **wajib membaca satu
  sumber harga**.
- **Jangan menghalangi dengan verifikasi.** Tidak ada langkah verifikasi email yang
  memblokir; user langsung masuk onboarding.

## Yang harus dibangun

1. **`lib/data/pricing.ts`** (baru) — **satu sumber harga**: pindahkan
   `ANNUAL_PLANS` (+ tipe & helper `formatIDR`-nya) dari `annual-plan-modal.tsx`,
   tambahkan harga bulanan & paket founding member, plus konstanta copy trust badge.
   Ubah `annual-plan-modal.tsx` **dan** `billing-panel.tsx` supaya mengimpor dari
   file ini (jangan biarkan ada dua daftar harga).
2. **`app/checkout/page.tsx`** — halaman **publik** (tanpa `ScreenShell`/sidebar;
   pakai `PhoneStage`), `metadata` "Pembayaran — CatetInd".
   - Komentar `force-dynamic` + arah produksi: `GET /api/price` dengan
     `cache: 'no-store'` (inventaris #3: "harga real-time, no-cache").
3. **`components/catetind/checkout-screen.tsx`**:
   - **Ringkasan paket**: nama paket, harga (`font-display`), rincian yang didapat,
     dan **trust badge** persis PRD: *"✅ Tanpa auto-renew paksa — kamu yang pegang kendali."*
   - **Field diskon referral** opsional: input kode → tampilkan *"Temanmu dapat diskon 10%"*
     (pakai copy dari `lib/data/referral.ts`; perhitungan mock, tandai di komentar).
   - **CTA primer** di zona ibu jari: `"Lanjut ke Pembayaran"`.
   - **Ringkasan langkah** (3 langkah) supaya user tahu sisa prosesnya — ini penurun
     kecemasan, bukan hiasan.
4. **Modal/bottom sheet registrasi (inventaris #n)** — `components/catetind/registration-sheet.tsx`
   (pakai primitif `budget-sheet.tsx`): **hanya email + nama panggilan**, validasi
   format email, tombol `"Lanjut ke Pembayaran"`, dan catatan kecil
   *"Nggak perlu bikin password — kita kirim tautan masuk ke emailmu."*
5. **Simulasi pembayaran (mock, jelas)** — `components/catetind/snap-payment-sheet.tsx`:
   daftar metode (QRIS/GoPay/OVO/DANA/VA) memakai `PaymentLogo`, ringkasan nominal,
   tombol `Bayar`. Setelah "berhasil" → arahkan ke `/app/onboarding`.
   Komentar arah produksi: `POST /api/payment/subscribe` → `snap_token` → `window.snap.pay()`.
6. **Copy** semua di `lib/data/pricing.ts` / `lib/data/auth.ts` (bila perlu) — bukan di JSX.
7. **Tautan silang** — halaman `/login` **belum ada** saat task ini dikerjakan:
   **jangan** memasang tautan "Sudah punya akun? Masuk". Tautan itu ditambahkan di
   **prompt 09** (login) setelah `/login` benar-benar ada.

## Acceptance criteria

- [ ] Alur lengkap bisa ditelusuri: `/checkout` → isi 2 field → pilih metode → sukses → `/app/onboarding`.
- [ ] **Nol** field password/telepon/alamat/gender/tanggal lahir.
- [ ] Harga di `/checkout`, `/settings/billing`, dan modal tahunan **identik** (satu sumber).
- [ ] Trust badge "Tanpa auto-renew paksa" tampil dan terbaca di 375 px.
- [ ] CTA primer berada di zona ibu jari; form bisa diselesaikan tanpa scroll melelahkan.
- [ ] Tidak ada tautan ke `/login` pada task ini (route belum ada).
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Countdown palsu / "harga naik dalam 5 menit" / social proof fabrikasi
  (PRD 5174–5177 melarang data pembelian palsu).
- Membuat **daftar harga kedua** di halaman ini.
- Menambahkan simbol/klaim asosiasi bank (QRIS/GoPay hanya sebagai **metode**, tanpa
  logo berlisensi — pakai `payment-method-logos.tsx` yang monokrom).
- Menjadikan checkout halaman berat: tanpa sidebar, tanpa FAB, tanpa chat widget.
