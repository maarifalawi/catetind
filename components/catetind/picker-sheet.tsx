'use client'

import { useEffect, useId, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── PickerSheet — cangkang bersama pemilih (kategori & dompet), paket 69 ─────
   Satu wujud, dua rasa: bottom sheet di layar kecil, panel ngambang di layar
   besar — sama seperti shell modal CatetInd yang sudah ada (top-up-modal).

   PAKET 70 — KENAPA HOST-NYA DICARI DARI TOMBOL PEMICU (`closest`), BUKAN
   `document.querySelector`. Perilaku lama mencari elemen PERTAMA yang cocok di
   seluruh dokumen (`[data-catetind-sheet]` / `[role=dialog][aria-modal]`).
   Masalahnya: app ini punya BANYAK dialog yang sudah ter-mount walau tertutup
   (modal web transaksi di sidebar, panel Overview, modal rekap, dst). Yang
   ditemukan hampir pasti dialog TERTUTUP yang tidak terlihat — jadi pemilihnya
   benar-benar dirender, tapi di dalam panel transparan yang berada di luar
   layar. Dari sisi user: "kategori & dompet nggak bisa dipencet, nggak muncul
   apa-apa".

   Obatnya deterministik: tiap pemilih menerima `anchor` = tombol pemicunya
   sendiri, lalu host dicari dengan `anchor.closest(...)` — ancestor TERDEKAT dari
   tombol itu, yang PASTI sheet/modal yang sedang membungkusnya (Vaul Drawer,
   BudgetSheet, atau panel modal web). Tidak ada lagi tebakan urutan DOM.

   KENAPA DI-PORTAL KE DALAM SHEET TRANSAKSI, BUKAN KE `document.body`:
   pemilih ini dibuka DARI DALAM bottom sheet transaksi (Vaul). Vaul memakai
   Radix DismissableLayer, yang menutup panel begitu pointer-down terjadi "di
   luar" isi panel. Elemen yang di-portal ke `body` DIANGGAP di luar — jadi
   mengetuk kategori akan ikut menutup form transaksi yang sedang diisi. Karena
   itu overlay-nya disuntikkan ke elemen sheet/modal yang membungkus tombolnya;
   kalau pemilih dipakai mandiri (tanpa anchor/sheet), ia jatuh ke
   `document.body` seperti portal biasa.

   `fixed inset-0` + `z-[90]`: kalau host-nya punya transform (Vaul menyisipkan
   transform saat animasi), overlay terkurung rapi di dalam sheet; kalau tidak,
   ia menutup viewport. Dua-duanya benar — dan yang penting, elemen ini tetap
   keturunan DOM sheet, jadi Vaul tidak pernah menganggapnya "luar". */

/** selector pemilik pemilih: shell sheet CatetInd atau dialog modal ngambang */
const PICKER_HOST_SELECTOR =
  '[data-catetind-sheet="true"], [role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]'

/* ── PAKET 78 — BAHASA "TERPILIH" YANG LEMBUT + GUTTER DAFTAR ────────────────
   Dua hal yang lahir dari keluhan pemilik produk atas pemilih "Pilih Dompet":

   1. STROKE OPSI PERTAMA TERPOTONG. Badan gulir pemilih
      (`overflow-y-auto px-4 …`) tidak punya jarak ATAS, sedangkan Tailwind
      menggambar `ring`/`ring-2` di LUAR kotak elemen (box-shadow). Akibatnya
      stroke opsi paling atas — dan opsi terpilih kalau ia yang pertama — terpotong
      tepi atas area gulir. Karena `overflow-y: auto` membuat `overflow-x` juga
      `auto`, seluruh isi diklip di tepi padding box. Obatnya bukan menghapus
      ring-nya (itu justru satu-satunya penanda "terpilih"), tapi memberi GUTTER
      di dalam area gulir: `pt-1` pada badan gulir di bawah + `-mx-1 px-1` pada
      daftarnya, sehingga stroke punya ruang 4px dan tidak ada satu piksel pun
      yang terpotong — tanpa menggeser satu pun elemen (gutter horizontal
      dikompensasi margin negatif). Ini berlaku untuk SEMUA pemilih yang memakai
      cangkang ini (dompet & kategori), bukan cuma dompet.

   2. STATUS TERPILIH TERLALU KERAS. Opsi aktif dulu `ring-2 ring-forest` —
      garis 2px hijau tua mengelilingi kotak. Sekarang satu bahasa terpilih yang
      lembut dan bisa dipakai pemilih mana pun: isian `bg-mint/30` + garis tipis
      `ring-leaf/45` + bayangan halus, dengan `text-forest` tetap dipertahankan
      supaya kontras teks tidak turun. Kelasnya tinggal di SATU tempat ini supaya
      pemilih berikutnya tidak menemukan bahasa "terpilih" versi keduanya.

   Catatan penting: `IDLE` & `ACTIVE` masing-masing sudah membawa `ring-1`-nya
   sendiri. Jangan digabung dengan `cn(base, active && ACTIVE)` — kelas
   background/ring yang bertabrakan diselesaikan oleh URUTAN CSS Tailwind, bukan
   urutan di atribut `class`, jadi hasilnya bisa tak terduga. Pakai salah satu. */
export const PICKER_OPTION_IDLE =
  'bg-cream ring-1 ring-soil/10 hover:bg-sage/40'
export const PICKER_OPTION_ACTIVE =
  'bg-mint/30 ring-1 ring-leaf/45 shadow-[0_8px_20px_-14px_rgba(69,89,78,0.65)]'
/** gutter daftar opsi (lihat catatan 1 di atas): 4px ruang stroke di semua sisi */
export const PICKER_LIST_GUTTER = '-mx-1 px-1 pt-1'

/**
 * elemen host overlay; `null` = belum siap (SSR / belum mount).
 *
 * `anchor` = tombol pemicu pemilih. Host-nya dicari dari anchor itu sendiri
 * (`closest`), jadi tidak mungkin lagi "nyasar" ke dialog lain yang kebetulan
 * sudah ter-mount. Tanpa anchor (pemakaian mandiri) → `document.body`.
 */
function useOverlayHost(open: boolean, anchor?: RefObject<HTMLElement | null>): HTMLElement | null {
  const [host, setHost] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) {
      setHost(null)
      return
    }
    const owner = anchor?.current?.closest<HTMLElement>(PICKER_HOST_SELECTOR) ?? null
    setHost(owner ?? document.body)
  }, [open, anchor])

  return host
}

