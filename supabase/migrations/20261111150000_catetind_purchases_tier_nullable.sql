-- CatetInd · 11 · `purchases.tier_name` BOLEH KOSONG (top-up token AI)
--
-- MASALAH YANG DITUTUP
-- `POST /api/payment/charge` dengan `purpose: 'topup'` mengirim
-- `tier_name: null` karena top-up BUKAN pembelian tier. Kolom `tier_name`
-- dibuat `text not null` di migrasi `20261010120000_catetind_pembayaran_langganan`
-- (default-nya memang dihapus di `20261011120000_...`), sehingga PostgREST
-- menolak barisnya dengan NOT NULL violation. Route lalu menjawab:
--
--     "Tagihan tidak bisa dicatat, jadi pembayaran belum dibuat."
--
-- Persis pesan yang dilihat pemilik produk saat menambah token AI — padahal
-- Midtrans sama sekali belum dipanggil (bukan masalah koneksi pembayaran).
--
-- Kenapa NULL diizinkan, bukan diisi paket pembeli
-- `tier_name` menjawab "PAKET apa yang dibeli baris ini". Top-up tidak membeli
-- paket, jadi menulis nama paket yang sedang dimiliki = mengarang data
-- pembelian. Fungsi pemenuhan (`catetind_fulfill_purchase`) sudah membaca
-- `purpose = 'topup'` SEBELUM menyentuh `tier_name`, jadi NULL aman di sana.
-- (Route tetap mengisi paket pemanggil bila terbaca, sebagai konteks tambahan.)
--
-- Idempotent: aman dijalankan berkali-kali.

alter table public.purchases
  alter column tier_name drop not null;

comment on column public.purchases.tier_name is
  'Paket yang dibeli baris ini. NULL untuk top-up token AI (bukan pembelian tier).';
