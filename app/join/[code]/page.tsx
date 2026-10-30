import type { Metadata } from 'next'
import { cache } from 'react'
import { JoinInviteScreen } from '@/components/catetind/join-invite-screen'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { isJoinClaimRequest, resolveRemoteInviteView, type ResolvedInvite } from '@/lib/data/joint-invite'
import { resolveInvite } from '@/lib/invite-store'
import { resolveInviteStatusOnServer } from '@/lib/supabase/invite-server'

/**
 * Joint Wallet Invite Landing (/join/[code]) — inventaris #7, halaman PUBLIK.
 *
 * Ini pintu masuk sisi B dari KEY FLOW #2 (PRD 900–932): User A membagikan link
 * 6 karakter dari /joint, User B membukanya di sini. `params` adalah Promise di
 * Next 16, jadi kode undangan dibaca di server lalu diteruskan sebagai prop ke
 * komponen klien — status invite dihitung sekali, konsisten untuk metadata &
 * tampilan sekaligus.
 *
 * SUMBER STATUS (paket 100): `catetind_resolve_invite` dipanggil di SERVER
 * memakai kunci anon. Sebelumnya statusnya dibaca dari `localStorage` PERANGKAT
 * PENGUNDANG, sehingga kode yang sah tampil "Kodenya nggak ketemu" di perangkat
 * orang yang diundang — dan judul halamannya ikut salah. Kalau RPC/backend belum
 * tersedia, `resolveInvite()` (jalur lokal) tetap dipakai; halaman tidak kosong.
 *
 * `?terima=1` = penanda "baru kembali dari /login" (lihat `buildJoinClaimHref`):
 * komponen klien yang menulis keanggotaan, bukan halaman ini — halaman ini hanya
 * meneruskan fakta itu sebagai prop supaya render pertama sudah benar.
 *
 * `PhoneStage plain` seperti /login & /checkout: layar fokus tanpa sidebar, dan
 * `MobileBottomNav` + AI chat widget menyembunyikan diri di prefix `/join`.
 */
const resolveInviteForPage = cache(async (code: string): Promise<ResolvedInvite> => {
  const remote = await resolveInviteStatusOnServer(code)
  return remote ? resolveRemoteInviteView(remote) : resolveInvite(code)
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>
}): Promise<Metadata> {
  const { code } = await params
  const invite = await resolveInviteForPage(code)
  const inviter = invite.inviterName

  return {
    /* judul mengikuti status: undangan yang sudah tidak berlaku jangan
       menjanjikan hal yang tidak bisa dibuka */
    title:
      invite.status === 'valid'
        ? inviter
          ? `${inviter} mengajakmu ke ${invite.walletName} | CatetInd`
          : `Kamu diajak ke ${invite.walletName} | CatetInd`
        : 'Undangan dompet bersama | CatetInd',
    description:
      'Nama pengundang, dompet yang ditawarkan, tiga manfaat singkat, jaminan privasi, lalu pilihan gabung atau nanti aja, tanpa password dan tanpa hitungan mundur.',
    /* URL undangan mengandung kode: jangan pernah masuk mesin pencari */
    robots: { index: false, follow: false },
  }
}

export default async function JoinInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>
  searchParams: Promise<{ terima?: string | string[] }>
}) {
  const [{ code }, query] = await Promise.all([params, searchParams])
  /* dihitung SEKALI di server (memoized per request): dipakai metadata + render
     pertama komponen klien */
  const invite = await resolveInviteForPage(code)

  return (
    <PhoneStage plain>
      <JoinInviteScreen
        code={code}
        initialInvite={invite}
        autoJoin={isJoinClaimRequest(query.terima)}
      />
    </PhoneStage>
  )
}

