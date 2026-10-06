import type { Metadata } from 'next'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { SharePreviewScreen } from '@/components/catetind/share-preview-screen'
import {
  SHARE_UNKNOWN_METADATA_DESCRIPTION,
  SHARE_UNKNOWN_METADATA_TITLE,
  buildShareUrl,
  getShareCard,
  shareMetadataDescription,
  shareMetadataTitle,
} from '@/lib/data/share'

/**
 * Share Preview Publik (/share/[id]) — inventaris #16, halaman PUBLIK.
 *
 * Sisi penerima dari Loop 2 & 3 (PRD 6547–6633): orang yang klik tautan kartu
 * di WhatsApp/IG. Karena itu dua hal dikerjakan di server:
 *
 *   1. `generateMetadata` — judul & deskripsi yang enak dipratinjau, TANPA satu
 *      pun angka keuangan (PRD 6572–6576). Untuk id tak dikenal, judulnya
 *      generik: jangan mengarang nama pemilik (PRD 5174–5177).
 *   2. Pembacaan kartu diteruskan ke komponen sebagai `id` — halaman tetap bisa
 *      dibuka tanpa login, dan status "kartu tidak ada" ditangani sebagai empty
 *      state hangat, bukan 404 kaku.
 *
 * `robots: noindex` dengan SENGAJA: kartu ini personal (ada nama panggilan
 * pemiliknya) dan tautannya dibuat untuk dibagikan dari orang ke orang, bukan
 * untuk diindeks mesin pencari. `follow` tetap `true` supaya kalau toh muncul,
 * tautannya mengalir ke halaman publik lain, bukan jadi jalan buntu.
 *
 * `PhoneStage plain` — seperti `/login`, `/checkout`, dan `/join/[code]`: layar
 * fokus tanpa sidebar, dan `MobileBottomNav` + AI chat widget menyembunyikan
 * diri di prefix `/share` (pengunjungnya bukan user app).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const card = getShareCard(id)

  const title = card === 'unknown' ? SHARE_UNKNOWN_METADATA_TITLE : shareMetadataTitle(card)
  const description =
    card === 'unknown' ? SHARE_UNKNOWN_METADATA_DESCRIPTION : shareMetadataDescription(card)

  return {
    title,
    description,
    /* Pratinjau share = judul + deskripsi + GAMBAR. Sejak paket 63 gambarnya
       NYATA: `opengraph-image.tsx` / `twitter-image.tsx` di folder rute ini
       membangkitkan kartu 1200×630 dari data yang sama (`next/og`), dan Next
       memasangnya otomatis ke metadata — jadi tidak ada URL gambar yang dikarang
       di sini. Isinya tetap bebas angka rupiah (PRD 6572–6576). */
    openGraph: {
      type: 'website',
      siteName: 'CatetInd',
      title,
      description,
      url: card === 'unknown' ? undefined : buildShareUrl(card.id),
    },
    twitter: { card: 'summary', title, description },
    robots: { index: false, follow: true },
  }
}

export default async function SharePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <PhoneStage plain>
      <SharePreviewScreen id={id} />
    </PhoneStage>
  )
}
