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

## 3. Daftar baris siap-tempel (urut prioritas)

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

### Fase 10 — SISA dari audit hasil 29/27/28 — **30 · 31 · 32 ✅ TUNTAS (27 Sep 2026, diverifikasi audit)**

```text
30. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/30-celengan-home-satu-sumber.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
31. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/31-privasi-nominal-toast.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
32. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/32-target-bulanan-lintas-halaman.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```

| # | Menutup apa |
|---|---|
| 30 | Kartu "Tabungan Impian" Home masih memakai **mock kedua** (`Liburan ke Jepang`/`MacBook Air M4`/`Dana Umroh`) → 3 tautannya berhenti di `/budget` generik, bukan `/budget/<id>` (butir 5 paket 29 dilaporkan separuh) |
| 31 | **Nominal di toast tidak disensor** saat Mata Privasi ON (`budget-screen.tsx:252/286`, `wallet-screen.tsx:283`, `ai-chat-widget.tsx:241`, `monthly-review.ts:618-622`) — kandidat yang `CONTEXT-WAJIB.md:228-230` sendiri catat belum dikerjakan |
| 32 | **Target bulanan hanya hidup di Home**; CTA recap "Atur target nabung" di `/history` berhenti di `/budget` yang tidak punya alur target (`lib/data/monthly-review.ts:436-439` mengakui jalurnya) |

> **✅ Ketiganya sudah dikerjakan & diverifikasi audit 27 Sep 2026.** 30: kartu "Tabungan Impian" kini
> membaca `INITIAL_SINKING_FUNDS` dan setiap panah menuju `/budget/<id>` yang ada (nama fiktif tinggal
> di dokumen). 31: seluruh toast ber-nominal disensor lewat `hide()`/`money()` di titik toast dibuat,
> satu definisi `MASKED_AMOUNT`. 32: `/history` memasang `useMonthlyReview({ auto: false })` +
> `MonthlyTargetCard` + `onSetTarget` **wajib**.
> **Perlu di-commit:** 30/31/32 (bersama 29/27/28 & 33) masih di working tree.



### Fase 11 — Sisa dari uji pakai langsung (27 Sep 2026) — **33 ✅ TUNTAS**

> **Sudah dikerjakan 27 Sep 2026.** Panel input manual sekarang MENULIS ke
> `lib/transaction-bus.ts` (`transaction-bottom-sheet.tsx`, `transaction-web-modal.tsx` lewat hook
> `use-transaction-submit.ts`), toast sukses pindah dari engine ke shell, dan Home + `/wallet/[id]`
> ikut menampilkan catatan baru. Sisa Fase 10 (31 → 30 → 32) tetap berlaku di bawah.

```text
33. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/33-transaksi-baru-tercatat.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```

| # | Menutup apa |
|---|---|
| 33 | **Mencatat transaksi = no-op.** FAB `+` & semua CTA input membuang payload (`transaction-bottom-sheet.tsx:71` = `onSubmitted={() => setOpen(false)}`, `transaction-web-modal.tsx:162` = `close`), sementara toast sukses tetap berbunyi (`transaction-input-engine.tsx:386`). `recordTransaction()` cuma dipanggil jalur AI capture ⇒ catatan tidak pernah muncul di `/history`, Home, maupun `/wallet/[id]` |

> **✅ Dikerjakan 27 Sep 2026, lalu diverifikasi audit:** `onSubmitted` kedua shell kini MENULIS lewat
> `hooks/use-transaction-submit.ts` → `recordDraftTransaction()`; toast sukses sudah dicabut dari engine
> dan ditembak setelah penulisan; Home (`recent-transactions-card.tsx`) & `/wallet/[id]` berlangganan bus.
> **Tiga batas yang tetap terbuka** (jadi paket 36 & 37 di bawah): hapus lintas halaman, catatan
> `/calendar` yang belum masuk riwayat — ringkasan chart Home yang dulu statis **sudah ditutup paket 35
> (27 Sep 2026)**.

### Fase 12 — Temuan BARU dari audit verifikasi 30/31/32/33 — **34 · 35 ✅ TUNTAS, sisa 36 → 37**

```text
34. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/34-privasi-ringkasan-mingguan.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
35. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/35-ringkasan-uang-home-satu-sumber.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
36. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/36-hapus-catatan-lintas-halaman.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
37. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/37-catatan-kalender-jalur-tulis-sama.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```

