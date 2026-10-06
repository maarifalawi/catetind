# 63 — TUTUP SEMUA CELAH `docs/STATUS-HALAMAN.md` (kecuali Midtrans & Waitlist)

**Jenis tugas:** multi-paket (bukan satu halaman). **WAJIB DISKUSI DULU** (Fase 0).
**Sumber kebenaran pekerjaan:** `docs/STATUS-HALAMAN.md` (§9 = daftar celah).

**SASARAN PRODUK (dari pemilik produk — ini yang mengalahkan PRD bila bertabrakan):**
1. **Tutup SEMUA celah** di `docs/STATUS-HALAMAN.md`.
2. **DATA REAL — TANPA seed/dummy.** Semua data uang user hidup di **Supabase**
   sebagai **satu-satunya sumber**. Data contoh di `lib/data/*` / `lib/wallets.ts`
   **tidak boleh lagi tampil sebagai milik user**. `lib/data/*` hanya boleh berisi
   **copy & konfigurasi statis** (warna, label, kategori, teks).
3. **Semua alur NYAMBUNG** — satu ledger & satu kebenaran lintas halaman. Catat
   sekali → tampil di semua tempat yang relevan.
4. **Tab Properti `/wealth` WAJIB** dibangun (keluar dari PRD A12).

**Tetap dikecualikan:** semua yang butuh **Midtrans** (tunggu ±5 hari) & semua yang
berhubungan dengan **Waitlist**.

**Batas jujur:** apa pun yang **tidak punya sumber nyata** (pembayaran/purchases/
reward referral) **tidak boleh dipalsukan** — tampilkan keadaan kosong / `belum aktif`
apa adanya, dan tandai jelas sebagai "menunggu Midtrans".

---

## 0. WAJIB DIBACA DULU (jangan lewati satu pun)
1. `docs/handoff/CONTEXT-WAJIB.md` — sampai habis (konvensi file, aturan warna,
   bahasa & copy, ergonomi mobile, peta PRD, Definition of Done).
2. `docs/STATUS-HALAMAN.md` — peta celah (§9) & deviasi yang disengaja (§10).
3. `docs/handoff/ROADMAP-HALAMAN.md` §3 — daftar yang SENGAJA tidak dikerjakan
   (jangan dianggap utang).
4. `inventaris_ui_definitif.md` — kanon 32 halaman / 22 modal / 15 state / 8 flow.
5. PRD `CatetInd_Master_PRD_Lengkap.md`, section: **266–470** (input & mode AI),
   **594–639** (navigasi), **2363–2780** (offline/optimistic), **2761–2967**
   (routing AI + system prompt), **4503–4607** (renewal/trust badge),
   **4759–4937** (kuota AI), **4982–5135** (OJK), **6470–6636** (referral & share).
6. **Kode acuan** (WAJIB baca 2–3 yang paling mirip sebelum menulis apa pun):
   - AI: `hooks/use-ai-chat.ts` · `lib/ai-chat.ts` · `lib/transaction-ai.ts` ·
     `lib/ai-quota.ts` · `lib/ai-usage-store.ts` · `lib/supabase/ai-usage-remote.ts` ·
     `components/catetind/ai-capture-bubble.tsx` · `ai-chat-widget.tsx` ·
     `settings-panel-preferences.tsx`
   - Share: `lib/data/share.ts` · `share-progress-panel.tsx` ·
     `share-achievement-card.tsx` · `app/share/[id]/page.tsx` · `weekly-recap-modal.tsx`
   - Harga: `lib/data/pricing.ts` · `app/checkout/page.tsx` · `snap-payment-sheet.tsx` ·
     `billing-panel.tsx`
   - Data/Supabase: `lib/money/*` · `lib/supabase/*` · `supabase/migrations/*`
   - Contoh route API: `app/api/wallets/route.ts` · `app/api/push/send/route.ts` ·
     `app/api/referral/validate/route.ts`

---

## FASE 0 — DISKUSI DULU (WAJIB; JANGAN TULIS KODE DULU)

Setelah membaca, keluarkan **lalu BERHENTI**:
- (a) **Rencana** tiap paket (3–8 baris) + **urutan pengerjaan** + dependensi.
- (b) **Daftar keputusan** yang kamu ambil + alasannya.
- (c) **Pertanyaan** yang benar-benar perlu jawaban pemilik produk.

**Jangan mengedit/menjalankan apa pun yang mengubah state** sampai user berkata
"lanjut". Dilarang memulai paket mana pun sebelum ada persetujuan eksplisit.