export function PickerSheet({
  open,
  onClose,
  title,
  subtitle,
  onBack,
  backLabel,
  closeLabel,
  anchor,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  /** baris kecil di bawah judul (mis. "9 grup · 52 kategori") */
  subtitle?: ReactNode
  /** diisi = tombol kembali muncul di kiri (Layer 2/3 → Layer 1) */
  onBack?: () => void
  backLabel?: string
  closeLabel: string
  /**
   * tombol pemicu pemilih. Dipakai mencari sheet/modal PEMILIKNYA lewat
   * `closest()` — lihat catatan "PAKET 70" di atas.
   */
  anchor?: RefObject<HTMLElement | null>
  children: ReactNode
}) {
  const host = useOverlayHost(open, anchor)
  const reduce = useReducedMotion()
  const titleId = useId()

  /* ESC menutup LAPISAN INI dulu, bukan sheet transaksi di belakangnya: listener
     fase capture di `window` + stopPropagation, jadi handler modal (bubble) dan
     Radix (document) tidak pernah melihat tombolnya. */
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      if (onBack) onBack()
      else onClose()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, onBack, onClose])

  if (!host) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center lg:items-center lg:p-6"
          data-lenis-prevent
        >
          {/* backdrop — menutup pemilih saja; ketukan di sini TIDAK menutup form */}
          <motion.button
            type="button"
            aria-label={closeLabel}
            tabIndex={-1}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 cursor-default bg-ink/55"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            /* penanda "ini pemilih, bukan pemilik" — supaya pencarian host
               (`closest`) & alat bantu apa pun tidak pernah menjadikan pemilih
               sebagai host dirinya sendiri */
            data-catetind-picker="true"
            aria-labelledby={titleId}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 26 }}
            transition={
              reduce ? { duration: 0.12 } : { type: 'spring', stiffness: 470, damping: 40 }
            }
            className={cn(
              'relative flex max-h-[86dvh] w-full max-w-md flex-col overflow-hidden',
              'rounded-t-[2rem] bg-cream shadow-[0_-24px_60px_-24px_rgba(69,89,78,0.55)] ring-1 ring-soil/12 outline-none',
              'lg:max-h-[80vh] lg:rounded-[2rem] lg:shadow-[0_28px_70px_-24px_rgba(69,89,78,0.5)]',
            )}
          >
            <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-ink/12" aria-hidden />

            <header className="flex shrink-0 items-center gap-2 px-4 pt-3 pb-2 sm:px-5">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label={backLabel}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage text-forest transition-colors hover:bg-mint-soft"
                >
                  <ChevronLeft className="size-4" strokeWidth={2.4} />
                </button>
              )}
              <div className="min-w-0 flex-1">
                <h2
                  id={titleId}
                  className="truncate font-display text-lg font-semibold tracking-tight text-forest"
                >
                  {title}
                </h2>
                {subtitle ? <p className="mt-0.5 text-[11.5px] text-forest/50">{subtitle}</p> : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-soil/12 transition-colors hover:bg-sage"
              >
                <X className="size-4" />
              </button>
            </header>

            {/* ── badan gulir (PAKET 78) ──────────────────────────────────────
                `pt-1` = GUTTER ATAS: tanpa ini, stroke (`ring`) opsi paling atas
                terpotong tepi area gulir karena `ring` digambar di luar kotak
                elemen, sedangkan `overflow-y-auto` mengklip di tepi padding box.
                Header & handle tetap `shrink-0` di luar area gulir, jadi ia tidak
                ikut tergulir (perilaku rounded/overflow-hidden panel TIDAK
                berubah). */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-5">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    host,
  )
}
