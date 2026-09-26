# 25 — Hygiene Repo & Titik Aman Git

**Fase 8** · **Depends on:** — (task pendek, non-UI)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Bukti gap (audit ulang setelah task 17–23)

| Item | Temuan |
|---|---|
| `cline-dev-server.log` | **Masih di-track git** (432 KB log dev lama — bahkan memuat `GET /overview 200`, route yang sudah dihapus) |
| `dev-smoke.log`, `dev-smoke-err.log` | Untracked di root; **tidak tertutup** pola ignore yang ada (`dev-server*.log`) |
| `dev-server.log`, `dev-server-err.log`, `dev-server.previous.log` | Sudah di-ignore (task 22) tapi **masih ada di disk**: total **±6,6 MB** |
| `next.config.mjs` | `typescript.ignoreBuildErrors: true` → **`pnpm build` tidak memvalidasi tipe sama sekali** ("Skipping validation of types"), jadi `tsc` satu-satunya gerbang tipe |
| `git status` | **±158 baris perubahan belum di-commit** (seluruh hasil 23 task) — belum ada satu titik aman |

## Kenapa task ini ada

Dua alasan praktis, bukan kerapian kosmetik:

1. **Review jadi buta.** Log dev yang ter-track + artefak build membuat `git status`
   penuh "kebisingan" sehingga perubahan nyata sulit dilihat. Salah satu task sebelumnya
   bahkan harus memakai `git add` supaya penghapusan route tidak "tertipu index".
2. **Tidak ada titik aman.** Task 04 pernah ~800 baris `wallet-screen.tsx` harus
   diselamatkan dari sourcemap karena tidak ada commit. Dengan ±158 baris perubahan
   yang belum di-commit, risikonya jauh lebih besar.

## Yang harus dibangun

1. **Berhenti melacak log dev:**
   ```bash
   git rm --cached cline-dev-server.log
   ```
   lalu **hapus file log dari disk**: `cline-dev-server.log`, `dev-server*.log`,
   `dev-smoke.log`, `dev-smoke-err.log`.
2. **Perluas `.gitignore`** agar tidak terulang — satu pola yang mencakup semuanya, mis.:
   ```
   # log dev lokal (dev-server, dev-smoke, probe sekali-pakai)
   *.log
   ```
   (lebar tapi jujur: repo ini tidak memuat log apa pun yang perlu di-track).
   Pertahankan komentar gaya repo (bahasa Indonesia, menjelaskan **kenapa**).
3. **Nyalakan gerbang tipe di build:** ubah `next.config.mjs` →
   `typescript.ignoreBuildErrors: false` (atau hapus bloknya). Justifikasinya: `tsc
   --noEmit` sudah bersih, jadi build harus ikut menjaga. Jalankan `pnpm build` dan
   pastikan **tetap sukses**; kalau ada error tipe yang muncul, laporkan apa adanya
   (jangan dimatikan lagi tanpa alasan kuat).
4. **Verifikasi kebersihan index:**
   ```bash
   git ls-files '*.log'          # harus KOSONG
   git status --short            # tidak boleh ada .log
   ```
   dan pastikan penghapusan route dari task 22 (`app/overview`, `overview-screen.tsx`,
   `transaction-list.tsx`) tetap tercatat benar (staged/`D`), bukan hilang dari status.
5. **JANGAN commit sendiri.** Tutup laporan dengan blok perintah commit yang siap kamu
   tempel, mis.:
   ```bash
   git add -A
   git commit -m "feat: 23 task halaman + handoff + audit sisa (fase 1-8)"
   ```
   (Sertakan catatan: commit ini adalah titik aman sebelum pekerjaan berikutnya.)

## Acceptance criteria

- [ ] `git ls-files '*.log'` → **kosong**; tidak ada file `.log` di `git status`.
- [ ] Tidak ada file `.log` tersisa di root repo.
- [ ] `pnpm build` **memvalidasi tipe** (tidak lagi "Skipping validation of types") dan tetap sukses.
- [ ] `app/overview/`, `overview-screen.tsx`, `transaction-list.tsx` tetap tercatat terhapus.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.
- [ ] Laporan memuat: daftar file yang di-untrack/dihapus, diff `next.config.mjs`,
      hasil dua perintah verifikasi index, dan blok perintah commit yang disarankan.

## Dilarang

- Melakukan `git commit`/`git push` sendiri (itu keputusan pemilik repo).
- Mematikan kembali `ignoreBuildErrors` bila `pnpm build` gagal — **perbaiki tipe-nya**,
  atau laporkan error itu sebagai temuan bila memang di luar scope.
- Menghapus file yang masih dipakai (mis. `docs/`, `inventaris_ui_definitif.md`,
  `CatetInd_Master_PRD_Lengkap.md`).
