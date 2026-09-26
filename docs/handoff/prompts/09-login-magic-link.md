# 09 — Login Magic Link + Cek Email

**Route:** `app/login/page.tsx` + `app/login/verify/page.tsx` · **Inventaris:** #8 & #9 · **Fase 4** · **Depends on:** #08 (`/checkout` sudah ada)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Peta baca

**PRD:**

- **5931–5933** — BIMA: *"Tidak ada email verification step blocking (verifikasi via
  magic link bisa dilakukan nanti). User harus LANGSUNG bisa pakai app."* ·
  CANDRA: *"Supabase Auth supports OTP/magic link natively… lebih simpel dari password +
  confirm password dan lebih aman."*
- **5887–5906** — langkah 1 checkout: **email + nama saja, ZERO password**
- **3064–3504** — 4C arsitektur keamanan & privasi: alasan kita tidak pernah
  "menyimpan password" — bahan copy kepercayaan di halaman ini
- **542–568** — nada micro-copy (menemani, bukan menuduh)

**Inventaris:** baris 26–27 (#8 Login Magic Link: "Input email saja (ZERO password),
tombol 'Kirim Magic Link', link ke registrasi baru"; #9 Cek Email / Callback:
"Konfirmasi 'cek email kamu', auto-redirect setelah klik magic link").

**Kode acuan:**

- `components/catetind/settings-panel-account.tsx` — identitas user mock (nama, email, avatar)
- `components/catetind/referral-screen.tsx` — pola **Salin/Bagikan + status berubah**
  (dipakai lagi untuk "Salin email pengirim" / "Buka email")
- `components/catetind/screen-shell.tsx` / `phone-stage.tsx` — halaman ini **publik**,
  jadi `PhoneStage` saja (tanpa sidebar)
- `lib/data/auth.ts` (akan kamu buat) — jaga pola `lib/data/referral.ts`: tipe + konstanta + helper murni

## Kenapa halaman ini ada

Magic link adalah **janji kepercayaan** produk ini: "kami tidak menyimpan passwordmu".
Halaman masuk karena itu harus terasa seperti undangan, bukan gerbang. Tiga prinsip
psikologis yang langsung terasa di sini (CONTEXT-WAJIB §5):

- **ZERO password** — user Gen-Z yang diminta bikin password saat baru mau masuk
  adalah user yang berhenti. Satu field, satu tombol.
- **Jangan mengungkap data akun.** Untuk email yang tidak terdaftar, pesannya tetap
  netral ("kalau emailnya terdaftar, tautan sudah dikirim") — sekaligus aman & sopan.
- **Jangan membuat menunggu terasa hampa.** Halaman cek email harus memberi langkah
  berikutnya yang jelas + jalan keluar (kirim ulang, ganti email, buka demo).

## Yang harus dibangun

1. **`lib/data/auth.ts`** — konstanta copy (judul, penjelasan, pesan netral, pesan
   kedaluwarsa, label CTA) + `isValidEmail()`, `RESEND_SECONDS = 60`,
   `buildMockMagicLink()`. Komentar arah produksi: Supabase `signInWithOtp({ email })`
   → email berisi `redirectTo: /login/verify`.
2. **`app/login/page.tsx`** + **`components/catetind/login-screen.tsx`** (publik):
   - Satu input **email** (label jelas, `type="email"`, `autoComplete="email"`,
     autofokus), validasi ringan, tombol `"Kirim Magic Link"` **non-aktif sampai valid**.
   - Enter mengirim; saat mengirim tampil state loading pada tombol (**bukan** spinner layar penuh).
   - Kalimat kepercayaan: *"Nggak perlu bikin password. Kami kirim tautan masuk ke emailmu —
     kamu yang pegang kendali, kami nggak simpan password apa pun."*
   - Tautan **"Belum punya akun? Daftar"** → `/checkout` (sudah ada).
   - Kuota/kontak bantuan kecil di kaki: *"Emailmu nggak ketemu? Kabarin kami di Pusat Bantuan."*
3. **`app/login/verify/page.tsx`** + **`components/catetind/verify-email-screen.tsx`**:
   - Konfirmasi *"Cek emailmu, ya 📩"* + **alamat email ditampilkan** (dari query
     `?email=`), tombol **"Buka email"** (`mailto:` / instruksi platform) dan
     **"Kirim ulang"** dengan **cooldown 60 detik** (teks hitung mundur, bukan tombol mati).
   - **State kedaluwarsa**: kartu khusus *"Tautan ini sudah dipakai atau kedaluwarsa.
     Kirim ulang ya — nggak ada yang hilang."* + tombol kirim ulang.
   - Tombol demo (jelas berlabel **demo**, bukan pura-pura aman): `"Lanjut masuk (demo)"`
     → `/` supaya alur bisa diklik sampai ujung di build demo.
   - Tautan kembali: *"Ganti email"* → `/login`.
4. **Tautan silang dua arah** — sekarang `/login` sudah ada, jadi **tambahkan**
   tautan `"Sudah punya akun? Masuk"` → `/login` di `components/catetind/registration-sheet.tsx`
   (dibuat di prompt 08). Ini melunasi utang yang sengaja ditinggalkan sebelumnya.
5. **Tanpa API nyata**: proses kirim disimulasikan (`setTimeout`) dan **ditandai di
   komentar** sebagai mock, bukan direkayasa tampak seperti jaringan sungguhan.

## Acceptance criteria

- [ ] `/login`: satu field; tombol aktif hanya saat format email valid; Enter mengirim.
- [ ] Email tidak valid / tidak terdaftar → pesan **netral** (tidak membocorkan data akun).
- [ ] `/login/verify?email=...` menampilkan alamat email yang benar; kirim ulang punya cooldown 60 detik.
- [ ] State kedaluwarsa punya tampilan + jalan keluar, bukan layar buntu.
- [ ] Tautan `"Sudah punya akun? Masuk"` sudah ada di halaman registrasi checkout.
- [ ] Nol field password di seluruh alur; nol tautan mati.
- [ ] Halaman publik: tanpa sidebar, tanpa FAB, tanpa chat widget; rapi di 375 px.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Menambahkan field password/konfirmasi password/telepon/OTP manual (bertentangan langsung dengan PRD).
- Copy yang menuduh atau membocorkan keberadaan akun.
- Menyimpan/menampilkan email di `localStorage` tanpa komentar alasan.
