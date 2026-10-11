import { redirect } from 'next/navigation'

/**
 * Tautan referral pendek (`https://catetind.com/r/<KODE>`) — PERBAIKAN AUDIT.
 *
 * Link ini SUDAH lama dipromosikan di `/referral` (`lib/data/referral.ts`:
 * `REFERRAL_URL_BASE` + `referralState.referralLink`), tapi route-nya tidak
 * pernah ada: setiap user yang membagikan linknya mengirim orang ke halaman 404.
 *
 * Aturan halaman ini sengaja sesingkat mungkin:
 *   • TIDAK merender apa pun — hanya mengalihkan;
 *   • kode teman diteruskan sebagai `?kode=` ke `/checkout`, tempat kode itu
 *     BENAR-BENAR divalidasi (format di klien, keberadaan di
 *     `/api/referral/validate`) dan dipakai menghitung diskon;
 *   • kode kosong tetap diarahkan ke `/checkout` tanpa query — supaya link
 *     rusak tidak berakhir di 404 kedua.
 *
 * Kode TIDAK divalidasi di sini: satu sumber kebenaran untuk validasi referral
 * adalah `lib/data/pricing.ts` + `CheckoutScreen`, bukan route pengalih.
 */
export default async function ReferralRedirectPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const normalized = code.trim().toUpperCase()
  redirect(normalized ? `/checkout?kode=${encodeURIComponent(normalized)}` : '/checkout')
}
