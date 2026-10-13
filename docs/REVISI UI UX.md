# 🔍 FULL UI/UX AUDIT — CatetInd Web App
> Audit dilakukan pada 12 halaman: Install, Dashboard, Riwayat & Insight, Dompet & Akun, Budget & Target, Tagihan Rutin, Kalender Cashflow, Kekayaan & Hutang, Join Wallet, Ajak Teman, Pusat Bantuan, Pengaturan.

---

## 📊 SKOR KESELURUHAN

| Aspek | Skor | Catatan |
|---|---|---|
| Visual Consistency | ⭐⭐⭐⭐ | Warna hijau tua/sage konsisten, card style seragam |
| Information Architecture | ⭐⭐⭐⭐ | Sidebar navigation logis dan well-grouped |
| Typography | ⭐⭐⭐⭐ | Hierarchy cukup jelas, font size bervariasi dengan baik |
| Usability | ⭐⭐⭐ | Beberapa area terlalu padat informasi, empty state kadang kurang guidance |
| Mobile Responsiveness | ⭐⭐ | Ini versi desktop/web — perlu dipastikan layout adapt ke mobile PWA |
| Emotional Design | ⭐⭐⭐⭐⭐ | Tanaman, bahasa nurturing, emoji — sangat on-brand |
| Copywriting/Microcopy | ⭐⭐⭐⭐⭐ | Bahasa lo/gue konsisten, warm, ngga kaku — ini USP terkuat |

---

## 📄 HALAMAN 1: INSTALL

