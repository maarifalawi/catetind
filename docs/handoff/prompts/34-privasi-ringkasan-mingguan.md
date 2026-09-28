# 34 — Privasi: Nominal di Ringkasan Mingguan (Rekap 5 Slide)

**Paket:** privasi lintas permukaan · **Fase 12** · **Depends on:** #31 (aturan & helper sensor sudah ada)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis — khususnya **§5.7** (siapa yang disensor).

## Bukti gap (audit 27 Sep 2026 — temuan baru, belum pernah dilaporkan)

Paket 31 menutup **toast** ber-nominal. Audit setelahnya menemukan satu kelas permukaan yang
terlewat: **modal Rekap Mingguan** (`WeeklyRecapModal`) — pajangan penuh layar yang dibiarkan
menampilkan seluruh nominal walau tombol mata menyala.

| # | Lokasi | Temuan |
|---|---|---|
| 1 | `components/catetind/weekly-recap-modal.tsx` (tidak ada impor `usePrivacy`) | file ini **kebal** terhadap tombol mata. Bandingkan `weekly-recap-banner.tsx:6` yang sudah memakai `usePrivacy` |
| 2 | `weekly-recap-modal.tsx:62`, `:166`, `:181`, `:190`, `:220`, `:247` | slide 1–2: `formatIDR(WEEK_DATA.income/expense/net)`, rata-rata harian, caption total |
| 3 | `weekly-recap-modal.tsx:319`, `:340`, `:365` | slide 2–3: nominal kategori & nilai segmen donat |
| 4 | `weekly-recap-modal.tsx:551`, `:588`, `:621`, `:624`, `:675-676` | slide 5 (Rencana Minggu Depan): `savingPerWeek`, `dailyCut`, label di atas bar |
| 5 | `weekly-recap-modal.tsx:514-516` | **komentar basi**: *"tidak dikirim di halaman lain → CTA-nya jadi tautan ke `/budget`"* — jalur itu sudah **dihapus** paket 32 (`:649-653`); prop di `SlidePlan` juga masih `onSetTarget?` padahal pemanggilnya sekarang wajib |
| 6 | `wallet-card-face.tsx:243` (`dots = '••••••'`) · `wallet-screen.tsx:957` (`masked ? '••••' : value`) | dua literal titik di luar `MASKED_AMOUNT`. Beda makna (nomor akun / muka kartu gelap, tanpa "Rp") — tapi belum ada keputusan tertulis kenapa boleh terpisah |

Modal ini bukan hiasan: ia dibuka dari **Home** (`home-screen.tsx:301`) dan **`/history`**
(`history-screen.tsx:655`), dan slide terakhirnya persis slide yang dipakai user buat mengambil
keputusan ("tabung Rp X/minggu"). Jadi ia permukaan **yang dibaca** — sama kelasnya dengan kartu
yang sudah disensor.

## Peta baca

- **3064–3504** — privasi/RLS + *screenshot policy* (kenapa privasi = trust, bukan fitur)
- **2141–2145** — CTA recap di zona ibu jari (**jangan pindah**, yang dibetulkan sensornya)
- **542–568** — micro-copy per state: kalimat harus tetap hangat walau angkanya jadi `Rp •••••••`
- **~2251** — toast/overlay memang hidup di layar beberapa detik (pola jaring pengaman yang sama)

**Kode acuan:**

- `components/catetind/privacy-provider.tsx` — `hide()` (**mempertahankan tanda `+`/`−`**) & `money()`
- `lib/data/history.ts:267` — `MASKED_AMOUNT` (satu definisi) + `maskMoney()` + `netLabel()`
- `components/catetind/cashflow-calendar-grid.tsx:5` — contoh menyensor **tiap** nominal di satu file,
  termasuk `aria-label` sel (`:282-284`)
- `components/catetind/weekly-recap-banner.tsx` — versi ringkas rekap yang sudah benar (tiru polanya)
- `lib/weekly-recap.ts` — semua angka & copy recap; **jangan** pindahkan angka ke JSX

## Kenapa ini penting (psikologi audiens — CONTEXT-WAJIB §5)

1. **§5.3 poin 5 + §5.7 — privasi = trust, bukan kosmetik.** User menyalakan mata privasi justru
   saat di ruang publik. Modal ini dipakai berdiri sendiri di tengah layar (bukan strip kecil):
   satu slide bocor = seluruh ritual "aman dibuka di KRL" runtuh.
2. **Modal recap adalah momen *planning*.** Kalau angkanya disembunyikan tetapi teks lain tetap
   berbicara ("Kurangi X sekitar 10%"), pesannya masih terbaca dan tidak mengganggu —
   jadi menyensor sama sekali tidak merusak nilai slide-nya (§5.4 *zero cognitive load*).