| # | Menutup apa |
|---|---|
| 34 ✅ | **Modal Rekap Mingguan kebal tombol mata** — `weekly-recap-modal.tsx` memakai `formatIDR` di 16 situs (slide 1–5) tanpa pernah mengimpor `usePrivacy`, padahal ia dibuka dari Home & `/history`; plus komentar basi `:514-516` |
| 35 ✅ | **Dua ringkasan uang di Home saling bertentangan** — `cash-flow-card.tsx:7-24` masih konstanta keras (`INCOME 8.500.000`/`EXPENSE 752.000`/`SERIES`) sementara `recent-transactions-card.tsx:371-381` sudah turunan data ⇒ setelah user mencatat, dua kartu di satu layar menampilkan surplus berbeda |
| 36 | **Hapus catatan sesi tidak lintas halaman** — `recent-transactions-card.tsx:393-400` hapus page-local; bus belum punya event "removed" (komentar paket 33 menunjuk solusinya sendiri) |
| 37 | **Catatan `/calendar` mengaku "tercatat" tapi tak pernah masuk Riwayat** — `cashflow-calendar-screen.tsx:184-210` menyimpan ke `noteEntries` halaman + toast "tersimpan" |

> **34 ✅ TUNTAS & diverifikasi 27 Sep 2026** (grep saya: `formatIDR` tinggal 1 situs yaitu di dalam
> `hide()`; `dots=` 0 hasil ⇒ dua dialek titik disatukan ke `MASKED_AMOUNT`; `onSetTarget` di `SlidePlan`
> kini wajib). **35 ✅ TUNTAS & diverifikasi 27 Sep 2026** (nol nominal keras di `cash-flow-card.tsx` —
> baris seed & turunannya pindah ke `lib/data/home-money.ts`; kedua kartu berbagi
> `HOME_MONEY_COPY.period` = "Bulan ini" lewat satu bus. Probe: sebelum 8.500.000/752.000/net 7.748.000
> → sesudah 1 catatan 8.500.000/777.000/net 7.723.000 di **kedua** kartu; sumbu-Y ikut
> `MASKED_AMOUNT`). **Urutan sisa: 36 → 37.** Alasan: 36 menutup hapus catatan lintas halaman (penerima
> bus-nya sudah ada), 37 menutup catatan `/calendar` yang mengaku "tercatat" tapi tak pernah masuk
> Riwayat. Keduanya tidak saling bergantung dan tidak menyentuh angka patokan demo.





---

## 4. Urutan pengerjaan (ringkasan)

1 → 2 (tutup jalan buntu) · 3 → 4 (modal menggantung) · 5 → 6 → 7 (bersih-bersih) ·
8 → 9 → 10 → 11 (publik) · 12 → 13 (legal) · 14 → 15 → 16 (modal kebiasaan) ·
**17 → 18 → 19 → 20 → 21 → 22 → 23 (sisa audit)** · **24 → 25 → 26 (sisa terakhir)** ·
**29 → 27 → 28 (sweep kontrol mati, pacing, kategori ganda)** ·
**33 (transaksi baru tersimpan — prioritas tertinggi, ketemu saat uji pakai)** ·
**31 → 30 → 32 (sisa audit hasil 29/27/28)** — ✅ semua sudah dijalankan, ada di working tree · **belum di-commit** ·
**34 → 35 (privasi rekap mingguan · ringkasan uang Home satu sumber) ✅ selesai · sisa 36 → 37
(hapus catatan lintas halaman · catatan kalender masuk jalur tulis yang sama)**.




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

---

## 7. Prompt audit fintech (Stage 2–6) — hasil audit 27 Sep 2026

Enam prompt ini mengikuti `docs/handoff/FIXPLAN-AUDIT.md`. **Stage 1 sudah selesai** (mesin uang + 23 test
hijau) — jangan dikerjakan ulang, dan jangan "mengembalikan" angka joint ke nilai lama: yang sah sekarang
adalah **Jon transfer Rp 25.000 ke Dany** (dengan `REALTIME_ARRIVAL`: Rp 250.000).

Catatan mesin ini: pnpm lokal 9.12.0 sedangkan `package.json` menulis `packageManager: pnpm@12.3.4`, jadi
tambahkan `--config.manage-package-manager-versions=false` pada perintah pnpm (`-w` khusus `pnpm add`).

```text
38. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/38-stage2-ui-uang-benar.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm test, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
39. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/39-stage3-sesi-dan-keamanan-api.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm test, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
40. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/40-stage4a-satu-ledger-kas.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm test, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
41. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/41-stage4b-utang-piutang-net-worth.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm test, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
42. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/42-stage5-offline-idempotency-input.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm test, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```
```text
43. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/43-stage6-kepatuhan-export-ops.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm test, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```


---



