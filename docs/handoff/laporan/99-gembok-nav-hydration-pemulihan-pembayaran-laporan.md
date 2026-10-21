# Laporan Paket 99 — Gembok Navigasi, Hydration, dan Pemulihan Pembayaran

> **Tanggal:** 21 Okt 2026
> **Pemicu:**
> 1. “di navigasi, itu ada symbol locknya. kalo user itu langganan paket catet aja… fitur yang gak bisa di akses, di nav nya dikasih symbol gembok gitu, tapi yang menarik ya.”
> 2. Error console: *“A tree hydrated but some attributes of the server rendered HTML didn't match…”* pada `<html>`/`<body>` (`data-cc-prev-cursor`, `style`).
> 3. “hilangin text ini: Sesi ini milik Supabase Auth: tokennya ditandatangani server…”
> 4. “pas gua masuk, dan gua udah payment… malah masuk ke checkout… Pas di pencet cek lagi gak bisa.”
> **Hasil:** empat masalah selesai; pembayaran yang webhook-nya telat sekarang **menyembuhkan diri sendiri** lewat rekonsiliasi server ↔ Midtrans, dan “Cek lagi” benar-benar bekerja.

---

## 1. Gembok navigasi yang menarik (bukan ikon abu-abu)

### Yang salah sebelumnya

| Lokasi | Keadaan lama |
|---|---|
| Sidebar desktop (terbuka) | `<Lock>` Lucide 12 px warna `forest/35` di ujung kanan — terbaca seperti hiasan, bukan status |
| Sidebar desktop (ciut) | **Tidak ada penanda sama sekali**; user baru tahu setelah menekan menu |
| Laci “Lainnya” mobile | **Tidak ada penanda sama sekali**; menu terkunci terlihat sama dengan yang terbuka |
| Tombol “Lainnya” di bottom bar | Tidak ada isyarat bahwa di dalamnya ada menu terkunci |
| Menu Pengaturan | Gembok kecil inline, mudah terlewat |

### Komponen baru: `NavLockBadge`

`components/catetind/nav-lock-badge.tsx` — satu komponen, dua bentuk:

- **`pill`** (sidebar terbuka, laci mobile, menu Pengaturan):
  pil emas memakai gradasi token `daisy-light → daisy → daisy-light`, teks `daisy-deep`,
  ring tipis, inset highlight di atas (kesan logam), dan gembok 10 px. Isinya nama paket
  pembuka yang sudah diringkas (“Paket Waras” → **Waras**), jadi user langsung tahu
  harus upgrade ke mana. Saat hover, muncul glow emas lembut (bukan animasi yang mengganggu).
- **`dot`** (sidebar ciut, ikon bottom nav, tombol “Lainnya”):
  lencana bulat 16 px di pojok ikon, gradasi emas yang sama, ring warna `cream`
  supaya tetap terbaca di atas latar apa pun.

Warna memakai token tema (`daisy`, `daisy-light`, `daisy-deep`, `cream`) — tidak ada hex
lepas, jadi ikut palet dan tidak “menabrak” warna alert (`plum`). Badge murni tampilan:
ia tidak tahu paket user dan tidak membuka popup. Sumber kebenaran tetap
`useSubscriptionGate().lockedPageCapability()`; klik menu terkunci sudah dicegat
`UpgradeGateProvider`.

### Pemasangan

| Berkas | Perubahan |
|---|---|
| `components/catetind/nav-lock-badge.tsx` | **baru** — `pill` & `dot`, aksesibel (`aria-hidden`; nama aksesibel ada di `aria-label` link) |
| `components/catetind/desktop-sidebar.tsx` | ikon dibungkus `relative`; `dot` saat ciut, `pill` saat terbuka; `title`/`aria-label` tetap menyebut paket pembuka |
| `components/MobileBottomNav.tsx` | `NavLink` mendukung gembok (siap untuk tab berbayar di masa depan); laci “Lainnya” menampilkan `dot` + baris emas **“Buka di Waras”** menggantikan hint; tombol “Lainnya” diberi `dot` bila ada satu saja menu terkunci |
| `components/catetind/settings-shell.tsx` | gembok inline diganti `pill` yang sama, jadi bahasa visualnya konsisten |

### Hasil untuk Paket Catet Aja

Berdasarkan `PAGE_ACCESS` + `PLAN_CAPABILITIES` (satu sumber, tidak ada daftar kedua):

