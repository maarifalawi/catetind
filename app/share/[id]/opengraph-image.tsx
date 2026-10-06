import { ImageResponse } from 'next/og'
import { SHARE_IMAGE_COPY, getShareCard } from '@/lib/data/share'
import { SHARE_OG_SIZE, ShareOgImage } from '@/components/catetind/share-og-image'

/* ── PRATINJAU TAUTAN (Open Graph) untuk /share/[id] — paket 63 ───────────────
   Sebelum paket ini metadata `openGraph.images` sengaja KOSONG (memasang aset
   lain = memalsukan pratinjau). Sekarang gambarnya NYATA: dibangkitkan dari kartu
   yang sama dengan halaman, lewat `next/og` — tanpa layanan luar. Isinya tetap
   privacy-safe (jumlah catatan, hari konsisten, milestone, tahap tanaman; nol
   rupiah, PRD 6572–6576). Next otomatis memasang berkas ini ke metadata rute ini. */

export const alt = 'Kartu pencapaian CatetInd'
export const size = SHARE_OG_SIZE
export const contentType = 'image/png'

/** gambar netral untuk id kartu yang tidak dikenal (jangan mengarang nama) */
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
