# 🎨 Palet Warna CatetInd — "Earth Pastel"

Satu sumber kebenaran warna untuk seluruh sistem. Semua warna di `app/`,
`components/`, `lib/`, dan `scripts/` mengikuti palet ini.

> **Untuk agent/AI yang mengerjakan task baru:** tempel prompt di
> [`docs/theme/AGENT-PROMPT.md`](./AGENT-PROMPT.md) di awal sesi supaya konsistensi
> warna terjaga otomatis.

---

## 1. Palet kanon (10 warna)

| Nama | Hex | Porsi | Peran di sistem |
| --- | --- | --- | --- |
| **Soil** | `#000000` | 15% | **Hitam** — garis, scrim overlay, permukaan (`bg-ink`). *BUKAN teks di latar terang (itu Evergreen). Revisi: awalnya `#503A3A`.* |
| **Evergreen** | `#45594E` | 15% | Permukaan brand gelap + **warna teks di latar terang**: hero, muka kartu, sidebar (token `forest`) |
| **Ivory** | `#FBF6D9` | 15% | Aksen hangat opsional — **bukan** permukaan (dasar = putih) |
| **Oat** | `#EBE4DE` | 15% | Elemen kecil: chip/pill, lingkaran ikon, hover, kotak info (token `sage`) |
| **Plum** | `#B89191` | 7.5% | Aksen rose: alert / lewat batas (token `hud-terracotta`) |
| **Olive** | `#B5B987` | 7.5% | Aksen hijau-kuning: status "aman" (token `hud-sage`) |
| **Thistle** | `#91A0B8` | 7.5% | Aksen biru: info, kategori netral, transport |
| **Sage** | `#91BB9E` | 7.5% | Hijau positif: uang masuk, progres (token `mint`, `leaf`) |
| **Cantelope** | `#FFB885` | 5% | Aksen hangat: pengeluaran, peringatan (token `hud-amber`) |
| **Daisy** | `#ECD768` | 5% | Pop terang: brand, highlight, badge (token `brand`) |

> **Catatan nama:** `--color-leaf` = palet **Sage** (`#91BB9E`). Dipakai nama
> `leaf` karena token `--color-sage` sudah lebih dulu dipakai sebagai
> *permukaan pucat* di ratusan tempat (sekarang = Oat). Jadi `sage` ≠ Sage.

> **Dasar = PUTIH.** Latar halaman **dan** permukaan kartu/panel memakai putih
> — token teknis `--color-canvas: #ffffff` (kelas `bg-canvas`) dan alias
> `--color-cream` (juga putih). **Ivory `#FBF6D9` tidak dipakai sebagai
> permukaan**; tokennya disimpan di palet hanya sebagai aksen hangat opsional.
> Pemisah antar-kartu di atas putih datang dari hairline `ring-soil/8`–`/16`
> + shadow lembut.
>
> **Oat `#EBE4DE`** masih dipakai, tapi hanya untuk elemen kecil: chip/pill,
> lingkaran ikon, hover state, dan kotak info. Tidak untuk permukaan besar.

---

## 2. Arsitektur token (3 lapis)

```
Lapis 1  PALET KANON  ── bg-soil / bg-evergreen / bg-ivory / bg-oat / bg-plum
         (10 warna)      bg-olive / bg-thistle / bg-leaf / bg-cantelope / bg-daisy
              │
Lapis 2  ALIAS SEMANTIK ── bg-ink · bg-forest · bg-mint · bg-sage · bg-cream
         (dipakai komponen)   bg-hud-sage · bg-hud-amber · bg-hud-terracotta
              │
Lapis 3  NILAI TURUNAN ── tint/shade (mis. #52685c, #dbe4c7) untuk gradien,
         (terhitung dari        bayangan, dan stop gelap kartu
          warna palet)
              │
PENGECUALIAN                ── `bg-canvas` (#ffffff) — dasar halaman & permukaan
                                kartu. `bg-cream` juga = putih (canvas).
                                Di luar 10 warna palet, khusus permukaan dasar.
```