- **Joint Wallet** (`/joint`) → gembok **Waras** di sidebar, laci mobile, dan titik emas di tombol “Lainnya”.
- **AI Preferences** (`/settings/ai`) → gembok **Waras** di menu Pengaturan.
- Halaman lain (Dashboard, Wallet, Riwayat, Budget, Tagihan, Kalender, Kekayaan, Referral,
  Bantuan, Install, Pengaturan) tetap tanpa gembok untuk Catet Aja.
- Fitur AI di dalam halaman (AI Coach, scan struk, voice, auto-kategorisasi) tetap memakai
  mekanisme `LockedFeatureNote` yang sudah ada — tidak diubah.

---

## 2. Hydration mismatch: bukan bug aplikasi, tapi ekstensi browser

### Gejala

React melaporkan selisih atribut pada `<html>` dan `<body>`:

```
- style={{cursor:"url(\"data..."}}
- data-cc-prev-cursor={"{\"prev\":[\"\",\"\"],\"ours\":[\"url(\\\"data:image/png;base64,...
```

`data-cc-prev-cursor` adalah atribut milik ekstensi **custom cursor** yang menyuntikkan
`style` + atribut ke `<html>`/`<body>` **sebelum** React hydrate. Server tidak mungkin
mengirim atribut itu, jadi React menganggap HTML tidak cocok. Penerjemah halaman
(Google Translate) bisa melakukan hal yang sama.

### Perbaikan

`app/layout.tsx`:

```tsx
<html lang="id" className={`light ${inter.variable}`} suppressHydrationWarning>
  <body className="font-sans antialiased" suppressHydrationWarning>
```

`suppressHydrationWarning` dipasang di **kedua** elemen (React memeriksa elemen itu
sendiri-sendiri). Isi dan seluruh komponen di dalamnya **tetap** diperiksa, jadi ini bukan
“mematikan hydration check”. Komentar panjang di file menjelaskan asal-usul atribut itu
supaya tidak ada yang menghapusnya saat melihat diff di DevTools.

### Verifikasi

- `npx tsc --noEmit` → 0 error.
- `npx next build` → sukses.
- Halaman `/`, `/checkout`, `/login` dirender 200 tanpa error server.
- Untuk melihat console bersih: buka DevTools → Network → pastikan ekstensi custom cursor
  aktif/nonaktif; peringatan tidak lagi muncul karena atributnya diabaikan pada dua elemen itu.

---

## 3. Teks “Sesi ini milik Supabase Auth…” dihapus

| Berkas | Perubahan |
|---|---|
| `lib/data/auth.ts` | properti `signInToastDescription` **dihapus** dari `SESSION_COPY` |
| `components/catetind/login-screen.tsx` | toast sukses jadi `toast.success(SESSION_COPY.signInToast)` |
| `components/catetind/verify-email-screen.tsx` | dua pemakaian (verifikasi tautan & kode OTP) jadi toast tanpa deskripsi |

Tidak ada sisa referensi ke `signInToastDescription` di seluruh repo (dicek dengan grep).
Toast tetap muncul: **“Kamu sudah masuk 🌿”** — tanpa paragraf teknis soal RLS/token.

---

## 4. Pembayaran: “sudah bayar, tapi masuk ke checkout” dan “Cek lagi” yang mati

### Diagnosis (dengan bukti database, bukan dugaan)

Order yang dilaporkan: `subscribe-1a4eefd2…`, GoPay, **Settlement Rp1**, 21 Okt 2026 14:12.

Pembacaan langsung ke database (hanya kolom status — tanpa email/nama):

| Order | Status DB | Nominal | Paket | Dibayar |
|---|---|---|---|---|
| `subscribe-1a4eefd2-1792566635609` | `pending` | 1 | `catet-aja` / lifetime | — |
| `subscribe-1a4eefd2-1792566750727` | `settlement` | 1 | `catet-aja` / lifetime | `2026-10-21T07:31:04Z` |

`user_subscriptions` untuk pemilik order itu: `tier_name = catet-aja`,
`is_active = true`, `is_lifetime = true`, `expires_at = NULL`.

**Kesimpulan:** uangnya benar, dan pencatatan akhirnya berhasil — tetapi **±19 menit
setelah** tagihan dibuat (07:12 → 07:31 UTC). Selama jeda itu:

1. Webhook Midtrans belum masuk (di localhost memang tidak mungkin: Midtrans tidak bisa
   menghubungi `http://localhost:3000`; di produksi pun notifikasi bisa gagal/ditunda).
