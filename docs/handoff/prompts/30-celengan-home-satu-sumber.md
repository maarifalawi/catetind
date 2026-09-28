# 30 — Satu Sumber Celengan untuk Kartu "Tabungan Impian" di Home

**Paket:** menyelesaikan #29 butir 5 · **Fase 10** · **Depends on:** #29 (tautan sudah punya aksi;
paket ini meluruskan **tujuannya**)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Bukti gap (dilaporkan apa adanya oleh paket 29, dan belum ditutup)

Paket 29 meminta tombol **detail goal** di Home menuju `/budget/<id-fund>` — "dari data
celengan yang dipakai kartu itu". Yang dikerjakan baru separuh: ketiga tautannya masih
`/budget` generik, karena kartu ini memakai **daftar mock kedua** yang tidak punya id.

| # | Lokasi | Temuan |
|---|---|---|
| 1 | `components/catetind/my-goals-card.tsx:32-37` | `PRIMARY` = mock lokal: `'Liburan ke Jepang'` 5jt/10jt — nama & nominal yang **tidak ada** di data celengan mana pun |
| 2 | `components/catetind/my-goals-card.tsx:40-44` | `SECONDARY` = mock lokal: `Dana Darurat 72%`, `MacBook Air M4 56%`, `Dana Umroh 24%` — dua di antaranya tidak ada di data |
| 3 | `components/catetind/my-goals-card.tsx:129`, `:151`, `:228` | ketiga tautan (`+`, panah hero, panah tiap baris) = `href="/budget"` — bukan `/budget/<id>` |
| 4 | `lib/data/budget.ts:671-676` | `INITIAL_SINKING_FUNDS` = **satu-satunya** daftar yang `/budget/[id]` tahu: id 1 `Tiket Konser Coldplay`, id 2 `Dana Darurat`, id 3 `iPhone 16` |
| 5 | `lib/data/home.ts:27-48` | komentar paket 29 yang mengakui tabrakan dua mock & memilih tautan generik: *"Menautkan 'Liburan ke Jepang' ke `/budget/1` … akan jadi tautan yang berbohong"* — jadi masalahnya dipindahkan, belum dibereskan |

Akibatnya di layar: user menekan **"Buka Dana Umroh di halaman Budget"** lalu mendarat di
halaman yang tidak memuat "Dana Umroh" sama sekali. Label menjanjikan isi yang tidak
ditemukan user di tujuan — persis pola yang PRD larang (kanon "jujur di setiap klaim", 244).

## Peta baca

- **809–865** — 2C.3 Sinking Fund: celengan punya nama, target, progres, prioritas
- **1919–2034** — metafora tanaman (tahap tanaman = progres tabungan; kartu ini wajahnya di Home)
- **178–191** — Home: kartu ringkasan harus jadi **nudge kontekstual**, bukan pajangan angka
- **294–334 / 2A.1** — Zero Cognitive Load: satu sumber kebenaran, jangan dua daftar yang mirip

**Kode acuan:**

- `components/catetind/my-goals-card.tsx` — kartunya sendiri; `stageFromPercent()` di file ini
  sudah jadi penerjemah persen → `PlantStage` (pakai ulang, jangan bikin yang baru)
- `lib/data/budget.ts` → `INITIAL_SINKING_FUNDS`, `sinkingObligationOf()`, `plantStageFrom()`,
  `fundSuggestions()`, `SINKING_OBLIGATION_ALL`, `DAILY_HUD`
- `app/budget/[id]/page.tsx` — halaman yang jadi tujuan (id yang tidak ada ⇒ 404 nurturing)
- `components/catetind/monthly-review-modal.tsx:80` — contoh pemakaian `fundSuggestions()`
- `components/catetind/budget-zone-b.tsx` — daftar celengan yang sudah hidup di `/budget`

## Kenapa ini penting (psikologi audiens — CONTEXT-WAJIB §5)

1. **Kepercayaan dibangun dari angka yang bisa ditelusuri.** Audiens repo ini capek ditipu
   dashboard yang menampilkan angka tanpa asal-usul (§5.1–5.2). Satu kartu Home yang menyebut
   celengan yang tidak ada di mana pun cukup untuk mematikan rasa percaya ke halaman lain.
2. **Tabungan impian adalah alasan user mau mencatat tiap hari** (§5.3 poin 4 — reward delayed:
   tanaman subur karena celengan tumbuh). Kalau barisnya tidak bisa dibuka, reward-nya berhenti
   jadi pajangan.
