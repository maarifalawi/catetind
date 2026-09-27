# 🧭 CONTEXT WAJIB — CatetInd

> **Baca file ini SAMPAI HABIS sebelum menulis satu baris kode pun.**
> Setiap task halaman baru (`docs/handoff/prompts/*.md`) mengasumsikan file ini
> sudah dibaca. Isinya bukan saran — ini kontrak kerja repo ini.

---

## 0. Cara pakai (untuk agent yang mulai di task BARU)

1. Baca **file ini** sampai habis.
2. Baca **prompt halaman** yang ditugaskan (`docs/handoff/prompts/NN-*.md`) —
   di dalamnya ada daftar section PRD yang wajib dibaca.
3. Baru baca PRD-nya (bagian yang disebut, jangan seluruh 7.000 baris).
4. Tulis rencana singkat (file apa yang dibuat/diubah), lalu implementasi.
5. Jalankan **checklist validasi (§8)** dan laporkan hasilnya apa adanya.

---

## 1. Apa proyek ini

- **CatetInd** — aplikasi pencatatan keuangan personal (personal finance tracker)
  AI-native untuk **Gen-Z & first-jobber Indonesia**.
- Ini **repo DESIGN/DEMO**: seluruh data masih **mock** di `lib/data/*` dan
  `lib/wallets.ts`. Tidak ada backend, tidak ada Supabase, tidak ada auth nyata.
  Artinya: **jangan** menambah dependency server, jangan bikin API baru kecuali
  sudah ada polanya (`app/api/*`), dan **jangan** mengarang integrasi yang tidak
  bisa jalan di demo.
- Stack: **Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + TypeScript**,
  package manager **pnpm**. UI primitif: `components/ui/*` (shadcn-style),
  `vaul` (bottom sheet/Drawer), `framer-motion` (animasi), `lucide-react` (ikon),
  `recharts` (chart), `sonner` (toast), `lenis` (smooth scroll).
- Bahasa produk & kode: **Indonesia** (copy user-facing santai-hangat; komentar
  kode bahasa Indonesia, menjelaskan *kenapa*, bukan *apa*).

---

## 2. Peta file & konvensi kode

| Lapis | Lokasi | Aturan |
|---|---|---|
| Route | `app/<segmen>/page.tsx` | **Tipis.** Hanya `metadata` + bungkus komponen screen. Contoh: `app/bills/page.tsx` |
| Screen | `components/catetind/<nama>-screen.tsx` | Isi halaman. `'use client'` kalau pakai state/handler |
| Sub-komponen | `components/catetind/<nama>-<bagian>.tsx` | Satu tanggung jawab, mis. `bill-card.tsx`, `joint-timeline.tsx` |
| Sheet/Modal | `components/catetind/add-*.tsx`, `*-sheet.tsx`, `*-modal.tsx` | Pakai `vaul` `Drawer` (mobile) — pola: `add-bill-sheet.tsx` |
| Data & logika murni | `lib/data/<domain>.ts` | **Tanpa React.** Semua angka + teks copy. Turunan dihitung di sini |
| Helper lintas halaman | `lib/*.ts` | mis. `lib/wallets.ts`, `lib/ai-quota.ts`, `lib/onboarding.ts` |
| Utilitas kecil | `lib/utils.ts` | `cn()` dari `clsx` + `tailwind-merge` |

Struktur halaman standar:

```tsx
// app/<segmen>/page.tsx  ← tipis
import type { Metadata } from 'next'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { XxxScreen } from '@/components/catetind/xxx-screen'

export const metadata: Metadata = {
  title: 'Judul Halaman — CatetInd',   // WAJIB: "<Nama> — CatetInd"
  description: '...',                   // 1 kalimat, bahasa Indonesia
}

export default function XxxPage() {
  return (
    <PhoneStage>
      <XxxScreen />
    </PhoneStage>
  )
}
```

