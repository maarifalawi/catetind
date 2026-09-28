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

### FASE 9 — Sisa dari audit hasil 25/24/26
| # | Paket | Di mana | Prompt | Menutup apa |
|---|---|---|---|---|
| 29 | Sweep kontrol mati | Home, `/history`, recap | `29-sweep-kontrol-mati.md` | 10+ tombol/input tanpa aksi: Menu & Notifications (Home), "Cari transaksi…", Tambah/Detail goal, chevron goal, "+ Catat Transaksi", orbit `balance-ring`, dropdown bulan, 2 CTA Weekly Recap |
| 27 | Prorata kewajiban celengan | `/budget` | `27-sinking-obligation-prorata.md` | `sinkingObligation` penuh di semua tab → jatah mingguan Rp 742.100/hari (dilaporkan task 26) |
| 28 | Satu kategori = satu budget | `/history` → `/budget` | `28-budget-kategori-ganda.md` | insight bisa membuat baris kategori ganda (Kopi dua kali) — dilaporkan task 24 |

### FASE 10 — Sisa dari audit hasil 29/27/28 (audit 27 Sep 2026) — **30 · 31 · 32 ✅ TUNTAS & terverifikasi**
| # | Paket | Di mana | Prompt | Menutup apa |
|---|---|---|---|---|
| 30 ✅ | Celengan Home satu sumber | Home | `30-celengan-home-satu-sumber.md` | kartu "Tabungan Impian" masih memakai mock kedua → 3 tautan berhenti di `/budget` generik, bukan `/budget/<id>` (butir 5 paket 29 baru separuh) |
| 31 ✅ | Privasi: nominal di toast | `/budget`, `/wallet`, AI chat, target | `31-privasi-nominal-toast.md` | toast ber-nominal tetap tampil saat Mata Privasi ON — kandidat yang `CONTEXT-WAJIB.md:228-230` catat belum dikerjakan |
| 32 ✅ | Target nabung lintas halaman | `/history` → target | `32-target-bulanan-lintas-halaman.md` | CTA recap "Atur target nabung" di `/history` berhenti di `/budget` yang tidak punya alur target |

> **✅ Ketiganya TUNTAS & diverifikasi audit 27 Sep 2026** (bukan sekadar diklaim):
> **30** — `my-goals-card.tsx` membaca `INITIAL_SINKING_FUNDS` (`heroFundOf()`/`sortFundsByUrgency()`),
> panah hero `:218` & baris mini `:278` menuju `/budget/<id>` yang ada; `plant-widget.tsx` memakai
> `stageFromPercent()`/`stageBandProgress()` dari kartu yang sama; tiga nama fiktif lama **0 hasil**
> di `components/ lib/ app/ hooks/` (tinggal di dokumen).
> **31** — semua toast ber-nominal menyensor lewat `hide()`/`money()` **di titik toast dibuat**;
> format sensor **satu definisi** (`MASKED_AMOUNT` di `lib/data/history.ts:267`); sheet yang sedang
> disunting (`transfer-sheet`, `add-wallet-sheet`, `budget-sheet`, `contribute-sheet`,
> `edit-transaction-sheet`) **tidak tersentuh** (§5.7 utuh).
> **32** — `/history` memasang `useMonthlyReview({ auto: false })` (`history-screen.tsx:131`) +
> `MonthlyTargetCard` (`:421-430`) + `onSetTarget` (`:658`); `onSetTarget` jadi prop **wajib** dan
> cabang fallback `<Link href="/budget">` berlabel "Atur target nabung" **dihapus**; dua pemanggil
> (`home-screen.tsx:301`, `history-screen.tsx:655`) keduanya mengisi.
>
> **Sisa dari audit ini** (dibawa ke FASE 12): modal Rekap Mingguan masih **kebal** tombol mata, dan
> komentar `weekly-recap-modal.tsx:514-516` masih menyebut jalur `/budget` yang sudah dihapus.



