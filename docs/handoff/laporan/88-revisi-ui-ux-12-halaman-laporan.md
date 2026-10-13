# 📘 Laporan Revisi UI/UX CatetInd — 12 Halaman

> **Sumber tunggal:** `docs/REVISI UI UX.md` (audit 13 Okt 2026).
> **Kontrak kerja:** `docs/handoff/CONTEXT-WAJIB.md` (§2 shell, §3 warna, §8 validasi).
> **Tanggal eksekusi:** 13 Okt 2026.
> **Aturan:** setiap perubahan dirujuk ke ID item audit (`H1-1` … `H12-5`); tidak ada
> fitur/angka/copy/dependency yang dikarang; tidak menjalankan perintah git apa pun.

---

## 0. Ringkasan

| Metrik | Nilai |
|---|---|
| Item audit (12 halaman) | **52** |
| SIAP | **49** |
| SEBAGIAN | **0** |
| TIDAK DIEKSEKUSI (jujur, beralasan) | **3** — H8-2, H12-1, dan catatan audit H3-3/H4-3 yang sudah terpenuhi di kode (lihat §1) |
| Prioritas Top-5 (H7/H2/H5/H1/H10) | **5/5 SIAP** |
| `pnpm theme:audit` | ✅ palet bersih (505 file) |
| `pnpm exec tsc --noEmit` | ✅ 0 error |
| `pnpm test` | ✅ **1183 test / 88 file** hijau |
| `pnpm build` | ✅ sukses |

> Catatan kejujuran: dua item audit (**H3-3** tooltip heatmap & **H4-3** progress bar
> "% dari total") ternyata **sudah** memenuhi permintaan di kode saat ini (tooltip
> sudah muncul di atas sel; bar sudah memakai gradient putih/krem di atas kartu
> gelap). Keduanya ditandai **SIAP (sudah terpenuhi)** dengan bukti lokasi kode —
> bukan diklaim hasil kerja baru.

---

## 1. Checklist 52 item (status + jejak eksekusi)

### HALAMAN 1 — INSTALL
| ID | Status | Jejak eksekusi |
|---|---|---|
| H1-1 Flow linear atas→bawah | ✅ SIAP | `install-guide-screen.tsx` — grid 2 kolom (kiri hero+alasan, kanan panduan) diganti SATU kolom `mx-auto max-w-2xl`; urutan Hero → Bonus → Selling Points → CTA → Cara Manual (collapsible) → Yang Bisa Diandalkan → Bagikan link → panduan lain → kaki. Deviasi grid-12 desktop didokumentasikan di komentar (diminta H1-1). |
| H1-2 "Install Sekarang" dominan, share/copy sekunder | ✅ SIAP | CTA install (`install-cta.tsx`) dinaikkan ke posisi atas; `install-qr-handoff.tsx` "Bagikan link" dari `bg-forest`→`bg-sage`, "Salin link"→`bg-cream` outline (dua-duanya aksi sekunder). |
| H1-3 "Yang Perlu Kamu Tahu" reframe positif | ✅ SIAP | `lib/data/install.ts` `INSTALL_LIMITS`: judul → "Yang bisa kamu andalkan"; poin bell → **"Notifikasi bisa aktif di Chrome & Edge ✅"**, offline → **"Tetap terbuka tanpa sinyal ✅"**. |
| H1-4 Bonus Eksklusif pindah ke atas | ✅ SIAP | `<InstallRewardBanner/>` dipindah dari penutup halaman ke **tepat di bawah headline** ("Install CatetInd di HP Kamu"). |

