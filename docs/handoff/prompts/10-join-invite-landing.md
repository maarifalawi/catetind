# 10 — Joint Wallet Invite Landing (`/join/[code]`)

**Route:** `app/join/[code]/page.tsx` · **Inventaris:** #7 · **Fase 4** · **Depends on:** #09 (`/login` sudah ada)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Peta baca

**PRD:**

- **900–932** — 2D.2 Joint Wallet Onboarding: flow lengkap + Acceptance Criteria.
  Titik kuncinya ada di sini: *"User B → klik link → landing page invite:
  'Halo! [Nama A] mengajakmu kelola uang bareng di CatetInd 💚' → jika sudah punya akun
  login → auto-join wallet / jika belum signup dulu → auto-join → joint wallet aktif
  dengan saldo Rp0 → data historis masing-masing user TIDAK terganggu."*
- **888–899** — 2D.1 Privacy-Layered Architecture (apa yang boleh/boleh tidak dilihat pasangan)
- **968–984** — 2D.5/2D.6 notifikasi & referral joint (nada copy)
- **196–200** — yang patut ditiru: nudge kontekstual di momen momentum

**Inventaris:** baris 18 (#7) dan baris 156 (Flow #2) — *"User A buat wallet →
generate 6-char invite link → User B klik `/join/[code]` → login/signup → auto-join wallet"*.

**Kode acuan:**

- `lib/data/joint.ts` — `INVITE_CODE = 'A7K2M9'`, `INVITE_LINK`,
  `INVITE_VALIDITY_COPY`, `buildInviteShareText()`, nama user/pasangan, helper copy privat
- `components/catetind/joint-invite-flow.tsx` — UI **pembuat** invite di `/joint`
  (sisi A); halaman ini adalah **sisi B**
- `components/catetind/joint-screen.tsx` — tampilan joint wallet setelah aktif
- `components/catetind/plant-illustration.tsx` — visual ringan yang boleh dipakai ulang
- `components/catetind/login-screen.tsx` (dari prompt 09) — gaya halaman publik

## Kenapa halaman ini ada

Ini halaman dengan **tekanan sosial paling tinggi** di seluruh produk: orang yang
membukanya bukan user kita, tapi pasangan/teman yang diminta mengelola uang bersama.
Menolak terasa seperti menolak orangnya. Karena itu halaman ini harus:

- **Hangat dan personal** — nama pengundang tampil besar, bukan "Anda diundang ke wallet".
- **Menjelaskan manfaat dalam 1 kalimat**, bukan mendaftar fitur.
- **Menegaskan privasi lebih dulu daripada tombol** (2D.1): *"Data pribadimu tetap
  pribadi. Yang dibagi hanya dompet bersama ini."*
- **Tidak memaksa**: selalu ada "Nanti aja" yang sopan, dan tidak ada hitungan mundur.
  (Bandingkan PRD 4507: urgensi buatan = pemicu kecemasan.)

Konteks psikologis tambahan: PRD 877 (BIMA) — *"onboarding gabung wallet harus terasa
seperti momen milestone hubungan"*. Jadi nada halamannya: merayakan, bukan administratif.

## Yang harus dibangun

1. **`lib/data/joint-invite.ts`** (atau perluas bagian invite di `lib/data/joint.ts`) —
   data & logika murni: `resolveInvite(code)` yang mengembalikan
   `{ inviterName, walletName, validUntilLabel, status: 'valid' | 'expired' | 'used' | 'unknown' }`,
   plus konstanta copy (judul, subjudul, 3 manfaat, jaminan privasi, CTA).
2. **`app/join/[code]/page.tsx`** — `params: Promise<{ code: string }>`,
   `metadata` dinamis (mis. `"Undangan dompet bersama — CatetInd"`). Halaman **publik**:
   `PhoneStage` saja, tanpa sidebar/FAB/chat.
3. **`components/catetind/join-invite-screen.tsx`**:
   - **Hero**: avatar/nama pengundang + kalimat persis pola PRD 915:
     *"Halo! Rina mengajakmu kelola uang bareng di CatetInd 💚"* + nama dompet (`"Dompet Kita"`).
   - **Tiga manfaat** singkat (bukan daftar fitur panjang), mis. bagi pengeluaran berdua,
     lihat ringkasan bersama, tiap orang tetap punya dompet pribadi.
   - **Jaminan privasi** (wajib, dari 2D.1): *"Transaksi pribadimu tetap pribadi.
     Yang dibagi cuma dompet bersama ini."*
   - **CTA primer** `"Gabung Dompet Ini"` di zona ibu jari → ke `/login` (kalau belum masuk).
   - **CTA sekunder** `"Nanti aja"` → `/` (tanpa rasa bersalah, tanpa lingkaran setan pop-up).
   - **Status non-valid**: kartu khusus untuk `expired` / `used` / `unknown`
     (`INVITE_VALIDITY_COPY` sebagai rujukan) + jalan keluar: *"Minta link baru ke Rina"*.
   - **Status sukses** (setelah "gabung" disimulasikan): layar kecil
     *"Kalian sekarang punya Dompet Kita 💚"* + tombol `"Buka dompet bersama"` → `/joint`
     (sesuai AC PRD 930: wallet mulai dari **Rp0**).
4. **Konsistensi kode invite**: halaman ini harus memvalidasi kode dengan **sumber
   yang sama** yang dipakai `/joint` (`INVITE_CODE`), sehingga kode yang dibuat di
   `/joint` benar-benar bisa dibuka di `/join/<kode>`; kode lain → `unknown`.
5. **Komentar arah produksi** di dekat validasi: single-use + kedaluwarsa 24 jam
   dicek di server (PRD AC1), bukan di klien.

## Acceptance criteria

- [ ] `/join/A7K2M9` (kode di `lib/data/joint.ts`) membuka undangan **valid** dengan nama pengundang benar.
- [ ] Kode acak → status `unknown` dengan copy yang ramah (bukan 404 kaku / error).
- [ ] `expired` & `used` punya tampilan sendiri + jalan keluar.
- [ ] Halaman menegaskan privasi SEBELUM tombol CTA (urutan visual, bukan catatan kaki).
- [ ] Ada CTA "Nanti aja" yang sopan; tanpa countdown/urgensi buatan.
- [ ] Alur klik menuju `/login` lalu bisa lanjut; sukses → `/joint` dengan saldo mulai Rp0.
- [ ] Halaman publik & rapi di 375 px (testimoni: hampir selalu dibuka dari HP).
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Menampilkan angka/transaksi milik pengundang (melanggar 2D.1 & PRD 921: data historis tidak terganggu).
- Membuat halaman ini menghalangi dengan syarat membayar/verifikasi (orang yang diundang
  tidak boleh ditahan sebelum bisa bergabung).
- Copy bergaya "jangan sampai kamu mengecewakan pasanganmu" — apa pun bentuknya.
