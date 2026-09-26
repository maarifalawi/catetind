# 🗺️ ROADMAP HALAMAN — CatetInd (urutan pengerjaan)

> **Cara pakai (pendek):** buka task baru → tempel **satu baris** dari
> [`PROMPT-PENDEK.md`](./PROMPT-PENDEK.md) → selesai. Semua konteks dibaca agent
> dari file di repo (`CONTEXT-WAJIB.md` + `prompts/NN-*.md` + PRD), jadi tidak ada
> teks panjang yang perlu di-copy.

---

## 0. Prompt yang dipakai

```text
Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/NN-nama-file.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm theme:audit, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
```

Ganti `NN-nama-file.md` (16 baris siap-tempel + opsi "mode ketat" ada di
[`PROMPT-PENDEK.md`](./PROMPT-PENDEK.md)).

**Yang WAJIB ada di prompt hanya 4 hal** — sisanya tidak perlu karena agent bisa
membaca repo: (1) perintah baca file konteks, (2) nama prompt halaman,
(3) larangan berhenti di rencana, (4) perintah jalankan validasi + lapor bukti.

<details>
<summary><b>Cadangan:</b> blok pembuka panjang (untuk agent/sesi yang TIDAK bisa membaca repo — mis. tempel ke chat di luar IDE)</summary>

```text
Kamu bekerja di repo CatetInd (Next.js 16 + React 19 + Tailwind v4 + TypeScript,
package manager pnpm). Ini repo DESIGN/DEMO: semua data mock di lib/data/*,
tanpa backend.

LANGKAH WAJIB SEBELUM MENULIS KODE (jangan dilewati satu pun):
1. Baca docs/handoff/CONTEXT-WAJIB.md SAMPAI HABIS — isinya kontrak kerja repo:
   konvensi file, aturan warna keras, bahasa & suara copy, profil psikologis
   audiens (Gen-Z & first-jobber Indonesia), ergonomi mobile, peta baca PRD,
   checklist validasi, dan Definition of Done.
2. Baca 2-3 file kode tetangga yang paling mirip dengan halaman yang diminta,
   lalu IKUTI gaya, penamaan, struktur komponen, dan gaya komentar Bahasa
   Indonesia-nya (jelaskan "kenapa", bukan "apa").
3. Baru baca section PRD spesifik yang disebut di prompt halaman ini
   (CatetInd_Master_PRD_Lengkap.md) + inventaris_ui_definitif.md.

ATURAN HASIL:
- Implementasi UTUH. Dilarang meninggalkan TODO, placeholder "segera hadir",
  atau komponen kosong untuk hal yang diminta.
- Semua copy user-facing Bahasa Indonesia, santai-hangat, tanpa menghakimi,
  dan disimpan sebagai konstanta di lib/data/* (bukan string di JSX).
- Warna HANYA dari token palet (docs/theme/PALETTE.md). Dilarang hex/rgb baru
  dan dilarang kelas warna bawaan Tailwind.
- Kalau menemukan sesuatu yang memang di luar scope V1 menurut PRD (misal
  Properti/Aset Fisik per PRD Asumsi A12), JANGAN dipaksa dibangun: tampilkan
  teaser jujur + tulis alasannya di komentar.

SEBELUM MELAPOR SELESAI, jalankan dan tempel hasilnya:
  pnpm theme:audit ; pnpm exec tsc --noEmit ; pnpm build
Laporan akhir wajib memuat: file yang dibuat/diubah, keputusan desain + alasan,
dan hasil ketiga perintah di atas (apa adanya, termasuk yang gagal).
```

</details>

---

## 1. Aturan urutan

Urutannya bukan selera — ada alasan teknis:

1. **Tutup dulu jalan buntu di dalam app.** Dua halaman detail (Fase 1) sudah
   *ditautkan* dari UI tapi belum ada route-nya, jadi user demo menabrak toast
   "segera hadir". Ini kerusakan yang paling terasa dan paling murah diperbaiki.