Aturan shell (jangan dilanggar):

- `PhoneStage` (`bg-canvas` + watermark wordmark) → untuk halaman **app**.
- `ScreenShell` → WAJIB dipakai kalau halaman harus punya **sidebar desktop**
  (semua halaman dalam app: `/`, `/wallet`, `/history`, `/settings/*`, …).
  Artinya screen-nya berisi `<ScreenShell>…</ScreenShell>`, dan route-nya
  tetap dibungkus `PhoneStage`. Pola benar ada di `components/catetind/wallet-screen.tsx`.
- Halaman **publik/pre-app** (`/login`, `/checkout`, `/privacy`, `/terms`,
  `/join/[code]`, `/share/[id]`, `/install`, `/app/onboarding`) → **TANPA**
  sidebar global; pakai `PhoneStage` (+ `plain` untuk flow fokus).
- Judul halaman (H1) **satu resep**: `font-display text-3xl font-semibold tracking-tight text-ink lg:text-4xl`
  (jangan `font-black`, jangan lupa `font-display`).
- Layout lebar: desktop = grid 12 kolom (lihat `wallet-screen.tsx` / `home-screen.tsx`),
  mobile = 1 kolom. Breakpoint utama: `lg`. Selalu uji 375 / 768 / 1440 px.
- Semua route baru **wajib** punya tautan masuk yang nyata (nav/sheet/tombol).
  **Dilarang** meninggalkan halaman yatim yang tidak bisa dijangkau.

---

## 3. Warna & visual — ATURAN KERAS

Sumber kebenaran: `docs/theme/PALETTE.md` + blok `@theme inline` di `app/globals.css`.
Detail prompt penjaga: `docs/theme/AGENT-PROMPT.md`.

**DILARANG (pekerjaan akan ditolak):**
1. Menulis hex/`rgb()`/`rgba()`/`oklch()`/`hsl()` baru di komponen.
2. Memakai kelas warna bawaan Tailwind: `text-slate-500`, `bg-blue-600`,
   `text-white`, `bg-black`, `from-rose-100`, dst.
3. Memakai Ivory `#fbf6d9` sebagai permukaan (sudah dipensiunkan).
4. Memakai `bg-soil/[0.02]`–`[0.04]` sebagai border/isian (tak terlihat di putih).
5. Memakai Oat (`bg-sage`) untuk permukaan besar — Oat hanya untuk elemen kecil
   (chip/pill, lingkaran ikon, hover, kotak info).

**Dasar & permukaan:** halaman **dan** kartu = **PUTIH** — `bg-canvas` dan
`bg-cream`. Pemisah datang dari **hairline** `ring-soil/8`–`/16` + shadow
netral lembut, mis. `shadow-[0_18px_40px_-34px_rgba(0,0,0,0.55)]`.

**Makna warna (jangan ditukar):**

| Token | Arti |
|---|---|
| `ink` / `soil` (hitam) | teks, garis, scrim |
| `forest` / `forest-soft` (Evergreen) | permukaan gelap/brand: hero, muka kartu, sidebar |
| `mint` / `leaf` (Sage) | uang masuk, positif, progres |
| `hud-sage` (Olive) | status "aman / on-track" |
| `hud-amber` (Cantelope) | pengeluaran, "mendekati batas" |
| `hud-terracotta` / `plum` | "lewat batas", alert, kategori belanja |
| `thistle` | info, kategori netral |
| `brand` (Daisy) | pop terang: highlight, badge |

Teks di atas aksen terang = `text-ink`; di atas Evergreen/hitam = `text-cream`.
Teks sekunder = **opasitas** (`text-ink/45`–`/65`), bukan abu-abu baru.
Font hanya dua: Inter (body, default) + Plus Jakarta Sans (`font-display` untuk
judul, angka besar, metrik).

---

## 4. Bahasa & suara

