import type { ReactElement } from 'react'
import {
  SHARE_CARD_DOMAIN,
  SHARE_HASHTAG,
  SHARE_IMAGE_COPY,
  SHARE_STAGE_CAPTION,
  achievementRows,
  shareHeadline,
  type ShareCard,
} from '@/lib/data/share'

/* ── GAMBAR KARTU PENCAPAIAN (paket 63 · `next/og`) ──────────────────────────
   Membangkitkan gambar dari kartu yang SAMA dengan halaman `/share/[id]`
   (`share-achievement-card.tsx`) — tanpa layanan luar, tanpa aset baru. Isinya
   HANYA field yang boleh publik (PRD 6572–6576): nol angka rupiah.

   Catatan implementasi: `ImageResponse` merender lewat mesin flexbox sederhana,
   jadi setiap elemen berisi anak WAJIB `display:flex`, dan warna ditulis inline
   memakai token palet (bukan kelas Tailwind). Ikon digambar sebagai bentuk
   (lingkaran kecil) — bukan emoji — supaya tidak bergantung pada font emoji. */

export const SHARE_OG_SIZE = { width: 1200, height: 630 }
export const SHARE_STORY_SIZE = { width: 1080, height: 1920 }

const CARD_BG = 'linear-gradient(135deg,#45594e 0%,#52685c 100%)'
const CREAM = '#fbf6d9'
const MINT = '#91bb9e'
const HAIRLINE = 'rgba(251,246,217,0.24)'
const MUTED = 'rgba(251,246,217,0.62)'
const DOT_BG = 'rgba(145,187,158,0.22)'

/** satu baris pencapaian: titik mint + teks (ikon sebagai bentuk, bukan emoji) */
function ImageRow({ text, fontSize }: { text: string; fontSize: number }): ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: fontSize * 0.55 }}>
      <div
        style={{
          display: 'flex',
          width: fontSize * 1.05,
          height: fontSize * 1.05,
          borderRadius: fontSize,
          background: DOT_BG,
        }}
      />
      <div style={{ display: 'flex', fontSize, fontWeight: 600, color: CREAM }}>{text}</div>
    </div>
  )
}

/** versi pratinjau tautan (OG/Twitter) — 1200×630 */
export function ShareOgImage({ card }: { card: ShareCard }): ReactElement {
  const rows = achievementRows(card)
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: CARD_BG,
        color: CREAM,
        padding: '56px 64px',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', fontSize: 32, fontWeight: 800, letterSpacing: -0.5, color: CREAM }}>
          {SHARE_IMAGE_COPY.brand}
        </div>
        <div style={{ display: 'flex', fontSize: 22, fontWeight: 600, color: MINT }}>{card.monthLabel}</div>
      </div>

      <div style={{ display: 'flex', marginTop: 30, fontSize: 46, fontWeight: 800, lineHeight: 1.15, maxWidth: 940 }}>
        {shareHeadline(card.ownerName)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 30, gap: 16 }}>
        {rows.map((row) => (
          <ImageRow key={row.key} text={row.text} fontSize={28} />
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 34,
          borderTop: `2px solid ${HAIRLINE}`,
          paddingTop: 18,
        }}
      >
        <div style={{ display: 'flex', fontSize: 26, fontWeight: 800, color: MINT }}>{SHARE_HASHTAG}</div>
        <div style={{ display: 'flex', fontSize: 20, color: MUTED }}>
          {SHARE_IMAGE_COPY.footer} · {SHARE_CARD_DOMAIN}
        </div>
      </div>
    </div>
  )
}

/** versi Story (IG/WhatsApp Status) — 1080×1920, dipakai tombol "Share Report" */
export function ShareStoryImage({ card }: { card: ShareCard }): ReactElement {
  const rows = achievementRows(card)
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: CARD_BG,
        color: CREAM,
        padding: '120px 88px',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, letterSpacing: -0.5 }}>
        {SHARE_IMAGE_COPY.brand}
      </div>
      <div style={{ display: 'flex', marginTop: 12, fontSize: 26, fontWeight: 600, color: MINT }}>
        {SHARE_IMAGE_COPY.eyebrow} · {card.monthLabel}
      </div>

      <div style={{ display: 'flex', marginTop: 56, fontSize: 64, fontWeight: 800, lineHeight: 1.1 }}>
        {shareHeadline(card.ownerName)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 56, gap: 26 }}>
        {rows.map((row) => (
          <ImageRow key={row.key} text={row.text} fontSize={40} />
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: 80,
          background: '#ffffff',
          borderRadius: 40,
          padding: '40px 32px',
        }}
      >
        <div style={{ display: 'flex', width: 180, height: 180, borderRadius: 90, background: DOT_BG }} />
        <div style={{ display: 'flex', marginTop: 24, fontSize: 30, fontWeight: 600, color: '#45594e', textAlign: 'center' }}>
          {SHARE_STAGE_CAPTION[card.plantStage]}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 64,
          borderTop: `2px solid ${HAIRLINE}`,
          paddingTop: 28,
        }}
      >
        <div style={{ display: 'flex', fontSize: 36, fontWeight: 800, color: MINT }}>{SHARE_HASHTAG}</div>
        <div style={{ display: 'flex', fontSize: 26, color: MUTED }}>{SHARE_CARD_DOMAIN}</div>
      </div>
    </div>
  )
}