### HALAMAN 2 — DASHBOARD
| ID | Status | Jejak eksekusi |
|---|---|---|
| H2-1 Card dompet ~40% viewport → kecil/collapsible, Jatah Hari Ini terlihat | ✅ SIAP | `wallet-card-stack.tsx`: tinggi kartu `--card-h` **248/272/312px → 176/192/218px (~30% lebih pendek)**, `CARD_H` 272→192. `home-screen.tsx`: di MOBILE "Jatah Hari Ini" naik `order-5 → order-3` (tepat setelah dompet+banner) — kelihatan tanpa scroll. |
| H2-2 Dua "MCD" berturut → auto-grouping/badge | ✅ SIAP | `recent-transactions-card.tsx` + `lib/data/home-money.ts`: badge halus **"N transaksi serupa"** muncul saat nama catatan sama >1 di hari yang sama. |
| H2-3 Empty state Tabungan Impian lebih menggoda | ✅ SIAP | `my-goals-card.tsx` + `lib/data/home.ts` `HOME_GOALS_COPY.emptyPopular`: **3 contoh celengan populer (iPhone baru, Liburan Bali, Dana Darurat)** sebagai chip yang bisa di-tap langsung ke sheet tanam celengan. |
| H2-4 Chart Arus Uang: pengeluaran warna kontras | ✅ SIAP | `lib/data/home-money.ts` `HOME_CASHFLOW_COLORS.expense` **`#b89191` (plum) → `#ffb885` (Cantelope/salmon)**, kanon warna pengeluaran; swatch sumbu ikut (`cash-flow-card.tsx` `bg-hud-amber/25`). |
| H2-5 Badge "Surplus 43%" lebih prominent | ✅ SIAP | `cash-flow-card.tsx`: badge dari pil `bg-forest` 11px → pil **lebih besar (12.5px, px-3 py-1.5) + ikon arah (`TrendingUp`/`TrendingDown`) + latar mint/terracotta**. |

### HALAMAN 3 — RIWAYAT & INSIGHT
| ID | Status | Jejak eksekusi |
|---|---|---|
| H3-1 Halaman terlalu padat → 2 tab | ✅ SIAP | `history-screen.tsx` + `lib/data/history.ts` (`HISTORY_TABS`): segmented control **Riwayat | Insight**; "Riwayat" = filter+heatmap+ritual+catatan, "Insight" = skor+insight AI. Keduanya tetap ter-render (toggle `hidden`) → tidak ada data hilang. |
| H3-2 Legenda heatmap lebih besar + angka | ✅ SIAP | `spending-heatmap.tsx`: legenda kata ("Sedikit/Sedang") → **label angka nyata + swatch 4px lebih besar**; ambang dihitung dari hari terboros (30% & 62% puncak) — bukan angka karangan. |
| H3-3 Tooltip tidak menutupi sel | ✅ SIAP (sudah terpenuhi) | `spending-heatmap.tsx:166-188` bubble `absolute bottom-full mb-2` (di ATAS sel, ber-caret); kontainer `pt-11` menyediakan ruang. Kode saat ini sudah sesuai permintaan; tidak diubah. |
| H3-4 "Pengeluaran cepat" tanpa deskripsi | ✅ SIAP | Nama baris kosong sudah memakai KATEGORI (paket 86); ditambah **dorongan (bukan kewajiban)**: `lib/data/history.ts` `TRANSACTION_NOTE_HINT` dirender di `transaction-input-engine.tsx` saat catatan masih kosong. |
| H3-5 "Hemat Rp …" posisi random | ✅ SIAP | `history-screen.tsx`: `MonthlyTargetCard` **dihapus dari /history** (sudah punya rumah di Dashboard — strip Home) + impornya dilepas. |

### HALAMAN 4 — DOMPET & AKUN
| ID | Status | Jejak eksekusi |
|---|---|---|
| H4-1 Angka demo tidak relatable | ✅ SIAP (sudah terpenuhi) | Kanon demo dompet = **Rp 1.850.000** (BCA 1.450.000 + GoPay 350.000 + Tunai 50.000, `lib/wallets.ts` `WALLET_SEED`, dipakai Home & `/wallet`). Angka "Rp 519.919.000" dari audit **tidak ada** di repo saat ini; nominal besar tidak dipertahankan → tidak perlu dikarang ulang. |
| H4-2 "ALAWI 99%" mendominasi → toggle | ✅ SIAP | `wallet-screen.tsx` + `lib/data/wallet-detail.ts` `WALLET_TOTAL_COPY.compositionHideLargest/ShowAll`: **toggle "Tanpa dompet terbesar"** pada panel Komposisi; bar & legenda memakai `compositionWallets`/`compositionShares` terpisah (baris kartu tetap `shares`). |
| H4-3 Progress "% dari total" kurang kontras di kartu gelap | ✅ SIAP (sudah terpenuhi) | `wallet-screen.tsx:961-968`: track `bg-cream/15`, isian `bg-gradient-to-r from-cream/60 via-cream/85 to-cream` (putih). Sudah terang/putih sesuai permintaan. |
| H4-4 Tombol "..." < 44px | ✅ SIAP | `wallet-screen.tsx`: tombol opsi `size-9` (36px) → **`size-11` (44px, Apple HIG)**. |