2. `purchases.status` masih `pending`, `user_subscriptions` belum ada.
3. Middleware membaca paket → tidak aktif → melempar user ke `/checkout`.
4. `/checkout/selesai` hanya membaca **database yang sama**. Tombol “Cek lagi” mengulang
   request yang sama, jadi hasilnya selalu “Pembayaran belum tercatat” — terasa mati.
5. Polling otomatis berhenti setelah 10 percobaan (±30 detik). Setelah itu halaman diam.

Jadi masalahnya bukan pembayaran yang gagal, melainkan **aktivasi yang hanya bergantung
pada satu jalur (webhook) dan UI yang tidak punya cara bertanya ke provider**.

### Perbaikan inti: rekonsiliasi server ↔ Midtrans

Berkas baru `lib/subscription/reconcile.ts`:

- Membaca `purchases` **dengan token pemanggil** → RLS `user_id = auth.uid()` menentukan
  baris mana yang terlihat. Tidak ada `user_id` dari body/klien.
- Untuk setiap order `pending`, server memanggil `GET /v2/{order_id}/status` Midtrans.
- Kalau provider menyatakan **settled**:
  - nominal `expected_amount` dibandingkan dengan `gross_amount` (`isAmountMismatch`,
    aturan yang sama dengan webhook) — nominal beda **tidak pernah** dipenuhi;
  - pemenuhan memanggil RPC **`catetind_fulfill_purchase`** dengan kunci peran server —
    RPC yang sama, idempoten, yang dipakai webhook. Tidak ada jalur aktivasi kedua.
- Kalau provider menyatakan **expire/deny/cancel**, status terminal itu dicatat lewat RPC
  (cabang non-settlement) supaya baris mati tidak diperiksa berulang selamanya.
- Tanpa kunci peran server → hasilnya jujur `service-role-missing`, **tidak** mengaku aktif.
- Order `pending` lama dibatasi jendela **48 jam** saat pemanggil tidak menyebut order id
  (tagihan Midtrans kedaluwarsa 60 menit, jadi 48 jam sudah sangat longgar).

### Empat pintu pemulihan (semua memakai fungsi yang sama)

| Titik | Perilaku baru |
|---|---|
| `GET /api/payment/status` (dipoll kartu bayar tiap 4 dtk) | Kalau provider bilang lunas tetapi baris DB masih `pending` → **langsung dipenuhi**. `order.status` di balasan ikut menjadi `settlement`, plus field `fulfillment`. |
| **`POST /api/payment/reconcile`** (baru) | Dipakai “Cek lagi”/polling `/checkout/selesai`. Mencocokkan order (bisa `order_id` spesifik atau semua pending terbaru), lalu mengembalikan bentuk `/api/subscription` + ringkasan `reconcile`. |
| `app/checkout/page.tsx` (Server Component) | Sebelum halaman harga digambar: kalau ada sesi dan paket belum aktif, server mencocokkan order pending. Kalau ternyata sudah lunas → user **langsung** dikembalikan ke halaman yang tadi dituju. |
| `middleware.ts` | Saat melempar ke `/checkout` karena paywall, halaman app yang dituju dibawa sebagai `?lanjut=/app` (query app tidak bocor menjadi query checkout). |

Alur yang tadinya buntu sekarang:

```
login → /app → middleware tidak lihat paket → /checkout?lanjut=/app
      → server cocokkan order ke Midtrans → lunas? → penuhi (RPC)
      → redirect /app  ← halaman yang dituju, bukan halaman beli lagi
```

### `/checkout/selesai`: “Cek lagi” yang benar-benar bekerja

`components/catetind/payment-done-screen.tsx`:

- Setiap percobaan (otomatis maupun manual) memanggil `POST /api/payment/reconcile`
  lebih dulu, baru jatuh ke `/api/subscription` bila route itu tidak tersedia.
- Polling otomatis dinaikkan dari 10 → **20 percobaan × 3 detik (±1 menit)**.
- Tombol **“Cek lagi”**:
  - menampilkan spinner + label **“Mencocokkan…”** dan `disabled` selama request;
  - **mereset** hitungan percobaan, jadi polling otomatis hidup lagi;
  - kalau masih belum ada, menampilkan catatan emas: *“Midtrans belum melaporkan
    pembayaran untuk order ini. Kalau kamu baru saja membayar, tunggu sebentar lalu tekan
    Cek lagi — tidak perlu membayar ulang.”*
