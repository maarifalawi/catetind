# 19 — Budget: Panel "Review Pengeluaran Hari Ini" (AI Coach)

**Paket:** melengkapi `/budget` (tanpa route baru) · **Fase 7** · **Depends on:** —

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Bukti gap (hasil audit)

- `components/catetind/budget-screen.tsx:241-246` → `handleReviewCoach()` masih
  `toast('Aku temenin review ya 🤖', { description: 'Panel review pengeluaran hari ini segera hadir.' })`.
- CTA-nya **muncul di 2 tempat**: banner over-budget (`budget-zone-a.tsx:176-193`) dan
  tombol "Review" pada kartu kategori (`BudgetCategoryCard → onReview`).

## Peta baca

**PRD:**

- **649–651** — **RESOLUSI tim (langsung menyebut fitur ini)**: UI mengikuti BIMA
  (soft terracotta + copy nurturing), dan *"kompromi untuk DIAN: saat status 'Over',
  munculkan CTA sekunder **'Review Pengeluaran Hari Ini'** yang mengarah ke **AI Coach**"*
  → jadi tujuan akhir CTA ini BUKAN halaman baru, tapi **AI Coach**.
- **737–748** — 2B.4 **AI Coach Responses (Variable Income)** — tabel copy nurturing;
  ini sumber kalimat balasan yang harus dipakai, bukan ditulis ulang
- **570–590** — ambang data minimum insight (jangan mengklaim tren dari data tipis)
- **2034–2132** — 3C AI Appreciation Engine: nada pesan, template client-side (zero API cost)
- **2141–2145** — CTA di zona ibu jari

**Kode acuan:**

- `components/catetind/ai-chat-widget.tsx` — widget chat global (satu instance di `app/layout.tsx`)
- `hooks/use-ai-chat.ts` + `lib/ai-chat.ts` — state percakapan & `mockReply()` (mock DeepSeek)
- `components/catetind/budget-sheet.tsx` — primitif `BudgetSheet` untuk panel/sheet baru
- `lib/data/budget.ts` — `DAILY_HUD`, `pacingOf()`, `spentPercent()`, `INITIAL_BUDGETS`
- `lib/data/history.ts` — `summarizeTransactions()`, `topExpenseCategory()`, `maskMoney()`

## Kenapa paket ini ada

Ini satu-satunya jalur pemulihan yang dirancang PRD untuk momen "over budget": bukan
menegur, tapi **menemani** (PRD 649). Selama tombolnya cuma toast, momen paling
rawan-churn di produk justru tidak punya jalan keluar.

## Yang harus dibangun

1. **`components/catetind/spending-review-sheet.tsx`** (baru, pakai `BudgetSheet`) —
   ringkasan **hari ini**, memakai data nyata:
   - keluar hari ini vs **jatah harian** (`DAILY_HUD.dailyBudget`), sisa hari,
   - kategori terbesar hari ini (`topExpenseCategory()` di rentang hari ini),
   - jumlah catatan hari ini + status kecepatan (`pacingOf()` → sage/amber/terracotta),
   - **1 kalimat** dari tabel copy PRD 737–748 sesuai kondisi (dry spell / income cair /
     normal / over) — pakai apa adanya, jangan karang nada baru.
2. **Pagar ambang data (wajib)**: kalau hari ini < 3 catatan, **jangan** menyimpulkan
   pola ("paling boros di…"). Ganti dengan kartu sabar + ajakan mencatat
   (kanon PRD 570–590 & celah kompetitif vs Fundy).
3. **Tombol `Lanjut ngobrol sama Minca`** di kaki panel → membuka **AI Coach** dengan
   pertanyaan sudah terisi (seed), mis. *"boros nggak nih hari ini?"*.
   - Pilih cara paling tidak invasif untuk membuka seed itu (chat state sekarang hidup
     **di dalam** `ai-chat-widget.tsx`). Baca `hooks/use-ai-chat.ts` dulu, lalu pilih
     **satu** dari: (a) bus event kecil (mis. `lib/ai-chat-bus.ts` dengan `CustomEvent`),
     atau (b) naikkan state chat ke provider di `app/layout.tsx` mengikuti pola
     `MoneyContextProvider` yang sudah ada.
   - Dokumentasikan pilihanmu + alasannya di komentar. **Jangan** membuat dua state chat.
4. **Sambungkan & bersihkan** — `handleReviewCoach()` di `budget-screen.tsx` membuka sheet
   ini (bukan toast), dan **hapus** toast placeholder + komentar `TODO: Link to AI Coach panel`
   di `budget-screen.tsx:243` & `budget-zone-a.tsx:184`.
5. **Privasi**: semua nominal lewat `usePrivacy()`; field seed chat tidak perlu disensor.
6. **Copy** tinggal di `lib/data/budget.ts` (judul panel, label, kalimat per kondisi).

## Acceptance criteria

- [ ] CTA "Review Pengeluaran Hari Ini" (banner over-budget **dan** tombol Review di kartu kategori) membuka panel — **bukan** toast.
- [ ] Angka di panel cocok dengan kartu HUD/kategori di halaman yang sama (satu sumber).
- [ ] Data tipis (< 3 catatan hari ini) → **tidak ada** kesimpulan pola.
- [ ] Tombol lanjut benar-benar membuka AI Coach dengan pertanyaan terisi (terlihat di UI chat).
- [ ] Nol teks "segera hadir" tersisa di `/budget` terkait fitur ini; nol TODO baru.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Menampilkan skor/kesehatan finansial dari data sehari (pelanggaran prinsip false insight).
- Copy menghakimi ("kamu boros banget"). Nada: menemani.
- Memanggil API AI nyata (repo demo: `mockReply()` / template).
