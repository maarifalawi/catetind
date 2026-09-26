# 22 — Bersih-bersih Sisa: Route Yatim `/overview` + Dead Code

**Paket:** kebersihan repo (tanpa route baru) · **Fase 7** · **Depends on:** —

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Bukti gap (hasil audit, sudah diverifikasi dengan grep)

| Item | Temuan |
|---|---|
| `app/overview/page.tsx` | Route ada, tapi **0 tautan** masuk (`href="/overview"` = 0 hasil). Tidak ada di inventaris (32 halaman) — sisa baseline desain awal |
| `components/catetind/overview-screen.tsx` | Dipakai **hanya** oleh `app/overview/page.tsx` |
| `components/catetind/transaction-list.tsx` | **0 pemakai** (yatim sejak `/family` dihapus di prompt 06) |
| `components/catetind/overview-panel.tsx` | **JANGAN dihapus** — dipakai `home-screen.tsx:30 & :72` |
| `components/catetind/balance-ring.tsx` | **JANGAN dihapus** — juga dipakai `weekly-recap-modal.tsx:287` |
| `components/catetind/income-card.tsx` | **JANGAN dihapus** — dipakai `overview-panel.tsx` (yang hidup) |
| `lib/data/transactions.ts` | **JANGAN dihapus** — dipakai `home-screen.tsx:32` |

## Peta baca

Tidak ada section PRD untuk task ini — **PRD dipakai sebagai daftar harapan**:
`inventaris_ui_definitif.md` (32 route) adalah kanon halaman. Apa pun yang tidak ada di
sana dan tidak bisa dijangkau = kandidat pembersihan.

**Aturan navigasi yang relevan:** PRD **594–639** (2A.6) — *"SATU sumber kebenaran untuk
navigasi sekunder"*. Route yatim melanggar semangat ini (user bisa menemukan pintu
tersembunyi yang tidak pernah dirawat).

**Acuan pola:** prompt 06 sudah melakukan pembersihan serupa (`/more`, `/family`) —
ikuti gayanya: hapus, lalu buktikan nol jejak dengan grep.

## Kenapa task ini ada

Dua file ini tidak merusak apa pun secara langsung, tapi keduanya:
1. **menipu review** — `transaction-list.tsx` masih terlihat seperti komponen hidup,
   padahal ia memakai `tx.date.toLocaleDateString()` yang berpotensi hydration mismatch
   kalau dihidupkan lagi;
2. **menambah permukaan perawatan** — `/overview` adalah dashboard versi lama yang
   bersaing diam-diam dengan `/` (dan `app/overview` bahkan tidak punya `metadata`
   konsisten dengan halaman lain).

Bersih-bersih seperti ini murah, dan hasilnya langsung terasa saat audit berikutnya.

## Yang harus dibangun

1. **Hapus `app/overview/`** (route + `page.tsx`).
2. **Hapus `components/catetind/overview-screen.tsx`** (hanya dipakai route itu).
3. **Hapus `components/catetind/transaction-list.tsx`** (0 pemakai).
4. **Verifikasi nol jejak** — jalankan dan laporkan hasilnya:
   ```bash
   grep -rn "overview-screen\|transaction-list\|/overview" app components lib
   ```
   Semua kemunculan harus hilang, **kecuali** `overview-panel` (dipakai `home-screen.tsx`)
   dan `lib/data/transactions.ts` (dipakai `home-screen.tsx:32`) — keduanya **tetap ada**.
5. **Cek komponen yang jadi tanpa pemakai setelah penghapusan** — kalau ada (mis. sesuatu yang
   tadinya hanya dipakai `overview-screen.tsx`), laporkan; hapus hanya bila benar-benar 0 pemakai
   (bukti grep disertakan).
6. **Pertimbangkan `tsconfig.tsbuildinfo`** — artefak build yang ter-track di repo dan berubah
   setiap kali `tsc` jalan. Kalau kamu setuju ia lebih baik di `.gitignore`, lakukan + jelaskan
   (ini satu-satunya perubahan "konfigurasi" yang boleh di task ini).
7. **Tulis satu baris di `docs/handoff/ROADMAP-HALAMAN.md` §3** bahwa `/overview` dihapus
   secara sadar, supaya tidak "dihidupkan lagi" tanpa diskusi.

## Acceptance criteria

- [ ] `app/overview/`, `overview-screen.tsx`, `transaction-list.tsx` tidak ada lagi.
- [ ] `grep` nol jejak ketiganya; `overview-panel`, `balance-ring`, `income-card`,
      `lib/data/transactions.ts` **masih ada** dan masih terpakai.
- [ ] Sidebar & drawer mobile tidak berubah (tidak ada menu yang hilang).
- [ ] `/` masih menampilkan Overview Panel & Balance Ring seperti sebelumnya (regresi nol).
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.
- [ ] Laporan memuat daftar file yang dihapus + hasil grep + alasan tiap keputusan "jangan hapus".

## Dilarang

- Menghapus `overview-panel.tsx`, `balance-ring.tsx`, `income-card.tsx`, atau
  `lib/data/transactions.ts` (semuanya masih hidup — bukti ada di tabel di atas).
- Mengganti `/overview` dengan redirect ke `/` (kalau memang tidak diperlukan, **hapus**;
  kalau ada bookmark yang dikhawatirkan, cukup catat di laporan — jangan bikin rute setengah hidup).
- Menambah fitur apa pun di task ini.
