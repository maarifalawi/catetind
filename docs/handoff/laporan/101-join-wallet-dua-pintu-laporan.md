# Laporan paket 101 — Join Wallet: dua pintu (buat / gabung) & sinkron nyata

**Halaman:** `/joint` (pilihan + form kode), `/join/[code]` (tetap), Pengaturan → Dompet Bersama
**Migrasi:** `20261030120000_catetind_join_claim.sql` (diterapkan), `20261104120000_catetind_joint_roster_join_date.sql` (baru)

## 1. Keluhan yang ditutup

> "Aku sudah bikin dompet join wallet, kodenya `H9FKJF`. Di akun ke-2 aku nggak tahu
> input kodenya di mana. Harusnya ada dua pilihan: buat dompet, dan gabung dompet
> (tinggal masukin kode)."

## 2. Temuan (dengan bukti)

| # | Bukti | Akibat yang dilihat user |
|---|-------|--------------------------|
| 1 | `invite_codes`, `joint_wallets`, `joint_members` **0 baris** di database padahal akun 1 sudah "membuat dompet" | Kode `H9FKJF` hanya hidup di `localStorage` perangkat pengundang — akun 2 mustahil memakainya |
| 2 | `supabase_migrations.schema_migrations` berhenti di `20261029150000`; `catetind_ensure_joint_pocket` & `catetind_join_state` **tidak ada**, dan `catetind_accept_invite` masih versi 2 kolom | `ensureJointPocketRemote()` selalu gagal → kode tidak pernah dikirim ke server; tombol gabung tidak bisa membedakan `joined`/`member`/`creator` |
| 3 | `components/catetind/joint-screen.tsx` hanya merender `JointInviteFlow` ("Buat Dompet & Ajak Pasangan") saat pasangan belum ada | Sisi B tidak punya tempat memasukkan kode di dalam aplikasi; satu-satunya jalan adalah tautan `/join/<kode>` dari chat |
| 4 | `catetind_joint_roster` memakai `order by m.created_at` padahal kolomnya `joined_at` (**42703**) | RPC gagal-sunyi → nama pasangan SELALU "Pasangan" di kedua perangkat |
| 5 | `NEXT_PUBLIC_DEMO=1` menyala di `.env.development.local` | Seed persona demo & middleware longgar ikut aktif saat dev |

## 3. Yang dikerjakan

### 3.1 Database (nyata, bukan simulasi)

1. **Migrasi diterapkan:** `20261030120000_catetind_join_claim.sql`, `20261101120000_catetind_realtime_lengkap.sql`, `20261101130000_catetind_user_settings_prefs.sql`.
2. **Kode `H9FKJF` dipulihkan sebagai baris server:** satu `joint_wallets` milik akun Bagas (`83e235c9-438e-4834-af3a-f1598b9719ba`), baris `joint_members` (`role = 'owner'`), dan satu `invite_codes` (`used_by = NULL`, berlaku 24 jam).
3. **Migrasi baru** `20261104120000_catetind_joint_roster_join_date.sql`: `order by m.joined_at`, dan nama kosong dikembalikan `null` (bukan `'Kamu'`) supaya pasangan tanpa nickname tidak tampil sebagai "Kamu".

### 3.2 Aplikasi

| Berkas | Perubahan |
|--------|-----------|
| `components/catetind/joint-join-flow.tsx` **(baru)** | `JointEntryChoice` (dua kartu: **Buat dompet baru** / **Gabung pakai kode**) dan `JointJoinCodeForm` (input 6 karakter, auto-uppercase, error dari server, state "Menghubungkan…") |
| `lib/money/joint-store.ts` | `joinJointPocketByCode()` — memanggil RPC `catetind_accept_invite`, lalu `attachRemoteJoint()` (uuid dompet, roster, catatan, realtime). Hasil dibedakan `joined`/`member`/`creator`; gagal = pesan server, bukan klaim sukses |
| `components/catetind/joint-screen.tsx` | state `entryMode` (`choice`/`create`/`join`); prop `initialEntry`; blok kantong aktif tidak berubah |
| `app/joint/page.tsx` | `?kode=1` → langsung membuka form kode (dibaca di server, Next 16 `searchParams` Promise) |
| `components/catetind/settings-panel-account.tsx` | tautan sekunder "Punya kode dari pasangan? Gabung di sini" → `/joint?kode=1` |
| `components/catetind/joint-invite-flow.tsx` | **server-first**: baca kode AKTIF dari `invite_codes` lalu pakai ulang (tidak mencabut kode yang sudah dibagikan); tombol Bagikan/Salin mati sampai kode benar-benar tercatat di server, dengan tombol "coba simpan lagi" |
| `lib/supabase/invite-remote.ts` | `activeInviteRemote()` — baca kode aktif milik pembuatnya (RLS `invite_codes_creator_select`) |
| `lib/invite-store.ts` | `adoptInviteFromServer()` — kode dari server disimpan lokal dengan masa berlaku yang SAMA (bukan dibuat ulang) |
| `lib/data/joint-invite.ts` | `JOIN_CODE_COPY`, `JOINT_JOIN_PARAM`, `isJoinIntentParam()`; catatan modal `syncingNote`/`syncFailedNote`/`syncRetry` |
| `.env.development.local` | `NEXT_PUBLIC_DEMO=1` **dimatikan** (tidak ada seed demo, tidak ada persona contoh) |

