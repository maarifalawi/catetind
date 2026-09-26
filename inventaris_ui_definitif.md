# INVENTARIS DEFINITIF UI CATETIND
> **Hasil audit menyeluruh 6 auditor × 8 file PRD**
> Tanggal: 23 Sep 2026
> Setiap item di-cross-check ke section PRD spesifik

---

## KELOMPOK 1 — HALAMAN PUBLIK (7 halaman)

| # | Halaman | Route | Sumber PRD | Isi |
|---|---|---|---|---|
| 1 | **Pre-Launch Waitlist** | `/` (sementara) | Domain 7A | Mini Pain Calculator, email capture, posisi antrian sukses, referral link, tombol Share/Copy |
| 2 | **Full Landing Page** | `/` (saat launch) | Domain 6 (Section 1-6) | Hook headline, Pain Calculator interaktif, Wealth Gap Visualizer (Recharts), Live Purchase Feed, Testimonials (5 quote), Dynamic Price Counter + slot progress bar, FAQ Accordion (7 objections), **Sticky Footer CTA** (muncul setelah scroll past Section 5) |
| 3 | **Checkout Page** | `/checkout` | Domain 5A, 6 Sec 5 | Halaman khusus pembayaran — fetch harga real-time (no-cache), Registration Modal (email+nama), Midtrans Snap popup |
| 4 | **Privacy Policy** | `/privacy` | Domain 5E | Legal, OJK disclaimers |
| 5 | **Terms of Service** | `/terms` | Domain 5E | Legal |
| 6 | **Cara Install PWA** | `/install` | Competitor Audit | Step-by-step per platform: iOS Safari, Android Chrome, Desktop |
| 7 | **Joint Wallet Invite Landing** | `/join/[code]` | Domain 2D.2 | "Halo! [Nama A] mengajakmu kelola uang bareng..." → redirect login → auto-join wallet |

---

## KELOMPOK 2 — AUTH (2 halaman)

| # | Halaman | Route | Sumber PRD | Isi |
|---|---|---|---|---|
| 8 | **Login (Magic Link)** | `/login` | Domain 5A, 6 Sec 5 | Input email saja (ZERO password), tombol "Kirim Magic Link", link ke registrasi baru |
| 9 | **Cek Email / Callback** | `/login/verify` | Domain 5A | Konfirmasi "cek email kamu", auto-redirect setelah klik magic link |

---

## KELOMPOK 3 — PRE-APP (1 halaman, multi-step)

| # | Halaman | Route | Sumber PRD | Isi |
|---|---|---|---|---|
| 10 | **Onboarding (3 step, 60 detik)** | `/app/onboarding` | Domain 6 Sec 5, Blueprint | **Step 1:** "Siapa kamu?" — multi-select life situation (toggle modul: Freelancer/Sandwich Gen/Pasangan/Investasi), pilih **Dashboard Period** (Bulan kalender vs Siklus gajian). **Step 2:** "Berapa pemasukan bulananmu?" (**OPSIONAL** — boleh dikosongkan) + auto-suggest alokasi 50/30/20; wajib minimal 1 akun/wallet. **Step 3:** "Catat transaksi pertamamu!" — langsung 4-tap input + push notification permission prompt + menyiram benih tanaman pertama |

---

## KELOMPOK 4 — CORE IN-APP (6 halaman)

