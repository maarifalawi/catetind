# KICKOFF paket 85 — pesan siap tempel untuk TASK BARU (copy-paste)

> Cara pakai:
> 1. Buka task/chat BARU (context window bersih).
> 2. Set token Supabase **di sesi terminal** (jangan di berkas):
>    `$env:SUPABASE_ACCESS_TOKEN='sbp_xxx'` — lihat §CARA PAKAI di bawah.
> 3. Tempel blok **PESAN** di bawah ini sebagai pesan pertama.
>
> JANGAN pernah menulis token ke berkas apa pun di repo (termasuk dokumen ini),
> jangan ke `.env`, jangan ke `.env.example`. Token = environment variable saja.
> Konfirmasi ke user juga: setelah paket 85 selesai, token itu sebaiknya
> **di-revoke** di Dashboard Supabase → Account → Access Tokens.

---

## CARA PAKAI

```powershell
# (opsional, hanya kalau mau cek sendiri lebih dulu)
$env:SUPABASE_ACCESS_TOKEN='<TOKEN_ANDA>'
pnpm supabase:migrate
pnpm supabase:verify
```

> **PENTING (jangan salah paham):** environment variable yang kamu set di jendela
> PowerShell-mu **tidak ikut** ke shell yang dipakai agent di task baru — shell-nya
> proses terpisah. Karena itu token juga **disertakan di dalam PESAN** di bawah,
> supaya agent men-set-nya sendiri di sesinya sebelum menjalankan migrasi.
>
> Kalau kamu tidak mau menaruh token di pesan chat: jalankan sendiri
> `pnpm supabase:migrate` setelah agent selesai menulis migrasi, lalu bilang ke
> agent "sudah saya jalankan, ini outputnya: ...". Dua-duanya sah; yang DILARANG
> adalah agent mengklaim migrasi sudah jalan padahal belum.

Catatan teknis (sudah diverifikasi di kode):
- `scripts/supabase/apply-migrations.mjs` membaca token **hanya dari env**, tidak
  pernah dari berkas. `SUPABASE_ACCESS_TOKEN` = Personal Access Token (Management API).
- `scripts/supabase/verify-rls.mjs` tidak butuh token; ia memakai kunci publishable
  dari env atau `.env.local`.
- Migrasi yang sudah tercatat di `supabase_migrations.schema_migrations` DILEWATI
  kecuali dijalankan dengan `--force`.

---

## PESAN (blok di bawah — pilih SATU dari dua versi)

### Versi A — pakai jawaban rekomendasi (kalau mau cepat, tempel apa adanya)

