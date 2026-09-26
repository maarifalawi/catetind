# 21 — Kuota AI: Satu Sumber Kebenaran

**Paket:** konsistensi data lintas halaman · **Fase 7** · **Depends on:** —

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Bukti gap (hasil audit — angka berbeda cerita di 3 tempat)

| Lokasi | Angka sekarang |
|---|---|
| `lib/ai-quota.ts:17-19` | token **11.900 / 5.000.000** · voice **13 dtk / 6 jam** · plan `'CatetInd+'` |
| `components/catetind/billing-panel.tsx:132/139/146` | limit panggilan **150 / 60 / 500** |
| `lib/legal/terms.ts` (prompt 13) | sudah memakai angka **PRD**: 200 chat · 100 OCR · 800 kategorisasi · **601.500 token** |
| PRD 4776–4786 | **kanon**: 800 kategorisasi · 200 chat · 100 OCR · **150 voice** · 10 appreciation · 5 recap = **~1.265 calls / ~601.500 token** |

Jadi kartu "Bahan Bakar AI" (sidebar), halaman `/settings/billing`, dan dokumen
`/terms` saat ini **bertiga berbeda** — persis masalah yang PRD 4594 sebut harus dihindari
("Harga Konsisten & Transparan" → diperluas ke kuota).

## Peta baca

**PRD:**

- **4774–4788** — **Base Quota** per aktivitas + total (tabel kanon)
- **4790–4798** — **Add-on paket**: Receh Rp19.000/200.000 token · Sedang Rp29.000/400.000 ·
  Gede Rp49.000/800.000 (+ catatan naming kasual "Receh/Sedang/Gede" = tone Gen-Z)
- **4800–4802** — **Reset: tanggal 1 tiap bulan (BUKAN rolling)**; **add-on TIDAK hangus**
- **4892–4937** — **AI Usage Meter UI "Fuel Gauge"**: framing SISA, bukan limit
- **4759–4773** — 5C Perspektif tim (kenapa add-on & kenapa tidak ditekan-tekan)

**Inventaris:** baris 57 (#18 Langganan & Billing) — *"AI Token Fuel Gauge (progress bar:
base quota vs add-on, tanggal reset), tombol beli AI Token add-on"*.

**Kode acuan:**

- `lib/ai-quota.ts` — helper sudut pandang (`compactNumber`, `usedPercent`,
  `remainingPercent`, `estimateRecords`, `formatDuration`) — **pertahankan** semuanya
- `components/catetind/ai-fuel-card.tsx` — kartu sidebar (konsumen utama)
- `components/catetind/billing-panel.tsx` — `FUEL_METERS` mock + kartu paket
- `components/catetind/top-up-modal.tsx` — 3 paket add-on (19k/29k/49k)
- `lib/data/referral.ts:19` (`remainingPercent` dipakai lintas halaman) — jangan dirusak

## Kenapa paket ini ada

Kuota AI adalah **produk yang dijual**. Kalau sidebar bilang "sisa 4,99 jt token" sementara
ToS bilang 601.500 token, user melihat dua kebenaran sekaligus — dan itu merusak klaim
positioning kita ("jujur di setiap klaim yang ditampilkan ke user", PRD 244).

Psikologi kuota (PRD 4892+): selalu tampilkan **sisa**, jangan kata "habis/limit",
jangan warna merah. Gauge ini harus terasa seperti tangki bensin, bukan teguran.

## Yang harus dibangun

1. **Jadikan `lib/ai-quota.ts` satu-satunya sumber angka** — pindahkan **data** (bukan
   hanya formatter) ke sana, semuanya dari PRD:
   - `AI_BASE_QUOTA`: rincian per aktivitas (label + calls + est. token) **persis tabel
     PRD 4778–4786**, plus totalnya **diturunkan dengan `reduce`** (jangan tulis 601.500
     sebagai angka manual — turunkan, lalu buktikan hasilnya sama via komentar).
   - `AI_ADDON_PACKAGES`: Receh/Sedang/Gede beserta harga **dan** tokennya (PRD 4790–4796).
   - `AI_RESET_RULE_COPY`: *"Kuota dasar di-reset tanggal 1 tiap bulan. Token add-on tidak
     hangus."* (PRD 4800–4802).
   - `AI_USAGE` (mock terpakai) — satu tempat, dan `remainingPercent()`/`estimateRecords()`
     tetap dipakai untuk menampilkan **sisa + "≈ N catatan lagi"**.
   - **Voice**: PRD menghitung **calls**, bukan jam. Ubah framing jam → calls (kanon PRD);
     kalau tetap ingin menampilkan satuan waktu, turunkan dari calls dengan asumsi durasi
     yang **ditulis di komentar**, dan jangan mengganti angka PRD.
2. **Semua konsumen membaca dari sana**:
   - `components/catetind/ai-fuel-card.tsx` (sidebar) & `billing-panel.tsx` `FUEL_METERS`
     → hapus limit mock 150/60/500, ganti turunan `AI_BASE_QUOTA`/`AI_USAGE`.
   - `top-up-modal.tsx` → paket & token dari `AI_ADDON_PACKAGES` (tidak ada angka di JSX).
   - `billing-panel.tsx` menampilkan **base vs add-on** terpisah + tanggal reset
     (inventaris #18) dan framing **sisa**.
3. **Verifikasi silang**: `/terms` (yang sudah memakai angka PRD) **tidak boleh berubah**
   setelah perubahan ini — kalau ada selisih, yang salah adalah kode, bukan ToS.
4. **JANGAN menyentuh harga paket langganan** (`lib/data/pricing.ts`):
   tier 49k/109k/199k per tahun vs angka PRD (bulanan Rp49.000 / tahunan Rp399.000) adalah
   **keputusan pemilik produk** yang masih terbuka (lihat `ROADMAP-HALAMAN.md` §3). Kalau
   kamu menemukan kontradiksi di laporan saja, JANGAN ubah angkanya.
5. **Copy** semua di `lib/ai-quota.ts` / `lib/data/pricing.ts`; hapus angka yang
   masih tersebar di JSX.

## Acceptance criteria

- [ ] `grep` untuk `150`, `60`, `500`, `5_000_000` pada `billing-panel.tsx`, `ai-fuel-card.tsx`,
      `top-up-modal.tsx`, `lib/ai-quota.ts` → hanya berasal dari turunan PRD (jelaskan di laporan).
- [ ] Sidebar, `/settings/billing`, dan `/terms` menampilkan **angka yang sama**.
- [ ] Gauge menampilkan **sisa** + tanggal reset + pemisahan base vs add-on; tanpa kata
      "habis/limit" dan tanpa warna merah.
- [ ] Total token **diturunkan** dari tabel (bukan konstanta manual) dan hasilnya 601.500.
- [ ] Tidak ada perubahan harga paket langganan.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Mengubah dokumen `/terms` agar "cocok" dengan mock lama (ToS mengikuti PRD).
- Menyalin angka kuota ke komponen baru.
- Menambah dependency atau memanggil API usage nyata.