2. **Modal yang menggantung** (Fase 2) satu paket dengan halaman yang sudah ada;
   dikerjakan setelah Fase 1 supaya pola sheet sudah matang.
3. **Bersih-bersih** (Fase 3) sebelum menambah halaman baru — supaya tidak
   menumpuk route yatim (`/more`, `/family`) dan placeholder visual (`/install`).
4. **Pintu masuk publik** (Fase 4) baru setelah app dalamnya rapi: `/login` dulu
   (fondasi), lalu `/join/[code]` & `/checkout`, terakhir `/share/[id]`.
5. **Legal** (Fase 5) butuh copy harga & klaim dari Fase 4 supaya konsisten.
6. **Paket modal kebiasaan** (Fase 6) terakhir: nilainya paling kecil untuk demo,
   dan butuh tone yang sudah matang dari seluruh halaman sebelumnya.

**Aturan dependensi:** jangan mulai sebuah item sebelum item yang ia butuhkan
selesai — mis. `/join/[code]` butuh `/login` ada dulu; `/checkout` butuh
navigasi publik + komponen harga yang sama dengan `/settings/billing`.

---

## 2. Daftar prioritas (berurutan)

### FASE 1 — Tutup jalan buntu (dead-end) di dalam app
| # | Halaman | Route | Inventaris | Prompt | Kenapa duluan |
|---|---|---|---|---|---|
| 1 | Dompet Detail | `/wallet/[id]` | #13 | `01-wallet-detail.md` | Route belum ada; kartu dompet sekarang hanya punya popover aksi (belum bisa dibuka ke detail), dan "Pindah Saldo" di popover itu masih toast |
| 2 | Celengan / Sinking Fund Detail | `/budget/[id]` | #25 | `02-budget-detail.md` | `budget-screen.tsx:220` masih toast "halaman detail celengan segera hadir" |

### FASE 2 — Modal yang menggantung di halaman yang sudah ada
| # | Paket | Dipakai di | Prompt | Isi |
|---|---|---|---|---|
| 3 | Edit & Hapus Tagihan + Transaksi | `/bills`, `/history` | `03-modal-edit-tagihan-transaksi.md` | Sheet edit pre-filled (`bills-screen.tsx:125`, `history-screen.tsx:142`) |
| 4 | Tambah Dompet + Pindah Saldo | `/wallet` | `04-modal-tambah-dompet-transfer.md` | Modal tambah dompet (`wallet-screen.tsx:200`) + sheet transfer (`wallet-screen.tsx:243`) |

### FASE 3 — Bersih-bersih halaman
| # | Paket | Route | Prompt | Isi |
|---|---|---|---|---|
| 5 | 404 Nurturing | `app/not-found.tsx` | `05-404-not-found.md` | Inventaris #32 — sekarang tidak ada sama sekali |
| 6 | Navigasi bersih | `/more`, `/family` | `06-cleanup-more-family.md` | `/more` = stub yatim (PRD 2A.6 = Vaul sheet, jadi route-nya redundan); `/family` = markup mentah & tidak ada di inventaris |
| 7 | Instalasi PWA | `/install` | `07-install-qr-ilustrasi.md` | 2 placeholder nyata: `[QR Code segera hadir]`, `[Ilustrasi segera hadir]` |

