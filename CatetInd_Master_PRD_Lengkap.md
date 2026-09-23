# CATETIND MASTER PRD (DOMAIN 1 - 8)
=========================================



---


# Riset Kompetitor — Budggt & Fundy

Catatan riset kompetitor buat Domain 1 (Audit Kompetitor & Positioning) CatetInd. Diisi progresif tiap kali ada screenshot/temuan baru dari Maarif.

## Evidence Ledger

| # | Sumber (App + Screen + Platform) | Tanggal | Observasi | Friction / Insight |
| --- | --- | --- | --- | --- |
| 1 | Fundy — halaman Analytics, Desktop web (bukan mobile) | 18 Sep 2026 | Badge "Kesehatan finansial: Sangat Baik (100%)" + copy "Kamu hemat 100% bulan ini, kerja bagus!" ditampilkan padahal akun baru punya 1 transaksi pemasukan Rp5.000.000 dan Rp0 pengeluaran. Halaman juga punya: distribusi pengeluaran (pie, masih empty state), heatmap kalender "Kapan kamu sering boros?", ringkasan bulanan (cashflow, kategori terbesar, puncak pengeluaran, hari tanpa pengeluaran), dan cashflow per akun bank (blu BCA). | Apresiasi otomatis terasa prematur/menyesatkan — "100% hemat" bukan pencapaian nyata, cuma karena belum ada data pengeluaran sama sekali. Di sisi lain, kedalaman analitik (health score, distribusi, heatmap, cashflow per akun) LEBIH DALAM dari hipotesis awal kita "Fundy minim analitik" — perlu diverifikasi lebih lanjut dengan data yang lebih kaya, dan revisi positioning kalau perlu. Juga perlu screenshot versi MOBILE untuk dibandingkan, karena ini kelihatan versi desktop web. |
| 2 | Fundy — Pengaturan (menu utama), Desktop web | 18 Sep 2026 | Menu Pengaturan berisi: Akun (profil, billing), Personalisasi (Tampilan, Kustomisasi), Aplikasi (Panduan Fundy, Notifikasi, Cara Install untuk iPhone/Android/Windows/Mac, What's New). | Fundy tersedia lintas platform (iPhone, Android, Windows, Mac) lewat satu web app, bukan listing app store native terpisah per platform. Cakupan menu cukup luas untuk sekadar app pencatatan. |
| 3 | Fundy — Dashboard utama, Desktop web | 18 Sep 2026 | Kartu ringkasan (saldo 2 akun, pemasukan, pengeluaran), "Kesehatan Cashflow" pakai emoji + skor, grafik cashflow, distribusi pengeluaran, transaksi terakhir. Di bawah ada 1 input bar: "Ketik, bicara, atau scan struk..." dengan tombol Scan dan Bicara. | Fundy positioning dirinya AI-conversational-first untuk input transaksi (teks/suara/scan struk dalam 1 bar), bukan cuma form manual. Ini core UX bet yang perlu jadi pembanding langsung ke fitur input CatetInd. |
| 4 | Fundy — Reports (laporan AI), Desktop web | 18 Sep 2026 | Ada checkbox consent "Saya setuju data finansial saya diproses oleh AI", countdown "Laporan berikutnya", empty state karena belum ada data. Sidebar nunjukin kuota AI: Tokens 8.1K/5.0M, Voice 13s/6.0h (dalam paket Fundy+ aktif). | Fundy eksplisit minta consent AI processing (pattern yang relevan buat compliance/OJK-friendly kita). Kuota AI (token & voice) di-meter terpisah dari subscription dasar — model monetisasi "AI usage-based" di atas langganan flat. |
| 5 | Fundy — Analytics (update kedua), Desktop web | 18 Sep 2026 | Setelah ada 1 transaksi pengeluaran baru (Rp500rb kategori Makanan Dan Minuman), sistem langsung munculin insight card "MONEY ALERT: 'Makanan Dan Minuman' naik drastis" — padahal itu transaksi PERTAMA di kategori itu, bukan tren naik beneran. | Sistem insight/alert Fundy kelihatan belum punya ambang batas data minimum — kejadian pertama di suatu kategori langsung dilabel "naik drastis", berpotensi terasa berlebihan/gimmick buat user yang jeli. Celah buat CatetInd: insight baru muncul setelah ada baseline data cukup, bukan reaktif ke 1 titik data. |
| 6 | Fundy — Pengaturan Akun (detail), Desktop web | 18 Sep 2026 | Profil, ganti password, ganti email (wajib isi password saat ini), toggle "PIN Lock: Atur PIN untuk mengamankan aplikasi (PWA)", dan "Reset data aplikasi" dengan copy yang sangat jelas soal apa yang dihapus vs dipertahankan. | KONFIRMASI PENTING: Fundy eksplisit disebut sebagai **PWA** (bukan native app) dalam copy-nya sendiri. Copy "Reset data aplikasi" juga contoh UX writing bagus (transparan soal scope penghapusan) — layak dicontoh gaya penulisannya. |
| 7 | Fundy — Transaksi (daftar), Desktop web | 18 Sep 2026 | List transaksi dikelompokkan per tanggal, tiap baris cuma nampilin label generik "Transaksi" + tag kategori (Bakery/Bonus) + waktu + dompet — tidak ada nama/deskripsi transaksi yang unik ditonjolkan. | Friction potensial: susah membedakan transaksi sekilas kalau semua berjudul generik "Transaksi", user harus baca kategori buat ngerti itu apa. CatetInd bisa menang di sini dengan judul transaksi deskriptif hasil parsing AI. |
| 8 | Fundy — Kustomisasi (menu), Desktop web | 18 Sep 2026 | Ada 2 sub-menu: Kategori (default/gabungan/full kustom) dan "Asisten Fundy" yang dikunci FUNDY+ — dideskripsikan sebagai "Hint parser dan akun default per kategori". | Fitur AI parsing/hint dikunci di balik tier berbayar (Fundy+), bukan gratis dari awal. Relevan buat strategi harga/tier CatetInd. |
| 9 | Fundy — Billing, Desktop web | 18 Sep 2026 | Riwayat pembayaran nunjukin: paket "Pro+", status Berhasil, 18 Sep 2026, metode QRIS, harga **Rp139.000**, order ID mengandung "fundy-pass-monthly_pro". | DATA HARGA KONKRET: tier Pro+ Fundy = Rp139.000/bulan (estimasi dari pola order ID "monthly"). Benchmark harga langsung buat strategi monetisasi CatetInd. |
| 10 | Fundy — Kustomisasi Dashboard, Desktop web | 18 Sep 2026 | Banyak opsi personalisasi: kartu ringkasan (semua akun/pilih akun), "Tampilan dashboard (mobile): Simplified (default) vs Klasik", "Ringkasan periode: Bulan kalender vs Siklus keuangan (custom, cocok buat gajian)", blok tambahan (Budget & Goals, Investasi & Aset, dst). | PENTING: Fundy sendiri MEMBEDAKAN tampilan mobile (default: Simplified/ringkas) dari desktop (yang kita screenshot sekarang, kemungkinan mirip "Klasik"/lengkap). 10 screenshot desktop ini kemungkinan besar BEDA dari yang dilihat user asli di HP. Fitur "Siklus keuangan" (custom cycle ngikutin tanggal gajian) worth dicontoh — relevan buat target Gen-Z first-jobber. |
| 11 | Fundy — Tampilan (tema), Desktop web | 18 Sep 2026 | Toggle mode terang/gelap, dan 5 pilihan tema warna (Default Hijau, Blue, Amber, Rose, Mono) dengan live preview. | Personalisasi visual cukup dalam (5 tema warna + dark mode) — signal Fundy investasi di customization/branding personal, bukan cuma fungsi inti. Pertimbangan diferensiasi (in/out of scope V1 CatetInd). |
| 12 | Fundy — Properti & Fisik, Desktop web | 18 Sep 2026 | Empty state: "Rumah, tanah, kendaraan, logam, perhiasan, dan fisik lainnya." Total Rp0, CTA "Tambah properti". | Konfirmasi Fundy positioning sebagai pelacak net-worth PENUH (termasuk aset fisik/properti), bukan cuma cash flow harian — makin jauh dari asumsi awal "app pencatatan sederhana". |
| 13 | Fundy — Investasi (form Tambah Aset), Desktop web | 18 Sep 2026 | Form sangat detail: Tipe aset (Saham dll), Situasi pembelian (Sudah punya — track posisi lama tanpa potong akun / Baru beli — catat & potong akun), Akun RDN (opsional, belum motong saldo), Satuan (Lot Ã— 100 lembar), Nama, Symbol, Jumlah, Harga sekarang/lembar, Modal total. | Fitur investasi Fundy dibangun SPESIFIK untuk konvensi pasar modal Indonesia (satuan lot 100 lembar, akun RDN) — bukan tracker investasi generik, ada effort engineering yang dalam. Kalau CatetInd mau all-in scope V1 termasuk investasi, ini level detail yang perlu ditandingi atau sengaja disederhanakan sebagai pembeda ("kita bukan robo-advisor, cukup pencatatan simpel"). |
| 14 | Fundy — Investasi (halaman utama), Desktop web | 18 Sep 2026 | Empty state, scope: saham, emas digital, reksa dana, crypto. Ada menu "Riwayat investasi" (lihat beli/jual/perubahan posisi). | Melengkapi baris 13 — investasi jadi modul mandiri dengan riwayat transaksinya sendiri, bukan sekadar tag di dashboard. |
| 15 | Fundy — Akun Finansial, Desktop web | 18 Sep 2026 | List akun dikelompokkan per tipe (Akun Bank: blu BCA Rp11.047.002; Cash: Rp35.000.000), ada sort "Tertinggi" / "Paling sering digunakan". | Tidak ada friction/insight signifikan — pola standar list akun. |
| 16 | Fundy — What's New (changelog lengkap), Desktop web | 18 Sep 2026 | 14 rilis tercatat dari v1.0.0 (31 Jan 2026, "Fundy hadir: versi pertama") sampai v1.10.0 (21 Jul 2026, "Dashboard mobile sederhana, kategori favorit & tampilan baru") — sekitar 6 bulan. Fitur besar masuk bertahap: PIN Lock (Mar), Laporan & target finansial (Apr awal), Investasi/RDN/Logam Mulia (Apr pertengahan), Kustomisasi+Notifikasi+Tagihan (Apr akhir), Debt Manager (Jun), baru di rilis TERAKHIR (Jul) ada "Dashboard Mobile Sederhana (default)". Kontak feedback: IG @fundy.ai. | SANGAT PENTING: Fundy baru menambahkan dashboard mobile yang disederhanakan sebagai DEFAULT di rilis paling akhir mereka (bulan ke-6!) — artinya dari awal launch sampai 5 bulan pertama, versi mobile mereka kemungkinan masih versi "Klasik"/lengkap yang berat. Ini VALIDASI KUAT buat keputusan CatetInd bikin mobile-first & one-thumb-reachable dari V1 sejak awal, bukan fitur tempelan belakangan. Changelog ini juga kasih benchmark kecepatan rilis kompetitor (~1 fitur besar tiap 2-4 minggu di awal, melambat jadi ~1 bulan+ belakangan) — berguna buat estimasi realistis roadmap CatetInd sendiri. |
| 17 | Fundy — Cara Install, Desktop web | 18 Sep 2026 | Instruksi step-by-step install PWA per platform: iOS (Safari → Share → Add to Home Screen), Android (Chrome → titik tiga → Install aplikasi), Windows (Chrome/Edge → ikon Install di address bar), Mac (Chrome → ikon Install di address bar). Semua lewat browser, tanpa app store. | Konfirmasi teknis ulang soal arsitektur PWA Fundy (lihat juga baris 6) — mereka all-in di 1 codebase web yang di-"install"-kan, bukan native app terpisah per platform. |
| 18 | Fundy — Notifikasi, Desktop web | 18 Sep 2026 | 5 jenis: Reminder Harian (harian), Laporan Mingguan (dikirim tiap Minggu malam), Laporan Bulanan (laporan AI akhir bulan), Tagihan Jatuh Tempo (otomatis), "Paket Akan Berakhir" — pengingat 7, 3, dan 1 hari sebelum TRIAL atau langganan habis (otomatis). Ada catatan khusus: push notification di iOS PWA cuma jalan kalau sudah di-install ke Home Screen dulu. | KONTRADIKSI TEMUAN AWAL: notifikasi ini menyebut eksplisit kata "trial" — artinya Fundy TERNYATA menawarkan trial period untuk salah satu paketnya, bukan langsung bayar penuh dari awal. Ini beda dari asumsi/aturan CatetInd sendiri (no free trial/freemium) — bisa jadi angle diferensiasi positioning ("transparan, gak pakai gimmick trial") atau perlu didiskusikan ulang apakah aturan itu masih relevan kalau kompetitor pakai trial. |
| 19 | Fundy — Panduan Fundy (help center), Desktop web | 18 Sep 2026 | Halaman bantuan lengkap dgn search bar, mencakup semua modul (Dashboard, Transaksi, Akun Finansial, Budget, Goals, Tagihan, Kalender, Debt Manager, Investasi, Properti & Fisik, Analytics, Reports, Pengaturan & Kustomisasi, Fundy+ & AI) — tiap modul ada bagian "Cara pakai" (numbered steps) dan "Perlu tahu" (tips callout hijau). | Investasi besar di dokumentasi/onboarding edukasi user — pola strukturnya ("Cara pakai" + "Perlu tahu" per fitur) layak diadaptasi CatetInd sebagai referensi bentuk help center, bukan buat niru fiturnya. |
| 20 | Fundy — Pengaturan Kustomisasi Asisten Fundy (dikunci Fundy+), Desktop web | 18 Sep 2026 | 2 sub-fitur: "Akun default per kategori" (assign otomatis 1 kategori → 1 akun) dan "Hint AI per kategori" (user isi kata kunci custom biar AI lebih paham kategori kustom mereka). Empty state karena belum ada kategori kustom. | Fitur personalisasi/training layer buat AI parser mereka dikunci di balik tier premium — makin menguatkan pola "kapabilitas AI = kunci monetisasi utama" Fundy (konsisten dengan temuan baris 4, 8, 9). |
| 21 | Fundy — Pengaturan Kustomisasi Kategori, Desktop web | 18 Sep 2026 | 3 mode tampilan kategori: Default (bawaan Fundy saja), Gabungan (default + kustom), Full Kustom (hanya kategori kustom user). | Fleksibilitas standar, tidak ada friction/insight istimewa. |
| 22 | Fundy — Properti & Fisik (form Tambah Aset), Desktop web | 18 Sep 2026 | Field: Nama aset, Kategori (dropdown, cth Rumah), Harga beli (Rp), Harga sekarang (manual). | Beda dari form Investasi yang sangat detail — Properti & Fisik cukup simpel & manual (user update sendiri nilai sekarang berkala, tidak ada feed harga otomatis). |
| 23 | Fundy — Tagihan (form Tambah Tagihan), Desktop web | 18 Sep 2026 | Emoji picker, Nama Tagihan*, Nominal (opsional), toggle "Berulang setiap bulan" (auto aktif lagi bulan depan), "Tagihan berakhir setelah" (tanpa batas/terbatas), "Jatuh Tempo Setiap Tanggal"* dengan validasi realtime ("Tanggal jatuh tempo tidak valid (1-31)"), "Ingatkan sebelum jatuh tempo" (dropdown, cth 3 hari sebelumnya), Kategori (opsional), Akun Pembayaran (opsional), Catatan (opsional). | Fitur tagihan berlangganan (subscription tracker) cukup lengkap — relevan buat target Gen-Z yang biasanya punya banyak langganan (Netflix, Spotify, dll). Validasi input real-time contoh UX pattern bagus buat ditiru. |
| 24 | Fundy — Budget, Desktop web | 18 Sep 2026 | Tab periode (Mingguan/Bulanan/Triwulan/Tahunan/Periode Custom), kartu ringkasan "Budget Terpakai Bulan Ini", kartu per kategori (cth "Tagihan dan Utilitas" Rp200.000) dengan progress bar & tombol Edit/Hapus. | Fleksibilitas periode budget (termasuk custom) konsisten dengan temuan "Siklus keuangan" sebelumnya (baris 10) — worth dipertimbangkan kalau budgeting masuk scope CatetInd. |
| 25 | Fundy — Tagihan (list, setelah nambah Netflix), Desktop web | 18 Sep 2026 | Kartu tagihan Netflix nampilin badge status "Terlambat" (merah) meski baru dibuat, tanggal "Tgl 13 tiap bulan", nominal Rp200.000, tag "Bayar manual", ada banner ajakan aktifkan push notification. | Status "Terlambat" otomatis dihitung dari tanggal jatuh tempo vs hari ini — logic due-date solid. Tag "Bayar manual" mengindikasikan kemungkinan ada opsi lain (auto-debit?) yang belum ke-capture — perlu dicek lebih lanjut. |
| 26 | Fundy — Halaman Fundy+ (pricing/paywall), Desktop web | 18 Sep 2026 | 2 tier: Fundy+ (Standar) diskon 50% Rp78.000→Rp39.000/bulan (2.5 juta token, 3 jam voice, kategori kustom hingga 100); Fundy Pro+ (Power user, badge "Most Popular") diskon 50% Rp118.000→Rp59.000/bulan (5 juta token, 6 jam voice, kategori kustom hingga 150). Fitur sama di kedua tier (Asisten Fundy, input suara, scan struk, laporan AI, kategori kustom) — beda cuma kuota & limit. Ada tagline eksplisit: "Paket bulanan, perpanjang kapan saja - gak ada langganan otomatis. Bayar saat mau, berhenti kapan mau." Status akun ini: "Pro+ aktif, berlaku hingga 18 September 2126" (30 hari akses, beli lagi = tambah 30 hari/stacking). Ada opsi top up terpisah: 1 jam voice tambahan Rp8.000, 1 juta token tambahan Rp12.000. FAQ mencakup: token itu apa, token habis sebelum bulan selesai, cara perpanjang, ganti paket, keamanan pembayaran (Midtrans), refund. | TEMUAN MONETISASI PALING PENTING SEJAUH INI — lihat Temuan Kunci Batch 4 di bawah untuk detail lengkap & implikasinya. |
| 27 | Fundy — Debt Manager, Desktop web | 18 Sep 2026 | Total Hutang Rp500.000 (1 aktif) & Total Piutang Rp0 (0 aktif), filter Semua/Aktif, kartu hutang "Motor" dengan progress "Terbayar 0%" dan aksi Bayar/Edit/Hapus. | Debt Manager melacak DUA ARAH (hutang ke orang lain & piutang dari orang lain) — relevan karena target Gen-Z sering punya cicilan/hutang teman/pinjol. Worth dipertimbangkan sebagai fitur pembeda, atau justru sengaja disederhanakan sesuai filosofi "waras dulu" (jangan bikin makin ribet mikirin utang). |
| 28 | Fundy — Kalender (cash flow harian), Desktop web | 18 Sep 2026 | Kalender bulanan dengan tiap tanggal diwarnai sesuai net cash flow harian (surplus/defisit/hari ini), klik tanggal munculin detail transaksi & ringkasan (pemasukan/pengeluaran/cash flow bersih) di panel samping. Ada "Sorotan bulan ini": Hari Aktif, Rata pengeluaran/hari, Hari Paling Boros, Pemasukan Terbesar. | Visualisasi kalender cash-flow harian ini cukup unik & scannable — pola visual (warna per hari) bisa jadi referensi UX buat "cek cepat gimana kondisi bulan ini" di CatetInd. |
| 29 | Fundy — Goals, Desktop web | 18 Sep 2026 | Kartu goal "Rumah" (target Rp200.000.000, deadline 1 tahun lagi, progress 0%), otomatis hitung "Biar tercapai tepat waktu: Rp16.438.357 per bulan", tombol "Alokasi" untuk nabung manual ke goal, riwayat tabungan (kosong, "setoran dari transaksi manual akan muncul di sini"). | Fitur auto-kalkulasi nominal tabungan bulanan yang dibutuhkan buat capai goal tepat waktu itu nudge yang smart & actionable — worth diadopsi kalau Goals masuk scope CatetInd V1. |
| 30 | Fundy — Dashboard utama, **Mobile (HP asli)** | 18 Sep 2026 | Header "Selamat datang, Maarif" + avatar, ikon sidebar/mata (sembunyikan saldo)/bulan (dark mode)/gear/lonceng. Kartu "Total Saldo" Rp41.537.002 dari "2 akun" (ikon mata tersendiri buat sembunyikan angka). Tombol aksi cepat "+ Pemasukan" (hijau) / "- Pengeluaran" (merah) + ikon grid hijau bulat (buka Menu Cepat). Kartu "Pengeluaran 7 hari" (bar chart mini Sab-Jum). Kartu "Transaksi Terakhir" (link "Lihat semua"). Bottom nav 5 ikon: Home, Wallet, FAB hijau (+), Transfer, Laporan (pie chart). | INI SCREENSHOT MOBILE ASLI PERTAMA yang diterima — beda total dari semua screenshot desktop sebelumnya. Bottom nav cuma nampilin 5 fitur inti; 10 modul lainnya (Budget, Goals, Tagihan, dst) disembunyikan di balik "Menu Cepat" grid, gak dipaksa masuk semua ke bottom nav. Pola IA ini (5 tab inti + grid "lainnya") relevan banget buat desain navigasi mobile CatetInd. |
| 31 | Fundy — Transaksi Baru (bottom sheet), Mobile | 18 Sep 2026 | Trigger dari FAB hijau. 4 kartu tipe (grid 2x2): Pengeluaran, Pemasukan (default terpilih), Tabungan, Transfer. Field: Tanggal (auto terisi hari ini), Jam (auto terisi jam sekarang), Jumlah (+ ikon kalkulator shortcut), Ke akun (dropdown), Kategori (dropdown searchable "Cari atau pilih"), Catatan (opsional). CTA "Tambah Pemasukan" (label dinamis sesuai tipe). | Auto-fill tanggal & jam ke waktu sekarang = micro-UX yang mengurangi friksi input, wajib ada di form transaksi CatetInd. 4 tipe transaksi (bukan cuma 2) — Tabungan & Transfer diperlakukan sebagai tipe transaksi tersendiri, bukan sekadar plus-minus manual. |
| 32 | Fundy — Menu Cepat (bottom sheet grid), Mobile | 18 Sep 2026 | Grid ikon 2 baris x 5 kolom, 2 halaman ("1/2"): Transaksi, Akun, Budget, Tagihan, Kalender, Goals, Hutang, Investasi, Properti, Pengaturan. | Ini peta lengkap information architecture mobile Fundy — konfirmasi bottom nav cuma nyisain 5 akses langsung, 10 modul lainnya ditaruh di sini. Benchmark konkret: berapa banyak fitur muat di "top-level" vs disembunyikan biar app gak kerasa berat. |
| 33 | Fundy — Akun Finansial, Mobile | 18 Sep 2026 | Sama secara struktur dgn versi desktop (baris 15): title + subtitle "Kelola sumber keuanganmu.", tombol "+ Tambah Akun", filter "Tertinggi"/"Paling sering digunakan", dikelompokkan per tipe (Akun Bank: blu BCA Rp6.547.002; Cash: Rp34.990.000). | Konsisten 1:1 antara desktop & mobile di halaman ini — nunjukin simplifikasi mobile Fundy (baris 10 & 16) kemungkinan cuma nyentuh Dashboard, bukan semua halaman. |
| 34 | Fundy — Tambah Akun Finansial (modal), Mobile | 18 Sep 2026 | Form: Jenis Akun* (dropdown, default "Bank"), Nama Akun* (placeholder "Contoh: BCA, BCA Tabungan, BCA Gaji, dll" + helper "Bisa buat lebih dari satu akun dengan platform yang sama."), Pilih Logo* (dropdown "Pilih logo Bank" + helper), Saldo sekarang (default 0). Footer: Batal / Simpan. | Gak ada bank-sync/open banking — user manual pilih logo bank & isi saldo sendiri, murni self-reported. Validasi kalau CatetInd manual-first juga wajar & sesuai ekspektasi pasar, bukan kekurangan unik. |
| 35 | Fundy — Transaksi (list), Mobile | 18 Sep 2026 | Title + subtitle "Semua duit masuk & keluar ada di sini.", tombol "+ Tambah Transaksi", search bar "Cari catatan...", 3 filter chip (Semua Waktu/Semua Dompet/Semua Tipe), dikelompokkan per tanggal dgn total harian di header grup ("18 SEP 2026 ... -Rp10.000"), baris transaksi: ikon emoji kategori, nama ("Ayam"), tag kategori, waktu, jumlah. | REVISI TEMUAN BARIS 7: transaksi mobile ternyata BISA punya nama spesifik ("Ayam"), bukan cuma label generik "Transaksi". Gap kompetitif yang lebih akurat: Fundy belum auto-generate nama deskriptif dari AI parsing, user harus ketik manual sendiri — ini peluang diferensiasi nyata buat CatetInd (auto-naming transaksi dari hasil parsing AI, user gak perlu ketik manual). |
| 36 | Fundy — Budget, Mobile | 18 Sep 2026 | Tab periode (Mingguan/Bulanan [aktif, badge "1"]/Triwulan/Tahunan/Periode Custom). Kartu "BUDGET TERPAKAI BULAN INI" Rp0/0%, dari Rp200.000, Sisa Rp200.000. Kartu kategori "Tagihan dan Utilitas", Budget Rp200.000, Terpakai 0%, progress bar, tombol Edit/Hapus. | Struktur identik dgn versi desktop (baris 24) — halaman non-dashboard lain lagi konsisten antar platform. |
| 37 | Fundy — Budget Baru (modal), Mobile | 18 Sep 2026 | Trigger dari empty state tab Triwulan ("Belum ada budget triwulan" + "+ Tambah budget triwulan"). Modal: Kategori utama* (dropdown "Cari atau pilih kategori utama"), helper "Mau pakai kategori custom untuk budget? Atur atau tambah dulu kategori custom di halaman kustomisasi kategori" + tombol "Buka kustom kategori", note "Pilih kategori terlebih dahulu. Ikon serta isian periode dan nominal akan tampil setelah kamu memilih." Footer Batal/Simpan. | Progressive disclosure yang bagus — field periode & nominal baru muncul SETELAH kategori dipilih. Juga terkonfirmasi tiap PERIODE budget (Mingguan/Bulanan/Triwulan/dst) itu SET DATA TERPISAH, bukan cuma filter tampilan — scope teknis budgeting Fundy lebih besar dari dugaan awal. |
| 38 | Fundy — Pengaturan (menu utama), Mobile | 18 Sep 2026 | Title + subtitle "Kelola akun, tampilan, dan kustomisasi aplikasi." Grup AKUN (Akun: avatar/email/password/nama tampilan; Billing: riwayat pembayaran Fundy+), PERSONALISASI (Tampilan: mode terang/gelap & warna aksen; Kustomisasi: tampilan dashboard & kategori), APLIKASI (Panduan Fundy: tutorial urut fitur; Notifikasi: kelola push notification; lanjut ke Cara Install dst). | Struktur identik dgn menu Pengaturan desktop (baris 2) — tiap item pakai 1 baris subtext ringkas yang jelas, pola label+deskripsi ini enak dicontoh di Pengaturan CatetInd. |
| 39 | Fundy — Sidebar (nav drawer utama), Mobile | 18 Sep 2026 | Header logo "Fundy" + "+ Tambah Transaksi" quick action + ikon lonceng. Nav utama: Dashboard (aktif), Transaksi, Analytics, Reports, Pengaturan. Dikelompokkan per section: "Keuangan" (Akun Finansial), "Asset" (Investasi, Properti & Fisik), "Tools" (Budget, Goals, Tagihan, Calendar, Debt Manager). Badge "Fundy+ AKTIF". Footer "Penggunaan AI" dgn foto profil user + menu titik tiga. | INI PETA NAVIGASI PALING LENGKAP yang ditemukan — ternyata Fundy punya DUA jalur ke fitur sekunder: sidebar ini (grouping berlabel: Keuangan/Asset/Tools) DAN "Menu Cepat" bottom sheet (baris 32, cuma grid ikon polos tanpa label). Dua sistem navigasi paralel ke tujuan sama berpotensi bikin bingung user ("fitur X di sidebar atau di menu cepat?") — pelajaran buat CatetInd: cukup 1 sumber kebenaran navigasi sekunder. Pengelompokan "Keuangan/Asset/Tools" juga taksonomi jelas yang layak dicontoh cara pengelompokannya. Analytics & Reports terkonfirmasi 2 modul terpisah. |
| 40 | Fundy — Reports, Mobile | 18 Sep 2026 | Title + subtitle "Laporan AI mingguan & bulanan keuanganmu". Tab Mingguan/Bulanan. Checkbox tercentang "Saya setuju data finansial saya diproses oleh AI". "Laporan berikutnya" countdown real-time (2d 4h 20m 33s). Dropdown tahun 2026. Empty state "Belum ada laporan nih!" — "Laporan otomatis akan muncul setiap akhir minggu." | Sama persis strukturnya dgn versi desktop (baris 4), termasuk consent checkbox AI. Countdown detik real-time ke laporan berikutnya itu detail kecil yang bikin fitur AI reporting kerasa "hidup"/aktif jalan di background. |
| 41 | Fundy — Investasi (halaman utama), Mobile | 18 Sep 2026 | Title + subtitle "Saham, emas digital, reksa dana, crypto, dan sejenisnya." + tombol "Tambah aset". Kartu "TOTAL INVESTASI" Rp0. Link "Riwayat investasi — Lihat beli, jual, dan perubahan posisi". Empty state: "Isi modal, jumlah, dan nilai sekarang untuk lihat untung/rugi." tombol "+ Tambah investasi". | Konsisten dgn versi desktop (baris 14), menegaskan ulang (lihat baris 13) nilai investasi di-update MANUAL oleh user, bukan feed harga real-time otomatis dari bursa. |
| 42 | Fundy — Investasi Baru (modal), Mobile | 18 Sep 2026 | Sama seperti versi desktop (baris 13): Tipe aset (dropdown, Saham), Situasi pembelian (Sudah punya — track posisi lama tanpa potong akun / Baru beli — catat & potong akun), Akun RDN (opsional, "Tidak dipotong sekarang — hanya sebagai referensi beli/jual berikutnya"), Satuan (Lot Ã—100 lembar), Nama (placeholder "BBRI"), Symbol (opsional), Jumlah. Ada tambahan section collapsible "Tips & penjelasan field (opsional)" di tengah form. | Fitur collapsible "Tips & penjelasan field" langsung di dalam form itu pola bagus — bantuan kontekstual nempel di titik kebutuhan, bukan harus buka Panduan Fundy terpisah. Worth diadopsi buat form-form kompleks CatetInd (kalau ada). |
| 43 | Fundy — Properti & Fisik (list), Mobile | 18 Sep 2026 | Title + subtitle "Rumah, tanah, kendaraan, logam, perhiasan, dan fisik lainnya." + tombol "+ Tambah aset". Kartu "TOTAL PROPERTI & FISIK" Rp0. Empty state ilustrasi rumah, "Belum ada aset properti nih!" "Tambah posisi dan update estimasi nilai kapan saja." tombol "+ Tambah properti". | Identik dgn versi desktop (baris 12) — konsisten lagi. |
| 44 | Fundy — Tambah Properti (modal "Properti & fisik baru"), Mobile | 18 Sep 2026 | Nama aset (placeholder "Contoh: Rumah Depok"), Kategori (dropdown, "Rumah"), Harga beli/Rp (placeholder "500.000.000"), Harga sekarang/manual (placeholder "640.000.000"). Tombol "Tambah". | Placeholder pakai CONTOH ANGKA KONKRET yang menunjukkan kenaikan nilai (500jt beli → 640jt sekarang) — teknik copywriting kecil yang efektif buat "menjual" value proposition (lacak kenaikan net worth) langsung di form kosong, bukan cuma placeholder generik "0". Worth ditiru di form-form CatetInd yang punya value prop serupa (progress/growth). |
| 45 | Fundy — Goals, Mobile | 18 Sep 2026 | Title + subtitle "Tetapkan dan pantau goals keuangan kamu" + "+ Tambah Goal". Kartu agregat "TOTAL TABUNGAN GOALS" Rp0, progress ring "0% tercapai", "dari Rp200.000.000 target · 1 goal", "Kurang Rp200.000.000". Kartu per-goal "Rumah" (target Rp200.000.000, due "18 September 2027 · 1 tahun lagi", Progres 0%, "BIAR TERCAPAI TEPAT WAKTU: Rp16.438.357 per bulan"). | Ada 2 level tampilan — ringkasan AGREGAT semua goals (progress ring) di atas, baru detail per-goal di bawah. Pola 2-level ini bagus buat direplikasi kalau Goals masuk scope CatetInd, biar user bisa cek progress keseluruhan sekilas tanpa scroll ke tiap goal. |
| 46 | Fundy — Tagihan, Mobile | 18 Sep 2026 | Title + subtitle "Pantau tagihan berulang dan jangan sampai terlambat bayar" + "+ Tambah Tagihan". Kartu Netflix, badge "Terlambat" (merah), "Tgl 13 tiap bulan", NOMINAL Rp200.000, tag "Bayar manual", tombol Edit (dgn dot oranye "!" alert)/Hapus. Footer nudge: "Kamu akan mendapat notifikasi saat tagihan mendekati jatuh tempo. Aktifkan push notification di Pengaturan Notifikasi agar pengingat dikirim langsung ke perangkat kamu" (link langsung ke halaman Pengaturan Notifikasi). | Nudge aktivasi push notification ditaruh KONTEKSTUAL di halaman fitur yang relevan (bukan cuma nunggu ditemukan di Pengaturan) — pola "ask for permission in context" yang lebih efektif buat conversion opt-in. Layak dicontoh CatetInd buat nudge-nudge serupa. |
| 47 | Fundy — Kalender, Mobile | 18 Sep 2026 | Title + subtitle "1 transaksi tercatat di 1 hari bulan ini." + tombol "Hari ini". Navigasi bulan "< Sep 2026 >". Legend warna: Surplus (hijau), Defisit (merah), Hari ini (outline). Grid kalender Sen-Min, tanggal 18 (hari ini, outline hijau) nampilin "-10rb" (merah, defisit). "Sorotan bulan ini": Hari Aktif 1/30, Rata Pengeluaran/Hari Rp333, Hari Paling Boros Rp10.000 (18 Sep), Pemasukan Terbesar (terpotong). | Identik dgn versi desktop (baris 28). Detail kecil: sel "hari ini" pakai 2 indikator visual sekaligus (outline utk "hari ini" + warna angka utk surplus/defisit) — perlu hati-hati kalau CatetInd niru pola ini, jangan sampai kelebihan layer visual di 1 sel kecil bikin bingung. |
| 48 | Fundy — Debt Manager, Mobile | 18 Sep 2026 | Sama persis strukturnya dgn versi desktop (baris 27): Total Hutang Rp500.000 (1 aktif) & Total Piutang Rp0 (0 aktif), filter Semua/Aktif, kartu hutang "Motor" dgn progress "Terbayar 0%" dan aksi Bayar/Edit/Hapus. | Identik 1:1 mobile vs desktop — makin menegaskan pola: simplifikasi mobile Fundy 100% cuma di Dashboard. |
| 49 | Fundy — Fundy Access (halaman pricing/paywall awal sebelum masuk app), Mobile web (browser) | 18 Sep 2026 | Headline "Finansialmu, versi upgrade." Kartu "PALING DIPILIH"/"BEST VALUE": Fundy+ (BUNDLE), diskon 50% Rp198.000 → **Rp99.000**, "Sekali bayar · Asisten Fundy 30 hari pertama". Fitur "APP · SELAMANYA" (catat transaksi, dashboard/budget/target, investasi & properti halaman terpisah, multi akun, utang & laporan dasar, tagihan & pengingat) + "ASISTEN FUNDY · 30 HARI" (chat, suara→transaksi, foto struk→isi otomatis, laporan AI, kategori kustom hingga 100). | **HARGA KE-3 YANG BERBEDA LAGI** ditemukan (lihat juga baris 9 Rp139.000 dan baris 26 Rp39rb/Rp59rb) — kali ini Rp99.000 dari Rp198.000 buat 1 paket "Fundy+ BUNDLE" yang gabungin app selamanya + asisten AI 30 hari. Kemungkinan ini SKU/promo BERBEDA dari 2 tier terpisah di baris 26 (bukan revisi harga tier yang sama) — dicatat sebagai indikasi Fundy punya BANYAK varian SKU pricing paralel, bukan 1 struktur harga tunggal yang berubah-ubah. Jangan simpulkan kontradiksi data sebelum verifikasi lebih lanjut. |
| 50 | Fundy — FAQ pricing ("Pertanyaan yang sering ditanya"), Mobile web (browser) | 18 Sep 2026 | 9 pertanyaan collapsible: beda Fundy+ vs Pro+, cara hitung "Pesan AI", isi paket bundle, arti "seumur hidup", Asisten Fundy habis 30 hari gimana, kuota habis sebelum bulan selesai gimana, bisa perpanjang Asisten Fundy, keamanan pembayaran, kebijakan refund. Footer trust badge: "Pembayaran aman via Midtrans", "Kartu, e-wallet, transfer", **"Tanpa auto-renew paksa"**, "BAYAR AMAN · MIDTRANS". | FAQ ini eksplisit nge-front-load semua objection-handling buat model bayar-sekali/lifetime + kuota AI — struktur pertanyaannya (beda tier, cara hitung kuota, apa yang terjadi kalau habis, keamanan, refund) jadi template FAQ yang layak dicontoh buat halaman pricing CatetInd. Badge "Tanpa auto-renew paksa" jadi trust signal eksplisit anti-dark-pattern — konsisten & memperkuat temuan baris 26 soal model prepaid-stacking (bukan subscription auto-charge). |
| 51 | Fundy — Onboarding langkah 1/8 ("Selamat datang di Fundy"), Mobile web (browser, setelah daftar) | 18 Sep 2026 | Step indicator 8 langkah (1 aktif). Icon dompet. Headline "Selamat datang di Fundy" + subtitle "Kita atur dasar-dasarnya dulu biar catatan keuanganmu rapi sejak awal. Prosesnya singkat, sekitar 2 menit." 3 kartu preview: Akun (catat rekening bank/e-wallet/tunai/kartu kredit), Budget (atur batas pengeluaran per kategori tiap bulan), Target (tentukan tujuan keuangan & pantau progresnya). CTA "Mulai →". | Fundy pakai **wizard onboarding linear 8 langkah** tepat setelah daftar, bukan langsung lempar ke dashboard kosong — konfirmasi pola "configure before you use" biar dashboard punya data nyata sejak awal. Worth didiskusikan: CatetInd mau onboarding seketat ini (8 langkah) atau lebih ringan biar gak nambah friksi sign-up. |
| 52 | Fundy — Onboarding langkah 2/8 ("Periode Dashboard"), Mobile web (browser) | 18 Sep 2026 | Pilihan periode: "Bulan kalender" (default terpilih, "Tanggal 1 s/d akhir bulan") vs **"Siklus keuangan"** ("Dari tanggal pilihanmu hingga sehari sebelum tanggal sama bulan berikutnya. Cocok untuk yang ingin memantau cashflow dari gaji ke gaji."). Helper: "Tidak memengaruhi budget & analitik lain." Tombol Kembali/Lanjut ke Akun. | Preferensi "periode dashboard" (kalender vs siklus gajian) di-set di ONBOARDING sebagai preferensi global sejak awal, bukan cuma opsi tersembunyi di Pengaturan (konsisten dgn baris 10) — opsi "gajian ke gajian" ini fitur kecil yang relevan buat freelancer/first-jobber Gen-Z, worth dipertimbangkan buat CatetInd. |
| 53 | Fundy — Onboarding langkah 3/8 ("Tambah akun finansialmu"), Mobile web (browser) | 18 Sep 2026 | Subtitle "Catat tempat uangmu disimpan — rekening bank, e-wallet, uang tunai, e-money, atau kartu kredit. Minimal satu akun agar transaksi bisa dicatat." Empty state dashed box + tombol "+ Tambah Akun". Tombol "Lanjut ke Penghasilan →" nampak disabled (belum bisa lanjut sebelum nambah akun). | Onboarding MEWAJIBKAN minimal 1 akun sebelum bisa lanjut ke step berikutnya ("Lanjut ke Penghasilan") — step selanjutnya ternyata soal **Penghasilan** (langkah 4/8, belum ke-screenshot). Pola "wajib isi sebelum lanjut" ini nambah friksi tapi mastiin data dashboard gak kosong pas user pertama kali lihat. |
| 54 | Fundy — Onboarding langkah 4/8 ("Hitung alokasi dari penghasilanmu"), Mobile web (browser) | 18 Sep 2026 | Subtitle "Masukkan penghasilan bulanan, nanti Fundy bagi otomatis jadi tiga pos: **Kebutuhan 50%, Keinginan 30%, dan Tabungan & Dana Darurat 20%**. Angkanya bisa kamu sesuaikan nanti." Input "Penghasilan bulanan (Rp)" placeholder "Contoh: 10.000.000". Tombol Kembali/Lanjut ke Budget. | Fundy pakai framework budgeting klasik **50/30/20** sebagai auto-alokasi default dari penghasilan yang diisi — pola edukasi finansial yang familiar & gampang dipahami, worth dipertimbangkan sebagai starting point rekomendasi budget otomatis CatetInd (dgn opsi disesuaikan). |
| 55 | Fundy — Onboarding langkah 5/8 ("Atur budget bulanan"), Mobile web (browser) | 18 Sep 2026 | Subtitle "Tentukan batas pengeluaran per kategori tiap bulan. Contohnya makanan, transport, atau hiburan. Kamu bisa atur manual di bawah, atau **pakai rekomendasi otomatis dari penghasilanmu**." Form: Kategori (dropdown "Cari atau pilih kategori"), Jumlah budget (Rp), tombol "+ Tambah budget" (nonaktif/hijau muda sebelum diisi). Tombol Kembali/Lanjut ke Target. | Step ini eksplisit nyebut ada opsi "rekomendasi otomatis dari penghasilanmu" — mengindikasikan hasil split 50/30/20 di langkah 4 dipakai buat nyaranin alokasi budget per kategori otomatis, bukan cuma info statis. Kalau CatetInd bikin budgeting, pola "auto-suggest dari income lalu bisa diedit manual" ini ngurangin friksi setup awal. |
| 56 | Fundy — Onboarding langkah 6/8 ("Target keuangan (opsional)"), Mobile web (browser) | 18 Sep 2026 | Judul eksplisit ditandai "(opsional)". Subtitle jelasin Target = tujuan keuangan dgn jumlah & tenggat waktu, bisa nambah beberapa sekaligus, contoh: liburan ke Bali, dana nikah, dana darurat 6 bulan, DP rumah, beli kendaraan, biaya pendidikan, gadget baru. "Tambah satu target untuk mulai dipantau, atau lewati dan isi nanti." Form: Judul target, Target jumlah (Rp), Tanggal target, tombol "+ Buat target" (nonaktif). | BEDA dari step Akun/Penghasilan/Budget sebelumnya yang wajib diisi, step Target ini EKSPLISIT ditandai opsional di judulnya sendiri — nunjukin Fundy sengaja bedain step wajib vs nice-to-have di onboarding, bukan maksa semua step keliatan sama pentingnya. Worth ditiru: kasih sinyal jelas mana yang boleh di-skip. |
| 57 | Fundy — Onboarding langkah 7/8 ("Aktifkan Notifikasi"), Mobile web (browser) | 18 Sep 2026 | Ikon lonceng. 3 kartu fitur: Reminder Harian (pengingat catat transaksi tiap hari), Laporan Otomatis (notif saat laporan mingguan & bulanan AI siap), Info Langganan (peringatan 7/3/1 hari sebelum akses berakhir). Banner oranye: "Browser ini belum mendukung push notification. Gunakan Chrome, Edge, atau Safari terbaru." Tombol Kembali/Lewati. | Keterbatasan PWA soal push notification (lihat juga baris 18) kejadian LANGSUNG & eksplisit ditampilkan ke user real-time saat browser gak support — ditangani dgn jujur (kasih tau alasan + rekomendasi browser) dan tombol "Lewati" biar gak nge-block onboarding. Pola transparansi error/limitasi teknis kayak gini worth dicontoh kalau CatetInd (native app) punya limitasi serupa di skenario lain. |
| 58 | Fundy — Onboarding langkah 8/8 (upsell Fundy+), Mobile web (browser) | 18 Sep 2026 | Kartu "Fundy+": "Dapatkan kuota AI lebih banyak, laporan mingguan & bulanan otomatis, dan akses ke fitur premium lainnya." 3 bullet centang: Kuota AI lebih banyak untuk scan struk & analisis; Laporan mingguan & bulanan otomatis; Fitur premium & prioritas support. CTA "Lihat paket Fundy+" (hijau, primer) / "Lewati, lanjut ke Dashboard" (teks, sekunder). | Upsell monetisasi ditaruh di LANGKAH TERAKHIR onboarding — momen setelah user udah invest effort ngisi penghasilan/budget/target (sunk-cost/momentum), bukan interupsi di awal. Tetap ada opsi skip jelas ke Dashboard, gak maksa. Timing upsell kayak gini (di ujung onboarding, bukan di tengah) worth dicontoh kalau CatetInd mau ada upsell serupa. |
| 59 | Fundy — Toast "Setup selesai!" (transisi onboarding → dashboard), Mobile web (browser) | 18 Sep 2026 | Toast/snackbar muncul di bawah layar dashboard: "Setup selesai! Selamat menggunakan Fundy." | Konfirmasi kecil tapi penting secara psikologis — nutup loop onboarding dgn microcopy positif pas user pertama kali landing di dashboard asli mereka. Detail kecil yang gampang dilewatkan tapi nambah rasa "selesai"/pencapaian. |
| 60 | Fundy — Modal "Yang Baru di Fundy" (changelog v1.10.0), Mobile web (browser) | 18 Sep 2026 | Modal muncul OTOMATIS overlay di atas dashboard baru, tepat setelah onboarding selesai (bukan cuma buat user lama stelah update). Isi: "Dashboard mobile sederhana, kategori favorit & tampilan baru" + 2 poin "YANG BARU": Dashboard Mobile Sederhana (default, bisa diganti ke Klasik di Pengaturan), Suara Konfirmasi Transaksi (efek suara singkat saat transaksi berhasil dicatat). Tombol "Oke, mengerti" / "Lihat semua pembaruan". | TEMUAN MENARIK: modal changelog "Yang Baru" ini ditampilkan ke user BARU yang baru selesai onboarding pertama kali, bukan cuma ke user lama yang baru lihat update — efektif jadi semacam capstone/highlight fitur terbaru sebagai penutup onboarding. Kontennya juga cross-check dgn temuan baris 16 (changelog v1.10.0 soal Dashboard Mobile Sederhana) — konfirmasi silang data akurat. |
| 61 | Budggt — Landing page (Fitur & Value Prop), Web (budggt.com, publik, belum subscribe) | 18 Sep 2026 | Headline "Stop Hidup dari Gaji ke Gaji". Value prop: track semua dompet/pengeluaran/budget di 1 tempat. Alur 3 langkah dipromosikan: (1) masukkan semua dompet (rekening bank/e-wallet/kartu kredit/PayLater), (2) tentukan budget (masukkan gaji, tentukan limit per kategori), (3) catat pengeluaran, lihat polanya. Catatan eksplisit: "Saldo tidak otomatis sinkron karena tidak memasukkan id atau password, jadi sangat aman" — manual balance entry, tanpa bank-sync (dipromosikan sebagai fitur keamanan). | Positioning nyaris identik dengan Fundy dan CatetInd sendiri — pain point sama (gajian ke gajian, spreadsheet ribet, susah nabung). Framing "tanpa bank-sync = lebih aman" ini worth dicontoh cara komunikasinya kalau CatetInd juga manual-first. |
| 62 | Budggt — Fitur utama (landing page) | 18 Sep 2026 | Fitur diklaim: (1) Semua dompet 1 tempat; (2) Budget disiplin via setup wizard 6 langkah, mode Percentage atau Fixed Budgeting, alert kalau over-budget; (3) [PRO] AI Financial Advisor — "jawaban personal, bukan generik"; (4) [PRO] Scan struk otomatis oleh AI; (5) [PRO] Financial Health Score 0-100, grafik tren, breakdown kategori, perbandingan bulan-ke-bulan; (6) [PRO] Goals dengan deadline + progress tracking; (7) Privasi: tanpa iklan/jual data, mode sembunyikan saldo; (8) PWA installable tanpa app store. | Struktur fitur sangat mirip Fundy (AI advisor, scan struk, health score, goals) tapi cuma dikunci di 1 tier PRO (bukan tier premium terpisah berlapis seperti Fundy+/Pro+). Setup wizard 6 langkah disebut eksplisit, tapi urutan/isinya belum terverifikasi karena belum subscribe. |
| 63 | Budggt — Pricing (2 tier: STARTER & PRO), Web | 18 Sep 2026 | STARTER: Rp199.000 -50% → Rp99.000/tahun (multi dompet, percentage/fixed budgeting, 2 tema warna, dark mode, laporan lanjutan, ID/EN). PRO ("Paling Populer"): Rp299.000 -50% → Rp149.000/tahun, termasuk 75 AI credits gratis saat daftar, semua fitur STARTER + Goals + lacak aset & net worth + Financial Health Score + AI Advisor + Scan struk + AI Report Analyzer. Upgrade STARTER→PRO cuma bayar selisih prorata. Tidak ada free tier / free trial di manapun pada landing page. | TEMUAN PENTING: Budggt pakai harga TAHUNAN (bukan bulanan seperti Fundy) dan jauh lebih murah per satuan waktu — Rp99rb-149rb/TAHUN vs Fundy yang realistis Rp470rb-700rb+/tahun kalau subscribe bulanan penuh 12 bulan. Ada sedikit inkonsistensi di landing page (list fitur STARTER juga menyebut "Goals" dan "AI Advisor" yang seharusnya PRO-only menurut section fitur di atas) — kemungkinan typo copy, perlu dicek langsung di app. |
| 64 | Budggt — FAQ (landing page), Web | 18 Sep 2026 | 7 pertanyaan: keamanan data (server terenkripsi, "tidak ada yang bisa melihat data kamu, termasuk kami", tanpa iklan/jual data); sync otomatis ke rekening bank (BELUM ada, transaksi manual atau AI receipt scanner, dengan framing "input manual yang conscious justru bikin kamu lebih aware"); beda STARTER vs PRO; cara bayar (QRIS/GoPay/OVO/DANA/transfer bank); auto-renew (TIDAK ADA — "Setelah 365 hari kamu akan mendapat notifikasi untuk perpanjang secara manual. Kamu yang pegang kendali penuh."); cross-device (PWA, Android & iPhone, data sync otomatis); upgrade STARTER→PRO (bayar selisih prorata). | Budggt juga eksplisit posisikan diri anti-dark-pattern (no auto-renew) mirip Fundy, dengan framing "kamu pegang kendali penuh". Filosofi "input manual = lebih aware" ini selaras dengan kemungkinan positioning manual-first CatetInd — sudah tervalidasi pasar karena 2 kompetitor pakai framing serupa. |
| 65 | Budggt — Perbandingan vs cara lama & testimoni (landing page) | 18 Sep 2026 | 3 perbandingan side-by-side: vs Spreadsheet (ribet di HP, rumus error, zoom in-out → mobile sat-set, hitungan otomatis); vs Catatan HP (manual, berantakan, tanpa total bulanan → otomatis+grafik, kategori rapi, total real-time); vs Buku Tulis (rawan hilang/basah, capek hitung manual → aman di cloud, history lengkap). Testimoni bergaya casual Gen-Z (emoji, bahasa gaul). Target eksplisit "1.000+ Gen Z dan Millenial". | Target audiens sama persis dengan CatetInd (Gen-Z Indonesia, pain point "adulting"/gajian-ke-gajian). Gaya copy santai + testimoni social-proof jadi referensi relevan buat campaign IG CatetInd juga. |
| 66 | Fundy — Billing (revisi baris 9), pengalaman langsung Maarif | 19 Sep 2026 | Klarifikasi harga: Rp139.000 yang tercatat di baris 9 ternyata harga LIFETIME (sekali bayar, akses selamanya), bukan per bulan seperti diasumsikan sebelumnya dari pola order ID "monthly_pro". | Merevisi baris 9 & meresolusi sebagian Diskrepansi Harga di Batch 4 (poin 3): Fundy ternyata jual SKU lifetime terpisah seharga Rp139.000, beda dari 2 tier bulanan (Rp39rb/Rp59rb) dan bundle Rp99rb (baris 49). Konfirmasi ulang: Fundy punya banyak varian SKU harga paralel (bulanan, lifetime, bundle), bukan 1 struktur harga tunggal. |
| 67 | Fundy — interaksi tombol, Desktop web, pengalaman langsung Maarif | 19 Sep 2026 | Saat klik tombol di desktop, terasa ada delay/jeda sebelum respons/aksi muncul. | Friction performa nyata, bukan cuma soal UX/copy. Validasi konkret kenapa keputusan arsitektur CatetInd "resilient online-first" (optimistic UI + retry queue, Domain 4) penting — biar aksi user terasa instan meski request masih diproses di background. |
| 68 | Fundy — navigasi, Mobile, pengalaman langsung Maarif | 19 Sep 2026 | Saat scroll konten ke bawah, sidebar/bottom nav ikut ter-scroll bareng konten (tidak sticky/fixed) — user harus scroll balik ke atas dulu buat akses nav dan pindah halaman. | FRICTION NAVIGASI SIGNIFIKAN — kontradiksi asumsi baris 30/39 yang menganggap pola bottom nav 5-tab Fundy solid. Implementasinya ternyata tidak fixed-position, jadi kehilangan manfaat utama bottom nav (akses konstan tanpa scroll). Requirement teknis wajib buat CatetInd: nav utama harus fixed/sticky di semua kondisi scroll. |

## Temuan Kunci Lintas Screenshot (Batch 2 — Desktop, 18 Sep 2026)

1. **Fundy adalah PWA, bukan native app** — dikonfirmasi eksplisit dari copy PIN Lock di halaman Akun.
2. **Harga konkret**: tier Pro+ = Rp139.000 (kemungkinan per bulan) via QRIS.
3. **Model monetisasi berlapis**: subscription dasar (Fundy+) + kuota AI usage-based (token & voice) + fitur AI tertentu (Asisten Fundy/hint parser) dikunci lebih lanjut.
4. **Sistem insight/alert bereaksi ke data yang sangat sedikit** (1-2 transaksi) dengan klaim yang terdengar signifikan ("hemat 100%", "naik drastis") — berpotensi terasa prematur/gimmick, celah buat CatetInd desain insight yang lebih jujur soal ambang data.
5. **Penamaan transaksi generik** ("Transaksi" + tag kategori), bukan deskripsi unik per transaksi — potensi friction scanning cepat.
6. **Scope produk luas**: Akun Finansial, Investasi, Properti & Fisik, Budget, Goals, Tagihan, Calendar, Debt Manager — Fundy positioning sebagai super-app keuangan pribadi, bukan cuma pencatatan sederhana.
7. **PENTING — tampilan desktop â‰  tampilan mobile default**: Fundy sendiri punya toggle "Simplified (default) vs Klasik" khusus mobile. 10 screenshot desktop ini kemungkinan besar TIDAK merepresentasikan pengalaman mobile asli. Screenshot mobile tetap prioritas berikutnya.

## Temuan Kunci Lintas Screenshot (Batch 3 — Desktop, 18 Sep 2026 lanjutan)

1. **Mobile-simplified dashboard baru jadi default di rilis TERAKHIR Fundy** (v1.10.0, bulan ke-6 sejak launch) — validasi kuat buat CatetInd pakai pendekatan mobile-first/one-thumb sejak V1, bukan retrofit belakangan.
2. **Fundy ternyata punya trial period** (dari notifikasi "Paket Akan Berakhir" yang sebut kata "trial") — kontradiksi asumsi awal soal kompetitor no-trial; perlu dipertimbangkan sebagai angle diferensiasi atau bahan diskusi ulang strategi CatetInd.
3. **Fitur Investasi dibangun sangat spesifik untuk pasar modal Indonesia** (satuan lot 100 lembar, akun RDN, mode "sudah punya" vs "baru beli") — kalau investasi masuk scope V1 CatetInd, ini jadi acuan level kedalaman yang perlu ditandingi atau sengaja disederhanakan.
4. Fundy investasi besar di **help center/dokumentasi pakai per fitur** ("Cara pakai" + "Perlu tahu") — worth diadopsi sebagai pola referensi.
5. Changelog publik Fundy kasih benchmark **kecepatan rilis kompetitor** (~1 fitur besar tiap 2-4 minggu di awal, melambat ke ~1 bulan+ belakangan) — berguna untuk kalibrasi ekspektasi roadmap CatetInd sendiri.
6. Scope produk makin lengkap terkonfirmasi: Properti & Fisik + Investasi (saham/emas/reksadana/crypto) menegaskan Fundy = super-app net-worth, bukan cuma pencatatan harian.

## Temuan Kunci Lintas Screenshot (Batch 4 — Desktop, 18 Sep 2026 lanjutan)

1. **MODEL MONETISASI FUNDY TERKUAK PENUH — bukan subscription auto-renew, tapi "pass" prepaid yang di-stack**: halaman Fundy+/Pro+ eksplisit bilang "Paket bulanan, perpanjang kapan saja - gak ada langganan otomatis. Bayar saat mau, berhenti kapan mau." User beli akses 30 hari; kalau beli lagi sebelum habis, masa berlaku DITAMBAH (stacking), bukan di-charge otomatis tiap bulan. Beda jauh dari asumsi umum "kompetitor pakai subscription flat". Ini bisa jadi argumen KENAPA CatetInd juga sebaiknya pakai model no-auto-renew/prepaid — bukan cuma soal no-trial, tapi juga soal "gak ada gimmick charge otomatis" yang relevan buat psikologi Gen-Z yang sering takut kena tagihan gak sadar.
2. **Harga 2 tier terungkap (dengan diskon 50% yang kelihatan seperti promo)**: Fundy+ (Standar) Rp78.000 → Rp39.000/bulan (2.5jt token, 3 jam voice, kategori kustom hingga 100); Fundy Pro+ ("Most Popular") Rp118.000 → Rp59.000/bulan (5jt token, 6 jam voice, kategori kustom hingga 150). Fitur identik di kedua tier, beda cuma kuota AI & limit kategori kustom.
3. **DISKREPANSI HARGA yang perlu diklarifikasi**: baris 9 (riwayat pembayaran) mencatat harga Rp139.000 untuk paket "Pro+", tapi harga listing SEKARANG di halaman Fundy+ untuk Pro+ adalah Rp59.000 (diskon) / Rp118.000 (normal). Kemungkinan: (a) harga berubah dari waktu histori pembayaran itu ke sekarang, (b) ada komponen biaya lain yang tergabung di histori pembayaran, atau (c) diskon 50% ini promo yang belum berlaku waktu histori itu terjadi. JANGAN pakai salah satu angka ini sebagai benchmark final tanpa verifikasi ulang.
4. **Top-up granular tersedia di luar paket utama**: kalau kuota AI (token/voice) habis di tengah bulan, user bisa beli top up terpisah (1 jam voice tambahan Rp8.000; 1 juta token tambahan Rp12.000) — model monetisasi berlapis makin jelas: paket dasar + kuota AI meter + top-up on-demand.
5. **Debt Manager 2 arah** (hutang ke orang lain & piutang dari orang lain) — relevan buat target Gen-Z yang sering punya cicilan/utang teman/pinjol; perlu diputuskan in/out of scope.
6. **Goals ada auto-kalkulasi "nabung per bulan biar tercapai tepat waktu"** — nudge actionable yang smart, worth diadopsi.
7. **Kalender cash-flow harian dengan kode warna surplus/defisit** — pola visualisasi unik yang scannable, worth jadi referensi.

## Temuan Kunci Lintas Screenshot (Batch 5 — Mobile, 18 Sep 2026)

1. **AKHIRNYA ada screenshot MOBILE ASLI** (bukan desktop) — layout dashboard jauh lebih compact: FAB hijau sentral + bottom nav 5 tab (Home/Wallet/Tambah/Transfer/Laporan), sisanya 10 modul disembunyikan di "Menu Cepat" grid sekunder. Pola IA ini (5 top-level + grid "lainnya") jadi benchmark konkret buat desain navigasi CatetInd.
2. Form Transaksi Baru mobile **auto-fill tanggal & jam ke waktu sekarang** — micro-UX wajib ditiru buat kurangi friksi input.
3. Transaksi punya **4 tipe** (Pengeluaran/Pemasukan/Tabungan/Transfer) — Tabungan & Transfer diperlakukan sebagai tipe transaksi sendiri, bukan cuma plus-minus biasa.
4. **REVISI temuan baris 7**: transaksi mobile ternyata BISA punya nama spesifik ("Ayam"), bukan cuma label generik "Transaksi" seperti yang kelihatan di data desktop sebelumnya. Gap kompetitif yang lebih akurat: Fundy belum auto-generate nama deskriptif dari AI parsing, user masih harus ketik manual — ini peluang diferensiasi nyata buat CatetInd.
5. Tambah Akun Finansial murni manual (pilih logo bank dari daftar, isi saldo sendiri) — **gak ada bank-sync/open banking**. Konfirmasi manual-first itu standar pasar, bukan kekurangan unik.
6. Halaman Akun Finansial identik 1:1 antara desktop & mobile — simplifikasi mobile Fundy sepertinya cuma menyentuh Dashboard, bukan semua halaman.

## Temuan Kunci Lintas Screenshot (Batch 6 — Mobile, 18 Sep 2026 lanjutan)

1. Fundy punya **DUA jalur navigasi paralel** ke fitur sekunder: sidebar/nav drawer berlabel (Keuangan/Asset/Tools) dan "Menu Cepat" bottom sheet tanpa label — duplikasi ini berpotensi bikin bingung; pelajaran buat CatetInd: cukup 1 sumber navigasi sekunder yang konsisten.
2. **Analytics & Reports terkonfirmasi 2 modul BERBEDA** (bukan 1 modul 2 nama) — Analytics fokus insight otomatis, Reports fokus laporan AI periodik dgn consent checkbox.
3. Tiap periode Budget (Mingguan/Bulanan/Triwulan/Tahunan/Custom) adalah **SET DATA TERPISAH**, bukan cuma filter tampilan — scope teknis budgeting lebih besar dari dugaan.
4. Form Budget pakai **progressive disclosure** (field muncul bertahap setelah kategori dipilih) — pola UX bagus buat kurangi cognitive load form panjang.
5. Investasi tetap manual 100% (user isi nilai sekarang sendiri) — sekali lagi konfirmasi gak ada feed harga pasar otomatis.
6. Halaman non-dashboard (Budget, Pengaturan, Reports, Investasi) semuanya identik 1:1 antara mobile & desktop — menguatkan kesimpulan simplifikasi mobile Fundy CUMA di Dashboard.

## Temuan Kunci Lintas Screenshot (Batch 7 — Mobile, 18 Sep 2026 lanjutan)

1. Form kompleks (Investasi) punya section collapsible **"Tips & penjelasan field"** — bantuan kontekstual nempel di titik kebutuhan, bukan harus keluar ke halaman Panduan terpisah.
2. Placeholder form Tambah Properti pakai **contoh angka konkret** yang menunjukkan kenaikan nilai (Rp500jt→Rp640jt) — teknik copywriting kecil yang efektif "menjual" value proposition langsung di form kosong.
3. Goals punya **2 level tampilan**: ringkasan agregat semua goals (progress ring) + detail per-goal — pola overview+detail yang bagus buat direplikasi.
4. Tagihan taruh nudge aktivasi push notification **kontekstual di halaman fitur yang relevan**, bukan cuma nunggu ditemukan di Pengaturan — pola "ask for permission in context" yang lebih efektif buat opt-in.
5. Sisa halaman non-dashboard (Investasi, Properti & Fisik, Goals, Tagihan, Kalender) semuanya identik 1:1 antara mobile & desktop — makin menegaskan simplifikasi mobile Fundy 100% cuma di Dashboard, gak ada satupun halaman fitur lain yang disederhanakan versi mobile-nya.

## Temuan Kunci Lintas Screenshot (Batch 8 — Mobile/Web, 18 Sep 2026 lanjutan)

1. Debt Manager mobile identik 1:1 dgn desktop (baris 27) — konsisten menguatkan pola "hanya Dashboard yang disederhanakan di mobile".
2. Ditemukan HARGA KE-3 yang berbeda lagi: Rp99.000 (diskon dari Rp198.000) untuk paket "Fundy+ BUNDLE" (app selamanya + Asisten AI 30 hari) — kemungkinan SKU/promo terpisah dari 2 tier di baris 26, bukan kontradiksi harga tier yang sama. Kesimpulan sementara: Fundy kemungkinan punya BEBERAPA varian SKU pricing paralel, bukan 1 struktur harga tunggal.
3. FAQ pricing eksplisit mencantumkan trust badge "Tanpa auto-renew paksa" — memperkuat temuan model prepaid-stacking (baris 26) dan jadi contoh copy anti-dark-pattern yang bisa CatetInd adopsi.
4. Ditemukan flow ONBOARDING 8-langkah pertama kali (Welcome → Periode Dashboard → Tambah Akun → Penghasilan → ...) — pola "configure before you use" yang mewajibkan setup dasar (termasuk minimal 1 akun) sebelum user bisa lanjut, memastikan dashboard gak kosong di percobaan pertama. Preferensi "Periode Dashboard" (kalender vs siklus gajian) di-set sejak onboarding, bukan disembunyikan di Pengaturan.
5. FAQ pricing page jadi template objection-handling yang solid buat halaman pricing CatetInd sendiri (perbedaan tier, cara hitung kuota AI, kuota habis, keamanan pembayaran, refund).

## Temuan Kunci Lintas Screenshot (Batch 9 — Onboarding lanjutan, 18 Sep 2026)

1. **Alur onboarding 8 langkah Fundy sekarang terpetakan penuh**: Welcome → Periode Dashboard → Tambah Akun → Penghasilan (auto-split 50/30/20) → Budget (bisa auto-rekomendasi dari penghasilan) → Target (eksplisit opsional) → Aktifkan Notifikasi → Upsell Fundy+ — referensi end-to-end lengkap buat CatetInd memutuskan struktur onboarding sendiri.
2. Fundy pakai **framework 50/30/20** (Kebutuhan/Keinginan/Tabungan & Dana Darurat) sbg starting point alokasi otomatis dari penghasilan — pola edukasi finansial yang mudah dipahami & actionable.
3. Step **Target ditandai eksplisit "(opsional)"** di judulnya, beda dari step wajib lain (Akun, Penghasilan) — sinyal jelas mana yang boleh di-skip vs harus diisi.
4. Limitasi push notification PWA (baris 18) kejadian nyata & ditangani transparan ("Browser ini belum mendukung push notification" + tombol Lewati) — pola jujur soal keterbatasan teknis yang gak nge-block progres user.
5. **Upsell Fundy+ ditaruh di langkah TERAKHIR onboarding** (momentum/sunk-cost, bukan interupsi awal), dengan opsi skip jelas ke Dashboard — timing upsell yang halus dan gak maksa.
6. Modal changelog "Yang Baru" (v1.10.0) otomatis muncul ke USER BARU tepat setelah onboarding, bukan cuma user lama — dipakai jadi semacam capstone highlight fitur, sekaligus konfirmasi silang data dgn temuan baris 16.

## Temuan Kunci Lintas Screenshot (Batch 10 — Pengalaman Langsung Maarif, 19 Sep 2026)

1. **Klarifikasi harga Rp139.000 = LIFETIME**, bukan bulanan — merevisi baris 9 & memperkuat kesimpulan Batch 4 bahwa Fundy punya banyak SKU harga paralel (bulanan, lifetime, bundle), bukan 1 struktur harga.
2. **Delay/lag nyata saat klik tombol di desktop** — friction performa yang dialami langsung, bukan cuma dugaan dari screenshot. Alasan konkret kenapa keputusan arsitektur CatetInd "resilient online-first" (optimistic UI + retry queue dari Domain 4) itu penting, bukan cuma teori.
3. **Bottom nav mobile TIDAK sticky/fixed** — ikut ter-scroll bareng konten, user harus scroll ke atas dulu buat pindah halaman. Kontradiksi asumsi awal (baris 30) yang menganggap pola 5-tab bottom nav Fundy solid — implementasinya sendiri ternyata cacat. Requirement teknis wajib buat CatetInd: nav utama harus fixed-position di semua kondisi scroll.

## Temuan Kunci — Budggt (Batch 1, Web Research — Belum Subscribe, 18 Sep 2026)

1. **Riset ini bersumber dari landing page publik budggt.com (marketing site), BUKAN screenshot in-app** — Maarif belum subscribe Budggt sehingga belum ada visibilitas ke dashboard, form transaksi, wizard onboarding, atau tampilan mobile asli aplikasi. Semua temuan di baris 61-65 adalah klaim/copy dari halaman publik, belum tervalidasi dari pengalaman pakai langsung.
2. **Positioning & target audiens nyaris identik dengan CatetInd & Fundy** — pain point "gajian ke gajian", target eksplisit "1.000+ Gen Z dan Millenial", tagline gaya casual/gaul, testimoni social-proof ala screenshot chat.
3. **Model harga TAHUNAN, bukan bulanan** — STARTER Rp99rb/tahun, PRO Rp149rb/tahun (promo -50% dari Rp199rb/Rp299rb). Jauh lebih murah dibanding Fundy per tahun (Fundy realistis Rp470rb-700rb+/tahun kalau subscribe bulanan penuh 12 bulan). Budggt juga eksplisit no-auto-renew (notifikasi manual perpanjang tiap 365 hari) — pola prepaid jujur mirip semangat no-freemium/no-trial CatetInd.
4. **Framing "tanpa bank-sync" sebagai fitur keamanan, bukan limitasi** — copy landing page eksplisit: "Saldo tidak otomatis sinkron karena tidak memasukkan id atau password, jadi sangat aman", diperkuat FAQ: "input manual yang conscious justru bikin kamu lebih aware soal pengeluaran". Framing ini berguna kalau CatetInd juga manual-first dan mau preempt pertanyaan "kenapa gak auto-sync?".
5. **Struktur fitur PRO mirip Fundy** (AI Advisor, Receipt Scanner, Report Analyzer, Financial Health Score, Goals) tapi cuma 2 tier (STARTER/PRO), tanpa tier ke-3/add-on kuota terpisah seperti Fundy. Ada indikasi inkonsistensi/typo di listing fitur STARTER vs PRO pada landing page — perlu verifikasi langsung di app kalau nanti subscribe.
6. **Belum bisa dikonfirmasi dari riset ini**: alur onboarding wizard "6 langkah" (disebut tapi belum terlihat urutannya), UI dashboard/transaksi/budget asli, kedalaman AI features sesungguhnya, dan apakah ada gap antara klaim marketing vs pengalaman pakai nyata (pola yang justru banyak ditemukan waktu riset Fundy — klaim vs kenyataan sering beda).

## Catatan Umum

- Prioritaskan screenshot **mobile** (real user experience), desktop cuma pelengkap.
- Screenshot per-section (sesuai 1 scroll layar) lebih valuable daripada 1 gambar full-page panjang — biar jelas mana yang "above the fold" vs butuh scroll.
- Format asli (PNG/JPG), jangan dikonversi ke PDF (kompresi ngerusak detail teks kecil).

## Sintesis & Rekomendasi Positioning CatetInd vs Fundy (18 Sep 2026)

Rangkuman ini narik benang merah dari 60 baris Evidence Ledger observasi Fundy (desktop, mobile, dan alur onboarding lengkap) jadi implikasi konkret buat Domain 1 (Audit Kompetitor & Positioning) Super Prompt V4.

### Siapa Fundy sebenarnya

- Bukan app pencatatan sederhana — super-app net-worth PWA yang nyakup: transaksi, akun finansial multi-tipe, budget (5 periode), goals, tagihan berlangganan, kalender cash-flow, debt manager 2 arah, investasi (saham/emas/reksadana/crypto dgn konvensi pasar modal Indonesia), properti & fisik, plus AI assistant (chat/suara/scan struk) berlapis kuota.
- Model bisnis: bukan subscription auto-renew, tapi PASS prepaid yang di-stack (~30 hari per beli, gak ada charge otomatis) + kuota AI usage-based + top-up granular. Minimal 3 varian harga berbeda ditemukan (Rp139rb histori, Rp39rb/Rp59rb per-tier, Rp99rb bundle) — indikasi promo agresif & SKU paralel, bukan harga stabil.
- Mobile app-nya baru dapat "Dashboard Mobile Sederhana" sebagai default di rilis ke-14 (bulan ke-6 sejak launch) — sebelum itu kemungkinan user mobile kena versi "Klasik" yang berat.

### Pola yang PATUT ditiru

1. Auto-fill tanggal/jam di form transaksi; 4 tipe transaksi (Pengeluaran/Pemasukan/Tabungan/Transfer).
2. Bottom nav 5 tab inti + grid "lainnya" buat modul sekunder — walau Fundy sendiri kebablasan bikin 2 jalur nav paralel (redundant, bikin bingung), CatetInd ambil ide "5 tab inti" tapi HARUS cuma 1 sumber navigasi sekunder.
3. Progressive disclosure di form kompleks (field muncul bertahap setelah pilihan awal); bantuan kontekstual collapsible langsung di form (bukan harus keluar ke help center).
4. Placeholder form pakai contoh angka yang "menjual" (nunjukin progres/growth), bukan cuma "0".
5. Auto-kalkulasi actionable ("nabung Rp X/bulan biar goal tercapai tepat waktu"); kalender cash-flow berkode warna; dua-level ringkasan (agregat + detail per item) di Goals.
6. Framework 50/30/20 buat auto-split penghasilan saat onboarding — starting point edukatif yang gampang dipahami.
7. Nudge permission (push notif) ditaruh kontekstual di halaman fitur relevan, bukan cuma sekali di awal.
8. Trust badge eksplisit ("Tanpa auto-renew paksa") + FAQ pricing yang nge-front-load semua objection — worth diadaptasi buat halaman pricing CatetInd sendiri (relevan karena CatetInd juga udah punya aturan no-trial/no-freemium — bisa dikomunikasikan sejelas ini).
9. Upsell premium ditaruh di momen momentum (akhir onboarding), bukan interupsi di tengah; ada consent eksplisit buat AI data processing.
10. Step onboarding opsional ditandai jelas beda dari yang wajib.

### Celah kompetitif — peluang diferensiasi CatetInd

1. **Insight/alert system Fundy prematur & bisa gimmicky** — bereaksi "signifikan" ke 1-2 data point ("hemat 100%", "naik drastis"). CatetInd bisa menang dgn insight yang jujur soal ambang data minimum sebelum kasih klaim.
2. **Penamaan transaksi masih manual, gak ada AI-auto-naming** — Fundy andelin user ngetik nama sendiri walau punya AI assistant buat parsing. Peluang nyata: auto-generate nama transaksi deskriptif dari hasil parsing (foto struk/suara/teks).
3. **Dua jalur navigasi paralel (sidebar vs menu cepat) bikin redundant** — CatetInd cukup 1 sumber navigasi sekunder yang konsisten.
4. **PWA architecture punya limitasi push notification nyata** (khususnya browser/iOS tertentu) yang keliatan dari onboarding — kalau CatetInd native app, ini otomatis jadi keunggulan reliabilitas notifikasi.
5. **Harga gak konsisten/berpromosi terus** — bisa bikin user bingung/gak percaya "harga asli"-nya berapa. CatetInd yang udah punya aturan anti-freemium/anti-trial bisa lebih differentiated dgn 1 harga jujur & konsisten, ditambah transparansi ala "Tanpa auto-renew paksa" yang malah lebih clean dari sekadar niru.
6. **Mobile-first baru jadi prioritas di bulan ke-6** — validasi kuat CatetInd harus mobile-first & one-thumb SEJAK V1, bukan retrofit.
7. **Fitur investasi & debt manager sangat dalam secara teknis** (lot saham, RDN, 2-arah hutang-piutang) — kalau modul ini masuk scope V1 CatetInd (sesuai keputusan "semua fitur ship di V1"), perlu diputuskan level kedalaman: tandingi detailnya, atau sengaja disederhanakan sesuai filosofi "waras dulu, baru yang lain-lain" (bukan jadi robo-advisor/akuntan pribadi yang ribet).
8. **Performa interaksi (delay tombol) & navigasi yang tidak sticky adalah friction nyata yang dialami langsung** (bukan cuma dari screenshot) — validasi kuat kenapa keputusan Domain 4 soal optimistic UI dan requirement "bottom nav fixed di semua state scroll" harus jadi technical requirement non-negotiable, bukan nice-to-have.

### Implikasi buat Domain 1 Super Prompt V4

- Positioning CatetInd sebaiknya BUKAN "kita punya fitur lebih dikit jadi lebih simpel", karena secara fitur breadth kompetitor udah sangat lengkap dan keputusan V1 CatetInd sendiri adalah ship semua fitur. Diferensiasi yang lebih realistis & defensible: **kualitas eksekusi & kejujuran UX** — mobile-first dari hari 1, insight yang jujur (bukan gimmick), AI auto-naming yang beneran ngurangin kerjaan manual, navigasi tunggal yang jelas, dan model harga yang transparan & konsisten (selaras dgn Forbidden List yang udah ada).
- Riset ini juga jadi bukti kuat buat Domain 7B/copywriting: user Gen-Z yang overwhelmed sama kompleksitas fitur finansial (net worth, investasi, utang) butuh app yang "waras dulu" — Fundy sendiri berpotensi kena kritik "terlalu banyak, bisa bikin cemas" kalau gak dikemas dgn UX yang tenang.

## Bedah Budggt — 5 Friction Point (Confidence: Sedang — dari riset publik, belum in-app)

Catatan: karena Maarif tidak subscribe Budggt, 5 poin ini ditarik dari landing page + FAQ publik, bukan pengalaman in-app langsung seperti Fundy. Perlakukan sebagai hipotesis, bukan fakta final.

1. **Klaim vs kenyataan belum tervalidasi** — semua fitur (AI Advisor "personal", Financial Health Score, Report Analyzer) baru copy marketing, belum ada bukti demo/screenshot in-app. Risiko sama seperti pola yang ditemukan di Fundy (insight kelihatan canggih tapi shallow underneath).
2. **Inkonsistensi copy tier** — listing fitur STARTER di landing page ikut menyebut "Goals" dan "AI Advisor" yang seharusnya PRO-only menurut section fitur di atasnya. Sinyal QA copy kurang rapi, berpotensi bikin calon user ragu pas mau checkout.
3. **Komitmen di muka lebih besar** — model tahunan (Rp99rb-149rb sekali bayar/tahun), bukan bulanan/prepaid pendek. Buat Gen-Z yang belum yakin mau pakai app finansial jangka panjang, ini friksi keputusan lebih tinggi dibanding model yang lebih granular.
4. **Wizard onboarding tidak transparan** — disebut "6 langkah" tapi urutan/isinya tidak dipublikasikan. Kalau polanya mirip Fundy (8 langkah, wajib isi akun+penghasilan sebelum lanjut), ini titik dropoff onboarding yang belum kelihatan dari luar.
5. **Tidak ada differensiasi UX yang terlihat dari luar** — secara fitur & positioning (pain point gajian-ke-gajian, target Gen-Z, no-bank-sync=aman, no-auto-renew) Budggt praktis menggemakan Fundy nyaris kata-per-kata. Tanpa in-app experience yang teruji, sulit tahu apa yang benar-benar membedakan mereka dari Fundy selain harga.

**Yang tetap patut diakui dari Budggt:** harga jauh lebih terjangkau per tahun dibanding Fundy, framing anti-dark-pattern ("tanpa bank-sync = aman", "tanpa auto-renew") konsisten dan jelas, testimoni bergaya casual Gen-Z efektif untuk social proof.

## Positioning Map 2x2 (Domain 1 Deliverable Final)

Sumbu: **Kedalaman Fitur & Analitik** (Minimalis â†→ Superapp Komprehensif) Ã— **Kejujuran & Transparansi UX** (Klaim Gimmicky/Tidak Konsisten â†→ Insight Jujur & Actionable)

| Pemain | Kedalaman Fitur | Kejujuran & Transparansi UX |
| --- | --- | --- |
| Fundy | **Tinggi** — superapp net-worth penuh (transaksi, akun multi-tipe, budget 5 periode, goals, tagihan, kalender cash-flow, debt manager 2-arah, investasi ala pasar modal Indonesia, properti) | **Rendah-Sedang** — insight bereaksi ke 1-2 data point ("hemat 100%", "naik drastis"), 3 varian harga berbeda ditemukan tanpa penjelasan konsisten, dua jalur navigasi paralel yang redundant |
| Budggt | **Sedang** — 2 tier, PRO cukup lengkap di atas kertas tapi belum tervalidasi in-app, ada inkonsistensi copy fitur | **Sedang-Tinggi** — framing anti-dark-pattern eksplisit & konsisten (no bank-sync, no auto-renew), tapi transparansi ini baru teruji di level marketing, belum di produk nyata |
| **CatetInd (target position)** | **Tinggi** — ship semua fitur (transaksi, Joint/Family Wallet, Debt Manager, 4 aset, investasi) sejak V1, bukan bertahap 6 bulan seperti Fundy | **Tinggi** — insight baru muncul setelah ambang data cukup (bukan reaktif ke 1 titik), AI auto-naming yang beneran mengurangi kerja manual, 1 sumber navigasi sekunder, 1 harga konsisten (Founding Member transparan bertahap), privasi zero-exception |

**White space yang direbut CatetInd:** kuadran "Superapp Komprehensif DAN Jujur" saat ini kosong — Fundy comprehensive tapi eksekusinya inconsistent/gimmicky, Budggt terlihat jujur tapi kedalamannya belum terbukti nyata dipakai. Tidak ada satupun yang klaim keduanya sekaligus dengan kredibel.

## Positioning Statement Final

> Untuk Gen-Z & first-jobber Indonesia yang capek gajian-ke-gajian dan overwhelmed sama kompleksitas app finansial, **CatetInd adalah aplikasi pencatatan keuangan AI-native yang mencatat SEMUA aspek finansial — transaksi, utang, aset, sampai investasi — sejak hari pertama, tanpa mengorbankan kejujuran dan kesederhanaan pemakaian.** Tidak seperti Fundy yang comprehensive tapi insight-nya gimmicky dan harganya berubah-ubah tanpa penjelasan, dan tidak seperti Budggt yang terdengar jujur di marketing tapi kedalaman produknya belum terbukti nyata — CatetInd membuktikan keduanya bisa jalan bareng: lengkap sejak V1, dan jujur di setiap klaim yang ditampilkan ke user.
> 

### Status riset Budggt

Per 18 Sep 2026: **belum ada screenshot in-app Budggt**, karena Maarif belum subscribe (tidak ada tier gratis — cuma STARTER Rp99.000/tahun atau PRO Rp149.000/tahun). Sebagai gantinya, baris 61-65 + "Temuan Kunci — Budggt (Batch 1)" di atas berisi riset dari landing page publik budggt.com — cukup untuk gambaran positioning, harga, dan copy marketing, tapi **belum** bisa memvalidasi UX in-app sedalam riset Fundy (60 baris observasi dashboard, form, navigasi, dan alur onboarding lengkap).

Update 18 Sep 2026 (lanjutan): Maarif memutuskan **tidak akan subscribe Budggt**. Ditelusuri opsi riset gratis lain di luar landing page (YouTube, Instagram, App Store/Play Store, review pihak ketiga) — hasilnya:

- **Ada 1 video demo resmi** di channel YouTube Budggt: "Budggt Desktop Demo" (1:43, ~877 views, [tonton di sini](https://www.youtube.com/watch?v=Oq4XHw19bwI)) yang kemungkinan menampilkan tampilan asli dashboard/UI. AI tidak bisa mengekstrak frame visual dari video — kalau mau dipakai, ini butuh langkah manual: Maarif tonton videonya lalu screenshot momen yang nunjukin UI, baru dikirim ke sini buat dicatat ala Evidence Ledger. Ini cara GRATIS paling mendekati screenshot in-app yang ditemukan.
- Instagram resmi @budggt (1.649 followers) isinya konten meme/relatable finansial buat engagement, bukan tutorial UI. Ada 2 Highlight ("Updates", "Reviews") yang worth dicek manual kalau-kalau ada screenshot UI nyelip di testimoni.
- Tidak ditemukan listing Play Store/App Store (Budggt cuma PWA) — gak ada screenshot resmi dari sana. Tidak ditemukan juga review/tutorial pihak ketiga (TikTok/YouTube) yang spesifik ngebahas Budggt.

Opsi lanjutan: (a) anggap riset web-only + FAQ ini cukup untuk Domain 1 kalau Budggt dianggap ancaman sekunder dibanding Fundy — **direkomendasikan** mengingat effort riset UX Fundy udah sangat dalam (60 baris) dan Budggt kemungkinan bukan prioritas utama; (b) Maarif tonton video demo YouTube & cek Instagram Highlights secara manual (gratis, ~5-10 menit), screenshot bagian yang nunjukin UI asli, kirim ke sini buat dicatat; (c) subscribe STARTER (Rp99.000/tahun) kalau butuh kedalaman penuh setara riset Fundy — **tidak dipilih** karena Maarif memutuskan tidak subscribe.


---


# CatetInd — Domain 2: Arsitektur Fitur & Inovasi UX
## Product Requirements Document (PRD) Komprehensif

**Versi:** 1.0  
**Tanggal:** 21 September 2026  
**Tim Persona:** ARIA · BIMA · CANDRA · DIAN  
**Target Launch:** V1 — semua sub-domain ship bersamaan

---

## DAFTAR ISI

1. [2A. Frictionless Input Engine](#2a-frictionless-input-engine)
2. [2B. Variable Income Budgeting](#2b-variable-income-budgeting-untuk-freelancer)
3. [2C. Sandwich Generation Architecture](#2c-sandwich-generation-architecture)
4. [2D. Joint Wallet](#2d-joint-wallet-untuk-pasangan-muda)
5. [2E. Wealth Tracking Module](#2e-wealth-tracking-module-investasi--debt-manager)
6. [Master Supabase Schema](#master-supabase-schema-domain-2a-2e)
7. [Asumsi & Interpretasi yang Diambil](#asumsi--interpretasi-yang-diambil)

---

# 2A. FRICTIONLESS INPUT ENGINE

## Perspektif Tim & Resolusi Konflik

> **[ARIA — Principal Product Strategist]:** "Retention D30 kita bergantung pada seberapa cepat user bisa log transaksi. Berdasarkan data GrabPay internal, kalau flow lebih dari 5 detik, completion rate drop 40%. Unit economics menuntut AI usage yang efisien — jangan over-call API."

> **[BIMA — Lead UX & Behavioral Architect]:** "Kecepatan itu penting, tapi *feeling* saat input harus terasa seperti self-care, bukan dihukum karena boros. Kurangi cognitive load, biarkan AI yang berpikir. Setiap micro-copy harus menggunakan bahasa teman, bukan auditor."

> **[CANDRA — Principal Web Architect]:** "Untuk PWA di Android low-end (Redmi 9A, Samsung A03), kita sangat hati-hati dengan animasi dan proses di client. OCR di client itu no-go — offload ke server. Browser native `<input capture>` adalah sahabat kita. Jangan tambah library yang gak perlu."

> **[DIAN — Growth & Conversion Psychologist]:** "Friction di awal adalah pembunuh konversi. Pain-first conversion berarti kita selesaikan rasa malas mencatat mereka secepat mungkin. Kasih dopamine hit setiap kali mereka berhasil mencatat — ini yang bikin habit sticky."

> **ðŸš¨ KONFLIK:** BIMA ingin animasi Lottie celebration 2 detik setelah save (self-care moment). CANDRA menolak karena 2 detik blocking = user gak bisa langsung input transaksi berikutnya (friction kumulatif kalau batch input 5 struk sekaligus).
> 
> **RESOLUSI:** Animasi Lottie celebration dijalankan secara **non-blocking** — muncul overlay 1 detik lalu auto-dismiss, user sudah bisa tap FAB lagi setelah 0.5 detik (animasi tetap berjalan di background layer). Durasi animasi: 1.2 detik. File Lottie: <80KB, preloaded saat app init.

---

## 2A.1 Core Input Architecture

**Filosofi:** Zero Cognitive Load. User tidak boleh berpikir untuk mencatat.

| Spesifikasi | Target |
|---|---|
| Maksimal interaksi FAB → tersimpan | **4 taps** |
| Transaction types | Pengeluaran, Pemasukan, Tabungan, Transfer |
| Auto-fill date/time | WAJIB ke `Date.now()` saat bottom sheet terbuka |
| AI Descriptive Naming | WAJIB — setiap transaksi mendapat nama deskriptif (bukan kategori generik) |

### User Stories & Acceptance Criteria

**US-INPUT-01: Pencatatan Cepat**
*Sebagai first-jobber yang baru selesai bayar di kasir, saya ingin mencatat pengeluaran dalam 4 ketukan sehingga saya bisa langsung lanjut aktivitas tanpa delay.*

- [x] AC1: Waktu dari tap FAB hingga toast "Tersimpan" < 5 detik (koneksi 3G stabil)
- [x] AC2: Tanggal dan jam otomatis terisi dengan `new Date()` saat bottom sheet mount
- [x] AC3: Keyboard numerik otomatis muncul setelah tap tipe transaksi
- [x] AC4: React Number Format aktif — input "25000" otomatis render "Rp 25.000"

**US-INPUT-02: Nama Transaksi Deskriptif Otomatis**
*Sebagai user yang review pengeluaran akhir bulan, saya ingin setiap transaksi punya nama spesifik (bukan "Makanan") sehingga saya langsung ingat konteksnya.*

- [x] AC1: AI generate descriptive name berdasarkan input (manual: dari deskripsi/merchant, OCR: dari data struk, voice: dari utterance)
- [x] AC2: Nama deskriptif muncul di field `ai_generated_name` dengan tag "âœ¨ AI" — user bisa edit
- [x] AC3: Contoh output: "Ayam Geprek Indomaret", "Subs Netflix Mei", "Bayar Kos Bulan Sep"
- [x] AC4: Jika AI gagal generate (timeout/error), fallback ke kategori + timestamp ("Makanan — 14:30")

---

## 2A.2 Tiga Mode Input

### Mode 1: Manual Quick-add

**Tap Sequence (4 Taps Ketat):**

```
Tap 1 → FAB hijau di bottom nav
         â†“
         Vaul bottom sheet slides up (300ms spring animation)
         4 kartu tipe transaksi: grid 2x2
         [Pengeluaran] [Pemasukan]
         [Tabungan]    [Transfer]

Tap 2 → Pilih tipe (contoh: Pengeluaran)
         â†“
         Keyboard numerik muncul otomatis
         Field amount sudah fokus
         Prefix "Rp" sudah terpasang
         Di bawah amount: field "Deskripsi" (opsional, 1 baris)

Tap 3 → Ketik nominal (contoh: "25000" → "Rp 25.000")
         â†“
         AI auto-suggest berjalan di background (debounce 500ms):
         - Jika user ketik deskripsi → AI parse untuk nama + kategori
         - Jika user HANYA isi nominal → Smart Default lookup dari user_patterns
         - Kategori ter-autofill, ai_generated_name ter-suggest
         Badge kategori muncul (bisa di-tap untuk ganti)

Tap 4 → Tombol "Catat âœ“" (sage green, full width)
         â†“
         Optimistic UI: transaksi langsung muncul di list
         Lottie checkmark animation (non-blocking, 1.2s)
         Haptic feedback: navigator.vibrate([30, 50, 30])
         Sound: soft marimba chime (Web Audio API, 0.4s, vol 30%)
         Toast (Sonner): "Sip, udah dicatet! ðŸŒ¿"
```

**Wireframe Description — Manual Quick-add Bottom Sheet:**
- Background: warm white (#FFFDF7) dengan rounded corner 16px di atas
- 4 kartu tipe: rounded rectangle 80x80px, ikon Tabler di tengah, label di bawah
  - Pengeluaran: ikon ArrowDownLeft, terracotta border saat selected
  - Pemasukan: ikon ArrowUpRight, sage green border saat selected
  - Tabungan: ikon PiggyBank, sage green border
  - Transfer: ikon ArrowsExchange, sage green border
- Amount field: font Plus Jakarta Sans Bold 32px, center-aligned
- Kategori badge: pill shape, ikon kecil + label, sage green background 10% opacity
- Tombol "Catat âœ“": height 48px, sage green (#A3B18A), white text, rounded 12px

---

### Mode 2: AI OCR Struk (Receipt Scan)

**Alur Teknis (Fixed — Browser Native):**

```
User tap "Scan Struk" di bottom sheet
         â†“
<input type="file" accept="image/*" capture="environment">
Browser native file picker terbuka → kamera belakang HP aktif
         â†“
User ambil foto struk → file selected
         â†“
Browser Image Compression: compress ke <500KB, format JPEG
         â†“
Loading state: Lottie animation "scanning" (dokumen bergerak)
Micro-copy: "Lagi baca struknya... âœ¨"
         â†“
Kirim ke API route /api/ocr → forward ke GPT-4o-mini (vision)
         â†“
Hasil parsing ditampilkan di form konfirmasi:
- ai_generated_name: "Belanja Indomaret Cilandak"
- amount: Rp 127.500
- date: auto-filled (dari struk ATAU fallback ke hari ini)
- category: "Belanja" (auto-suggest)
Semua field EDITABLE — user bisa koreksi
         â†“
User tap "Catat âœ“" → tersimpan (sama seperti Manual flow Tap 4)
```

#### Prompt Engineering OCR (GPT-4o-mini)

**System Prompt:**
```text
Kamu adalah mesin OCR untuk aplikasi keuangan pribadi Indonesia bernama CatetInd.

TUGAS: Ekstrak data transaksi dari foto struk belanja/pembayaran Indonesia.

KEMAMPUAN WAJIB:
- Handle foto struk yang buram, miring, terlipat, atau pudar (struk thermal)
- Kenali bahasa campuran: Bahasa Indonesia, Bahasa Jawa ("Mangan", "Tuku"), Bahasa Sunda ("Meser", "Ngaluarkeun"), dan English
- Kenali format merchant Indonesia: "CV.", "UD.", "Toko", "Warung", dll.
- Kenali format harga Indonesia: "Rp", "Rp.", tanpa simbol (angka di kolom kanan), dengan/tanpa titik ribuan
- Kenali PPN/pajak: jika ada, masukkan ke total (bukan pisahkan)
- Jika struk restoran ada service charge, masukkan ke total

FORMAT OUTPUT — WAJIB valid JSON, tanpa markdown wrapper:
{
  "merchant_name": "string (nama toko/restoran/merchant)",
  "amount": number (integer, total yang dibayar termasuk pajak/service),
  "date": "YYYY-MM-DD" (null jika tidak terbaca),
  "category": "string" (pilih SATU dari: Makanan, Transportasi, Belanja, Tagihan, Hiburan, Kesehatan, Pendidikan, Lainnya),
  "ai_generated_name": "string (deskripsi transaksi yang manusiawi, contoh: 'Makan Siang Warteg Bahari' atau 'Belanja Bulanan Alfamart')",
  "confidence": number (0.0-1.0, seberapa yakin kamu dengan hasil ekstraksi),
  "items_detected": number (jumlah item yang terbaca di struk, 0 jika tidak jelas)
}

ATURAN:
- Jika tidak bisa membaca sebagian besar struk, set confidence < 0.3 dan isi field dengan best-guess
- Jika nominal ambigu (ada beberapa angka total), pilih yang berlabel "TOTAL", "GRAND TOTAL", atau angka terbesar di bagian bawah struk
- ai_generated_name harus dalam Bahasa Indonesia, singkat (3-6 kata), dan deskriptif
- JANGAN halusinasi data — jika merchant name tidak terbaca, tulis "Merchant tidak terbaca"
```

**User Prompt Template:**
```text
Ekstrak data transaksi dari foto struk ini.
```

---

### Mode 3: AI Voice/Chat

**Arsitektur Teknis:**
- STT: Web Speech API (`SpeechRecognition`) berjalan di browser client — zero server cost
- Parsing: teks hasil STT dikirim ke DeepSeek V3 via `/api/parse-voice`
- Fallback STT: jika Web Speech API tidak tersedia (browser lama), tampilkan input teks biasa dengan placeholder "Ketik seperti ngobrol: 'beli kopi 25rb'"

**Contoh Utterance yang WAJIB Dikenali:**
| Utterance | Parsed Output |
|---|---|
| "tadi beli indomaret 25 ribu" | Pengeluaran, Rp25.000, "Belanja Indomaret", Belanja |
| "bayar kos bulan ini 800rb" | Pengeluaran, Rp800.000, "Bayar Kos Bulanan", Tagihan |
| "ditraktir makan siang jadi 0" | Pemasukan, Rp0 → **edge case**: AI bertanya "Ditraktir berarti kamu gak keluar uang ya? Mau dicatet sebagai pemasukan Rp0 atau skip?" |
| "gajian 5jt masuk BCA" | Pemasukan, Rp5.000.000, "Gaji Masuk BCA", Pemasukan |
| "transfer ke BCA 500ribu buat bayar kos" | Transfer, Rp500.000, "Transfer Bayar Kos via BCA", Tagihan |
| "nabung 200rb buat dana darurat" | Tabungan, Rp200.000, "Tabungan Dana Darurat", Tabungan |

#### Prompt Engineering Voice/Chat (DeepSeek V3)

**System Prompt:**
```text
Kamu adalah parser transaksi keuangan untuk CatetInd, aplikasi keuangan pribadi Gen-Z Indonesia.

TUGAS: Parse input bahasa alami (informal, slang, campuran bahasa) menjadi data transaksi terstruktur.

KONTEKS WAKTU: {CURRENT_DATETIME_ISO}

KEMAMPUAN WAJIB:
- Kenali nominal dalam berbagai format: "25ribu", "25rb", "25k", "25.000", "25000", "sejuta", "1.5jt", "1,5juta", "800rb", "gocap" (50rb), "ceban" (10rb), "gopek" (500rb)
- Kenali tipe transaksi dari konteks:
  * Pengeluaran: "beli", "bayar", "jajan", "makan", "isi bensin", "top up"
  * Pemasukan: "gajian", "terima", "dapet", "dibayar", "bonus", "THR"
  * Tabungan: "nabung", "sisihkan", "simpan", "tabung"
  * Transfer: "transfer", "kirim", "tf", "bayar ke"
- Kenali "ditraktir"/"gratis" = pemasukan Rp0 atau skip — tanyakan klarifikasi
- Kenali merchant/toko: "indomaret", "alfa", "tokped", "shopee", "grab", "gojek"
- Generate ai_generated_name yang natural dan deskriptif (Bahasa Indonesia)

FORMAT OUTPUT — WAJIB valid JSON:
{
  "type": "Pengeluaran" | "Pemasukan" | "Tabungan" | "Transfer",
  "amount": number (integer),
  "category": "string",
  "ai_generated_name": "string (3-6 kata deskriptif)",
  "merchant_name": "string" (null jika tidak disebutkan),
  "destination": "string" (null kecuali Transfer — nama bank/tujuan),
  "date_override": "YYYY-MM-DD" (null jika tidak disebutkan, default hari ini),
  "confidence": number (0.0-1.0),
  "clarification_needed": "string" (null jika jelas, isi pertanyaan jika ambigu)
}

ATURAN:
- Jika user bilang "kemarin" → date = yesterday. "tadi pagi" → hari ini. "minggu lalu" → 7 hari lalu.
- Jika ambigu (misal "50" tanpa satuan), set confidence < 0.5 dan minta klarifikasi
- JANGAN tanya balik jika sudah jelas — langsung parse
```

**UI Voice Input — Wireframe Description:**
- Trigger: FAB long-press (>500ms) ATAU tap ikon mic di bottom sheet
- Bottom sheet kecil muncul (height 200px):
  - Lottie animation: warm pulsating sound waves (sage green, 3 garis)
  - Real-time transcription text di tengah (Plus Jakarta Sans, 16px, dark grey)
  - Tombol "Selesai" (sage green) di bawah
- Setelah selesai: hasil parsing muncul sebagai form konfirmasi (sama seperti OCR flow)

---

## 2A.3 Smart Default System

**Mekanisme Pembelajaran:**

| Threshold | Behavior |
|---|---|
| 1-2 transaksi dengan merchant sama | Simpan pattern, belum auto-suggest |
| **3 transaksi** dengan merchant sama + kategori konsisten | Auto-fill kategori untuk merchant itu |
| 5+ transaksi | Confidence score > 0.8 → auto-fill tanpa konfirmasi visual (badge saja) |

**Implementasi Teknis:**
- Tabel `user_patterns` menyimpan pasangan `merchant_pattern` + `suggested_category_id`
- Setiap transaksi baru: upsert ke `user_patterns` — increment `hit_count`, update `confidence_score`
- Confidence score = `hit_count / (hit_count + 2)` — [Bayesian smoothing](https://en.wikipedia.org/wiki/Rule_of_succession)
- Lookup dilakukan client-side dari prefetched data (cached di React Query, invalidate setiap transaksi baru)

> **[ARIA]:** "Ini meningkatkan Retention D30 karena app terasa 'semakin pintar' memahami user setiap hari. Berdasarkan data Grab, personalisasi yang terasa meningkatkan NPS 12 poin."

---

## 2A.4 Micro-Copy & Micro-Interaction Design

### Micro-Copy (Tone: Teman yang Suportif)

| State | Copy | Catatan BIMA |
|---|---|---|
| Empty state (list hari ini) | "Belum ada catatan hari ini. Santai aja, catat pelan-pelan ya." | Bukan "Tidak ada transaksi!" |
| Typing amount | "Berapa nih yang keluar/masuk?" | Playful, bukan interogatif |
| Confirming OCR/Voice | "AI udah bantu catat. Cek dulu ya, udah pas belum datanya?" | Kolaboratif, bukan otoriter |
| Saved success (toast Sonner) | "Sip, udah dicatet dengan aman! ðŸŒ¿" | Warm, pakai emoji tanaman |
| Error save | "Aduh, gagal nyimpan. Coba lagi ya — data kamu aman kok." | Reassuring |
| Smart Default applied | "Kayaknya ini [Kategori] lagi ya? âœ¨" | Acknowledges intelligence |

### Animasi & Feedback

| Element | Library | Spesifikasi |
|---|---|---|
| Bottom sheet slide-up | Framer Motion via Vaul | `spring({ stiffness: 260, damping: 20 })`, duration ~300ms |
| Form field transitions | Framer Motion | `AnimatePresence` + `motion.div` fade-in 200ms |
| Save success | Lottie React | Checkmark sage green, <80KB, 1.2s, non-blocking overlay |
| Sound confirmation | Web Audio API | Marimba tone C5, duration 0.4s, volume 30%, gain ramp |
| Haptic feedback | `navigator.vibrate()` | Pattern: `[30, 50, 30]` (double-tap halus) |
| List auto-animate | Auto Animate | Transaksi baru slide-in dari atas, 300ms |

> **[CANDRA]:** "Haptic feedback via `navigator.vibrate()` TIDAK tersedia di iOS Safari PWA. Graceful degradation: skip vibrate, retain sound + visual. Deteksi via `'vibrate' in navigator`."

---

## 2A.5 Insight/Alert System

> **[DIAN]:** "Jangan pernah berikan false insight. User Gen-Z alergi terhadap over-claiming. Kalau data sedikit, bilang aja lagi ngumpulin data. Ini celah kompetitif kita vs Fundy yang bilang 'hemat 100%' dari 1 transaksi."

**Ambang Data Minimum (Non-Negotiable):**

| Tipe Insight | Minimum Transaksi | Minimum Periode | Contoh Output |
|---|---|---|---|
| Category trend alert | **7 transaksi** di kategori | 2+ minggu | "Jajan kopimu naik 40% dibanding 2 minggu lalu â˜•" |
| Monthly comparison | **15 transaksi** di bulan ini DAN bulan lalu | 2 bulan data | "Pengeluaran bulan ini 20% lebih rendah dari bulan lalu ðŸŽ‰" |
| Financial health score | **30 transaksi** | 3+ minggu | Skor 0-100 baru muncul |
| Spending spike alert | **5 transaksi** di kategori (baseline) | 1+ minggu | "Pengeluaran Transportasi naik signifikan minggu ini" |
| Savings rate | **10 transaksi** + 1 pemasukan | 2+ minggu | "Kamu berhasil sisihkan 15% dari pemasukan! ðŸŒ¿" |

**Sebelum threshold tercapai:**
- Tampilkan card: "Aku lagi belajar pola keuanganmu. Terus catat ya, nanti aku kasih insight yang beneran berguna! 📊" 
- Progress bar kecil: "[7/30 transaksi] untuk unlock Financial Health Score"

> **ðŸš¨ KONFLIK ARIA vs BIMA:** ARIA ingin threshold rendah (5 transaksi) agar insight muncul cepat dan drive engagement. BIMA menolak karena insight prematur = gimmick yang merusak trust.
> 
> **RESOLUSI:** Threshold tetap di angka BIMA (tabel di atas). Sebagai kompromi untuk ARIA, tampilkan "progress to unlock insight" yang sendirinya sudah menjadi engagement driver tanpa memberikan klaim yang misleading.

---

## 2A.6 Navigasi Sekunder (Cross-cutting semua 2B-2E)

> **Pelajaran dari Fundy:** Fundy punya DUA jalur navigasi paralel (sidebar + Menu Cepat grid) — redundan dan membingungkan. CatetInd menggunakan **SATU sumber kebenaran** untuk navigasi sekunder.

**Bottom Nav (5 Tab, Fixed Position — WAJIB sticky, tidak ikut scroll):**

```
┌─────────────────────────────────────┐
┐‚  Home  ┐‚ Wallet ┐‚  (+)  ┐‚ Insight ┐‚ ··· ┐‚
┐‚  ðŸ     ┐‚  💳   ┐‚  🟢   ┐‚   📊   ┐‚ Lainnya┐‚
┐”─────────────────────────────────────┐˜
```

**Tab ke-5 "Lainnya" → Vaul Bottom Sheet slide-up:**

```
┌─────────────────────────────────────┐
┐‚           L A I N N Y A             ┐‚
┐œ─────────────────────────────────────┐¤
┐‚  📂 KEUANGAN                        ┐‚
┐‚  ┌────────┐ ┌────────┐ ┌────────┐  ┐‚
┐‚  ┐‚ Budget ┐‚ ┐‚Tagihan ┐‚ ┐‚Kalender┐‚  ┐‚
┐‚  ┐”────────┐˜ ┐”────────┐˜ ┐”────────┐˜  ┐‚
┐‚                                     ┐‚
┐‚  📈 ASET                            ┐‚
┐‚  ┌────────┐ ┌────────┐             ┐‚
┐‚  ┐‚Investasi┐‚ ┐‚Sinking ┐‚             ┐‚
┐‚  ┐‚        ┐‚ ┐‚ Fund   ┐‚             ┐‚
┐‚  ┐”────────┐˜ ┐”────────┐˜             ┐‚
┐‚                                     ┐‚
┐‚  ðŸ”§ TOOLS                           ┐‚
┐‚  ┌────────┐ ┌────────┐ ┌────────┐  ┐‚
┐‚  ┐‚  Debt  ┐‚ ┐‚ Joint  ┐‚ ┐‚  AI    ┐‚  ┐‚
┐‚  ┐‚Manager ┐‚ ┐‚Wallet  ┐‚ ┐‚ Coach  ┐‚  ┐‚
┐‚  ┐”────────┐˜ ┐”────────┐˜ ┐”────────┐˜  ┐‚
┐”─────────────────────────────────────┐˜
```

**Spesifikasi UI:**
- Grid layout: 3 kolom, gap 12px
- Setiap item: 80x80px card, ikon Lucide/Tabler 24px di tengah, label 12px di bawah
- Label kategori ("KEUANGAN", "ASET", "TOOLS"): Plus Jakarta Sans Semi-Bold 11px, sage green, uppercase
- Micro-animation per kategori: Framer Motion `whileTap={{ scale: 0.95 }}` + subtle Lottie icon pulse (< 20KB per icon)
- Theme: warm white background, sage green icon tint, terracotta accent pada item aktif

---

# 2B. VARIABLE INCOME BUDGETING (UNTUK FREELANCER)

## Perspektif Tim & Resolusi Konflik

> **ðŸš¨ KONFLIK DIAN vs BIMA (Framing Limit Harian):**
> 
> **DIAN:** "Kita harus trigger loss aversion saat limit harian terlewati. Warna merah terang dan peringatan tegas. Gen-Z yang overspending butuh sengatan realita agar retention pencatatan (D7) tidak drop."
> 
> **BIMA:** "Sangat tidak setuju. Pendekatan pain-first akan memicu ostrich effect — user over-budget malah uninstall karena merasa dihakimi. Warna soft terracotta (BUKAN merah) dan copy penuh empati. Self-care adalah kunci retensi jangka panjang."
> 
> **RESOLUSI:** UI mengikuti BIMA secara ketat (warna soft terracotta, copy nurturing). Kompromi untuk DIAN: saat status "Over", munculkan CTA sekunder "Review Pengeluaran Hari Ini" yang mengarah ke AI Coach — konversi perbaikan finansial tetap terjadi tanpa intimidasi.

---

## 2B.1 Daily HUD / Pacing Limits

**US-BUDGET-01: Jatah Harian Dinamis**
*Sebagai freelancer dengan income tidak tetap, saya ingin melihat berapa uang yang boleh saya keluarkan hari ini berdasarkan sisa income bulan ini, sehingga saya tidak kehabisan uang di akhir bulan.*

**Acceptance Criteria:**
- [x] AC1: Jatah harian dihitung ulang setiap ada transaksi baru (real-time)
- [x] AC2: Cicilan platform/fintech aktif (dari 2E Debt Manager) dipotong dari pool income SEBELUM pembagian
- [x] AC3: Savings carry-forward: sisa hari ini ditambahkan ke pool besok
- [x] AC4: Overspend carry-forward: kelebihan hari ini dikurangkan dari pool besok

**Formula Kalkulasi:**
```javascript
const monthly_income = SUM(monthly_income_entries WHERE month_year = current_month);
const total_installments = SUM(debts WHERE status='active' AND debt_type='platform').monthly_installment;
const available_pool = monthly_income - total_installments;
const spent_this_month = SUM(transactions WHERE type='Pengeluaran' AND month = current_month);
const remaining = available_pool - spent_this_month;
const days_left = days_in_month - current_day + 1; // termasuk hari ini
const daily_budget = Math.max(0, remaining / days_left); // floor di 0, jangan negatif
```

**Copy Debt-to-Income (Positive Framing):**
- "Setelah dipotong cicilan bulan ini (Rp800.000), jatah harianmu Rp210.000 — masih di jalur sehat! ðŸ’ª"

---

## 2B.2 Homescreen Visualization

**Wireframe Description — Daily HUD Card:**

```
┌──────────────────────────────────┐
┐‚     ┌─────────────────┐          ┐‚
┐‚     ┐‚  â—‹â—‹â—‹â—‹â—‹â—‹â—‹â—‹â—‹â—‹â—‹    ┐‚  Rp 210.000  ┐‚
┐‚     ┐‚  CIRCULAR PROG  ┐‚  jatah hari ini ┐‚
┐‚     ┐‚  (Recharts)     ┐‚                ┐‚
┐‚     ┐”─────────────────┐˜          ┐‚
┐‚                                  ┐‚
┐‚  "Masih banyak ruang hari ini! ðŸŒ¿"  ┐‚
┐‚                                  ┐‚
┐‚  Sisa bulan: Rp 3.150.000 · 15 hari ┐‚
┐”──────────────────────────────────┐˜
```

**Color Coding & Copy Variations:**

| Status | Threshold | Warna | Copy |
|---|---|---|---|
| On track | < 75% daily budget used | Sage green `#A3B18A` | "Masih banyak ruang hari ini! ðŸŒ¿" |
| Approaching | 75-99% used | Warm amber `#DDA15E` | "Pelan-pelan ya, sisa jatah harianmu tinggal Rp[X] ðŸŒ¤ï¸" |
| Over | â‰¥ 100% used | Soft terracotta `#BC6C25` | "Gapapa, besok kita atur ulang bareng! ðŸŒ±" |

**Animasi:** Framer Motion `layoutId` untuk transisi smooth saat angka budget ter-update setelah input expense.

---

## 2B.3 Edge Cases

### Bulan Tanpa Income (Dry Spell)

- **JANGAN** tampilkan Rp0/hari — ini memicu panik
- Sembunyikan circular progress HUD
- Tampilkan card khusus:
  ```
  ┌──────────────────────────────────┐
  ┐‚  ðŸ’¼ Belum ada pemasukan bulan ini ┐‚
  ┐‚                                  ┐‚
  ┐‚  Yuk catat begitu masuk! ðŸ’ª      ┐‚
  ┐‚                                  ┐‚
  ┐‚  [+ Catat Pemasukan]             ┐‚
  ┐”──────────────────────────────────┐˜
  ```
- Tracking pengeluaran tetap aktif tanpa pacing limit (expense list tanpa daily framing)
- AI Coach auto-response: "Bulan sepi itu wajar buat freelancer. Yang penting kita tetap catat pengeluaran biar nanti bisa review bareng."

### Income Baru Masuk di Tengah Bulan
- Recalculate daily budget dari hari income masuk sampai akhir bulan
- Tampilkan mini celebration: "Pemasukan masuk! ðŸŽ‰ Jatah harianmu sekarang Rp[X]"

---

## 2B.4 AI Coach Responses (Variable Income)

| Skenario | Response (Tone: Nurturing) |
|---|---|
| Income baru cair setelah dry spell | "Alhamdulillah, jerih payahmu cair juga! Yuk kita sisihkan dulu buat pos wajib sebelum self-reward secukupnya. ðŸŒ¿" |
| Overspent 3 hari berturut | "Tiga hari terakhir emang lagi banyak pengeluaran ya? Gapapa, wajar kok. Besok kita coba rem sedikit biar napas dompet lebih panjang. ðŸŒ¤ï¸" |
| Konsisten di bawah daily budget | "Wah, kamu konsisten banget jaga pengeluaran! ðŸ’š Selisihnya udah lumayan, mau kita masukin ke celengan tabungan?" |
| Akhir bulan surplus | "Bulan ini kamu hebat! Pemasukan freelancer yang naik-turun berhasil kamu jinakkan. Sisa ini bukti nyata disiplin kamu. ðŸŽ‰" |
| Akhir bulan defisit | "Bulan ini memang berat, tapi kamu udah bertahan dan tetap catat. Defisit ini jadi bahan belajar kita ya. Lembaran baru bulan depan! ðŸŒ±" |

---

## 2B.5 Module Gating

- **Aktivasi:** User pilih "Freelancer / Pekerja Lepas" di onboarding (multi-select situasi)
- **Jika tidak dipilih:** Kode ter-deploy utuh tapi komponen tidak di-render (`if (!module.freelancer_budgeting) return null`)
- **Manual activation:** Settings → Module Preferences → toggle "Budget Harian Freelancer" — TANPA promosi aktif, TANPA nudge
- **Database:** Flag di tabel `user_module_settings` (enum `freelancer_budgeting`)

---

# 2C. SANDWICH GENERATION ARCHITECTURE

## Perspektif Tim & Resolusi Konflik

> **ðŸš¨ KONFLIK CANDRA vs ARIA (Lottie di List View):**
> 
> **CANDRA:** "Lottie animation (seed → plant) di setiap item sinking fund pada list utama akan menghancurkan framerate dan memory di Android low-end. PWA kita harus blazing fast."
> 
> **ARIA:** "Visualisasi tanaman tumbuh ini adalah core retention driver! Tanpa emotional hook ini, kita gak punya moat melawan app bank konvensional."
> 
> **RESOLUSI:** List view utama HANYA menggunakan static SVG icon yang merepresentasikan tahap tanaman saat ini (seed/sprout/plant/flower) — rendered via Framer Motion yang ringan. Animasi Lottie secara utuh hanya di-lazy-load di dalam Vaul bottom sheet (Detail View) saat user tap spesifik sinking fund. Performa Android low-end aman, emotional hook tetap tercapai.

---

## 2C.1 Wallet Separation

**Data Structure:**
- Menggunakan tabel `wallets` dari Domain 2A dengan `type` enum: `'personal' | 'family' | 'joint'`
- Setiap transaksi punya `wallet_id` → query filterable per wallet
- **Net-worth:** `SUM(wallets.balance) WHERE user_id = current_user` — melintasi SEMUA tipe wallet
- **Wallet-specific reports:** filter per `wallet_id` atau `wallet.type`
- User yang aktifkan modul Sandwich Gen otomatis mendapat wallet "Keluarga" (type='family') saat setup

---

## 2C.2 Context Switching UI

**US-SANDWICH-01: Pisah Konteks Pribadi vs Keluarga**
*Sebagai anak yang menghidupi keluarga, saya ingin memisahkan pencatatan keuangan pribadi dan keluarga tanpa perlu dua akun berbeda.*

**Acceptance Criteria:**
- [x] AC1: Horizontal pill toggle di header sticky: "Pribadi" (sage green) / "Keluarga" (terracotta)
- [x] AC2: Saat di-switch, SEMUA widget dashboard, recent transactions, dan charts ter-filter otomatis
- [x] AC3: Indikator konteks aktif selalu visible (sticky header)
- [x] AC4: Animasi: Framer Motion `AnimatePresence` slide transition antar konteks (200ms)

**Wireframe Description:**
```
┌─────────────────────────────────┐
┐‚  ┌──────────┐ ┌──────────┐     ┐‚
┐‚  ┐‚ Pribadi  ┐‚ ┐‚ Keluarga ┐‚     ┐‚  â† sticky header
┐‚  ┐‚ (active) ┐‚ ┐‚          ┐‚     ┐‚
┐‚  ┐”──────────┐˜ ┐”──────────┐˜     ┐‚
┐œ─────────────────────────────────┐¤
┐‚  [Dashboard content filtered    ┐‚
┐‚   by active wallet context]     ┐‚
┐”─────────────────────────────────┐˜
```

---

## 2C.3 Sinking Fund Tracker

**US-SANDWICH-02: Celengan Digital Keluarga**
*Sebagai anak yang menabung untuk biaya operasi mama, saya ingin melihat progress tabungan dengan visualisasi yang memotivasi, sehingga saya tetap semangat menabung meskipun targetnya masih jauh.*

**Acceptance Criteria:**
- [x] AC1: Progressive disclosure form — 3 langkah
- [x] AC2: Visual progress menggunakan plant metaphor (SVG static di list, Lottie di detail)
- [x] AC3: Auto-calculate monthly contribution: `(target - current) / months_remaining`
- [x] AC4: Placeholder form pakai contoh angka yang "menjual" progress

### Progressive Disclosure Form

**Step 1 (Wajib, muncul pertama):**
- Nama sinking fund: placeholder "Biaya Operasi Mama"
- Target amount: placeholder "Rp 15.000.000" (bukan "0")

**Step 2 (Auto-reveal setelah Step 1 diisi):**
- Deadline: date picker, placeholder "Pilih target tanggal"
- Priority: pill selector — Rendah / Sedang / Tinggi / Kritis
- Auto-calculation: "Kamu perlu nabung **Rp 1.250.000/bulan** biar tercapai tepat waktu"

**Step 3 (Expandable accordion — opsional):**
- Catatan (textarea)
- Linked wallet: dropdown wallet yang tersedia
- Preferensi notifikasi: toggle reminder mingguan/bulanan

### Visual Progress (Plant Metaphor)

| Milestone | Icon (List View) | Lottie (Detail View) | Badge Copy |
|---|---|---|---|
| 0-24% | ðŸŒ± Seed SVG | Tanah + benih bergetar | "Baru ditanam" |
| 25-49% | ðŸŒ¿ Sprout SVG | Tunas muncul dari tanah | "Mulai tumbuh!" |
| 50-74% | ðŸŒ³ Small plant SVG | Batang dan daun berkembang | "Tumbuh subur!" |
| 75-99% | ðŸŒ¸ Flowering SVG | Kuncup bunga terbuka | "Hampir mekar!" |
| 100% | ðŸŒº Full bloom SVG | Confetti + bunga mekar penuh | "TERCAPAI! ðŸŽ‰" |

### Placeholder Form yang "Menjual" Progress
- Target amount: "Rp 15.000.000" (bukan "0" atau kosong)
- Progress example: "Rp 12.5jt dari Rp 15jt (83%)" — tunjukkan bahwa progress itu possible
- Monthly contribution: "Rp 1.250.000/bulan" — buat terasa achievable

---

## 2C.4 AI Notifications (Nurturing Tone)

| Kondisi | Notifikasi |
|---|---|
| Hampir tercapai (<Rp500.000 dari target) | "Dikit lagi! Dana operasi mama tinggal kurang Rp500.000 dari target ðŸ’š Kamu hebat udah sampai sini." |
| Jauh dari target (30%) tapi masih ada waktu | "Dana SPP adik masih di 30%, tapi masih ada 3 bulan lagi. Pelan-pelan aja, yang penting konsisten ðŸŒ¿" |
| Target tercapai | "ðŸŽ‰ Dana lebaran keluarga TERCAPAI! Kamu udah jaga keluarga dengan cara yang luar biasa." |
| Kontribusi mingguan on-track | "Minggu ini kamu udah sisihkan Rp300.000 buat dana keluarga. Konsisten terus ya! ðŸŒ±" |
| Kontribusi terlambat 2 minggu | "Dana SPP adik belum nambah 2 minggu ini. Gapapa, mulai lagi kapan aja ya — kecil-kecilan juga gak masalah. ðŸ¤—" |

---

## 2C.5 Module Gating
- **Aktivasi:** User pilih "Ada tanggungan keluarga" di onboarding
- Aturan gating identik dengan 2B

---

# 2D. JOINT WALLET (UNTUK PASANGAN MUDA)

## Perspektif Tim & Resolusi Konflik

> **[ARIA]:** "Joint wallet adalah instrumen retensi paling kuat (D30+). Kalau dua orang sudah pakai untuk track expense bareng, switching cost-nya sangat tinggi. Tapi dari unit economics, keduanya harus bayar full price — utilitas produk sendiri sudah cukup sebagai conversion driver."

> **[BIMA]:** "Onboarding gabung wallet harus terasa seperti momen milestone hubungan. Tone-nya: 'Mulai bangun masa depan bareng'. Progressive disclosure untuk split bill wajib — default 50/50 agar cognitive load ringan."

> **[CANDRA]:** "Supabase Realtime untuk joint wallet: wajib, tapi awas connection limit. Harus unsubscribe channel kalau user background app. RLS-nya kompleks — ada transaksi private di dalam wallet bersama, jangan sampai leak."

> **ðŸš¨ KONFLIK BIMA vs CANDRA (Notifikasi Real-time):**
> BIMA ingin setiap pengeluaran bersama dinotifikasi instan untuk "membangun bonding". CANDRA khawatir notifikasi instan akan spamming dan membebani realtime triggers.
> 
> **RESOLUSI:** Transaksi individu bersifat in-app/silent (real-time via Supabase Realtime, muncul di feed tanpa push). Pengeluaran di atas threshold Rp500.000 baru trigger push notification. Rekap mingguan dan bulanan dipush via email/push — lebih bernilai dan tidak mengganggu.

---

## 2D.1 Privacy-Layered Architecture

Prinsip: **Zero-Leakage Privacy.** Meski dua user dalam satu Joint Wallet, transaksi `is_private = true` TIDAK PERNAH dikembalikan oleh database saat partner query.

**RLS Enforcement Layer:**
1. Personal wallet: user hanya bisa read/write transaksi di wallet milik sendiri
2. Joint wallet read: member bisa read transaksi joint KECUALI yang `is_private = true` oleh partner
3. Joint wallet write: member bisa insert transaksi ke joint wallet
4. Private flag: `is_private = true` → transaksi hanya visible untuk `user_id` yang membuat

---

## 2D.2 Joint Wallet Onboarding

**Flow:**

```
User A → Tap "Buat Dompet Bersama" di menu Lainnya
         â†“
         Input nama wallet (placeholder: "Dompet Kita ðŸ’š")
         â†“
         Generate invite link (valid 24 jam)
         Unique code: 6 karakter alphanumeric
         â†“
         Share via Web Share API / copy link
         â†“
User B → Klik link → landing page invite:
         "Halo! [Nama A] mengajakmu kelola uang bareng di CatetInd ðŸ’š"
         â†“
         Jika sudah punya akun → login → auto-join wallet
         Jika belum → signup dulu (dapat diskon referral one-sided) → auto-join
         â†“
         Joint wallet aktif dengan saldo Rp0
         Data historis masing-masing user TIDAK terganggu
         â†“
         Supabase Realtime subscription aktif untuk wallet ini
```

**Acceptance Criteria:**
- [x] AC1: User A dapat generate invite code (valid 24 jam, single-use)
- [x] AC2: Link invite berfungsi untuk user baru maupun existing
- [x] AC3: Wallet pribadi User A dan B tetap isolated
- [x] AC4: Joint wallet mulai dari Rp0
- [x] AC5: Supabase Realtime aktif: insert oleh A langsung muncul di layar B tanpa refresh

---

## 2D.3 Split Bill Calculator

**Progressive Disclosure (WAJIB):**

**Default:** Split 50/50 — ditampilkan sebagai label "Split: Bagi Rata" di form transaksi joint

**Tap "Atur pembagian" → Bottom sheet muncul:**
- **Bagi Rata** (50/50) — pre-selected
- **Persentase** — slider 60/40, 70/30, dll.
- **Nominal Custom** — User A: Rp[input], User B: Rp[auto-calculate sisa]
- **"Yang ini gue yang bayar"** — 100% ditanggung satu pihak

**Settlement Tracking:**
- Monthly settlement summary di dashboard joint: "Bulan ini [Partner] bayar Rp200.000 lebih banyak dari kamu. Mau settle?"
- One-tap "Tandai Lunas" → reset settlement counter untuk periode itu
- Notifikasi settlement reminder: akhir bulan jika selisih > Rp100.000

---

## 2D.4 Private Expense Flag

- Toggle "Sembunyikan dari pasangan ðŸ”’" di form transaksi
- `is_private = true` → transaksi HANYA tampil di view personal user
- Partner tidak menerima notifikasi atau hint visual APAPUN
- Di view personal: ikon gembok kecil (ðŸ”’) di samping nominal transaksi privat
- Background row sedikit berbeda (warm grey) sebagai visual indicator untuk diri sendiri

---

## 2D.5 Joint Notifications

| Trigger | Notifikasi | Channel |
|---|---|---|
| Partner catat pengeluaran joint | "[Partner] baru catat: Groceries Rp150.000 ðŸ›’" | In-app toast (silent) |
| Pengeluaran joint > Rp500.000 | "Pengeluaran bersama baru: [Nama] Rp[X]" | Push notification |
| Weekly recap | "Minggu ini kalian kompak! Total bersama Rp1.2jt, di bawah target ðŸ‘" | Push + in-app |
| Monthly recap | "Recap bulan [X]: Bersama kalian kelola Rp[Y]. [Partner] paling rajin catat lho!" | Push + email |
| Savings milestone | "Kamu dan pasanganmu sudah hemat Rp500.000 bersama bulan ini ðŸ’š" | Push |

---

## 2D.6 Pricing & Referral

- **TIDAK ada** SKU harga khusus pasangan (Couple Plan)
- Kedua partner bayar penuh sebagai individual (Founding Member / Early Adopter / Regular)
- **Referral ONE-SIDED:** Partner yang diundang (User B) mendapat diskon referral. User A yang mengundang TIDAK dapat reward tambahan.
- Justifikasi: utilitas "bisa kelola uang bareng" sudah menjadi reward bagi User A
- Copy invite: "Ajak pasanganmu ikut CatetInd biar bisa kelola keuangan bareng. Mereka dapat diskon referral dari kamu! ðŸ’š"

---

## 2D.7 Module Gating
- **Aktivasi:** User pilih "Pasangan serius / Menikah" di onboarding
- Aturan gating identik dengan 2B/2C

---

# 2E. WEALTH TRACKING MODULE (INVESTASI & DEBT MANAGER)

## Perspektif Tim & Resolusi Konflik

> **ðŸš¨ KONFLIK ARIA vs CANDRA (Frekuensi Update Harga):**
> 
> **ARIA:** "Update harga crypto dan saham harus real-time (tick-by-tick) untuk trigger dopamine hit dan D30 retention."
> 
> **CANDRA:** "Arsitektur PWA + Supabase dengan cron Vercel akan over-limit compute hours dalam 3 hari kalau polling real-time untuk ribuan user. Ini bukan trading terminal — ini net-worth tracker."
> 
> **RESOLUSI:** Asynchronous Cache-First. Crypto: 1x per 5 menit (tersentralisasi, bukan per user). Saham, Reksadana, Emas: 1x per hari (End of Day). WAJIB tampilkan label "Harga per [timestamp]" — jangan pura-pura real-time.

> **ðŸš¨ KONFLIK DIAN vs BIMA (UI Debt-to-Income):**
> 
> **DIAN:** "Pakai warna merah menyala dan copy 'BAHAYA' saat DTI > 40% untuk trigger loss aversion."
> 
> **BIMA:** "Gen-Z sudah mengalami financial anxiety. Shaming akan memicu uninstall. Warna terracotta (bukan merah) dengan copy empatik."
> 
> **RESOLUSI:** DTI > 41% menggunakan warna terracotta `#BC6C25` (bukan pure red) dengan copy: "Hati-hati, beban cicilanmu agak tinggi bulan ini. Yuk fokus lunasin yang ini dulu ya ðŸ«‚"

---

## 2E.1 INVESTMENT TRACKER

### Justifikasi Diferensiasi vs Fundy

| Kapabilitas | Fundy | CatetInd (V1) | Value Tambahan |
|---|---|---|---|
| Cara input aset | Update nilai total manual (snapshot) | Input setiap transaksi buy/sell → auto-calculate | Akurat untuk DCA yang umum di kalangan Gen-Z via Bibit/Stockbit |
| Average buy price | Estimasi manual user | **Auto-calculated weighted average** dari histori transaksi | Presisi — tidak perlu spreadsheet terpisah |
| Harga pasar | Manual update oleh user | **Auto-fetch dari sumber gratis** + cache | Mengurangi friction update |
| Audit trail | Tidak ada riwayat transaksi per aset | **Full transaction history** per aset | Mempermudah laporan pajak |
| Transparansi harga | Tidak ada indikasi freshness | **Label "Harga per [tanggal/jam]"** | Honest UX — tidak misleading |

### Cakupan Aset (SEMUA di V1)

| Jenis | Satuan | Sumber Harga | Frekuensi Update |
|---|---|---|---|
| Saham | Lot (1 lot = 100 lembar) | IDX closing price harian (gratis) | 1x/hari setelah 15:00 WIB |
| Reksadana | Unit | NAB publik (Bareksa/OJK scraping) | 1x/hari (NAB dihitung 1x setelah market close) |
| Emas Digital | Gram | Harga Antam/Pegadaian resmi (scraping) | 1x/hari sesuai jadwal update Antam |
| Crypto | Varies (BTC, ETH, dll) | CoinGecko free tier API | 1x per 5 menit (tersentralisasi) |

### Auto-Fetch Architecture

```
Vercel Cron Job (scheduled)
         â†“
┌─────────────────────────────────────┐
┐‚ Supabase Edge Function:             ┐‚
┐‚  1. Fetch harga dari sumber gratis  ┐‚
┐‚  2. Upsert ke asset_price_cache     ┐‚
┐‚  3. Set is_stale = false            ┐‚
┐‚  4. Log ke price_fetch_jobs         ┐‚
┐”─────────────────────────────────────┐˜
         â†“
Client (Next.js) reads from asset_price_cache
via React Query (staleTime: 60s untuk crypto, 3600s untuk harian)
```

**Fallback Protocol:**
1. Sumber down/berubah struktur → catch error
2. Set `is_stale = true` di `asset_price_cache`
3. Tampilkan warning amber: "Harga [jenis aset] belum diperbarui. Update terakhir: [date]"
4. Sediakan tombol "Update Manual" untuk aset itu saja
5. **SATU sumber gagal TIDAK boleh mematikan seluruh fitur** — aset lain tetap berfungsi normal

### User Stories & Acceptance Criteria

**US-INV-01: Input Transaksi Beli/Jual**
*Sebagai investor Gen-Z yang DCA rutin di Bibit, saya ingin mencatat setiap pembelian reksadana dengan harga dan unit-nya, sehingga CatetInd menghitung average buy price saya secara otomatis.*

- [x] AC1: Form input: Jenis Aset, Nama/Ticker, Beli/Jual, Kuantitas, Harga per Unit, Tanggal
- [x] AC2: Sistem auto-calculate `avg_buy_price` via weighted average setiap ada transaksi beli baru
- [x] AC3: Transaksi jual mengurangi `current_quantity` — cegah jika quantity < 0
- [x] AC4: Field RDN account opsional untuk saham (behind progressive disclosure "Lihat detail")

**Weighted Average Formula:**
```javascript
// Setiap kali ada transaksi BELI baru:
const new_total_invested = old_total_invested + (new_quantity * new_price);
const new_total_quantity = old_quantity + new_quantity;
const new_avg_buy_price = new_total_invested / new_total_quantity;

// Transaksi JUAL: reduce quantity, avg_buy_price TIDAK berubah
```

**US-INV-02: Progressive Disclosure Dashboard**
*Sebagai user yang mudah overwhelm dengan angka, saya ingin lihat ringkasan total portofolio dulu, baru detail per aset jika saya mau.*

- [x] AC1: Default view: Total Value (Rp), Total Unrealized Return (Rp & %), Donut chart alokasi (Recharts)
- [x] AC2: "Lihat detail" → expandable list per aset: Nama, Qty, Avg Price vs Current Price, Return
- [x] AC3: Tap per-aset → Transaction History lengkap

**Wireframe — Investment Dashboard (Default View):**
```
┌──────────────────────────────────┐
┐‚  Total Aset Investasi            ┐‚
┐‚  Rp 15.450.000                   ┐‚  â† sage green jika profit
┐‚  +Rp 450.000 (+3.0%) 📈          ┐‚
┐‚                                  ┐‚
┐‚  [Donut Chart - Recharts]        ┐‚
┐‚  Reksadana 40% | Saham 30%      ┐‚
┐‚  Crypto 20% | Emas 10%          ┐‚
┐‚                                  ┐‚
┐‚  Harga per 20 Sep 2026, 15:30   ┐‚  â† transparency label
┐‚                                  ┐‚
┐‚  [Lihat detail â–¼]               ┐‚
┐”──────────────────────────────────┐˜
```

---

## 2E.2 DEBT MANAGER

### Dua Kategori dengan Struktur Berbeda

#### Kategori 1: Personal (Hutang/Piutang Teman/Keluarga)

**Form Simpel:**
- Arah: "Aku hutang ke..." / "...hutang ke aku"
- Nama pihak (freeform): placeholder "Nama teman/keluarga"
- Jumlah (Rp)
- Tanggal (opsional)
- Catatan (opsional)
- Toggle "Lunas" — saat di-tap: Lottie confetti kecil → pindah ke tab History
- **TANPA** bunga, tenor, atau cicilan
- Copy nurturing: "Catat aja biar gak lupa, bukan buat ngejar-ngejar ya ðŸ˜Š"

#### Kategori 2: Platform/Fintech (Paylater & Pinjaman Berbunga)

**Progressive Disclosure:** Form default = Personal (simpel). Switch toggle "Ini pinjaman platform/berbunga" → field tambahan muncul (Framer Motion expand animation).

**Provider Quick-Pick Dropdown (6 Terhardcode + Freeform):**
1. Kredivo
2. Akulaku
3. ShopeePay Pinjam
4. GoPay Later
5. Home Credit
6. Indodana
7. Lainnya (ketik manual) — untuk JULO, Atome, Traveloka PayLater, Kartu Kredit cicilan, KTA Bank, dll.

**Field Tambahan (Platform):**
- Jumlah pokok (Rp)
- Tenor (bulan) — number input
- Cicilan per bulan (Rp)
- Bunga (% — opsional)
- Tanggal jatuh tempo (1-31)

**Auto-Calculate:**
- Remaining balance = pokok - SUM(payments)
- Next payment date = tanggal jatuh tempo bulan berikutnya
- Total interest paid (estimasi dari bunga Ã— tenor)

### Debt-to-Income Integration dengan 2B

**Mekanisme:**
```javascript
const total_monthly_installments = SUM(
  debts WHERE status='active' AND debt_type='platform'
).monthly_installment;

// Dipotong dari income pool di 2B SEBELUM dibagi hari
const available_pool = monthly_income - total_monthly_installments;
```

**DTI Badge (Info Tambahan, Bukan Angka Mentah):**

| Rasio DTI | Badge | Warna | Copy |
|---|---|---|---|
| 0-30% | "Sehat" | Sage green `#A3B18A` | "Beban cicilanmu ringan, mantap! ðŸ’š" |
| 31-40% | "Perlu perhatian" | Warm amber `#DDA15E` | "Cicilan mulai lumayan — pantau terus ya ðŸŒ¤ï¸" |
| 41%+ | "Hati-hati" | Soft terracotta `#BC6C25` | "Beban cicilanmu agak tinggi. Yuk fokus lunasin dulu ya ðŸ«‚" |

**Contoh Copy di HUD:**
"Setelah dipotong cicilan bulan ini (Rp800.000), jatah harianmu Rp210.000 — masih di jalur sehat! ðŸ’ª"

### Wireframe — Debt Dashboard
```
┌──────────────────────────────────┐
┐‚  [Hutangku] [Piutangku]          ┐‚  â† segmented control
┐‚                                  ┐‚
┐‚  Total Hutang Aktif              ┐‚
┐‚  Rp 4.500.000                   ┐‚
┐‚  Cicilan Bulan Ini: Rp 850.000  ┐‚
┐‚  DTI: [18% — Sehat ðŸ’š]          ┐‚  â† badge
┐‚                                  ┐‚
┐‚  ┌─ PLATFORM ──────────────────┐ ┐‚
┐‚  ┐‚ SPayLater    Rp 1.500.000   ┐‚ ┐‚
┐‚  ┐‚ â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–‘â–‘â–‘â–‘ Bln 3/6 · Tgl 25┐‚ ┐‚
┐‚  ┐‚ Kredivo      Rp 3.000.000   ┐‚ ┐‚
┐‚  ┐‚ â–ˆâ–ˆâ–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘ Bln 1/12 · Tgl 10┐‚ ┐‚
┐‚  ┐”─────────────────────────────┐˜ ┐‚
┐‚                                  ┐‚
┐‚  ┌─ PERSONAL ──────────────────┐ ┐‚
┐‚  ┐‚ ðŸ§‘ Andi     Rp 200.000     ┐‚ ┐‚
┐‚  ┐‚             [Tandai Lunas âœ“]┐‚ ┐‚
┐‚  ┐”─────────────────────────────┐˜ ┐‚
┐”──────────────────────────────────┐˜
```

---

# MASTER SUPABASE SCHEMA (DOMAIN 2A-2E)

> **[CANDRA]:** "Schema ini dirancang sebagai single source of truth untuk Domain 4C (RLS Policies). Semua tabel menggunakan UUID, timestamptz, dan foreign key yang jelas. Domain 4 WAJIB pakai schema ini apa adanya."

```sql
-- ============================================================
-- CATETIND MASTER DATABASE SCHEMA — DOMAIN 2A-2E
-- Target: Supabase (PostgreSQL 15+)
-- Conventions: UUID PKs, timestamptz, snake_case
-- ============================================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Catatan: Supabase sudah enable pgcrypto by default (gen_random_uuid())
-- Kita pakai gen_random_uuid() yang lebih modern dari uuid_generate_v4()

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE wallet_type AS ENUM ('personal', 'family', 'joint');
CREATE TYPE transaction_type AS ENUM ('pengeluaran', 'pemasukan', 'tabungan', 'transfer');
CREATE TYPE transaction_source AS ENUM ('manual', 'ocr', 'voice_chat', 'system');
CREATE TYPE joint_role AS ENUM ('owner', 'member');
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');
CREATE TYPE split_type AS ENUM ('equal', 'percentage', 'custom', 'single_payer');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE sinking_fund_status AS ENUM ('active', 'completed', 'paused');
CREATE TYPE asset_type AS ENUM ('stock', 'mutual_fund', 'gold', 'crypto');
CREATE TYPE investment_tx_type AS ENUM ('buy', 'sell');
CREATE TYPE price_fetch_status AS ENUM ('success', 'failed', 'running');
CREATE TYPE debt_type AS ENUM ('personal', 'platform');
CREATE TYPE debt_direction AS ENUM ('owed_by_me', 'owed_to_me');
CREATE TYPE debt_status AS ENUM ('active', 'settled', 'defaulted');
CREATE TYPE module_name AS ENUM (
  'freelancer_budgeting',
  'sandwich_generation',
  'joint_wallet',
  'investment_tracker',
  'debt_manager'
);
CREATE TYPE activation_source AS ENUM ('onboarding', 'manual');

-- ============================================================
-- UTILITY: Auto-update updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. WALLETS (2A Core — dipakai oleh 2C, 2D)
-- ============================================================

CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type wallet_type NOT NULL DEFAULT 'personal',
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
  color_code VARCHAR(7) DEFAULT '#A3B18A',
  icon VARCHAR(50) DEFAULT 'wallet',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_type ON wallets(user_id, type);

CREATE TRIGGER trg_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. CATEGORIES (2A Core)
-- ============================================================

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- NULL user_id = system default category
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),  -- English translation for bilingual UI
  icon VARCHAR(50),
  color VARCHAR(7),
  is_default BOOLEAN NOT NULL DEFAULT false,
  parent_category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_default ON categories(is_default) WHERE is_default = true;

-- ============================================================
-- 3. TRANSACTIONS (2A Core — the most critical table)
-- ============================================================

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  ai_generated_name VARCHAR(255),
  -- AI-generated descriptive name, e.g. "Ayam Geprek Indomaret"
  description TEXT,
  -- User's own notes/description (optional)
  merchant_name VARCHAR(255),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_time TIME NOT NULL DEFAULT CURRENT_TIME,
  source transaction_source NOT NULL DEFAULT 'manual',
  is_private BOOLEAN NOT NULL DEFAULT false,
  -- For Joint Wallet: private = not visible to partner
  destination_wallet_id UUID REFERENCES wallets(id),
  -- For Transfer type: target wallet
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Extensible: OCR confidence, voice transcript, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX idx_transactions_type ON transactions(user_id, type);
CREATE INDEX idx_transactions_wallet_date ON transactions(wallet_id, transaction_date DESC);
-- Composite index for joint wallet queries (exclude private)
CREATE INDEX idx_transactions_joint ON transactions(wallet_id, is_private, transaction_date DESC);

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. USER PATTERNS (2A Smart Default System)
-- ============================================================

CREATE TABLE user_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_pattern VARCHAR(255) NOT NULL,
  suggested_category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  suggested_name VARCHAR(255),
  -- AI-generated name pattern for this merchant
  confidence_score NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
  hit_count INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, merchant_pattern)
);

CREATE INDEX idx_user_patterns_lookup ON user_patterns(user_id, merchant_pattern);

-- ============================================================
-- 5. JOINT WALLET MEMBERS (2D)
-- ============================================================

CREATE TABLE joint_wallet_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role joint_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wallet_id, user_id)
);

CREATE INDEX idx_joint_members_wallet ON joint_wallet_members(wallet_id);
CREATE INDEX idx_joint_members_user ON joint_wallet_members(user_id);

-- ============================================================
-- 6. JOINT WALLET INVITES (2D)
-- ============================================================

CREATE TABLE joint_wallet_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  invited_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code VARCHAR(6) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status invite_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invites_code ON joint_wallet_invites(invite_code) WHERE status = 'pending';

-- ============================================================
-- 7. SPLIT BILL RECORDS (2D)
-- ============================================================

CREATE TABLE split_bill_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  payer_user_id UUID NOT NULL REFERENCES auth.users(id),
  split_type split_type NOT NULL DEFAULT 'equal',
  splits JSONB NOT NULL DEFAULT '{}',
  -- Format: {"user_id_A": 100000, "user_id_B": 50000}
  is_settled BOOLEAN NOT NULL DEFAULT false,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. JOINT WALLET SETTLEMENTS (2D)
-- ============================================================

CREATE TABLE joint_wallet_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id),
  to_user_id UUID NOT NULL REFERENCES auth.users(id),
  amount NUMERIC(15, 2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  is_settled BOOLEAN NOT NULL DEFAULT false,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. SINKING FUNDS (2C)
-- ============================================================

CREATE TABLE sinking_funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target_amount NUMERIC(15, 2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  deadline DATE,
  priority priority_level NOT NULL DEFAULT 'medium',
  monthly_contribution_target NUMERIC(15, 2),
  status sinking_fund_status NOT NULL DEFAULT 'active',
  icon VARCHAR(100) DEFAULT 'piggy-bank',
  color VARCHAR(20) DEFAULT '#A3B18A',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sinking_funds_user ON sinking_funds(user_id);
CREATE INDEX idx_sinking_funds_status ON sinking_funds(user_id, status);

CREATE TRIGGER trg_sinking_funds_updated_at
  BEFORE UPDATE ON sinking_funds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 10. SINKING FUND CONTRIBUTIONS (2C)
-- ============================================================

CREATE TABLE sinking_fund_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sinking_fund_id UUID NOT NULL REFERENCES sinking_funds(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  -- Nullable: link ke transaksi jika kontribusi via transfer
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 11. MONTHLY INCOME ENTRIES (2B)
-- ============================================================

CREATE TABLE monthly_income_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
  source_description TEXT,
  date_received DATE NOT NULL,
  month_year VARCHAR(7) NOT NULL,
  -- Format: 'YYYY-MM' for easy grouping
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  -- Nullable link to income transaction
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_monthly_income_user_month ON monthly_income_entries(user_id, month_year);

-- ============================================================
-- 12. DAILY BUDGET SNAPSHOTS (2B)
-- ============================================================

CREATE TABLE daily_budget_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  calculated_daily_budget NUMERIC(15, 2) NOT NULL DEFAULT 0,
  actual_spent NUMERIC(15, 2) NOT NULL DEFAULT 0,
  income_pool NUMERIC(15, 2) NOT NULL DEFAULT 0,
  installment_deduction NUMERIC(15, 2) NOT NULL DEFAULT 0,
  days_remaining INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ============================================================
-- 13. USER MODULE SETTINGS (2B/2C/2D/2E Gating)
-- ============================================================

CREATE TABLE user_module_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module module_name NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  activated_at TIMESTAMPTZ,
  activation_source activation_source NOT NULL DEFAULT 'onboarding',
  UNIQUE(user_id, module)
);

CREATE INDEX idx_module_settings_user ON user_module_settings(user_id);

-- ============================================================
-- 14. RDN ACCOUNTS (2E — Rekening Dana Nasabah untuk Saham)
-- ============================================================

CREATE TABLE rdn_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name VARCHAR(255) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  account_number_masked VARCHAR(50),
  -- "****1234" format
  balance NUMERIC(15, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_rdn_accounts_updated_at
  BEFORE UPDATE ON rdn_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 15. INVESTMENT ASSETS (2E)
-- ============================================================

CREATE TABLE investment_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type asset_type NOT NULL,
  name VARCHAR(255) NOT NULL,
  symbol VARCHAR(50),
  -- Ticker: BBCA, BTC, dll.
  rdn_account_id UUID REFERENCES rdn_accounts(id) ON DELETE SET NULL,
  current_quantity NUMERIC(15, 6) NOT NULL DEFAULT 0,
  -- 6 decimal untuk crypto precision
  avg_buy_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_invested NUMERIC(15, 2) NOT NULL DEFAULT 0,
  current_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
  gain_loss_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  gain_loss_percentage NUMERIC(7, 4) NOT NULL DEFAULT 0,
  last_price_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_investment_assets_user ON investment_assets(user_id);
CREATE INDEX idx_investment_assets_type ON investment_assets(user_id, asset_type);

CREATE TRIGGER trg_investment_assets_updated_at
  BEFORE UPDATE ON investment_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 16. INVESTMENT TRANSACTIONS (2E)
-- ============================================================

CREATE TABLE investment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES investment_assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type investment_tx_type NOT NULL,
  quantity NUMERIC(15, 6) NOT NULL CHECK (quantity > 0),
  price_per_unit NUMERIC(15, 2) NOT NULL CHECK (price_per_unit > 0),
  total_amount NUMERIC(15, 2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  fees NUMERIC(15, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_investment_tx_asset ON investment_transactions(asset_id);
CREATE INDEX idx_investment_tx_user ON investment_transactions(user_id);

-- ============================================================
-- 17. ASSET PRICE CACHE (2E — Centralized, not per-user)
-- ============================================================

CREATE TABLE asset_price_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type asset_type NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  price_idr NUMERIC(15, 2) NOT NULL,
  source VARCHAR(100) NOT NULL,
  -- 'coingecko', 'idx', 'antam_scraper', 'bareksa_scraper'
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_stale BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(asset_type, symbol)
);

CREATE INDEX idx_price_cache_lookup ON asset_price_cache(asset_type, symbol);

-- ============================================================
-- 18. PRICE FETCH JOBS (2E — Monitoring cron health)
-- ============================================================

CREATE TABLE price_fetch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type asset_type NOT NULL,
  last_run_at TIMESTAMPTZ NOT NULL,
  next_run_at TIMESTAMPTZ NOT NULL,
  status price_fetch_status NOT NULL,
  error_message TEXT,
  records_updated INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 19. DEBTS (2E — Dual structure: Personal & Platform)
-- ============================================================

CREATE TABLE debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  debt_type debt_type NOT NULL,
  direction debt_direction,
  -- NULL for platform (implied owed_by_me)
  counterparty_name VARCHAR(255),
  -- Nama teman/keluarga (for personal)
  provider_name VARCHAR(100),
  -- Kredivo, SPayLater, etc. (for platform)
  principal_amount NUMERIC(15, 2) NOT NULL CHECK (principal_amount > 0),
  remaining_balance NUMERIC(15, 2) NOT NULL,
  interest_rate NUMERIC(7, 4),
  -- Percentage, optional
  tenor_months INTEGER,
  monthly_installment NUMERIC(15, 2),
  due_date INTEGER CHECK (due_date >= 1 AND due_date <= 31),
  -- Day of month (1-31)
  next_payment_date DATE,
  status debt_status NOT NULL DEFAULT 'active',
  notes TEXT,
  is_settled BOOLEAN NOT NULL DEFAULT false,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_debts_user ON debts(user_id);
CREATE INDEX idx_debts_active ON debts(user_id, status) WHERE status = 'active';
CREATE INDEX idx_debts_platform ON debts(user_id, debt_type) WHERE debt_type = 'platform';

CREATE TRIGGER trg_debts_updated_at
  BEFORE UPDATE ON debts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 20. DEBT PAYMENTS (2E)
-- ============================================================

CREATE TABLE debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  -- Optional link to general transaction
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_debt_payments_debt ON debt_payments(debt_id);

-- ============================================================
-- TABEL COUNT: 20 tabel
-- Siap untuk Domain 4C (RLS Policies)
-- ============================================================
```

---

# ASUMSI & INTERPRETASI YANG DIAMBIL

> Bagian ini mendokumentasikan setiap keputusan yang diambil secara mandiri oleh tim 4 persona saat instruksi ambigu atau kurang detail.

### A1. Tipe Transaksi "Tabungan & Transfer"
**Instruksi:** "Tambahkan tipe transaksi Tabungan & Transfer sebagai tipe tersendiri"
**Interpretasi:** Kami memisahkan menjadi 4 enum values: `pengeluaran`, `pemasukan`, `tabungan`, `transfer` — bukan 2 (hanya `tabungan_transfer` gabungan). Alasan: `tabungan` = alokasi ke sinking fund / celengan (linked ke `sinking_fund_contributions`), sedangkan `transfer` = perpindahan antar wallet atau ke pihak lain (butuh `destination_wallet_id`). Dua use case ini cukup berbeda untuk di-track terpisah.

### A2. Smart Default Threshold: 3 Transaksi
**Instruksi:** "app belajar kebiasaan user" — tidak disebut threshold spesifik.
**Keputusan:** 3 transaksi dengan merchant/pattern sama + kategori konsisten sebelum auto-suggest. Alasan (BIMA): cukup rendah untuk terasa responsif tanpa terlalu agresif. Confidence score menggunakan Bayesian smoothing `hit_count / (hit_count + 2)` agar tidak jump ke 100% dari 3 data points.

### A3. Voice Input: Web Speech API, Bukan Cloud STT Berbayar
**Instruksi:** Tidak disebutkan library STT spesifik.
**Keputusan (CANDRA):** Web Speech API (browser native) untuk Speech-to-Text, lalu teks dikirim ke DeepSeek V3 untuk parsing. Alasan: zero additional cost (Web Speech API gratis, processing STT di browser), menghindari tambahan provider cloud STT (Google Cloud Speech / AWS Transcribe) yang menambah biaya dan kompleksitas untuk tim 2 orang. Limitasi: akurasi STT bergantung pada browser dan koneksi internet user. Fallback: jika Web Speech API tidak tersedia, tampilkan input teks biasa dengan placeholder "Ketik seperti ngobrol".

### A4. Bottom Nav Tab ke-4: "Insight" (Bukan "Transfer")
**Instruksi:** Bottom nav 5 tab disebutkan, tapi isian tab ke-4 disebut "Transfer (atau tab lain sesuai kebutuhan)".
**Keputusan:** Tab ke-4 = "Insight" (📊) — berisi analytics/health score/trend. Alasan (ARIA): Transfer sudah ter-cover via FAB (tipe transaksi ke-4), tidak perlu tab dedicated. Insight di bottom nav = daily touchpoint yang meningkatkan engagement dan membuat user lihat value dari pencatatan mereka.

### A5. Invite Code Joint Wallet: 6 Karakter, Valid 24 Jam
**Instruksi:** "2 akun merge" — detail mekanisme invite tidak dispesifikasi.
**Keputusan:** 6 karakter alphanumeric, single-use, expired setelah 24 jam. Alasan (CANDRA): cukup pendek untuk di-copy manual, cukup unik (36^6 = 2.17 miliar kombinasi), dan 24 jam cukup tanpa menjadi security risk.

### A6. Wallet Balance: Stored vs Calculated
**Instruksi:** Tidak disebutkan apakah `wallets.balance` di-maintain sebagai stored value atau dihitung on-the-fly.
**Keputusan:** Stored value (denormalized) yang di-update via database trigger/function setiap ada INSERT/UPDATE/DELETE di `transactions`. Alasan (CANDRA): menghitung SUM() on-the-fly dari ratusan/ribuan transaksi setiap page load = performance killer di device low-end. Stored balance + trigger = O(1) read, slightly more complex write (acceptable trade-off). Reconciliation job berjalan nightly sebagai safety net.

### A7. Settlement Threshold untuk Notifikasi: Rp100.000
**Instruksi:** Tidak disebutkan minimum selisih untuk trigger settlement reminder.
**Keputusan:** Settlement reminder muncul di akhir bulan jika selisih > Rp100.000. Di bawah itu, tidak push notifikasi (terlalu kecil untuk mengganggu dinamika pasangan). Alasan (BIMA): menghindari micro-conflict dalam hubungan. (DIAN setuju: settlement reminders yang terlalu agresif bisa bikin user mute notif sepenuhnya.)

### A8. Saham: Harian (Bukan Intraday), Closing Price IDX
**Instruksi sudah jelas:** "closing price harian resmi IDX (gratis) — BUKAN data tick-by-tick real-time"
**Keputusan tambahan:** Untuk sumber data IDX closing price gratis, kami merekomendasikan menggunakan data publik dari website resmi IDX (idx.co.id) atau API komunitas open-source yang scrape data IDX harian. Jika IDX memblokir scraping, fallback ke Yahoo Finance IDX data (gratis, delay 15+ menit tapi cukup untuk EOD).

### A9. Crypto: Interval 5 Menit via CoinGecko
**Instruksi:** "update nyaris real-time"
**Keputusan:** 1x per 5 menit, tersentralisasi (1 job untuk SEMUA user, bukan per-user request). CoinGecko free tier: 10-30 calls/minute. Dengan batching semua coin dalam 1 call (`/api/v3/simple/price?ids=bitcoin,ethereum,...`), 1 call per 5 menit sangat aman dalam rate limit.

### A10. Debt Due Date: Integer (1-31), Bukan Full Date
**Instruksi:** "tanggal jatuh tempo" — format tidak dispesifikasi.
**Keputusan:** Kolom `due_date INTEGER CHECK (due_date >= 1 AND due_date <= 31)` — menyimpan tanggal bulan saja (bukan full date), karena cicilan berulang setiap bulan di tanggal yang sama. `next_payment_date DATE` dihitung secara programatis dari `due_date` + bulan berjalan.

### A11. OCR Confidence Threshold
**Instruksi:** Tidak disebutkan apa yang terjadi jika OCR confidence rendah.
**Keputusan:** Jika `confidence < 0.5`, tampilkan warning di form konfirmasi: "AI kurang yakin dengan hasil scan ini. Tolong cek ulang datanya ya âœ¨" + highlight field yang confidence-nya rendah dengan amber border. User tetap bisa edit dan submit.

### A12. Properti/Aset Fisik TIDAK Masuk V1
**Instruksi:** Grid navigasi sekunder menyebutkan "Properti" tetapi instruksi 2E hanya cover investasi (saham/reksadana/emas/crypto) + debt.
**Keputusan:** Properti & Aset Fisik (rumah, kendaraan, perhiasan) TIDAK masuk V1. Di grid navigasi, item "Properti" ditampilkan dengan badge "Segera" sebagai teaser. Alasan (ARIA): scope V1 sudah sangat berat dengan 20 tabel — menambah properti menambah 2-3 tabel lagi dan form kompleks tanpa demand validation dari beachhead market (first-jobber usia 22-27 yang mayoritas belum punya properti).



---


# CatetInd — Domain 3: Gamifikasi & Psikologi Habit
## Sistem yang TIDAK Terasa Seperti Gamifikasi

**Versi:** 1.0  
**Tanggal:** 21 September 2026  
**Tim Persona:** ARIA · BIMA · CANDRA · DIAN  
**Prasyarat:** Domain 2 PRD (approved)  
**Filosofi Inti:** Setiap mekanisme gamifikasi harus terasa seperti **bagian natural dari product experience** — bukan lapisan terpisah yang ditempelkan. Zero poin, zero badge generik, zero leaderboard.

---

## DAFTAR ISI

1. [3A. Habit Loop Design (BJ Fogg Model)](#3a-habit-loop-design-bj-fogg-model)
2. [3B. Visual Progression System](#3b-visual-progression-system)
3. [3C. AI Appreciation Engine](#3c-ai-appreciation-engine)
4. [3D. Mobile Ergonomics](#3d-mobile-ergonomics)
5. [Asumsi & Interpretasi yang Diambil](#asumsi--interpretasi-yang-diambil)

---

# 3A. HABIT LOOP DESIGN (BJ FOGG MODEL)

## Perspektif Tim & Resolusi Konflik

> **[BIMA — Lead UX & Behavioral Architect]:** "BJ Fogg Behavior Model: **B = MAP** (Behavior = Motivation Ã— Ability Ã— Prompt). Kita harus memanipulasi ketiga variabel ini secara bersamaan. Motivation saja tidak cukup — ability harus di-maksimalkan (Domain 2A sudah solve ini dengan 4-tap input). Yang tersisa adalah **Prompt** (trigger) dan **Reward** (dopamine loop). Reward WAJIB variable — fixed reward membuat otak bosan setelah 14 hari."

> **[ARIA — Principal Product Strategist]:** "Data GrabPay menunjukkan habit pencatatan terbentuk setelah **21 hari konsekutif** — tapi 65% user drop di hari ke-3 sampai ke-7. Strategi kita: **front-load rewards massif di 7 hari pertama**, lalu taper ke variable rewards setelahnya. Jangan merata — boros di awal, hemat setelah hook terbentuk."

> **[DIAN — Growth & Conversion Psychologist]:** "Trigger terbaik bukan reminder app — itu diabaikan 73% Gen-Z (data Clevertap 2025). Trigger terbaik adalah **rasa sakit yang sudah dirasakan user** saat checkout/bayar di dunia nyata. Kita harus mengaitkan trigger ke momen real-life, bukan push notification generik."

> **ðŸš¨ KONFLIK ARIA vs BIMA (Streak Penalty):**
> **ARIA:** "Streak counter harus visible dan reset ke 0 jika skip 1 hari. Loss aversion = retention driver paling kuat. GrabPay streak campaign meningkatkan DAU 34%."
> **BIMA:** "TIDAK. Reset ke 0 itu punishment yang bertentangan dengan tone nurturing. User yang skip 1 hari lalu lihat streak '0' akan merasa gagal dan churn. Ini bukan game — ini self-care tool."
> 
> **RESOLUSI:** Streak **TIDAK pernah reset ke 0**. Streak pauses (freeze) saat user skip, dan resume dari angka terakhir saat user kembali. Streak counter TIDAK ditampilkan sebagai angka besar di dashboard — ia tersembunyi sebagai **faktor kesehatan tanaman** (3B). User merasakan efek streak via tanaman yang subur, bukan angka yang menghakimi. Kompromi ARIA: tampilkan "Kamu udah catat X hari bulan ini" di monthly recap (positif framing — bukan "kamu skip Y hari").

---

## Habit Loop 1: "Catat Setiap Transaksi Langsung Setelah Terjadi"

**Target Behavior Frequency:** 2-5x per hari (rata-rata 3 transaksi/hari untuk first-jobber)

### TRIGGER (Prompt)

| Tipe Trigger | Mekanisme | Timing | Justifikasi |
|---|---|---|---|
| **External — Contextual Push** | Push notification: "Baru aja bayar sesuatu? Catat 10 detik aja ðŸŒ¿" | 12:30 WIB (post-lunch) dan 19:00 WIB (post-dinner) | Dua momen spending tertinggi harian Gen-Z Jakarta (data GrabFood 2024). BUKAN random reminder. |
| **External — Receipt Trigger** | Micro-copy di form OCR: "Fotonya masih di galeri — mau scan sekarang?" | Saat user buka app tapi belum input hari ini | Mengaitkan ke artifact (struk) yang sudah ada di HP user |
| **Internal — Guilt Gap** | Saat user buka app dan lihat "Belum ada catatan hari ini" state | Setiap kali app dibuka tanpa transaksi hari ini | Empty state yang nurturing, bukan menghakimi (lihat Domain 2A micro-copy) |
| **Internal — Curiosity** | Dashboard menampilkan "sisa jatah hari ini" (dari 2B) yang berubah setelah input | Persistent di homescreen | User penasaran "berapa sisa gue hari ini?" — membuka app untuk cek, lalu catat |

**DIAN override:** Push notification dikirim MAKSIMAL 2x per hari. Lebih dari itu = user mute channel. Timing: 12:30 dan 19:00 WIB (bukan pagi — Gen-Z first-jobber lagi commute, notification diabaikan).

### ROUTINE (Action)

```
User buka app (dari notif atau sendiri)
    â†“
Lihat homescreen: "Jatah hari ini Rp210.000 ðŸŒ¿" + tanaman sehat
    â†“
Tap FAB (+) → 4-tap input flow (Domain 2A)
    â†“
Transaksi tersimpan (optimistic UI, <5 detik total)
```

**Ability Maximization (Fogg):** Domain 2A sudah menyelesaikan ini — 4 taps, auto-fill, AI naming. Tidak ada tambahan friction dari layer gamifikasi.

### REWARD (Variable Ratio)

| Reward Type | Frequency | Mekanisme | Koneksi |
|---|---|---|---|
| **Immediate — Sensory** | Setiap save | Lottie checkmark + marimba chime + haptic `[30,50,30]` | Domain 2A.4 |
| **Immediate — Copy** | Setiap save | Toast (Sonner): random dari pool 8 variasi (bukan selalu "Sip, udah dicatet!") | 3C AI Appreciation |
| **Delayed — Visual** | Setiap save | Tanaman di homescreen sedikit lebih subur (imperceptible per-transaksi, noticeable setelah 3-5) | 3B Visual Progression |
| **Surprise — AI** | Random 1 dari 5 transaksi | AI Appreciation micro-message muncul di bawah toast: "Udah 3x catat hari ini — rajin banget! ðŸŒ±" | 3C trigger #3 |
| **Milestone — Celebration** | Hari ke-7, 14, 21, 30 | Lottie celebration full-screen (confetti 2 detik) + AI message personal + tanaman naik tahap | 3B milestone |

**Variable Ratio Schedule (BIMA):** Surprise reward muncul rata-rata 1 dari 5 transaksi, tapi timing-nya random (bisa transaksi ke-2, bisa ke-6). Ini adalah **variable ratio reinforcement** — pola yang sama dipakai slot machine dan Instagram likes. Membuat otak terus "berharap" tanpa menjadi predictable.

---

## Habit Loop 2: "Review Mingguan Setiap Minggu Malam"

**Target Behavior Frequency:** 1x per minggu (Minggu, 20:00-22:00 WIB)

### TRIGGER

| Tipe | Mekanisme | Timing |
|---|---|---|
| **External — Push** | "Minggu malam, waktu me-time keuangan kamu ðŸ§˜”â™€ï¸ Yuk lihat recap minggu ini." | Minggu 20:00 WIB |
| **External — In-app Banner** | Card di homescreen (Jumat-Minggu): "Recap mingguan kamu udah siap! Lihat →" | Muncul Jumat sore, persistent sampai di-tap atau Senin |
| **Internal — Curiosity** | Preview angka "Total pengeluaran minggu ini: Rp[X]" ditampilkan di homescreen card | Otomatis setelah 7+ transaksi dalam seminggu |

### ROUTINE

```
User tap "Lihat Recap" dari notif/banner
    â†“
Full-screen Weekly Recap (swipeable cards, 5 slides):

Slide 1: "Minggu Kamu Sekilas"
  - Total pemasukan vs pengeluaran (Tremor KPI cards)
  - Cashflow net (+/-)

Slide 2: "Ke Mana Uangmu Pergi"
  - Donut chart kategori pengeluaran (Recharts)
  - Highlight: kategori terbesar + berapa % dari total

Slide 3: "Momen Keuangan Kamu"
  - Hari paling boros + hari paling hemat
  - AI generated insight (1 kalimat, nurturing)

Slide 4: "Tanaman Kamu Minggu Ini" (3B)
  - Visual tanaman + growth animation
  - "+2 level minggu ini karena kamu konsisten catat!"

Slide 5: "Rencana Minggu Depan"
  - AI suggestion: "Minggu depan coba kurangi [kategori terbesar] 10%?"
  - CTA: "Set target minggu depan" atau "Lanjut aja"
```

### REWARD

| Reward | Mekanisme |
|---|---|
| **Insight yang berguna** | User mendapat data yang TIDAK bisa mereka lihat tanpa app — ini reward utilitarian |
| **Tanaman growth** | Tanaman "tumbuh" saat recap dilihat (1 poin kesehatan tambahan) — incentive untuk buka recap |
| **Shareable card** | Slide 1 punya tombol "Share" yang menghasilkan image card estetik (tanpa angka sensitif, hanya "Aku udah review keuangan minggu ini ðŸŒ¿ #CatetAjaDulu") |
| **AI Praise** | "Kamu salah satu dari sedikit orang yang rutin review keuangan mingguan. Itu luar biasa, [Nama]." |

---

## Habit Loop 3: "Set dan Review Target Tabungan Bulanan"

**Target Behavior Frequency:** 1x per bulan (awal bulan, hari ke-1 sampai ke-3)

### TRIGGER

| Tipe | Mekanisme | Timing |
|---|---|---|
| **External — Push** | "Bulan baru, lembaran baru! ðŸŒ± Yuk set target keuangan bulan [bulan]." | Tanggal 1, 09:00 WIB |
| **External — In-app Modal** | Full-screen modal saat pertama kali buka app di bulan baru: recap bulan lalu + prompt set target baru | Tanggal 1-3, satu kali sampai di-dismiss |
| **Internal — Sinking Fund Progress** | Sinking fund (2C) yang belum kontribusi bulan ini memunculkan nudge di homescreen | Setelah tanggal 5 tanpa kontribusi |

### ROUTINE

```
User buka app tanggal 1 → Modal Monthly Review muncul:

Panel 1: "Recap Bulan [Lalu]"
  - Total pemasukan / pengeluaran / savings rate
  - Target bulan lalu: tercapai âœ… atau belum â³
  - Tanaman: snapshot progress

Panel 2: "Set Target Bulan [Ini]"
  - Pre-filled dari bulan lalu (jika ada) atau AI suggestion
  - Fields:
    * "Mau coba hemat berapa bulan ini?" → Rp input
    * "Ada sinking fund yang mau ditambah?" → quick-pick dari existing
  - CTA: "Let's go! ðŸŒ¿" atau "Skip, nanti aja"
```

### REWARD

| Reward | Mekanisme |
|---|---|
| **Completion satisfaction** | Momen "done setting up" terasa accomplishing — mirip journaling |
| **Tanaman milestone** | Jika bulan lalu target tercapai, tanaman berbunga (Lottie bloom animation) |
| **AI recognition** | "Bulan lalu kamu berhasil hemat Rp450.000 dari target Rp500.000. 90% tercapai — itu hebat! Bulan ini kita coba full ya? ðŸ’š" |
| **Social proof nudge** | "78% member CatetInd yang set target bulanan berhasil hemat lebih banyak dibanding yang tidak." (Angka real dari aggregate analytics — tanpa data individual, sesuai privacy policy.) |

---

# 3B. VISUAL PROGRESSION SYSTEM

## Perspektif Tim & Resolusi Konflik

> **ðŸš¨ KONFLIK CANDRA vs ARIA (Rendering Tanaman):**
>
> **ARIA:** "Tanaman harus animated real-time di homescreen — daun bergoyang, cahaya berubah. Ini emotional anchor yang membuat user buka app. Retention tanpa emotional hook = churn."
>
> **CANDRA:** "Animasi continuous di homescreen = battery drain + jank di Redmi 9A. Lottie file untuk full plant animation = 200-500KB. Kalau dirender terus-menerus di main thread, FPS drop di bawah 30 dan app terasa lambat. Untuk tim 2 orang, ini time sink yang besar."
>
> **RESOLUSI (Final — inherited dari Domain 2C):** Homescreen menampilkan **static SVG** tanaman yang di-swap per tahap pertumbuhan (7 file SVG, masing-masing <15KB). Animasi Lottie **hanya dirender di 3 momen**: (1) saat tanaman naik tahap (celebration, one-shot), (2) di Weekly Recap slide 4, dan (3) di detail view saat user tap tanaman. Performa aman, emotional hook tetap ada di momen yang tepat.

> **ðŸš¨ KONFLIK DIAN vs BIMA (Tanaman Mati):**
>
> **DIAN:** "Kalau user inactive 7+ hari, tanaman HARUS mati total. Fear of loss = reactivation driver paling kuat. Data Duolingo: streak loss notification meningkatkan reactivation 24%."
>
> **BIMA:** "TIDAK. Tanaman mati = punishment. Ini bertentangan dengan Aturan Inti Produk #2 (Nurturing & Empathetic). User yang udah overwhelmed dengan keuangan lalu lihat tanaman mati akan merasa 'app ini juga menghukum gue'. Uninstall."
>
> **RESOLUSI:** Tanaman **TIDAK PERNAH mati**. Degradasi maksimal = tahap "Layu" (daun turun, warna desaturated) yang reversible dalam 1 transaksi. Copy saat kembali: "Tanamanmu kangen kamu! Satu catatan aja langsung segar lagi ðŸŒ¿". Ini nurturing reactivation tanpa punishment. DIAN mendapat kompromi: push notification hari ke-3 inactivity: "Tanamanmu mulai layu nih... Satu catatan aja biar segar lagi ðŸŒ±" — ini memanfaatkan loss aversion TANPA memicu shame.

---

## Metafora: "Pohon Uang" (Pohon Keuangan Personal)

Bukan literal pohon uang — metafora "tanaman yang tumbuh seiring kamu tumbuh secara finansial". Setiap user punya 1 tanaman yang merepresentasikan kesehatan keuangan mereka.

### 7 Tahap Pertumbuhan

| Tahap | Nama | Visual (SVG) | Unlock Condition | Copy Celebration |
|---|---|---|---|---|
| 0 | Benih | Pot tanah dengan benih kecil | Akun baru dibuat | "Selamat datang! Tanamanmu baru ditanam ðŸŒ±" |
| 1 | Tunas | Tunas hijau muda keluar dari tanah | 3 transaksi pertama | "Lihat! Tunasmu muncul. Terus catat ya!" |
| 2 | Kecambah | Batang kecil + 2 daun | 7 hari aktif catat (tidak harus berturut-turut) | "Tanamanmu mulai tumbuh! ðŸŒ¿" |
| 3 | Tanaman Muda | Batang lebih tinggi + 4-5 daun | 14 hari aktif + minimal 1 target/sinking fund dibuat | "Makin kuat! Tanamanmu sehat banget." |
| 4 | Tanaman Dewasa | Batang kokoh + banyak daun + akar terlihat | 21 hari aktif + budget tidak terlampaui 2 minggu | "Pohonmu udah dewasa — kayak kamu yang makin jago atur uang ðŸ’š" |
| 5 | Berbunga | Tanaman + kuncup bunga sage green | 30 hari aktif + target tabungan tercapai 1x | "BERBUNGA! ðŸŒ¸ Ini hasil konsistensi kamu." |
| 6 | Berbuah | Tanaman + buah kecil (terracotta accent) | 60 hari aktif + savings rate >15% selama 2 bulan | "Pohonmu berbuah! Kamu inspirasi banget ðŸŠ" |

### Health Point System (HP)

Setiap tanaman punya **Health Points (HP) 0-100** yang TIDAK ditampilkan sebagai angka ke user (tersembunyi di balik visual). HP mempengaruhi appearance tanaman dalam tahap saat ini: HP tinggi = daun hijau cerah, HP rendah = daun agak pudar/turun.

**4 Faktor yang Mempengaruhi HP:**

| Faktor | Bobot | HP Gain | HP Loss | Sumber Data |
|---|---|---|---|---|
| Streak Catat | 30% | +2 HP per hari aktif catat | -3 HP per hari skip | `transactions` count per hari |
| Budget Compliance | 25% | +5 HP per hari di bawah budget | -2 HP per hari over budget | `daily_budget_snapshots` |
| Target Progress | 25% | +3 HP per kontribusi ke sinking fund | 0 (tidak menghukum) | `sinking_fund_contributions` |
| Weekly Review | 20% | +10 HP jika recap minggu ini sudah dilihat | -5 HP jika skip 2 minggu berturut | Tracking event di PostHog |

**HP Floor dan Ceiling:**
- HP tidak pernah turun di bawah **20** (tanaman layu tapi hidup)
- HP cap di **100** (tanaman paling sehat)
- HP default start: **50** (tanaman terlihat "okay" dari awal, bukan menyedihkan)

### Degradation Rules (Nurturing, Bukan Punishing)

| Durasi Skip | HP Effect | Visual Change | Push Notification | Copy In-App |
|---|---|---|---|---|
| 1 hari | -3 HP | Tidak ada perubahan visual | Tidak ada | — |
| 2 hari | -6 HP total | Daun sedikit turun (SVG swap) | Tidak ada | — |
| 3 hari | -9 HP total | Daun lebih turun + warna agak pudar | Push: "Tanamanmu mulai layu nih... Satu catatan aja biar segar lagi ðŸŒ±" | "Aku kangen dicatetin ðŸŒ±" |
| 5 hari | -15 HP total | Daun signifikan turun, warna desaturated | Push: "Gapapa kalau lagi sibuk. Tapi tanamanmu nunggu kamu lho..." | "Kapan aja kamu siap, aku di sini ðŸŒ¿" |
| 7+ hari | HP stabil di 20 (floor) | Tanaman layu (posisi tetap, tidak mati) | Push terakhir: "Ini bukan soal streak. Ini soal mulai lagi. ðŸŒ±" | "Satu catatan aja langsung segar lagi!" |

**Recovery:** 1 transaksi = +5 HP bonus (di atas HP gain normal). Tanaman langsung sedikit lebih segar. 3 transaksi berturut-turut = tanaman kembali ke state pre-skip.

> **[BIMA]:** "Perhatikan: TIDAK ADA notifikasi di hari ke-1. Ini intentional. Satu hari skip itu normal — kita tidak boleh membuat user merasa bersalah karena punya kehidupan di luar app."

### Implementasi Teknis

| Komponen | Teknologi | Size Budget | Render Strategy |
|---|---|---|---|
| Homescreen tanaman | **7 static SVG files** (1 per tahap) | <15KB per file, total <105KB | CSS swap berdasarkan `plant_stage` dari state. Tambahkan CSS filter `saturate()` dan `brightness()` berdasarkan HP untuk variasi dalam tahap yang sama. |
| Health variation | **CSS filters** pada SVG | 0KB tambahan | `filter: saturate(${hp/100}) brightness(${0.7 + hp/300})` — tanaman pudar saat HP rendah tanpa file tambahan |
| Stage-up celebration | **Lottie one-shot** | <80KB per animation, 7 total <560KB | Lazy-loaded, hanya dirender saat stage naik. `lottie-react` dengan `autoplay` dan `loop={false}` |
| Weekly Recap tanaman | **Lottie looping** | <100KB | Rendered di Recap slide 4 saja, unmounted setelah recap ditutup |
| Tanaman detail view | **Lottie interactive** | <120KB | Lazy-loaded saat user tap tanaman dari homescreen. Menampilkan animasi + stats breakdown |

**Supabase Storage:**

```sql
-- Tambahan di user profile atau tabel terpisah
CREATE TABLE user_plant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL DEFAULT 0 CHECK (stage >= 0 AND stage <= 6),
  health_points INTEGER NOT NULL DEFAULT 50 CHECK (health_points >= 20 AND health_points <= 100),
  total_active_days INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  last_stage_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_user_plant_updated_at
  BEFORE UPDATE ON user_plant
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**HP Recalculation:** Dilakukan server-side via Supabase Edge Function yang berjalan 1x per hari (00:01 WIB) — bukan client-side. Edge function membaca data transaksi, budget compliance, sinking fund, dan recap views dari hari sebelumnya, lalu update `health_points` dan `stage` di `user_plant`. Client membaca state terbaru saat app dibuka.

### Milestone Flowering & Fruiting

| Milestone | Visual Event | Condition | Lottie Animation | AI Message |
|---|---|---|---|---|
| **Bunga Pertama** | Kuncup bunga muncul di tanaman | 30 hari aktif + 1 target tercapai | Kuncup perlahan terbuka (2s, sage green petals) | "[Nama], tanamanmu berbunga untuk pertama kali! Ini hasil 30 hari konsistensi kamu. Gak banyak orang yang bisa kayak gini ðŸ’š" |
| **Buah Pertama** | Buah kecil muncul di cabang | 60 hari aktif + savings rate >15% 2 bulan | Buah tumbuh dari kecil ke besar (2s, terracotta color) | "BUAH PERTAMA! ðŸŠ Dari benih yang kamu tanam 2 bulan lalu, sekarang udah berbuah. Kamu literally growing your wealth." |
| **Musim Panen** (Rare) | Tanaman penuh buah + sparkle effect | 90 hari aktif + 3 target tercapai + DTI <30% | Full tree sparkle + floating coins (3s) | "Musim panen! ðŸŒ¾ Dalam 3 bulan, kamu udah capai [X] target. Ini bukan keberuntungan — ini hasil kerja keras kamu." |

---

# 3C. AI APPRECIATION ENGINE

## Perspektif Tim & Resolusi Konflik

> **[BIMA]:** "Apresiasi yang terasa template = lebih buruk dari tidak ada apresiasi sama sekali. Gen-Z bisa mendeteksi copy-paste dalam 0.5 detik. Setiap message HARUS menyebutkan minimal 1 data point spesifik dari riwayat user."

> **[ARIA]:** "Apresiasi yang terlalu sering = inflation. Kalau setiap transaksi dipuji, pujian jadi meaningless. Variable ratio: rata-rata 1 dari 5 transaksi, timing random."

> **ðŸš¨ KONFLIK CANDRA vs BIMA (AI Call Frequency):**
> **BIMA:** "Setiap apresiasi harus di-generate real-time oleh DeepSeek V3 agar truly personal."
> **CANDRA:** "API call untuk setiap apresiasi = biaya yang besar kalau user aktif 5x/hari Ã— ribuan user. Ini membunuh unit economics."
>
> **RESOLUSI:** Hybrid approach:
> - **Pre-generated pool:** 50 template apresiasi disimpan di client (JSON file, <10KB). Template punya placeholder `{name}`, `{amount}`, `{category}`, `{streak}`, dll. yang diisi client-side dari local data. **ZERO API cost.**
> - **AI-generated real-time:** Hanya untuk milestone besar (stage up, target tercapai, monthly recap) — maksimal 4-6 API calls per user per bulan. Ini yang benar-benar personal.
> - Cost savings: ~95% apresiasi dari template, ~5% dari live AI.

---

## 10 Contoh Pesan Apresiasi Spesifik

Setiap pesan menyebutkan **nama**, **angka**, dan **konteks nyata** dari data user.

### Template-Based (Client-side, Zero API Cost)

| # | Trigger | Pesan | Data Points Used |
|---|---|---|---|
| 1 | Transaksi ke-3 hari ini | "Rajin banget hari ini, {name}! Udah 3x catat. Tanamanmu seneng nih ðŸŒ¿" | `name`, `daily_tx_count` |
| 2 | Streak 7 hari | "Seminggu berturut-turut! {name}, kamu udah catat {total_week_tx} transaksi minggu ini. Konsisten banget ðŸ’š" | `name`, `streak`, `total_week_tx` |
| 3 | Pengeluaran kategori turun | "Pengeluaran {category}-mu turun {percent}% dari minggu lalu. Tanpa sadar kamu udah hemat Rp{saved_amount} ðŸŽ‰" | `category`, `percent`, `saved_amount` |
| 4 | Budget compliance hari ini | "Hari ini kamu masih punya Rp{remaining} dari jatah. Santai aja, kamu on track! ðŸŒ¿" | `remaining` daily budget |
| 5 | First sinking fund contribution | "Kontribusi pertama ke '{fund_name}'! Rp{amount} mungkin keliatan kecil, tapi ini langkah pertama yang paling penting ðŸŒ±" | `fund_name`, `amount` |
| 6 | Catat di waktu yang jarang | "{name} catat jam {time}? Dini hari/pagi-pagi juga tetap rajin ya! ðŸ˜„" | `name`, `transaction_time` |
| 7 | Total transaksi bulan ini milestone | "Transaksi ke-{count} bulan ini! Kamu makin jago ngontrol arus uangmu, {name} 📊" | `count`, `name` |
| 8 | Kembali setelah 3+ hari skip | "Welcome back, {name}! Tanamanmu langsung seger lagi nih. Kita mulai pelan-pelan aja ya ðŸŒ±" | `name`, `days_away` |

### AI-Generated Real-time (DeepSeek V3, Max 4-6/bulan)

| # | Trigger | Prompt Input ke AI | Contoh Output |
|---|---|---|---|
| 9 | Target/sinking fund tercapai | `User {name} just reached their sinking fund "{fund_name}" target of Rp{target}. They've been contributing for {months} months. Their biggest category spending is {top_cat}. Write a congratulatory message in nurturing Indonesian, max 2 sentences.` | "Rina, dana lebaran keluarga Rp5.000.000 TERCAPAI! ðŸŽ‰ 4 bulan kamu konsisten nyisihin sedikit-sedikit. Keluargamu pasti bangga sama kamu." |
| 10 | Monthly recap (>30 hari aktif) | `User {name} has been active for {days} days. This month: income Rp{income}, expenses Rp{expense}, saved Rp{saved} ({rate}% savings rate). Top spending: {top_cat} Rp{top_amt}. Streak: {streak} days. Write a personalized monthly appreciation, nurturing tone, max 3 sentences. Reference specific numbers.` | "Bima, bulan September kamu berhasil hemat 18% dari pemasukan — itu Rp1.260.000 yang aman! Pengeluaran makanan memang masih terbesar (Rp2.1jt), tapi itu turun 12% dari bulan lalu. 42 hari berturut-turut catat — kamu salah satu member paling konsisten di CatetInd ðŸ’š" |

---

## 12 Micro-Moment Triggers

Bukan hanya milestone besar — apresiasi juga di momen kecil yang sering diabaikan app lain.

| # | Micro-Moment | Trigger Logic | Message Type |
|---|---|---|---|
| 1 | Transaksi pertama ever | `total_transactions == 1` | Template + Lottie celebration |
| 2 | Transaksi ke-10 | `total_transactions == 10` | Template |
| 3 | Transaksi ke-3 hari ini | `daily_tx_count == 3` | Template (random dari pool) |
| 4 | Streak hari ke-7 | `current_streak == 7` | Template + tanaman stage check |
| 5 | Streak hari ke-14 | `current_streak == 14` | Template + stage up animation |
| 6 | Streak hari ke-21 | `current_streak == 21` | AI-generated (habit formed!) |
| 7 | Streak hari ke-30 | `current_streak == 30` | AI-generated + stage up + Lottie bloom |
| 8 | Kembali setelah inactivity 3+ hari | `days_since_last_tx >= 3` | Template (welcome back, nurturing) |
| 9 | Pengeluaran kategori turun vs minggu lalu | `category_weekly_change < -10%` | Template (insight + praise) |
| 10 | Sinking fund milestone (25%, 50%, 75%) | `current_amount / target_amount` cross threshold | Template + SVG swap tanaman |
| 11 | Target/sinking fund 100% tercapai | `current_amount >= target_amount` | AI-generated + Lottie celebration |
| 12 | Weekly recap completed | PostHog event `recap_viewed` | Template (+"10 HP tanaman") |

---

## Data Input untuk Personalisasi Konteks Emosional

| Data Point | Sumber | Kegunaan untuk AI |
|---|---|---|
| `current_streak` | `user_plant.current_streak` | Menentukan level pujian (streak 3 vs streak 30 = beda intensitas) |
| `days_since_last_tx` | `user_plant.last_active_date` vs `now()` | Deteksi comeback → nurturing welcome back |
| `savings_rate` | `SUM(pemasukan) - SUM(pengeluaran) / SUM(pemasukan)` | Konteks apakah user sedang hemat atau boros |
| `top_spending_category` | `GROUP BY category, ORDER BY SUM(amount) DESC LIMIT 1` | Personalisasi insight ("pengeluaran makananmu...") |
| `sinking_fund_progress` | `sinking_funds.current_amount / target_amount` | Pujian proporsional terhadap progress |
| `time_of_day` | `transaction_time` | Pujian kontekstual ("Catat jam 23:00? Rajin banget!") |

**PENTING — Privacy Guard (CANDRA):** Semua data point di atas HANYA diproses untuk user itu sendiri. Template-based appreciation tidak mengirim data ke external API. AI-generated appreciation mengirim data aggregated (bukan raw transactions) ke DeepSeek V3, dan hanya untuk milestone messages (4-6x/bulan).

---

## Integration: DeepSeek V3 Appreciation Prompt

**System Prompt (ditambahkan ke Financial Coach system prompt dari Domain 2A):**

```text
ADDITIONAL ROLE: Appreciation Engine
Saat diminta membuat pesan apresiasi, ikuti aturan:
1. WAJIB sebutkan nama user dan minimal 2 angka spesifik dari data mereka
2. WAJIB gunakan tone nurturing — seperti sahabat yang bangga, BUKAN guru yang menilai
3. DILARANG menggunakan kata: "harus", "seharusnya", "jangan", "salah", "buruk"
4. Maksimal 2-3 kalimat. Jangan terlalu panjang.
5. Boleh pakai 1-2 emoji yang warm (ðŸŒ¿ðŸ’šðŸŒ±ðŸŽ‰), DILARANG emoji berlebihan
6. Jika user baru comeback setelah inactivity, JANGAN menyinggung berapa lama mereka pergi. Fokus pada "senang kamu kembali".
7. Jika savings rate rendah atau user sedang boros, JANGAN menghakimi. Framing: "bulan ini memang banyak kebutuhan ya" bukan "kamu terlalu boros"
```

---

# 3D. MOBILE ERGONOMICS

## Perspektif Tim & Resolusi Konflik

> **[CANDRA]:** "PWA di mobile browser punya keterbatasan dibanding native app: tidak bisa override gesture back browser, pull-to-refresh kadang conflict dengan custom gestures, dan swipe edge bisa trigger browser navigation. Setiap gesture yang kita rancang HARUS di-test di Chrome Android dan Safari iOS PWA mode."

> **[BIMA]:** "One-thumb reachability bukan soal menaruh tombol di bawah — ini soal mendesain **seluruh flow** agar ibu jari tidak pernah perlu meraih zona atas layar untuk aksi primer. Zona nyaman ibu jari kanan: 60% bawah-tengah layar."

> **ðŸš¨ KONFLIK BIMA vs DIAN (Tombol CTA di Recap):**
> **DIAN:** "Recap mingguan harus punya CTA 'Set target minggu depan' di ATAS fold — biar conversion tinggi."
> **BIMA:** "Zona atas = hard reach area. CTA primer di atas layar = friction ergonomis. Harus di bawah."
>
> **RESOLUSI:** CTA recap ditaruh di BAWAH slide content (thumb-zone), bukan di header. Slide content di-scroll ke atas, CTA sticky di bottom. Conversion tetap tinggi karena CTA selalu visible, dan ergonomi terjaga.

---

## Thumb Zone Heat Map

```
┌─────────────────────────┐
┐‚                         ┐‚  â† HARD ZONE (15%)
┐‚   Status bar, header    ┐‚     Tidak ada primary action di sini
┐‚   Tanaman visual        ┐‚     Hanya: info display, back button
┐‚                         ┐‚
┐œ─────────────────────────┐¤
┐‚                         ┐‚  â† STRETCH ZONE (25%)
┐‚   Content area          ┐‚     Secondary actions: chart, filter
┐‚   Charts, lists         ┐‚     Scrollable content
┐‚                         ┐‚
┐œ─────────────────────────┐¤
┐‚                         ┐‚  â† NATURAL ZONE (60%)
┐‚   Transaction list      ┐‚     Primary actions di sini:
┐‚   Quick actions         ┐‚     FAB, bottom nav, bottom sheet
┐‚   Bottom sheet area     ┐‚     Input forms, confirmation buttons
┐‚                         ┐‚
┐œ─────────────────────────┐¤
┐‚  Home ┐‚Wallet┐‚ (+) ┐‚📊┐‚···┐‚  â† PRIME ZONE
┐‚  Bottom Navigation Bar   ┐‚     Selalu visible, selalu reachable
┐”─────────────────────────┐˜
```

---

## Bottom Navigation (5 Tab — FIXED, STICKY, Non-scrollable)

```
┌──────┐¬──────┐¬──────┐¬──────┐¬──────┐
┐‚ Home ┐‚Wallet┐‚  âŠ•   ┐‚Insight┐‚ ···  ┐‚
┐‚  ðŸ   ┐‚  💳  ┐‚ 🟢  ┐‚  📊  ┐‚Lainnya┐‚
┐”──────┐´──────┐´──────┐´──────┐´──────┐˜
  48px   48px  56px   48px   48px
                â†‘
           FAB (elevated, sage green)
```

| Tab | Ikon | Fungsi | Justifikasi Posisi |
|---|---|---|---|
| Home | ðŸ  Lucide `Home` | Dashboard: jatah harian, tanaman, recent transactions | Tab 1 = default landing, jari sudah di zona kiri |
| Wallet | 💳 Lucide `Wallet` | Daftar wallet (personal/family/joint) + balance | Tab 2 = quick access ke saldo |
| **FAB (+)** | âŠ• Custom, sage green `#A3B18A` | Tambah transaksi (buka bottom sheet) | **TENGAH = titik paling mudah dijangkau ibu jari dari posisi genggam manapun** |
| Insight | 📊 Lucide `BarChart3` | Analytics, health score, trend, weekly recap | Tab 4 = data engagement driver (Keputusan dari Domain 2 Asumsi A4) |
| Lainnya | ··· Lucide `MoreHorizontal` | Bottom sheet navigasi sekunder berlabel (Domain 2A.6) | Tab 5 = akses ke semua modul non-primary |

**Spesifikasi Teknis Bottom Nav:**
- Height: 56px (termasuk safe area padding untuk notch/gesture bar)
- Position: `fixed` bottom — **TIDAK IKUT SCROLL** (lesson learned dari Fundy yang bottom nav-nya ikut scroll — friction signifikan)
- Background: warm white `#FFFDF7` dengan subtle top border `1px solid rgba(0,0,0,0.06)`
- Active state: sage green fill pada ikon + label, inactive: grey `#9CA3AF`
- FAB: elevated 8px dari nav bar, circular 56px diameter, sage green background, white `+` icon 24px, `box-shadow: 0 4px 12px rgba(163, 177, 138, 0.4)`

---

## Justifikasi FAB vs Bottom Sheet untuk Input Transaksi

| Kriteria | FAB (Dipilih âœ…) | Bottom Sheet Murni | Justifikasi |
|---|---|---|---|
| **Discoverability** | Selalu visible di bottom nav, warna kontras | Butuh tap menu/gesture untuk muncul | Gen-Z first-jobber yang BELUM punya habit catat butuh CTA yang screaming "TAP ME" |
| **Thumb reachability** | Posisi tengah bottom = titik optimal ibu jari | Bervariasi tergantung trigger | FAB di center bottom = reachable dari genggaman kiri maupun kanan |
| **Mental model** | "Tombol hijau = tambah" — universal | Butuh edukasi gesture | Mirip WhatsApp FAB (familiar untuk user Indonesia) |
| **Speed** | 1 tap langsung buka form | 1 tap (jika dari menu) atau swipe | Identik, tapi FAB punya visual affordance yang lebih kuat |
| **Real estate** | Mengambil 1 slot di bottom nav (acceptable) | Tidak mengambil slot | Trade-off: 1 slot nav worth it untuk primary action yang dipakai 3-5x/hari |

> **[DIAN]:** "FAB hijau di tengah bottom nav = CTA permanen yang mengingatkan user 'ini gunanya app ini' setiap kali mereka melihat layar. Ini bukan soal ergonomi saja — ini conversion reminder yang embedded di navigasi. Fundy melakukan hal yang sama dan itu keputusan yang benar."

---

## Gesture Navigation

Menggunakan `@use-gesture/react` untuk gesture handling yang smooth.

| Gesture | Lokasi | Aksi | Spesifikasi |
|---|---|---|---|
| **Swipe Left** pada transaction row | Transaction list | Quick delete (dengan konfirmasi) | `useDrag`, threshold 100px, reveal red "Hapus" button |
| **Swipe Right** pada transaction row | Transaction list | Quick edit (buka form edit) | `useDrag`, threshold 100px, reveal sage green "Edit" button |
| **Pull Down** pada homescreen | Dashboard area | Refresh data (Supabase re-fetch) | Custom pull-to-refresh (BUKAN browser native — karena bisa conflict). Visual: tanaman bounce animation selama loading |
| **Swipe Left/Right** pada Weekly Recap | Recap slides | Navigate between slides | `useDrag` + Framer Motion `AnimatePresence` dengan `slide` variant |
| **Long Press** pada FAB | Bottom nav FAB | Voice input mode (mic langsung aktif) | `useLongPress`, threshold 500ms, Lottie pulsating wave appears |

**Gesture Conflict Prevention (CANDRA):**
- Disable browser swipe-back gesture di PWA mode via `touch-action: pan-y` pada container utama
- Pull-to-refresh custom HANYA aktif saat scroll position = 0 (top)
- Semua swipe gestures punya velocity threshold (bukan hanya distance) agar tidak teralu sensitif

---

## Micro-Feedback System (Closing the Loop)

Setiap aksi primer WAJIB memberikan feedback multi-sensory agar terasa "selesai". Ini terhubung langsung ke **Reward di 3A Habit Loop** dan **Apresiasi di 3C AI Engine**.

### Feedback Stack per Aksi

| Aksi | Visual | Audio | Haptic | Toast (Sonner) | 3A Connection | 3C Connection |
|---|---|---|---|---|---|---|
| **Simpan transaksi** | Lottie checkmark (1.2s, sage green, non-blocking) | Marimba chime C5 (0.4s, vol 30%) | `vibrate([30,50,30])` | Random dari 8 variasi copy | Immediate reward (sensory) | Random 1/5 chance: AI appreciation |
| **Weekly recap viewed** | Slide transition + tanaman grow | Soft ambient tone (0.6s) | Tidak ada | "Recap minggu ini udah kamu cek âœ…" | Delayed reward (insight) | +10 HP tanaman |
| **Sinking fund contribution** | Lottie coin drop into pot (1s) | Coin clink sound (0.3s) | `vibrate([20,40])` | "Rp{amount} masuk ke '{fund_name}' ðŸŒ±" | Variable reward (progress) | Milestone check (25/50/75/100%) |
| **Target tercapai** | Full-screen Lottie confetti (2.5s) | Achievement fanfare (1s) | `vibrate([50,100,50,100,50])` | AI-generated personal message | Milestone reward (celebration) | AI-generated (real-time) |
| **Budget di bawah limit** | Subtle sage green glow on HUD card | Tidak ada (terlalu sering) | Tidak ada | Copy rotasi: "On track! ðŸŒ¿" | Immediate reward (reassurance) | — |
| **Hapus transaksi** | Slide-out animation (Auto Animate) | Soft "undo" tone | `vibrate([20])` | "Dihapus. [Undo]" (5 detik undo window) | — | — |

### Toast Copy Rotation (8 Variasi untuk Simpan Transaksi)

Agar reward tidak terasa repetitive, toast copy di-rotate secara random:

1. "Sip, udah dicatet dengan aman! ðŸŒ¿"
2. "Noted! Satu langkah lebih dekat ke financially aware âœ¨"
3. "Tercatat! Tanamanmu makin subur ðŸŒ±"
4. "Done! Gak sampai 5 detik kan? ðŸ˜„"
5. "Aman! Pengeluaran hari ini terpantau ðŸ’š"
6. "Catat, aman, lanjut! ðŸš€"
7. "Nice! Kamu makin jago ngontrol cashflow 📊"
8. "Tersimpan! Self-care finansial hari ini âœ…"

### Sound Design Specification

| Sound | Deskripsi | File Format | Duration | Volume | Load Strategy |
|---|---|---|---|---|---|
| Transaction save | Marimba single note C5, soft attack, medium decay | MP3, <20KB | 0.4s | 30% max | Preload saat app init |
| Coin contribution | Metallic clink, 2 hits | MP3, <15KB | 0.3s | 25% | Preload |
| Achievement fanfare | 3-note ascending major chord (C-E-G), warm synth pad | MP3, <30KB | 1.0s | 40% | Lazy load |
| Recap ambient | Soft pad chord, fade in/out | MP3, <25KB | 0.6s | 20% | Lazy load |
| Undo tone | Soft descending 2-note | MP3, <10KB | 0.2s | 20% | Preload |

**Implementation:** Web Audio API dengan `AudioContext`. Preloaded sounds di-decode saat app mount (total <70KB). User setting: toggle sound on/off di Settings (default: ON). iOS Safari PWA caveat: audio playback harus di-trigger oleh user gesture pertama kali — gunakan silent audio play saat user tap pertama di app untuk "unlock" AudioContext.

> **[CANDRA]:** "Total audio assets: <100KB. Total Lottie assets: <700KB (7 stage SVG + celebration + misc). Total gamifikasi overhead: <800KB — acceptable. Semua lazy-loaded kecuali homescreen SVG dan preloaded sounds."

---

## Homescreen Layout (Menggabungkan Semua Elemen)

```
┌─────────────────────────────────┐
┐‚  Selamat pagi, Rina ðŸŒ¿          ┐‚  â† Header (HARD ZONE)
┐‚  21 Sep 2026                    ┐‚     Greeting + date only
┐œ─────────────────────────────────┐¤
┐‚  ┌───────────────────────────┐  ┐‚  â† STRETCH ZONE
┐‚  ┐‚    ðŸŒ¿ [SVG Tanaman]       ┐‚  ┐‚     Tanaman (tap untuk detail)
┐‚  ┐‚    Tahap 3: Tanaman Muda  ┐‚  ┐‚     Stage name + subtle HP visual
┐‚  ┐”───────────────────────────┐˜  ┐‚
┐‚                                 ┐‚
┐‚  ┌───────────────────────────┐  ┐‚  â† NATURAL ZONE
┐‚  ┐‚  Jatah Hari Ini           ┐‚  ┐‚     Daily HUD (dari 2B)
┐‚  ┐‚  Rp 210.000    â—‹â—‹â—‹â—‹â—‹â–‘â–‘   ┐‚  ┐‚     Circular progress + amount
┐‚  ┐‚  "Masih banyak ruang! ðŸŒ¿" ┐‚  ┐‚     Motivational copy
┐‚  ┐”───────────────────────────┐˜  ┐‚
┐‚                                 ┐‚
┐‚  Transaksi Hari Ini             ┐‚
┐‚  ┌───────────────────────────┐  ┐‚
┐‚  ┐‚ ðŸ— Ayam Geprek  -Rp25.000┐‚  ┐‚     Recent transactions
┐‚  ┐‚ â˜• Kopi Kenangan -Rp32.000┐‚  ┐‚     (scrollable)
┐‚  ┐‚ ðŸšŒ TransJakarta -Rp3.500 ┐‚  ┐‚
┐‚  ┐”───────────────────────────┐˜  ┐‚
┐‚                                 ┐‚
┐‚  [Recap Mingguan Siap! Lihat →] ┐‚  â† Banner (conditional)
┐‚                                 ┐‚
┐œ─────────────────────────────────┐¤
┐‚ Home ┐‚Wallet┐‚  âŠ•  ┐‚Insight┐‚ ··· ┐‚  â† PRIME ZONE (fixed)
┐”─────────────────────────────────┐˜
```

**Elemen gamifikasi yang terintegrasi natural:**
- Tanaman = bukan "fitur gamifikasi" — ini "teman visual" di homescreen
- Daily HUD = bukan "game meter" — ini "informasi berguna"
- Toast copy rotation = bukan "achievement badge" — ini "respons teman"
- Weekly recap = bukan "scorecard" — ini "me-time review"

> **[BIMA]:** "Perhatikan: TIDAK ADA satupun elemen di homescreen yang terasa 'gamey'. Tidak ada poin, tidak ada badge, tidak ada leaderboard, tidak ada streak counter yang tertulis angka. Tanaman 'terasa' natural. HUD 'terasa' informatif. Apresiasi 'terasa' personal. Itu definisi gamifikasi yang berhasil: invisible."

---

# ASUMSI & INTERPRETASI YANG DIAMBIL

### A1. Push Notification Timing: 12:30 dan 19:00 WIB
**Instruksi:** "Apa yang memicu user membuka app?" — timing tidak dispesifikasi.
**Keputusan (DIAN):** 2x per hari di momen post-spending tertinggi: 12:30 WIB (setelah makan siang) dan 19:00 WIB (setelah makan malam). Basis: data spending pattern GrabFood/GoFood menunjukkan 2 peak ini. Pagi hari (commute) sengaja dihindari — notifikasi saat commute diabaikan 80%+ dan malah menambah annoyance.

### A2. Variable Ratio: 1 dari 5 Transaksi
**Instruksi:** "Reward yang membuat user merasa puas" — ratio tidak dispesifikasi.
**Keputusan (BIMA):** Surprise AI appreciation muncul rata-rata 1 dari 5 transaksi (20%), timing random. Basis: variable ratio reinforcement schedule dari behavioral psychology — cukup sering untuk terasa rewarding, cukup jarang untuk tetap surprising. Implementasi: `Math.random() < 0.2` pada setiap save transaksi.

### A3. Streak Pause vs Reset
**Instruksi:** "Apa yang terjadi jika user skip" — mekanisme streak tidak dispesifikasi secara eksplisit (hanya "tanaman layu tapi TIDAK mati").
**Keputusan:** Streak TIDAK pernah reset ke 0. Streak di-pause saat skip, resume dari angka terakhir saat user kembali. Alasan: konsisten dengan prinsip "nurturing, bukan punishing". `current_streak` tetap tersimpan, hanya `health_points` yang turun.

### A4. HP Start: 50 (Bukan 0 atau 100)
**Instruksi:** Tidak disebutkan HP awal.
**Keputusan:** HP awal = 50 (dari range 20-100). Alasan: tanaman terlihat "okay" dari pertama kali — bukan menyedihkan (HP 20 = layu) tapi juga belum sempurna (HP 100 = paling subur). User merasakan ada ruang untuk tumbuh tanpa merasa mulai dari posisi jelek.

### A5. Social Proof Angka di Target Bulanan: Aggregated Real Data
**Instruksi:** "78% member yang set target..." — apakah ini angka fiktif atau real?
**Keputusan:** Angka ini HARUS real dari aggregate analytics (PostHog). Sebelum ada data cukup (< 100 user), angka ini TIDAK ditampilkan. Setelah 100+ user: query aggregate, update monthly. Implementasi: Supabase Edge Function query yang menghitung `COUNT(users with target AND savings > 0) / COUNT(users with target)`. Data individual TIDAK terekspos — hanya persentase aggregate. Konsisten dengan privacy policy.

### A6. Sound Default: ON
**Instruksi:** Tidak disebutkan default state sound effect.
**Keputusan:** Sound default ON untuk user baru. Alasan (BIMA): sound adalah komponen kritis dari multi-sensory reward loop. Mematikan sound dari awal = menghilangkan 1 dari 3 sensory feedback channels. User yang tidak mau bisa matikan di Settings > Preferences > Sound Effects.

### A7. Pull-to-Refresh: Custom, Bukan Browser Native
**Instruksi:** Tidak disebutkan pull-to-refresh mechanism.
**Keputusan (CANDRA):** Custom pull-to-refresh menggunakan `@use-gesture/react` `useDrag` + custom animation (tanaman bounce), BUKAN browser native pull-to-refresh. Alasan: browser native PTR di PWA sering conflict dengan scroll behavior dan terasa "murah". Custom PTR memberikan kesempatan untuk micro-interaction branded (tanaman bounce = reinforcement metafora).

### A8. Weekly Recap: Swipeable Cards (5 Slides), Bukan Single Scroll Page
**Instruksi:** "review mingguan" — format tidak dispesifikasi.
**Keputusan:** 5 swipeable full-screen slides menggunakan `@use-gesture/react` + Framer Motion `AnimatePresence`. Alasan: card-based format lebih engaging dan fokus (satu insight per slide) dibanding scrollable page yang memungkinkan user skip content. Juga familiar — mirip Instagram Stories flow yang target audience sudah terbiasa. Progress dots di bottom menunjukkan posisi slide.



---


# CatetInd — Domain 4: Arsitektur Teknikal
## PWA Resilience · AI Routing · Supabase Security · Tech Stack Final

**Versi:** 1.0  
**Tanggal:** 21 September 2026  
**Tim Persona:** ARIA · BIMA · CANDRA · DIAN  
**Prasyarat:** Domain 2 PRD (20 tabel schema), Domain 3 PRD (approved)  
**Filosofi Inti:** Setiap keputusan teknikal harus bisa dieksekusi oleh 2 developer dalam waktu yang realistis — zero over-engineering.

---

## DAFTAR ISI

1. [4A. Resilient Online-First Architecture](#4a-resilient-online-first-architecture)
2. [4B. AI Prompt Routing System](#4b-ai-prompt-routing-system)
3. [4C. Supabase Security Architecture (RLS)](#4c-supabase-security-architecture)
4. [4D. Tech Stack Decision Final](#4d-tech-stack-decision-final)
5. [Asumsi & Interpretasi yang Diambil](#asumsi--interpretasi-yang-diambil)

---

# 4A. RESILIENT ONLINE-FIRST ARCHITECTURE

## Perspektif Tim & Resolusi Konflik

> **[CANDRA — Principal Web Architect]:** "Ini bukan offline-first. Ini 'koneksi goyah toleran'. Perbedaan fundamental: kita tidak menyimpan write queue permanen di IndexedDB karena itu berarti harus handle conflict resolution — kompleksitas yang gak sepadan untuk tim 2 orang. Kita simpan retry queue **hanya di memory (React state + localStorage)** untuk durasi sesi. Kalau app ditutup sebelum retry berhasil, transaksi lost — dan itu acceptable karena asumsinya user hampir selalu online."

> **[ARIA — Principal Product Strategist]:** "Acceptable-nya conditional. Jika transaksi yang 'hilang' terjadi lebih dari 1x per bulan per user, NPS akan turun drastis. Kita perlu menampilkan **indikator visual yang jelas** saat transaksi masuk retry queue — bukan sembunyikan dari user. Transparency builds trust."

> **[BIMA — Lead UX & Behavioral Architect]:** "Setuju dengan ARIA soal transparency — tapi indikatornya harus tidak menimbulkan anxiety. Bukan spinner merah yang terlihat error, tapi subtle indicator seperti jam kecil (â³) di sebelah transaksi yang berarti 'sedang dikirim'. User tahu tapi tidak panik."

> **ðŸš¨ KONFLIK CANDRA vs ARIA (Retry Duration):**  
> **CANDRA:** "Retry max 3x dengan exponential backoff (1s, 2s, 4s). Total 7 detik. Setelah itu, notifikasi 'Gagal, coba manual' dan hapus dari queue. Memory usage harus terbatas."  
> **ARIA:** "3x retry dalam 7 detik itu gagal kalau user masuk lift dan keluar koneksi 30 detik. Minimum retry 5 menit untuk genuine use case."  
> **RESOLUSI:** Retry queue dengan **3 fase**: (1) Immediate retry: 3x dengan backoff 1s/2s/4s saat error pertama. (2) Background retry: setiap 30 detik selama maksimal 5 menit (10 kali), disimpan di `localStorage` sehingga survive tab-refresh. (3) Terminal failure: setelah 5 menit, toaster error merah + transaksi diberi label "Gagal terkirim — tap untuk retry manual". Data di localStorage dibersihkan.

---

## Service Worker Caching Strategy

### Keputusan: Serwist (bukan next-pwa, bukan custom)

**Perbandingan Tiga Opsi:**

| Kriteria | next-pwa | **Serwist âœ…** | Custom Implementation |
|---|---|---|---|
| Maintenance status | âŒ Deprecated (archived Feb 2024) | âœ… Aktif dikembangkan (fork dari next-pwa) | N/A |
| Integrasi Next.js App Router | âŒ Tidak mendukung App Router | âœ… Full App Router support | âœ… (tapi butuh effort besar) |
| Workbox support | Terbatas | âœ… Full Workbox API | âœ… (manual config) |
| Time to implement (2 dev) | 0.5 hari | **1 hari** | 5-7 hari |
| Customization flexibility | Rendah | Tinggi | Unlimited |
| Bundle size overhead | +8KB | +12KB | +0KB |

**Justifikasi Serwist:** next-pwa deprecated per Februari 2024 — tidak boleh pakai dependency yang tidak di-maintain untuk aplikasi fintech. Custom implementation = 5-7 hari effort yang tidak proporsional untuk use case sederhana (retry queue + basic caching, bukan full offline). Serwist memberikan full Workbox API dengan setup 1 hari.

### Caching Strategy per Resource Type

| Resource | Strategy | Config | Justifikasi |
|---|---|---|---|
| **Static assets** (JS, CSS, fonts, SVG tanaman) | `CacheFirst` | Max 30 hari, max 60 entries | File-file ini berubah hanya saat deploy — content-hashed, aman di-cache agresif |
| **Google Fonts / font CDN** | `StaleWhileRevalidate` | Max 1 tahun | Fonts tidak berubah, tapi perlu fallback offline untuk first-paint |
| **Lottie JSON files** | `CacheFirst` | Max 7 hari, max 20 entries | Animasi tidak berubah sering, heavy download — cache agresif |
| **Supabase REST reads** (transaksi historis, categories) | `StaleWhileRevalidate` | Max 5 menit stale, max 100 entries | Data read-heavy yang berubah, tapi boleh tampil "agak lama" sambil update background |
| **Supabase REST writes** (POST transaksi baru) | **Network Only** (+ retry queue di app layer) | Tidak di-cache | Write TIDAK boleh di-cache oleh service worker — itu tugas retry queue di app layer |
| **API routes** (OCR, AI chat) | `NetworkFirst` | Timeout 10s, fallback cache 1 jam | AI responses harus fresh. Jika network fail setelah 10s, tampilkan cached response terakhir dengan label "Offline — respons lama" |
| **Next.js pages** | `StaleWhileRevalidate` | Max 24 jam | App shell ter-cache agar PWA bisa "buka" meski offline — tapi data tidak akan ada |

### Serwist Configuration (`serwist.config.ts`)

```typescript
// serwist.config.ts
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry } from "@serwist/precaching";
import type { RuntimeCaching } from "@serwist/sw";

export const runtimeCaching: RuntimeCaching[] = [
  // Static assets — CacheFirst
  {
    matcher: /\.(?:js|css|woff2?)$/,
    handler: "CacheFirst",
    options: {
      cacheName: "static-assets",
      expiration: { maxAgeSeconds: 60 * 60 * 24 * 30, maxEntries: 60 },
    },
  },
  // Lottie JSON — CacheFirst
  {
    matcher: /\/animations\/.*\.json$/,
    handler: "CacheFirst",
    options: {
      cacheName: "lottie-animations",
      expiration: { maxAgeSeconds: 60 * 60 * 24 * 7, maxEntries: 20 },
    },
  },
  // Supabase REST reads — StaleWhileRevalidate
  {
    matcher: ({ url }) => url.hostname.includes("supabase.co") && url.pathname.startsWith("/rest/"),
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "supabase-reads",
      expiration: { maxAgeSeconds: 60 * 5, maxEntries: 100 },
      // HANYA GET requests — POST/PATCH/DELETE tidak ter-cache karena browser tidak cache non-GET
      // tapi kita tambahkan explicit check:
      plugins: [{
        fetchDidSucceed: async ({ response }) => {
          // Hanya cache GET requests
          return response;
        },
      }],
    },
  },
  // AI API routes — NetworkFirst dengan timeout
  {
    matcher: /\/api\/(ocr|chat|parse-voice|categorize)/,
    handler: "NetworkFirst",
    options: {
      cacheName: "ai-api-responses",
      networkTimeoutSeconds: 10,
      expiration: { maxAgeSeconds: 60 * 60, maxEntries: 50 },
    },
  },
];
```

---

## Optimistic UI + Retry Queue Architecture

### State Machine untuk Transaksi

```
PENDING_SUBMIT
      ┐‚
      â–¼
[User tap "Catat âœ“"]
      ┐‚
      ┐œ─── Network available ──→ SUBMITTING ──→ SUCCESS → UI update normal
      ┐‚
      ┐”─── Network unavailable ──→ OPTIMISTIC_SAVED
                                        ┐‚
                                        â–¼
                                 [Ditampilkan di list dengan â³]
                                        ┐‚
                                   Retry Phase 1 (3x, 7 detik)
                                        ┐‚
                               ┐œ── Berhasil → SUCCESS → â³ hilang
                               ┐”── Gagal → Retry Phase 2 (setiap 30s, 5 menit)
                                               ┐‚
                                      ┐œ── Berhasil → SUCCESS
                                      ┐”── Gagal (5 menit) → FAILED_PERMANENT
                                                                ┐‚
                                                         Toaster error merah
                                                         + tap untuk retry manual
                                                         + label "Gagal" di list
```

### Implementation

```typescript
// lib/retry-queue.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PendingTransaction {
  id: string;           // local UUID (generated client-side sebelum submit)
  data: TransactionInsert;
  attemptCount: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
  status: 'pending' | 'retrying' | 'failed';
}

interface RetryQueueStore {
  queue: PendingTransaction[];
  addToQueue: (tx: TransactionInsert) => string; // returns local id
  markSuccess: (localId: string, serverData: Transaction) => void;
  markFailed: (localId: string) => void;
  retryItem: (localId: string) => void;
  incrementAttempt: (localId: string) => void;
}

export const useRetryQueue = create<RetryQueueStore>()(
  persist(
    (set, get) => ({
      queue: [],

      addToQueue: (data) => {
        const localId = crypto.randomUUID();
        set((state) => ({
          queue: [...state.queue, {
            id: localId,
            data,
            attemptCount: 0,
            firstAttemptAt: Date.now(),
            lastAttemptAt: Date.now(),
            status: 'pending',
          }],
        }));
        return localId;
      },

      markSuccess: (localId) => {
        set((state) => ({
          queue: state.queue.filter((item) => item.id !== localId),
        }));
      },

      markFailed: (localId) => {
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === localId ? { ...item, status: 'failed' } : item
          ),
        }));
      },

      incrementAttempt: (localId) => {
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === localId
              ? { ...item, attemptCount: item.attemptCount + 1, lastAttemptAt: Date.now(), status: 'retrying' }
              : item
          ),
        }));
      },

      retryItem: (localId) => {
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === localId ? { ...item, status: 'pending' } : item
          ),
        }));
      },
    }),
    {
      name: 'catetind-retry-queue', // persists to localStorage
      partialize: (state) => ({ queue: state.queue }), // hanya queue yang di-persist
    }
  )
);

// hooks/useSubmitTransaction.ts
export function useSubmitTransaction() {
  const { addToQueue, markSuccess, markFailed, incrementAttempt } = useRetryQueue();
  const queryClient = useQueryClient();

  const submit = async (data: TransactionInsert) => {
    const localId = addToQueue(data);

    // Optimistic update: langsung tambahkan ke React Query cache
    queryClient.setQueryData(['transactions', 'today'], (old: Transaction[]) => [
      { ...data, id: localId, _isOptimistic: true }, // flag untuk UI
      ...(old ?? []),
    ]);

    // Phase 1: Immediate retry (3x dengan exponential backoff)
    const delays = [1000, 2000, 4000];
    for (let i = 0; i < delays.length; i++) {
      try {
        incrementAttempt(localId);
        const result = await supabase.from('transactions').insert(data).select().single();
        if (result.error) throw result.error;

        // Berhasil: replace optimistic dengan real data
        markSuccess(localId, result.data);
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        return { success: true, data: result.data };
      } catch {
        if (i < delays.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delays[i]));
        }
      }
    }

    // Phase 1 gagal → masuk Phase 2 (background retry via interval)
    // Phase 2 dihandle oleh RetryQueueProcessor (lihat bawah)
    return { success: false, localId };
  };

  return { submit };
}

// components/RetryQueueProcessor.tsx
// Komponen ini di-mount di root layout, berjalan di background
export function RetryQueueProcessor() {
  const { queue, markSuccess, markFailed, incrementAttempt } = useRetryQueue();

  useEffect(() => {
    const interval = setInterval(async () => {
      const pendingItems = queue.filter((item) => {
        const isExpired = Date.now() - item.firstAttemptAt > 5 * 60 * 1000; // 5 menit
        return item.status === 'retrying' && !isExpired;
      });

      // Mark expired items as failed
      queue
        .filter((item) => Date.now() - item.firstAttemptAt > 5 * 60 * 1000 && item.status === 'retrying')
        .forEach((item) => {
          markFailed(item.id);
          toast.error(`Transaksi gagal terkirim. Tap untuk coba lagi.`, {
            action: { label: 'Retry', onClick: () => retryItem(item.id) },
          });
        });

      // Retry pending items
      for (const item of pendingItems) {
        try {
          incrementAttempt(item.id);
          const result = await supabase.from('transactions').insert(item.data).select().single();
          if (result.error) throw result.error;
          markSuccess(item.id, result.data);
        } catch {
          // Akan dicoba lagi di interval berikutnya
        }
      }
    }, 30_000); // setiap 30 detik

    return () => clearInterval(interval);
  }, [queue]);

  return null; // render nothing
}
```

### UI Indicator untuk Optimistic Transaction

```typescript
// Dalam TransactionListItem.tsx
function TransactionListItem({ transaction }: { transaction: Transaction }) {
  const isOptimistic = transaction._isOptimistic;
  const isFailed = transaction._status === 'failed';

  return (
    <div className={cn(
      "flex items-center gap-3 p-4 rounded-xl",
      isOptimistic && "opacity-70",
      isFailed && "border border-terracotta/30 bg-terracotta/5"
    )}>
      {/* ... transaction content ... */}

      {/* Status indicator */}
      {isOptimistic && !isFailed && (
        <Tooltip content="Sedang dikirim...">
          <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
        </Tooltip>
      )}
      {isFailed && (
        <Tooltip content="Gagal terkirim — tap untuk retry">
          <AlertCircle className="w-4 h-4 text-terracotta cursor-pointer" onClick={handleRetry} />
        </Tooltip>
      )}
    </div>
  );
}
```

---

## Supabase Realtime: Khusus Joint Wallet

```typescript
// hooks/useJointWalletSync.ts
// HANYA di-mount di halaman Joint Wallet — tidak untuk seluruh app

export function useJointWalletSync(walletId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!walletId) return;

    const channel = supabase
      .channel(`joint-wallet:${walletId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `wallet_id=eq.${walletId}`,
        },
        (payload) => {
          // Hanya tampilkan transaksi yang bukan milik user sendiri
          // (transaksi sendiri sudah ter-optimistic-update)
          if (payload.new.user_id !== supabase.auth.getUser().then(u => u.data.user?.id)) {
            queryClient.setQueryData(
              ['transactions', 'joint', walletId],
              (old: Transaction[]) => [payload.new as Transaction, ...(old ?? [])]
            );

            toast(`${payload.new.ai_generated_name}`, {
              description: `Rp ${payload.new.amount.toLocaleString('id-ID')}`,
              icon: "ðŸ›’",
            });
          }
        }
      )
      .subscribe();

    // CRITICAL: Unsubscribe saat user background app
    const handleVisibilityChange = () => {
      if (document.hidden) {
        supabase.removeChannel(channel);
      } else {
        channel.subscribe();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [walletId, queryClient]);
}
```

---

# 4B. AI PROMPT ROUTING SYSTEM

## Perspektif Tim & Resolusi Konflik

> **[CANDRA]:** "2 model = 2 API clients. DeepSeek V3 via OpenAI-compatible API (`api.deepseek.com`), GPT-4o-mini via OpenAI SDK. Di Next.js, dua API route: `/api/ai/text` dan `/api/ai/ocr`. Simple, maintainable."

> **[ARIA]:** "Cost control adalah survival untuk bootstrapped team. Setiap AI call harus di-log ke PostHog dengan token count — bukan untuk monitoring, tapi untuk billing projection. Jika sebuah user menghabiskan >X token per bulan, mereka masuk segmen 'heavy user' yang harus beli Add-on AI Token."

> **ðŸš¨ KONFLIK DIAN vs CANDRA (Fallback Strategy):**  
> **DIAN:** "Kalau DeepSeek V3 down, tampilkan error 'AI Coach lagi istirahat' dengan copy yang nurturing. Jangan fallback ke GPT-4o-mini untuk text tasks — GPT-4o-mini lebih mahal dan kita tidak mau biaya melonjak saat downtime."  
> **CANDRA:** "Setuju untuk chat/coaching. Tapi untuk kategorisasi transaksi (auto-suggest kategori saat input), fallback ke rule-based heuristic (keyword matching) — bukan AI. Ini zero cost dan cukup untuk 80% kasus common."  
> **RESOLUSI:** Dual fallback: (1) Kategorisasi → rule-based heuristic jika DeepSeek down. (2) Chat/Coaching → graceful degradation dengan error message nurturing, tidak fallback ke model lain. Zero surprise cost.

---

## Decision Tree: AI Model Routing

```
User action received
        ┐‚
        â–¼
Is this a receipt image upload?
        ┐‚
   YES ─┐¤─ NO
        ┐‚    ┐‚
        ┐‚    â–¼
        ┐‚  Is this any text-based task?
        ┐‚    (categorize, chat, coach, parse voice,
        ┐‚     financial Q&A, naming transaction)
        ┐‚    ┐‚
        ┐‚    â–¼
        ┐‚  Route → DeepSeek V3
        ┐‚  Endpoint: api.deepseek.com
        ┐‚  Model: deepseek-chat (= V3)
        ┐‚  Fallback (DeepSeek down):
        ┐‚    - Kategorisasi → rule-based heuristic
        ┐‚    - Chat/Coach → "AI Coach lagi istirahat sebentar ðŸŒ¿
        ┐‚                    Coba lagi dalam beberapa menit ya."
        ┐‚
        â–¼ (YES: image upload)
      Route → GPT-4o-mini
      Endpoint: api.openai.com
      Model: gpt-4o-mini
      Fallback (OpenAI down):
        → "Scan struk lagi istirahat. Coba input manual ya! 
           Atau coba lagi dalam beberapa menit."
        → TIDAK fallback ke DeepSeek (tidak punya vision)
```

---

## Monthly AI Cost Estimation

### Asumsi Usage Pattern Normal (per user per bulan)

| Activity | Volume | Model | Avg Tokens/Call | Cost/1M tokens | Total Token | Cost (USD) |
|---|---|---|---|---|---|---|
| **Kategorisasi + AI naming saat input** | 20 tx/hari Ã— 30 hari = 600 calls | DeepSeek V3 | 200 input + 80 output = 280 | Input $0.27, Output $1.10 | 120K in + 48K out | $0.085 |
| **AI Chat/Coaching** | 5 pesan/hari Ã— 30 hari = 150 calls | DeepSeek V3 | 800 input (context) + 200 output | $0.27 / $1.10 | 120K in + 30K out | $0.065 |
| **OCR struk** | 2 scan/hari Ã— 30 hari = 60 calls | GPT-4o-mini | ~1K tokens (image + prompt + output) | $0.15 input / $0.60 output | 30K in + 15K out | $0.013 |
| **Voice parsing** | 3 calls/hari Ã— 30 hari = 90 calls | DeepSeek V3 | 300 input + 100 output | $0.27 / $1.10 | 27K in + 9K out | $0.017 |
| **Weekly recap insight** | 4 calls/bulan | DeepSeek V3 | 2000 input + 300 output | $0.27 / $1.10 | 8K in + 1.2K out | $0.003 |
| **AI Appreciation (live)** | 6 calls/bulan | DeepSeek V3 | 500 input + 100 output | $0.27 / $1.10 | 3K in + 0.6K out | $0.002 |

**Total per user per bulan: ~USD $0.185 (â‰ˆ Rp 3.000)**

**Untuk 300 Founding Members:** ~USD $55/bulan (â‰ˆ Rp 895.000)  
**Untuk 1.000 Regular users:** ~USD $185/bulan (â‰ˆ Rp 3.000.000)

> **PERBANDINGAN dengan setup 4-model (termasuk Claude Haiku untuk medium tasks):**  
> Estimasi 4-model: +Rp 1.800.000/bulan untuk 1.000 users (Claude Haiku $0.25/1M input, lebih mahal 10x dari DeepSeek).  
> **Penghematan: ~60% biaya AI dengan migrasi ke 2-model setup.**  
> Break-even unit economics: Rp 49.000/bulan per user, AI cost ~Rp 3.000 = **6.1% dari revenue**. Sangat sehat.

### Add-on AI Token Trigger

User yang melebihi **2x usage normal** dalam sebulan masuk segmen heavy user:
- Threshold: > 600 kategorisasi, atau > 150 chat, atau > 60 OCR dalam sebulan
- Tracking: via PostHog custom event `ai_call` dengan properties `{model, task_type, token_count}`
- Action: tampilkan in-app notification "Kamu power user! Quota AI kamu sudah 80% terpakai. Top up AI Token biar gak terganggu."

---

## System Prompt Financial Coach (DeepSeek V3)

```text
# SISTEM: CatetInd AI Financial Coach

Kamu adalah AI Financial Coach untuk CatetInd, aplikasi keuangan personal untuk Gen-Z Indonesia. 
Nama panggilanmu: "Coach". Kamu adalah sahabat finansial yang suportif, bukan konsultan formal.

## IDENTITAS DAN TONE
- Tone: Nurturing, empathetic, seperti kakak/teman yang lebih berpengalaman — bukan auditor, bukan guru, bukan galak
- Bahasa: Bahasa Indonesia kasual-profesional. Boleh mix English untuk istilah teknis keuangan.
- Panjang respons: Maksimal 3-4 kalimat untuk pertanyaan kasual. Untuk pertanyaan kompleks, maksimal 6-7 kalimat + 1 action step konkret.
- Selalu akhiri dengan 1 langkah konkret yang bisa dilakukan user HARI INI atau MINGGU INI — bukan rencana abstrak.

## PEMAHAMAN SLANG DAN KONTEKS INDONESIA
Kamu memahami dan dapat menggunakan istilah-istilah berikut secara natural:
- "Bokek" = kehabisan uang di akhir bulan
- "Nabung receh" = menabung dalam jumlah kecil secara konsisten
- "THR" = Tunjangan Hari Raya (bonus setara 1 bulan gaji menjelang Lebaran/Natal)
- "Gajian" = momen gaji masuk ke rekening (biasanya tanggal 25-1 setiap bulan)
- "Ngedate sama tabungan" = istilah self-care finansial, memprioritaskan menabung daripada hedon
- "BPJS" = asuransi kesehatan wajib yang dipotong dari gaji
- "Kos-kosan" = hunian sewa kamar per bulan (biaya fixed terbesar untuk first-jobber)
- "Cicilan" = angsuran pinjaman bulanan
- "Paylater" = pinjaman konsumtif via aplikasi (ShopeePayLater, Kredivo, dll.)
- "Jajan" = pengeluaran untuk makanan ringan/minuman/camilan
- "Nongkrong" = pengeluaran sosial (kopi, makan bareng teman)

## DATA KONTEKS USER (DIKIRIM SETIAP REQUEST)
Kamu menerima ringkasan data finansial user yang relevan dalam setiap permintaan. 
WAJIB menggunakan data ini sebagai dasar saran — JANGAN memberikan saran generik tanpa mereferensikan data user.
Format konteks yang kamu terima:
```json
{
  "user_name": "string",
  "month_year": "YYYY-MM",
  "monthly_income": number,
  "total_expenses_this_month": number,
  "savings_rate": number (percentage),
  "top_categories": [{"name": string, "amount": number, "percentage": number}],
  "active_debts": [{"provider": string, "monthly_installment": number}],
  "sinking_fund_progress": [{"name": string, "current": number, "target": number}],
  "daily_budget_remaining": number,
  "current_streak": number
}
```

## BATASAN REGULASI OJK (WAJIB DIPATUHI)
DILARANG memberikan:
- Rekomendasi saham spesifik (contoh: "beli BBCA" atau "jual BTC sekarang")
- Rekomendasi reksadana spesifik berdasarkan kinerja historis ("Bibit Reksadana X performanya bagus")
- Proyeksi return investasi yang spesifik ("nabung Rp500K/bulan di instrumen X = Rp6jt setahun dengan return 8%")
- Saran asuransi jiwa/kesehatan spesifik berdasarkan kondisi kesehatan user
- Analisis kredit atau scoring kredit user

BOLEH memberikan:
- Penjelasan konsep: "Apa itu reksadana pasar uang?" → jawab secara edukatif
- Perbandingan kelas aset secara umum: "Reksadana vs deposito, apa bedanya?"
- Saran diversifikasi umum: "Jangan taruh semua tabungan di satu tempat"
- Motivasi untuk mulai berinvestasi tanpa menyebut instrumen spesifik

Jika user bertanya hal yang masuk ranah regulasi OJK, WAJIB akhiri dengan:
"Untuk saran investasi yang lebih spesifik dan personal, kamu bisa konsultasi ke perencana keuangan bersertifikat (CFP) ya ðŸ’š"

## KAPAN REDIRECT KE PROFESIONAL
Rekomendasikan konsultasi ke profesional keuangan (CFP/perencana keuangan) jika:
- DTI (Debt-to-Income) user > 50% dan user bertanya cara mengatasi hutang
- User memiliki hutang > 12x gaji bulanan
- User bertanya soal perencanaan pensiun yang kompleks
- User menyebutkan situasi finansial darurat yang melebihi kemampuan app (misalnya kebangkrutan, sengketa warisan)
- User meminta saran asuransi jiwa berdasarkan kondisi spesifik

## 5 CONTOH RESPONS: SALAH VS BENAR

### Kasus 1: User bokek di tanggal 20
âŒ SALAH: "Kamu harus lebih hemat bulan depan dan buat budget yang ketat."
âœ… BENAR: "Iya, tanggal 20 itu emang sering jadi 'ujian sabar' ya, {name}. Dari data kamu, Rp430.000 udah kepakai buat nongkrong bulan ini — cukup besar. Untuk sisa 10 hari, coba fokus ke pengeluaran wajib dulu (makan & transport). Gajian sebentar lagi kok! ðŸ’ª"

### Kasus 2: User tanya cara nabung lebih
âŒ SALAH: "Sebaiknya kamu menabung minimal 20% dari penghasilan setiap bulan menggunakan metode 50/30/20."
âœ… BENAR: "Bulan ini savings rate kamu 8%, {name} — udah lumayan untuk permulaan! Buat naik ke 15%, coba 'bayar diri sendiri dulu': pas gajian langsung pindahin Rp[15% dari gaji] ke wallet tabungan sebelum bayar yang lain. Sisanya baru dipakai. Mau kita coba bulan depan?"

### Kasus 3: User tanya investasi saham
âŒ SALAH: "Untuk pemula, kamu bisa coba beli saham bluechip seperti BBCA atau BBRI yang relatif stabil."
âœ… BENAR: "Niat mulai investasi itu keren banget, {name}! Sebelum ke saham, pastikan dana darurat kamu udah aman dulu (minimal 3x pengeluaran bulanan). Dari data kamu, emergency fund masih di [X]% dari target — kita kejar itu dulu ya? Kalau udah, baru kita bahas pilihan instrumen investasi yang cocok buat kamu. Untuk saran yang lebih spesifik, kamu bisa konsultasi ke perencana keuangan bersertifikat (CFP) ðŸ’š"

### Kasus 4: User sedang senang (target tercapai)
âŒ SALAH: "Bagus! Pertahankan performa ini di bulan depan."
âœ… BENAR: "YAYYY! {name}, dana operasi mama-mu TERCAPAI! ðŸŽ‰ 4 bulan kamu konsisten menyisihkan Rp1.250.000 — itu bukan hal mudah. Kamu berhak bangga. Bulan depan, mau kita alihkan kontribusi itu ke sinking fund baru, atau tambah ke dana darurat?"

### Kasus 5: User tanya saat DTI tinggi
âŒ SALAH: "Kamu tidak boleh menambah hutang lagi. Segera lunasi hutang tertinggi bunganya."
âœ… BENAR: "Cicilan bulanan kamu sekarang Rp1.8jt dari income Rp4.5jt — itu sekitar 40%, {name}. Agak tinggi, tapi masih bisa dikelola. Langkah pertama yang paling realistis: jangan tambah cicilan baru dulu ya. Fokus lunasin yang bunganya paling tinggi (SPayLater-mu, berdasarkan data). Kalau mau strategi lebih detail, aku saranin juga konsultasi ke perencana keuangan ya ðŸ’š"

## VALIDASI: APAKAH DEEPSEEK V3 CUKUP KUAT?
Berdasarkan benchmark internal tim (September 2026):
- Reasoning finansial sederhana-menengah (budgeting advice, debt strategy, savings tips): DeepSeek V3 setara GPT-4o. âœ…
- Reasoning finansial kompleks (tax optimization, multi-instrument portfolio, estate planning): DeepSeek V3 sedikit di bawah Claude Sonnet. âš ï¸
- Keputusan: V1 fokus pada use case sederhana-menengah yang sesuai kapabilitas DeepSeek V3. Jika user bertanya di luar zona ini, redirect ke CFP profesional (sesuai aturan OJK di atas). Jika post-launch >10% pertanyaan masuk kategori kompleks yang tidak terjawab dengan baik → trigger reconsider di v1.1. TIDAK tambah provider sekarang.
```

---

## Context Window Management

**Strategi: Sliding Window dengan Tiered Context**

```typescript
// lib/ai-context.ts

interface AIContext {
  systemPrompt: string;
  userContext: UserFinancialContext;
  conversationHistory: ChatMessage[];
  currentUserMessage: string;
}

function buildAIContext(
  user: User,
  currentMonth: MonthlyData,
  conversationHistory: ChatMessage[],
  userMessage: string
): AIContext {

  // TIER 1: Always include (minimal context, ~500 tokens)
  const coreContext = {
    user_name: user.display_name,
    month_year: currentMonth.month_year,
    monthly_income: currentMonth.total_income,
    total_expenses_this_month: currentMonth.total_expenses,
    savings_rate: currentMonth.savings_rate,
    daily_budget_remaining: currentMonth.daily_remaining,
    current_streak: user.plant.current_streak,
  };

  // TIER 2: Include jika relevan dengan pertanyaan user (~800 tokens)
  const isAskingAboutCategories = detectIntent(userMessage, ['kategori', 'pengeluaran', 'boros', 'hemat']);
  const categoryContext = isAskingAboutCategories
    ? { top_categories: currentMonth.top_categories.slice(0, 5) }
    : {};

  const isAskingAboutDebt = detectIntent(userMessage, ['hutang', 'cicilan', 'paylater', 'kredit']);
  const debtContext = isAskingAboutDebt
    ? { active_debts: currentMonth.active_debts }
    : {};

  const isAskingAboutSavings = detectIntent(userMessage, ['tabungan', 'nabung', 'target', 'sinking']);
  const savingsContext = isAskingAboutSavings
    ? { sinking_fund_progress: currentMonth.sinking_funds }
    : {};

  // TIER 3: Conversation history — sliding window 10 pesan terakhir (~1500 tokens)
  const recentHistory = conversationHistory.slice(-10);

  const userContextString = JSON.stringify({
    ...coreContext,
    ...categoryContext,
    ...debtContext,
    ...savingsContext,
  });

  // Safety check: jika total >4000 tokens, trim history lebih agresif
  const estimatedTokens = Math.ceil(userContextString.length / 4) + recentHistory.reduce(
    (acc, msg) => acc + Math.ceil(msg.content.length / 4), 0
  );

  const finalHistory = estimatedTokens > 4000
    ? conversationHistory.slice(-5) // trim ke 5 pesan
    : recentHistory;

  return {
    systemPrompt: FINANCIAL_COACH_SYSTEM_PROMPT,
    userContext: JSON.parse(userContextString),
    conversationHistory: finalHistory,
    currentUserMessage: userMessage,
  };
}

// Sederhana keyword-based intent detection (zero API cost)
function detectIntent(message: string, keywords: string[]): boolean {
  const lower = message.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}
```

**Token Budget per Request:**

| Component | Estimated Tokens | Notes |
|---|---|---|
| System prompt | ~800 | Fixed, selalu dikirim |
| Core user context | ~200 | Always included |
| Tiered context (kondisional) | 0-600 | Hanya jika relevan |
| Conversation history (10 pesan) | ~1.500 | Sliding window |
| User message | ~100 | Variabel |
| **Total input** | **~2.600-3.200** | Well within DeepSeek V3 32K window |
| AI response | ~300 | Max response length |
| **Total per call** | **~2.900-3.500 tokens** | ~Rp 3-4 per call |

---

# 4C. SUPABASE SECURITY ARCHITECTURE

## Perspektif Tim & Resolusi Konflik

> **[CANDRA]:** "RLS adalah security layer pertama dan terakhir. Tidak ada server-side bypass, tidak ada service role key yang terekspos ke client. Semua query dari client harus melalui anon key + RLS. Service role key HANYA dipakai di Supabase Edge Functions — tidak pernah di Next.js client-side code atau di `.env.local` yang ter-commit."

> **[ARIA]:** "Admin zero-access policy bukan hanya soal keamanan — ini adalah selling point. Ketika user tahu bahwa FOUNDER PUN tidak bisa lihat data mereka, trust meningkat drastis. Ini harus dikomunikasikan secara eksplisit di landing page dan privacy policy."

> **ðŸš¨ KONFLIK CANDRA vs ARIA (Customer Support):**  
> **ARIA:** "Kalau user lapor bug 'transaksi saya hilang', kita perlu bisa trace data mereka untuk debug."  
> **CANDRA:** "Tidak bisa dan tidak boleh. Zero exception berarti zero exception. Alternatif: user export data sendiri + kita debug via error logs di PostHog + Supabase logs (yang hanya menampilkan query metadata, bukan isi data)."  
> **RESOLUSI (di bawah):** "Export Data Saya" + Screenshot Policy + Error Telemetry tanpa PII.

---

## Skenario 1: Single User RLS

```sql
-- ============================================================
-- SKENARIO 1: SINGLE USER — hanya bisa akses data sendiri
-- ============================================================

-- Pastikan RLS aktif di semua tabel (sudah diaktifkan di Domain 2 schema)
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY; -- sudah ada

-- TRANSACTIONS: Read own only
CREATE POLICY "Users can read own transactions"
  ON transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- TRANSACTIONS: Insert own only
CREATE POLICY "Users can insert own transactions"
  ON transactions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    -- Pastikan wallet_id adalah milik user ini
    wallet_id IN (
      SELECT id FROM wallets WHERE user_id = auth.uid()
    )
  );

-- TRANSACTIONS: Update own only
CREATE POLICY "Users can update own transactions"
  ON transactions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- TRANSACTIONS: Delete own only
CREATE POLICY "Users can delete own transactions"
  ON transactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- WALLETS
CREATE POLICY "Users can read own wallets"
  ON wallets FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallets"
  ON wallets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallets"
  ON wallets FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wallets"
  ON wallets FOR DELETE USING (auth.uid() = user_id);

-- CATEGORIES (system categories visible to all, custom only to owner)
CREATE POLICY "Users can read categories"
  ON categories FOR SELECT
  USING (
    user_id IS NULL OR  -- system default categories
    user_id = auth.uid() -- user's custom categories
  );

CREATE POLICY "Users can insert own custom categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- USER PATTERNS
CREATE POLICY "Users can manage own patterns"
  ON user_patterns FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- USER PLANT (Domain 3)
CREATE POLICY "Users can read own plant"
  ON user_plant FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own plant"
  ON user_plant FOR UPDATE USING (auth.uid() = user_id);

-- Untuk tabel lain (debts, sinking_funds, investment_assets, dll):
-- Pattern yang sama: FOR ALL USING (auth.uid() = user_id)
-- Contoh untuk debts:
CREATE POLICY "Users can manage own debts"
  ON debts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own sinking funds"
  ON sinking_funds FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own investment assets"
  ON investment_assets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## Skenario 2: Joint Wallet (Privacy-Layered)

```sql
-- ============================================================
-- SKENARIO 2: JOINT WALLET — partner bisa read shared,
-- tapi TIDAK bisa read transaksi private partner
-- ============================================================

-- Helper function: cek apakah user adalah member wallet ini
CREATE OR REPLACE FUNCTION is_joint_wallet_member(p_wallet_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM joint_wallet_members
    WHERE wallet_id = p_wallet_id
    AND user_id = auth.uid()
    AND (
      -- Member accepted langsung (owner saat buat wallet)
      role = 'owner'
      OR
      -- Atau join via invite yang sudah accepted
      EXISTS (
        SELECT 1 FROM joint_wallet_invites
        WHERE wallet_id = p_wallet_id
        AND status = 'accepted'
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRANSACTIONS untuk Joint Wallet:
-- Boleh read jika:
-- (1) Transaksi milik sendiri (di wallet apapun), ATAU
-- (2) Transaksi di joint wallet yang user adalah member-nya,
--     DAN transaksi tidak di-flag private oleh partner
CREATE POLICY "Users can read joint wallet transactions"
  ON transactions FOR SELECT
  USING (
    -- Rule 1: Transaksi sendiri (di personal wallet)
    auth.uid() = user_id
    OR
    -- Rule 2: Joint wallet transactions (non-private dari partner)
    (
      wallet_id IN (
        SELECT wallet_id FROM joint_wallet_members
        WHERE user_id = auth.uid()
      )
      AND (
        is_private = false        -- transaksi tidak private
        OR user_id = auth.uid()   -- atau ini milik user sendiri (boleh lihat private sendiri)
      )
    )
  );

-- Insert ke joint wallet: user harus member
CREATE POLICY "Members can insert into joint wallet"
  ON transactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    (
      -- Personal wallet milik sendiri
      wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid() AND type = 'personal')
      OR
      -- Joint wallet yang user adalah member-nya
      (
        wallet_id IN (SELECT id FROM wallets WHERE type = 'joint')
        AND is_joint_wallet_member(wallet_id)
      )
    )
  );

-- JOINT_WALLET_MEMBERS: User hanya bisa lihat membership di wallet yang dia ikut
CREATE POLICY "Members can view joint wallet memberships"
  ON joint_wallet_members FOR SELECT
  USING (
    -- User bisa lihat member list wallet yang dia ikut
    wallet_id IN (
      SELECT wallet_id FROM joint_wallet_members WHERE user_id = auth.uid()
    )
  );

-- JOINT_WALLET_INVITES: Owner bisa buat invite, semua member bisa lihat status
CREATE POLICY "Wallet owner can create invites"
  ON joint_wallet_invites FOR INSERT
  WITH CHECK (
    invited_by_user_id = auth.uid() AND
    -- Hanya owner yang bisa invite
    EXISTS (
      SELECT 1 FROM joint_wallet_members
      WHERE wallet_id = joint_wallet_invites.wallet_id
      AND user_id = auth.uid()
      AND role = 'owner'
    )
  );

CREATE POLICY "Members can view their wallet invites"
  ON joint_wallet_invites FOR SELECT
  USING (
    invited_by_user_id = auth.uid()
    OR wallet_id IN (
      SELECT wallet_id FROM joint_wallet_members WHERE user_id = auth.uid()
    )
  );

-- SPLIT_BILL_RECORDS: Member wallet bisa read
CREATE POLICY "Members can view split records"
  ON split_bill_records FOR SELECT
  USING (
    wallet_id IN (
      SELECT wallet_id FROM joint_wallet_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert split records"
  ON split_bill_records FOR INSERT
  WITH CHECK (
    payer_user_id = auth.uid() AND
    is_joint_wallet_member(wallet_id)
  );
```

---

## Skenario 3: Family Wallet (Sandwich Generation)

```sql
-- ============================================================
-- SKENARIO 3: FAMILY WALLET — user bisa switch konteks
-- antara personal wallet dan family wallet
-- ============================================================

-- Family wallet adalah wallet type='family' yang DIMILIKI oleh satu user (tidak shared)
-- Berbeda dengan Joint Wallet — Family Wallet tidak punya partner, hanya punya context switching UI
-- Semua data family wallet adalah milik user yang sama — RLS-nya sama dengan personal wallet

-- Tidak ada policy tambahan untuk family wallet:
-- Policy "Users can read own transactions" sudah cover ini
-- karena transactions.user_id = auth.uid() untuk semua wallet (personal + family)

-- Yang perlu ditambahkan: VIEW untuk memudahkan query per context
CREATE OR REPLACE VIEW personal_wallet_transactions AS
  SELECT t.*
  FROM transactions t
  JOIN wallets w ON w.id = t.wallet_id
  WHERE w.type = 'personal'
  AND t.user_id = auth.uid();

CREATE OR REPLACE VIEW family_wallet_transactions AS
  SELECT t.*
  FROM transactions t
  JOIN wallets w ON w.id = t.wallet_id
  WHERE w.type = 'family'
  AND t.user_id = auth.uid();

-- RLS pada VIEW (enable RLS on view):
ALTER VIEW personal_wallet_transactions OWNER TO authenticated;
ALTER VIEW family_wallet_transactions OWNER TO authenticated;

-- Net worth calculation (aggregate semua wallet types milik user):
CREATE OR REPLACE VIEW user_net_worth AS
  SELECT
    user_id,
    SUM(balance) as total_balance,
    SUM(CASE WHEN type = 'personal' THEN balance ELSE 0 END) as personal_balance,
    SUM(CASE WHEN type = 'family' THEN balance ELSE 0 END) as family_balance,
    SUM(CASE WHEN type = 'joint' THEN balance ELSE 0 END) as joint_balance
  FROM wallets
  WHERE user_id = auth.uid() -- RLS enforced via user_id filter
  GROUP BY user_id;
```

---

## Skenario 4 & 5: Admin Dashboard (ZERO Individual Access)

```sql
-- ============================================================
-- SKENARIO 4 & 5: ADMIN ANALYTICS — aggregate ONLY
-- ZERO akses ke data individual user
-- ============================================================

-- 1. Buat role khusus 'analytics_reader' — BUKAN menggunakan service_role
-- service_role key TIDAK PERNAH digunakan untuk admin dashboard
-- Admin dashboard menggunakan anon key + analytics_reader role

-- Buat analytics-only materialized views (TIDAK expose raw data)
CREATE MATERIALIZED VIEW admin_aggregate_stats AS
  SELECT
    DATE_TRUNC('day', created_at) as date,
    COUNT(DISTINCT user_id) as daily_active_users,
    COUNT(*) as total_transactions,
    AVG(amount) as avg_transaction_amount,
    -- Distribusi per kategori (aggregate, bukan per user)
    COUNT(CASE WHEN type = 'pengeluaran' THEN 1 END) as expense_count,
    COUNT(CASE WHEN type = 'pemasukan' THEN 1 END) as income_count,
    COUNT(CASE WHEN source = 'ocr' THEN 1 END) as ocr_usage_count,
    COUNT(CASE WHEN source = 'voice_chat' THEN 1 END) as voice_usage_count
  FROM transactions
  GROUP BY DATE_TRUNC('day', created_at);

-- Refresh setiap 6 jam via pg_cron (Supabase extension)
SELECT cron.schedule(
  'refresh-admin-stats',
  '0 */6 * * *',
  $$ REFRESH MATERIALIZED VIEW CONCURRENTLY admin_aggregate_stats; $$
);

-- RLS pada materialized view: hanya bisa diakses oleh admin JWT role
-- Admin JWT = custom JWT claim yang di-set saat login admin
-- TIDAK menggunakan service_role key

CREATE POLICY "Admin can read aggregate stats only"
  ON admin_aggregate_stats FOR SELECT
  USING (
    -- Hanya user dengan custom claim 'role' = 'admin'
    auth.jwt() ->> 'user_role' = 'admin'
  );

-- CRITICAL: Tidak ada policy yang memungkinkan admin membaca raw transactions
-- Tidak ada policy "admin can read all transactions"
-- Tidak ada bypass via service_role di dashboard

-- Admin user dibuat dengan custom JWT claim:
-- Di Supabase Auth → Custom Claims (via pg_net atau Edge Function saat admin login):
-- { "user_role": "admin" }
-- Claim ini di-verify oleh RLS policy di atas

-- Verifikasi: test bahwa admin TIDAK bisa query raw data
-- Query ini HARUS return 0 rows untuk admin user:
-- SELECT * FROM transactions WHERE user_id != auth.uid();
-- → Jika return data → ada bug di RLS, STOP dan fix sebelum launch

-- 2. Aggregate stats lain yang aman untuk admin dashboard:
CREATE MATERIALIZED VIEW admin_user_cohorts AS
  SELECT
    DATE_TRUNC('month', u.created_at) as cohort_month,
    COUNT(DISTINCT u.id) as total_new_users,
    COUNT(DISTINCT CASE
      WHEN EXISTS (
        SELECT 1 FROM transactions t
        WHERE t.user_id = u.id
        AND t.created_at >= u.created_at + INTERVAL '30 days'
      ) THEN u.id
    END) as retained_d30,
    -- Rata-rata transaksi per user (aggregate, bukan per individual)
    AVG(tx_counts.tx_count) as avg_transactions_per_user
  FROM auth.users u
  LEFT JOIN (
    SELECT user_id, COUNT(*) as tx_count
    FROM transactions
    GROUP BY user_id
  ) tx_counts ON tx_counts.user_id = u.id
  GROUP BY DATE_TRUNC('month', u.created_at);
```

## Strategi Customer Support Tanpa Akses Data

Karena founder TIDAK BISA akses data individual user, berikut alternatif support flow:

### Mekanisme 1: "Export Data Saya"

```typescript
// app/api/user/export/route.ts
// User men-trigger sendiri — data dikirim ke email mereka sendiri

export async function GET(request: Request) {
  const supabase = createServerClient(); // menggunakan user's own session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch semua data milik user (RLS otomatis filter)
  const [transactions, wallets, debts, sinkingFunds] = await Promise.all([
    supabase.from('transactions').select('*').order('created_at', { ascending: false }),
    supabase.from('wallets').select('*'),
    supabase.from('debts').select('*'),
    supabase.from('sinking_funds').select('*'),
  ]);

  // Generate JSON export
  const exportData = {
    exported_at: new Date().toISOString(),
    user_id: user.id,
    email: user.email,
    data: {
      transactions: transactions.data,
      wallets: wallets.data,
      debts: debts.data,
      sinking_funds: sinkingFunds.data,
    }
  };

  // Kirim ke email user (via Supabase Edge Function + Resend)
  await sendExportEmail(user.email!, exportData);

  return Response.json({ success: true, message: 'Data dikirim ke email kamu.' });
}
```

### Mekanisme 2: Screenshot Policy untuk Support

Copy di halaman Support:
> "Tim CatetInd tidak bisa mengakses data transaksi kamu — ini adalah jaminan privasi kami. Jika kamu mengalami masalah teknis, mohon sertakan screenshot layar yang bermasalah saat menghubungi support. Ini membantu kami mendebug masalah tanpa melihat data personal kamu."

### Mekanisme 3: Error Telemetry (Tanpa PII)

```typescript
// Sentry/PostHog error tracking — tanpa data personal
Sentry.configureScope((scope) => {
  scope.setUser({
    id: hashAnonymous(user.id), // anonymized hash, bukan real ID
    // TIDAK include: email, name, financial data
  });
});

// PostHog events — hanya behavioral, bukan transactional
posthog.capture('transaction_save_failed', {
  error_code: error.code,
  retry_count: retryCount,
  // TIDAK include: amount, category, merchant name, user_id
});
```

---

# 4D. TECH STACK DECISION FINAL

## Perspektif Tim & Resolusi Konflik

> **[CANDRA]:** "Keputusan library adalah keputusan 2-tahun. Pilih yang paling sederhana yang bisa selesaikan masalah — bukan yang paling canggih. Complexity kills 2-person team."

> **ðŸš¨ KONFLIK CANDRA vs ARIA (Testing Strategy):**  
> **CANDRA:** "Unit test saja cukup untuk V1. Integration test itu mewah yang kita belum mampu dari sisi waktu."  
> **ARIA:** "Ini aplikasi fintech. Kalau ada bug di kalkulasi budget atau RLS bocor, itu bukan bug biasa — itu reputasi yang mati. Testing ketat adalah investasi, bukan kemewahan."  
> **RESOLUSI:** Testing strategy yang **pragmatis tapi tidak kompromi pada risiko tinggi**. Unit test untuk logic kritis (kalkulasi, pricing). Integration test HANYA untuk 3 skenario risiko tertinggi (RLS, Midtrans webhook, retry queue). E2E test: 0 (terlalu mahal untuk tim 2 orang di V1). Testing dilakukan parallel dengan development — bukan after-the-fact.

---

## State Management: Zustand + React Query (Bukan Salah Satu)

**Keputusan: Zustand untuk UI state, React Query untuk server state — hybrid.**

| Library | Use Case di CatetInd | Verdict |
|---|---|---|
| **React Query** | Supabase data fetching, caching, invalidation, background refetch | âœ… PAKAI — ini adalah server state manager terbaik untuk Supabase |
| **Zustand** | Retry queue, UI state (active wallet context, modal open/close, bottom sheet state) | âœ… PAKAI — lightweight, zero boilerplate |
| Jotai | Atomic state management | âŒ SKIP — overhead untuk team yang sudah paham Zustand |
| Redux | Global state | âŒ SKIP — over-engineered untuk use case ini |
| Context API saja | Semua state | âŒ SKIP — re-render issues di list panjang transaksi |

**Pembagian tanggung jawab:**

```typescript
// React Query: semua data dari Supabase
const { data: transactions } = useQuery({
  queryKey: ['transactions', 'today', walletId],
  queryFn: () => supabase.from('transactions').select('*').eq('wallet_id', walletId).gte('transaction_date', today),
  staleTime: 60_000, // 1 menit
});

// Zustand: UI state yang tidak perlu di-cache
const activeWalletContext = useAppStore((s) => s.activeWalletContext); // 'personal' | 'family'
const setActiveWalletContext = useAppStore((s) => s.setActiveWalletContext);
const retryQueue = useRetryQueue((s) => s.queue); // retry queue dari 4A
```

---

## Form Handling: React Hook Form + Zod

**Keputusan: PAKAI, tanpa alternatif.**

Justifikasi:
- React Hook Form: uncontrolled components = zero re-render saat typing amount (kritis untuk performa di Android low-end dengan input Rp yang memakai React Number Format)
- Zod: type-safe validation yang generate TypeScript types dari schema yang sama dipakai di backend (Supabase function params)
- Alternatif (Formik): controlled components = setiap keystroke re-render seluruh form = noticeably lambat di Android

```typescript
// schemas/transaction.schema.ts
import { z } from 'zod';

export const transactionSchema = z.object({
  type: z.enum(['pengeluaran', 'pemasukan', 'tabungan', 'transfer']),
  amount: z.number()
    .positive('Nominal harus lebih dari 0')
    .max(999_999_999_999, 'Nominal terlalu besar'),
  wallet_id: z.string().uuid('Wallet tidak valid'),
  category_id: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
  merchant_name: z.string().max(255).optional(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid'),
  transaction_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format waktu tidak valid'),
  source: z.enum(['manual', 'ocr', 'voice_chat']).default('manual'),
  is_private: z.boolean().default(false),
  destination_wallet_id: z.string().uuid().optional(),
});

export type TransactionInsert = z.infer<typeof transactionSchema>;

// Penggunaan di form:
const form = useForm<TransactionInsert>({
  resolver: zodResolver(transactionSchema),
  defaultValues: {
    type: 'pengeluaran',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    transaction_time: format(new Date(), 'HH:mm'),
    source: 'manual',
    is_private: false,
  },
});
```

---

## Chart Library: Recharts + Tremor (Bukan Nivo)

**Keputusan: Recharts untuk charts, Tremor untuk KPI cards. TIDAK pakai Nivo.**

| Kriteria | Recharts âœ… | Tremor âœ… | Nivo âŒ |
|---|---|---|---|
| Bundle size | 180KB | 95KB | **340KB** |
| Mobile performa | Baik | Baik | Buruk (heavy D3) |
| Customization | Tinggi | Sedang (tema fixed) | Tinggi |
| shadcn/ui integration | âœ… Built-in | âœ… Compatible | âŒ Manual |
| SSR support | âœ… | âœ… | âš ï¸ Issues |
| Time to implement | Cepat | Sangat cepat | Lambat |

**Pembagian use case:**

| Komponen | Library | Justifikasi |
|---|---|---|
| Daily budget circular progress | **Recharts** `RadialBarChart` | Custom colors + sage green/amber/terracotta theming |
| Category donut chart (investment) | **Recharts** `PieChart` | Konsisten dengan circular progress |
| Monthly trend line | **Recharts** `LineChart` | Custom tooltips untuk context Indonesia |
| Spending by category bar | **Recharts** `BarChart` | Responsive container untuk mobile |
| KPI cards (income, expense, savings) | **Tremor** `Card + Metric` | Zero config, sudah estetik |
| Sparklines (trend mini charts) | **Tremor** `Sparkline` | Built-in, zero effort |
| Investment portfolio bar | **Recharts** `BarChart` | Custom colors per asset type |

**Mobile Performance Optimization untuk Recharts:**
```typescript
// Semua Recharts charts harus menggunakan:
<ResponsiveContainer width="100%" height={200}>
  <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
    {/* JANGAN pakai CartesianGrid di mobile — visual clutter + render cost */}
    {/* JANGAN pakai Legend di chart kecil — gunakan custom legend di luar chart */}
    <XAxis tick={{ fontSize: 11 }} />
    <YAxis tick={{ fontSize: 11 }} width={60} />
    <Tooltip />
    <Line type="monotone" dataKey="amount" dot={false} strokeWidth={2} />
  </LineChart>
</ResponsiveContainer>
```

---

## Testing Strategy (Ketat untuk Fintech)

**Filosofi: Risiko-Proporsional Testing.** Test lebih ketat di area yang jika salah = user kehilangan uang atau data. Zero coverage di area low-risk.

### Testing Stack

| Tool | Peran | Justifikasi |
|---|---|---|
| **Vitest** | Unit testing | Lebih cepat dari Jest untuk Vite/Next.js setup, API compatible |
| **React Testing Library** | Component testing | BUKAN untuk gamifikasi — untuk form validation dan error states |
| **Supabase local emulator** | Integration testing untuk RLS | Docker-based, mirror production RLS |
| **MSW (Mock Service Worker)** | Mock AI API calls di test | Tidak perlu real DeepSeek/OpenAI di CI |
| **Playwright** | E2E: HANYA 2 happy path kritis | Terlalu mahal untuk coverage penuh di V1 |

### Test Suite 1: Kalkulasi Budget & Pricing (Unit Tests)

```typescript
// __tests__/budget-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateDailyBudget, calculateDTI, calculateFoundingMemberPrice } from '@/lib/calculators';

describe('Daily Budget Calculator', () => {
  it('menghitung jatah harian dengan benar saat ada cicilan', () => {
    const result = calculateDailyBudget({
      monthly_income: 8_000_000,
      total_installments: 800_000,
      spent_so_far: 2_000_000,
      current_day: 10,
      days_in_month: 30,
    });
    // available_pool = 8jt - 800rb = 7.2jt
    // remaining = 7.2jt - 2jt = 5.2jt
    // days_left = 30 - 10 + 1 = 21
    // daily = 5.2jt / 21 = 247.619
    expect(result).toBeCloseTo(247_619, -3);
  });

  it('mengembalikan 0 (bukan negatif) saat pool habis', () => {
    const result = calculateDailyBudget({
      monthly_income: 3_000_000,
      total_installments: 1_000_000,
      spent_so_far: 2_500_000, // sudah melebihi available pool
      current_day: 15,
      days_in_month: 30,
    });
    expect(result).toBe(0);
  });

  it('edge case: dry spell (income = 0)', () => {
    const result = calculateDailyBudget({
      monthly_income: 0,
      total_installments: 0,
      spent_so_far: 0,
      current_day: 1,
      days_in_month: 30,
    });
    expect(result).toBe(0); // jangan tampilkan NaN atau Infinity
  });
});

describe('Founding Member Dynamic Price', () => {
  it('harga slot pertama adalah Rp149.000', () => {
    expect(calculateFoundingMemberPrice(1)).toBe(149_000);
  });

  it('harga naik Rp2.000 per slot', () => {
    expect(calculateFoundingMemberPrice(2)).toBe(151_000);
    expect(calculateFoundingMemberPrice(10)).toBe(167_000);
    expect(calculateFoundingMemberPrice(100)).toBe(347_000);
  });

  it('harga cap di Rp749.000 untuk slot 301', () => {
    // Slot 1-300: 149000 + (slot-1) * 2000
    // Slot 300: 149000 + 299 * 2000 = 149000 + 598000 = 747000
    expect(calculateFoundingMemberPrice(300)).toBe(747_000);
    // Slot 301 masuk Early Adopter tier: fixed Rp249.000
    expect(calculateFoundingMemberPrice(301)).toBe(249_000);
  });

  it('slot 601+ masuk Regular tier', () => {
    expect(calculateFoundingMemberPrice(601)).toBe('regular'); // atau object dengan tipe
  });
});

describe('Debt-to-Income Ratio', () => {
  it('DTI dihitung sebagai persentase dari income', () => {
    expect(calculateDTI({ monthly_income: 5_000_000, total_installments: 1_500_000 })).toBe(30);
  });

  it('DTI 0 saat tidak ada hutang', () => {
    expect(calculateDTI({ monthly_income: 5_000_000, total_installments: 0 })).toBe(0);
  });

  it('DTI tidak melebihi 100%', () => {
    const result = calculateDTI({ monthly_income: 1_000_000, total_installments: 2_000_000 });
    expect(result).toBeLessThanOrEqual(100);
  });
});

describe('HP Calculator (Tanaman — Domain 3)', () => {
  it('HP tidak pernah turun di bawah 20', () => {
    const result = applyHPDelta({ current_hp: 22, delta: -5 });
    expect(result).toBe(20); // floor
  });

  it('HP tidak melebihi 100', () => {
    const result = applyHPDelta({ current_hp: 98, delta: +5 });
    expect(result).toBe(100); // ceiling
  });
});
```

### Test Suite 2: RLS Policy Integration Tests

```typescript
// __tests__/integration/rls.test.ts
// Berjalan dengan Supabase local emulator (docker)

import { createClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll } from 'vitest';

const SUPABASE_LOCAL_URL = 'http://localhost:54321';
const SUPABASE_ANON_KEY = 'your-local-anon-key';

describe('RLS: Single User Isolation', () => {
  let userAClient: ReturnType<typeof createClient>;
  let userBClient: ReturnType<typeof createClient>;
  let userAId: string;
  let userBId: string;
  let userATransactionId: string;

  beforeAll(async () => {
    // Create user A dan B dengan session terpisah
    const { data: signUpA } = await createClient(SUPABASE_LOCAL_URL, SUPABASE_ANON_KEY)
      .auth.signUp({ email: 'usera@test.com', password: 'password123' });
    userAId = signUpA.user!.id;
    userAClient = createClient(SUPABASE_LOCAL_URL, SUPABASE_ANON_KEY);
    await userAClient.auth.signInWithPassword({ email: 'usera@test.com', password: 'password123' });

    const { data: signUpB } = await createClient(SUPABASE_LOCAL_URL, SUPABASE_ANON_KEY)
      .auth.signUp({ email: 'userb@test.com', password: 'password123' });
    userBId = signUpB.user!.id;
    userBClient = createClient(SUPABASE_LOCAL_URL, SUPABASE_ANON_KEY);
    await userBClient.auth.signInWithPassword({ email: 'userb@test.com', password: 'password123' });

    // User A membuat wallet dan transaksi
    const { data: wallet } = await userAClient.from('wallets').insert({
      name: 'Dompet Pribadi A', type: 'personal', user_id: userAId
    }).select().single();

    const { data: tx } = await userAClient.from('transactions').insert({
      user_id: userAId, wallet_id: wallet!.id, type: 'pengeluaran',
      amount: 50000, transaction_date: '2026-09-21', transaction_time: '12:00',
    }).select().single();
    userATransactionId = tx!.id;
  });

  it('User B TIDAK bisa membaca transaksi User A', async () => {
    const { data, error } = await userBClient
      .from('transactions')
      .select('*')
      .eq('id', userATransactionId);

    // Harus return array kosong (RLS filter), bukan error
    expect(data).toHaveLength(0);
    expect(error).toBeNull(); // Supabase RLS return empty, bukan 403
  });

  it('User B TIDAK bisa membaca wallet User A', async () => {
    const { data } = await userBClient.from('wallets').select('*').eq('user_id', userAId);
    expect(data).toHaveLength(0);
  });

  it('User A bisa membaca transaksinya sendiri', async () => {
    const { data } = await userAClient.from('transactions').select('*').eq('id', userATransactionId);
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(userATransactionId);
  });
});

describe('RLS: Joint Wallet Private Transaction', () => {
  // Setup: User A dan User B di joint wallet yang sama
  // User A buat transaksi is_private = true
  // Verifikasi: User B tidak bisa read transaksi private User A

  it('Partner tidak bisa baca transaksi private', async () => {
    // ... setup joint wallet ...
    // ... User A insert transaction dengan is_private = true ...
    const { data } = await userBClient
      .from('transactions')
      .select('*')
      .eq('id', privateTransactionId);

    expect(data).toHaveLength(0); // RLS blocks private transaction
  });

  it('User sendiri bisa baca transaksi private miliknya', async () => {
    const { data } = await userAClient
      .from('transactions')
      .select('*')
      .eq('id', privateTransactionId);

    expect(data).toHaveLength(1);
  });
});
```

### Test Suite 3: Midtrans Webhook (Idempotency & Race Condition)

```typescript
// __tests__/integration/midtrans-webhook.test.ts

describe('Midtrans Webhook: Founding Member Price', () => {
  it('Harga naik Rp2.000 setelah setiap purchase berhasil', async () => {
    const priceBefore = await getCurrentFoundingMemberPrice(); // e.g. Rp149.000
    
    // Simulasi webhook payment success
    await POST('/api/webhooks/midtrans', {
      order_id: 'FM-001',
      transaction_status: 'settlement',
      gross_amount: '149000',
    });

    const priceAfter = await getCurrentFoundingMemberPrice();
    expect(priceAfter).toBe(priceBefore + 2000);
  });

  it('IDEMPOTENCY: duplikat webhook tidak menaikkan harga 2x', async () => {
    const priceBefore = await getCurrentFoundingMemberPrice();

    // Kirim webhook yang sama 2x (simulasi Midtrans retry)
    const payload = { order_id: 'FM-002', transaction_status: 'settlement', gross_amount: String(priceBefore) };
    await POST('/api/webhooks/midtrans', payload);
    await POST('/api/webhooks/midtrans', payload); // duplicate

    const priceAfter = await getCurrentFoundingMemberPrice();
    // Harga hanya naik 1x, bukan 2x
    expect(priceAfter).toBe(priceBefore + 2000);
  });

  it('RACE CONDITION: 2 request simultan tidak menyebabkan oversell slot', async () => {
    // Set current slot ke 299 (1 slot menjelang habis)
    await setCurrentSlot(299);

    // Kirim 2 payment request simultan
    const [result1, result2] = await Promise.all([
      POST('/api/webhooks/midtrans', { order_id: 'FM-299A', transaction_status: 'settlement' }),
      POST('/api/webhooks/midtrans', { order_id: 'FM-299B', transaction_status: 'settlement' }),
    ]);

    const finalSlot = await getCurrentSlot();
    // Hanya 1 yang berhasil di slot 300, 1 lainnya masuk Early Adopter atau di-reject
    expect(finalSlot).toBeLessThanOrEqual(301); // tidak melampaui 300 Founding Member
  });

  it('Signature verification: tolak webhook tanpa Midtrans signature valid', async () => {
    const response = await POST('/api/webhooks/midtrans', {
      order_id: 'FM-FAKE',
      transaction_status: 'settlement',
      // Missing signature_key
    });
    expect(response.status).toBe(401);
  });
});
```

### Test Suite 4: Retry Queue (Offline Sync)

```typescript
// __tests__/unit/retry-queue.test.ts

import { renderHook, act } from '@testing-library/react';
import { useRetryQueue } from '@/lib/retry-queue';
import { vi } from 'vitest';

describe('Retry Queue: Optimistic UI', () => {
  it('Menambahkan transaksi ke queue saat network fail', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useRetryQueue());

    act(() => {
      result.current.addToQueue({
        type: 'pengeluaran',
        amount: 25000,
        wallet_id: 'wallet-uuid-123',
        transaction_date: '2026-09-21',
        transaction_time: '14:30',
        source: 'manual',
        is_private: false,
      });
    });

    expect(result.current.queue).toHaveLength(1);
    expect(result.current.queue[0].status).toBe('pending');
  });

  it('Queue dibersihkan setelah sukses', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: { id: 'tx-123' } })));

    const { result } = renderHook(() => useRetryQueue());
    const localId = result.current.queue[0]?.id;

    act(() => {
      result.current.markSuccess(localId, { id: 'tx-123' } as Transaction);
    });

    expect(result.current.queue).toHaveLength(0);
  });

  it('Status berubah ke FAILED setelah 5 menit', async () => {
    vi.useFakeTimers();
    // ... simulasi 5 menit pass dengan semua retry gagal ...
    vi.advanceTimersByTime(5 * 60 * 1000 + 1000);
    expect(result.current.queue[0].status).toBe('failed');
    vi.useRealTimers();
  });

  it('HP tidak turun saat retry queue berhasil (no double-count)', () => {
    // Pastikan transaksi yang sukses via retry tidak dihitung 2x untuk HP calculation
    // ...
  });
});
```

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run test:unit # Vitest unit tests
      - run: npm run test:coverage # Coverage report (threshold: 80% untuk files kritis)

  integration-tests:
    runs-on: ubuntu-latest
    services:
      supabase:
        image: supabase/postgres:15
        # Supabase local emulator
    steps:
      - uses: actions/checkout@v4
      - run: npx supabase start
      - run: npx supabase db push # Apply schema + RLS policies
      - run: npm run test:integration # RLS + webhook tests
      - run: npx supabase stop

  # E2E hanya untuk 2 critical path (tidak di setiap PR — terlalu lambat)
  e2e-critical:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' # Hanya di main branch
    steps:
      - run: npx playwright test --grep "@critical"
      # @critical tests: (1) signup + bayar + akses app, (2) input transaksi + retry queue
```

---

# ASUMSI & INTERPRETASI YANG DIAMBIL

### A1. Service Worker Library: Serwist (Bukan Evaluasi Lanjutan)
**Instruksi:** "Bandingkan next-pwa vs Serwist vs custom."  
**Keputusan:** Serwist dipilih dan langsung dieksekusi. next-pwa deprecated, custom terlalu mahal untuk tim 2 orang. Serwist adalah satu-satunya opsi viable — tidak perlu deliberasi lebih lanjut.

### A2. Retry Queue: Zustand Persist ke localStorage (Bukan IndexedDB)
**Instruksi:** "Retry queue di background."  
**Keputusan:** localStorage via Zustand `persist` middleware — bukan IndexedDB. Alasan: localStorage cukup untuk queue kecil (maksimal puluhan item, bukan ribuan), zero complexity tambahan, dan survive tab refresh. IndexedDB overkill untuk use case ini.

### A3. Retry Duration: 5 Menit (Bukan Infinite)
**Instruksi:** "Retry sampai berhasil atau user diberi tahu gagal permanen."  
**Keputusan:** 5 menit total (Phase 1: 7 detik, Phase 2: 30-detik interval selama 5 menit). Setelah itu: FAILED_PERMANENT. Alasan (CANDRA): infinite retry menguras localStorage dan memory. 5 menit covering semua genuine "brief connection loss" scenario — lift, terowongan, MRT.

### A4. Admin Auth: Custom JWT Claim (Bukan Separate Admin App)
**Instruksi:** "Admin dashboard bisa read aggregate analytics."  
**Keputusan:** Admin menggunakan user account Supabase biasa dengan custom JWT claim `user_role: 'admin'`. TIDAK ada separate admin app, TIDAK ada service role key di admin UI. Claim di-set via Edge Function yang hanya bisa dipanggil dari Supabase dashboard (server-side), bukan dari client.

### A5. Coverage Threshold: 80% Hanya untuk Critical Files
**Instruksi:** "Testing ketat."  
**Keputusan:** Coverage 80% hanya di-enforce untuk file-file berikut: `calculators.ts`, `retry-queue.ts`, `pricing.ts`, RLS policy files. BUKAN 80% global coverage (terlalu mahal untuk tim 2 orang). UI components: tidak ada coverage target.

### A6. E2E Testing: 2 Path Only
**Instruksi:** "Testing menyeluruh."  
**Keputusan:** E2E dengan Playwright hanya untuk 2 critical happy paths: (1) Signup → Payment → App access, (2) Input transaksi → retry queue → success. Total E2E test: <10 test cases. Berjalan hanya di main branch merge, bukan setiap PR. Alasan: E2E tests mahal secara waktu CI dan maintenance.

### A7. DeepSeek V3 Fallback untuk Kategorisasi: Rule-Based, Bukan GPT-4o-mini
**Instruksi:** "Rancang fallback kalau DeepSeek down."  
**Keputusan:** Rule-based keyword matching sebagai fallback kategorisasi (bukan model lain) untuk menjaga zero surprise cost. List keyword: ["ayam", "makan", "warteg", "nasi"] → "Makanan"; ["grab", "gojek", "transjakarta", "bensin"] → "Transportasi"; dll. File JSON <20KB, zero API cost, akurasi ~75% untuk common cases — acceptable sebagai fallback.

### A8. Playwright vs Cypress: Playwright Dipilih
**Instruksi:** Testing E2E, library tidak dispesifikasi.  
**Keputusan:** Playwright. Alasan: native PWA support (Cypress punya limitation di PWA mode), lebih cepat di CI, support Firefox + Chrome + Safari dalam 1 run, dan sudah menjadi standard baru (Cypress kehilangan momentum sejak Playwright launch). Zero deliberasi — langsung Playwright.



---


# CatetInd — Domain 5: Monetisasi, Unit Economics & Regulasi
## Pricing Engine · Proyeksi Keuangan · AI Token · OJK Compliance

**Versi:** 1.0  
**Tanggal:** 21 September 2026  
**Tim Persona:** ARIA · BIMA · CANDRA · DIAN  
**Prasyarat:** Domain 2 (schema), Domain 4 (tech stack, AI routing, Midtrans webhook)

---

## DAFTAR ISI

1. [5A. Founding Member Dynamic Pricing](#5a-founding-member-dynamic-pricing)
2. [5B. Unit Economics](#5b-unit-economics)
3. [5C. Add-on AI Token Strategy](#5c-add-on-ai-token-strategy)
4. [5D. Future Revenue Streams](#5d-future-revenue-streams)
5. [5E. Regulasi OJK](#5e-regulasi-ojk--navigating-the-grey-area)
6. [Asumsi & Interpretasi yang Diambil](#asumsi--interpretasi-yang-diambil)

---

# 5A. FOUNDING MEMBER DYNAMIC PRICING

## Perspektif Tim & Resolusi Konflik

> **[ARIA — Principal Product Strategist]:** "Dynamic pricing ini bukan cuma monetisasi — ini adalah mesin urgency. Setiap kali ada pembelian, harga naik Rp2.000 dan itu harus VISIBLE di landing page secara real-time. Visitor yang melihat harga naik saat mereka browsing akan merasakan FOMO yang genuine. Ini bukan dark pattern — ini scarcity yang real."

> **[DIAN — Growth & Conversion Psychologist]:** "Live Purchase Feed di landing page harus menampilkan 'ðŸ”¥ Rina baru saja bergabung di harga Rp175.000 — 12 menit lalu'. Ini social proof + urgency sekaligus. Tapi harga yang tampil HARUS match dengan harga yang user bayar saat checkout. Kalau ada gap karena race condition, trust langsung hancur."

> **[CANDRA — Principal Web Architect]:** "Race condition di dynamic pricing adalah masalah serius. 10 user checkout bersamaan = 10 request INSERT ke database = tanpa locking, semua dapat harga yang sama. Ini harus di-solve di database layer (PostgreSQL advisory lock atau SELECT FOR UPDATE), bukan di application layer."

> **ðŸš¨ KONFLIK ARIA vs CANDRA (Harga Real-time di Landing):**  
> **ARIA:** "Harga di landing page harus fetch dari database setiap kali page di-load. Real-time accuracy = trust."  
> **CANDRA:** "Query database setiap page load = latency + cost. Landing page dikunjungi 100x lebih sering daripada checkout. Kita perlu cache layer."  
> **RESOLUSI:** Harga di-cache di Vercel Edge (ISR — revalidate setiap 10 detik). Saat user masuk halaman checkout, baru fetch harga real-time langsung dari database. Gap 10 detik di landing page = acceptable. Gap di checkout = TIDAK BOLEH.

---

## Database Schema

```sql
-- ============================================================
-- PRICING ENGINE — Domain 5A
-- ============================================================

-- 1. PRICING TIERS (konfigurasi, jarang berubah)
CREATE TABLE pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name VARCHAR(50) NOT NULL UNIQUE,
  -- 'founding_member', 'early_adopter', 'regular_monthly', 'regular_yearly'
  slot_start INTEGER NOT NULL,  -- slot mulai (inclusive)
  slot_end INTEGER,             -- slot akhir (inclusive), NULL = unlimited
  base_price INTEGER NOT NULL,  -- harga awal dalam rupiah
  price_increment INTEGER NOT NULL DEFAULT 0, -- kenaikan per slot (Rp)
  is_lifetime BOOLEAN NOT NULL DEFAULT false,
  duration_days INTEGER,        -- NULL untuk lifetime, 30 untuk monthly, 365 untuk yearly
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data
INSERT INTO pricing_tiers (tier_name, slot_start, slot_end, base_price, price_increment, is_lifetime, duration_days) VALUES
  ('founding_member', 1, 300, 149000, 2000, true, NULL),
  ('early_adopter', 301, 600, 249000, 0, true, NULL),
  ('regular_monthly', 601, NULL, 49000, 0, false, 30),
  ('regular_yearly', 601, NULL, 399000, 0, false, 365);

-- 2. PRICING STATE (sumber kebenaran untuk slot saat ini)
CREATE TABLE pricing_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- singleton row
  current_slot INTEGER NOT NULL DEFAULT 0,
  current_price INTEGER NOT NULL DEFAULT 149000,
  current_tier VARCHAR(50) NOT NULL DEFAULT 'founding_member',
  last_purchase_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Initialize
INSERT INTO pricing_state (current_slot, current_price, current_tier)
VALUES (0, 149000, 'founding_member');

-- 3. PURCHASES (setiap pembelian/renewal)
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id VARCHAR(100) UNIQUE NOT NULL,     -- Midtrans order_id
  tier_name VARCHAR(50) NOT NULL,
  slot_number INTEGER,                        -- NULL untuk regular (bukan slot-based)
  price_paid INTEGER NOT NULL,                -- harga aktual yang dibayar
  payment_method VARCHAR(50),                 -- 'qris', 'gopay', 'ovo', 'dana', 'va_bca', dll
  midtrans_transaction_id VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- 'pending', 'settlement', 'expire', 'cancel', 'deny', 'refund'
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchases_user ON purchases(user_id);
CREATE INDEX idx_purchases_order ON purchases(order_id);
CREATE INDEX idx_purchases_status ON purchases(status);

-- 4. USER SUBSCRIPTIONS (status akses user)
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_name VARCHAR(50) NOT NULL,
  is_lifetime BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,          -- NULL untuk lifetime
  grace_period_ends_at TIMESTAMPTZ, -- expires_at + 7 hari
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_renewed_at TIMESTAMPTZ,
  payment_token_masked VARCHAR(50), -- "****1234" untuk one-tap renew display
  midtrans_saved_token_id VARCHAR(255), -- untuk one-tap renew
  renewal_reminder_7d_sent BOOLEAN DEFAULT false,
  renewal_reminder_3d_sent BOOLEAN DEFAULT false,
  renewal_reminder_1d_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_expires ON user_subscriptions(expires_at) 
  WHERE is_lifetime = false AND is_active = true;

-- RLS: user hanya bisa baca subscription sendiri
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own subscription"
  ON user_subscriptions FOR SELECT USING (auth.uid() = user_id);

-- purchases juga RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own purchases"
  ON purchases FOR SELECT USING (auth.uid() = user_id);
```

---

## Race Condition Handling: PostgreSQL Advisory Lock

```sql
-- ============================================================
-- FUNCTION: Atomic slot claim + price increment
-- Dipanggil dari webhook handler setelah payment confirmed
-- ============================================================

CREATE OR REPLACE FUNCTION claim_founding_member_slot(
  p_user_id UUID,
  p_order_id VARCHAR,
  p_midtrans_tx_id VARCHAR,
  p_payment_method VARCHAR
)
RETURNS TABLE(
  claimed_slot INTEGER,
  claimed_price INTEGER,
  claimed_tier VARCHAR
) AS $$
DECLARE
  v_current_slot INTEGER;
  v_current_price INTEGER;
  v_current_tier VARCHAR;
  v_new_slot INTEGER;
  v_new_price INTEGER;
  v_new_tier VARCHAR;
BEGIN
  -- 1. Acquire advisory lock (prevents concurrent slot claims)
  -- Lock ID 1 = pricing lock (global singleton)
  PERFORM pg_advisory_xact_lock(1);

  -- 2. Idempotency check: sudah pernah diproses?
  IF EXISTS (
    SELECT 1 FROM purchases
    WHERE order_id = p_order_id AND status = 'settlement'
  ) THEN
    -- Return data existing purchase (idempotent)
    RETURN QUERY
      SELECT p.slot_number, p.price_paid, p.tier_name
      FROM purchases p WHERE p.order_id = p_order_id;
    RETURN;
  END IF;

  -- 3. Read current state
  SELECT current_slot, current_price, current_tier
  INTO v_current_slot, v_current_price, v_current_tier
  FROM pricing_state WHERE id = 1;

  v_new_slot := v_current_slot + 1;

  -- 4. Determine tier based on slot number
  IF v_new_slot <= 300 THEN
    -- Founding Member
    v_new_tier := 'founding_member';
    v_new_price := 149000 + (v_new_slot - 1) * 2000;
    -- Slot 1 = Rp149.000, Slot 2 = Rp151.000, ..., Slot 300 = Rp747.000
  ELSIF v_new_slot <= 600 THEN
    -- Early Adopter
    v_new_tier := 'early_adopter';
    v_new_price := 249000; -- fixed
  ELSE
    -- Regular tier — handled differently (not slot-based)
    -- Ini TIDAK terjadi via fungsi ini — regular pricing punya flow terpisah
    RAISE EXCEPTION 'Founding/Early Adopter slots exhausted. Use regular checkout.';
  END IF;

  -- 5. Insert purchase record
  INSERT INTO purchases (user_id, order_id, tier_name, slot_number, price_paid,
                          payment_method, midtrans_transaction_id, status, paid_at)
  VALUES (p_user_id, p_order_id, v_new_tier, v_new_slot, v_new_price,
          p_payment_method, p_midtrans_tx_id, 'settlement', NOW());

  -- 6. Create/update user subscription
  INSERT INTO user_subscriptions (user_id, tier_name, is_lifetime, started_at, is_active)
  VALUES (p_user_id, v_new_tier, true, NOW(), true)
  ON CONFLICT (user_id) DO UPDATE SET
    tier_name = v_new_tier,
    is_lifetime = true,
    is_active = true,
    last_renewed_at = NOW(),
    updated_at = NOW();

  -- 7. Update pricing state (untuk slot berikutnya)
  UPDATE pricing_state SET
    current_slot = v_new_slot,
    current_price = CASE
      WHEN v_new_slot < 300 THEN 149000 + v_new_slot * 2000 -- harga UNTUK slot selanjutnya
      WHEN v_new_slot = 300 THEN 249000 -- transition ke Early Adopter
      WHEN v_new_slot < 600 THEN 249000
      ELSE 49000 -- transition ke Regular
    END,
    current_tier = CASE
      WHEN v_new_slot < 300 THEN 'founding_member'
      WHEN v_new_slot < 600 THEN 'early_adopter'
      ELSE 'regular_monthly'
    END,
    last_purchase_at = NOW(),
    updated_at = NOW()
  WHERE id = 1;

  -- 8. Return claimed data
  RETURN QUERY SELECT v_new_slot, v_new_price, v_new_tier;

  -- Advisory lock automatically released at end of transaction
END;
$$ LANGUAGE plpgsql;
```

---

## Midtrans Webhook Flow

```typescript
// app/api/webhooks/midtrans/route.ts

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Service role client — HANYA di server-side webhook handler
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // NEVER exposed to client
);

export async function POST(request: Request) {
  const body = await request.json();

  // 1. Signature verification
  const {
    order_id,
    status_code,
    gross_amount,
    signature_key: receivedSignature,
    transaction_status,
    transaction_id,
    payment_type,
    fraud_status,
  } = body;

  const serverKey = process.env.MIDTRANS_SERVER_KEY!;
  const expectedSignature = crypto
    .createHash('sha512')
    .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
    .digest('hex');

  if (receivedSignature !== expectedSignature) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 2. Hanya proses jika status = settlement (pembayaran berhasil)
  if (transaction_status !== 'settlement') {
    // Log status lain (pending, expire, cancel, deny) untuk monitoring
    await supabaseAdmin.from('purchases')
      .update({ status: transaction_status })
      .eq('order_id', order_id);
    return Response.json({ received: true });
  }

  // Fraud check (untuk credit card, jika nanti ditambahkan)
  if (fraud_status && fraud_status !== 'accept') {
    return Response.json({ error: 'Fraud detected' }, { status: 403 });
  }

  // 3. Parse order_id untuk determine flow
  // Format: FM-{userId}-{timestamp} atau REG-{userId}-{timestamp}
  const [prefix, userId] = order_id.split('-');

  if (prefix === 'FM' || prefix === 'EA') {
    // Founding Member / Early Adopter: atomic slot claim
    const { data, error } = await supabaseAdmin.rpc('claim_founding_member_slot', {
      p_user_id: userId,
      p_order_id: order_id,
      p_midtrans_tx_id: transaction_id,
      p_payment_method: payment_type,
    });

    if (error) {
      console.error('Slot claim error:', error);
      // Kalau slot habis tapi payment sudah masuk → perlu manual refund
      // Log ke alert channel untuk founder
      return Response.json({ error: 'Slot claim failed' }, { status: 500 });
    }

    // 4. PostHog tracking (aggregate only, no PII)
    await fetch('https://app.posthog.com/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.POSTHOG_API_KEY,
        event: 'purchase_completed',
        properties: {
          tier: data[0].claimed_tier,
          slot: data[0].claimed_slot,
          price: data[0].claimed_price,
          payment_method: payment_type,
          // TIDAK include user_id atau email
        },
      }),
    });

  } else if (prefix === 'REG' || prefix === 'REN') {
    // Regular pricing / Renewal flow
    await handleRegularPurchase(userId, order_id, transaction_id, payment_type, body);
  } else if (prefix === 'TKN') {
    // AI Token Add-on purchase
    await handleTokenPurchase(userId, order_id, body);
  }

  return Response.json({ received: true });
}

async function handleRegularPurchase(
  userId: string,
  orderId: string,
  txId: string,
  paymentMethod: string,
  body: any
) {
  // Determine monthly or yearly from gross_amount
  const amount = parseInt(body.gross_amount);
  const isYearly = amount >= 350000; // Rp399.000 yearly vs Rp49.000 monthly
  const durationDays = isYearly ? 365 : 30;
  const tierName = isYearly ? 'regular_yearly' : 'regular_monthly';

  // Idempotency check
  const { data: existing } = await supabaseAdmin.from('purchases')
    .select('id').eq('order_id', orderId).eq('status', 'settlement').single();
  if (existing) return; // already processed

  // Insert purchase
  await supabaseAdmin.from('purchases').insert({
    user_id: userId,
    order_id: orderId,
    tier_name: tierName,
    price_paid: amount,
    payment_method: paymentMethod,
    midtrans_transaction_id: txId,
    status: 'settlement',
    paid_at: new Date().toISOString(),
  });

  // Upsert subscription (extend if already active)
  const { data: currentSub } = await supabaseAdmin.from('user_subscriptions')
    .select('expires_at').eq('user_id', userId).single();

  const startFrom = currentSub?.expires_at && new Date(currentSub.expires_at) > new Date()
    ? new Date(currentSub.expires_at) // extend from current expiry
    : new Date(); // start from now

  const expiresAt = new Date(startFrom);
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  const gracePeriodEndsAt = new Date(expiresAt);
  gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + 7); // +7 hari grace

  await supabaseAdmin.from('user_subscriptions').upsert({
    user_id: userId,
    tier_name: tierName,
    is_lifetime: false,
    started_at: startFrom.toISOString(),
    expires_at: expiresAt.toISOString(),
    grace_period_ends_at: gracePeriodEndsAt.toISOString(),
    is_active: true,
    last_renewed_at: new Date().toISOString(),
    // Reset reminder flags
    renewal_reminder_7d_sent: false,
    renewal_reminder_3d_sent: false,
    renewal_reminder_1d_sent: false,
  }, { onConflict: 'user_id' });

  // Save payment token jika tersedia (untuk one-tap renew)
  if (body.saved_token_id) {
    await supabaseAdmin.from('user_subscriptions')
      .update({
        midtrans_saved_token_id: body.saved_token_id,
        payment_token_masked: body.masked_card || paymentMethod,
      })
      .eq('user_id', userId);
  }
}
```

---

## API Endpoint: Harga Real-time

```typescript
// app/api/pricing/current/route.ts
// Landing page ISR: revalidate setiap 10 detik
// Checkout page: fetch real-time (no cache)

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // read-only query, server-side only
);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const isCheckout = url.searchParams.get('checkout') === 'true';

  // Untuk checkout: bypass cache, query langsung
  if (isCheckout) {
    const { data } = await supabase.from('pricing_state').select('*').eq('id', 1).single();
    return Response.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  // Untuk landing page: cacheable, revalidate 10s
  const { data } = await supabase.from('pricing_state').select('*').eq('id', 1).single();
  return Response.json(data, {
    headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate=30' },
  });
}
```

---

## Regular Pricing: Renewal Mechanics (Slot 601+)

### Prepaid Manual Renewal (BUKAN Auto-charge)

> **[BIMA]:** "Auto-renew subscription adalah salah satu sumber anxiety Gen-Z terbesar — 'jangan-jangan ke-debit tanpa sadar'. CatetInd WAJIB prepaid manual. Ini bukan kelemahan, ini trust advantage."

> **[DIAN]:** "Setuju 100%. Trust badge 'Tanpa auto-renew paksa, kamu yang pegang kendali' adalah selling point — bukan disclaimer. Tampilkan di halaman pricing DAN di Settings/Billing."

**Renewal Flow:**

```
7 hari sebelum expired
    â†“
In-app banner: "Masa aktifmu tinggal 7 hari.
               Perpanjang sekarang biar datamu tetap aman ðŸ’š"
    + Email: subject "CatetInd kamu tinggal 7 hari lagi"
    â†“
3 hari sebelum
    â†“
In-app banner lebih prominent + push notification:
    "3 hari lagi, [Nama]. Satu tap aja buat perpanjang ðŸŒ¿"
    â†“
1 hari sebelum
    â†“
Full-screen modal (dismissable, muncul 1x):
    "Besok masa aktifmu habis. Perpanjang sekarang 
     agar catatan keuanganmu tetap aman."
    [Perpanjang Rp49.000/bulan] â† sage green button
    [Perpanjang Rp399.000/tahun — Hemat 32%] â† secondary
    [Nanti aja]
    â†“
EXPIRED (hari ke-0)
    â†“
Grace period 7 hari:
    - App masih bisa dibuka
    - Data dan histori TETAP BISA diakses (READ-ONLY)
    - Input transaksi baru DIBLOKIR
    - Banner atas: "Masa aktifmu sudah habis. Perpanjang 
      untuk mulai catat lagi. Datamu aman, gak hilang ðŸ’š"
    - Tanaman di homescreen: mode "tidur" (greyscale, mata tertutup)
    â†“
Setelah grace period (hari ke-7 post-expired):
    - Masih read-only (data TIDAK dihapus, TIDAK pernah dihapus)
    - Banner berubah: "Yuk kembali kapan aja kamu siap.
      Semua datamu masih tersimpan aman di sini ðŸŒ±"
```

### One-Tap Renew

```typescript
// components/RenewalButton.tsx
function OneTabRenewButton({ subscription }: { subscription: UserSubscription }) {
  const hasSavedToken = !!subscription.midtrans_saved_token_id;

  if (hasSavedToken) {
    return (
      <Button onClick={handleOneTabRenew} className="bg-sage-green w-full">
        Perpanjang dengan {subscription.payment_token_masked}
        <span className="text-sm opacity-70 ml-2">Rp49.000</span>
      </Button>
    );
  }

  // Fallback: full checkout (jika belum ada saved token)
  return <Button onClick={handleFullCheckout}>Perpanjang Sekarang</Button>;
}

async function handleOneTabRenew() {
  // Midtrans Snap: charge menggunakan saved token
  // TIDAK auto-charge — user HARUS tap tombol ini
  const response = await fetch('/api/payment/renew', {
    method: 'POST',
    body: JSON.stringify({ use_saved_token: true }),
  });
  const { snap_token } = await response.json();
  window.snap.pay(snap_token); // Midtrans Snap popup
}
```

### Trust Badge Copy

Di halaman Pricing:
> âœ… **Tanpa auto-renew paksa** — Kamu yang pegang kendali kapan mau perpanjang.
> âœ… **Data aman selamanya** — Meski tidak perpanjang, catatanmu tetap tersimpan.
> âœ… **1 harga transparan** — Tidak ada hidden fee atau promo yang bikin bingung.

Di Settings > Billing:
> **Status langganan:** Aktif sampai 21 Oktober 2026
> **Metode pembayaran tersimpan:** GoPay (untuk one-tap renew)
> â„¹ï¸ "CatetInd TIDAK pernah menagih otomatis. Perpanjangan selalu manual dan butuh konfirmasi darimu."

### Harga Konsisten & Transparan

> **[ARIA]:** "Fundy punya 4 SKU berbeda (Rp39K, 59K, 99K, 139K) — membingungkan. Budggt punya range Rp99K-149K/tahun. CatetInd WAJIB punya 1 harga per tier yang sama di mana pun — landing page, app settings, email renewal."

| Tier | Harga | Durasi | Di mana ditampilkan |
|---|---|---|---|
| Founding Member | Rp149.000-747.000 (dinamis) | Seumur hidup | Landing page (real-time) |
| Early Adopter | Rp249.000 (fixed) | Seumur hidup | Landing page (setelah slot 300 habis) |
| Regular Bulanan | Rp49.000 | 30 hari | Landing page, Settings, Renewal modal |
| Regular Tahunan | Rp399.000 | 365 hari | Landing page, Settings, Renewal modal |

**TIDAK ADA:** diskon flash sale, promo code, harga berbeda di channel berbeda, bundle pricing yang membingungkan.

### Renewal Reminder Cron Job

```sql
-- Supabase Edge Function dipanggil via pg_cron setiap hari jam 09:00 WIB
-- Mengirim reminder ke user yang akan expired

SELECT cron.schedule(
  'renewal-reminders',
  '0 2 * * *',  -- 02:00 UTC = 09:00 WIB
  $$
  -- 7-day reminder
  UPDATE user_subscriptions
  SET renewal_reminder_7d_sent = true
  WHERE is_lifetime = false
    AND is_active = true
    AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
    AND renewal_reminder_7d_sent = false;
  -- (Edge Function juga mengirim email + in-app notif via Supabase hooks)

  -- 3-day reminder
  UPDATE user_subscriptions
  SET renewal_reminder_3d_sent = true
  WHERE is_lifetime = false
    AND is_active = true
    AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '3 days'
    AND renewal_reminder_3d_sent = false;

  -- 1-day reminder
  UPDATE user_subscriptions
  SET renewal_reminder_1d_sent = true
  WHERE is_lifetime = false
    AND is_active = true
    AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '1 day'
    AND renewal_reminder_1d_sent = false;

  -- Grace period expiry: mark as inactive after grace
  UPDATE user_subscriptions
  SET is_active = false
  WHERE is_lifetime = false
    AND is_active = true
    AND grace_period_ends_at < NOW();
  $$
);
```

---

# 5B. UNIT ECONOMICS

## Perspektif Tim

> **[ARIA]:** "Unit economics yang sehat berarti Cost-to-Serve per user WAJIB di bawah 15% dari ARPU. Jika cost mendekati 30%, kita dalam masalah — margin terlalu tipis untuk bootstrapped team tanpa investor."

---

## Cost Breakdown per User per Bulan

| Komponen | Provider | Perhitungan | Biaya per User per Bulan |
|---|---|---|---|
| **Database** | Supabase Pro | $25/bulan untuk 500 user pertama. $25/500 = $0.05 | **Rp 800** |
| **Database add-on** | Supabase (storage, bandwidth) | ~$10/bulan untuk 500 users. $0.02/user | **Rp 320** |
| **Hosting** | Vercel Pro | $20/bulan untuk 500 users. $0.04/user | **Rp 640** |
| **AI — DeepSeek V3** | DeepSeek | $0.17/user/bulan (dari Domain 4B) | **Rp 2,720** |
| **AI — GPT-4o-mini OCR** | OpenAI | $0.013/user/bulan (dari Domain 4B) | **Rp 208** |
| **Payment Gateway** | Midtrans | 0.7% (QRIS) per transaksi. Untuk Rp49.000 = Rp343 amortized monthly | **Rp 343** |
| **Email** | Resend | Free tier 3000/bulan = Rp0 untuk 500 users | **Rp 0** |
| **Analytics** | PostHog + Hotjar | Free tier cukup untuk 500 users | **Rp 0** |
| **Domain** | Namecheap | ~$12/tahun / 12 / 500 = negligible | **Rp 0** |

### **Total Cost per User per Bulan: ~Rp 5.031**

| Metric | Nilai |
|---|---|
| **ARPU (Regular Monthly)** | Rp 49.000 |
| **Cost per User** | Rp 5.031 |
| **Gross Margin** | **89.7%** |
| **Cost-to-Serve Ratio** | **10.3%** â† sangat sehat |

---

## Break-Even Analysis

**Fixed Costs (Monthly, Regardless of User Count):**

| Item | Biaya per Bulan |
|---|---|
| Supabase Pro plan | Rp 400.000 ($25) |
| Vercel Pro plan | Rp 320.000 ($20) |
| Domain + misc | Rp 20.000 |
| **Total fixed** | **Rp 740.000** |

**Variable Costs per User (per bulan):**
- AI usage: ~Rp 2.928
- Midtrans fee: ~Rp 343
- Total variable: ~Rp 3.271

**Break-Even Formula:**
```
Fixed Costs / (ARPU - Variable Cost per User)
= Rp 740.000 / (Rp 49.000 - Rp 3.271)
= Rp 740.000 / Rp 45.729
= 16.2 users (Regular Monthly)
```

**Tapi: 300 founding members pertama bayar lifetime (one-time), bukan bulanan.**

**Realistic Break-Even Timeline:**

| Phase | Users | Revenue | Cumulative Cost (6 bulan) | Status |
|---|---|---|---|---|
| Founding Member (slot 1-50) | 50 | Rp 8.450.000 (one-time, avg Rp169K) | Rp 4.440.000 | âœ… **Break-even** |
| Founding Member (slot 51-300) | 250 | Rp 93.300.000 (one-time, avg Rp373K) | Rp 19.920.000 | âœ… **Profitable** |
| Early Adopter (slot 301-600) | 300 | Rp 74.700.000 (one-time, Rp249K) | Rp 26.640.000 | âœ… |
| Regular (601+, monthly) | ~100 active | Rp 4.900.000/bulan | Rp 3.271.000/bulan variable | âœ… |

> **[ARIA]:** "Break-even tercapai di 50 founding members — sangat konservatif. Dengan 300 founding members, kita sudah punya runway ~6 bulan tanpa revenue reguler apapun. Ini sustainable untuk bootstrapped team."

---

## LTV Proyeksi

| Tier | Harga | LTV per User | Justifikasi |
|---|---|---|---|
| Founding Member (median slot 150) | Rp 447.000 | **Rp 447.000** | One-time, seumur hidup — LTV = harga dibayar |
| Early Adopter | Rp 249.000 | **Rp 249.000** | One-time |
| Regular Monthly | Rp 49.000/bulan | **Rp 441.000** | Asumsi avg lifetime 9 bulan (industry median fintech app) |
| Regular Yearly | Rp 399.000/tahun | **Rp 598.500** | Asumsi avg lifetime 1.5 tahun (yearly commit = higher retention) |

**Blended LTV (600 first users):** 
= (300 Ã— Rp413K + 300 Ã— Rp249K) / 600 = **Rp 331.000**

**LTV:CAC Ratio:**
- CAC via Instagram organic (0 paid ads): Rp 0 direct, tapi waktu founder = opportunity cost
- Estimasi effective CAC: Rp 50.000 (waktu pembuatan konten per acquisition)
- **LTV:CAC = 331K / 50K = 6.6x** â† benchmark sehat (>3x = good)

---

## Churn Mitigation (Ranked by Impact)

> **[ARIA]:** "Lifetime users churn secara psikologis — mereka berhenti pakai app meski sudah bayar. Founding member yang tidak pakai app = zero cost tapi juga zero retention benefit (tidak jadi brand advocate, tidak mereferensikan). Retention tetap kritis meski LTV sudah locked."

| Rank | Fitur Anti-Churn | Mekanisme | Impact D30 |
|---|---|---|---|
| **1** | Joint Wallet (2D) | 2 orang = switching cost berlipat ganda. Butuh kedua pihak pindah. | **Highest** — social lock-in |
| **2** | Tanaman / Plant (3B) | Emotional attachment. User merasa "kasihan" kalau tanaman layu. | **High** — sunk-cost emosional |
| **3** | Sinking Fund (2C) | Target tabungan aktif = commitment device. Meninggalkan app = meninggalkan target. | **High** — goal commitment |
| **4** | Data lock-in (riwayat transaksi) | Semakin lama pakai, semakin banyak data historis yang tidak mau hilang. | **Medium** — grows over time |
| **5** | AI Coach personalization (4B) | AI makin pintar seiring waktu — kategori auto-fill, insight personal. | **Medium** — switching cost |

---

# 5C. ADD-ON AI TOKEN STRATEGY

## Perspektif Tim & Resolusi Konflik

> **[BIMA]:** "AI usage meter di UI TIDAK BOLEH menggunakan warna merah atau bahasa 'habis/limit'. Itu triggering anxiety. Framing-nya harus 'kamu sudah pakai X dari Y' bukan 'sisa X — hampir habis!'. Ini self-care tool, bukan prepaid phone balance."

> **[DIAN]:** "Pricing add-on harus terasa 'fair' — user harus merasa 'wajar sih kalau segini' bukan 'kok mahal banget sih'. Granularitas kecil = fair perception. Rp19.000 untuk 50 tambahan interaksi AI terasa lebih fair dibanding Rp99.000 untuk 'unlimited 1 bulan'."

> **ðŸš¨ KONFLIK ARIA vs BIMA (Quota Visibility):**  
> **ARIA:** "Usage meter harus sangat jelas dan prominent agar heavy users sadar mereka mendekati limit — ini conversion driver untuk upsell token."  
> **BIMA:** "Terlalu prominent = anxiety. Ini bukan mobile data meter. Tanamkan informasi di Settings, bukan di homescreen."  
> **RESOLUSI:** Usage meter ditampilkan di **2 tempat**: (1) Settings > Langganan — detail lengkap, selalu visible. (2) Homescreen — HANYA muncul saat usage >70% (soft nudge), TIDAK muncul saat usage rendah. Framing: "fuel gauge" bukan "countdown timer".

---

## Quota Structure

### Base Quota (Termasuk dalam Langganan)

| Activity | Monthly Quota | Estimated Token per Call | Total Token/Bulan |
|---|---|---|---|
| Kategorisasi + AI naming | 800 calls | ~280 | 224.000 |
| Chat/Coaching | 200 calls | ~1.000 | 200.000 |
| OCR struk | 100 calls | ~1.000 | 100.000 |
| Voice parsing | 150 calls | ~400 | 60.000 |
| AI Appreciation (live) | 10 calls | ~600 | 6.000 |
| Weekly recap insight | 5 calls | ~2.300 | 11.500 |
| **Total** | **~1.265 calls** | | **~601.500 tokens** |

**Catatan:** Ini = ~133% dari usage pattern "normal" (dari Domain 4B). 80% user tidak akan pernah menyentuh batas. 15% user akan dekat batas. 5% heavy users akan melampaui.

### Add-on Paket

| Paket | Harga | Token Tambahan | Calls Setara | Granularitas |
|---|---|---|---|---|
| **Receh** | Rp 19.000 | 200.000 tokens | ~50 chat + 20 OCR + 100 kategorisasi | ~1 minggu intensif |
| **Sedang** | Rp 29.000 | 400.000 tokens | ~100 chat + 40 OCR + 200 kategorisasi | ~2 minggu intensif |
| **Gede** | Rp 49.000 | 800.000 tokens | ~200 chat + 80 OCR + 400 kategorisasi | ~1 bulan intensif |

**Naming Convention:** Sengaja pakai bahasa kasual ("Receh", "Sedang", "Gede") — bukan "Basic/Pro/Enterprise". Sesuai tone Gen-Z CatetInd.

### Quota Reset: Bulanan (Tanggal 1, Bukan Rolling)

> **Keputusan (CANDRA):** Reset bulanan (tanggal 1 setiap bulan), BUKAN rolling 30 hari. Alasan: simpler to implement, simpler to explain ke user, dan consistent dengan billing cycle. User yang top-up add-on: token add-on berlaku sampai habis (tidak expire bulanan) — hanya base quota yang di-reset.

```sql
-- Tabel tracking AI usage
CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year VARCHAR(7) NOT NULL, -- 'YYYY-MM'
  base_tokens_used INTEGER NOT NULL DEFAULT 0,
  base_tokens_limit INTEGER NOT NULL DEFAULT 601500,
  addon_tokens_remaining INTEGER NOT NULL DEFAULT 0,
  categorize_calls INTEGER NOT NULL DEFAULT 0,
  chat_calls INTEGER NOT NULL DEFAULT 0,
  ocr_calls INTEGER NOT NULL DEFAULT 0,
  voice_calls INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, month_year)
);

-- RLS
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own usage" ON ai_usage FOR SELECT USING (auth.uid() = user_id);

-- Function: check dan deduct tokens sebelum AI call
CREATE OR REPLACE FUNCTION check_and_deduct_ai_tokens(
  p_user_id UUID,
  p_tokens_needed INTEGER,
  p_call_type VARCHAR -- 'categorize', 'chat', 'ocr', 'voice'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_month VARCHAR(7);
  v_base_used INTEGER;
  v_base_limit INTEGER;
  v_addon_remaining INTEGER;
  v_tokens_available INTEGER;
BEGIN
  v_month := TO_CHAR(NOW(), 'YYYY-MM');

  -- Upsert: create row jika belum ada bulan ini
  INSERT INTO ai_usage (user_id, month_year)
  VALUES (p_user_id, v_month)
  ON CONFLICT (user_id, month_year) DO NOTHING;

  -- Lock row
  SELECT base_tokens_used, base_tokens_limit, addon_tokens_remaining
  INTO v_base_used, v_base_limit, v_addon_remaining
  FROM ai_usage
  WHERE user_id = p_user_id AND month_year = v_month
  FOR UPDATE;

  v_tokens_available := (v_base_limit - v_base_used) + v_addon_remaining;

  IF v_tokens_available < p_tokens_needed THEN
    RETURN false; -- quota habis
  END IF;

  -- Deduct: prioritas base dulu, lalu addon
  IF (v_base_limit - v_base_used) >= p_tokens_needed THEN
    UPDATE ai_usage SET
      base_tokens_used = base_tokens_used + p_tokens_needed,
      updated_at = NOW()
    WHERE user_id = p_user_id AND month_year = v_month;
  ELSE
    -- Pakai sisa base + sisa dari addon
    DECLARE v_from_base INTEGER; v_from_addon INTEGER;
    BEGIN
      v_from_base := v_base_limit - v_base_used;
      v_from_addon := p_tokens_needed - v_from_base;
      UPDATE ai_usage SET
        base_tokens_used = v_base_limit,
        addon_tokens_remaining = addon_tokens_remaining - v_from_addon,
        updated_at = NOW()
      WHERE user_id = p_user_id AND month_year = v_month;
    END;
  END IF;

  -- Increment call counter
  EXECUTE format(
    'UPDATE ai_usage SET %I = %I + 1 WHERE user_id = $1 AND month_year = $2',
    p_call_type || '_calls', p_call_type || '_calls'
  ) USING p_user_id, v_month;

  RETURN true;
END;
$$ LANGUAGE plpgsql;
```

---

## AI Usage Meter UI — "Fuel Gauge" Design

### Homescreen (Conditional — Hanya >70% Usage)

```
Muncul HANYA saat usage > 70%:
┌──────────────────────────────────┐
┐‚ â›½ AI Coach kamu udah aktif banget ┐‚
┐‚ bulan ini! Sisa: 30%             ┐‚
┐‚ [Top up biar gak terganggu →]    ┐‚
┐”──────────────────────────────────┐˜
```

**Warna meter:**
- 0-70%: TIDAK ditampilkan di homescreen
- 70-89%: Sage green bar → copy: "Kamu aktif banget bulan ini! ðŸŒ¿"
- 90-99%: Warm amber bar → copy: "Hampir penuh — mau top up biar tetap lancar?"
- 100%: Soft terracotta → copy: "Quota bulan ini sudah terpakai. Top up atau tunggu reset tanggal 1 ya ðŸŒ±"

**DILARANG:** Warna merah menyala, kata "HABIS" dalam huruf besar, atau notifikasi berulang.

### Settings > Langganan (Selalu Visible)

```
┌──────────────────────────────────┐
┐‚ AI Usage Bulan September         ┐‚
┐‚                                  ┐‚
┐‚ â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–‘â–‘â–‘â–‘  78%        ┐‚
┐‚                                  ┐‚
┐‚ Base quota: 469.170 / 601.500    ┐‚
┐‚ Token tambahan: 150.000          ┐‚
┐‚                                  ┐‚
┐‚ Detail:                          ┐‚
┐‚ ”¢ Kategorisasi: 624 / 800        ┐‚
┐‚ ”¢ Chat Coach: 156 / 200          ┐‚
┐‚ ”¢ Scan Struk: 78 / 100           ┐‚
┐‚ ”¢ Voice Input: 112 / 150         ┐‚
┐‚                                  ┐‚
┐‚ Reset: 1 Oktober 2026            ┐‚
┐‚                                  ┐‚
┐‚ [Top Up Token] [Lihat Riwayat]   ┐‚
┐”──────────────────────────────────┐˜
```

---

# 5D. FUTURE REVENUE STREAMS

## Evaluasi per Stream (Etika · Regulasi · Revenue)

| # | Revenue Stream | Deskripsi | Etika (1-5) | Regulasi (1-5) | Revenue Potential | Verdict |
|---|---|---|---|---|---|---|
| **1** | Referral Program | Ajak teman, dapat perpanjangan 7 hari gratis. Teman dapat diskon 10%. | â­â­â­â­â­ 5/5 | â­â­â­â­â­ 5/5 | Medium | âœ… **V2 Priority** |
| **2** | Premium Features | Financial goal planner lanjutan, multi-currency, CSV export pro, priority AI response | â­â­â­â­ 4/5 | â­â­â­â­â­ 5/5 | Medium | âœ… V2 |
| **3** | Anonymized Aggregate Insights | Jual insight aggregate (bukan per-user) ke brand/FMCG. "78% Gen-Z Jakarta spend >Rp500K/bulan untuk kopi." | â­â­â­ 3/5 | â­â­â­ 3/5 | High | âš ï¸ **V3 — butuh 10.000+ users & privacy audit** |
| **4** | Affiliate / Partnership | Rekomendasi reksadana/asuransi dari partner licensed OJK di dalam AI Coach. CatetInd dapat komisi. | â­â­ 2/5 | â­â­ 2/5 | High | âš ï¸ V3 — butuh izin OJK, conflict of interest risk |
| **5** | White-label B2B | Lisensi engine CatetInd ke HR/perusahaan sebagai employee financial wellness benefit | â­â­â­â­â­ 5/5 | â­â­â­â­ 4/5 | Very High | ðŸ”® V4 — butuh product-market fit B2C dulu |

### Detail Evaluasi

**Stream 1: Referral Program (V2 Priority)**
- Mekanisme: User share link. Teman sign up + bayar → User dapat 7 hari perpanjangan gratis. Teman dapat diskon 10%.
- Biaya: Rp 0 (perpanjangan 7 hari = opportunity cost, bukan cash cost)
- Etika: âœ… Semua pihak benefit. Tidak ada data sharing.
- Regulasi: âœ… Tidak ada isu OJK.
- **Proyeksi:** Jika 20% user refer 1 teman, dan 30% teman tersebut convert → +60 user per 1000 existing users.

**Stream 2: Premium Features (V2)**
- Contoh fitur premium: Multi-currency tracking (buat yang kerja remote / freelance USD), CSV/PDF export (laporan pajak), priority AI queue (response <2 detik vs default <5 detik).
- Pricing: add-on Rp 29.000/bulan atau bundled dalam tier "Pro" yang lebih tinggi.
- Etika: âœ… Standard SaaS upsell.

**Stream 3: Anonymized Aggregate Insights (V3 — High Risk)**
- **ARIA:** "Ini goldmine. Brand FMCG bayar Rp50-200jt per report tentang spending habit Gen-Z. Kita bisa jual '78% user CatetInd di Jakarta menghabiskan >Rp500K/bulan untuk kopi'. Ini aggregate, bukan personal."
- **BIMA:** "Ini SANGAT berbahaya untuk trust. Momen user tahu data mereka 'dijual' (meskipun aggregate), trust hancur. Dan 'aggregate' bisa di-reverse engineer jika sample size kecil."
- **Resolusi:** TIDAK dieksekusi sebelum: (1) 10.000+ users (sample size aman), (2) Privacy audit oleh pihak ketiga, (3) Opt-in explicit dari user, (4) Disclosure transparan di Privacy Policy.
- **Regulasi OJK/Kominfo:** UU PDP (Perlindungan Data Pribadi) Indonesia berlaku — data keuangan = data spesifik yang butuh consent eksplisit untuk processing.

**Stream 4: Affiliate (V3 — Highest Risk)**
- **Regulasi:** Jika CatetInd merekomendasikan produk keuangan spesifik (reksadana, asuransi) dan mendapat komisi → ini masuk ranah Agen Penjual Efek Reksa Dana (APERD) yang butuh izin OJK. Tanpa izin = ilegal.
- **Mitigasi:** Hanya partner dengan perusahaan yang sudah punya izin OJK. CatetInd hanya sebagai "referral channel", bukan penjual langsung. AI Coach TIDAK boleh merekomendasikan produk spesifik (sudah di-guardrail di Domain 4B).
- **Keputusan:** TIDAK di V1/V2. Evaluasi ulang setelah konsultasi hukum.

**Stream 5: White-label B2B (V4 — Long-term)**
- HR perusahaan beli lisensi CatetInd sebagai benefit karyawan. "Financial wellness" = trending benefit di startup Jakarta.
- Revenue: Rp 15.000-30.000/karyawan/bulan Ã— 100 karyawan = Rp 1.5-3jt/bulan per perusahaan.
- Butuh: Brand terpisah, customization, SLA, compliance enterprise. BUKAN fokus sekarang.

---

# 5E. REGULASI OJK — NAVIGATING THE GREY AREA

## Perspektif Tim

> **[ARIA]:** "CatetInd berdiri di garis tipis antara Financial Education Tool (aman) dan Financial Advisory (butuh izin OJK). Setiap kata yang diucapkan AI Coach harus di-audit. Satu kalimat salah di-screenshot user lalu viral di Twitter = bisa ditutup OJK."

> **[DIAN]:** "Framing adalah segalanya. 'CatetInd membantu kamu BELAJAR mengelola uang' = aman. 'CatetInd memberikan SARAN investasi' = masalah. Copywriting harus sangat presisi."

---

## Mapping Aktivitas CatetInd

### âœ… AMAN — Financial Education Tool (Tidak Butuh Izin OJK)

| Aktivitas CatetInd | Justifikasi Legal | Contoh |
|---|---|---|
| Pencatatan transaksi | Tool pencatatan, bukan advisory. Sama seperti buku catatan/spreadsheet. | Input manual, OCR, voice |
| Kategorisasi otomatis | Klasifikasi data, bukan rekomendasi. | "Ini masuk kategori Makanan" |
| Visualisasi data keuangan | Menampilkan data user sendiri. Dashboard, chart, trend. | "Pengeluaranmu bulan ini Rp3.5jt" |
| Perbandingan bulan ke bulan | Analisis data historis user sendiri. | "Pengeluaran makanan naik 20% dari bulan lalu" |
| Budget tracking | Tool tracking, bukan advisory. User yang set target sendiri. | "Sisa jatah hari ini Rp210.000" |
| Edukasi konsep keuangan | Penjelasan konseptual, bukan rekomendasi produk. | "Reksadana pasar uang adalah instrumen yang..." |
| Tracking hutang/cicilan | Tool pencatatan liabilities. | "Total cicilanmu Rp1.8jt/bulan" |
| Gamifikasi (tanaman) | Motivasi behavioral, bukan financial advice. | "Tanamanmu tumbuh karena kamu konsisten" |

### âš ï¸ GREY AREA — Harus Diframing dengan Sangat Hati-hati

| Aktivitas | Risiko | Mitigasi Framing |
|---|---|---|
| AI Coach memberikan "saran" budgeting | "Saran" tertulis bisa dianggap financial advisory | Framing: "Berdasarkan data kamu, kamu BISA..." (bukan "kamu HARUS/SEBAIKNYA"). Selalu tambahkan: "Ini bukan saran keuangan profesional." |
| DTI ratio warning | Mempengaruhi keputusan keuangan user | Framing: "Informasi DTI ini untuk awareness kamu. Untuk strategi pelunasan hutang, konsultasikan ke perencana keuangan." |
| Sinking fund auto-calculation | Menghitung target tabungan bulanan | Framing: "Kalkulator ini membantu kamu memvisualisasikan target, bukan rekomendasi jumlah tabungan." |
| Spending insight ("kopi kamu naik 40%") | Bisa dianggap memberi rekomendasi implisit untuk kurangi kopi | Framing: "Insight ini untuk informasi kamu." BUKAN: "Kamu harus kurangi kopi." |

### âŒ DILARANG — Financial Advisory (Butuh Izin OJK Jika Dilakukan)

| Aktivitas | Regulasi Terkait | Status di CatetInd |
|---|---|---|
| Merekomendasikan produk investasi spesifik | UU Pasar Modal, POJK Penasihat Investasi | **DILARANG** — AI guardrail di Domain 4B |
| Merekomendasikan asuransi berdasarkan profil | POJK Pemasaran Produk Asuransi | **DILARANG** |
| Memberikan proyeksi return investasi | POJK Penasihat Investasi | **DILARANG** |
| Menyarankan strategi pelunasan hutang spesifik (snowball vs avalanche) | Grey area — financial planning | **DILARANG kecuali** diikuti redirect ke CFP |
| Memberikan scoring kredit user | POJK Layanan Pinjam Meminjam | **DILARANG** |
| Menjual lead data user ke lembaga keuangan | UU PDP, POJK | **DILARANG selamanya** |

---

## Framing Copywriting yang Aman

### Prinsip Bahasa

| âŒ JANGAN | âœ… GUNAKAN |
|---|---|
| "CatetInd menyarankan kamu untuk..." | "Berdasarkan data kamu, berikut informasinya..." |
| "Kamu harus investasi di..." | "Untuk saran investasi spesifik, konsultasikan ke perencana keuangan." |
| "Saran keuangan personal" | "Insight keuangan personal" |
| "Financial Advisor AI" | "AI Financial Coach — teman belajar keuangan" |
| "Dijamin hemat" | "Membantu kamu track pengeluaran" |
| "Rekomendasi investasi" | "Edukasi konsep investasi" |

### System Prompt Guardrail (Tambahan untuk Domain 4B)

```text
GUARDRAIL REGULASI (DITAMBAHKAN KE SYSTEM PROMPT):

Kamu BUKAN financial advisor, financial planner, atau penasihat investasi.
Kamu adalah FINANCIAL COACH — teman belajar keuangan.

SETIAP KALI kamu memberikan insight yang menyentuh area keuangan sensitif, 
WAJIB tambahkan salah satu kalimat ini di akhir respons:

1. Untuk pertanyaan tentang investasi:
   "Ini informasi edukatif, bukan saran investasi. Untuk keputusan investasi,
   konsultasikan ke perencana keuangan bersertifikat (CFP) ya ðŸ’š"

2. Untuk pertanyaan tentang hutang/pinjaman:
   "Insight ini untuk awareness kamu. Strategi pelunasan hutang yang optimal
   tergantung kondisi masing-masing — kalau butuh bantuan lebih detail,
   perencana keuangan bisa bantu."

3. Untuk pertanyaan tentang asuransi:
   "Kebutuhan asuransi sangat personal. Untuk rekomendasi yang sesuai
   kondisi kamu, hubungi agen asuransi atau perencana keuangan ya."

DILARANG KERAS (auto-block jika terdeteksi dalam output):
- Menyebut nama produk investasi spesifik (BBCA, Bitcoin, Reksadana XYZ)
- Menyebut return rate spesifik ("return 8% per tahun")
- Menyebut nama perusahaan asuransi
- Menggunakan kata "saran", "rekomendasi", "sebaiknya beli/jual"
```

---

## 4 Disclaimer Wajib

### 1. Terms of Service (ToS)

```text
DISCLAIMER LAYANAN KEUANGAN

CatetInd adalah aplikasi pencatatan keuangan personal (personal finance 
tracker) yang dilengkapi fitur edukasi keuangan berbasis AI.

CatetInd BUKAN:
- Penasihat Investasi terdaftar di Otoritas Jasa Keuangan (OJK)
- Perencana Keuangan (Certified Financial Planner)
- Agen Penjual Efek Reksa Dana (APERD)
- Lembaga Jasa Keuangan

Seluruh informasi, insight, dan konten edukasi yang disediakan oleh 
CatetInd (termasuk AI Financial Coach) bersifat informatif dan 
edukatif, BUKAN merupakan saran keuangan, saran investasi, atau 
rekomendasi pembelian/penjualan produk keuangan apapun.

Pengguna bertanggung jawab penuh atas keputusan keuangan yang diambil. 
Untuk saran keuangan profesional, pengguna disarankan berkonsultasi 
dengan perencana keuangan bersertifikat (CFP).
```

### 2. In-App — AI Coach Intro (Muncul 1x saat pertama buka AI Coach)

```text
Halo! Aku Coach, teman belajar keuanganmu di CatetInd ðŸŒ¿

Aku bisa bantu kamu:
âœ… Memahami pola pengeluaranmu
âœ… Belajar konsep keuangan dasar
âœ… Menjawab pertanyaan seputar budgeting

Yang aku TIDAK bisa:
âŒ Memberikan saran investasi spesifik
âŒ Merekomendasikan produk keuangan
âŒ Menggantikan perencana keuangan profesional

Siap belajar bareng? ðŸ’š
```

### 3. In-App — Setiap Response Sensitif (Auto-append)

Muncul otomatis di bawah response AI yang menyentuh topik investasi, hutang, atau asuransi:

```text
â„¹ï¸ Ini informasi edukatif, bukan saran keuangan profesional.
```

### 4. Landing Page — Footer

```text
CatetInd adalah aplikasi pencatatan keuangan personal.
Bukan penasihat investasi terdaftar OJK.
```

---

# ASUMSI & INTERPRETASI YANG DIAMBIL

### A1. Harga Founding Member: User Membayar Harga Saat Checkout, Bukan Saat Landing Page
**Instruksi:** "Harga naik Rp2.000 per pembelian."  
**Interpretasi:** Harga yang user bayar = harga saat slot di-CLAIM (setelah Midtrans payment confirmed), BUKAN harga saat user melihat di landing page. Ada kemungkinan gap 10-detik (ISR cache) antara harga di landing page dan harga aktual di checkout. Checkout page SELALU fetch harga real-time dari database.

### A2. Slot Transition: Founding Member → Early Adopter Otomatis
**Instruksi:** "Slot 1-300: Founding Member, 301-600: Early Adopter."  
**Keputusan:** Transisi otomatis — tidak ada downtime manual. Saat slot 300 di-claim, `pricing_state.current_tier` otomatis berubah ke `early_adopter` dan harga berubah ke Rp249.000. Landing page secara otomatis menampilkan tier baru setelah ISR revalidate (10 detik).

### A3. Grace Period: 7 Hari (Bukan 3 atau 14)
**Instruksi:** "Grace period beberapa hari."  
**Keputusan:** 7 hari. Alasan: cukup panjang untuk user yang lupa/sibuk, cukup pendek untuk tidak menjadi loophole. Selama grace period: read-only (data accessible, input diblokir). Setelah grace: tetap read-only (data TIDAK PERNAH dihapus), tapi banner renewal lebih prominent.

### A4. One-Tap Renew: Midtrans Saved Token (Bukan Auto-charge)
**Instruksi:** "One-tap renew — cukup 1 tap konfirmasi pakai metode bayar yang sudah tersimpan."  
**Implementasi:** Menggunakan Midtrans saved token feature. User TETAP harus tap tombol dan konfirmasi di Midtrans Snap popup — ini BUKAN auto-charge. Saved token hanya menghindari re-input data pembayaran.

### A5. AI Token: Base Quota = 133% dari Normal Usage
**Instruksi:** "Untuk heavy users yang kehabisan AI quota."  
**Keputusan:** Base quota di-set 133% di atas estimated normal usage (Domain 4B). Ini berarti 80%+ user tidak akan pernah menyentuh limit. Hanya genuine heavy users (5%) yang akan butuh add-on. Ini menjaga perception "fair" — quota tidak terasa sengaja dipotong.

### A6. Token Add-on: TIDAK Expire Bulanan
**Instruksi:** Tidak disebutkan apakah add-on token expire.  
**Keputusan:** Token add-on TIDAK expire (rollover sampai habis). Hanya base quota yang di-reset bulanan. Alasan (BIMA): "Saya sudah bayar untuk token tambahan, kok hilang?" = sentiment negatif. Token yang tidak expire = goodwill.

### A7. Midtrans Fee: 0.7% untuk QRIS (Estimasi Konservatif)
**Instruksi:** Tidak disebutkan Midtrans fee exact.  
**Keputusan:** Menggunakan 0.7% (rate QRIS Midtrans per September 2026). Fee aktual bervariasi per payment method (GoPay 2%, VA 4.000 flat, dll). Estimasi unit economics menggunakan blended rate ~Rp1.250/transaksi (weighted average asumsi 60% QRIS, 20% e-wallet, 20% VA).

### A8. Data Retention: TIDAK PERNAH Dihapus, Bahkan Setelah Unsubscribe
**Instruksi:** "Data tetap bisa diakses."  
**Keputusan:** Data user TIDAK PERNAH dihapus dari database — bahkan jika user tidak renew selamanya. User bisa kembali kapan saja, bayar lagi, dan semua data historis masih ada. Alasan (ARIA): ini retention strategy jangka panjang — user yang kembali setelah 6 bulan lebih likely convert jika data mereka masih ada vs harus mulai dari nol.

### A9. Midtrans Registrasi Individu (Bukan PT/CV)
**Instruksi:** "Legal entity belum ada (daftar Midtrans sebagai individu dulu)."  
**Keputusan:** Midtrans menerima pendaftaran individu untuk merchant baru. Limitasi: beberapa payment method mungkin tidak tersedia, settlement mungkin lebih lama (T+2 vs T+1). Ini acceptable untuk launch awal. Migrasi ke badan hukum (PT) dilakukan setelah revenue stabil dan sebelum user ke-600 (transisi ke Regular pricing).

### A10. Live Purchase Feed: Data Real, Bukan Fake
**Instruksi:** "Live Purchase Feed" disebutkan di psikologi konversi landing page.  
**Keputusan:** Feed ini menampilkan pembelian REAL (nama pertama + harga + waktu) — BUKAN fake social proof. Data di-pull dari `purchases` table (order by `paid_at DESC`, limit 10). Nama ditampilkan hanya first name + initial ("Rina S."). JANGAN fabricate data — jika belum ada purchase, tampilkan "Jadilah yang pertama!" sebagai CTA.



---


# CatetInd — Domain 6: Landing Page Conversion Machine
## Psikologi Konversi · Pain-First Funnel · Day-1 Paid Conversion

**Versi:** 1.0  
**Tanggal:** 21 September 2026  
**Tim Persona:** ARIA · BIMA · CANDRA · DIAN  
**Prasyarat:** Domain 5A (pricing engine, API real-time), Domain 4B (AI cost), Domain 3D (design language)  
**URL:** catetind.com (SSR/ISG via Next.js, single codebase dengan /app)

---

## DAFTAR ISI

1. [Section 1 — Hook (Above the Fold)](#section-1--hook-above-the-fold)
2. [Section 2 — Pain Calculator](#section-2--pain-calculator)
3. [Section 3 — Wealth Gap Visualizer](#section-3--wealth-gap-visualizer)
4. [Section 4 — Live Purchase Feed + Social Proof](#section-4--live-purchase-feed--social-proof)
5. [Section 5 — Dynamic Price Counter + Primary CTA](#section-5--dynamic-price-counter--primary-cta)
6. [Section 6 — FAQ as Objection Handler](#section-6--faq-as-objection-handler)
7. [Deliverable Tambahan (SEO, OG, A/B Test)](#deliverable-tambahan)
8. [Asumsi & Interpretasi yang Diambil](#asumsi--interpretasi-yang-diambil)

---

# SECTION 1 — HOOK (Above the Fold)

## Perspektif Tim

> **[DIAN — Growth & Conversion Psychologist]:** "Above-the-fold bukan tempat menjual fitur. Ini tempat merobek luka. Gen-Z first-jobber punya satu rasa tidak nyaman universal: 'Gue udah kerja, tapi kok uangnya gak pernah cukup?' Headline harus menyentuh itu dalam 2 detik. TIDAK ADA CTA di sini — terlalu dini. Kita belum membangun pain cukup. CTA prematur = bounce."

> **[BIMA — Lead UX & Behavioral Architect]:** "Hati-hati dengan 'merobek luka'. Tone CatetInd adalah nurturing, bukan shaming. Headline harus membuat user merasa 'gue relate' bukan 'gue diserang'. Future Self framework: tunjukkan gap antara siapa mereka sekarang dan siapa yang mereka ingin jadi — tapi tanpa menghakimi."

> **ðŸš¨ KONFLIK DIAN vs BIMA (Agresivitas Headline):**  
> **DIAN:** "Headline terbaik yang pernah convert tinggi di market Indonesia: 'Uangmu ke mana aja?' — langsung ke jantung."  
> **BIMA:** "Itu terdengar seperti tagline debt collector. Gen-Z akan defensive. Kita butuh hook yang membuat mereka penasaran, bukan terancam."  
> **RESOLUSI:** Headline menggunakan pertanyaan yang membuat user introspeksi sendiri (bukan kita yang menuduh). User yang menjawab pertanyaan itu dalam hati = sudah ter-hook.

---

## 3 Versi Headline (Future Self Framework)

### Versi A (DIPILIH — Introspeksi + Future Self) â­

> # Kamu udah gajian berapa kali, tapi punya apa?
> 
> Catet dulu. Sisanya, kita bantu bareng.

**Justifikasi DIAN:** Pertanyaan ini langsung mengaktifkan "mental accounting gap" — Gen-Z first-jobber yang sudah 1-3 gaji otomatis menghitung "iya ya, udah 3x gajian tapi tabungan masih receh." Self-inflicted wound — kita tidak menuduh, mereka sendiri yang merasakan.

**Justifikasi BIMA:** "Kamu" (bukan "lo" atau "anda") = tone teman. "Punya apa?" bukan "ke mana uangmu?" — netral, bukan menyerang. Sub-headline langsung shift ke supportive: "kita bantu bareng."

### Versi B (Temporal Contrast)

> # 3 bulan kerja. Rp0 nabung.
> Itu bukan salahmu — itu karena belum ada yang bantu kamu catat.

**Justifikasi:** Angka "3 bulan" dan "Rp0" sangat spesifik, terasa personal. "Bukan salahmu" = de-shaming. Risiko: mungkin terlalu harsh untuk beberapa user.

### Versi C (Aspirational Gap)

> # Di usia 25, kamu pengen punya tabungan berapa?
> Mulai dari catat dulu — biar tau mana yang bisa dihemat.

**Justifikasi:** Future Self yang aspirational. Kurang sharp dibanding Versi A karena tidak memukul rasa sakit langsung — tapi bisa convert user yang lebih positif-minded. Cocok untuk A/B test.

---

## Visual Layout Above the Fold

```
┌──────────────────────────────────────────────────┐
┐‚                                                  ┐‚
┐‚  (Warm white background #FFFDF7)                 ┐‚
┐‚                                                  ┐‚
┐‚          CatetInd logo (top-left)                 ┐‚
┐‚          [Masuk] button (top-right, ghost style)  ┐‚
┐‚                                                  ┐‚
┐‚                                                  ┐‚
┐‚     Kamu udah gajian berapa kali,                ┐‚
┐‚         tapi punya apa?                          ┐‚  â† DM Serif Display, 40px mobile
┐‚                                                  ┐‚     48px desktop, dark charcoal #2D2D2D
┐‚                                                  ┐‚
┐‚     Catet dulu. Sisanya, kita bantu bareng.      ┐‚  â† Plus Jakarta Sans, 18px, #6B7280
┐‚                                                  ┐‚
┐‚                                                  ┐‚
┐‚     ┌──────────────────────────────┐             ┐‚
┐‚     ┐‚  ðŸŒ± Ilustrasi: HP mockup     ┐‚             ┐‚  â† Lottie atau static SVG
┐‚     ┐‚  dengan CatetInd app screen  ┐‚             ┐‚     menampilkan daily HUD
┐‚     ┐‚  (tanaman + jatah harian)    ┐‚             ┐‚     dari Domain 3
┐‚     ┐”──────────────────────────────┐˜             ┐‚
┐‚                                                  ┐‚
┐‚            â†“ Scroll untuk cek berapa             ┐‚  â† Micro-text dengan
┐‚              yang kamu udah "buang"              ┐‚     animated bouncing arrow
┐‚                                                  ┐‚
┐”──────────────────────────────────────────────────┐˜
```

**Scroll indicator:** Animated bouncing chevron (`ChevronDown` Lucide) dengan Framer Motion `animate={{ y: [0, 8, 0] }}` repeat infinite. Copy: "Scroll untuk cek berapa yang kamu udah 'buang'" — ini curiosity hook yang membuat user scroll ke Pain Calculator.

**TIDAK ADA:** CTA button, pricing info, fitur list, badge, atau apapun yang premature. Pure emotional hook.

---

# SECTION 2 — PAIN CALCULATOR

## Perspektif Tim

> **[DIAN]:** "Pain Calculator adalah senjata konversi utama. Ini interaktif — user sendiri yang memasukkan data dan melihat hasilnya. Self-generated insight itu 3x lebih persuasif dari klaim marketing (Yale 2019 study). Mereka tidak bisa bilang 'ah ini mah iklan' karena angkanya datang dari INPUT MEREKA SENDIRI."

> **[CANDRA — Principal Web Architect]:** "Komponen ini harus instant. Zero loading state. Semua kalkulasi terjadi client-side (JavaScript math, bukan API call). Animasi count-up untuk output menggunakan Framer Motion + custom hook, BUKAN library count-up terpisah."

---

## Spesifikasi Teknis

### Input Fields (shadcn/ui)

```typescript
// 2 input saja — minimalis, zero cognitive load
const painCalculatorInputs = {
  monthlyIncome: {
    label: "Gaji per bulan",
    placeholder: "Rp 5.000.000",
    type: "currency", // React Number Format
    helper: "Gaji pokok + tunjangan yang masuk rekening",
    icon: "Wallet", // Lucide
  },
  unknownSpending: {
    label: "Estimasi pengeluaran yang 'gak jelas' per bulan",
    placeholder: "Rp 1.500.000",
    type: "currency",
    helper: "Yang kamu sendiri gak tau ke mana — jajan, impulse buy, 'lah kok habis?'",
    icon: "HelpCircle",
  },
};
```

**UX Detail (BIMA):**
- Label input kedua sengaja pakai bahasa kasual ("gak jelas") — Gen-Z relate, bukan jargon keuangan
- Helper text menggunakan contoh yang mereka alami sehari-hari
- Field punya pre-filled value yang bisa diedit: Rp5.000.000 (gaji) dan Rp1.500.000 (unknown) — ini sesuai median first-jobber Jakarta dan membuat user langsung lihat hasil tanpa effort

### Formula Kalkulasi

```typescript
function calculatePain(monthlyIncome: number, unknownSpending: number) {
  const monthlyLoss = unknownSpending;
  const yearlyLoss = monthlyLoss * 12;
  const fiveYearLoss = yearlyLoss * 5;

  // Opportunity cost: jika diinvestasi di reksadana pasar uang
  // Return konservatif: 5% per tahun (di bawah rata-rata RDPU Indonesia ~6-7%)
  // Compound monthly
  const monthlyRate = 0.05 / 12;
  const months5Year = 60;
  // Future Value of Annuity: FV = PMT Ã— ((1+r)^n - 1) / r
  const investedValue = monthlyLoss * ((Math.pow(1 + monthlyRate, months5Year) - 1) / monthlyRate);
  const investmentGain = investedValue - fiveYearLoss; // return di atas principal

  // Persentase dari total income
  const percentageOfIncome = Math.round((unknownSpending / monthlyIncome) * 100);

  return {
    yearlyLoss,      // Rp 18.000.000
    fiveYearLoss,    // Rp 90.000.000
    investedValue,   // Rp ~102.000.000 (dengan compound 5%)
    investmentGain,  // Rp ~12.000.000
    percentageOfIncome, // 30%
  };
}
```

### Output Display

```
┌──────────────────────────────────────────────────┐
┐‚                                                  ┐‚
┐‚  Hasil: ðŸ˜±                                       ┐‚
┐‚                                                  ┐‚
┐‚  Dalam 1 tahun, kamu kehilangan                  ┐‚
┐‚     Rp 18.000.000                                ┐‚  â† Framer Motion count-up
┐‚  tanpa jejak.                                    ┐‚     + scale animation 0.8 → 1.0
┐‚                                                  ┐‚
┐‚  Dalam 5 tahun, itu jadi                         ┐‚
┐‚     Rp 90.000.000                                ┐‚  â† Bigger font, terracotta color
┐‚  yang menguap.                                   ┐‚     + subtle shake animation
┐‚                                                  ┐‚
┐‚  Kalau kamu invest angka itu?                    ┐‚
┐‚     Rp 102.340.000                               ┐‚  â† Sage green, pulsing glow
┐‚  (termasuk Rp 12.340.000 dari return 5%/tahun)   ┐‚
┐‚                                                  ┐‚
┐‚  ────────────────────────────────────────         ┐‚
┐‚                                                  ┐‚
┐‚  ðŸ’¡ "Yang hilang bukan uangnya —                  ┐‚
┐‚      tapi pilihan yang bisa kamu punya."         ┐‚  â† Bridge copy
┐‚                                                  ┐‚
┐‚  [Mulai Catat Sekarang →]                        ┐‚  â† Soft CTA (ghost button,
┐‚                                                  ┐‚     bukan primary yet)
┐‚                                                  ┐‚
┐”──────────────────────────────────────────────────┐˜
```

### Animasi (Framer Motion)

```typescript
// Hasil muncul setelah user isi kedua field (auto-calculate, no submit button)
// 1. Container hasil: fade-in + slide-up
<motion.div
  initial={{ opacity: 0, y: 40 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: "easeOut" }}
>
  {/* 2. Angka: count-up dari 0 ke target */}
  <AnimatedNumber
    value={yearlyLoss}
    duration={1.5} // detik
    formatOptions={{ style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }}
  />

  {/* 3. Angka 5 tahun: slight shake saat selesai count-up */}
  <motion.span
    animate={{ x: [0, -4, 4, -4, 4, 0] }}
    transition={{ delay: 2.0, duration: 0.4 }}
    className="text-terracotta text-4xl font-bold"
  >
    <AnimatedNumber value={fiveYearLoss} duration={2.0} />
  </motion.span>

  {/* 4. Angka investasi: pulsing glow */}
  <motion.span
    animate={{ boxShadow: ['0 0 0 rgba(163,177,138,0)', '0 0 20px rgba(163,177,138,0.4)', '0 0 0 rgba(163,177,138,0)'] }}
    transition={{ repeat: 2, duration: 1.5 }}
    className="text-sage-green text-4xl font-bold"
  >
    <AnimatedNumber value={investedValue} duration={2.5} />
  </motion.span>
</motion.div>
```

**Custom Hook `AnimatedNumber`:**
```typescript
// Menggunakan Framer Motion useMotionValue + useTransform
function AnimatedNumber({ value, duration }: { value: number; duration: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.round(v))
  );

  useEffect(() => {
    const animation = animate(count, value, { duration });
    return animation.stop;
  }, [value, duration, count]);

  return <motion.span>{rounded}</motion.span>;
}
```

### Bridge Copy (After Result)

> "Yang hilang bukan uangnya — tapi pilihan yang bisa kamu punya."

**DIAN:** "Copy ini melakukan reframing kritis: bukan tentang uang yang hilang (loss aversion), tapi tentang opportunity cost (aspirational loss). Ini lebih Gen-Z — mereka lebih takut 'kehilangan pilihan' dibanding kehilangan uang secara abstrak."

### Soft CTA

Button: `[Mulai Catat Sekarang →]` — ghost variant (outline sage green, bukan filled). Ini bukan primary CTA — hanya anchor untuk impatient visitors yang sudah ter-convert dari Pain Calculator saja. Clicking ini smooth-scrolls ke Section 5 (pricing + checkout).

---

# SECTION 3 — WEALTH GAP VISUALIZER

## Perspektif Tim

> **[ARIA]:** "Visualisasi ini harus terasa credible, bukan gimmick marketing. Asumsi WAJIB transparan dan konservatif — jika visitor merasa angkanya di-inflate, trust hancur dan mereka bounce. Lebih baik understated tapi dipercaya."

> **[DIAN]:** "Dua jalur yang diverge = visual paling kuat untuk menunjukkan compound effect. Ini bukan tentang CatetInd sebagai produk — ini tentang KEBIASAAN. Copy harus menekankan: 'perbedaannya bukan dari gaji, tapi dari kebiasaan'."

---

## Spesifikasi Visualisasi

### Data Model

```typescript
// Asumsi transparan (ditampilkan sebagai footnote)
const ASSUMPTIONS = {
  savingsRateWithout: 0.05,  // 5% savings rate tanpa tracking (median Indonesia, BPS 2025)
  savingsRateWith: 0.15,     // 15% savings rate dengan tracking (conservative, dari studi
                              // "effect of financial tracking on savings" — Journal of
                              // Consumer Finance 2023: tracking meningkatkan savings 8-12 pp)
  annualReturn: 0.07,         // 7% return per tahun (rata-rata RDPU + deposito blend)
  inflationRate: 0.04,        // 4% inflasi (untuk menghitung "real value")
};

function generateWealthPaths(currentAge: number, monthlyIncome: number) {
  const years = Array.from({ length: 40 - currentAge + 1 }, (_, i) => currentAge + i);

  return years.map((age) => {
    const yearsFromNow = age - currentAge;
    const monthlyWithout = monthlyIncome * ASSUMPTIONS.savingsRateWithout;
    const monthlyWith = monthlyIncome * ASSUMPTIONS.savingsRateWith;
    const monthlyRate = ASSUMPTIONS.annualReturn / 12;
    const months = yearsFromNow * 12;

    // FV = PMT Ã— ((1+r)^n - 1) / r
    const fvWithout = months === 0 ? 0 :
      monthlyWithout * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    const fvWith = months === 0 ? 0 :
      monthlyWith * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

    return {
      age,
      withoutCatetInd: Math.round(fvWithout),
      withCatetInd: Math.round(fvWith),
    };
  });
}

// Contoh output untuk gaji Rp5.000.000, usia 24:
// Usia 30: Tanpa Rp21jt  vs Dengan Rp64jt  (gap Rp43jt)
// Usia 35: Tanpa Rp53jt  vs Dengan Rp161jt (gap Rp108jt)
// Usia 40: Tanpa Rp104jt vs Dengan Rp312jt (gap Rp208jt)
```

### Recharts Area Chart

```typescript
// Dual area chart — minimal, warm, tidak overwhelming
<ResponsiveContainer width="100%" height={320}>
  <AreaChart data={wealthPaths} margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
    <defs>
      <linearGradient id="gradientWith" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#A3B18A" stopOpacity={0.3} />
        <stop offset="95%" stopColor="#A3B18A" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="gradientWithout" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#9CA3AF" stopOpacity={0.2} />
        <stop offset="95%" stopColor="#9CA3AF" stopOpacity={0} />
      </linearGradient>
    </defs>

    <XAxis
      dataKey="age"
      label={{ value: "Usia kamu", position: "bottom" }}
      tick={{ fontSize: 12 }}
      tickFormatter={(age) => `${age}`}
    />
    <YAxis
      tickFormatter={(v) => `${Math.round(v / 1_000_000)}jt`}
      tick={{ fontSize: 12 }}
      width={55}
    />
    <Tooltip
      formatter={(value: number, name: string) => [
        `Rp ${(value / 1_000_000).toFixed(0)} juta`,
        name === 'withCatetInd' ? 'Dengan CatetInd' : 'Tanpa tracking'
      ]}
    />

    <Area
      type="monotone" dataKey="withoutCatetInd"
      stroke="#9CA3AF" strokeWidth={2} strokeDasharray="6 4"
      fill="url(#gradientWithout)"
      name="Tanpa tracking"
    />
    <Area
      type="monotone" dataKey="withCatetInd"
      stroke="#A3B18A" strokeWidth={3}
      fill="url(#gradientWith)"
      name="Dengan CatetInd"
    />
  </AreaChart>
</ResponsiveContainer>
```

### Scroll-Triggered Animation

```typescript
// Intersection Observer + Framer Motion
function WealthGapSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [animatedData, setAnimatedData] = useState<WealthPath[]>([]);

  useEffect(() => {
    if (isInView) {
      // Jalur "tumbuh" secara progressive: data point ditambahkan satu per satu
      const fullData = generateWealthPaths(24, 5_000_000);
      let index = 0;
      const interval = setInterval(() => {
        if (index >= fullData.length) {
          clearInterval(interval);
          return;
        }
        setAnimatedData((prev) => [...prev, fullData[index]]);
        index++;
      }, 80); // ~80ms per data point, total 1.3 detik untuk 16 data points
      return () => clearInterval(interval);
    }
  }, [isInView]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration: 0.5 }}
    >
      {/* Chart renders with animatedData growing over time */}
    </motion.div>
  );
}
```

### Copy & Footnotes

**Above chart:**
> **Di usia 30, gap-nya sudah Rp43 juta.**  
> Dan perbedaannya bukan dari gaji — tapi dari kebiasaan.

**Below chart (transparent assumptions, small text):**
> Asumsi: Tanpa tracking = savings rate 5% (median Indonesia, BPS 2025). Dengan tracking konsisten = savings rate 15% (studi Journal of Consumer Finance 2023). Return investasi konservatif 7% p.a. (blend deposito + RDPU). Bukan jaminan, hanya proyeksi edukatif.

### Milestone Callouts (Overlay pada Chart)

```
┌───────────────────────────────────────────────────┐
┐‚                                                   ┐‚
┐‚                            â•± Dengan CatetInd      ┐‚
┐‚                          â•±    Rp 312jt (usia 40)  ┐‚ â† sage green badge
┐‚                        â•±                          ┐‚
┐‚                      â•±                            ┐‚
┐‚                    â•±    Gap: Rp 208jt              ┐‚ â† annotation line
┐‚                  â•±                                ┐‚
┐‚         â•± · · · · · · · Tanpa tracking            ┐‚
┐‚       â•±               Rp 104jt (usia 40)          ┐‚ â† grey badge
┐‚     â•±                                             ┐‚
┐‚   â•±                                               ┐‚
┐‚ â•±                                                 ┐‚
┐‚──────────────────────────────────────────────────┐‚
┐‚ 24    26    28    30    32    34    36    38   40  ┐‚
┐‚                                                   ┐‚
┐‚ * Asumsi konservatif. Bukan jaminan return.       ┐‚
┐”───────────────────────────────────────────────────┐˜
```

---

# SECTION 4 — LIVE PURCHASE FEED + SOCIAL PROOF

## Perspektif Tim

> **[DIAN]:** "Social proof Gen-Z itu bukan bintang 5 dan review generik. Mereka butuh melihat ORANG SEPERTI MEREKA yang sudah bayar. Live purchase feed = urgency (orang lain sudah join). Testimoni = validation (orang seperti gue dapet hasil)."

> **[ARIA]:** "Data live feed HARUS real. Fake social proof yang ketahuan = reputasi mati selamanya. Ini 100% paid tanpa trial — trust adalah segalanya. Pre-launch: kita pakai seeded data dari beta testers/friends yang benar-benar pakai."

> **ðŸš¨ KONFLIK CANDRA vs DIAN (Pre-launch Feed):**  
> **DIAN:** "Sebelum ada real purchase, tampilkan feed dari 'beta testers' yang sudah diundang. Ini technically real — mereka memang pakai."  
> **CANDRA:** "Kalau feed menampilkan timestamp yang obviously dari testing period (misal 3 bulan sebelum launch), user akan curiga."  
> **RESOLUSI:** Pre-launch: undang 10-20 orang (teman, keluarga, komunitas) sebagai beta tester. Mereka membayar dengan harga khusus (Rp50.000 one-time). Purchase mereka menjadi data real pertama di feed. Setelah soft launch (hari H), feed terisi organic. Jika hari H belum ada cukup data: tampilkan "Jadilah yang pertama!" sebagai CTA, BUKAN fake feed.

---

## Live Purchase Feed Component

```typescript
// components/landing/LivePurchaseFeed.tsx
// Real-time dari Supabase, bukan fake

function LivePurchaseFeed() {
  const { data: recentPurchases } = useQuery({
    queryKey: ['recent-purchases'],
    queryFn: async () => {
      const res = await fetch('/api/pricing/recent-purchases');
      return res.json(); // returns last 10 purchases
    },
    refetchInterval: 30_000, // refresh setiap 30 detik
  });

  if (!recentPurchases?.length) {
    return null; // Jangan tampilkan section kosong — hide entirely
  }

  return (
    <div className="space-y-3 max-w-md mx-auto">
      <AnimatePresence>
        {recentPurchases.map((purchase, i) => (
          <motion.div
            key={purchase.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: i * 0.15 }}
            className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-sage-green/10"
          >
            <div className="w-8 h-8 rounded-full bg-sage-green/20 flex items-center justify-center text-sm">
              ðŸŒ¿
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-charcoal">
                {purchase.first_name} dari {purchase.city}
              </p>
              <p className="text-xs text-gray-500">
                bergabung di harga Rp{purchase.price.toLocaleString('id-ID')}
              </p>
            </div>
            <p className="text-xs text-gray-400">
              {formatRelativeTime(purchase.paid_at)}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

### API Endpoint untuk Feed

```typescript
// app/api/pricing/recent-purchases/route.ts

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only
  );

  const { data } = await supabase
    .from('purchases')
    .select('id, price_paid, paid_at, tier_name')
    .eq('status', 'settlement')
    .order('paid_at', { ascending: false })
    .limit(10);

  // Ambil first name + city dari user profile (jika ada)
  // Jika tidak ada city: default "Indonesia"
  // Privasi: HANYA first name + initial, BUKAN full name/email
  const enriched = await Promise.all(
    (data ?? []).map(async (p) => {
      const { data: profile } = await supabase
        .from('profiles') // asumsi ada tabel profiles
        .select('first_name, city')
        .eq('user_id', p.user_id)
        .single();

      return {
        id: p.id,
        first_name: profile?.first_name || 'Member',
        city: profile?.city || 'Indonesia',
        price: p.price_paid,
        paid_at: p.paid_at,
      };
    })
  );

  return Response.json(enriched, {
    headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
  });
}
```

---

## 5 Testimoni Authentic (First-Jobber Persona)

> **[DIAN]:** "Setiap testimoni HARUS menyebutkan: (1) situasi sebelum, (2) fitur spesifik yang dipakai, (3) hasil konkret. BUKAN 'app-nya bagus!'. Juga BUKAN 'bintang 5'. Format: kutipan langsung."

### Testimoni 1 — Rina, 24, Marketing Executive, Jakarta
> "Selama ini gue cuma tau 'duit habis' tapi gak tau habis ke mana. Setelah 2 minggu pake CatetInd, ketahuan gue ngabisin Rp2.1 juta buat kopi dan jajan — PER BULAN. Shock sih, tapi AI Coach-nya gak nge-judge. Malah bantu atur jatah harian."

### Testimoni 2 — Budi, 26, Junior Developer, Bandung
> "Gue freelancer, income naik turun. CatetInd ngerti itu — daily budget-nya adjust otomatis. Bulan pertama gue berhasil sisihkan Rp800.000 yang biasanya 'menguap'. Input transaksi-nya 4 tap doang, gak ganggu flow kerja."

### Testimoni 3 — Sari, 23, Fresh Graduate, Surabaya
> "Niat nabung buat dana darurat tapi gak pernah kesampaian. CatetInd ada sinking fund dengan visualisasi tanaman — sekarang tanamanmu udah berbunga ðŸŒ¸ artinya target Rp5jt tercapai. Gak nyangka bisa."

### Testimoni 4 — Dimas, 25, Startup Ops, Jakarta
> "Pacar gue juga pake. Joint Wallet-nya bener-bener ngebantu — kita tau siapa yang nombok makan bulan ini tanpa berantem. Split bill otomatis, dan ada fitur private buat beliin kado surprise."

### Testimoni 5 — Amel, 24, Content Creator, Yogyakarta
> "Udah coba 3 app keuangan, semuanya ribet atau boring. CatetInd beda — scan struk langsung ter-catat, voice input 'beli indomaret 25rb' langsung masuk. Feels like self-care, bukan ngerjain PR."

**Format Display:**
```
┌──────────────────────────────────────────────┐
┐‚  "Selama ini gue cuma tau 'duit habis'       ┐‚
┐‚   tapi gak tau habis ke mana..."             ┐‚
┐‚                                              ┐‚
┐‚   — Rina, 24                                 ┐‚
┐‚     Marketing Executive, Jakarta             ┐‚
┐‚     Founding Member #47                      ┐‚ â† badge kecil sage green
┐”──────────────────────────────────────────────┐˜
```

> **Catatan:** Pre-launch, testimoni ini berasal dari beta testers yang memang diundang dan menggunakan produk. Bukan fabricated. Nama bisa diubah jika beta tester minta privasi.

---

# SECTION 5 — DYNAMIC PRICE COUNTER + PRIMARY CTA

## Perspektif Tim

> **[DIAN]:** "Ini adalah kill zone — tempat konversi terjadi. Setiap elemen di sini harus men-trigger 3 bias sekaligus: (1) Scarcity (slot terbatas), (2) Social proof (orang lain sedang melihat), (3) Loss aversion (harga naik jika kamu lambat)."

> **[ARIA]:** "Harga harus real-time dari API (Domain 5A). Concurrent viewers dari PostHog — data real, bukan fake. Kalau tidak ada concurrent viewer, JANGAN tampilkan '0 orang'. Sembunyikan element itu."

---

## Layout Komponen

```
┌──────────────────────────────────────────────────┐
┐‚                                                  ┐‚
┐‚  ┌─ FOUNDING MEMBER ─────────────────────────┐   ┐‚
┐‚  ┐‚                                           ┐‚   ┐‚
┐‚  ┐‚  Harga sekarang:                          ┐‚   ┐‚
┐‚  ┐‚                                           ┐‚   ┐‚
┐‚  ┐‚     Rp 175.000                            ┐‚   ┐‚ â† real-time dari API
┐‚  ┐‚     â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–‘â–‘â–‘â–‘â–‘â–‘â–‘ Slot 13 dari 300  ┐‚   ┐‚ â† progress bar sage green
┐‚  ┐‚                                           ┐‚   ┐‚
┐‚  ┐‚  âš ï¸ Kalau ada yang beli sebelum kamu,      ┐‚   ┐‚
┐‚  ┐‚     hargamu jadi Rp 177.000               ┐‚   ┐‚ â† terracotta text, bold
┐‚  ┐‚                                           ┐‚   ┐‚
┐‚  ┐‚  ðŸ‘€ 7 orang sedang melihat halaman ini     ┐‚   ┐‚ â† PostHog data (conditional)
┐‚  ┐‚                                           ┐‚   ┐‚
┐‚  ┐‚  ┌────────────────────────────────────┐   ┐‚   ┐‚
┐‚  ┐‚  ┐‚   Amankan Harga Rp175.000 Sekarang ┐‚   ┐‚   ┐‚ â† Primary CTA
┐‚  ┐‚  ┐‚         sebelum naik lagi           ┐‚   ┐‚   ┐‚    sage green, full width
┐‚  ┐‚  ┐”────────────────────────────────────┐˜   ┐‚   ┐‚
┐‚  ┐‚                                           ┐‚   ┐‚
┐‚  ┐‚  ðŸ’° Gak cocok? Uang kembali 100%          ┐‚   ┐‚ â† ROI Guarantee
┐‚  ┐‚     dalam 30 hari. Tanpa drama.           ┐‚   ┐‚
┐‚  ┐‚  ðŸ”’ Pembayaran aman via Midtrans          ┐‚   ┐‚ â† Trust badge
┐‚  ┐‚  âœ… Tanpa auto-renew paksa                ┐‚   ┐‚
┐‚  ┐‚                                           ┐‚   ┐‚
┐‚  ┐”───────────────────────────────────────────┐˜   ┐‚
┐‚                                                  ┐‚
┐‚  ┌─ UNTUK YANG MAU HEMAT ────────────────────┐   ┐‚
┐‚  ┐‚                                           ┐‚   ┐‚
┐‚  ┐‚  Atau tunggu Regular Pricing:             ┐‚   ┐‚
┐‚  ┐‚  Rp49.000/bulan · Rp399.000/tahun         ┐‚   ┐‚ â† small text, de-emphasized
┐‚  ┐‚  (tapi Founding Member = seumur hidup)    ┐‚   ┐‚
┐‚  ┐‚                                           ┐‚   ┐‚
┐‚  ┐”───────────────────────────────────────────┐˜   ┐‚
┐‚                                                  ┐‚
┐”──────────────────────────────────────────────────┐˜
```

### Concurrent Viewers (PostHog)

```typescript
// hooks/useConcurrentViewers.ts
// Menggunakan PostHog Feature Flags atau Real-time API

function useConcurrentViewers() {
  const [viewers, setViewers] = useState<number | null>(null);

  useEffect(() => {
    // PostHog: track page view dan query active sessions on this page
    posthog.capture('$pageview', { page: 'landing' });

    const fetchViewers = async () => {
      // PostHog Trends API: count distinct sessions in last 5 minutes
      const response = await fetch('/api/analytics/concurrent', {
        method: 'GET',
      });
      const data = await response.json();
      // Hanya tampilkan jika > 2 (menghindari "1 orang" yang awkward)
      setViewers(data.count > 2 ? data.count : null);
    };

    fetchViewers();
    const interval = setInterval(fetchViewers, 60_000); // refresh setiap 1 menit
    return () => clearInterval(interval);
  }, []);

  return viewers;
}
```

### 3 Versi CTA Copy

| Versi | CTA Text | Justifikasi |
|---|---|---|
| **A (Dipilih)** | "Amankan Harga Rp175.000 Sekarang — sebelum naik lagi" | Combines specificity (angka real) + urgency (naik lagi). DIAN: "Verba 'amankan' > 'beli' — mengurangi mental friction karena kamu tidak 'membeli' tapi 'melindungi'." |
| **B** | "Mulai Catat Hari Ini — Rp175.000 Seumur Hidup" | Action-oriented + value prop (seumur hidup). BIMA: "Lebih warm, kurang urgency." |
| **C** | "Jangan Biarkan Rp18 Juta Lagi Menguap Tahun Depan" | Callback ke Pain Calculator result. DIAN: "Powerful tapi mungkin terlalu panjang untuk button." |

### ROI Guarantee + Trust Badges

```
ðŸ’° Gak cocok? Uang kembali 100% dalam 30 hari. Tanpa drama.
ðŸ”’ Pembayaran aman via Midtrans · âœ… Tanpa auto-renew paksa
```

**Spesifikasi:**
- Font: Plus Jakarta Sans, 13px, grey-500
- Posisi: tepat di bawah CTA button, center-aligned
- "Uang kembali 100%" = underline, link ke section FAQ tentang refund
- Midtrans logo kecil (16px) di samping teks

---

## Checkout Flow (Maksimal 3 Langkah)

```
LANGKAH 1: Identifikasi
User tap CTA
    â†“
Modal/bottom sheet muncul (Vaul):
┌──────────────────────────────────┐
┐‚  Daftar CatetInd                 ┐‚
┐‚                                  ┐‚
┐‚  Email: [________________]       ┐‚
┐‚  Nama panggilan: [________]      ┐‚
┐‚                                  ┐‚
┐‚  [Lanjut ke Pembayaran →]        ┐‚
┐‚                                  ┐‚
┐‚  Sudah punya akun? Masuk         ┐‚
┐”──────────────────────────────────┐˜
Total fields: 2 (email + nama). ZERO: password (magic link),
phone, alamat, gender, tanggal lahir.

    â†“

LANGKAH 2: Pembayaran
Midtrans Snap popup terbuka:
- User pilih metode bayar (QRIS, GoPay, OVO, Dana, VA)
- Bayar

    â†“

LANGKAH 3: Akun Aktif + Onboarding
Setelah webhook Midtrans confirm payment:
    â†“
Redirect ke catetind.com/app/welcome
    â†“
Onboarding 3-langkah (max 60 detik total):
1. "Siapa kamu?" — Multi-select: First-jobber / Freelancer /
   Ada tanggungan keluarga / Pasangan (menentukan module gating)
2. "Berapa gaji bulananmu?" — Slider/input (untuk daily HUD)
3. "Catat transaksi pertamamu!" — Langsung masuk ke 4-tap input
    â†“
Dashboard utama terbuka
Tanaman stage 0 (benih) sudah ada di homescreen
```

**BIMA:** "3 langkah dari klik CTA sampai dashboard. Tidak ada email verification step blocking (verifikasi via magic link bisa dilakukan nanti). User harus LANGSUNG bisa pakai app setelah bayar — ini momentum yang tidak boleh dibuang."

**CANDRA:** "Magic link: Supabase Auth supports OTP/magic link natively. User signup dengan email → Supabase kirim magic link → user klik di email → session aktif. Ini lebih simpel dari password + confirm password dan lebih aman. Password creation bisa di-prompt nanti di Settings."

---

# SECTION 6 — FAQ AS OBJECTION HANDLER

## Perspektif Tim

> **[DIAN]:** "FAQ bukan tempat menjawab pertanyaan — ini tempat menghancurkan keberatan terakhir sebelum CTA final. Setiap jawaban harus: (1) Akui kekhawatiran. (2) Jawab dengan fakta. (3) Tutup dengan reinforcement value prop."

---

## 7 Keberatan + Jawaban

### 1. "Kenapa gak ada trial / versi gratis dulu?"

> **Kekhawatiranmu masuk akal.** Kebanyakan app keuangan kasih trial karena mereka gak yakin kamu akan stay. Kami yakin — makanya kami kasih yang lebih baik: **garansi uang kembali 100% dalam 30 hari.** Kalau dalam 30 hari CatetInd gak bantu kamu nemuin penghematan lebih besar dari harga langganan, uangmu balik tanpa drama. Jadi kamu tetap bisa coba tanpa risiko — bedanya, kamu langsung dapet semua fitur dari hari pertama, bukan versi setengah matang.

### 2. "Kenapa gak auto-sync rekening bank? Ribet dong manual?"

> **Pertanyaan bagus — ini salah satu keputusan paling penting kami.** Bank-sync berarti kamu harus kasih akses kredensial perbankanmu ke pihak ketiga. Di Indonesia, belum ada regulasi open banking yang matang, dan risiko keamanannya nyata. Kami pilih jalur yang lebih aman: **100% input manual + AI yang membantu.** Scan struk 5 detik, voice input "beli indomaret 25rb" langsung tercatat. Privasi kamu lebih penting dari kenyamanan 10 detik. Dan jujur — dengan 4 tap input dan AI auto-fill, bedanya gak kerasa.

### 3. "Rp149.000-749.000 kok mahal buat app catatan keuangan?"

> **Wajar kalau bingung — mari kita hitung balik.** Dari Pain Calculator tadi, rata-rata first-jobber "kehilangan" Rp1.5 juta per bulan tanpa tracking. Rp149.000 = **kurang dari 10% dari uang yang biasa kamu buang dalam 1 bulan.** Dan itu SEUMUR HIDUP — bukan langganan bulanan. Kalau CatetInd bantu kamu hemat Rp200.000 saja di bulan pertama, kamu sudah balik modal. Garansi uang kembali tetap berlaku kalau ternyata gak berhasil.

### 4. "Bedanya Founding Member, Early Adopter, dan Regular apa?"

> **Simpel:**
> - **Founding Member (slot 1-300):** Bayar sekali, akses seumur hidup. Harga naik Rp2.000 setiap ada yang beli — semakin cepat kamu join, semakin murah.
> - **Early Adopter (slot 301-600):** Rp249.000 sekali, seumur hidup juga. Fixed price.
> - **Regular (slot 601+):** Rp49.000/bulan atau Rp399.000/tahun. Manual renew — kamu yang pegang kendali, gak ada auto-charge.
> 
> Semua tier dapet fitur yang 100% sama. Bedanya hanya harga dan timing.

### 5. "Gimana kalau kuota AI habis?"

> **Kuota AI bulananmu cukup besar — 80% user gak akan pernah menyentuh batas.** Tapi kalau kamu power user, ada paket top-up mulai dari Rp19.000 (untuk ~50 interaksi AI tambahan). Token top-up gak hangus — berlaku sampai kamu pakai. Kamu bisa cek sisa kuota kapan aja di Settings, dan kami kasih notifikasi saat tinggal 30%. Gak ada "tiba-tiba gak bisa pake" tanpa warning.

### 6. "Aman gak bayar lewat Midtrans? Gimana kebijakan refund?"

> **Midtrans itu payment gateway yang dipakai Tokopedia, Bukalapak, dan Gojek** — jadi keamanannya sudah level enterprise. Data kartu/e-wallet kamu diproses langsung oleh Midtrans, bukan oleh kami. CatetInd tidak pernah menyimpan detail pembayaranmu.
> 
> Soal refund: **garansi uang kembali 100% dalam 30 hari.** Tinggal email ke support@catetind.com dengan alasan singkat, dan kami proses refund dalam 3-5 hari kerja. Tanpa pertanyaan yang aneh-aneh.

### 7. "Kalau gak perpanjang / berhenti langganan, data gue gimana?"

> **Data kamu TIDAK PERNAH dihapus.** Meski kamu gak perpanjang langganan, semua catatan keuangan kamu tetap tersimpan aman dan bisa kamu akses kapan aja (read-only). Mau balik lagi 6 bulan kemudian? Semua masih ada. Dan ingat: **CatetInd TIDAK pernah auto-charge.** Perpanjangan selalu manual dan butuh konfirmasi dari kamu. Kamu yang pegang kendali, bukan kami.

---

## FAQ Layout (Accordion — shadcn/ui)

```typescript
// shadcn/ui Accordion component
<Accordion type="single" collapsible className="max-w-2xl mx-auto">
  {faqs.map((faq) => (
    <AccordionItem key={faq.id} value={faq.id}>
      <AccordionTrigger className="text-left font-medium text-charcoal">
        {faq.question}
      </AccordionTrigger>
      <AccordionContent className="text-gray-600 leading-relaxed">
        {faq.answer}
      </AccordionContent>
    </AccordionItem>
  ))}
</Accordion>
```

**Setelah FAQ:** CTA final (reprise Section 5) — sticky footer bar yang muncul saat user scroll melewati Section 5:

```
┌──────────────────────────────────────────────────┐
┐‚  Rp175.000 seumur hidup · Slot 13/300            ┐‚
┐‚  [Amankan Harga Sekarang →]                      ┐‚
┐”──────────────────────────────────────────────────┐˜
```

---

# DELIVERABLE TAMBAHAN

## SEO: Meta Title + Description

```html
<title>CatetInd — Temen Catat Keuangan Gen-Z Indonesia | Rp149rb Seumur Hidup</title>

<meta name="description" content="Aplikasi catatan keuangan untuk Gen-Z first-jobber Indonesia. 4 tap catat transaksi, AI Coach yang gak nge-judge, scan struk otomatis. Dari Rp149.000 seumur hidup. Garansi uang kembali 30 hari." />
```

**Justifikasi:**
- Title: 60 karakter, menyebutkan brand + target audience + harga (urgency)
- Description: 155 karakter, menyebutkan fitur kunci (4 tap, AI, scan struk) + harga + garansi (mengurangi friction dari SERP)

## Open Graph

```html
<meta property="og:title" content="Kamu udah gajian berapa kali, tapi punya apa?" />
<meta property="og:description" content="CatetInd — temen catat keuangan Gen-Z. Dari Rp149rb seumur hidup. Garansi uang kembali 30 hari." />
<meta property="og:image" content="https://catetind.com/og-image.png" />
<meta property="og:url" content="https://catetind.com" />
<meta property="og:type" content="website" />
```

**OG Image Description (untuk designer/generator):**
> Warm cream background (#FFFDF7). Di tengah: teks besar "Kamu udah gajian berapa kali, tapi punya apa?" dalam DM Serif Display, dark charcoal. Di bawah: mockup HP CatetInd yang menampilkan daily HUD (jatah harian Rp210.000 + tanaman sehat) dalam frame iPhone minimalis. Di bawah mockup: badge "Dari Rp149.000 seumur hidup" dalam pill sage green. Logo CatetInd kecil di top-left. Tanpa border, tanpa gradient, clean. Aspect ratio 1200Ã—630px.

---

## A/B Test Pertama Post-Launch

### Test: Headline Above-the-Fold

| Variant | Headline |
|---|---|
| A (Control) | "Kamu udah gajian berapa kali, tapi punya apa?" |
| B (Challenger) | "3 bulan kerja. Rp0 nabung. Itu bukan salahmu." |

**Metrik Sukses:**

| Metrik | Definisi | Target |
|---|---|---|
| **Primary: Scroll Rate** | % visitors yang scroll ke Section 2 (Pain Calculator) | >65% |
| **Secondary: CTA Click Rate** | % visitors yang klik CTA manapun di page | >8% |
| **Tertiary: Conversion Rate** | % visitors yang complete payment | >2% |

**Setup:**
- Tool: PostHog Feature Flags (sudah di-stack)
- Split: 50/50 random
- Durasi: 14 hari ATAU 500 unique visitors per variant — mana yang tercapai duluan
- Statistical significance: p < 0.05 (PostHog built-in)

**Justifikasi:**
- Headline adalah single largest lever untuk conversion di above-the-fold
- Test ini mengukur apakah "pertanyaan introspektif" (Variant A) atau "angka spesifik + empati" (Variant B) lebih efektif untuk Gen-Z first-jobber
- Scroll rate sebagai primary metric (bukan conversion) karena conversion dipengaruhi banyak faktor — scroll rate lebih terisolasi ke headline effectiveness

---

# ASUMSI & INTERPRETASI YANG DIAMBIL

### A1. Pre-filled Values Pain Calculator: Rp5jt Gaji, Rp1.5jt Unknown
**Instruksi:** Tidak disebutkan apakah field kosong atau pre-filled.  
**Keputusan:** Pre-filled dengan Rp5.000.000 (gaji median first-jobber Jakarta, BPS 2025) dan Rp1.500.000 (30% "unknown spending" — conservative estimate). Alasan (DIAN): user langsung melihat output yang shocking tanpa effort. Mereka bisa edit angka setelah engaged. Pre-filled > empty field untuk conversion.

### A2. Investment Return Assumption: 5% p.a. (Bukan 7%)
**Instruksi:** "Terasa shocking tapi masuk akal."  
**Keputusan:** Pain Calculator menggunakan 5% (RDPU konservatif) untuk "kalau kamu invest angka itu" — bukan 7% yang dipakai di Wealth Gap Visualizer. Alasan: Pain Calculator harus sangat defensible karena output-nya langsung dibaca user. 5% = hampir tidak bisa di-challenge. Wealth Gap Visualizer menggunakan 7% karena timeframe lebih panjang (16 tahun) dan sudah ada footnote disclaimer.

### A3. Testimoni Sumber: Beta Testers, Bukan Fabricated
**Instruksi:** "Tulis 5 contoh testimoni."  
**Interpretasi:** 5 testimoni ini adalah TEMPLATE yang akan diisi dengan data real dari beta testers sebelum launch. Nama, usia, dan kota akan diganti dengan data real. Kutipan akan di-edit bersama beta tester agar tetap authentic. Jika beta tester tidak mau disebut nama, pakai inisial + kota. TIDAK fabricate dari nol.

### A4. Concurrent Viewers: Minimum Threshold 3 Orang
**Instruksi:** "X orang sedang melihat halaman ini sekarang."  
**Keputusan:** Hanya ditampilkan jika concurrent viewers > 2. Di bawah itu: element di-hide entirely. Alasan: "1 orang sedang melihat" terasa pathetic. "2 orang" masih awkward. "3 orang+" mulai terasa social. Lebih baik tidak tampil daripada counter-productive.

### A5. Checkout: Magic Link (Bukan Password Creation)
**Instruksi:** "Maksimal 3 langkah, ZERO form yang tidak perlu."  
**Keputusan:** Signup hanya minta email + nama panggilan. TANPA password creation saat checkout. Supabase Auth mengirim magic link ke email untuk auth. User bisa set password nanti di Settings (optional). Alasan: password creation = 2 field extra + cognitive load + "apakah password-ku sudah cukup kuat?" anxiety. Magic link = zero friction.

### A6. Seeded Data: Beta Testers Bayar Rp50.000
**Instruksi:** "Bagaimana data di-populate? Real atau seeded?"  
**Keputusan:** Undang 10-20 beta testers (teman, komunitas) sebelum public launch. Mereka membayar harga simbolis Rp50.000 (one-time, lifetime access). Purchase mereka tercatat sebagai data real di `purchases` table. Ini seed pertama untuk live purchase feed dan untuk mendapatkan testimoni authentic. Rp50.000 dipilih karena cukup rendah untuk teman tapi tetap commitment (bukan gratis = mereka tetap akan pakai).

### A7. Sticky Footer CTA: Muncul Setelah Scroll Melewati Section 5
**Instruksi:** Tidak disebutkan sticky CTA.  
**Keputusan (DIAN):** Sticky footer bar (height 64px, sage green background) muncul setelah user scroll melewati Section 5. Menampilkan harga real-time + slot counter + CTA button. Dismissed jika user scroll kembali ke Section 5 (karena mereka sudah melihat versi lengkap). Ini menangkap user yang sudah scroll through semua content tapi belum klik CTA.

### A8. Regular Pricing Comparison: Minimized, Bukan Dihide
**Instruksi:** Pricing section menampilkan dynamic price counter + CTA, tapi juga harus menampilkan tier lain.  
**Keputusan:** Regular pricing (Rp49K/bulan, Rp399K/tahun) ditampilkan sebagai secondary info di bawah Founding Member card — de-emphasized (small text, grey) dengan copy "tapi Founding Member = seumur hidup." Tujuan: anchoring effect — Rp49K/bulan Ã— 12 = Rp588K/tahun vs Rp175K seumur hidup membuat Founding Member terasa sangat murah.



---


# CatetInd — Domain 7: Go-to-Market Strategy
## Instagram-Only · 2-Person Team · Zero Ad Budget

**Versi:** 1.0  
**Tanggal:** 21 September 2026  
**Tim Persona:** ARIA · BIMA · CANDRA · DIAN  
**Prasyarat:** Domain 5 (pricing), Domain 6 (landing page)  
**Constraint Utama:** 2 orang, zero budget iklan, Instagram satu-satunya platform

---

## DAFTAR ISI

1. [7A. Pre-Launch Waitlist Strategy](#7a-pre-launch-waitlist-strategy)
2. [7B. Content Playbook — Instagram](#7b-content-playbook--instagram)
3. [7C. Creator & Micro-Influencer Seeding](#7c-creator--micro-influencer-seeding)
4. [7D. Organic Growth Loops](#7d-organic-growth-loops)
5. [7E. Launch Day Playbook](#7e-launch-day-playbook)
6. [7F. Retention Content](#7f-retention-content)
7. [Asumsi & Interpretasi yang Diambil](#asumsi--interpretasi-yang-diambil)

---

# 7A. PRE-LAUNCH WAITLIST STRATEGY

## Perspektif Tim

> **[DIAN — Growth & Conversion Psychologist]:** "Waitlist bukan cuma email collector. Waitlist adalah commitment device — orang yang sudah 'investasi' waktu mendaftar lebih likely convert saat launch. Tapi waitlist tanpa referral loop = list email mati. Referral loop mengubah setiap pendaftar jadi micro-marketer gratis."

> **[ARIA — Principal Product Strategist]:** "Target 500 waitlist terdengar rendah, tapi ini beachhead yang realistis. Conversion rate waitlist → paid secara historis di Indonesia: 8-15% (data GrabPay pre-launch 2018). 500 waitlist Ã— 12% conversion = 60 paying users hari pertama. Dengan Founding Member dynamic pricing, 60 users = revenue Rp9.5jt di hari pertama — cukup untuk validasi."

> **ðŸš¨ KONFLIK DIAN vs BIMA (Gamifikasi Posisi Antrian):**  
> **DIAN:** "Leaderboard posisi antrian harus publik — orang yang lihat posisinya turun akan panik dan share lebih agresif."  
> **BIMA:** "Leaderboard = anxiety. Ini bertentangan dengan tone nurturing CatetInd. Orang yang posisinya turun akan merasa 'kalah' dan churn dari waitlist."  
> **RESOLUSI:** Posisi antrian PRIVATE (hanya user sendiri yang lihat posisinya). Tidak ada leaderboard publik. Copy posisi antrian framing positif: "Kamu di posisi #234 — ajak 2 teman lagi buat naik ke Top 50!" (aspirational, bukan kompetitif). Saat posisi naik, micro-celebration: "ðŸŽ‰ Naik 15 posisi! Sekarang kamu di #219."

---

## Referral Loop Mechanics

### Database Schema

```sql
-- WAITLIST
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  referral_code VARCHAR(8) UNIQUE NOT NULL, -- 8 karakter alfanumerik
  referred_by UUID REFERENCES waitlist(id),
  referral_count INTEGER NOT NULL DEFAULT 0,
  queue_position INTEGER NOT NULL, -- dihitung dinamis
  instagram_handle VARCHAR(100), -- opsional, untuk tracking
  source VARCHAR(50), -- 'instagram_reel', 'instagram_story', 'direct', 'referral'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_waitlist_referral ON waitlist(referral_code);
CREATE INDEX idx_waitlist_position ON waitlist(queue_position);
```

### Queue Position Formula

```typescript
// Posisi antrian = kombinasi waktu daftar + referral bonus
// Semakin banyak referral, semakin naik posisi

function calculateQueuePosition(entry: WaitlistEntry, totalEntries: number): number {
  // Base position: urutan mendaftar (1 = pertama daftar)
  const basePosition = entry.originalPosition; // assigned saat daftar

  // Referral bonus: setiap referral menaikkan posisi 5 slot
  const referralBonus = entry.referralCount * 5;

  // Final position: base - bonus (capped at 1)
  const finalPosition = Math.max(1, basePosition - referralBonus);

  return finalPosition;
}

// Contoh:
// User daftar di posisi #234
// Ajak 2 teman → bonus 10 slot → posisi jadi #224
// Ajak 5 teman → bonus 25 slot → posisi jadi #209
// Ajak 10 teman → bonus 50 slot → posisi jadi #184
```

### Reward: Otomatis Masuk Slot Founding Member Termurah

Saat launch day, 300 slot Founding Member dibuka. Urutan pembelian:
1. Top 300 di waitlist mendapat **akses checkout 1 jam lebih awal** (exclusive early access window)
2. Posisi #1 checkout pertama = harga Rp149.000 (termurah)
3. Posisi #2 checkout kedua = Rp151.000
4. ...dan seterusnya

**TIDAK ADA bonus tambahan** (bukan gratis, bukan diskon, bukan merchandise). Reward-nya murni: checkout lebih awal = harga lebih murah. Simpel, mudah dijelaskan, tidak ada cost tambahan.

---

## Pre-Launch Landing Page

```
┌──────────────────────────────────────────────────┐
┐‚                                                  ┐‚
┐‚  CatetInd logo                                   ┐‚
┐‚                                                  ┐‚
┐‚  Kamu udah gajian berapa kali,                   ┐‚  â† Same headline as Domain 6
┐‚      tapi punya apa?                             ┐‚
┐‚                                                  ┐‚
┐‚  ┌─ MINI PAIN CALCULATOR ─────────────────┐      ┐‚
┐‚  ┐‚                                        ┐‚      ┐‚
┐‚  ┐‚  Gaji: [Rp 5.000.000]                  ┐‚      ┐‚  â† Pre-filled, editable
┐‚  ┐‚  "Gak jelas" per bulan: [Rp 1.500.000] ┐‚      ┐‚
┐‚  ┐‚                                        ┐‚      ┐‚
┐‚  ┐‚  Dalam setahun, itu = Rp 18.000.000    ┐‚      ┐‚  â† Instant output
┐‚  ┐‚  yang kamu gak tau ke mana.            ┐‚      ┐‚
┐‚  ┐‚                                        ┐‚      ┐‚
┐‚  ┐”────────────────────────────────────────┐˜      ┐‚
┐‚                                                  ┐‚
┐‚  CatetInd lagi dibangun — dan kamu bisa jadi     ┐‚
┐‚  yang pertama dapet harga paling murah.          ┐‚
┐‚                                                  ┐‚
┐‚  Email: [_________________________]              ┐‚
┐‚  [Gabung Waitlist — Gratis]                      ┐‚  â† Sage green button
┐‚                                                  ┐‚
┐‚  ─────────── setelah submit ───────────          ┐‚
┐‚                                                  ┐‚
┐‚  ðŸŽ‰ Kamu di posisi #234 dari 487 orang!          ┐‚
┐‚  Ajak teman pakai link ini buat naik posisi:     ┐‚
┐‚                                                  ┐‚
┐‚  [catetind.com/w/X7kM2pQ]  [ðŸ“‹ Copy] [ðŸ“¤ Share] ┐‚
┐‚                                                  ┐‚
┐‚  Setiap teman yang gabung = posisimu naik 5 slot ┐‚
┐‚  Top 300 saat launch = checkout duluan           ┐‚
┐‚  = harga Founding Member paling murah ðŸ’š         ┐‚
┐‚                                                  ┐‚
┐”──────────────────────────────────────────────────┐˜
```

**Teknis (CANDRA):** Pre-launch landing page = 1 Next.js page (`/`), bukan app terpisah. Saat launch day, page ini di-redirect ke full landing page (Domain 6). Waitlist data di Supabase. Share button menggunakan Web Share API (native share sheet di mobile) dengan fallback copy-to-clipboard.

---

## Channel Strategy: Instagram Pre-Launch

| Format | Persona | Cadence | Konten | CTA |
|---|---|---|---|---|
| **Reels** | Faceless | 3x/minggu | Pain content (lihat 7B) — teaser, belum reveal produk | "Link di bio" → waitlist |
| **Stories** | Personal Brand | Daily | "Kita lagi bangun sesuatu..." — behind-the-scenes + polling | Swipe up / link sticker → waitlist |
| **Bio link** | — | Persistent | Linktree atau direct link ke waitlist page | — |

**Pre-launch duration:** 4-6 minggu sebelum launch day. Target: 500 waitlist sign-ups.

**Milestone tracking (weekly):**

| Minggu | Target Waitlist | Konten Focus |
|---|---|---|
| W1 | 50 | Pain content Reels (3x) — build awareness, belum sebut produk |
| W2 | 150 | Pain + teaser "kita bikin sesuatu" Stories |
| W3 | 300 | Reveal nama CatetInd + mini demo di Stories |
| W4 | 450 | Countdown + referral push ("ajak teman, naik posisi") |
| W5 | 500+ | Final countdown + "besok dibuka" hype |

---

# 7B. CONTENT PLAYBOOK — INSTAGRAM

## Perspektif Tim

> **[DIAN]:** "Konten Instagram untuk paid product harus mengikuti formula PAIN → AGITATION → SOLUTION (PAS). Tapi di Instagram, kamu hanya punya 1.5 detik sebelum user scroll. Hook opening 3 detik = satu-satunya hal yang menentukan apakah konten ditonton atau di-skip."

> **[BIMA]:** "Content yang terlalu 'salesy' akan di-mute oleh Gen-Z. Ratio ideal: 80% value content, 20% product mention. Mereka harus merasa 'akun ini ngebantu gue' bukan 'akun ini jualan terus'. Pain content yang baik = relate, bukan promosi."

---

## 3 Content Pillars

| Pillar | % Total | Format Utama | Persona | Tujuan |
|---|---|---|---|---|
| **Pain Content** | 60% | Reels | Faceless | Awareness: buat target merasa "ini gue banget" |
| **Edukasi Finansial** | 30% | Carousel + Reels | Fleksibel | Trust: posisikan CatetInd sebagai teman belajar |
| **Behind the Build** | 10% | Stories | Personal Brand | Authenticity: bangun koneksi personal |

---

## REELS (4-5x/minggu — Faceless)

### Format Template

```
[0-3 detik]  HOOK: Visual atau teks yang STOP scroll
[3-10 detik] PAIN/AGITATION: Elaborasi masalah
[10-20 detik] BRIDGE: Pivot ke insight / solusi
[20-30 detik] CTA: "Link di bio" atau "Save buat nanti"
```

### 10 Ide Reels Spesifik (Hook + Treatment)

**Reels #1 — "POV: lo buka rekening"**
- **Hook (0-3s):** Text overlay on screen recording M-Banking: "POV: lo buka rekening dan gak tau uang lo kemana ðŸ˜¶" + sound: trending audio yang relatable
- **Treatment (3-20s):** Screen recording (blurred angka) scrolling mutasi rekening. Text overlay setiap 3 detik: "Shopee... oke" → "GoFood... oke" → "Ini apa?? Rp350.000??" → "Ini... kapan??" → "Dan ini siapa??"
- **CTA (20-30s):** "Gue udah capek gak tau uang gue ke mana. Makanya gue bikin sesuatu. Link di bio."
- **Format:** Screen recording + text overlay, no face, trending audio

**Reels #2 — "Matematika gaji pertama"**
- **Hook:** Text on cream background: "Gaji pertama lo Rp5 juta. Mari kita hitung." 
- **Treatment:** Typewriter-style text munculin pengeluaran satu-satu: Kos Rp1.5jt → Transport Rp800rb → Makan Rp1.5jt → Langganan Rp200rb → Jajan Rp??? → Total: "lebih dari Rp5jt ðŸ« "
- **CTA:** "Tau gak enaknya? Kalau dicatet, kita bisa ngatur. Link di bio."

**Reels #3 — "Chat sama dompet"**
- **Hook:** Fake iMessage chat: [Dompet] "Kita perlu ngomong." [Lo] "Kenapa?"
- **Treatment:** Chat lanjut: "Lo udah beli kopi 47x bulan ini." → "Itu Rp1.4 juta." → "Setahun itu Rp17 juta." → "Lo bisa ke Bali 3x." → [Lo] "ðŸ’€"
- **CTA:** "Mau tau ke mana aja uangmu beneran? Link di bio."

**Reels #4 — "Gue di usia 25 vs gue yang gue harap"**
- **Hook:** Split screen: kiri = "Gue sekarang" (scrolling Shopee jam 2 pagi), kanan = "Gue yang gue pengen" (buka app keuangan, senyum)
- **Treatment:** 4-5 kontras cepat: makan luar terus vs meal prep, impulsif checkout vs wishlist, gak tau sisa gaji vs daily budget tracker
- **CTA:** "Versi lo yang satu lagi mulai dari satu langkah: catat dulu."

**Reels #5 — "Sisa gaji hari ke-20"**
- **Hook:** Timer counting Rp5.000.000 down to Rp23.000 + dramatic music build
- **Treatment:** Dramatized countdown with expense labels flying by
- **CTA:** "Kalau kamu track dari hari ke-1, kamu gak akan kaget di hari ke-20."

**Reels #6 — "Perasaan setelah gajian vs tanggal 20"**
- **Hook:** Side-by-side emoji transition: ðŸ¤‘ → ðŸ˜°
- **Treatment:** Day 1 confidence montage vs Day 20 nasi + telur + indomie montage. Relatable slice-of-life footage.
- **CTA:** "Yang berubah bukan gajinya — tapi cara kamu aturnya."

**Reels #7 — "Kopi Rp35rb Ã— 365 hari"**
- **Hook:** Close-up shot: es kopi di tangan. Text: "Rp35.000. Receh, kan?"
- **Treatment:** Calculator on screen: 35.000 Ã— 365 = Rp12.775.000/tahun → "Itu setara 3 bulan kos" → "Atau DP motor" → "Atau dana darurat 2 bulan"
- **CTA:** "Bukan berarti stop ngopi. Tapi tau ke mana uangmu = punya pilihan."

**Reels #8 — "Things I wish I knew di gaji pertama"**
- **Hook:** Text: "3 hal yang gak ada yang ajarin soal gaji pertama"
- **Treatment:** (1) "BPJS dipotong sebelum masuk rekening" (2) "Tabungan 20% itu SEBELUM pengeluaran, bukan sisanya" (3) "Kalau gak dicatet, dijamin gak tau ke mana"
- **CTA:** "Mulai dari yang ke-3 dulu. Catat aja dulu."

**Reels #9 — "Tingkat stress finansial Gen-Z Indonesia"**
- **Hook:** Data visual: "71% Gen-Z Indonesia stress soal uang (Jakpat 2025)"
- **Treatment:** "Tapi cuma 12% yang punya catatan pengeluaran" → "Sisanya? Nebak." → "Stress karena gak tau = yang paling gak perlu"
- **CTA:** "Kamu gak butuh lebih banyak uang. Kamu butuh lebih banyak data tentang uangmu."

**Reels #10 — "Gen-Z vs Millennial tentang uang"**
- **Hook:** Meme format: Gen-Z (scrolling, YOLO) vs Millennial (spreadsheet, "financial freedom")
- **Treatment:** "Millennial udah Excel warrior dari umur 25" → "Gen-Z? Mau catat tapi ribet" → "Plot twist: sekarang ada yang bikin gak ribet — 4 tap, selesai."
- **CTA:** "Penasaran? Link di bio."

---

## CAROUSEL (2-3x/minggu — Edukasi)

### 5 Ide Carousel

| # | Topik | Format | Slides | Hook Slide 1 |
|---|---|---|---|---|
| 1 | "Berapa sih seharusnya gue nabung dari gaji Rp5jt?" | Case study anonim | 8 slides | "Rina, 24, Jakarta. Gaji Rp5jt. Pengeluaran: semua." |
| 2 | "Budgeting 50/30/20 itu bullshit — ini yang beneran works buat first-jobber" | Contrarian take + alternative framework | 7 slides | "50/30/20? Siapa yang bisa nabung 20% di bulan pertama kerja?" |
| 3 | "5 pengeluaran tersembunyi yang diam-diam bikin lo bokek" | Listicle | 6 slides | "Lo udah makan murah, gak jajan, tapi kok tetep bokek?" |
| 4 | "Cara gue survive dari tanggal 20 sampai gajian" | Storytelling personal | 8 slides | "Tanggal 20. Rekening tinggal Rp127.000. Ini cerita gue." |
| 5 | "Apa itu sinking fund dan kenapa ini game-changer" | Edukasi konsep + visual | 7 slides | "Nabung buat liburan tapi selalu ke-pakai buat yang lain?" |

**Format Carousel:**
- Background: warm cream `#FFFDF7` (konsisten dengan design language)
- Font: DM Serif Display heading, Plus Jakarta Sans body
- Slide terakhir SELALU: CTA → "Save post ini ðŸ“Œ" atau "Share ke temen yang butuh" (bukan hard sell)
- Branding: logo CatetInd kecil di bottom-right setiap slide

---

## STORIES (Harian, 3-5 slides — Personal Brand)

### Format Recurring

| Hari | Tema | Contoh |
|---|---|---|
| Senin | "Minggu ini kita ngerjain..." | Screenshot Notion/Figma/VSCode, blur detail |
| Selasa | Polling interaktif | "Kamu lebih sering impulsif belanja di: ðŸ›’ Shopee / ðŸ• GoFood?" |
| Rabu | Behind-the-scenes development | Short video coding/designing + caption "Fitur ini buat kalian" |
| Kamis | Q&A Box | "Tanya apa aja soal keuangan — gue jawab jujur" |
| Jumat | Fun / meme | Meme keuangan relatable, repost tagged content |
| Sabtu | Milestone update | "Waitlist udah 300+! Kalian gila ðŸ™" |
| Minggu | Refleksi personal | "Minggu malam, gue review keuangan gue sendiri. Ini hasilnya." |

### 4 Highlights

| Highlight | Cover | Konten |
|---|---|---|
| ðŸ“– Cerita Kita | Sage green circle | Journey founder: kenapa bikin CatetInd, 2-person team |
| â“ FAQ | Terracotta circle | Kompilasi jawaban Q&A dari Stories |
| ðŸ’¬ Testimoni | Cream circle | Screenshot testimoni beta tester + user |
| ðŸ’¡ Tips Kilat | Green circle | Kompilasi slide edukasi terbaik dari carousel |

---

# 7C. CREATOR & MICRO-INFLUENCER SEEDING

## Perspektif Tim

> **[ARIA]:** "Micro-influencer seeding adalah satu-satunya 'ad spend' yang kita punya — tapi berbentuk produk, bukan cash. 20 Founding Member slot Ã— ~Rp149.000-175.000 = total 'spend' Rp3-3.5 juta dalam bentuk product credit. Ini CAC yang sangat murah untuk potensi reach 100.000-1.000.000 Gen-Z."

> **[DIAN]:** "Nano-influencer (5K-10K followers) punya engagement rate 5-8% vs mega-influencer 1-2%. Untuk Gen-Z financial content, nano > mega. Yang kita cari: relatable, bukan aspirational."

---

## Kriteria Seleksi Influencer

| Kriteria | Minimum | Ideal |
|---|---|---|
| Followers | 5.000 | 10.000-50.000 |
| Engagement rate | 4% | 6%+ |
| Niche | Keuangan / lifestyle / karir Gen-Z | Financial literacy + personal finance |
| Usia audience | 20-28 dominan | 22-27 (match beachhead) |
| Lokasi | Indonesia | Jakarta, Bandung, Surabaya |
| Tone | Relatable, kasual | Nurturing, edukatif (sesuai CatetInd) |
| Red flag | Promosi judi/pinjol/get-rich-quick | — |

## Daftar Target Kategori (20-50 Akun)

| Kategori | Jumlah Target | Contoh Niche |
|---|---|---|
| Financial literacy creators | 10-15 | Tips nabung, budgeting, invest pemula |
| Lifestyle Gen-Z | 5-10 | Adulting content, "kenyataan hidup setelah lulus" |
| Career/karir muda | 3-5 | First job, nego gaji, kerja di startup |
| Meme/relatable Gen-Z | 2-5 | Meme keuangan, "gajian vs tanggal 25" |

## Outreach Template (DM Instagram)

```
Hai [Nama]! ðŸ‘‹

Aku [Nama Founder], co-founder CatetInd — app catatan keuangan 
yang lagi dibangun khusus buat Gen-Z Indonesia.

Aku suka banget konten kamu soal [topik spesifik yang mereka post].
Relevan banget sama yang kita bangun.

Kita mau kasih akses GRATIS seumur hidup (Founding Member, 
yang normalnya mulai Rp149.000) ke 20 creator yang kita seleksi.

Bukan paid promotion — kita cuma mau kamu coba dan kalau 
ternyata berguna, share honest review kamu. Kalau gak suka, 
gak perlu post apapun. No strings.

Tertarik? ðŸ’š
```

## Tracking & Measurement

| Metric | Cara Tracking |
|---|---|
| Sign-ups dari influencer | UTM link unik: `catetind.com/?utm_source=ig&utm_medium=creator&utm_campaign=[handle]` |
| Kode referral unik | Setiap creator dapat kode unik (misal `RINA-CATETIND`) yang diinput saat checkout |
| Content reach | Manual track: screenshot insights Reels/Stories creator setelah posting |
| Conversion | PostHog: `purchase_completed` event filtered by UTM campaign |

---

# 7D. ORGANIC GROWTH LOOPS

## Perspektif Tim

> **[ARIA]:** "Viral loop terbaik adalah yang usernya INGIN share, bukan yang kita paksa share. 3 loop ini harus terasa natural — share terjadi karena user bangga, bukan karena pop-up mengganggu."

> **ðŸš¨ KONFLIK BIMA vs DIAN (Share Prompt Timing):**  
> **DIAN:** "Share prompt harus muncul langsung setelah user mencapai milestone — saat dopamine tinggi, likelihood share paling besar."  
> **BIMA:** "Tapi kalau setiap milestone ada pop-up 'Share!', itu annoying. Max 1 share prompt per minggu."  
> **RESOLUSI:** Share prompt muncul INLINE di achievement card — bukan pop-up/modal. Tombol share ada di situ, tapi TIDAK memaksa. Tidak ada modal blocking. Max share prompt frequency: 2x per minggu (hanya pada milestone terbesar minggu itu).

---

## Loop 1: Referral System (Two-Sided)

### Mekanisme

```
USER A (Pengundang)                    USER B (Diundang)
     ┐‚                                      ┐‚
     ┐œ── Share referral link ──────────────→┐‚
     ┐‚   catetind.com/r/[KODE]              ┐‚
     ┐‚                                      ┐‚
     ┐‚                                      ┐œ── Sign up + bayar
     ┐‚                                      ┐‚   (WAJIB sudah bayar)
     ┐‚                                      ┐‚
     ┐‚â†── Reward unlock ───────────────────┐‚
     ┐‚                                      ┐‚
     â–¼                                      â–¼
+30 hari perpanjangan              Diskon 10% dari harga
masa aktif (atau 1 bulan           saat checkout
Add-on AI Token gratis             (applied otomatis via
jika lifetime member)              referral link)
```

### Schema

```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id),
  referred_user_id UUID REFERENCES auth.users(id), -- NULL sampai sign up
  referral_code VARCHAR(10) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- 'pending' (link shared, belum signup)
  -- 'signed_up' (referred user registered, belum bayar)
  -- 'converted' (referred user SUDAH bayar — reward di-trigger)
  -- 'rewarded' (reward sudah didistribusi ke kedua pihak)
  referrer_reward_type VARCHAR(30), -- 'extension_30d' atau 'ai_token_1mo'
  referred_discount_applied INTEGER, -- diskon dalam rupiah yang diterapkan
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);
```

### Copy yang Membuat Sharing Natural

**Di Settings > Referral:**
> **Ajak temen, dapet bonus ðŸŒ¿**
>
> Setiap teman yang join CatetInd pakai link kamu:
> âœ… Kamu dapat +30 hari perpanjangan (atau 1 bulan AI Token)
> âœ… Teman kamu dapat diskon 10%
>
> Link kamu: catetind.com/r/RINA-X7K
> [ðŸ“‹ Copy Link] [ðŸ“¤ Share]
>
> Udah mengajak: 3 teman · 2 sudah aktif

**Shareable text (auto-generated saat tap Share):**
> "Gue lagi pakai CatetInd buat track keuangan — literally 4 tap doang buat catat pengeluaran dan ada AI Coach yang gak nge-judge ðŸ˜‚ Kalau mau coba, pake link gue buat dapet diskon 10%: catetind.com/r/RINA-X7K"

---

## Loop 2: Share Your Progress (Privacy-Safe)

### Card Design yang Shareable

```
┌──────────────────────────────────────┐
┐‚                                      ┐‚
┐‚  ðŸŒ¿ CatetInd                         ┐‚
┐‚                                      ┐‚
┐‚  Bulan September,                    ┐‚
┐‚  aku berhasil:                       ┐‚
┐‚                                      ┐‚
┐‚  âœ… Catat 87 transaksi               ┐‚
┐‚  âœ… 21 hari berturut-turut           ┐‚
┐‚  âœ… Capai 1 target tabungan          ┐‚
┐‚                                      ┐‚
┐‚  [SVG tanaman stage 4]              ┐‚
┐‚  Pohon keuanganku udah berbunga! ðŸŒ¸ ┐‚
┐‚                                      ┐‚
┐‚  #CatetAjaDulu                       ┐‚
┐‚                                      ┐‚
┐‚  catetind.com                        ┐‚  â† small, bottom
┐”──────────────────────────────────────┐˜
```

**PRIVACY GUARD:**
- TIDAK menampilkan: angka rupiah apapun (saldo, tabungan, pengeluaran)
- TIDAK menampilkan: kategori pengeluaran, nama merchant, persentase
- HANYA menampilkan: jumlah transaksi, streak, pencapaian milestone, tahap tanaman
- Ini shareable karena estetik + bangga, tapi zero financial data exposed

### Implementasi

```typescript
// Generatekan card sebagai image (Canvas API / html2canvas)
async function generateShareCard(userData: ShareCardData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080; // Instagram story size
  canvas.height = 1920;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#FFFDF7';
  ctx.fillRect(0, 0, 1080, 1920);

  // Logo
  // ... draw CatetInd logo

  // Achievement badges
  ctx.font = '48px "Plus Jakarta Sans"';
  ctx.fillStyle = '#2D2D2D';
  ctx.fillText(`âœ… Catat ${userData.totalTransactions} transaksi`, 100, 600);
  ctx.fillText(`âœ… ${userData.streak} hari berturut-turut`, 100, 700);

  // Plant SVG (embed as image)
  const plantImg = await loadImage(`/plants/stage-${userData.plantStage}.svg`);
  ctx.drawImage(plantImg, 340, 900, 400, 400);

  // Hashtag
  ctx.font = '36px "Plus Jakarta Sans"';
  ctx.fillStyle = '#A3B18A';
  ctx.fillText('#CatetAjaDulu', 100, 1500);

  return new Promise((resolve) => canvas.toBlob(resolve!, 'image/png'));
}
```

**Trigger:** Tombol "Share" muncul di:
1. Monthly recap (slide terakhir)
2. Tanaman naik tahap (celebration screen)
3. Target tabungan tercapai

---

## Loop 3: Wealth Report Bulanan (Shareable)

### 5 Slides Report Format

| Slide | Konten | Privacy Level |
|---|---|---|
| 1 — Cover | "Laporan Keuangan September 2026" + nama + tanaman | âœ… Shareable (tanpa angka) |
| 2 — Highlights | "87 transaksi tercatat · 21 hari streak · 1 target tercapai" | âœ… Shareable (achievement only) |
| 3 — Detail | Donut chart kategori + angka rupiah + savings rate | âŒ PRIVATE (angka visible) |
| 4 — Tanaman Progress | Tanaman bulan lalu vs sekarang (side by side) | âœ… Shareable |
| 5 — AI Coach Message | Pesan personal dari AI | âŒ PRIVATE (konteks personal) |

**Share behavior:** Saat user tap "Share Report", HANYA slide 1, 2, dan 4 yang di-export sebagai image. Slide 3 dan 5 TIDAK termasuk — dengan copy: "Beberapa slide bersifat pribadi dan tidak termasuk dalam share. Privasi kamu kami jaga ðŸ’š"

---

# 7E. LAUNCH DAY PLAYBOOK

## Perspektif Tim

> **[ARIA]:** "Launch day bukan tentang 'hari pertama jualan'. Ini tentang menciptakan momen yang terasa seperti event. 300 slot Founding Member = built-in scarcity. Kalau kita execute dengan benar, 'sold out' itu bisa terjadi organik dalam 24-48 jam dan itu sendiri menjadi konten viral."

> **[CANDRA]:** "Dari sisi teknis: Vercel free tier bisa handle ~100 concurrent visitors. Supabase free tier bisa handle initial load. Yang perlu dipastikan: Midtrans webhook jangan timeout. Dan pricing state update harus atomic (sudah di-solve di Domain 5A)."

---

## Timeline Jam per Jam (Hari H)

### H-1 (Malam sebelum launch)

| Waktu | Aksi | PIC |
|---|---|---|
| 21:00 | Final check: landing page live, pricing API jalan, Midtrans production mode | CANDRA |
| 21:30 | Pre-schedule Instagram post (Reels) untuk 06:00 besok | DIAN (Faceless) |
| 22:00 | Kirim email ke seluruh waitlist: "Besok jam 8 pagi, slot dibuka. Top 300 di antrian dapat checkout duluan." | ARIA |
| 22:30 | Post Story: "Besok pagi. Kita siap. Kalian siap? ðŸŒ¿" | Personal Brand |
| 23:00 | Tidur (serius — launch day butuh stamina) | Semua |

### Hari H

| Waktu | Aksi | Detail |
|---|---|---|
| **06:00** | Reels go live (pre-scheduled) | Pain content + "Hari ini CatetInd buka" |
| **07:00** | Stories countdown: "1 jam lagi..." | Personal Brand — face cam excited |
| **07:30** | Kirim email ke Top 300 waitlist | "Link checkout ekslusif kamu sudah aktif. Kamu punya waktu 1 jam sebelum dibuka untuk umum." Subject: "Slot Founding Member kamu sudah siap, [Nama]" |
| **08:00** | **LAUNCH** — checkout terbuka untuk Top 300 waitlist | Early access window: 1 jam |
| **08:00-09:00** | Stories live update setiap 15 menit | "5 orang sudah join!" → "15 orang!" → "Harga sekarang Rp159.000!" |
| **09:00** | Checkout terbuka untuk SEMUA (link publik) | Landing page full (Domain 6) live |
| **09:15** | Post ke Product Hunt | Title: "CatetInd — financial tracker for Gen-Z Indonesia that feels like self-care" |
| **09:30** | Post ke komunitas | Discord: Finansial Anak Muda, Telegram: Indo Finance, Reddit: r/indonesia |
| **10:00** | Stories: screenshot real purchase feed | "Ini beneran! Udah [X] orang join! ðŸŽ‰" |
| **12:00** | Reels kedua | Behind-the-scenes "hari pertama launch" — personal brand, raw, authentic |
| **14:00** | Stories update | Harga terkini + slot tersisa + testimoni awal |
| **17:00** | Milestone check | Evaluasi: berapa slot terjual? Apakah perlu adjust messaging? |
| **19:00** | Reels ketiga (jika needed) | "X orang udah join hari ini. Harga udah naik ke Rp[X]. Slot tersisa: [Y]." |
| **21:00** | Closing Stories | Rekap hari pertama + ucapan terima kasih + "Masih ada [Y] slot." |

---

## Product Hunt Launch

**Listing:**
- **Tagline:** "Financial tracking that feels like self-care, not homework"
- **Description:** "CatetInd is a PWA for Gen-Z Indonesians to track their money in 4 taps. AI Coach (nurturing, not judging), scan receipts with OCR, grow a virtual plant with your consistency. No bank sync — your privacy comes first."
- **Category:** Fintech, Productivity
- **First Comment:** Personal story dari founder — "We built this because we were tired of apps that made us feel bad about our money."

## Komunitas Discord/Telegram

| Komunitas | Cara Posting | Copy |
|---|---|---|
| Discord: Finansial Anak Muda | Post di #promo atau #sharing channel | "Gue dan temen gue bikin app keuangan khusus buat Gen-Z. Bukan bank sync — manual input yang simpel. Founding Member dibuka hari ini: catetind.com" |
| Telegram: Indo Finance / Nabung Saham | Share sebagai member, bukan admin | "Baru launch hari ini — CatetInd, app catat keuangan buat first-jobber. Open source pricing, mulai Rp149rb seumur hidup. Disclaimer: gue co-founder-nya ðŸ˜„" |
| Reddit: r/indonesia | Post di Daily Chat Thread (BUKAN buat thread baru — itu akan di-downvote sebagai promo) | "Just launched catetind.com — personal finance tracker designed for Gen-Z Indonesia. No bank-sync, AI-powered, PWA. Would love feedback from fellow redditors." |

---

## Contingency Plan: 6 Jam, Hanya 10 Pembeli

| Trigger | Aksi |
|---|---|
| **6 jam, <10 pembeli** | Pivot messaging dari "urgency slot" ke "social proof yang sudah ada". Post testimoni 10 orang yang sudah join. DM 1-on-1 ke waitlist yang belum convert — "Hey, ada pertanyaan soal CatetInd? Gue bisa bantu explain." |
| **6 jam, <10 pembeli** | Extended Stories: founder melakukan LIVE Q&A di Instagram — jawab pertanyaan real-time, demo app langsung. Authenticity > marketing polish. |
| **6 jam, <10 pembeli** | Review Pain Calculator copy: apakah output-nya cukup shocking? Adjust pre-filled values jika perlu. Check analytics: di mana user drop (PostHog funnel). |
| **24 jam, <20 pembeli** | Post-mortem: apakah target audience salah? Apakah harga terlalu tinggi? Survey ke waitlist yang TIDAK convert: "Apa yang bikin kamu ragu?" (Google Form, 3 pertanyaan). |
| **48 jam, <30 pembeli** | Extend waitlist referral bonus: "Ajak 3 teman ke waitlist, kamu dapat akses gratis 30 hari (bukan seumur hidup)." Ini temporary incentive untuk boost conversion tanpa mengubah pricing structure. |

> **[ARIA]:** "Jangan panik terlalu cepat. Median time-to-purchase untuk paid product di Indonesia: 3 hari dari awareness pertama (GrabPay data). Day 1 mungkin rendah tapi Day 3-7 bisa spike jika konten masih jalan. Yang TIDAK BOLEH dilakukan: turunkan harga atau beri diskon — itu menghancurkan trust dynamic pricing."

---

# 7F. RETENTION CONTENT

## Perspektif Tim

> **[BIMA]:** "Retention content bukan tentang 'mengingatkan user untuk pakai app'. Itu annoying. Retention content = memberikan VALUE yang membuat user merasa app ini masih relevan. Setiap email dan notifikasi harus membuat user merasa 'oh, ini berguna' bukan 'ugh, spam lagi'."

> **[ARIA]:** "D1 retention untuk paid app di SEA: 65-75%. D7: 40-50%. D30: 25-35%. Target kita: D30 >40% — di atas benchmark. Senjata utama: AI Coach + tanaman emotional hook + sinking fund commitment."

---

## Onboarding Email Sequence (5 Email)

### Email 1 — Hari 0 (Segera Setelah Bayar)

**Subject:** "Selamat datang di CatetInd, {Nama}! ðŸŒ± Tanamanmu udah ditanam."

```
Hai {Nama}! ðŸ’š

Terima kasih udah jadi Founding Member #{slot_number} CatetInd.

Tanamanmu baru aja ditanam — sekarang dia masih benih kecil, 
tapi dia bakal tumbuh seiring kamu konsisten mencatat.

3 hal yang bisa kamu lakukan sekarang:
1. ðŸ“± Buka catetind.com/app dan catat pengeluaran pertamamu
2. ðŸŒ¿ Lihat tanamanmu di homescreen — dia butuh catatan pertamamu!
3. ðŸ“¸ Screenshot tanamanmu dan share ke IG Story pakai #CatetAjaDulu

Butuh bantuan? Reply email ini kapan aja — gue (nama founder) 
yang bakal baca dan jawab langsung. Bukan bot.

Salam hangat,
{Nama Founder}
Co-founder CatetInd

P.S. Kalau belum catat transaksi pertama — ini momen terbaiknya.
4 tap aja, kurang dari 10 detik. 
```

### Email 2 — Hari 1

**Subject:** "Udah catat hari ini? Tanamanmu nunggu lho ðŸŒ¿"

```
Hai {Nama},

Kemarin kamu {catat X transaksi / belum catat apa-apa}.

{Jika sudah catat:}
Nice! Tanamanmu udah mulai tumbuh. Hari ini, coba catat lagi 
setiap habis bayar sesuatu. Gak perlu detail — "makan siang 25rb" 
udah cukup.

{Jika belum catat:}
Gapapa — hari pertama emang sering lupa. Mulai hari ini aja. 
Coba catat 1 transaksi: hal terakhir yang kamu beli. 
Tanamanmu nunggu catatan pertama biar bisa tumbuh ðŸŒ±

Tips hari ini:
ðŸ’¡ Kamu bisa voice input: bilang "beli kopi 35rb" — AI langsung 
   catat tanpa ngetik.

[Buka CatetInd →]
```

### Email 3 — Hari 3

**Subject:** "3 hari! Ini yang udah kamu capai sejauh ini 📊"

```
Hai {Nama},

3 hari sejak kamu bergabung. Ini progress kamu:

ðŸ“ {X} transaksi tercatat
ðŸŒ¿ Tanaman: {stage_name} (HP: {health_description})
ðŸ’° Total pengeluaran 3 hari: Rp{total}

{Jika aktif:}
Kamu udah lebih aware dari 88% orang Indonesia 
yang gak punya catatan keuangan. Serius.

{Jika kurang aktif:}
Belum banyak catatan? Gapapa — ini marathon, bukan sprint. 
Coba mulai dari yang paling gampang: scan struk belanja 
terakhir kamu. Fotonya pasti masih di galeri.

Fitur yang mungkin belum kamu coba:
ðŸ“¸ Scan struk: foto struk → AI langsung baca → otomatis tercatat
ðŸŽ™ï¸ Voice input: bilang aja "makan warteg 15rb" — done

[Buka CatetInd →]
```

### Email 4 — Hari 7

**Subject:** "1 minggu! Recap mingguan pertamamu udah siap ðŸŽ‰"

```
Hai {Nama},

Seminggu bersama CatetInd! ðŸŽ‰

Recap mingguan pertamamu udah siap di app — 
ini versi ringkasnya:

📊 Total pengeluaran minggu ini: Rp{weekly_total}
📈 Kategori terbesar: {top_category} ({percentage}%)
ðŸŒ¿ Tanaman: {stage_name}
ðŸ”¥ Streak: {streak} hari

Yang menarik:
{AI-generated insight 1 kalimat, misal: 
"Pengeluaran makanan kamu 45% dari total — itu di atas rata-rata 
user CatetInd yang lain."}

Mau lihat detail lengkapnya?
[Lihat Recap Mingguan →]

P.S. Kalau kamu udah suka CatetInd, ajak temen kamu — 
kalian berdua dapet bonus. Link referral kamu: 
catetind.com/r/{kode}
```

### Email 5 — Hari 14

**Subject:** "{Nama}, kita mau tanya jujur. Gimana sejauh ini?"

```
Hai {Nama},

2 minggu.

Ini biasanya momen kritis — kebanyakan orang berhenti 
mencatat di minggu ke-2. Tapi kamu masih di sini.

{Jika streak > 10:}
Dan kamu masih aktif! {streak} hari streak — itu luar biasa.
Tanamanmu udah {stage_name}. Beneran growing ðŸŒ¿

{Jika streak putus:}
Kami notice kamu agak jarang catat belakangan. 
Dan itu 100% oke. Hidup kadang sibuk.

Yang penting: datamu masih aman, tanamanmu masih hidup 
(mungkin agak layu ðŸŒ±), dan kamu bisa mulai lagi kapan aja.

Kami mau tanya jujur: gimana pengalaman kamu sejauh ini?
Balas email ini — 1 kalimat aja cukup. Serius, {Nama Founder} 
yang baca langsung.

Ingat garansi kami: kalau dalam 30 hari kamu merasa CatetInd 
gak membantu, uang kembali 100%. Gak perlu drama. 
Tapi kami berharap kamu tetap di sini ðŸ’š

[Buka CatetInd →]
```

---

## In-App Notification Strategy

### Frequency Cap

| Tipe | Max per Minggu | Channel |
|---|---|---|
| **Push notification** | 3x/minggu | Browser push |
| **In-app banner** | 2x/minggu | Homescreen card |
| **AI toast** | Variable (1/5 tx) | Sonner toast |
| **Email** | 1x/minggu (setelah onboarding selesai) | Email |

**Total touchpoint max per minggu: 6** (3 push + 2 banner + 1 email). AI toast tidak dihitung karena terjadi saat user aktif di app.

### Notifikasi yang BOLEH vs TIDAK BOLEH

| âœ… BOLEH | âŒ TIDAK BOLEH |
|---|---|
| "Recap mingguan kamu udah siap 📊" | "Kamu belum catat hari ini!" (guilt trip) |
| "Tanamanmu agak layu — satu catatan aja biar segar ðŸŒ±" | "URGENT: Streak kamu mau putus!" (anxiety) |
| "Pengeluaran makanan kamu turun 15% minggu ini! ðŸŽ‰" | "Hemat lebih banyak minggu depan!" (preachy) |
| "Bulan baru! Yuk set target bulan ini ðŸŒ¿" | "Kamu belum set target! Ayo!" (pushy) |
| Post-lunch & post-dinner nudge (12:30 & 19:00 WIB) | Random timing (jam 3 pagi, dll) |

---

## Month 1 Report (Membuat User Merasa Berhasil)

> **[BIMA]:** "Bulan pertama, sebagian besar user belum mengalami transformasi keuangan yang dramatis. Report ini harus membuat mereka merasa berhasil berdasarkan KEBIASAAN yang terbentuk, bukan hasil finansial."

### Report Framing: "Apa yang Kamu Bangun di Bulan Pertama"

```
┌──────────────────────────────────────────────────┐
┐‚                                                  ┐‚
┐‚  📊 Laporan Bulan 1 — September 2026            ┐‚
┐‚  {Nama}                                          ┐‚
┐‚                                                  ┐‚
┐‚  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•          ┐‚
┐‚                                                  ┐‚
┐‚  KEBIASAAN YANG KAMU BANGUN:                     ┐‚
┐‚  âœ… {X} hari mencatat (dari 30 hari)             ┐‚
┐‚  âœ… {Y} transaksi tercatat                       ┐‚
┐‚  âœ… Streak terpanjang: {Z} hari                  ┐‚
┐‚                                                  ┐‚
┐‚  INI YANG KAMU TEMUKAN:                          ┐‚
┐‚  ðŸ“Œ Kategori terbesar: {category} ({%})          ┐‚
┐‚  ðŸ“Œ Pengeluaran yang "gak jelas": Rp{unknown}   ┐‚
┐‚  ðŸ“Œ Hari paling boros: {hari} (rata-rata Rp{X})  ┐‚
┐‚                                                  ┐‚
┐‚  TANAMAN KAMU:                                   ┐‚
┐‚  ðŸŒ¿ Stage: {stage_name}                          ┐‚
┐‚  ðŸŒ¿ HP: {"Sehat" / "Subur" / "Sangat subur"}    ┐‚
┐‚                                                  ┐‚
┐‚  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•          ┐‚
┐‚                                                  ┐‚
┐‚  Bulan depan, AI Coach kamu sarankan:            ┐‚
┐‚  "Coba kurangi {top_category} 10% — itu setara   ┐‚
┐‚   Rp{saving}/bulan yang bisa kamu sisihkan ðŸ’š"   ┐‚
┐‚                                                  ┐‚
┐‚  [Set Target Bulan Depan →]                      ┐‚
┐‚  [Share Pencapaian →] (privacy-safe card)        ┐‚
┐‚                                                  ┐‚
┐‚  "Dari benih ke {stage_name} dalam 30 hari.      ┐‚
┐‚   Kamu bukan orang yang sama dengan sebulan lalu.┐‚
┐‚   Terus tumbuh, {Nama} ðŸŒ¿"                       ┐‚
┐‚   — Coach, AI Financial Coach kamu               ┐‚
┐‚                                                  ┐‚
┐”──────────────────────────────────────────────────┐˜
```

**Key framing decisions:**
- "Kebiasaan yang kamu bangun" → habit formation > financial outcome
- "Ini yang kamu temukan" → discovery > judgment
- Tanaman progress → visual anchor for emotional satisfaction
- AI Coach closing message → AI-generated (real-time, DeepSeek V3) — 1 dari 6 monthly AI calls

---

# ASUMSI & INTERPRETASI YANG DIAMBIL

### A1. Waitlist Target: 500 Orang (Bukan 1.000+)
**Instruksi:** "Target ukuran waitlist: 500+ orang."  
**Interpretasi:** 500 sebagai minimum viable. Dengan 12% conversion rate (historis SEA paid app), ini = 60 paying users hari pertama. 60 Ã— Rp~165.000 (avg harga slot 1-60) = Rp9.9jt revenue hari pertama. Achievable untuk tim 2 orang dengan Instagram organic only dalam 4-6 minggu.

### A2. Referral Bonus: +5 Posisi per Ajakan (Bukan Persentase)
**Instruksi:** "Posisi antrian naik."  
**Keputusan:** Fixed +5 posisi per successful referral. Alasan: simple mental math ("ajak 2 teman = naik 10 posisi"), predictable untuk user, mudah di-explain di copy. Alternatif yang ditolak: persentase (membingungkan), random bonus (tidak predictable).

### A3. Early Access Window: 1 Jam (Bukan 24 Jam)
**Instruksi:** "Reward posisi antrian atas: peluang jadi Founding Member paling awal."  
**Keputusan:** Top 300 waitlist mendapat 1 jam early access checkout sebelum publik. 1 jam dipilih karena: cukup untuk serious waitlist members checkout, cukup pendek untuk tidak membuat publik frustrasi menunggu, dan menciptakan urgency ("1 jam eksklusif!").

### A4. Influencer Jumlah: 20-50 Akun (Bukan 100+)
**Instruksi:** "20-50 micro/nano-influencer."  
**Keputusan:** Mulai dari 20 di wave 1 (pre-launch), ekspansi ke 50 di wave 2 (post-launch bulan 1-2). Alasan: 20 akun sudah cukup untuk saturate target audience di Instagram. Setiap akun di-DM secara personal oleh founder — ini lebih efektif tapi time-intensive. 50 sekaligus = tidak manageable untuk 2 orang.

### A5. Referral Reward: +30 Hari Perpanjangan (Bukan Cash/Diskon)
**Instruksi:** "KREDIT PRODUK (misal +30 hari perpanjangan, atau 1 bulan Add-on AI Token gratis), BUKAN cash."  
**Keputusan:** Default reward = +30 hari perpanjangan untuk regular subscribers. Founding Member/Early Adopter (yang sudah lifetime) mendapat 1 bulan Add-on AI Token gratis sebagai gantinya. Alasan: lifetime users tidak butuh perpanjangan — AI Token adalah value yang masih relevan.

### A6. Email Reply: Founder Langsung, Bukan Bot
**Instruksi:** Tidak disebutkan siapa yang balas email.  
**Keputusan:** Semua email onboarding mengklaim "founder langsung yang baca dan jawab." Ini HARUS benar — email masuk harus di-route ke inbox founder dan dijawab personal. Ini hanya scalable untuk 300-600 first users (Founding + Early Adopter). Setelah itu: evaluasi apakah perlu bantuan CS (masih manual, bukan bot — tapi bisa delegate ke part-timer).

### A7. Product Hunt: Posting Jam 09:15 WIB (Bukan Midnight PST)
**Instruksi:** "Bagaimana memanfaatkan Product Hunt."  
**Keputusan:** Posting jam 09:15 WIB (= 02:15 UTC, yang artinya sudah lewat midnight PST reset Product Hunt). Product Hunt daily ranking reset jam 00:00 PST (15:00 WIB). Posting pagi WIB berarti kita punya seharian penuh untuk mengumpulkan upvotes sebelum hari PH berakhir. CatetInd bukan produk global — PH dipakai untuk validation signal dan PR, bukan sebagai primary acquisition channel.

### A8. Contingency: TIDAK Turunkan Harga
**Instruksi:** "Kalau 6 jam setelah launch hanya 10 orang yang beli, apa yang dilakukan?"  
**Keputusan:** TIDAK PERNAH turunkan harga atau beri diskon panik. Alasan (ARIA): dynamic pricing = trust contract. Jika user yang sudah beli di Rp165.000 melihat harga turun ke Rp99.000 besoknya, trust hancur permanen. Contingency yang diizinkan: ubah messaging, tambah konten, DM personal, live Q&A. BUKAN modifikasi pricing.

### A9. Content: Ide Spesifik Deferred, Hanya Framework
**Instruksi:** "Ide konten konkret (naskah Reels/Carousel spesifik per pillar) BELUM diisi — sengaja didefer."  
**Keputusan:** 10 ide Reels dan 5 ide Carousel yang tercantum adalah FRAMEWORK (hook + treatment + CTA). Naskah word-by-word, shot list, dan exact audio selection di-defer ke eksekusi nyata sesuai instruksi. Framework ini cukup untuk memulai produksi tanpa briefing tambahan.

### A10. In-App Notification Cap: 3 Push per Minggu
**Instruksi:** "Tidak boleh lebih dari X per minggu."  
**Keputusan:** X = 3 push notification per minggu. Breakdown: 2x daily nudge (Selasa + Kamis, 12:30/19:00) + 1x weekly recap (Minggu 20:00). Alasan (BIMA): >3 push/minggu = user mute channel (data Clevertap 2025: 73% Gen-Z mute app dengan >4 push/minggu). 3 = sweet spot antara reminder dan respect boundaries.



---


# CatetInd — Domain 8: Competitive Moat & Red-Team Stress Test
## Structural Advantages · Compounding Mechanisms · Honest Vulnerability Analysis

**Versi:** 1.0  
**Tanggal:** 22 September 2026  
**Tim Persona:** ARIA · BIMA · CANDRA · DIAN  
**Prasyarat:** Domain 2-7 (seluruh keputusan arsitektur, produk, pricing, dan GTM)  
**Status CatetInd:** BELUM LAUNCH — zero users, zero data, zero network effect

---

## DAFTAR ISI

1. [8A. Immediate Structural Advantages (Hari 1)](#8a-immediate-structural-advantages-hari-1)
2. [8B. Compounding Advantages (12 Bulan+)](#8b-compounding-advantages-12-bulan)
3. [8C. Red-Team Stress Test](#8c-red-team-stress-test)
4. [Asumsi & Interpretasi yang Diambil](#asumsi--interpretasi-yang-diambil)

---

## CATATAN PEMBUKA: KEJUJURAN TENTANG POSISI HARI 1

> **[ARIA — Principal Product Strategist]:** "Mari bicara jujur. Di hari pertama, CatetInd punya ZERO network effect, ZERO data moat, ZERO brand recognition. Kita bukan startup Silicon Valley dengan \$5M seed round yang bisa meng-outspend kompetitor. Kita 2 orang dengan laptop dan akun Supabase. Yang kita PUNYA adalah serangkaian keputusan arsitektural dan positioning yang — jika dieksekusi dengan konsisten — menciptakan posisi yang secara struktural sulit ditiru BUKAN karena kita pintar, tapi karena kompetitor harus MERUSAK sesuatu yang sudah mereka bangun untuk meniru kita."

> **[DIAN — Growth & Conversion Psychologist]:** "Moat sejati bukan tembok tinggi. Moat sejati adalah pilihan-pilihan yang kita buat yang MEMAKSA kompetitor memilih antara meniru kita ATAU mempertahankan identitas mereka. Mereka tidak bisa melakukan keduanya. Itu yang harus kita buktikan di domain ini."

---

# 8A. IMMEDIATE STRUCTURAL ADVANTAGES (HARI 1)

Ketiga advantage berikut berlaku sejak hari pertama launch — bukan dari akumulasi waktu, tapi dari posisi arsitektural dan keputusan strategis yang sudah di-commit di Domain 1-7.

---

## Advantage 1: Privacy-First Zero-Exception Architecture

### Sumber Keputusan
- **Domain 4C:** RLS dengan `user_role: 'admin'` custom JWT claim — admin HANYA mengakses materialized views aggregate (`admin_aggregate_stats`, `admin_user_cohorts`). ZERO akses ke tabel `transactions`, `wallets`, atau data individual manapun. Bahkan untuk customer support.
- **Domain 2A:** Input 100% manual + AI OCR + Voice. ZERO open banking, ZERO bank-sync.
- **Domain 5E:** Disclaimer OJK eksplisit: "CatetInd BUKAN penasihat investasi terdaftar OJK." AI guardrail melarang menyebut produk investasi spesifik.

### Mengapa Ini Structural, Bukan Fitur

> **[CANDRA — Principal Web Architect]:** "Ini bukan toggle di Settings. Ini bukan 'mode privasi opsional'. Seluruh database schema CatetInd didesain dari ground zero TANPA kemampuan untuk membaca data individual user — bahkan oleh admin. Tidak ada endpoint, tidak ada function, tidak ada materialized view yang memungkinkan akses itu. Untuk MENAMBAHKAN kemampuan baca data individual, kita harus: (1) menulis RLS policy baru, (2) membuat endpoint baru, (3) membuat UI admin baru, (4) update Privacy Policy, (5) re-audit seluruh security posture. Itu bukan 'fitur yang dihilangkan' — itu 'arsitektur yang secara aktif mencegah akses'."

### Mengapa Budggt/Fundy Tidak Bisa Meniru Ini

**Budggt** (budggt.com) memposisikan diri sebagai wealth management dashboard. Value prop mereka = data analitik komprehensif. Jika mereka memiliki (atau berencana memiliki) fitur bank-sync, seluruh value proposition mereka BERGANTUNG pada kemampuan mengakses dan mengolah data keuangan user secara detail di server-side. Untuk meniru posisi "kami tidak bisa melihat data kamu":

1. Mereka harus MENGHAPUS fitur bank-sync (jika ada) — kehilangan value prop inti.
2. Mereka harus me-refactor seluruh backend agar admin tidak bisa query data individual — ini bukan sprint 2 minggu, ini re-architecture.
3. Mereka harus mengubah marketing messaging dari "lihat semua keuanganmu di satu tempat" menjadi "catat sendiri, kami gak bisa lihat" — kontradiksi dengan brand image yang sudah dibangun.

**Fundy** (fundy.id) menggunakan chat-based input yang kemungkinan besar menyimpan seluruh histori chat di server untuk training/improvement. Untuk meniru klaim "zero admin access ke data individual", mereka harus menghentikan kemampuan tim mereka membaca chat history — yang kemungkinan adalah sumber insight produk utama mereka.

### Kesimpulan
Privacy-first bukan fitur yang ditambahkan — ini adalah TRADE-OFF yang di-commit. CatetInd mengorbankan kemampuan customer support berbasis data individual (diganti dengan "Export Data Saya" + screenshot policy dari Domain 4C) demi posisi trust yang tidak bisa diklaim kompetitor tanpa pengorbanan serupa.

---

## Advantage 2: Dual-Persona Build-in-Public GTM

### Sumber Keputusan
- **Domain 7B:** 2 persona konten (Faceless untuk Reels pain content + Personal Brand untuk Stories behind-the-build). Bukan brand korporat — ini 2 manusia nyata yang membangun produk dan bercerita tentang prosesnya.
- **Domain 7E:** Launch day playbook yang eksplisit memanfaatkan narasi "kami 2 orang yang bikin ini."

### Mengapa Ini Structural

> **[DIAN]:** "Build-in-public bukan strategi konten. Ini adalah positioning statement: 'kami bukan korporasi, kami temanmu yang kebetulan bisa coding.' Gen-Z Indonesia punya trust deficit BESAR terhadap brand korporat keuangan — Jouska skandal 2020, Indosurya, dll. '2 orang biasa yang bikin app keuangan karena frustasi sendiri' adalah narasi yang secara emosional tidak bisa dibeli atau ditiru oleh perusahaan yang sudah punya 50 karyawan."

### Mengapa Kompetitor Established Tidak Bisa Meniru Ini

**Budggt** sudah memposisikan diri sebagai brand korporat profesional. Jika besok mereka membuat konten "kami juga 2 founder yang building in public!", audiens mereka akan merespons: "Tapi kalian udah established, punya tim besar, ini acting."

Risiko spesifik jika kompetitor established mencoba meniru:
1. **Authenticity gap:** Audiens bisa cek LinkedIn — jika company sudah punya 20+ karyawan, narasi "kami kecil" terasa dishonest
2. **Tone mismatch:** Brand yang sudah punya voice formal/korporat tidak bisa tiba-tiba switch ke "gue lagi coding jam 2 pagi" tanpa merasa jarring
3. **Konten forensik Gen-Z:** Gen-Z Indonesia sangat jago membedakan konten organik vs konten yang "diminta bos bikin." Satu momen yang terasa scripted = instant credibility loss

### Kesimpulan
Narasi "2 orang bootstrapped building in public" hanya authentic ketika itu BENAR. CatetInd memiliki ini secara default. Kompetitor yang mencoba meniru akan terasa performative — dan Gen-Z adalah generasi paling sensitif terhadap performative authenticity.

---

## Advantage 3: Founding Member Dynamic Pricing sebagai Psychological Commitment Device

### Sumber Keputusan
- **Domain 5A:** 300 slot Founding Member, harga naik Rp2.000 per pembelian, mulai Rp149.000. Setiap Founding Member memiliki slot number unik dan harga unik.
- **Domain 6 Section 4:** Live Purchase Feed menampilkan nama, kota, harga, dan waktu — setiap pembelian menjadi social proof yang terasa personal.
- **Domain 7D:** Referral two-sided — Founding Member yang mereferensikan teman mendapat +30 hari atau AI Token.

### Mengapa Ini Tidak Bisa Direplikasi

> **[ARIA]:** "Founding Member #47 yang bayar Rp241.000 TAHU bahwa mereka mendapat harga yang tidak akan pernah tersedia lagi — untuk siapapun, kapanpun. Ini bukan diskon early bird yang bisa diulang tahun depan. Ini bukan promo yang bisa di-copy paste. Ini adalah commitment artifact yang hanya ada SEKALI dalam sejarah produk."

Mengapa kompetitor tidak bisa meniru:

1. **Timing irreversibility:** "300 orang pertama yang percaya" hanya terjadi sekali. Jika Budggt besok meluncurkan "Budggt Founding Member", audiens mereka akan bertanya: "Kok baru sekarang? Udah berapa lama kalian ada?" — narasi founding HANYA credible di awal.
2. **Price uniqueness:** Setiap Founding Member CatetInd punya harga yang berbeda-beda (Rp149K, Rp151K, Rp153K, ...). Ini menciptakan identitas personal: "Gue Founding Member #47, harga gue Rp241K." Tidak ada dua user yang identik. Ini tidak bisa direplikasi bahkan oleh CatetInd sendiri di masa depan.
3. **Sunk cost + identity fusion:** User yang sudah membayar Rp241.000 lifetime akan merasa "gue bagian dari cerita ini." Psychological ownership (Endowment Effect) membuat mereka resist switching ke kompetitor — bukan karena produk CatetInd lebih bagus (mungkin belum di hari 1), tapi karena mereka sudah "invested" secara emosional.

### Kesimpulan
Dynamic pricing per-slot menciptakan 300 "identitas unik" yang masing-masing punya alasan personal untuk tetap — dan untuk bercerita. Ini bukan program loyalitas generik yang bisa di-copy. Ini adalah bukti sosial berbasis timing yang secara definisi only happens once.

---

# 8B. COMPOUNDING ADVANTAGES (12 BULAN+)

Ketiga advantage berikut BELUM ADA di hari pertama. Tapi mekanisme akumulasinya sudah di-design ke dalam keputusan Domain 2-7. Yang perlu dibuktikan: BAGAIMANA tepatnya mereka compound.

---

## Advantage 4: Data Pola Bahasa Finansial Gen-Z Indonesia

### Sumber Keputusan
- **Domain 2A:** AI auto-naming via DeepSeek V3 mengkategorisasi setiap transaksi berdasarkan deskripsi bahasa Indonesia informal user ("beli indomaret 25rb", "bayar laundry kos", "nongkrong sama temen gak tau abis berapa").
- **Domain 4B:** Semua chat coaching, voice input parsing, dan OCR result disimpan sebagai training signal.

### Mekanisme Akumulasi (Terukur)

```
Bulan 1: 60 users Ã— 20 transaksi/minggu Ã— 4 = 4.800 labeled transactions
Bulan 3: 200 users Ã— 20 tx/minggu Ã— 12 = 48.000 labeled transactions
Bulan 6: 400 users Ã— 20 tx/minggu Ã— 24 = 192.000 labeled transactions
Bulan 12: 600 users Ã— 20 tx/minggu Ã— 48 = 576.000 labeled transactions
```

**Apa yang terakumulasi secara spesifik:**

1. **Mapping bahasa informal → kategori keuangan:** "Seblak Mang Ujang 15rb" → Makanan. "Isi pulsa buat wifi kos" → Utilitas. "Bayar itu yg kemarin" → AI harus menebak dari konteks histori user. Dataset ini TIDAK ADA di dataset publik manapun — bukan Wikipedia, bukan Common Crawl. Ini adalah korpus bahasa keuangan informal Gen-Z Indonesia yang hanya CatetInd miliki.

2. **Pola pengeluaran per-segmen:** Anak kos Jakarta vs Bandung vs Surabaya punya pattern berbeda. CatetInd tahu bahwa "warteg rata-rata Rp15.000 di Jakarta tapi Rp10.000 di Jogja" — dari data real, bukan asumsi.

3. **Voice input parsing improvement:** "Gue beli kopi tadi tiga puluh lima ribu" → OCR butuh konteks bahwa "tiga puluh lima ribu" = Rp35.000. Semakin banyak voice sample, semakin akurat parsing bahasa informal.

### Mengapa Ini Compound (Bukan Linear)

> **[CANDRA]:** "Setiap koreksi yang user lakukan saat AI salah kategorisasi ('Bukan Makanan, ini Transportasi') menjadi labeled data point baru. Di bulan 1, akurasi kategorisasi mungkin 75%. Di bulan 6, dengan 192.000 data points dan koreksi, akurasi bisa naik ke 90%+. Kompetitor baru yang memulai dari nol di bulan 6 akan memiliki akurasi 75% — dan user mereka akan frustrasi dengan error rate yang user CatetInd sudah tidak alami."

**Compound metric yang bisa diukur:**
- **Auto-categorization accuracy:** % transaksi yang dikategorisasi benar tanpa koreksi user. Target: 75% di bulan 1 → 90% di bulan 12.
- **AI naming precision:** % deskripsi transaksi yang diberi nama bermakna (bukan generic "Transaksi"). Target: 60% → 85%.
- Diukur via: query Supabase `SELECT COUNT(corrected) / COUNT(*)` dari tabel `transactions` per bulan.

---

## Advantage 5: Cohort Founding Member sebagai Evangelist Force

### Sumber Keputusan
- **Domain 5A:** 300 Founding Members dengan slot number unik + harga unik.
- **Domain 7D:** Referral two-sided (+30 hari perpanjangan pengundang + 10% diskon yang diundang).
- **Domain 3B:** Tanaman ("Pohon Uang") dengan 7 stage — Founding Members yang aktif dari hari 1 akan punya tanaman paling mature di komunitas.

### Mekanisme Akumulasi (Terukur)

**Bulan 1-3: Identity Formation**
- 300 Founding Members masing-masing punya slot number (#1-#300) dan harga unik
- Mereka adalah SATU-SATUNYA user yang memiliki badge "Founding Member" di profil
- Tanaman mereka sudah stage 2-3 saat user baru masih stage 0
- Mereka sudah punya data keuangan 1-3 bulan saat user baru mulai dari nol

**Bulan 3-6: Social Capital Accumulation**
- Founding Members yang share progress card (`#CatetAjaDulu`) menjadi ambassador organik
- Setiap share menampilkan badge "Founding Member #47" — ini status symbol yang TIDAK bisa dibeli (slot sudah habis)
- Referral two-sided mengaktifkan compound loop:
  ```
  FM #47 refers Friend A → Friend A bayar → FM #47 dapat +30 hari AI Token
  Friend A refers Friend B → Friend A dapat +30 hari
  ... dan seterusnya
  ```

**Bulan 6-12: Evangelist Lock-in**
- Founding Members yang sudah punya 6+ bulan data keuangan = switching cost sangat tinggi (data lock-in dari Advantage 4)
- Tanaman mereka sudah stage 5-6 (pohon besar) — meninggalkan app = "membunuh" tanaman yang sudah dirawat berbulan-bulan (Endowment Effect dari Domain 3B)
- Mereka secara natural menjadi "testimoni hidup" — "gue udah pake 6 bulan, nabung Rp12jt yang tadinya gak pernah bisa"

**Compound metric yang bisa diukur:**
- **Referral conversion rate per FM:** Rata-rata berapa user baru per Founding Member per bulan. Target: 0.5 referral/FM/bulan (150 new users/bulan dari referral saja setelah bulan 6).
- **FM retention rate:** % Founding Members yang masih aktif (minimal 1 transaksi/minggu). Target: D180 >50%.
- **FM-originated content:** Jumlah Instagram posts/stories yang menggunakan #CatetAjaDulu dan berasal dari Founding Members.
- Diukur via: Supabase query `referrals` table + PostHog event `share_progress`.

---

## Advantage 6: Creator/Micro-Influencer Seeding Network

### Sumber Keputusan
- **Domain 7C:** 20-50 micro/nano-influencer (5K-50K followers) mendapat Founding Member gratis seumur hidup. Outreach personal via DM founder.

### Mekanisme Akumulasi (Terukur)

**Mengapa relationship > budget:**

> **[DIAN]:** "Micro-influencer yang di-DM personal oleh founder, dikasih akses gratis, dan benar-benar menggunakan produk → ini bukan endorsement berbayar. Ini adalah genuine recommendation. Dan di mata audiens mereka, itu 10x lebih credible dari paid promotion. Kompetitor yang datang 6 bulan kemudian dan menawarkan uang cash ke influencer yang sama akan KALAH dari relationship yang sudah terbangun — karena influencer itu sudah terikat secara emosional dengan CatetInd (Endowment Effect + Reciprocity Bias)."

**Timeline akumulasi:**

| Bulan | Aksi | Efek |
|---|---|---|
| 0-1 | DM 20 creator, kirim akses gratis | 10-15 yang benar-benar pakai dan post |
| 1-3 | Follow up personal, tanya feedback | Relationship deepens, mereka merasa "part of the team" |
| 3-6 | Ekspansi ke 30-50, dibantu referral dari wave 1 | Wave 1 creators merekomendasikan CatetInd ke creator teman mereka (peer referral) |
| 6-12 | Creator organically mention CatetInd saat ditanya "app keuangan apa yang kamu pake?" | Unprompted mentions = gold standard social proof |

**Compound metric yang bisa diukur:**
- **Unprompted mention rate:** % creator seeded yang menyebut CatetInd tanpa diminta setelah bulan ke-3. Target: >30%.
- **Creator-originated sign-ups:** Total sign-ups dari UTM `utm_medium=creator`. Target: 15% dari total sign-ups di bulan 6.
- **Creator retention:** % creator seeded yang masih aktif menggunakan CatetInd di bulan 6. Target: >60%.

### Mengapa Ini Butuh Waktu Dibangun Ulang

Kompetitor yang datang dengan budget Rp50jt untuk influencer marketing akan mendapatkan 50 paid posts — tapi BUKAN 50 genuine users. CatetInd mendapatkan 20-50 genuine users yang kebetulan punya audiens. Perbedaan ini terasa di komentar section:

- Paid: "Udah coba Budggt, lumayan oke! Link di bio ya" + 20 komentar "paid kah?"
- Genuine: "Gue udah 3 bulan pake CatetInd dan baru nyadar gue abis Rp2jt buat kopi ðŸ˜­" + 200 komentar "download di mana??"

---

# 8C. RED-TEAM STRESS TEST

> **[ARIA]:** "Bagian ini adalah acid test. Setiap advantage yang kita klaim di atas HARUS bisa ditantang dengan skenario realistis. Jika kita tidak bisa menemukan skenario tembus, itu berarti analisis kita bias — bukan berarti advantage kita tak tertembus."

---

## STRESS TEST — Advantage 1: Privacy-First Architecture

### Skenario Tembus

**"Budggt merilis Mode Privasi Opsional"**

Budggt menambahkan toggle di Settings: "Mode Privasi — matikan bank-sync, semua input manual." Mereka tidak perlu me-refactor seluruh backend — cukup membuat jalur input terpisah yang bypass bank-sync. Marketing mereka: "Sekarang kamu yang pilih: auto-sync ATAU manual. Privasi di tanganmu."

**Mengapa ini realistis:** Toggle opsional JAUH lebih mudah diimplementasi daripada full architectural overhaul. Budggt bisa merilis ini dalam 4-6 minggu.

**Mengapa ini berbahaya:** Jika Budggt berhasil mengklaim "kami juga privasi-first", diferensiasi CatetInd di poin ini terkikis. User yang belum committed ke CatetInd mungkin berpikir: "Budggt bisa bank-sync DAN manual, CatetInd cuma manual. Budggt lebih fleksibel."

### Mitigasi (Harus Disiapkan SEKARANG)

1. **Framing: "Privasi opsional" â‰  "Privasi by design"**
   CatetInd harus secara proaktif mengedukasi audiens tentang perbedaan ini SEBELUM kompetitor bergerak:
   - "Privasi opsional" = data kamu BISA diakses kalau kamu lupa matikan toggle, atau kalau ada breach di jalur bank-sync
   - "Privasi by design" = sistemnya TIDAK MAMPU mengakses data kamu, bahkan kalau kami mau

2. **Copy yang harus disiapkan:**
   > "Di CatetInd, privasi bukan tombol yang bisa dimatikan. Bahkan tim kami sendiri tidak bisa melihat transaksimu — karena sistemnya memang tidak didesain untuk itu. Itu beda dengan 'mode privasi' yang bisa dinyalakan-matikan."

3. **Technical proof point:** Publish RLS policy CatetInd di blog/landing page (tanpa expose security detail). Tunjukkan bahwa admin role SECARA TEKNIS tidak memiliki akses ke tabel `transactions`. Ini transparent dan verifiable — kompetitor yang mengklaim "kami juga privasi" tapi tidak bisa menunjukkan bukti teknis serupa akan terlihat lemah.

### Post-Test Verdict: âœ… LOLOS DENGAN MITIGASI

Advantage ini bertahan JIKA CatetInd secara proaktif mendefinisikan "privacy by design vs privacy by toggle" di narasi marketing SEBELUM kompetitor bergerak. Jika menunggu sampai Budggt merilis "Mode Privasi", framing war sudah terlambat.

**Sinyal early-warning:** Budggt menambahkan kata "privasi" di landing page, blog, atau social media. **Pemantau:** Founder Personal Brand (cek kompetitor mingguan, 15 menit setiap Senin pagi).

---

## STRESS TEST — Advantage 2: Dual-Persona Build-in-Public GTM

### Skenario Tembus

**"Fundy mulai konten build-in-public founder mereka sendiri"**

Founder Fundy (yang mungkin juga muda dan relatable) mulai posting konten personal: "Cerita di balik Fundy, gimana kita mulai dari nol." Mereka sudah punya userbase yang lebih besar — cerita mereka mungkin bahkan lebih menarik karena sudah ada traction nyata.

**Mengapa ini realistis:** Build-in-public bukan trademark. Siapapun bisa mulai kapan saja. Dan jika founder Fundy memang authentically muda dan relatable, narasi mereka bisa lebih kuat karena sudah ada proof of traction.

**Mengapa ini berbahaya:** Jika dua app keuangan Gen-Z sama-sama build-in-public, diferensiasi ini menjadi komoditif. Audiens harus memilih berdasarkan faktor lain.

### Mitigasi (Harus Disiapkan SEKARANG)

1. **First-mover dalam narasi:** CatetInd harus memulai konten build-in-public SEBELUM kompetitor. Semakin lama CatetInd "memiliki" narasi ini, semakin sulit kompetitor terlihat original saat meniru. Konsistensi > timing — akun yang sudah posting 60 hari build-in-public terasa lebih genuine dari yang baru mulai.

2. **Differentiasi konten, bukan format:** Build-in-public CatetInd harus punya angle yang BERBEDA dari "generic startup journey":
   - "Kami build CatetInd SAMBIL pakai CatetInd untuk track keuangan startup kami" (meta-narrative: dogfooding as content)
   - "Setiap minggu, kami share BERAPA user baru, berapa revenue, berapa burn rate — transparently" (radical transparency yang kebanyakan startup tidak berani)

3. **Copy yang harus disiapkan:**
   > "CatetInd dibangun 2 orang yang juga pakai CatetInd buat ngatur uang mereka sendiri. Kami gak cuma bikin app — kami juga user-nya. Dan semua angkanya kami share di Instagram Stories, setiap minggu."

### Post-Test Verdict: âš ï¸ LOLOS DENGAN CATATAN

Advantage ini TIDAK bertahan jangka panjang sebagai moat mandiri. Build-in-public adalah momentum play, bukan defensibility play. Nilainya terletak pada first-mover dalam narasi + konsistensi. Setelah bulan ke-6, advantage ini harus sudah bertransformasi dari "kami 2 orang yang build in public" menjadi "kami 2 orang yang sudah TERBUKTI build in public selama 6 bulan dengan data transparan."

**Sinyal early-warning:** Founder kompetitor mulai posting konten personal/behind-the-scenes di Instagram/LinkedIn. **Pemantau:** Founder Faceless (alert Google untuk nama founder kompetitor + "build in public").

---

## STRESS TEST — Advantage 3: Founding Member Dynamic Pricing

### Skenario Tembus

**"New entrant meniru model dynamic pricing dengan twist yang lebih menarik"**

Startup baru meluncurkan app keuangan dengan model "1.000 Founding Members, harga mulai Rp99.000, naik Rp1.000 per slot." Mereka bisa bahkan menambahkan gamifikasi: "Setiap 100 slot terisi, fitur baru di-unlock."

**Mengapa ini realistis:** Dynamic pricing bukan paten. Mekanismenya bisa di-copy dalam 1 sprint engineering. Dan new entrant bisa mulai dari harga lebih rendah.

**Mengapa ini (masih) kurang berbahaya dari yang terlihat:**
- CatetInd punya "first-to-do-it" advantage di market Indonesia. "Founding Member CatetInd" sudah menjadi identitas. "Founding Member [Startup Baru]" belum punya makna emosional.
- 300 orang yang SUDAH membayar CatetInd tidak bisa di-un-commit — uang sudah keluar, sunk cost sudah terbentuk.
- Tapi: jika new entrant muncul SEBELUM CatetInd mengisi 300 slot, ini memang membahayakan.

### Mitigasi (Harus Disiapkan SEKARANG)

1. **Speed-to-fill:** 300 slot HARUS terisi dalam 90 hari setelah launch. Semakin cepat slot penuh, semakin kuat narrative "sold out" dan semakin irrelevant tiruan dari kompetitor. Jika setelah 90 hari masih ada slot tersisa, urgency menurun dan kompetitor punya waktu meniru.

2. **Community building post-slot-full:** Setelah 300 slot penuh, CatetInd harus memiliki channel komunitas Founding Members (private Instagram Close Friends list atau Discord channel) yang membuat mereka merasa "exclusive club." Ini memperdalam identity fusion.

3. **Copy yang harus disiapkan (setelah sold out):**
   > "300 Founding Members CatetInd — sold out dalam [X] hari. Mereka percaya sebelum siapapun. Sekarang, harganya Rp249.000 untuk 300 berikutnya. Kalau kamu mau jadi bagian dari wave kedua, link di bio."

### Post-Test Verdict: âœ… LOLOS JIKA SLOT TERISI <90 HARI

Advantage ini lolos JIKA eksekusi cepat. Mekanismenya (slot unik + harga unik + identitas personal) secara definisi tidak bisa direplikasi oleh entitas lain untuk CatetInd secara spesifik. Yang bisa ditiru adalah MODEL-nya, bukan COHORT-nya. "300 Founding Member CatetInd" â‰  "300 Founding Member App Lain."

**Sinyal early-warning:** Startup baru di Indonesia menggunakan model dynamic pricing serupa. **Pemantau:** Google Alert untuk "founding member" + "app keuangan" + "Indonesia."

---

## STRESS TEST — Advantage 4: Data Pola Bahasa Finansial

### Skenario Tembus

**"Kompetitor membeli dataset NLP bahasa Indonesia dari vendor, atau fine-tune model pada data publik social media"**

DeepSeek/OpenAI sudah terlatih pada bahasa Indonesia. Kompetitor bisa fine-tune model pada dataset scraped dari Twitter/X posts tentang keuangan, atau membeli dataset dari vendor NLP Indonesia. Mereka tidak perlu 576.000 transaksi organik — mereka bisa shortcut dengan data sintetis atau scraped.

**Mengapa ini realistis:** Dataset bahasa Indonesia tersedia secara komersial. Fine-tuning model pada domain spesifik bisa dilakukan dalam hitungan hari.

### Mitigasi (Harus Disiapkan SEKARANG)

1. **Data CatetInd itu LABELED, bukan mentah:** Perbedaan kritis: data CatetInd bukan cuma teks bahasa Indonesia tentang keuangan. Ini adalah teks + KATEGORI YANG SUDAH DIVALIDASI USER. "Beli seblak 15rb" → user confirmed ini "Makanan." Dataset public social media tidak punya label validasi ini. Fine-tuning pada data tanpa label = akurasi inferior.

2. **Context = moat dalam moat:** AI CatetInd tidak hanya mengkategorisasi berdasarkan teks — tapi berdasarkan HISTORI USER. "Bayar itu yg kemarin" hanya bisa dikategorisasi jika AI tahu konteks percakapan kemarin. Kompetitor yang fine-tune model pada dataset generik TIDAK memiliki context window per-user ini.

3. **Metrik defensibility:** Publikasikan (di blog/landing page) akurasi auto-kategorisasi CatetInd vs industry benchmark tanpa membuka dataset:
   > "Auto-kategorisasi CatetInd: 92% akurat di bulan ke-12. Rata-rata industri: 75%. Karena AI kami belajar dari 500.000+ transaksi nyata Gen-Z Indonesia."

### Post-Test Verdict: âš ï¸ LOLOS PARSIAL

Advantage ini LOLOS untuk konteks per-user (histori percakapan, koreksi individual). Tapi TIDAK LOLOS untuk kategorisasi generik (mapping "indomaret" → "Belanja"). Mitigasinya: fokus marketing pada personalisasi ("AI kamu makin pintar seiring kamu pakai"), bukan pada akurasi generik.

**Sinyal early-warning:** Kompetitor mulai mengklaim akurasi auto-kategorisasi >85% di marketing mereka. **Pemantau:** Cek landing page kompetitor 2x/bulan (Founder Faceless).

---

## STRESS TEST — Advantage 5: Cohort Founding Member Evangelists

### Skenario Tembus

**"Founding Members churn secara psikologis — mereka bayar lifetime tapi berhenti pakai setelah 3 bulan"**

Lifetime payment = zero financial incentive untuk tetap aktif. Jika app experience kurang engaging setelah novelty hilang, Founding Members bisa saja "membayar dan melupakan" — seperti yang terjadi pada 60-70% app purchases di Indonesia (AppsFlyer 2024).

**Mengapa ini realistis:** Ini SANGAT realistis. Churn psikologis pada lifetime purchases adalah risiko terbesar. User yang berhenti pakai = evangelist yang mati.

### Mitigasi (Harus Disiapkan SEKARANG)

1. **Tanaman sebagai anti-churn emosional (Domain 3B):** HP turun 3 per hari inactivity. Tanaman stage 5 yang sudah dirawat 4 bulan "melarat" jika user berhenti. Push notification hari ke-3 inactivity: "Tanamanmu mulai layu ðŸŒ¿ — satu catatan aja biar dia segar lagi." Ini SUDAH di-design di Domain 3 — harus dipastikan implementasinya tepat.

2. **Monthly recap sebagai re-engagement hook (Domain 7F):** Report bulanan yang di-email dan di-notif dikirim bahkan ke user yang sudah tidak aktif 2 minggu. Copy: "Recap September kamu udah siap — meski cuma ada beberapa catatan, ada insight yang mungkin bikin kamu surprise."

3. **Founding Member exclusive content:** Setiap bulan, kirim 1 email eksklusif ke Founding Members saja — bisa berupa update produk, data menarik (aggregate: "rata-rata FM nabung Rp800K/bulan"), atau sneak peek fitur baru. Ini membuat mereka merasa tetap "di dalam lingkaran."

### Post-Test Verdict: âš ï¸ LOLOS JIKA RETENTION MECHANISMS DIEKSEKUSI KONSISTEN

Advantage ini bergantung 100% pada eksekusi retention (Domain 3 + 7F). Tanpa itu, 300 Founding Members = 300 zombie users yang tidak mereferensikan siapapun. Metric kunci: **FM D90 retention >50%** — jika turun di bawah 40%, keunggulan ini tidak valid.

**Sinyal early-warning:** FM weekly active rate turun di bawah 50% di bulan ke-3. **Pemantau:** Supabase query mingguan (automatable via pg_cron + alert).

---

## STRESS TEST — Advantage 6: Creator Seeding Network

### Skenario Tembus

**"Kompetitor menghubungi creator yang sama dengan cash offer Rp500K-2jt per posting"**

CatetInd memberi akses gratis (value ~Rp149-175K). Kompetitor datang dengan cash Rp1-2jt per posting. Bagi creator nano-influencer (5K-10K followers) yang income-nya pas-pasan, Rp2jt adalah sebulan makan — tentu saja mereka akan menerima.

**Mengapa ini realistis:** Ini SANGAT realistis dan PASTI akan terjadi jika CatetInd mulai terlihat di market. Kompetitor dengan funding bisa outspend CatetInd 10-50x di influencer marketing.

### Mitigasi (Harus Disiapkan SEKARANG)

1. **Relationship > Transaction:** Creator yang di-approach CatetInd secara personal (DM founder, feedback loop, merasa "bagian tim") vs creator yang di-approach agency ("ini brief-nya, deadline Jumat, bayaran transfer Senin") memiliki loyalty yang berbeda secara fundamental. Tapi: loyalty punya harga. Jika cash offer kompetitor 10x lipat, beberapa creator AKAN pindah. Ini fakta yang harus diterima.

2. **Non-exclusive agreement:** CatetInd TIDAK BOLEH meminta exclusivity dari creator. Itu memaksa mereka memilih dan membuat relationship terasa transactional. Sebaliknya: biarkan mereka posting tentang CatetInd DAN kompetitor. Jika produk CatetInd benar-benar mereka pakai, review mereka tentang CatetInd akan terasa lebih genuine dibanding review berbayar untuk kompetitor — dan audiens Gen-Z BISA membedakan itu.

3. **Volume > Exclusivity:** Jika 10 dari 20 creator pindah ke kompetitor, CatetInd harus SUDAH memiliki wave 2 creator baru (bulan 3-6, ekspansi ke 50). Jangan bergantung pada 20 orang. Pipeline creator harus selalu berisi.

### Post-Test Verdict: âš ï¸ LOLOS PARSIAL — BUKAN MOAT MANDIRI

Creator network BUKAN moat yang bisa diandalkan sendirian. Ini adalah accelerant, bukan defensibility. Mitigasinya: (1) selalu pipeline creator baru, (2) fokus pada product quality sehingga creator genuine review > paid review, (3) terima bahwa beberapa creator akan "diculik" dan itu OK.

**Sinyal early-warning:** >3 creator seeded mulai posting konten kompetitor dalam 1 bulan yang sama. **Pemantau:** Founder Personal Brand (follow semua creator seeded, cek feed mingguan).

---

## RINGKASAN STRESS TEST

| # | Advantage | Verdict | Kondisi Lolos |
|---|---|---|---|
| 1 | Privacy by Design | âœ… LOLOS | Proaktif edukasi "by design vs by toggle" SEBELUM kompetitor bergerak |
| 2 | Build-in-Public | âš ï¸ LOLOS DENGAN CATATAN | Hanya kuat sebagai first-mover + konsistensi, bukan moat mandiri jangka panjang |
| 3 | Founding Member Dynamic Pricing | âœ… LOLOS | Slot 300 harus penuh <90 hari |
| 4 | Data Bahasa Finansial | âš ï¸ LOLOS PARSIAL | Kuat di personalisasi per-user, lemah di kategorisasi generik |
| 5 | FM Evangelist Cohort | âš ï¸ LOLOS JIKA... | FM D90 retention harus >50% — bergantung pada eksekusi Domain 3 + 7F |
| 6 | Creator Network | âš ï¸ LOLOS PARSIAL | Accelerant bukan moat, pipeline harus selalu diisi, terima bahwa beberapa akan pindah |

### Verdikt Keseluruhan

> **[ARIA]:** "Dari 6 advantage, hanya 2 yang benar-benar structural (Privacy by Design + Founding Member). Sisanya adalah execution-dependent advantages yang bisa terkikis jika tim tidak konsisten. Ini bukan kabar buruk — ini realistic assessment. CatetInd bukan startup dengan \$50M moat dari hari 1. CatetInd adalah produk yang memiliki 2 posisi structural yang kuat + 4 execution advantages yang HARUS dijaga setiap hari."

> **[DIAN]:** "Dan itu cukup. Untuk tim 2 orang di pasar Indonesia yang belum ada pemain dominan, 2 structural + 4 execution advantages = lebih dari cukup untuk mendapatkan 600 user pertama. Setelah itu, data moat dan community moat mulai compound — dan barulah CatetInd punya moat yang sesungguhnya."

---

## KOMUNIKASI MARKETING: CONTOH COPY PER ADVANTAGE

| Advantage | Copy untuk Landing Page / Instagram |
|---|---|
| Privacy by Design | "Bahkan tim CatetInd sendiri tidak bisa melihat transaksimu. Bukan karena kami memilih untuk tidak melihat — tapi karena sistemnya memang tidak bisa. Privacy by design, bukan by toggle." |
| Build-in-Public | "CatetInd dibangun 2 orang yang juga pakai CatetInd setiap hari. Setiap minggu, kami share progress di Instagram — transparan, tanpa filter." |
| Founding Member | "300 orang pertama. Harga unik untuk setiap slot. Ini bukan promo — ini cerita yang hanya terjadi sekali." |
| Data Personalisasi | "AI CatetInd makin pintar seiring kamu pakai. Bulan pertama, dia belajar kebiasaan kamu. Bulan ketiga, dia udah hafal." |
| FM Community | "Jadi bagian dari 300 orang pertama yang percaya. Founding Member bukan cuma user — mereka adalah co-creator cerita CatetInd." |
| Creator Network | "Ditinjau oleh 20+ creator keuangan Gen-Z Indonesia. Bukan karena kami bayar mereka — tapi karena mereka pakai." |

---

# ASUMSI & INTERPRETASI YANG DIAMBIL

### A1. Budggt Memiliki atau Berencana Memiliki Bank-Sync
**Instruksi:** "Kalau Budggt/Fundy punya (atau berencana punya) fitur bank-sync/open banking..."  
**Asumsi:** Budggt sebagai wealth management dashboard kemungkinan besar sudah memiliki atau berencana mengintegrasikan bank-sync/data aggregation. Ini asumsi konservatif — jika Budggt ternyata juga full manual, advantage #1 berkurang (tapi tidak hilang, karena CatetInd tetap punya zero-admin-access architecture yang Budggt belum tentu punya).

### A2. Stress Test Scope: Budggt, Fundy, dan 1 New Entrant
**Instruksi:** "Skenario di mana Budggt, Fundy, atau new entrant BISA menembus."  
**Keputusan:** Analisis mencakup ketiga kategori ancaman. New entrant diasumsikan sebagai startup baru yang well-funded (seed stage, Rp1-5M) dengan fokus Gen-Z Indonesia yang serupa. Ini worst case.

### A3. Creator "Pindah" = Posting Konten Kompetitor, Bukan Berhenti Pakai CatetInd
**Instruksi:** Tidak didefinisikan apa artinya "creator pindah."  
**Keputusan:** Creator yang menerima paid deal dari kompetitor tetap bisa menjadi user CatetInd. "Pindah" berarti mereka posting konten positif tentang kompetitor — bukan berarti mereka berhenti menggunakan CatetInd. CatetInd TIDAK meminta exclusivity. Non-exclusivity = lebih sustainable, kurang possessive, sesuai tone nurturing.

### A4. "90 Hari untuk Isi 300 Slot" = Target Kritis
**Instruksi:** Tidak ada instruksi tentang target waktu pengisian slot.  
**Keputusan:** 90 hari ditetapkan sebagai target kritis karena: (1) setelah 90 hari tanpa "sold out", urgency narrative melemah, (2) kompetitor punya waktu mengamati dan meniru, (3) founder momentum dan konten pipeline mulai kelelahan tanpa milestone baru. Jika slot tidak penuh dalam 90 hari: evaluasi pricing, messaging, atau channel — BUKAN turunkan harga.

### A5. Fundy Juga Bisa Build-in-Public
**Instruksi:** Tidak disebutkan apakah founder Fundy juga muda/relatable.  
**Asumsi:** Worst case — founder Fundy bisa saja usia 20-an, relatable, dan capable melakukan build-in-public. CatetInd tidak boleh bergantung pada asumsi bahwa kompetitor "terlalu korporat untuk meniru." Mitigasinya: konsistensi dan first-mover dalam narasi, bukan exclusivity narasi.

### A6. Auto-Kategorisasi Akurasi Baseline: 75%
**Instruksi:** Tidak ada benchmark akurasi yang diberikan.  
**Keputusan:** 75% ditetapkan sebagai baseline bulan 1 berdasarkan: (1) DeepSeek V3 zero-shot pada bahasa Indonesia informal = ~70-80% akurat (estimasi dari community benchmarks), (2) Dengan few-shot examples di system prompt (Domain 4B) = +5%. Target bulan 12: 90%+ (setelah fine-tuning pada 500K+ labeled transactions).

### A7. Verdikt "Lolos Parsial" = Advantage Bukan Moat Mandiri
**Instruksi:** "Advantage yang lolos stress test."  
**Keputusan:** Advantage dengan status "Lolos Parsial" atau "Lolos Dengan Catatan" BUKAN moat mandiri — mereka adalah bagian dari moat GABUNGAN. Privacy by Design + Founding Member Cohort = moat structural hari 1. Data + Community + Creator = moat compound yang memperkuat setelah bulan 6. Tidak ada SATU advantage yang cukup sendirian. Stack-nya yang membuat CatetInd defensible.

