'use client'

import { useEffect, useRef, type RefObject } from 'react'

/* ── INPUT FOCUS LIFECYCLE — bottom sheet × keyboard virtual ─────────────────
   Satu tempat yang menangani "apa yang terjadi saat keyboard HP terbuka di atas
   bottom sheet", supaya ~18 sheet yang memakai `BudgetSheet` (registrasi di
   /checkout + semua form tambah di /app/*) tidak pernah punya perilaku berbeda.

   MASALAHNYA (iOS Safari & Chrome Android). Sheet `fixed bottom-0` terlihat
   benar sampai sebuah input difokuskan. Karena keyboard TIDAK menyusutkan layout
   viewport di iOS Safari, `100vh`/`dvh`, `bottom: 0`, dan `max-height` yang
   diturunkan darinya tetap mengacu ke tinggi layar PENUH — bukan ruang yang
   benar-benar terlihat. Yang berubah cuma *visual viewport*: tingginya menyusut
   dan `offsetTop`-nya bergeser (Safari menggeser visual viewport untuk mengejar
   input). Akibatnya footer sheet "terlepas" dari dasarnya dan mengambang di
   tengah layar, sementara elemen `fixed` latar (CTA "Daftar & mulai" di
   /checkout) tetap menempel ke layout viewport dan bocor menembus area sheet.

   SOLUSINYA — tiga lapis, semuanya di sini:
     1. `useSheetBackgroundIsolation` — latar dibekukan (overflow hidden +
        `inert`). Tidak ada elemen sticky/fixed latar yang bisa ikut dihitung
        ulang, dan tidak ada sentuhan yang menembus ke belakang sheet.
     2. `useSheetViewportCage` — sebuah "kandang" setinggi visual viewport yang
        sebenarnya, diisi dari event `resize` **dan** `scroll`
        `window.visualViewport`. Sheet (`bottom-0`) menempel di dasar kandang,
        jadi footer SELALU tepat di atas keyboard — di iOS maupun Chrome.
     3. `revealFieldInSheet` — kalau field yang fokus masih tertutup di dalam
        area gulir sheet, area itu digeser sendiri. Sengaja menulis `scrollTop`
        langsung (bukan `scrollIntoView`) supaya tidak pernah menggulir WINDOW:
        menggulir window justru menggeser visual viewport — akar bug sheet
        "melayang" itu sendiri.

   Kandang-nya sendiri (`[data-catetind-sheet-cage]`) didefinisikan di
   app/globals.css: di sana ia diberi `transform`, yang menjadikannya containing
   block supaya sheet `fixed` milik Vaul berhenti di dasar KANDANG, bukan di
   dasar layout viewport.
   ────────────────────────────────────────────────────────────────────────── */

/** ambang (px) penyusutan visual viewport yang dianggap "keyboard terbuka" */
export const KEYBOARD_OPEN_THRESHOLD = 120

export interface SheetViewport {
  /** tinggi area yang benar-benar terlihat (px) */
  height: number
  /** jarak tepi atas visual viewport dari tepi atas layout viewport (px) */
  top: number
  /** true kalau keyboard virtual kemungkinan besar sedang terbuka */
  keyboardOpen: boolean
}

/**
 * Geometri kandang dari angka mentah visual viewport. Fungsi MURNI (tanpa DOM)
 * supaya aturannya bisa dikunci test — `use-sheet-viewport-cage.test.ts`.
 *
 * `baseHeight` = tinggi visual viewport TERBESAR yang pernah terlihat, dipakai
 * sebagai acuan "tanpa keyboard". Acuan terbesar (bukan `window.innerHeight`)
 * membuat deteksi tetap benar di dua mesin yang berbeda:
 *   • iOS Safari      → layout viewport TIDAK menyusut, jadi
 *                       `window.innerHeight - viewportHeight` besar;
 *   • Chrome Android  → `interactive-widget=resizes-content` membuat layout
 *                       viewport IKUT menyusut, jadi selisih itu mendekati nol.
 */
export function computeSheetViewport(input: {
  /** `visualViewport.height` saat ini (px) */
  viewportHeight: number
  /** `visualViewport.offsetTop` saat ini (px) */
  viewportTop: number
  /** `window.innerHeight` — tinggi layout viewport (px) */
  layoutHeight: number
  /** acuan "tanpa keyboard": tinggi visual viewport terbesar yang pernah terlihat */
  baseHeight: number
}): SheetViewport {
  const height = Math.max(1, Math.round(input.viewportHeight))
  const top = Math.max(0, Math.round(input.viewportTop))
  const base = Math.max(input.baseHeight, input.layoutHeight, height)
  return { height, top, keyboardOpen: base - height > KEYBOARD_OPEN_THRESHOLD }
}

/**
 * Geser SATU area gulir di dalam sheet (`[data-catetind-sheet-body]`) sampai
 * field yang fokus terlihat penuh. Menulis `scrollTop` langsung — bukan
 * `scrollIntoView` — supaya tidak pernah menggulir WINDOW: di iOS, menggulir
 * window menggeser visual viewport (`offsetTop`) yang justru membuat sheet
 * melayang. Tidak melakukan apa pun kalau field sudah terlihat.
 */
export function revealFieldInSheet(root: HTMLElement, field: HTMLElement, pad = 16): void {
  const scroller = field.closest<HTMLElement>('[data-catetind-sheet-body]')
  if (!scroller || !root.contains(scroller)) return
  const area = scroller.getBoundingClientRect()
  const rect = field.getBoundingClientRect()
  if (rect.bottom > area.bottom - pad) {
    scroller.scrollTop += rect.bottom - area.bottom + pad
  } else if (rect.top < area.top + pad) {
    scroller.scrollTop -= area.top - rect.top + pad
  }
}

