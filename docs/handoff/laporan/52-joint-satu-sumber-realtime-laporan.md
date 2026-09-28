# Laporan 52 — `/joint` (Kantong Bersama) Punya Satu Sumber + Realtime yang Nyata

**Status:** selesai diimplementasikan & divalidasi · **Paket:** temuan **F** laporan 46 · **Fase 13**
· **Depends on:** paket 47 (konteks "bersama") · **Menutup:** `joint-screen.tsx:100-116`
(`useState(INITIAL_JOINT_WALLET)` + `useState(INITIAL_JOINT_TRANSACTIONS)`), lima handler tulis di
halaman itu, penanda settle di localStorage, dan langganan realtime ber-id kanon (`joint_1`) yang
tidak pernah bisa menerima baris.

> Ringkas: `/joint` **berhenti memegang salinan datanya sendiri**. Kantong, buku besar bersama,
> penanda settle per bulan, dan daftar anggota kini hidup di **`lib/money/joint-store.ts`**
> (store modul + `useSyncExternalStore` + persist IndexedDB key **`joint`**, resep yang sama dengan
> celengan paket 46, kekayaan paket 50, dan tagihan paket 51). Realtime-nya pindah ke store: id
> dompet **dibaca dari tabel `joint_wallets`** (bukan id kanon), baris yang sudah ada ditarik dari
> view masker `joint_transactions_public`, lalu channel Postgres Changes dibuka untuk id itu.
> Di demo tanpa sesi Supabase, timer mock tetap hidup — tapi hanya saat `DEMO_REALTIME_MOCK`
> (`NEXT_PUBLIC_DEMO=1`), dan barisnya masuk lewat pintu store yang sama (anti-dobel).
>
> Mesin yang sudah teruji (`lib/data/joint-ledger.ts`, `computeSettlement`, `splitSpecOf`,
> `buildCarryOverEntry`) **tidak disentuh sama sekali** — paket ini memindahkan PEMILIK STATE, bukan
> rumusnya.

---

## 1. Bukti gap (audit 28 Sep 2026) → status

| # | Bukti (lokasi lama) | Status | Bukti perbaikan |
|---|---|---|---|
| 1 | `joint-screen.tsx:100-106` `useState(INITIAL_JOINT_WALLET)` + `useState(INITIAL_JOINT_TRANSACTIONS)` | ✅ FIXED | `useJointStore()` — 0 `useState` daftar catatan/dompet di halaman |
| 2 | `joint-screen.tsx:129` `splitOverrides` (pembagian hidup di halaman) | ✅ FIXED | `updateSplit(id, split)` menulis pembagian ke catatannya; field lama (`splitType`/`splits`/`payerId`) dikosongkan |
| 3 | `joint-screen.tsx:171-183` penanda settle dipulihkan dari localStorage saat mount | ✅ FIXED | penanda hidup di store (`recordSettlement`) + migrasi SEKALI dari localStorage; baris ledger-nya diturunkan (`jointLedgerFeed`) |
| 4 | `joint-screen.tsx:220-253` "realtime" = timer mock tanpa gerbang dedupe | ✅ FIXED (di demo tetap MOCK, disebut apa adanya) | timer hanya hidup saat `DEMO_REALTIME_MOCK` & wajib ada anggota lain; baris masuk lewat `applyJointRow()` → dedupe by id, toast hanya untuk baris yang benar-benar baru |
| 5 | `joint-screen.tsx:273` `subscribeJointTransactions(INITIAL_JOINT_WALLET.id, …)` — id kanon `joint_1` | ✅ FIXED | `lib/money/joint-store.ts` + `lib/supabase/joint-remote.ts`: id dibaca dari tabel `joint_wallets`, baris dari `joint_transactions_public`, lalu channel dibuka untuk uuid itu |
| 6 | `joint-screen.tsx:488-497` `partnerJoined` cuma `useState(DEMO_PARTNER_JOINED)`; `finishCelebration` set state | ✅ FIXED | `members` di store + `addJointMember()`; `jointPartnerJoined(snapshot)` |
| 7 | `joint-screen.tsx:308-314` ganti nama dompet cuma `setWallet()` halaman | ✅ FIXED | `renameJointWallet()` (persist) |
| 8 | Perubahan hilang setelah refresh | ✅ FIXED | persist IndexedDB key `joint` (bentuk record: §6 + `laporan/bukti/52-joint-record-contoh.json`) |
| 9 | "Hapus Akun" tidak membersihkan kantong bersama | ✅ FIXED | `purgeJointStore()` (+ `stopJointRealtime()`) + `jointRowsCleared` di `PurgeReport` |
| 10 | `joint-timeline`/`joint-balance-scale`/`joint-stats-row`/`joint-recap-banners`/`joint-settlement-modal` menerima props dari state halaman | ✅ FIXED (satu sumber) | props yang dioper sekarang berasal dari store/selector; tidak ada pemanggil lain (diverifikasi `tsc` + grep) |
| 11 | Atribusi kantong ("Siapa yang nalangin?") tidak bisa dikoreksi setelah dicatat | ✅ FIXED (tambahan kecil) | `setPaidBy(id, userId)` + chip koreksi di detail kartu timeline (lihat §2.6) |