- Saat aktif: kartu menampilkan **“Aksesmu aktif 🎉”**, lalu otomatis membuka `/app`
  setelah 1,8 detik (CTA tetap tersedia).
- Tautan CTA sekarang langsung `/app` (bukan `/login?next=/app`). Ini memperbaiki bug
  nyata: user yang **sudah** login diminta memasukkan kode email lagi. `/app` tetap dijaga
  middleware, jadi pengunjung tanpa sesi otomatis diarahkan ke `/login?next=/app`.
- Copy “belum tercatat” diperjelas: *“kami cocokkan otomatis ke Midtrans… tidak perlu bayar
  ulang.”*

### Perbaikan pendukung

- `app/api/payment/charge/route.ts`: `origin` sekarang punya fallback
  `new URL(req.url).origin`. Dulu kalau header `Origin` tidak dikirim, `notificationUrl`
  dan `finishUrl` menjadi `undefined` → Midtrans memakai setelan dashboard yang bisa
  menunjuk host lain.
- `app/api/subscription/route.ts` + `lib/subscription/plan.ts`: bentuk balasan diekstrak
  menjadi `subscriptionPayload()` supaya route rekonsiliasi tidak mengarang bentuk kedua.

---

## 5. Berkas yang berubah (ringkas)

| Berkas | Jenis | Perubahan |
|---|---|---|
| `components/catetind/nav-lock-badge.tsx` | **baru** | badge gembok `pill` / `dot` bergaya emas |
| `components/catetind/desktop-sidebar.tsx` | ubah | gembok di sidebar terbuka & ciut |
| `components/MobileBottomNav.tsx` | ubah | gembok di tab, laci “Lainnya”, dan tombol “Lainnya” |
| `components/catetind/settings-shell.tsx` | ubah | pill gembok yang sama di menu Pengaturan |
| `app/layout.tsx` | ubah | `suppressHydrationWarning` di `<html>` & `<body>` |
| `lib/data/auth.ts` | ubah | hapus `signInToastDescription` |
| `components/catetind/login-screen.tsx` | ubah | toast masuk tanpa deskripsi teknis |
| `components/catetind/verify-email-screen.tsx` | ubah | dua toast tanpa deskripsi teknis |
| `lib/subscription/reconcile.ts` | **baru** | rekonsiliasi order ↔ Midtrans → RPC pemenuhan |
| `lib/subscription/reconcile.test.ts` | **baru** | 13 test aturan rekonsiliasi |
| `app/api/payment/reconcile/route.ts` | **baru** | `POST`/`GET` pencocokan + balasan paket |
| `app/api/payment/reconcile/route.test.ts` | **baru** | 6 test route |
| `app/api/payment/status/route.ts` | ubah | pemenuhan otomatis saat provider settled |
| `app/api/payment/status/route.test.ts` | ubah | mengunci perilaku pemulihan otomatis |
| `app/api/subscription/route.ts` | ubah | memakai `subscriptionPayload()` |
| `lib/subscription/plan.ts` | ubah | tambah `subscriptionPayload()` |
| `app/checkout/page.tsx` | ubah | pemulihan sebelum render + redirect ke `?lanjut=` |
| `middleware.ts` | ubah | membawa `?lanjut=` saat paywall |
| `components/catetind/payment-done-screen.tsx` | ubah | reconcile, spinner, catatan, auto-redirect, CTA `/app` |
| `lib/data/pricing.ts` | ubah | copy `retryChecking`, `stillPendingNote`, `autoRedirectNote`, `pendingBody` |
| `app/api/payment/charge/route.ts` | ubah | fallback `origin` |

---

## 6. Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| `npx tsc --noEmit` | **0 error** |
| `npx vitest run` | **105 file / 1.488 test lulus** (sebelumnya 103 / 1.469; +2 file, +19 test) |
| `npx next build` | **sukses** — semua route ter-compile, termasuk `/api/payment/reconcile` |
| Smoke test produksi (`next start -p 3100`) | `/checkout` **200**, `/checkout/selesai?order_id=…` **200**, `/login` **200**, tanpa error server |
| CSS build | kelas `daisy-light`/`daisy-deep` ikut ter-generate (dicek di `.next/static/**/*.css`) |
| Grep | tidak ada sisa `signInToastDescription` / teks “Sesi ini milik Supabase Auth” |

