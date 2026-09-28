/* ── COPY BANNER OFFLINE & ANTREAN LOKAL (paket 42) ──────────────────────────
   Sebelum paket ini repo NOL memakai `navigator.onLine`: user yang kehilangan
   sinyal tidak diberi tahu apa pun, tidak tahu catatannya masih aman, dan tidak
   tahu ada yang menunggu diproses. Semua kalimatnya tinggal di sini (aturan repo:
   copy user-facing bukan string di JSX).

   Dua nada yang dipakai banner:
     · `offline*`         → perangkat sedang tanpa jaringan (hud-amber, tenang)
     · `pendingTitle` dkk → jaringan sudah ada tapi antrean belum selesai (sage)

   KALIMAT KEJUJURAN (`honestyNote`) selalu tampil. Ini bukan detail teknis yang
   disembunyikan: tanpa server, "tersinkron" HANYA berarti "sudah tersimpan di
   perangkat ini", dan itu harus dikatakan apa adanya. */
export const OFFLINE_COPY = {
  offlineTitle: 'Offline — catatanmu aman di perangkat',
  /** kalimat keadaan; angka antreannya disusun di data, bukan di komponen */
  offlineBody: (pending: number) =>
    pending > 0
      ? `${pending.toLocaleString('id-ID')} catatan tersimpan di perangkat ini dan masuk antrean. Begitu internet balik, semua diproses sekaligus.`
      : 'Semua catatan tersimpan di perangkat ini. Begitu internet balik, semuanya diproses sekaligus.',
  /** badge angka antrean — satu-satunya angka yang ditampilkan banner */
  pendingBadge: (pending: number) => `${pending.toLocaleString('id-ID')} belum tersinkron`,
  pendingTitle: 'Ada catatan yang belum diproses',
  pendingBody: (pending: number) =>
    `${pending.toLocaleString('id-ID')} catatan masih menunggu diproses di perangkat ini.`,
  /** tombol proses ulang — benar-benar jalan (`flushPendingSync`), bukan pajangan */
  pendingCta: 'Proses sekarang',
  /** nada saat antrean berhasil diproses */
  syncedTitle: 'Semua catatan sudah diproses 🌿',
  syncedBody: (processed: number) =>
    `${processed.toLocaleString('id-ID')} catatan selesai diproses.`,
  dismissLabel: 'Tutup info offline',
  /** batas jujur yang selalu ikut tampil (bukan disembunyikan di komentar kode) */
  honestyNote:
    'Catatan: tanpa server, "tersinkron" berarti sudah tersimpan di perangkat ini (IndexedDB) — belum ada data yang dikirim ke mana pun.',
  /** toast setelah menyimpan saat perangkat OFFLINE — jangan mengaku "kecatat & terkirim" */
  savedOfflineTitle: 'Tersimpan di perangkat 📴',
  savedOfflineBody: 'Catatanmu masuk antrean — diproses begitu internet balik.',
} as const
