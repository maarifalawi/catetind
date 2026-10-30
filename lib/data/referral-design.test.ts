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
  REFERRAL_EMPTY_COPY,
  REFERRAL_PRIVACY_PLEDGE,
  REFERRAL_REWARD_TOKENS,
  REFERRED_FRIEND_BENEFIT,
  buildReferralLinkText,
  formatRewardEarned,
  getReferrerReward,
  type ReferralFriend,
} from './referral'

/* ── SMOKE TEST HALAMAN AJAK TEMAN (data NYATA) ───────────────────────────────
   Mengunci dua hal sekaligus:

     1. janji desain yang tidak terlihat dari tipe (tanpa eyebrow, tanpa
        paragraf penjelas, tanpa badge berulang, angka + total reward dalam satu
        kartu);
     2. janji DATA: seluruh angka & nama datang dari prop (yang di produksi
        berasal dari `GET /api/referral/me`), dan keadaan kosong ditampilkan
        sebagai kalimat pendek, BUKAN baris contoh.

   Render memakai `react-dom/server` (environment node) — pola yang sama dengan
   `lib/data/bills-design.test.ts`. */

const render = (element: ReturnType<typeof createElement>) => renderToStaticMarkup(element)

const SOURCE = readFileSync(
  new URL('../../components/catetind/referral-screen.tsx', import.meta.url),
  'utf8',
)

/** komentar boleh menyebut larangan desain; yang diperiksa adalah kodenya */
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '')

/** kode & nama contoh yang dulu tampil untuk SEMUA user — tidak boleh ada lagi */
const LEAKED_CODE = 'RINA-X7K'
const LEAKED_NAMES = ['Budi Santoso', 'Siska Ayu', 'Reza Pratama', 'Ahmad Fauzi', 'Lisa Permata']

/** dua teman nyata (bentuk keluaran server): satu sudah beli, satu menunggu */
const REAL_FRIENDS: ReferralFriend[] = [
  { id: 'rel-1', name: 'Rahmat', converted: true, joinedAt: '2026-09-15' },
  { id: 'rel-2', name: 'Dewi', converted: false, joinedAt: '2026-09-24' },
]

function shareHtml(referralLink: string | null) {
  return render(
    createElement(ShareCard, {
      referralLink,
      copied: false,
      disabled: !referralLink,
      onCopy: () => {},
      onShare: () => {},
    }),
  )
}

