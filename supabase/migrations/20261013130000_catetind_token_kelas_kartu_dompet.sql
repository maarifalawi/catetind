-- ── KELAS WARNA KARTU DOMPET: HEX LAMA → TOKEN PALET (paket 88) ──────────────
-- Muka kartu dompet hidup di DATA (`wallets.face` / `.color` / `.band_class` /
-- `.face_class`), sedangkan Tailwind cuma meng-generate kelas yang literalnya
-- muncul di source code. Baris dompet yang lahir SEBELUM paket tokenisasi palet
-- masih memuat kelas warna arbitrer seperti `from-[#52685c]`. Selama source-nya
-- masih memakai hex itu, kelasnya ikut digenerate; begitu source berganti jadi
-- `from-forest-soft`, kelas lama itu HILANG dari CSS — gradien muka kartu tidak
-- tergambar, dan yang terlihat user adalah kartu terang/transparan dengan
-- nominal putih yang nyaris tidak terbaca.
--
-- Migrasi ini merapikan DATA-nya, dan idempotent: baris yang sudah bertoken
-- tidak disentuh sama sekali (`where ... like '%[#%'`).
--
-- Penambal di sisi app TETAP ada — `lib/wallet-card-colors.ts` plus
-- `toWalletAccount()`/`toHomeWallet()` di `lib/wallets.ts` — sehingga pemasangan
-- yang belum menjalankan migrasi ini pun tidak melihat kartu tanpa warna.
--
-- Fungsi bantu di bawah cuma dipakai di dalam migrasi ini lalu DIBUANG, supaya
-- tidak menambah permukaan API database yang harus ikut dijaga RLS.

create or replace function public.catetind_token_kelas_kartu(txt text)
returns text
language plpgsql
immutable
as $$
declare
  pasangan record;
  hasil text := coalesce(txt, '');
begin
  -- hex → token (sama persis dengan tabel codemod tokenisasi, jadi nilai hasil
  -- perbaikan ini identik dengan resep kanon di lib/wallets.ts)
  for pasangan in
    select * from (values
      ('-[#ffffff]', '-cream'),
      ('-[#000000]', '-soil'),
      ('-[#45594e]', '-forest'),
      ('-[#52685c]', '-forest-soft'),
      ('-[#91bb9e]', '-mint'),
      ('-[#ecd768]', '-brand'),
      ('-[#91a0b8]', '-thistle'),
      ('-[#ebe4de]', '-sage'),
      ('-[#b5b987]', '-hud-sage'),
      ('-[#b89191]', '-hud-terracotta'),
      ('-[#ffb885]', '-hud-amber'),
      ('-[#dbe4c7]', '-mint-soft'),
      ('-[#c4c7af]', '-evergreen-light'),
      ('-[#1f2823]', '-evergreen-deep'),
      ('-[#161c19]', '-evergreen-deeper'),
      ('-[#e6e4c0]', '-olive-light'),
      ('-[#51533d]', '-olive-deep'),
      ('-[#dbdccf]', '-thistle-light'),
      ('-[#414853]', '-thistle-deep'),
      ('-[#e7d8c3]', '-plum-light'),
      ('-[#534141]', '-plum-deep'),
      ('-[#fbe3c0]', '-cantelope-light'),
      ('-[#e8b06a]', '-cantelope-mid'),
      ('-[#73533c]', '-cantelope-deep'),
      ('-[#f6edb7]', '-daisy-light'),
      ('-[#6a612f]', '-daisy-deep')
    ) as t(hex, token)
  loop
    hasil := replace(hasil, pasangan.hex, pasangan.token);
  end loop;
  return hasil;
end;
$$;

update public.wallets
set
  face       = public.catetind_token_kelas_kartu(face),
  color      = public.catetind_token_kelas_kartu(color),
  band_class = public.catetind_token_kelas_kartu(band_class),
  face_class = public.catetind_token_kelas_kartu(face_class)
where face like '%[#%'
   or color like '%[#%'
   or band_class like '%[#%'
   or face_class like '%[#%';

-- `face` kosong padahal `face_class` terisi: muka kartu `/wallet` memang arah +
-- stop yang SAMA dengan muka kartu deck, jadi kolomnya bisa diisi dari data yang
-- sudah ada — bukan tebakan warna baru.
update public.wallets
set face = 'bg-gradient-to-br ' || face_class
where face = '' and face_class <> '';

drop function public.catetind_token_kelas_kartu(text);
