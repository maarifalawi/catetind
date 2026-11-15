# Laporan 100 — Dompet bersama nyambung, kuota AI tidak "balik 100%", AI pakai bahasa tongkrongan, email clean

Tanggal: 11 Nov 2026 · Empat temuan pemilik produk dari uji pakai dua akun.

---

## 1. “Halaman join ngga sync: akun pertama ada transaksi, akun kedua kosong”

### Akar masalah (dua, keduanya nyata)

**a. Pemilik dompet bukan “anggota” menurut policy.**
Semua policy `joint_transactions` memakai
`catetind_is_joint_member(joint_wallet_id)`, dan fungsi itu (migrasi `20260927120200`)
hanya memeriksa tabel `joint_members`. Pemilik dompet disimpan di
`joint_wallets.owner_id`; baris keanggotaannya hanya lahir kalau
`catetind_ensure_joint_pocket` dipanggil. Dompet yang dibuat lewat jalur lama tidak
punya baris itu → **pemilik tidak bisa membaca catatannya sendiri**, sementara
anggota undangan bisa. RLS tidak melempar error: hasilnya himpunan kosong, dan
layar menampilkan “0 catatan”. Persis dua screenshot yang dilaporkan (satu akun
penuh, satu akun kosong).

Perbaikan: migrasi baru
`supabase/migrations/20261111130000_catetind_joint_owner_is_member.sql`
1. `catetind_is_joint_member` menganggap **pemilik** sebagai anggota;
2. backfill baris `joint_members (role='owner')` untuk semua dompet lama;
3. policy tidak disentuh — semuanya memanggil fungsi yang sama.

**b. Catatan bisa “hidup lokal selamanya”.**
`addJointTransaction()` mengirim baris dengan `void syncJointRow(tx)` — gagal
kirim ditelan tanpa jejak. Policy insert mewajibkan
`is_joint_member(joint_wallet_id, paid_by_user_id)`, jadi selama pemilik belum
punya baris keanggotaan (poin a), **setiap catatan yang dibayar pemilik ditolak
server** — sementara di perangkat pengirim barisnya tetap tampil. Kalau dompet
server juga belum terbaca saat catatan dibuat (hidrasi belum selesai), hasilnya
sama: baris hanya ada di perangkat pengirim dan tidak pernah sampai ke akun
pasangan. Di layar ia terlihat sama persis dengan catatan yang sudah tersinkron.

Perbaikan (`lib/money/joint-store.ts`, `components/catetind/joint-screen.tsx`,
`components/catetind/joint-timeline.tsx`):
- baris yang gagal dikirim ditandai `pendingSync`, muncul chip **“Belum tersinkron”**
  di timeline, dan user diberi tahu sekali (toast) bahwa pasangannya belum
  melihatnya — bukan diam-diam tampil seolah sudah sinkron;
- `retryPendingJointRows()` mengirim ulang baris tersebut saat halaman dibuka,
  tab kembali terlihat, jaringan online kembali, dan sekali setelah gagal;
- jalur tulis lain (ubah pembagian, pindah kantong, undo hapus, settle) memakai
  jalur yang sama sehingga tidak ada lagi kiriman “tembak-lupakan”;
- **“gagal memuat” dibedakan dari “kosong”**: kalau dompet sudah pernah tersinkron
  tapi bacaan server gagal, empty state TIDAK lagi berkata “Dompet bersama kalian
  masih kosong” (klaim palsu yang dilaporkan) — layar menampilkan “Data belum
  kebaca dari server” + tombol “Coba muat ulang”;
- bonus temuan: catatan privat dulu diberi `privateForUser = 'user_a'` (id contoh),
  jadi catatan privat akun nyata tersembunyi dari pembuatnya sendiri. Sekarang
  memakai id sesi yang sungguhan.

### Yang perlu dijalankan

```bash
SUPABASE_ACCESS_TOKEN=sbp_xxx pnpm supabase:migrate
```

Setelah migrasi, buka `/joint` di kedua akun (atau tunggu tab kembali terlihat):
baris yang tertahan akan dikirim ulang, dan pemilik akhirnya melihat catatannya.

---

## 2. “Kok token gua balik lagi ke 100% padahal udah pernah dipake”

Meter AI bergantung penuh pada satu bacaan server. Kalau bacaan itu gagal
(offline, sesi habis, RPC menolak), store memakai angka titik berangkat = 100%.
Pemakaian yang sudah terjadi hilang dari layar.

Perbaikan (`lib/ai-usage-store.ts`): pemakaian disimpan **per akun** di perangkat
(`ai-usage:<userId>` lewat helper IndexedDB yang sudah ada) dan digabung `max`
dengan server. Aturannya sekarang satu arah: angka pemakaian **tidak pernah
turun** karena satu bacaan gagal; cache hanya dibuang saat benar-benar ganti akun.
Gagal baca server kini juga tidak lagi menimpa state (dulu `return false` setelah
angka lokal sudah dipertimbangkan, sekarang cache dibaca lebih dulu).

---

## 3. “Kalimat AI kaku banget, gua mau kayak temen tongkrongan”

`COACH_SYSTEM_PROMPT` (`lib/ai/prompts.ts`) ditulis ulang:
- “gue/lo”, kalimat pendek, tanpa sapaan basa-basi, emoji maksimal satu di akhir;
- daftar kalimat terlarang eksplisit (“jatah harianmu sedang ditahan”, “silakan”,
  “berikut adalah”, “sebagai AI”, dst) + contoh BENAR/SALAH supaya model punya
  kalibrasi;
