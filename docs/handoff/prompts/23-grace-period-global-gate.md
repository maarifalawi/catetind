# 23 — Grace Period & Post-Grace (gerbang read-only global)

**Paket:** state global lintas halaman · **Fase 7** · **Depends on:** #14 (`lib/data/renewal.ts` sudah ada) · **Task paling besar di daftar ini**

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Bukti gap

Inventaris menyebut tiga state yang **belum ada sama sekali**:

| State | Di mana | Isi yang diminta |
|---|---|---|
| **III — Grace Period Read-Only** | Semua halaman app | banner atas, **semua tombol input di-disable**, tanaman "sleep mode" (greyscale, mata tertutup) |
| **IV — Post-Grace Period** | Semua halaman app | data **TIDAK dihapus**; banner berubah + tombol perpanjang |
| **VI — Tanaman Sleep Mode** | Home (saat grace) | greyscale + mata tertutup |

Saat ini hanya ada **modal Renewal di H-1** (prompt 14) — setelah masa aktif habis,
aplikasi tetap berperilaku normal, jadi "read-only" baru janji di ToS & modal.

## Peta baca

**PRD:**

- **4503–4548** — renewal flow lengkap; bagian **grace** ada di baris **4536–4542**:
  *app masih bisa dibuka · data & histori tetap bisa diakses (READ-ONLY) · input
  transaksi baru DIBLOKIR · banner atas: "Masa aktifmu sudah habis. Perpanjang untuk
  mulai catat lagi. Datamu aman, gak hilang 💚" · tanaman mode "tidur"*
- **4544–4547** — **post-grace**: masih read-only, **data tidak pernah dihapus**,
  banner berubah: *"Yuk kembali kapan aja kamu siap. Semua datamu masih tersimpan aman di sini 🌱"*
- **4505–4509** — prepaid manual, tanpa auto-charge; trust badge (bahan copy banner)
- **1975–1985** — degradation & recovery: nada bahasa saat tanaman "tidak dirawat"
- **1989–2033** — implementasi teknis tanaman (HP **tidak pernah** ditampilkan sebagai angka)

**Inventaris:** baris 134–137 (state III, IV, VI).

**Kode acuan (jalur ekstensi yang sudah ada):**

- `lib/data/renewal.ts` — `RenewalState`, `shouldShowRenewalModal()`, marker localStorage
- `hooks/use-renewal-reminder.ts` — hook kondisi saat ini (tempat menambahkan `phase`)
- `components/catetind/money-context-provider.tsx` + `privacy-provider.tsx` — **pola provider
  di `app/layout.tsx`** yang harus ditiru
- `components/catetind/home-banner.tsx` — pola banner + dismiss per slot
- `components/catetind/plant-widget.tsx` / `plant-illustration.tsx` — tanaman (tambah varian "tidur")
- `components/MobileBottomNav.tsx` (FAB) & `components/catetind/desktop-sidebar.tsx` (tombol Tambah)
  — **dua pintu masuk input** yang harus dikunci
- `components/catetind/renewal-modal.tsx` — CTA perpanjang yang sudah jadi (dipakai ulang dari banner)

## Kenapa ini penting (psikologi)

Ini **momen paling rawan churn** di seluruh produk. Dua aturan yang tidak boleh dilanggar
(CONTEXT-WAJIB §5.3 no.1 & no.3):

1. **Jangan menakut-nakuti.** Dilarang keras copy seperti *"data kamu akan dihapus"* —
   PRD menegaskan data **tidak pernah** dihapus (saat grace maupun setelahnya).
2. **Jangan mengunci app.** User tetap bisa **membaca** semua catatannya; yang terkunci
   hanya **menambah data baru**. Tanaman "tidur" (bukan mati, bukan merah) adalah cara
   mengekspresikan status ini tanpa menghukum.

## Yang harus dibangun

