# 12 — Privacy Policy (`/privacy`)

**Route:** `app/privacy/page.tsx` · **Inventaris:** #4 · **Fase 5** · **Depends on:** — (mandiri)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Peta baca

**PRD:**

- **3064–3352** — 4C Supabase Security Architecture: RLS single user & joint wallet,
  **admin ZERO individual access** (Skenario 4 & 5) — inilah tulang punggung klaim privasi kita
- **3435–3504** — Strategi dukungan tanpa akses data: **"Export Data Saya"**,
  **Screenshot Policy**, error telemetry tanpa PII
- **4982–5074** — 5E: mapping aktivitas & **framing copywriting yang aman** (kalau kita
  tidak melakukan sesuatu, jangan mengklaimnya; dan sebaliknya)
- **5075–5135** — 4 disclaimer wajib (ToS, AI Coach, response sensitif, footer)
- **7032–7057** — Domain 8 Advantage 1: *Privacy-First Zero-Exception Architecture*
- **4759–4900** — 5C: kuota token AI & reset kuota (relevan: data apa yang dikirim ke model AI)

**Inventaris:** baris 15 (#4) — *"Legal, OJK disclaimers"*.

**Kode acuan:**

- `components/catetind/help-center-screen.tsx` — pola halaman panjang & berbasis data
  (`lib/data/help.ts`), termasuk gaya sidebar/topik yang bisa ditiru untuk daftar isi
- `components/catetind/settings-panel-privacy.tsx` — copy & komitmen privasi yang sudah dipakai produk
- `components/catetind/phone-stage.tsx` — halaman publik
- `components/catetind/logo-wordmark.tsx` — footer/identitas

## Kenapa halaman ini ada

Halaman ini bukan formalitas — ia **bukti tertulis** dari positioning produk
("jujur di setiap klaim", PRD 244). Audiens kita skeptis dan pernah dikecewakan app
finansial lain; kebijakan privasi yang kabur akan langsung terbaca sebagai
"data saya dijual".

Psikologi & aturan yang berlaku (CONTEXT-WAJIB §5.3):

- **Spesifik, bukan slogan.** Tulis hal yang benar-benar dilakukan sistem
  (RLS per user, admin tidak bisa melihat data, support hanya bisa bekerja dari
  screenshot yang user kirim sendiri).
- **Katanya jujur soal AI.** Data keuangan dikirim ke penyedia model untuk fitur AI →
  **wajib ditulis terbuka**, termasuk bahwa ada consent & kuota (PRD 4B/5C).
- **Tanpa klaim legal di luar kenyataan.** Repo ini demo; teks final butuh review legal
  → tandai dengan komentar `REVIEW LEGAL` di file data, dan cantumkan tanggal versi.

## Yang harus dibangun

1. **`components/catetind/legal-shell.tsx`** (baru, dipakai juga oleh prompt 13 — Terms):
   - Layout halaman publik: judul H1 kanon, baris "Terakhir diperbarui: …",
     **daftar isi** yang bisa diklik (desktop: kolom sticky di kiri; mobile: daftar
     ringkas di atas), lebar baca nyaman (~65–75 karakter), tipografi `font-display`
     hanya untuk judul.
   - Anchor (`id`) per section + `scroll-margin-top` supaya tidak tertutup header.
2. **`lib/legal/privacy.ts`** (baru) — konten terstruktur (`Section[] = { id, title,
   paragraphs, bullets? }`), sehingga JSX-nya bersih. Isi minimal:
   - **Data yang kami simpan** (transaksi, dompet, tagihan, target, preferensi) dan **kenapa**.
   - **Yang TIDAK kami ambil**: tanpa bank-sync (data bukan dari bank), tanpa akses
     kontak/galeri/lokasi, tanpa pelacak iklan di luar analitik dasar.
   - **Siapa yang bisa melihat data kamu**: hanya kamu (RLS per user);
     **admin/support tidak punya akses** ke data individual (PRD 3353–3434);
     joint wallet dibatasi lapisan privasi (2D.1).
   - **Bagaimana bantuan bekerja tanpa melihat data**: Export Data Saya + Screenshot
     Policy (PRD 3439–3482) — jelaskan langkahnya, bukan cuma janji.
   - **AI**: bagian data apa yang diproses untuk fitur AI, untuk apa, dan hakmu mematikannya
     (rujuk Settings → AI Preferences yang sudah ada).
   - **Pihak ketiga**: penyedia model AI, Supabase (basis data), Midtrans (pembayaran) —
     sebutkan perannya masing-masing (tanpa mengarang nama vendor detail bila tidak ada di PRD;
     kalau ragu, tandai `REVIEW LEGAL`).
   - **Hak kamu**: mengakses, mengekspor, menghapus akun (kaitkan ke `/settings/data` &
     `/settings/security`), serta permintaan lewat Pusat Bantuan `/help`.
   - **Anak di bawah umur**, **perubahan kebijakan**, dan **kontak**.
3. **`app/privacy/page.tsx`** — tipis, `metadata` ("Kebijakan Privasi — CatetInd"),
   `PhoneStage` (publik, tanpa sidebar).
4. **Jejak masuk**: pastikan halaman ini bisa ditempuh dari UI nyata — tambahkan tautan
   di `app/settings/security/page.tsx` (atau `settings-panel-privacy.tsx`) dan di kaki
   Help Center. Tanpa ini halaman legal akan jadi yatim.

## Acceptance criteria

- [ ] `/privacy` terbuka tanpa login, tanpa sidebar/FAB/chat widget.
- [ ] Ada "Terakhir diperbarui", daftar isi yang berfungsi, dan anchor tiap section.
- [ ] Enam topik wajib di §Yang harus dibangun poin 2 semuanya ada dan spesifik.
- [ ] Tidak ada klaim yang tidak ada di PRD tanpa penanda `REVIEW LEGAL`.
- [ ] Tautan ke `/settings/data`, `/settings/security`, `/help`, dan `/terms` berfungsi
      (**catatan:** `/terms` dibuat di prompt 13 — kalau belum ada, jangan pasang tautan mati;
      cukup sebutkan dan pasang setelah prompt 13 selesai).
- [ ] Lebar baca nyaman di desktop; mobile tidak ada horizontal scroll.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Copy generik hasil salin-tempel template privacy policy pihak lain.
- Menjanjikan sesuatu yang belum benar di repo/kode (mis. "enkripsi end-to-end" kalau belum ada).
- Menyembunyikan bagian AI/token di balik bahasa teknis.
- Menempatkan dokumen legal ini sebagai halaman app ber-sidebar (harus publik).