- **Semua copy user-facing = bahasa Indonesia santai-hangat**, "lo/gue" hanya di
  konteks Minca (AI Coach) & Help Center; sisanya "kamu". Contoh kanon:
  `lib/data/help.ts`, `lib/data/referral.ts`, `lib/data/bills.ts`.
- **Suara Minca** (AI Coach): hangat, jujur, tidak menghakimi, bahasa sehari-hari.
  Contoh: *"Hai, gue Minca 🌱 Nggak perlu baca manual 200 halaman."*
- **Copy WAJIB tinggal di `lib/data/*`** (konstanta bernama, bukan string
  tersebar di JSX) supaya bisa diaudit & diganti sekali. Ini pola repo.
- Emoji tanaman 🌱🌿 dipakai hemat sebagai penanda nada, bukan hiasan.
- Angka uang **selalu** lewat formatter yang sudah ada — jangan `toFixed` sendiri.
  Ikuti helper formatter milik file data tetangga terdekat.

---

## 5. PROFIL PSIKOLOGIS AUDIENS (hasil riset PRD — WAJIB jadi dasar desain)

Sumber: `CatetInd_Master_PRD_Lengkap.md` — Domain 1 (positioning),
2A.4–2A.5 (micro-copy & insight), Domain 3 (psikologi habit),
5A/5E (monetisasi & regulasi), 4C (privasi).

### 5.1 Siapa mereka

> Gen-Z & first-jobber Indonesia yang **capek gajian-ke-gajian** dan
> **overwhelmed** sama kompleksitas app finansial (PRD baris 244).

Implikasi desain: mereka bukan ahli keuangan, **tidak** mau membaca, dan
**alergi** pada app yang terasa seperti kerja tambahan atau menghakimi.

### 5.2 Empat segmen yang harus dilayani satu layar

| Segmen | Kondisi | Konsekuensi desain |
|---|---|---|
| **First-jobber** | gaji tetap, baru mulai mencatat | jatah harian, habit loop, apresiasi |
| **Freelancer** | income tidak tetap | pacing berbasis sisa hari, mode dry spell (2B.3) |
| **Sandwich generation** | ada tanggungan keluarga | sinking fund + konteks "Keluarga" (2C) |
| **Pasangan muda** | uang bersama | Joint Wallet + privasi berlapis (2D) |

### 5.3 Lima prinsip psikologi yang tidak boleh dilanggar

1. **Nurturing, bukan punishing.** Warna "over budget" = soft terracotta
   (`hud-terracotta`), **bukan merah**. Copy penuh empati (PRD 649–651).
   Streak **tidak pernah reset ke 0** — ia "pause" (PRD 1778–1780).
   Notifikasi hari ke-1 skip **tidak ada**, memang sengaja (PRD 1987).
2. **Jangan pernah memberi false insight.** Insight baru muncul setelah ambang
   data minimum (7/15/30 transaksi — PRD 574–586). Selagi belum cukup, tampilkan
   kartu sabar: *"Aku lagi belajar pola keuanganmu. Terus catat ya…"* +
   progress bar `[7/30 transaksi]`. Ini celah kompetitif vs Fundy (PRD 572).
3. **Nol pemicu kecemasan finansial.** Tanpa auto-renew (PRD 4507), tanpa harga
   berubah-ubah, tanpa "dijamin hemat". Trust badge = selling point
   ("Tanpa auto-renew paksa — kamu yang pegang kendali", PRD 4509/4585).
4. **Reward variabel + milestone, bukan poin/badge/leaderboard.** Tiga jenis
   reward: Delayed (tanaman makin subur), Surprise (AI apresiasi 1 dari 5
   transaksi), Milestone (hari 7/14/21/30 → celebration) — PRD 1819–1823.
   Loss aversion (streak reset) **ditolak tim** — jangan dikembalikan.
