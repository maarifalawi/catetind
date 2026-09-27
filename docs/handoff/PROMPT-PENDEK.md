# ⚡ PROMPT PENDEK — copy 1 baris, ganti nomornya

Semua konteks ada di dalam repo, jadi **prompt-nya tidak perlu panjang**.
Tempel **satu baris** di bawah ini, ganti `NN-nama-file.md` sesuai halaman.

---

## 1. Template (tempel ini)

```text
Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/NN-nama-file.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```

## 2. Tambahan "mode ketat" (baris kedua, untuk task besar/berisiko)

```text
Kalau ada ambiguitas: ambil keputusan paling konservatif, tulis asumsimu di laporan, lanjutkan — JANGAN berhenti untuk minta izin. Bukti yang wajib kau tunjukkan: (a) daftar file yang dibuat/diubah, (b) 3 aturan warna keras dari CONTEXT-WAJIB.md yang kau patuhi, (c) output 3 perintah validasi.
```

> Tips: poin (b) sengaja diminta — kalau agent tidak benar-benar membuka
> `CONTEXT-WAJIB.md`, ia akan salah/gagal menyebutkannya. Ini penjaga murah
> supaya perintah "baca file" benar-benar dijalankan.

## 3. Daftar 16 baris siap-tempel (urut prioritas)

```text
01. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/01-wallet-detail.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
02. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/02-budget-detail.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
03. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/03-modal-edit-tagihan-transaksi.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
04. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/04-modal-tambah-dompet-transfer.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
05. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/05-404-not-found.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
06. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/06-cleanup-more-family.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
07. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/07-install-qr-ilustrasi.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
08. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/08-checkout-registration.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```

```text
09. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/09-login-magic-link.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
10. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/10-join-invite-landing.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
11. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/11-share-preview.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
12. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/12-privacy-policy.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
13. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/13-terms-of-service.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
14. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/14-modal-renewal.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
15. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/15-modal-monthly-review.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
16. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/16-milestone-celebration.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```

### Fase 7 — SISA hasil audit setelah 16 task (17–23)

```text
17. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/17-wealth-edit-aset-riwayat-bayar.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
18. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/18-budget-periode-non-bulanan.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
19. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/19-budget-review-ai-coach.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
20. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/20-ai-chat-voice-scan-struk.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
21. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/21-kuota-ai-satu-sumber.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
22. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/22-bersih-bersih-overview-dead-code.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
23. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/23-grace-period-global-gate.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```

| # | Menutup apa |
|---|---|
| 17 | `/wealth`: form **Edit aset** + **riwayat bayar hutang** (masih placeholder yang terlihat user) |
| 18 | `/budget`: tab **Mingguan/Custom/Siklus gajian** (masih "Segera hadir"; inventaris #24) |
| 19 | `/budget`: CTA **"Review Pengeluaran Hari Ini"** → AI Coach (masih toast) |
| 20 | AI Chat: tombol **voice** & **scan struk** (masih "segera hadir") |
| 21 | **Kuota AI** satu sumber (sidebar 5 jt vs billing 150/60/500 vs ToS 601.500) |
| 22 | Bersih-bersih: route yatim `/overview` + `transaction-list.tsx` mati |
| 23 | **Grace period & post-grace** read-only global (inventaris state III/IV/VI) |

### Fase 8 — SISA terakhir (audit setelah 17–23)

```text
24. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/24-tombol-mati-cta-placeholder.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
25. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/25-hygiene-repo-git.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
26. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/26-pacing-pool-per-periode.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```

| # | Menutup apa |
|---|---|
| 24 | Tombol **`Beli Add-On →`** di banner Home (mati, tanpa `onClick`) + CTA insight **"Atur Limit Kopi"** yang masih toast |
| 25 | Hygiene repo: `cline-dev-server.log` masih **ter-track** + `dev-smoke*.log` tak ter-ignore (6,6 MB) · `ignoreBuildErrors: true` bikin build tak mengecek tipe · **158 baris perubahan belum di-commit** |
| 26 | **Pool uang pacing** masih bulanan di tab Mingguan/Siklus (keterbatasan yang dilaporkan task 18) |

> **Saran urutan:** 25 dulu (biar repo bersih + commit titik aman) → 24 (kecil) → 26 (medium).

### Fase 9 — SISA dari audit hasil 25/24/26

```text
29. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/29-sweep-kontrol-mati.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
27. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/27-sinking-obligation-prorata.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
28. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/28-budget-kategori-ganda.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```

| # | Menutup apa |
|---|---|
| 29 | **10+ kontrol mati**: tombol Menu & Notifications di Home, input "Cari transaksi…", tombol Tambah/Detail goal, chevron per goal, CTA "+ Catat Transaksi", orbit `balance-ring`, dropdown bulan "February", 2 CTA Weekly Recap |
| 27 | `sinkingObligation` **tidak diprorata** → tab Mingguan menampilkan Rp 742.100/hari (dilaporkan task 26) |
| 28 | Insight → budget bisa membuat **baris kategori ganda** (mis. Kopi dua kali) — dilaporkan task 24 |

---

## 4. Urutan pengerjaan (ringkasan)

1 → 2 (tutup jalan buntu) · 3 → 4 (modal menggantung) · 5 → 6 → 7 (bersih-bersih) ·
8 → 9 → 10 → 11 (publik) · 12 → 13 (legal) · 14 → 15 → 16 (modal kebiasaan) ·
**17 → 18 → 19 → 20 → 21 → 22 → 23 (sisa audit)**.

Detail alasan & dependensi: `ROADMAP-HALAMAN.md`.

## 5. Kalau hasil agent kurang maksimal, tambahkan SATU baris ini

```text
Sebelum menulis kode: sebutkan 3 file kode tetangga yang kau baca dan apa gaya penulisan komentarnya. Setelah selesai: tunjukkan ringkasan perubahan tiap file + output validasi.
```

Penyebab paling umum hasil kurang maksimal **bukan** prompt-nya pendek, tapi:
(a) agent tidak benar-benar membaca `CONTEXT-WAJIB.md`, (b) agent berhenti di
tahap rencana, (c) agent lupa menjalankan validasi. Baris di atas menutup
ketiganya tanpa menambah teks konteks.

## 6. Kenapa pendek itu tetap maksimal

| Kekhawatiran | Kenyataan |
|---|---|
| "Konteksnya kurang" | Konteksnya 238 baris di `CONTEXT-WAJIB.md` + PRD 7.000 baris — agent membacanya, bukan mengingat-ingat |
| "Agent bakal males baca" | Dinetralkan oleh: perintah baca eksplisit + kewajiban menyebut 3 aturan warna + laporan file yang dibaca |
| "Teks panjang lebih aman" | Teks panjang justru bisa **basi** (beda versi dengan file) dan makan context window — kualitas prompt turun, bukan naik |
| "Bedanya apa?" | Prompt panjang = satu sumber kebenaran **per prompt**. Prompt pendek = satu sumber kebenaran **per repo**. Yang kedua lebih tahan lama |