- guardrail OJK, zero guilt-trip, larangan mengaku mencatat, dan penolakan di luar
  skop tetap utuh.

Agar pertanyaannya bisa dijawab, bukan cuma “belum ada rincian minggu ini”:
`CoachDataSummary` sekarang membawa **pengeluaran minggu ini + kategori teratas
minggu ini + pengeluaran hari ini**, dihitung dari jendela periode yang SAMA
dengan tab Mingguan `/budget` (`periodWindowForTab('weekly')`). Sapaan pembuka,
balasan pencatatan, dan copy cadangan AI Coach ikut dibereskan ke nada yang sama.
Deteksi “di luar skop” juga menerima varian “lo/elu/lu” supaya “lo siapa?” tetap
ditolak.

---

## 4. Email kode masuk/verifikasi: terlalu banyak bold, bertele-tele, logo bukan aset resmi

`supabase/email-templates/confirmation.html` & `magic-link.html` didesain ulang:
- **logo resmi** `https://catetind.com/Dashboard.png` (aset yang sama dengan
  `LogoWordmark` di app), bukan teks yang disusun dari font biasa;
- satu judul (“Kode masuk lo” / “Verifikasi email lo”), satu kalimat, kotak OTP,
  satu tombol pill “Masuk otomatis”;
- kotak catatan keamanan + bold dihapus; sisa satu baris kecil abu-abu;
- footer: `catetind.com` + slogan **“Aplikasi catet keuangan buat lo yang males
  nyatet.”** + © 2026 CatetInd;
- struktur tabel + VML Outlook tetap dipertahankan (email client lama), preheader
  tetap ada, `.Token`/`.ConfirmationURL` tidak berubah;
- subjek dipersingkat: `{{ .Token }} · Kode masuk CatetInd`.

### Yang perlu dijalankan

```bash
SUPABASE_ACCESS_TOKEN=sbp_xxx pnpm supabase:emails
```

Tanpa langkah ini, template baru hanya ada di repo — Supabase masih mengirim
versi lama (isinya tersimpan di konfigurasi project, bukan di git).

---

## Verifikasi

- `pnpm test` → **142 file, 1957 test lulus**.
- `npx tsc --noEmit` → 0 error.
- `npx next build` → sukses.
- Template email dirender di Edge (390 px & 760 px) untuk memastikan logo, OTP,
  tombol, dan footer tampil benar di mobile maupun desktop.

---

## Hasil eksekusi (11 Nov 2026 — sudah dijalankan, bukan instruksi)

```bash
pnpm supabase:migrate   # ✓ 20261111130000_catetind_joint_owner_is_member.sql
pnpm supabase:emails    # ✓ magic-link 8279 char · confirmation 8284 char
```

Bukti dari project `wmswtoyikvgzcvbgdceo`:

| Cek | Hasil |
|---|---|
| `catetind_is_joint_member` | sudah versi baru (`owner_id` OR `joint_members`) |
| Subjek email (kedua alur) | `{{ .Token }} · Kode masuk CatetInd` |
| Masa berlaku OTP | 600 detik |
| Logo + slogan di template tersimpan | ✔ |
| RLS sebagai **shiimaify** | 1 dompet · 2 anggota · **3 catatan terbaca** |
| RLS sebagai **maarifalaawii** | 2 dompet · 3 anggota · **3 catatan terbaca** |

### Temuan data yang menjelaskan kebingungan awal

Ada **dua dompet bersama**, bukan satu:

| Dompet | Pemilik | Anggota | Catatan |
|---|---|---|---|
| **Barengan** (dibuat 4 Nov) | shiimaify | shiimaify (owner) + maarifalaawii (member, gabung 10 Nov 19:23 WIB) | **3** |
| **Dompet Kita** (dibuat 10 Nov 11:15) | maarifalaawii | maarifalaawii saja | 0 |

Tiga catatan itu **bukan data hantu**: `created_by` & `paid_by` = **shiimaify**,
dibuat 10 Nov 14:08–14:10 WIB, semuanya di dompet **Barengan**. Alawi melihatnya
karena ia bergabung ke dompet itu pukul 19:23 WIB — bukan karena data “muncul
sendiri”. Yang sebelumnya salah: layar Alawi bisa memilih dompetnya sendiri yang
kosong (“Dompet Kita”), dan layar Shimaify sempat menampilkan 0 catatan seolah
dompet kosong.

Satu catatan tambahan: ketiga baris itu bertanggal **2026-09-25** (bukan 10 Nov)
karena dibuat oleh build dev lama yang masih memakai jangkar tanggal contoh.
Build di repo sekarang memberi tanggal hari ini saat mencatat, jadi catatan baru
akan masuk ke bulan berjalan. Kalau mau, tanggal 3 baris lama itu bisa
dirapikan lewat SQL satu baris — datanya milik kalian, jadi tidak diubah tanpa
izin.

### Bukti untuk isu kuota AI

`ai_usage` di server **berisi** pemakaian sungguhan:

| Akun | Aktivitas | Panggilan |
|---|---|---|
| maarifalaawii | categorize | 2 |
| maarifalaawii | chat | 3 |
| shiimaify | chat | 2 |

Artinya meter tidak mungkin sah menampilkan 100% lagi setelah pemakaian itu —
kecuali bacaan server gagal (persis yang ditutup cache perangkat di §2). RPC
`catetind_record_ai_usage(p_month_key, p_activity, p_calls, p_addon_tokens)`
juga ada dan sesuai dengan pemanggil di klien; belum ada pembelian add-on.


