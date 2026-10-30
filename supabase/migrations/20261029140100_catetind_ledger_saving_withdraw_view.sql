-- ══════════════════════════════════════════════════════════════════════════════
-- CatetInd · 12b · VIEW `ledger_row_effects`: arah `saving_withdraw`
--
-- Nilai enum `saving_withdraw` ditambahkan di migrasi …140000 (harus terpisah,
-- Postgres menolak memakai nilai enum baru di transaksi yang sama). Di sini
-- view turunan saldo diajari arahnya: uang MASUK ke dompet (+amount), sama
-- dengan `walletDelta()` di `lib/money/ledger.ts`.
--
-- Tanpa ini, view akan memberi delta 0 dan saldo dompet di server berbeda
-- dengan saldo di app setelah user menarik dana celengan.
-- ══════════════════════════════════════════════════════════════════════════════

create or replace view public.ledger_row_effects
with (security_invoker = true) as
  select
    user_id,
    id as row_id,
    wallet_id,
    case type
      when 'income'             then amount
      when 'receivable_payment' then amount
      when 'balance_adjustment' then amount
      when 'change'             then amount
      -- tarik dana celengan: uang kembali ke dompet (bukan pemasukan)
      when 'saving_withdraw'    then amount
      when 'expense'            then -amount
      when 'transfer'           then -amount
      when 'settlement'         then -amount
      when 'debt_payment'       then -amount
      -- `refund` belum punya aturan arah di `lib/money/ledger.ts` (walletDelta
      -- tidak menanganinya) -> 0 di sini juga, supaya server & klien tidak pernah
      -- menghitung angka yang berbeda.
      else 0
    end as delta
  from public.ledger_rows
  where wallet_id is not null
  union all
  -- sisi penerima: apa pun jenisnya, uangnya MASUK ke dompet lawan
  select user_id, id, counter_wallet_id, abs(amount)
  from public.ledger_rows
  where counter_wallet_id is not null;
