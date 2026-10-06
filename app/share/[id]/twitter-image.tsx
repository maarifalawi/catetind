import { ImageResponse } from 'next/og'
import { SHARE_IMAGE_COPY, getShareCard } from '@/lib/data/share'
import { SHARE_OG_SIZE, ShareOgImage } from '@/components/catetind/share-og-image'

/* ── PRATINJAU TAUTAN (Twitter/X) untuk /share/[id] — paket 63 ────────────────
   Sama isinya dengan `opengraph-image.tsx`; dipisah karena Next memakai berkas
   ini khusus untuk kartu Twitter/X. Lihat catatan privasi di berkas itu. */

export const alt = 'Kartu pencapaian CatetInd'
export const size = SHARE_OG_SIZE
export const contentType = 'image/png'

function UnknownCard(): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg,#45594e 0%,#52685c 100%)',
        color: '#fbf6d9',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', fontSize: 44, fontWeight: 800 }}>{SHARE_IMAGE_COPY.brand}</div>
      <div style={{ display: 'flex', marginTop: 16, fontSize: 26, color: '#91bb9e' }}>
        Kartu ini sudah tidak tersedia
      </div>
    </div>
  )
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const card = getShareCard(id)
  return new ImageResponse(card === 'unknown' ? <UnknownCard /> : <ShareOgImage card={card} />, SHARE_OG_SIZE)
}
