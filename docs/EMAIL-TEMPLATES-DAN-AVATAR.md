# Email CatetInd — template OTP & avatar pengirim

Dokumen ini menjelaskan dua hal yang sering tertukar:

1. **Isi email** (subject, HTML, tombol OTP) → diatur oleh template Supabase.
2. **Avatar pengirim di inbox** (`C` abu-abu di samping `CatetInd <halo@catetind.com>`)
   → **bukan** bagian dari template dan **tidak bisa** diatur lewat HTML email.

---

## 1. Template email

### Di mana sumber kebenarannya?

Template email auth disimpan di **konfigurasi project Supabase**, bukan di
folder `emails/` repo. Supaya perubahan tidak hilang saat ada yang mengedit
lewat dashboard, versi yang di-commit ada di:

```
supabase/email-templates/magic-link.html    → email masuk (OTP / magic link)
supabase/email-templates/confirmation.html  → email verifikasi akun baru
```

Keduanya sengaja memakai desain yang sama; yang berbeda hanya satu baris
pengantar (masuk vs. verifikasi).

### Cara menerapkan

```powershell
$env:SUPABASE_ACCESS_TOKEN = 'sbp_...'   # Account → Access Tokens, JANGAN di-commit
pnpm supabase:emails                      # atau: node scripts/supabase/apply-email-templates.mjs
```

`--dry-run` mencetak payload tanpa mengirim apa pun. Skrip hanya menulis lima
field: subjek + isi Magic Link, subjek + isi Confirmation, dan `mailer_otp_exp`
(600 detik). SMTP, `site_url`, dan kunci rahasia tidak disentuh.

### Spesifikasi desain

| Bagian | Nilai |
|---|---|
| Latar halaman | `#f8faf8` |
| Card | `#ffffff`, border `1px solid #e5e7eb`, radius 24px |
| Wordmark | teks `cətet.` — `#28382c`, titik `#65a30d` |
| Judul | `Yuk masuk ke akun lo ✨` |
| Kotak OTP | `#f3f6f3`, border aksen `#cfe3bd`, monospace, letter-spacing 14px |
| Tombol | pill `#28382c`, teks putih, `Atau Langsung Masuk ke CatetInd ➔` |
| Catatan keamanan | kartu `#f8faf8` + border `#e5e7eb` |
| Footer | `© 2026 CatetInd. Asisten keuangan pribadi lo.` |
| Subjek | `{{ .Token }} — Kode masuk CatetInd lo 🌿` |

### Kompatibilitas email client

- **Tabel** (`role="presentation"`), bukan flex/grid — Outlook desktop tidak
  mendukung layout modern.
- **Semua CSS inline**; blok `<style>` hanya penyempurna (media query mobile).
- **Tanpa gambar** di header → tidak ada logo rusak saat gambar diblokir Gmail.
  Wordmark dirender sebagai teks dengan entity `&#601;` (ə) agar encoding aman.
- **Tombol VML** untuk Outlook desktop, `<a>` biasa untuk client lain.
- Preheader tersembunyi, `color-scheme: light only`, dan
  `x-apple-disable-message-reformatting` untuk iOS Mail.
- Lebar maksimum 600px; padding card menyusut 40px → 24px di layar < 620px.

---

## 2. Kenapa avatar pengirim tidak muncul?

Avatar di samping nama pengirim adalah **fitur identitas/reputasi milik client
email**, bukan elemen yang bisa dikirim dari HTML. Gmail **tidak** membaca
`<img>` di dalam email, favicon situs, atau foto dari halaman login.

Kondisi DNS `catetind.com` saat dokumen ini ditulis (19 Oktober 2026):

| Record | Nilai | Arti |
|---|---|---|
| MX | `mx1/mx2.hostinger.com` | mailbox Hostinger (`halo@catetind.com`) |
| SPF | `v=spf1 include:_spf.mail.hostinger.com ~all` | pengirim diizinkan |
| DMARC | `v=DMARC1; p=none` | **belum enforcing** |
| BIMI | *(tidak ada)* | **tidak ada logo brand** untuk inbox |

Karena tidak ada BIMI dan alamat itu bukan akun Google dengan foto profil,
Gmail menampilkan inisial abu-abu `C`. Ini perilaku normal, bukan bug template.

### Cara membuat avatar muncul

**Gmail (butuh BIMI + VMC/CMC).** Gmail menampilkan logo pengirim hanya lewat
BIMI yang disertai **Evidence Document**: VMC (butuh merek terdaftar) atau
**CMC** (tanpa merek terdaftar). DNS `catetind.com` dikelola **Hostinger**
(nameserver `orbit/horizon.dns-parking.com`), jadi record ditambahkan di
hPanel → Domain → DNS Zone. Langkahnya:

1. Siapkan logo **SVG Tiny 1.2**, kanvas persegi 512×512, tanpa `<text>`, tanpa
   referensi eksternal/raster. Aset di repo masih PNG, jadi perlu file vektor
   asli (AI/Figma/SVG) dari desainer. Simpan di
   `https://catetind.com/brand/bimi-logo.svg`.
2. Beli VMC **atau CMC** dari otoritas (DigiCert / Entrust / SSL.com) dan
   publikasikan sertifikatnya, mis.
   `https://catetind.com/brand/catetind-vmc.pem`.