**Akar masalahnya satu:** kantong bersama hidup di `useState` halaman + localStorage, jadi (a) tidak
bertahan setelah refresh, (b) nama/anggota/pembagian hilang, dan (c) langganan realtime menunjuk id
yang tidak ada di tabel — jenis temuan yang sama dengan audit #1 paket 41 dan dilarang kanon "jujur
di setiap klaim" (PRD 244).


---

## 2. Keputusan desain & alasannya

### 2.1 `settlements` disimpan sebagai MAP per bulan, bukan satu record

Prompt paket ini menuliskan state `{ …, settlements: JointSettlementRecord | null, carryOver, … }`.
Yang diimplementasikan: `settlements: Record<'YYYY-MM', JointSettlementRecord>` (map), dan `carryOver`
**diturunkan** dari record bulan sebelumnya (`carryOverRecordFor()` / `carryOverEntryFor()`).
Alasannya konkret, bukan selera:

· bentuk map itulah yang diminta mesin yang **sudah teruji** — `settlementEntriesFor(records, month)`
  membaca `records[month]` dan `records[previousMonthKey(month)]`. Satu record tunggal memaksa
  perubahan pada mesin itu (dilarang paket ini) atau menghapus riwayat bulan lain;
· `carryOver` sebagai FIELD terpisah = sumber kebenaran kedua: ia harus disinkronkan manual setiap
  kali penanda bulan berubah. Diturunkan, ia mustahil "basi".

Semua janji yang diminta paket ini tetap terbukti: settle mengunci timbangan, dan sisa menyeberang ke
bulan berikutnya sebagai baris pembuka (§5).

### 2.2 Baris settle DITURUNKAN, tidak disimpan di `transactions`

Sebelumnya halaman menyisipkan `buildSettlementEntry(record)` ke daftar catatan (dulu: saat settle,
lalu saat mount dari localStorage). Sekarang store menyimpan **penanda**-nya saja, dan
`jointLedgerFeed()` menyusun baris ledger dari penanda itu. Konsekuensinya: membuka `/joint` berkali-kali
tidak mungkin menggandakan baris settle (`id`-nya `settle-<bulan>-<dari>-<ke>`), dan halaman tidak
punya daftar kedua yang bisa berbeda dari daftar yang dihitung timbangan.

### 2.3 Kunci anti-dobel `jointRowKey()` (id biasa + kunci semantik untuk baris settle)

Dedupe by `id` saja TIDAK cukup untuk baris settle: baris turunan ber-id
`settle-2026-09-user_a-user_b` sementara baris yang kelak datang dari server ber-id uuid — dua-duanya
menceritakan transfer yang SAMA, dan kalau keduanya masuk, net bulan itu terhitung dua kali. Karena itu
baris settle/pembuka dibandingkan lewat kunci semantik `(jenis + bulan + kantong + penerima)`
(`jointRowKey()`), sehingga penanda bulan yang menang dan baris dari server tidak berlipat.

### 2.4 `justArrived` (badge "Baru") dibuang saat menyimpan

Bendera itu pajangan animasi slide-in, bukan data. `persist()` menulis catatan **tanpa** bendera itu,
dan hidrasi tidak pernah menghidupkannya kembali — jadi badge "Baru" tidak menempel selamanya setelah
refresh (dikunci test + terbukti di record §5: baris `rt-1` tersimpan tanpa `justArrived`).

### 2.5 Timer mock TETAP ada di halaman, dengan tiga pagar

1. hidup hanya saat `DEMO_REALTIME_MOCK` (`NEXT_PUBLIC_DEMO=1`) **dan** kantong sudah punya anggota
   lain — di build produksi (`pnpm build`, tanpa env) saklarnya mati;