Pertanyaan minimum yang WAJIB kamu ajukan di Fase 0:
1. **Supabase (PALING KRITIS):** apakah project di `.env.local` sudah **live**, dan
   tabel + RLS + RPC dari `supabase/migrations/*` sudah **benar-benar dijalankan**?
   Seluruh sasaran "DATA REAL" bergantung penuh pada ini. Kalau belum → sebutkan
   langkah yang harus dijalankan lebih dulu dan **tahan Paket D**.
2. **Auth:** boleh **menonaktifkan sesi demo** supaya data benar-benar per-user lewat
   Supabase Auth (magic link)? (Wajib untuk "data real".)
3. **Status langganan user baru SEBELUM Midtrans ada** (butuh keputusanmu): kalau
   semua seed dibuang, user baru tidak punya baris langganan. Pilih: (a) beri baris
   **percobaan** yang tidak mengunci input, (b) buka gerbang langganan sampai Midtrans
   siap, (c) lain-lain.
4. **Gemini:** `gemini-2.5-flash` (teks + vision) sebagai default? Boleh menambah
   dependency (mis. `@google/genai`)?
5. **Urutan paket:** setuju dengan usulanmu, atau ada prioritas lain?

---

## 1. RUANG LINGKUP

### ✅ DIKERJAKAN
| Paket | Isi | Menutup |
|---|---|---|
| **A** | Mesin AI nyata (Gemini): chat, OCR, voice-parse, kategorisasi | §9.5 · modal b · state XI |
| **B** | Generator gambar **Share** (privacy-safe) | §9.6 · modal h · Key Flow #5 |
| **C** | `GET /api/price` + checkout dinamis | §9.4 · halaman #3 |
| **D** | **DATA REAL: Supabase satu-satunya sumber + wiring SEMUA modul + semua alur nyambung + HAPUS seed/dummy** | §9.8 + permintaan pemilik produk |
| **E** | Rail pembayaran/reward/live-feed + update status | §9.3/9.7/9.9 |
| **F** | **Tab Properti `/wealth` — WAJIB** | modal u · halaman #29 |

### 🛠️ RAIL SAJA (siap disambung saat Midtrans tiba — JANGAN pura-pura aktif)
- Pembayaran (checkout/top-up/upgrade/renew/cancel) → §9.3
- Reward referral otomatis → §9.7
- Live Purchase Feed real → §9.9

