import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAnonKey } from '@/lib/supabase/config'
import { restConfigured, restRpc } from '@/lib/supabase/rest'

/**
 * Tautan referral pendek (`https://catetind.com/r/<KODE>`).
 *
 * Aturan halaman ini:
 *   • TIDAK merender apa pun, hanya mengalihkan;
 *   • SETIAP kunjungan dicatat sebagai satu klik dulu (RPC
 *     `record_referral_click`) supaya angka "Klik Link" di `/referral` punya
 *     sumber nyata. Yang dikirim HANYA kode + hash user agent: tanpa IP, tanpa
 *     user agent mentah, tanpa cookie;
 *   • kode teman diteruskan sebagai `?kode=` ke `/checkout`, tempat kode itu
 *     BENAR-BENAR divalidasi (format di klien, keberadaan di
 *     `/api/referral/validate`) dan dipakai menghitung diskon;
 *   • kode kosong tetap diarahkan ke `/checkout` tanpa query, supaya link rusak
 *     tidak berakhir di 404 kedua.
 *
 * Pencatatan klik GAGAL-SUNYI: tanpa backend, jaringan mati, atau kode asing,
 * pengunjung tetap sampai di `/checkout`. Menghalangi orang membeli karena
 * pencatatan statistik gagal adalah pertukaran yang buruk.
 */

/** sidik jari perangkat: sha256(user agent) - bukan data pribadi */
function userAgentHash(userAgent: string): string {
  return createHash('sha256').update(userAgent).digest('hex').slice(0, 32)
}

async function recordClick(code: string): Promise<void> {
  if (!restConfigured()) return
  try {
    const headerList = await headers()
    const userAgent = headerList.get('user-agent') ?? ''
    await restRpc<boolean>(
      'record_referral_click',
      { p_code: code, p_ua_hash: userAgent ? userAgentHash(userAgent) : null },
      supabaseAnonKey(),
    )
  } catch {
    /* statistik bukan alasan menahan pengunjung */
  }
}

export default async function ReferralRedirectPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const normalized = code.trim().toUpperCase()

  if (normalized) await recordClick(normalized)

  redirect(normalized ? `/checkout?kode=${encodeURIComponent(normalized)}` : '/checkout')
}
