import type { Metadata } from 'next'
import { JoinInviteScreen } from '@/components/catetind/join-invite-screen'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { resolveInvite } from '@/lib/data/joint-invite'

/**
 * Joint Wallet Invite Landing (/join/[code]) — inventaris #7, halaman PUBLIK.
 *
 * Ini pintu masuk sisi B dari KEY FLOW #2 (PRD 900–932): User A membagikan link
 * 6 karakter dari /joint, User B membukanya di sini. `params` adalah Promise di
 * Next 16, jadi kode undangan dibaca di server lalu diteruskan sebagai prop ke
 * komponen klien — status invite dihitung sekali, konsisten untuk metadata &
 * tampilan sekaligus.
 *
 * Arah produksi: status invite (single-use + kedaluwarsa 24 jam, PRD AC1) dibaca
 * dari server (`GET /api/joint/invite/:code`) karena ia otorisasi, bukan dekorasi;
 * setelah login, server yang melakukan auto-join. Di repo demo ini `resolveInvite()`
 * menentukan status lokal supaya semua tampilan (valid/kedaluwarsa/terpakai/asing)
 * bisa direview tanpa backend.
 *
 * `PhoneStage plain` seperti /login & /checkout: layar fokus tanpa sidebar, dan
 * `MobileBottomNav` + AI chat widget menyembunyikan diri di prefix `/join`.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>
}): Promise<Metadata> {
  const { code } = await params
  const invite = resolveInvite(code)

  return {
    /* judul mengikuti status: undangan yang sudah tidak berlaku jangan
       menjanjikan hal yang tidak bisa dibuka */
    title:
      invite.status === 'valid'
        ? `${invite.inviterName} mengajakmu ke ${invite.walletName} — CatetInd`
        : 'Undangan dompet bersama — CatetInd',
    description:
      'Nama pengundang, dompet yang ditawarkan, tiga manfaat singkat, jaminan privasi, lalu pilihan gabung atau nanti aja — tanpa password dan tanpa hitungan mundur.',
    /* URL undangan mengandung kode: jangan pernah masuk mesin pencari */
    robots: { index: false, follow: false },
  }
}

export default async function JoinInvitePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params

  return (
    <PhoneStage plain>
      <JoinInviteScreen code={code} />
    </PhoneStage>
  )
}