/**
 * Sematkan elemen "kandang" ke visual viewport (mobile).
 *
 * Menulis dua CSS custom property pada kandang — `--catetind-vv-height` dan
 * `--catetind-vv-top` — lalu menandai `data-keyboard-open`. Ditulis lewat `ref`,
 * BUKAN state React: event ini bisa memicu puluhan kali per detik selama animasi
 * keyboard, dan re-render seluruh isi sheet di tengah animasi itu justru membuat
 * terasa "patah-patah". `active` hendaknya `open && <pasangan mobile>` supaya
 * tidak bekerja sia-sia saat sheet tertutup atau di desktop.
 */
export function useSheetViewportCage(active: boolean): RefObject<HTMLDivElement | null> {
  const cageRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!active) return
    const cage = cageRef.current
    if (!cage) return

    const viewport = window.visualViewport
    let frame = 0
    let revealTimer = 0
    /** acuan "tanpa keyboard"; di-reset saat orientasi berubah */
    let baseHeight = viewport?.height ?? window.innerHeight

    /** pastikan field yang fokus terlihat setelah geometri kandang mengendap */
    const scheduleReveal = () => {
      if (revealTimer) window.clearTimeout(revealTimer)
      revealTimer = window.setTimeout(() => {
        const focused = document.activeElement
        if (focused instanceof HTMLElement && cage.contains(focused)) {
          revealFieldInSheet(cage, focused)
        }
      }, 140)
    }

    const apply = () => {
      frame = 0
      const metrics = computeSheetViewport({
        viewportHeight: viewport?.height ?? window.innerHeight,
        viewportTop: viewport?.offsetTop ?? 0,
        layoutHeight: window.innerHeight,
        baseHeight,
      })
      baseHeight = Math.max(baseHeight, metrics.height)
      cage.style.setProperty('--catetind-vv-height', `${metrics.height}px`)
      cage.style.setProperty('--catetind-vv-top', `${metrics.top}px`)
      cage.dataset.keyboardOpen = metrics.keyboardOpen ? 'true' : 'false'
      scheduleReveal()
    }

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply)
    }
    const onOrientation = () => {
      baseHeight = viewport?.height ?? window.innerHeight
      schedule()
    }
    const onFocusIn = () => scheduleReveal()

    apply()
    /* `resize` = Android/Chrome (viewport ikut menyusut); `scroll` = iOS Safari
       (visual viewport DIGESER tanpa berubah tinggi). Versi lama hanya
       mendengarkan `resize` — dan itulah yang melepas sheet dari dasarnya. */
    viewport?.addEventListener('resize', schedule)
    viewport?.addEventListener('scroll', schedule)
    window.addEventListener('resize', schedule)
    window.addEventListener('orientationchange', onOrientation)
    cage.addEventListener('focusin', onFocusIn)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      if (revealTimer) window.clearTimeout(revealTimer)
      viewport?.removeEventListener('resize', schedule)
      viewport?.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('orientationchange', onOrientation)
      cage.removeEventListener('focusin', onFocusIn)
      cage.style.removeProperty('--catetind-vv-height')
      cage.style.removeProperty('--catetind-vv-top')
      delete cage.dataset.keyboardOpen
    }
  }, [active])

  return cageRef
}

/* penghitung lintas-instance: kalau dua sheet terbuka bertumpuk (jarang — repo
   ini selalu menutup sheet sebelum membuka yang lain), kunci latar baru
   benar-benar dilepas setelah yang TERAKHIR menutup. */
let isolationDepth = 0

/**
 * Bekukan latar aplikasi selagi sheet terbuka.
 *
 * `inert` menghapus seluruh subtree latar dari tab order + pointer +
 * accessibility tree, sehingga elemen sticky/fixed latar benar-benar mati dan
 * tidak bisa ikut "bicara" saat visual viewport bergeser karena keyboard. Kunci
 * gulirnya (`overflow: hidden`) dipasang lewat ATRIBUT + CSS di app/globals.css
 * — sengaja BUKAN dengan menulis `body.style.overflow`. Vaul sudah mengunci body
 * lewat *inline style* (`react-remove-scroll`), dan karena effect anak berjalan
 * lebih dulu daripada effect kita, menyimpan-lalu-memulihkan inline itu bisa
 * saling menimpa dan meninggalkan body terkunci 'hidden' selamanya. Atribut kita
 * independen, jadi tidak mungkin bentrok saat ditutup.
 *
 * Wrapper yang dibekukan adalah `[data-catetind-page-root]` (dipasang di
 * app/layout.tsx); sheet-nya sendiri di-render Vaul lewat PORTAL ke <body>, jadi
 * ia ada DI LUAR wrapper itu dan tetap interaktif.
 */
export function useSheetBackgroundIsolation(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const body = document.body
    const roots = Array.from(
      document.querySelectorAll<HTMLElement>('[data-catetind-page-root]'),
    )

    isolationDepth += 1
    if (isolationDepth === 1) body.dataset.catetindSheetOpen = 'true'
    for (const root of roots) root.setAttribute('inert', '')

    return () => {
      isolationDepth = Math.max(0, isolationDepth - 1)
      if (isolationDepth > 0) return
      delete body.dataset.catetindSheetOpen
      for (const root of roots) root.removeAttribute('inert')
    }
  }, [active])
}