**Urutan wajib: 38 → 39 → 40 → 41 → 42 → 43.** Alasan singkat: 38 membuat layar jujur soal uang, 39
menutup lubang keamanan sebelum data dipindah, 40 membangun satu ledger kas (fondasi persistensi), 41
menyambungkan utang/piutang ke kas itu, 42 menambah daya tahan (idempotency/offline), 43 menutup
kepatuhan & operasional. Jangan melompat ke 40 sebelum 39: memindahkan data ke store tanpa otorisasi
hanya memindahkan masalah.

**Baris tambahan "mode ketat"** (tempel sebagai baris kedua untuk task 40 & 41 — keduanya menyentuh saldo):

```text
Kalau ada ambiguitas: ambil keputusan paling konservatif, tulis asumsimu di laporan, lanjutkan — JANGAN berhenti untuk minta izin. Bukti yang wajib kau tunjukkan: (a) daftar file yang dibuat/diubah, (b) angka saldo/Net Worth sebelum & sesudah, (c) output 3 perintah validasi.
```

---

## 8. Lanjutan setelah uji pemakaian (27 Sep 2026)

Dua prompt terakhir. Urutannya wajib: **44 dulu** (perbaikan hasil uji + dua bug yang sudah dipatch:
parser nominal `2.5000`/`25.000` dan mask yang tidak lagi "terkurung"), **baru 45** (Supabase).

```text
44. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/44-perbaikan-uji-pemakaian.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm test, pnpm exec tsc --noEmit, pnpm build, pnpm theme:audit) dan laporkan hasilnya apa adanya.
```
```text
45. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/45-stage7-supabase-backend.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm test, pnpm exec tsc --noEmit, pnpm build, pnpm theme:audit) + bukti server (curl REST tanpa login, isolasi dua akun) dan laporkan hasilnya apa adanya.
```

**Catatan pnpm (mesin ini):** tambahkan `--config.manage-package-manager-versions=false` pada perintah
pnpm yang meng-`add` dependency, karena `packageManager: pnpm@12.3.4` di `package.json` menunjuk versi
yang tidak ada di registry. `pnpm test` / `pnpm build` jalan tanpa flag itu.

**Setelah #44 & #45 selesai:** perbarui `CONTEXT-WAJIB.md` §10 (angka kanon + daftar "yang belum ada")
supaya baseline tidak jadi basi, dan commit pekerjaan per paket — sampai sekarang semua perubahan masih
di working tree.

---

## 9. FASE 13 — temuan pemilik produk (28 Sep 2026): sinkronisasi, nominal, kategori, transfer, ramalan

Sumber temuan: `docs/handoff/laporan/46-sinkronisasi-celengan-konteks-install-laporan.md` §6 (tabel A–F)
+ keluhan langsung pemilik produk (nominal, kategori, transfer, ramalan kalender).

**Urutan wajib: 47 → (48, 49) → (50, 51, 52) → (53, 54, 55, 56).**
Alasannya: 47 memperkenalkan `scope` pada model Tagihan/Kalender/Kekayaan/Investasi yang dipakai 50/51;
48 & 49 menutup dua "satu tindakan dua cerita" yang paling sering kena (edit Riwayat & catatan kalender);
53–56 tidak saling bergantung tapi 55 & 56 menyentuh kalender/engine yang sama dengan 49 & 54, jadi
kerjakan setelahnya supaya konfliknya kecil.