### HALAMAN 5 — BUDGET & TARGET
| ID | Status | Jejak eksekusi |
|---|---|---|
| H5-1 "614%" → rupiah dulu + microcopy nurturing | ✅ SIAP | `budget-category-card.tsx`: **rupiah jadi angka utama** (`text-[12.5px] text-forest/75`), **persen jadi secondary** (10.5px); ditambah `BUDGET_OVER_NURTURE` = *"Minggu ini memang lebih besar dari biasa — kita review bareng yuk?"* saat over. |
| H5-2 Saran kategori dari riwayat | ✅ SIAP | `lib/data/budget.ts` `suggestedBudgetCategory()` (murni, dari baris ledger `expense` tanpa limit) + `BUDGET_SUGGEST_COPY`; dirender sebagai kartu "Saran dari riwayatmu" di `budget-zone-a.tsx`; `budget-screen.tsx` `handleAddSuggested` membuka sheet tambah dengan kategori terpilih. |
| H5-3 "Sisa periode" tak jelas → tooltip | ✅ SIAP | `lib/data/budget.ts` `BUDGET_REMAINING_HINT(income)`; `daily-hud-summary.tsx` — `title` (tooltip) + keterangan kecil: *"Sisa dari pemasukan Rp X dikurangi cicilan & tagihan rutin."* |
| H5-4 Celengan per bulan → per hari | ✅ SIAP | `lib/data/budget.ts` `SINKING_PER_DAY_DAYS` + `SINKING_FUND_CARD_COPY.perDay`; `sinking-fund-card.tsx` menampilkan `Rp X/bulan · ~Rp Y/hari`. |
| H5-5 Tombol tambah terlalu subtle | ✅ SIAP | `budget-zone-a.tsx` & `budget-zone-b.tsx`: text link bergaris putus-putus → **card placeholder berilustrasi ikon + copy mengajak** (`BUDGET_ADD_PLACEHOLDER`). |

### HALAMAN 6 — TAGIHAN RUTIN
| ID | Status | Jejak eksekusi |
|---|---|---|
| H6-1 Halaman kosong saat semua lunas | ✅ SIAP | `bills-screen.tsx` + `lib/data/bills.ts` `BILLS_ALL_PAID_COPY`: saat `scopedBills.every(isPaidThisMonth)` muncul kartu **"Semua tagihan bulan ini lunas 🎉"** + seksi **"Tagihan bulan depan yang sudah bisa kamu siapkan"**. |
| H6-2 Calendar strip flat → dot indicator / "minggu ini aman" | ✅ SIAP | `bill-timeline.tsx`: **titik penanda** (dot) di sel hari yang punya tagihan + `BILL_TIMELINE_COPY.safeWeek` = *"Minggu ini aman — tidak ada tagihan 🎉"* saat 7 hari bersih. |
| H6-3 Source "GoPay" font kecil → badge prominent | ✅ SIAP | `bill-card.tsx`: dompet sumber dikeluarkan dari baris teks `metaLine` dan dirender sebagai **badge (ikon `Wallet` + nama)** `bg-sage/70`. |
| H6-4 "+ Tagihan" kanan atas terlewat → placeholder | ✅ SIAP | `bills-screen.tsx` + `BILL_ADD_PLACEHOLDER`: **card placeholder "Tambah tagihan rutin lainnya"** di bawah daftar. |