| # | Halaman | Route | Sumber PRD | Isi |
|---|---|---|---|---|
| 11 | **Home / Daily HUD** | `/app` | Domain 2B, 3A, 3B, 3D | Header greeting + tanggal, **Tanaman SVG** (tap → Plant Detail modal), **Daily HUD Card** (sisa jatah hari ini, circular progress Recharts, copy status conditional sage/amber/terracotta), 5 transaksi terakhir (swipeable rows: swipe kiri → hapus, swipe kanan → edit), **Weekly Recap Banner** (conditional Jumat-Minggu), **Sinking Fund Nudge** (conditional tanggal >5 belum kontribusi), **Context Switcher pill toggle** (Pribadi / Keluarga / Bersama — sticky header), **AI Usage Fuel Gauge** (conditional muncul >70% usage), **Renewal Banner** (conditional 7/3 hari sebelum expired) |
| 12 | **Wallet List** | `/app/wallet` | Domain 2A, Blueprint | List semua akun/wallet: Cash, Bank (logo bank dari daftar), E-Wallet. Saldo per wallet. Tombol "+ Tambah Akun". Total saldo gabungan di atas |
| 13 | **Wallet Detail** | `/app/wallet/[id]` | Domain 2A | Saldo wallet spesifik + transaksi yang di-filter hanya untuk wallet ini + chart mini trend |
| 14 | **History & Insights** | `/app/history` | Domain 2A.5, 3D | **Filter Global** (search NLP `Cari "pengeluaran kopi bulan lalu"…` + 4 filter Waktu/Wallet/Tipe/Kategori) SELALU di paling atas halaman. Daftar transaksi grouped by tanggal (kartu per hari + total harian pill, chip biru "pindah dana" untuk saving/transfer), klik baris → Detail Transaksi modal, ikon titik tiga → sheet aksi (Lihat detail/Edit/Hapus). **Insight Cards** (muncul setelah 30 transaksi): Category Trend Alert, Monthly Comparison, Spending Spike Alert, Savings Rate Card (**wajib punya CTA** ke Sinking Fund/Reksadana), Financial Health Score Widget (0-100). **Kartu "Kalibrasi Profil AI"** (muncul jika <30 transaksi: "X transaksi lagi buat kalibrasi profilmu" — BUKAN label kewarasan finansial). Heatmap "Kapan kamu sering boros?" berupa **matriks kalender 7 kolom × 4–5 baris** (Sen–Min) dengan tooltip bubble ber-caret per sel |
| 15 | **Settings (Menu Master)** | `/app/settings` | Domain 2B.5, 4C, 5A, 5C | Menu navigasi ke 7 sub-halaman + "Export Data Saya" button + Logout |
| 16 | **Share Preview (Public)** | `/share/[id]` | Domain 7D | Halaman publik saat orang lain klik link share progress card. Menampilkan Achievement Card (tanpa angka keuangan) + CTA "Mau kayak gini? Gabung CatetInd" |

---

## KELOMPOK 5 — SUB-HALAMAN SETTINGS (7 halaman)