### ⛔ JANGAN DIBUAT SAMA SEKALI
- Halaman **waitlist** (inventaris #1) dan **semua turunannya**: posisi antrian,
  referral waitlist, **State XIV Early Access Checkout**, **Key Flow #7**.
  Jangan menambah route/komponen/copy apa pun tentang antrian/waitlist.

---

## 1b. PETA HALAMAN (biar agent TIDAK mengarang halaman baru)

**Fakta audit (`docs/STATUS-HALAMAN.md` Tabel A):** SELURUH **32 route inventaris
sudah ada** di `app/**`, **kecuali** tiga hal di bawah. Jadi task ini **TIDAK
membuat halaman/route baru apa pun** — semua pekerjaan menyentuh **bagian dalam
halaman yang sudah ada** (section, modal/sheet, state, flow, & backend di baliknya).

| Halaman | Status | Keputusan untuk task ini |
|---|---|---|
| **#1 Pre-Launch Waitlist** (+ posisi antrian, State XIV, Key Flow #7) | ❌ belum ada | **JANGAN dibuat** — dikecualikan oleh pemilik produk. |
| **Tab 2 Properti `/wealth`** (bagian dari #29, modal `u`) | ❌ masih teaser | **WAJIB dibangun** → **Paket F** (keluar dari PRD A12 atas permintaan pemilik produk). |
| **Admin Dashboard** (PRD Domain 4C, di luar inventaris 32) | ❌ tidak ada | **DI LUAR SCOPE** — jangan dibuat (back-office "ZERO Individual Access"). |

**Contoh yang SUDAH ada (jangan dibangun ulang):** `/`, `/welcome`, `/checkout`,
`/registered`, `/login`(+`/verify`), `/app`, `/app/onboarding`, `/wallet`(+`[id]`),
`/history`, `/insight`(redirect), `/budget`(+`[id]`), `/bills`, `/calendar`,
`/joint`, `/join/[code]`, `/wealth`, `/referral`, `/share/[id]`, `/help`,
`/install`, `/privacy`, `/terms`, seluruh `/settings/*`, dan `not-found`.

**Aturan:** kalau kamu merasa "perlu" membuat route halaman baru, **BERHENTI dan
tanyakan dulu di Fase 0** — jangan langsung bikin. Halaman yang **sudah ada** tapi
belum sempurna (checkout, share, billing, wealth, referral) diperbaiki **di tempat**,
bukan diganti halaman baru.

---

## 2. PAKET A — Mesin AI nyata (Gemini)  · tutup §9.5

**Tujuan:** menggantikan SEMUA mock AI dengan panggilan **Gemini** nyata, **tanpa
mengubah UI** (seam sudah disiapkan di `hooks/use-ai-chat.ts` & `lib/transaction-ai.ts`).

- **Env (server-only, JANGAN `NEXT_PUBLIC_`):** `GEMINI_API_KEY`, opsional
  `GEMINI_MODEL_TEXT` (default `gemini-2.5-flash`), `GEMINI_MODEL_VISION`
  (default `gemini-2.5-flash`). Tambahkan **nama** variabel ke `.env.example`
  (tanpa nilai).
- **Smoke test dulu (WAJIB):** sebelum membangun di atasnya, verifikasi key dengan
  1 panggilan kecil dari server. Kalau key tidak valid / formatnya aneh
  (format standar biasanya `AIza…`) → **laporkan apa adanya dan tahan Paket A**;
  jangan mengarang integrasi yang tidak bisa jalan.
- **`lib/ai/provider.ts` (server-only):** wrapper Gemini — `generateText()`,
  `generateFromImage()`, `generateJSON<T>()`. Ada timeout, 1× retry, normalisasi
  error → hasil bertipe (ok/err). Nol string user-facing di file ini.
- **`app/api/ai/text/route.ts`** (POST): `requireUser()` di baris pertama; rate
  limit; body `{ messages }` → balasan coach. System prompt dari PRD Domain 4B
  (2864–2967) + guardrail OJK (5042–5075).
- **`app/api/ai/ocr/route.ts`** (POST): gambar → Gemini vision → keluarkan bentuk
  `ExtractedTransaction` **yang sama** dengan `lib/transaction-ai.ts` (termasuk
  `confidence`, PRD A11). Penggantian mock → API tidak boleh menyentuh UI.
- **`app/api/parse-voice/route.ts`** (POST): teks hasil STT → `ExtractedTransaction`.
- **(opsional) `app/api/ai/categorize/route.ts`**: saran kategori; fallback
  rule-based bila provider error.
- **Wiring (jangan ubah UI):**
  - `hooks/use-ai-chat.ts`: ganti isi `aiReply()` dengan `fetch('/api/ai/text')`;
    **PERTAHANKAN** titik `recordAiUsage('chat')` (tempatnya tetap, di titik user
    mengirim); pakai state gagal yang SUDAH ada (`AI_CAPTURE_COPY.saveFailed`).
  - `lib/transaction-ai.ts` + `components/catetind/ai-capture-bubble.tsx`: OCR &
    voice memanggil route nyata; pertahankan `recordAiUsage('ocr'|'voice')`.
- **Jujur saat gagal:** tanpa key / kuota habis / provider error → pakai copy yang
  sudah ada (`AI_QUOTA_EXHAUSTED_COPY`, `AI_STATUS_COPY`) dan tetap berguna
  (jawaban berbasis aturan + input manual). **JANGAN** mengarang balasan AI palsu.
- **Privasi (PRD 2111):** semua panggilan server-side; jangan kirim data user lain;
  untuk apresiasi kirim **agregat**, bukan transaksi mentah.
- **Test (vitest):** pemetaan error provider (fetch di-mock), guard `401` tanpa
  sesi, jalur kuota habis, bentuk keluaran OCR = `ExtractedTransaction`.

---

## 3. PAKET B — Generator gambar Share (privacy-safe)  · tutup §9.6

**Tujuan:** menghidupkan Key Flow #5 & modal h: kartu bisa dijadikan gambar untuk
dibagikan, **tanpa satu pun angka keuangan**.

- Pakai `next/og` (`ImageResponse`) — **tanpa layanan luar**.
- Isi **privacy-safe**: hanya bagian aman sesuai `lib/data/share.ts`
  (PRD 6572–6576, 6547–6620). Nama boleh, **nominal dilarang**.
- Rute gambar: `app/share/[id]/opengraph-image.tsx` **dan** `twitter-image.tsx`
  (OG 1200×630) **+** rute Story **1080×1920** (mis. `app/api/share/[id]/image/route.tsx`).
- Isi `openGraph.images` / `twitter.images` di `app/share/[id]/page.tsx`
  (komentar "sengaja kosong" DIGANTI karena sekarang gambarnya nyata).
- Tombol **"Share Report"** di alur recap (modal h / `weekly-recap-modal`): pakai
  Web Share API (`navigator.share`) dengan berkas gambar; fallback = unduh. Hanya
  bagian privacy-safe yang diekspor (PRD 6621–6633).
- Semua copy di `lib/data/share.ts` (nol string di JSX).

---

## 4. PAKET C — `GET /api/price` + checkout dinamis  · tutup §9.4

- `app/api/price/route.ts` → `{ tier, priceLabel, priceNumber, slotSold,
  slotsLeft, isDynamic }`.
- Sumber: tabel `pricing_state` bila Supabase live; kalau tidak, dari
  `lib/data/pricing.ts` (**satu sumber**) dengan `isDynamic:false` yang jujur.
- `/checkout`: nyalakan `export const dynamic = 'force-dynamic'` + fetch
  `cache: 'no-store'`; **tetap sediakan fallback SSR** ke harga statis supaya first
  paint tidak kosong, dengan catatan jujur saat dinamis tidak tersedia.
- Pastikan angka **landing + checkout + billing** berasal dari satu sumber.

---

## 5. PAKET D — DATA REAL (Supabase satu-satunya sumber) + semua alur nyambung

**Sasaran:** aplikasi **tidak lagi menampilkan data contoh sebagai milik user**.
`lib/data/*` & `lib/wallets.ts` hanya boleh berisi **copy/konfigurasi statis**
(warna, label, daftar kategori, teks) — **bukan** saldo/transaksi/dompet/celengan/
tagihan/hutang/investasi. Semua data uang user hidup di **Supabase**.

Langkah:
1. **Probe & siapkan Supabase (KRITIS — lakukan paling dulu):**
   - Verifikasi `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` benar.
   - Jalankan/verifikasi migrasi: `pnpm supabase:migrate` lalu `pnpm supabase:verify`.
   - Kalau **belum live / migrasi gagal** → **BERHENTI & laporkan**. Paket ini
     **tidak boleh** dikerjakan setengah jalan yang membuat app rusak.
2. **Auth nyata:** aktifkan Supabase Auth (magic link). **Nonaktifkan sesi demo**
   (`lib/session.ts`, jalur "Lanjut masuk (demo)", cookie sesi manual). Identitas
   WAJIB dari `auth.uid()`.
3. **Satu ledger untuk semua halaman:** transaksi/dompet/celengan/tagihan/hutang/
   investasi/aset fisik dibaca & ditulis lewat satu lapisan akses Supabase
   (`lib/supabase/*`, RLS `user_id = auth.uid()`). Ganti pembaca seed di `/app`,
   `/history`, `/wallet`, `/budget`, `/bills`, `/calendar`, `/wealth`, `/joint`
   agar membaca **sumber yang sama**. **Semua alur harus NYAMBUNG**: catat sekali →
   muncul di semua halaman terkait (Home, Riwayat, Dompet, Budget, Kalender, Wealth).
4. **Hapus/gate seed di runtime:** `WALLET_SEED`, `INITIAL_SINKING_FUNDS`,
   `HISTORY_TRANSACTIONS`, seed joint/wealth/bills/budget, `INITIAL_*`, dsb.
   **Tidak boleh** dirender sebagai milik user. Kalau perlu untuk test, pindahkan ke
   **fixture test** (`*.test.ts` / `lib/data/fixtures/*`) — **tidak** ikut ke UI.
5. **Empty state = keadaan NORMAL** untuk user baru (mereka mengisi sendiri lewat
   `/app/onboarding`). Pastikan empty state tiap halaman rapi + ada CTA.
6. **Fail-loud & jujur:** kalau koneksi/Supabase gagal → tampilkan error state yang
   jelas; **JANGAN** diam-diam jatuh kembali ke data contoh.
7. Perbarui test yang mengunci angka seed (mis. `joint.test.ts`) agar mengikuti
   sumber baru; pastikan `pnpm test` tetap hijau.

---

## 6. PAKET E — Rail pembayaran/reward/live-feed (seam) + verifikasi

**Rail (JANGAN pura-pura aktif; semua fail-closed & berbalas 503 jujur):**
- `lib/payments/types.ts` + `lib/payments/midtrans.ts`; env `MIDTRANS_SERVER_KEY`
  (kosong → route balas **503** "pembayaran belum aktif").
- Skeleton `app/api/payment/create/route.ts` + `app/api/payment/webhook/route.ts`
  (verifikasi signature **bila** key ada; kalau tidak → 503).
- Ledger reward referral + fungsi idempoten `grantReferralReward()` + rute
  `app/api/referral/reward/route.ts` yang kelak dipanggil webhook. Tanpa pembayaran,
  ledger tetap **kosong secara jujur**.
- `app/api/pricing/recent-purchases/route.ts` → baca `purchases` bila live; kalau
  tidak balas `{ items: [], firstHere: true }` (PRD A10: **jangan fabrikasi**).

> Karena data sekarang **REAL**, tabel `user_subscriptions` / `purchases` /
> `referrals` dibaca **apa adanya**. Tanpa Midtrans isinya **kosong** — dan itu
> keadaan yang **BENAR** (tidak dipalsukan). Jangan menambal dengan data contoh.

**Verifikasi + status:**
- Pastikan **tidak** ada tautan mati / toast "segera hadir".
- Perbarui `docs/STATUS-HALAMAN.md`: tandai yang selesai, dan cantumkan eksplisit
  apa yang **tinggal menunggu Midtrans**.

---

## 7. PAKET F — Tab Properti `/wealth` (WAJIB)  · tutup modal u & halaman #29

Tab 2 "Properti & Aset Fisik" **WAJIB dibangun** (keluar dari PRD A12 atas permintaan
pemilik produk). Ganti teaser `PROPERTY_V1_COPY` dengan fitur nyata:

- **Tab 1 Investasi** — sudah ada; pastikan baca **data real** (Paket D).
- **Tab 2 Properti & Aset Fisik** (baru) — list aset (Nama, Kategori, Harga beli,
  Nilai sekarang, selisih ±) + **modal Tambah** (inventaris modal `u`) + edit +
  hapus. Kategori: Rumah, Tanah, Kendaraan, Logam mulia, Perhiasan, Lainnya.
- **Tab 3 Hutang/Piutang** — sudah ada; pastikan data real.
- Aset fisik **ikut dihitung ke Total Kekayaan / Net Worth** (rumus satukan dengan
  tab investasi & hutang).
- Simpan ke tabel Supabase (mis. `physical_assets`) + migrasi + RLS bila belum ada.
- Semua copy di `lib/data/wealth.ts` (nol string di JSX). Hapus komentar "di luar V1"
  yang kini tidak berlaku.

---

## 8. ATURAN TEKNIS (konvensi repo — WAJIB)
- Route tipis + screen + sub-komponen + data (pola §2 `CONTEXT-WAJIB`).
- **DILARANG menampilkan seed/dummy sebagai milik user** (lihat Paket D). `lib/data/*`
  untuk **copy & konfigurasi statis SAJA**; data uang user hidup di Supabase.
- Semua copy user-facing **Bahasa Indonesia** di `lib/data/*` (nol string di JSX).
- Warna **HANYA** dari token palet (`docs/theme/PALETTE.md`).
- DILARANG `TODO`, placeholder "segera hadir", komponen kosong.
- Jangan mengubah keputusan bisnis (mis. angka harga) tanpa persetujuan.
- Hormati `prefers-reduced-motion`; a11y (aria-label, fokus terlihat, kontras ≥ 4.5:1).

---

## 9. KEAMANAN
- `GEMINI_API_KEY` & `MIDTRANS_SERVER_KEY` HANYA di `.env.local`, **server-side**,
  TIDAK pernah `NEXT_PUBLIC_*`, TIDAK di-commit. Perbarui `.env.example` dengan
  **nama** variabel saja.
- Jangan menaruh key di kode, komentar, atau test.

---

## 10. VALIDASI (wajib — tempel hasilnya apa adanya)
```
pnpm theme:audit
pnpm exec tsc --noEmit
pnpm build
pnpm test
```
\+ cek manual: buka tiap halaman yang disentuh tanpa error/hydration mismatch;
375px & 1440px; tiap tautan menuju route yang **ADA**.

---

## 11. LAPORAN AKHIR (format wajib)
- Paket yang **selesai** / **ditunda** + alasannya.
- File dibuat/diubah (kelompok per paket).
- Keputusan + alasan.
- Hasil 4 perintah validasi apa adanya (termasuk yang gagal).
- Yang **BELUM** bisa diverifikasi (jujur).