3. **Nol pemicu kecemasan** (§5.3 poin 3): angka kartu yang berbeda dari halaman detail bikin
   user mengira uangnya "hilang".

## Yang harus dibangun

1. **Kartu membaca SATU sumber: `INITIAL_SINKING_FUNDS`** (impor dari `lib/data/budget.ts`).
   Hapus dua konstanta mock lokal (`PRIMARY`, `SECONDARY`) beserta komentarnya.
   - Hero = celengan berprioritas `'kritis'` bila ada; kalau tidak ada, progres tertinggi.
     Baris mini = celengan sisanya (urut prioritas → progres). Kurang dari 3 ⇒ tampilkan apa adanya.
2. **Progres & tahap diturunkan, bukan ditulis manual:**
   `pct = Math.round((current / target) * 100)`, `stage = stageFromPercent(pct)` (helper yang
   sudah ada di file ini). Nol angka mock baru.
3. **Setiap tautan menuju halaman yang benar-benar ada:** panah hero & panah per baris →
   `href={'/budget/' + fund.id}`; tombol `+` tetap `budgetPlantHref()` (`/budget?tanam=1`).
   Nama di kartu & nama di halaman tujuan **wajib sama** (keduanya dari data yang sama).
4. **Konteks uang dihormati** (pola yang sudah ada): kalau kartu ini hanya menampilkan celengan
   satu `scope`, saring dengan `useMoneyContext()` seperti daftar di `/budget`; kalau sengaja
   global (metrik global ala `DAILY_HUD`), **tulis alasannya di komentar**.
5. **Copy baru** (label hero, `aria-label` per baris, teks jumlah celengan bila perlu) masuk ke
   `lib/data/home.ts` — memperluas `HOME_GOALS_COPY` yang dibuat paket 29. Nol string di JSX.
6. **Rapikan komentar `lib/data/home.ts:27-48`** supaya tidak lagi menyebut dua mock yang
   bertabrakan; ganti dengan aturan final (satu sumber) + apa yang sengaja tidak dilakukan.
7. **Angka yang DILINDUNGI tidak boleh bergeser:** `INITIAL_SINKING_FUNDS`, `DAILY_HUD`,
   `SINKING_OBLIGATION_ALL`, dan `lib/data/wealth.ts` **tidak disentuh**. Yang berubah hanya isi
   kartu Home (nama & nominal goal) — laporkan perubahannya apa adanya.

## Acceptance criteria

- [ ] Nol nama celengan fiktif di Home: `Liburan ke Jepang`, `MacBook Air M4`, `Dana Umroh`
      tidak lagi muncul di kode (grep bersih).
- [ ] Setiap tautan kartu menuju `/budget/<id>` yang **ada**; halaman tujuan memuat nama yang
      sama dengan label yang ditekan.
- [ ] `INITIAL_SINKING_FUNDS` tidak berubah, dan `DAILY_HUD` tetap identik:
      `remaining 800000 · daysLeft 4 · dailyBudget 200000 · sinkingObligation 3600000 ·
      shortfall false`; HTML Home hasil prerender tetap `800.000×2 · 200.000×1 · "4 hari"×1`.
- [ ] Nol string copy baru di JSX (semua dari `lib/data/home.ts`).
- [ ] Nol kontrol mati baru: scan `<button` / `<input` / `<Link` tanpa aksi → hanya hasil yang
      sudah dijelaskan sebagai false positive.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Mengubah `INITIAL_SINKING_FUNDS`, `DAILY_HUD`, atau tabel hutang `lib/data/wealth.ts`
  (angka demo PRD 678 adalah patokan).
- Menautkan ke `/budget/<id>` yang tidak ada, atau menambah celengan mock ke-4 di kartu.
- Menyentuh `lib/data/pricing.ts`, `/terms`, `/privacy`, dan Properti (PRD A12).
- Menyisakan satu saja tautan generik sebagai "sementara" — kalau ada yang belum bisa
  diluruskan, jelaskan di laporan, jangan diam-diam dibiarkan.

## Validasi (jalankan & tempel hasilnya apa adanya)

```bash
pnpm theme:audit
pnpm exec tsc --noEmit
pnpm build
```

Laporan wajib memuat: file yang dibuat/diubah/dihapus, keputusan desain (siapa jadi hero, kenapa),
perubahan angka kartu Home (sebelum → sesudah), bukti `DAILY_HUD` tidak bergeser, dan hasil
ketiga perintah di atas.