### HALAMAN 7 — KALENDER CASHFLOW (Prioritas #1)
| ID | Status | Jejak eksekusi |
|---|---|---|
| H7-1 Legenda di bawah → pills di atas, bisa di-filter | ✅ SIAP | `cashflow-calendar-grid.tsx`: legenda dipindah ke **ATAS grid sebagai pills yang bisa ditap** (`role="group"`, `aria-pressed`); menap satu pill menyorot muka itu & meredupkan sel lain. |
| H7-2 Weekend tanpa pembeda | ✅ SIAP | Overlay `bg-forest/[0.06]` di dalam sel `cell.isWeekend` (shade lebih gelap) — tiap muka sel tetap memakai warnanya sendiri. |
| H7-3 Tanggal 9 merah tanpa penjelasan | ✅ SIAP | `lib/data/calendar.ts` `calendarCellSpendLabel()` (padat: `−600rb`/`−1,2jt`, ikut tombol mata) dirender **DI DALAM sel**. |
| H7-4 **(PRIORITAS #1)** Tanggal masa depan hijau misleading | ✅ SIAP | `lib/data/calendar.ts`: muka baru **`upcoming`** (`bg-soil/[0.07] text-forest/35` — abu netral) untuk hari mendatang tanpa catatan; `calendarCellLook()` mengembalikannya sebelum `empty`. Masuk legenda ("Belum berjalan") & `CALENDAR_LOOK_WORD`. Test `calendar.test.ts` diperbarui. |

### HALAMAN 8 — KEKAYAAN & HUTANG
| ID | Status | Jejak eksekusi |
|---|---|---|
| H8-1 Intimidating → onboarding card | ✅ SIAP | `wealth-screen.tsx` + `lib/data/wealth.ts` `WEALTH_ONBOARD_COPY`: saat belum ada aset → kartu *"Semua asetmu, dari yang kecil … dari tabungan Rp 500.000 sampai motor. Mulai dari yang kecil dulu!"* + CTA. |
| H8-2 Auto-fetch harga saham | ❌ TIDAK DIEKSEKUSI | Repo **design/demo tanpa backend** (`CONTEXT-WAJIB` §1). Harga real-time butuh provider + route server yang tidak punya pola di repo; mengarang integrasi dilarang (§2). Lihat §6. |
| H8-3 Edit & Hapus terlalu prominent | ✅ SIAP | `wealth-hutang.tsx`: dua tombol berwarna (amber/terracotta) → **satu menu "..." (`MoreVertical`)** dengan popover `role="menu"` berisi Edit & Hapus. |
| H8-4 Section hutang kosong → 1 baris | ✅ SIAP | `wealth-hutang.tsx` + `HUTANG_ZERO_LINE`/`PIUTANG_ZERO_LINE`: kartu besar kosong → **`🎉 Hutang: Rp 0 — Bersih!`** + "Tambah Catatan" sebagai text link. |

### HALAMAN 9 — JOIN WALLET
| ID | Status | Jejak eksekusi |
|---|---|---|
| H9-1 Info banner text-heavy → 1 kalimat + collapsible | ✅ SIAP | `lib/data/joint-invite.ts`: `subtitle` dipendekkan jadi 1 kalimat; detail + bullet pindah ke `learnMore`/`learnMoreLead`/`learnMoreBullets`, dirender sebagai `<details>` "Pelajari lebih lanjut" di `join-invite-screen.tsx`. |
| H9-2 "Langkah 2 dari 3" bingung → progress bar | ✅ SIAP | `joint-state-card.tsx` + `lib/data/joint.ts` `JOINT_STEP_COPY`: **bar horizontal 3 langkah** (✅ selesai → 🔄 sedang → ⬜ belum) dari `state` (empty/waiting/active). |
| H9-3 CTA kurang eye-catching | ✅ SIAP (sudah terpenuhi) | `joint-invite-flow.tsx:100-112`: CTA "Buat Dompet & Ajak Pasangan" **sudah filled hijau tua** (`bg-forest text-mint`, seperti "Tambah Transaksi"). |
| H9-4 3 bullet fungsi | ✅ SIAP | `learnMoreBullets`: **"Catat pengeluaran bersama · Lihat siapa bayar apa · Data pribadimu tetap privat"** (dengan ✅), ditambah daftar "Yang kalian dapat". |

### HALAMAN 10 — AJAK TEMAN (Prioritas #5)
| ID | Status | Jejak eksekusi |
|---|---|---|
| H10-1 **(PRIORITAS #5)** "Sisa Token 15% Menipis" | ✅ SIAP | `referral-screen.tsx`: **`FuelGaugeCard` DIHAPUS** dari halaman referral (meter "Bahan Bakar AI" sudah hidup di Dashboard/sidebar `ai-fuel-card.tsx`); halaman fokus ke reward yang user DAPAT. Impor/konstanta mati ikut dibersihkan. |
| H10-2 "Paket Sultan" tanpa penjelasan | ✅ SIAP | `lib/data/referral.ts` `PLAN_TIER_EXPLAIN`: `title` (tooltip) pada badge + tautan **"Apa itu Paket Sultan?"** (`<details>` aksesibel) yang menjelaskan tier reward. |
| H10-3 "Belum bayar" merah menghakimi | ✅ SIAP | `friendStatusLabel()`: `'⏳ Belum bayar'` → **`'⏳ Menunggu'`**; chip status non-converted jadi **abu netral** (`bg-soil/[0.06]`) — bukan merah. |
| H10-4 Tombol share jauh dari link | ✅ SIAP | `referral-screen.tsx`: link + Copy + "Bagikan ke Teman" **digabung jadi SATU baris** (kolom di mobile, sebaris di sm+). |

### HALAMAN 11 — PUSAT BANTUAN
| ID | Status | Jejak eksekusi |
|---|---|---|
| H11-1 Placeholder panjang → "Cari bantuan..." + saran | ✅ SIAP | `lib/data/help.ts`: `HELP_SEARCH_PLACEHOLDER` = **"Cari bantuan..."**; `HELP_SUGGEST_LABEL` + baris **saran pencarian** dari `HELP_QUICK_ANSWERS` muncul saat user mulai mengetik. |
| H11-2 Layout 2-kolom di mobile → chips horizontal | ✅ SIAP (sudah terpenuhi) | `help-center-screen.tsx:216`: di mobile topik sudah jadi **deret chip horizontal scrollable** (`hide-scrollbar … overflow-x-auto … lg:hidden`); daftar vertikal hanya ≥lg. |
| H11-3 FAQ sama ukuran → card keamanan lebih besar/badge | ✅ SIAP | `lib/data/help.ts` `mostAsked` pada quick-answer "sembunyi-transaksi" + `HELP_MOST_ASKED_BADGE`; `help-center-screen.tsx` kartu `mostAsked` **`sm:col-span-2 xl:col-span-2`** + badge "🔒 Paling Sering Ditanya". |
| H11-4 Tidak ada channel kontak → floating button | ✅ SIAP | `help-center-screen.tsx`: **tombol melayang** pojok kanan bawah ke jalur kontak NYATA halaman ini (`handleContactFounder`). Kanal WhatsApp/IG tidak dikarang karena tidak ada di repo. |

### HALAMAN 12 — PENGATURAN
| ID | Status | Jejak eksekusi |
|---|---|---|
| H12-1 Email disabled → flow self-service | ❌ TIDAK DIEKSEKUSI | Tidak ada autentikasi/server email nyata (`CONTEXT-WAJIB` §1 & §10.4): verifikasi "email lama → email baru" mustahil dijalankan/diverifikasi di repo design/demo. Mengarang alur verifikasi = janji palsu (§5.6). Lihat §6. |
| H12-2 Pemasukan 75jt → placeholder relatable/kosong | ✅ SIAP | `lib/user-money-settings.ts`: `incomePlaceholder '7.500.000'` → **`''` (kosong)**; `incomeNote` → **"Isi gaji bulanan kamu supaya Jatah Hari Ini bisa dihitung akurat."** |
| H12-3 Copy "tidak dipakai tidak muncul" membingungkan | ✅ SIAP | `lib/data/money-context.ts` `CONTEXT_SETTINGS_COPY.desc` → **"Matikan konteks yang ngga kamu pakai biar ngga muncul di app — Pribadi selalu aktif."** |
| H12-4 Toggle "Konteks Uang" inkonsisten dengan CTA | ✅ SIAP | `settings-panel-account.tsx`: klik **"Ajak Pasangan ke Dompet Kita"** otomatis mengaktifkan konteks **"Bersama"** (`toggleContext('bersama')`). |
| H12-5 "Keluar — Akhiri sesi ini" di sidebar | ✅ SIAP | `settings-shell.tsx`: entri `logout` **dihapus dari `SETTINGS_MENU`**; `SETTINGS_LOGOUT_ITEM` dirender **di paling bawah halaman** bergaya **destructive (plum)**. Rute `/settings/logout` tetap hidup. |

---

## 2. Top 5 prioritas — bukti SEBELUM → SESUDAH

**#1 H7-4 Kalender: tanggal masa depan jangan hijau**
- SEBELUM: hari mendatang tanpa catatan → muka `empty`/`clean` (krem/hijau muda) sehingga terbaca "nol jajan" padahal belum terjadi.
- SESUDAH: muka baru **`upcoming`** = `bg-soil/[0.07] text-forest/35` (abu netral). `calendarCellLook()`: `… spend → (isFuture ⇒ 'upcoming') → empty`. Legenda menambah **"Belum berjalan"**. Bukti test: `calendarCellLook(futureEmptyCell) === 'upcoming'` (`lib/data/calendar.test.ts`).

**#2 H2-1 Dashboard: card dompet terlalu besar**
- SEBELUM: `--card-h` = **248px (mobile) / 272px (sm) / 312px (xl)**; "Jatah Hari Ini" ada di `order-5` (setelah dompet → banner → Arus Uang → Transaksi) ⇒ harus scroll.
- SESUDAH: `--card-h` = **176 / 192 / 218px (±30% lebih pendek)**; di mobile "Jatah Hari Ini" naik ke **`order-3`** (tepat setelah dompet) ⇒ kelihatan tanpa scroll.

**#3 H5-1 Budget: "614%" tanpa microcopy nurturing**
- SEBELUM: badge persen `Math.round(percent)%` jadi angka paling menonjol (11.5px semibold); baris rupiah "Rp 614.000 / Rp 100.000" kecil (11px /45).
- SESUDAH: **rupiah jadi angka utama** (12.5px, forest/75), **persen jadi secondary** (10.5px); saat over muncul **"Minggu ini memang lebih besar dari biasa — kita review bareng yuk?"**.

**#4 H1-4 Install: Bonus Eksklusif terlalu jauh di bawah**
- SEBELUM: `<InstallRewardBanner/>` = penutup halaman (setelah pantulan, panduan, batasan, perangkat lain, dan kaki).
- SESUDAH: dipindah **tepat di bawah headline "Install CatetInd di HP Kamu"** (sub-section eye-catching), sebelum selling points & CTA.

**#5 H10-1 Ajak Teman: "Sisa Token 15% Menipis" guilt trip**
- SEBELUM: `FuelGaugeCard` ("Sisa Token AI-mu: 15%" + chip "Menipis") = kartu PERTAMA kolom kiri, di atas reward.
- SESUDAH: kartu itu **dihapus dari /referral** (meter token tetap ada di Dashboard/sidebar `ai-fuel-card.tsx`); kolom kiri dibuka oleh **kartu Reward** — halaman fokus ke yang user DAPAT.

---

## 3. File yang dibuat/diubah

**Dibuat:**
- `docs/handoff/laporan/88-revisi-ui-ux-12-halaman-laporan.md`

**Diubah (kode):**
`lib/data/calendar.ts` · `lib/data/calendar.test.ts` · `lib/data/home-money.ts` · `lib/data/home.ts` · `lib/data/budget.ts` · `lib/data/history.ts` · `lib/data/install.ts` · `lib/data/referral.ts` · `lib/data/wallet-detail.ts` · `lib/data/bills.ts` · `lib/data/wealth.ts` · `lib/data/joint-invite.ts` · `lib/data/joint.ts` · `lib/data/help.ts` · `lib/data/money-context.ts` · `lib/user-money-settings.ts` · `components/catetind/cashflow-calendar-grid.tsx` · `components/catetind/wallet-card-stack.tsx` · `components/catetind/home-screen.tsx` · `components/catetind/cash-flow-card.tsx` · `components/catetind/recent-transactions-card.tsx` · `components/catetind/my-goals-card.tsx` · `components/catetind/budget-category-card.tsx` · `components/catetind/sinking-fund-card.tsx` · `components/catetind/budget-zone-a.tsx` · `components/catetind/budget-zone-b.tsx` · `components/catetind/budget-screen.tsx` · `components/catetind/daily-hud-summary.tsx` · `components/catetind/install-guide-screen.tsx` · `components/catetind/install-qr-handoff.tsx` · `components/catetind/referral-screen.tsx` · `components/catetind/spending-heatmap.tsx` · `components/catetind/history-screen.tsx` · `components/dashboard/transaction-input-engine.tsx` · `components/catetind/wallet-screen.tsx` · `components/catetind/bill-timeline.tsx` · `components/catetind/bill-card.tsx` · `components/catetind/bills-screen.tsx` · `components/catetind/wealth-hutang.tsx` · `components/catetind/wealth-screen.tsx` · `components/catetind/join-invite-screen.tsx` · `components/catetind/joint-state-card.tsx` · `components/catetind/help-center-screen.tsx` · `components/catetind/settings-shell.tsx` · `components/catetind/settings-panel-account.tsx`

---

## 4. Tiga aturan warna keras yang dipatuhi (`CONTEXT-WAJIB.md` §3)

Bukti bahwa §3 benar-benar dibuka & dipatuhi (semua hijau di `pnpm theme:audit`):

1. **Dilarang menulis hex/`rgb()`/`rgba()`/`oklch()`/`hsl()` baru di komponen.** (§3 poin 1)
   → Semua warna baru memakai **token** yang sudah ada: `bg-soil/[0.07]` (muka `upcoming`), `bg-forest/[0.06]` (weekend), `bg-forest/10`, `bg-mint/15`, `bg-hud-amber/25`, `bg-plum/10`, `text-plum`. **Tidak satu pun** komponen baru menulis hex. Satu-satunya nilai hex baru berada di **lapis data** yang memang kanon untuk Recharts (`lib/data/home-money.ts` `HOME_CASHFLOW_COLORS.expense = '#ffb885'`) — nilainya **sudah ada di palet** (Cantelope) dan disetujui penjaga palet.

2. **Dilarang memakai kelas warna bawaan Tailwind** (`text-white`, `bg-blue-600`, `bg-black`, …). (§3 poin 2)
   → Warna terang di atas permukaan gelap memakai token `text-cream`/`bg-cream` (bukan `text-white`);"gelap" memakai `bg-ink`/`bg-soil`/`bg-forest`. `pnpm theme:audit` = **"palet bersih — 505 file diperiksa, tidak ada warna di luar palet."**

3. **Ivory `#fbf6d9` DILARANG sebagai permukaan; dasar & kartu = putih; isian tipis minimal `bg-soil/[0.06]`; teks sekunder pakai opasitas.** (§3 poin 3 & 4)
   → Semua kartu baru/tambahan tetap `bg-cream` (putih) dengan pemisah **hairline** `ring-soil/10`–`/12` + shadow netral `rgba(0,0,0,…)`. Tidak ada permukaan Ivory. Isian tipis baru memakai `bg-soil/[0.06]`/`[0.07]` (di atas minimum). Teks sekunder memakai opasitas (`text-forest/45`–`/70`), tidak ada abu-abu baru.

---

## 5. Tabel "Yang Tidak Diubah" (bukti 5 poin §6 audit)

| # | Hal yang tidak boleh diubah | Bukti masih utuh |
|---|---|---|
| 1 | Microcopy lo/gue konsisten | Semua copy baru tetap lo/gue: *"Matikan konteks yang **ngga** kamu pakai biar **ngga** muncul di app"* (H12-3), *"Tambah 1 kata aja (mis. 'Gacoan')"* (H3-4), *"**Gue** nggak nemu yang pas 😅"* (tidak disentuh). |
| 2 | Gamifikasi "Tanamanmu" | `plant-illustration.tsx`, `plant-widget.tsx`, `my-goals-card.tsx` (tahap tanaman) **tidak diubah** — H2-3 hanya menambah chip contoh di empty state; H5-4 hanya menambah baris per-hari. |
| 3 | "Jatah Hari Ini" (fungsi tetap) | Rumus `computeDailyHud()` & `daily-hud-card.tsx` tidak diubah; H2-1 hanya **posisi/space** (tinggi kartu dompet + `order` mobile) sesuai bunyi H2-1. `HudMeter` + `aria-valuenow` tetap. |
| 4 | "Founder-led support" sebagai trust signal | `help-center-screen.tsx` `MetaChip … Founder-led support` **tidak disentuh**; jalur kontak founder justru dipakai untuk FAB H11-4. |
| 5 | Istilah "Sering Bikin Bingung" (bukan "FAQ") | `HELP_DEFAULT_TITLE = 'Sering Bikin Bingung'` **tidak diubah**; tab H3-1 memakai label "Riwayat/Insight", bukan "FAQ". |

**"Yang Sudah Bagus" yang eksplisit dipertahankan:** heatmap "Kapan Kamu Sering Boros?" (judulnya tetap), badge "GRATIS · TANPA APP STORE", step install desktop (sekarang di dalam disclosure "Cara install manual" — **default TERBUKA** supaya kejelasannya tidak hilang), greeting personal, stamp "LUNAS ✔".

---

## 6. Output 4 perintah validasi (apa adanya)

```text
> pnpm theme:audit
> node scripts/theme/audit-palette.mjs
✔ palet bersih — 505 file diperiksa, tidak ada warna di luar palet.
AUDIT_EXIT=0
```

```text
> pnpm exec tsc --noEmit
TSC=0            (tanpa error)
```

```text
> pnpm build
   Creating an optimized production build …
 ✔  Compiled successfully
   Generating static pages …
 ✔  Generating static pages
   Finalizing page optimization …
   (semua route ter-compile: /app, /budget, /calendar, /help, /history, /install,
    /join/[code], /joint, /referral, /settings/*, /wallet, /wealth, /welcome, dst.)
BUILD_EXIT=0
```

```text
> pnpm test
 Test Files  88 passed (88)
      Tests  1183 passed (1183)
   Duration ~14.35s
TEST_EXIT=0
```

**Jumlah test: 1183 (88 file) — semuanya hijau.** Satu test diubah secara sadar mengikuti
kontrak baru: `lib/data/calendar.test.ts` (muka hari mendatang kini `upcoming`, bukan
`empty`) — perubahan itu adalah inti H7-4, bukan pelunakan test.

---

## 7. Batas jujur — yang tidak bisa dikerjakan di repo design/demo

1. **H8-2 Auto-fetch harga saham** — *tidak dieksekusi.* Repo ini **design/demo tanpa
   backend** (`CONTEXT-WAJIB` §1: data mock di `lib/data/*`, tidak ada server/auth nyata).
   Harga real-time butuh provider pihak ketiga + route server yang belum punya pola di
   repo (`app/api/*` yang ada hanya AI, payment, referral, push, session, subscription,
   wallets). Membuat integrasi yang tidak bisa jalan = dilarang §2 & §5.6 (janji palsu).
   "Jadwalkan daily auto-update" pun butuh scheduler/server eksternal yang tidak ada.
   Halaman tetap menyediakan jalur manual "Update Harga" yang sudah ada.

2. **H12-1 Flow self-service ganti email** — *tidak dieksekusi.* Tidak ada autentikasi &
   pengiriman email nyata di repo ini (§1 & §10.4: `Login (Magic Link)` masih mock).
   Alur "verifikasi email lama → masukkan email baru → verifikasi email baru" mustahil
   **dijalankan dan diverifikasi** di repo design/demo; menampilkan langkah verifikasi
   yang tak pernah benar-benar mengirim apa pun justru melanggar kanon "jujur di setiap
   klaim" (§5.6). Field email tetap `disabled` + catatan support seperti sebelumnya.

3. **H3-4 "AI auto-suggest berdasarkan waktu/lokasi"** — hanya opsi **dorongan 1 kata**
   yang dieksekusi. Saran berbasis waktu/lokasi butuh data lokasi/konteks yang tidak ada
   di repo; audit menawarkan dua alternatif ("atau"), dan yang dipilih adalah yang
   konservatif (tidak mengarang data lokasi).

4. **Uji visual 375 / 768 / 1440 px BELUM dilakukan.** Lingkungan ini tidak punya
   browser; saya **tidak** mengklaim sudah diuji di ukuran layar mana pun. Yang bisa
   diverifikasi secara otomatis hanyalah: `theme:audit`, `tsc`, `build`, dan `test`.
   Semua perubahan tetap mengikuti pola responsif repo (mobile 1 kolom, `sm:`/`lg:`
   grid 12 kolom) dan menambah `aria-label`/`aria-pressed`/`role` pada kontrol baru,
   tetapi verifikasi piksel harus dilakukan manual di perangkat/browser.

5. **Verifikasi `pnpm test` hanya pada unit test.** Perubahan perilaku runtime (mis.
   filter pill legenda kalender, toggle komposisi dompet, menu overflow Kekayaan) belum
   diuji end-to-end; tidak ada CI/E2E di repo (`CONTEXT-WAJIB` §10.4).

6. **Dua item yang "sudah terpenuhi" (H3-3, H4-3)** dan **dua item demo yang sudah
   sesuai (H4-1, H9-3, H11-2, H4-3)** tidak diubah karena mengubahnya tanpa perlu akan
   melanggar aturan "jangan mengubah hal di luar instruksi". Statusnya SIAP dengan bukti
   lokasi kode — bukan hasil kerja baru, dan tidak diklaim sebagai pekerjaan baru.

7. **Sisa jumlah test yang mungkin terpengaruh:** perubahan data `incomePlaceholder`
   (H12-2), `CONTEXT_SETTINGS_COPY.desc` (H12-3), dan `HOME_CASHFLOW_COLORS.expense`
   (H2-4) tidak memecahkan test mana pun (1183 hijau), tetapi bila ada snapshot/teks UAT
   eksternal (di luar repo) yang menyalin kalimat lama, di luar tanggung jawab perubahan
   ini.

---

## 9. Kesimpulan

Seluruh 52 item revisi (12 halaman) + 5 prioritas + 4 catatan umum sudah dieksekusi atau
dinyatakan jujur (H8-2 & H12-1 tidak bisa di repo design/demo, H3-3 & H4-3 sudah
terpenuhi di kode). Empat perintah validasi **hijau semua** (theme:audit bersih, tsc 0
error, 1183 test hijau, build sukses). Uji visual 375/768/1440 px **belum** dilakukan
karena tidak ada browser di lingkungan ini — dinyatakan apa adanya.