Semua ditulis di satu blok `@theme inline` di `app/globals.css`. Komponen hanya
boleh memakai **Lapis 1 & 2** — jangan menulis hex baru langsung di komponen.

### Tabel alias semantik → palet

| Token lama | Warna lama | Token baru | Warna baru |
| --- | --- | --- | --- |
| `ink` | `#12281f` | `ink` | **Soil** `#503a3a` |
| `forest` | `#103a2a` | `forest` | **Evergreen** `#45594e` |
| `forest-soft` | `#17543c` | `forest-soft` | turunan `#52685c` |
| `cream` | `#f4f8ef` | `cream` | **Putih / canvas** `#ffffff` |
| `sage` | `#e3edd8` | `sage` | **Oat** `#ebe4de` |
| `mint` | `#b7e04b` | `mint` | **Sage (palet)** `#91bb9e` |
| `mint-soft` | `#d6ef8e` | `mint-soft` | turunan `#dbe4c7` |
| `brand` | `#b7e04b` | `brand` | **Daisy** `#ecd768` |
| `hud-sage` | `#a3b18a` | `hud-sage` | **Olive** `#b5b987` |
| `hud-amber` | `#dda15e` | `hud-amber` | **Cantelope** `#ffb885` |
| `hud-terracotta` | `#bc6c25` | `hud-terracotta` | **Plum** `#b89191` |

### Nilai turunan (tint & shade)

Dihitung dari warna palet, dipakai untuk gradien kartu, bayangan, dan stop
gelap. Ditulis sebagai hex literal (Tailwind arbitrary value `from-[#…]` tidak
menerima `color-mix`).

| Nama | Hex | Asal |
| --- | --- | --- |
| evergreen-soft | `#52685c` | Evergreen dicerahkan |
| evergreen-light | `#c4c7af` | Evergreen + Ivory 70% |
| evergreen-deep | `#1f2823` | Evergreen ×0.45 |
| evergreen-deeper | `#161c19` | Evergreen ×0.32 |
| soil-deep | `#000000` | Soil — hitam sudah paling gelap, jadi deep = hitam |
| soil-deepest | `#000000` | idem |
| soil-muted | `#767676` | Netral: hitam + putih (teks sekunder) |
| leaf-light | `#dbe4c7` | Sage + Ivory 70% |
| olive-light | `#e6e4c0` | Olive + Ivory 70% |
| olive-deep | `#51533d` | Olive ×0.45 |
| thistle-light | `#dbdccf` | Thistle + Ivory 70% |
| thistle-deep | `#414853` | Thistle ×0.45 |
| plum-light | `#e7d8c3` | Plum + Ivory 70% |
| plum-deep | `#534141` | Plum ×0.45 |
| cantelope-light | `#fbe3c0` | Cantelope + Ivory 70% |
| cantelope-mid | `#e8b06a` | Cantelope ↔ Cantelope-deep |
| cantelope-deep | `#73533c` | Cantelope ×0.45 |
| daisy-light | `#f6edb7` | Daisy + Ivory 70% |
| daisy-deep | `#6a612f` | Daisy ×0.45 |

---

## 3. Aturan pemakaian

- **Latar berlapis:** kanvas = **putih** (`bg-canvas`) dan kartu/panel juga
  **putih** (`bg-cream` = canvas) — pemisahnya hairline `ring-soil/8`–`/16`
  (abu-abu netral, karena Soil = hitam) plus shadow lembut. Kartu gelap =
  Evergreen (`forest`).
- **Ivory tidak dipakai** sebagai permukaan; **Oat** hanya untuk chip/pill kecil.
- **Teks di latar terang:** Evergreen (`forest` `#45594E`) — **bukan** hitam.
  Hitam (Soil/`ink`) hanya untuk garis, scrim, dan permukaan (`bg-ink`). Teks di
  atas Evergreen/hitam = putih (`text-cream`). Teks sekunder pakai opasitas
  `text-forest/45`–`/65`, jangan bikin abu-abu baru.