![Install Page](file:///C:/Users/maari/.gemini/antigravity/brain/ba586682-5305-4b88-9f95-f96be9c134b1/scratch/audit_pages/page_001_Install_p1.png)

### ✅ Yang Sudah Bagus
- Badge **"GRATIS · TANPA APP STORE"** di atas sangat efektif — langsung menjawab keraguan
- 3 selling point (Bisa Offline, Buka Instan, Ringan) singkat dan jelas
- Step-by-step install di desktop sangat clear dengan visual mockup address bar
- **Bonus Eksklusif** di bawah (100 Nyawa AI + Skin Pot Emas) adalah hook yang sangat bagus untuk dorong install
- Fallback info "Tombol install otomatis belum tersedia di browser ini" menunjukkan perhatian ke edge case

### 🔴 Yang Harus Diperbaiki

**1. Hierarchy Visual — Sisi Kiri vs Kanan Tidak Seimbang**
- Sisi kiri (selling points + link install) dan sisi kanan (cara install desktop) terasa seperti dua halaman terpisah yang ditempel
- **Solusi:** Buat flow linear dari atas ke bawah: Hero → Selling Points → CTA Install → Cara Manual (collapsible) → Bonus

**2. CTA "Bagikan Link" dan "Salin Link" Seharusnya Bukan Primary Action**
- Tombol hijau "Bagikan link" terlalu dominan. User baru datang ke halaman ini untuk *install*, bukan *share*
- **Solusi:** Buat tombol "Install Sekarang" yang jauh lebih besar dan dominan di atas. "Bagikan link" dan "Salin link" cukup jadi secondary button/text link di bawah

**3. Section "Yang Perlu Kamu Tahu" Bisa Bikin User Ragu**
- Frasa "Dua batas PWA yang kami jujurkan" kedengerannya jujur (bagus), tapi bisa bikin user yang belum paham PWA malah takut
- **Solusi:** Reframe jadi positif. Contoh: "Notifikasi tergantung browser" → "Notifikasi bisa aktif di Chrome & Edge ✅"

**4. Bonus Eksklusif Terlalu Jauh di Bawah**
- Bonus "+100 Nyawa AI gratis" dan "Skin Pot Emas" itu hook yang sangat kuat, tapi letaknya di paling bawah. Banyak user ngga bakal scroll sampai situ
- **Solusi:** Pindahkan ke atas, tepat di bawah headline "Install CatetInd di HP Kamu" sebagai sub-section eye-catching

---

## 📄 HALAMAN 2: DASHBOARD

![Dashboard Page](file:///C:/Users/maari/.gemini/antigravity/brain/ba586682-5305-4b88-9f95-f96be9c134b1/scratch/audit_pages/page_002_Dashboardd_p1.png)

### ✅ Yang Sudah Bagus
- **Greeting "Selamat siang, Jon 🌿"** — personal dan warm, sesuai brand tone
- **Card dompet** (Rp 519.919.000) dengan design hijau tua sangat premium dan elegan
- **Arus Uang** chart di kanan atas — info yang paling dibutuhin user langsung keliatan
- **Transaksi Terakhir** menampilkan data real dengan nama yang natural ("Gua habis makan gacoan")
- **Summary bar** di bawah transaksi (Bulan ini +Rp 11.900.000 masuk, -Rp 6.731.000 keluar) sangat informatif
- **Jatah Hari Ini** (Rp 3.024.684) dengan progress bar — fitur killer yang bikin user balik terus
- **Distribusi Pengeluaran** donut chart — clean dan informative
- **Tanamanmu** — emotional design terbaik di seluruh app. Ini yang bikin CatetInd beda

### 🔴 Yang Harus Diperbaiki

**1. Card Dompet Carousel Terlalu Besar — Makan 40% Viewport**
- Card hijau dengan Rp 519.919.000 bagus secara visual tapi makan terlalu banyak space di atas
- User harus scroll cukup jauh untuk sampai ke "Jatah Hari Ini" yang justru lebih actionable
- **Solusi:** Perkecil tinggi card dompet ~30%, atau buat collapsible. "Jatah Hari Ini" harus keliatan tanpa perlu scroll

**2. Dua Entry "MCD" Berturut-turut — Duplikasi yang Membingungkan**
- Ada 2 transaksi "MCD - Makanan" berturut-turut (12:11 dan 11:51), keduanya -Rp 300.000
- Ini valid secara data, tapi secara UX user bisa mikir ini bug/duplikat
- **Solusi:** Tambahkan auto-grouping atau subtle badge "2 transaksi serupa hari ini" supaya user ngga bingung

**3. "Tabungan Impian" Empty State Kurang Menggoda**
- Copy "Belum ada celengan impian" dan "Mulai dari satu celengan saja dulu" sudah warm, tapi kurang *aspirational*
- **Solusi:** Tampilkan contoh celengan populer (iPhone, Liburan Bali, Dana Darurat) sebagai placeholder yang bisa di-tap langsung. Bikin user mikir "Oh iya, gue pengen itu!"

**4. Contrast Issue pada Arus Uang Chart**
- Warna hijau tua (Pemasukan) dan hijau muda (Pengeluaran) terlalu mirip di chart kecil, kurang distinguishable
- **Solusi:** Buat Pengeluaran jadi warna yang kontras (salmon/merah muda soft) supaya perbedaannya instant

**5. Badge "Surplus 43%" di Arus Uang — Posisi Kurang Prominent**
- Ini info yang sangat positif tapi badge-nya kecil dan di pojok kanan atas card
- **Solusi:** Buat lebih besar dan eye-catching, mungkin dengan warna hijau terang dan ikon ↑

---

## 📄 HALAMAN 3: RIWAYAT & INSIGHT

![Insight Page](file:///C:/Users/maari/.gemini/antigravity/brain/ba586682-5305-4b88-9f95-f96be9c134b1/scratch/audit_pages/page_003_Insight_p1.png)

### ✅ Yang Sudah Bagus
- **Heatmap "Kapan Kamu Sering Boros?"** — ini BRILLIANT. Visualisasi GitHub-style contribution chart tapi untuk pengeluaran. Sangat addictive dan insightful
- **Filter Global** (Waktu, Dompet, Tipe, Kategori) — lengkap dan powerful
- **Search bar** dengan placeholder "Cari 'pengeluaran kopi bulan lalu'..." — menunjukkan AI search capability
- **Catatan/Riwayat** sangat detail: ada icon edit ✏️, ada kategori tag berwarna, ada sumber dompet
- **Kalibrasi Profil AI** (16/30 transaksi, 60%) — memberikan sense of progress bahwa AI makin pinter
- **Insight AI** dengan actionable CTA ("Alokasikan ke Sinking Fund", "Atur limit kategori") — bukan cuma kasih info tapi kasih next action

### 🔴 Yang Harus Diperbaiki

**1. Halaman Ini Terlalu Panjang dan Padat**
- Heatmap + Hemat Target + Catatan + Kalibrasi AI + Insight AI semuanya di satu page. Ini information overload
- **Solusi:** Pisahkan jadi 2 tab di dalam halaman: "Riwayat" (heatmap + catatan) dan "Insight" (AI kalibrasi + insight). Atau buat Insight AI sebagai floating card/drawer

**2. Heatmap Butuh Legenda yang Lebih Jelas**
- Legenda (Rp 0, Sedikit, Sedang, Paling boros) ada tapi sangat kecil di bawah
- **Solusi:** Buat legenda lebih besar dan kasih contoh angka. Misal: "🟢 < Rp 50rb | 🟡 Rp 50-200rb | 🔴 > Rp 200rb"

**3. Tooltip Heatmap "7 Okt 2026 - Rp 0" Menutupi Data**
- Tooltip muncul tapi menutupi cell di sekitarnya
- **Solusi:** Buat tooltip muncul di atas/bawah cell, bukan di atas cell itu sendiri

**4. Catatan — Entry "Pengeluaran cepat" Tanpa Deskripsi**
- Ada beberapa entry "Pengeluaran cepat" yang kurang informatif. User mungkin lupa ini apa
- **Solusi:** Ketika user input "Pengeluaran cepat", prompt mereka untuk tambah minimal 1 kata deskripsi. Atau AI auto-suggest berdasarkan waktu/lokasi

**5. Section "Hemat Rp 2.000.000" Terselip**
- Target hemat ada di antara heatmap dan catatan. Posisinya terasa random
- **Solusi:** Integrasikan ke dalam card Insight AI di bawah, atau pindahkan ke Dashboard supaya lebih visible

---

## 📄 HALAMAN 4: DOMPET & AKUN

![Dompet Page](file:///C:/Users/maari/.gemini/antigravity/brain/ba586682-5305-4b88-9f95-f96be9c134b1/scratch/audit_pages/page_004_Dompet_and_Akun_p1.png)

### ✅ Yang Sudah Bagus
- **Total Saldo card** dengan komposisi breakdown (BCA 1%, GoPay 0%, Tunai 0%, ALAWI 99%) — sangat informatif
- **Pemisahan "Uang Cair" vs "Aset Ditahan"** — distinctions yang penting dan jarang ada di app lain
- **Card dompet individual** (BCA, GoPay, Tunai) — design kartu kredit-style sangat premium
- **"Tambah Dompet Cepat"** dengan shortcut bank populer (Mandiri, BNI, OVO) — mengurangi friction
- **"Pindah Dana Terakhir"** (BCA → Tunai) langsung keliatan — helpful

### 🔴 Yang Harus Diperbaiki

**1. Angka Rp 519.919.000 — Ini Data Demo atau Real?**
- Kalau ini data demo/placeholder, angka setengah miliar bisa intimidating buat user Gen Z yang gajinya 5-7 juta
- **Solusi:** Untuk onboarding/demo, pakai angka yang relatable: Rp 4-7 juta range. Biar user ngerasa "Oh, ini untuk orang kayak gue"

**2. Komposisi Bar "ALAWI 99%" Mendominasi**
- Bar kuning ALAWI mengisi 99% sehingga BCA, GoPay, Tunai hampir ngga keliatan
- Ini mungkin karena data demo, tapi secara UX kalau saldo besar di 1 dompet, visual breakdown-nya jadi kurang useful
- **Solusi:** Tampilkan "Komposisi tanpa ALAWI" sebagai toggle alternatif, atau zoom-in ke dompet selain yang terbesar

**3. Progress Bar "% dari total" di Card Dompet Kurang Kontras**
- Di card GoPay dan Tunai, ada "0% dari total" tapi progress bar-nya hampir ngga keliatan karena di atas background gelap
- **Solusi:** Buat progress bar warna terang/putih agar kontras di atas card hijau tua

**4. Tombol "..." (more options) di Card Dompet Terlalu Kecil**
- 3 dots di pojok kanan bawah card sangat kecil, susah di-tap di mobile
- **Solusi:** Buat minimal 44x44px (Apple HIG minimum tap target) atau ubah jadi long-press/swipe gesture

---

## 📄 HALAMAN 5: BUDGET & TARGET

![Budget Page](file:///C:/Users/maari/.gemini/antigravity/brain/ba586682-5305-4b88-9f95-f96be9c134b1/scratch/audit_pages/page_005_Budget_and_Target_p1.png)

### ✅ Yang Sudah Bagus
- **"Jatah Hari Ini" card** (Rp 2.719.018) dengan circular progress 21% — ini fitur paling powerful di app
- **Tabs "Mingguan / Bulanan / Siklus Gajian"** — fleksibel banget, ini USP
- **Budget Kategori "Makanan" (614%)** dengan progress bar merah dan "Lewat limit" — visual warning yang sangat jelas
- **Celengan Impian** dengan target "Nikah" (Rp 150.000.000, deadline 15 Okt 2030) — aspirational dan concrete
- **Microcopy celengan** "Celengan kamu belum nambah bulan ini. Gapapa, mulai lagi kapan aja 🐣" — warm, nurturing, ngga menghakimi

### 🔴 Yang Harus Diperbaiki

**1. "614% terpakai" — Angkanya Intimidating dan Bikin Panik**
- Melihat 614% bisa bikin user defensive dan malah stop pake app
- **Solusi:** Tampilkan dalam rupiah dulu (Rp 614.000 dari budget Rp 100.000), baru persentase sebagai secondary info. Dan tambahkan microcopy nurturing: "Minggu ini memang lebih besar dari biasa — kita review bareng yuk?"

**2. Hanya 1 Kategori Budget — Kurang Menggambarkan Value**
- Kalau user cuma bikin 1 kategori, halaman ini terasa kosong
- **Solusi:** Tampilkan suggested budget categories berdasarkan riwayat transaksi user. "Kamu sering belanja di kategori Kopi & Minuman — mau set budget juga?"

**3. "Sisa periode: Rp 16.314.111" — Di Mana Ini Datanya?**
- Angka Rp 16 juta ini besar banget dan bikin bingung — ini sisa dari apa?
- **Solusi:** Tambahkan tooltip atau keterangan kecil: "Sisa dari pemasukan Rp XX.XXX.XXX dikurangi cicilan & tagihan rutin"

**4. Celengan "Nikah" — Rp 3.061.225/bulan Terasa Overwhelming**
- Nominalnya gede banget per bulan, bisa bikin user langsung ngerasa hopeless
- **Solusi:** Selain per bulan, tampilkan juga per hari: "~Rp 102.000/hari" — angka kecil ini psychologically lebih achievable

**5. Tombol "+ Tambah Budget Baru" dan "+ Tambah Celengan Baru" Terlalu Subtle**
- Keduanya cuma text link dengan border dashed. Kurang eye-catching
- **Solusi:** Buat sebagai card placeholder dengan ilustrasi kecil + copy yang inviting

---

## 📄 HALAMAN 6: TAGIHAN RUTIN

![Tagihan Page](file:///C:/Users/maari/.gemini/antigravity/brain/ba586682-5305-4b88-9f95-f96be9c134b1/scratch/audit_pages/page_006_Tagihan_Rutin_p1.png)

### ✅ Yang Sudah Bagus
- **"3/3 lunas — Tameng penuh 🛡"** — gamifikasi yang sangat satisfying, bikin user pengen maintain streak lunas
- **"Gaji Terpakai 2%"** di kanan atas — insight cepat yang langsung bikin user tenang
- **7 Hari Ke Depan calendar strip** — menunjukkan upcoming bills supaya user bisa prepare
- **Stamp "LUNAS ✔"** pada tagihan — visual feedback yang sangat memuaskan
- **Filter tabs "Semua / Aktif / Telat / Lunas"** — well organized

### 🔴 Yang Harus Diperbaiki

**1. Halaman Terlalu Kosong Saat Semua Lunas**
- Setelah "Sudah Dibayar" (2 items), sisa halaman 70% kosong. Ini wasted space
- **Solusi:** Tampilkan section tambahan: "Tagihan bulan depan yang sudah bisa kamu siapkan" atau "Kamu sudah hemat Rp XX.XXX dari membayar semua tepat waktu" — reinforcement positif

**2. Calendar Strip 7 Hari — Hanya Hari Ini (Selasa 13) yang Highlighted**
- Hari lain kosong dan flat. Secara visual kurang menambah value
- **Solusi:** Tampilkan dot indicator pada hari yang ada tagihan jatuh tempo. Kalau 7 hari ke depan kosong, tulis "Minggu ini aman — tidak ada tagihan 🎉"

**3. Spotify Rp 54.990 — Source "GoPay" Terlalu Kecil**
- Info source pembayaran (Lunas ✔ · GoPay) fontnya terlalu kecil
- **Solusi:** Buat source wallet jadi badge yang lebih prominent (icon + nama), biar user bisa liat dari dompet mana aja tagihan rutin ditarik

**4. Tombol "+ Tagihan" di Kanan Atas — Bisa Terlewat**
- CTA utama untuk menambah tagihan posisinya terlalu jauh di kanan atas
- **Solusi:** Tambahkan juga floating action button atau card placeholder "Tambah tagihan rutin lainnya" di bawah list

---

## 📄 HALAMAN 7: KALENDER CASHFLOW

![Kalender Page](file:///C:/Users/maari/.gemini/antigravity/brain/ba586682-5305-4b88-9f95-f96be9c134b1/scratch/audit_pages/page_007_Kalender_Cashflow_p1.png)

### ✅ Yang Sudah Bagus
- **Color-coded calendar cells** (Boros = merah, Surplus = hijau tua, Nol jajan = hijau muda, Ada belanja = hijau medium, Tagihan Tetap = abu) — sangat informatif at a glance
- **"Bulan Standar" vs "Siklus Gajian (Tgl 25)"** toggle — briliant! Banyak orang gajian tanggal 25, bukan tanggal 1
- **Net summary** "+Rp 18.569.000" di atas — langsung tau kondisi bulan ini
- **Panel kanan "Hari Ini"** dengan breakdown transaksi — very useful
- **Tooltip pada cell** menunjukkan tanggal + total — good interaction
- **Tombol "Tambah Catatan di Tgl 13"** — contextual action, sangat efisien

### 🔴 Yang Harus Diperbaiki

**1. Legenda Warna Terlalu Kecil dan di Paling Bawah**
- Legend (Boros, Surplus, Nol jajan, Ada belanja, Tagihan Tetap) nyaris ngga keliatan
- **Solusi:** Pindahkan legenda ke atas kalender sebagai horizontal pills/badges yang bisa di-filter/tap

**2. Weekend (Sabtu-Minggu) Ngga Ada Visual Distinction**
- Weekend biasanya hari paling boros untuk anak muda, tapi secara visual sama aja sama weekday
- **Solusi:** Background weekend sedikit berbeda (shade lebih gelap/terang) supaya pattern spending weekend vs weekday bisa keliatan

**3. Tanggal 9 (Merah Tua) — Kenapa Boros?**
- Tanggal 9 warnanya merah/paling tua tapi ngga ada penjelasan kenapa
- **Solusi:** Tampilkan total pengeluaran di dalam cell (seperti tgl 13 yang udah ada "-Rp 600.000"). Biar tanpa klik pun user langsung tau

**4. Cell Tanggal Masa Depan (14-31) Semuanya Hijau Muda — Misleading**
- Hari yang belum terjadi seharusnya ngga punya warna apapun karena belum ada data
- **Solusi:** Buat tanggal masa depan jadi abu-abu netral/blank, bukan hijau. Hijau muda menunjukkan "Nol jajan" yang seolah-olah positif padahal belum terjadi

---

## 📄 HALAMAN 8: KEKAYAAN & HUTANG

![Kekayaan Page](file:///C:/Users/maari/.gemini/antigravity/brain/ba586682-5305-4b88-9f95-f96be9c134b1/scratch/audit_pages/page_008_Kekayaan_and_Hutang_p1.png)

### ✅ Yang Sudah Bagus
- **Kekayaan Bersih Rp 1.320.681.048** dengan progress bar hijau (Aset 100% vs Hutang 0%) — sangat satisfying secara visual
- **Alokasi Aset donut chart** — clean dan informatif
- **Detail saham BBCA** dengan info lot, avg price, unrealized gain (+28.01%) — fitur yang sangat lengkap
- **"DTI 0% · Sehat"** badge untuk hutang — reassuring
- **Empty state hutang** "Gak ada hutang aktif. Alhamdulillah!" — on-brand dan warm
- **Tabs "Investasi / Properti" dan "Hutang / Piutang"** — well categorized

### 🔴 Yang Harus Diperbaiki

**1. Halaman Ini Bisa Intimidating untuk User Baru**
- Angka Rp 1.3 Miliar sangat besar. User Gen Z baru kerja dengan kekayaan Rp 5 juta bisa langsung minder dan skip halaman ini
- **Solusi:** Untuk user baru, tampilkan onboarding card: "Halaman ini buat track semua aset kamu — dari tabungan Rp 500.000 sampai motor. Mulai dari yang kecil dulu!"

**2. "Update Harga" Manual untuk Saham — Friction**
- Ada warning "Harga Saham belum diperbarui. Update terakhir: 10 Okt 2026"
- **Solusi:** Auto-fetch harga saham dari API publik. Atau minimal jadwalkan daily auto-update

**3. Tombol "Edit" dan "Hapus" Terlalu Prominent**
- Button Edit (hijau) dan Hapus (outline) sama besarnya dan selalu visible. Ini visual clutter
- **Solusi:** Sembunyikan di balik menu "..." atau swipe-to-reveal. Jarang ada situasi di mana user perlu edit/hapus aset sesering itu

**4. Section Hutang Kosong — Terlalu Banyak Empty Space**
- Ketika hutang = 0, card-nya tetap besar dan kosong
- **Solusi:** Collapse section hutang menjadi 1 baris "🎉 Hutang: Rp 0 — Bersih!" dan berikan opsi "Tambah" sebagai text link

---

## 📄 HALAMAN 9: JOIN WALLET (Dompet Bersama)

![Join Wallet Page](file:///C:/Users/maari/.gemini/antigravity/brain/ba586682-5305-4b88-9f95-f96be9c134b1/scratch/audit_pages/page_009_Join_Wallet_p1.png)

### ✅ Yang Sudah Bagus
- **Emoji pasangan 🥹💚🥹** — sangat cute dan bikin halaman ini feel personal
- **"Mulai Bangun Masa Depan Bareng 💚"** — headline yang emosional dan tepat sasaran
- **Penjelasan "Buku besar ini terpisah dari dompet pribadimu"** — menjawab kekhawatiran terbesar user (privasi)
- **Simulasi "Dany sudah bergabung"** — mengurangi uncertainty tentang flow-nya
- **"Kasih nama dompet kalian"** dengan placeholder "Dompet Kita 💚" — inviting

### 🔴 Yang Harus Diperbaiki

**1. Info Banner di Atas Terlalu Text-Heavy**
- Banner "Dompet Bersama itu konteks Bersama..." sangat panjang dan text-dense
- **Solusi:** Ringkas jadi 1 kalimat + buat collapsible "Pelajari lebih lanjut" untuk detail

**2. "Langkah 2 dari 3" — User Masuk di Tengah Flow**
- Halaman langsung menunjukkan step 2, tapi step 1 dan 3 ngga keliatan. User bingung: "Step 1 udah kelewat?"
- **Solusi:** Tampilkan progress bar horizontal (Step 1 ✅ → Step 2 🔄 → Step 3 ⬜) supaya user tau posisinya

**3. CTA "Buat Dompet & Ajak Pasangan →" Kurang Eye-Catching**
- Tombol ini hanya outline/ghost button, padahal ini primary action
- **Solusi:** Buat jadi filled button hijau tua (sama kayak "Tambah Transaksi" di sidebar) supaya menonjol

**4. Tidak Ada Penjelasan: "Apa yang Bisa Dilakukan di Dompet Bersama?"**
- User mungkin bingung feature apa saja yang available di joint wallet
- **Solusi:** Tambahkan 3 bullet singkat di bawah CTA: "✅ Catat pengeluaran bersama · ✅ Lihat siapa bayar apa · ✅ Data pribadimu tetap privat"

---

## 📄 HALAMAN 10: AJAK TEMAN (Referral)

![Ajak Teman Page](file:///C:/Users/maari/.gemini/antigravity/brain/ba586682-5305-4b88-9f95-f96be9c134b1/scratch/audit_pages/page_010_Ajak_Teman_p1.png)

### ✅ Yang Sudah Bagus
- **Referral reward system** sangat jelas: Ajak teman → kamu dapat 1 bulan Token AI GRATIS, teman dapat diskon 10%
- **Stats dashboard** (12 Klik Link, 3 Teman Mendaftar, 2 Teman Sudah Beli) — gamifikasi yang bikin user pengen ngajak lebih banyak
- **"Total Reward yang Kamu Dapat: +2 bulan AI Token"** — banner hijau yang satisfying
- **Riwayat teman** dengan nama, status, tanggal, dan reward — transparan
- **Link unik** dengan Copy Link button — frictionless sharing
- **"100% Privat. Teman yang kamu undang tidak akan pernah bisa melihat data keuanganmu"** — trust builder yang sangat penting

### 🔴 Yang Harus Diperbaiki

**1. "Sisa Token AI-mu: 15% — Menipis" — Placement Salah**
- Info ini terasa seperti warning/guilt trip di halaman referral. User bisa ngerasa dipaksa ngajak teman demi nambah token
- **Solusi:** Pindahkan info token ke Dashboard atau Pengaturan. Di halaman referral, fokuskan ke reward yang mereka DAPAT, bukan token yang HABIS

**2. Badge "Paket Sultan" di Reward — Apa Ini?**
- Label "Paket Sultan" muncul tapi ngga ada penjelasan apa artinya
- **Solusi:** Kasih tooltip atau link "Apa itu Paket Sultan?" yang menjelaskan tier reward

**3. Riwayat Teman — Status "Belum bayar" Warna Merah**
- Teman yang belum bayar ditandai merah, terasa menghakimi. Padahal ini orang yang lo rekomendasiin
- **Solusi:** Ganti warna merah ke abu-abu/netral dengan copy "Menunggu" alih-alih "Belum bayar"

**4. Tombol "Bagikan ke Teman" Terlalu Jauh dari Link**
- Link dan tombol share harusnya berdekatan supaya flow-nya: Copy link → Share
- **Solusi:** Gabungkan jadi 1 row: [Link field] [Copy] [Share]

---

## 📄 HALAMAN 11: PUSAT BANTUAN

![Pusat Bantuan Page](file:///C:/Users/maari/.gemini/antigravity/brain/ba586682-5305-4b88-9f95-f96be9c134b1/scratch/audit_pages/page_011_Pusat_Bantuan_p1.png)

### ✅ Yang Sudah Bagus
- **"Founder-led support"** badge — ini SANGAT powerful. Menunjukkan bahwa ini bukan bot, tapi founder langsung yang handle support
- **"Sering Bikin Bingung"** sebagai section title — bahasa yang sangat warm dan ngga formal. Ini jauh lebih baik daripada "FAQ" yang kaku
- **Pertanyaan-pertanyaan yang relevan:**
  - "Kok saldo gue kayaknya nggak sinkron?" 
  - "Cara nyembunyiin pengeluaran dari pasangan?"
  - "Aman nggak sih data keuangan gue di sini?"
  - Semuanya pakai bahasa lo/gue — sangat on-brand
- **9 topik, 26 artikel** — coverage yang baik
- **Dokumen resmi** (Kebijakan Privasi, Syarat & Ketentuan) ada di bawah — trust builder

### 🔴 Yang Harus Diperbaiki

**1. Search Bar Placeholder Terlalu Panjang**
- "Cari bantuan... contoh: 'cara sembunyiin transaksi'" — contohnya bagus tapi kepanjangan
- **Solusi:** Cukup "Cari bantuan..." dan tampilkan search suggestions saat user mulai ketik

**2. Layout 2-Column (Topik Kiri, FAQ Kanan) Bisa Bingung di Mobile**
- Di desktop ini oke, tapi di mobile PWA layout ini akan stack dan topik list jadi terlalu panjang sebelum FAQ
- **Solusi:** Di mobile, tampilkan topik sebagai horizontal scrollable chips, bukan vertical list

**3. Card FAQ Semuanya Sama Ukuran — Kurang Hierarchy**
- 5 card "Sering Bikin Bingung" semuanya sama besar, padahal "Aman nggak sih data keuangan gue?" harusnya lebih prominent
- **Solusi:** Buat card keamanan/privasi lebih besar atau kasih badge "🔒 Most Asked" supaya user yang khawatir langsung nemuin jawabannya

**4. Tidak Ada Live Chat / WhatsApp Button**
- "Founder-led support" tertulis tapi ngga ada channel langsung untuk contact
- **Solusi:** Tambahkan floating button "Chat via WhatsApp" atau "DM Instagram" di pojok kanan bawah

---

## 📄 HALAMAN 12: PENGATURAN

![Pengaturan Page](file:///C:/Users/maari/.gemini/antigravity/brain/ba586682-5305-4b88-9f95-f96be9c134b1/scratch/audit_pages/page_012_Pengaturann_p1.png)

### ✅ Yang Sudah Bagus
- **Menu Pengaturan sidebar** sangat well-organized: Profil & Akun, Langganan, Tampilan, Kategori, AI, Notifikasi, Keamanan, Export Data, Keluar
- **"Mulai Periode Keuangan"** dengan opsi Awal Bulan vs Tanggal Gajian — fitur yang sangat thoughtful
- **Pemasukan Bulanan (75.000.000) dan Total Cicilan Bulanan (800.000)** — setup yang penting untuk kalkulasi Jatah Hari Ini
- **"Konteks Uang"** (Pribadi, Keluarga, Bersama) dengan toggle — fitur multi-context yang rare
- **Penjelasan "Nilai ini menggantikan angka contoh..."** — helpful onboarding copy
- **"Ajak Pasangan ke Dompet Kita"** CTA di bawah — strategic placement

### 🔴 Yang Harus Diperbaiki

**1. Email Field Disabled ("Hubungi support untuk ganti email") — Friction**
- User yang mau ganti email harus contact support. Ini unnecessary friction
- **Solusi:** Buat flow self-service: "Ganti Email → Verifikasi email lama → Masukkan email baru → Verifikasi email baru"

**2. Angka Pemasukan Rp 75.000.000 — Placeholder atau Real?**
- Kalau ini demo data, 75 juta/bulan ngga relatable buat target Gen Z yang gajinya 5-7 juta
- **Solusi:** Default placeholder yang relatable, atau kosongkan dengan prompt "Isi gaji bulanan kamu supaya Jatah Hari Ini bisa dihitung akurat"

**3. "Konteks Uang" — Copy "Yang tidak dipakai tidak muncul di pemilih konteks" Membingungkan**
- Kalimat ini butuh dibaca 2x untuk dipahami
- **Solusi:** Sederhanakan: "Matikan konteks yang ngga kamu pakai biar ngga muncul di app"

**4. Toggle Switch untuk Konteks — Inconsistency**
- Pribadi dan Keluarga aktif (hijau), Bersama mati. Tapi di bawahnya ada CTA "Ajak Pasangan ke Dompet Kita" yang relate ke Bersama
- **Solusi:** Ketika user klik "Ajak Pasangan", otomatis aktifkan toggle Bersama. Jangan buat user harus toggle manual dulu

**5. "Keluar — Akhiri sesi ini" di Menu Pengaturan**
- Posisi "Keluar" di sidebar menu terlalu kasual. User bisa tanpa sengaja klik
- **Solusi:** Pindahkan ke paling bawah halaman pengaturan (bukan di sidebar menu), dan buat warnanya merah/destructive style

---

## 🏆 TOP 5 PRIORITAS PERBAIKAN (Berdampak Paling Besar)

| # | Perbaikan | Halaman | Dampak |
|---|---|---|---|
| 1 | **Kalender Cashflow: Tanggal masa depan jangan hijau** — bikin misleading seolah-olah "nol jajan" padahal belum terjadi | Kalender | Data integrity & trust |
| 2 | **Dashboard: Card dompet terlalu besar** — "Jatah Hari Ini" (fitur killer) tertutup, harus scroll dulu | Dashboard | Retention & daily habit |
| 3 | **Budget: "614%" tanpa microcopy nurturing** — bisa bikin user defensive dan stop pake app | Budget & Target | Emotional safety & retention |
| 4 | **Install: Bonus Eksklusif terlalu jauh di bawah** — hook terkuat tapi tertimbun | Install | Conversion rate |
| 5 | **Ajak Teman: "Sisa Token 15% Menipis" di halaman referral** — terasa guilt trip, bukan incentive | Ajak Teman | Trust & referral rate |

---

## 💡 CATATAN KESELURUHAN

### Yang Bikin CatetInd STAND OUT (Jangan Diubah!)
1. **Microcopy bahasa lo/gue** yang konsisten di SEMUA halaman — ini rare banget di app Indonesia
2. **Gamifikasi Tanamanmu** — emotional hook yang bikin user balik
3. **"Jatah Hari Ini"** — fitur paling actionable yang ngga ada di app lain
4. **"Founder-led support"** — trust signal yang sangat kuat untuk early-stage product
5. **"Sering Bikin Bingung"** alih-alih "FAQ" — detail kecil yang nunjukin lo beneran paham audience lo

### Area yang Perlu Perhatian Secara Umum
1. **Data demo/placeholder** harus relatable ke target (Gen Z gaji 5-7 juta), bukan angka ratusan juta yang intimidating
2. **Empty states** perlu lebih menggoda dan aspirational, bukan cuma "belum ada data"
3. **Mobile responsiveness** — ini PWA yang bakal lebih sering dibuka di HP, pastikan semua layout yang sekarang 2-column adapt dengan baik
4. **Information density** — beberapa halaman (Riwayat & Insight, Dashboard) terlalu padat. Pertimbangkan progressive disclosure

---

*Audit selesai — 12 halaman, 0 yang diskip. 🫡*
*Timestamp: 13 Oktober 2026*
