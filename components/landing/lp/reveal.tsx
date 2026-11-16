import type { CSSProperties, ReactNode } from 'react'

/* ── REVEAL LANDING (meniru "appear animation" Framer) ───────────────────────
   Export Framer menyimpan animasi masuk di `script[type="framer/appear"]`.
   Nilainya (dibaca dari `docs/landing/framer-spec.json` + data appear):

     elemen          initial                    transition
     ─────────────   ────────────────────────   ─────────────────────────────
     nav              opacity .001, y -80        spring bounce .2, duration 1
     heading (h1)     opacity .001, y 48, skewY 1
     pill eyebrow     opacity .001, y 24
     sub-judul        opacity .001, y 48, delay .2
     CTA              opacity .001, y 72, delay .4
     social proof     opacity .001, y 96, delay .6
     mockup           opacity .001, y 128, scale .9, delay .6

   ── KENAPA BUKAN `motion.div` LAGI (perbaikan kecepatan muat landing) ──────
   Versi lama merender `motion.div` dengan `initial={{ opacity: 0, … }}`. Artinya
   HTML dari server SUDAH membawa `style="opacity:0"` untuk setiap elemen hero
   (terukur: 18 elemen di `https://catetind.com/`), sehingga pengunjung melihat
   layar putih sampai seluruh chunk JS selesai diunduh + framer-motion hydrate +
   spring 1 detik selesai. Di koneksi lambat itu berarti beberapa detik kosong.

   Sekarang animasi yang sama dikerjakan CSS (app/globals.css →
   `landing-reveal-in`): mulai dari frame pertama, tidak menunggu JS, dan tetap
   berjalan kalau JS gagal dimuat. Komponen ini jadi server component biasa —
   framer-motion tidak lagi ikut ke bundle hero/nav.

   TRADE-OFF yang disengaja: dulu section di bawah lipatan baru beranimasi saat
   digulir (`whileInView`). Tanpa JS itu tidak mungkin; animasi mulai saat
   halaman tampil dan selesai dalam ~0,8 detik, jadi saat pengunjung menggulir
   section sudah tampil penuh (tidak pernah ada section kosong). Angka Framer di
   atas tetap satu-satunya sumber kebenaran, dan `prefers-reduced-motion`
   dihormati lewat media query di globals.css. */

export type LandingRevealProps = {
  children: ReactNode
  className?: string
  /** jarak geser vertikal awal (px) — samakan dengan nilai Framer */
  y?: number
  /** jeda mulai (detik) */
  delay?: number
  /** skala awal (mockup hero memakai 0.9) */
  scale?: number
  /** skewY awal (heading hero memakai 1deg) */
  skewY?: number
  /**
   * `load`  → animasi jalan begitu halaman tampil (hero & navbar; di export
   *           Framer semua elemen hero memakai appear-on-load);
   * `view`  → section di bawah lipatan. Keduanya CSS, jadi tidak ada lagi
   *           perbedaan waktu mulai yang bergantung pada hidrasi JS.
   */
  trigger?: 'load' | 'view'
}

export function LandingReveal({
  children,
  className,
  y = 24,
  delay = 0,
  scale = 1,
  skewY = 0,
  trigger = 'view',
}: LandingRevealProps) {
  /* Custom property, bukan `transform` langsung: keyframe butuh nilai awal yang
     berbeda per elemen, dan cara ini membuat keyframe-nya tetap satu (di
     app/globals.css → `landing-reveal-in`) untuk semua pemakai. */
  const style = {
    '--lr-y': `${y}px`,
    '--lr-scale': String(scale),
    '--lr-skew': `${skewY}deg`,
    '--lr-delay': `${Math.round(delay * 1000)}ms`,
  } as CSSProperties

  /* HERO/NAVBAR (`trigger="load"`) TIDAK memudar, hanya bergeser.
     Alasannya bukan selera: Chrome TIDAK menghitung elemen ber-opacity 0 sebagai
     kandidat Largest Contentful Paint. Selama hero memudar dari 0, LCP halaman
     ini jatuh ke elemen kecil yang kebetulan mengecat terakhir (sebelumnya logo
     navbar, lalu avatar 36 px) — LCP jadi 5–6 detik padahal teks + gambar hero
     sudah terlihat ±1 detik. Dengan `data-lr-fade="false"` hero dicat OPAQUE
     sejak frame pertama; animasi geser tetap ada dan LCP mengikuti elemen yang
     benar. Section di bawah lipatan tetap memudar seperti sebelumnya. */
  const fade = trigger !== 'load'

  return (
    <div
      className={className ? `landing-reveal ${className}` : 'landing-reveal'}
      data-reveal-trigger={trigger}
      data-lr-fade={fade ? 'true' : 'false'}
      style={style}
    >
      {children}
    </div>
  )
}