2. barisnya masuk lewat `applyJointRow()` (pintu yang sama dengan baris realtime) → **tidak menimpa
   baris yang sudah ada**, dan toast hanya ditembak kalau baris itu benar-benar baru;
3. komentar & laporan tetap menyebutnya MOCK.

**Akibat yang jujur dipilih:** karena baris mock kini benar-benar tersimpan (persist key `joint`),
animasi "baris partner masuk" hanya terjadi **sekali per perangkat** — kunjungan berikutnya baris
`Listrik PLN` tetap ada di timeline tanpa animasi ulang. Alternatifnya (id unik per sesi) akan
menumpuk catatan contoh setiap kali halaman dibuka; itu lebih tidak jujur, jadi tidak diambil.

### 2.6 `setPaidBy()` diberi pintu UI (tambahan kecil di luar daftar prompt)

Paket ini meminta API `setPaidBy(id, userId)`, sementara atribusi kantong sebelumnya HANYA bisa diisi
saat mencatat — salah pilih berarti angka timbangan salah selamanya. Membiarkan API tulis tanpa pemakai
berarti dead code (dilarang kanon repo), jadi detail kartu timeline yang tadinya hanya punya "Atur
pembagian →" kini juga punya pemilih "Siapa yang nalangin?" (2 chip, komponen `ChoicePills` yang sama
dengan form tambah). Pembungkusnya menghentikan propagasi klik & papan-tombol karena kartunya sendiri
ber-`role="button"`.

### 2.7 Penulis localStorage DIHAPUS, pembacanya dipertahankan untuk migrasi

`writeJointSettlementRecord()` di `lib/data/joint.ts` **dihapus** — membiarkannya hidup berarti
menyediakan jalur tulis kedua, sumber persis yang ditutup paket ini. `readJointSettlementRecords()`
tetap ada dan dipakai SEKALI saat hidrasi: penanda lama dipindahkan ke store
(`mergeLegacySettlements()`, store menang untuk bulan yang sama), lalu ditulis ke IndexedDB supaya
tidak perlu dimigrasi lagi. Status "bulan ini sudah settle" milik user lama karena itu tidak hilang
saat aplikasi diperbarui — dan komentar jalur itu ditandai **LEGACY** di kode.

### 2.8 Yang SENGAJA tidak diubah

· **Mesin split/settlement** (`joint-ledger.ts`, `computeSettlement`, `splitSpecOf`,
  `buildCarryOverEntry`) — sudah teruji, tidak satu baris pun diubah;
· **kas pribadi** (`lib/money/store.ts`) — kantong bersama tetap buku besar terpisah; `cashTotal()`
  tidak tersentuh (dikunci test);
