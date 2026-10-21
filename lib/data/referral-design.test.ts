import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  AchievementCard,
  FriendHistoryCard,
  RewardCard,
  ShareCard,
} from '@/components/catetind/referral-screen'
import {
  REFERRAL_HISTORY,
  REFERRAL_PRIVACY_PLEDGE,
  REFERRED_FRIEND_BENEFIT,
  getReferrerReward,
  referralState,
} from './referral'

/* ── SMOKE TEST REDESAIN HALAMAN AJAK TEMAN ──────────────────────────────────
   Mengunci janji desain yang tidak terlihat dari tipe: tanpa eyebrow, tanpa
   paragraf penjelas, tanpa tautan paket, tanpa badge status/reward berulang,
   dan statistik + total reward menyatu dalam satu kartu. Render memakai
   `react-dom/server` (environment node) — pola yang sama dengan
   `lib/data/bills-design.test.ts`. */

const render = (element: ReturnType<typeof createElement>) => renderToStaticMarkup(element)

const SOURCE = readFileSync(
  new URL('../../components/catetind/referral-screen.tsx', import.meta.url),
  'utf8',
)

/** komentar boleh menyebut larangan desain; yang diperiksa adalah kodenya */
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '')

function shareHtml() {
  return render(
    createElement(ShareCard, {
      referralLink: referralState.referralLink,
      copied: false,
      onCopy: () => {},
      onShare: () => {},
    }),
  )
}

describe('redesain Ajak Teman (render nyata)', () => {
  it('kartu reward: satu janji reward, tanpa tautan paket', () => {
    const html = render(createElement(RewardCard, { reward: getReferrerReward() }))

    expect(html).toContain('Reward Lo')
    expect(html).toContain(getReferrerReward().highlight)
    expect(html).toContain(REFERRED_FRIEND_BENEFIT)

    expect(html).not.toContain('Apa itu')
    expect(html).not.toContain('Paket Sultan')
    expect(html).not.toContain('Reward kamu')
    expect(html).not.toContain('100% Privat')
  })

  it('kartu link: label + link + dua tombol; privasi di balik ikon info', () => {
    const html = shareHtml()

    expect(html).toContain('Link Referral Lo')
    expect(html).toContain(referralState.referralLink)
    expect(html).toContain('Copy Link')
    expect(html).toContain('Bagikan')

    /* disclaimer tidak lagi jadi paragraf di alur utama — hanya tooltip */
    expect(html).toContain('role="tooltip"')
    expect(html).toContain(REFERRAL_PRIVACY_PLEDGE)
    expect(html).not.toContain('Semua teman yang mendaftar lewat link ini')
  })

  it('pencapaian: tiga angka + total reward dalam SATU kartu', () => {
    const html = render(
      createElement(AchievementCard, {
        clicks: referralState.totalClicks,
        registered: referralState.friendsPending,
        converted: referralState.friendsConverted,
        total: referralState.totalRewardEarned,
      }),
    )

    expect(html).toContain('Pencapaian Lo')
    expect(html).toContain('Klik Link')
    expect(html).toContain('Mendaftar')
    expect(html).toContain('Sudah Beli')
    expect(html).toContain('Total Reward')
    expect(html).toContain(referralState.totalRewardEarned)
    expect(html).toContain('bg-cream')

    /* tidak ada kartu reward gelap terpisah / label lama */
    expect(html).not.toContain('Total Reward yang Kamu Dapat')
    expect(html).not.toContain('bg-forest p-5')
  })

  it('riwayat teman: dikelompokkan per status, tanpa badge berulang', () => {
    const html = render(createElement(FriendHistoryCard, { friends: REFERRAL_HISTORY }))

    expect(html).toContain('Riwayat Teman')
    expect(html).toContain('Sudah Beli')
    expect(html).toContain('Menunggu Pembayaran')
    expect(html).toContain('Budi Santoso')
    expect(html).toContain('26 Sep 2026')

    /* baris lunas memakai tint Mint yang sama dengan halaman Tagihan */
    expect(html).toContain('bg-mint/[0.14]')

    /* grouping sudah membawa status → tidak ada badge status per baris */
    expect(html).not.toContain('✅ Sudah beli paket')
    expect(html).not.toContain('⏳ Menunggu')
    /* reward per baris dihapus — info reward hidup di blok pencapaian */
    expect(html).not.toContain('+1 bln Token AI')
    /* teks ringkasan duplikat di header riwayat dihapus */
    expect(html).not.toContain('masih menunggu pembayaran')
    expect((html.match(/Sudah Beli/g) ?? []).length).toBe(1)
  })

  it('sumber halaman bebas eyebrow, penjelas, dan warna baru', () => {
    expect(CODE).not.toContain('Program Ajak Teman')
    expect(CODE).not.toContain('Apa itu')
    expect(CODE).not.toContain('Semua teman yang mendaftar lewat link ini')
    expect(CODE).not.toContain('friendStatusLabel')
    expect(CODE).not.toContain('PLAN_TIER_EXPLAIN')

    /* nol hex & nol fungsi warna mentah — hanya token design system */
    expect(CODE).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    expect(CODE).not.toMatch(/\brgba?\(/)
  })
})
