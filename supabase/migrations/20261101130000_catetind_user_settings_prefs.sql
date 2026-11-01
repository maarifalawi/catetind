-- CatetInd · 12 · KOLOM PREFERENSI AI & NOTIFIKASI (lintas perangkat)
--
-- Kenapa migrasi ini ada: dua kelompok preferensi masih hidup HANYA di
-- localStorage perangkat (`catet-ai-prefs`, `catet-notif-prefs`), jadi user yang
-- mematikan "Reminder Harian" di HP tetap menerimanya di laptop.
--
-- Kenapa kolom SENDIRI, bukan menumpang `privacy`: `user_settings.privacy`
-- ditulis oleh panel Privasi dengan objek utuh (replace), sehingga preferensi
-- yang menumpang di dalamnya akan terhapus setiap kali penulis itu menyimpan.
-- Kolom jsonb terpisah membuat dua penulis itu tidak pernah saling menimpa.
--
-- Isi tiap kolom: `{ ...nilai, updatedAt: <epoch ms> }`. `updatedAt` dipakai
-- aturan last-write-wins di klien (`lib/prefs-sync.ts`); nilai tanpa
-- `updatedAt` (mis. hasil migrasi lama) TIDAK PERNAH menimpa nilai perangkat.
--
-- Idempotent: aman dijalankan berkali-kali.

alter table public.user_settings add column if not exists ai_prefs jsonb;
alter table public.user_settings add column if not exists notif_prefs jsonb;
