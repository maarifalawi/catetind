'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { isPublicRoute } from '@/lib/public-routes'
import {
  ONBOARDING_ROUTE,
  ONBOARDING_SESSION_KEY,
  ONBOARDING_SKIP_KEY,
  POST_ONBOARDING_ROUTE,
  isOnboardingRestart,
} from '@/lib/onboarding'

/* ── GERBANG ONBOARDING (paket 100) ──────────────────────────────────────────
   Sebelum gerbang ini, `/app/onboarding` ada tetapi TIDAK PERNAH dituju:
   setelah bayar user langsung ke `/app`, dan tidak ada satu pun pemeriksaan
   yang tahu onboarding belum selesai. Akibatnya user baru melihat Dashboard
   (dan saldo dari data lokal yang ikut termigrasi) tanpa pernah mengisi
   dompet/transaksi pertamanya.

   Gerbang ini bekerja DUA ARAH:
     · app route + belum onboarding → `/app/onboarding`
     · sudah onboarding + sedang di `/app/onboarding` → `/app`

   Prinsip "jangan mengunci karena ketidaktahuan" tetap dipegang:
     · `/api/onboarding` gagal/`known:false` → jangan redirect;
     · backend belum dikonfigurasi (demo/test) → jangan redirect;
     · penanda SESI `catet-onboarding-selesai` (bukan localStorage) dianggap
       selesai, supaya POST yang telat tidak membuat user memantul balik ke
       setup — tanpa membuat akun lain di browser yang sama ikut lolos.

   Halaman publik (landing, login, checkout, …) tidak pernah diperiksa. Dua
   halaman pengaturan dikecualikan supaya user baru tetap bisa keluar atau
   menghapus akunnya tanpa dipenjara di layar setup. */

const ESCAPE_ROUTES = ['/settings/logout', '/settings/data']

function isEscapeRoute(pathname: string): boolean {
  return ESCAPE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
}

function localOnboardingDone(): boolean {
  /* Hanya penanda SESI: kalau memakai localStorage, akun baru di browser yang
     pernah dipakai akun lain akan ikut dianggap selesai. */
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(ONBOARDING_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

/** user memilih keluar dari onboarding untuk sesi ini (bukan "selesai") */
function localOnboardingSkipped(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(ONBOARDING_SKIP_KEY) === '1'
  } catch {
    return false
  }
}

/* ── MULAI LAGI DARI ONBOARDING (kartu akun kosong) ──────────────────────────
   Tombol itu dulu `Link` polos ke `/app/onboarding`. Gerbang ini melihat
   penanda sesi "selesai" (atau jawaban server `onboarded: true`) lalu langsung
   `router.replace('/app')` — di mata user tombolnya cuma me-refresh.

   Sekarang niat user dihormati: URL `?ulang=1` membuang penanda sesi lama dan
   memaksa status `needed`. Dibaca dari `location.search` (bukan `useSearchParams`)
   karena komponen ini hidup di root layout; `useSearchParams` di sana memaksa
   seluruh app masuk Suspense/prerender dinamis. Aman saat SSR — `window` tidak
   ada → false. */
function localOnboardingRestart(): boolean {
  if (typeof window === 'undefined') return false
  return isOnboardingRestart(window.location.search)
}

/** buang penanda sesi flow sebelumnya supaya restart benar-benar mulai dari nol */
function clearLocalOnboardingMarkers(): void {
  try {
    window.sessionStorage.removeItem(ONBOARDING_SESSION_KEY)
    window.sessionStorage.removeItem(ONBOARDING_SKIP_KEY)
  } catch {
    /* private mode — status tetap dipaksa `needed` lewat state */
  }
}

export function OnboardingGate({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const publicRoute = isPublicRoute(pathname)
  const onboardingRoute =
    pathname === ONBOARDING_ROUTE || pathname.startsWith(`${ONBOARDING_ROUTE}/`)
  const [status, setStatus] = useState<'checking' | 'done' | 'needed' | 'skipped'>('checking')
  /** status server cukup diperiksa SEKALI per sesi halaman */
  const checked = useRef(false)

  /* Halaman publik adalah titik keluar/masuk akun (login, logout, checkout).
     Saat itu terjadi, status milik akun sebelumnya HARUS dibuang — kalau tidak,
     akun berikutnya di tab yang sama bisa dianggap sudah onboarding. */
  useEffect(() => {
    if (!publicRoute) return
    checked.current = false
    setStatus('checking')
  }, [publicRoute])

  useEffect(() => {
    if (publicRoute) return
    /* Niat "mulai lagi" MENANG atas penanda selesai/lewati maupun jawaban server
       — tanpa ini tombolnya terasa cuma me-refresh (lihat komentar helper).
       Dibaca LANGSUNG dari URL di dalam effect (bukan nilai hasil render) supaya
       tidak bergantung pada urutan kapan `location.search` diperbarui router. */
    if (onboardingRoute && localOnboardingRestart()) {
      clearLocalOnboardingMarkers()
      checked.current = true
      setStatus('needed')
      return
    }
    if (localOnboardingDone()) {
      setStatus('done')
      return
    }
    if (localOnboardingSkipped()) {
      setStatus('skipped')
      return
    }
    if (checked.current) return

    let active = true
    void fetch('/api/onboarding', { cache: 'no-store' })
      .then((res) => (res.ok ? (res.json() as Promise<{ known?: boolean; onboarded?: boolean }>) : null))
      .then((body) => {
        if (!active) return
        checked.current = true
        /* Tidak tahu = jangan kunci. */
        if (!body?.known) {
          setStatus('done')
          return
        }
        setStatus(body.onboarded ? 'done' : 'needed')
      })
      .catch(() => {
        if (!active) return
        checked.current = true
        setStatus('done')
      })

    return () => {
      active = false
    }
  }, [publicRoute, pathname, onboardingRoute])

  useEffect(() => {
    if (publicRoute) return
    /* `!localOnboardingDone()` di baris ini menutup pantulan yang tidak perlu:
       tepat setelah flow selesai, penanda sesi sudah ditulis SEBELUM navigasi ke
       `/app`, sementara `status` di render ini masih `needed` (state baru
       diterapkan setelah effect). Tanpa penjaga itu user sempat dilempar balik ke
       layar setup lalu dikembalikan lagi — terasa seperti refresh dua kali. */
    if (
      status === 'needed' &&
      !onboardingRoute &&
      !isEscapeRoute(pathname) &&
      !localOnboardingDone()
    ) {
      router.replace(ONBOARDING_ROUTE)
      return
    }
    /* `?ulang=1` dibaca live di sini juga: jangan pernah memantulkan user keluar
       dari layar yang JUSTRU dia minta buka. */
    if (status === 'done' && onboardingRoute && !localOnboardingRestart()) {
      router.replace(POST_ONBOARDING_ROUTE)
    }
  }, [status, publicRoute, onboardingRoute, pathname, router])

  if (publicRoute) return <>{children}</>
  if (status === 'needed' && !onboardingRoute && !isEscapeRoute(pathname)) return null
  if (status === 'done' && onboardingRoute) return null
  return <>{children}</>
}