## 4. Alur akhir

**Akun 1 (mengajak):** `/joint` → *Buat Dompet* → nama dompet → modal kode → kode
dibaca dari server (`H9FKJF` dipakai ulang bila masih aktif) → Bagikan.

**Akun 2 (diundang):** `/joint` → *Gabung pakai kode* → `H9FKJF` → **Gabung Sekarang**
→ `catetind_accept_invite` menulis `joint_members` → store membaca ulang server →
kantong bersama aktif (Bagas tampil sebagai pasangan, nama dari `catetind_joint_roster`).

Akun 1 menerima keanggotaan lewat langganan realtime `joint_members` (bukan refresh manual).

## 5. Bukti uji

- `npx tsc --noEmit` → bersih.
- `npx vitest run` → **1842 test lulus** (termasuk 3 test baru `joinJointPocketByCode`
  untuk kode tidak sah/tanpa sesi dan 3 test `isJoinIntentParam`).
- `npx next build` → **Compiled successfully**, route `/joint` ada.
- SQL (transaksi `BEGIN … ROLLBACK`, klaim JWT akun 2 + `set local role authenticated`):
  `catetind_accept_invite('H9FKJF')` menulis baris `member`; `joint_wallets` terlihat
  lewat RLS; `catetind_joint_roster` mengembalikan `Bagas (owner)` + `Alawi (member)`;
  `invite_codes` akun 1: `H9FKJF`, `masih_berlaku = true`, `used_by = null`.

## 6. Catatan jujur

- Kode `H9FKJF` berlaku **24 jam** sejak dipulihkan. Kalau lewat, buka modal kode di
  `/joint` → **Buat kode baru** (kode lama otomatis tidak berlaku; satu dompet satu kode aktif).
- Halaman `/joint` tetap terkunci paket (Joint Wallet = fitur Paket Waras). Kalau akun 2
  belum punya paket, yang tampil `LockedFeatureNote`, bukan form kode.
- Join lewat **kode** dan lewat **tautan** `/join/<kode>` memakai RPC yang sama; tidak ada
  jalur simulasi di perangkat.

## 7. Susulan — bottom nav hilang di `/joint` (101b)

**Keluhan:** *"Di halaman joint nav bawahnya nggak ada. Pas udah masuk cuma tombol plus
doang ada, yang lain nggak ada."*

**Penyebab (bukan layout, tapi pencocokan rute):** `components/MobileBottomNav.tsx`
mencocokkan `FOCUS_ROUTES` dengan `pathname.startsWith(route)` **mentah**.
`'/joint'.startsWith('/join') === true` → `/joint` dianggap halaman fokus (undangan
publik) → **seluruh bottom nav + FAB-nya tidak dirender**. Satu-satunya tombol yang
tersisa adalah FAB milik `JointScreen`, persis seperti yang dilihat user.

**Perbaikan**

| Berkas | Perubahan |
|---|---|
| `lib/route-match.ts` **(baru)** | `matchesRoute()` / `matchesAnyRoute()`: batas **segmen** (`=== route` atau `startsWith(route + '/')`, `/` exact) |
| `components/MobileBottomNav.tsx` | `FOCUS_ROUTES`, status aktif tab & menu "Lainnya", dan deteksi `/joint` memakai helper itu — bukan `startsWith` mentah |
| `lib/public-routes.ts` | ikut memakai helper yang sama → satu aturan pencocokan untuk semua daftar rute |
| `lib/route-match.test.ts` **(baru)** | 6 test, termasuk regresi `/joint` ≠ `/join` dan `/join/H9FKJF` = `/join` |
| `components/catetind/joint-screen.tsx` | FAB `bottom-8` → `bottom-10` + safe-area iOS, supaya duduk di slot tengah nav dengan geometri SAMA seperti FAB `/app` |

**Bukti (Playwright, viewport 390×844, login pemilik, dev `next start`)**

- `/joint`: `nav[aria-label="Navigasi utama"]` **visible**, tinggi 64px, berisi
  `Home`, `Wallet`, `Insight`, dan `Menu lainnya`; slot tengah kosong (diisi FAB Joint).
- Geometri FAB terukur **identik** di `/app` dan `/joint`: `x=167, y=748, 56×56,
  bottom=804` (menonjol 12px di atas nav). Sebelum perbaikan `/joint` memakai `bottom-8`
  (y=764) — 16px lebih rendah.
- `/join/H9FKJF` tetap halaman fokus (tanpa nav) — perilaku lama yang benar tidak berubah.
- Status dompet bersama terbaca nyata dari server saat halaman dibuka:
  `joint_wallets` → `joint_members` → `joint_transactions_public` →
  `rpc/catetind_joint_roster` (semua `200`), header menampilkan **"Kamu & Alawi"**.
- `npx tsc --noEmit` bersih; `npx vitest run` **1848 test lulus**; `npx next build`
  **Compiled successfully**.

**Catatan data:** join akun ke-2 yang dilakukan user sendiri (`H9FKJF`) **berhasil** —
`invite_codes.used_by` terisi dan baris `joint_members` (`role = member`) ada. Kode itu
karena itu sudah terpakai; kalau perlu mengundang orang lain, buat kode baru dari modal
`/joint` (satu dompet = satu kode aktif).

