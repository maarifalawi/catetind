/* ── Bentuk data dokumen legal (dipakai /privacy sekarang, /terms menyusul) ────
   Tipe-nya dipisah dari isinya dengan sengaja: `lib/legal/privacy.ts` dan
   `lib/legal/terms.ts` (prompt 13) adalah DUA dokumen, tapi harus punya bentuk
   yang sama supaya `components/catetind/legal-shell.tsx` bisa dipakai keduanya
   tanpa cabang `if dokumen === privacy`.

   Murni tipe — tanpa React, tanpa data. Semua kalimat tinggal di file dokumen.
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Kotak catatan di dalam dokumen.
 *
 * `info`   → penjelasan tambahan yang menenangkan (mis. "kami tidak punya
 *            salinannya", contoh nyata, konsekuensi yang kami tanggung).
 * `review` → penanda jujur soal STATUS dokumen: teks yang belum ada di PRD,
 *            belum lewat tinjauan hukum, atau belum diputuskan. Inilah wujud
 *            `REVIEW LEGAL` di permukaan halaman — bukan cuma komentar kode.
 */
export interface LegalNote {
  /** mis. "REVIEW LEGAL — belum lewat tinjauan hukum" */
  label: string
  body: string
  tone: 'info' | 'review'
}

/** Satu bagian dokumen — `id` SEKALIGUS jadi anchor (#id) dan kunci daftar isi. */
export interface LegalSection {
  id: string
  title: string
  /** paragraf utama, satu entri = satu <p>; urut dari pembuka ke penjelasan */
  paragraphs: string[]
  /** daftar butir — dipakai saat isinya memang enumerasi (jalan bantuan, hak, dst.) */
  bullets?: string[]
  note?: LegalNote
}

/** Tautan keluar dari dokumen ke halaman yang benar-benar ada di repo. */
export interface LegalRelatedLink {
  href: string
  label: string
  desc: string
}

export interface LegalRelated {
  title: string
  links: LegalRelatedLink[]
  /**
   * Kalimat tentang DOKUMEN KEMBAR-nya (Kebijakan Privasi ⇄ Syarat & Ketentuan).
   *
   * Sebelum prompt 13 field ini bernama `pendingNote` dan tugasnya mengakui
   * bahwa `/terms` belum terbit — prompt 12 dilarang memasang tautan ke route
   * yang belum ada, jadi ketiadaannya disebut terang-terangan. Kedua dokumen
   * sekarang sudah ada, jadi tugasnya berganti: menjelaskan bahwa keduanya satu
   * paket dan versinya naik bersamaan, bukan lagi mengumumkan yang absen.
   */
  crossNote: string
}

export interface LegalDocument {
  /** label kecil di atas H1, mis. "Legal · CatetInd" */
  eyebrow: string
  /** judul H1 kanon */
  title: string
  /** 1–2 kalimat pembuka, dibaca SEBELUM daftar isi */
  intro: string[]
  /** label tanggal; dipisah karena bahasa bisa berubah tanpa mengubah ISO-nya */
  updatedLabel: string
  /** tanggal yang dibaca manusia — string statis (tanggal mock repo, bukan `new Date()`) */
  updatedHuman: string
  /** dipakai `datetime` pada <time> + jadi acuan versi dokumen */
  updatedIso: string
  versionLabel: string
  /** judul daftar isi */
  tocLabel: string
  sections: LegalSection[]
  /** status dokumen: belum lewat tinjauan hukum */
  reviewNote: LegalNote
  /** kejujuran soal build demo (seluruh data di repo ini masih mock) */
  demoNote: string
  related: LegalRelated
  /** disclaimer wajib PRD Domain 5E — muncul di kaki, satu baris, tanpa alarm */
  disclaimer: string
}
