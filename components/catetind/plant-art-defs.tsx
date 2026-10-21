/**
 * Definisi gradien tanaman — SATU-SATUNYA di seluruh dokumen.
 *
 * Dulu setiap `PlantIllustration` menulis `<defs>` sendiri dengan id yang sama
 * (`catetindPot`, `catetindLeaf`, …). Ketika ada beberapa tanaman di satu
 * halaman — dan salah satunya berada di tab/section yang `display:none` — browser
 * menyelesaikan `url(#catetindPot)` ke elemen PERTAMA dengan id itu, yang bisa
 * berada di dalam section tersembunyi. Akibatnya pot/daun tanaman yang terlihat
 * kehilangan gradiennya (tampak putih/transparan).
 *
 * Solusinya: definisi dipasang SEKALI di root layout, tidak pernah disembunyikan
 * dengan `display:none`. Semua instance tinggal mereferensikan id yang sama.
 * SVG-nya berukuran 0 dan `aria-hidden`, jadi tidak memakan layout.
 */
export function PlantArtDefs() {
  return (
    <svg
      aria-hidden
      focusable="false"
      className="pointer-events-none absolute h-0 w-0 overflow-hidden"
    >
      <defs>
        <radialGradient id="catetindGlow" cx="50%" cy="42%" r="58%">
          <stop offset="0%" stopColor="#91bb9e" stopOpacity="0.4" />
          <stop offset="55%" stopColor="#91bb9e" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#91bb9e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="catetindLeaf" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#dbe4c7" />
          <stop offset="48%" stopColor="#91bb9e" />
          <stop offset="100%" stopColor="#52685c" />
        </linearGradient>
        <linearGradient id="catetindLeafDeep" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#91bb9e" />
          <stop offset="100%" stopColor="#45594e" />
        </linearGradient>
        <linearGradient id="catetindStem" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#91bb9e" />
          <stop offset="100%" stopColor="#45594e" />
        </linearGradient>
        <linearGradient id="catetindPot" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#52685c" />
          <stop offset="100%" stopColor="#1f2823" />
        </linearGradient>
        <linearGradient id="catetindPotRim" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#91bb9e" />
          <stop offset="100%" stopColor="#52685c" />
        </linearGradient>
        <linearGradient id="catetindPetalBack" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fbe3c0" />
          <stop offset="100%" stopColor="#b89191" />
        </linearGradient>
        <linearGradient id="catetindPetal" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fbe3c0" />
          <stop offset="100%" stopColor="#b89191" />
        </linearGradient>
        <radialGradient id="catetindCore" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#f6edb7" />
          <stop offset="55%" stopColor="#ffb885" />
          <stop offset="100%" stopColor="#e8b06a" />
        </radialGradient>
        <radialGradient id="catetindSheen" cx="32%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="70%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  )
}