Test baru yang paling penting:

- order `pending` **tidak** dipenuhi walau provider belum lunas;
- nominal provider **beda** → `amount-mismatch`, RPC tidak dipanggil;
- tanpa kunci peran server → `service-role-missing`, tidak mengaku aktif;
- provider lunas + nominal cocok → RPC dipanggil dengan `p_order_id`, `p_status: 'settlement'`;
- order `pending` yang kedaluwarsa dicatat `expire` (tidak di-poll selamanya);
- pembacaan `purchases` memakai **token pemanggil**, bukan kunci server;
- route rekonsiliasi menolak tanpa sesi (401) dan tidak mempercayai `user_id` dari body.


---

## 7. Cara memeriksa manual (alur yang disarankan)

1. **Gembok nav**
   - Login dengan akun **Paket Catet Aja**.
   - Desktop: item **Joint Wallet** di sidebar harus punya pil emas **“Waras”**.
   - Ciutkan sidebar: gembok menjadi titik emas di pojok ikon.
   - Mobile: buka **Lainnya** → kartu Joint Wallet punya titik emas + baris
     **“Buka di Waras”**; tombol “Lainnya” di bottom bar juga bertitik emas.
   - Klik menu itu → popup upgrade yang sudah ada muncul (halaman tidak berpindah).
2. **Hydration**
   - Buka `/` dengan ekstensi custom cursor aktif, buka Console → error hydration
     `data-cc-prev-cursor` tidak muncul lagi.
3. **Toast login**
   - Masuk lewat OTP → toast hanya “Kamu sudah masuk 🌿”, tanpa paragraf Supabase/RLS.
4. **Pembayaran telat**
   - Buat tagihan sandbox (Rp1), bayar lewat Simulator Midtrans.
   - Kembali ke tab kartu bayar: dalam ≤4 detik status menjadi “Pembayaran diterima”,
     lalu pindah ke `/checkout/selesai` dan otomatis masuk `/app`.
   - Kalau tab ditutup dan dibuka lagi di `/checkout/selesai`, tombol **Cek lagi**
     menampilkan spinner “Mencocokkan…”, lalu “Aksesmu aktif 🎉”.
   - Kalau langsung login: middleware → `/checkout?lanjut=/app` → server mencocokkan →
     redirect `/app` tanpa memilih paket lagi.

---

## 8. Catatan & batasan yang perlu diketahui

1. **Webhook di localhost tidak akan pernah masuk.** Rekonsiliasi adalah jalur resmi
   penggantinya untuk pengembangan; di produksi webhook tetap jalur utama dan rekonsiliasi
   adalah jaring pengaman. Pastikan `SUPABASE_SERVICE_ROLE_KEY` terisi di server — tanpa itu,
   rekonsiliasi dan webhook sama-sama tidak bisa menulis akses (dilaporkan jujur).
2. **Order lama yang masih `pending`** (mis. `…1792566635609`) akan dicoba sekali lagi ke
   Midtrans saat rekonsiliasi berjalan. Kalau provider menyatakan kedaluwarsa, statusnya
   dicatat `expire` sehingga tidak diperiksa terus-menerus.
3. **Status akun yang dilaporkan sudah aktif saat laporan ini dibuat**:
   `user_subscriptions` = `catet-aja`, `is_active = true`, `is_lifetime = true`. Artinya
   begitu webhook/retry Midtrans masuk, akses memang diberikan. Perbaikan paket ini membuat
   momen itu terjadi **segera** (detik), bukan menunggu retry ±19 menit.
4. **Jangan mengubah `expected_amount` secara manual** untuk “memaksa” pemenuhan:
   rekonsiliasi membandingkannya dengan nominal provider, sama seperti webhook. Kalau
   nominal di DB salah, perbaiki tagihannya, bukan mem-bypass pemeriksaan.
5. **`suppressHydrationWarning` bukan solusi untuk mismatch yang berasal dari kode kita.**
   Kalau suatu saat muncul peringatan hydration pada elemen LAIN, itu tetap bug aplikasi dan
   harus diperbaiki seperti biasa.
6. **Bahasa gembok** mengikuti `PAGE_ACCESS`: menambah halaman berbayar baru cukup
   menambahkan satu baris aturan di sana — sidebar, laci mobile, dan menu Pengaturan otomatis
   ikut menampilkan gembok, tanpa menyalin daftar.

