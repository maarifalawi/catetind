# 16 — Milestone Celebration

**Paket:** overlay penuh (inventaris #k) · **Fase 6** · **Depends on:** —

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Peta baca

**PRD:**

- **1819–1823** — **tiga jenis reward**: *Delayed* (tanaman makin subur, tiap save),
  *Surprise* (AI apresiasi acak), ***Milestone — Celebration*** (hari ke-7, 14, 21, 30
  → celebration full-screen, pesan AI personal, tanaman naik tahap) + catatan
  **Variable Ratio Schedule**
- **2024–2033** — Milestone Flowering & Fruiting (tahap tanaman & momen perayaannya)
- **2034–2132** — 3C AI Appreciation Engine: **template-based client-side (zero API cost)**,
  contoh pesan apresiasi spesifik, dan aturan 4–6 pesan AI-generated per bulan
- **1945–1990** — tabel 7 tahap tanaman + Health Point (batas: HP **tidak pernah**
  ditampilkan sebagai angka)
- **2253–2265** — rotasi copy toast (8 variasi) — sumber nada bahasa
- **562–566** — haptic `navigator.vibrate([30, 50, 30])` + **graceful degradation**
  (`'vibrate' in navigator`; iOS Safari PWA tidak mendukung)
- **1746–1752** — filosofi Domain 3: *"Zero poin, zero badge generik, zero leaderboard."*

**Inventaris:** baris 107 (#k) — *"Lottie confetti (2.5 detik), AI-generated personal
message, haptic feedback pattern"*.

**Kode acuan:**

- `components/catetind/plant-detail-modal.tsx` + `plant-widget.tsx` + `plant-illustration.tsx`
  — sistem tanaman yang sudah ada (**tanpa Lottie di repo ini** — pakai SVG + Framer Motion)
- `components/catetind/my-goals-card.tsx` — `stageFromPercent()` & tahap tanaman
- `lib/data/budget.ts` — `PLANT_STAGES`, `PLANT_STAGE_INDEX`, `plantStageFrom()`
- `components/catetind/weekly-recap-modal.tsx` — pola overlay penuh + auto-dismiss
- `lib/ai-chat.ts` / `hooks/use-ai-chat.ts` — nada pesan "AI" (mock, template-based)
- `components/catetind/contribute-sheet.tsx` — jalur "target tercapai" (setoran yang menyelesaikan target)

## Kenapa paket ini ada

Ini puncak loop kebiasaan: **satu momen yang membuat user merasa dihargai**, bukan
dinilai. Reward-nya sengaja tidak berbentuk poin/badge/leaderboard — ia berbentuk
**perayaan tanaman + satu kalimat personal**.

Pagar psikologis (CONTEXT-WAJIB §5.3 no.1 & 4):

- **Tidak ada hukuman yang menyertai.** Tidak boleh ada "streak-mu putus!" di overlay ini.
- **Tidak boleh mengarang pencapaian.** Perayaan hanya dipicu kondisi nyata
  (streak 7/14/21/30, naik tahap, target tercapai) yang bisa dihitung dari data.
- **Tidak berlebihan.** PRD membatasi pesan AI personal 4–6/bulan dan menyarankan
  template client-side (zero API cost) — jadi pakai template, bukan panggilan model.

## Yang harus dibangun

1. **`lib/data/milestones.ts`** (baru):
   - `type MilestoneKind = 'streak' | 'stage-up' | 'target-reached'`.
   - `MILESTONE_DAYS = [7, 14, 21, 30]`, `type Milestone = { id, kind, title, message, plantStage }`.
   - `type MilestoneState = { streakDays, activeDays, plantStage, targetAchieved? }` (mock).
   - `pendingMilestone(state, seenIds)` → milestone berikutnya yang layak dirayakan
     **atau** `null` (murni, mudah diuji).
   - `MILESTONE_MESSAGES` — pesan **template-based** per jenis, nada PRD 3C
     (contoh kanon: *"Minggu pertama! Kamu udah catat 7 hari — tanamanmu mulai tumbuh 🌿"*).
     **Dilarang** memanggil API AI.
   - `HAPTIC_PATTERN = [30, 50, 30]` + `canVibrate()`.
   - `milestoneStorageKey()` supaya perayaan yang sama tidak muncul dua kali.
2. **`components/catetind/confetti-overlay.tsx`** — partikel ringan dengan Framer Motion
   (durasi **~2.5 detik**, sesuai inventaris), otomatis berhenti setelah selesai.
   - **`prefers-reduced-motion` → tampilkan versi statis** (tanpa animasi partikel),
     jangan mengabaikan preferensi user.
   - Warna partikel HANYA dari token palet.
3. **`components/catetind/milestone-celebration.tsx`** — overlay penuh:
   - Tanaman versi terbaru (dari `plant-illustration`), judul milestone, **satu pesan
     personal**, dan tombol `"Lanjut"` (tidak memaksa menunggu animasi selesai).
   - Haptic dipanggil **hanya bila** `canVibrate()` → `navigator.vibrate(HAPTIC_PATTERN)`.
   - Auto-dismiss setelah ~2.5 detik **atau** saat user menekan tombol/tap.
4. **Trigger nyata** (pilih minimal dua, dan pastikan bisa diuji):
   - Dari Home saat streak mencapai 7/14/21/30 (data mock di `lib/data/milestones.ts`).
   - Setelah setoran yang **melunasi** target di alur Setor (kaitkan ke
     `contribute-sheet.tsx` / halaman detail celengan bila sudah ada dari prompt 02).
   - **Cara meninjau ulang**: sediakan satu pintu yang masuk akal — mis. tombol
     `"Lihat perayaan"` di `plant-detail-modal.tsx` (tempat stats tanaman dibuka).
     Jangan menyembunyikan fitur sampai tidak bisa dilihat sama sekali.
5. **Yang TIDAK dikerjakan di task ini** (tulis di komentar laporan): seluruh sistem
   HP/tanaman produksi (perhitungan HP harian, sleep mode, dll). Di sini cukup
   **perayaan**-nya, memakai data mock yang jujur.

## Acceptance criteria

- [ ] Perayaan muncul untuk minimal satu kondisi nyata (streak 7 hari) dan **tidak muncul dua kali**.
- [ ] Durasi animasi ~2.5 detik; ada tombol untuk langsung lanjut.
- [ ] `prefers-reduced-motion` menghasilkan versi statis (uji di DevTools).
- [ ] Haptic dipanggil hanya bila didukung; tidak error di Safari iOS.
- [ ] Pesan 100% dari template di `lib/data/milestones.ts` (nol panggilan API).
- [ ] Tidak ada poin, badge generik, leaderboard, atau angka streak besar di layar.
- [ ] Bisa ditinjau ulang lewat satu pintu yang wajar (mis. dari Plant Detail).
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Menambah dependency animasi/confetti baru (Framer Motion sudah ada; Lottie **tidak** dipakai di repo ini).
- Menampilkan HP sebagai angka, atau copy yang menakut-nakuti soal streak.
- Membuat overlay yang memblokir aplikasi sampai animasi selesai.
