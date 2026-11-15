import type { Metadata } from 'next'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { JointScreen } from '@/components/catetind/joint-screen'
import { JOINT_JOIN_PARAM, isJoinIntentParam } from '@/lib/data/joint-invite'

export const metadata: Metadata = {
  title: 'Joint Wallet | CatetInd',
  description:
    'Dompet bersama untuk 2–4 orang: buku besar bersama (bukan saldo rekening), pembagian fleksibel (bagi rata sebagian anggota, persentase, nominal), pelunasan per pasangan, kelola anggota, timeline bersama, dan sinkronisasi realtime ke semua perangkat.',
}

/**
 * `/joint?kode=1` = pintu masuk langsung ke form "Gabung pakai kode".
 *
 * Tanpa ini, orang yang DIUNDANG hanya menemukan tombol "Buat Dompet & Ajak
 * Pasangan" — persis keluhan "input kodenya di mana?". Nilainya dibaca di server
 * (Next 16: `searchParams` adalah Promise) lalu diteruskan sebagai prop awal, jadi
 * render pertama sudah membuka form yang benar tanpa kedipan.
 *
 * `?kode=<isi kode>` sengaja TIDAK diisi otomatis: halaman ini bukan halaman
 * otorisasi, dan kode tetap harus diketik/ditempel lalu dikonfirmasi user.
 */
export default async function JointPage({
  searchParams,
}: {
  searchParams: Promise<{ [JOINT_JOIN_PARAM]?: string | string[] }>
}) {
  const params = await searchParams

  return (
    <PhoneStage>
      <JointScreen initialEntry={isJoinIntentParam(params[JOINT_JOIN_PARAM]) ? 'join' : 'choice'} />
    </PhoneStage>
  )
}