3. **Aturan yang setengah jalan lebih mahal daripada tidak ada aturan.** Audit berikutnya akan
   menandai file ini lagi; menutupnya sekarang mengunci kontraknya (§5.2 "jujur di setiap klaim").

## Yang harus dibangun

1. **Sensor seluruh nominal di `WeeklyRecapModal`** (5 slide) dengan **helper yang sudah ada** —
   `hide()` untuk label yang sudah berbentuk string (tanda `+`/`−` ikut terjaga) atau `maskMoney()`/
   `masked` untuk angka. **Jangan** menambah definisi sensor baru; format tetap `MASKED_AMOUNT`.
2. **Nomor yang tanda-nya bermakna jangan kehilangan tanda.** Nilai net `+8.500.000` ⇄ `−752.000`:
   pakai `hide()`/`netLabel()` supaya saat menyala jadi `+Rp •••••••` / `-Rp •••••••` — bukan `Rp •••••••`
   datar, karena arah uang (masuk/keluar) adalah informasi non-nominal yang tetap boleh terbaca.
3. **Sisir permukaan "yang dibaca" di file yang sama, bukan hanya `<span>` nominal:** `aria-label`,
   teks `sr-only`, tooltip/nilai di dalam SVG chart, dan caption. Laporkan situsnya di laporan.
4. **Betulkan komentar basi `:514-516`** dan rapikan tipe `onSetTarget` di `SlidePlan` supaya
   konsisten dengan prop luar yang sudah **wajib** (`:706`) — atau, kalau sengaja tetap opsional,
   tulis alasannya di komentar. Jangan tinggalkan komentar yang menyebut jalur yang sudah dihapus.
5. **Tetapkan sikap untuk dua literal titik** (`wallet-card-face.tsx:243`, `wallet-screen.tsx:957`):
   satukan ke satu konstanta bernama (mis. pakai `WALLET_NUMBER_MASK` yang sudah ada di
   `lib/wallets.ts:246`) **atau** tulis satu paragraf di komentar kenapa kedua titik itu memang
   terpisah dari `MASKED_AMOUNT`. Pilih satu; jangan dibiarkan tanpa keputusan.
6. **Sisir ulang & laporkan** semua permukaan ber-nominal di `components/` yang **tidak** memanggil
   `usePrivacy`/`maskMoney`/`maskNominal`/`moneyLabel`/`hide` — tempel daftarnya, dan untuk tiap sisa
   tulis alasan eksplisit (mis. *"field input yang sedang disunting — §5.7"*, *"harga langganan, bukan
   data user"*).

## Acceptance criteria

- [ ] Dengan tombol mata **ON**, tidak ada satu pun nominal rupiah di modal Rekap Mingguan
      (laporkan daftar situs yang disensor).
- [ ] Dengan tombol mata **OFF**, seluruh teks modal **identik** dengan sebelum paket ini (nol regresi).
- [ ] Tanda `+`/`−` pada net tetap terbaca saat sensor aktif.
- [ ] Nol definisi format sensor baru: semuanya bermuara ke `MASKED_AMOUNT`.
- [ ] Field input/sheet yang sedang disunting **tetap tidak disensor** (nol sentuhan `RupiahField`/sheet).
- [ ] Komentar basi di `weekly-recap-modal.tsx` hilang; dua literal `'••••'` punya keputusan tertulis.
- [ ] Angka patokan tidak bergeser: `DAILY_HUD` = `remaining 800000 · daysLeft 4 · dailyBudget
      200000 · sinkingObligation 3600000 · shortfall false`; HTML Home tetap `Rp 800.000×2 ·
      Rp 200.000×1 · "4 hari"×1` (saat privasi OFF / belum pernah dinyalakan).
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Menyensor field input/sheet yang sedang disunting (§5.7 tetap berlaku — jangan "diperbaiki").
- Menyensor **nama** kategori/celengan/dompet; yang disensor hanya nominal.
- Menambah dependency baru atau menulis literal format sensor kedua di JSX.
- Mengubah angka recap di `lib/weekly-recap.ts` (nilai demo; yang berubah hanya tampilannya saat menyala).
- Menyentuh `lib/data/pricing.ts`, `/terms`, `/privacy`, Properti (PRD A12), dan tabel hutang.

## Validasi (jalankan & tempel hasilnya apa adanya)

```bash
pnpm theme:audit
pnpm exec tsc --noEmit
pnpm build
```

Laporan wajib memuat: daftar situs nominal yang disensor (file:line), keputusan soal dua literal
`'••••'`, hasil sisir permukaan yang belum tersensor + alasannya, bukti nol regresi saat privasi OFF,
dan hasil ketiga perintah di atas.

