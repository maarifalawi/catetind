# 13 — Terms of Service (`/terms`)

**Route:** `app/terms/page.tsx` · **Inventaris:** #5 · **Fase 5** · **Depends on:** #12 (pakai ulang `legal-shell.tsx`)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Peta baca

**PRD:**

- **5075–5099** — **4 Disclaimer Wajib → bagian "1. Terms of Service (ToS)"**:
  pakai **verbatim** saat menyatakan apa yang CatetInd BUKAN (bukan Penasihat Investasi
  terdaftar OJK, bukan CFP, bukan APERD, bukan Lembaga Jasa Keuangan) dan bahwa semua
  insight/edukasi bersifat informatif.
- **4982–5074** — 5E framing copywriting yang aman: jangan pakai kata "saran/rekomendasi";
  pakai "insight/informasi" (lihat tabel baris 5035–5038)
- **5101–5125** — batas AI Coach (boleh apa / tidak boleh apa) + disclaimer auto-append
- **4503–4607** — aturan langganan: **prepaid manual, BUKAN auto-charge**; masa aktif
  bertumpuk (bukan reset); **grace 7 hari read-only**; **data TIDAK pernah dihapus**;
  trust badge "Tanpa auto-renew paksa"
- **4774–4900** — kuota token AI: kuota dasar & **reset kuota** + paket add-on
  (**baca sendiri dan tulis hanya yang benar-benar tertera; jangan mengarang aturan kedaluwarsa**)
- **1692 & 1716–1723** — Asumsi A1 (tipe transaksi Tabungan & Transfer) & A6 (saldo
  dompet "stored", bukan dihitung ulang) — relevan untuk klausul akurasi data

**Inventaris:** baris 16 (#5) — *"Legal"*.

**Kode acuan:**

- `components/catetind/legal-shell.tsx` — **dibuat di prompt 12**; pakai apa adanya
  (judul, "Terakhir diperbarui", daftar isi, lebar baca). Kalau perlu penyesuaian,
  ubah di `legal-shell.tsx` — **jangan** duplikasi layoutnya.
- `lib/legal/privacy.ts` — contoh struktur `Section[]` yang harus kamu ikuti
- `components/catetind/billing-panel.tsx` + `lib/data/pricing.ts` (dari prompt 08) —
  sumber harga & aturan langganan yang dipakai UI; ToS tidak boleh bertentangan dengan ini
- `components/catetind/settings-panel-privacy.tsx` — bahasa privasi yang sudah dipakai produk

## Kenapa halaman ini ada

ToS di produk ini adalah **janji anti-dark-pattern** yang ditulis resmi: tanpa
auto-renew, tanpa harga yang berubah diam-diam, tanpa data yang hilang karena
langganan habis. Ini yang membuat audiens Gen-Z (yang skeptis pada produk finansial)
mau mempercayakan catatan uangnya.

Prinsip penulisan (CONTEXT-WAJIB §5.3 & 5.6):

- **Kalau ragu, tulis yang lebih konservatif** dan tandai `REVIEW LEGAL` di file data —
  jangan mengarang klausul.
- **Batasan AI harus eksplisit** (PRD 5111–5114) — melindungi user sekaligus produk.
- **Jangan menyembunyikan angka.** Aturan masa aktif, grace period, dan kuota token
  ditulis dalam bahasa manusia, bukan bahasa kontrak.

## Yang harus dibangun

1. **`lib/legal/terms.ts`** (baru) — struktur `Section[]` sama seperti privacy, dengan
   minimal section:
   - **Ringkasan bahasa manusia** (3–5 poin: apa layanan ini, apa yang bukan, aturan
     langganan, aturan data) — taruh di paling atas supaya user benar-benar membacanya.
   - **Apa itu CatetInd** (perujuk verbatim PRD 5082–5084).
   - **Yang CatetInd BUKAN** — **verbatim** 4 poin PRD 5085–5089 + paragraf
     "seluruh informasi … bersifat informatif dan edukatif" (5091–5094) + tanggung
     jawab keputusan user (5096–5098).
   - **Batas AI Coach**: boleh (memahami pola, konsep dasar, budgeting) & tidak boleh
     (saran investasi spesifik, rekomendasi produk, menggantikan perencana keuangan) —
     verbatim dari 5106–5114, plus perilaku disclaimer otomatis 5119–5125.
   - **Langganan**: prepaid manual tanpa auto-renew, masa aktif bertumpuk, grace 7 hari
     read-only, data tidak pernah dihapus, tidak ada penagihan otomatis (4505–4548).
   - **Token AI**: kuota dasar, siklus reset, dan paket add-on — tulis **hanya** yang
     benar-benar ada di PRD 4774–4900; bagian yang tidak jelas diberi `REVIEW LEGAL`.
   - **Pembayaran**: lewat Midtrans sebagai pemroses (jangan mengarang kebijakan refund
     yang tidak ada di PRD — kalau PRD tidak mengatur, tulis "kebijakan refund ditinjau
     kasus per kasus" + `REVIEW LEGAL`).
   - **Akun & penggunaan yang dilarang**, **kepemilikan data** (data keuanganmu milikmu;
     kami hanya menyimpannya), **batasan tanggung jawab**, **perubahan ToS**,
     **hukum & yurisdiksi Indonesia**, **kontak** (`/help`).
2. **`app/terms/page.tsx`** — tipis, `metadata` ("Syarat & Ketentuan — CatetInd"),
   `PhoneStage` (publik), tanpa sidebar/FAB/chat.
3. **Selesaikan tautan silang**: karena sekarang `/terms` sudah ada, tambahkan tautan
   `Syarat & Ketentuan` → `/terms` di halaman `/privacy` (utang dari prompt 12) dan
   sebaliknya di `/terms` → `/privacy`.

## Acceptance criteria

- [ ] `/terms` terbuka tanpa login; daftar isi berfungsi; "Terakhir diperbarui" ada.
- [ ] Kalimat "CatetInd BUKAN …" empat poin itu **sama persis** dengan PRD 5085–5089.
- [ ] Aturan langganan & grace period konsisten 100% dengan yang ditampilkan di
      `/settings/billing` (tidak ada kontradiksi).
- [ ] Tidak ada kata "saran"/"rekomendasi" untuk fitur AI (pakai "insight/informasi").
- [ ] Tautan dua arah `/terms` ⇄ `/privacy` berfungsi; tautan ke `/help` berfungsi.
- [ ] Lebar baca nyaman; mobile tanpa horizontal scroll.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Menyalin template ToS generik dari internet.
- Mengarang nominal, kebijakan refund, atau klausul yurisdiksi di luar yang tertulis di PRD
  (tandai `REVIEW LEGAL` bila perlu).
- Menduplikasi layout legal (pakai `legal-shell.tsx`).
