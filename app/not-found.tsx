import { PhoneStage } from '@/components/catetind/phone-stage'
import { NotFoundScreen } from '@/components/catetind/not-found-screen'

/**
 * 404 / Not Found (inventaris #32) — penangkap semua URL tak dikenal.
 *
 * TANPA `metadata` di sini dengan sengaja: `not-found.tsx` bukan halaman biasa,
 * ia dirender oleh root layout (`app/layout.tsx`) yang sudah memegang metadata
 * global (title, description, ikon). Menambah metadata lokal hanya akan
 * menimpa judul merek dengan judul teknis — dan itu bertentangan dengan nada
 * halaman ini, yang justru ingin terasa tenang, bukan seperti sistem berteriak.
 * Permintaan halaman tetap dijawab dengan status 404 HTTP yang benar oleh Next.
 */
export default function NotFoundPage() {
  return (
    <PhoneStage>
      <NotFoundScreen />
    </PhoneStage>
  )
}
