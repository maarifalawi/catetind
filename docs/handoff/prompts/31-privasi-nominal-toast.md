# 31 — Privasi: Nominal di Toast Ikut Disensor

**Paket:** privasi lintas halaman · **Fase 10** · **Depends on:** #29 (menyentuh file yang sama)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis — khususnya **§5.7** (aturan privasi).

## Bukti gap (kandidat yang CONTEXT-WAJIB sendiri catat sebagai "belum dikerjakan")

`CONTEXT-WAJIB.md:215-230` menetapkan satu aturan: **yang dibaca disensor, yang disunting tidak**
— dan menutupnya dengan catatan eksplisit:

> *Kandidat penyempurnaan (belum dikerjakan): nominal di **toast/ringkasan sesudah aksi**
> (mis. "Rp 250.000 disapu ke celengan") — itu pajangan yang tetap tinggal di layar, jadi layak
> ikut disensor kalau nanti diambil.*

Sampai hari ini belum diambil. Toast yang **memuat nominal** dan tetap tampil saat Mata Privasi
menyala (hasil sisir `toast.success` + `formatIDR`):

| # | Lokasi | Yang tampil |
|---|---|---|
| 1 | `components/catetind/budget-screen.tsx:252` | `` `${formatIDR(amount)} disetor ke ${fund?.name} 🌱` `` (setoran celengan) |
| 2 | `components/catetind/budget-screen.tsx:286` | `` `${formatIDR(swept)} disapu ke ${target?.name} 🧹🎉` `` (sapu bersih) |
| 3 | `components/catetind/wallet-screen.tsx:283-284` → `lib/data/add-wallet.ts:74-75` | `TRANSFER_SHEET_COPY.toastDescription(amount, from, to)` = `"Rp X dari A ke B …"` |
| 4 | `components/catetind/ai-chat-widget.tsx:241-242` → `lib/ai-chat.ts:173-175` | `AI_CAPTURE_COPY.savedToast.description(amount)` = `"Rp X masuk ke Riwayat …"` |
| 5 | `lib/data/monthly-review.ts:618-622` | `savedToastBody(amountLabel)` / `savedToastFundBody(amountLabel, fundName)` — target bulanan yang baru saja disimpan |

Pembanding yang SUDAH benar (pakai `usePrivacy().hide()`): `income-card.tsx:49`, `:72`,
`recent-transactions-card.tsx:160`, `:228`, `:361-363`. Jadi mekanismenya ada — tinggal dipakai
di toast. Perhatikan: **`hide()` adalah fungsi render**, jadi nilai toast harus di-`hide()` saat
toast dibuat (bukan di dalam copy).

## Peta baca

- **3064–3504** — privasi/RLS + screenshot policy (kenapa privasi = trust, bukan fitur)
- **542–568** — micro-copy per state: konfirmasi & sukses harus tetap hangat walau disensor
- **2251** — pola jaring pengaman toast (toast memang hidup beberapa detik di layar)

**Kode acuan:**

- `components/catetind/privacy-provider.tsx` — `usePrivacy()`, `masked`, dan `hide(value)`
  (persis pola yang dipakai kartu-kartu yang sudah benar)
- `components/catetind/global-privacy-toggle.tsx` — tombol mata (satu state global)
- `components/catetind/income-card.tsx:12` + `:49` — contoh pemakaian paling ringkas
- `lib/data/add-wallet.ts:74`, `lib/ai-chat.ts:174`, `lib/data/monthly-review.ts:619-622` —
  copy yang menerima label nominal: **tetap di `lib/data/*`**, jangan dipindah ke JSX
- `components/ui/toaster.tsx` — posisi toast (top-center) & catatan gaya repo

## Kenapa ini penting (psikologi audiens — CONTEXT-WAJIB §5)

1. **§5.3 poin 5 + §5.7: privasi adalah trust, bukan kosmetik.** User menyalakan mata privasi
   justru saat berada di ruang publik (KRL/kafe/meja kantor). Toast hidup beberapa detik **di
   atas** kartu yang sudah disensor — jadi satu-satunya angka yang bocor justru yang paling lama
   terlihat di layar.
2. **Audit sebelumnya sudah menetapkan aturannya** (§5.7). Membiarkan satu kelas permukaan
   menyimpang bikin aturannya jadi tebak-tebakan — dan audit berikutnya akan menandainya lagi.
3. **Tidak boleh mengganggu integritas input** (§5.7): field yang **sedang disunting** tetap
   tidak disensor. Paket ini hanya menyentuh **pajangan sesudah aksi** (toast), bukan field.

## Yang harus dibangun

1. **Satu aturan, satu tempat.** Nyatakan aturannya di `components/catetind/privacy-provider.tsx`
   (atau di `lib/` sebagai helper murni, mis. `maskedMoney(masked, label)`), lalu pakai di semua
   toast ber-nominal. Jangan menyalin `'••••'` ke lima berkas — kalau format sensor berubah,
   harus berubah di satu tempat.
2. **Sensor di titik toast dibuat** (`toast.success(…)`), bukan di komponen penyusun copy:
   `hide(formatIDR(amount))`. Semua nominal yang bocor di tabel gap ditutup.
3. **Copy tetap di `lib/data/*`** dan tetap terbaca hangat walau sensor aktif — mis.
   *"•••• disetor ke Dana Darurat! 🌱"* masih punya makna karena nama tujuan tidak disensor
   (nama ≠ nominal; konsisten dengan kartu yang sudah benar).
4. **Permission negatif dihormati:** field input/sheet yang sedang disunting **TIDAK** ikut
   disensor. Jangan menambah prop `masked` ke `RupiahField` atau menyentuh sheet manapun.
5. **Sisir ulang & laporkan:** jalankan pencarian semua `toast.success` yang memuat
   `formatIDR`/`amountLabel`/`amount` dan tempel hasilnya. Hasil yang diterima: setiap nominal
   sudah lewat `hide(...)`, atau ada penjelasan eksplisit kenapa belum (mis. bukan nominal uang).
6. **Jangan ubah perilaku lain:** isi, judul, dan durasi toast tetap sama; yang berubah hanya
   nominalnya saat `masked === true`.

## Acceptance criteria

- [ ] Dengan Mata Privasi **ON**, tidak ada satu pun toast yang menampilkan nominal rupiah
      (uji logika: `hide()` dipanggil untuk tiap nominal; laporkan daftar situsnya).
- [ ] Dengan Mata Privasi **OFF**, teks toast **identik** dengan sebelum paket ini (nol regresi).
- [ ] Field input/sheet yang sedang disunting tetap tidak disensor (nol perubahan di
      `RupiahField`/sheet).
- [ ] Nol string `'••••'`/format sensor yang tersebar: hanya satu definisi.
- [ ] Copy baru (bila ada) tinggal di `lib/data/*` atau `lib/*`, bukan di JSX.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Menyensor field input/sheet yang sedang disunting (aturan §5.7 tetap berlaku — jangan "diperbaiki").
- Menyensor **nama** tujuan/dompet/kategori; yang disensor hanya nominal uang.
- Menambah dependensi baru, atau memindahkan copy user-facing ke JSX.
- Mengubah angka/token/harga apa pun (harga = keputusan pemilik produk).

## Validasi (jalankan & tempel hasilnya apa adanya)

```bash
pnpm theme:audit
pnpm exec tsc --noEmit
pnpm build
```

Laporan wajib memuat: daftar toast yang disentuh (file:line sebelum → sesudah), keputusan
"di mana aturan sensornya tinggal" + alasannya, bukti nol regresi saat privasi OFF, dan hasil
ketiga perintah di atas.