describe('Ajak Teman — data nyata, tanpa kode/nama contoh', () => {
  it('modul data tidak lagi mengekspor konstanta contoh', () => {
    const data = readFileSync(new URL('./referral.ts', import.meta.url), 'utf8')
    const dataCode = data.replace(/\/\*[\s\S]*?\*\//g, '')

    expect(dataCode).not.toContain('export const referralState')
    expect(dataCode).not.toContain('export const REFERRAL_HISTORY')
    expect(dataCode).not.toContain('REFERRAL_IS_SAMPLE')
    expect(dataCode).not.toContain('REFERRAL_SAMPLE_NOTICE')
    for (const name of LEAKED_NAMES) {
      expect(dataCode).not.toContain(name)
    }
    expect(dataCode).not.toContain(LEAKED_CODE)
  })

  it('layar tidak menyimpan angka contoh sendiri', () => {
    for (const name of LEAKED_NAMES) {
      expect(CODE).not.toContain(name)
    }
    expect(CODE).not.toContain(LEAKED_CODE)
    expect(CODE).not.toContain('referralState')
    expect(CODE).not.toContain('REFERRAL_HISTORY')
  })

  it('kartu reward: satu janji reward, tanpa tautan paket', () => {
    const html = render(createElement(RewardCard, { reward: getReferrerReward() }))

    expect(html).toContain('Reward Lo')
    expect(html).toContain(getReferrerReward().highlight)
    expect(html).toContain(REFERRED_FRIEND_BENEFIT)

    expect(html).not.toContain('Apa itu')
    expect(html).not.toContain('Paket Sultan')
    expect(html).not.toContain('100% Privat')
  })

  it('kartu link: memakai link MILIK user yang dioper, bukan kode karangan', () => {
    const ownLink = buildReferralLinkText('DEWI-4KP')
    const html = shareHtml(ownLink)

    expect(html).toContain('Link Referral Lo')
    expect(html).toContain(ownLink)
    expect(html).toContain('Copy Link')
    expect(html).toContain('Bagikan')
    expect(html).not.toContain(LEAKED_CODE)

    /* disclaimer privasi hidup di tooltip, bukan paragraf di alur utama */
    expect(html).toContain('role="tooltip"')
    expect(html).toContain(REFERRAL_PRIVACY_PLEDGE)
  })

  it('kartu link tanpa kode: kedua tombol MATI dan alasannya ditulis', () => {
    const html = shareHtml(null)

    expect(html).toContain(REFERRAL_EMPTY_COPY.noCode)
    expect((html.match(/disabled=""/g) ?? []).length).toBe(2)
    expect(html).not.toContain('catetind.com/r/')
  })

  it('pencapaian: tiga angka + total reward dari angka yang dioper', () => {
    const html = render(
      createElement(AchievementCard, {
        clicks: 4,
        registered: 1,
        converted: 2,
        total: formatRewardEarned(REFERRAL_REWARD_TOKENS * 2),
      }),
    )

    expect(html).toContain('Pencapaian Lo')
    expect(html).toContain('Klik Link')
    expect(html).toContain('Mendaftar')
    expect(html).toContain('Sudah Beli')
    expect(html).toContain('Total Reward')
    expect(html).toContain('>4<')
    expect(html).toContain('+2 bulan Token AI')
    expect(html).toContain('bg-cream')
  })

  it('pencapaian nol: angka 0 jujur, bukan angka contoh', () => {
    const html = render(
      createElement(AchievementCard, {
        clicks: 0,
        registered: 0,
        converted: 0,
        total: formatRewardEarned(0),
      }),
    )

    expect(html).toContain('0')
    expect(html).toContain('Belum ada')
    /* angka contoh lama (12 / 3 / 2) tidak boleh muncul sebagai NILAI */
    expect(html).not.toContain('>12<')
    expect(html).not.toContain('>3<')
    expect(html).not.toContain('+2 bulan')
  })

  it('riwayat teman: nama nyata, dikelompokkan per status, tanpa badge berulang', () => {
    const html = render(createElement(FriendHistoryCard, { friends: REAL_FRIENDS }))

    expect(html).toContain('Riwayat Teman')
    expect(html).toContain('Sudah Beli')
    expect(html).toContain('Menunggu Pembayaran')
    expect(html).toContain('Rahmat')
    expect(html).toContain('Dewi')
    /* tanggal server `YYYY-MM-DD` diformat di layar (SSR-safe, UTC) */
    expect(html).toContain('15 Sep 2026')
    expect(html).toContain('bg-mint/[0.14]')

    /* status dibawa kelompok, jadi tidak ada badge status per baris */
    expect(html).not.toContain('Sudah beli paket')
    expect(html).not.toContain('Menunggu</span>')
    expect(html).not.toContain('masih menunggu pembayaran')
    expect((html.match(/Sudah Beli/g) ?? []).length).toBe(1)
  })

  it('belum ada teman: satu kalimat pendek, tanpa kelompok dan tanpa baris contoh', () => {
    const html = render(createElement(FriendHistoryCard, { friends: [] }))

    expect(html).toContain('Riwayat Teman')
    expect(html).toContain(REFERRAL_EMPTY_COPY.noFriends)
    expect(html).not.toContain('Sudah Beli')
    expect(html).not.toContain('Menunggu Pembayaran')
    for (const name of LEAKED_NAMES) {
      expect(html).not.toContain(name)
    }
  })

  it('formatRewardEarned: nol, kelipatan penuh, dan sisa token', () => {
    expect(formatRewardEarned(0)).toBe('Belum ada')
    expect(formatRewardEarned(-5)).toBe('Belum ada')
    expect(formatRewardEarned(REFERRAL_REWARD_TOKENS)).toBe('+1 bulan Token AI')
    expect(formatRewardEarned(REFERRAL_REWARD_TOKENS * 3)).toBe('+3 bulan Token AI')
    expect(formatRewardEarned(REFERRAL_REWARD_TOKENS + 500)).toBe('+1 bulan +500 token AI')
    expect(formatRewardEarned(500)).toBe('+500 token AI')
  })

  it('sumber halaman bebas eyebrow, penjelas, dan warna mentah', () => {
    expect(CODE).not.toContain('Program Ajak Teman')
    expect(CODE).not.toContain('Apa itu')
    expect(CODE).not.toContain('friendStatusLabel')
    expect(CODE).not.toContain('PLAN_TIER_EXPLAIN')

    /* nol hex & nol fungsi warna mentah, hanya token design system */
    expect(CODE).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    expect(CODE).not.toMatch(/\brgba?\(/)
  })
})