· **tabel/migrasi Supabase** — tidak ada tabel atau kolom baru. Yang berubah cuma CARA membaca
  (`joint_wallets` + `joint_transactions_public`) dan cakupan payload realtime di klien (kolom split &

---

## 3. Status realtime: apa yang NYATA dan apa yang MOCK (apa adanya)

| Jalur | Kapan aktif | Apa yang benar-benar terjadi |
|---|---|---|
| **Nyata (Postgres Changes)** | hanya kalau ada sesi Supabase + dompet di tabel `joint_wallets` | `readRemoteJointWallet()` membaca `joint_wallets` (id uuid, nama, tanggal dibuat) + `joint_members` + baris dari view masker `joint_transactions_public`; store menyimpan hasilnya sebagai cache, lalu membuka channel `joint_transactions` difilter `joint_wallet_id=eq.<uuid>`; tiap baris masuk lewat `applyRemoteJointRow()` (dedupe by id) |
| **Mock (timer di halaman)** | hanya kalau `DEMO_REALTIME_MOCK` (`NEXT_PUBLIC_DEMO=1`) **dan** kantong punya anggota lain | setelah `REALTIME_TYPING_DELAY` indikator "sedang mencatat", lalu `REALTIME_ARRIVAL` masuk lewat `applyJointRow()`; id-nya tetap (`rt-1`) sehingga tidak pernah menimpa/menggandakan |
| **Tidak ada apa pun** | produksi (tanpa env) atau tanpa sesi | layar berisi catatan yang benar-benar tersimpan; tidak ada catatan yang "muncul sendiri" |

Klaim yang **tidak** dibuat: "di demo ini baris partner datang dari perangkat lain". Di demo ia tetap
timer lokal — dan itu tertulis di komentar store, komentar halaman, dan tabel di atas.

---

## 4. File yang dibuat / diubah

| File | Status | Isi singkat |
|---|---|---|
| `lib/money/joint-store.ts` | **baru** | SATU store kantong bersama: `wallet`/`transactions`/`settlements`/`members`/`hydrated`; API tulis `addJointTransaction`, `updateSplit`, `setPaidBy`, `renameJointWallet`, `recordSettlement`, `addJointMember`, `applyJointRow`, `applyRemoteJointRow`, `clearJointArrivalBadge`; jalur server `applyRemoteJointWallet()` + hidrasi + migrasi legacy; `purgeJointStore`, `resetJointStore`; selector `jointLedgerFeed`, `settlementRecordFor`, `carryOverRecordFor`, `carryOverEntryFor`, `jointNotes`, `jointPartnerJoined`, `jointRowKey`, `mergeJointState`, `mergeLegacySettlements`, `mergeJointRows` |
| `lib/supabase/joint-remote.ts` | **baru** | `readRemoteJointWallet()` — baca dompet dari `joint_wallets` + `joint_members` + baris `joint_transactions_public` (view masker), `null` = jalur lokal |
| `lib/supabase/mappers.ts` | diubah | `JointTransactionDbRow` + `toJointTransaction(row, viewerId)` — SATU pemetaan untuk REST & realtime (split dari `split_type/…`, privasi lewat `maskPrivateDescription`) |
| `lib/supabase/realtime.ts` | diubah | `JointTransactionPayload` = baris UTUH (split + `is_settlement`); dokumen pemilik langganan = store |
| `lib/money/idb.ts` | diubah | key baru `JOINT_STATE_KEY = 'joint'` (database `catetind-money` yang sama; komentar "empat key" → "lima key") |
| `lib/data/joint.ts` | diubah | copy baru `JOINT_DEFAULT_DESCRIPTION`/`JOINT_DEFAULT_CATEGORY`; jalur localStorage ditandai **LEGACY**; penulis `writeJointSettlementRecord()` **dihapus** |
| `components/catetind/joint-screen.tsx` | diubah | sumber data = store (0 `useState` data); `splitOverrides`/`settled`/`carryOverRecord` jadi turunan; timer mock dirapikan (dedupe via store); langganan realtime dihapus dari halaman; `handleChangePaidBy` baru; import mati (`AnimatePresence`/`motion`/`JointWallet`) dibuang |
| `components/catetind/joint-timeline.tsx` | diubah | prop opsional `onChangePaidBy` + chip "Siapa yang nalangin?" di detail kartu |
| `components/catetind/joint-add-sheet.tsx` | diubah | memakai `JOINT_DEFAULT_DESCRIPTION` (satu sumber copy) |
| `lib/account.ts` | diubah | `purgeJointStore()` + `jointRowsCleared` di `PurgeReport` + komentar alur |
| `lib/account.test.ts` | diubah | assert `jointRowsCleared`, regresi privasi `mergeJointState({ purged: true })`, jumlah baris kantong saat dihapus |
| `lib/money/joint-store.test.ts` | **baru** | 23 test murni (§5) |
| `docs/handoff/laporan/bukti/52-joint-record-contoh.json` | **baru** | record nyata yang ditulis ke perangkat (§6) |
| `docs/handoff/laporan/52-joint-satu-sumber-realtime-laporan.md` | **baru** | laporan ini |

Tidak ada tabel/migrasi Supabase baru — perilaku RLS yang sudah ada (`joint_wallets_member_select`,
`joint_transactions_public`) yang dipakai.


---

## 5. Rantai bukti (klaim → cara membuktikannya)

| Klaim (dari prompt) | Bukti | Jalur kode |
|---|---|---|
| (a) tambah catatan Rp 300.000 split 60/40 → timbangan berubah, **net tetap 0**, dan tetap begitu setelah refresh | `joint-store.test.ts` → *"addJointTransaction menambah catatan yang ikut ke timbangan & net tetap nol"*, *"catatan, pembagian, nama kantong, & anggota ditulis ke perangkat & dibaca kembali"* | `addJointTransaction()` → `commit()` → `persist()` → `mergeJointState()` |
| (b) settle → timbangan rata **+ carry-over muncul di bulan berikutnya** | `joint-store.test.ts` → *"recordSettlement mengunci net jadi nol TANPA membengkakkan pengeluaran bersama"*, *"sisa yang belum tertutup muncul sebagai PEMBUKA bulan berikutnya"* | `recordSettlement()` → `settlementEntriesFor()` / `buildCarryOverEntry()` |
| (c) baris realtime yang sama datang dua kali → **tidak digandakan** | `joint-store.test.ts` → *"baris yang sama datang dua kali tidak digandakan (dedupe by id)"*, *"baris dari SERVER dipetakan lewat jalur yang sama"*, *"baris settle dari server tidak berlipat dengan penanda bulan (kunci semantik)"* | `applyJointRow()` / `applyRemoteJointRow()` / `jointRowKey()` |
| Pembagian & nama kantong tidak hilang setelah refresh | test yang sama + record §6 (`split.percents.user_a = 70`, `wallet.name = "Dompet Kita 💚"`) | `updateSplit()`, `renameJointWallet()` |
| Privasi utuh: isi privat partner tidak bocor, nominalnya tetap dihitung | *"catatan privat milik partner: ISI disamarkan, NOMINALnya tetap ada"* + `mappers.test.ts` (masker yang sama) | `toJointTransaction()` → `maskPrivateDescription()` |
| Kantong bersama **tidak** mengubah Total Saldo | *"kantong bersama TIDAK mengubah cashTotal() — kas pribadi utuh"* | `lib/money/store.ts` tidak disentuh |
| Hapus Akun membersihkan kantong bersama & melaporkannya | `account.test.ts` → `report.jointRowsCleared`, *"catatan kantong bersama yang ditulis user ikut dilaporkan saat dihapus"*, *"kantong bersama & anggotanya hilang setelah Hapus Akun"* | `purgeDeviceData()` → `purgeJointStore()` → `mergeJointState({ purged: true })` |
| Penanda settle user lama tidak hilang | *"memindahkan bulan lama, store menang untuk bulan yang sama"*, *"tanpa penanda lama tidak ada yang berubah"* | `mergeLegacySettlements()` (dipanggil sekali di `hydrateJointStore()`) |
| Halaman tidak menghitung ulang nominal | `feed`, `settled`, `carryOverRecord` semuanya selector store; `computeSettlement()` tetap satu-satunya pembaca net | `joint-screen.tsx` §1 |

Semua nama test di atas benar-benar dijalankan di `pnpm test` (§7) — bukan klaim dari membaca kode.

---

## 6. Keadaan IndexedDB (key `joint`)

Bentuk yang ditulis ke perangkat (`catetind-money` → store `state` → key `joint`):

```json
{
  "version": 1,
  "wallet": { "id": "joint_1", "name": "Dompet Kita 💚", "createdAt": "2026-07-15" },
  "transactions": [ /* catatan user + baris dari realtime, terbaru dulu */ ],
  "settlements": {
    "2026-09": { "month": "2026-09", "from": "user_a", "to": "user_b",
                 "amount": 160000, "method": "GoPay", "carryOver": 25000 }
  },
  "members": ["user_a", "user_b"],
  "purged": false
}
```

Contoh nyata (skenario: pasangan dicatat sebagai anggota → nama kantong diubah → catatan Rp 300.000
split 60/40 lalu diubah 70/30 → baris realtime `Listrik PLN` Rp 450.000 masuk → settle lewat GoPay
dengan sisa Rp 25.000) tersimpan di `docs/handoff/laporan/bukti/52-joint-record-contoh.json`,
diambil dengan menjalankan probe di lingkungan test (jalur memory `lib/money/idb.ts` — jalur yang
SAMA yang dipakai app saat IndexedDB diblokir; probe-nya dihapus setelah dijalankan, file buktinya
tetap). Isinya juga membuktikan:

· `justArrived` **tidak** ikut tersimpan di baris `rt-1` (badge "Baru" = pajangan);
· `feedBulanIni` = `settle-2026-09-user_a-user_b`, `rt-1`, catatan baru, lalu 8 catatan seed → baris
  settle diturunkan, tidak disimpan ulang;
· `carryOverBulanBerikutnya` = `carry-2026-09-user_a-user_b` (baris pembuka bulan 2026-10);
· `setelahSettle.myNet = partnerNet = 0` sementara `totalSpent` **tidak berubah** (2.620.000 sebelum &
  sesudah) → settle menyelesaikan tanpa membengkakkan pengeluaran bersama;
· `cashTotalTidakBerubah: true`.


---

## 7. Validasi (dijalankan, hasil apa adanya)

```bash
pnpm theme:audit          # ✓ palet bersih — 331 file diperiksa, tidak ada warna di luar palet
pnpm exec tsc --noEmit    # 0 error (exit 0)
pnpm test                 # 32 file · 460 test hijau (25 test baru joint-store + 3 test account)
pnpm build                # ✓ Compiled successfully in 2.1s · 34/34 halaman statis · /joint ○ Static
```

Smoke test produksi (`next start -p 3017`, hasil apa adanya dari SSR HTML):

| Route | Status | Bukti di HTML |
|---|---|---|
| `/joint` | 200 | wujud **undangan** ("Dompet Kita" 2×) — benar untuk build tanpa `NEXT_PUBLIC_DEMO`, karena kantong mulai satu anggota |
| `/` | 200 | 202.913 byte |
| `/bills` | 200 | 98.083 byte |

Smoke test mode review desain (`next dev -p 3018/3019` dengan `NEXT_PUBLIC_DEMO=1`, dari SSR HTML):

| Pemanggilan | Bukti di HTML |
|---|---|
| `GET /joint` | `Timbangan Kita`, `Cerita Kita`, `Total Pengeluaran Bersama`, `Catat Bareng`, baris timeline `Groceries Superindo` / `Listrik PLN September` / `Sabun`, `Rp 1.870.000` (total kanon), label `berhak menerima` & `harus transfer` |

---

## 8. Hal yang belum bisa diverifikasi (batas jujur)

1. **Dua perangkat sungguhan.** Jalur realtime yang NYATA (baca `joint_wallets` → subscribe
   `joint_transactions` → `applyRemoteJointRow()`) belum diuji terhadap project Supabase sungguhan di
   lingkungan ini: tidak ada sesi maupun kredensial. Yang terverifikasi adalah (a) pemetaan &
   dedupe barisnya (`toJointTransaction`, `applyRemoteJointRow`, `jointRowKey` — 23 test) dan
   (b) pembacaan id dompet dari `joint_wallets` alih-alih id kanon (kode + RLS yang sudah ada).
2. **Tulis ke server belum ada.** `addJointTransaction`/`recordSettlement` masih menulis ke perangkat
   saja. Menyalakannya butuh `insert` ke `joint_transactions` (+ `is_settlement`/`month_key` untuk baris
   settle); kalau nanti dinyalakan, id baris settle WAJIB memakai id turunan yang sama supaya tidak
   berlipat dengan penanda bulan (pagarnya sudah ada di `jointRowKey()`).
3. **Kode undangan & identitas masih memakai id dompet demo.** `lib/invite-store.ts` &
   `lib/data/joint-invite.ts` memakai `INITIAL_JOINT_WALLET.id` sebagai id kanon kode undangan, dan
   halaman `/joint` menggambar dua orang dengan identitas demo (`JOINT_ME`/`JOINT_PARTNER`). Kalau
   dompet datang dari server, anggotanya ber-id uuid: (a) pencatatan & settle TETAP bisa ditulis
   (pemeriksaan keanggotaan dilewati saat kantongnya dari server — `isAllowedPocket()`, diuji di
   *"baris server jadi dasar (seed dibuang) & catatan tetap bisa ditulis"*), tapi (b) halaman masih
   menampilkan wujud undangan karena `jointPartnerJoined()` membandingkan id demo. Memetakan identitas
   sesi Supabase ↔ dua peserta buku besar ini di luar cakupan paket 52 dan perlu keputusan produk
   (siapa "aku" & siapa "pasangan" di satu perangkat yang sama).
4. **Perilaku IndexedDB di browser sungguhan** (mode privat, kuota penuh, dua tab) belum diuji di
   perangkat — yang diuji jalur logikanya (persist + `mergeJointState` + purge) dan jalur memory yang
   sama.
5. **Ekspor data belum memuat kantong bersama.** `lib/money/export.ts` memuat uang, celengan, kekayaan,
   & tagihan (paket 43/46/50/51); kantong bersama belum — jadi janji "portabilitas data" (PRD 244)
   belum penuh untuk domain ini.
6. **Interaksi di layar diperiksa dari HTML/kelas, bukan dari klik.** Animasi slide-in, buka/tutup
   detail kartu, dan chip "Siapa yang nalangin?" diuji lewat jalur data + SSR HTML; belum dilihat mata
   di perangkat.
7. **Ukuran layar 375 px / 1440 px tidak diukur alat.** Chip pemilih kantong memakai `ChoicePills`
   (membungkus otomatis) di dalam kartu detail timeline, dan tidak ada elemen baru di luar kartu itu;
   pemeriksaan hanya dari kelas CSS yang benar-benar terkirim.

  `is_settlement` kini ikut dipetakan).