5. **Privasi = trust, bukan fitur.** Data tidak bisa dilihat admin; support
   memakai *screenshot policy* (PRD 3435–3504). Setiap halaman yang menyentuh
   data orang lain (joint/family/share) **wajib** mengulang janji privasi.

### 5.4 Model perilaku yang dipakai

- **BJ Fogg**: Trigger → Routine → Reward. Trigger = rasa penasaran ("sisa jatah
  gue hari ini berapa?") + push kontekstual 12:30/19:00 WIB (bukan random).
- **Variable ratio**: AI apresiasi acak, timing tidak terduga.
- **Zero cognitive load & 4-Tap Strict Rule**: aksi primer maksimal 4 tap.
- **Progressive disclosure** untuk form kompleks (field muncul bertahap).

### 5.5 Ergonomi mobile (wajib dites di 375px & Safari iOS PWA)

- **Thumb zone**: aksi primer HANYA di **60% bawah** layar. Zona atas = display
  & tombol back. CTA sticky di **bawah**, bukan di header (PRD 2141–2145).
- Bottom nav 5 tab fixed (Home · Wallet · **FAB +** · Insight · Lainnya) —
  FAB di tengah = titik paling mudah dijangkau. Jangan tambah tab ke-6.
- Navigasi sekunder = **SATU sumber** (Vaul bottom sheet), jangan bikin jalur
  paralel seperti Fundy (PRD 596).
- Gesture yang sudah jadi bahasa produk: swipe kiri = hapus, swipe kanan = edit
  pada baris transaksi. Hormati `useReducedMotion`.

### 5.6 Copy yang DILARANG

- Menyalahkan/menakut-nakuti: "URGENT: streak kamu mau putus!", "Kamu gagal".
- Klaim berlebihan dari data tipis: "Kamu hemat 100%", "naik drastis" dari 1 data.
- Saran investasi/produk keuangan spesifik (urusan OJK). Wajib berbentuk
  "insight/informasi", dan untuk topik sensitif tambahkan disclaimer
  *"ℹ️ Ini informasi edukatif, bukan saran keuangan profesional."* (PRD 5075–5132).

### 5.7 Aturan privasi: yang **dibaca** disensor, yang **disunting** tidak

Keputusan produk (27 Sep 2026) — **jangan "diperbaiki"**:

- Tombol mata global (`usePrivacy()`) menyensor **permukaan yang dibaca**:
  kartu, daftar transaksi, riwayat, ringkasan, tooltip chart.
- Field **input/sheet yang sedang disunting** (mis. nominal di sheet edit aset,
  setor, tagihan, dompet) **TIDAK disensor**. Alasannya: user sedang mengurus
  datanya sendiri; angka tersembunyi di field editable berisiko bikin salah input
  (integritas data lebih penting daripada kosmetik), dan menyensor field membuat
  satu-satunya tempat user *butuh* melihat angka justru buta.
- Jadi: **"privasi menyensor yang terbaca, bukan yang disunting."** Satu aturan,
  berlaku rata di semua sheet — tidak perlu prop `masked` baru di `RupiahField`.
- Kandidat penyempurnaan (belum dikerjakan): nominal di **toast/ringkasan sesudah aksi**
  (mis. "Rp 250.000 disapu ke celengan") — itu pajangan yang tetap tinggal di layar,
  jadi layak ikut disensor kalau nanti diambil.

---

## 6. Peta baca PRD (jangan baca 7.000 baris)

Semua nomor = `CatetInd_Master_PRD_Lengkap.md`.

| Butuh | Baca di |
|---|---|
| Peta halaman & modal yang harus ada | `inventaris_ui_definitif.md` |
| Micro-copy & tone tiap state | 542–594 |
| Ambang data minimum insight | 574–590 |
| Navigasi sekunder / menu "Lainnya" | 594–639 |
| Budget & Daily HUD | 641–758 |
| Sinking Fund (celengan) | 809–865 |
| Joint wallet (invite, split, privat) | 871–992 |
| Investasi & hutang (DTI) | 992–1195 |
| Habit loop + reward | 1766–1830 |
| Tanaman (HP, tahap, milestone) | 1919–2034 |
| Ergonomi mobile + FAB + gesture | 2133–2290 |
| Privasi/RLS + screenshot policy | 3064–3504 |
| Renewal + One-Tap Renew + trust badge | 4503–4607 |
| Harga, token AI, Fuel Gauge | 4759–4937 |
| Disclaimer OJK (ToS, AI, footer) | 4982–5135 |
| Checkout 3 langkah + registrasi | 5887–5935 |
| Referral, share card, report shareable | 6470–6636 |
| Waitlist & pre-launch (DILUAR SCOPE) | 6134–6275 |

---

## 7. Alur kerja wajib

1. **Baca** `CONTEXT-WAJIB.md` (§1–§9) + prompt halaman + section PRD terkait.
2. **Baca kode tetangga** yang paling mirip (2–3 file) dan **ikuti** gaya,
   penamaan, dan pola komentarnya. Contoh acuan per jenis:
   - halaman + sidebar → `components/catetind/wallet-screen.tsx`
   - halaman detail + sheet → `components/catetind/wealth-screen.tsx`
   - data + copy → `lib/data/bills.ts`, `lib/data/referral.ts`
   - pencarian/filter + state → `components/catetind/help-center-screen.tsx`
3. **Rencana dulu** (3–8 baris): file baru/diubah + alasan. Baru menulis kode.
4. **Implementasi utuh** — tanpa `TODO`, tanpa placeholder "segera hadir",
   tanpa komponen kosong. Kalau sesuatu memang di luar scope V1 (mis. Properti
   per PRD A12), tulis alasannya di komentar dan tampilkan teaser yang jujur.
5. **Validasi** (§8) dan laporkan apa adanya, termasuk hal yang belum bisa
   diverifikasi.

---

## 8. Checklist validasi (WAJIB dijalankan, tempel hasilnya)

```bash
pnpm theme:audit          # penjaga palet — HARUS "palet bersih"
pnpm exec tsc --noEmit    # TypeScript — HARUS tanpa error
pnpm build                # build produksi — HARUS sukses
```

Tambahan manual sebelum melapor selesai:

- [ ] Halaman bisa dibuka tanpa error runtime; tidak ada hydration mismatch
      (angka/tanggal statis, pola repo: tanggal mock sudah diformat string).
- [ ] 375 px: tidak ada horizontal scroll; aksi primer di zona ibu jari;
      bottom nav tidak menutupi konten terakhir.
- [ ] 1440 px: grid rapi, sidebar desktop TIDAK hilang.
- [ ] Empty state ada (copy nurturing + CTA), error state ada.
- [ ] Semua tautan yang dibuat/diubah benar-benar menuju route yang ADA.
- [ ] `prefers-reduced-motion` dihormati pada animasi baru.
- [ ] A11y dasar: `aria-label` pada tombol ikon, `aria-current` pada nav aktif,
      fokus terlihat, kontras teks ≥ 4.5:1.
- [ ] Tidak ada string copy hardcoded di JSX — semua dari `lib/data/*`.

---

## 9. Definition of Done

Sebuah halaman dianggap SELESAI bila:

1. Route tipis + screen + sub-komponen + data mock mengikuti §2.
2. Semua isi yang diminta inventaris + PRD untuk halaman itu ada — termasuk
   **state** (empty/loading/error/grace) dan **modal** yang dipanggil halaman.
3. Bisa dijangkau dari navigasi nyata, dan halaman yang menautkannya tidak lagi
   menampilkan toast "segera hadir".
4. `pnpm theme:audit` bersih, `tsc` bersih, `pnpm build` sukses.
5. Laporan akhir memuat: file yang dibuat/diubah, keputusan desain yang diambil
   (dan alasannya), serta hasil tiga perintah validasi.