```
Lanjutkan kerja CatetInd paket 85. Root repo: c:\Users\maari\Downloads\catet-ind-dashboard-design

BACA SAMPAI HABIS dulu: docs/handoff/prompts/85-pemenuhan-akses-selamanya-token-ai-referral.md
Juga baca laporan paket 84 (docs/handoff/laporan/84-*.md) supaya tahu apa yang SUDAH jadi dan
tidak boleh diulang/dirusak. Baseline yang harus tetap benar: pnpm exec tsc --noEmit = 0 error,
pnpm test = 82 file / 1106 test lulus, pnpm build sukses, pnpm theme:audit = "palet bersih".

JAWABAN SAYA UNTUK §7 PROMPT (pakai ini, jangan tanya lagi kecuali kamu menemukan risiko baru):

1. Pembeli lama dengan expires_at bertanggal  -> (b) JADIKAN AKSES SELAMANYA.
   Jalankan backfill di migrasi baru: set is_lifetime = true, expires_at = null, dengan predikat
   SEMPIT (hanya baris user_subscriptions yang is_lifetime = false dan expires_at terisi), dan
   tulis alasannya di komentar + laporan. Jangan sentuh baris yang sudah is_lifetime = true.
2. Pemetaan pembeli lama -> SETUJU seperti kode paket 84:
   founding_member|lifetime -> sultan, yearly|annual -> waras, monthly -> catet-aja.
   SQL dan lib/subscription/plan.ts WAJIB sama; tulis komentar silang di keduanya.
3. Fair-use sultan -> TULIS SAJA sebagai kebijakan (jangan ditegakkan/dibatasi diam-diam di server).
4. Token AI -> MASIH DIJUAL untuk paket yang BERKUOTA (Waras). TIDAK ditawarkan ke Sultan
   (unlimited: tidak ada kuota untuk ditambah, jadi menjualnya = jebakan) dan TIDAK ke paket tanpa
   AI (Catet Aja). Token yang dibeli berlaku selamanya (tidak hangus saat bulan berganti).
5. Reward referral -> tetap SATU bentuk: 1 bulan Token AI untuk pengundang, diberikan untuk pembelian
   paket apa pun, dijalankan dari webhook (idempoten per order_id), bukan dari klien.
6. Route group app/(app)/layout.tsx -> BELUM DIIZINKAN. Jangan dikerjakan; cukup usulkan di laporan.
7. Backfill pembelian yang sempat kena bug +30 hari -> YA, kerjakan (bagian dari jawaban no. 1).

AKSES SUPABASE (untuk menjalankan migrasi):
- Set token ini DI SESIMU SENDIRI sebelum menjalankan migrasi (Management API token,
  hanya perlu untuk `pnpm supabase:migrate`):

      $env:SUPABASE_ACCESS_TOKEN='<TOKEN_SUPABASE_PERSONAL_ACCESS_TOKEN>'

- LARANGAN KERAS: jangan menulis token itu ke berkas mana pun (bukan ke .env, .env.local,
  .env.example, dokumen, laporan, atau output yang bisa ter-commit). Environment variable saja.
- Kalau .env.local belum punya NEXT_PUBLIC_SUPABASE_URL, set juga: $env:SUPABASE_PROJECT_REF='<ref>'
- Jalankan: pnpm supabase:migrate  lalu  pnpm supabase:verify
- Kalau variabelnya kosong / migrasi gagal karena kredensial: JANGAN mengarang "sudah dijalankan".
  Laporkan jujur apa yang belum terverifikasi, dan sertakan langkah manual yang perlu dijalankan user.
- Ingatkan user di akhir laporan: token itu sebaiknya DI-REVOKE di Dashboard Supabase
  (Account -> Access Tokens) setelah paket ini selesai.

PRIORITAS KERJA (urutan dari prompt §8):
1. TUGAS 1 (SQL pemenuhan akses selamanya) + TUGAS 2 (verifikasi nominal webhook) -> ini BUG PRODUKSI
   yang paling gawat: pembeli akses selamanya sekarang dapat expires_at = +30 hari.
2. TUGAS 4 (kuota AI per paket di 3 permukaan yang masih bocor: home-banner, band Top-Up di
   billing-panel, weekly-recap-banner).
3. TUGAS 3 (token AI: harga kanon + pembayaran nyata), lalu TUGAS 6 (reward referral).
4. TUGAS 5 (live feed landing) + TUGAS 7 (kerapian) di akhir.

SELESAI KERJA, WAJIB:
- pnpm exec tsc --noEmit (0 error) + pnpm test (minimal 82 file / 1106 test) + pnpm build +
  pnpm theme:audit (harus tetap bersih).
- Perbarui docs/STATUS-HALAMAN.md yang relevan.
- Tulis laporan docs/handoff/laporan/85-*.md (konvensi folder sudah ada).
- LAPORKAN semua keputusan yang kamu ambil sendiri beserta alasannya, dan bedakan mana yang
  SUDAH diverifikasi (bukti perintah) dan mana yang BELUM (mis. kalau kredensial tidak ada).
```

### Versi B — kalau mau menjawab sendiri dulu (ubah 7 baris ini saja)

Ganti baris 1–7 pada blok Versi A dengan jawabanmu:

```
1. Pembeli lama: [a / b / c]        (rekomendasi: b = jadikan akses selamanya)
2. Mapping pembeli lama: [setuju / usulanku: ...]
3. Fair-use sultan: [tulis saja / tegakkan, batasnya: ...]
4. Token AI: [masih dijual / stop]  + sultan boleh top-up: [ya / tidak]
5. Reward referral: [1 bulan Token AI / lain: ...]
6. Route group skeleton: [belum diizinkan / boleh dikerjakan]
7. Backfill bug +30 hari: [ya / tidak]
```

Kalau kamu belum yakin dengan salah satu, tulis "TANYAKAN DULU" pada baris itu —
agent wajib bertanya, bukan mengarang.
