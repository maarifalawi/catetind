/* ── SATU SUMBER ALAMAT SITUS ─────────────────────────────────────────────────
   Sebelum file ini ada, domain ditulis ulang di enam tempat — dan satu di
   antaranya (`lib/data/joint-invite.ts`) memakai `catetind.app`, sehingga
   undangan Joint Wallet yang dibagikan lewat WhatsApp mendarat di domain yang
   BERBEDA dari tautan share & referral produk yang sama. Sekarang seluruh
   alamat absolut diturunkan dari sini, jadi mustahil ada dua domain lagi.

   Dua bentuk sengaja dipisah karena keduanya memang dipakai untuk hal berbeda:
     • `SITE_ORIGIN` — dengan skema, untuk tautan yang BENAR-BENAR DIKIRIM
       (Web Share API, clipboard, `og:url`, redirect email).
     • `SITE_DOMAIN` — tanpa skema, untuk tautan yang DITAMPILKAN di UI supaya
       ringkas dibaca di kotak mono (pola `buildShareLinkText`).

   File ini murni (tanpa React) supaya boleh diimpor `lib/data/*`.
   ────────────────────────────────────────────────────────────────────────── */

/** origin kanon, mis. dipakai `siteUrl('/install')` → `https://catetind.com/install` */
export const SITE_ORIGIN = 'https://catetind.com'

/** domain kanon tanpa skema — untuk teks link yang ditampilkan ke user */
export const SITE_DOMAIN = 'catetind.com'

/** URL absolut untuk satu jalur internal (`path` boleh tanpa atau dengan `/`) */
export function siteUrl(path: string): string {
  return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
}