> **Biaya (bukan gratis).** Contoh harga SSL.com per Oktober 2026:
> **CMC US$1.150/tahun** (komitmen 1 tahun; turun jadi US$1.035/tahun untuk 3
> tahun), **VMC lebih mahal** karena butuh merek terdaftar. Harga berbeda antar
> CA, tetapi ini biaya tahunan — bukan sekali bayar.
3. Ketatkan DMARC menjadi enforcing **setelah** DKIM/SPF Hostinger terbukti
   align. Cek di Gmail: buka emailnya → menu ⋮ → **Show original** → pastikan
   `SPF: PASS` dan `DKIM: PASS` dengan domain `catetind.com`. Baru setelah itu:
   ```
   _dmarc.catetind.com. 3600 IN TXT "v=DMARC1; p=quarantine; pct=100; rua=mailto:halo@catetind.com"
   ```
4. Tambahkan record BIMI di DNS Hostinger:
   ```
   default._bimi.catetind.com. 3600 IN TXT "v=BIMI1; l=https://catetind.com/brand/bimi-logo.svg; a=https://catetind.com/brand/catetind-vmc.pem"
   ```

### Kalau SVG-nya sudah ada

Aset saat ini sudah tersedia di `public/brand/bimi-logo.svg` (4.8 KB,
512×512, SVG Tiny 1.2, wordmark sebagai `<path>`, tanpa teks/raster/tautan
eksternal) dan **lolos** `pnpm brand:bimi`. File otomatis disajikan sebagai
`https://catetind.com/brand/bimi-logo.svg` setelah deploy.

Kalau nanti logo berubah, taruh versi barunya di path yang sama lalu jalankan:

```powershell
pnpm brand:bimi
```

Validator lokal akan menolak file yang masih mengandung `<text>`, rasio bukan
1:1, referensi eksternal/raster, atau ukuran > 32 KB. Catatan penting: wordmark
`cətet` rasionya ±3.63:1 — di avatar Gmail 40px masih terbaca sebagai wordmark,
tetapi kecil. Kalau ingin lebih kuat di inbox, siapkan **mark/ikon persegi**
(mis. huruf `c` atau `cə`) dan simpan sebagai `bimi-logo.svg`. Validasi akhir
tetap di [BIMI Group SVG Validator](https://bimigroup.org/bimi-svg-assistant-tool/).

### Cek kesiapan sebelum/sesudah DNS

```powershell
pnpm brand:check
```

Perintah ini membaca DNS publik + URL aset, lalu melaporkan empat hal: DMARC,
record `default._bimi`, URL SVG, dan URL sertifikat. Status saat ini
(19 Oktober 2026) masih **2 penghalang**: DMARC `p=none` dan record
`default._bimi` belum ada. Setelah aset di-deploy, `brand:check` juga akan
memastikan `https://catetind.com/brand/bimi-logo.svg` benar-benar 200 dan
`image/svg+xml`.

### Kalau belum mau bayar CMC/VMC

| Cara | Biaya | Hasil |
|---|---|---|
| Simpan pengirim di Kontak Google + foto | Gratis | Avatar muncul **untuk akun itu saja** |
| Gravatar (sudah aktif) | Gratis | Muncul di **Apple Mail / iOS Mail**, tidak di Gmail |
| Nama pengirim `CatetInd 🌿` | Gratis | Tanpa avatar, tapi brand terlihat di inbox |
| Google Workspace Base/Starter | ±US$2,50–7/user/bulan | Foto profil akun Google biasanya tampil di Gmail; perlu migrasi MX/SMTP dari Hostinger |
| BIMI CMC/VMC | ±US$1.150+/tahun | Logo brand untuk **semua** penerima Gmail |

Rekomendasi praktis: **jangan beli CMC hanya untuk avatar** kalau volume email
masih kecil. Badan email sudah membawa wordmark `cətet.` (template baru), jadi
brand tetap terlihat meski avatar Gmail masih inisial. Aset BIMI yang sudah
lolos validator tetap disimpan; kalau nanti kebutuhan brand di inbox naik,
tinggal beli sertifikat + tambah DNS.

**Status Gravatar: SUDAH BENAR.** Profil `CatetInd` untuk `halo@catetind.com`
sudah aktif — diverifikasi lewat Gravatar API (avatar 256×256 tersedia di
`https://0.gravatar.com/avatar/4c201ff1f5e6a6ede258bc89e7be1f37dfcb958ecef2106f3e3bcb0e693ca731?s=512`).
Gravatar akan tampil di **Apple Mail / iOS Mail** dan klien lain yang membaca
Gravatar, tetapi **tidak akan pernah tampil di Gmail** — Gmail tidak memakai
Gravatar sama sekali, berapa pun lengkapnya profil di sana.

| Client | Sumber avatar | Gravatar dipakai? |
|---|---|---|
| Gmail (web & app) | Google Contacts, foto akun Google, atau BIMI | ❌ |
| Apple Mail / iOS Mail | Contacts, Gravatar, BIMI | ✅ |
| Outlook | Contacts, BIMI | ❌ (umumnya) |

**Cek cepat untuk Gmail sendiri (tanpa DNS).** Simpan `halo@catetind.com` ke
**Kontak Google**, lalu beri foto (bisa pakai gambar Gravatar di atas). Avatar
langsung muncul **untuk akun itu saja**. Ini membuktikan template & pengirim
sudah benar; yang tersisa hanyalah logo brand untuk semua penerima. Foto profil
akun Google yang terhubung ke `halo@catetind.com` juga bisa membantu, tetapi
tidak dijamin untuk semua penerima.

Kesimpulan: template baru membuat **isi** email on-brand dan rapi, dan Gravatar
`halo@catetind.com` sudah benar (tampil di Apple Mail). Untuk **Gmail**, satu-
satunya jalur brand-wide adalah **BIMI + VMC/CMC**; tidak ada pengaturan di
kode/repo yang bisa membuat Gmail membaca Gravatar.
