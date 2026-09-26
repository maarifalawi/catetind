# 11 — Share Preview Publik (`/share/[id]`)

**Route:** `app/share/[id]/page.tsx` · **Inventaris:** #16 · **Fase 4** · **Depends on:** — (mandiri)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Peta baca

**PRD:**

- **6547–6576** — Loop 2 "Share Your Progress (Privacy-Safe)": desain kartu + **PRIVACY GUARD**
  (dilarang menampilkan angka rupiah, kategori, nama merchant, persentase —
  **hanya** jumlah transaksi, streak, milestone, tahap tanaman)
- **6621–6633** — Loop 3: aturan share report — hanya bagian yang aman; copy wajib:
  *"Beberapa slide bersifat pribadi dan tidak termasuk dalam share. Privasi kamu kami jaga 💚"*
- **6614–6617** — trigger tombol Share (monthly recap, tanaman naik tahap, target tercapai)
- **5174–5177** — larangan data fabrikasi (kalau belum ada data: katakan apa adanya)
- **7032–7057** — Domain 8 Advantage 1: privasi = keunggulan struktural, bukan slogan

**Inventaris:** baris 48 (#16) — *"Halaman publik saat orang lain klik link share
progress card. Menampilkan Achievement Card (tanpa angka keuangan) + CTA
'Mau kayak gini? Gabung CatetInd'"*.

**Kode acuan:**

- `components/catetind/weekly-recap-modal.tsx` — modal recap (punya ikon `Share2`;
  **cek apakah tombolnya sudah terhubung** — kalau belum, di sinilah trigger-nya)
- `components/catetind/plant-illustration.tsx` — tanaman SVG (reuse, jangan bikin baru)
- `lib/weekly-recap.ts` — `WEEK_PLANT`, `WEEK_DATA`, `formatIDR` (jangan pakai yang keuangan untuk kartu ini!)
- `components/catetind/my-goals-card.tsx` — `stageFromPercent()`
- `lib/data/referral.ts` — pola konstanta copy + helper murni

## Kenapa halaman ini ada

Ini satu-satunya halaman kita yang **dibuka oleh orang yang belum kenal CatetInd**,
dan ia datang karena rasa bangga seseorang. Halaman ini harus:

- **Bisa dibanggakan pemiliknya** (estetis, layak di-screenshot ulang) —
  tanpa membocorkan satu rupiah pun.
- **Jujur.** Kalau kartunya milik user yang datanya masih tipis, jangan mengarang
  pencapaian sensasional (PRD 5174–5177 & 572).
- **Mengundang dengan hangat**, bukan hard-sell: *"Mau kayak gini? Gabung CatetInd"*.

Konsekuensi desain: seluruh foto/data di halaman ini harus bisa dibuka tanpa login
(privasi orang lain yang dibuka = data yang memang sudah ia pilih untuk dibagikan).

## Yang harus dibangun

1. **`lib/data/share.ts`** (baru) — dan ini bagian TERPENTING:
   - `interface ShareCard { id, ownerName, monthLabel, totalTransactions, streakDays,
     milestones: string[], plantStage }` — **perhatikan: tidak ada field uang sama sekali.**
     Tulis komentar tegas di atas interface: *"DILARANG menambah field nominal/kategori/
     merchant/persentase ke tipe ini — kartu ini dipublikasikan."*
   - `getShareCard(id)` → registry mock (mis. `'rina-sep'`) + `'unknown'` untuk id tak dikenal.
   - `buildSharePayload()` yang mengambil **hanya** field di atas dari sumber data — bukan spread objek keuangan.
   - `SHARE_HASHTAG = '#CatetAjaDulu'`, copy CTA, copy privasi (PRD 6633 verbatim).
2. **`app/share/[id]/page.tsx`** — `params: Promise<{ id: string }>`;
   **`generateMetadata`** (penting: link ini dibagikan lewat WhatsApp/IG, jadi judul &
   deskripsi harus enak dipratinjau, **tanpa angka uang**).
3. **`components/catetind/share-preview-screen.tsx`** (publik, `PhoneStage`, tanpa sidebar/FAB/chat):
   - **Achievement Card**: nama pemilik, bulan, 3 baris pencapaian (jumlah transaksi,
   hari berturut-turut, milestone), tanaman (dari `plant-illustration`), hashtag,
     wordmark CatetInd kecil di bawah.
   - Kartu harus terasa seperti **kartu yang layak di-screenshot** (rasio & padding
     rapi di 375 px, tanpa scroll horizontal).
   - **CTA** `"Mau kayak gini? Gabung CatetInd"` → `/checkout`.
   - **Catatan privasi** (PRD 6633) sebagai baris kecil di bawah kartu.
   - **Id tak dikenal / kartu tidak ada** → empty state hangat: *"Kartu ini sudah tidak
     tersedia atau tautannya salah 🌱"* + CTA ke beranda (bukan error kaku).
   - **Data tipis** (mis. `totalTransactions < 7`) → tampilkan kartu "masih tumbuh"
     apa adanya, jangan mengarang pencapaian.
4. **Hilangkan status yatim** — hubungkan tombol Share di `weekly-recap-modal.tsx`
   (dan/atau kartu target tercapai bila ada) supaya bisa menghasilkan/membuka
   `/share/<id>`; kalau implementasi gambar (`html2canvas`) tidak tersedia, cukup:
   **Salin link** (`navigator.clipboard`) + **Bagikan** (`navigator.share`) dengan
   toast — pola sama seperti `referral-screen.tsx`.

## Acceptance criteria

- [ ] `/share/rina-sep` (id mock) membuka kartu **tanpa satu pun angka rupiah/kategori/merchant**.
- [ ] Id tak dikenal → empty state hangat, bukan 404 kaku.
- [ ] `grep` pada `lib/data/share.ts` tidak memuat field uang (bukti privacy guard di kode).
- [ ] Metadata OG/Twitter terisi (judul + deskripsi) dan bebas angka keuangan.
- [ ] Minimal satu trigger nyata di app menuju/menghasilkan halaman ini (tidak yatim).
- [ ] Rapi di 375 px; bisa dibaca tanpa login; tanpa sidebar/FAB/chat.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Menampilkan saldo, total pengeluaran, kategori, nama merchant, atau persentase apa pun.
- Data fabrikasi (mis. testimoni atau "1.234 orang sudah gabung") tanpa sumber nyata.
- Meminta login untuk melihat kartu (tujuan halaman ini justru jadi pintu masuk publik).