- **Status/uang:** hijau (Sage) = uang masuk & positif · Olive = aman/on-track ·
  Cantelope = hati-hati/pengeluaran · Plum = lewat batas/alert · Thistle = info.
- **Border & bayangan netral:** hairline `ring-soil/8`–`/16`, bayangan
  `rgba(0,0,0,…)`.
- **Jangan** menulis hex atau kelas warna bawaan Tailwind (`text-slate-500`,
  `bg-blue-600`, dst.) — semuanya sudah dipetakan ke palet.

---

## 4. Cara kembali ke palet lama (Forest / Lime)

### Cara A — paling cepat (seluruh sistem, 100% sama seperti dulu)

```bash
git checkout theme/legacy-forest-lime -- .
git commit -m "revert(theme): kembali ke palet Forest/Lime"
```

### Cara B — hanya blok warna di `app/globals.css`

1. Buka `docs/theme/legacy-palette-forest-lime.css`.
2. Salin blok **A** ke blok `@theme inline` di `app/globals.css` (ganti 11 token
   warna di sana).
3. Salin blok **B** ke blok `:root` di `app/globals.css`.
4. Untuk hex/rgba literal di komponen: pakai tabel balik di
   `scripts/theme/apply-palette.mjs`.

### Cara C — batalkan commit migrasi

```bash
git revert <commit-migrasi-palet>
# atau paksa balik seluruh pohon:
git reset --hard theme/legacy-forest-lime
```

> **Referensi:** snapshot beku palet lama ada di
> `docs/theme/legacy-palette-forest-lime.css`, dan seluruh pohon file pra-migrasi
> ada di commit `ba9f3ce` / tag `theme/legacy-forest-lime`.

---

## 5. Alat migrasi & penjaga palet

```bash
pnpm theme:audit                                # cek warna di luar palet (exit 1 kalau ada)
pnpm theme:apply --dry-run                      # lihat rencana migrasi
pnpm theme:apply                                # terapkan pemetaan
node scripts/theme/apply-palette.mjs --dry-run  # (padanan tanpa pnpm)
```

- **`scripts/theme/audit-palette.mjs`** — penjaga palet. Menolak hex, `rgb()`/`rgba()`,
  dan kelas warna bawaan Tailwind yang tidak ada di palet. Satu-satunya
  pengecualian: `#ffffff` untuk `bg-canvas`. Jalankan sebelum commit atau di CI
  supaya warna tidak "nyasar" lagi.
- **`scripts/theme/apply-palette.mjs`** — tabel pemetaan lengkap lama → baru
  (332 hex · 190 rgb · 738 kelas). Sekaligus dokumentasi resmi migrasi ini.

### Riwayat migrasi

1. **Migrasi palet** — Forest/Lime → Earth Pastel (332 hex · 190 rgb · 738 kelas).
2. **Dasar putih** — latar halaman jadi `bg-canvas` (#ffffff), gradien Oat→Ivory
   dibuang; `themeColor` + `manifest.background_color` ikut putih.
3. **Permukaan putih** — seluruh permukaan Ivory `#fbf6d9` → putih (68 tempat),
   `--color-cream` → `#ffffff`, token shadcn `--card/--popover/--sidebar` → putih.
   Karena kartu kini putih-di-atas-putih, hairline `ring/border/divide-soil`
   dinaikkan (`/5` → `/12`, `[0.0x]` → `/8`–`/16`) dan isian tipis `bg-soil`
   dinaikkan, supaya batas kartu tetap terbaca.
4. **Soil → hitam** — `#503a3a` → `#000000` (termasuk alias `ink`, token shadcn
   `--foreground`, dan 130 penggantian di 41 file). Turunan soil ikut netral:
   `soil-deep`/`soil-deepest` → hitam, `soil-muted` → `#767676`, dan semua
   `rgba(80,58,58,…)` / `rgba(36,26,26,…)` → `rgba(0,0,0,…)`.

Untuk palet berikutnya: ubah `PALETTE` di `apply-palette.mjs`, lalu jalankan ulang.



