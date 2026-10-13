# Laporan Paket 94 — Penanda AI Coach Memakai Mark Resmi `logoAI.png`

> **Tanggal:** 14 Okt 2026
> **Kanon kerja:** `docs/handoff/CONTEXT-WAJIB.md` (§2 struktur & konvensi kode, §3 palet, §7 no dead asset, §8 checklist validasi, §9 DoD)
> **Permintaan pemilik produk (1):** "Untuk button AI, dan yang butuh logo.
> pake ini aja `public/logoAI.png`."
> **Revisi hari yang sama (2):** "gausah ada stroke ijonya, terus gambarnya jangan
> di zoom" — versi pertama paket ini memakai crop rapat + hairline, dua-duanya
> dibuang.
> **Revisi hari yang sama (3):** "di bublenya juga gausah ada stroke ijo, bikin
> stroke ijo tua aja dengan ketebalan 1" — stroke seluruh bubble AI jadi `ring-1
> ring-forest` (#45594e), menggantikan hairline hitam-12% & mint-50%.
> **Revisi hari yang sama (4):** "`public\logo-ai.png` — ganti ini aja, gausah di
> tambahin apa apa, gausah di tambahin background2" — avatar AI memakai FILE
> ARTWORK YANG DITARUH PEMILIK PRODUK apa adanya (1916×1930, 2,6 MB); semua
> pemrosesan/generate untuk file itu dicabut dari generator.

## Ringkas

Penanda identitas AI Coach — tombol melayang (FAB), kepala bubble chat, dan avatar
header panel — memakai MARK BRAND resmi (brush "A!i" hitam) dari FILE ARTWORK yang
ditaruh sendiri pemilik produk: `public/logo-ai.png`. Tidak ada lagi ikon kilau
Lucide `Sparkles` di alur AI, tidak ada lagi teks "AI", tidak ada ring/hairline di
avatarnya, dan file itu dipakai **apa adanya** — tidak diproses, tidak di-crop,
tidak ditambah latar apa pun. Stroke seluruh bubble AI juga jadi `ring-1
ring-forest` (ijo tua), dan stroke hijau-muda bubble apresiasi dihapus.

## Riwayat revisi aset (dua pendekatan pertama ditolak pemilik produk)

| | v1 — crop + ring (ditolak) | v2 — turunan 256px (ditolak) | v3 — FINAL |
|---|---|---|---|
| Perlakuan aset | `extract()` crop ke bbox mark (`aiMarkBox()`) | seluruh kanvas diperkecil apa adanya jadi 256×256 | **tanpa pemrosesan sama sekali** |
| Mark di dalam frame | 78% sisi kanvas | 45% sisi kanvas | 45% sisi kanvas (komposisi artwork) |
| Bentuk cakram | dipaksakan CSS (`rounded-full`) | dari alpha aset | dari alpha aset |
| Tepi cakram | hairline `ring-1 ring-soil/12` | tidak ada | tidak ada |
| Berat file yang dikirim ke browser | 21 KB | 6,8 KB | **2,6 MB** (file asli pemilik produk) |
| Ukuran mark di UI | ±21,8 px @28px | 12,5 / 14,3 / 16,1 px | 12,6 / 14,4 / 16,2 px |
| Langkah `pnpm icons` | menulis `logo-ai.png` | menulis `logo-ai.png` | **tidak menyentuh file itu lagi** |

Konsekuensi yang perlu diingat: **komposisi dan resolusi mark sepenuhnya milik
artwork pemilik produk** — tidak ada satu pun angka di skrip generator yang
mengaturnya, karena skrip itu sudah tidak boleh menulis `public/logo-ai.png`.

## Revisi 2 — stroke bubble AI: 1px ijo tua (`ring-forest`)

Keluhan lanjutan pemilik produk menyasar stroke BUBBLE-nya, bukan lagi penanda di
avatar. Sebelumnya keluarga bubble AI memakai dua bahasa stroke yang dua-duanya
bukan "ijo tua": bubble jawaban biasa `ring-soil/12` — hitam 12%, terbaca sebagai
garis keabu-abuan tipis (`--color-soil` = HITAM, bukan hijau) — dan bubble
apresiasi `ring-mint/50` (hijau MUDA, satu-satunya yang benar-benar hijau).

Sekarang seluruh keluarga bubble AI memakai satu stroke: **`ring-1 ring-forest`**
(#45594e = `--color-forest` "evergreen"), tebal 1px seperti permintaan.

| Bubble | Sebelum | Sesudah |
|---|---|---|
| Jawaban AI (`ChatBubble`, non-apresiasi) | `bg-cream … ring-soil/12` | `bg-cream … ring-forest` |
| Apresiasi (`ChatBubble`, `kind: 'appreciation'`) | `bg-sage … ring-mint/50` | `bg-sage … ring-forest` |
| Indikator "AI ngetik" (`TypingIndicator`) | `ring-soil/12` | `ring-forest` |
| Bubble capture (`ai-capture-bubble.tsx`) | `ring-soil/12` | `ring-forest` |

Yang **TIDAK** diubah, dan alasannya: permukaan dialog AI (panel `ring-soil/12`),
chip balasan cepat yang tidak aktif, dan ring amber peringatan di alur capture
(`ring-hud-amber/40-45`, mis. dugaan salah kategori) — semuanya bukan bubble, dan
amber itu membawa ARTI (hati-hati), bukan identitas. Bubble USER tidak punya
stroke sejak awal (isian `bg-forest` penuh).

Efek samping yang perlu diingat: **bubble apresiasi kini tidak lagi dibedakan oleh
warna stroke-nya** — pembedanya tinggal permukaan oat (`bg-sage`) + label sparkle
"apresiasi". Itu konsekuensi langsung dari permintaan stroke seragam, dan bubble
apresiasi tetap terbaca berbeda karena latarnya beige.

## Yang dikerjakan (4 berkas + 4 aset)

| File | Perubahan |
|---|---|
| `scripts/generate-icons.mjs` | **Revisi 4 (final): langkah mark AI DICABUT.** Bagian `AI_SOURCE`/`AI_OUT`/`AI_SIZE` + fungsi `aiMark()` dihapus seluruhnya, jadi skrip ini kembali murni pembuat ikon HOME SCREEN. Header-nya mencatat kenapa: `public/logo-ai.png` adalah artwork pemilik produk yang harus dipakai apa adanya, jadi skrip tidak boleh menyentuh file itu. Bukti: dijalankan `pnpm icons`, lalu hash + ukuran `logo-ai.png` tidak berubah (2.644.016 byte). |
| `components/catetind/ai-avatar.tsx` | `src="/logo-ai.png"` dengan `className="shrink-0"` + ukuran dari pemanggil (bawaan `size-7`); **tidak ada** `rounded-full`, ring, maupun `bg-*`. `width`/`height` diset ke ukuran file aslinya (**1916×1930**) supaya rasio yang ditebak `next/image` jujur. Dokumentasi ditulis ulang: file dipakai apa adanya, tanpa pemrosesan/latar tambahan, bentuk cakram dari alpha artwork, dan apa yang harus diperbarui kalau file-nya kelak diganti. |
| `components/catetind/ai-chat-widget.tsx` | FAB AI Coach: teks "AI" 17 px → `<AIAvatar className="size-8" />` (cakram 32 px di dalam tombol 48 px; kelas `text-mint` yang jadi mati dihapus). Header panel: `size-9 text-[15px]` → `size-9`. Komentar diperbarui (tanpa crop, tanpa ring). **Revisi 2:** stroke bubble jadi `ring-1 ring-forest` — bubble jawaban (dua varian), varian apresiasi, dan indikator "ngetik". |
| `components/catetind/ai-capture-bubble.tsx` | **Revisi 2:** stroke bubble capture `ring-soil/12` → `ring-1 ring-forest`, seragam dengan bubble chat AI. |
| `public/logo-ai.png` (diganti pemilik produk) | **1916×1930 · PNG ber-alpha · 2,6 MB** — artwork asli dari pemilik produk (isinya praktis sama dengan `logoAI.png`: cakram putih penuh kanvas + mark "A!i" hitam di tengah, mark ±45%). Tidak diproses, tidak diperkecil, tidak ditambah latar. Konsekuensi yang harus diketahui: filenya 2,6 MB per unduhan (repo ini `images.unoptimized`, dan `sw.js` tidak men-cache PNG di akar `public/`). |
| `public/icon.svg`, `public/placeholder-logo.svg`, `public/placeholder.svg` (dihapus) | Sisa aset template v0 — nol rujukan di `app/`, `components/`, `lib/`, `app/manifest.ts`, `public/sw.js`, dan dokumen. Pembersihan ini bagian dari paket yang sama. |

Aset TIDAK dihapus/diubah: `public/logoAI.png` tetap ada karena ia **sumber
regenerasi** untuk `pnpm icons` — pola yang sama dengan `public/Dashboard.png`
yang tetap disimpan meski dipakai lewat `LogoWordmark`.

## Geometri aset sumber (diukur, bukan diasumsikan)

`logoAI.png` 1916×1930: piksel **opak 78,53%** — sama dengan π/4 = 78,54% —
artinya cakramnya lingkaran sempurna yang **menyentuh keempat tepi kanvas**
(sudut transparan 21,1%; tepi anti-alias hanya 0,36% ≈ 1 px). Mark-nya sendiri
menempati **45,0% × 41,8%** kanvas, pusatnya **1,7% kanan & 7,4% bawah** dari
pusat kanvas. Angka inilah yang membuat "tanpa zoom" cukup dikerjakan dengan satu
`resize()`: tidak ada margin aset yang perlu dibuang dan tidak ada bbox yang perlu
dicari. (Versi pertama paket ini menemukan angka yang sama lewat scan piksel tinta
— pemakaiannya kini tidak ada lagi.)

## Keputusan desain yang perlu diingat

1. **Mark, bukan kilau.** Ikon kilau (`Sparkles`) hilang dari semua penanda
   identitas AI: FAB, kepala bubble, avatar header panel. Ikon kilau yang hidup
   DI DALAM badge/chip di kartu (mis. badge "apresiasi" di bubble chat,
   `billing-panel`, dst.) sengaja TIDAK disentuh — itu isi pesan/legenda, bukan
   logo.
2. **Aset apa adanya.** Crop dilarang karena permintaan pemilik produk: mark
   tampil pada komposisi aslinya. Ongkosnya sadar: mark jadi 12,5–16,1 px pada
   ukuran avatar sekarang (dulu 21,8 px). Kalau terasa kekecilan, yang disetel
   BUKAN generator — cukup besarkan cakramnya di pemanggil (mis. FAB `size-8` →
   `size-10` = cakram 40 px, mark 18 px, bibir forest 4 px; mock-nya sudah diuji
   mata).
3. **Bentuk dari aset, bukan dari CSS.** Sudut transparan dibiarkan. Karena itu
   `rounded-full` dihapus: pada aset yang sudah bulat ia tidak menambah apa pun
   selain memotong tepi anti-aliasnya. Efek yang perlu diingat: di atas permukaan
   putih app (`--color-cream` = `#ffffff`, termasuk bubble chat) cakram putih itu
   melebur dengan latarnya sehingga **yang terlihat hanya mark-nya**; di atas
   tombol forest (FAB), tepi cakram dibawa alpha aset.