| # | Paket | File prompt | Menutup apa |
|---|---|---|---|
| 47 | Konteks uang dihormati seluruh halaman | `47-konteks-uang-semua-halaman.md` | temuan A — `/wallet`, `/history`, `/calendar`, `/bills`, `/wealth`, `/insight`, `/joint` mengabaikan konteks |
| 48 | Edit catatan lintas halaman | `48-edit-catatan-lintas-halaman.md` | temuan B — `editedTxs` di `history-screen.tsx:109,216-222` |
| 49 | Catatan `/calendar` masuk jalur catatan | `49-catatan-kalender-jalur-tulis-sama.md` | temuan C (= #37) + dompet `'Tunai'` hardcoded + `money_movement` palsu |
| 50 | Satu store Kekayaan | `50-store-kekayaan-lintas-halaman.md` | temuan D — `useState(INITIAL_DEBTS/…)` + ekspor membaca konstanta |
| 51 | Satu store Tagihan + "Lunas" jujur | `51-store-tagihan-lunas-jujur.md` | temuan E — `useState(INITIAL_BILLS)` + "Lunas" tanpa uang keluar |
| 52 | `/joint` satu sumber + realtime nyata | `52-joint-satu-sumber-realtime.md` | temuan F — state halaman + id kanon `joint-1` |
| 53 | Input nominal: tipografi + titik ribuan | `53-input-nominal-tipografi-titik-ribuan.md` | font nominal terlalu tebal + `2.000000` |
| 54 | Kategori dipilih user | `54-kategori-transaksi-dipilih-user.md` | `category: type.suggested` + badge "AI Suggested" + saklar mati |
| 55 | Alur transfer jelas | `55-alur-transfer-pindah-dana.md` | chip "Transfer" menulis baris satu sisi + pintu masuk cuma satu |
| 56 | Hilangkan ramalan kalender | `56-hapus-ramalan-kalender-cashflow.md` | `upcoming_forecast`, bubble "· ramalan", [Bayar Sekarang] |

Salin-tempel satu per satu (sesuaikan nomornya):

```text
47. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/47-konteks-uang-semua-halaman.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm test, pnpm exec tsc --noEmit, pnpm build, pnpm theme:audit) dan laporkan hasilnya apa adanya.
```
```text
48. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/48-edit-catatan-lintas-halaman.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu dan laporkan hasilnya apa adanya.
```
```text
49. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/49-catatan-kalender-jalur-tulis-sama.md sampai tuntas (ini lanjutan #37) — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu dan laporkan hasilnya apa adanya.
```
```text
50. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/50-store-kekayaan-lintas-halaman.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu dan laporkan hasilnya apa adanya.
```
```text
51. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/51-store-tagihan-lunas-jujur.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu dan laporkan hasilnya apa adanya.
```
```text
52. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/52-joint-satu-sumber-realtime.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu dan laporkan hasilnya apa adanya.
```
```text
53. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/53-input-nominal-tipografi-titik-ribuan.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu dan laporkan hasilnya apa adanya.
```
```text
54. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/54-kategori-transaksi-dipilih-user.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu dan laporkan hasilnya apa adanya.
```
```text
55. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/55-alur-transfer-pindah-dana.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu dan laporkan hasilnya apa adanya.
```
```text
56. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/56-hapus-ramalan-kalender-cashflow.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu dan laporkan hasilnya apa adanya.
```

**Baris tambahan "mode ketat"** (tempel sebagai baris kedua untuk 47, 48, 50, 51, 52 — semuanya
menyentuh data uang yang dipakai lintas halaman):

```text
Kalau ada ambiguitas: ambil keputusan paling konservatif, tulis asumsimu di laporan, lanjutkan — JANGAN berhenti untuk minta izin. Bukti yang wajib kau tunjukkan: (a) daftar file yang dibuat/diubah, (b) angka sebelum & sesudah untuk setiap klaim sinkron (saldo/Net Worth/timbangan/ekspor), (c) output 4 perintah validasi.
```



---

## 10. FASE 14 — audit uang & kejujuran tampilan (28 Sep 2026)

Sumber temuan: `docs/handoff/AUDIT-UANG-2026-09.md` (kontrak paket 57–62 — baca dulu; di situ ada
4 akar masalah lengkap dengan `file:line`, aturan uang & hapus, larangan, dan format bukti yang
wajib). Pemicunya keluhan langsung pemilik produk: kartu masih menampilkan angka contoh setelah
data dikosongkan, "Jatah Hari Ini" tidak bergerak saat ada pengeluaran, tanggal tidak realtime,
dan sebagian data sah untuk dihapus tapi belum punya pintunya.

**Urutan wajib: 57 → (58, 59) → 60 → 61 → 62.** 57 adalah PAGAR: selama belum ada satu
`todayISO()` dan satu konfigurasi uang user, paket lain hanya akan menambal tampilan tanpa
membereskan akarnya. 58 & 59 tidak saling bergantung (laporan tetap dipisah); 60 memakai hasil 57
(periode & pemasukan yang nyata); 61 & 62 menutup jalur hapus yang belum punya pintunya.

| # | Paket | File prompt | Menutup apa |
|---|---|---|---|
| 57 | Fondasi: satu "hari ini" + konfigurasi uang user + Jatah Harian turunan | `57-fondasi-waktu-konfigurasi-uang.md` | AKAR B/C/D — 5 jangkar tanggal berbeda; `monthlyIncome` onboarding nol pemakai; `SPENT_TODAY`/`SPENT_THIS_MONTH` konstanta |
| 58 | Home: satu sumber + empty state jujur + layout padat | `58-home-satu-sumber-layout-padat.md` | AKAR A di Home — Distribusi Pengeluaran hardcode Rp 3.150.000, `MOCK {hp:82, activeDays:21}`, `HOME_MONEY_*`, riwayat tanpa batas 7 hari, Jatah Harian boros ruang |
| 59 | Riwayat & Dompet: kalibrasi nyata, hapus semua, scoping, sensor rapi | `59-riwayat-dompet-jujur-privasi.md` | `TOTAL_TRANSACTIONS=24` / `HEALTH_SCORE=72`; tak ada tombol hapus semua; `wallet-detail` match by NAME; bug konteks "Bersama"→"Tunai"; sensor menggeser tata letak |
| 60 | Budget & Target Nabung, Tagihan, Kalender | `60-budget-tagihan-kalender.md` | Budget tak bisa dihapus (`applyBudgetSave` cuma create/edit); celengan tak bisa dihapus; "Pin ke Dashboard" palsu; strip 7 hari mulai 25 Sep; aksi bayar hanya lewat swipe; kalender tak realtime |
| 61 | Kekayaan & Hutang + Joint | `61-kekayaan-hutang-joint.md` | `deleteDebt`/`editDebt` ada & teruji tapi UI nol; "Catat Bayar" tersembunyi di kartu; `/joint` tak punya fungsi hapus & kantong baru berisi seed |
| 62 | Hapus data di semua jalur | `62-hapus-data-semua-jalur.md` | Dompet (API hapus ada, UI nol pemanggil); matriks kelola data; hapus akun & ekspor ikut membersihkan state baru |

Salin-tempel satu per satu (sesuaikan nomornya) — **satu paket per task**:

```text
57. Baca docs/handoff/CONTEXT-WAJIB.md dan docs/handoff/AUDIT-UANG-2026-09.md, lalu kerjakan docs/handoff/prompts/57-fondasi-waktu-konfigurasi-uang.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm test, pnpm exec tsc --noEmit, pnpm build, pnpm theme:audit) dan laporkan hasilnya apa adanya.
```
```text
58. Baca docs/handoff/CONTEXT-WAJIB.md dan docs/handoff/AUDIT-UANG-2026-09.md, lalu kerjakan docs/handoff/prompts/58-home-satu-sumber-layout-padat.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu dan laporkan hasilnya apa adanya.
```
```text
59. Baca docs/handoff/CONTEXT-WAJIB.md dan docs/handoff/AUDIT-UANG-2026-09.md, lalu kerjakan docs/handoff/prompts/59-riwayat-dompet-jujur-privasi.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu dan laporkan hasilnya apa adanya.
```
```text
60. Baca docs/handoff/CONTEXT-WAJIB.md dan docs/handoff/AUDIT-UANG-2026-09.md, lalu kerjakan docs/handoff/prompts/60-budget-tagihan-kalender.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu dan laporkan hasilnya apa adanya.
```
```text
61. Baca docs/handoff/CONTEXT-WAJIB.md dan docs/handoff/AUDIT-UANG-2026-09.md, lalu kerjakan docs/handoff/prompts/61-kekayaan-hutang-joint.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu dan laporkan hasilnya apa adanya.
```
```text
62. Baca docs/handoff/CONTEXT-WAJIB.md dan docs/handoff/AUDIT-UANG-2026-09.md, lalu kerjakan docs/handoff/prompts/62-hapus-data-semua-jalur.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu dan laporkan hasilnya apa adanya.
```

**Baris tambahan "mode ketat"** (tempel sebagai baris kedua untuk SEMUA paket 57–62 — semuanya
menyentuh data uang dan working tree ini belum di-commit):

```text
Kalau ada ambiguitas: ambil keputusan paling konservatif, tulis asumsimu di laporan, lanjutkan — JANGAN berhenti untuk minta izin. JANGAN menjalankan perintah git apa pun (stash/checkout/reset/clean/commit) — working tree ini berisi perubahan yang belum di-commit dan tidak boleh hilang. Bukti yang wajib kau tunjukkan: (a) daftar file yang dibuat/diubah, (b) angka sebelum & sesudah untuk setiap angka yang berubah, (c) output 4 perintah validasi.
```

**Dua angka basi yang wajib dikoreksi di dokumen repo (ditemukan saat audit 28 Sep 2026):**

- `CONTEXT-WAJIB.md` §10.3 masih menulis "319 test / 24 file" → hasil ukur nyata `pnpm test` =
  **511 test / 34 file**. Perbarui di paket 57 (lihat 57.5).
- `CONTEXT-WAJIB.md` §10.1 masih mengikat `DAILY_HUD` "tidak bergeser". Paket 57 mengubah cara
  angkanya dihitung (konstanta → turunan data user), jadi §10.1 **wajib** diperbarui dengan dasar
  hitungannya. Saldo kanon Rp 1.850.000 tetap tidak boleh berubah.


