-- ══════════════════════════════════════════════════════════════════════════════
-- CatetInd · 12a · ENUM: `saving_withdraw` (tarik dana dari celengan)
--
-- Kenapa jenis baru, bukan `income` atau `transfer`:
--   · `income`      → menarik tabungan sendiri BUKAN pemasukan; Arus Uang,
--                     Budget, dan Jatah Hari Ini tidak boleh naik karenanya;
--   · `transfer`    → di ledger klien artinya uang KELUAR dari dompet.
-- Penarikan butuh arah sebaliknya: saldo dompet NAIK tanpa menjadi pemasukan.
--
-- CATATAN PENTING: `alter type ... add value` hanya boleh berdiri sendiri. Nilai
-- enum baru TIDAK boleh dipakai di transaksi yang sama (Postgres: "unsafe use of
-- new value of enum type"), jadi view `ledger_row_effects` diperbarui di migrasi
-- BERIKUTNYA (…140100), bukan di file ini.
-- ══════════════════════════════════════════════════════════════════════════════

alter type public.ledger_row_type add value if not exists 'saving_withdraw';