4. **Tanpa ring.** `ring-1 ring-soil/12` dibuang atas permintaan ("gausah ada
   stroke ijonya"). Ini sekaligus menghapus satu-satunya alasan `bg-white` dulu
   sempat dicoba — dan `theme:audit` memang sudah menolak `bg-white` sebagai warna
   di luar palet.
5. **`fit: 'fill'`, bukan `cover`.** Aset sumber 1916×1930 (0,7% lebih tinggi dari
   lebar). Di-resize memenuhi kanvas persegi supaya keluarannya pas 256×256 dan
   cakramnya tetap lingkaran sempurna; selisih 0,7% = 0,25 px di ukuran pakai
   terbesar (36 px), dan tidak ada satu piksel pun yang dipotong.
6. **Satu sumber mark.** FAB, bubble, dan header panel semuanya memakai
   `AIAvatar` — wajah AI mustahil berbeda antar-tempat.
7. **Nol angka warna baru & nol copy baru.** Tidak ada hex/kelas di luar palet,
   tidak ada string copy baru di JSX, tidak ada route baru.

## Validasi (output apa adanya)

```bash
pnpm theme:audit        →  ✓ palet bersih — 505 file diperiksa, tidak ada warna di luar palet.
pnpm exec tsc --noEmit  →  exit 0 (tanpa output)
pnpm build              →  ✓ Compiled successfully in 1876ms
pnpm test               →  Test Files 88 passed (88) · Tests 1207 passed (1207)
pnpm icons              →  ✓ public/icons/icon-512.png · icon-192.png · apple-icon.png
                           ✓ public/apple-icon.png   (logo-ai.png TIDAK disentuh lagi)
```

Pemeriksaan artefak:

```text
public/logo-ai.png         →  1916×1930 · PNG + ALPHA · 2,6 MB  (file dari pemilik produk)
  alpha                    →  opak 78,03% (lingkaran ideal π/4 = 78,54%) · transparan 20,66%
  sudut (0,0),(…)          →  0, 0, 0, 0   (transparan = cakram, bukan kotak)
  tepi tengah (…)          →  opak penuh  (cakram menyentuh keempat tepi kanvas)
  bbox mark                →  ±45% × 41% kanvas → 12,6px @28 · 14,4px @32 · 16,2px @36
  setelah `pnpm icons`     →  hash & ukuran TIDAK berubah (2.644.016 byte) — tidak ditimpa
.next/server/app/app.html  →  <img alt="" aria-hidden="true" width="1916" height="1930"
                                class="shrink-0 size-8" src="/logo-ai.png"/>
                               ← nol "rounded-full", nol "ring-", nol "bg-*" (di tombol forest 48px)
.next/static/chunks/*.js   →  memuat "/logo-ai.png" dan "ring-1 ring-forest" (3 berkas)
.next/static/**/*.css      →  memuat kelas ".ring-forest"
components/catetind/*.tsx  →  nol sisa "text-[12px]"/"text-[15px]"/"text-[17px]",
                              nol "font-display text-", nol "bg-white"
scripts/generate-icons.mjs →  nol sisa "logo-ai" / "AI_SOURCE" / "aiMark"
```

Pemeriksaan mata (di luar repo — skrip sharp sementara, dihapus setelah dipakai):
avatar dirender pada 28 / 36 / 64 / 128 px di atas putih, dan sebagai mock FAB
(cakram 32 / 36 / 40 px di dalam tombol forest 48 px), lalu dibandingkan dengan
versi crop lama. Render itu memakai artwork yang sama, jadi hasilnya berlaku untuk
file final 1916×1930: cakram melebur di latar putih (yang terlihat hanya mark-nya),
tepi cakram di atas forest bersih tanpa halo, dan mark terbaca jelas dari 36 px ke
atas — di 28 px kecil tapi masih terbaca sebagai goresan.

## Yang belum bisa diverifikasi (jujur)

- **Tampilan di browser/perangkat belum saya lihat sendiri** — `/app` (Dashboard)
  ada di balik gerbang sesi dan tidak ada browser di lingkungan kerja ini. Klaim
  tata letak 375 px / 1440 px masih klaim desain; bukti terkuat adalah HTML SSR +
  render sharp di atas.
- **Mark sekarang kecil (12,6–16,2 px).** Itu konsekuensi langsung dari "jangan
  di zoom". Kalau ingin lebih besar, jalannya memperbesar cakram di pemanggilnya,
  bukan meng-crop asetnya (lihat keputusan 2).
- **Filenya 2,6 MB untuk avatar 28–32 px.** Itu konsekuensi langsung dari "pakai
  apa adanya" (revisi 4): kunjungan pertama mengunduh 2,6 MB, repo ini
  `images.unoptimized`, dan `public/sw.js` tidak men-cache PNG di akar `public/`.
  Kalau nanti mau dikecilkan, itu keputusan baru dari pemilik produk — bukan
  sesuatu yang boleh saya kerjakan sendiri (perintahnya: jangan ditambahi apa-apa).
- **`public/logoAI.png` (2,6 MB) kini tidak dipakai kode mana pun** — generator
  tidak lagi membacanya dan komponen memakai `logo-ai.png`. Isinya praktis sama
  (selisih ekspor ±0,05% piksel). TIDAK saya hapus: itu file yang ditaruh pemilik
  produk, dan "gausah di tambahin apa apa" bukan izin untuk menghapus.
- **`public/sw.js` tidak diubah.** `STATIC_PREFIXES` hanya memuat
  `/_next/static/`, `/icons/`, `/fonts/`, jadi PNG di akar `public/` (termasuk
  `/Dashboard.png`, `/LOGO.png`, dan `/logo-ai.png`) tidak di-cache SW — persis
  perilaku aset brand lain yang sudah ada.
- **29 pemakaian `Sparkles` lain di kartu/chip** (24 berkas) masih ada dan memang
  di luar cakupan keputusan ini.