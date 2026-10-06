import { ImageResponse } from 'next/og'
import { getShareCard } from '@/lib/data/share'
import { SHARE_STORY_SIZE, ShareStoryImage } from '@/components/catetind/share-og-image'

/* ── GET /api/share/[id]/image — kartu versi STORY (1080×1920) — paket 63 ─────
   Dipakai tombol "Share Report" di panel bagikan: kartu ini bisa diunduh/dibagikan
   sebagai GAMBAR (PRD 6580–6611), bukan cuma tautan. Isinya privacy-safe — nol
   angka rupiah (PRD 6572–6576). Publik (tanpa sesi): kartu ini memang untuk
   dibagikan, sama seperti halaman `/share/[id]`. */

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const card = getShareCard(id)
  if (card === 'unknown') {
    return new Response('Kartu tidak ditemukan', { status: 404 })
  }

  return new ImageResponse(<ShareStoryImage card={card} />, {
    ...SHARE_STORY_SIZE,
    headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  })
}