### FASE 4 — Pintu masuk publik (fondasi flow end-to-end)
| # | Halaman | Route | Inventaris | Prompt | Depends on |
|---|---|---|---|---|---|
| 8 | Checkout + Registrasi | `/checkout` (+ modal #n) | #3 | `08-checkout-registration.md` | — |
| 9 | Login Magic Link + Cek Email | `/login`, `/login/verify` | #8, #9 | `09-login-magic-link.md` | #8 (saling taut) |
| 10 | Invite Landing Joint Wallet | `/join/[code]` | #7 | `10-join-invite-landing.md` | #9 |
| 11 | Share Preview publik | `/share/[id]` | #16 | `11-share-preview.md` | — (mandiri) |

> **Catatan urutan:** Checkout dikerjakan **sebelum** Login karena halaman registrasi
> (`/checkout`) dan halaman login saling menautkan; dengan urutan ini, saat `/login`
> dibuat, target tautannya (`/checkout`) sudah ada. Aturan umum: **jangan pernah
> memasang tautan ke route yang belum ada.**

### FASE 5 — Legal
| # | Halaman | Route | Inventaris | Prompt | Depends on |
|---|---|---|---|---|---|
| 12 | Privacy Policy | `/privacy` | #4 | `12-privacy-policy.md` | — (membuat `legal-shell.tsx`) |
| 13 | Terms of Service | `/terms` | #5 | `13-terms-of-service.md` | #12 (pakai ulang `legal-shell.tsx`) |

### FASE 6 — Paket modal kebiasaan (opsional, nilai demo paling kecil)
| # | Paket | Trigger | Inventaris | Prompt | Depends on |
|---|---|---|---|---|---|
| 14 | Renewal Modal + One-Tap Renew | 1 hari sebelum expired | #m | `14-modal-renewal.md` | #08 (sumber harga `lib/data/pricing.ts`) |
| 15 | Monthly Review & Target Setup | tanggal 1–3 buka app | #i | `15-modal-monthly-review.md` | — |
| 16 | Milestone Celebration | streak 7/14/21/30, target tercapai | #k | `16-milestone-celebration.md` | — |

### FASE 7 — Sisa hasil audit SETELAH 16 task di atas dijalankan ✅ wajib
| # | Paket | Di mana | Prompt | Menutup apa |
|---|---|---|---|---|
| 17 | Wealth: Edit Aset + Riwayat Bayar Hutang | `/wealth` | `17-wealth-edit-aset-riwayat-bayar.md` | `wealth-screen.tsx:145` (toast) & `wealth-hutang.tsx:846` (placeholder terlihat user) |
| 18 | Budget: Tab Periode non-Bulanan | `/budget` | `18-budget-periode-non-bulanan.md` | `budget-zone-a.tsx:135` "Segera hadir" (vs inventaris #24) |
| 19 | Budget: Panel Review AI Coach | `/budget` | `19-budget-review-ai-coach.md` | `budget-screen.tsx:242` (toast) — CTA yang PRD 649–651 rancang |
| 20 | AI Chat: Voice + Scan Struk | widget AI Coach | `20-ai-chat-voice-scan-struk.md` | `ai-chat-widget.tsx:154-162` (2 toast "segera hadir") |
| 21 | Kuota AI satu sumber | sidebar, billing, ToS | `21-kuota-ai-satu-sumber.md` | 3 angka berbeda: `lib/ai-quota.ts` vs `billing-panel.tsx` vs `lib/legal/terms.ts` |
| 22 | Bersih-bersih route yatim & dead code | `/overview`, komponen | `22-bersih-bersih-overview-dead-code.md` | `app/overview` (0 tautan) + `transaction-list.tsx` (0 pemakai) |
| 23 | Grace Period & Post-Grace global | semua halaman app | `23-grace-period-global-gate.md` | inventaris state **III/IV/VI** — belum ada sama sekali |

### FASE 8 — Sisa terakhir (audit ulang setelah 17–23 dijalankan)
| # | Paket | Di mana | Prompt | Menutup apa |
|---|---|---|---|---|
| 24 | Tombol mati & CTA placeholder | Home, `/history` | `24-tombol-mati-cta-placeholder.md` | `home-banner.tsx:183` tombol **tanpa `onClick`** · `history-screen.tsx:238` toast *"Aksi insight … segera tersedia"* |
| 25 | Hygiene repo & titik aman git | root, `next.config.mjs` | `25-hygiene-repo-git.md` | `cline-dev-server.log` **ter-track** (432 KB) · `dev-smoke*.log` tak ter-ignore · `ignoreBuildErrors: true` · **158 baris belum di-commit** |
| 26 | Pacing pool per-periode | `/budget` | `26-pacing-pool-per-periode.md` | pool uang Mingguan/Siklus masih bulanan (keterbatasan yang dilaporkan task 18) |

---

## 3. SENGAJA tidak dikerjakan (jangan dianggap utang)

| Item | Alasan |
|---|---|
| **Landing Page & Pre-Launch Waitlist** (`/`) | Diminta di-skip. Catatan: route `/` sekarang berisi dashboard (`HomeScreen`), jadi saat landing dibuat nanti, dashboard harus dipindah ke `/app` lebih dulu — **dan itu pekerjaan terpisah** karena menyentuh seluruh tautan navigasi. |
| **Tab Properti & Aset Fisik** (`/wealth`) | PRD Asumsi **A12**: properti/aset fisik **TIDAK masuk V1** (beachhead = first-jobber 22–27 yang mayoritas belum punya properti); grid nav menampilkan badge "Segera" sebagai teaser. Placeholder yang ada sekarang **sudah sesuai PRD** — cukup rapikan tampilannya bila menyentuh halaman itu. |
| Bank-sync / open banking | Anti-dark-pattern & PRD menolak; pencatatan manual-first. |
| Supabase / RLS / Midtrans nyata | Repo demo: tetap mock, cukup diberi komentar arah produksi. |
| **Angka harga langganan (repo vs PRD)** | `lib/data/pricing.ts` memakai tier repo (bulanan turunan + tahunan Rp49k/109k/199k), sementara PRD menyebut Bulanan Rp49.000 & Tahunan Rp399.000. Ini **keputusan bisnis pemilik produk**, bukan kerja agent — angkanya sudah terpusat di satu file, jadi menggantinya = ubah 1 tempat + copy. **Jangan diubah agent** sampai kamu putuskan. |

**Sudah dihapus di Fase 3 — jangan dihidupkan lagi tanpa keputusan produk (task 06):**

| Route yang dihapus | Alasan |
|---|---|
| `/more` | Menu "Lainnya" menurut PRD 2A.6 adalah **Vaul bottom sheet** di `MobileBottomNav`, bukan halaman. Route lamanya cuma tulisan `<h1>Lainnya</h1>` dan tidak punya satu pun tautan masuk. |
| `/family` | "Keluarga" menurut PRD 2C.2 adalah **konteks uang** (`ContextSwitcher` + `MoneyContextProvider` — masih berfungsi penuh), bukan halaman. Halamannya markup mentah, tidak ada di `inventaris_ui_definitif.md`, dan entri sidebar-nya masuk lewat skrip sekali-pakai (`temp-write-sidebar.js`, ikut dihapus). Kalau nanti jadi modul nyata: tambahkan entri inventaris + prompt baru dulu, dasarnya PRD 758–807 + 3303–3352. |

Catatan lengkap keputusannya ada di komentar `components/catetind/desktop-sidebar.tsx`.

**Sudah dihapus di FASE 7 — jangan dihidupkan lagi tanpa keputusan produk (task 22):**

| Item yang dihapus | Alasan |
|---|---|
| Route `/overview` + `components/catetind/overview-screen.tsx` | Dashboard versi lama: **0 tautan masuk** (`href="/overview"` = 0 hasil) dan **tidak ada di `inventaris_ui_definitif.md`** (kanon 32 route). Isinya hanya `BalanceRing` + `IncomeCard`, dan keduanya sekarang hidup di panel "Your Balance Overview" milik `/` — jadi tidak ada informasi yang hilang. Route-nya juga tidak punya `metadata` seperti halaman lain. |
| `components/catetind/transaction-list.tsx` | **0 pemakai** sejak `/family` dihapus (task 06). Kalau nanti perlu daftar transaksi, pakai `history-transaction-row.tsx` (pola hidup di `/history`) — jangan bangkitkan yang ini: `tx.date.toLocaleDateString()` di dalamnya berpotensi hydration mismatch. |

**Yang SENGAJA tetap hidup** (bukan sisa): `overview-panel.tsx` (dipakai `home-screen.tsx:219`) · `balance-ring.tsx` (`overview-panel.tsx:124`) · `income-card.tsx` (`overview-panel.tsx:134`) · `lib/data/transactions.ts` (`home-screen.tsx:32`).

**`tsconfig.tsbuildinfo` berhenti dilacak git** (task 22) — artefak `incremental` yang berubah tiap `tsc` dijalankan; file lokalnya tidak dihapus, cuma berhenti dilacak.

---

## 4. Status ringkas (per hari ini)

**Semua route inventaris #3–#32 sudah ada** (landing & waitlist #1–#2 di-skip atas permintaan):
`/app/onboarding` · `/wallet` + `/wallet/[id]` · `/history` · `/budget` + `/budget/[id]` ·
`/bills` · `/calendar` · `/joint` · `/wealth` · `/install` · `/help` · `/referral` ·
`/settings` + 8 sub-halaman · `/checkout` · `/login` + `/login/verify` · `/join/[code]` ·
`/share/[id]` · `/privacy` · `/terms` · `not-found` · `/insight` (redirect).

**Sisa yang masih kurang (FASE 7 di atas)** — semuanya terverifikasi lewat audit ulang:
`/wealth` (edit aset + riwayat bayar hutang) · `/budget` (tab periode non-bulanan +
panel Review AI Coach) · AI Chat (voice & scan struk) · kuota AI belum satu sumber ·
Grace/Post-Grace global belum ada.

**Menunggu keputusan kamu (bukan tugas agent):** angka harga langganan (lihat §3).

**Perlu di-commit:** seluruh hasil 16 task pertama masih belum di-commit (±50 berkas,
termasuk `docs/handoff/` yang masih untracked) — jalankan `git status` sebelum mulai
task berikutnya, supaya `git diff` tetap berguna untuk review.

**Route yatim & dead code sudah dibersihkan (task 22):** `app/overview/` + `overview-screen.tsx` (0 tautan masuk, tidak ada di inventaris) dan `transaction-list.tsx` (0 pemakai) dihapus; `tsconfig.tsbuildinfo` berhenti dilacak git. Alasan tiap keputusan "jangan hapus" ada di §3.

**Route yatim & skrip sekali-pakai sudah dibersihkan (task 06):** `/more` dan
`/family` dihapus, entri `/family` di sidebar desktop dicabut, dan
`temp-write-sidebar.js` + `fix_slides2.py` (0 byte) + `scripts/tmp-probe-sidebar.mjs`
(probe CDP sekali-pakai) dihapus dari repo.

**Perlu di-commit dulu:** perubahan terakhir (`help`, `referral`, `settings/*`,
`settings-shell`, `help-center-screen`, `lib/data/help`, `lib/data/referral`)
masih belum masuk commit — cek `git status` sebelum mulai task baru.

---

## 5. Setelah semua selesai (usul berikutnya, jangan dikerjakan sekarang)

1. **Pindahkan dashboard `/` → `/app`** lalu bangun landing + waitlist di `/`
   (mengembalikan inventaris #1–#2). Ini menyentuh SEMUA tautan navigasi
   (`MobileBottomNav`, `desktop-sidebar`, seluruh `href="/"`), jadi kerjakan
   sendiri di task khusus.
2. **Integrasi Midtrans nyata** (top-up token, upgrade tahunan, cancel langganan) —
   seluruh titiknya sudah ditandai `TODO` di `top-up-modal.tsx`, `annual-plan-modal.tsx`,
   `billing-panel.tsx`, `renewal-modal.tsx`. Sisa placeholder AI (voice & scan struk)
   sudah pindah ke **FASE 7 #20** karena itu benar-benar bisa dikerjakan sekarang.
3. **State Grace Period / Post-Grace** di semua halaman app (inventaris state
   III–IV) — butuh gerbang global, bukan per halaman.

