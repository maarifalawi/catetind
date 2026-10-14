/* ── PORSI DOMPET (%) — SATU RUMUS UNTUK SELURUH HALAMAN DOMPET (paket 95) ────
   Sebelumnya halaman Dompet & Akun punya DUA rumus persen yang berbeda:

     · kaki tiap kartu ("{n}% dari total") + bar komposisi memakai
       **largest remainder** (jumlahnya TEPAT 100, tapi angkanya tidak persis
       `round(balance/total × 100)`) — lihat komentar `shares` di wallet-screen;
     · legenda panel "Komposisi" memakai `Math.round()` per dompet — cepat, tapi
       bisa berjumlah 99/101 dan **tidak identik** dengan "% dari total" di kartu
       dompet yang sama. Dua angka untuk satu dompet di satu layar.

   Fungsi murni ini menyatukan keduanya: satu implementasi largest remainder,
   dipakai bar komposisi, legenda, label "% dari total", dan lebar bar di kaki
   kartu — jadi tidak mungkin lagi ada "78%" di satu tempat dan "79%" di tempat
   lain untuk dompet yang sama. */

/** porsi tiap nilai terhadap `total` (%), dibulatkan ke bawah lalu sisanya
 *  dibagikan ke pecahan terbesar → jumlah SELALU tepat 100 saat `total > 0` */
export function walletShares(values: readonly number[], total: number): number[] {
  if (!Number.isFinite(total) || total <= 0) return values.map(() => 0)
  const exact = values.map((value) => (value / total) * 100)
  const out = exact.map((value) => Math.floor(value))
  let remainder = 100 - out.reduce((sum, value) => sum + value, 0)
  const byFraction = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction)
  for (const { index } of byFraction) {
    if (remainder <= 0) break
    out[index] += 1
    remainder -= 1
  }
  return out
}