| # | Sub-halaman | Route | Sumber PRD | Isi |
|---|---|---|---|---|
| 17 | **Profil & Akun** | `/app/settings/profile` | Domain 8B | Nama, email, avatar, **Founding Member Badge** (#47), status member |
| 18 | **Langganan & Billing** | `/app/settings/billing` | Domain 5A, 5C | Status langganan aktif, tanggal expired, **One-Tap Renew Button** (pakai saved Midtrans token), riwayat pembayaran, metode pembayaran tersimpan, trust badge "Tanpa auto-renew", **AI Token Fuel Gauge** (progress bar: base quota vs add-on, tanggal reset), tombol beli AI Token add-on |
| 19 | **Tampilan & Tema** | `/app/settings/appearance` | Competitor Audit | Toggle terang/gelap, pilihan tema warna (jika ada) |
| 20 | **Kustomisasi Kategori** | `/app/settings/categories` | Competitor Audit, Domain 2A.3 | Manage kategori: Default bawaan, Custom, atur ikon/warna/nama |
| 21 | **AI Preferences** | `/app/settings/ai` | Domain 4B | Toggle AI auto-categorization on/off, pilihan bahasa AI (ID/EN), kuota usage detail |
| 22 | **Notifikasi** | `/app/settings/notifications` | Domain 3A | Toggle per jenis: Reminder Harian (12:30 + 19:00), Laporan Mingguan (Minggu 20:00), Laporan Bulanan, Tanaman Layu, Tagihan Jatuh Tempo. Max 3 push/minggu |
| 23 | **Keamanan / PIN Lock** | `/app/settings/security` | Competitor Audit | PIN app lock ("kunci app di perangkat ini"), toggle biometrik jika tersedia |

---

## KELOMPOK 6 — MODULE PAGES (7 halaman)

| # | Halaman | Route | Sumber PRD | Isi |
|---|---|---|---|---|
| 24 | **Budgeting** | `/app/budget` | Domain 2B | Tab periode: Mingguan/Bulanan/Custom (Siklus Gajian). List budget per kategori + progress bar masing-masing. Tombol "+ Budget Baru". Sinking Fund list di bawah (atau tab terpisah): card per fund dengan plant progress icon (Benih/Tunas/Tanaman/Berbunga sesuai persentase) |
| 25 | **Goal / Sinking Fund Detail** | `/app/budget/[id]` | Domain 2C.3 | Progress bar besar, riwayat kontribusi, auto-kalkulasi "nabung Rp X/bulan biar tercapai tepat waktu", projected completion date, tombol "Setor", Lottie plant animation |
| 26 | **Tagihan / Recurring Bills** | `/app/bills` | Competitor Audit, Blueprint | List tagihan berulang (Kos, Netflix, Spotify, Cicilan HP), emoji picker, nominal, toggle "Berulang setiap bulan", due date, badge "Telat" jika lewat, nudge aktivasi push notification kontekstual |
| 27 | **Calendar View** | `/app/calendar` | Competitor Audit | Kalender cashflow berkode warna (hijau = surplus, merah = defisit). Tap tanggal → ringkasan detail transaksi hari itu |
| 28 | **Joint Wallet** | `/app/joint` | Domain 2D | List transaksi berdua (Supabase Realtime), **Monthly Settlement Summary** ("Partner bayar Rp200.000 lebih banyak..."), tombol "Tandai Lunas", tombol "Ajak Pasangan" (generate invite link), toggle "Sembunyikan dari pasangan 🔒" di form transaksi, ikon gembok di transaksi privat |
| 29 | **Wealth & Debt Tracking** | `/app/wealth` | Domain 2E | **Tab 1 — Investment Dashboard:** Total Asset Value, Unrealized Return, Recharts Donut alokasi aset, expandable list per aset (Name, Qty, Avg Price, Current Price, Return), tombol "Update Manual" harga, timestamp "Terakhir diperbarui", tombol "+ Tambah Investasi", link ke **Transaction History Investasi** (list beli/jual per aset). **Tab 2 — Properti & Fisik:** List manual (Nama, Kategori, Harga beli, Harga sekarang). **Tab 3 — Debt Dashboard:** Segmented control [Hutangku] / [Piutangku], total active debt, monthly installment, **DTI Badge** (Sehat/Perlu perhatian/Hati-hati), separated lists: Platform Debt (Kredivo, SpayLater, etc) & Personal Debt, tombol "Tandai Lunas ✓" + Lottie confetti |

---

## KELOMPOK 7 — SYSTEM & SUPPORT (3 halaman)

| # | Halaman | Route | Sumber PRD | Isi |
|---|---|---|---|---|
| 30 | **Panduan / Help Center** | `/app/help` | Competitor Audit | Search bar + dokumentasi per modul: numbered steps "Cara pakai" + callout "Perlu tahu". Copy support menggunakan **Screenshot Policy** ("Kami tidak bisa melihat data kamu — kirim screenshot jika butuh bantuan") |
| 31 | **Referral Dashboard** | `/app/referral` | Domain 7D | Unique referral link + [Copy]/[Share], statistik teman yang diajak/aktif, aturan reward (referrer +30 hari, referred 10% diskon), bisa juga jadi sub-page Settings tapi cukup besar untuk halaman sendiri |
| 32 | **404 / Not Found** | catch-all | Standard | Nurturing copy + redirect home |

---

## TOTAL HALAMAN: 32 route

---

## MODAL / BOTTOM SHEET / OVERLAY (22)

| # | Nama | Trigger | Sumber PRD | Isi |
|---|---|---|---|---|
| a | **Manual Quick-Add (Bottom Sheet Vaul)** | FAB tap | Domain 2A.2 Mode 1 | 2×2 grid tipe transaksi (Pengeluaran/Pemasukan/Tabungan/Transfer), keyboard numerik otomatis, amount field (bold 32px, "Rp 25.000"), deskripsi field (opsional), kategori badge auto-fill, tombol "Catat ✓" sage green |
| b | **OCR Scan Struk (Bottom Sheet)** | Tombol "Scan Struk" di input sheet | Domain 2A.2 Mode 2 | Browser native file picker (`capture="environment"`), Lottie loading "Lagi baca struknya... ✨", **Form Konfirmasi OCR** (ai_generated_name, amount, date, category — semua editable), micro-copy "AI udah bantu catat. Cek dulu ya..." |
| c | **Voice Input (Bottom Sheet kecil 200px)** | Long-press FAB (500ms) atau tap mic icon | Domain 2A.2 Mode 3 | Warm pulsating sound wave Lottie, real-time transcription text, tombol "Selesai", fallback text input jika Web Speech API gagal, **Form Konfirmasi Voice** (sama seperti OCR) |
| d | **Detail Transaksi (Modal)** | Tap baris di History | Domain 2A | Full detail: nama, jumlah, kategori, wallet, waktu, AI-generated name. Tombol Edit / Hapus |
| e | **Edit Transaksi (Bottom Sheet pre-filled)** | Swipe kanan di transaction row | Domain 3D | Same form as input engine, but pre-filled with existing data |
| f | **Menu "Lainnya" (Bottom Sheet Vaul)** | Tab ke-5 bottom nav | Domain 2A.6 | 3-column grid grouped: **KEUANGAN** (Budget, Tagihan, Calendar), **ASET** (Investasi, Properti, Debt), **TOOLS** (Referral, Help, Export Data). Lottie micro-animation on tap icon |
| g | **Weekly Recap (5 Swipeable Full-Screen Slides)** | Banner di Home / Push Minggu 20:00 | Domain 3A Habit Loop 2 | Slide 1: "Minggu Kamu Sekilas" — Tremor KPI (pemasukan vs pengeluaran, net cashflow) + Share button. Slide 2: "Ke Mana Uangmu Pergi" — Donut chart Recharts. Slide 3: "Momen Keuangan" — AI insight 1 kalimat. Slide 4: "Tanaman Kamu" — Lottie plant growth. Slide 5: "Rencana Minggu Depan" — AI suggestion + CTA set target (bottom sticky) |
| h | **Monthly Recap (5 Slides Shareable)** | Push tanggal 1 / Settings | Domain 7D, 7F | Cover (nama + plant SVG), Highlights, Detail (Donut + rupiah), Plant Progress, AI Coach Message. Slide 1, 2, 4 shareable (zero angka finansial). Tombol "Share Report" → export hanya slide privacy-safe |
| i | **Monthly Review & Target Setup (Full-Screen Modal)** | Auto-popup tanggal 1-3 saat buka app | Domain 3A Habit Loop 3 | Panel 1: Recap bulan lalu (total pemasukan/pengeluaran/savings rate, target tercapai ✅ atau ⏳, tanaman snapshot). Panel 2: Set target bulan ini (pre-filled dari bulan lalu, "Mau coba hemat berapa?", quick-pick sinking fund kontribusi). CTA: "Let's go! 🌿" atau "Skip, nanti aja" |
| j | **Plant Detail View (Modal/Bottom Sheet)** | Tap tanaman di Home | Domain 3B | Interactive Lottie plant animation + stats breakdown (HP level, streak, active days, stage progress) |
| k | **Milestone Celebration (Full-Screen Overlay)** | Streak 7/14/21/30, stage up, target tercapai | Domain 3A, 3B | Lottie confetti (2.5 detik), AI-generated personal message, haptic feedback pattern |
| l | **AI Token Purchase (Modal)** | Tombol di Settings → Billing | Domain 5C | 3 paket: Rp19.000 / Rp29.000 / Rp49.000, Fuel Gauge visual, Midtrans Snap payment |
| m | **Renewal Modal** | Auto-popup 1 hari sebelum expired | Domain 5A | "Besok masa aktifmu habis...", 3 opsi: [Perpanjang Rp49.000/bulan], [Rp399.000/tahun], [Nanti aja]. Dismissable, muncul 1x saja |
| n | **Registration / Identifikasi (Bottom Sheet Vaul)** | CTA di Landing Page | Domain 6 Sec 5 | Hanya 2 field: Email + "Nama panggilan". ZERO password. Tombol "Lanjut ke Pembayaran" + link "Udah punya akun? Masuk" |
| o | **Tambah Wallet / Akun Baru (Modal)** | Tombol di Wallet List | Domain 2A, Blueprint | Pilih tipe (Bank/Cash/E-Wallet), pilih logo bank dari daftar, isi nama + saldo awal manual |
| p | **Tambah Tagihan (Modal)** | Tombol di Bills page | Competitor Audit | Emoji picker, nama tagihan, nominal (opsional), toggle "Berulang setiap bulan", due date |
| q | **Tambah Budget Baru (Modal)** | Tombol di Budget page | Domain 2B | Progressive disclosure form: pilih kategori → nominal limit → periode (muncul bertahap) |
| r | **Tambah Sinking Fund / Goal (3-Step Form)** | Tombol di Budget page | Domain 2C.3 | **Step 1:** Nama + Target nominal. **Step 2 auto-reveal:** Deadline + Priority + auto-calc "nabung Rp X/bulan". **Step 3 accordion:** Notes + linked wallet + notification preference |
| s | **Kontribusi ke Sinking Fund (Modal kecil)** | Tombol "Setor" di Fund Detail | Domain 2C.3 | Input nominal, pilih wallet sumber, Lottie coin drop animation |
| t | **Tambah Investasi (Modal Form Detail)** | Tombol di Wealth tab 1 | Domain 2E.1 | Jenis Aset, Nama/Ticker, Beli/Jual, Kuantitas, Harga per Unit, Tanggal, field RDN (progressive disclosure toggle), "Tips & penjelasan field" collapsible |
| u | **Tambah Properti / Aset Fisik (Modal)** | Tombol di Wealth tab 2 | Domain 2E.1 | Nama aset ("Contoh: Rumah Depok"), Kategori, Harga beli, Harga/nilai sekarang |
| v | **Tambah Debt / Utang-Piutang (Dual Form)** | Tombol di Wealth tab 3 | Domain 2E.2 | **Form Simple (Personal):** Arah ("Aku hutang ke..."), Nama, Jumlah, Tanggal, Notes, toggle "Lunas". **Toggle "Ini pinjaman platform/berbunga"** → Framer Motion expand → **Form Platform:** Provider Quick-Pick dropdown (Kredivo, SpayLater, Akulaku, dll), Principal, Tenor, Monthly Installment, Interest, Due Date |
| w | **Split Bill (Bottom Sheet)** | Tombol di Joint Wallet | Domain 2D.3 | 4 mode: Bagi Rata, Persentase, Nominal Custom, "Yang ini gue yang bayar". Settlement summary |

---

## TOTAL MODAL/SHEET: 22

---

## IMPORTANT STATES (15)
*Bukan halaman/modal terpisah, tapi tampilan UI yang BERBEDA dari state normal dan harus di-design*

| # | State | Di Mana | Sumber PRD | Deskripsi |
|---|---|---|---|---|
| I | **Empty State — Transaksi Hari Ini** | Home | Domain 2A.4, 3A | "Belum ada catatan hari ini... Catat yang pertama yuk! 🌱" — nurturing, bukan menghakimi |
| II | **Empty State — Per Modul** | Budget, Bills, Wealth, Joint Wallet, dll | Best Practice | Ilustrasi placeholder + copy nurturing + CTA primer (misal: "Buat budget pertamamu") |
| III | **Grace Period Read-Only** | Semua halaman app | Domain 5A | 7 hari setelah expired. Banner atas: "Masa aktifmu sudah habis...". Semua tombol input di-disable. Plant masuk "sleep mode" (greyscale, mata tertutup) |
| IV | **Post-Grace Period** | Semua halaman app | Domain 5A | Setelah 7 hari grace. Data TIDAK dihapus. Banner: "Yuk kembali kapan aja kamu siap..." + tombol perpanjang |
| V | **Tanaman Layu (HP ≤20)** | Home (tanaman) | Domain 3B | SVG swap: daun turun, warna desaturated via CSS filter. Copy: "Tanamanmu kangen kamu! Satu catatan aja langsung segar lagi 🌿" |
| VI | **Tanaman Sleep Mode** | Home (saat Grace Period) | Domain 5A | Greyscale plant, mata tertutup |
| VII | **Optimistic Transaction Loading** | Transaction list | Domain 4A | Row opacity 70%, **jam kecil amber ⏳** pulsating, tooltip "Sedang dikirim..." |
| VIII | **Failed Transaction (FAILED_PERMANENT)** | Transaction list | Domain 4A | Border terracotta/30, background terracotta/5, **AlertCircle icon merah** → tap untuk manual retry, toast merah setelah 5 menit gagal |
| IX | **Offline App Shell** | Semua halaman | Domain 4A | App tetap bisa dibuka (cached UI), tapi data mungkin stale. Label "Offline — respons lama" di AI responses |
| X | **AI Fallback Error — Chat** | AI Coach interactions | Domain 4B | "AI Coach lagi istirahat sebentar 🌿 Coba lagi dalam beberapa menit ya." |
| XI | **AI Fallback Error — OCR** | Scan Struk flow | Domain 4B | "Scan struk lagi istirahat. Coba input manual ya!" |
| XII | **Daily Budget HUD Color States** | Home → HUD Card | Domain 2B.2 | Sage green = On track, Warm amber = Approaching limit, Soft terracotta = Over budget |
| XIII | **Dry Spell Card (Bulan Tanpa Income)** | Home → replaces HUD | Domain 2B.3 | Card khusus: "Belum ada pemasukan bulan ini" + CTA [+ Catat Pemasukan]. Pacing limits disembunyikan |
| XIV | **Early Access Checkout State** | Landing/Checkout | Domain 7A, 7E | 1 jam sebelum public launch, Top 300 waitlist dapat akses checkout eksklusif |
| XV | **OCR Scanning Loading** | Scan Struk flow | Domain 2A.2 Mode 2 | Lottie dokumen bergerak + "Lagi baca struknya... ✨" |

---

## KEY FLOWS (8)
*Multi-step processes yang melewati beberapa UI*

| # | Flow | Sumber PRD | Steps |
|---|---|---|---|
| 1 | **Checkout & Onboarding** | Domain 5A, 6 Sec 5 | CTA Landing → Registration Modal (email+nama) → Midtrans Snap → redirect `/app/onboarding` (3 step 60 detik: persona select → salary input → first transaction) |
| 2 | **Joint Wallet Onboarding** | Domain 2D.2 | User A buat wallet → generate 6-char invite link → User B klik `/join/[code]` → login/signup → auto-join wallet |
| 3 | **Offline Transaction Retry** | Domain 4A | Save (optimistic) → 3× immediate retry (1s/2s/4s) → background retry setiap 30s selama 5 menit → FAILED_PERMANENT → user manual retry |
| 4 | **Data Export ("Export Data Saya")** | Domain 4C, 8A | User klik button di Settings → sistem compile semua data (transaksi, wallet, debts) → kirim JSON via email → user forward ke support jika perlu |
| 5 | **Share Report (Privacy-Safe)** | Domain 7D | User tap "Share Report" di Monthly Recap → sistem export HANYA slide 1, 2, 4 (zero angka keuangan) → generate image → share ke Instagram Story |
| 6 | **Two-Sided Referral** | Domain 7D | User share link → teman signup + bayar (dapat 10% diskon) → referrer otomatis dapat +30 hari atau 1 bulan AI token |
| 7 | **Waitlist Referral Loop** | Domain 7A | User gabung waitlist → dapat unique link → share → teman gabung → posisi user naik 5 slot |
| 8 | **Renewal Manual** | Domain 5A | Banner 7 hari → Banner 3 hari + push → Modal 1 hari → One-Tap Renew (saved token) atau Midtrans Snap → subscription extended. Grace 7 hari read-only jika tidak perpanjang |

---

## GRAND TOTAL

| Kategori | Jumlah |
|---|---|
| **Halaman (Route)** | **32** |
| **Modal / Bottom Sheet / Overlay** | **22** |
| **Important States** | **15** |
| **Key Flows** | **8** |
| **TOTAL TAMPILAN UI** | **77** |

---

## YANG BARU DITAMBAHKAN (vs list sebelumnya)

Berikut item yang BELUM ADA di list 29+18 sebelumnya dan baru ditemukan oleh auditor:

### Halaman Baru:
- ✅ **Joint Wallet Invite Landing** (`/join/[code]`) — Domain 2D.2
- ✅ **Referral Dashboard** (`/app/referral`) — Domain 7D (dipisah dari Settings karena cukup besar)
- ✅ **Tampilan & Tema** Settings — Competitor Audit (dark/light mode)

### Modal Baru:
- ✅ **Renewal Modal** (1 hari sebelum expired) — Domain 5A
- ✅ **Registration / Identifikasi** (email+nama saat checkout) — Domain 6 Sec 5
- ✅ **Plant Detail View** (tap tanaman → stats) — Domain 3B
- ✅ **Monthly Review & Target Setup** (auto-popup awal bulan) — Domain 3A

### State Baru:
- ✅ **Grace Period Read-Only** + **Post-Grace** — Domain 5A
- ✅ **Tanaman Sleep Mode** (saat grace period) — Domain 5A
- ✅ **Optimistic Loading** (⏳ jam kecil) + **Failed Permanent** (🔴) — Domain 4A
- ✅ **AI Fallback Error** (chat + OCR terpisah) — Domain 4B
- ✅ **Dry Spell Card** (bulan tanpa income) — Domain 2B.3
- ✅ **Early Access Checkout** (top 300 waitlist) — Domain 7A
- ✅ **OCR Scanning Loading** (Lottie dokumen) — Domain 2A.2

### Flow Baru:
- ✅ **Data Export ("Export Data Saya")** — Domain 4C
- ✅ **Share Report Privacy-Safe** — Domain 7D
- ✅ **Renewal Manual** (banner → modal → payment → grace) — Domain 5A

### Komponen Penting yang Perlu Di-design:
- ✅ **Sticky Footer CTA** di Landing Page — Domain 6 Asumsi A7
- ✅ **Context Switcher** (pill toggle Pribadi/Keluarga/Bersama) — Domain 2C.2
- ✅ **One-Tap Renew Button** — Domain 5A
- ✅ **Renewal Banners** (7-day dan 3-day) — Domain 5A
- ✅ **DTI Badge** (Sehat/Perlu perhatian/Hati-hati) — Domain 2E.2
- ✅ **Founding Member Badge** (#47) — Domain 8B
- ✅ **Achievement / Share Progress Card** — Domain 7D
- ✅ **6 Insight Cards** (Category Trend, Monthly Comparison, Spending Spike, Savings Rate, Health Score, Progress to Unlock) — Domain 2A.5
- ✅ **Provider Quick-Pick Dropdown** (Kredivo, SpayLater, dll) — Domain 2E.2
- ✅ **Settlement Summary Widget** (Joint Wallet) — Domain 2D.3
- ✅ **Screenshot Policy Copy** (di Help Center) — Domain 4C