1. **Fase langganan di `lib/data/renewal.ts`** (satu sumber, murni):
   - `type SubscriptionPhase = 'active' | 'grace' | 'post_grace'`
   - `resolvePhase(state, marker)` → phase + `daysInGrace` / `daysSinceExpiry`
   - `GRACE_DAYS = 7` (eksplisit, dapat diuji)
   - `BANNER_COPY` = teks **verbatim** PRD 4540–4541 (grace) & 4546–4547 (post-grace) + label CTA
   - `SUBSCRIPTION_DEMO_PHASE` (konstanta di atas file, **default `'active'`**) supaya state ini
     bisa ditinjau tanpa menunggu 7 hari — tulis jelas di komentar bahwa ini hanya untuk demo/review.
2. **Provider di root** — `components/catetind/subscription-gate-provider.tsx` (pola sama seperti
   `MoneyContextProvider`), mengekspor `useSubscriptionGate()` → `{ phase, inputLocked }`.
   Pasang di `app/layout.tsx`.
3. **`components/catetind/subscription-banner.tsx`** — banner sticky atas, hanya dirender bila
   `phase !== 'active'`, dengan tombol `Perpanjang` yang membuka `RenewalModal` yang sudah ada.
   **Penting:** jangan tampil di halaman **publik/pre-app** (`/login`, `/login/verify`,
   `/checkout`, `/privacy`, `/terms`, `/join/*`, `/share/*`, `/install`, `/app/onboarding`) —
   pakai `usePathname()` sebagai guard, dan jelaskan alasannya di komentar (user yang tidak bisa
   login harus tetap bisa membayar & membaca dokumen legal).
4. **Kunci input di TITIK MASUK, bukan di semua tombol** (keputusan desain penting):
   - FAB `MobileBottomNav` + tombol Tambah `desktop-sidebar` → saat `inputLocked`: non-aktif
     dengan copy singkat *"Perpanjang dulu buat catat yang baru 🌿"*.
   - Sheet/modal input yang sudah terbuka → masih boleh dilihat/ditutup, tapi tombol simpan
     diblokir. **Cara paling aman & murah:** satu prop/hook di `transaction-input-engine`
     + sheet-sheet tambah; **jangan** menyentuh setiap tombol di setiap layar.
   - Laporkan daftar titik yang kamu kunci (harus lengkap untuk semua tombol simpan/tambah).
5. **Tanaman sleep mode (state VI)** — varian "tidur" di `plant-widget.tsx` / `plant-illustration.tsx`
   (greyscale + mata tertutup), dipakai saat `inputLocked`. **Tanpa angka HP.**
6. **Data tetap terbaca** — verifikasi `/history`, `/wallet`, `/budget` masih menampilkan data &
   saldo normal saat grace (bukan layar kosong/blur).
7. **Copy** semua di `lib/data/renewal.ts`; nol string copy di JSX.

## Acceptance criteria

- [ ] `SUBSCRIPTION_DEMO_PHASE='grace'` → banner muncul di halaman app, FAB & tombol tambah terkunci, tanaman tidur, **data tetap terbaca di semua halaman**.
- [ ] `'post_grace'` → copy banner berubah persis PRD 4546–4547, data masih utuh & masih terkunci.
- [ ] `'active'` → **regresi nol**: tanpa banner, tanpa tombol terkunci, tanaman normal.
- [ ] Banner **tidak** muncul di `/login`, `/checkout`, `/privacy`, `/terms`, `/join/*`, `/share/*`, `/install`, `/app/onboarding`.
- [ ] Tidak ada satu pun copy yang menyebut data akan hilang/dihapus.
- [ ] Tombol `Perpanjang` di banner membuka `RenewalModal` yang ada (bukan alur kedua).
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Menghapus/menyembunyikan data user dalam bentuk apa pun.
- Memblokir **pembacaan** data (hanya input yang dikunci).
- Menaruh gerbang di halaman publik (tidak boleh mengunci user di luar app-nya sendiri).
- Menampilkan angka HP/streak sebagai bentuk hukuman.