### FASE 11 — Sisa dari uji pakai langsung — **33 ✅ TUNTAS & terverifikasi**
| # | Paket | Di mana | Prompt | Menutup apa |
|---|---|---|---|---|
| 33 ✅ | Transaksi baru benar-benar tercatat | FAB, semua CTA input, Home, `/wallet/[id]` | `33-transaksi-baru-tercatat.md` | input manual = **no-op**: payload dibuang shell (`transaction-bottom-sheet.tsx:71`, `transaction-web-modal.tsx:162`) padahal toast "kecatat" tetap berbunyi (`transaction-input-engine.tsx:386`); `recordTransaction()` hanya dipakai jalur AI capture |

> **✅ TUNTAS & diverifikasi audit 27 Sep 2026.** Kedua shell sekarang menulis lewat
> `hooks/use-transaction-submit.ts` → `recordDraftTransaction()` → bus; toast sukses **dicabut dari
> engine** (`handleSubmit` hanya menyisakan 2 toast non-sukses: masa aktif habis & nominal kosong) dan
> ditembak setelah penulisan; `recent-transactions-card.tsx` & `wallet-detail-screen.tsx` berlangganan
> bus; guard mode edit menolak draft yang membawa `wallet`+`date`.
> **Batas yang tetap terbuka** → FASE 12 #36 & #37: hapus catatan sesi masih page-local dan catatan
> `/calendar` belum masuk Riwayat (ringkasan chart Home #35 **sudah ditutup 27 Sep 2026**).

### FASE 12 — Temuan BARU dari audit verifikasi 30/31/32/33 (27 Sep 2026) — **34 · 35 ✅ TUNTAS & terverifikasi**
| # | Paket | Di mana | Prompt | Menutup apa |
|---|---|---|---|---|
| 34 ✅ | Privasi: ringkasan mingguan | modal Rekap Mingguan (Home & `/history`) | `34-privasi-ringkasan-mingguan.md` | `weekly-recap-modal.tsx` memakai `formatIDR` di 16 situs (slide 1–5) dan **tidak pernah** mengimpor `usePrivacy` ⇒ modal kebal tombol mata (§5.7); plus komentar basi `:514-516` |
| 35 ✅ | Ringkasan uang Home satu sumber | Home (chart Cash Flow vs "Transaksi Terakhir") | `35-ringkasan-uang-home-satu-sumber.md` | `cash-flow-card.tsx:7-24` masih konstanta keras (`INCOME 8.500.000`/`EXPENSE 752.000`/`SERIES`) sementara `recent-transactions-card.tsx:371-381` sudah turunan data ⇒ setelah 1 catatan, dua kartu satu layar menampilkan surplus berbeda |
| 36 | Hapus catatan sesi lintas halaman | Home, `/history`, `/wallet/[id]` | `36-hapus-catatan-lintas-halaman.md` | `recent-transactions-card.tsx:393-400` hapus page-local; bus belum punya event "removed" (komentar paket 33 menunjuk solusinya sendiri) ⇒ baris "sudah dihapus" muncul lagi di halaman lain |
| 37 | Catatan `/calendar` masuk jalur tulis yang sama | `/calendar` (+ keputusan `/joint`) | `37-catatan-kalender-jalur-tulis-sama.md` | `cashflow-calendar-screen.tsx:184-210` menyimpan ke `noteEntries` halaman + toast "tersimpan", padahal komentarnya sendiri menyebutnya "uang yang benar-benar tercatat" ⇒ tidak muncul di `/history` |

> **✅ Paket 34 TUNTAS & diverifikasi audit 27 Sep 2026** (bukan sekadar diklaim): `formatIDR` tinggal
> **1** situs di `weekly-recap-modal.tsx` yaitu `:180` — dan itu **di dalam `hide()`** (tanda `+`
> terjaga); 15 situs lain + caption slide 2 (`:73` `maskMoney`) + render (`:1018` `current.caption(masked)`)
> sudah tersensor; `usePrivacy()` ada di keempat komponen slide (`:150`/`:272`/`:539`/`:798`).
> `dots=` **0 hasil** — dua dialek titik disatukan ke `MASKED_AMOUNT`
> (`wallet-card-face.tsx:275`, `wallet-screen.tsx:959`). `onSetTarget` di `SlidePlan` kini **wajib**
> (`:534`) & komentar basi `:514-516` sudah diganti. Share card (`ShareProgressPanel` +
> `share-achievement-card.tsx` + `lib/data/share.ts`) **nol** `formatIDR` ⇒ tidak ada permukaan nominal
> yang terlewat. Sheet yang disunting (§5.7) **tidak tersentuh** (tidak ada di `git status`).
> **✅ Paket 35 TUNTAS & diverifikasi 27 Sep 2026:** `cash-flow-card.tsx` tidak lagi memuat satu pun
> nominal keras — baris seed + turunannya pindah ke `lib/data/home-money.ts`
> (`HOME_MONEY_GROUPS`/`HOME_MONEY_ROWS`, `homeCashFlowSeries`, `niceAxisMax`, `axisLabel`); kartu chart
> berlangganan `lib/transaction-bus.ts` yang SAMA dengan kartu "Transaksi Terakhir", dan kedua kartu
> menyebut `HOME_MONEY_COPY.period` ("Bulan ini") — dulu satu "bulan ini", satu "Minggu ini".
> Probe angka (dijalankan): sebelum catatan dua kartu sama-sama 8.500.000 / 752.000 / net 7.748.000 ·
> setelah 1 catatan sesi Rp 25.000 dua-duanya 8.500.000 / 777.000 / net 7.723.000, dan Σ pengeluaran
> seri = total strip (777.000). Sumbu-Y ikut tersensor `MASKED_AMOUNT` saat Mata Privasi ON.
> `DAILY_HUD` tidak bergeser (`Rp 800.000`×2 · `Rp 200.000`×1 · `4 hari`×1 di HTML Home).
> **Urutan sisa: 36 → 37** (semua independen; alasan lengkap di `PROMPT-PENDEK.md` §3).
>
> **Catatan kecil dari verifikasi #34 (bukan bug, dicatat supaya tidak hilang):**
> 1. `MaskedAmount` mengunci lebar dengan nilai asli (`opacity-0`), tapi lapisan titiknya
>    `absolute inset-0` **tanpa penjaga overflow** — kalau nominalnya sangat pendek (mis. `Rp 0` di
>    pratinjau `add-wallet-sheet`), `Rp •••••••` bisa melebihi kotaknya. **Belum bisa diuji** (tanpa
>    browser). S, kosmetik.
> 2. Saat tombol mata ON, **nilai asli tetap ada di DOM** (blur + `opacity-0` + `aria-hidden`) — bukan
>    regresi (perilaku `MaskedAmount` sejak awal), dan sesuai model ancaman repo (screenshot/pundak),
>    tapi "view-source" masih bisa membacanya. Kalau kamu mau ini ditutup, itu **keputusan pemilik
>    produk** (render bersyarat), bukan kerja agent.
> 3. `top-up-modal.tsx` mengimpor `formatIDR` **kedua** dari `@/lib/weekly-recap` (repo punya juga
>    `lib/wallets`). Duplikasi formatter yang sudah ada sebelum paket ini; S, kosmetik.
> 4. Laporan #34 menyebut `snap-payment-sheet.tsx:125/167` sebagai "nominal yang sedang disusun user";
>    sebenarnya itu **harga paket** (`formatIDR` dari `lib/data/pricing`) — kesimpulannya tetap benar
>    (bukan data user), hanya labelnya kurang tepat.






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

**Sisa PALING DEPAN (FASE 11) — ✅ TUNTAS & terverifikasi 27 Sep 2026:** mencatat transaksi dari FAB `+`
tidak tersimpan ke mana pun → sekarang panel input MENULIS ke `lib/transaction-bus.ts`
(`transaction-bottom-sheet.tsx` + `transaction-web-modal.tsx` via `hooks/use-transaction-submit.ts`),
toast sukses **dicabut dari engine** dan ditembak SETELAH penulisan (copy di `lib/data/history.ts`), dan
Home (`recent-transactions-card.tsx`) + `/wallet/[id]` ikut menampilkan catatan baru. Guard mode edit
menolak draft ber-`wallet`+`date`, jadi catatan lama tidak lahir ulang.
Masih terbuka dari temuan ini (jadi **FASE 12 #36 & #37**): **hapus catatan sesi lintas halaman** (bus
belum punya event "removed") dan **catatan `/calendar`** yang belum masuk Riwayat.

**Sisa dari FASE 10 — ✅ TUNTAS & terverifikasi 27 Sep 2026** (bukan lagi terbuka): kartu "Tabungan
Impian" Home kini membaca satu sumber (`INITIAL_SINKING_FUNDS`) dan setiap panah menuju `/budget/<id>`
yang ada · target nabung bisa dijangkau dari Home **dan** `/history` · nominal di toast ikut disensor
saat Mata Privasi ON.

**FASE 12 — sisa yang BENAR-BENAR terbuka hari ini (temuan baru audit verifikasi 30/31/32/33):**
**#34 (privasi Rekap Mingguan) ✅ TUNTAS & terverifikasi 27 Sep 2026** — modalnya kini tersensor,
sensor titik disatukan ke `MASKED_AMOUNT`. **#35 (dua ringkasan uang Home) ✅ TUNTAS & terverifikasi
27 Sep 2026** — kartu chart & kartu "Transaksi Terakhir" kini membaca satu himpunan baris
(`lib/data/home-money.ts` + bus sesi) dan menyebut periode yang sama, jadi dua angka berbeda untuk uang
yang sama mustahil tampil berdampingan. Sisa: hapus catatan sesi belum lintas halaman (#36) · catatan
`/calendar` belum masuk jalur catatan yang sama (#37).





**Sudah TUNTAS dari FASE 7** (semua diverifikasi di kode saat audit 27 Sep 2026): `/wealth` edit
aset (`wealth-screen.tsx:183` + `:364`) · `/budget` tab periode non-bulanan (`periodTab` +
`periodWindowForTab`) · panel Review AI Coach (`spending-review-sheet.tsx`) · AI Chat voice &
scan struk (`ai-chat-widget.tsx`) · kuota AI satu sumber (`billing-panel.tsx:27-41` mengimpor
`lib/ai-quota.ts`, angka `/terms` cocok: 601.500 token & 1.265 panggilan) · Grace/Post-Grace
(`subscription-gate-provider.tsx` + `subscription-banner.tsx`).

**Menunggu keputusan kamu (bukan tugas agent):** angka harga langganan (lihat §3) **dan** kanon
cicilan — `TOTAL_INSTALLMENTS` Rp 800.000 (kanon HUD/bulanan) vs `lib/data/wealth.ts`
Rp 1.070.000 vs `lib/data/calendar.ts` Rp 1.870.000 vs `lib/data/bills.ts` Rp 800.000.
Menyatukan ke satu turunan akan mengubah angka layar Home/wealth/calendar, jadi butuh keputusanmu
(dokumentasi & arah produksi ada di blok "KANON CICILAN", `lib/data/budget.ts:98-126`).


**Perlu di-commit (audit verifikasi 27 Sep 2026, setelah paket 34):** hasil paket
**29/27/28/30/31/32/33/34 SEMUANYA masih di working tree** — `git status --short` = **34 file `M` +
10 file baru (`??`)**: 8 prompt (`prompts/30..37*.md`) + `hooks/use-transaction-submit.ts` +
`lib/data/home.ts` (+ `next-env.d.ts`, ditulis ulang `pnpm build`: `.next/dev/types` → `.next/types`;
bukan editan tangan). File `M` baru dari paket 34: `components/catetind/wallet-card-face.tsx`
(+ `weekly-recap-modal.tsx` & `wallet-screen.tsx` yang sudah `M` sejak paket 31). Tiga file **dipakai
dua paket** sehingga tidak bisa dipisah bersih tanpa per-hunk: `lib/data/history.ts`,
`components/catetind/recent-transactions-card.tsx`, `components/catetind/history-screen.tsx`
(29 **dan** 33). Blok perintah commit ada di laporan paket 33 (Opsi A satu commit vs Opsi B per-hunk).




**Route yatim & dead code sudah dibersihkan (task 22):** `app/overview/` + `overview-screen.tsx` (0 tautan masuk, tidak ada di inventaris) dan `transaction-list.tsx` (0 pemakai) dihapus; `tsconfig.tsbuildinfo` berhenti dilacak git. Alasan tiap keputusan "jangan hapus" ada di §3.

**Route yatim & skrip sekali-pakai sudah dibersihkan (task 06):** `/more` dan
`/family` dihapus, entri `/family` di sidebar desktop dicabut, dan
`temp-write-sidebar.js` + `fix_slides2.py` (0 byte) + `scripts/tmp-probe-sidebar.mjs`
(probe CDP sekali-pakai) dihapus dari repo.

**Kebersihan yang diverifikasi ulang (audit verifikasi 27 Sep 2026):** scan kontrol mati prompt 29 §11 →
**6 hasil, semuanya false positive** (4 `<button>` di dalam `trigger={<…>}` `TransactionBottomSheet`
— `daily-hud-card.tsx:101`, `daily-hud-summary.tsx:80`, `recent-transactions-card.tsx:454`,
`wallet-detail-screen.tsx:639`; 1 **teks komentar** yang menyebut `<button>` — `not-found-screen.tsx:49`;
1 `ButtonPrimitive` primitif Base UI yang kena `-match` case-insensitive — `ui/button.tsx:50`) ·
0 komponen/`lib`/hook tanpa pemakai · 0 route tanpa tautan masuk (`/insight` sengaja redirect) ·
0 berkas `*.log` & 0 artefak build ter-track (`*.log` + `tsconfig.tsbuildinfo` + `.env*.local`
sudah di-ignore) · `/wallet/9999` & `/budget/9999` → HTTP **404** + `app/not-found.tsx` → `not-found-screen.tsx`
(cek HTTP langsung di server produksi) · `pnpm build` menampilkan **`Running TypeScript`**
(bukan "Skipping validation of types") · 0 penanda sisipan sambung (komentar HTML berisi kata
"LANJUT") di `docs/handoff/` ·
semua nama file prompt yang dirujuk index **ada** (33 file pra-FASE-12; sekarang 37).
**Catatan keterbatasan scan:** skrip PowerShell §11 memakai `Get-Content $_.FullName` pada path
ber-kurung siku, jadi 4 route dinamis (`app/{budget,wallet,join,share}/[id]/page.tsx`) **terlewat** —
ketiganya hanya route tipis (`metadata` + `notFound()`), diperiksa manual: tidak ada kontrol.

**TODO yang SENGAJA dibiarkan (bukan placeholder user-facing):** 4 TODO ilustrasi
(`budget-zone-b.tsx:64`, `history-screen.tsx:682`, `joint-invite-flow.tsx:53`,
`onboarding-plant-ceremony.tsx:73` — nomor baris diperbarui audit ini; dulu tertulis 623) —
semuanya sudah punya ikon/emoji + copy + CTA hidup; yang diminta hanya aset ilustrasi khusus, jadi
tidak menahan V1. Sisa TODO lain (`Midtrans`, `Supabase`, `DeepSeek`, `SUM(balance)`) semuanya
**komentar arah produksi**, tidak ada yang terlihat user.



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

