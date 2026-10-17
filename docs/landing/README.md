# Landing `/` — Design System CatetInd

Landing publik sekarang hidup di **`/`**. Isinya komponen React + Tailwind di
`components/landing/lp/*`; `components/landing/*` lama sudah dihapus. Folder ini
menyimpan keputusan produk, cara kerja alat screenshot/audit, dan sisa risiko.

## Status

**Release landing selesai dan sudah di-commit.**

- `/` = landing baru (navbar → hero → mission → pricing → FAQ → CTA/footer).
- `/preview-landing` = **301 redirect** ke `/` (`app/preview-landing/route.ts`).
- `/contact` = halaman publik baru (WhatsApp + email + form).
- `/` tidak lagi memakai komponen landing lama.
- Baseline test terakhir: **91 file, 1.316 test lulus**.

## Keputusan visual

- **Satu font: Inter.** Body `font-sans`, heading `font-display`; keduanya
  bermuara ke Inter. `Inter_Tight` dan `--font-lp` dihapus.
- **Satu palet: Earth Pastel.** Tidak ada lagi token `--color-lp-*`.
  - halaman/seksi besar: `bg-canvas` (putih)
  - teks: `text-forest` / `text-forest/60` / `text-forest/40`
  - kartu gelap, CTA dark, footer: `bg-forest`, teks `text-cream`
  - highlight judul: `bg-daisy text-forest`
  - chip/pill kecil: `bg-sage` / `bg-oat`
  - aksen: `bg-mint`, `bg-daisy`
  - hairline: `ring-soil/10`
- Paritas piksel dengan Framer **ditinggalkan**; acuan visual sekarang
  Design System CatetInd (Earth Pastel + Inter).
- Breakpoint landing: 810px (`landing-tab:`) dan 1200px (`landing:`).
- Hero boleh memakai ukuran yang disesuaikan agar Inter tidak memecah kata
  janggal. Jangan memaksa 88px kalau hasilnya buruk.

## Keputusan monetisasi

### Produk

- **Langganan prabayar 30 hari**:
  - `catet-aja` Rp49.000
  - `waras` Rp79.000
  - `sultan` Rp199.000
- **Lifetime** tetap:
  - `catet-aja` Rp109.000
  - `waras` Rp129.000
  - `sultan` Rp299.000
- Default toggle landing = **Langganan 30 hari**.
- Sekali bayar via Midtrans (QRIS/VA/e-wallet). **Tidak ada auto-renew**, tidak
  ada token kartu yang disimpan, tidak ada tagihan diam-diam.

### Aturan transaksi

- Monthly boleh membeli tier apa pun (termasuk turun tier); tier menjadi tier
  yang dibeli.
- Perpanjangan monthly:
  `expires_at = max(now, expires_at lama) + 30 hari`.
- Monthly saat sudah lifetime ditolak (lifetime tidak diturunkan).
- Lifetime:
  - dari belum punya lifetime → harga penuh lifetime;
  - dari monthly → harga penuh lifetime;
  - dari lifetime tier lebih rendah → selisih lifetime;
  - dari lifetime tier sama/lebih tinggi → tidak ada yang perlu dibeli;
  - `expires_at = NULL`, `is_lifetime = true`.
- Referral discount berlaku untuk monthly dan lifetime.

### Expired / read-only

- `active = is_active && (is_lifetime || expires_at > now)`.
- `planId` tetap dibaca saat expired supaya billing bisa menawarkan perpanjangan.
- Expired:
  - data tetap bisa dibaca dan **diekspor**;
  - tidak bisa menambah/mengubah data, AI/OCR/voice, atau fitur berbayar;
  - banner ramah “Masa aktif habis — perpanjang 30 hari”;
  - `inputLocked = true`, `canUse() = false`.
- Repo belum punya free tier. **Tidak ada angka limit gratis yang dikarang.**
  Kalau nanti ingin Basic Tier dengan jatah transaksi, itu keputusan produk baru.

## Kontak

- Email global: **`halo@catetind.com`** (`support@catetind.com` sudah tidak
  dipakai di kode/legal/help/landing).
- WhatsApp: **`0817-7577-7778`** → `https://wa.me/6281775777778`.
- Prefill: `Halo Minca, mau tanya-tanya soal CatetInd dong!`.
- WhatsApp tampil di `/contact`, kartu FAQ, dan footer.
- Form kontak sekarang 3 field: Nama, Kontak, Pesan. Submit utama membuka
  WhatsApp; email `halo@catetind.com` tersedia sebagai fallback.
- Tidak ada klaim “terkirim” palsu: aplikasi WA/email user yang dibuka.

## FAQ, mission, navbar

- FAQ: 4 kategori lokal (Umum, Harga & paket, Fitur & AI, Privasi & keamanan),
  11 pertanyaan dari export General + `FAQ_ITEMS`. Rail desktop (≥1200) dan
  dropdown mobile (<1200) memfilter daftar accordion yang sama.
- Mission: gambar kartu `object-contain` (desktop di separuh kartu, mobile
  `w-full h-auto`), dimensi asli dipasang di `<img>`.
- Navbar: satu surface, pill radius 24, panel mobile mulai `top-[76px]`, fokus
  awal/Escape/Tab trap, `basePath` untuk `/contact`.
- Avatar “Join 2.000+ lainnya”: marquee 20s linear infinite, pause on hover/focus,
  `prefers-reduced-motion` diam, overflow di-mask.

## Alat kerja

| Perintah | Fungsi |
|---|---|
| `node scripts/landing/shoot.mjs <url> <nama>` | Screenshot 1440/1024/390 → `docs/landing/shots/`. Opsi: `--only=desktop`, `--scroll=760,bottom,bottom-1800`, `--click=...`, `--wait=8000`, `fullPage`. |
| `node scripts/landing/inspect.mjs <url> "<selector>\|<label>"` | Baca computed style/posisi elemen. |
| `node scripts/landing/_tmp-release-verify.mjs` | Audit rilis: font, overflow, pricing, checkout, marquee, WA. Script kerja sementara. |
| `pnpm theme:audit` | Penjaga palet; harus `palet bersih`. |

Screenshot rilis ada di `docs/landing/shots/release-*.png`.

## Sisa risiko / belum selesai

1. **Midtrans recurring tidak dipakai** — ini memang prepaid; tidak ada auto-debit.
2. **Migrasi SQL sudah diterapkan** ke project Supabase aktif
   (`20261014120000_catetind_prepaid_30_hari`). `pnpm supabase:migrate` juga
   menerapkan migrasi pending `20261013130000_catetind_token_kelas_kartu_dompet`.
   Verifikasi: kolom `billing_period/expires_at/is_lifetime` ada, function
   `catetind_fulfill_purchase` punya cabang monthly/lifetime, grant EXECUTE hanya
   `postgres` + `service_role`, dan `pnpm supabase:verify` lulus (tidak ada data
   terbaca tanpa sesi).
3. **Mockup UI kartu mission desktop** masih memakai aset gradien blur dari
   export; elemen DOM mockup Framer belum diport.
4. **Label “Chat Minca di WhatsApp”** mengandaikan nomor itu dibalas manusia/tim.
   Repo belum punya bot WhatsApp; jangan mengklaim AI chat di WhatsApp.
5. **Contact form bukan backend** — hanya membuka WhatsApp/email app.
6. **Free tier belum ada** — expired = read-only penuh.
7. Data lama tanpa `billing_period` diperlakukan lifetime; pembeli lama tetap
   dipertahankan lewat backfill migrasi.
8. Perubahan landing sudah di-commit; screenshot QA tetap lokal (di-ignore).
